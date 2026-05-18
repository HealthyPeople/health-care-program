import { openPrintPreviewWindow } from "../employee-attendance/employeeAttendancePrint";

export type FacilitySchedulePrintRow = {
	startTime: string;
	endTime: string;
	category: string;
	planTitle: string;
	planDetail: string;
	place: string;
	leader: string;
	assistant: string;
	attendees: string;
};

export type FacilitySchedulePrintData = {
	planDate: string;
	facilityName: string;
	rows: FacilitySchedulePrintRow[];
};

export { openPrintPreviewWindow };

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

function formatServiceTime(start: string, end: string): string {
	const s = String(start ?? "").trim().slice(0, 5);
	const e = String(end ?? "").trim().slice(0, 5);
	if (s && e) return `${s} ~ ${e}`;
	if (s) return s;
	if (e) return e;
	return "";
}

function buildDataRows(rows: FacilitySchedulePrintRow[]): string {
	if (rows.length === 0) {
		return `<tr><td colspan="6" class="empty-row">등록된 일정이 없습니다.</td></tr>`;
	}

	return rows
		.map((row) => {
			const time = nbsp(formatServiceTime(row.startTime, row.endTime));
			const category = nbsp(row.category);
			const title = nbsp(row.planTitle);
			const detail = nbsp(row.planDetail);
			const place = nbsp(row.place);
			const leader = nbsp(row.leader);
			const assistant = nbsp(row.assistant);
			const attendees = nbsp(row.attendees);

			return `<tr>
      <td rowspan="2" class="c-time">${time}</td>
      <td rowspan="2" class="c-gu">${category}</td>
      <td class="c-title">${title}</td>
      <td class="c-place">${place}</td>
      <td class="c-man">${leader}</td>
      <td class="c-man">${assistant}</td>
    </tr>
    <tr>
      <td class="c-detail">${detail}</td>
      <td colspan="3" class="c-attendees">${attendees}</td>
    </tr>`;
		})
		.join("");
}

export function buildFacilityDailySchedulePrintHtml(data: FacilitySchedulePrintData): string {
	const planDate = escapeHtml(data.planDate);
	const facilityName = nbsp(data.facilityName);
	const bodyRows = buildDataRows(data.rows);

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>센터(직원) 일과표</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', Batang, serif;
      font-size: 10pt;
      color: #000;
      background: #fff;
      line-height: 1.35;
    }
    .page { width: 100%; max-width: 277mm; margin: 0 auto; position: relative; }
    .top-bar { position: relative; min-height: 52px; margin-bottom: 4px; }
    .doc-title-wrap { text-align: center; padding-top: 4px; }
    .doc-title {
      display: inline-block;
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 0.12em;
    }
    .approval {
      position: absolute;
      right: 0;
      top: 0;
      border-collapse: collapse;
      font-size: 9pt;
      text-align: center;
    }
    .approval th, .approval td {
      border: 1px solid #000;
      width: 52px;
      height: 22px;
      font-weight: normal;
    }
    .approval .sign { height: 44px; }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px 0 8px;
      font-size: 10.5pt;
    }
    .meta .date { flex: 1; }
    .meta .center { flex: 1; text-align: center; font-weight: bold; }
    .meta .spacer { flex: 1; }
    table.main {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.main th, table.main td {
      border: 1px solid #000;
      padding: 4px 6px;
      vertical-align: middle;
      word-break: break-word;
    }
    table.main thead th {
      background: #f5f5f5;
      font-weight: normal;
      text-align: center;
      height: 26px;
    }
    table.main .c-time { width: 12%; text-align: center; }
    table.main .c-gu { width: 14%; text-align: center; }
    table.main .c-title { width: 16%; }
    table.main .c-place { width: 12%; }
    table.main .c-man { width: 10%; }
    table.main .c-detail { width: 16%; }
    table.main .c-attendees { width: 32%; font-size: 9.5pt; line-height: 1.4; }
    table.main tbody td { min-height: 24px; }
    .empty-row { text-align: center; padding: 24px; color: #444; }
    .footer { margin-top: 8px; text-align: right; font-size: 9.5pt; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top-bar">
      <div class="doc-title-wrap">
        <div class="doc-title">센터(직원) 일과표</div>
      </div>
      <table class="approval">
        <thead>
          <tr><th>기안</th><th>검토</th><th>결제</th></tr>
        </thead>
        <tbody>
          <tr><td class="sign">&nbsp;</td><td class="sign">&nbsp;</td><td class="sign">&nbsp;</td></tr>
        </tbody>
      </table>
    </div>
    <div class="meta">
      <div class="date">일자 : ${planDate}</div>
      <div class="center">${facilityName}</div>
      <div class="spacer"></div>
    </div>
    <table class="main">
      <thead>
        <tr>
          <th rowspan="2">서비스 시간</th>
          <th rowspan="2">구분</th>
          <th>수행계획</th>
          <th>장소</th>
          <th>진행자</th>
          <th>보조진행자</th>
        </tr>
        <tr>
          <th>수행계획상세</th>
          <th colspan="3">참석자</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <div class="footer">페이지: 1</div>
  </div>
</body>
</html>`;
}
