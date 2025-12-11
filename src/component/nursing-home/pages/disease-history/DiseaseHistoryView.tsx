"use client";
import React, { useState, useRef } from 'react';

interface CombinedData {
	id: number;
	serialNo: number;
	name: string;
	gender: string;
	birthDate: string;
	bloodPressure: string;
	pulse: string;
	bodyTemperature: string;
	bloodSugar: string;
	weight: string;
	nursingHistory: string;
	editing: boolean;
}

// 날짜 포맷팅 함수 (yyyy-mm-dd)
const formatDate = (dateStr: string | null | undefined) => {
	if (!dateStr) return '';
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return dateStr;
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	} catch {
		return dateStr;
	}
};

export default function DiseaseHistoryView() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [searchResults, setSearchResults] = useState<{ [key: number]: any[] }>({});
	const [showSearchResults, setShowSearchResults] = useState<{ [key: number]: boolean }>({});
	const searchInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
	const [combinedData, setCombinedData] = useState<CombinedData[]>([
		{
			id: 1,
			serialNo: 1,
			name: '홍길동',
			gender: '남',
			birthDate: '1940-01-15',
			bloodPressure: '',
			pulse: '',
			bodyTemperature: '',
			bloodSugar: '',
			weight: '',
			nursingHistory: '',
			editing: false
		},
		{
			id: 2,
			serialNo: 2,
			name: '김영희',
			gender: '여',
			birthDate: '1935-05-22',
			bloodPressure: '',
			pulse: '',
			bodyTemperature: '',
			bloodSugar: '',
			weight: '',
			nursingHistory: '',
			editing: false
		}
	]);

	// 날짜 변경 함수
	const handleDateChange = (days: number) => {
		const date = new Date(selectedDate);
		date.setDate(date.getDate() + days);
		setSelectedDate(date.toISOString().split('T')[0]);
	};

	// 날짜 포맷팅 (yyyy-mm-dd -> yyyy. mm. dd)
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}. ${month}. ${day}`;
	};

	// 수급자 검색 함수
	const handleSearchMember = async (id: number, searchValue: string) => {
		if (!searchValue || searchValue.trim().length === 0) {
			setSearchResults(prev => ({ ...prev, [id]: [] }));
			setShowSearchResults(prev => ({ ...prev, [id]: false }));
			return;
		}

		try {
			const response = await fetch(`/api/f10010/search?q=${encodeURIComponent(searchValue.trim())}`);
			const data = await response.json();
			
			if (data.success && data.data) {
				setSearchResults(prev => ({ ...prev, [id]: data.data }));
				setShowSearchResults(prev => ({ ...prev, [id]: true }));
			} else {
				setSearchResults(prev => ({ ...prev, [id]: [] }));
				setShowSearchResults(prev => ({ ...prev, [id]: false }));
			}
		} catch (error) {
			console.error('수급자 검색 오류:', error);
			setSearchResults(prev => ({ ...prev, [id]: [] }));
			setShowSearchResults(prev => ({ ...prev, [id]: false }));
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (id: number, member: any) => {
		const formattedBirthDate = formatDate(member.P_BRDT);
		// P_SEX가 '1'이면 '남', '2'이면 '여', 그 외는 빈 문자열
		const gender = member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '';
		setCombinedData(prev => prev.map(item => 
			item.id === id ? { 
				...item, 
				name: member.P_NM || '',
				birthDate: formattedBirthDate,
				gender: gender
			} : item
		));
		setSearchResults(prev => ({ ...prev, [id]: [] }));
		setShowSearchResults(prev => ({ ...prev, [id]: false }));
	};

	// 데이터 변경 함수
	const handleDataChange = (id: number, field: string, value: string) => {
		setCombinedData(prev => prev.map(item => 
			item.id === id ? { ...item, [field]: value } : item
		));
	};

	// 수정 버튼 클릭
	const handleEditClick = (id: number) => {
		setCombinedData(prev => prev.map(item => 
			item.id === id ? { ...item, editing: !item.editing } : item
		));
	};

	// 삭제 버튼 클릭
	const handleDeleteClick = (id: number) => {
		setCombinedData(prev => prev.filter(item => item.id !== id));
	};

	// 추가 버튼 클릭
	const handleAddClick = () => {
		const newId = Math.max(...combinedData.map(d => d.id), 0) + 1;
		const newSerialNo = Math.max(...combinedData.map(d => d.serialNo), 0) + 1;
		setCombinedData(prev => [...prev, {
			id: newId,
			serialNo: newSerialNo,
			name: '',
			gender: '',
			birthDate: '',
			bloodPressure: '',
			pulse: '',
			bodyTemperature: '',
			bloodSugar: '',
			weight: '',
			nursingHistory: '',
			editing: true
		}]);
	};

	// 전체 삭제 버튼 클릭
	const handleDeleteAllClick = () => {
		if (confirm('전체 데이터를 삭제하시겠습니까?')) {
			setCombinedData([]);
		}
	};

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1600px] p-4">
			<span>기존 메뉴명 찾을 수 없음</span>
				{/* 상단: 날짜 네비게이션 및 액션 버튼 */}
				<div className="relative flex items-center pb-3 mb-4 border-b border-blue-200">
					{/* 가운데: 날짜 네비게이션 */}
					<div className="absolute flex items-center gap-4 transform -translate-x-1/2 left-1/2">
						<button 
							onClick={() => handleDateChange(-1)}
							className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							<span>◀</span>
							<span>이전일</span>
						</button>
						<div className="flex items-center gap-2">
							{/* <span className="text-sm text-blue-900">{formatDate(selectedDate)}</span> */}
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white text-blue-900"
							/>
						</div>
						<button 
							onClick={() => handleDateChange(1)}
							className="flex items-center gap-1 px-3 py-1.5 text-sm border borㅎ햐gder-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							<span>다음일</span>
							<span>▶</span>
						</button>
					</div>
					{/* 오른쪽: 저장, 출력 버튼 */}
					<div className="flex items-center gap-2 ml-auto">
						<button className="px-4 py-1.5 text-sm border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium">
							저장
						</button>
						<button className="px-4 py-1.5 text-sm border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium">
							출력
						</button>
					</div>
				</div>

				{/* 메인 컨텐츠 영역 - 통합 테이블 */}
				<div className="overflow-hidden bg-white border border-blue-300 rounded-lg shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="w-16 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
									<th className="w-32 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
									<th className="w-16 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
									<th className="w-20 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">혈압</th>
									<th className="w-20 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">맥박</th>
									<th className="w-20 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">체온</th>
									<th className="w-20 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">혈당</th>
									<th className="w-20 px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">체중</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 min-w-[200px]">간호내용</th>
									<th className="w-24 px-2 py-2 font-semibold text-center text-blue-900">작업</th>
								</tr>
							</thead>
							<tbody>
								{combinedData.map((row) => (
									<tr key={row.id} className="border-b border-blue-50 hover:bg-blue-50">
										<td className="px-3 py-3 text-center border-r border-blue-100">
											{row.serialNo}
										</td>
										<td className="relative px-3 py-3 text-center border-r border-blue-100">
											{row.editing ? (
												<div className="flex flex-col">
													<input 
														ref={(el) => {
															if (el) {
																searchInputRefs.current[row.id] = el;
															}
														}}
														type="text" 
														value={row.name} 
														onChange={(e) => {
															handleDataChange(row.id, 'name', e.target.value);
															if (e.target.value.trim().length > 0) {
																handleSearchMember(row.id, e.target.value);
															} else {
																setSearchResults(prev => ({ ...prev, [row.id]: [] }));
																setShowSearchResults(prev => ({ ...prev, [row.id]: false }));
															}
														}}
														onFocus={() => {
															if (row.name && row.name.trim().length > 0) {
																handleSearchMember(row.id, row.name);
															}
														}}
														onBlur={() => {
															setTimeout(() => {
																setShowSearchResults(prev => ({ ...prev, [row.id]: false }));
															}, 200);
														}}
														placeholder="수급자명 검색"
														className="w-full px-2 py-1 text-center bg-white border border-blue-300 rounded" 
													/>
													{row.birthDate && (
														<span className="mt-1 text-xs text-gray-500">({row.birthDate})</span>
													)}
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
																		className="px-3 py-2 border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
																	>
																		<div className="font-medium">{member.P_NM}</div>
																		<div className="text-xs text-gray-500">
																			{member.P_BRDT && `(${formatDate(member.P_BRDT)})`}
																		</div>
																	</div>
																))}
															</div>
														);
													})()}
												</div>
											) : (
												<div className="flex flex-col">
													<span>{row.name}</span>
													{row.birthDate && (
														<span className="text-xs text-gray-500">({row.birthDate})</span>
													)}
												</div>
											)}
										</td>
										<td className="px-3 py-3 text-center border-r border-blue-100">
										<span>{row.gender}</span>
										</td>
										<td className="px-2 py-3 text-center border-r border-blue-100">
											<input 
												type="text" 
												value={row.bloodPressure} 
												onChange={(e) => handleDataChange(row.id, 'bloodPressure', e.target.value)}
												placeholder="120/80"
												disabled={!row.editing}
												className={`w-full px-1 py-1 border border-blue-300 rounded text-center text-xs ${
													row.editing ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="px-2 py-3 text-center border-r border-blue-100">
											<input 
												type="text" 
												value={row.pulse} 
												onChange={(e) => handleDataChange(row.id, 'pulse', e.target.value)}
												placeholder="72"
												disabled={!row.editing}
												className={`w-full px-1 py-1 border border-blue-300 rounded text-center text-xs ${
													row.editing ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="px-2 py-3 text-center border-r border-blue-100">
											<input 
												type="text" 
												value={row.bodyTemperature} 
												onChange={(e) => handleDataChange(row.id, 'bodyTemperature', e.target.value)}
												placeholder="36.5"
												disabled={!row.editing}
												className={`w-full px-1 py-1 border border-blue-300 rounded text-center text-xs ${
													row.editing ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="px-2 py-3 text-center border-r border-blue-100">
											<input 
												type="text" 
												value={row.bloodSugar} 
												onChange={(e) => handleDataChange(row.id, 'bloodSugar', e.target.value)}
												placeholder="95"
												disabled={!row.editing}
												className={`w-full px-1 py-1 border border-blue-300 rounded text-center text-xs ${
													row.editing ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="px-2 py-3 text-center border-r border-blue-100">
											<input 
												type="text" 
												value={row.weight} 
												onChange={(e) => handleDataChange(row.id, 'weight', e.target.value)}
												placeholder="65.2"
												disabled={!row.editing}
												className={`w-full px-1 py-1 border border-blue-300 rounded text-center text-xs ${
													row.editing ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="px-3 py-3 text-center border-r border-blue-100">
											<textarea
												value={row.nursingHistory}
												onChange={(e) => handleDataChange(row.id, 'nursingHistory', e.target.value)}
												disabled={!row.editing}
												placeholder="간호내용을 입력하세요"
												rows={2}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-sm resize-none ${
													row.editing ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="px-3 py-3 text-center">
											<div className="flex items-center justify-center gap-2">
												<button
													onClick={() => handleEditClick(row.id)}
													className="px-2 py-1 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
												>
													{row.editing ? '저장' : '수정'}
												</button>
												<button
													onClick={() => handleDeleteClick(row.id)}
													className="px-2 py-1 text-xs font-medium text-red-900 bg-red-200 border border-red-400 rounded hover:bg-red-300"
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

				{/* 하단 액션 버튼 */}
				<div className="flex justify-center gap-4 mt-4">
					<button
						onClick={handleAddClick}
						className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						추가
					</button>
					<button
						onClick={handleDeleteAllClick}
						className="px-6 py-2 text-sm font-medium text-orange-900 bg-orange-200 border border-orange-400 rounded hover:bg-orange-300"
					>
						전체 삭제
					</button>
				</div>
			</div>
		</div>
	);
}
