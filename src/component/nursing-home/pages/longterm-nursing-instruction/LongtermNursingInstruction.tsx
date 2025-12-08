"use client";

import { useState, useEffect } from 'react';

interface MemberData {
	[key: string]: any;
}

export default function LongtermNursingInstruction() {
	// 수급자 목록 관련 state
	const [members, setMembers] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 생체징후 관련 state
	const [systolicBP, setSystolicBP] = useState('');
	const [diastolicBP, setDiastolicBP] = useState('');
	const [bodyTemperature, setBodyTemperature] = useState('');

	// 건강관리 관련 state
	const [healthManagement, setHealthManagement] = useState(true);
	const [healthManagementNote, setHealthManagementNote] = useState('');

	// 간호관리 관련 state
	const [nursingManagement, setNursingManagement] = useState(true);
	const [nursingManagementNote, setNursingManagementNote] = useState('');

	// 기타 관련 state
	const [emergencyService, setEmergencyService] = useState(true);
	const [preparerName, setPreparerName] = useState('');
	const [pressureSoreObservation, setPressureSoreObservation] = useState(true);
	const [confirmer, setConfirmer] = useState('');
	const [abnormalArea, setAbnormalArea] = useState('');

	// 증상 및 관리 관련 state
	const [problemBehavior, setProblemBehavior] = useState(true);
	const [fall, setFall] = useState(false);
	const [dehydration, setDehydration] = useState(true);
	const [pressureSoreManagement, setPressureSoreManagement] = useState(true);
	const [incontinence, setIncontinence] = useState(true);
	const [delirium, setDelirium] = useState(true);
	const [painVAS, setPainVAS] = useState('약');
	const [medicationManagement, setMedicationManagement] = useState(true);
	const [roomNumber, setRoomNumber] = useState('201');

	// 직원 검색 관련 state
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);
	const [confirmerSearchTerm, setConfirmerSearchTerm] = useState('');
	const [confirmerSuggestions, setConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showConfirmerDropdown, setShowConfirmerDropdown] = useState(false);

	// 편집 모드 관련 state
	const [isEditMode, setIsEditMode] = useState(false);
	const [originalData, setOriginalData] = useState<any>(null);

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
			} else {
				setError(result.error || '수급자 데이터 조회 실패');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '알 수 없는 오류');
		} finally {
			setLoading(false);
		}
	};

	// 직원 검색 함수
	const searchEmployee = async (searchTerm: string, setSuggestions: (data: Array<{EMPNO: string; EMPNM: string}>) => void, setShowDropdown: (show: boolean) => void) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setSuggestions([]);
			setShowDropdown(false);
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setSuggestions(result.data);
				setShowDropdown(result.data.length > 0);
			} else {
				setSuggestions([]);
				setShowDropdown(false);
			}
		} catch (err) {
			console.error('직원 검색 오류:', err);
			setSuggestions([]);
			setShowDropdown(false);
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

	const handleEdit = () => {
		// 원본 데이터 백업
		setOriginalData({
			systolicBP,
			diastolicBP,
			bodyTemperature,
			healthManagement,
			healthManagementNote,
			nursingManagement,
			nursingManagementNote,
			emergencyService,
			preparerName,
			preparerSearchTerm,
			pressureSoreObservation,
			confirmer,
			confirmerSearchTerm,
			abnormalArea,
			problemBehavior,
			fall,
			dehydration,
			pressureSoreManagement,
			incontinence,
			delirium,
			painVAS,
			medicationManagement,
			roomNumber
		});
		setIsEditMode(true);
	};

	const handleCancel = () => {
		// 원본 데이터로 복원
		if (originalData) {
			setSystolicBP(originalData.systolicBP);
			setDiastolicBP(originalData.diastolicBP);
			setBodyTemperature(originalData.bodyTemperature);
			setHealthManagement(originalData.healthManagement);
			setHealthManagementNote(originalData.healthManagementNote);
			setNursingManagement(originalData.nursingManagement);
			setNursingManagementNote(originalData.nursingManagementNote);
			setEmergencyService(originalData.emergencyService);
			setPreparerName(originalData.preparerName);
			setPreparerSearchTerm(originalData.preparerSearchTerm);
			setPressureSoreObservation(originalData.pressureSoreObservation);
			setConfirmer(originalData.confirmer);
			setConfirmerSearchTerm(originalData.confirmerSearchTerm);
			setAbnormalArea(originalData.abnormalArea);
			setProblemBehavior(originalData.problemBehavior);
			setFall(originalData.fall);
			setDehydration(originalData.dehydration);
			setPressureSoreManagement(originalData.pressureSoreManagement);
			setIncontinence(originalData.incontinence);
			setDelirium(originalData.delirium);
			setPainVAS(originalData.painVAS);
			setMedicationManagement(originalData.medicationManagement);
			setRoomNumber(originalData.roomNumber);
		}
		setIsEditMode(false);
	};

	const handleSave = () => {
		// TODO: API 호출 등 실제 저장 로직 구현
		console.log({
			systolicBP,
			diastolicBP,
			bodyTemperature,
			healthManagement,
			healthManagementNote,
			nursingManagement,
			nursingManagementNote,
			emergencyService,
			preparerName,
			pressureSoreObservation,
			confirmer,
			abnormalArea,
			problemBehavior,
			fall,
			dehydration,
			pressureSoreManagement,
			incontinence,
			delirium,
			painVAS,
			medicationManagement,
			roomNumber
		});
		alert('간호지시가 저장되었습니다.');
		setIsEditMode(false);
		// 저장 후 원본 데이터 업데이트
		setOriginalData({
			systolicBP,
			diastolicBP,
			bodyTemperature,
			healthManagement,
			healthManagementNote,
			nursingManagement,
			nursingManagementNote,
			emergencyService,
			preparerName,
			preparerSearchTerm,
			pressureSoreObservation,
			confirmer,
			confirmerSearchTerm,
			abnormalArea,
			problemBehavior,
			fall,
			dehydration,
			pressureSoreManagement,
			incontinence,
			delirium,
			painVAS,
			medicationManagement,
			roomNumber
		});
	};

	const handleDelete = () => {
		if (confirm('정말 삭제하시겠습니까?')) {
			// TODO: API 호출 등 실제 삭제 로직 구현
			alert('간호지시가 삭제되었습니다.');
			// 삭제 후 초기화
			setSystolicBP('');
			setDiastolicBP('');
			setBodyTemperature('');
			setHealthManagement(false);
			setHealthManagementNote('');
			setNursingManagement(false);
			setNursingManagementNote('');
			setEmergencyService(false);
			setPreparerName('');
			setPreparerSearchTerm('');
			setPressureSoreObservation(false);
			setConfirmer('');
			setConfirmerSearchTerm('');
			setAbnormalArea('');
			setProblemBehavior(false);
			setFall(false);
			setDehydration(false);
			setPressureSoreManagement(false);
			setIncontinence(false);
			setDelirium(false);
			setPainVAS('약');
			setMedicationManagement(false);
			setRoomNumber('');
			setIsEditMode(false);
		}
	};

	// 직원 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
				searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [preparerSearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
				searchEmployee(confirmerSearchTerm, setConfirmerSuggestions, setShowConfirmerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [confirmerSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowPreparerDropdown(false);
				setShowConfirmerDropdown(false);
			}
		};

		if (showPreparerDropdown || showConfirmerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showPreparerDropdown, showConfirmerDropdown]);

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
													className="border-b border-blue-50 hover:bg-blue-50"
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

					{/* 우측: 간호지시 입력 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">간호지시</h2>
							</div>

							<div className="p-4 space-y-4">
								{/* 생체징후 */}
								<div className="flex items-center gap-2">
									<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										혈압(수축)
									</label>
									<input
										type="number"
										value={systolicBP}
										onChange={(e) => setSystolicBP(e.target.value)}
										className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
									<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										혈압(이완)
									</label>
									<input
										type="number"
										value={diastolicBP}
										onChange={(e) => setDiastolicBP(e.target.value)}
										className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
									<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										체온
									</label>
									<input
										type="number"
										step="0.1"
										value={bodyTemperature}
										onChange={(e) => setBodyTemperature(e.target.value)}
										className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
								</div>

								{/* 건강관리 */}
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
											건강관리
										</label>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">건강관리실시</label>
											<input
												type="checkbox"
												checked={healthManagement}
												onChange={(e) => setHealthManagement(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>
									</div>
									<input
										type="text"
										value={healthManagementNote}
										onChange={(e) => setHealthManagementNote(e.target.value)}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
								</div>

								{/* 간호관리 */}
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
											간호관리
										</label>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">간호관리실시</label>
											<input
												type="checkbox"
												checked={nursingManagement}
												onChange={(e) => setNursingManagement(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>
									</div>
									<input
										type="text"
										value={nursingManagementNote}
										onChange={(e) => setNursingManagementNote(e.target.value)}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
								</div>

								{/* 기타(응급서비스) 및 작성자성명 */}
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-2">
										<label className="text-sm text-blue-900">기타(응급서비스)</label>
										<input
											type="checkbox"
											checked={emergencyService}
											onChange={(e) => setEmergencyService(e.target.checked)}
											className="w-4 h-4 border border-blue-300 rounded"
										/>
										<span className="text-sm text-blue-900">실시</span>
									</div>
									<label className="ml-4 text-sm text-blue-900">작성자성명</label>
									<div className="relative flex-1 employee-dropdown-container">
										<input
											type="text"
											value={preparerSearchTerm || preparerName}
											onChange={(e) => {
												const value = e.target.value;
												setPreparerName(value);
												setPreparerSearchTerm(value);
												if (!value || value.trim() === '') {
													setPreparerSuggestions([]);
													setShowPreparerDropdown(false);
												}
											}}
											onFocus={() => {
												if (preparerName) {
													setPreparerSearchTerm(preparerName);
												}
												if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
													searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
												}
											}}
											className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											placeholder="작성자 검색"
										/>
										{showPreparerDropdown && preparerSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
												{preparerSuggestions.map((employee, index) => (
													<div
														key={`${employee.EMPNO}-${index}`}
														onClick={() => {
															setPreparerName(employee.EMPNM);
															setPreparerSearchTerm(employee.EMPNM);
															setShowPreparerDropdown(false);
														}}
														className="px-3 py-2 text-sm border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
													>
														{employee.EMPNM}
													</div>
												))}
											</div>
										)}
									</div>
								</div>

								{/* 욕창발생관찰 및 확인자 */}
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-2">
										<label className="text-sm text-blue-900">욕창발생관찰</label>
										<input
											type="checkbox"
											checked={pressureSoreObservation}
											onChange={(e) => setPressureSoreObservation(e.target.checked)}
											className="w-4 h-4 border border-blue-300 rounded"
										/>
										<span className="text-sm text-blue-900">이상있음</span>
									</div>
									<label className="ml-4 text-sm text-blue-900">확인자</label>
									<div className="relative flex-1 employee-dropdown-container">
										<input
											type="text"
											value={confirmerSearchTerm || confirmer}
											onChange={(e) => {
												const value = e.target.value;
												setConfirmer(value);
												setConfirmerSearchTerm(value);
												if (!value || value.trim() === '') {
													setConfirmerSuggestions([]);
													setShowConfirmerDropdown(false);
												}
											}}
											onFocus={() => {
												if (confirmer) {
													setConfirmerSearchTerm(confirmer);
												}
												if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
													searchEmployee(confirmerSearchTerm, setConfirmerSuggestions, setShowConfirmerDropdown);
												}
											}}
											className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											placeholder="확인자 검색"
										/>
										{showConfirmerDropdown && confirmerSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
												{confirmerSuggestions.map((employee, index) => (
													<div
														key={`${employee.EMPNO}-${index}`}
														onClick={() => {
															setConfirmer(employee.EMPNM);
															setConfirmerSearchTerm(employee.EMPNM);
															setShowConfirmerDropdown(false);
														}}
														className="px-3 py-2 text-sm border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
													>
														{employee.EMPNM}
													</div>
												))}
											</div>
										)}
									</div>
								</div>

								{/* 이상부위 및 피부상태 */}
								<div className="space-y-2">
									<label className="block px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded w-fit">
										이상부위 및 피부상태
									</label>
									<textarea
										value={abnormalArea}
										onChange={(e) => setAbnormalArea(e.target.value)}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded min-h-[100px]"
										placeholder="이상부위 및 피부상태를 입력하세요"
									/>
								</div>

								{/* 증상 및 관리 */}
								<div className="pt-2 space-y-3 border-t border-blue-200">
									{/* 첫 번째 행 */}
									<div className="flex flex-wrap items-center gap-4">
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">문제행동</label>
											<input
												type="checkbox"
												checked={problemBehavior}
												onChange={(e) => setProblemBehavior(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">유</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">낙상</label>
											<input
												type="checkbox"
												checked={fall}
												onChange={(e) => setFall(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">유</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">탈수</label>
											<input
												type="checkbox"
												checked={dehydration}
												onChange={(e) => setDehydration(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">있음</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">욕창관리</label>
											<input
												type="checkbox"
												checked={pressureSoreManagement}
												onChange={(e) => setPressureSoreManagement(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">관리</span>
										</div>
									</div>

									{/* 두 번째 행 */}
									<div className="flex flex-wrap items-center gap-4">
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">소변/대변실금</label>
											<input
												type="checkbox"
												checked={incontinence}
												onChange={(e) => setIncontinence(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">유</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">섬망</label>
											<input
												type="checkbox"
												checked={delirium}
												onChange={(e) => setDelirium(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">의심</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">통증(VAS)</label>
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="radio"
													name="painVAS"
													value="약"
													checked={painVAS === '약'}
													onChange={(e) => setPainVAS(e.target.value)}
													className="w-4 h-4 border border-blue-300"
												/>
												<span className="text-sm text-blue-900">약</span>
											</label>
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="radio"
													name="painVAS"
													value="중"
													checked={painVAS === '중'}
													onChange={(e) => setPainVAS(e.target.value)}
													className="w-4 h-4 border border-blue-300"
												/>
												<span className="text-sm text-blue-900">중</span>
											</label>
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="radio"
													name="painVAS"
													value="강"
													checked={painVAS === '강'}
													onChange={(e) => setPainVAS(e.target.value)}
													className="w-4 h-4 border border-blue-300"
												/>
												<span className="text-sm text-blue-900">강</span>
											</label>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">투약관리</label>
											<input
												type="checkbox"
												checked={medicationManagement}
												onChange={(e) => setMedicationManagement(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">관리</span>
										</div>
									</div>

									{/* 침실호수 */}
									<div className="flex items-center gap-2">
										<label className="text-sm text-blue-900">침실호수</label>
										<input
											type="text"
											value={roomNumber}
											onChange={(e) => setRoomNumber(e.target.value)}
											className="w-32 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
										/>
									</div>
								</div>

								{/* 버튼 영역 */}
								<div className="pt-4">
									{isEditMode ? (
										<div className="flex justify-end gap-2">
											<button
												onClick={handleCancel}
												className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
											>
												취소
											</button>
											<button
												onClick={handleDelete}
												className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded hover:bg-red-700"
											>
												삭제
											</button>
											<button
												onClick={handleSave}
												className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
											>
												저장
											</button>
										</div>
									) : (
										<button
											onClick={handleEdit}
											className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
										>
											수정 및 삭제
										</button>
									)}
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

