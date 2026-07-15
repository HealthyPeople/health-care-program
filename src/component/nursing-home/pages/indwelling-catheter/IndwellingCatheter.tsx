"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { attachLatestRoomNoByPnum } from '../../utils/roomNoFloor';
import { RoomNoFloorSelect } from '../../components/RoomNoFloorSelect';
import { matchesSelectedFloorByRoomNo } from '../../utils/roomNoFloorFilter';
import {
	CATHETER_TIME_SLOTS,
	catheterFormToPayload,
	createEmptyCatheterForm,
	formatDateYmd,
	isCheckedFlag,
	rowToCatheterForm,
	type CatheterFormData,
	type F33050Row,
} from '../../utils/indwellingCatheterFields';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	ROOM_NO?: string;
	[key: string]: any;
}

interface CatheterData extends F33050Row {
	MGDT: string;
	MGTM: string;
	TOTURVOL: string;
	CATH: string;
	URPULSE: string;
	DISINF: string;
	REMARKS: string;
	OBSERVER: string;
}

export default function IndwellingCatheter() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
	const [catheterList, setCatheterList] = useState<CatheterData[]>([]);
	const [loadingRecords, setLoadingRecords] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [listPage, setListPage] = useState(1);
	const listItemsPerPage = 10;

	const [formData, setFormData] = useState<CatheterFormData>(createEmptyCatheterForm());
	const [defaultObserver, setDefaultObserver] = useState('');

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 수급자 목록 조회
	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				const list = Array.isArray(result.data) ? (result.data as MemberData[]) : [];
				const merged = await attachLatestRoomNoByPnum(list as any);
				setMemberList(merged as MemberData[]);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	// 나이 계산 함수
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

	// 필터링된 수급자 목록
	const filteredMembers = memberList.filter((member) => {
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
			if (!matchesSelectedFloorByRoomNo((member as any).ROOM_NO, selectedFloor)) return false;
		}
		
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase().trim();
			if (!member.P_NM?.toLowerCase().includes(searchLower)) {
				return false;
			}
		}
		
		return true;
	}).sort((a, b) => {
		const nameA = (a.P_NM || '').trim();
		const nameB = (b.P_NM || '').trim();
		return nameA.localeCompare(nameB, 'ko');
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	useEffect(() => {
		fetchMembers();
		void (async () => {
			try {
				const res = await fetch('/api/auth/user-info', { credentials: 'include', cache: 'no-store' });
				const result = await res.json().catch(() => ({}));
				if (res.ok && result?.success) {
					const name = String(result?.data?.empnm ?? result?.data?.EMPNM ?? '').trim();
					if (name) {
						setDefaultObserver(name);
						setFormData((prev) => (prev.observer ? prev : { ...prev, observer: name }));
					}
				}
			} catch {
				/* ignore */
			}
		})();
	}, []);

	// 검색어 변경 시 실시간 검색 (디바운싱)
	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	// 유치도뇨관리 목록 조회
	const fetchCatheterRecords = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setCatheterList([]);
			return;
		}

		setLoadingRecords(true);
		try {
			const url = `/api/f33050?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url, { method: 'GET' });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || '유치도뇨관리 목록 조회 실패');
			}
			const list = Array.isArray(result.data) ? result.data : [];
			const mapped: CatheterData[] = list.map((r: F33050Row) => ({
				...r,
				MGDT: formatDateYmd(r.VDT),
				MGTM: String(r.VTM_GU ?? ''),
				TOTURVOL: r.PSS_VAL != null ? String(r.PSS_VAL) : '',
				CATH: String(r.CH_01 ?? '0'),
				URPULSE: String(r.CH_02 ?? '0'),
				DISINF: String(r.CH_03 ?? '0'),
				REMARKS: String(r.ETC ?? ''),
				OBSERVER: String(r.INEMPNM ?? ''),
			}));
			setCatheterList(mapped);
		} catch (err) {
			console.error('유치도뇨관리 목록 조회 오류:', err);
			setCatheterList([]);
		} finally {
			setLoadingRecords(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedRecordIndex(null);
		setIsEditMode(false);
		setFormData(createEmptyCatheterForm(member.P_NM || '', defaultObserver));
		fetchCatheterRecords(member.ANCD, member.PNUM);
	};

	const handleSelectRecord = (index: number, record: CatheterData) => {
		setSelectedRecordIndex(index);
		setIsEditMode(false);
		setFormData(rowToCatheterForm(record, selectedMember?.P_NM || ''));
	};

	const formatDateDisplay = formatDateYmd;

	const formatTimeDisplay = (timeStr: string) => {
		if (!timeStr) return '';
		if (timeStr.includes(':')) return timeStr;
		const slot = CATHETER_TIME_SLOTS.find((s) => s.vtmGu === String(timeStr).padStart(2, '0').slice(-2));
		return slot?.label ?? timeStr;
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.managementDate) {
			alert('관리일자를 입력해주세요.');
			return;
		}

		setLoadingRecords(true);
		try {
			const payload = catheterFormToPayload(formData, selectedMember.PNUM);
			const res = await fetch(`/api/f33050?ancd=${encodeURIComponent(selectedMember.ANCD)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '유치도뇨관리 저장 실패');
			}

			alert(selectedRecordIndex !== null ? '유치도뇨관리가 수정되었습니다.' : '유치도뇨관리가 저장되었습니다.');
			setIsEditMode(false);
			setSelectedRecordIndex(null);

			if (selectedMember) {
				await fetchCatheterRecords(selectedMember.ANCD, selectedMember.PNUM);
			}

			setFormData(createEmptyCatheterForm(selectedMember.P_NM || '', defaultObserver));
		} catch (err) {
			console.error('유치도뇨관리 저장 오류:', err);
			alert(err instanceof Error ? err.message : '유치도뇨관리 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedRecordIndex === null) {
			alert('삭제할 유치도뇨관리를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingRecords(true);
		try {
			const recordToDelete = catheterList[selectedRecordIndex];
			const vdt = formatDateDisplay(recordToDelete.MGDT || formData.managementDate || '');
			const vtmGu = String(recordToDelete.VTM_GU ?? '');
			const url = `/api/f33050?ancd=${encodeURIComponent(selectedMember.ANCD)}&pnum=${encodeURIComponent(
				selectedMember.PNUM
			)}&vdt=${encodeURIComponent(vdt)}&vtmGu=${encodeURIComponent(vtmGu)}`;
			const res = await fetch(url, { method: 'DELETE' });
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '유치도뇨관리 삭제 실패');
			}

			alert('유치도뇨관리가 삭제되었습니다.');
			setIsEditMode(false);

			if (selectedMember) {
				await fetchCatheterRecords(selectedMember.ANCD, selectedMember.PNUM);
			}

			setFormData(createEmptyCatheterForm(selectedMember.P_NM || '', defaultObserver));
			setSelectedRecordIndex(null);
		} catch (err) {
			console.error('유치도뇨관리 삭제 오류:', err);
			alert(err instanceof Error ? err.message : '유치도뇨관리 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 목록 페이지네이션
	const listTotalPages = Math.ceil(catheterList.length / listItemsPerPage);
	const listStartIndex = (listPage - 1) * listItemsPerPage;
	const listEndIndex = listStartIndex + listItemsPerPage;
	const currentRecords = catheterList.slice(listStartIndex, listEndIndex);

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					{/* 필터 헤더 */}
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							{/* 이름 검색 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input 
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded" 
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							{/* 현황 필터 */}
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
							{/* 등급 필터 */}
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
							{/* 층수 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<RoomNoFloorSelect
									members={memberList as any}
									value={selectedFloor}
									onChange={setSelectedFloor}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								/>
							</div>
						</div>
					</div>

					{/* 수급자 목록 테이블 */}
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
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">수급자 데이터가 없습니다</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM ? 'bg-blue-100' : ''
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
												<td className="px-2 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{/* 페이지네이션 */}
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
									})}
									
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

				<div className="relative flex flex-1 min-w-0">
					<div
						className={`flex flex-1 min-w-0 ${
							!selectedMember ? 'blur-sm select-none pointer-events-none opacity-70' : ''
						}`}
					>
				{/* 중간 패널: 유치도뇨관리 목록 테이블 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="overflow-hidden border-b border-blue-200 bg-blue-50">
						<table className="w-full text-xs border-collapse">
							<thead>
								<tr>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">관리일자</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">관리시간</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">소변총량</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">도뇨관</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">소변맥</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900">소독</th>
								</tr>
							</thead>
						</table>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto">
							<table className="w-full text-xs border-collapse">
								<tbody>
									{loadingRecords ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : catheterList.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
												{selectedMember ? '유치도뇨관리 데이터가 없습니다' : '수급자를 선택해주세요'}
											</td>
										</tr>
									) : (
										currentRecords.map((record, localIndex) => {
											const globalIndex = listStartIndex + localIndex;
											return (
												<tr
													key={`${record.VDT}-${record.VTM_GU}-${globalIndex}`}
													onClick={() => handleSelectRecord(globalIndex, record)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedRecordIndex === globalIndex ? 'bg-blue-100' : ''
													}`}
												>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">{formatDateDisplay(record.MGDT || '')}</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">{formatTimeDisplay(record.MGTM || '')}</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">{record.TOTURVOL || '-'}</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">
														{isCheckedFlag(record.CATH) ? '✓' : '-'}
													</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">
														{isCheckedFlag(record.URPULSE) ? '✓' : '-'}
													</td>
													<td className="px-2 py-2 text-center text-blue-900">
														{isCheckedFlag(record.DISINF) ? '✓' : '-'}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						{/* 목록 페이지네이션 */}
						{listTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setListPage(1)}
										disabled={listPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setListPage(prev => Math.max(1, prev - 1))}
										disabled={listPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, listTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(listTotalPages - 4, listPage - 2)) + i;
										if (pageNum > listTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setListPage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													listPage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setListPage(prev => Math.min(listTotalPages, prev + 1))}
										disabled={listPage >= listTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setListPage(listTotalPages)}
										disabled={listPage >= listTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 우측 패널: 입력 폼 */}
				<div className="flex-1 p-4 overflow-y-auto bg-white">
					<div className="space-y-4">
						{/* 수급자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
							<input
								type="text"
								value={formData.beneficiary}
								readOnly
								className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50"
							/>
						</div>

						{/* 관리일자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관리일자</label>
							<input
								type="date"
								value={formData.managementDate}
								onChange={(e) => setFormData(prev => ({ ...prev, managementDate: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 관리시간 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관리시간</label>
							<select
								value={formData.managementTime}
								onChange={(e) => setFormData(prev => ({ ...prev, managementTime: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								{CATHETER_TIME_SLOTS.map((slot) => (
									<option key={slot.vtmGu} value={slot.label}>{slot.label}</option>
								))}
							</select>
						</div>

						{/* 소변총량 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소변총량</label>
							<input
								type="number"
								value={formData.totalUrineVolume}
								onChange={(e) => setFormData(prev => ({ ...prev, totalUrineVolume: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="소변총량(ml)"
								min={0}
							/>
						</div>

						{/* 도뇨관 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">도뇨관</label>
							<input
								type="checkbox"
								checked={formData.catheter}
								onChange={(e) => setFormData(prev => ({ ...prev, catheter: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 소변맥 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소변맥</label>
							<input
								type="checkbox"
								checked={formData.urinePulse}
								onChange={(e) => setFormData(prev => ({ ...prev, urinePulse: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 소독 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소독</label>
							<input
								type="checkbox"
								checked={formData.disinfection}
								onChange={(e) => setFormData(prev => ({ ...prev, disinfection: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 비고 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">비고</label>
							<input
								type="text"
								value={formData.remarks}
								onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="비고를 입력하세요"
							/>
						</div>

						{/* 관찰자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관찰자</label>
							<input
								type="text"
								value={formData.observer}
								onChange={(e) => setFormData(prev => ({ ...prev, observer: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="관찰자를 입력하세요"
							/>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex justify-end gap-2 mt-6">
						<button
							onClick={handleSave}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							저장
						</button>
						<button
							onClick={handleDelete}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							삭제
						</button>
					</div>
				</div>
					</div>
					{!selectedMember && (
						<div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/30 backdrop-blur-[1px]">
							<p className="px-6 py-3 text-lg font-semibold text-blue-900 bg-white/90 border border-blue-200 rounded-lg shadow-sm">
								수급자를 선택해주세요
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
