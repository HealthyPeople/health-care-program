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

interface ServiceDateData {
	SVDT: string; // 서비스제공일자
	[key: string]: any;
}

interface ServiceWriterData {
	serviceCategory: string; // 서비스 카테고리
	writerName: string; // 작성자성명
	[key: string]: any;
}

export default function LongtermCareRegistration() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [serviceDates, setServiceDates] = useState<string[]>([]);
	const [loadingServiceDates, setLoadingServiceDates] = useState(false);
	const [serviceDatePage, setServiceDatePage] = useState(1);
	const serviceDateItemsPerPage = 10;

	// 폼 데이터
	const [formData, setFormData] = useState({
		beneficiary: '', // 수급자
		provisionDate: '', // 제공일자
		registeredWriterName: '', // 등록된작성자성명
		modifiedWriterName: '', // 수정작성자성명
		serviceWriters: [
			{ category: '신체활동', writerName: '', additionalField: '' },
			{ category: '인지관리', writerName: '', additionalField: '' },
			{ category: '건강및간호', writerName: '', additionalField: '' },
			{ category: '기능회복', writerName: '', additionalField: '' }
		]
	});

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 수급자 목록 조회
	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				setMemberList(result.data || []);
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
		if (selectedStatus) {
			const memberStatus = String(member.P_ST || '').trim();
			if (selectedStatus === '입소' && memberStatus !== '1') {
				return false;
			}
			if (selectedStatus === '퇴소' && memberStatus !== '9') {
				return false;
			}
		}
		
		if (selectedGrade) {
			const memberGrade = String(member.P_GRD || '').trim();
			const selectedGradeTrimmed = String(selectedGrade).trim();
			if (memberGrade !== selectedGradeTrimmed) {
				return false;
			}
		}
		
		if (selectedFloor) {
			const memberFloor = String(member.P_FLOOR || '').trim();
			const selectedFloorTrimmed = String(selectedFloor).trim();
			if (memberFloor !== selectedFloorTrimmed) {
				return false;
			}
		}
		
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase().trim();
			if (!member.P_NM?.toLowerCase().includes(searchLower)) {
				return false;
			}
		}
		
		return true;
	}).sort((a, b) => {
		const nameA = (a.P_NM || '').trim();
		const nameB = (b.P_NM || '').trim();
		return nameA.localeCompare(nameB, 'ko');
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

	// 검색어 변경 시 실시간 검색 (디바운싱)
	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	// 서비스제공일자 조회
	const fetchServiceDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setServiceDates([]);
			return;
		}

		setLoadingServiceDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/service-dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setServiceDates([]);
		} catch (err) {
			console.error('서비스제공일자 조회 오류:', err);
		} finally {
			setLoadingServiceDates(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchServiceDates(member.ANCD, member.PNUM);
	};

	// 서비스제공일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = serviceDates[index];
		setFormData(prev => ({ ...prev, provisionDate: selectedDate || '' }));
		
		// TODO: 선택한 날짜의 작성자 정보 조회
		// fetchServiceWriters(selectedMember?.ANCD, selectedMember?.PNUM, selectedDate);
	};

	// 날짜 형식 변환 함수
	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		if (dateStr.includes('T')) {
			dateStr = dateStr.split('T')[0];
		}
		if (dateStr.includes('-') && dateStr.length >= 10) {
			return dateStr.substring(0, 10);
		}
		if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	// 서비스 작성자 정보 변경
	const handleServiceWriterChange = (index: number, field: string, value: string) => {
		setFormData(prev => {
			const newWriters = [...prev.serviceWriters];
			newWriters[index] = { ...newWriters[index], [field]: value };
			return { ...prev, serviceWriters: newWriters };
		});
	};

	// 서비스항목 수정
	const handleModifyServiceItems = () => {
		// TODO: 서비스항목 수정 로직
		alert('서비스항목 수정 기능은 준비 중입니다.');
	};

	// 일별작성자 저장
	const handleSaveDailyWriter = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.provisionDate) {
			alert('제공일자를 선택해주세요.');
			return;
		}

		// TODO: 실제 API 엔드포인트로 변경 필요
		alert('일별작성자가 저장되었습니다.');
	};

	// 작성자 기간일괄 저장
	const handleSaveWriterBatch = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!confirm('기간 내 작성자 정보를 일괄 저장하시겠습니까?')) {
			return;
		}

		// TODO: 실제 API 엔드포인트로 변경 필요
		alert('작성자 기간일괄 저장이 완료되었습니다.');
	};

	// 서비스실적 출력
	const handlePrintServicePerformance = async () => {
		if (!selectedMember || !formData.provisionDate) {
			alert('출력할 서비스실적을 선택해주세요.');
			return;
		}

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>서비스실적</title>
	<style>
		@page {
			size: A4;
			margin: 20mm;
		}
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
			font-size: 11pt;
			line-height: 1.5;
			color: #000;
			background: #fff;
		}
		.print-container {
			width: 100%;
			max-width: 210mm;
			margin: 0 auto;
			padding: 0;
		}
		.info-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #000;
		}
		.info-table td {
			border: 1px solid #000;
			padding: 8px 10px;
			font-size: 10pt;
		}
		.info-table td.label {
			background-color: #f0f0f0;
			font-weight: bold;
			width: 120px;
			text-align: center;
		}
		.info-table td.value {
			width: auto;
		}
		.service-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #000;
		}
		.service-table th,
		.service-table td {
			border: 1px solid #000;
			padding: 8px 10px;
			font-size: 10pt;
		}
		.service-table th {
			background-color: #f0f0f0;
			font-weight: bold;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}
	</style>
