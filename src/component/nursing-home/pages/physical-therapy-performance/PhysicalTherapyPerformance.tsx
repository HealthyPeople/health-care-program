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

interface TherapyRecordData {
	TRDT: string; // 치료일자
	TRST: string; // 치료시작시간
	TRET: string; // 치료종료시간
	THERAPIST: string; // 치료자
	[key: string]: any;
}

export default function PhysicalTherapyPerformance() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [treatmentDates, setTreatmentDates] = useState<string[]>([]);
	const [treatmentRecords, setTreatmentRecords] = useState<TherapyRecordData[]>([]);
	const [loadingRecords, setLoadingRecords] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const dateItemsPerPage = 10;

	// 폼 데이터
	const [formData, setFormData] = useState({
		beneficiary: '길덕남', // 수급자
		treatmentDate: '2025-12-11', // 치료일자
		treatmentStartTime: '', // 치료시작시간
		treatmentEndTime: '', // 치료종료시간
		therapist: '', // 치료자
		// 운동치료 - 기구이용
		equipmentBicycle: true, // 자전거
		equipmentResistanceBand: true, // 탄력밴드운동
		equipmentFullBodyMassager: true, // 전신안마기
		equipmentPully: true, // Pully
		equipmentShoulderJoint: true, // 견관절운동기
		equipmentParallelBar: true, // 평행봉걷기
		equipmentTreadmill: true, // 런닝머신
		// 운동치료 - 단순운동
		simpleFootMassager: true, // 발맛사지기
		simpleTiltingTable: true, // 틸팅테이블
		simpleBallExercise: true, // 공운동
		simpleBeadThreading: true, // 구술꿰기
		simplePegboard: true, // 패기보드끼우
		simpleManualExercise: true, // 도수운동
		simpleROM: true, // ROM
		// Modalities
		modalityStrength: true, // 근력운동
		modalityFunctional: true, // 기능향상운동
		modalityWeightShift: true, // 체중이동/지지
		modalityGaitTraining: true, // 보행훈련
		modalityHotCold: true, // Hot&Cold Pa
		modalityInfrared: true, // 적외선치료
		modalityUltrasound: true, // 초음파치료
		// 기타
		otherTENS: true, // 경피신경전기
		otherInterferential: true, // 간섭전류치료
		otherElectrical: true, // 전기자극치료
		otherParaffin: true, // 파라핀치료
		otherTreatment1: false, // 기타치료 1
		otherTreatment2: false, // 기타치료 2
		otherTreatment3: false // 기타치료 3
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

	// 치료일자 목록 조회
	const fetchTreatmentDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setTreatmentDates([]);
			return;
		}

		setLoadingRecords(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/physical-therapy-performance/dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setTreatmentDates([]);
		} catch (err) {
			console.error('치료일자 조회 오류:', err);
		} finally {
			setLoadingRecords(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchTreatmentDates(member.ANCD, member.PNUM);
	};

	// 치료일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = treatmentDates[index];
		setFormData(prev => ({ ...prev, treatmentDate: selectedDate || '' }));
		setIsEditMode(false);
		// TODO: 선택한 날짜의 치료 기록 조회
		const selectedRecord = treatmentRecords[index];
		if (selectedRecord) {
			setFormData(prev => ({
				...prev,
				treatmentDate: selectedRecord.TRDT || '',
				treatmentStartTime: selectedRecord.TRST || '',
				treatmentEndTime: selectedRecord.TRET || '',
				therapist: selectedRecord.THERAPIST || ''
			}));
		}
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

		if (!formData.treatmentDate) {
			alert('치료일자를 입력해주세요.');
			return;
		}

		setLoadingRecords(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedDateIndex !== null ? '/api/physical-therapy-performance/update' : '/api/physical-therapy-performance/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData
			// 	})
			// });

			alert(selectedDateIndex !== null ? '물리치료실적이 수정되었습니다.' : '물리치료실적이 저장되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchTreatmentDates(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('물리치료실적 저장 오류:', err);
			alert('물리치료실적 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 지움 함수
	const handleClear = () => {
		setFormData(prev => ({
			...prev,
			treatmentStartTime: '',
			treatmentEndTime: '',
			therapist: '',
			equipmentBicycle: false,
			equipmentResistanceBand: false,
			equipmentFullBodyMassager: false,
			equipmentPully: false,
			equipmentShoulderJoint: false,
			equipmentParallelBar: false,
			equipmentTreadmill: false,
			simpleFootMassager: false,
			simpleTiltingTable: false,
			simpleBallExercise: false,
			simpleBeadThreading: false,
			simplePegboard: false,
			simpleManualExercise: false,
			simpleROM: false,
			modalityStrength: false,
			modalityFunctional: false,
			modalityWeightShift: false,
			modalityGaitTraining: false,
			modalityHotCold: false,
			modalityInfrared: false,
			modalityUltrasound: false,
			otherTENS: false,
			otherInterferential: false,
			otherElectrical: false,
			otherParaffin: false,
			otherTreatment1: false,
			otherTreatment2: false,
			otherTreatment3: false
		}));
		setIsEditMode(true);
		setSelectedDateIndex(null);
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 물리치료실적을 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingRecords(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/physical-therapy-performance/${selectedDateIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('물리치료실적이 삭제되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchTreatmentDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			handleClear();
		} catch (err) {
			console.error('물리치료실적 삭제 오류:', err);
			alert('물리치료실적 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 출력 함수들
	const handlePrintRecord = async () => {
		if (!selectedMember || !formData.treatmentDate) {
			alert('출력할 물리치료실적을 선택해주세요.');
			return;
		}
		// TODO: 기록출력 구현
		alert('기록출력 기능은 준비 중입니다.');
	};

	const handlePrintPeriod = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		// TODO: 기간기록출력 구현
		alert('기간기록출력 기능은 준비 중입니다.');
	};

	const handlePlanAndEvaluation = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		// TODO: 계획 및 평가 페이지로 이동
		alert('계획 및 평가 기능은 준비 중입니다.');
	};

	// 치료일자 목록 페이지네이션
	const dateTotalPages = Math.ceil(treatmentDates.length / dateItemsPerPage);
	const dateStartIndex = (datePage - 1) * dateItemsPerPage;
	const dateEndIndex = dateStartIndex + dateItemsPerPage;
	const currentDateItems = treatmentDates.slice(dateStartIndex, dateEndIndex);

	// 치료 항목 렌더링 함수
	const renderTreatmentItem = (key: string, label: string, checked: boolean) => {
		return (
			<div key={key} className="flex items-center gap-2 py-2 border-b border-blue-100">
				<input
					type="checkbox"
					checked={checked}
					onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.checked }))}
					className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
				/>
				<label className="text-sm text-blue-900 flex-1">{label}</label>
				<input
					type="text"
					className="w-20 px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
					placeholder=""
				/>
			</div>
		);
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

				{/* 중간-왼쪽 패널: 치료일자 목록 */}
				<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900">치료일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingRecords ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
							) : treatmentDates.length === 0 ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">
									{selectedMember ? '치료일자가 없습니다' : '수급자를 선택해주세요'}
								</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = dateStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
												selectedDateIndex === globalIndex ? 'bg-blue-100 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									);
								})
							)}
						</div>
						{/* 치료일자 페이지네이션 */}
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

				{/* 우측 패널: 입력 폼 */}
				<div className="flex-1 p-4 overflow-y-auto bg-white">
					{/* 상단: 수급자, 치료일자, 치료시간, 치료자 */}
					<div className="flex flex-wrap items-center gap-4 mb-4">
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
							<input
								type="text"
								value={formData.beneficiary}
								onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
								placeholder="수급자명"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">치료일자</label>
							<input
								type="text"
								value={formData.treatmentDate}
								readOnly
								className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">치료시간</label>
							<input
								type="time"
								value={formData.treatmentStartTime}
								onChange={(e) => setFormData(prev => ({ ...prev, treatmentStartTime: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
							<span className="text-blue-900">~</span>
							<input
								type="time"
								value={formData.treatmentEndTime}
								onChange={(e) => setFormData(prev => ({ ...prev, treatmentEndTime: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">치료자</label>
							<input
								type="text"
								value={formData.therapist}
								onChange={(e) => setFormData(prev => ({ ...prev, therapist: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
								placeholder="치료자를 입력하세요"
							/>
						</div>
					</div>

					{/* 메인 컨텐츠: 4개 컬럼 */}
					<div className="flex gap-4 mb-6">
						{/* Column 1: 운동치료 - 기구이용 */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">운동치료 - 기구이용</h3>
							</div>
							<div className="space-y-1">
								{renderTreatmentItem('equipmentBicycle', '자전거', formData.equipmentBicycle)}
								{renderTreatmentItem('equipmentResistanceBand', '탄력밴드운동', formData.equipmentResistanceBand)}
								{renderTreatmentItem('equipmentFullBodyMassager', '전신안마기', formData.equipmentFullBodyMassager)}
								{renderTreatmentItem('equipmentPully', 'Pully', formData.equipmentPully)}
								{renderTreatmentItem('equipmentShoulderJoint', '견관절운동기', formData.equipmentShoulderJoint)}
								{renderTreatmentItem('equipmentParallelBar', '평행봉걷기', formData.equipmentParallelBar)}
								{renderTreatmentItem('equipmentTreadmill', '러닝머신', formData.equipmentTreadmill)}
							</div>
						</div>

						{/* Column 2: 운동치료 - 단순운동 */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">운동치료 - 단순운동</h3>
							</div>
							<div className="space-y-1">
								{renderTreatmentItem('simpleFootMassager', '발맛사지기', formData.simpleFootMassager)}
								{renderTreatmentItem('simpleTiltingTable', '틸팅테이블', formData.simpleTiltingTable)}
								{renderTreatmentItem('simpleBallExercise', '공운동', formData.simpleBallExercise)}
								{renderTreatmentItem('simpleBeadThreading', '구술꿰기', formData.simpleBeadThreading)}
								{renderTreatmentItem('simplePegboard', '패기보드끼우', formData.simplePegboard)}
								{renderTreatmentItem('simpleManualExercise', '도수운동', formData.simpleManualExercise)}
								{renderTreatmentItem('simpleROM', 'ROM', formData.simpleROM)}
							</div>
						</div>

						{/* Column 3: Modalities */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">Modalities</h3>
							</div>
							<div className="space-y-1">
								{renderTreatmentItem('modalityStrength', '근력운동', formData.modalityStrength)}
								{renderTreatmentItem('modalityFunctional', '기능향상운동', formData.modalityFunctional)}
								{renderTreatmentItem('modalityWeightShift', '체중이동/지지', formData.modalityWeightShift)}
								{renderTreatmentItem('modalityGaitTraining', '보행훈련', formData.modalityGaitTraining)}
								{renderTreatmentItem('modalityHotCold', 'Hot&Cold Pa', formData.modalityHotCold)}
								{renderTreatmentItem('modalityInfrared', '적외선치료', formData.modalityInfrared)}
								{renderTreatmentItem('modalityUltrasound', '초음파치료', formData.modalityUltrasound)}
							</div>
						</div>

						{/* Column 4: 기타 */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">기타</h3>
							</div>
							<div className="space-y-1">
								{renderTreatmentItem('otherTENS', '경피신경전기', formData.otherTENS)}
								{renderTreatmentItem('otherInterferential', '간섭전류치료', formData.otherInterferential)}
								{renderTreatmentItem('otherElectrical', '전기자극치료', formData.otherElectrical)}
								{renderTreatmentItem('otherParaffin', '파라핀치료', formData.otherParaffin)}
								{renderTreatmentItem('otherTreatment1', '기타치료 1', formData.otherTreatment1)}
								{renderTreatmentItem('otherTreatment2', '기타치료 2', formData.otherTreatment2)}
								{renderTreatmentItem('otherTreatment3', '기타치료 3', formData.otherTreatment3)}
							</div>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex justify-end gap-2">
						<button
							onClick={handleSave}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							저장
						</button>
						<button
							onClick={handleClear}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							지움
						</button>
						<button
							onClick={handleDelete}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							삭제
						</button>
						<button
							onClick={handlePrintRecord}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							기록출력
						</button>
						<button
							onClick={handlePrintPeriod}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							기간기록출력
						</button>
						<button
							onClick={handlePlanAndEvaluation}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							계획 및 평가
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

