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

	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

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

	// 월 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
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

	const escapeHtml = (v: any) =>
		String(v ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');

	const toYyyymm = () => `${selectedYear}${selectedMonth.padStart(2, '0')}`;

	const fmtDate10 = (digits: any) => {
		const s = String(digits ?? '').replace(/\D/g, '');
		if (s.length < 8) return '';
		const d = s.slice(0, 8); // ISO/Datetime 포함돼도 YYYYMMDD만 사용
		return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
	};

	const ynMark = (v: any) => {
		const s = String(v ?? '').trim();
		const yes = s === '1' || s.toUpperCase() === 'Y' || s === 'true';
		return yes ? 'V' : '';
	};

	const fetchDetailsForPrint = async (pnum: string, yyyymm: string) => {
		try {
			const res = await fetch(`/api/f14091?yyyymm=${encodeURIComponent(yyyymm)}&pnum=${encodeURIComponent(pnum)}`);
			const json = await res.json();
			if (json?.success) return json.data || null;
			return null;
		} catch (e) {
			console.error('출력용 상세내역 조회 오류:', e);
			return null;
		}
	};

	const fetchOrgForPrint = async () => {
		try {
			const res = await fetch('/api/f00110');
			const json = await res.json();
			if (json?.success && Array.isArray(json.data)) return json.data[0] || null;
			return null;
		} catch (e) {
			console.error('출력용 기관정보 조회 오류:', e);
			return null;
		}
	};

	const renderPrintPage = (row: ServicePerformanceData, details: any | null, org: any | null) => {
		const r = (row ?? {}) as any;
		const yyyymm = toYyyymm();
		const o = (org ?? {}) as any;

		const orgNo = o.ANGH ?? '';
		const orgName = o.ANNM ?? '';
		const orgOwner = o.TAXOWN ?? '';
		const orgAddr = o.TAXADD ?? o.ANADD ?? '';
		const orgBizNo = o.TAXNUM ?? '';
		const orgTel = o.ANTEL ?? '';
		const orgZip = o.ANZIP ?? '';
		const periodStart = r.SVDT ?? r.ANSDT ?? '';
		const periodEnd = r.EVDT ?? r.EDVT ?? r.ANEDT ?? '';

		const mealKind = r.PH_MEAL_KIND_NM ?? r.PH_MEAL_VAL_NM ?? r.PH_MEAL_KIND ?? '';
		const meals = {
			breakfastGood: r.MOST_BT_CNT ?? '',
			breakfastBad: r.MOST_BD_CNT ?? '',
			lunchGood: r.LCST_BT_CNT ?? '',
			lunchBad: r.LCST_BD_CNT ?? '',
			dinnerGood: r.DNST_BT_CNT ?? '',
			dinnerBad: r.DNST_BD_CNT ?? '',
			mSnackGood: r.MGST_BT_CNT ?? '',
			mSnackBad: r.MGST_BD_CNT ?? '',
			aSnackGood: r.AGST_BT_CNT ?? '',
			aSnackBad: r.AGST_BD_CNT ?? ''
		};

		const exec1 = [
			{ label: '세면, 구강, 머리감기, 몸단장, 옷갈아입기', key: 'PH_HEAD_HELP' },
			{ label: '이동도움 및 신체기능 유지, 증진', key: 'PH_MOVE_HELP' },
			{ label: '체위변경(2시간마다)', key: 'PH_CHANG_HELP' },
			{ label: '산책(외출) 동행', key: 'PH_WORK_HELP' }
		];
		const exec2 = [
			{ label: '인지관리 지원', key: 'FN_COGN_HELP' },
			{ label: '의사소통 도움 및 신체기능 유지', key: 'FN_MOVE_HELP' }
		];
		const exec3 = [
			{ label: '신체·인지기능 향상 프로그램', key: 'FN_MIND_HELP' },
			{ label: '기본동작 등 일상생활 동작훈련', key: 'FN_MOVE_HELP' },
			{ label: '인지기능 향상훈련', key: 'FN_MIND_TRAIN' },
			{ label: '물리(작업)치료', key: 'FN_PHY_HELP' }
		];

		const svCnt = String(r.SV_CNT ?? row.PROVIDED_DAYS ?? '');
		const abCnt = String(r.AB_CNT ?? row.OUT_DAYS ?? '');

		const bathCnt = r.PH_BATH_CNT ?? '';
		const bathMeth = r.PH_BATH_METH_NM ?? r.PH_BATH_METH ?? '';

		const execRow = (label: string, key: string) =>
			`<div class="exec"><span class="execLabel">${escapeHtml(label)}</span><span class="execBox">${ynMark(
				r[key]
			)}</span><span class="execText">실시</span></div>`;

		const memo = (v: any) => escapeHtml(v || '');

		return `
<section class="page">
	<table class="sheet sheet6">
		<colgroup>
			<col style="width:12%">
			<col style="width:26%">
			<col style="width:12%">
			<col style="width:26%">
			<col style="width:12%">
			<col style="width:12%">
		</colgroup>
		<tr>
			<th class="title" colspan="6">장기요양 제공기록(${escapeHtml(yyyymm)})</th>
		</tr>
		<tr>
			<th class="headLabel">장기요양<br/>기관번호</th>
			<td>${escapeHtml(orgNo)}</td>
			<th class="headLabel">장기요양<br/>기관명</th>
			<td>${escapeHtml(orgName)}</td>
			<th class="headLabel">대표자</th>
			<td class="center">${escapeHtml(orgOwner)}</td>
		</tr>
		<tr>
			<th class="headLabel">주소</th>
			<td colspan="3">${escapeHtml(orgZip ? `(${orgZip}) ${orgAddr}` : orgAddr)}</td>
			<th class="headLabel">사업자<br/>등록번호</th>
			<td class="center">${escapeHtml(orgBizNo)}</td>
		</tr>
		<tr>
			<th class="headLabel">성명</th>
			<td>${escapeHtml(row.P_NM || '')}</td>
			<th class="headLabel">장기요양<br/>인정번호</th>
			<td>${escapeHtml(r.P_YYNO || '')}</td>
			<th class="headLabel">급여년월</th>
			<td class="center">${escapeHtml(`${selectedYear}-${selectedMonth.padStart(2, '0')}`)}</td>
		</tr>
		<tr>
			<th class="headLabel">가입번호</th>
			<td>${escapeHtml(r.P_NO ?? '')}</td>
			<th class="headLabel">급여제공기간</th>
			<td>${escapeHtml(`${fmtDate10(periodStart)} ${fmtDate10(periodEnd)}`)}</td>
			<th class="headLabel">서비스<br/>일일수</th>
			<td class="center">${escapeHtml(svCnt)}</td>
		</tr>
		<tr>
			<th class="headLabel">연락처</th>
			<td>${escapeHtml(r.P_TEL ?? '')}</td>
			<th class="headLabel">외박일수</th>
			<td class="center">${escapeHtml(abCnt)}</td>
			<th class="headLabel"></th>
			<td></td>
		</tr>

		<tr>
			<th class="secLabel">식사<br/>현황</th>
			<td colspan="5" class="noPad">
				<table class="inner">
					<tr>
						<th class="headLabel innerLabel" style="width:18%">식사종류</th>
						<td colspan="9">${escapeHtml(mealKind)}</td>
					</tr>
					<tr>
						<th class="subHead" colspan="2">아침식사</th>
						<th class="subHead" colspan="2">점심식사</th>
						<th class="subHead" colspan="2">저녁식사</th>
						<th class="subHead" colspan="2">오전간식</th>
						<th class="subHead" colspan="2">오후간식</th>
					</tr>
					<tr>
						<th class="sub2 center">양호</th><th class="sub2 center">이상</th>
						<th class="sub2 center">양호</th><th class="sub2 center">이상</th>
						<th class="sub2 center">양호</th><th class="sub2 center">이상</th>
						<th class="sub2 center">양호</th><th class="sub2 center">이상</th>
						<th class="sub2 center">양호</th><th class="sub2 center">이상</th>
					</tr>
					<tr>
						<td class="center">${escapeHtml(meals.breakfastGood)}</td><td class="center">${escapeHtml(meals.breakfastBad)}</td>
						<td class="center">${escapeHtml(meals.lunchGood)}</td><td class="center">${escapeHtml(meals.lunchBad)}</td>
						<td class="center">${escapeHtml(meals.dinnerGood)}</td><td class="center">${escapeHtml(meals.dinnerBad)}</td>
						<td class="center">${escapeHtml(meals.mSnackGood)}</td><td class="center">${escapeHtml(meals.mSnackBad)}</td>
						<td class="center">${escapeHtml(meals.aSnackGood)}</td><td class="center">${escapeHtml(meals.aSnackBad)}</td>
					</tr>
				</table>
			</td>
		</tr>

		<tr>
			<th class="secLabel">신체<br/>활동</th>
			<td colspan="5" class="noPad">
				<table class="inner phys">
					<colgroup>
						<col style="width:82%"><col style="width:18%">
					</colgroup>
					<tr><td>${escapeHtml('세면, 구강, 머리감기, 몸단장, 옷 갈아입기')}</td><td class="center">실시</td></tr>
					<tr><td>${escapeHtml('이동도움 및 신체기능 유지 · 증진')}</td><td class="center">실시</td></tr>
					<tr><td>${escapeHtml('체위변경(2시간마다)')}</td><td class="center">실시</td></tr>
					<tr><td>${escapeHtml('산책(외출)동행')}</td><td class="center">실시</td></tr>
					<tr>
						<td colspan="2" class="noPad">
							<table class="inner">
								<colgroup>
									<col style="width:18%"><col style="width:32%"><col style="width:18%"><col style="width:32%">
								</colgroup>
								<tr>
									<th class="headLabel">목욕횟수</th>
									<td class="center">${escapeHtml(bathCnt)}</td>
									<th class="headLabel">목욕방법</th>
									<td>${escapeHtml(bathMeth)}</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<th class="secLabel">신체<br/>활동<br/>소견</th>
			<td colspan="5" class="memoTall">${memo(details?.PH_VIEW)}</td>
		</tr>

		<tr>
			<th class="secLabel" rowspan="2">인지<br/>관리<br/>및<br/>소견</th>
			<td colspan="5" class="noPad">
				<table class="inner cog">
					<colgroup>
						<col style="width:41%"><col style="width:9%"><col style="width:41%"><col style="width:9%">
					</colgroup>
					<tr>
						<td>${escapeHtml('인지관리 지원')}</td>
						<td class="chk">${ynMark(r.FN_COGN_HELP)}</td>
						<td>${escapeHtml('의사소통도움 등 말벗, 격려')}</td>
						<td class="chk">${ynMark((r as any).RG_TALK_HELP ?? (r as any).RG_AID_HELP ?? '')}</td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<td colspan="5" class="memoTall">${memo(details?.RG_VIEW)}</td>
		</tr>

		<tr>
			<th class="secLabel">간호<br/>및<br/>건강</th>
			<td colspan="5" class="noPad">
				<table class="inner nurse">
					<colgroup>
						<col style="width:20%">
						<col style="width:50%">
						<col style="width:15%">
						<col style="width:15%">
					</colgroup>
					<tr>
						<th class="headLabel">혈압 현황</th>
						<td class="center">${escapeHtml(r.NS_SBDP ?? '')} ~ ${escapeHtml(r.NS_EBDP ?? '')}</td>
						<th class="headLabel">체온</th>
						<td class="center">${escapeHtml(r.NS_TMPBD ?? '')}</td>
					</tr>
					<tr>
						<th class="headLabel">건강관리</th>
						<td colspan="3">${escapeHtml((r as any).NS_HEALTH_HELP_NM ?? '')}</td>
					</tr>
					<tr>
						<th class="headLabel">간호관리</th>
						<td colspan="3">${escapeHtml((r as any).NS_NURSE_HELP_NM ?? '')}</td>
					</tr>
					<tr>
						<th class="headLabel">기타(응급)</th>
						<td colspan="3">${escapeHtml((r as any).NS_ETC_NM ?? (r as any).NS_ETC_DESC ?? '')}</td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<th class="secLabel">간호<br/>소견</th>
			<td colspan="5" class="memoTall">${memo(details?.NS_VIEW)}</td>
		</tr>

		<tr>
			<th class="secLabel">기능<br/>회복</th>
			<td colspan="5" class="noPad">
				<table class="inner func">
					<colgroup>
						<col style="width:82%"><col style="width:18%">
					</colgroup>
					<tr><td>${escapeHtml('신체 · 인지기능 향상 프로그램')}</td><td class="center">실시</td></tr>
					<tr><td>${escapeHtml('신체기능 · 기본동작 일상생활 동작훈련')}</td><td class="center">실시</td></tr>
					<tr><td>${escapeHtml('인지기능 향상훈련')}</td><td class="center">실시</td></tr>
					<tr><td>${escapeHtml('물리(작업)치료')}</td><td class="center">실시</td></tr>
				</table>
			</td>
		</tr>
		<tr>
			<th class="secLabel">기능<br/>회복<br/>소견</th>
			<td colspan="5" class="memoTall">${memo(details?.FN_VIEW)}</td>
		</tr>
	</table>
</section>
		`;
	};

	// 개별출력
	const handlePrintIndividual = async (rowOverride?: ServicePerformanceData) => {
		const selectedData =
			rowOverride ?? performanceList.find((item) => String(item.PNUM ?? '') === String(selectedPnum ?? '')) ?? null;
		if (!selectedData) {
			alert('출력할 수급자를 선택해주세요.');
			return;
		}

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		const yyyymm = toYyyymm();
		const org = await fetchOrgForPrint();
		const details = await fetchDetailsForPrint(String(selectedData.PNUM ?? ''), yyyymm);
		const pageHtml = renderPrintPage(selectedData, details, org);

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>장기요양 제공기록 - 개별출력</title>
	<style>
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
		@page { size: A4 portrait; margin: 8mm; }
		.page { page-break-after: always; }
		.page:last-child { page-break-after: auto; }
		.sheet { width: 100%; border-collapse: collapse; table-layout: fixed; }
		.sheet th, .sheet td { border: 1px solid #000; padding: 3px 4px; vertical-align: middle; font-size: 9pt; word-break: break-word; overflow-wrap: anywhere; }
		.title { font-size: 13.5pt; font-weight: 700; text-align: center; padding: 8px 0; }
		.headLabel { background: #f3f3f3; font-weight: 700; text-align: center; }
		.secLabel { background: #f3f3f3; font-weight: 700; text-align: center; }
		.subHead { background: #f3f3f3; font-weight: 700; text-align: center; }
		.sub2 { background: #fafafa; font-weight: 700; }
		.center { text-align: center; }
		.pad { padding: 6px 8px; }
		.memoTall { padding: 8px; height: 95px; vertical-align: top; white-space: pre-wrap; }
		.spacer { height: 6px; }
		.exec { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
		.execLabel { flex: 1; min-width: 0; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
		.execBox { width: 22px; height: 18px; line-height: 18px; border: 1px solid #000; text-align: center; }
		.execText { width: 34px; }
		.sheet6 td, .sheet6 th { line-height: 1.25; }
		.noPad { padding: 0 !important; }
		.inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
		.inner th, .inner td { border: 1px solid #000; padding: 3px 4px; font-size: 9pt; vertical-align: middle; }
		.inner3 td { padding: 3px 6px; }
		.chk { text-align: center; font-weight: 700; }
		.phys td { padding: 4px 8px; }
		.cog td { padding: 4px 8px; }
		.nurse td { padding: 4px 8px; }
		.func td { padding: 4px 8px; }
		.func td { padding: 4px 8px; }
		.nurse td { padding: 4px 8px; }
		.cog td { padding: 4px 8px; }
		.phys td { padding: 4px 8px; }
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
			html, body { height: auto !important; }
		}
	</style>
</head>
<body>
	${pageHtml}
</body>
</html>
		`;

		printWindow.document.write(printHTML);
		printWindow.document.close();
		setTimeout(() => {
			try {
				printWindow.focus();
				printWindow.print();
			} catch {}
		}, 250);
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

		const yyyymm = toYyyymm();
		const rows = performanceList.slice();
		const org = await fetchOrgForPrint();

		const detailsList = await Promise.allSettled(
			rows.map((it) => fetchDetailsForPrint(String(it.PNUM ?? ''), yyyymm))
		);

		const pagesHtml = rows
			.map((row, idx) => {
				const details = detailsList[idx].status === 'fulfilled' ? (detailsList[idx] as any).value : null;
				return renderPrintPage(row, details, org);
			})
			.join('');

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>장기요양 제공기록 - 전체출력</title>
	<style>
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
		@page { size: A4 portrait; margin: 8mm; }
		.page { page-break-after: always; }
		.page:last-child { page-break-after: auto; }
		.sheet { width: 100%; border-collapse: collapse; table-layout: fixed; }
		.sheet th, .sheet td { border: 1px solid #000; padding: 3px 4px; vertical-align: middle; font-size: 9pt; word-break: break-word; overflow-wrap: anywhere; }
		.title { font-size: 13.5pt; font-weight: 700; text-align: center; padding: 8px 0; }
		.headLabel { background: #f3f3f3; font-weight: 700; text-align: center; }
		.secLabel { background: #f3f3f3; font-weight: 700; text-align: center; }
		.subHead { background: #f3f3f3; font-weight: 700; text-align: center; }
		.sub2 { background: #fafafa; font-weight: 700; }
		.center { text-align: center; }
		.pad { padding: 6px 8px; }
		.memoTall { padding: 8px; height: 95px; vertical-align: top; white-space: pre-wrap; }
		.spacer { height: 6px; }
		.exec { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
		.execLabel { flex: 1; min-width: 0; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
		.execBox { width: 22px; height: 18px; line-height: 18px; border: 1px solid #000; text-align: center; }
		.execText { width: 34px; }
		.sheet6 td, .sheet6 th { line-height: 1.25; }
		.noPad { padding: 0 !important; }
		.inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
		.inner th, .inner td { border: 1px solid #000; padding: 3px 4px; font-size: 9pt; vertical-align: middle; }
		.inner3 td { padding: 3px 6px; }
		.chk { text-align: center; font-weight: 700; }
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
			html, body { height: auto !important; }
		}
	</style>
</head>
<body>
	${pagesHtml}
</body>
</html>
		`;

		printWindow.document.write(printHTML);
		printWindow.document.close();
		setTimeout(() => {
			try {
				printWindow.focus();
				printWindow.print();
			} catch {}
		}, 250);
	};

	// 상세내역
	const handleViewDetails = async (pnumOverride?: string, baseRowOverride?: ServicePerformanceData | null) => {
		const p = (pnumOverride ?? selectedPnum ?? '').trim();
		if (!p) {
			alert('수급자를 선택해주세요.');
			return;
		}

		const yyyymm = `${selectedYear}${selectedMonth.padStart(2, '0')}`;
		const fallbackRow = performanceList.find((r) => String(r.PNUM ?? '') === String(p)) || null;
		setDetailsBaseRow(baseRowOverride ?? fallbackRow);
		setShowDetailsModal(true);
		setDetailsLoading(true);
		setDetailsData(null);
		try {
			const res = await fetch(`/api/f14091?yyyymm=${encodeURIComponent(yyyymm)}&pnum=${encodeURIComponent(p)}`);
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

	// 페이지네이션
	const totalPages = Math.ceil(performanceList.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentItems = performanceList.slice(startIndex, endIndex);

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
								onClick={handlePrintAll}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								전체출력
							</button>
							<button
								onClick={handleAggregate}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								서비스실적집계(미개발)
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

			{/* 메인 테이블 영역 (하단 공백 방지: 내용 높이만큼만) */}
			<div className="overflow-auto border-b border-blue-200">
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
								<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">목욕</th>
								<th className="px-3 py-2 font-semibold text-center text-blue-900 whitespace-nowrap">개별출력</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={12} className="px-3 py-4 text-center text-blue-900/60">로딩 중...</td>
								</tr>
							) : performanceList.length === 0 ? (
								<tr>
									<td colSpan={12} className="px-3 py-4 text-center text-blue-900/60">데이터가 없습니다</td>
								</tr>
							) : (
								currentItems.map((item, index) => (
									<tr
										key={index}
										onClick={() => {
											const p = String(item.PNUM ?? '');
											setSelectedBeneficiary(item.P_NM || '');
											setSelectedBirthday(formatDate(item.P_BRDT || ''));
											setSelectedPnum(p);
											handleViewDetails(p, item);
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
										<td className="px-3 py-2 text-center text-blue-900 border-r border-blue-100">{item.BATH || '-'}</td>
										<td className="px-3 py-2 text-center">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handlePrintIndividual(item);
												}}
												className="px-3 py-1 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
											>
												출력
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* 페이지네이션 */}
			{totalPages > 1 && (
				<div className="p-3 border-b border-blue-200 bg-white">
					<div className="flex items-center justify-center gap-1">
						<button
							onClick={() => setCurrentPage(1)}
							disabled={currentPage === 1}
							className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
						>
							&lt;&lt;
						</button>
						<button
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
						>
							&lt;
						</button>

						{Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
							const start = Math.max(1, Math.min(totalPages - 6, currentPage - 3));
							const pageNum = start + i;
							if (pageNum > totalPages) return null;
							return (
								<button
									key={pageNum}
									onClick={() => setCurrentPage(pageNum)}
									className={`px-2 py-1 text-xs border rounded ${
										currentPage === pageNum ? 'bg-blue-500 text-white border-blue-500' : 'border-blue-300 hover:bg-blue-50'
									}`}
								>
									{pageNum}
								</button>
							);
						})}

						<button
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
						>
							&gt;
						</button>
						<button
							onClick={() => setCurrentPage(totalPages)}
							disabled={currentPage === totalPages}
							className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
						>
							&gt;&gt;
						</button>
						<span className="ml-4 text-xs text-blue-900/80">
							{performanceList.length > 0
								? `${startIndex + 1}-${Math.min(endIndex, performanceList.length)} / ${performanceList.length}`
								: '0 / 0'}
						</span>
					</div>
				</div>
			)}

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
							onClick={() => handlePrintIndividual()}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							개별출력
						</button>
						{/* 상세내역 버튼 제거: 목록에서 수급자 클릭 시 모달 오픈 */}
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
