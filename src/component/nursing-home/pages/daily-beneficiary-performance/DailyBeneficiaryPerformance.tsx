"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function DailyBeneficiaryPerformance() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [selectedMember, setSelectedMember] = useState<number | null>(null);
	const [nextId, setNextId] = useState(3);
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [searchResults, setSearchResults] = useState<{ [key: number | string]: any[] }>({});
	const [showSearchResults, setShowSearchResults] = useState<{ [key: number | string]: boolean }>({});
	const searchInputRefs = useRef<{ [key: number | string]: HTMLInputElement | null }>({});

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
			startDateTime: '',
			endDateTime: '',
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
			startDateTime: '',
			endDateTime: '',
			mealStatus: { breakfast: false, lunch: false, dinner: false }, 
			specialNotes: '', 
			snackStatus: { morning: false, afternoon: false } 
		},
	]);

	// 행 삭제 함수
	const handleDeleteRow = (id: number) => {
		if (confirm('정말 삭제하시겠습니까?')) {
			setCombinedData(combinedData.filter(row => row.id !== id));
			if (editingRowId === id) {
				setEditingRowId(null);
			}
		}
	};

	// 수정 모드 토글
	const handleEditClick = (id: number) => {
		if (editingRowId === id) {
			// 수정 완료
			setEditingRowId(null);
		} else {
			// 수정 모드 진입
			setEditingRowId(id);
		}
	};

	// 행 추가 함수
	const handleAddRow = () => {
		const newSerialNo = combinedData.length > 0 
			? Math.max(...combinedData.map(row => row.serialNo)) + 1 
			: 1;
		
		const newRow = {
			id: nextId,
			serialNo: newSerialNo,
			name: '',
			birthDate: '',
			mealLocation: '',
			mealType: '1',
			outgoing: false,
			overnight: false,
			startDateTime: '',
			endDateTime: '',
			mealStatus: { breakfast: false, lunch: false, dinner: false },
			specialNotes: '',
			snackStatus: { morning: false, afternoon: false }
		};
		
		setCombinedData(prev => [...prev, newRow]);
		setNextId(prev => prev + 1);
		setEditingRowId(newRow.id); // 새로 추가된 행을 수정 모드로 설정
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
						<button className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium">
							일자별
						</button>
						<button className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium">
							수급자별
						</button>
						<button className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium">
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
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">시작일시</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">종료일시</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사여부</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">간식여부</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">특이사항</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold">작업</th>
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
													ref={(el) => {
														if (el) {
															searchInputRefs.current[row.id] = el;
														} else {
															delete searchInputRefs.current[row.id];
														}
													}}
													type="text"
													value={row.name || ''}
													placeholder="수급자명 검색"
													onChange={(e) => {
														const newData = combinedData.map(r => 
															r.id === row.id ? { ...r, name: e.target.value } : r
														);
														setCombinedData(newData);
														// 타이핑할 때마다 검색 실행 (수정 모드일 때만)
														if (editingRowId === row.id) {
															if (e.target.value.trim().length > 0) {
																handleSearchMember(row.id, e.target.value);
															} else {
																setSearchResults(prev => ({ ...prev, [row.id]: [] }));
																setShowSearchResults(prev => ({ ...prev, [row.id]: false }));
															}
														}
													}}
													disabled={editingRowId !== row.id}
													onClick={(e) => e.stopPropagation()}
													onFocus={() => {
														if (editingRowId === row.id && row.name && row.name.trim().length > 0) {
															handleSearchMember(row.id, row.name);
														}
													}}
													onBlur={() => {
														// 포커스를 잃을 때 약간의 지연 후 드롭다운 닫기
														setTimeout(() => {
															setShowSearchResults(prev => ({ ...prev, [row.id]: false }));
														}, 200);
													}}
													className={`w-full px-2 py-1 border border-blue-300 rounded ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
												{row.birthDate && (
													<span className="text-xs text-gray-500 mt-1">({row.birthDate})</span>
												)}
											</div>
											{/* 검색 결과 드롭다운 - fixed 포지셔닝으로 표 밖에 표시 */}
											{showSearchResults[row.id] && searchResults[row.id] && searchResults[row.id].length > 0 && searchInputRefs.current[row.id] && (() => {
												const input = searchInputRefs.current[row.id];
												const rect = input?.getBoundingClientRect();
												return (
													<div 
														className="fixed z-[9999] bg-white border border-blue-300 rounded shadow-lg max-h-60 overflow-y-auto"
														style={{
															top: rect ? `${rect.bottom + window.scrollY}px` : '0',
															left: rect ? `${rect.left + window.scrollX}px` : '0',
															width: rect ? `${rect.width}px` : 'auto',
															minWidth: '200px'
														}}
													>
														{searchResults[row.id].map((member: any, memberIdx: number) => (
															<div
																key={memberIdx}
																onMouseDown={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	handleSelectMember(row.id, member);
																}}
																className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-blue-100 last:border-b-0"
															>
																<div className="font-medium">{member.P_NM}</div>
																<div className="text-xs text-gray-500">
																	{member.P_BRDT && `(${formatDate(member.P_BRDT)})`}
																	{/* {member.PNUM && ` | 수급자번호: ${member.PNUM}`} */}
																</div>
															</div>
														))}
													</div>
												);
											})()}
										</td>
										{/* 식사장소 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="text" 
												value={row.mealLocation}
												placeholder="식사장소 입력"
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, mealLocation: e.target.value } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={`w-full px-2 py-1 border border-blue-300 rounded ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										{/* 식사종류 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<select 
												value={row.mealType}
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, mealType: e.target.value } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={`w-full px-2 py-1 border border-blue-300 rounded ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
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
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, outgoing: e.target.checked } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
											/>
										</td>
										{/* 외박 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="checkbox" 
												checked={row.overnight}
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, overnight: e.target.checked } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
											/>
										</td>
										{/* 시작일시 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="datetime-local" 
												value={row.startDateTime}
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, startDateTime: e.target.value } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={`w-full px-2 py-1 border border-blue-300 rounded ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										{/* 종료일시 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input 
												type="datetime-local" 
												value={row.endDateTime}
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, endDateTime: e.target.value } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={`w-full px-2 py-1 border border-blue-300 rounded ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.mealStatus.breakfast}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, mealStatus: { ...r.mealStatus, breakfast: e.target.checked } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
													/>
													<span className="text-xs">조</span>
												</label>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.mealStatus.lunch}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, mealStatus: { ...r.mealStatus, lunch: e.target.checked } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
													/>
													<span className="text-xs">중</span>
												</label>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.mealStatus.dinner}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, mealStatus: { ...r.mealStatus, dinner: e.target.checked } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
													/>
													<span className="text-xs">석</span>
												</label>
											</div>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.snackStatus.morning}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, snackStatus: { ...r.snackStatus, morning: e.target.checked } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
													/>
													<span className="text-xs">오전</span>
												</label>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.snackStatus.afternoon}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, snackStatus: { ...r.snackStatus, afternoon: e.target.checked } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"}
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
												onChange={(e) => {
													const newData = combinedData.map(r => 
														r.id === row.id ? { ...r, specialNotes: e.target.value } : r
													);
													setCombinedData(newData);
												}}
												disabled={editingRowId !== row.id}
												onClick={(e) => e.stopPropagation()}
												className={`w-full px-2 py-1 border border-blue-300 rounded ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="text-center px-3 py-3">
											<div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
												<button
													onClick={() => handleEditClick(row.id)}
													className={`px-3 py-1 text-xs border rounded font-medium ${
														editingRowId === row.id
															? 'border-green-400 bg-green-200 hover:bg-green-300 text-green-900'
															: 'border-blue-400 bg-blue-200 hover:bg-blue-300 text-blue-900'
													}`}
												>
													{editingRowId === row.id ? '저장' : '수정'}
												</button>
												<button
													onClick={() => handleDeleteRow(row.id)}
													className="px-3 py-1 text-xs border border-red-400 rounded bg-red-200 hover:bg-red-300 text-red-900 font-medium"
												>
													삭제
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* 하단 추가 버튼 */}
				<div className="flex justify-center mt-4">
					<button
						onClick={handleAddRow}
						className="px-6 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
					>
						추가
					</button>
				</div>
			</div>
		</div>
	);
}
