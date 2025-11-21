"use client";
import React, { useState } from 'react';

export default function VitalSignsPeriodic() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedLivingRoom, setSelectedLivingRoom] = useState<string>('');
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [employeeList, setEmployeeList] = useState<string[]>([
		'김간호사',
		'이간호사',
		'박간호사',
		'최간호사'
	]);
	const [vitalSignsData, setVitalSignsData] = useState([
		{
			id: 1,
			checked: true,
			number: 1,
			status: '입소',
			beneficiaryName: '공현자',
			livingRoom: '1층',
			bloodPressure: '90/60',
			pulse: '70',
			bodyTemperature: '36.5',
			respiration: '22',
			oxygenSaturation: '99',
			nursingDetails: '최고조',
			author: '김간호사'
		},
		{
			id: 2,
			checked: true,
			number: 2,
			status: '입소',
			beneficiaryName: '김영분',
			livingRoom: '2층',
			bloodPressure: '90/60',
			pulse: '81',
			bodyTemperature: '37.1',
			respiration: '11',
			oxygenSaturation: '100',
			nursingDetails: '최고조',
			author: '김간호사'
		}
	]);

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
	const handleDataChange = (id: number, field: string, value: string) => {
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
							<span className="text-sm text-blue-900">{formatDate(selectedDate)}</span>
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
						<button className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900">
							📅 달력선택
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
								<option value="입소주">입소주</option>
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
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">혈압(mmHg)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">맥박(/분)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">체온(℃)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">호흡(회)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-24">산소포화도(%SpO2)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-80">간호내역</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-32">작성자</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold w-32">작업</th>
									</tr>
								</thead>
								<tbody>
									{vitalSignsData.map((row) => (
										<tr 
											key={row.id} 
											className="border-b border-blue-50 hover:bg-blue-50"
										>
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
													value={row.bloodPressure}
													onChange={(e) => handleDataChange(row.id, 'bloodPressure', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
													placeholder="예: 120/80"
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.pulse}
													onChange={(e) => handleDataChange(row.id, 'pulse', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.bodyTemperature}
													onChange={(e) => handleDataChange(row.id, 'bodyTemperature', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.respiration}
													onChange={(e) => handleDataChange(row.id, 'respiration', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.oxygenSaturation}
													onChange={(e) => handleDataChange(row.id, 'oxygenSaturation', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.nursingDetails}
													onChange={(e) => handleDataChange(row.id, 'nursingDetails', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
													placeholder="간호내역 입력"
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<select
													value={row.author}
													onChange={(e) => handleDataChange(row.id, 'author', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												>
													<option value="">선택</option>
													{employeeList.map((employee) => (
														<option key={employee} value={employee}>
															{employee}
														</option>
													))}
												</select>
											</td>
											<td className="text-center px-3 py-3">
												<div className="flex justify-center gap-2">
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
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

