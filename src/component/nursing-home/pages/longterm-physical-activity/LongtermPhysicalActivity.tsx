"use client";

import { useState, useEffect } from 'react';

interface MemberData {
	[key: string]: any;
}

export default function LongtermPhysicalActivity() {
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

	// 식사 정보 관련 state
	const [mealType, setMealType] = useState('일반식(저염식)');
	const [mealIntake, setMealIntake] = useState('1');
	const [mealClassification, setMealClassification] = useState('일반식(저염식)');
	const [mealLocation, setMealLocation] = useState('지층 생활실');
	const [mealConfirmer, setMealConfirmer] = useState('');

	// 목욕 정보 관련 state
	const [bathMethod, setBathMethod] = useState('샤워식-목욕의자');
	const [bathTimeRequired, setBathTimeRequired] = useState('40');
	const [bathTime, setBathTime] = useState('');
	const [bathDay1, setBathDay1] = useState('2 월요일');
	const [bathProvider1, setBathProvider1] = useState('');
	const [bathDay2, setBathDay2] = useState('5 목요일');
	const [bathProvider2, setBathProvider2] = useState('');

	// 신체활동 관련 state
	const [faceWashing, setFaceWashing] = useState(true);
	const [grooming, setGrooming] = useState(true);
	const [movementAssistance, setMovementAssistance] = useState(true);
	const [positionChange, setPositionChange] = useState(true);
	const [walkAccompany, setWalkAccompany] = useState(true);
	const [toiletUsage, setToiletUsage] = useState('');
	const [outingAccompany, setOutingAccompany] = useState(true);
	const [preparerName, setPreparerName] = useState('');

	// 직원 검색 관련 state
	const [mealConfirmerSearchTerm, setMealConfirmerSearchTerm] = useState('');
	const [mealConfirmerSuggestions, setMealConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showMealConfirmerDropdown, setShowMealConfirmerDropdown] = useState(false);
	const [bathProvider1SearchTerm, setBathProvider1SearchTerm] = useState('');
	const [bathProvider1Suggestions, setBathProvider1Suggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showBathProvider1Dropdown, setShowBathProvider1Dropdown] = useState(false);
	const [bathProvider2SearchTerm, setBathProvider2SearchTerm] = useState('');
	const [bathProvider2Suggestions, setBathProvider2Suggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showBathProvider2Dropdown, setShowBathProvider2Dropdown] = useState(false);
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);

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

	const handleSave = () => {
		// TODO: API 호출 등 실제 저장 로직 구현
		console.log({
			mealType,
			mealIntake,
			mealClassification,
			mealLocation,
			mealConfirmer,
			bathMethod,
			bathTimeRequired,
			bathTime,
			bathDay1,
			bathProvider1,
			bathDay2,
			bathProvider2,
			faceWashing,
			grooming,
			movementAssistance,
			positionChange,
			walkAccompany,
			toiletUsage,
			outingAccompany,
			preparerName
		});
		alert('신체활동이 저장되었습니다.');
	};

	// 직원 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (mealConfirmerSearchTerm && mealConfirmerSearchTerm.trim() !== '') {
				searchEmployee(mealConfirmerSearchTerm, setMealConfirmerSuggestions, setShowMealConfirmerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [mealConfirmerSearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (bathProvider1SearchTerm && bathProvider1SearchTerm.trim() !== '') {
				searchEmployee(bathProvider1SearchTerm, setBathProvider1Suggestions, setShowBathProvider1Dropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [bathProvider1SearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (bathProvider2SearchTerm && bathProvider2SearchTerm.trim() !== '') {
				searchEmployee(bathProvider2SearchTerm, setBathProvider2Suggestions, setShowBathProvider2Dropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [bathProvider2SearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
				searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [preparerSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowMealConfirmerDropdown(false);
				setShowBathProvider1Dropdown(false);
				setShowBathProvider2Dropdown(false);
				setShowPreparerDropdown(false);
			}
		};

		if (showMealConfirmerDropdown || showBathProvider1Dropdown || showBathProvider2Dropdown || showPreparerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showMealConfirmerDropdown, showBathProvider1Dropdown, showBathProvider2Dropdown, showPreparerDropdown]);

	useEffect(() => {
		fetchMembers();
	}, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor]);

	const weekDays = [
		'1 일요일', '2 월요일', '3 화요일', '4 수요일', 
		'5 목요일', '6 금요일', '7 토요일'
	];

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

					{/* 우측: 신체활동 입력 */}
					<section className="flex-1">
						<div className="grid grid-cols-2 gap-4">
							{/* 좌측: 식사 정보, 목욕 정보 */}
							<div className="space-y-4">
								{/* 식사 정보 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h3 className="text-lg font-semibold text-blue-900">식사 정보</h3>
									</div>
									<div className="p-4 space-y-3">
										{/* 식사종류 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사종류
											</label>
											<select
												value={mealType}
												onChange={(e) => setMealType(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											>
												<option value="일반식(저염식)">일반식(저염식)</option>
												<option value="일반식">일반식</option>
												<option value="연식">연식</option>
												<option value="죽식">죽식</option>
												<option value="유동식">유동식</option>
											</select>
										</div>
										{/* 식사섭취량 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사섭취량
											</label>
											<div className="flex items-center gap-3">
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="radio"
														name="mealIntake"
														value="1"
														checked={mealIntake === '1'}
														onChange={(e) => setMealIntake(e.target.value)}
														className="w-4 h-4 border border-blue-300"
													/>
													<span className="text-sm text-blue-900">1</span>
												</label>
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="radio"
														name="mealIntake"
														value="1/2이상"
														checked={mealIntake === '1/2이상'}
														onChange={(e) => setMealIntake(e.target.value)}
														className="w-4 h-4 border border-blue-300"
													/>
													<span className="text-sm text-blue-900">1/2이상</span>
												</label>
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="radio"
														name="mealIntake"
														value="1/2미만"
														checked={mealIntake === '1/2미만'}
														onChange={(e) => setMealIntake(e.target.value)}
														className="w-4 h-4 border border-blue-300"
													/>
													<span className="text-sm text-blue-900">1/2미만</span>
												</label>
											</div>
										</div>
										{/* 식사구분 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사구분
											</label>
											<select
												value={mealClassification}
												onChange={(e) => setMealClassification(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											>
												<option value="일반식(저염식)">일반식(저염식)</option>
												<option value="일반식">일반식</option>
												<option value="연식">연식</option>
												<option value="죽식">죽식</option>
												<option value="유동식">유동식</option>
											</select>
										</div>
										{/* 식사장소 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사장소
											</label>
											<input
												type="text"
												value={mealLocation}
												onChange={(e) => setMealLocation(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 확인자 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												확인자
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={mealConfirmerSearchTerm || mealConfirmer}
													onChange={(e) => {
														const value = e.target.value;
														setMealConfirmer(value);
														setMealConfirmerSearchTerm(value);
														if (!value || value.trim() === '') {
															setMealConfirmerSuggestions([]);
															setShowMealConfirmerDropdown(false);
														}
													}}
													onFocus={() => {
														if (mealConfirmer) {
															setMealConfirmerSearchTerm(mealConfirmer);
														}
													}}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="확인자 검색"
												/>
												{showMealConfirmerDropdown && mealConfirmerSuggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{mealConfirmerSuggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	setMealConfirmer(employee.EMPNM);
																	setMealConfirmerSearchTerm(employee.EMPNM);
																	setShowMealConfirmerDropdown(false);
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
									</div>
								</div>

								{/* 목욕 정보 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h3 className="text-lg font-semibold text-blue-900">목욕 정보</h3>
									</div>
									<div className="p-4 space-y-3">
										{/* 목욕방법 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕방법
											</label>
											<select
												value={bathMethod}
												onChange={(e) => setBathMethod(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											>
												<option value="샤워식-목욕의자">샤워식-목욕의자</option>
												<option value="샤워식">샤워식</option>
												<option value="욕조식">욕조식</option>
												<option value="수건목욕">수건목욕</option>
											</select>
										</div>
										{/* 소요시간(분) */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												소요시간(분)
											</label>
											<input
												type="number"
												value={bathTimeRequired}
												onChange={(e) => setBathTimeRequired(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 목욕시간 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕시간
											</label>
											<input
												type="time"
												value={bathTime}
												onChange={(e) => setBathTime(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 목욕요일1 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕요일1
											</label>
											<select
												value={bathDay1}
												onChange={(e) => setBathDay1(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											>
												{weekDays.map(day => (
													<option key={day} value={day}>{day}</option>
												))}
											</select>
										</div>
										{/* 제공자1 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												제공자1
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={bathProvider1SearchTerm || bathProvider1}
													onChange={(e) => {
														const value = e.target.value;
														setBathProvider1(value);
														setBathProvider1SearchTerm(value);
														if (!value || value.trim() === '') {
															setBathProvider1Suggestions([]);
															setShowBathProvider1Dropdown(false);
														}
													}}
													onFocus={() => {
														if (bathProvider1) {
															setBathProvider1SearchTerm(bathProvider1);
														}
													}}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="제공자 검색"
												/>
												{showBathProvider1Dropdown && bathProvider1Suggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{bathProvider1Suggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	setBathProvider1(employee.EMPNM);
																	setBathProvider1SearchTerm(employee.EMPNM);
																	setShowBathProvider1Dropdown(false);
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
										{/* 목욕요일2 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕요일2
											</label>
											<select
												value={bathDay2}
												onChange={(e) => setBathDay2(e.target.value)}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											>
												{weekDays.map(day => (
													<option key={day} value={day}>{day}</option>
												))}
											</select>
										</div>
										{/* 제공자2 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												제공자2
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<div className="flex gap-2">
													<input
														type="text"
														value={bathProvider2SearchTerm || bathProvider2}
														onChange={(e) => {
															const value = e.target.value;
															setBathProvider2(value);
															setBathProvider2SearchTerm(value);
															if (!value || value.trim() === '') {
																setBathProvider2Suggestions([]);
																setShowBathProvider2Dropdown(false);
															}
														}}
														onFocus={() => {
															if (bathProvider2) {
																setBathProvider2SearchTerm(bathProvider2);
															}
														}}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="제공자 검색"
													/>
													<button
														onClick={() => {
															setBathProvider2('');
															setBathProvider2SearchTerm('');
														}}
														className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
													>
														지움
													</button>
												</div>
												{showBathProvider2Dropdown && bathProvider2Suggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{bathProvider2Suggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	setBathProvider2(employee.EMPNM);
																	setBathProvider2SearchTerm(employee.EMPNM);
																	setShowBathProvider2Dropdown(false);
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
									</div>
								</div>
							</div>

							{/* 우측: 신체활동 체크박스 */}
							<div className="space-y-4">
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h3 className="text-lg font-semibold text-blue-900">신체활동</h3>
									</div>
									<div className="p-4 space-y-3">
										{/* 신체활동 체크박스들 */}
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={faceWashing}
												onChange={(e) => setFaceWashing(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<label className="text-sm text-blue-900">세면, 구강, 머리감기</label>
											<span className="text-sm text-blue-900/70">실시</span>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={grooming}
												onChange={(e) => setGrooming(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<label className="text-sm text-blue-900">몸단장, 옷갈아입히기</label>
											<span className="text-sm text-blue-900/70">실시</span>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={movementAssistance}
												onChange={(e) => setMovementAssistance(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<label className="text-sm text-blue-900">이동도움 및 신체 기능유지. 증진</label>
											<span className="text-sm text-blue-900/70">실시</span>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={positionChange}
												onChange={(e) => setPositionChange(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<label className="text-sm text-blue-900">체위변경(2시간마다)</label>
											<span className="text-sm text-blue-900/70">실시</span>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={walkAccompany}
												onChange={(e) => setWalkAccompany(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<label className="text-sm text-blue-900">산책동행</label>
											<span className="text-sm text-blue-900/70">실시</span>
										</div>
										{/* 화장실이용하기 */}
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">화장실이용하기 (기저귀교환) - 회</label>
											<input
												type="number"
												value={toiletUsage}
												onChange={(e) => setToiletUsage(e.target.value)}
												className="w-20 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={outingAccompany}
												onChange={(e) => setOutingAccompany(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<label className="text-sm text-blue-900">외출동행</label>
											<span className="text-sm text-blue-900/70">실시</span>
										</div>
										{/* 작성자성명 */}
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">작성자성명</label>
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
										{/* 저장 버튼 */}
										<div className="pt-4">
											<button
												onClick={handleSave}
												className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
											>
												신체활동 저장
											</button>
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

