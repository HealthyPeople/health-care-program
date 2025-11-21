"use client";
import React, { useState } from 'react';

export default function DailyBeneficiaryPerformance() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [selectedMember, setSelectedMember] = useState<number | null>(null);
	const [nextId, setNextId] = useState(3);
	const [searchResults, setSearchResults] = useState<{ [key: number | string]: any[] }>({});
	const [showSearchResults, setShowSearchResults] = useState<{ [key: number | string]: boolean }>({});
	const [showMealStatusModal, setShowMealStatusModal] = useState(false);
	const [showDailyModal, setShowDailyModal] = useState(false);
	const [showRecipientModal, setShowRecipientModal] = useState(false);
	const [mealStatusSearchTerm, setMealStatusSearchTerm] = useState('');
	const [mealStatusStartDate, setMealStatusStartDate] = useState(new Date().toISOString().split('T')[0]);
	const [mealStatusEndDate, setMealStatusEndDate] = useState(new Date().toISOString().split('T')[0]);
	const [mealStatusStatus, setMealStatusStatus] = useState('입소');
	const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
	const [mealStatusDetails, setMealStatusDetails] = useState<any[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const [showAddModal, setShowAddModal] = useState(false);
	const [newRowData, setNewRowData] = useState({
		name: '',
		birthDate: '',
		mealLocation: '',
		mealType: '1',
		outgoing: false,
		overnight: false,
		startTime: '',
		endTime: '',
		mealStatus: { breakfast: false, lunch: false, dinner: false },
		specialNotes: '',
		snackStatus: { morning: false, afternoon: false }
	});

	// 날짜 변경 함수
	const handleDateChange = (days: number) => {
		const date = new Date(selectedDate);
		date.setDate(date.getDate() + days);
		setSelectedDate(date.toISOString().split('T')[0]);
	};

	// 통합 데이터: 수급자 정보 + 실적 정보
	const [combinedData, setCombinedData] = useState([
		{ 
			id: 1,
			serialNo: 1, 
			name: '홍길동', 
			birthDate: '1950-01-15',
			mealLocation: '',
			mealType: '1', // 1.일반식, 2.가정식, 3.죽, 4.미음, 5.연하식, 6.갈음식, 7.유동식
			outgoing: false,
			overnight: false,
			startTime: '',
			endTime: '',
			mealStatus: { breakfast: true, lunch: true, dinner: false }, 
			specialNotes: '', 
			snackStatus: { morning: false, afternoon: false } 
		},
		{ 
			id: 2,
			serialNo: 2, 
			name: '김영희', 
			birthDate: '1955-03-20',
			mealLocation: '',
			mealType: '2',
			outgoing: false,
			overnight: false,
			startTime: '',
			endTime: '',
			mealStatus: { breakfast: false, lunch: false, dinner: false }, 
			specialNotes: '', 
			snackStatus: { morning: false, afternoon: false } 
		},
	]);

	// 추가 모달 열기
	const handleOpenAddModal = () => {
		setNewRowData({
			name: '',
			birthDate: '',
			mealLocation: '',
			mealType: '1',
			outgoing: false,
			overnight: false,
			startTime: '',
			endTime: '',
			mealStatus: { breakfast: false, lunch: false, dinner: false },
			specialNotes: '',
			snackStatus: { morning: false, afternoon: false }
		});
		setShowAddModal(true);
	};

	// 행 추가 함수 (모달에서 확인 클릭 시)
	const handleAddRow = () => {
		const newSerialNo = combinedData.length > 0 
			? Math.max(...combinedData.map(row => row.serialNo)) + 1 
			: 1;
		
		const newRow = {
			id: nextId,
			serialNo: newSerialNo,
			...newRowData
		};
		
		setCombinedData([...combinedData, newRow]);
		setNextId(nextId + 1);
		setShowAddModal(false);
	};

	// 행 삭제 함수
	const handleDeleteRow = (id: number) => {
		setCombinedData(combinedData.filter(row => row.id !== id));
	};

	// 수급자 검색 함수
	const handleSearchMember = async (rowId: number, searchValue: string) => {
		if (!searchValue || searchValue.trim().length < 1) {
			setSearchResults(prev => ({ ...prev, [rowId]: [] }));
			setShowSearchResults(prev => ({ ...prev, [rowId]: false }));
			return;
		}

		try {
			const response = await fetch(`/api/f10010/search?q=${encodeURIComponent(searchValue.trim())}`);
			if (!response.ok) {
				throw new Error('검색 요청 실패');
			}
			const data = await response.json();
			
			if (data.success && data.data) {
				setSearchResults(prev => ({ ...prev, [rowId]: data.data }));
				setShowSearchResults(prev => ({ ...prev, [rowId]: data.data.length > 0 }));
			} else {
				setSearchResults(prev => ({ ...prev, [rowId]: [] }));
				setShowSearchResults(prev => ({ ...prev, [rowId]: false }));
			}
		} catch (error) {
			console.error('수급자 검색 오류:', error);
			setSearchResults(prev => ({ ...prev, [rowId]: [] }));
			setShowSearchResults(prev => ({ ...prev, [rowId]: false }));
		}
	};

	// 날짜 형식 변환 함수 (yyyy-mm-dd)
	const formatDate = (dateStr: string | null | undefined): string => {
		if (!dateStr) return '';
		
		// 이미 yyyy-mm-dd 형식이면 그대로 반환
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
			return dateStr;
		}
		
		// 날짜 객체로 변환 시도
		try {
			const date = new Date(dateStr);
			if (!isNaN(date.getTime())) {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			}
		} catch (e) {
			console.error('날짜 변환 오류:', e);
		}
		
		// 변환 실패 시 원본 반환
		return dateStr;
	};

	// 수급자 선택 함수
	const handleSelectMember = (rowId: number, member: any) => {
		setCombinedData(prev => prev.map(row => {
			if (row.id === rowId) {
				return {
					...row,
					name: member.P_NM || '',
					birthDate: formatDate(member.P_BRDT),
					ancd: member.ANCD || '',
					pnum: member.PNUM || ''
				};
			}
			return row;
		}));
		setShowSearchResults(prev => ({ ...prev, [rowId]: false }));
		setSearchResults(prev => ({ ...prev, [rowId]: [] }));
	};

	// 모달에서 수급자 검색
	const handleModalSearchMember = async (searchValue: string) => {
		if (!searchValue || searchValue.trim().length < 1) {
			setSearchResults(prev => ({ ...prev, 'modal': [] }));
			setShowSearchResults(prev => ({ ...prev, 'modal': false }));
			return;
		}

		try {
			const response = await fetch(`/api/f10010/search?q=${encodeURIComponent(searchValue.trim())}`);
			if (!response.ok) {
				throw new Error('검색 요청 실패');
			}
			const data = await response.json();
			
			if (data.success && data.data) {
				setSearchResults(prev => ({ ...prev, 'modal': data.data }));
				setShowSearchResults(prev => ({ ...prev, 'modal': data.data.length > 0 }));
			} else {
				setSearchResults(prev => ({ ...prev, 'modal': [] }));
				setShowSearchResults(prev => ({ ...prev, 'modal': false }));
			}
		} catch (error) {
			console.error('수급자 검색 오류:', error);
			setSearchResults(prev => ({ ...prev, 'modal': [] }));
			setShowSearchResults(prev => ({ ...prev, 'modal': false }));
		}
	};

	// 모달에서 수급자 선택
	const handleModalSelectMember = (member: any) => {
		setNewRowData(prev => ({
			...prev,
			name: member.P_NM || '',
			birthDate: formatDate(member.P_BRDT),
			ancd: member.ANCD || '',
			pnum: member.PNUM || ''
		}));
		setShowSearchResults(prev => ({ ...prev, 'modal': false }));
		setSearchResults(prev => ({ ...prev, 'modal': [] }));
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1600px] p-4">
				{/* 상단: 날짜 네비게이션 */}
				<div className="mb-4 flex items-center border-b border-blue-200 pb-3 relative">
					{/* 가운데: 날짜 네비게이션 */}
					<div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
						<button 
							onClick={() => handleDateChange(-1)}
							className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							<span>◀</span>
							<span>이전일</span>
						</button>
						<div className="flex items-center gap-2">
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white text-blue-900"
							/>
							<button className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900">
								📅 달력선택
							</button>
						</div>
						<button 
							onClick={() => handleDateChange(1)}
							className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							<span>다음일</span>
							<span>▶</span>
						</button>
					</div>
					{/* 오른쪽 상단 버튼 */}
					<div className="ml-auto flex items-center gap-2">
						<button 
							onClick={() => setShowDailyModal(true)}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							일자별
						</button>
						<button 
							onClick={() => setShowRecipientModal(true)}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							수급자별
						</button>
						<button 
							onClick={() => setShowMealStatusModal(true)}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							월식사상태
						</button>
					</div>
				</div>

				{/* 통합 테이블: 수급자 목록 + 실적 등록 */}
				<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
					<div className="bg-blue-100 border-b border-blue-300 px-4 py-2">
						<h2 className="text-lg font-semibold text-blue-900">일 수급자급여실적 등록</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
								<tr>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">연번</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">수급자명(생년월일)</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사장소</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사종류</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">외출</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">외박</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">시작시간</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">종료시간</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사여부</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">간식여부</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">특이사항</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold">삭제</th>
								</tr>
							</thead>
							<tbody>
								{combinedData.map((row, idx) => (
									<tr 
										key={row.id} 
										className={`border-b border-blue-50 hover:bg-blue-50 ${
											selectedMember === row.id ? 'bg-blue-100' : ''
										}`}
										onClick={() => setSelectedMember(row.id)}
									>
										{/* 연번 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">{row.serialNo}</td>
										{/* 수급자명(생년월일) */}
										<td className="text-center px-3 py-3 border-r border-blue-100 relative">
											<div className="flex flex-col">
												<input
													type="text"
													value={row.name || ''}
													placeholder="수급자명 검색"
													onChange={(e) => {
														const newData = combinedData.map(r => 
															r.id === row.id ? { ...r, name: e.target.value } : r
														);
														setCombinedData(newData);
														handleSearchMember(row.id, e.target.value);
													}}
													onClick={(e) => e.stopPropagation()}
													onFocus={() => {
														if (row.name) {
															handleSearchMember(row.id, row.name);
														}
													}}
													className="w-full px-2 py-1 border border-blue-300 rounded"
												/>
												{row.birthDate && (
													<span className="text-xs text-gray-500 mt-1">({row.birthDate})</span>
												)}
											</div>
											{/* 검색 결과 드롭다운 */}
											{showSearchResults[row.id] && searchResults[row.id] && searchResults[row.id].length > 0 && (
												<div className="absolute z-50 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-60 overflow-y-auto">
													{searchResults[row.id].map((member: any, memberIdx: number) => (
														<div
															key={memberIdx}
															onClick={(e) => {
																e.stopPropagation();
																handleSelectMember(row.id, member);
															}}
															className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-blue-100 last:border-b-0"
														>
															<div className="font-medium">{member.P_NM}</div>
															<div className="text-xs text-gray-500">
																{member.P_BRDT && `생년월일: ${member.P_BRDT}`}
																{member.PNUM && ` | 수급자번호: ${member.PNUM}`}
															</div>
														</div>
													))}
												</div>
											)}
										</td>
										{/* 식사장소 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="text" 
												value={row.mealLocation}
												placeholder="식사장소 입력"
												onChange={() => {}}
												onClick={(e) => e.stopPropagation()}
												className="w-full px-2 py-1 border border-blue-300 rounded"
											/>
										</td>
										{/* 식사종류 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<select 
												value={row.mealType}
												onChange={() => {}}
												onClick={(e) => e.stopPropagation()}
												className="w-full px-2 py-1 border border-blue-300 rounded bg-white"
											>
												<option value="1">1.일반식</option>
												<option value="2">2.가정식</option>
												<option value="3">3.죽</option>
												<option value="4">4.미음</option>
												<option value="5">5.연하식</option>
												<option value="6">6.갈음식</option>
												<option value="7">7.유동식</option>
											</select>
										</td>
										{/* 외출 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="checkbox" 
												checked={row.outgoing}
												onChange={() => {}}
												onClick={(e) => e.stopPropagation()}
												className="cursor-pointer"
											/>
										</td>
										{/* 외박 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="checkbox" 
												checked={row.overnight}
												onChange={() => {}}
												onClick={(e) => e.stopPropagation()}
												className="cursor-pointer"
											/>
										</td>
										{/* 시작시간 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="time" 
												value={row.startTime}
												onChange={() => {}}
												onClick={(e) => e.stopPropagation()}
												className="w-full px-2 py-1 border border-blue-300 rounded"
											/>
										</td>
										{/* 종료시간 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="time" 
												value={row.endTime}
												onChange={() => {}}
												onClick={(e) => e.stopPropagation()}
												className="w-full px-2 py-1 border border-blue-300 rounded"
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
												<label className="flex items-center gap-1 cursor-pointer">
													<input 
														type="checkbox" 
														checked={row.mealStatus.breakfast}
														onChange={() => {}}
														className="cursor-pointer"
													/>
													<span className="text-xs">조</span>
												</label>
												<label className="flex items-center gap-1 cursor-pointer">
													<input 
														type="checkbox" 
														checked={row.mealStatus.lunch}
														onChange={() => {}}
														className="cursor-pointer"
													/>
													<span className="text-xs">중</span>
												</label>
												<label className="flex items-center gap-1 cursor-pointer">
													<input 
														type="checkbox" 
														checked={row.mealStatus.dinner}
														onChange={() => {}}
														className="cursor-pointer"
													/>
													<span className="text-xs">석</span>
												</label>
											</div>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
												<label className="flex items-center gap-1 cursor-pointer">
													<input 
														type="checkbox" 
														checked={row.snackStatus.morning}
														onChange={() => {}}
														className="cursor-pointer"
													/>
													<span className="text-xs">오전</span>
												</label>
												<label className="flex items-center gap-1 cursor-pointer">
													<input 
														type="checkbox" 
														checked={row.snackStatus.afternoon}
														onChange={() => {}}
														className="cursor-pointer"
													/>
													<span className="text-xs">오후</span>
												</label>
											</div>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="text" 
												value={row.specialNotes}
												placeholder="특이사항 입력"
												onClick={(e) => e.stopPropagation()}
												className="w-full px-2 py-1 border border-blue-300 rounded"
											/>
										</td>
										<td className="text-center px-3 py-3">
											<button 
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteRow(row.id);
												}}
												className="px-3 py-1 text-xs border border-red-300 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium"
											>
												삭제
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* 하단 버튼 */}
				<div className="flex justify-center gap-3 mt-4">
					<button 
						onClick={handleOpenAddModal}
						className="px-6 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
					>
						추가
					</button>
					<button className="px-6 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium">
						저장
					</button>
					<button className="px-6 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium">
						전체 삭제
					</button>
				</div>
			</div>

			{/* 월식사상태 모달 */}
			{showMealStatusModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg shadow-xl w-[95%] max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
						{/* 모달 헤더 */}
						<div className="bg-green-100 border-b border-green-300 px-4 py-3">
							<h2 className="text-lg font-semibold text-green-900">수급자 식사 상태 조회</h2>
						</div>

						{/* 모달 본문 */}
						<div className="flex-1 overflow-y-auto p-4">
							{/* 검색 영역 */}
							<div className="mb-4 flex items-center gap-4 flex-wrap">
								<div className="flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">수급자</label>
									<input
										type="text"
										value={mealStatusSearchTerm}
										onChange={(e) => setMealStatusSearchTerm(e.target.value)}
										placeholder="수급자명 입력"
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">기간</label>
									<input
										type="date"
										value={mealStatusStartDate}
										onChange={(e) => setMealStatusStartDate(e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
									<span className="text-blue-900">~</span>
									<input
										type="date"
										value={mealStatusEndDate}
										onChange={(e) => setMealStatusEndDate(e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">상태</label>
									<select
										value={mealStatusStatus}
										onChange={(e) => setMealStatusStatus(e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									>
										<option value="입소">입소</option>
										<option value="퇴소">퇴소</option>
									</select>
								</div>
								<div className="ml-auto flex items-center gap-2">
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										검색
									</button>
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										개별출력
									</button>
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										전체출력
									</button>
									<button 
										onClick={() => setShowMealStatusModal(false)}
										className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
									>
										닫기
									</button>
								</div>
							</div>

							{/* 수급자 정보 테이블 */}
							<div className="mb-4 border border-blue-300 rounded-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-blue-50 border-b border-blue-200">
											<tr>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">수급자</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">성별</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">생일</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">상태</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">요양등급</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">장기요양인정번호</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold">만료일자</th>
											</tr>
										</thead>
										<tbody>
											{selectedRecipient ? (
												<tr className="border-b border-blue-50">
													<td className="text-center px-3 py-2 border-r border-blue-100">{selectedRecipient.name}</td>
													<td className="text-center px-3 py-2 border-r border-blue-100">{selectedRecipient.gender}</td>
													<td className="text-center px-3 py-2 border-r border-blue-100">{selectedRecipient.birthDate}</td>
													<td className="text-center px-3 py-2 border-r border-blue-100">{selectedRecipient.status}</td>
													<td className="text-center px-3 py-2 border-r border-blue-100">{selectedRecipient.careGrade}</td>
													<td className="text-center px-3 py-2 border-r border-blue-100">{selectedRecipient.recognitionNumber || ''}</td>
													<td className="text-center px-3 py-2">{selectedRecipient.expirationDate}</td>
												</tr>
											) : (
												<tr>
													<td colSpan={7} className="text-center px-3 py-4 text-gray-400">
														검색 결과가 없습니다
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>

							{/* 식사 상태 상세 테이블 */}
							<div className="mb-4">
								<div className="mb-2 flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">수급자</label>
									<input
										type="text"
										value={selectedRecipient?.name || ''}
										readOnly
										className="px-3 py-1 text-sm border border-blue-300 rounded bg-gray-50"
									/>
								</div>
								<div className="border border-blue-300 rounded-lg overflow-hidden">
									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead className="bg-blue-50 border-b border-blue-200">
												<tr>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">서비스일자</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">아침 이상</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">점심 이상</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">저녁 이상</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">오전 이상</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">오후 이상</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">저녁간식 이상</th>
													<th className="text-center px-3 py-2 text-blue-900 font-semibold">식사구분</th>
												</tr>
											</thead>
											<tbody>
												{mealStatusDetails.length > 0 ? (
													mealStatusDetails.map((detail, idx) => (
														<tr key={idx} className="border-b border-blue-50">
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.serviceDate}</td>
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.breakfastAbnormal || ''}</td>
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.lunchAbnormal || ''}</td>
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.dinnerAbnormal || ''}</td>
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.morningAbnormal || ''}</td>
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.afternoonAbnormal || ''}</td>
															<td className="text-center px-3 py-2 border-r border-blue-100">{detail.eveningSnackAbnormal || ''}</td>
															<td className="text-center px-3 py-2">{detail.mealType || ''}</td>
														</tr>
													))
												) : (
													<tr>
														<td colSpan={8} className="text-center px-3 py-4 text-gray-400">
															데이터가 없습니다
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</div>

							{/* 페이지네이션 */}
							<div className="flex justify-center gap-2">
								<button className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900">
									&lt;&lt;
								</button>
								<button className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900">
									&lt;
								</button>
								<button className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900">
									&gt;
								</button>
								<button className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900">
									&gt;&gt;
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 일자별 모달 */}
			{showDailyModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg shadow-xl w-[95%] max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
						{/* 모달 헤더 */}
						<div className="bg-blue-100 border-b border-blue-300 px-4 py-3">
							<h2 className="text-lg font-semibold text-blue-900">일자별 조회</h2>
						</div>

						{/* 모달 본문 */}
						<div className="flex-1 overflow-y-auto p-4">
							{/* 검색 영역 */}
							<div className="mb-4 flex items-center gap-4 flex-wrap">
								<div className="flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">조회일자</label>
									<input
										type="date"
										value={selectedDate}
										onChange={(e) => setSelectedDate(e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
								</div>
								<div className="ml-auto flex items-center gap-2">
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										검색
									</button>
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										출력
									</button>
									<button 
										onClick={() => setShowDailyModal(false)}
										className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
									>
										닫기
									</button>
								</div>
							</div>

							{/* 일자별 데이터 테이블 */}
							<div className="border border-blue-300 rounded-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-blue-50 border-b border-blue-200">
											<tr>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">연번</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">생년월일</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사장소</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사종류</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">외출</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">외박</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">시작시간</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">종료시간</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사여부</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">간식여부</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold">특이사항</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td colSpan={12} className="text-center px-3 py-4 text-gray-400">
													데이터가 없습니다
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 수급자별 모달 */}
			{showRecipientModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg shadow-xl w-[95%] max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
						{/* 모달 헤더 */}
						<div className="bg-purple-100 border-b border-purple-300 px-4 py-3">
							<h2 className="text-lg font-semibold text-purple-900">수급자별 조회</h2>
						</div>

						{/* 모달 본문 */}
						<div className="flex-1 overflow-y-auto p-4">
							{/* 검색 영역 */}
							<div className="mb-4 flex items-center gap-4 flex-wrap">
								<div className="flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">수급자명</label>
									<input
										type="text"
										placeholder="수급자명 입력"
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm text-blue-900 font-medium">조회기간</label>
									<input
										type="date"
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
									<span className="text-blue-900">~</span>
									<input
										type="date"
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white"
									/>
								</div>
								<div className="ml-auto flex items-center gap-2">
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										검색
									</button>
									<button className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium">
										출력
									</button>
									<button 
										onClick={() => setShowRecipientModal(false)}
										className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
									>
										닫기
									</button>
								</div>
							</div>

							{/* 수급자 정보 */}
							<div className="mb-4 border border-blue-300 rounded-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-blue-50 border-b border-blue-200">
											<tr>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">생년월일</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">성별</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold">상태</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td colSpan={4} className="text-center px-3 py-4 text-gray-400">
													검색 결과가 없습니다
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>

							{/* 수급자별 상세 데이터 테이블 */}
							<div className="border border-blue-300 rounded-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-blue-50 border-b border-blue-200">
											<tr>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">서비스일자</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사장소</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사종류</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">외출</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">외박</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">시작시간</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">종료시간</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사여부</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">간식여부</th>
												<th className="text-center px-3 py-2 text-blue-900 font-semibold">특이사항</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td colSpan={10} className="text-center px-3 py-4 text-gray-400">
													데이터가 없습니다
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 추가 모달 */}
			{showAddModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg shadow-xl w-[95%] max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
						{/* 모달 헤더 */}
						<div className="bg-blue-100 border-b border-blue-300 px-4 py-3">
							<h2 className="text-lg font-semibold text-blue-900">일 수급자급여실적 등록</h2>
						</div>

						{/* 모달 본문 */}
						<div className="flex-1 overflow-y-auto p-4">
							<div className="grid grid-cols-12 gap-4">
								{/* 수급자명(생년월일) */}
								<div className="col-span-12 md:col-span-6 relative">
									<label className="block text-sm text-blue-900 font-medium mb-1">수급자명(생년월일)</label>
									<input
										type="text"
										value={newRowData.name}
										onChange={(e) => {
											setNewRowData(prev => ({ ...prev, name: e.target.value }));
											handleModalSearchMember(e.target.value);
										}}
										onFocus={() => {
											if (newRowData.name) {
												handleModalSearchMember(newRowData.name);
											}
										}}
										placeholder="수급자명 검색"
										className="w-full px-3 py-2 border border-blue-300 rounded"
									/>
									{newRowData.birthDate && (
										<span className="text-xs text-gray-500 mt-1 block">({newRowData.birthDate})</span>
									)}
									{/* 검색 결과 드롭다운 */}
									{showSearchResults['modal'] && searchResults['modal'] && searchResults['modal'].length > 0 && (
										<div className="absolute z-50 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-60 overflow-y-auto">
											{searchResults['modal'].map((member: any, memberIdx: number) => (
												<div
													key={memberIdx}
													onClick={() => handleModalSelectMember(member)}
													className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-blue-100 last:border-b-0"
												>
													<div className="font-medium">{member.P_NM}</div>
													<div className="text-xs text-gray-500">
														{member.BIRTH && `생년월일: ${member.BIRTH}`}
														{member.PNUM && ` | 수급자번호: ${member.PNUM}`}
													</div>
												</div>
											))}
										</div>
									)}
								</div>

								{/* 식사장소 */}
								<div className="col-span-12 md:col-span-6">
									<label className="block text-sm text-blue-900 font-medium mb-1">식사장소</label>
									<input
										type="text"
										value={newRowData.mealLocation}
										onChange={(e) => setNewRowData(prev => ({ ...prev, mealLocation: e.target.value }))}
										placeholder="식사장소 입력"
										className="w-full px-3 py-2 border border-blue-300 rounded"
									/>
								</div>

								{/* 식사종류 */}
								<div className="col-span-12 md:col-span-6">
									<label className="block text-sm text-blue-900 font-medium mb-1">식사종류</label>
									<select
										value={newRowData.mealType}
										onChange={(e) => setNewRowData(prev => ({ ...prev, mealType: e.target.value }))}
										className="w-full px-3 py-2 border border-blue-300 rounded bg-white"
									>
										<option value="1">1.일반식</option>
										<option value="2">2.가정식</option>
										<option value="3">3.죽</option>
										<option value="4">4.미음</option>
										<option value="5">5.연하식</option>
										<option value="6">6.갈음식</option>
										<option value="7">7.유동식</option>
									</select>
								</div>

								{/* 외출 */}
								<div className="col-span-12 md:col-span-6">
									<label className="block text-sm text-blue-900 font-medium mb-1">외출</label>
									<input
										type="checkbox"
										checked={newRowData.outgoing}
										onChange={(e) => setNewRowData(prev => ({ ...prev, outgoing: e.target.checked }))}
										className="w-5 h-5 cursor-pointer"
									/>
								</div>

								{/* 외박 */}
								<div className="col-span-12 md:col-span-6">
									<label className="block text-sm text-blue-900 font-medium mb-1">외박</label>
									<input
										type="checkbox"
										checked={newRowData.overnight}
										onChange={(e) => setNewRowData(prev => ({ ...prev, overnight: e.target.checked }))}
										className="w-5 h-5 cursor-pointer"
									/>
								</div>

								{/* 시작시간 */}
								<div className="col-span-12 md:col-span-6">
									<label className="block text-sm text-blue-900 font-medium mb-1">시작시간</label>
									<input
										type="time"
										value={newRowData.startTime}
										onChange={(e) => setNewRowData(prev => ({ ...prev, startTime: e.target.value }))}
										className="w-full px-3 py-2 border border-blue-300 rounded"
									/>
								</div>

								{/* 종료시간 */}
								<div className="col-span-12 md:col-span-6">
									<label className="block text-sm text-blue-900 font-medium mb-1">종료시간</label>
									<input
										type="time"
										value={newRowData.endTime}
										onChange={(e) => setNewRowData(prev => ({ ...prev, endTime: e.target.value }))}
										className="w-full px-3 py-2 border border-blue-300 rounded"
									/>
								</div>

								{/* 식사여부 */}
								<div className="col-span-12">
									<label className="block text-sm text-blue-900 font-medium mb-1">식사여부</label>
									<div className="flex gap-4">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={newRowData.mealStatus.breakfast}
												onChange={(e) => setNewRowData(prev => ({
													...prev,
													mealStatus: { ...prev.mealStatus, breakfast: e.target.checked }
												}))}
												className="cursor-pointer"
											/>
											<span>조식</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={newRowData.mealStatus.lunch}
												onChange={(e) => setNewRowData(prev => ({
													...prev,
													mealStatus: { ...prev.mealStatus, lunch: e.target.checked }
												}))}
												className="cursor-pointer"
											/>
											<span>중식</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={newRowData.mealStatus.dinner}
												onChange={(e) => setNewRowData(prev => ({
													...prev,
													mealStatus: { ...prev.mealStatus, dinner: e.target.checked }
												}))}
												className="cursor-pointer"
											/>
											<span>석식</span>
										</label>
									</div>
								</div>

								{/* 간식여부 */}
								<div className="col-span-12">
									<label className="block text-sm text-blue-900 font-medium mb-1">간식여부</label>
									<div className="flex gap-4">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={newRowData.snackStatus.morning}
												onChange={(e) => setNewRowData(prev => ({
													...prev,
													snackStatus: { ...prev.snackStatus, morning: e.target.checked }
												}))}
												className="cursor-pointer"
											/>
											<span>오전</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={newRowData.snackStatus.afternoon}
												onChange={(e) => setNewRowData(prev => ({
													...prev,
													snackStatus: { ...prev.snackStatus, afternoon: e.target.checked }
												}))}
												className="cursor-pointer"
											/>
											<span>오후</span>
										</label>
									</div>
								</div>

								{/* 특이사항 */}
								<div className="col-span-12">
									<label className="block text-sm text-blue-900 font-medium mb-1">특이사항</label>
									<textarea
										value={newRowData.specialNotes}
										onChange={(e) => setNewRowData(prev => ({ ...prev, specialNotes: e.target.value }))}
										placeholder="특이사항 입력"
										rows={3}
										className="w-full px-3 py-2 border border-blue-300 rounded"
									/>
								</div>
							</div>
						</div>

						{/* 모달 하단 버튼 */}
						<div className="border-t border-blue-200 px-4 py-3 flex justify-end gap-3">
							<button
								onClick={() => setShowAddModal(false)}
								className="px-6 py-2 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
							>
								취소
							</button>
							<button
								onClick={handleAddRow}
								className="px-6 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								확인
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
    );
}
