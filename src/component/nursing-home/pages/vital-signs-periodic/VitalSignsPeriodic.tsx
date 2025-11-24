"use client";
import React, { useState, useEffect } from 'react';

interface VitalSignsPeriodicData {
	id: number;
	checked: boolean;
	number: number;
	status: string;
	beneficiaryName: string;
	weight: string;
	livingRoom: string;
	edema: boolean;
	edemaArea: string;
	edemaDegree: string;
	bedsore: boolean;
	bedsoreArea: string;
	medication: boolean;
	incontinence: boolean;
	dressing: boolean;
	painVAS: string;
	nursingHistory: string;
	author: string;
	fall: boolean;
	dehydration: boolean;
	delirium: boolean;
	problemBehavior: boolean;
	ancd?: string;
	pnum?: string;
}

export default function VitalSignsPeriodic() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedLivingRoom, setSelectedLivingRoom] = useState<string>('');
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [vitalSignsData, setVitalSignsData] = useState<VitalSignsPeriodicData[]>([]);
	const [nextId, setNextId] = useState(1);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// F30120 데이터 조회 함수
	const fetchVitalSignsData = async (rsdt: string) => {
		setLoading(true);
		try {
			const url = `/api/f30120?rsdt=${encodeURIComponent(rsdt)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				// F30120 데이터를 vitalSignsData 형식으로 변환
				const transformedData: VitalSignsPeriodicData[] = result.data.map((item: any, index: number) => {
					// 현황 (P_ST: '1'=입소, '9'=퇴소)
					const status = item.P_ST === '1' ? '입소' : item.P_ST === '9' ? '퇴소' : '';
					
					// 부종유무 (BJYN: '1' 또는 'Y' = true, 그 외 = false)
					const edema = item.BJYN === '1' || item.BJYN === 'Y' || item.BJYN === 'y';
					
					return {
						id: index + 1,
						checked: false,
						number: index + 1,
						status: status,
						beneficiaryName: item.P_NM || '',
						weight: item.WEIGHT || '',
						livingRoom: '', // F30120에 생활실 정보가 없음
						edema: edema,
						edemaArea: item.BJPA || '',
						edemaDegree: item.BJDG || '',
						bedsore: false, // F30120에 욕창 정보가 없음
						bedsoreArea: '',
						medication: false, // F30120에 약물투여 정보가 없음
						incontinence: false, // F30120에 실금 정보가 없음
						dressing: false, // F30120에 드레싱 정보가 없음
						painVAS: '', // F30120에 통증 VAS 정보가 없음
						nursingHistory: item.NUDES || '',
						author: item.INEMPNM || '',
						fall: false, // F30120에 낙상 정보가 없음
						dehydration: false, // F30120에 탈수 정보가 없음
						delirium: false, // F30120에 섬망 정보가 없음
						problemBehavior: false, // F30120에 문제행동 정보가 없음
						ancd: item.ANCD || '',
						pnum: item.PNUM || ''
					};
				});
				
				setVitalSignsData(transformedData);
				setNextId(transformedData.length > 0 ? Math.max(...transformedData.map(d => d.id)) + 1 : 1);
			} else {
				setVitalSignsData([]);
				setNextId(1);
			}
		} catch (err) {
			console.error('활력증상 데이터 조회 오류:', err);
			setVitalSignsData([]);
			setNextId(1);
		} finally {
			setLoading(false);
		}
	};

	// 초기 로드 및 날짜 변경 시 데이터 조회
	useEffect(() => {
		setCurrentPage(1); // 날짜 변경 시 페이지를 1로 초기화
		fetchVitalSignsData(selectedDate);
	}, [selectedDate]);

	// 날짜 변경 함수
	const handleDateChange = (days: number) => {
		const date = new Date(selectedDate);
		date.setDate(date.getDate() + days);
		setSelectedDate(date.toISOString().split('T')[0]);
	};

	// 체크박스 토글
	const handleCheckboxChange = (id: number) => {
		setVitalSignsData(prev => prev.map(item => 
			item.id === id ? { ...item, checked: !item.checked } : item
		));
	};

	// 데이터 업데이트
	const handleDataChange = (id: number, field: string, value: string | boolean) => {
		setVitalSignsData(prev => prev.map(item => 
			item.id === id ? { ...item, [field]: value } : item
		));
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

	// 삭제 함수
	const handleDeleteClick = (id: number) => {
		if (confirm('정말 삭제하시겠습니까?')) {
			setVitalSignsData(prev => prev.filter(item => item.id !== id));
			if (editingRowId === id) {
				setEditingRowId(null);
			}
		}
	};

	// 필터링된 데이터
	const filteredData = vitalSignsData.filter(row => {
		// 현황 필터링
		if (selectedStatus && row.status !== selectedStatus) {
			return false;
		}
		
		// 생활실 필터링
		if (selectedLivingRoom && row.livingRoom !== selectedLivingRoom) {
			return false;
		}
		
		return true;
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredData.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedData = filteredData.slice(startIndex, endIndex);

	// 페이지 변경 함수
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 필터 변경 시 첫 페이지로 이동
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedLivingRoom]);

	// 행 추가 함수
	const handleAddRow = () => {
		const newNumber = vitalSignsData.length > 0 
			? Math.max(...vitalSignsData.map(row => row.number)) + 1 
			: 1;
		
		const newRow: VitalSignsPeriodicData = {
			id: nextId,
			checked: false,
			number: newNumber,
			status: '',
			beneficiaryName: '',
			weight: '',
			livingRoom: '',
			edema: false,
			edemaArea: '',
			edemaDegree: '',
			bedsore: false,
			bedsoreArea: '',
			medication: false,
			incontinence: false,
			dressing: false,
			painVAS: '',
			nursingHistory: '',
			author: '',
			fall: false,
			dehydration: false,
			delirium: false,
			problemBehavior: false
		};
		
		setVitalSignsData(prev => [...prev, newRow]);
		setNextId(prev => prev + 1);
		setEditingRowId(newRow.id); // 새로 추가된 행을 수정 모드로 설정
	};

	// 날짜 포맷팅 (yyyy-mm-dd -> yyyy. mm. dd)
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}. ${month}. ${day}`;
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1600px] p-4">
				{/* 상단: 날짜 네비게이션 및 출력 */}
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
					{/* 오른쪽: 출력 버튼 */}
					<div className="ml-auto flex flex-col items-end gap-1">
						<button className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium">
							출력
						</button>
					</div>
				</div>

				{/* 메인 콘텐츠 영역 */}
				<div className="flex flex-col gap-4">
					{/* 상단 필터 패널 - 가로 배치 */}
					<div className="flex gap-4 items-end">
						<div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
							<label className="block text-sm font-semibold text-blue-900 mb-2">현황</label>
							<select
								value={selectedStatus}
								onChange={(e) => setSelectedStatus(e.target.value)}
								className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded bg-white min-w-[120px]"
							>
								<option value="">전체</option>
								<option value="입소">입소</option>
								<option value="퇴소">퇴소</option>
							</select>
						</div>
						<div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
							<label className="block text-sm font-semibold text-blue-900 mb-2">생활실</label>
							<select
								value={selectedLivingRoom}
								onChange={(e) => setSelectedLivingRoom(e.target.value)}
								className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded bg-white min-w-[120px]"
							>
								<option value="">전체</option>
								<option value="1층">1층</option>
								<option value="2층">2층</option>
								<option value="3층">3층</option>
							</select>
						</div>
					</div>

					{/* 우측 메인 테이블 */}
					<div className="flex-1 border border-blue-300 rounded-lg bg-white shadow-sm">
						<div className="bg-blue-100 border-b border-blue-300 px-4 py-2">
							<h2 className="text-lg font-semibold text-blue-900">활력증상 등록(주기)</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-12">
											<input type="checkbox" className="cursor-pointer" />
										</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">번호</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">현황</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">생활실</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">체중</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">부종</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">부종 부위</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">부종 정도</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">욕창</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">욕창 부위</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">약물투여</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">소변/대변실금</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">드레싱 실시</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">통증 (VAS)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">낙상</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">탈수</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 whitespace-nowrap">섬망</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold">문제행동</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={19} className="text-center px-3 py-4 text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : vitalSignsData.length === 0 ? (
										<tr>
											<td colSpan={19} className="text-center px-3 py-4 text-blue-900/60">
												데이터가 없습니다
											</td>
										</tr>
									) : (
										paginatedData.map((row) => (
										<React.Fragment key={row.id}>
											<tr className="border-b border-blue-50 hover:bg-blue-50">
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.checked}
														onChange={() => handleCheckboxChange(row.id)}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">{row.number}</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="text"
														value={row.status}
														onChange={(e) => handleDataChange(row.id, 'status', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="text"
														value={row.beneficiaryName}
														onChange={(e) => handleDataChange(row.id, 'beneficiaryName', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="text"
														value={row.livingRoom}
														onChange={(e) => handleDataChange(row.id, 'livingRoom', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="text"
														value={row.weight}
														onChange={(e) => handleDataChange(row.id, 'weight', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
														placeholder="체중 입력"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.edema}
														onChange={(e) => handleDataChange(row.id, 'edema', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="text"
														value={row.edemaArea}
														onChange={(e) => handleDataChange(row.id, 'edemaArea', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<select
														value={row.edemaDegree}
														onChange={(e) => handleDataChange(row.id, 'edemaDegree', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
													>
														<option value="">선택</option>
														<option value="+">+</option>
														<option value="++">++</option>
														<option value="+++">+++</option>
													</select>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.bedsore}
														onChange={(e) => handleDataChange(row.id, 'bedsore', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="text"
														value={row.bedsoreArea}
														onChange={(e) => handleDataChange(row.id, 'bedsoreArea', e.target.value)}
														disabled={editingRowId !== row.id}
														className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
															editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
														}`}
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.medication}
														onChange={(e) => handleDataChange(row.id, 'medication', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.incontinence}
														onChange={(e) => handleDataChange(row.id, 'incontinence', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.dressing}
														onChange={(e) => handleDataChange(row.id, 'dressing', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<div className="flex items-center justify-center gap-1">
														<input
															type="text"
															value={row.painVAS}
															onChange={(e) => handleDataChange(row.id, 'painVAS', e.target.value)}
															disabled={editingRowId !== row.id}
															className={`w-16 px-2 py-1 border border-blue-300 rounded text-center ${
																editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
															}`}
															placeholder="1~10"
														/>
													</div>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.fall}
														onChange={(e) => handleDataChange(row.id, 'fall', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.dehydration}
														onChange={(e) => handleDataChange(row.id, 'dehydration', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3 border-r border-blue-100">
													<input
														type="checkbox"
														checked={row.delirium}
														onChange={(e) => handleDataChange(row.id, 'delirium', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
												<td className="text-center px-3 py-3">
													<input
														type="checkbox"
														checked={row.problemBehavior}
														onChange={(e) => handleDataChange(row.id, 'problemBehavior', e.target.checked)}
														disabled={editingRowId !== row.id}
														className="cursor-pointer"
													/>
												</td>
											</tr>
											{/* 두 번째 줄: 작성자, 간호내역, 작업 */}
											<tr className="border-b border-blue-50 bg-blue-25">
												<td colSpan={2} className="px-3 py-2 border-r border-blue-100"></td>
												<td colSpan={17} className="px-3 py-2">
													<div className="flex items-center gap-4 w-full">
													<div className="flex items-center gap-2 flex-shrink-0">
														<label className="text-xs text-blue-900 font-medium whitespace-nowrap">작성자</label>
														<input
															type="text"
															value={row.author}
															onChange={(e) => handleDataChange(row.id, 'author', e.target.value)}
															disabled={editingRowId !== row.id}
															className={`px-2 py-1 text-xs border border-blue-300 rounded ${
																editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
															}`}
															placeholder="작성자 입력"
														/>
													</div>
														<div className="flex items-center gap-2 flex-1">
															<label className="text-xs text-blue-900 font-medium whitespace-nowrap flex-shrink-0">간호내역</label>
															<textarea
																value={row.nursingHistory}
																onChange={(e) => handleDataChange(row.id, 'nursingHistory', e.target.value)}
																disabled={editingRowId !== row.id}
																className={`w-full px-2 py-1 text-xs border border-blue-300 rounded ${
																	editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
																}`}
																rows={2}
															/>
														</div>
														<div className="flex items-center gap-2 flex-shrink-0">
															<div className="flex gap-2">
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
																	onClick={() => handleDeleteClick(row.id)}
																	className="px-3 py-1 text-xs border border-red-400 rounded bg-red-200 hover:bg-red-300 text-red-900 font-medium"
																>
																	삭제
																</button>
															</div>
														</div>
													</div>
												</td>
											</tr>
										</React.Fragment>
									)))}
								</tbody>
							</table>
						</div>
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
								<span className="ml-4 text-xs text-blue-900">
									{filteredData.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredData.length)} / ${filteredData.length}` : '0 / 0'}
								</span>
							</div>
						</div>
					)}

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
		</div>
	);
}

