"use client";
import React, { useState, useEffect } from 'react';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	[key: string]: any;
}

export default function CounselingRecord() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [consultationDates, setConsultationDates] = useState<string[]>([
		'2020년09월03일',
		'2015년09월01일',
		'2025년03월11일'
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

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 수급자 목록 조회
	const fetchMembers = async () => {
		setLoading(true);
		try {
			const response = await fetch('/api/f10010');
			const result = await response.json();
			
			if (result.success) {
				setMemberList(result.data);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	// 나이 계산 함수
	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '-';
		try {
			const year = parseInt(birthDate.substring(0, 4));
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return '-';
		}
	};

	// 필터링된 수급자 목록
	const filteredMembers = memberList.filter((member) => {
		if (!selectedStatus) return true;
		if (selectedStatus === '입소') return member.P_ST === '1';
		if (selectedStatus === '퇴소') return member.P_ST === '9';
		return true;
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	useEffect(() => {
		fetchMembers();
	}, []);

	// 상태 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus]);

	// 날짜 생성 함수
	const handleCreateDate = () => {
		const today = new Date();
		const formattedDate = `${today.getFullYear()}년${String(today.getMonth() + 1).padStart(2, '0')}월${String(today.getDate()).padStart(2, '0')}일`;
		setConsultationDates(prev => [formattedDate, ...prev]);
		setSelectedDateIndex(0);
	};

	// 날짜 형식 변환 함수 (YYYY.MM.DD -> YYYY년MM월DD일)
	const formatDateDisplay = (dateStr: string) => {
		// 이미 YYYY년MM월DD일 형식이면 그대로 반환
		if (dateStr.includes('년') && dateStr.includes('월') && dateStr.includes('일')) {
			return dateStr;
		}
		// YYYY.MM.DD 형식을 YYYY년MM월DD일로 변환
		const parts = dateStr.split('.');
		if (parts.length === 3) {
			return `${parts[0]}년${parts[1]}월${parts[2]}일`;
		}
		return dateStr;
	};

	// 날짜 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		// 여기서 해당 날짜의 상담 기록을 불러올 수 있습니다
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
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
					<div className="border border-blue-300 rounded-lg overflow-hidden bg-white flex flex-col">
						<div className="overflow-y-auto">
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
									{loading ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-blue-900/60">수급자 데이터가 없습니다</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM ? 'bg-blue-100' : ''
												}`}
											>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">
													{member.P_GRD === '0' ? '등급외' : member.P_GRD ? `${member.P_GRD}등급` : '-'}
												</td>
												<td className="text-center px-2 py-1.5">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{/* 페이지네이션 */}
						{totalPages > 1 && (
							<div className="p-2 border-t border-blue-200 bg-white">
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
				</div>

				{/* 우측 패널 (약 75%) */}
				<div className="flex-1 flex bg-white">
					{/* 좌측: 상담 일자 (세로 박스) */}
					<div className="w-1/4 border-r border-blue-200 px-4 py-3 bg-blue-50 flex flex-col">
						<div className="flex items-center justify-between mb-2">
							<label className="text-sm font-medium text-blue-900">상담 일자</label>
							<button
								onClick={handleCreateDate}
								className="px-3 py-1.5 text-xs border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium"
							>
								생성
							</button>
						</div>
						<div className="flex flex-col space-y-1 flex-1 overflow-y-auto">
							{consultationDates.map((date, index) => (
								<div
									key={index}
									onClick={() => handleSelectDate(index)}
									className={`px-2 py-1 text-sm cursor-pointer hover:bg-blue-100 rounded ${
										selectedDateIndex === index ? 'bg-blue-200 font-semibold' : ''
									}`}
								>
									{index + 1}. {formatDateDisplay(date)}
								</div>
							))}
							<div className="px-2 py-1 text-sm text-gray-400">...</div>
						</div>
					</div>

					{/* 우측: 상담 상세 폼 */}
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
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담대상자</label>
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

