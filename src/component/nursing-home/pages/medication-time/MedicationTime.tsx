"use client";

import { useState, useEffect } from 'react';

interface MemberData {
	[key: string]: any;
}

interface MedicationTimeData {
	status: '약없음' | '복용';
	time: string;
	helper: string;
}

export default function MedicationTime() {
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

	// 약물 복용 시간 관련 state
	const [medicationData, setMedicationData] = useState<Record<string, MedicationTimeData>>({
		아침식전: { status: '약없음', time: '', helper: '' },
		아침식후: { status: '약없음', time: '', helper: '' },
		점심식전: { status: '약없음', time: '', helper: '' },
		점심식후: { status: '약없음', time: '', helper: '' },
		저녁식전: { status: '약없음', time: '', helper: '' },
		저녁식후: { status: '약없음', time: '', helper: '' },
		취침복용: { status: '약없음', time: '', helper: '' }
	});
	const [confirmer, setConfirmer] = useState('');
	const [isEditMode, setIsEditMode] = useState(false);
	const [originalMedicationData, setOriginalMedicationData] = useState<Record<string, MedicationTimeData>>({});
	const [originalConfirmer, setOriginalConfirmer] = useState('');

	// 복용도우미 검색 관련 state (각 타입별로 관리)
	const [helperSearchTerms, setHelperSearchTerms] = useState<Record<string, string>>({});
	const [helperSuggestions, setHelperSuggestions] = useState<Record<string, Array<{EMPNO: string; EMPNM: string}>>>({});
	const [showHelperDropdowns, setShowHelperDropdowns] = useState<Record<string, boolean>>({});
	const [activeHelperType, setActiveHelperType] = useState<string | null>(null);

	// 복용 확인자 검색 관련 state
	const [confirmerSearchTerm, setConfirmerSearchTerm] = useState('');
	const [confirmerSuggestions, setConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showConfirmerDropdown, setShowConfirmerDropdown] = useState(false);

	const medicationTypes = [
		'아침식전',
		'아침식후',
		'점심식전',
		'점심식후',
		'저녁식전',
		'저녁식후',
		'취침복용'
	];

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

	const handleMedicationStatusChange = (type: string, status: '약없음' | '복용') => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				status
			}
		}));
	};

	const handleMedicationTimeChange = (type: string, time: string) => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				time
			}
		}));
	};

	// 복용도우미 검색 함수
	const searchHelpers = async (type: string, searchTerm: string) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setHelperSuggestions(prev => ({ ...prev, [type]: result.data }));
				setShowHelperDropdowns(prev => ({ ...prev, [type]: result.data.length > 0 }));
			} else {
				setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
				setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
			}
		} catch (err) {
			console.error('복용도우미 검색 오류:', err);
			setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
		}
	};

	// 복용 확인자 검색 함수
	const searchConfirmer = async (searchTerm: string) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setConfirmerSuggestions([]);
			setShowConfirmerDropdown(false);
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setConfirmerSuggestions(result.data);
				setShowConfirmerDropdown(result.data.length > 0);
			} else {
				setConfirmerSuggestions([]);
				setShowConfirmerDropdown(false);
			}
		} catch (err) {
			console.error('복용 확인자 검색 오류:', err);
			setConfirmerSuggestions([]);
			setShowConfirmerDropdown(false);
		}
	};

	// 복용 확인자 선택 함수
	const handleSelectConfirmer = (confirmer: {EMPNO: string; EMPNM: string}) => {
		setConfirmer(confirmer.EMPNM);
		setConfirmerSearchTerm(confirmer.EMPNM);
		setShowConfirmerDropdown(false);
	};

	// 복용도우미 선택 함수
	const handleSelectHelper = (type: string, helper: {EMPNO: string; EMPNM: string}) => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				helper: helper.EMPNM
			}
		}));
		setHelperSearchTerms(prev => ({ ...prev, [type]: helper.EMPNM }));
		setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
		setActiveHelperType(null);
	};

	const handleMedicationHelperChange = (type: string, helper: string) => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				helper
			}
		}));
		setHelperSearchTerms(prev => ({ ...prev, [type]: helper }));
		setActiveHelperType(type);
		
		// 검색어가 변경되면 검색 실행 (debounce는 useEffect에서 처리)
		if (!helper || helper.trim() === '') {
			setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
		}
	};

	// 복용도우미 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (activeHelperType && helperSearchTerms[activeHelperType]) {
				const searchTerm = helperSearchTerms[activeHelperType];
				if (searchTerm && searchTerm.trim() !== '') {
					searchHelpers(activeHelperType, searchTerm);
				}
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [helperSearchTerms, activeHelperType]);

	const handleEdit = () => {
		// 원본 데이터 백업
		setOriginalMedicationData(JSON.parse(JSON.stringify(medicationData)));
		setOriginalConfirmer(confirmer);
		setIsEditMode(true);
	};

	const handleCancel = () => {
		// 원본 데이터로 복원
		setMedicationData(JSON.parse(JSON.stringify(originalMedicationData)));
		setConfirmer(originalConfirmer);
		setIsEditMode(false);
	};

	const handleSave = () => {
		// TODO: API 호출 등 실제 저장 로직 구현
		console.log({
			medicationData,
			confirmer
		});
		alert('약물 복용 시간이 저장되었습니다.');
		setIsEditMode(false);
		// 저장 후 원본 데이터 업데이트
		setOriginalMedicationData(JSON.parse(JSON.stringify(medicationData)));
		setOriginalConfirmer(confirmer);
	};

	const handleDelete = () => {
		if (confirm('정말 삭제하시겠습니까?')) {
			// TODO: API 호출 등 실제 삭제 로직 구현
			alert('약물 복용 시간이 삭제되었습니다.');
			// 삭제 후 초기화
			setMedicationData({
				아침식전: { status: '약없음', time: '', helper: '' },
				아침식후: { status: '약없음', time: '', helper: '' },
				점심식전: { status: '약없음', time: '', helper: '' },
				점심식후: { status: '약없음', time: '', helper: '' },
				저녁식전: { status: '약없음', time: '', helper: '' },
				저녁식후: { status: '약없음', time: '', helper: '' },
				취침복용: { status: '약없음', time: '', helper: '' }
			});
			setConfirmer('');
			setIsEditMode(false);
		}
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

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.helper-dropdown-container') && !target.closest('.confirmer-dropdown-container')) {
				setShowHelperDropdowns({});
				setActiveHelperType(null);
				setShowConfirmerDropdown(false);
			}
		};

		if (Object.values(showHelperDropdowns).some(show => show) || showConfirmerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showHelperDropdowns, showConfirmerDropdown]);

	// 복용 확인자 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
				searchConfirmer(confirmerSearchTerm);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [confirmerSearchTerm]);

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

					{/* 우측: 약물 복용 시간 입력 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							{/* 헤더 */}
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<div className="grid grid-cols-12 gap-2">
									<div className="col-span-3"></div>
									<div className="col-span-4 px-2 py-1 text-sm font-semibold text-center text-blue-900 bg-blue-200 border border-blue-300 rounded">
										복용시간
									</div>
									<div className="col-span-4 px-2 py-1 text-sm font-semibold text-center text-blue-900 bg-blue-200 border border-blue-300 rounded">
										복용도우미
									</div>
									<div className="col-span-1"></div>
								</div>
							</div>

							<div className="p-4 space-y-3">
								{/* 약물 복용 시간 행들 */}
								{medicationTypes.map((type) => (
									<div key={type} className="grid grid-cols-12 gap-2 items-center">
										{/* 라벨 및 라디오 버튼 */}
										<div className="col-span-3 flex items-center gap-3">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												{type}
											</label>
											<div className="flex items-center gap-3">
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="radio"
														name={type}
														value="약없음"
														checked={medicationData[type].status === '약없음'}
														onChange={() => handleMedicationStatusChange(type, '약없음')}
														className="w-4 h-4 border border-blue-300"
													/>
													<span className="text-sm text-blue-900">약없음</span>
												</label>
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="radio"
														name={type}
														value="복용"
														checked={medicationData[type].status === '복용'}
														onChange={() => handleMedicationStatusChange(type, '복용')}
														className="w-4 h-4 border border-blue-300"
													/>
													<span className="text-sm text-blue-900">복용</span>
												</label>
											</div>
										</div>
										{/* 복용시간 입력 */}
										<div className="col-span-4">
											<input
												type="time"
												value={medicationData[type].time}
												onChange={(e) => handleMedicationTimeChange(type, e.target.value)}
												className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 복용도우미 입력 */}
										<div className="col-span-4 relative helper-dropdown-container">
											<input
												type="text"
												value={helperSearchTerms[type] || medicationData[type].helper}
												onChange={(e) => handleMedicationHelperChange(type, e.target.value)}
												onFocus={() => {
													setActiveHelperType(type);
													if (medicationData[type].helper) {
														searchHelpers(type, medicationData[type].helper);
													}
												}}
												className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
												placeholder="복용도우미 검색"
											/>
											{showHelperDropdowns[type] && helperSuggestions[type] && helperSuggestions[type].length > 0 && (
												<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
													{helperSuggestions[type].map((helper, index) => (
														<div
															key={`${helper.EMPNO}-${index}`}
															onClick={() => handleSelectHelper(type, helper)}
															className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
														>
															{helper.EMPNM}
														</div>
													))}
												</div>
											)}
										</div>
										<div className="col-span-1"></div>
									</div>
								))}

								{/* 복용 확인자 */}
								<div className="grid grid-cols-12 gap-2 items-center pt-2">
									<div className="col-span-3">
										<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
											복용 확인자
										</label>
									</div>
									<div className="col-span-4 relative confirmer-dropdown-container">
										<input
											type="text"
											value={confirmerSearchTerm || confirmer}
											onChange={(e) => {
												const value = e.target.value;
												setConfirmer(value);
												setConfirmerSearchTerm(value);
												if (value) {
													searchConfirmer(value);
												} else {
													setConfirmerSuggestions([]);
													setShowConfirmerDropdown(false);
												}
											}}
											onFocus={() => {
												if (confirmer) {
													searchConfirmer(confirmer);
												}
											}}
											className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											placeholder="복용 확인자 검색"
										/>
										{showConfirmerDropdown && confirmerSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
												{confirmerSuggestions.map((confirmerItem, index) => (
													<div
														key={`${confirmerItem.EMPNO}-${index}`}
														onClick={() => handleSelectConfirmer(confirmerItem)}
														className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
													>
														{confirmerItem.EMPNM}
													</div>
												))}
											</div>
										)}
									</div>
									<div className="col-span-5"></div>
								</div>

								{/* 버튼 영역 */}
								<div className="pt-4">
									{isEditMode ? (
										<div className="flex gap-2 justify-end">
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
											className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700"
										>
											수정
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

