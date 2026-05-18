export interface AttendancePrintRow {
	EMPNM?: string;
	WDT?: string;
	WGU?: string;
	HODES?: string;
	STM?: string;
	ETM?: string;
	JOBADD?: string;
	JOBSH?: string;
}

const DAY_NAMES_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function getDayOfWeekKo(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00`);
	if (isNaN(d.getTime())) return "";
	return DAY_NAMES_KO[d.getDay()] ?? "";
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function nbsp(v: string): string {
	const t = String(v ?? "").trim();
	return t ? escapeHtml(t) : "&nbsp;";
}

/** 목록·출력용 근무구분 텍스트 */
export function classifyAttendanceDisplay(row: AttendancePrintRow): string {
	const wgu = String(row.WGU ?? "").trim();
	const hodes = String(row.HODES ?? "").trim();
	if (!wgu) return "근무";
	if (wgu === "4") return "정기휴일";
	if (wgu === "6") return "결근";
	if (wgu === "2") return hodes.includes("월") ? "월차" : "년차";
	if (wgu === "5") return hodes.includes("월") ? "월차" : "년차";
	if (wgu === "9") {
		if (/병/.test(hodes)) return "병가";
		if (/경조/.test(hodes)) return "경조사";
		return "대휴";
	}
	return "근무";
}

/** 하단 집계용 (출근 = 근무) */
function classifyAttendanceSummary(row: AttendancePrintRow): string {
	const label = classifyAttendanceDisplay(row);
	if (label === "근무") return "출근";
	return label;
}

function buildSummaryCounts(rows: AttendancePrintRow[]): Record<string, number> {
	const keys = ["출근", "년차", "월차", "정기휴일", "병가", "대휴", "경조사", "결근"];
	const counts: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
	for (const row of rows) {
		const key = classifyAttendanceSummary(row);
		if (key in counts) counts[key] += 1;
	}
	return counts;
}

export function buildDailyAttendancePrintHtml(
	workDateStr: string,
	dayOfWeek: string,
	rows: AttendancePrintRow[],
): string {
	const sorted = [...rows].sort((a, b) =>
		String(a.EMPNM ?? "").localeCompare(String(b.EMPNM ?? ""), "ko"),
	);
	const counts = buildSummaryCounts(sorted);

	const bodyRows = sorted
		.map((row) => {
			const cls = classifyAttendanceDisplay(row);
			const stm = String(row.STM ?? "").trim();
			const etm = String(row.ETM ?? "").trim();
			return `<tr>
        <td class="c-name">${nbsp(String(row.EMPNM ?? ""))}</td>
        <td class="c-cls">${nbsp(cls)}</td>
        <td class="c-time">${nbsp(stm)}</td>
        <td class="c-tilde">~</td>
        <td class="c-time">${nbsp(etm)}</td>
        <td class="c-reason">${nbsp(String(row.HODES ?? ""))}</td>
        <td class="c-loc">${nbsp(String(row.JOBADD ?? ""))}</td>
        <td class="c-type">${nbsp(String(row.JOBSH ?? ""))}</td>
      </tr>`;
		})
		.join("");

	const summaryLine = [
		"출근",
		"년차",
		"월차",
		"정기휴일",
		"병가",
		"대휴",
		"경조사",
		"결근",
	]
		.map((k) => `${k}: ${counts[k] ?? 0}`)
		.join("&nbsp;&nbsp;&nbsp;&nbsp;");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>일 사원출근부</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', Batang, serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
    }
    .wrap { width: 100%; max-width: 186mm; margin: 0 auto; }
    .head { position: relative; margin-bottom: 10px; min-height: 52px; }
    .title {
      text-align: center;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      padding-top: 4px;
    }
    .approve {
      position: absolute;
      top: 0;
      right: 0;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .approve th, .approve td {
      border: 1px solid #000;
      padding: 4px 14px;
      text-align: center;
      font-weight: 400;
    }
    .approve th { background: #fff; }
    .approve td { height: 36px; }
    .date-line {
      margin: 8px 0 10px 0;
      font-size: 11pt;
    }
    table.main {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.main thead th {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 6px 4px;
      font-weight: 400;
      text-align: center;
      font-size: 10.5pt;
    }
    table.main tbody td {
      border-bottom: 1px solid #000;
      padding: 5px 4px;
      text-align: center;
      font-size: 10.5pt;
      vertical-align: middle;
      word-break: break-word;
    }
    table.main .c-name { width: 12%; }
    table.main .c-cls { width: 10%; }
    table.main .c-time { width: 10%; }
    table.main .c-tilde { width: 4%; }
    table.main .c-reason { width: 16%; }
    table.main .c-loc { width: 22%; }
    table.main .c-type { width: 16%; }
    .summary {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #000;
      font-size: 10.5pt;
      text-align: left;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <table class="approve">
        <tr>
          <th>담당</th>
          <th>검토</th>
          <th>결재</th>
        </tr>
        <tr><td></td><td></td><td></td></tr>
      </table>
      <h1 class="title">일 사원출근부</h1>
    </div>
    <div class="date-line">근무일자: ${escapeHtml(workDateStr)} ${escapeHtml(dayOfWeek)}</div>
    <table class="main">
      <thead>
        <tr>
          <th>직원명</th>
          <th>근무구분</th>
          <th>출근시간</th>
          <th>~</th>
          <th>퇴근시간</th>
          <th>휴무사유</th>
          <th>근무위치</th>
          <th>근무형태</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows || `<tr><td colspan="8">&nbsp;</td></tr>`}
      </tbody>
    </table>
    <div class="summary">${summaryLine}</div>
  </div>
</body>
</html>`;
}

