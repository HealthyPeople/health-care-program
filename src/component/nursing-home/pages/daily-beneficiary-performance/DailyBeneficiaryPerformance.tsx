"use client";
import React, { useState, useRef, useEffect } from 'react';

interface PerformanceData {
	id: number;
	serialNo: number;
	name: string;
	birthDate: string;
	ancd?: string;
	pnum?: string;
	mealLocation: string; // ST_PLAC
	mealType: string; // ST_KIND
	gyn: string; // GYN: '0'=외출, '1'=입원(외박)
	mealStatus: { breakfast: string; lunch: string; dinner: string }; // MOST, LCST, DNST: '1'=양호, '2'=이상
	specialNotes: string; // ST_ETC
	snackStatus: { morning: string; afternoon: string }; // MGST, AGST: '1'=양호, '2'=이상
}

export default function DailyBeneficiaryPerformance() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [selectedMember, setSelectedMember] = useState<number | null>(null);
	const [nextId, setNextId] = useState(1);
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [searchResults, setSearchResults] = useState<{ [key: number | string]: any[] }>({});
	const [showSearchResults, setShowSearchResults] = useState<{ [key: number | string]: boolean }>({});
	const searchInputRefs = useRef<{ [key: number | string]: HTMLInputElement | null }>({});
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const printWindowRef = useRef<Window | null>(null);

	// 날짜 변경 함수
	const handleDateChange = (days: number) => {
		const date = new Date(selectedDate);
		date.setDate(date.getDate() + days);
		setSelectedDate(date.toISOString().split('T')[0]);
	};

	// 통합 데이터: 수급자 정보 + 실적 정보
	const [combinedData, setCombinedData] = useState<PerformanceData[]>([]);

	// F14020 데이터 조회 함수
	const fetchPerformanceData = async (svdt: string) => {
		setLoading(true);
		try {
			// 날짜 형식 확인 및 정규화 (yyyy-mm-dd 형식 보장)
			let normalizedDate = svdt;
			if (svdt && !svdt.includes('-') && svdt.length === 8) {
				// YYYYMMDD 형식인 경우 yyyy-mm-dd로 변환
				normalizedDate = `${svdt.substring(0, 4)}-${svdt.substring(4, 6)}-${svdt.substring(6, 8)}`;
			}
			
			// yyyy-mm-dd 형식 검증
			if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
				console.error('날짜 형식 오류:', normalizedDate);
				setLoading(false);
				return;
			}
			
			const url = `/api/f14020?svdt=${encodeURIComponent(normalizedDate)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				// F14020 데이터를 combinedData 형식으로 변환
				const transformedData: PerformanceData[] = result.data.map((item: any, index: number) => {
					return {
						id: index + 1,
						serialNo: item.MENUM || index + 1,
						name: item.P_NM || '',
						birthDate: formatDate(item.P_BRDT),
						ancd: item.ANCD || '',
						pnum: item.PNUM || '',
						mealLocation: item.ST_PLAC || '',
						mealType: item.ST_KIND || '1',
						gyn: item.GYN || '0', // '0'=외출, '1'=입원(외박)
						mealStatus: {
							breakfast: item.MOST || '1', // '1'=양호, '2'=이상
							lunch: item.LCST || '1',
							dinner: item.DNST || '1'
						},
						specialNotes: item.ST_ETC || '',
						snackStatus: {
							morning: item.MGST || '1', // '1'=양호, '2'=이상
							afternoon: item.AGST || '1'
						}
					};
				});
				
				setCombinedData(transformedData);
				setNextId(transformedData.length > 0 ? Math.max(...transformedData.map(d => d.id)) + 1 : 1);
			} else {
				setCombinedData([]);
				setNextId(1);
			}
		} catch (err) {
			console.error('실적 데이터 조회 오류:', err);
			setCombinedData([]);
			setNextId(1);
		} finally {
			setLoading(false);
		}
	};

	// 초기 로드 및 날짜 변경 시 데이터 조회
	useEffect(() => {
		setCurrentPage(1); // 날짜 변경 시 페이지를 1로 초기화
		fetchPerformanceData(selectedDate);
	}, [selectedDate]);

	// 새로고침 시 경고 얼럿
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			// 수정 중인 행이 있는 경우 경고
			if (editingRowId !== null) {
				e.preventDefault();
				e.returnValue = '작성한 내용은 저장되지 않습니다.';
				return '작성한 내용은 저장되지 않습니다.';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, [editingRowId]);

	// 행 삭제 함수
	const handleDeleteRow = (id: number) => {
		// 수정 중인 행이 있고 저장하지 않은 경우 경고
		if (editingRowId === id) {
			if (confirm('작성한 내용은 저장되지 않습니다. 정말 삭제하시겠습니까?')) {
				setCombinedData(combinedData.filter(row => row.id !== id));
				setEditingRowId(null);
			}
		} else {
			if (confirm('정말 삭제하시겠습니까?')) {
				setCombinedData(combinedData.filter(row => row.id !== id));
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

	// 페이지네이션 계산
	const totalPages = Math.ceil(combinedData.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentData = combinedData.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 행 추가 함수
	const handleAddRow = () => {
		const newRow: PerformanceData = {
			id: nextId,
			serialNo: 1, // 새 행은 항상 1번
			name: '',
			birthDate: '',
			mealLocation: '',
			mealType: '1',
			gyn: '0', // 기본값: 외출
			mealStatus: { breakfast: '1', lunch: '1', dinner: '1' }, // 기본값: 양호
			specialNotes: '',
			snackStatus: { morning: '1', afternoon: '1' } // 기본값: 양호
		};
		
		// 기존 데이터들의 연번을 하나씩 증가
		const updatedData = combinedData.map(row => ({
			...row,
			serialNo: row.serialNo + 1
		}));
		
		setCombinedData([newRow, ...updatedData]); // 맨 위에 추가
		setNextId(prev => prev + 1);
		setEditingRowId(newRow.id); // 새로 추가된 행을 수정 모드로 설정
		setCurrentPage(1); // 첫 페이지로 이동
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

	// 일자별 출력 함수
	const handlePrintDaily = () => {
		// 날짜 포맷팅 (요일 포함)
		const date = new Date(selectedDate);
		const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
		const dayName = days[date.getDay()];
		const formattedDate = `${selectedDate} ${dayName}`;

		// 출력용 HTML 생성
		const printContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>서비스 실적표</title>
				<style>
					@page {
						size: A4;
						margin: 10mm;
					}
					body {
						font-family: 'Malgun Gothic', sans-serif;
						font-size: 11pt;
						margin: 0;
						padding: 0;
					}
					.header {
						display: flex;
						justify-content: space-between;
						align-items: flex-start;
						margin-bottom: 15px;
					}
					.title {
						font-size: 18pt;
						font-weight: bold;
						text-align: center;
						flex: 1;
					}
					.date-info {
						font-size: 11pt;
					}
					.signature-table {
						border: 1px solid #000;
						border-collapse: collapse;
						width: 150px;
						font-size: 10pt;
					}
					.signature-table th,
					.signature-table td {
						border: 1px solid #000;
						padding: 5px;
						text-align: center;
						height: 30px;
					}
					.main-table {
						width: 100%;
						border-collapse: collapse;
						border: 1px solid #000;
						font-size: 10pt;
						margin-top: 10px;
					}
					.main-table th,
					.main-table td {
						border: 1px solid #000;
						padding: 4px;
						text-align: center;
					}
					.main-table th {
						background-color: #f0f0f0;
						font-weight: bold;
					}
					.check-mark {
						text-align: center;
						font-size: 14pt;
					}
					.footer {
						display: flex;
						justify-content: space-between;
						margin-top: 20px;
						font-size: 10pt;
					}
					@media print {
						body {
							margin: 0;
							padding: 0;
						}
					}
				</style>
			</head>
			<body>
				<div class="header">
					<div class="date-info">일자: ${formattedDate}</div>
					<div class="title">서비스 실적표</div>
					<table class="signature-table">
						<tr>
							<th>담당</th>
							<th>검토</th>
							<th>결재</th>
						</tr>
						<tr>
							<td></td>
							<td></td>
							<td></td>
						</tr>
					</table>
				</div>
				<table class="main-table">
					<thead>
						<tr>
							<th>수급자명</th>
							<th>생일</th>
							<th>외박여</th>
							<th>아</th>
							<th>정</th>
							<th>저</th>
							<th>오전간</th>
							<th>오후간</th>
							<th>식이</th>
						</tr>
					</thead>
					<tbody>
						${combinedData.map(row => {
							const gynText = row.gyn === '1' ? '입원' : row.gyn === '0' ? '외출' : '';
							const breakfast = row.mealStatus.breakfast === '1' ? '○' : '';
							const lunch = row.mealStatus.lunch === '1' ? '○' : '';
							const dinner = row.mealStatus.dinner === '1' ? '○' : '';
							const morningSnack = row.snackStatus.morning === '1' ? '○' : '';
							const afternoonSnack = row.snackStatus.afternoon === '1' ? '○' : '';
							const mealTypeText = row.mealType === '1' ? '일반식' : row.mealType === '2' ? '죽' : row.mealType === '3' ? '유동식(미음)' : '';
							
							return `
								<tr>
									<td>${row.name || ''}</td>
									<td>${row.birthDate || ''}</td>
									<td>${gynText}</td>
									<td class="check-mark">${breakfast}</td>
									<td class="check-mark">${lunch}</td>
									<td class="check-mark">${dinner}</td>
									<td class="check-mark">${morningSnack}</td>
									<td class="check-mark">${afternoonSnack}</td>
									<td>${mealTypeText}</td>
								</tr>
							`;
						}).join('')}
					</tbody>
				</table>
				<div class="footer">
					<div>R14020</div>
					<div>페이지: 1</div>
				</div>
			</body>
			</html>
		`;

		// 새 창 열기
		const printWindow = window.open('', '_blank');
		if (printWindow) {
			printWindow.document.write(printContent);
			printWindow.document.close();
			
			// 출력 대화상자 열기
			setTimeout(() => {
				printWindow.print();
			}, 250);
		}
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
						<button 
							onClick={handlePrintDaily}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
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
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-32">수급자명(생년월일)</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-32">식사장소</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-28">식사종류</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">입원/외출</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">식사상태</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">간식상태</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-80">특이사항</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold">작업</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={9} className="text-center px-3 py-4 text-blue-900/60">
											로딩 중...
										</td>
									</tr>
								) : currentData.length === 0 ? (
									<tr>
										<td colSpan={9} className="text-center px-3 py-4 text-blue-900/60">
											데이터가 없습니다
										</td>
									</tr>
								) : (
									currentData.map((row, idx) => (
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
										<td className="text-center px-3 py-3 border-r border-blue-100 relative w-32">
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
										<td className="text-center px-3 py-3 border-r border-blue-100 w-32">
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
										<td className="text-center px-3 py-3 border-r border-blue-100 w-28">
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
												<option value="1">일반식</option>
												<option value="2">죽</option>
												<option value="3">유동식(미음)</option>
											</select>
										</td>
										{/* 입원/외출 (GYN) */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
												<label className={`flex items-center justify-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.gyn === '0'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, gyn: e.target.checked ? '0' : '' } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.gyn === '0' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">외출</span>
												</label>
												<label className={`flex items-center justify-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.gyn === '1'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, gyn: e.target.checked ? '1' : '' } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.gyn === '1' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">입원</span>
												</label>
											</div>
										</td>
										{/* 식사상태 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.mealStatus.breakfast === '1'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, mealStatus: { ...r.mealStatus, breakfast: e.target.checked ? '1' : '2' } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.mealStatus.breakfast === '1' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">조</span>
												</label>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.mealStatus.lunch === '1'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, mealStatus: { ...r.mealStatus, lunch: e.target.checked ? '1' : '2' } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.mealStatus.lunch === '1' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">중</span>
												</label>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.mealStatus.dinner === '1'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, mealStatus: { ...r.mealStatus, dinner: e.target.checked ? '1' : '2' } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.mealStatus.dinner === '1' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">석</span>
												</label>
											</div>
										</td>
										{/* 간식상태 */}
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.snackStatus.morning === '1'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, snackStatus: { ...r.snackStatus, morning: e.target.checked ? '1' : '2' } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.snackStatus.morning === '1' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">오전</span>
												</label>
												<label className={`flex items-center gap-1 ${editingRowId === row.id ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
													<input 
														type="checkbox" 
														checked={row.snackStatus.afternoon === '1'}
														onChange={(e) => {
															const newData = combinedData.map(r => 
																r.id === row.id ? { ...r, snackStatus: { ...r.snackStatus, afternoon: e.target.checked ? '1' : '2' } } : r
															);
															setCombinedData(newData);
														}}
														disabled={editingRowId !== row.id}
														className={`${editingRowId === row.id ? "cursor-pointer" : "cursor-not-allowed"} ${editingRowId !== row.id && row.snackStatus.afternoon === '1' ? "disabled-checked-blue" : ""}`}
													/>
													<span className="text-xs">오후</span>
												</label>
											</div>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100 w-80">
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
									))
								)}
							</tbody>
						</table>
					</div>
					{/* 페이지네이션 */}
					{totalPages > 1 && (
						<div className="p-3 border-t border-blue-200 bg-white">
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
