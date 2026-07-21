import { openPrintPreviewWindow } from "../employee-attendance/employeeAttendancePrint";

export { openPrintPreviewWindow };

export type FacilityWorkLogPrintData = {
	facilityName: string;
	jodt: string;
	fcnt: string;
	hcnt: string;
	scnt: string;
	ncnt: string;
	ecnt: string;
	svnm: string;
	jdes: string;
	otdes: string;
	instructions: { approver: string; instruction: string }[];
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

function buildOnePage(data: FacilityWorkLogPrintData): string {
	const rows = (data.instructions || [])
		.filter((r) => String(r.approver ?? "").trim() || String(r.instruction ?? "").trim())
		.map(
			(r) => `<tr>
      <td class="c-approver">${nbsp(r.approver)}</td>
      <td class="c-inst">${nbsp(r.instruction)}</td>
    </tr>`
		)
		.join("");

	return `
  <div class="page">
    <div class="doc-title">센터 일일업무</div>
    <div class="sub-info">
      <span>기관명 : ${nbsp(data.facilityName)}</span>
      <span>업무일자 : ${escapeHtml(data.jodt)}</span>
    </div>
    <table class="stat">
      <tr>
        <th>정원</th><td>${nbsp(data.fcnt)}</td>
        <th>현인원</th><td>${nbsp(data.hcnt)}</td>
        <th>이용인원</th><td>${nbsp(data.scnt)}</td>
        <th>신규입소자</th><td>${nbsp(data.ncnt)}</td>
        <th>퇴소자</th><td>${nbsp(data.ecnt)}</td>
      </tr>
    </table>
    <table class="block">
      <tr><th>외박명단</th><td>${nbsp(data.svnm)}</td></tr>
      <tr><th>업무내용</th><td class="pre">${nbsp(data.jdes)}</td></tr>
      <tr><th>지출내역</th><td class="pre">${nbsp(data.otdes)}</td></tr>
    </table>
    <div class="sec-title">지시사항</div>
    <table class="inst">
      <thead><tr><th>결재자</th><th>지시사항</th></tr></thead>
      <tbody>
        ${rows || `<tr><td colspan="2" style="text-align:center;padding:16px">지시사항이 없습니다.</td></tr>`}
      </tbody>
    </table>
  </div>`;
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
    .page { width: 100%; max-width: 190mm; margin: 0 auto; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .doc-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.2em;
      margin: 4px 0 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #000;
    }
    .sub-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 10.5pt;
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; vertical-align: top; padding: 6px 8px; }
    .stat th { width: 9%; background: #f3f3f3; text-align: center; font-weight: normal; }
    .stat td { width: 11%; text-align: center; }
    .block { margin-top: 8px; }
    .block th { width: 90px; background: #f3f3f3; text-align: center; font-weight: normal; }
    .pre { white-space: pre-wrap; min-height: 64px; }
    .sec-title { margin: 12px 0 6px; font-weight: bold; }
    .inst th { background: #f3f3f3; text-align: center; font-weight: normal; }
    .c-approver { width: 22%; }
  `;
}

export function buildFacilityWorkLogPrintHtml(list: FacilityWorkLogPrintData[]): string {
	const pages = list.map(buildOnePage).join("");
	return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>센터 일일업무</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  ${pages}
</body>
</html>`;
}
