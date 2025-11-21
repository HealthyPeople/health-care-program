"use client";
import React, { useState } from 'react';

export default function OutpatientRecord() {
	const [selectedYear, setSelectedYear] = useState(2025);
	const [selectedMonth, setSelectedMonth] = useState(9);
	const [outpatientData, setOutpatientData] = useState([
		{
			id: 1,
			serialNo: 1,
			category: '원무',
			startDate: '23.9.2',
			startTime: '09:00',
			endDate: '25.9.2',
			endTime: '15:00',
			destination: '',
			purpose: '',
			guardian: '',
			relationship: '',
			contact: ''
		},
		{
			id: 2,
			serialNo: 2,
			category: '<왕복',
			startDate: '27.9.1',
			startTime: '09:00',
			endDate: '25.9.3',
			endTime: '16:00>',
			destination: '',
			purpose: '',
			guardian: '',
			relationship: '',
			contact: ''
		}
	]);
	const [nextId, setNextId] = useState(3);
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [guardianList, setGuardianList] = useState<string[]>([
		'김보호자',
		'이보호자',
		'박보호자',
		'최보호자'
	]);

	// 월 변경 함수
	const handleMonthChange = (direction: number) => {
		let newMonth = selectedMonth + direction;
		let newYear = selectedYear;
		
		if (newMonth < 1) {
			newMonth = 12;
			newYear -= 1;
		} else if (newMonth > 12) {
			newMonth = 1;
			newYear += 1;
		}
		
		setSelectedMonth(newMonth);
		setSelectedYear(newYear);
	};

	// 데이터 업데이트
	const handleDataChange = (id: number, field: string, value: string) => {
		setOutpatientData(prev => prev.map(item => 
			item.id === id ? { ...item, [field]: value } : item
		));
	};

	// 행 추가 함수
	const handleAddRow = () => {
		const newSerialNo = outpatientData.length > 0 
			? Math.max(...outpatientData.map(row => row.serialNo)) + 1 
			: 1;
		
		const newRow = {
			id: nextId,
			serialNo: newSerialNo,
			category: '', // 수금이나 급여심정용률에서 자동 생성
			startDate: '',
			startTime: '',
			endDate: '',
			endTime: '',
			destination: '', // 현재 메뉴에서 작성
			purpose: '',
			guardian: '', // 보호자 정보간 참고 + 직접입력 필요
			relationship: '',
			contact: ''
		};
		
		setOutpatientData(prev => [...prev, newRow]);
		setNextId(prev => prev + 1);
		setEditingRowId(newRow.id);
	};

	// 행 삭제 함수
	const handleDeleteRow = (id: number) => {
		if (confirm('정말 삭제하시겠습니까?')) {
			setOutpatientData(prev => prev.filter(item => item.id !== id));
			if (editingRowId === id) {
				setEditingRowId(null);
			}
		}
	};

	// 수정 모드 토글
	const handleEditClick = (id: number) => {
		if (editingRowId === id) {
			setEditingRowId(null);
		} else {
			setEditingRowId(id);
		}
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1600px] p-4">
				{/* 상단: 헤더 및 네비게이션 */}
				<div className="mb-4 flex items-center border-b border-blue-200 pb-3 relative">
					{/* 왼쪽: 외래진료 기록 이동 버튼 */}
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-600">이동 버튼</span>
						<button className="px-4 py-1.5 text-sm border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium">
							외래진료 기록
						</button>
					</div>

					{/* 가운데: 월/년 선택 */}
					<div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
						<button 
							onClick={() => handleMonthChange(-1)}
							className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							◁
						</button>
						<span className="text-sm font-semibold text-blue-900">
							{selectedYear}년 {String(selectedMonth).padStart(2, '0')}월
						</span>
						<button 
							onClick={() => handleMonthChange(1)}
							className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							▷
						</button>
					</div>

					{/* 오른쪽: 대장 출력 버튼 */}
					<div className="ml-auto flex items-center gap-2">
						<span className="text-xs text-gray-600">해당 월</span>
						<button className="px-4 py-1.5 text-sm border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium">
							대장 출력
						</button>
					</div>
				</div>

				{/* 메인 테이블 */}
				<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
					<div className="bg-blue-100 border-b border-blue-300 px-4 py-2">
						<h2 className="text-lg font-semibold text-blue-900">외래진료 기록</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
								<tr>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">연번</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">구분</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">시작일</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">시작시간</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">종료일</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">종료시간</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">행선지</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">목적</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">보호자</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">관계</th>
									<th className="text-center px-3 py-2 text-blue-900 font-semibold">연락처</th>
								</tr>
							</thead>
							<tbody>
								{outpatientData.map((row) => (
									<tr 
										key={row.id} 
										className="border-b border-blue-50 hover:bg-blue-50"
									>
										<td className="text-center px-3 py-3 border-r border-blue-100">{row.serialNo}</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="text"
												value={row.category}
												onChange={(e) => handleDataChange(row.id, 'category', e.target.value)}
												disabled={true}
												className="w-full px-2 py-1 border border-blue-300 rounded text-center bg-gray-100 cursor-not-allowed"
												placeholder="자동생성"
												title="수금이나 급여심정용률에서 추출(자동생성)"
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="text"
												value={row.startDate}
												onChange={(e) => handleDataChange(row.id, 'startDate', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
												placeholder="예: 23.9.2"
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="time"
												value={row.startTime}
												onChange={(e) => handleDataChange(row.id, 'startTime', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="text"
												value={row.endDate}
												onChange={(e) => handleDataChange(row.id, 'endDate', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
												placeholder="예: 25.9.2"
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="time"
												value={row.endTime}
												onChange={(e) => handleDataChange(row.id, 'endTime', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="text"
												value={row.destination}
												onChange={(e) => handleDataChange(row.id, 'destination', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
												placeholder="행선지 입력"
												title="현재 메뉴에서 작성"
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="text"
												value={row.purpose}
												onChange={(e) => handleDataChange(row.id, 'purpose', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
												placeholder="목적 입력"
											/>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<div className="relative">
												<input
													type="text"
													list={`guardian-${row.id}`}
													value={row.guardian}
													onChange={(e) => handleDataChange(row.id, 'guardian', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center pr-6 ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
													placeholder="보호자 선택/입력"
													title="보호자 정보간 참고 + 직접입력 필요"
												/>
												<datalist id={`guardian-${row.id}`}>
													{guardianList.map((guardian) => (
														<option key={guardian} value={guardian} />
													))}
												</datalist>
												<span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 pointer-events-none text-xs">▼</span>
											</div>
										</td>
										<td className="text-center px-3 py-3 border-r border-blue-100">
											<input
												type="text"
												value={row.relationship}
												onChange={(e) => handleDataChange(row.id, 'relationship', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
												placeholder="관계 입력"
											/>
										</td>
										<td className="text-center px-3 py-3">
											<input
												type="text"
												value={row.contact}
												onChange={(e) => handleDataChange(row.id, 'contact', e.target.value)}
												disabled={editingRowId !== row.id}
												className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
													editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
												}`}
												placeholder="연락처 입력"
											/>
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

