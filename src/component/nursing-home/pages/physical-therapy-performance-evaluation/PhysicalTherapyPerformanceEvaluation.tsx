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

interface EvaluationData {
	EVALDT: string; // 평가일자
	[key: string]: any;
}

export default function PhysicalTherapyPerformanceEvaluation() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [evaluationDates, setEvaluationDates] = useState<string[]>([]);
	const [loadingEvaluations, setLoadingEvaluations] = useState(false);
	const [activeTab, setActiveTab] = useState<string>('운동');

	// 폼 데이터
	const [formData, setFormData] = useState({
		evaluationDate: '2025-12-11', // 작성일자
		beneficiary: '', // 수급자
		// 운동장애 평가
		rightUpperLimb: '운동장애없음', // 우측상지
		leftUpperLimb: '운동장애없음', // 좌측상지
		rightLowerLimb: '운동장애없음', // 우측하지
		leftLowerLimb: '운동장애없음', // 좌측하지
		// 관절제한 평가
		shoulderJoint: '제한없음', // 어깨관절
		elbowJoint: '제한없음', // 팔꿈치관절
		wristFingerJoint: '제한없음', // 손목 및 수지관절
		hipJoint: '제한없음', // 고관절
		kneeJoint: '제한없음', // 무릎관절
		ankleJoint: '제한없음', // 발목관절
		bodyPain: '없음', // 신체통증유무
		// 기본동작평가
		bedMovement: false, // 침상이동 - 측면 & 침상위 이동
		sitting: false, // 앉기
		crawling: false, // 네발기기
		kneeling: false, // 무릎서기
		standing: false, // 기립
		walking: false, // 보행
		wheelchairOperation: false, // 휠체어 조작 및 이동
		assistiveDeviceMovement: false, // 보장구 장착 이동
		// ADL1
		bowelBladder: '0', // 대소변
		eating: '0', // 식사
		// ADL2
		clothing: '0', // 복장
		personalHygiene: '0', // 개인위생
		// ADL3
		gait: '0', // 보행
		bathing: '0', // 목욕하기
		// 총점
		totalScore: '', // 총점
		evaluator: '' // 평가자
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

	// 평가일자 목록 조회
	const fetchEvaluationDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setEvaluationDates([]);
			return;
		}

		setLoadingEvaluations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/physical-therapy-performance-evaluation/dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setEvaluationDates([]);
		} catch (err) {
			console.error('평가일자 조회 오류:', err);
		} finally {
			setLoadingEvaluations(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchEvaluationDates(member.ANCD, member.PNUM);
	};

	// 평가일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = evaluationDates[index];
		setFormData(prev => ({ ...prev, evaluationDate: selectedDate || '' }));
		// TODO: 선택한 날짜의 평가 데이터 조회
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

		if (!formData.evaluationDate) {
			alert('작성일자를 입력해주세요.');
			return;
		}

		setLoadingEvaluations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedDateIndex !== null ? '/api/physical-therapy-performance-evaluation/update' : '/api/physical-therapy-performance-evaluation/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData
			// 	})
			// });

			alert(selectedDateIndex !== null ? '물리치료실적 평가가 수정되었습니다.' : '물리치료실적 평가가 저장되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchEvaluationDates(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('물리치료실적 평가 저장 오류:', err);
			alert('물리치료실적 평가 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingEvaluations(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 평가를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingEvaluations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/physical-therapy-performance-evaluation/${selectedDateIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('물리치료실적 평가가 삭제되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchEvaluationDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				rightUpperLimb: '운동장애없음',
				leftUpperLimb: '운동장애없음',
				rightLowerLimb: '운동장애없음',
				leftLowerLimb: '운동장애없음',
				shoulderJoint: '제한없음',
				elbowJoint: '제한없음',
				wristFingerJoint: '제한없음',
				hipJoint: '제한없음',
				kneeJoint: '제한없음',
				ankleJoint: '제한없음',
				bodyPain: '없음',
				bedMovement: false,
				sitting: false,
				crawling: false,
				kneeling: false,
				standing: false,
				walking: false,
				wheelchairOperation: false,
				assistiveDeviceMovement: false,
				bowelBladder: '0',
				eating: '0',
				clothing: '0',
				personalHygiene: '0',
				gait: '0',
				bathing: '0',
				totalScore: '',
				evaluator: ''
			}));
			setSelectedDateIndex(null);
		} catch (err) {
			console.error('물리치료실적 평가 삭제 오류:', err);
			alert('물리치료실적 평가 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingEvaluations(false);
		}
	};

	// 총점 계산 함수
	const calculateTotalScore = () => {
		const scores = [
			parseInt(formData.bowelBladder) || 0,
			parseInt(formData.eating) || 0,
			parseInt(formData.clothing) || 0,
			parseInt(formData.personalHygiene) || 0,
			parseInt(formData.gait) || 0,
			parseInt(formData.bathing) || 0
		];
		const total = scores.reduce((sum, score) => sum + score, 0);
		setFormData(prev => ({ ...prev, totalScore: total.toString() }));
	};

	const tabs = ['운동', '관절', '동작', 'ADL1', 'ADL2', 'ADL3', '총점'];

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

				{/* 우측 패널: 평가 폼 */}
				<div className="flex flex-col flex-1 bg-white">
					{/* 상단: 탭과 수급자 필드 */}
					<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50">
						<div className="flex items-center gap-2">
							{tabs.map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`px-4 py-2 text-sm font-medium border border-blue-300 rounded ${
										activeTab === tab
											? 'bg-blue-500 text-white border-blue-500'
											: 'bg-white text-blue-900 hover:bg-blue-100'
									}`}
								>
									{tab}
								</button>
							))}
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자</label>
							<input
								type="text"
								value={formData.beneficiary}
								readOnly
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[120px]"
							/>
						</div>
					</div>

					{/* 메인 컨텐츠 영역 */}
					<div className="flex-1 p-4 overflow-y-auto">
						<div className="flex gap-4">
							{/* 왼쪽: 평가 폼 */}
							<div className="flex-1 space-y-4">
								{/* 작성일자 */}
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">작성일자</label>
									<input
										type="text"
										value={formData.evaluationDate}
										onChange={(e) => setFormData(prev => ({ ...prev, evaluationDate: e.target.value }))}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
										placeholder="YYYY-MM-DD"
									/>
								</div>

								{/* 탭별 컨텐츠 */}
								{activeTab === '운동' && (
									<div className="mt-6">
										<h2 className="mb-4 text-lg font-semibold text-blue-900">
											1. 운동장애 및 관절제한 평가 (운동장애정도)
										</h2>
										<div className="space-y-6">
											{/* (1) 우측상지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(1) 우측상지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightUpperLimb" value="운동장애없음" checked={formData.rightUpperLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, rightUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightUpperLimb" value="불완전운동장애" checked={formData.rightUpperLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightUpperLimb" value="완전운동장애" checked={formData.rightUpperLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
											{/* (2) 좌측상지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(2) 좌측상지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftUpperLimb" value="운동장애없음" checked={formData.leftUpperLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, leftUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftUpperLimb" value="불완전운동장애" checked={formData.leftUpperLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftUpperLimb" value="완전운동장애" checked={formData.leftUpperLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
											{/* (3) 우측하지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(3) 우측하지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightLowerLimb" value="운동장애없음" checked={formData.rightLowerLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, rightLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightLowerLimb" value="불완전운동장애" checked={formData.rightLowerLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightLowerLimb" value="완전운동장애" checked={formData.rightLowerLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
											{/* (4) 좌측하지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(4) 좌측하지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftLowerLimb" value="운동장애없음" checked={formData.leftLowerLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, leftLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftLowerLimb" value="불완전운동장애" checked={formData.leftLowerLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftLowerLimb" value="완전운동장애" checked={formData.leftLowerLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
										</div>
									</div>
								)}

								{activeTab === '관절' && (
									<div className="mt-6">
										<h2 className="mb-4 text-lg font-semibold text-blue-900">
											1. 운동장애 및 관절제한 평가 (관절제한정도)
										</h2>
										<div className="space-y-6">
											{['shoulderJoint', 'elbowJoint', 'wristFingerJoint', 'hipJoint', 'kneeJoint', 'ankleJoint'].map((joint, idx) => {
												const labels = ['어깨관절', '팔꿈치관절', '손목 및 수지관절', '고관절', '무릎관절', '발목관절'];
												const numbers = [5, 6, 7, 8, 9, 10];
												return (
													<div key={joint} className="space-y-2">
														<div className="text-sm font-medium text-blue-900">({numbers[idx]}) {labels[idx]}</div>
														<div className="flex gap-6 ml-4">
															<label className="flex items-center gap-2 cursor-pointer">
																<input type="radio" name={joint} value="제한없음" checked={formData[joint as keyof typeof formData] === '제한없음'} onChange={(e) => setFormData(prev => ({ ...prev, [joint]: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
																<span className="text-sm text-blue-900">제한없음</span>
															</label>
															<label className="flex items-center gap-2 cursor-pointer">
																<input type="radio" name={joint} value="좌/우관절제한" checked={formData[joint as keyof typeof formData] === '좌/우관절제한'} onChange={(e) => setFormData(prev => ({ ...prev, [joint]: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
																<span className="text-sm text-blue-900">좌/우관절제한</span>
															</label>
															<label className="flex items-center gap-2 cursor-pointer">
																<input type="radio" name={joint} value="양관절제한" checked={formData[joint as keyof typeof formData] === '양관절제한'} onChange={(e) => setFormData(prev => ({ ...prev, [joint]: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
																<span className="text-sm text-blue-900">양관절제한</span>
															</label>
														</div>
													</div>
												);
											})}
											{/* (11) 신체통증유무 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(11) 신체통증유무</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="bodyPain" value="없음" checked={formData.bodyPain === '없음'} onChange={(e) => setFormData(prev => ({ ...prev, bodyPain: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="bodyPain" value="있음" checked={formData.bodyPain === '있음'} onChange={(e) => setFormData(prev => ({ ...prev, bodyPain: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">있음</span>
													</label>
												</div>
											</div>
										</div>
									</div>
								)}

								{activeTab === '동작' && (
									<div className="mt-6">
										<h2 className="px-4 py-2 mb-4 text-lg font-semibold text-blue-900 bg-blue-100 border border-blue-300 rounded">
											2. 기본동작평가
										</h2>
										<div className="grid grid-cols-4 gap-4 mt-4">
											{[
												{ key: 'bedMovement', label: '침상이동 - 측면 & 침상위 이동' },
												{ key: 'sitting', label: '앉기' },
												{ key: 'crawling', label: '네발기기' },
												{ key: 'kneeling', label: '무릎서기' },
												{ key: 'standing', label: '기립' },
												{ key: 'walking', label: '보행' },
												{ key: 'wheelchairOperation', label: '휠체어 조작 및 이동' },
												{ key: 'assistiveDeviceMovement', label: '보장구 장착 이동' }
											].map((item) => (
												<label key={item.key} className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={formData[item.key as keyof typeof formData] as boolean}
														onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))}
														className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
													/>
													<span className="text-sm text-blue-900">{item.label}</span>
												</label>
											))}
										</div>
									</div>
								)}

								{activeTab === 'ADL1' && (
									<div className="mt-6 space-y-8">
										{/* 1. 대소변 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">1. 대소변</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '화장실을 완벽하게 사용할 수 있으며, 실금 현상이 전혀 없다.' },
													{ value: '1', label: '대소변을 볼 때 도움이 필요하며 가끔은 실금 현상이 있다.' },
													{ value: '2', label: '1주일에 1회 이상 수면중 대소변을 지리기도 한다.' },
													{ value: '4', label: '1주일에 1회 이상 낮 시간에 대소변을 지리기도 한다.' },
													{ value: '5', label: '대소변을 전혀 조절하지 못한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="bowelBladder"
															value={option.value}
															checked={formData.bowelBladder === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, bowelBladder: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
										{/* 2. 식사 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">2. 식사</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '도움 없이 혼자서 먹을 수 있다.' },
													{ value: '1', label: '식사중이나 특별한 음식을 먹을 때 약간의 도움이 필요하거나 식후 위생을 누군가 도와 주어야 한다.' },
													{ value: '2', label: '다른 사람의 중등 도의 도움을 받아 식사하며 지저분하게 식사한다.' },
													{ value: '4', label: '모든 식사를 다른 사람이 많이 도와 주어야 한다.' },
													{ value: '5', label: '스스로는 식사하지 못해 다른 사람이 먹여주어야 한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="eating"
															value={option.value}
															checked={formData.eating === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, eating: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
									</div>
								)}

								{activeTab === 'ADL2' && (
									<div className="mt-6 space-y-8">
										{/* 3. 복장 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">3. 복장</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '스스로 입고 벗을 수 있으며 자신의 옷장에서 옷을 고를 수 있다.' },
													{ value: '1', label: '옷이 미리골라져 있다면 입고 벗을 수 있다.' },
													{ value: '2', label: '미리 준비된 옷이라도 다른 사람이 약간 도와주어야 입을 수 있다.' },
													{ value: '4', label: '옷을 입을 때 많이 도와주어야 하는데, 협조 할 수 있다.' },
													{ value: '5', label: '전혀 스스로는 옷을 입을 수 없으며, 다른 사람이 입혀줄 때도 있다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="clothing"
															value={option.value}
															checked={formData.clothing === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, clothing: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
										{/* 4. 개인위생 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">4. 개인위생 (머리빗기, 양치질, 면도, 손발톱관리, 세면하기등)</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '다른 사람의 도움 없이도 항상 단정하게옷 입고 몸치장을 할 수 있다.' },
													{ value: '1', label: '적절한 몸치장을 스스로 할 수 있으나면도 같은 것들은 도움을 필요로 한다.' },
													{ value: '2', label: '몸치장에 다른 사람들의 도움과 규칙적인 감독을 필요로 한다.' },
													{ value: '4', label: '다른 사람들이 전적으로 몸치장을 도와주어야 하는데일단 몸치장을 한 다음에는 깨끗하게 유지할 수 있다.' },
													{ value: '5', label: '몸치장을 하고 유지하는데 다른 사람들이 적극적으로 도와주어야 한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="personalHygiene"
															value={option.value}
															checked={formData.personalHygiene === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, personalHygiene: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
									</div>
								)}

								{activeTab === 'ADL3' && (
									<div className="mt-6 space-y-8">
										{/* 5. 보행 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">5. 보행 (계단, 이동)</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '외출하여 스스로 걸어 다닐 수 있다.' },
													{ value: '1', label: '실내와 실외에서 걸어 다닐 수 있다.' },
													{ value: '2', label: '다른 사람의 도움을 받거나 walker, wheelchair등을 이용하여 움직일 수 있다.' },
													{ value: '4', label: '의자나 휠체어에 앉아 있을 수는 있는데 다른 사람의 도움 없이 움직일 수 없다.' },
													{ value: '5', label: '하루의 반 이상을 침대에 누운 상태로 지낸다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="gait"
															value={option.value}
															checked={formData.gait === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, gait: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
										{/* 6. 목욕하기 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">6. 목욕하기</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '스스로 도움 없이 목욕할 수 있다.' },
													{ value: '1', label: '탕에 들어거고 나오는 것을 도와주면 혼자 목욕할 수 있다.' },
													{ value: '2', label: '얼굴과 손은 쉽게 씻지만 몸과 나머지 부분은 씻지 않는다.' },
													{ value: '4', label: '스스로 씻지는 못하나 다른 사람들이 목욕시킬 때 협조는 할 수 있다.' },
													{ value: '5', label: '스스로는 씻으려는 노력을 전혀 하지 않으며 다른 사람들이 씻어 주려해도 저항한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="bathing"
															value={option.value}
															checked={formData.bathing === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, bathing: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
									</div>
								)}

								{activeTab === '총점' && (
									<div className="mt-6">
										<div className="flex gap-4 mb-6">
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">총점</label>
												<input
													type="text"
													value={formData.totalScore}
													readOnly
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[150px]"
												/>
											</div>
											<button
												onClick={calculateTotalScore}
												className="px-4 py-2 text-sm font-medium text-red-600 bg-yellow-300 border border-yellow-400 rounded hover:bg-yellow-400"
											>
												총점계산
											</button>
										</div>
										<div className="mb-4 text-sm text-blue-900">
											<div>6개 항목에 0점부터 5점까지 배점</div>
											<div>총점: 0점(완전 독립수행) - 30점(완전도움의존)</div>
										</div>
										<div className="flex items-center gap-2 mt-6">
											<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">평가</label>
											<div className="flex-1 h-64 bg-white border border-blue-300 rounded"></div>
										</div>
										<div className="flex items-center gap-2 mt-4">
											<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">평가자</label>
											<input
												type="text"
												value={formData.evaluator}
												onChange={(e) => setFormData(prev => ({ ...prev, evaluator: e.target.value }))}
												className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[200px]"
												placeholder="평가자명"
											/>
										</div>
									</div>
								)}
							</div>

							{/* 오른쪽: 버튼 영역 */}
							<div className="flex flex-col gap-2">
								{activeTab !== '총점' && (
									<button
										onClick={handleDelete}
										className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
									>
										삭제
									</button>
								)}
								<button
									onClick={handleSave}
									className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
								>
									저장
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
