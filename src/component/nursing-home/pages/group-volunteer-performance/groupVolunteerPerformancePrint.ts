import { openPrintPreviewWindow } from "../employee-attendance/employeeAttendancePrint";

export { openPrintPreviewWindow };

export type GroupVolunteerPrintData = {
	facilityName: string;
	groupName: string;
	contact: string;
	phone1: string;
	phone2: string;
	date: string;
	startTime: string;
	endTime: string;
	volunteers: string;
	roster: string;
	services: {
		bath: boolean;
		beauty: boolean;
		programAssist: boolean;
		programOps: boolean;
		other: boolean;
		otherText: string;
	};
	etc: string;
};

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

function formatTimeRange(start: string, end: string): string {
	const s = String(start ?? "").trim().slice(0, 5);
	const e = String(end ?? "").trim().slice(0, 5);
	if (s && e) return `${s} ~ ${e}`;
	if (s) return s;
	if (e) return e;
	return "";
}

function checkMark(on: boolean): string {
	return on ? "☑" : "☐";
}

function sharedStyles(): string {
	return `
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', Batang, serif;
      font-size: 10.5pt;
      color: #000;
      background: #fff;
      line-height: 1.45;
    }
    .page { width: 100%; max-width: 190mm; margin: 0 auto; }
    .doc-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.25em;
      margin: 8px 0 16px;
      padding-bottom: 6px;
      border-bottom: 2px solid #000;
    }
    .sub-info {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      margin-bottom: 10px;
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #000; vertical-align: middle; }
    .lbl {
      width: 88px;
      min-width: 88px;
      background: #f3f4f6;
      text-align: center;
      padding: 7px 4px;
      white-space: nowrap;
      font-weight: normal;
    }
    .val { padding: 7px 10px; min-height: 30px; }
    .val-top { vertical-align: top; }
    .svc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      padding: 10px 12px;
    }
    .svc-item { font-size: 11pt; }
    .svc-other { grid-column: 1 / -1; margin-top: 4px; }
    .content-box {
      padding: 12px;
      min-height: 120px;
      white-space: pre-wrap;
      word-break: break-word;
      vertical-align: top;
      line-height: 1.6;
    }
    .roster-table th {
      background: #f3f4f6;
      font-weight: normal;
      text-align: center;
      padding: 6px 4px;
    }
    .roster-table td {
      text-align: center;
      height: 32px;
      padding: 4px;
    }
    .roster-table .no { width: 12%; }
    .roster-table .name { width: 38%; }
    .roster-table .sign { width: 50%; }
    .footer {
      margin-top: 18px;
      text-align: right;
      font-size: 10.5pt;
      line-height: 1.8;
    }
    .note {
      margin-top: 10px;
      font-size: 9pt;
      color: #333;
    }
    .page-break { page-break-after: always; }
  `;
}

function buildContentPageBody(data: GroupVolunteerPrintData): string {
	const facility = nbsp(data.facilityName);
	const groupName = nbsp(data.groupName);
	const contact = nbsp(data.contact);
	const phone = nbsp([data.phone1, data.phone2].filter((x) => String(x ?? "").trim()).join(" / "));
	const date = nbsp(data.date);
	const time = nbsp(formatTimeRange(data.startTime, data.endTime));
	const cnt = nbsp(data.volunteers);
	const etc = nbsp(data.etc);
	const s = data.services;
	const otherLine = s.other
		? `${checkMark(true)} 기타 : ${escapeHtml(s.otherText || "-")}`
		: `${checkMark(false)} 기타`;

	return `
    <div class="doc-title">단체 봉사활동 내용</div>
    <div class="sub-info">
      <span>기관명 : ${facility}</span>
      <span>출력일 : ${escapeHtml(new Date().toISOString().slice(0, 10))}</span>
    </div>
    <table>
      <tr>
        <td class="lbl">단체명</td>
        <td class="val" colspan="3">${groupName}</td>
      </tr>
      <tr>
        <td class="lbl">연락담당자</td>
        <td class="val">${contact}</td>
        <td class="lbl">연락처</td>
        <td class="val">${phone}</td>
      </tr>
      <tr>
        <td class="lbl">봉사일자</td>
        <td class="val">${date}</td>
        <td class="lbl">봉사시간</td>
        <td class="val">${time}</td>
      </tr>
      <tr>
        <td class="lbl">봉사인원</td>
        <td class="val" colspan="3">${cnt} 명</td>
      </tr>
      <tr>
        <td class="lbl">봉사내용</td>
        <td colspan="3">
          <div class="svc-grid">
            <div class="svc-item">${checkMark(s.bath)} 목욕</div>
            <div class="svc-item">${checkMark(s.beauty)} 이미용</div>
            <div class="svc-item">${checkMark(s.programOps)} 프로그램 운영</div>
            <div class="svc-item">${checkMark(s.programAssist)} 프로그램 보조</div>
            <div class="svc-item svc-other">${otherLine}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td class="lbl">비고</td>
        <td class="content-box" colspan="3">${etc}</td>
      </tr>
    </table>
    <div class="footer">
      위와 같이 단체 봉사활동을 실시하였음을 확인합니다.<br/>
      ${escapeHtml(data.date || new Date().toISOString().slice(0, 10))}<br/><br/>
      담당자 : ________________&nbsp;&nbsp;(인)
    </div>`;
}

