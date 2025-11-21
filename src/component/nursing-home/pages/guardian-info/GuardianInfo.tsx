"use client";
import React, { useState } from 'react';

export default function GuardianInfo() {
	const [selectedGuardianIndex, setSelectedGuardianIndex] = useState<number | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [formData, setFormData] = useState({
		recipientName: '',
		guardianName: '',
		relationship: '',
		isMainGuardian: false,
		relationshipDetails: '',
		phoneNumber: '',
		address: '',
		hospitalUsed: '',
		attendingPhysician: '',
		hospitalAddress: ''
	});

	// 보호자 목록 데이터
	const guardianList = [
		{ id: 1, serialNo: 1, name: '홍길동', contractDate: '27.07.25', endDate: '28.05.11', content: '동안 4911' },
		{ id: 2, serialNo: 2, name: '김영희', contractDate: '28.05.11', endDate: '28.05.11', content: '' },
	];

	// 수급자 목록 데이터 (CounselingRecord와 동일한 형식)
	const memberList = [
		{ id: 1, serialNo: 1, status: '입소', name: '홍길동', gender: '남', grade: '1', age: '50' },
		{ id: 2, serialNo: 2, status: '퇴소', name: '김영희', gender: '여', grade: '2', age: '70' },
	];

	const handleSelectGuardian = (index: number) => {
		setSelectedGuardianIndex(index);
		// 선택된 보호자 정보를 폼에 로드
	};

	const handleFormChange = (field: string, value: string | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 (CounselingRecord 스타일) */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					{/* 현황선택 헤더 */}
					<div className="">
						<div className="flex gap-2">
							<div className="mb-3">
								<h3 className="text-sm font-semibold text-blue-900">수급자 목록</h3>
							</div>
							<div className="h-6 flex-1 bg-white border border-blue-300 rounded flex items-center justify-center">
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full h-full text-xs text-blue-900 bg-transparent border-none outline-none px-2 cursor-pointer"
								>
									<option value="">현황 전체</option>
									<option value="입소">입소</option>
									<option value="퇴소">퇴소</option>
								</select>
							</div>
						</div>
					</div>

					{/* 수급자 목록 테이블 - 라운드 박스 */}
					<div className="flex-1 border border-blue-300 rounded-lg overflow-hidden bg-white">
						<div className="overflow-y-auto h-full">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">현황</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">성별</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">등급</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">나이</th>
									</tr>
								</thead>
								<tbody>
									{memberList
										.filter((member) => !selectedStatus || member.status === selectedStatus)
										.map((member) => (
										<tr
											key={member.id}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer`}
										>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.serialNo}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.status}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.name}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.gender}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.grade}</td>
											<td className="text-center px-2 py-1.5">{member.age}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 중간 패널: 보호자 목록 */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					<div className="mb-3">
						<h3 className="text-sm font-semibold text-blue-900">보호자 목록</h3>
					</div>
					<div className="flex-1 border border-blue-300 rounded-lg overflow-hidden bg-white">
						<div className="overflow-y-auto h-full">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">보호자명</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold">계약기간</th>
									</tr>
								</thead>
								<tbody>
									{guardianList.map((guardian, index) => (
										<tr
											key={guardian.id}
											onClick={() => handleSelectGuardian(index)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedGuardianIndex === index ? 'bg-blue-100 border-2 border-blue-400' : ''
											}`}
										>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{guardian.serialNo}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{guardian.name}</td>
											<td className="text-center px-2 py-1.5">
												{guardian.contractDate} ~ {guardian.endDate || '___'}
											</td>
										</tr>
									))}
									<tr>
										<td colSpan={3} className="text-center px-2 py-1.5 text-gray-400 text-xs">...</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 우측 패널: 보호자 정보 */}
				<div className="flex-1 overflow-y-auto p-4 bg-white">
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-blue-900 mb-4">보호자 정보</h2>
						
						{/* 수급자명 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">수급자명</label>
							<input
								type="text"
								value={formData.recipientName}
								onChange={(e) => handleFormChange('recipientName', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="border-t border-blue-200 my-4"></div>

						{/* 보호자명 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">보호자명</label>
							<input
								type="text"
								value={formData.guardianName}
								onChange={(e) => handleFormChange('guardianName', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 관계 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">관계</label>
							<div className="flex items-center gap-2 flex-1">
								<select
									value={formData.relationship}
									onChange={(e) => handleFormChange('relationship', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								>
									<option value="">선택</option>
									<option value="보호자">보호자</option>
									<option value="딸">딸</option>
									<option value="아들">아들</option>
									<option value="며느리">며느리</option>
									<option value="기타">기타</option>
								</select>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={formData.isMainGuardian}
										onChange={(e) => handleFormChange('isMainGuardian', e.target.checked)}
										className="w-4 h-4 border-blue-300 rounded"
									/>
									<span className="text-sm text-blue-900">주 보호자</span>
								</label>
							</div>
						</div>

						{/* 관계내용 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">관계내용</label>
							<textarea
								value={formData.relationshipDetails}
								onChange={(e) => handleFormChange('relationshipDetails', e.target.value)}
								className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								rows={3}
								placeholder="동거 여부, 성별 등"
							/>
						</div>

						{/* 전화번호 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">전화번호</label>
							<input
								type="text"
								value={formData.phoneNumber}
								onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								placeholder="예) 010-0000-0000"
							/>
						</div>

						{/* 주소 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">주소</label>
							<input
								type="text"
								value={formData.address}
								onChange={(e) => handleFormChange('address', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						<div className="border-t border-blue-200 my-4"></div>

						{/* 이용병원 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">이용병원</label>
							<input
								type="text"
								value={formData.hospitalUsed}
								onChange={(e) => handleFormChange('hospitalUsed', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 주치의 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">주치의</label>
							<input
								type="text"
								value={formData.attendingPhysician}
								onChange={(e) => handleFormChange('attendingPhysician', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 병원주소 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">병원주소</label>
							<input
								type="text"
								value={formData.hospitalAddress}
								onChange={(e) => handleFormChange('hospitalAddress', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
