import { openPrintPreviewWindow } from "../employee-attendance/employeeAttendancePrint";

export type JobTrainingPrintData = {
	trainingDate: string;
	startTime: string;
	endTime: string;
	instructor: string;
	place: string;
	title: string;
	content: string;
	attendees: string;
	evaluation: string;
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

function formatTrainingTime(start: string, end: string): string {
	const s = String(start ?? "").trim().slice(0, 5);
	const e = String(end ?? "").trim().slice(0, 5);
	if (s && e) return `${s} ~ ${e}`;
	if (s) return s;
	if (e) return e;
	return "";
}

function parseAttendeeNames(attendees: string): string[] {
	return String(attendees ?? "")
		.split(/[,，、\n\r]+/)
		.map((n) => n.trim())
		.filter(Boolean);
}

function buildSignatureRows(names: string[]): string {
	const slots: string[] = [];
	for (let i = 0; i < 12; i++) slots.push(names[i] ?? "");
	const rows: string[] = [];
	for (let r = 0; r < 6; r++) {
		const left = slots[r * 2] ?? "";
		const right = slots[r * 2 + 1] ?? "";
		rows.push(
			`<tr>
        <td class="sig-name">${nbsp(left)}</td>
        <td class="sig-cell">&nbsp;</td>
        <td class="sig-name">${nbsp(right)}</td>
        <td class="sig-cell">&nbsp;</td>
      </tr>`
		);
	}
	return rows.join("");
}

export function buildJobTrainingPrintHtml(data: JobTrainingPrintData): string {
	const trainingDate = escapeHtml(data.trainingDate);
	const trainingTime = nbsp(formatTrainingTime(data.startTime, data.endTime));
	const names = parseAttendeeNames(data.attendees);
	const signatureRows = buildSignatureRows(names);

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>직원 직무교육</title>
  <style>
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
    .top-bar {
      position: relative;
      margin-bottom: 6px;
      min-height: 56px;
    }
    .doc-title-wrap { text-align: center; padding-top: 6px; }
    .doc-title {
      display: inline-block;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.2em;
      padding: 0 0.2em 2px;
      border-bottom: 2px solid #000;
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #000; vertical-align: middle; }
    .approval {
      position: absolute;
      right: 0;
      top: 0;
      width: 168px;
      font-size: 9.5pt;
      text-align: center;
    }
    .approval th {
      background: #f5f5f5;
      font-weight: normal;
      padding: 4px 2px;
      height: 26px;
    }
    .approval .sign-box { height: 52px; background: #fff; }
    .main { margin-bottom: 0; }
    .main .lbl {
      width: 72px;
      min-width: 72px;
      background: #f5f5f5;
      text-align: center;
      font-weight: normal;
      padding: 6px 4px;
      white-space: nowrap;
    }
    .main .val { padding: 6px 8px; min-height: 28px; }
    .main .val-time { width: 24%; }
    .main .val-date { width: 22%; }
    .main .val-instructor { width: 26%; }
    .main .content-cell {
      padding: 10px 12px;
      min-height: 240px;
      vertical-align: top;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.55;
    }
    .main .attendee-cell {
      padding: 8px 10px;
      min-height: 48px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .main .eval-cell {
      padding: 10px 12px;
      min-height: 100px;
      vertical-align: top;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .sign-grid { font-size: 10pt; margin-top: -1px; }
    .sign-grid th {
      background: #f5f5f5;
      font-weight: normal;
      text-align: center;
      padding: 5px 2px;
      height: 26px;
    }
    .sign-grid .sig-name {
      width: 22%;
      padding: 6px 4px;
      text-align: center;
      height: 30px;
    }
    .sign-grid .sig-cell {
      width: 28%;
      height: 30px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top-bar">
      <div class="doc-title-wrap">
        <span class="doc-title">직원 직무교육</span>
      </div>
      <table class="approval">
        <tr>
          <th>담당</th>
          <th>검토</th>
          <th>결재</th>
        </tr>
        <tr>
          <td class="sign-box"></td>
          <td class="sign-box"></td>
          <td class="sign-box"></td>
        </tr>
      </table>
    </div>

    <table class="main">
      <tr>
        <td class="lbl">교육일자</td>
        <td class="val val-date">${trainingDate || "&nbsp;"}</td>
        <td class="lbl">교육시간</td>
        <td class="val val-time">${trainingTime}</td>
        <td class="lbl">강사명</td>
        <td class="val val-instructor">${nbsp(data.instructor)}</td>
      </tr>
      <tr>
        <td class="lbl">교육장소</td>
        <td class="val" colspan="5">${nbsp(data.place)}</td>
      </tr>
      <tr>
        <td class="lbl">교육제목</td>
        <td class="val" colspan="5">${nbsp(data.title)}</td>
      </tr>
      <tr>
        <td class="lbl">교육내용</td>
        <td class="val content-cell" colspan="5">${nbsp(data.content)}</td>
      </tr>
      <tr>
        <td class="lbl">참석자</td>
        <td class="val attendee-cell" colspan="5">${nbsp(data.attendees)}</td>
      </tr>
      <tr>
        <td class="lbl">교육평가</td>
        <td class="val eval-cell" colspan="5">${nbsp(data.evaluation)}</td>
      </tr>
    </table>

    <table class="sign-grid">
      <tr>
        <th>참석자</th>
        <th>사인</th>
        <th>참석자</th>
        <th>사인</th>
      </tr>
      ${signatureRows}
    </table>
  </div>
</body>
</html>`;
}
