"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';

const NO_ROOM_VALUE = '__NO_ROOM__';

function extractFloorFromRoomNo(roomNo: unknown): number | null {
	const s = String(roomNo ?? '').trim();
	if (!s) return null;
	const digits = s.replace(/\D/g, '');
	if (!digits) return null;
	const n = parseInt(digits, 10);
	if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return null;
	return Math.floor(n / 100);
}

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	ROOM_NO?: unknown;
	[key: string]: any;
}

interface F14050Row {
	ANCD?: number;
	PNUM?: number;
	JHSEQ?: number;
	JHDT?: string | Date | null;
	JHDES?: string | null;
	GUDES?: string | null;
	STDT?: string | Date | null;
	STDES?: string | null;
	INEMPNO?: number | null;
	INEMPNM?: string | null;
}

type UserInfo = {
	ancd?: string | number;
	uid?: string;
	empno?: string | number;
	empnm?: string;
	[key: string]: any;
};

function memberPnum(m: MemberData | null): string {
	if (!m) return '';
	const raw = m.PNUM ?? (m as Record<string, unknown>).pnum;
	return raw !== undefined && raw !== null ? String(raw).trim() : '';
}

function formatYmd(value: unknown): string {
	if (value == null || value === '') return '';
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return '';
		const y = value.getFullYear();
		const mo = String(value.getMonth() + 1).padStart(2, '0');
		const d = String(value.getDate()).padStart(2, '0');
		return `${y}-${mo}-${d}`;
	}
	const s = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return '';
}

