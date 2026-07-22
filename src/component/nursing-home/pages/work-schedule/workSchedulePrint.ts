/** 근무일정 현황표 인쇄 헬퍼 (F02010 기반)
 * WGU: 1=근무, 2=연차, 3=월차, 4=정기, 5=대휴, 6=병가, 7=경조사, 9=결근
 */

export type WorkSchedulePrintRow = {
	EMPNM?: string;
	JOB?: string;
	WDT?: string;
	JOBADD?: string;
	JOBSH?: string;
	WGU?: string;
	HODES?: string;
	STM?: string;
	ETM?: string;
};

const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** WGU 정규화: 빈값 → "1"(근무) */
export function normalizeWguCode(wgu?: string): string {
	const w = String(wgu ?? "").trim();
	if (!w) return "1";
	return w;
}

/** 화면 표기 (글자만) */
export function wguStatusLabel(wgu?: string): string {
	const code = normalizeWguCode(wgu);
	switch (code) {
		case "1":
			return "근무";
		case "2":
			return "연차";
		case "3":
			return "월차";
		case "4":
			return "정기휴무";
		case "5":
			return "대휴";
		case "6":
			return "병가";
		case "7":
			return "경조사";
		case "9":
			return "결근";
		default:
			return code;
	}
}

/** JOBSH: 1=주간, 2=야간, 3=심야 */
export function normalizeJobsh(code?: string): string {
	const c = String(code ?? "").trim();
	if (c === "1" || c === "2" || c === "3") return c;
	if (c === "주간") return "1";
	if (c === "야간") return "2";
	if (c === "심야" || c === "저녁") return "3";
	return "";
}

export function jobshLabel(code?: string): string {
	const c = normalizeJobsh(code);
	if (c === "1") return "주간";
	if (c === "2") return "야간";
	if (c === "3") return "심야";
	return String(code ?? "").trim() || "";
}

/** 출력용 짧은 표기: 주 / 야 / 심 */
export function jobshPrintShort(code?: string): string {
	const c = normalizeJobsh(code);
	if (c === "1") return "주";
	if (c === "2") return "야";
	if (c === "3") return "심";
	return "";
}

/** 툴팁용 상세 */
export function leaveDisplayLabel(wgu?: string, hodes?: string): string {
	const label = wguStatusLabel(wgu);
	const h = String(hodes ?? "").trim();
	if (h && h !== label) return `${label} (${h})`;
	return label;
}

/** 현황표 셀 표시 — 근무면 JOBSH(주간/야간/심야), 그 외는 휴무구분 */
export function scheduleCellLabel(row: WorkSchedulePrintRow): string {
	const wgu = normalizeWguCode(row.WGU);
	if (wgu === "1") {
		return jobshLabel(row.JOBSH) || "주간";
	}
	return wguStatusLabel(row.WGU);
}

/**
 * 출력용 기호
 * 1 근무: 파란 글씨 주/야/심 (JOBSH)
 * 2 연차: 빨간 "연"
 * 3 월차: 빨간 "월"
 * 4 정기휴무: 주황 동그라미
 * 5 대휴: 빨간 "대"
 * 6 병가: 빨간 굵은 "병"
 * 7 경조사: 빨간 별 ✮
 * 9 결근: 빨간 세모
 */
