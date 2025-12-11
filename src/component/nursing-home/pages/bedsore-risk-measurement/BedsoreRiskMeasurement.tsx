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

export default function BedsoreRiskMeasurement() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [inspectionDates, setInspectionDates] = useState<string[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);

	// 폼 데이터
	const [formData, setFormData] = useState({
		inspectionDate: '2025-10-05', // 검사일자
		beneficiary: '길덕남', // 수급자
		sensoryPerception: '4.감각 손상 없음', // 감각인지도
		moisture: '4.거의 젖지 않음', // 습기
		activity: '4.자주 걸을 수 있음', // 활동성
		mobility: '4.제한 없음', // 움직임
		nutritionalStatus: '3.적당함', // 영양상태
		frictionShear: '3.문제 없음', // 마찰력
		score: '19', // 점수
		interpretation: '위험 없음', // 해석
		examiner: '염소연', // 검사자
		opinion: '- 욕창위험도평가 19점으로 위험 없음평가됨.' // 의견
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

	// 검사일자 목록 조회
	const fetchInspectionDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setInspectionDates([]);
			return;
		}

		setLoadingDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/bedsore-risk-measurement/dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시 데이터
			const mockDates = ['2025-10-05', '2025-04-07', '2024-10-02', '2024-05-24', '2024-04-08'];
			setInspectionDates(mockDates);
		} catch (err) {
			console.error('검사일자 조회 오류:', err);
		} finally {
			setLoadingDates(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchInspectionDates(member.ANCD, member.PNUM);
	};

	// 검사일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = inspectionDates[index];
		setFormData(prev => ({ ...prev, inspectionDate: selectedDate || '' }));
		// TODO: 선택한 날짜의 검사 데이터 조회
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

	// 점수 계산 함수
	const calculateScore = () => {
		const scores: { [key: string]: number } = {
			'4.감각 손상 없음': 4,
			'3.감각 손상 약간 있음': 3,
			'2.감각 손상 심함': 2,
			'1.감각 손상 완전히 없음': 1,
			'4.거의 젖지 않음': 4,
			'3.가끔 젖음': 3,
			'2.자주 젖음': 2,
			'1.항상 젖음': 1,
			'4.자주 걸을 수 있음': 4,
			'3.가끔 걸을 수 있음': 3,
			'2.거의 걸을 수 없음': 2,
			'1.완전히 누워있음': 1,
			'4.제한 없음': 4,
			'3.약간 제한됨': 3,
			'2.매우 제한됨': 2,
			'1.완전히 움직일 수 없음': 1,
			'3.적당함': 3,
			'2.부족함': 2,
			'1.매우 부족함': 1,
			'3.문제 없음': 3,
			'2.문제 있음': 2,
			'1.심각한 문제': 1
		};

		const totalScore = 
			(scores[formData.sensoryPerception] || 0) +
			(scores[formData.moisture] || 0) +
			(scores[formData.activity] || 0) +
			(scores[formData.mobility] || 0) +
			(scores[formData.nutritionalStatus] || 0) +
			(scores[formData.frictionShear] || 0);

		setFormData(prev => ({ ...prev, score: totalScore.toString() }));

		// 해석 업데이트
		let interpretation = '';
		if (totalScore >= 19) {
			interpretation = '위험 없음';
		} else if (totalScore >= 15) {
			interpretation = '낮은 위험';
		} else if (totalScore >= 12) {
			interpretation = '중간 위험';
		} else {
			interpretation = '높은 위험';
		}
		setFormData(prev => ({ ...prev, interpretation }));
	};

	// 평가 항목 변경 시 점수 자동 계산
	useEffect(() => {
		if (formData.sensoryPerception && formData.moisture && formData.activity && 
			formData.mobility && formData.nutritionalStatus && formData.frictionShear) {
			calculateScore();
		}
	}, [formData.sensoryPerception, formData.moisture, formData.activity, 
		formData.mobility, formData.nutritionalStatus, formData.frictionShear]);

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.inspectionDate) {
			alert('검사일자를 입력해주세요.');
			return;
		}

		setLoadingDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedDateIndex !== null ? '/api/bedsore-risk-measurement/update' : '/api/bedsore-risk-measurement/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData
			// 	})
			// });

			alert(selectedDateIndex !== null ? '욕창 위험도 측정이 수정되었습니다.' : '욕창 위험도 측정이 저장되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchInspectionDates(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('욕창 위험도 측정 저장 오류:', err);
			alert('욕창 위험도 측정 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 검사를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/bedsore-risk-measurement/${selectedDateIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('욕창 위험도 측정이 삭제되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchInspectionDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				inspectionDate: '',
				sensoryPerception: '',
				moisture: '',
				activity: '',
				mobility: '',
				nutritionalStatus: '',
				frictionShear: '',
				score: '',
				interpretation: '',
				examiner: '',
				opinion: ''
			}));
			setSelectedDateIndex(null);
		} catch (err) {
			console.error('욕창 위험도 측정 삭제 오류:', err);
			alert('욕창 위험도 측정 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	// 검사작업 함수
	const handleInspectionWork = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		// TODO: 검사작업 기능 구현
		alert('검사작업 기능은 준비 중입니다.');
	};

	// 검사재조회 함수
	const handleReInquire = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (selectedDateIndex === null) {
			alert('재조회할 검사를 선택해주세요.');
			return;
		}
		// TODO: 검사재조회 기능 구현
		alert('검사재조회 기능은 준비 중입니다.');
	};

	// 검사자변경 함수
	const handleChangeExaminer = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (selectedDateIndex === null) {
			alert('검사자를 변경할 검사를 선택해주세요.');
			return;
		}
		// TODO: 검사자변경 기능 구현
		alert('검사자변경 기능은 준비 중입니다.');
	};

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

				{/* 우측 패널: 검사 폼 */}
				<div className="flex flex-1 overflow-hidden bg-white">
					{/* 왼쪽: 검사일자 목록 */}
					<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
						<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
							<label className="text-sm font-medium text-blue-900">검사일자</label>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="flex-1 overflow-y-auto bg-white">
								{loadingDates ? (
									<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
								) : inspectionDates.length === 0 ? (
									<div className="px-3 py-2 text-sm text-blue-900/60">
										{selectedMember ? '검사일자가 없습니다' : '수급자를 선택해주세요'}
									</div>
								) : (
									inspectionDates.map((date, index) => (
										<div
											key={index}
											onClick={() => handleSelectDate(index)}
											className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
												selectedDateIndex === index ? 'bg-blue-100 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									))
								)}
							</div>
						</div>
					</div>

					{/* 오른쪽: 검사 폼 */}
					<div className="flex flex-1 overflow-hidden bg-white">
						<div className="flex-1 p-4 overflow-y-auto">
							<div className="space-y-4">
								{/* 상단 정보 필드 */}
								<div className="flex flex-wrap items-center gap-4">
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">검사일자</label>
										<input
											type="text"
											value={formData.inspectionDate}
											onChange={(e) => setFormData(prev => ({ ...prev, inspectionDate: e.target.value }))}
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[120px]"
											placeholder="YYYY-MM-DD"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
										<input
											type="text"
											value={formData.beneficiary}
											readOnly
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[120px]"
										/>
									</div>
								</div>

								{/* 평가 항목 */}
								<div className="space-y-4">
									<div className="flex items-center gap-2">
										<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">감각인지도</label>
										<select
											value={formData.sensoryPerception}
											onChange={(e) => setFormData(prev => ({ ...prev, sensoryPerception: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="4.감각 손상 없음">4.감각 손상 없음</option>
											<option value="3.감각 손상 약간 있음">3.감각 손상 약간 있음</option>
											<option value="2.감각 손상 심함">2.감각 손상 심함</option>
											<option value="1.감각 손상 완전히 없음">1.감각 손상 완전히 없음</option>
										</select>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">습기</label>
										<select
											value={formData.moisture}
											onChange={(e) => setFormData(prev => ({ ...prev, moisture: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="4.거의 젖지 않음">4.거의 젖지 않음</option>
											<option value="3.가끔 젖음">3.가끔 젖음</option>
											<option value="2.자주 젖음">2.자주 젖음</option>
											<option value="1.항상 젖음">1.항상 젖음</option>
										</select>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">활동성</label>
										<select
											value={formData.activity}
											onChange={(e) => setFormData(prev => ({ ...prev, activity: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="4.자주 걸을 수 있음">4.자주 걸을 수 있음</option>
											<option value="3.가끔 걸을 수 있음">3.가끔 걸을 수 있음</option>
											<option value="2.거의 걸을 수 없음">2.거의 걸을 수 없음</option>
											<option value="1.완전히 누워있음">1.완전히 누워있음</option>
										</select>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">움직임</label>
										<select
											value={formData.mobility}
											onChange={(e) => setFormData(prev => ({ ...prev, mobility: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="4.제한 없음">4.제한 없음</option>
											<option value="3.약간 제한됨">3.약간 제한됨</option>
											<option value="2.매우 제한됨">2.매우 제한됨</option>
											<option value="1.완전히 움직일 수 없음">1.완전히 움직일 수 없음</option>
										</select>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">영양상태</label>
										<select
											value={formData.nutritionalStatus}
											onChange={(e) => setFormData(prev => ({ ...prev, nutritionalStatus: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="3.적당함">3.적당함</option>
											<option value="2.부족함">2.부족함</option>
											<option value="1.매우 부족함">1.매우 부족함</option>
										</select>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">마찰력</label>
										<select
											value={formData.frictionShear}
											onChange={(e) => setFormData(prev => ({ ...prev, frictionShear: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="3.문제 없음">3.문제 없음</option>
											<option value="2.문제 있음">2.문제 있음</option>
											<option value="1.심각한 문제">1.심각한 문제</option>
										</select>
									</div>
								</div>

								{/* 점수, 해석, 검사자 */}
								<div className="grid grid-cols-3 gap-4">
									<div className="flex items-center gap-2">
										<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">점수</label>
										<input
											type="text"
											value={formData.score}
											readOnly
											className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">해석</label>
										<input
											type="text"
											value={formData.interpretation}
											readOnly
											className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">검사자</label>
										<select
											value={formData.examiner}
											onChange={(e) => setFormData(prev => ({ ...prev, examiner: e.target.value }))}
											className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										>
											<option value="염소연">염소연</option>
											<option value="기타">기타</option>
										</select>
									</div>
								</div>

								{/* 의견 */}
								<div className="flex items-start gap-2">
									<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">의견</label>
									<textarea
										value={formData.opinion}
										onChange={(e) => setFormData(prev => ({ ...prev, opinion: e.target.value }))}
										className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[100px]"
										rows={4}
									/>
								</div>
							</div>
						</div>

						{/* 오른쪽 버튼 영역 */}
						<div className="flex flex-col gap-2 p-4 border-l border-blue-200">
							<button
								onClick={handleInspectionWork}
								className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
							>
								검사작업
							</button>
							<button
								onClick={handleReInquire}
								className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
							>
								검사재조회
							</button>
							<button
								onClick={handleChangeExaminer}
								className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
							>
								검사자변경
							</button>
							<button
								onClick={handleDelete}
								className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
							>
								삭제
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