export default function ProgramEvaluation() {
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedJhseq, setSelectedJhseq] = useState<number | null>(null);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [planRows, setPlanRows] = useState<F14050Row[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);
	const [saveLoading, setSaveLoading] = useState(false);

	const [formData, setFormData] = useState({
		beneficiary: '',
		planDate: '',
		subjectiveObjectiveNeeds: '',
		guardianOpinion: '',
		evaluationDate: '',
		evaluationReflection: '',
		inempno: '',
		inempnm: '',
	});

	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ''
					? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
					: '/api/f10010';

			const response = await fetch(url);
			const result = await response.json();

			if (!result.success) return;

			let mergedMembers: MemberData[] = result.data || [];
			try {
				const f14090Res = await fetch('/api/f14090');
				const f14090Json = await f14090Res.json();
				if (f14090Json?.success && Array.isArray(f14090Json.data)) {
					const roomByPnum = new Map<string, unknown>();
					f14090Json.data.forEach((row: { PNUM?: unknown; ROOM_NO?: unknown }) => {
						const pnumKey = String(row?.PNUM ?? '').trim();
						if (!pnumKey) return;
						roomByPnum.set(pnumKey, row?.ROOM_NO ?? null);
					});
					mergedMembers = mergedMembers.map((m) => {
						const pnumKey = String(m?.PNUM ?? '').trim();
						const roomNo = roomByPnum.get(pnumKey);
						return { ...m, ROOM_NO: roomNo ?? m.ROOM_NO ?? null };
					});
				}
			} catch {
				/* ROOM_NO는 부가정보 */
			}

			setMemberList(mergedMembers);
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '-';
		try {
			const year = parseInt(birthDate.substring(0, 4));
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return '-';
		}
	};

	const filteredMembers = useMemo(() => {
		return memberList
			.filter((member) => {
				if (selectedStatus) {
					const memberStatus = String(member.P_ST || '').trim();
					if (selectedStatus === '입소' && memberStatus !== '1') {
						return false;
					}
					if (selectedStatus === '퇴소' && memberStatus !== '9') {
						return false;
					}
				}

				if (selectedGrade) {
					const memberGrade = String(member.P_GRD || '').trim();
					const selectedGradeTrimmed = String(selectedGrade).trim();
					if (memberGrade !== selectedGradeTrimmed) {
						return false;
					}
				}

				if (selectedFloor) {
					if (selectedFloor === NO_ROOM_VALUE) {
						const roomNo = String(member?.ROOM_NO ?? '').trim();
						if (roomNo !== '') return false;
					} else {
						const memberFloor = extractFloorFromRoomNo(member.ROOM_NO);
						const selectedFloorNum = Number(String(selectedFloor).trim());
						if (!Number.isFinite(selectedFloorNum) || memberFloor !== selectedFloorNum) {
							return false;
						}
					}
				}

				if (searchTerm && searchTerm.trim() !== '') {
					const searchLower = searchTerm.toLowerCase().trim();
					if (!member.P_NM?.toLowerCase().includes(searchLower)) {
						return false;
					}
				}

				return true;
			})
			.sort((a, b) => {
				const nameA = (a.P_NM || '').trim();
				const nameB = (b.P_NM || '').trim();
				return nameA.localeCompare(nameB, 'ko');
			});
	}, [memberList, searchTerm, selectedFloor, selectedGrade, selectedStatus]);

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	useEffect(() => {
		fetchMembers();
		(async () => {
			try {
				const res = await fetch('/api/auth/user-info');
				const json = await res.json();
				if (json?.success && json?.data) {
					setUserInfo(json.data);
				}
			} catch {
				/* ignore */
			}
		})();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	const floorOptions = useMemo(() => {
		return Array.from(
			new Set(
				memberList
					.map((m) => extractFloorFromRoomNo(m.ROOM_NO))
					.filter((f): f is number => f !== null && f !== undefined)
			)
		).sort((a, b) => a - b);
	}, [memberList]);

	const applyRowToForm = useCallback((row: F14050Row | null, memberName: string) => {
		if (!row) {
			setFormData({
				beneficiary: memberName,
				planDate: '',
				subjectiveObjectiveNeeds: '',
				guardianOpinion: '',
				evaluationDate: '',
				evaluationReflection: '',
				inempno: '',
				inempnm: '',
			});
			return;
		}
		setFormData({
			beneficiary: memberName,
			planDate: formatYmd(row.JHDT),
			subjectiveObjectiveNeeds: String(row.JHDES ?? ''),
			guardianOpinion: String(row.GUDES ?? ''),
			evaluationDate: formatYmd(row.STDT),
			evaluationReflection: String(row.STDES ?? ''),
			inempno: row.INEMPNO != null ? String(row.INEMPNO) : '',
			inempnm: String(row.INEMPNM ?? ''),
		});
	}, []);

	const fetchPlanRows = async (pnum: string, memberName: string, preferJhseq?: number | null) => {
		if (!pnum) {
			setPlanRows([]);
			applyRowToForm(null, memberName);
			return;
		}

		setLoadingDates(true);
		try {
			const url = `/api/f14050?pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url, { cache: 'no-store' });
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || '프로그램 급여계획 데이터를 불러오지 못했습니다.');
			}

			const rows: F14050Row[] = Array.isArray(result.data) ? result.data : [];
			setPlanRows(rows);
			setIsCreatingNew(false);
			if (rows.length === 0) {
				setSelectedJhseq(null);
				applyRowToForm(null, memberName);
				return;
			}
			let pick = preferJhseq != null ? rows.find((r) => r.JHSEQ === preferJhseq) : undefined;
			if (!pick) {
				pick = rows[0];
			}
			setSelectedJhseq(pick.JHSEQ ?? null);
			applyRowToForm(pick, memberName);
		} catch (err) {
			console.error('F14050 조회 오류:', err);
			setPlanRows([]);
			setSelectedJhseq(null);
			applyRowToForm(null, memberName);
			alert(err instanceof Error ? err.message : '조회 오류');
		} finally {
			setLoadingDates(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		const name = member.P_NM || '';
		setFormData((prev) => ({ ...prev, beneficiary: name }));
		void fetchPlanRows(memberPnum(member), name);
	};

	const handleSelectPlanRow = (row: F14050Row) => {
		const seq = row.JHSEQ;
		if (seq == null) return;
		setIsCreatingNew(false);
		setSelectedJhseq(seq);
		applyRowToForm(row, selectedMember?.P_NM || formData.beneficiary);
	};

	const handleNewPlan = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		setIsCreatingNew(true);
		setSelectedJhseq(null);
		applyRowToForm(null, selectedMember.P_NM || '');
	};

	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '(일자 미입력)';
		if (dateStr.includes('T')) {
			dateStr = dateStr.split('T')[0];
		}
		if (dateStr.includes('-') && dateStr.length >= 10) {
			return dateStr.substring(0, 10);
		}
		if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		const pnum = memberPnum(selectedMember);
		if (!pnum) {
			alert('수급자 번호가 없습니다.');
			return;
		}

		if (!formData.planDate.trim()) {
			alert('계획일자를 입력해주세요.');
			return;
		}

		const empNoRaw = userInfo?.empno;
		let INEMPNO: number | null = null;
		if (empNoRaw !== undefined && empNoRaw !== null && String(empNoRaw).trim() !== '') {
			const n = parseInt(String(empNoRaw), 10);
			INEMPNO = Number.isNaN(n) ? null : n;
		}
		const INEMPNM = (userInfo?.empnm && String(userInfo.empnm).trim()) || null;

		setSaveLoading(true);
		try {
			const body: Record<string, unknown> = {
				action: isCreatingNew ? 'create' : 'save',
				pnum,
				JHDT: formData.planDate.trim(),
				JHDES: formData.subjectiveObjectiveNeeds,
				GUDES: formData.guardianOpinion,
				STDT: formData.evaluationDate.trim() || null,
				STDES: formData.evaluationReflection,
				INEMPNO,
				INEMPNM,
			};
			if (!isCreatingNew && selectedJhseq != null) {
				body.jhseq = selectedJhseq;
			}

			const response = await fetch('/api/f14050', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || '저장에 실패했습니다.');
			}

			alert(isCreatingNew ? '프로그램 급여계획이 등록되었습니다.' : '저장되었습니다.');

			const newSeq = result.jhseq as number | undefined;
			const prefer = isCreatingNew ? newSeq ?? null : selectedJhseq;
			await fetchPlanRows(pnum, selectedMember.P_NM || '', prefer);
		} catch (err) {
			console.error('F14050 저장 오류:', err);
			alert(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
		} finally {
			setSaveLoading(false);
		}
	};

	const handlePrint = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.planDate) {
			alert('계획일자를 입력하거나 선택해주세요.');
			return;
		}

		window.print();
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded"
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">현황</div>
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">현황 전체</option>
									<option value="입소">입소</option>
									<option value="퇴소">퇴소</option>
								</select>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">등급</div>
								<select
									value={selectedGrade}
									onChange={(e) => setSelectedGrade(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">등급 전체</option>
									<option value="1">1등급</option>
									<option value="2">2등급</option>
									<option value="3">3등급</option>
									<option value="4">4등급</option>
									<option value="5">5등급</option>
									<option value="9">인지지원</option>
								</select>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<select
									value={selectedFloor}
									onChange={(e) => setSelectedFloor(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">층수 전체</option>
									<option value={NO_ROOM_VALUE}>방번호 없음</option>
									{floorOptions.map((floor) => (
										<option key={floor} value={String(floor)}>
											{floor}층
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="flex flex-col overflow-hidden bg-white border border-blue-300 rounded-lg">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">현황</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">등급</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">층</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
												수급자 데이터가 없습니다
											</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM
														? 'bg-blue-100'
														: ''
												}`}
											>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{formatCareGradeLabel(member.P_GRD)}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{extractFloorFromRoomNo(member.ROOM_NO) !== null
														? `${extractFloorFromRoomNo(member.ROOM_NO)}층`
														: '-'}
												</td>
												<td className="px-2 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{totalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => handlePageChange(1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>

									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
										if (pageNum > totalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => handlePageChange(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													currentPage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}

									<button
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => handlePageChange(totalPages)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 우측 패널 */}
				<div className="flex flex-col flex-1 bg-white">
					<div className="flex items-center gap-2 p-4 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">
							수급자
						</label>
						<input
							type="text"
							value={formData.beneficiary}
							readOnly
							placeholder="수급자를 선택해주세요"
							className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[150px]"
						/>
					</div>

					{!selectedMember ? (
						<div className="flex flex-1 min-h-[360px] items-center justify-center border-t border-blue-100 bg-white p-8">
							<p className="text-center text-lg font-medium text-blue-900/85">수급자를 선택해주세요</p>
						</div>
					) : (
					<div className="flex flex-1 overflow-hidden">
						<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
							<div className="flex items-center justify-between px-3 py-2 border-b border-blue-200 bg-blue-50 gap-2">
								<label className="text-sm font-medium text-blue-900">계획일자</label>
								<button
									type="button"
									onClick={handleNewPlan}
									disabled={!selectedMember || loadingDates}
									className="shrink-0 rounded border border-blue-500 bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
								>
									신규
								</button>
							</div>
							<div className="flex flex-col flex-1 overflow-hidden">
								<div className="flex-1 overflow-y-auto bg-white">
									{loadingDates ? (
										<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
									) : planRows.length === 0 && !isCreatingNew ? (
										<div className="px-3 py-2 text-sm text-blue-900/60">등록된 계획이 없습니다. 신규를 눌러 추가하세요.</div>
									) : (
										<>
											{isCreatingNew ? (
												<div className="px-3 py-2 text-sm font-semibold bg-amber-50 border-b border-amber-100">
													신규 입력 중
												</div>
											) : null}
											{planRows.map((row) => {
												const seq = row.JHSEQ;
												const key = seq != null ? String(seq) : '';
												const active = !isCreatingNew && selectedJhseq === seq;
												return (
													<div
														key={key}
														onClick={() => handleSelectPlanRow(row)}
														className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
															active ? 'bg-blue-100 font-semibold' : ''
														}`}
													>
														{formatDateDisplay(formatYmd(row.JHDT))}
														{seq != null ? (
															<span className="ml-2 text-xs font-normal text-blue-800/70">#{seq}</span>
														) : null}
													</div>
												);
											})}
										</>
									)}
								</div>
							</div>
						</div>

						<div className="flex-1 p-4 overflow-y-auto bg-white">
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
										계획일자
									</label>
									<input
										type="date"
										value={formData.planDate}
										onChange={(e) => setFormData((prev) => ({ ...prev, planDate: e.target.value }))}
										disabled={!selectedMember}
										className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 max-w-[200px]"
									/>
								</div>

								<div className="flex items-start gap-2">
									<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
										주관적/객관적 욕구
									</label>
									<textarea
										value={formData.subjectiveObjectiveNeeds}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, subjectiveObjectiveNeeds: e.target.value }))
										}
										maxLength={2000}
										disabled={!selectedMember}
										className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[80px]"
										rows={4}
										placeholder="최대 2000자"
									/>
								</div>

								<div className="flex items-start gap-2">
									<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
										보호자 의견
									</label>
									<textarea
										value={formData.guardianOpinion}
										onChange={(e) => setFormData((prev) => ({ ...prev, guardianOpinion: e.target.value }))}
										maxLength={2000}
										disabled={!selectedMember}
										className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[60px]"
										rows={3}
										placeholder="최대 2000자"
									/>
								</div>

								<div className="flex items-center gap-2">
									<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
										평가일자
									</label>
									<input
										type="date"
										value={formData.evaluationDate}
										onChange={(e) => setFormData((prev) => ({ ...prev, evaluationDate: e.target.value }))}
										disabled={!selectedMember}
										className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 max-w-[200px]"
									/>
								</div>

								<div className="flex items-start gap-2">
									<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
										평가 및 반영내역
									</label>
									<textarea
										value={formData.evaluationReflection}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, evaluationReflection: e.target.value }))
										}
										maxLength={2000}
										disabled={!selectedMember}
										className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[80px]"
										rows={4}
										placeholder="최대 2000자"
									/>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
									<div className="flex items-center gap-2">
										<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
											등록 사원번호
										</label>
										<input
											type="text"
											value={formData.inempno}
											readOnly
											className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-40 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
											등록 사원명
										</label>
										<input
											type="text"
											value={formData.inempnm}
											readOnly
											className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50"
										/>
									</div>
								</div>
								{/* <p className="text-xs text-blue-900/70">
									저장 시 로그인 사용자 정보로 INEMPNO·INEMPNM이 갱신됩니다.
								</p> */}
							</div>

							<div className="flex justify-end gap-2 mt-6 print:hidden">
								<button
									type="button"
									onClick={() => void handleSave()}
									disabled={!selectedMember || saveLoading}
									className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
								>
									{saveLoading ? '저장 중…' : '저장'}
								</button>
								{/* <button
									type="button"
									onClick={handlePrint}
									className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									프로그램 급여계획 출력
								</button> */}
							</div>
						</div>
					</div>
					)}
				</div>
			</div>
		</div>
	);
}
