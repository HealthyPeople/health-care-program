import { openPrintPreviewWindow } from "../employee-attendance/employeeAttendancePrint";

export { openPrintPreviewWindow };

export type AnnualSchedulePrintItem = {
	date: string;
	endDate: string;
	title: string;
	content: string;
	type: string;
};

export type AnnualSchedulePrintData = {
	year: number;
	month: number;
	facilityName?: string;
	schedules: AnnualSchedulePrintItem[];
};

export type AnnualScheduleMultiPrintData = {
	facilityName?: string;
	/** 출력할 년월 목록 (연속) */
	months: { year: number; month: number }[];
	schedules: AnnualSchedulePrintItem[];
};

function overlapsMonth(
	start: string,
	end: string,
	year: number,
	month: number
): boolean {
	const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
	const s = start.slice(0, 10);
	const e = (end || start).slice(0, 10);
	return s <= monthEnd && e >= monthStart;
}

function rangeTitle(months: { year: number; month: number }[]): string {
	if (months.length === 0) return "";
	const first = months[0];
	const last = months[months.length - 1];
	if (months.length === 1) return `${first.year}년 ${first.month}월`;
	if (first.year === last.year) {
		return `${first.year}년 ${first.month}월 ~ ${last.month}월`;
	}
	return `${first.year}년 ${first.month}월 ~ ${last.year}년 ${last.month}월`;
}

export function buildPrintMonthRange(
	year: number,
	startMonth: number,
	monthCount: number
): { year: number; month: number }[] {
	const count = Math.min(12, Math.max(1, Math.floor(monthCount) || 1));
	const months: { year: number; month: number }[] = [];
	let y = year;
	let m = startMonth;
	for (let i = 0; i < count; i++) {
		months.push({ year: y, month: m });
		m += 1;
		if (m > 12) {
			m = 1;
			y += 1;
		}
	}
	return months;
}

function escapeHtml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function nbsp(v: string): string {
	const t = String(v ?? "").trim();
	return t ? escapeHtml(t) : "&nbsp;";
}

