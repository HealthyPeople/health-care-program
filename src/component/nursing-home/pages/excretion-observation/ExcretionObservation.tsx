"use client";
import React, { useState, useEffect } from 'react';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	[key: string]: any;
}

interface ObservationData {
	OBSDT: string; // 관찰일자
	OBSTM: string; // 관찰시간
	[key: string]: any;
}

export default function ExcretionObservation() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);
	const [observationDates, setObservationDates] = useState<string[]>([]);
	const [observationTimes, setObservationTimes] = useState<string[]>([]);
	const [loadingObservations, setLoadingObservations] = useState(false);
	const [observationDatePage, setObservationDatePage] = useState(1);
	const observationDateItemsPerPage = 10;
	const [observationTimePage, setObservationTimePage] = useState(1);
	const observationTimeItemsPerPage = 10;

	// 폼 데이터
	const [formData, setFormData] = useState({
		beneficiary: '', // 수급자
		observationDate: '2025-12-11', // 관찰일자
		beneficiaryStatus: '일반', // 수급자상태
		statusOther: '', // 상태기타
		observationTime: '05:00 - 06:00', // 관찰시간
		diaperUse: '없음', // 기저귀착용
		stomaCatheter: '', // 장루(요루)도뇨관삽입
		intakeAmount: '', // 섭취량
		urine: false, // 소변
		stool: false, // 대변
		diaperOrClothesChange: false, // 기저귀 또는 옷 교환
		observer: '고경란' // 관찰자
	});

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
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
				setMemberList(result.data || []);
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
			const memberFloor = String(member.P_FLOOR || '').trim();
			const selectedFloorTrimmed = String(selectedFloor).trim();
			if (memberFloor !== selectedFloorTrimmed) {
				return false;
			}
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

	// 관찰일자 목록 조회
	const fetchObservationDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setObservationDates([]);
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/excretion-observation/dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setObservationDates([]);
		} catch (err) {
			console.error('관찰일자 조회 오류:', err);
		} finally {
			setLoadingObservations(false);
		}
	};

	// 관찰시간 목록 조회
	const fetchObservationTimes = async (ancd: string, pnum: string, date: string) => {
		if (!ancd || !pnum || !date) {
			setObservationTimes([]);
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/excretion-observation/times?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}&date=${encodeURIComponent(date)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setObservationTimes([]);
		} catch (err) {
			console.error('관찰시간 조회 오류:', err);
		} finally {
			setLoadingObservations(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchObservationDates(member.ANCD, member.PNUM);
	};

	// 관찰일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = observationDates[index];
		if (selectedMember && selectedDate) {
			fetchObservationTimes(selectedMember.ANCD, selectedMember.PNUM, selectedDate);
		}
		setFormData(prev => ({ ...prev, observationDate: selectedDate || '' }));
		setSelectedTimeIndex(null);
	};

	// 관찰시간 선택 함수
	const handleSelectTime = (index: number, time: string) => {
		setSelectedTimeIndex(index);
		setFormData(prev => ({ ...prev, observationTime: time || '' }));
	};

	// 날짜 형식 변환 함수
	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
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

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.observationDate) {
			alert('관찰일자를 입력해주세요.');
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedTimeIndex !== null ? '/api/excretion-observation/update' : '/api/excretion-observation/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData
			// 	})
			// });

			alert(selectedTimeIndex !== null ? '관찰 데이터가 수정되었습니다.' : '관찰 데이터가 저장되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember && formData.observationDate) {
				await fetchObservationTimes(selectedMember.ANCD, selectedMember.PNUM, formData.observationDate);
			}
		} catch (err) {
			console.error('관찰 데이터 저장 오류:', err);
			alert('관찰 데이터 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingObservations(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedTimeIndex === null) {
			alert('삭제할 관찰 데이터를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/excretion-observation/${selectedTimeIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('관찰 데이터가 삭제되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember && formData.observationDate) {
				await fetchObservationTimes(selectedMember.ANCD, selectedMember.PNUM, formData.observationDate);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				observationTime: '',
				diaperUse: '없음',
				stomaCatheter: '',
				intakeAmount: '',
				urine: false,
				stool: false,
				diaperOrClothesChange: false
			}));
			setSelectedTimeIndex(null);
		} catch (err) {
			console.error('관찰 데이터 삭제 오류:', err);
			alert('관찰 데이터 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingObservations(false);
		}
	};

	// 관찰일자 목록 페이지네이션
	const observationDateTotalPages = Math.ceil(observationDates.length / observationDateItemsPerPage);
	const observationDateStartIndex = (observationDatePage - 1) * observationDateItemsPerPage;
	const observationDateEndIndex = observationDateStartIndex + observationDateItemsPerPage;
	const currentDateItems = observationDates.slice(observationDateStartIndex, observationDateEndIndex);

	// 관찰시간 목록 페이지네이션
	const observationTimeTotalPages = Math.ceil(observationTimes.length / observationTimeItemsPerPage);
	const observationTimeStartIndex = (observationTimePage - 1) * observationTimeItemsPerPage;
	const observationTimeEndIndex = observationTimeStartIndex + observationTimeItemsPerPage;
	const currentTimeItems = observationTimes.slice(observationTimeStartIndex, observationTimeEndIndex);

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
									<option value="6">6등급</option>
								</select>
							</div>
							{/* 층수 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<select
									value={selectedFloor}
									onChange={(e) => setSelectedFloor(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">층수 전체</option>
									{Array.from(new Set(memberList.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== ''))).sort((a, b) => Number(a) - Number(b)).map(floor => (
										<option key={floor} value={String(floor)}>{floor}층</option>
									))}
								</select>
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
													{member.P_GRD === '0' ? '등급외' : member.P_GRD ? `${member.P_GRD}등급` : '-'}
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

				{/* 중간-왼쪽 패널: 관찰일자 목록 */}
				<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
					<div className="mb-2">
						<label className="text-sm font-medium text-blue-900">관찰일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingObservations ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
							) : observationDates.length === 0 ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">
									{selectedMember ? '관찰일자가 없습니다' : '수급자를 선택해주세요'}
								</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = observationDateStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`px-2 py-1.5 text-base cursor-pointer hover:bg-blue-100 rounded ${
												selectedDateIndex === globalIndex ? 'bg-blue-200 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									);
								})
							)}
						</div>
						{/* 관찰일자 페이지네이션 */}
						{observationDateTotalPages > 1 && (
							<div className="p-2 mt-2">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setObservationDatePage(1)}
										disabled={observationDatePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setObservationDatePage(prev => Math.max(1, prev - 1))}
										disabled={observationDatePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, observationDateTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(observationDateTotalPages - 4, observationDatePage - 2)) + i;
										if (pageNum > observationDateTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setObservationDatePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													observationDatePage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setObservationDatePage(prev => Math.min(observationDateTotalPages, prev + 1))}
										disabled={observationDatePage >= observationDateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setObservationDatePage(observationDateTotalPages)}
										disabled={observationDatePage >= observationDateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 중간-오른쪽 패널: 관찰시간 목록 */}
				<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
					<div className="mb-2">
						<label className="text-sm font-medium text-blue-900">관찰시간</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingObservations ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
							) : observationTimes.length === 0 ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">
									{selectedDateIndex !== null ? '관찰시간이 없습니다' : '관찰일자를 선택해주세요'}
								</div>
							) : (
								currentTimeItems.map((time, localIndex) => {
									const globalIndex = observationTimeStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectTime(globalIndex, time)}
											className={`px-2 py-1.5 text-base cursor-pointer hover:bg-blue-100 rounded ${
												selectedTimeIndex === globalIndex ? 'bg-blue-200 font-semibold' : ''
											}`}
										>
											{time}
										</div>
									);
								})
							)}
						</div>
						{/* 관찰시간 페이지네이션 */}
						{observationTimeTotalPages > 1 && (
							<div className="p-2 mt-2">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setObservationTimePage(1)}
										disabled={observationTimePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setObservationTimePage(prev => Math.max(1, prev - 1))}
										disabled={observationTimePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, observationTimeTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(observationTimeTotalPages - 4, observationTimePage - 2)) + i;
										if (pageNum > observationTimeTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setObservationTimePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													observationTimePage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setObservationTimePage(prev => Math.min(observationTimeTotalPages, prev + 1))}
										disabled={observationTimePage >= observationTimeTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setObservationTimePage(observationTimeTotalPages)}
										disabled={observationTimePage >= observationTimeTotalPages}
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
								onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="수급자명"
							/>
						</div>

						{/* 관찰일자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관찰일자</label>
							<input
								type="date"
								value={formData.observationDate}
								onChange={(e) => setFormData(prev => ({ ...prev, observationDate: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 수급자상태 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자상태</label>
							<select
								value={formData.beneficiaryStatus}
								onChange={(e) => setFormData(prev => ({ ...prev, beneficiaryStatus: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								<option value="일반">일반</option>
								<option value="응급">응급</option>
								<option value="특별">특별</option>
							</select>
						</div>

						{/* 상태기타 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">상태기타</label>
							<input
								type="text"
								value={formData.statusOther}
								onChange={(e) => setFormData(prev => ({ ...prev, statusOther: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="상태기타를 입력하세요"
							/>
						</div>

						{/* 관찰시간 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관찰시간</label>
							<select
								value={formData.observationTime}
								onChange={(e) => setFormData(prev => ({ ...prev, observationTime: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								<option value="05:00 - 06:00">05:00 - 06:00</option>
								<option value="06:00 - 07:00">06:00 - 07:00</option>
								<option value="07:00 - 08:00">07:00 - 08:00</option>
								<option value="08:00 - 09:00">08:00 - 09:00</option>
								<option value="09:00 - 10:00">09:00 - 10:00</option>
								<option value="10:00 - 11:00">10:00 - 11:00</option>
								<option value="11:00 - 12:00">11:00 - 12:00</option>
								<option value="12:00 - 13:00">12:00 - 13:00</option>
								<option value="13:00 - 14:00">13:00 - 14:00</option>
								<option value="14:00 - 15:00">14:00 - 15:00</option>
								<option value="15:00 - 16:00">15:00 - 16:00</option>
								<option value="16:00 - 17:00">16:00 - 17:00</option>
								<option value="17:00 - 18:00">17:00 - 18:00</option>
								<option value="18:00 - 19:00">18:00 - 19:00</option>
								<option value="19:00 - 20:00">19:00 - 20:00</option>
								<option value="20:00 - 21:00">20:00 - 21:00</option>
								<option value="21:00 - 22:00">21:00 - 22:00</option>
								<option value="22:00 - 23:00">22:00 - 23:00</option>
								<option value="23:00 - 24:00">23:00 - 24:00</option>
							</select>
						</div>

						{/* 소변량 섹션 */}
						<div className="flex items-center gap-4">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소변량</label>
							<div className="flex items-center flex-1 gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">기저귀착용</label>
								<select
									value={formData.diaperUse}
									onChange={(e) => setFormData(prev => ({ ...prev, diaperUse: e.target.value }))}
									className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								>
									<option value="없음">없음</option>
									<option value="있음">있음</option>
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">장루(요루)도뇨관삽입</label>
								<input
									type="number"
									value={formData.stomaCatheter}
									onChange={(e) => setFormData(prev => ({ ...prev, stomaCatheter: e.target.value }))}
									className="w-24 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="0"
								/>
								<span className="text-sm text-blue-900">ml</span>
							</div>
						</div>

						{/* 섭취량 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">섭취량</label>
							<input
								type="number"
								value={formData.intakeAmount}
								onChange={(e) => setFormData(prev => ({ ...prev, intakeAmount: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="섭취량을 입력하세요"
							/>
						</div>

						{/* 배설여부 섹션 */}
						<div className="flex items-center gap-4">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">배설여부</label>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">소변</label>
									<input
										type="checkbox"
										checked={formData.urine}
										onChange={(e) => setFormData(prev => ({ ...prev, urine: e.target.checked }))}
										className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">대변</label>
									<input
										type="checkbox"
										checked={formData.stool}
										onChange={(e) => setFormData(prev => ({ ...prev, stool: e.target.checked }))}
										className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">기저귀 또는 옷 교환</label>
									<input
										type="checkbox"
										checked={formData.diaperOrClothesChange}
										onChange={(e) => setFormData(prev => ({ ...prev, diaperOrClothesChange: e.target.checked }))}
										className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
									/>
								</div>
							</div>
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
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							저장
						</button>
						<button
							onClick={handleDelete}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							삭제
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
