"use client";
import React, { useState } from 'react';

export default function CounselingRecord() {
	const [selectedMember, setSelectedMember] = useState<number | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [consultationDates, setConsultationDates] = useState<string[]>([
		'2020.09.03',
		'2015.09.01',
		'2025.03.11'
	]);
	const [formData, setFormData] = useState({
		beneficiary: '',
		consultationSubstitute: '',
		consultationDateTime: '',
		consultant: '',
		consultationMethod: '',
		consultationContent: '',
		actionTaken: ''
	});

	// 좌측 수급자 목록 데이터
	const [memberList, setMemberList] = useState([
		{ id: 1, serialNo: 1, collectionAmount: '82', name: '200', gender: '남', status: '남', admission: '4', discharge: '91' },
		{ id: 2, serialNo: 2, collectionAmount: '82', name: '200', gender: '남', status: '남', admission: '4', discharge: '91' },
	]);

	// 날짜 생성 함수
	const handleCreateDate = () => {
		const today = new Date();
		const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
		setConsultationDates(prev => [formattedDate, ...prev]);
		setSelectedDateIndex(0);
	};

	// 날짜 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		// 여기서 해당 날짜의 상담 기록을 불러올 수 있습니다
	};

	// 수급자 선택 함수
	const handleSelectMember = (id: number) => {
		setSelectedMember(id);
		// 여기서 해당 수급자의 정보를 불러올 수 있습니다
	};

	// 폼 데이터 변경 함수
	const handleFormChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 수정 함수
	const handleModify = () => {
		// 수정 로직
		console.log('수정:', formData);
	};

	// 출력 함수
	const handlePrint = () => {
		// 출력 로직
		console.log('출력:', formData);
	};

	// 삭제 함수
	const handleDelete = () => {
		// 삭제 로직
		console.log('삭제');
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널 (약 25%) */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					{/* 현황선택 헤더 */}
					<div className="mb-3">
						<div className="h-6 mb-2 bg-white border border-blue-300 rounded"></div>
						<h3 className="text-sm font-semibold text-blue-900">현황선택</h3>
					</div>

					{/* 수급자 목록 테이블 - 라운드 박스 */}
					<div className="flex-1 border border-blue-300 rounded-lg overflow-hidden bg-white">
						<div className="overflow-y-auto h-full">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">수금액</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">성명</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">성별</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">상태</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">입소</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">퇴박</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">조사</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">태사</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold">동행자</th>
									</tr>
								</thead>
								<tbody>
									{memberList.map((member) => (
										<tr
											key={member.id}
											onClick={() => handleSelectMember(member.id)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedMember === member.id ? 'bg-blue-100 border-2 border-blue-400' : ''
											}`}
										>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.serialNo}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.collectionAmount}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.name}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.gender}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.status}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.admission}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.discharge}</td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100"></td>
											<td className="text-center px-2 py-1.5 border-r border-blue-100"></td>
											<td className="text-center px-2 py-1.5"></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 우측 패널 (약 75%) */}
				<div className="flex-1 flex flex-col bg-white">
					{/* 상단: 상담 일자 */}
					<div className="border-b border-blue-200 px-4 py-3 bg-blue-50">
						<div className="flex items-center gap-3">
							<label className="text-sm font-medium text-blue-900">상담 일자</label>
							<button
								onClick={handleCreateDate}
								className="px-3 py-1.5 text-xs border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium"
							>
								생성
							</button>
						</div>
						<div className="mt-2 space-y-1">
							{consultationDates.map((date, index) => (
								<div
									key={index}
									onClick={() => handleSelectDate(index)}
									className={`px-2 py-1 text-xs cursor-pointer hover:bg-blue-100 rounded ${
										selectedDateIndex === index ? 'bg-blue-200 font-semibold' : ''
									}`}
								>
									{index + 1}. {date}
								</div>
							))}
							<div className="px-2 py-1 text-xs text-gray-400">...</div>
						</div>
					</div>

					{/* 중간: 상담 상세 폼 */}
					<div className="flex-1 overflow-y-auto p-4">
						{/* 첫 번째 행 */}
						<div className="mb-4 flex items-center gap-4 flex-wrap">
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">수급자</label>
								<input
									type="text"
									value={formData.beneficiary}
									onChange={(e) => handleFormChange('beneficiary', e.target.value)}
									className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담대신자</label>
								<input
									type="text"
									value={formData.consultationSubstitute}
									onChange={(e) => handleFormChange('consultationSubstitute', e.target.value)}
									className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
								/>
							</div>
							<div className="ml-auto flex items-center gap-2">
								<button
									onClick={handleModify}
									className="px-4 py-1.5 text-xs border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium"
								>
									수정
								</button>
								<button
									onClick={handlePrint}
									className="px-4 py-1.5 text-xs border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium"
								>
									출력
								</button>
								<button
									onClick={handleDelete}
									className="px-4 py-1.5 text-xs border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium"
								>
									삭제
								</button>
							</div>
						</div>

						{/* 두 번째 행 */}
						<div className="mb-4 flex items-center gap-4 flex-wrap">
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담일시</label>
								<input
									type="text"
									value={formData.consultationDateTime}
									onChange={(e) => handleFormChange('consultationDateTime', e.target.value)}
									className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담사</label>
								<input
									type="text"
									value={formData.consultant}
									onChange={(e) => handleFormChange('consultant', e.target.value)}
									className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담방법</label>
								<input
									type="text"
									value={formData.consultationMethod}
									onChange={(e) => handleFormChange('consultationMethod', e.target.value)}
									className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
								/>
							</div>
						</div>

						{/* 상담 내용 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">상담 내용</label>
							<textarea
								value={formData.consultationContent}
								onChange={(e) => handleFormChange('consultationContent', e.target.value)}
								className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								rows={8}
								placeholder="상담 내용을 입력하세요"
							/>
						</div>

						{/* 조치 사항 */}
						<div>
							<label className="block text-sm text-blue-900 font-medium mb-2">조치 사항</label>
							<textarea
								value={formData.actionTaken}
								onChange={(e) => handleFormChange('actionTaken', e.target.value)}
								className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								rows={8}
								placeholder="조치 사항을 입력하세요"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

