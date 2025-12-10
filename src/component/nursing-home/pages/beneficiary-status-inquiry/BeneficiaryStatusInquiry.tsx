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
	P_SDT: string; // 입소일자
	P_FLOOR: string; // 층수
	ROOM_NO?: string; // 방번호
	P_YYNO: string; // 장기요양인정번호
	P_YYSDT: string; // 유효기간 시작일
	P_YYEDT: string; // 유효기간 종료일
	USRGU?: string; // 부담금 유형
	[key: string]: any;
}

export default function BeneficiaryStatusInquiry() {
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

	// 날짜 형식 변환
	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-';
		if (dateStr.includes('-')) return dateStr.substring(0, 10);
		if (dateStr.length === 8) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	// 입소일자 형식 변환
	const formatAdmissionDate = (dateStr: string) => {
		return formatDate(dateStr);
	};

	// 유효기간 형식 변환
	const formatValidityPeriod = (startDate: string, endDate: string) => {
		const start = formatDate(startDate);
		const end = formatDate(endDate);
		if (start === '-' && end === '-') return '-';
		return `${start} ~ ${end}`;
	};

	// 성별 표시
	const formatGender = (gender: string) => {
		if (gender === '1') return '남';
		if (gender === '2') return '여';
		return '-';
	};

	// 등급 표시
	const formatGrade = (grade: string) => {
		if (!grade || grade === '0') return '기타등급';
		return `${grade}등급`;
	};

	// 부담금 유형 표시
	const formatPaymentType = (usrgu: string) => {
		if (!usrgu) return '일반';
		if (usrgu === '1') return '60%경감대상자';
		if (usrgu === '2') return '40%경감대상자';
		if (usrgu === '3') return '국민기초생활수급자';
		return '일반';
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

	// 입소 상태인 수급자만 필터링 (요약 통계용)
	const activeMembers = memberList.filter(member => member.P_ST === '1');

	// 등급별계 계산
	const gradeSummary = {
		total: activeMembers.length,
		grade1: activeMembers.filter(m => m.P_GRD === '1').length,
		grade2: activeMembers.filter(m => m.P_GRD === '2').length,
		grade3: activeMembers.filter(m => m.P_GRD === '3').length,
		grade4: activeMembers.filter(m => m.P_GRD === '4').length,
		grade5: activeMembers.filter(m => m.P_GRD === '5').length,
		other: activeMembers.filter(m => !m.P_GRD || m.P_GRD === '0' || (m.P_GRD !== '1' && m.P_GRD !== '2' && m.P_GRD !== '3' && m.P_GRD !== '4' && m.P_GRD !== '5')).length
	};

	// 성별계 계산
	const genderSummary = {
		total: activeMembers.length,
		male: activeMembers.filter(m => m.P_SEX === '1').length,
		female: activeMembers.filter(m => m.P_SEX === '2').length
	};

	// 부담금별계 계산
	const paymentSummary = {
		total: activeMembers.length,
		general: activeMembers.filter(m => !m.USRGU || m.USRGU === '0' || m.USRGU === '').length,
		reduction60: activeMembers.filter(m => m.USRGU === '1').length,
		reduction40: activeMembers.filter(m => m.USRGU === '2').length,
		basic: activeMembers.filter(m => m.USRGU === '3').length
	};

	// 출력 함수
	const handlePrint = async () => {
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		const summaryRows = activeMembers.map(member => `
			<tr>
				<td>${formatGrade(member.P_GRD || '')}</td>
				<td>${member.P_NM || '-'}</td>
				<td>${calculateAge(member.P_BRDT || '')}</td>
				<td>${formatGender(member.P_SEX || '')}</td>
				<td>${formatAdmissionDate(member.P_SDT || '')}</td>
				<td>${member.ROOM_NO || member.P_FLOOR || '-'}</td>
				<td>${formatPaymentType(member.USRGU || '')}</td>
				<td>${member.P_YYNO || '-'}</td>
				<td>${formatValidityPeriod(member.P_YYSDT || '', member.P_YYEDT || '')}</td>
			</tr>
		`).join('');

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>수급자 현황</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 10mm;
		}
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
			font-size: 9pt;
			line-height: 1.5;
			color: #000;
			background: #fff;
		}
		.print-container {
			width: 100%;
			margin: 0 auto;
			padding: 0;
		}
		.header {
			text-align: center;
			margin-bottom: 20px;
		}
		.header h1 {
			font-size: 18pt;
			font-weight: bold;
		}
		.summary-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 15px;
			border: 1px solid #000;
		}
		.summary-table th,
		.summary-table td {
			border: 1px solid #000;
			padding: 6px;
			text-align: center;
			font-size: 8pt;
		}
		.summary-table th {
			background-color: #f0f0f0;
			font-weight: bold;
		}
		.data-table {
			width: 100%;
			border-collapse: collapse;
			border: 1px solid #000;
		}
		.data-table th,
		.data-table td {
			border: 1px solid #000;
			padding: 6px;
			text-align: center;
			font-size: 8pt;
		}
		.data-table th {
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
		<div class="header">
			<h1>수급자 현황</h1>
		</div>
		
		<table class="summary-table">
			<thead>
				<tr>
					<th>등급별계</th>
					<th>1등급</th>
					<th>2등급</th>
					<th>3등급</th>
					<th>4등급</th>
					<th>5등급</th>
					<th>기타등급</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>${gradeSummary.total}</td>
					<td>${gradeSummary.grade1}</td>
					<td>${gradeSummary.grade2}</td>
					<td>${gradeSummary.grade3}</td>
					<td>${gradeSummary.grade4}</td>
					<td>${gradeSummary.grade5}</td>
					<td>${gradeSummary.other}</td>
				</tr>
			</tbody>
		</table>

		<table class="summary-table">
			<thead>
				<tr>
					<th>성별계</th>
					<th>남자</th>
					<th>여자</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>${genderSummary.total}</td>
					<td>${genderSummary.male}</td>
					<td>${genderSummary.female}</td>
				</tr>
			</tbody>
		</table>

		<table class="summary-table">
			<thead>
				<tr>
					<th>부담금별계</th>
					<th>일반</th>
					<th>60%경감</th>
					<th>40%경감</th>
					<th>국민기초</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>${paymentSummary.total}</td>
					<td>${paymentSummary.general}</td>
					<td>${paymentSummary.reduction60}</td>
					<td>${paymentSummary.reduction40}</td>
					<td>${paymentSummary.basic}</td>
				</tr>
			</tbody>
		</table>

		<table class="data-table">
			<thead>
				<tr>
					<th>요양등급</th>
					<th>수급자</th>
					<th>나이</th>
					<th>성별</th>
					<th>입소일자</th>
					<th>방번호</th>
					<th>수급자급여부담율</th>
					<th>장기요양인정번호</th>
					<th>유효기간</th>
				</tr>
			</thead>
			<tbody>
				${summaryRows}
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

	// 닫기 함수
	const handleClose = () => {
		window.history.back();
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="p-4 border-b border-blue-200 bg-blue-50">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-blue-900">수급자 현황</h1>
					<div className="flex items-center gap-2">
						<button
							onClick={handlePrint}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							출력
						</button>
						<button
							onClick={handleClose}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							닫기
						</button>
					</div>
				</div>
			</div>

			{/* 메인 컨텐츠 영역 */}
			<div className="flex h-[calc(100vh-120px)]">
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
												className="border-b cursor-pointer border-blue-50 hover:bg-blue-50"
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

				{/* 우측 패널: 요약 테이블 및 메인 데이터 테이블 */}
				<div className="flex-1 p-4 overflow-auto">
					{/* 요약 테이블들 */}
					<div className="mb-6 space-y-4">
					{/* 등급별계 */}
					<div className="overflow-hidden border border-blue-300 rounded-lg">
						<table className="w-full text-sm border-collapse">
							<thead className="bg-blue-50">
								<tr>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">등급별계</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">1등급</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">2등급</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">3등급</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">4등급</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">5등급</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900">기타등급</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className="px-4 py-2 font-medium text-center text-blue-900 border-r border-blue-200">{gradeSummary.total}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{gradeSummary.grade1}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{gradeSummary.grade2}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{gradeSummary.grade3}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{gradeSummary.grade4}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{gradeSummary.grade5}</td>
									<td className="px-4 py-2 text-center text-blue-900">{gradeSummary.other}</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* 성별계 */}
					<div className="overflow-hidden border border-blue-300 rounded-lg">
						<table className="w-full text-sm border-collapse">
							<thead className="bg-blue-50">
								<tr>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">성별계</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">남자</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900">여자</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className="px-4 py-2 font-medium text-center text-blue-900 border-r border-blue-200">{genderSummary.total}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{genderSummary.male}</td>
									<td className="px-4 py-2 text-center text-blue-900">{genderSummary.female}</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* 부담금별계 */}
					<div className="overflow-hidden border border-blue-300 rounded-lg">
						<table className="w-full text-sm border-collapse">
							<thead className="bg-blue-50">
								<tr>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">부담금별계</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">일반</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">60%경감</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">40%경감</th>
									<th className="px-4 py-2 font-semibold text-center text-blue-900">국민기초</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className="px-4 py-2 font-medium text-center text-blue-900 border-r border-blue-200">{paymentSummary.total}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{paymentSummary.general}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{paymentSummary.reduction60}</td>
									<td className="px-4 py-2 text-center text-blue-900 border-r border-blue-200">{paymentSummary.reduction40}</td>
									<td className="px-4 py-2 text-center text-blue-900">{paymentSummary.basic}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				{/* 메인 데이터 테이블 */}
				<div className="overflow-hidden border border-blue-300 rounded-lg">
					<div className="overflow-x-auto">
						<table className="w-full min-w-full text-sm border-collapse">
							<thead className="sticky top-0 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">요양등급</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">수급자</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">나이</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">성별</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">입소일자</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">방번호</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">수급자급여부담율</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">장기요양인정번호</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 whitespace-nowrap">유효기간</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={9} className="px-3 py-4 text-center text-blue-900/60">로딩 중...</td>
									</tr>
								) : activeMembers.length === 0 ? (
									<tr>
										<td colSpan={9} className="px-3 py-4 text-center text-blue-900/60">데이터가 없습니다</td>
									</tr>
								) : (
									activeMembers.map((member, index) => (
										<tr
											key={`${member.ANCD}-${member.PNUM}-${index}`}
											className="border-b border-blue-50 hover:bg-blue-50"
										>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatGrade(member.P_GRD || '')}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{member.P_NM || '-'}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{calculateAge(member.P_BRDT || '')}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatGender(member.P_SEX || '')}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatAdmissionDate(member.P_SDT || '')}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{member.ROOM_NO || member.P_FLOOR || '-'}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatPaymentType(member.USRGU || '')}</td>
											<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{member.P_YYNO || '-'}</td>
											<td className="px-3 py-2 text-center text-blue-900">{formatValidityPeriod(member.P_YYSDT || '', member.P_YYEDT || '')}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
				</div>
			</div>
		</div>
	);
}
