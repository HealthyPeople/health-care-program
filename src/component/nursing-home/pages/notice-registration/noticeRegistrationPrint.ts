import { openPrintPreviewWindow } from "../employee-attendance/employeeAttendancePrint";

export type NoticePrintData = {
	startDate: string;
	endDate: string;
	centerName: string;
	registrant: string;
	title: string;
	content: string;
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

export function buildNoticePrintHtml(data: NoticePrintData): string {
	const startDate = escapeHtml(data.startDate);
	const endDate = escapeHtml(data.endDate);

	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>공지사항</title>
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
      letter-spacing: 0.35em;
      padding: 0 0.15em 2px;
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
      width: 88px;
      min-width: 88px;
      background: #f5f5f5;
      text-align: center;
      font-weight: bold;
      padding: 6px 4px;
      white-space: nowrap;
    }
    .main .val {
      padding: 6px 10px;
      min-height: 30px;
      text-align: left;
    }
    .main .val-date { width: 28%; }
    .main .val-center { width: 32%; }
    .main .val-author { width: 28%; }
    .main .title-val { padding: 6px 10px; min-height: 30px; }
    .main .content-lbl {
      width: 88px;
      min-width: 88px;
      background: #f5f5f5;
      text-align: center;
      font-weight: bold;
      padding: 6px 4px;
      vertical-align: middle;
    }
    .main .content-cell {
      padding: 10px 12px;
      min-height: 420px;
      vertical-align: top;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.55;
      text-align: left;
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
        <span class="doc-title">공지사항</span>
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
        <td class="lbl">공지일자</td>
        <td class="val val-date">${startDate || "&nbsp;"}</td>
        <td class="lbl">공지종료일자</td>
        <td class="val val-date">${endDate || "&nbsp;"}</td>
      </tr>
      <tr>
        <td class="lbl">공지센터</td>
        <td class="val val-center">${nbsp(data.centerName)}</td>
        <td class="lbl">공지자</td>
        <td class="val val-author">${nbsp(data.registrant)}</td>
      </tr>
      <tr>
        <td class="lbl">공지제목</td>
        <td class="title-val" colspan="3">${nbsp(data.title)}</td>
      </tr>
      <tr>
        <td class="content-lbl">공지내용</td>
        <td class="content-cell" colspan="3">${nbsp(data.content)}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}