function formatPeriod(start: string, end?: string): string {
	const s = String(start ?? "").slice(0, 10);
	const e = String(end ?? s).slice(0, 10);
	if (!s) return "-";
	if (!e || e === s) return s;
	return `${s} ~ ${e}`;
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function dateInRange(dateStr: string, start: string, end: string): boolean {
	const d = dateStr.slice(0, 10);
	const s = start.slice(0, 10);
	const e = (end || start).slice(0, 10);
	return d >= s && d <= e;
}

function typeStyle(type?: string): { bg: string; border: string; fg: string; cls: string } {
	switch (String(type ?? "").trim()) {
		case "행사":
			return { bg: "#93c5fd", border: "#1d4ed8", fg: "#1e3a8a", cls: "t-event" };
		case "휴무":
			return { bg: "#fbbf24", border: "#b45309", fg: "#78350f", cls: "t-off" };
		case "교육":
			return { bg: "#6ee7b7", border: "#047857", fg: "#064e3b", cls: "t-edu" };
		case "기타":
			return { bg: "#cbd5e1", border: "#475569", fg: "#1e293b", cls: "t-etc" };
		default:
			return { bg: "#e2e8f0", border: "#64748b", fg: "#334155", cls: "t-default" };
	}
}

type WeekDay = { date: Date | null; dateStr: string | null };
type EventSegment = {
	item: AnnualSchedulePrintItem;
	startCol: number;
	span: number;
	lane: number;
	key: string;
};

function buildWeeks(year: number, month: number): WeekDay[][] {
	const first = new Date(year, month - 1, 1);
	const leading = first.getDay();
	const lastDay = new Date(year, month, 0).getDate();
	const cells: WeekDay[] = [];
	for (let i = 0; i < leading; i++) cells.push({ date: null, dateStr: null });
	for (let d = 1; d <= lastDay; d++) {
		const date = new Date(year, month - 1, d);
		cells.push({ date, dateStr: formatDate(date) });
	}
	while (cells.length % 7 !== 0) cells.push({ date: null, dateStr: null });
	const weeks: WeekDay[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

function buildWeekSegments(week: WeekDay[], schedules: AnnualSchedulePrintItem[]): EventSegment[] {
	const raw: Omit<EventSegment, "lane">[] = [];
	schedules.forEach((item, idx) => {
		const start = item.date.slice(0, 10);
		const end = (item.endDate || item.date).slice(0, 10);
		let startCol = -1;
		let endCol = -1;
		for (let c = 0; c < 7; c++) {
			const ds = week[c]?.dateStr;
			if (!ds) continue;
			if (dateInRange(ds, start, end)) {
				if (startCol < 0) startCol = c;
				endCol = c;
			}
		}
		if (startCol >= 0 && endCol >= startCol) {
			raw.push({
				item,
				startCol,
				span: endCol - startCol + 1,
				key: `${idx}-${startCol}`,
			});
		}
	});
	raw.sort((a, b) => a.startCol - b.startCol || b.span - a.span);
	const laneEnds: number[] = [];
	const result: EventSegment[] = [];
	for (const seg of raw) {
		let lane = 0;
		while (lane < laneEnds.length && laneEnds[lane] > seg.startCol) lane += 1;
		if (lane === laneEnds.length) laneEnds.push(0);
		laneEnds[lane] = seg.startCol + seg.span;
		result.push({ ...seg, lane });
	}
	return result;
}

function buildCalendarBody(data: AnnualSchedulePrintData): string {
	const weeks = buildWeeks(data.year, data.month);
	return weeks
		.map((week) => {
			const segments = buildWeekSegments(week, data.schedules);
			const laneCount =
				segments.length > 0 ? Math.max(...segments.map((s) => s.lane)) + 1 : 1;
			const dayCells = week
				.map((cell) => {
					if (!cell.date) return `<td class="day empty">&nbsp;</td>`;
					const dow = cell.date.getDay();
					const cls = dow === 0 ? "sun" : dow === 6 ? "sat" : "";
					return `<td class="day ${cls}"><div class="day-num">${cell.date.getDate()}</div></td>`;
				})
				.join("");

			const eventRows = Array.from({ length: laneCount }, (_, lane) => {
				const cells: string[] = [];
				let c = 0;
				while (c < 7) {
					const seg = segments.find((s) => s.lane === lane && s.startCol === c);
					if (seg) {
						const st = typeStyle(seg.item.type);
						cells.push(
							`<td class="evt" colspan="${seg.span}"><div class="bar ${st.cls}" style="background-color:${st.bg} !important;border-left:3px solid ${st.border};color:${st.fg}">${escapeHtml(
								seg.item.title
							)}</div></td>`
						);
						c += seg.span;
					} else {
						cells.push(`<td class="evt-empty">&nbsp;</td>`);
						c += 1;
					}
				}
				return `<tr class="evt-row">${cells.join("")}</tr>`;
			}).join("");

			return `<tr class="day-row">${dayCells}</tr>${eventRows}`;
		})
		.join("");
}

function calendarPageHtml(
	year: number,
	month: number,
	facilityName: string,
	schedules: AnnualSchedulePrintItem[]
): string {
	const title = `${year}년 ${month}월 연간 일정 (달력)`;
	const facility = nbsp(facilityName || "");
	const monthSchedules = schedules.filter((s) =>
		overlapsMonth(s.date, s.endDate || s.date, year, month)
	);
	const body = buildCalendarBody({
		year,
		month,
		facilityName,
		schedules: monthSchedules,
	});

	return `
  <div class="page">
    <div class="header">
      <div class="facility">${facility}</div>
      <div class="doc-title">${escapeHtml(title)}</div>
    </div>
    <table class="cal">
      <thead>
        <tr>
          <th class="sun">일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th class="sat">토</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>
    <div class="legend">
      <span><i class="swatch" style="background-color:#93c5fd !important;border-color:#1d4ed8"></i>행사</span>
      <span><i class="swatch" style="background-color:#fbbf24 !important;border-color:#b45309"></i>휴무</span>
      <span><i class="swatch" style="background-color:#6ee7b7 !important;border-color:#047857"></i>교육</span>
      <span><i class="swatch" style="background-color:#cbd5e1 !important;border-color:#475569"></i>기타</span>
    </div>
  </div>`;
}

export function buildAnnualScheduleCalendarPrintHtml(
	data: AnnualSchedulePrintData | AnnualScheduleMultiPrintData
): string {
	const months =
		"months" in data && data.months?.length
			? data.months
			: [{ year: (data as AnnualSchedulePrintData).year, month: (data as AnnualSchedulePrintData).month }];
	const facilityName = data.facilityName || "";
	const docTitle =
		months.length === 1
			? `${months[0].year}년 ${months[0].month}월 연간 일정 (달력)`
			: `${rangeTitle(months)} 연간 일정 (달력)`;

	const pages = months
		.map((m, i) => {
			const html = calendarPageHtml(m.year, m.month, facilityName, data.schedules);
			if (i < months.length - 1) {
				return html.replace(
					'class="page"',
					'class="page page-break"'
				);
			}
			return html;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      font-size: 10pt;
      color: #000;
      background: #fff;
    }
    .page { width: 100%; max-width: 277mm; margin: 0 auto; }
    .page-break { page-break-after: always; break-after: page; }
    .header { text-align: center; margin-bottom: 10px; position: relative; min-height: 40px; }
    .doc-title { font-size: 18pt; font-weight: bold; letter-spacing: 0.12em; }
    .facility { position: absolute; left: 0; top: 8px; font-size: 10pt; }
    table.cal { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.cal th, table.cal td { border: 1px solid #333; vertical-align: top; }
    table.cal th {
      background: #f0f4f8 !important;
      text-align: center;
      padding: 6px 2px;
      font-weight: bold;
      font-size: 10pt;
    }
    th.sun, td.day.sun .day-num { color: #c00; }
    th.sat, td.day.sat .day-num { color: #06c; }
    td.day { height: 22px; padding: 3px 4px; background: #fff; }
    td.day.empty { background: #f7f7f7 !important; }
    .day-num { font-weight: 600; font-size: 10pt; }
    tr.evt-row td { height: 18px; padding: 1px 2px; border-top: none; }
    td.evt-empty { border-top-color: #ddd; }
    .bar {
      font-size: 8.5pt;
      font-weight: 600;
      line-height: 1.2;
      padding: 2px 5px;
      border-radius: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bar.t-event { background-color: #93c5fd !important; border-left: 3px solid #1d4ed8; color: #1e3a8a; }
    .bar.t-off { background-color: #fbbf24 !important; border-left: 3px solid #b45309; color: #78350f; }
    .bar.t-edu { background-color: #6ee7b7 !important; border-left: 3px solid #047857; color: #064e3b; }
    .bar.t-etc { background-color: #cbd5e1 !important; border-left: 3px solid #475569; color: #1e293b; }
    .bar.t-default { background-color: #e2e8f0 !important; border-left: 3px solid #64748b; color: #334155; }
    .legend { margin-top: 10px; font-size: 9.5pt; }
    .legend span { display: inline-block; margin-right: 14px; vertical-align: middle; }
    .swatch {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 2px;
      vertical-align: -3px;
      margin-right: 4px;
      border: 1px solid #666;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
${pages}
</body>
</html>`;
}

export function buildAnnualScheduleListPrintHtml(
	data: AnnualSchedulePrintData | AnnualScheduleMultiPrintData
): string {
	const months =
		"months" in data && data.months?.length
			? data.months
			: [{ year: (data as AnnualSchedulePrintData).year, month: (data as AnnualSchedulePrintData).month }];

	const filtered = data.schedules.filter((s) =>
		months.some((m) => overlapsMonth(s.date, s.endDate || s.date, m.year, m.month))
	);

	const title = `${rangeTitle(months)} 연간 일정 (목록)`;
	const facility = nbsp(data.facilityName || "");
	const rows =
		filtered.length === 0
			? `<tr><td colspan="4" style="text-align:center;padding:16px;">등록된 일정이 없습니다.</td></tr>`
			: filtered
					.slice()
					.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
					.map(
						(s, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${escapeHtml(formatPeriod(s.date, s.endDate))}</td>
      <td>${nbsp(s.type)}</td>
      <td>
        <div class="t">${escapeHtml(s.title)}</div>
        ${s.content ? `<div class="d">${escapeHtml(s.content)}</div>` : ""}
      </td>
    </tr>`
					)
					.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      font-size: 10.5pt;
      color: #000;
      background: #fff;
      line-height: 1.4;
    }
    .page { width: 100%; max-width: 190mm; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 12px; position: relative; min-height: 40px; }
    .doc-title { font-size: 18pt; font-weight: bold; letter-spacing: 0.12em; }
    .facility { position: absolute; left: 0; top: 8px; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
    th { background: #f0f4f8; font-weight: bold; text-align: center; }
    td.c { text-align: center; width: 40px; }
    .t { font-weight: 600; }
    .d { margin-top: 4px; font-size: 9.5pt; color: #333; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="facility">${facility}</div>
      <div class="doc-title">${escapeHtml(title)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">No</th>
          <th style="width:160px">기간</th>
          <th style="width:70px">유형</th>
          <th>제목 / 내용</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
