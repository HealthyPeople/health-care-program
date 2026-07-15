"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { attachLatestRoomNoByPnum } from '../../utils/roomNoFloor';
import { RoomNoFloorSelect } from '../../components/RoomNoFloorSelect';
import { matchesSelectedFloorByRoomNo } from '../../utils/roomNoFloorFilter';
import {
	CHNG_POSI_OPTIONS,
	POSITION_CHANGE_TIME_SLOTS,
	chngGuToLabel,
	chngPosiToLabel,
	createEmptyPositionChangeForm,
	formatDateYmd,
	positionChangeFormToPayload,
	rowToPositionChangeForm,
	type F33040Row,
	type PositionChangeFormData,
} from '../../utils/positionChangeFields';

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

interface PositionChangeData extends F33040Row {
	CHGDT: string;
	CHGTM: string;
	CHGPOS: string;
	REMARKS: string;
	CHGER: string;
}

export default function PositionChangeRecord() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [selectedChangeIndex, setSelectedChangeIndex] = useState<number | null>(null);
	const [positionChangeDates, setPositionChangeDates] = useState<string[]>([]);
	const [positionChangeList, setPositionChangeList] = useState<PositionChangeData[]>([]);
	const [loadingChanges, setLoadingChanges] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const dateItemsPerPage = 10;
	const [changeListPage, setChangeListPage] = useState(1);
	const changeListItemsPerPage = 10;

	const [formData, setFormData] = useState<PositionChangeFormData>(createEmptyPositionChangeForm());
	const [defaultChanger, setDefaultChanger] = useState('');

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
						setDefaultChanger(name);
						setFormData((prev) => (prev.changer ? prev : { ...prev, changer: name }));
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

	// 체위변경일자 목록 조회
	const fetchPositionChangeDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setPositionChangeDates([]);
			return;
		}

		setLoadingChanges(true);
		try {
			const url = `/api/f33040?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}&mode=dates`;
			const response = await fetch(url, { method: 'GET' });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || '체위변경일자 조회 실패');
			}
			const list = Array.isArray(result.data) ? result.data : [];
			const dates = list
				.map((r: { CHNG_DT?: string; VDT?: string }) => formatDateYmd(r?.CHNG_DT ?? r?.VDT ?? ''))
				.filter((d: string) => d && /^\d{4}-\d{2}-\d{2}$/.test(d));
			setPositionChangeDates(dates);
		} catch (err) {
			console.error('체위변경일자 조회 오류:', err);
			setPositionChangeDates([]);
		} finally {
			setLoadingChanges(false);
		}
	};

	// 체위변경 목록 조회
	const fetchPositionChanges = async (ancd: string, pnum: string, date: string) => {
		if (!ancd || !pnum || !date) {
			setPositionChangeList([]);
			return;
		}

		setLoadingChanges(true);
		try {
			const url = `/api/f33040?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}&vdt=${encodeURIComponent(date)}`;
			const response = await fetch(url, { method: 'GET' });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || '체위변경 목록 조회 실패');
			}
			const list = Array.isArray(result.data) ? result.data : [];
			const mapped: PositionChangeData[] = list.map((r: F33040Row) => ({
				...r,
				CHGDT: formatDateYmd(r.CHNG_DT ?? r.VDT),
				CHGTM: chngGuToLabel(String(r.CHNG_GU ?? '')),
				CHGPOS: chngPosiToLabel(String(r.CHNG_POSI ?? '')),
				REMARKS: String(r.CHNG_ETC ?? ''),
				CHGER: String(r.CHNG_EMPNM ?? ''),
			}));
			setPositionChangeList(mapped);
		} catch (err) {
			console.error('체위변경 목록 조회 오류:', err);
			setPositionChangeList([]);
		} finally {
			setLoadingChanges(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedDateIndex(null);
		setSelectedChangeIndex(null);
		setPositionChangeList([]);
		setFormData(createEmptyPositionChangeForm(member.P_NM || '', defaultChanger));
		fetchPositionChangeDates(member.ANCD, member.PNUM);
	};

	// 체위변경일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = positionChangeDates[index];
		if (selectedMember && selectedDate) {
			fetchPositionChanges(selectedMember.ANCD, selectedMember.PNUM, selectedDate);
		}
		setFormData((prev) => ({
			...createEmptyPositionChangeForm(selectedMember?.P_NM || prev.beneficiary, defaultChanger || prev.changer),
			changeDate: selectedDate || '',
		}));
		setSelectedChangeIndex(null);
	};

	// 체위변경 선택 함수
	const handleSelectChange = (index: number, change: PositionChangeData) => {
		setSelectedChangeIndex(index);
		setFormData(rowToPositionChangeForm(change, selectedMember?.P_NM || ''));
	};

	const formatDateDisplay = formatDateYmd;

	const formatTimeDisplay = (timeStr: string) => chngGuToLabel(timeStr);

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.changeDate) {
			alert('변경일자를 입력해주세요.');
			return;
		}

		setLoadingChanges(true);
		try {
			const payload = positionChangeFormToPayload(formData, selectedMember.PNUM);
			const res = await fetch(`/api/f33040?ancd=${encodeURIComponent(selectedMember.ANCD)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '체위변경 저장 실패');
			}

			alert(selectedChangeIndex !== null ? '체위변경이 수정되었습니다.' : '체위변경이 저장되었습니다.');

			await fetchPositionChangeDates(selectedMember.ANCD, selectedMember.PNUM);
			if (selectedMember && formData.changeDate) {
				await fetchPositionChanges(selectedMember.ANCD, selectedMember.PNUM, formData.changeDate);
			}
		} catch (err) {
			console.error('체위변경 저장 오류:', err);
			alert(err instanceof Error ? err.message : '체위변경 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingChanges(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedChangeIndex === null) {
			alert('삭제할 체위변경을 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingChanges(true);
		try {
			const changeToDelete = positionChangeList[selectedChangeIndex];
			const vdt = formatDateDisplay(changeToDelete.CHGDT || formData.changeDate || '');
			const chngGu = String(changeToDelete.CHNG_GU ?? '');
			const url = `/api/f33040?ancd=${encodeURIComponent(selectedMember.ANCD)}&pnum=${encodeURIComponent(
				selectedMember.PNUM
			)}&vdt=${encodeURIComponent(vdt)}&chngGu=${encodeURIComponent(chngGu)}`;
			const res = await fetch(url, { method: 'DELETE' });
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '체위변경 삭제 실패');
			}

			alert('체위변경이 삭제되었습니다.');

			await fetchPositionChangeDates(selectedMember.ANCD, selectedMember.PNUM);
			if (selectedMember && formData.changeDate) {
				await fetchPositionChanges(selectedMember.ANCD, selectedMember.PNUM, formData.changeDate);
			}

			setFormData({
				...createEmptyPositionChangeForm(selectedMember.P_NM || '', defaultChanger),
				changeDate: formData.changeDate,
			});
			setSelectedChangeIndex(null);
		} catch (err) {
			console.error('체위변경 삭제 오류:', err);
			alert(err instanceof Error ? err.message : '체위변경 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingChanges(false);
		}
	};

	// 체위변경일자 목록 페이지네이션
	const dateTotalPages = Math.ceil(positionChangeDates.length / dateItemsPerPage);
	const dateStartIndex = (datePage - 1) * dateItemsPerPage;
	const dateEndIndex = dateStartIndex + dateItemsPerPage;
	const currentDateItems = positionChangeDates.slice(dateStartIndex, dateEndIndex);

	// 체위변경 목록 페이지네이션
	const changeListTotalPages = Math.ceil(positionChangeList.length / changeListItemsPerPage);
	const changeListStartIndex = (changeListPage - 1) * changeListItemsPerPage;
	const changeListEndIndex = changeListStartIndex + changeListItemsPerPage;
	const currentChanges = positionChangeList.slice(changeListStartIndex, changeListEndIndex);

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

				{/* 중간-왼쪽 패널: 체위변경일자 목록 */}
				<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
					<div className="overflow-hidden border-b border-blue-200 bg-blue-50">
						<table className="w-full text-xs border-collapse">
							<thead>
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">체위변경일자</th>
								</tr>
							</thead>
						</table>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto">
							<table className="w-full text-xs border-collapse">
								<tbody>
									{loadingChanges ? (
										<tr>
											<td className="px-3 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : positionChangeDates.length === 0 ? (
										<tr>
											<td className="px-3 py-4 text-center text-blue-900/60">
												{selectedMember ? '체위변경일자가 없습니다' : '수급자를 선택해주세요'}
											</td>
										</tr>
									) : (
										currentDateItems.map((date, localIndex) => {
											const globalIndex = dateStartIndex + localIndex;
											return (
												<tr
													key={globalIndex}
													onClick={() => handleSelectDate(globalIndex)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedDateIndex === globalIndex ? 'bg-blue-100' : ''
													}`}
												>
													<td className="px-3 py-2 text-center text-blue-900">{formatDateDisplay(date)}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						{/* 체위변경일자 페이지네이션 */}
						{dateTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setDatePage(1)}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setDatePage(prev => Math.max(1, prev - 1))}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, dateTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(dateTotalPages - 4, datePage - 2)) + i;
										if (pageNum > dateTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setDatePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													datePage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setDatePage(prev => Math.min(dateTotalPages, prev + 1))}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setDatePage(dateTotalPages)}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 중간-오른쪽 패널: 체위변경 목록 테이블 */}
				<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
					<div className="overflow-hidden border-b border-blue-200 bg-blue-50">
						<table className="w-full text-xs border-collapse">
							<thead>
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">변경일자</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">변경시간</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900">체위변경</th>
								</tr>
							</thead>
						</table>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto">
							<table className="w-full text-xs border-collapse">
								<tbody>
									{loadingChanges ? (
										<tr>
											<td colSpan={3} className="px-3 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : positionChangeList.length === 0 ? (
										<tr>
											<td colSpan={3} className="px-3 py-4 text-center text-blue-900/60">
												{selectedDateIndex !== null ? '체위변경 데이터가 없습니다' : '체위변경일자를 선택해주세요'}
											</td>
										</tr>
									) : (
										currentChanges.map((change, localIndex) => {
											const globalIndex = changeListStartIndex + localIndex;
											return (
												<tr
													key={globalIndex}
													onClick={() => handleSelectChange(globalIndex, change)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedChangeIndex === globalIndex ? 'bg-blue-100' : ''
													}`}
												>
													<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatDateDisplay(change.CHGDT || '')}</td>
													<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{change.CHGTM || formatTimeDisplay(change.CHNG_GU || '')}</td>
													<td className="px-3 py-2 text-center text-blue-900">{change.CHGPOS || '-'}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						{/* 체위변경 목록 페이지네이션 */}
						{changeListTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setChangeListPage(1)}
										disabled={changeListPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setChangeListPage(prev => Math.max(1, prev - 1))}
										disabled={changeListPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, changeListTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(changeListTotalPages - 4, changeListPage - 2)) + i;
										if (pageNum > changeListTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setChangeListPage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													changeListPage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setChangeListPage(prev => Math.min(changeListTotalPages, prev + 1))}
										disabled={changeListPage >= changeListTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setChangeListPage(changeListTotalPages)}
										disabled={changeListPage >= changeListTotalPages}
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

						{/* 변경일자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">변경일자</label>
							<input
								type="text"
								value={formData.changeDate}
								readOnly
								className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50"
							/>
						</div>

						{/* 변경시간 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">변경시간</label>
							<select
								value={formData.changeTime}
								onChange={(e) => setFormData(prev => ({ ...prev, changeTime: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								{POSITION_CHANGE_TIME_SLOTS.map((slot) => (
									<option key={slot.vtmGu} value={slot.label}>{slot.label}</option>
								))}
							</select>
						</div>

						{/* 변경자세 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">변경자세</label>
							<select
								value={formData.changedPosture}
								onChange={(e) => setFormData(prev => ({ ...prev, changedPosture: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								{CHNG_POSI_OPTIONS.map((opt) => (
									<option key={opt.code} value={opt.code}>{opt.label}</option>
								))}
							</select>
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

						{/* 변경자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">변경자</label>
							<input
								type="text"
								value={formData.changer}
								onChange={(e) => setFormData(prev => ({ ...prev, changer: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="변경자를 입력하세요"
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
		</div>
	);
}