</head>
<body>
	<div class="print-container">
		<h1 style="text-align: center; font-size: 18pt; margin-bottom: 20px;">서비스실적</h1>
		
		<table class="info-table">
			<tr>
				<td class="label">수급자</td>
				<td class="value">${formData.beneficiary || '-'}</td>
				<td class="label">제공일자</td>
				<td class="value">${formData.provisionDate || '-'}</td>
			</tr>
			<tr>
				<td class="label">등록된작성자성명</td>
				<td class="value">${formData.registeredWriterName || '-'}</td>
				<td class="label">수정작성자성명</td>
				<td class="value">${formData.modifiedWriterName || '-'}</td>
			</tr>
		</table>

		<table class="service-table">
			<thead>
				<tr>
					<th>서비스 카테고리</th>
					<th>작성자성명</th>
				</tr>
			</thead>
			<tbody>
				${formData.serviceWriters.map(sw => `
					<tr>
						<td>${sw.category}</td>
						<td>${sw.writerName || '-'}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	</div>
	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>
		`;

		printWindow.document.write(printHTML);
		printWindow.document.close();
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					{/* 필터 헤더 */}
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							{/* 이름 검색 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input 
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded" 
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							{/* 현황 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">현황</div>
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">현황 전체</option>
									<option value="입소">입소</option>
									<option value="퇴소">퇴소</option>
								</select>
							</div>
							{/* 등급 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">등급</div>
								<select
									value={selectedGrade}
									onChange={(e) => setSelectedGrade(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">등급 전체</option>
									<option value="1">1등급</option>
									<option value="2">2등급</option>
									<option value="3">3등급</option>
									<option value="4">4등급</option>
									<option value="5">5등급</option>
									<option value="6">6등급</option>
								</select>
							</div>
							{/* 층수 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<select
									value={selectedFloor}
									onChange={(e) => setSelectedFloor(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">층수 전체</option>
									{Array.from(new Set(memberList.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== ''))).sort((a, b) => Number(a) - Number(b)).map(floor => (
										<option key={floor} value={String(floor)}>{floor}층</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* 수급자 목록 테이블 */}
					<div className="flex flex-col overflow-hidden bg-white border border-blue-300 rounded-lg">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">현황</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">등급</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">수급자 데이터가 없습니다</td>
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
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_GRD === '0' ? '등급외' : member.P_GRD ? `${member.P_GRD}등급` : '-'}
												</td>
												<td className="px-2 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{/* 페이지네이션 */}
						{totalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
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

				{/* 우측 패널 */}
				<div className="flex flex-1 bg-white">
					{/* 좌측: 서비스제공일자 목록 */}
					<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
						<div className="mb-2">
							<label className="text-sm font-medium text-blue-900">서비스제공일자</label>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="overflow-y-auto">
								{loadingServiceDates ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
								) : serviceDates.length === 0 ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">
										{selectedMember ? '서비스제공일자가 없습니다' : '수급자를 선택해주세요'}
									</div>
								) : (
									(() => {
										const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
										const dateStartIndex = (serviceDatePage - 1) * serviceDateItemsPerPage;
										const dateEndIndex = dateStartIndex + serviceDateItemsPerPage;
										const currentDateItems = serviceDates.slice(dateStartIndex, dateEndIndex);
										
										return currentDateItems.map((date, localIndex) => {
											const globalIndex = dateStartIndex + localIndex;
											return (
												<div
													key={globalIndex}
													onClick={() => handleSelectDate(globalIndex)}
													className={`px-2 py-1.5 text-base cursor-pointer hover:bg-blue-100 rounded ${
														selectedDateIndex === globalIndex ? 'bg-blue-200 font-semibold' : ''
													}`}
												>
													{formatDateDisplay(date)}
												</div>
											);
										});
									})()
								)}
							</div>
							{/* 서비스제공일자 페이지네이션 */}
							{serviceDates.length > serviceDateItemsPerPage && (
								<div className="p-2 mt-2">
									<div className="flex items-center justify-center gap-1">
										<button
											onClick={() => setServiceDatePage(1)}
											disabled={serviceDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;&lt;
										</button>
										<button
											onClick={() => setServiceDatePage(prev => Math.max(1, prev - 1))}
											disabled={serviceDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;
										</button>
										
										{(() => {
											const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
											const pagesToShow = Math.min(5, totalDatePages);
											const startPage = Math.max(1, Math.min(totalDatePages - 4, serviceDatePage - 2));
											
											return Array.from({ length: pagesToShow }, (_, i) => {
												const pageNum = startPage + i;
												if (pageNum > totalDatePages) return null;
												return (
													<button
														key={pageNum}
														onClick={() => setServiceDatePage(pageNum)}
														className={`px-2 py-1 text-xs border rounded ${
															serviceDatePage === pageNum
																? 'bg-blue-500 text-white border-blue-500'
																: 'border-blue-300 hover:bg-blue-50'
														}`}
													>
														{pageNum}
													</button>
												);
											}).filter(Boolean);
										})()}
										
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
												setServiceDatePage(prev => Math.min(totalDatePages, prev + 1));
											}}
											disabled={serviceDatePage >= Math.ceil(serviceDates.length / serviceDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;
										</button>
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
												setServiceDatePage(totalDatePages);
											}}
											disabled={serviceDatePage >= Math.ceil(serviceDates.length / serviceDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* 우측: 상세 정보 */}
					<div className="flex-1 p-4 overflow-y-auto">
						{/* 상단: 수급자, 제공일자, 등록된작성자성명, 수정작성자성명 */}
						<div className="mb-4 space-y-3">
							<div className="flex flex-wrap items-center gap-4">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자</label>
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]">
										{formData.beneficiary || '-'}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">제공일자</label>
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]">
										{formData.provisionDate || '-'}
									</span>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-4">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">등록된작성자성명</label>
									<input
										type="text"
										value={formData.registeredWriterName}
										onChange={(e) => setFormData(prev => ({ ...prev, registeredWriterName: e.target.value }))}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
										placeholder="등록된작성자성명"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수정작성자성명</label>
									<input
										type="text"
										value={formData.modifiedWriterName}
										onChange={(e) => setFormData(prev => ({ ...prev, modifiedWriterName: e.target.value }))}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
										placeholder="수정작성자성명"
									/>
								</div>
							</div>
						</div>

						{/* 서비스 카테고리별 작성자성명 테이블 */}
						<div className="mb-4 overflow-hidden border border-blue-300 rounded-lg">
							<table className="w-full text-sm border-collapse">
								<thead className="bg-blue-50">
									<tr>
										<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">서비스 카테고리</th>
										<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">작성자성명</th>
										<th className="px-4 py-2 font-semibold text-center text-blue-900"></th>
									</tr>
								</thead>
								<tbody>
									{formData.serviceWriters.map((serviceWriter, index) => (
										<tr key={index} className="border-b border-blue-50">
											<td className="px-4 py-2 font-medium text-center text-blue-900 border-r border-blue-100 bg-blue-50">
												{serviceWriter.category}
											</td>
											<td className="px-4 py-2 text-center border-r border-blue-100">
												<input
													type="text"
													value={serviceWriter.writerName}
													onChange={(e) => handleServiceWriterChange(index, 'writerName', e.target.value)}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													placeholder="작성자성명"
												/>
											</td>
											<td className="px-4 py-2 text-center">
												<input
													type="text"
													value={serviceWriter.additionalField}
													onChange={(e) => handleServiceWriterChange(index, 'additionalField', e.target.value)}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													placeholder=""
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* 하단 버튼 영역 */}
						<div className="flex justify-end gap-2 mt-4">
							<button
								onClick={handleModifyServiceItems}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								서비스항목 수정
							</button>
							<button
								onClick={handleSaveDailyWriter}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								일별작성자 저장
							</button>
							<button
								onClick={handleSaveWriterBatch}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								작성자 기간일괄 저장
							</button>
							<button
								onClick={handlePrintServicePerformance}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								서비스실적 출력
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