export interface MonthlyEmployeePrintSection {
	empnm: string;
	rows: AttendancePrintRow[];
}

function buildMonthlySummaryDisplay(counts: Record<string, number>): { line1: string; line2: string } {
	const 연차 = counts["년차"] ?? 0;
	const line1 = [
		`출근: ${counts["출근"] ?? 0}`,
		`연차: ${연차}`,
		`월차: ${counts["월차"] ?? 0}`,
		`정기휴일: ${counts["정기휴일"] ?? 0}`,
		`대휴: ${counts["대휴"] ?? 0}`,
	].join("&nbsp;&nbsp;&nbsp;&nbsp;");
	const line2 = [
		`병가: ${counts["병가"] ?? 0}`,
		`경조사: ${counts["경조사"] ?? 0}`,
		`결근: ${counts["결근"] ?? 0}`,
	].join("&nbsp;&nbsp;&nbsp;&nbsp;");
	return { line1, line2 };
}

/** 사원별 1페이지 월 사원출근부 */
export function buildMonthlyAttendancePrintHtml(
	startDateStr: string,
	endDateStr: string,
	sections: MonthlyEmployeePrintSection[],
): string {
	const pages = sections
		.map((section) => {
			const sorted = [...section.rows].sort((a, b) =>
				String(a.WDT ?? "").localeCompare(String(b.WDT ?? "")),
			);
			const counts = buildSummaryCounts(sorted);
			const { line1, line2 } = buildMonthlySummaryDisplay(counts);
			const rowCount = Math.max(sorted.length, 1);
			const nameCell = `<td class="c-name" rowspan="${rowCount}">${nbsp(section.empnm)}</td>`;

			const bodyRows =
				sorted.length > 0
					? sorted
							.map((row, idx) => {
								const wdt = String(row.WDT ?? "").trim();
								const cls = classifyAttendanceDisplay(row);
								const stm = String(row.STM ?? "").trim();
								const etm = String(row.ETM ?? "").trim();
								const nameTd = idx === 0 ? nameCell : "";
								return `<tr>
        ${nameTd}
        <td class="c-date">${nbsp(wdt)}</td>
        <td class="c-dow">${nbsp(getDayOfWeekKo(wdt))}</td>
        <td class="c-cls">${nbsp(cls)}</td>
        <td class="c-time">${nbsp(stm)}</td>
        <td class="c-tilde">~</td>
        <td class="c-time">${nbsp(etm)}</td>
        <td class="c-reason">${nbsp(String(row.HODES ?? ""))}</td>
      </tr>`;
							})
							.join("")
					: `<tr>
        ${nameCell}
        <td class="c-date">&nbsp;</td>
        <td class="c-dow">&nbsp;</td>
        <td class="c-cls">&nbsp;</td>
        <td class="c-time">&nbsp;</td>
        <td class="c-tilde">~</td>
        <td class="c-time">&nbsp;</td>
        <td class="c-reason">&nbsp;</td>
      </tr>`;

			return `<div class="page">
    <div class="head">
      <table class="approve">
        <tr>
          <th>담당</th>
          <th>검토</th>
          <th>결재</th>
        </tr>
        <tr><td></td><td></td><td></td></tr>
      </table>
      <h1 class="title">월 사원출근부</h1>
    </div>
    <div class="period-line">근무기간: ${escapeHtml(startDateStr)} ~ ${escapeHtml(endDateStr)}</div>
    <table class="main">
      <thead>
        <tr>
          <th>직원명</th>
          <th>근무일자</th>
          <th>요일</th>
          <th>근무구분</th>
          <th>출근시간</th>
          <th>~</th>
          <th>퇴근시간</th>
          <th>휴무사유</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <div class="summary">
      <div class="summary-row">${line1}</div>
      <div class="summary-row">${line2}</div>
    </div>
  </div>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>월 사원출근부</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', Batang, serif;
      font-size: 10.5pt;
      color: #000;
      background: #fff;
    }
    .page {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .head { position: relative; margin-bottom: 8px; min-height: 48px; }
    .title {
      text-align: center;
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-decoration: underline;
      padding-top: 2px;
    }
    .approve {
      position: absolute;
      top: 0;
      right: 0;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .approve th, .approve td {
      border: 1px solid #000;
      padding: 3px 12px;
      text-align: center;
      font-weight: 400;
    }
    .approve td { height: 32px; }
    .period-line { margin: 6px 0 8px 0; font-size: 10.5pt; }
    table.main {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.main thead th {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 5px 3px;
      font-weight: 400;
      text-align: center;
      font-size: 10pt;
    }
    table.main tbody td {
      border-bottom: 1px solid #000;
      padding: 4px 3px;
      text-align: center;
      font-size: 10pt;
      vertical-align: middle;
      word-break: break-word;
    }
    table.main .c-name { width: 9%; }
    table.main .c-date { width: 11%; }
    table.main .c-dow { width: 9%; }
    table.main .c-cls { width: 10%; }
    table.main .c-time { width: 9%; }
    table.main .c-tilde { width: 3%; }
    table.main .c-reason { width: 22%; }
    .summary {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #000;
      font-size: 10pt;
    }
    .summary-row { margin-bottom: 4px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

export function openPrintPreviewWindow(html: string): void {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		alert("팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.");
		return;
	}
	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
	setTimeout(() => {
		printWindow.focus();
		printWindow.print();
	}, 250);
}
