"use client";

import { useState, useEffect } from 'react';

interface MemberData {
	[key: string]: any;
}

export default function LongtermFunctionalCognitive() {
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

	// 왼쪽 컬럼 관련 state
	const [physicalCognitiveProgram, setPhysicalCognitiveProgram] = useState(true);
	const [physicalFunctionTraining, setPhysicalFunctionTraining] = useState(true);
	const [cognitiveTraining, setCognitiveTraining] = useState(true);
	const [physicalTherapy, setPhysicalTherapy] = useState(true);
	const [preparerName, setPreparerName] = useState('');

	// 오른쪽 컬럼 관련 state
	const [cognitiveSupport, setCognitiveSupport] = useState(true);
	const [communicationSupport, setCommunicationSupport] = useState(true);
	const [cognitivePreparerName, setCognitivePreparerName] = useState('');

	// 직원 검색 관련 state
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);
	const [cognitivePreparerSearchTerm, setCognitivePreparerSearchTerm] = useState('');
	const [cognitivePreparerSuggestions, setCognitivePreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showCognitivePreparerDropdown, setShowCognitivePreparerDropdown] = useState(false);

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
			physicalCognitiveProgram,
			physicalFunctionTraining,
			cognitiveTraining,
			physicalTherapy,
			preparerName,
			cognitiveSupport,
			communicationSupport,
			cognitivePreparerName
		});
		alert('기능인지 정보가 저장되었습니다.');
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
			if (cognitivePreparerSearchTerm && cognitivePreparerSearchTerm.trim() !== '') {
				searchEmployee(cognitivePreparerSearchTerm, setCognitivePreparerSuggestions, setShowCognitivePreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [cognitivePreparerSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowPreparerDropdown(false);
				setShowCognitivePreparerDropdown(false);
			}
		};

		if (showPreparerDropdown || showCognitivePreparerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showPreparerDropdown, showCognitivePreparerDropdown]);

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

					{/* 우측: 기능인지 입력 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">기능인지</h2>
							</div>

							<div className="p-4">
								<div className="grid grid-cols-2 gap-4">
									{/* 왼쪽 컬럼 */}
									<div className="space-y-3">
										{/* 신체.인지기능 향상 프로그램 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												신체.인지기능 향상 프로그램
											</label>
											<input
												type="checkbox"
												checked={physicalCognitiveProgram}
												onChange={(e) => setPhysicalCognitiveProgram(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 신체기능.기본동작 일상생활활동작훈련 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												신체기능.기본동작 일상생활활동작훈련
											</label>
											<input
												type="checkbox"
												checked={physicalFunctionTraining}
												onChange={(e) => setPhysicalFunctionTraining(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 인지기능 향상훈련 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지기능 향상훈련
											</label>
											<input
												type="checkbox"
												checked={cognitiveTraining}
												onChange={(e) => setCognitiveTraining(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 물리치료작업 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												물리치료작업
											</label>
											<input
												type="checkbox"
												checked={physicalTherapy}
												onChange={(e) => setPhysicalTherapy(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 작성자성명 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												작성자성명
											</label>
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
									</div>

									{/* 오른쪽 컬럼 */}
									<div className="space-y-3">
										{/* 인지관리 지원 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지관리 지원
											</label>
											<input
												type="checkbox"
												checked={cognitiveSupport}
												onChange={(e) => setCognitiveSupport(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 인지관리-의사소통도 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지관리-의사소통도
											</label>
											<input
												type="checkbox"
												checked={communicationSupport}
												onChange={(e) => setCommunicationSupport(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 인지관리 작성자성명 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지관리 작성자성명
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={cognitivePreparerSearchTerm || cognitivePreparerName}
													onChange={(e) => {
														const value = e.target.value;
														setCognitivePreparerName(value);
														setCognitivePreparerSearchTerm(value);
														if (!value || value.trim() === '') {
															setCognitivePreparerSuggestions([]);
															setShowCognitivePreparerDropdown(false);
														}
													}}
													onFocus={() => {
														if (cognitivePreparerName) {
															setCognitivePreparerSearchTerm(cognitivePreparerName);
														}
														if (cognitivePreparerSearchTerm && cognitivePreparerSearchTerm.trim() !== '') {
															searchEmployee(cognitivePreparerSearchTerm, setCognitivePreparerSuggestions, setShowCognitivePreparerDropdown);
														}
													}}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="작성자 검색"
												/>
												{showCognitivePreparerDropdown && cognitivePreparerSuggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{cognitivePreparerSuggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	setCognitivePreparerName(employee.EMPNM);
																	setCognitivePreparerSearchTerm(employee.EMPNM);
																	setShowCognitivePreparerDropdown(false);
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

								{/* 저장 버튼 */}
								<div className="pt-4">
									<button
										onClick={handleSave}
										className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									>
										저장
									</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