/** 봉사내용 출력 — 단체 봉사활동 내용 확인서 */
export function buildGroupVolunteerContentPrintHtml(data: GroupVolunteerPrintData): string {
	return buildGroupVolunteerContentBatchPrintHtml([data]);
}

/** 체크된 여러 봉사일자 봉사내용 일괄 출력 */
export function buildGroupVolunteerContentBatchPrintHtml(list: GroupVolunteerPrintData[]): string {
	const pages = list
		.map(
			(data, idx) =>
				`<div class="page${idx < list.length - 1 ? " page-break" : ""}">${buildContentPageBody(data)}</div>`
		)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>단체 봉사내용</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

/** 체크된 단체 명단 — 자원봉사자(단체) 명단 양식 */
export type GroupVolunteerListPrintRow = {
	name: string;
	contact: string;
	phone: string;
	etc: string;
	indt: string;
};

export function buildGroupVolunteerListPrintHtml(
	rows: GroupVolunteerListPrintRow[],
	baseDate: string
): string {
	const dateLabel = escapeHtml(baseDate || new Date().toISOString().slice(0, 10));
	const bodyRows = rows
		.map(
			(r) => `<tr>
      <td class="c-name">${nbsp(r.name)}</td>
      <td class="c-contact">${nbsp(r.contact)}</td>
      <td class="c-phone">${nbsp(r.phone)}</td>
      <td class="c-etc">${nbsp(r.etc)}</td>
      <td class="c-indt">${nbsp(r.indt)}</td>
    </tr>`
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>자원봉사자(단체) 명단</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 16mm 16mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Batang, '바탕', 'Malgun Gothic', '맑은 고딕', serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
    }
    .page {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
      position: relative;
      min-height: 250mm;
      padding-bottom: 36px;
    }
    .header {
      position: relative;
      min-height: 78px;
      margin-bottom: 6px;
      padding-right: 180px;
    }
    .doc-title {
      text-align: center;
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 0.12em;
      padding: 22px 0 10px;
      border-bottom: 2px solid #000;
    }
    .approval {
      position: absolute;
      right: 0;
      top: 0;
      border-collapse: collapse;
      width: 168px;
      font-size: 10pt;
      text-align: center;
    }
    .approval th, .approval td {
      border: 1px solid #000;
      padding: 0;
    }
    .approval th {
      font-weight: normal;
      height: 26px;
      background: #fff;
    }
    .approval .sign-box { height: 48px; }
    .base-date {
      margin: 10px 0 6px;
      font-size: 11pt;
    }
    .list-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
    }
    .list-table thead th {
      border-top: 1.5px solid #000;
      border-bottom: 1px solid #000;
      font-weight: bold;
      text-align: center;
      padding: 8px 4px;
      background: #fff;
    }
    .list-table tbody td {
      border: none;
      padding: 8px 6px;
      vertical-align: middle;
    }
    .c-name { width: 22%; text-align: left; }
    .c-contact { width: 16%; text-align: left; }
    .c-phone { width: 28%; text-align: left; }
    .c-etc { width: 18%; text-align: left; }
    .c-indt { width: 16%; text-align: center; }
    .footer-line {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 22px;
      border-top: 1px solid #000;
    }
    .page-no {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10.5pt;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="doc-title">자원봉사자(단체) 명단</div>
      <table class="approval">
        <tr>
          <th>담당</th>
          <th>검토</th>
          <th>결재</th>
        </tr>
        <tr>
          <td class="sign-box">&nbsp;</td>
          <td class="sign-box">&nbsp;</td>
          <td class="sign-box">&nbsp;</td>
        </tr>
      </table>
    </div>
    <div class="base-date">기준일자: ${dateLabel}</div>
    <table class="list-table">
      <thead>
        <tr>
          <th>단체명</th>
          <th>연락담당자</th>
          <th>전화번호</th>
          <th>기타</th>
          <th>등록일자</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows || `<tr><td colspan="5" style="text-align:center;padding:24px">데이터가 없습니다.</td></tr>`}
      </tbody>
    </table>
    <div class="footer-line"></div>
    <div class="page-no">페이지: 1</div>
  </div>
</body>
</html>`;
}
