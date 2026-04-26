"use client";
import React, { useState, useEffect } from 'react';

interface ServicePerformanceData {
	ANCD?: string;
	YYYYMM?: string;
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
	// 요약 텍스트(선택 표시용)
	PH_VIEW?: string;
	NS_VIEW?: string;
	FN_VIEW?: string;
	RG_VIEW?: string;
	[key: string]: any;
}

export default function MonthlyLongtermSummary() {
	const [performanceList, setPerformanceList] = useState<ServicePerformanceData[]>([]);
	const [loading, setLoading] = useState(false);
	const now = new Date();
	const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
	const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
	const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('');
	const [selectedBirthday, setSelectedBirthday] = useState<string>('');
	const [selectedPnum, setSelectedPnum] = useState<string>('');

	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [detailsLoading, setDetailsLoading] = useState(false);
	const [detailsData, setDetailsData] = useState<any | null>(null);
	const [detailsBaseRow, setDetailsBaseRow] = useState<ServicePerformanceData | null>(null);

	// 급여년월 조회
	const fetchPerformanceData = async () => {
		setLoading(true);
		try {
			const yyyymm = `${selectedYear}${selectedMonth.padStart(2, '0')}`;
			const url = `/api/f14090?yyyymm=${encodeURIComponent(yyyymm)}`;
			const response = await fetch(url);
			const result = await response.json();

			if (result?.success && Array.isArray(result.data)) {
				const transformed: ServicePerformanceData[] = result.data.map((row: any) => ({
					...row,
					ANCD: row.ANCD,
					YYYYMM: row.YYYYMM,
					PNUM: String(row.PNUM ?? ''),
					P_NM: row.P_NM || '',
					P_BRDT: row.P_BRDT || '',
					P_SEX: row.P_SEX || '',
					ROOM_NO: row.ROOM_NO || '',
					P_GRD: row.P_GRD || '',
					PROVIDED_DAYS: Number(row.SV_CNT ?? 0),
					OUT_DAYS: Number(row.AB_CNT ?? 0),
					BP_SYSTOLIC: row.NS_SBDP != null ? String(row.NS_SBDP) : '',
					BP_DIASTOLIC: row.NS_EBDP != null ? String(row.NS_EBDP) : '',
					TEMPERATURE: row.NS_TMPBD != null ? String(row.NS_TMPBD) : '',
					BATH: row.PH_BATH_CNT != null ? String(row.PH_BATH_CNT) : ''
				}));

				setPerformanceList(transformed);
				// 선택값 초기화(데이터가 바뀐 경우)
				if (transformed.length === 0) {
					setSelectedBeneficiary('');
					setSelectedBirthday('');
					setSelectedPnum('');
				}
			} else {
				setPerformanceList([]);
				setSelectedBeneficiary('');
				setSelectedBirthday('');
				setSelectedPnum('');
			}
		} catch (err) {
			console.error('서비스실적 조회 오류:', err);
			setPerformanceList([]);
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
	const handleViewDetails = async () => {
		if (!selectedPnum) {
			alert('수급자를 선택해주세요.');
			return;
		}

		const yyyymm = `${selectedYear}${selectedMonth.padStart(2, '0')}`;
		setDetailsBaseRow(performanceList.find((r) => String(r.PNUM ?? '') === String(selectedPnum)) || null);
		setShowDetailsModal(true);
		setDetailsLoading(true);
		setDetailsData(null);
		try {
			const res = await fetch(`/api/f14091?yyyymm=${encodeURIComponent(yyyymm)}&pnum=${encodeURIComponent(selectedPnum)}`);
			const json = await res.json();
			if (json?.success) {
				setDetailsData(json.data || null);
			} else {
				setDetailsData(null);
			}
		} catch (e) {
			console.error('상세내역 조회 오류:', e);
			setDetailsData(null);
		} finally {
			setDetailsLoading(false);
		}
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

	const toDateInput = (v: any): string => {
		if (!v) return '';
		const s = String(v);
		if (s.includes('-')) return s.slice(0, 10);
		if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
		return s.slice(0, 10);
	};

	const yesNoIcon = (v: any) => {
		const s = String(v ?? '').trim();
		const on = s === '1' || s.toUpperCase() === 'Y' || s.toUpperCase() === 'T' || s === 'true';
		return (
			<span className={`inline-flex items-center justify-center w-5 h-5 border border-gray-400 ${on ? 'bg-green-100' : 'bg-gray-200'}`}>
				{on ? '✓' : ''}
			</span>
		);
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
											setSelectedPnum(String(item.PNUM ?? ''));
										}}
										className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
											selectedPnum === String(item.PNUM ?? '') ? 'bg-blue-100' : ''
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

			{/* 상세내역 모달 */}
			{showDetailsModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
					onClick={() => setShowDetailsModal(false)}
				>
					<div
						className="w-[1050px] max-w-[98vw] max-h-[92vh] overflow-auto bg-white border border-blue-400 rounded-lg shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
							<div className="flex-1 text-center text-xl font-semibold tracking-wide text-blue-900">월 서비스실적 조회</div>
							<div className="flex items-center gap-2">
								<button
									className="px-4 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									onClick={handleRegisterCenterOpinion}
								>
									센터소견등록
								</button>
								<button
									className="px-6 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									onClick={() => setShowDetailsModal(false)}
								>
									닫 기
								</button>
							</div>
						</div>

						<div className="p-2 space-y-1">
							{detailsLoading ? (
								<div className="py-10 text-center text-blue-900/60">조회 중...</div>
							) : (
								<>
									{(() => {
										const r = (detailsBaseRow ?? {}) as any;
										const yyNo = (r as any).P_YYNO || '';
										const yyEnd = (r as any).P_YYEDT || '';
										const roomNo = (r as any).ROOM_NO || '';
										const meals = {
											breakfastGood: (r as any).MOST_BT_CNT ?? '',
											breakfastBad: (r as any).MOST_BD_CNT ?? '',
											lunchGood: (r as any).LCST_BT_CNT ?? '',
											lunchBad: (r as any).LCST_BD_CNT ?? '',
											dinnerGood: (r as any).DNST_BT_CNT ?? '',
											dinnerBad: (r as any).DNST_BD_CNT ?? '',
											mSnackGood: (r as any).MGST_BT_CNT ?? '',
											mSnackBad: (r as any).MGST_BD_CNT ?? '',
											aSnackGood: (r as any).AGST_BT_CNT ?? '',
											aSnackBad: (r as any).AGST_BD_CNT ?? ''
										};

										const executeItems1 = [
											{ label: '세면,구강,머리감기,몸단장,옷갈아입기', key: 'PH_HEAD_HELP' },
											{ label: '이동도움 및 신체기능 유지, 증진', key: 'PH_MOVE_HELP' },
											{ label: '체위변경(2시간마다)', key: 'PH_CHANG_HELP' },
											{ label: '산책동행', key: 'PH_WORK_HELP' },
											{ label: '외출동행', key: 'PH_OUT_HELP' }
										];
										const executeItems2 = [
											{ label: '인지관리 지원', key: 'FN_COGN_HELP' },
											{ label: '의사소통도움 및 신체 기능유지 증진', key: 'FN_MOVE_HELP' }
										];
										const executeItems3 = [
											{ label: '신체·인지기능 향상 프로그램', key: 'FN_MIND_HELP' },
											{ label: '신체기능·기본동작 일상생활활동작훈련', key: 'FN_MOVE_HELP' },
											{ label: '인지기능 향상훈련', key: 'FN_MIND_TRAIN' },
											{ label: '물리(작업)치료', key: 'FN_PHY_HELP' }
										];

										return (
											<div className="border border-blue-300 rounded-lg overflow-hidden">
												{/* 상단 기본정보 */}
												<div className="grid grid-cols-12 gap-1 p-2">
													<div className="col-span-6 grid grid-cols-12 gap-1">
														<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">수 급 자</div>
														<div className="col-span-10 border border-blue-300 px-2 py-1 text-sm bg-white">{selectedBeneficiary}</div>

														<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">생 일</div>
														<div className="col-span-4 border border-blue-300 px-2 py-1 text-sm bg-white">{selectedBirthday || toDateInput((r as any).P_BRDT)}</div>
														<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">성 별</div>
														<div className="col-span-4 border border-blue-300 px-2 py-1 text-sm bg-white">{formatGender((r as any).P_SEX || '')}</div>
													</div>

													<div className="col-span-6 grid grid-cols-12 gap-1">
														<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">요양등급</div>
														<div className="col-span-8 border border-blue-300 px-2 py-1 text-sm bg-white">{(r as any).P_GRD || ''}</div>

														<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">장기요양인정번호</div>
														<div className="col-span-8 border border-blue-300 px-2 py-1 text-sm bg-white">{yyNo}</div>

														<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">만료일자</div>
														<div className="col-span-8 border border-blue-300 px-2 py-1 text-sm bg-white">{toDateInput(yyEnd)}</div>
													</div>

													<div className="col-span-12 grid grid-cols-12 gap-1">
														<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">제공일수</div>
														<div className="col-span-2 border border-blue-300 px-2 py-1 text-sm bg-white">{String((r as any).SV_CNT ?? r.PROVIDED_DAYS ?? '')}</div>
														<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">외박일수</div>
														<div className="col-span-2 border border-blue-300 px-2 py-1 text-sm bg-white">{String((r as any).AB_CNT ?? r.OUT_DAYS ?? '')}</div>
														<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">방번호</div>
														<div className="col-span-2 border border-blue-300 px-2 py-1 text-sm bg-white">{roomNo}</div>
													</div>
												</div>

												{/* 식사 집계 */}
												<div className="border-t border-blue-200 p-2 bg-blue-50/20">
													<div className="grid grid-cols-12 gap-1 text-sm">
														{/* 아침 */}
														<div className="col-span-4 grid grid-cols-12 gap-1 items-center">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-blue-900">아침식사</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">양호</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.breakfastGood}</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">이상</div>
															<div className="hidden"></div>
															<div className="hidden"></div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.breakfastBad}</div>
														</div>
														{/* 점심 */}
														<div className="col-span-4 grid grid-cols-12 gap-1 items-center">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-blue-900">점심식사</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">양호</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.lunchGood}</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">이상</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.lunchBad}</div>
														</div>
														{/* 저녁 */}
														<div className="col-span-4 grid grid-cols-12 gap-1 items-center">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-blue-900">저녁식사</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">양호</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.dinnerGood}</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">이상</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.dinnerBad}</div>
														</div>

														{/* 오전간식 */}
														<div className="col-span-4 grid grid-cols-12 gap-1 items-center">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-blue-900">오전간식</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">양호</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.mSnackGood}</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">이상</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.mSnackBad}</div>
														</div>
														{/* 오후간식 */}
														<div className="col-span-4 grid grid-cols-12 gap-1 items-center">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-blue-900">오후간식</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">양호</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.aSnackGood}</div>
															<div className="col-span-3 bg-blue-100 border border-blue-300 px-2 py-1 text-center text-blue-900">이상</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 bg-white text-center">{meals.aSnackBad}</div>
														</div>
													</div>
												</div>

												{/* 중간 서비스 수행/관찰 */}
												<div className="border-t border-blue-200 p-2 grid grid-cols-12 gap-2">
													<div className="col-span-7 space-y-1">
														<div className="space-y-1">
															{executeItems1.map((it) => (
																<div key={it.key} className="flex items-center gap-2">
																	<div className="flex-1 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">{it.label}</div>
																	<div className="flex items-center gap-1 w-16 justify-center">
																		{yesNoIcon((r as any)[it.key])}
																		<span className="text-sm">실시</span>
																	</div>
																</div>
															))}
														</div>
														<div className="space-y-1">
															{executeItems2.map((it) => (
																<div key={it.key} className="flex items-center gap-2">
																	<div className="flex-1 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">{it.label}</div>
																	<div className="flex items-center gap-1 w-16 justify-center">
																		{yesNoIcon((r as any)[it.key])}
																		<span className="text-sm">실시</span>
																	</div>
																</div>
															))}
														</div>

														<div className="grid grid-cols-12 gap-1 items-center pt-0.5">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">평균혈압-(수축)</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 text-sm bg-white text-center">{(r as any).NS_SBDP ?? ''}</div>
															<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">(이완)</div>
															<div className="col-span-2 border border-blue-300 px-2 py-1 text-sm bg-white text-center">{(r as any).NS_EBDP ?? ''}</div>
															<div className="col-span-1 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">체온</div>
															<div className="col-span-1 border border-blue-300 px-2 py-1 text-sm bg-white text-center">{(r as any).NS_TMPBD ?? ''}</div>
														</div>
													</div>

													<div className="col-span-5 space-y-1">
														<div className="grid grid-cols-12 gap-1 items-center">
															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">투약관리</div>
															<div className="col-span-2 flex items-center gap-2">{yesNoIcon((r as any).NS_ETC)}</div>
															<div className="col-span-6"></div>

															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">목창관리</div>
															<div className="col-span-2 flex items-center gap-2">{yesNoIcon((r as any).NS_SORE_CHK)}</div>
															<div className="col-span-6"></div>

															<div className="col-span-4 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">관찰</div>
															<div className="col-span-2 flex items-center gap-2">{yesNoIcon((r as any).NS_MEDI_CHK)}</div>
															<div className="col-span-2 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-center text-blue-900">이상있음</div>
															<div className="col-span-4 border border-blue-300 px-2 py-1 text-sm bg-white text-center">{(r as any).NS_SORE_MNG_NM ?? ''}</div>
														</div>
													</div>
												</div>

												{/* 소견(관찰내역) - 하단으로 내려서 가로폭 넓게 */}
												<div className="border-t border-blue-200 p-2">
													<div className="grid grid-cols-1 gap-1">
														<div className="border border-blue-300 rounded overflow-hidden">
															<div className="px-2 py-1 text-sm font-semibold text-blue-900 bg-blue-100 border-b border-blue-200">신체활동_소견</div>
															<div className="p-2 text-sm whitespace-pre-wrap bg-white h-[130px] overflow-auto">{detailsData?.PH_VIEW || ''}</div>
														</div>
														<div className="border border-blue-300 rounded overflow-hidden">
															<div className="px-2 py-1 text-sm font-semibold text-blue-900 bg-blue-100 border-b border-blue-200">간호치료_소견</div>
															<div className="p-2 text-sm whitespace-pre-wrap bg-white h-[130px] overflow-auto">{detailsData?.NS_VIEW || ''}</div>
														</div>
														<div className="border border-blue-300 rounded overflow-hidden">
															<div className="px-2 py-1 text-sm font-semibold text-blue-900 bg-blue-100 border-b border-blue-200">기능회복_소견</div>
															<div className="p-2 text-sm whitespace-pre-wrap bg-white h-[130px] overflow-auto">{detailsData?.FN_VIEW || ''}</div>
														</div>
														<div className="border border-blue-300 rounded overflow-hidden">
															<div className="px-2 py-1 text-sm font-semibold text-blue-900 bg-blue-100 border-b border-blue-200">인지관리_소견</div>
															<div className="p-2 text-sm whitespace-pre-wrap bg-white h-[130px] overflow-auto">{detailsData?.RG_VIEW || ''}</div>
														</div>
													</div>
												</div>

												{/* 하단 프로그램 */}
												<div className="border-t border-blue-200 p-2 space-y-1 bg-blue-50/20">
													{executeItems3.map((it) => (
														<div key={it.key} className="flex items-center gap-2">
															<div className="flex-1 bg-blue-100 border border-blue-300 px-2 py-1 text-sm text-blue-900">{it.label}</div>
															<div className="flex items-center gap-1 w-16 justify-center">
																{yesNoIcon((r as any)[it.key])}
																<span className="text-sm">실시</span>
															</div>
														</div>
													))}
												</div>
											</div>
										);
									})()}
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
