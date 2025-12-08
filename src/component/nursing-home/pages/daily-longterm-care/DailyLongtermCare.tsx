"use client";
import React, { useState, useEffect } from 'react';

interface MemberData {
  [key: string]: any;
}

export default function DailyLongtermCare() {
	const [members, setMembers] = useState<MemberData[]>([]);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const [isEditMode, setIsEditMode] = useState(false);

	// 월 서비스실적 데이터 상태
	const [serviceData, setServiceData] = useState({
		// 수급자 정보
		birthDate: '',
		careGrade: '',
		gender: '',
		certNumber: '',
		expiryDate: '',
		providedDays: '',
		overnightDays: '',
		roomNumber: '',
		// 식사 서비스
		breakfast: { status: '양호', count: '' },
		morningSnack: { status: '양호', count: '' },
		lunch: { status: '양호', count: '' },
		afternoonSnack: { status: '양호', count: '' },
		dinner: { status: '양호', count: '' },
		eveningSnack: { status: '양호', count: '' },
		mealType: '',
		intakeAmount: '',
		// 일상생활지원
		dailyCare: false,
		movementAssistance: false,
		positionChange: false,
		walkAccompany: false,
		outgoingAccompany: false,
		bathCount: '',
		bathMethod: '',
		// 인지 및 의사소통 지원
		cognitiveSupport: false,
		communicationSupport: false,
		// 건강관리
		systolicBP: '',
		diastolicBP: '',
		bodyTemperature: '',
		healthManagement: false,
		nursingManagement: false,
		emergencyService: false,
		medicationManagement: false,
		pressureSoreManagement: false,
		observation: '',
		observationDetails: '',
		// 특화 프로그램
		physicalCognitiveProgram: false,
		physicalFunctionTraining: false,
		cognitiveTraining: false,
		physicalTherapy: false
	});

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		setError(null);
		
		try {
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				setMembers(result.data);
				if (result.data.length > 0 && !selectedMember) {
					setSelectedMember(result.data[0]);
				} else if (result.data.length === 0) {
					setSelectedMember(null);
				}
			} else {
				setError(result.error || '수급자 데이터 조회 실패');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '알 수 없는 오류');
		} finally {
			setLoading(false);
		}
	};

	const handleMemberSelect = (member: MemberData) => {
		setSelectedMember(member);
		// 선택된 수급자 정보로 서비스 데이터 초기화
		if (member) {
			setServiceData(prev => ({
				...prev,
				birthDate: member.P_BRDT ? member.P_BRDT.substring(0, 10) : '',
				careGrade: member.P_GRD || '',
				gender: member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '',
				certNumber: member.P_CERTNO || '',
				expiryDate: member.P_CERTEDT ? member.P_CERTEDT.substring(0, 10) : '',
				roomNumber: member.P_ROOM || ''
			}));
		}
	};

	const handleSave = async () => {
		// 저장 로직 구현
		setLoading(true);
		try {
			// TODO: API 호출하여 데이터 저장
			alert('저장되었습니다.');
			setIsEditMode(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : '저장 실패');
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) return;
		
		if (confirm('정말 삭제하시겠습니까?')) {
			setLoading(true);
			try {
				// TODO: API 호출하여 데이터 삭제
				alert('삭제되었습니다.');
				setIsEditMode(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : '삭제 실패');
			} finally {
				setLoading(false);
			}
		}
	};

	const handleCancel = () => {
		setIsEditMode(false);
		// 수정 취소 시 원래 데이터로 복원
		if (selectedMember) {
			setServiceData(prev => ({
				...prev,
				birthDate: selectedMember.P_BRDT ? selectedMember.P_BRDT.substring(0, 10) : '',
				careGrade: selectedMember.P_GRD || '',
				gender: selectedMember.P_SEX === '1' ? '남' : selectedMember.P_SEX === '2' ? '여' : '',
				certNumber: selectedMember.P_CERTNO || '',
				expiryDate: selectedMember.P_CERTEDT ? selectedMember.P_CERTEDT.substring(0, 10) : '',
				roomNumber: selectedMember.P_ROOM || ''
			}));
		}
	};

	// 클라이언트 측 추가 필터링
	const filteredMembers = members.filter(member => {
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
			const matchesSearch = (
				member.P_NM?.toLowerCase().includes(searchLower) ||
				member.P_TEL?.includes(searchTerm) ||
				member.P_HP?.includes(searchTerm) ||
				String(member.ANCD || '').includes(searchTerm) ||
				String(member.PNUM || '').includes(searchTerm)
			);
			if (!matchesSearch) {
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

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor]);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<div className="overflow-hidden bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-3 py-2 font-semibold text-blue-900 bg-blue-100 border-b border-blue-300">수급자 목록</div>
							{/* 상단 상태/검색 영역 */}
							<div className="px-3 py-2 space-y-2 border-b border-blue-100">
								{/* 현황 필터 */}
								<div className="space-y-1">
									<div className="text-xs text-blue-900/80">현황</div>
									<select
										value={selectedStatus}
										onChange={(e) => {
											setSelectedStatus(e.target.value);
											setCurrentPage(1);
										}}
										className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
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
										onChange={(e) => {
											setSelectedGrade(e.target.value);
											setCurrentPage(1);
										}}
										className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
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
										onChange={(e) => {
											setSelectedFloor(e.target.value);
											setCurrentPage(1);
										}}
										className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
									>
										<option value="">층수 전체</option>
										{Array.from(new Set(members.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== ''))).sort((a, b) => Number(a) - Number(b)).map(floor => (
											<option key={floor} value={String(floor)}>{floor}층</option>
										))}
									</select>
								</div>
								{/* 이름 검색 */}
								<div className="space-y-1">
									<div className="text-xs text-blue-900/80">이름 검색</div>
									<input 
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded" 
										placeholder="예) 홍길동"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												setCurrentPage(1);
												fetchMembers(searchTerm);
											}
										}}
									/>
								</div>
								<button 
									className="w-full py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									onClick={() => {
										setCurrentPage(1);
										fetchMembers(searchTerm);
									}}
								>
									{loading ? '검색 중...' : '검색'}
								</button>
							</div>
							{/* 목록 테이블 */}
							<div className="max-h-[540px] overflow-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
										<tr>
											<th className="px-2 py-2 font-semibold text-left text-blue-900">이름</th>
											<th className="px-2 py-2 font-semibold text-left text-blue-900">등급</th>
											<th className="px-2 py-2 font-semibold text-left text-blue-900">상태</th>
										</tr>
									</thead>
									<tbody>
										{loading ? (
											<tr>
												<td colSpan={3} className="px-2 py-4 text-center text-blue-900/60">
													로딩 중...
												</td>
											</tr>
										) : error ? (
											<tr>
												<td colSpan={3} className="px-2 py-4 text-center text-red-600">
													{error}
												</td>
											</tr>
										) : filteredMembers.length === 0 ? (
											<tr>
												<td colSpan={3} className="px-2 py-4 text-center text-blue-900/60">
													수급자 데이터가 없습니다
												</td>
											</tr>
										) : (
											currentMembers.map((member, idx) => (
												<tr 
													key={`${member.ANCD}-${member.PNUM}-${idx}`} 
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM ? 'bg-blue-100' : ''
													}`}
													onClick={() => handleMemberSelect(member)}
												>
													<td className="px-2 py-2">{member.P_NM || member.ANCD || '이름 없음'}</td>
													<td className="px-2 py-2">{member.P_GRD || '등급 없음'}</td>
													<td className="px-2 py-2">
														{member.P_ST === '1' 
															? '입소' 
															: member.P_ST === '9' 
																? '퇴소' 
																: '-'}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
							
							{/* 페이지네이션 */}
							{totalPages > 1 && (
								<div className="p-3 border-t border-blue-100">
									<div className="flex items-center justify-center">
										<div className="flex gap-1">
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
								</div>
							)}
						</div>
					</aside>

					{/* 우측: 월 서비스실적 조회 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							{/* 헤더 */}
							<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">월 서비스실적 조회</h2>
								<div className="flex items-center gap-2">
									{isEditMode ? (
										<>
											<button 
												className="px-3 py-1 text-sm text-gray-700 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
												onClick={handleCancel}
											>
												취소
											</button>
											<button 
												className="px-3 py-1 text-sm text-white bg-red-600 border border-red-700 rounded hover:bg-red-700"
												onClick={handleDelete}
												disabled={loading}
											>
												삭제
											</button>
											<button 
												className="px-3 py-1 text-sm text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
												onClick={handleSave}
												disabled={loading}
											>
												{loading ? '저장 중...' : '저장'}
											</button>
										</>
									) : (
										<>
											<button 
												className="px-3 py-1 text-sm text-white bg-green-600 border border-green-700 rounded hover:bg-green-700"
												onClick={() => setIsEditMode(true)}
											>
												수정
											</button>
											<button className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">
												센터소견등록
											</button>
										</>
									)}
								</div>
							</div>

							<div className="p-4 space-y-4">
								{/* 수급자 정보 */}
								<div className="p-3 border border-blue-200 rounded bg-blue-50/50">
									<h3 className="mb-3 text-sm font-semibold text-blue-900">수급자 정보</h3>
									<div className="grid grid-cols-12 gap-3 text-sm">
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">수급자</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={selectedMember?.P_NM || ''} 
												readOnly 
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">생일</label>
											<input 
												type="date"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.birthDate}
												onChange={(e) => setServiceData(prev => ({ ...prev, birthDate: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">요양등급</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.careGrade}
												onChange={(e) => setServiceData(prev => ({ ...prev, careGrade: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">성별</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.gender}
												onChange={(e) => setServiceData(prev => ({ ...prev, gender: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">장기요양인증번호</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.certNumber}
												onChange={(e) => setServiceData(prev => ({ ...prev, certNumber: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">만료일자</label>
											<input 
												type="date"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.expiryDate}
												onChange={(e) => setServiceData(prev => ({ ...prev, expiryDate: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">제공일수</label>
											<input 
												type="number"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.providedDays}
												onChange={(e) => setServiceData(prev => ({ ...prev, providedDays: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">외박일수</label>
											<input 
												type="number"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.overnightDays}
												onChange={(e) => setServiceData(prev => ({ ...prev, overnightDays: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">방번호</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.roomNumber}
												onChange={(e) => setServiceData(prev => ({ ...prev, roomNumber: e.target.value }))}
											/>
										</div>
									</div>
								</div>

								{/* 식사 서비스 */}
								<div className="p-3 border border-blue-200 rounded bg-blue-50/50">
									<h3 className="mb-3 text-sm font-semibold text-blue-900">식사 서비스</h3>
									<div className="grid grid-cols-12 gap-3 text-sm">
										{/* 아침식사 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-20 text-blue-900/80">아침식사</label>
											<select 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
												value={serviceData.breakfast.status}
												onChange={(e) => setServiceData(prev => ({ ...prev, breakfast: { ...prev.breakfast, status: e.target.value } }))}
											>
												<option value="양호">양호</option>
												<option value="이상">이상</option>
											</select>
											<input 
												type="number"
												className="w-16 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.breakfast.count}
												onChange={(e) => setServiceData(prev => ({ ...prev, breakfast: { ...prev.breakfast, count: e.target.value } }))}
												placeholder="횟수"
											/>
											<span className="text-blue-900/80">이상</span>
										</div>
										{/* 오전간식 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-20 text-blue-900/80">오전간식</label>
											<select 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
												value={serviceData.morningSnack.status}
												onChange={(e) => setServiceData(prev => ({ ...prev, morningSnack: { ...prev.morningSnack, status: e.target.value } }))}
											>
												<option value="양호">양호</option>
												<option value="이상">이상</option>
											</select>
											<input 
												type="number"
												className="w-16 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.morningSnack.count}
												onChange={(e) => setServiceData(prev => ({ ...prev, morningSnack: { ...prev.morningSnack, count: e.target.value } }))}
												placeholder="횟수"
											/>
											<span className="text-blue-900/80">이상</span>
										</div>
										{/* 점심식사 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-20 text-blue-900/80">점심식사</label>
											<select 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
												value={serviceData.lunch.status}
												onChange={(e) => setServiceData(prev => ({ ...prev, lunch: { ...prev.lunch, status: e.target.value } }))}
											>
												<option value="양호">양호</option>
												<option value="이상">이상</option>
											</select>
											<input 
												type="number"
												className="w-16 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.lunch.count}
												onChange={(e) => setServiceData(prev => ({ ...prev, lunch: { ...prev.lunch, count: e.target.value } }))}
												placeholder="횟수"
											/>
											<span className="text-blue-900/80">이상</span>
										</div>
										{/* 오후간식 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-20 text-blue-900/80">오후간식</label>
											<select 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
												value={serviceData.afternoonSnack.status}
												onChange={(e) => setServiceData(prev => ({ ...prev, afternoonSnack: { ...prev.afternoonSnack, status: e.target.value } }))}
											>
												<option value="양호">양호</option>
												<option value="이상">이상</option>
											</select>
											<input 
												type="number"
												className="w-16 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.afternoonSnack.count}
												onChange={(e) => setServiceData(prev => ({ ...prev, afternoonSnack: { ...prev.afternoonSnack, count: e.target.value } }))}
												placeholder="횟수"
											/>
											<span className="text-blue-900/80">이상</span>
										</div>
										{/* 저녁식사 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-20 text-blue-900/80">저녁식사</label>
											<select 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
												value={serviceData.dinner.status}
												onChange={(e) => setServiceData(prev => ({ ...prev, dinner: { ...prev.dinner, status: e.target.value } }))}
											>
												<option value="양호">양호</option>
												<option value="이상">이상</option>
											</select>
											<input 
												type="number"
												className="w-16 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.dinner.count}
												onChange={(e) => setServiceData(prev => ({ ...prev, dinner: { ...prev.dinner, count: e.target.value } }))}
												placeholder="횟수"
											/>
											<span className="text-blue-900/80">이상</span>
										</div>
										{/* 자녁간식 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-20 text-blue-900/80">자녁간식</label>
											<select 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
												value={serviceData.eveningSnack.status}
												onChange={(e) => setServiceData(prev => ({ ...prev, eveningSnack: { ...prev.eveningSnack, status: e.target.value } }))}
											>
												<option value="양호">양호</option>
												<option value="이상">이상</option>
											</select>
											<input 
												type="number"
												className="w-16 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.eveningSnack.count}
												onChange={(e) => setServiceData(prev => ({ ...prev, eveningSnack: { ...prev.eveningSnack, count: e.target.value } }))}
												placeholder="횟수"
											/>
											<span className="text-blue-900/80">이상</span>
										</div>
										{/* 식사 종류 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">식사 종류</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.mealType}
												onChange={(e) => setServiceData(prev => ({ ...prev, mealType: e.target.value }))}
											/>
										</div>
										{/* 섭취량 */}
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-24 text-blue-900/80">섭취량</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.intakeAmount}
												onChange={(e) => setServiceData(prev => ({ ...prev, intakeAmount: e.target.value }))}
											/>
										</div>
									</div>
								</div>

								{/* 일상생활지원 */}
								<div className="p-3 border border-blue-200 rounded bg-blue-50/50">
									<h3 className="mb-3 text-sm font-semibold text-blue-900">일상생활지원</h3>
									<div className="grid grid-cols-12 gap-3 text-sm">
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.dailyCare}
												onChange={(e) => setServiceData(prev => ({ ...prev, dailyCare: e.target.checked }))}
											/>
											<label className="text-blue-900/80">세면, 구강, 머리감기, 몸단장, 옷 갈아입기</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.movementAssistance}
												onChange={(e) => setServiceData(prev => ({ ...prev, movementAssistance: e.target.checked }))}
											/>
											<label className="text-blue-900/80">이동도움 및 신체기능 유지. 증진</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.positionChange}
												onChange={(e) => setServiceData(prev => ({ ...prev, positionChange: e.target.checked }))}
											/>
											<label className="text-blue-900/80">체위변경(2시간마다)</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.walkAccompany}
												onChange={(e) => setServiceData(prev => ({ ...prev, walkAccompany: e.target.checked }))}
											/>
											<label className="text-blue-900/80">산책동행</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.outgoingAccompany}
												onChange={(e) => setServiceData(prev => ({ ...prev, outgoingAccompany: e.target.checked }))}
											/>
											<label className="text-blue-900/80">외출동행</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-32 text-blue-900/80">목욕횟수</label>
											<input 
												type="number"
												className="w-20 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.bathCount}
												onChange={(e) => setServiceData(prev => ({ ...prev, bathCount: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<label className="w-32 text-blue-900/80">목욕방법</label>
											<input 
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.bathMethod}
												onChange={(e) => setServiceData(prev => ({ ...prev, bathMethod: e.target.value }))}
											/>
										</div>
									</div>
								</div>

								{/* 인지 및 의사소통 지원 */}
								<div className="p-3 border border-blue-200 rounded bg-blue-50/50">
									<h3 className="mb-3 text-sm font-semibold text-blue-900">인지 및 의사소통 지원</h3>
									<div className="grid grid-cols-12 gap-3 text-sm">
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.cognitiveSupport}
												onChange={(e) => setServiceData(prev => ({ ...prev, cognitiveSupport: e.target.checked }))}
											/>
											<label className="text-blue-900/80">인지관리 지원</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.communicationSupport}
												onChange={(e) => setServiceData(prev => ({ ...prev, communicationSupport: e.target.checked }))}
											/>
											<label className="text-blue-900/80">의사소통도움 및 신체 기능유지 증진</label>
										</div>
									</div>
								</div>

								{/* 건강관리 */}
								<div className="p-3 border border-blue-200 rounded bg-blue-50/50">
									<h3 className="mb-3 text-sm font-semibold text-blue-900">건강관리</h3>
									<div className="grid grid-cols-12 gap-3 text-sm">
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-24 text-blue-900/80">평균혈압-(수축)</label>
											<input 
												type="number"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.systolicBP}
												onChange={(e) => setServiceData(prev => ({ ...prev, systolicBP: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-24 text-blue-900/80">(이완)</label>
											<input 
												type="number"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.diastolicBP}
												onChange={(e) => setServiceData(prev => ({ ...prev, diastolicBP: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-4">
											<label className="w-24 text-blue-900/80">체온</label>
											<input 
												type="number"
												step="0.1"
												className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded" 
												value={serviceData.bodyTemperature}
												onChange={(e) => setServiceData(prev => ({ ...prev, bodyTemperature: e.target.value }))}
											/>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.healthManagement}
												onChange={(e) => setServiceData(prev => ({ ...prev, healthManagement: e.target.checked }))}
											/>
											<label className="text-blue-900/80">건강관리</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.nursingManagement}
												onChange={(e) => setServiceData(prev => ({ ...prev, nursingManagement: e.target.checked }))}
											/>
											<label className="text-blue-900/80">간호관리</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.emergencyService}
												onChange={(e) => setServiceData(prev => ({ ...prev, emergencyService: e.target.checked }))}
											/>
											<label className="text-blue-900/80">기타(응급서비스)</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.medicationManagement}
												onChange={(e) => setServiceData(prev => ({ ...prev, medicationManagement: e.target.checked }))}
											/>
											<label className="text-blue-900/80">투약관리</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.pressureSoreManagement}
												onChange={(e) => setServiceData(prev => ({ ...prev, pressureSoreManagement: e.target.checked }))}
											/>
											<label className="text-blue-900/80">욕창관리</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.observation === '이상있음'}
												onChange={(e) => setServiceData(prev => ({ ...prev, observation: e.target.checked ? '이상있음' : '이상없음' }))}
											/>
											<label className="text-blue-900/80">관찰</label>
											<span className="text-blue-900/60">{serviceData.observation || '이상없음'}</span>
										</div>
										<div className="flex flex-col col-span-12 gap-1">
											<label className="text-blue-900/80">관찰내역</label>
											<textarea 
												className="w-full border border-blue-300 rounded px-2 py-1 bg-white min-h-[80px]" 
												value={serviceData.observationDetails}
												onChange={(e) => setServiceData(prev => ({ ...prev, observationDetails: e.target.value }))}
											/>
										</div>
									</div>
								</div>

								{/* 특화 프로그램 */}
								<div className="p-3 border border-blue-200 rounded bg-blue-50/50">
									<h3 className="mb-3 text-sm font-semibold text-blue-900">특화 프로그램</h3>
									<div className="grid grid-cols-12 gap-3 text-sm">
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.physicalCognitiveProgram}
												onChange={(e) => setServiceData(prev => ({ ...prev, physicalCognitiveProgram: e.target.checked }))}
											/>
											<label className="text-blue-900/80">신체. 인지기능 향상 프로그램</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.physicalFunctionTraining}
												onChange={(e) => setServiceData(prev => ({ ...prev, physicalFunctionTraining: e.target.checked }))}
											/>
											<label className="text-blue-900/80">신체기능.기본동작 일상생활활동작훈련</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.cognitiveTraining}
												onChange={(e) => setServiceData(prev => ({ ...prev, cognitiveTraining: e.target.checked }))}
											/>
											<label className="text-blue-900/80">인지기능향상훈련</label>
										</div>
										<div className="flex items-center col-span-12 gap-2 md:col-span-6">
											<input 
												type="checkbox"
												className="w-4 h-4 border border-blue-300 rounded"
												checked={serviceData.physicalTherapy}
												onChange={(e) => setServiceData(prev => ({ ...prev, physicalTherapy: e.target.checked }))}
											/>
											<label className="text-blue-900/80">물리(작업)치료</label>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