export function wguPrintMarkHtml(row: WorkSchedulePrintRow | string): string {
	const wguRaw = typeof row === "string" ? row : row.WGU;
	const jobsh = typeof row === "string" ? undefined : row.JOBSH;
	const code = normalizeWguCode(wguRaw);
	const title = wguStatusLabel(code);
	switch (code) {
		case "1": {
			const short = jobshPrintShort(jobsh) || "주";
			const shiftTitle = jobshLabel(jobsh) || "주간";
			return `<span class="mark mark-shift-blue" title="${shiftTitle}">${short}</span>`;
		}
		case "2":
			return `<span class="mark mark-text-red" title="${title}">연</span>`;
		case "3":
			return `<span class="mark mark-text-red" title="${title}">월</span>`;
		case "4":
			return `<span class="mark mark-orange-circle" title="${title}"></span>`;
		case "5":
			return `<span class="mark mark-text-red" title="${title}">대</span>`;
		case "6":
			return `<span class="mark mark-sick" title="${title}">병</span>`;
		case "7":
			return `<span class="mark mark-star" title="${title}">✮</span>`;
		case "9":
			return `<span class="mark mark-triangle" title="${title}"></span>`;
		default:
			return escapeHtml(code);
	}
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

function formatYmd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function buildWorkScheduleStatusPrintHtml(opts: {
	year: number;
	month: number;
	dates: Date[];
	employees: { EMPNO: number; EMPNM: string; JOB?: string }[];
	scheduleMap: Record<string, WorkSchedulePrintRow>;
}): string {
	const { year, month, dates, employees, scheduleMap } = opts;
	const title = `${year}년 ${month}월 근무일정 현황표`;

	const headerDays = dates
		.map((d) => {
			const day = d.getDate();
			const dow = DAY_NAMES_KO[d.getDay()];
			const isSun = d.getDay() === 0;
			const isSat = d.getDay() === 6;
			const cls = isSun ? "sun" : isSat ? "sat" : "";
			return `<th class="c-day ${cls}">${day}<br/><span class="dow">${dow}</span></th>`;
		})
		.join("");

	const bodyRows = employees
		.map((emp) => {
			const cells = dates
				.map((d) => {
					const key = `${emp.EMPNO}|${formatYmd(d)}`;
					const row = scheduleMap[key];
					const isSun = d.getDay() === 0;
					const isSat = d.getDay() === 6;
					const cls = isSun ? "sun" : isSat ? "sat" : "";
					const content = row ? wguPrintMarkHtml(row) : "&nbsp;";
					return `<td class="c-cell ${cls}">${content}</td>`;
				})
				.join("");
			return `<tr>
        <td class="c-name">${nbsp(emp.EMPNM)}</td>
        <td class="c-job">${nbsp(String(emp.JOB ?? ""))}</td>
        ${cells}
      </tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
      font-size: 9pt;
      color: #000;
      margin: 12px;
    }
    h1 { text-align: center; font-size: 16pt; margin: 0 0 12px; }
    .meta { text-align: right; margin-bottom: 8px; font-size: 9pt; }
    table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.main th, table.main td {
      border: 1px solid #000;
      padding: 2px 1px;
      text-align: center;
      vertical-align: middle;
      word-break: keep-all;
    }
    table.main thead th { background: #f0f0f0; font-weight: 600; }
    table.main .c-name { width: 70px; text-align: left; padding-left: 4px; }
    table.main .c-job { width: 60px; }
    table.main .c-day { font-size: 8pt; line-height: 1.2; }
    table.main .c-day .dow { font-weight: normal; font-size: 7pt; }
    table.main .c-cell { font-size: 7.5pt; height: 22px; }
    .sun { color: #c00; }
    .sat { color: #06c; }
    .mark { display: inline-block; vertical-align: middle; }
    .mark-work {
      width: 11px; height: 11px; border-radius: 50%; background: #2563eb;
    }
    .mark-shift-blue {
      color: #2563eb;
      font-weight: 700;
      font-size: 10pt;
      line-height: 1;
    }
    .mark-orange-circle {
      width: 11px; height: 11px; border-radius: 50%; background: #f97316;
    }
    .mark-text-red {
      color: #dc2626;
      font-weight: 700;
      font-size: 10pt;
      line-height: 1;
    }
    .mark-sick {
      color: #dc2626;
      font-weight: 900;
      font-size: 11pt;
      line-height: 1;
    }
    .mark-star {
      color: #dc2626;
      font-size: 12pt;
      line-height: 1;
    }
    .mark-triangle {
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 11px solid #dc2626;
      background: transparent;
    }
    .legend {
      margin-top: 12px;
      font-size: 9pt;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 6mm; }
      @page { size: landscape; margin: 8mm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">출력일시: ${escapeHtml(new Date().toLocaleString("ko-KR"))}</div>
  <table class="main">
    <thead>
      <tr>
        <th class="c-name">성명</th>
        <th class="c-job">직책</th>
        ${headerDays}
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="${2 + dates.length}">등록된 일정이 없습니다</td></tr>`}
    </tbody>
  </table>
  <div class="legend">
    <span class="legend-item"><span class="mark mark-shift-blue">주</span> 주간</span>
    <span class="legend-item"><span class="mark mark-shift-blue">야</span> 야간</span>
    <span class="legend-item"><span class="mark mark-shift-blue">심</span> 심야</span>
    <span class="legend-item"><span class="mark mark-text-red">연</span> 연차</span>
    <span class="legend-item"><span class="mark mark-text-red">월</span> 월차</span>
    <span class="legend-item"><span class="mark mark-orange-circle"></span> 정기휴무</span>
    <span class="legend-item"><span class="mark mark-text-red">대</span> 대휴</span>
    <span class="legend-item"><span class="mark mark-sick">병</span> 병가</span>
    <span class="legend-item"><span class="mark mark-star">✮</span> 경조사</span>
    <span class="legend-item"><span class="mark mark-triangle"></span> 결근</span>
  </div>
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
