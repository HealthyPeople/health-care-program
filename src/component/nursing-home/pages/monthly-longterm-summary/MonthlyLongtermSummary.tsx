"use client";
import React, { useState, useEffect } from 'react';

interface ServicePerformanceData {
	PNUM: string;
	P_NM: string; // 수급자
	P_BRDT: string; // 생일
	P_SEX: string; // 성별
	ROOM_NO: string; // 방번호
	P_GRD: string; // 요양등급
	PROVIDED_DAYS: number; // 제공일수
	OUT_DAYS: number; // 외박일수
	BP_SYSTOLIC: string; // 혈압-수축
	BP_DIASTOLIC: string; // 혈압-이완
	TEMPERATURE: string; // 체온
	BATH: string; // 목욕
	[key: string]: any;
}

export default function MonthlyLongtermSummary() {
	const [performanceList, setPerformanceList] = useState<ServicePerformanceData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedYear, setSelectedYear] = useState<string>('2025');
	const [selectedMonth, setSelectedMonth] = useState<string>('12');
	const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('');
	const [selectedBirthday, setSelectedBirthday] = useState<string>('2025-12-10');

	// 급여년월 조회
	const fetchPerformanceData = async () => {
		setLoading(true);
		try {
			const yearMonth = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/monthly-longterm-summary?yearMonth=${encodeURIComponent(yearMonth)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setPerformanceList([]);
		} catch (err) {
			console.error('서비스실적 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPerformanceData();
	}, [selectedYear, selectedMonth]);

	// 검색
	const handleSearch = () => {
		fetchPerformanceData();
	};

	// 서비스실적집계
	const handleAggregate = async () => {
		if (!confirm('서비스실적을 집계하시겠습니까?')) {
			return;
		}

		setLoading(true);
		try {
			const yearMonth = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch('/api/monthly-longterm-summary/aggregate', {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({ yearMonth })
			// });

			alert('서비스실적이 집계되었습니다.');
			await fetchPerformanceData();
		} catch (err) {
			console.error('서비스실적 집계 오류:', err);
			alert('서비스실적 집계 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 닫기
	const handleClose = () => {
		window.history.back();
	};

	// 센터소견등록
	const handleRegisterCenterOpinion = async () => {
		if (!selectedBeneficiary) {
			alert('수급자를 선택해주세요.');
			return;
		}

		// TODO: 센터소견등록 모달 또는 페이지로 이동
		alert('센터소견등록 기능은 준비 중입니다.');
	};

	// 개별출력
	const handlePrintIndividual = async () => {
		if (!selectedBeneficiary) {
			alert('수급자를 선택해주세요.');
			return;
		}

		const selectedData = performanceList.find(item => item.P_NM === selectedBeneficiary);
		if (!selectedData) {
			alert('선택한 수급자의 데이터를 찾을 수 없습니다.');
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
	<title>월 서비스실적 관리 - 개별출력</title>
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
			font-size: 10pt;
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
		.info-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #000;
		}
		.info-table th,
		.info-table td {
			border: 1px solid #000;
			padding: 8px;
			text-align: center;
			font-size: 9pt;
		}
		.info-table th {
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
			<h1>월 서비스실적 관리</h1>
			<p>급여년월: ${selectedYear}년 ${selectedMonth}월</p>
		</div>
		<table class="info-table">
			<thead>
				<tr>
					<th>수급자</th>
					<th>생일</th>
					<th>성별</th>
					<th>방번호</th>
					<th>요양등급</th>
					<th>제공일수</th>
					<th>외박일수</th>
					<th>혈압-수축</th>
					<th>혈압-이완</th>
					<th>체온</th>
					<th>목욕</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>${selectedData.P_NM || '-'}</td>
					<td>${selectedData.P_BRDT || '-'}</td>
					<td>${selectedData.P_SEX === '1' ? '남' : selectedData.P_SEX === '2' ? '여' : '-'}</td>
					<td>${selectedData.ROOM_NO || '-'}</td>
					<td>${selectedData.P_GRD || '-'}</td>
					<td>${selectedData.PROVIDED_DAYS || 0}</td>
					<td>${selectedData.OUT_DAYS || 0}</td>
					<td>${selectedData.BP_SYSTOLIC || '-'}</td>
					<td>${selectedData.BP_DIASTOLIC || '-'}</td>
					<td>${selectedData.TEMPERATURE || '-'}</td>
					<td>${selectedData.BATH || '-'}</td>
				</tr>
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

	// 전체출력
	const handlePrintAll = async () => {
		if (performanceList.length === 0) {
			alert('출력할 데이터가 없습니다.');
			return;
		}

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		const rowsHTML = performanceList.map(item => `
			<tr>
				<td>${item.P_NM || '-'}</td>
				<td>${item.P_BRDT || '-'}</td>
				<td>${item.P_SEX === '1' ? '남' : item.P_SEX === '2' ? '여' : '-'}</td>
				<td>${item.ROOM_NO || '-'}</td>
				<td>${item.P_GRD || '-'}</td>
				<td>${item.PROVIDED_DAYS || 0}</td>
				<td>${item.OUT_DAYS || 0}</td>
				<td>${item.BP_SYSTOLIC || '-'}</td>
				<td>${item.BP_DIASTOLIC || '-'}</td>
				<td>${item.TEMPERATURE || '-'}</td>
				<td>${item.BATH || '-'}</td>
			</tr>
		`).join('');

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>월 서비스실적 관리 - 전체출력</title>
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
		.info-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #000;
		}
		.info-table th,
		.info-table td {
			border: 1px solid #000;
			padding: 6px;
			text-align: center;
			font-size: 8pt;
		}
		.info-table th {
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
			<h1>월 서비스실적 관리</h1>
			<p>급여년월: ${selectedYear}년 ${selectedMonth}월</p>
		</div>
		<table class="info-table">
			<thead>
				<tr>
					<th>수급자</th>
					<th>생일</th>
					<th>성별</th>
					<th>방번호</th>
					<th>요양등급</th>
					<th>제공일수</th>
					<th>외박일수</th>
					<th>혈압-수축</th>
					<th>혈압-이완</th>
					<th>체온</th>
					<th>목욕</th>
				</tr>
			</thead>
			<tbody>
				${rowsHTML}
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

	// 상세내역
	const handleViewDetails = () => {
		if (!selectedBeneficiary) {
			alert('수급자를 선택해주세요.');
			return;
		}

		// TODO: 상세내역 페이지로 이동
		alert('상세내역 기능은 준비 중입니다.');
	};

	// 성별 표시 변환
	const formatGender = (gender: string) => {
		if (gender === '1') return '남';
		if (gender === '2') return '여';
		return '-';
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

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="p-4 border-b border-blue-200 bg-blue-50">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-blue-900">월 서비스실적 관리</h1>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">급여년월</label>
							<select
								value={selectedYear}
								onChange={(e) => setSelectedYear(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								{Array.from({ length: 10 }, (_, i) => {
									const year = new Date().getFullYear() - 5 + i;
									return (
										<option key={year} value={String(year)}>{year}년</option>
									);
								})}
							</select>
							<select
								value={selectedMonth}
								onChange={(e) => setSelectedMonth(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								{Array.from({ length: 12 }, (_, i) => {
									const month = i + 1;
									return (
										<option key={month} value={String(month)}>{month}월</option>
									);
								})}
							</select>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={handleSearch}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								검색
							</button>
							<button
								onClick={handleAggregate}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								서비스실적집계
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
			</div>

			{/* 메인 테이블 영역 */}
			<div className="flex-1 overflow-auto border-b border-blue-200">
				<div className="min-w-full">
					<table className="w-full text-sm border-collapse">
						<thead className="sticky top-0 border-b-2 border-blue-200 bg-blue-50">
							<tr>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">수급자</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">생일</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">성별</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">방번호</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">요양등급</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">제공일수</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">외박일수</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">혈압-수축</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">혈압-이완</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">체온</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 whitespace-nowrap">목욕</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={11} className="px-3 py-4 text-center text-blue-900/60">로딩 중...</td>
								</tr>
							) : performanceList.length === 0 ? (
								<tr>
									<td colSpan={11} className="px-3 py-4 text-center text-blue-900/60">데이터가 없습니다</td>
								</tr>
							) : (
								performanceList.map((item, index) => (
									<tr
										key={index}
										onClick={() => {
											setSelectedBeneficiary(item.P_NM || '');
											setSelectedBirthday(formatDate(item.P_BRDT || ''));
										}}
										className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
											selectedBeneficiary === item.P_NM ? 'bg-blue-100' : ''
										}`}
									>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.P_NM || '-'}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatDate(item.P_BRDT || '')}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{formatGender(item.P_SEX || '')}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.ROOM_NO || '-'}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.P_GRD || '-'}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.PROVIDED_DAYS || 0}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.OUT_DAYS || 0}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.BP_SYSTOLIC || '-'}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.BP_DIASTOLIC || '-'}</td>
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.TEMPERATURE || '-'}</td>
										<td className="px-3 py-2 text-center text-blue-900">{item.BATH || '-'}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* 하단 푸터 */}
			<div className="p-4 border-t border-blue-200 bg-blue-50">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자</label>
							<input
								type="text"
								value={selectedBeneficiary}
								onChange={(e) => setSelectedBeneficiary(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
								placeholder="수급자명"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">생일</label>
							<input
								type="date"
								value={selectedBirthday}
								onChange={(e) => setSelectedBirthday(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={handleRegisterCenterOpinion}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							센터소견등록
						</button>
						<button
							onClick={handlePrintIndividual}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							개별출력
						</button>
						<button
							onClick={handlePrintAll}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							전체출력
						</button>
						<button
							onClick={handleViewDetails}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							상세내역
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
