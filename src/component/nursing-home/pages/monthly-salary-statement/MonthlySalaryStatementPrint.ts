/**
 * @file 월 급여명세서 — 인쇄 헬퍼 (MonthlySalaryStatementPrint.ts)
 *
 * @description
 * 요양원 월 급여명세서 기능의 인쇄 헬퍼입니다. 폴더: component/nursing-home/pages/monthly-salary-statement
 *
 * @module component/nursing-home/pages/monthly-salary-statement/MonthlySalaryStatementPrint
 */
/** 월별 급여명세서 인쇄 HTML 빌더 (서식만 — fetch/state 없음) */

/** 인쇄 fallback용 행 (부모 StatementRow와 구조적 호환) */
export type SalaryStatementPrintSourceRow = {
	pnum: string;
	recipient: string;
	birthday: string;
	grade: string;
	recognitionNo: string;
	benefitTotal: string;
	nhaContribution: string;
	recipientContribution: string;
	nonBenefitMeal: string;
	nonBenefitSnack: string;
	roomUpgradeFee: string;
	outpatientFee: string;
	contractedMedical: string;
	contractedPrescription: string;
	beautyCost: string;
	otherCostsRecipient: string;
	recipientBurdenTotal: string;
	pSt: string;
	bathFee: string;
	dementiaFee: string;
	snm: string;
	sGu: string;
	enm: string;
	rdes: string;
	angh: string;
	annm: string;
	anadd: string;
	taxnum: string;
	taxown: string;
	antel: string;
};

function payYearMonthToSalmm(ym: string): string | null {
	const d = String(ym || "").replace(/\D/g, "");
	if (d.length === 6) return d;
	return null;
}

function escapeHtml(s: string): string {
	if (s == null) return "";
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function parseRowAmount(s: string): number {
	const n = parseInt(String(s ?? "").replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

function moneyKo(s: string): string {
	return parseRowAmount(s).toLocaleString("ko-KR");
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

function computeOccurrenceColumnSums(rows: V40100PrintRow[]) {
	let sumNha = 0;
	let sumSal2 = 0;
	let sumB1 = 0;
	let sumB2 = 0;
	let sumB3 = 0;
	let sumB4 = 0;
	let sumB6 = 0;
	let sumMed = 0;
	let sumRx = 0;
	let sumEsal = 0;
	let sumBurden = 0;
	for (const row of rows) {
		sumNha += Number(row.nhaContribution || 0);
		sumSal2 += Number(row.recipientContribution || 0);
		sumB1 += Number(row.nonBenefitMeal || 0);
		sumB2 += Number(row.nonBenefitSnack || 0);
		sumB3 += Number(row.nonBenefitMedical || 0);
		sumB4 += Number(row.beautyCost || 0);
		sumB6 += Number(row.roomUpgradeFee || 0);
		sumMed += Number(row.contractedMedical || 0);
		sumRx += Number(row.contractedPrescription || 0);
		sumEsal += Number(row.otherCost || 0);
		sumBurden += Number(row.recipientBurdenTotal || 0);
	}
	return { sumNha, sumSal2, sumB1, sumB2, sumB3, sumB4, sumB6, sumMed, sumRx, sumEsal, sumBurden };
}

function moneyKoNum(n: number): string {
	return Number(n || 0).toLocaleString("ko-KR");
}

function renderOccurrencePrintDataRow(row: V40100PrintRow): string {
	const idDisp = String(row.recognitionNo || "").trim()
		? escapeHtml(String(row.recognitionNo).trim())
		: "-";
	return `<tr>
				<td class="nm">${escapeHtml(row.recipient || "-")}</td>
				<td class="t">${escapeHtml(row.grade || "-")}</td>
				<td class="t id">${idDisp}</td>
				<td class="n">${moneyKoNum(row.nhaContribution)}</td>
				<td class="n">${moneyKoNum(row.recipientContribution)}</td>
				<td class="n">${moneyKoNum(row.nonBenefitMeal)}</td>
				<td class="n">${moneyKoNum(row.nonBenefitSnack)}</td>
				<td class="n">${moneyKoNum(row.nonBenefitMedical)}</td>
				<td class="n">${moneyKoNum(row.beautyCost)}</td>
				<td class="n">${moneyKoNum(row.roomUpgradeFee)}</td>
				<td class="n">${moneyKoNum(row.contractedMedical)}</td>
				<td class="n">${moneyKoNum(row.contractedPrescription)}</td>
				<td class="n">${moneyKoNum(row.otherCost)}</td>
				<td class="n">${moneyKoNum(row.recipientBurdenTotal)}</td>
			</tr>`;
}

const OCCURRENCE_TABLE_HEAD = `<colgroup>
				<col style="width:7%"/><col style="width:5%"/><col style="width:10%"/><col style="width:7%"/><col style="width:7%"/>
				<col style="width:6%"/><col style="width:6%"/><col style="width:6%"/><col style="width:5%"/><col style="width:6%"/>
				<col style="width:6%"/><col style="width:6%"/><col style="width:6%"/><col style="width:8%"/>
			</colgroup>
			<thead>
				<tr>
					<th>수급자</th>
					<th>등급</th>
					<th>인정번호</th>
					<th>공단부담금</th>
					<th>수급자부담금</th>
					<th>비급여식대</th>
					<th>비급여간식</th>
					<th>비급여의료비</th>
					<th>이미용</th>
					<th>상급침실료</th>
					<th>촉탁의료비</th>
					<th>처방비</th>
					<th>기타비용</th>
					<th>수급자부담금합계</th>
				</tr>
			</thead>`;

/** V40100 수급자급여 발생내역 (API 매핑) */
export interface V40100PrintRow {
	PNUM: string;
	SALMM: string;
	yearMonthLabel: string;
	recipient: string;
	grade: string;
	recognitionNo: string;
	nhaContribution: number;
	recipientContribution: number;
	nonBenefitMeal: number;
	nonBenefitSnack: number;
	nonBenefitMedical: number;
	beautyCost: number;
	roomUpgradeFee: number;
	contractedMedical: number;
	contractedPrescription: number;
	otherCost: number;
	recipientBurdenTotal: number;
}

/** 수급자급여 발생내역서 R40100A — V40100 기준, 가로 A4 */
export function buildSalaryOccurrencePrintHtml(payYearMonth: string, rows: V40100PrintRow[]): string {
	const periodFromRow = rows.find((r) => String(r.yearMonthLabel || "").trim())?.yearMonthLabel?.trim();
	const period =
		periodFromRow ||
		(payYearMonth.length >= 7
			? `(${payYearMonth.slice(0, 4)}-${payYearMonth.slice(5, 7)}월분)`
			: `(${payYearMonth}월분)`);

	const sums = computeOccurrenceColumnSums(rows);
	const fmtSum = (n: number) => n.toLocaleString("ko-KR");
	const bodyRows =
		rows.length === 0
			? `<tr><td class="t" colspan="14">출력할 데이터가 없습니다.</td></tr>`
			: rows.map(renderOccurrencePrintDataRow).join("");
	const sumRow = `<tr class="total">
					<td></td>
					<td></td>
					<td class="lbl">합계</td>
					<td class="n">${fmtSum(sums.sumNha)}</td>
					<td class="n">${fmtSum(sums.sumSal2)}</td>
					<td class="n">${fmtSum(sums.sumB1)}</td>
					<td class="n">${fmtSum(sums.sumB2)}</td>
					<td class="n">${fmtSum(sums.sumB3)}</td>
					<td class="n">${fmtSum(sums.sumB4)}</td>
					<td class="n">${fmtSum(sums.sumB6)}</td>
					<td class="n">${fmtSum(sums.sumMed)}</td>
					<td class="n">${fmtSum(sums.sumRx)}</td>
					<td class="n">${fmtSum(sums.sumEsal)}</td>
					<td class="n">${fmtSum(sums.sumBurden)}</td>
				</tr>`;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>수급자급여 발생내역서</title>
<style>
@page {
	size: A4 landscape;
	margin: 10mm 10mm 14mm 10mm;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', 'Batang', serif; font-size: 9pt; color: #000; background: #fff; }
.head { position: relative; min-height: 52px; margin-bottom: 6px; page-break-after: avoid; break-after: avoid; }
.title-block { text-align: center; padding-right: 110px; }
.title { font-size: 16pt; font-weight: 700; text-decoration: underline; letter-spacing: 0.02em; }
.period { font-size: 11pt; margin-top: 4px; }
.approval { position: absolute; top: 0; right: 0; border-collapse: collapse; border: 1px solid #000; font-size: 8.5pt; }
.approval th, .approval td { border: 1px solid #000; width: 52px; text-align: center; vertical-align: middle; padding: 2px 1px; }
.approval th { font-weight: 700; background: #f2f2f2; height: 18px; }
.approval td { height: 28px; }
table.data { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
table.data thead { display: table-header-group; border-top: 2.5px solid #000; }
table.data tbody { display: table-row-group; }
table.data tr { page-break-inside: avoid; break-inside: avoid; }
table.data th, table.data td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; word-break: break-word; }
table.data thead th { background: #e0e0e0; font-weight: 700; text-align: center; font-size: 8pt; line-height: 1.2; padding: 3px 2px; }
table.data tbody td.n { text-align: right; font-variant-numeric: tabular-nums; padding-right: 4px; }
table.data tbody td.t { text-align: center; }
table.data tbody td.nm { text-align: left; padding-left: 4px; }
table.data tbody td.id { font-size: 8pt; }
table.data tr.total td { font-weight: 700; background: #eaeaea; }
table.data tr.total td.n { text-align: right; padding-right: 4px; }
table.data tr.total td.lbl { text-align: center; }
table.data tr.total { page-break-inside: avoid; break-inside: avoid; }
.occ-print-foot {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 2mm;
	font-size: 9.5pt;
	background: #fff;
}
.occ-print-foot .occ-pg::after { content: counter(page); }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
	<div class="head">
		<table class="approval" aria-label="결재">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
		<div class="title-block">
			<h1 class="title">수급자급여 발생내역서</h1>
			<div class="period">${escapeHtml(period)}</div>
		</div>
	</div>
	<table class="data">
		${OCCURRENCE_TABLE_HEAD}
		<tbody>
			${bodyRows}
			${rows.length > 0 ? sumRow : ""}
		</tbody>
	</table>
	<div class="occ-print-foot">
		<span>R40100A</span>
		<span>페이지: <span class="occ-pg"></span></span>
	</div>
</body>
</html>`;
}

/** 명세서 발부대장 인쇄 — 하단 폼(전달방법·전달자·수령자·수령내용) 반영 */
export interface StatementLedgerPrintForm {
	deliveryMethod: string;
	deliverer: string;
	recipientName: string;
	receiveContent: string;
}

/** V40100D 명세서 발부대장 (API 매핑) */
export interface V40100DPrintRow {
	PNUM: string;
	SALMM: string;
	yearMonthLabel: string;
	status: string;
	recipient: string;
	recipientBurden: number;
	deliverer: string;
	receiver: string;
	receiveContent: string;
	sGu: string;
	deliveryMethod: string;
	issueDate: string;
}

export const LEDGER_DEFAULT_RECEIVE =
	"소식지, 급여제공기록지, 급여비용명세서, 식단표, 프로그램계획표";
export const LEDGER_DEFAULT_DELIVERER = "";

/** 구 서식에 박혀 있던 해원 기관명(공백 유무 모두) */
export function normalizeFacilityLabel(s: string): string {
	return String(s ?? "").replace(/\s+/g, "");
}

export function isHaewonHardcodedLabel(s: string): boolean {
	return normalizeFacilityLabel(s) === "너싱홈해원";
}

export interface LoginFacilityPrintInfo {
	code?: string;
	name?: string;
	address?: string;
	businessNo?: string;
	representative?: string;
	tel?: string;
	/** F00110.ETC 입금통장정보 */
	bankAccount?: string;
}

export function isStaleHaewonBank(bank: string, loginFacilityName?: string): boolean {
	const b = String(bank ?? "").trim();
	if (!b) return false;
	const login = String(loginFacilityName ?? "").trim();
	if (login && isHaewonHardcodedLabel(login)) return false;
	return isHaewonHardcodedLabel(b) || normalizeFacilityLabel(b).includes("너싱홈해원");
}

/** 명세서 입금통장정보 = 로그인 기관 F00110.ETC */
export function buildFacilityBankLine(facility?: LoginFacilityPrintInfo | null): string {
	return String(facility?.bankAccount ?? "").trim();
}

function overlayLoginFacilityOnOrgFields<
	T extends {
		orgName?: string;
		orgCode?: string;
		orgAddr?: string;
		orgBizNo?: string;
		orgOwner?: string;
		orgTel?: string;
		ANGH?: string;
		bankAccount?: string;
	},
>(row: T, facility?: LoginFacilityPrintInfo | null): T {
	const name = String(facility?.name ?? "").trim();
	const code = String(facility?.code ?? "").trim();
	const address = String(facility?.address ?? "").trim();
	const businessNo = String(facility?.businessNo ?? "").trim();
	const representative = String(facility?.representative ?? "").trim();
	const tel = String(facility?.tel ?? "").trim();
	const bank = String(row.bankAccount ?? "").trim();
	const fromFac = buildFacilityBankLine(facility);
	return {
		...row,
		orgName: name || row.orgName,
		orgCode: code || row.orgCode,
		orgAddr: address || row.orgAddr,
		orgBizNo: businessNo || row.orgBizNo,
		orgOwner: representative || row.orgOwner,
		orgTel: tel || row.orgTel,
		ANGH: code || row.ANGH,
		bankAccount: fromFac || (isStaleHaewonBank(bank, name) ? "" : bank),
	};
}

export function overlayLoginFacilityOnStatementRow(
	row: V40100EPrintRow,
	facility?: LoginFacilityPrintInfo | null
): V40100EPrintRow {
	return overlayLoginFacilityOnOrgFields(row, facility);
}

export function overlayLoginFacilityOnPaymentRow(
	row: V40100GPrintRow,
	facility?: LoginFacilityPrintInfo | null
): V40100GPrintRow {
	return overlayLoginFacilityOnOrgFields(row, facility);
}

export function lastDayOfPayYearMonth(payYearMonth: string): string {
	if (payYearMonth.length < 7) return "";
	const y = parseInt(payYearMonth.slice(0, 4), 10);
	const mo = parseInt(payYearMonth.slice(5, 7), 10);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return "";
	const last = new Date(y, mo, 0);
	const d = String(last.getDate()).padStart(2, "0");
	return `${y}-${String(mo).padStart(2, "0")}-${d}`;
}

function isHardcodedDelivererPlaceholder(name: string): boolean {
	return isHaewonHardcodedLabel(name);
}

function pickLedgerDeliverer(rowVal: string, formVal: string): string {
	const row = String(rowVal ?? "").trim();
	const form = String(formVal ?? "").trim();
	if (row && !isHardcodedDelivererPlaceholder(row)) return row;
	if (form && !isHardcodedDelivererPlaceholder(form)) return form;
	return form || row;
}

function deliveryMethodPrintLabel(method: string): string {
	const t = String(method ?? "").trim();
	if (t === "1" || t === "직접전달") return "직접전달";
	if (t === "2" || t === "우편" || t === "우편발송") return "우편발송";
	if (t === "3" || t === "E-Mail" || t === "이메일") return "E-Mail";
	if (t === "4" || t === "SMS") return "SMS";
	return t || "우편발송";
}

export function normalizeSGu(v: unknown): string {
	const t = String(v ?? "").trim();
	if (t === "1" || t === "2" || t === "3" || t === "4") return t;
	if (t === "직접전달") return "1";
	if (t === "우편" || t === "우편발송") return "2";
	if (t === "E-Mail" || t === "이메일") return "3";
	if (t === "SMS") return "4";
	return "2";
}

const LEDGER_TABLE_HEAD = `<colgroup>
	<col style="width:5%"/><col style="width:9%"/><col style="width:10%"/><col style="width:10%"/><col style="width:12%"/><col style="width:9%"/><col style="width:45%"/>
</colgroup>
<thead>
	<tr>
		<th>일련번호</th>
		<th>성명</th>
		<th>본인부담금</th>
		<th>전달방법</th>
		<th>전달자</th>
		<th>수령자</th>
		<th>수령내용</th>
	</tr>
</thead>`;

/** 장기요양급여비용 명세서 발부대장 — V40100D 기준, 가로 A4 */
export function buildStatementLedgerPrintHtml(
	payYearMonth: string,
	rows: V40100DPrintRow[],
	form: StatementLedgerPrintForm,
	issueDateOverride?: string
): string {
	const periodFromRow = rows.find((r) => String(r.yearMonthLabel || "").trim())?.yearMonthLabel?.trim();
	const period =
		periodFromRow ||
		(payYearMonth.length >= 7
			? `(${payYearMonth.slice(0, 4)}-${payYearMonth.slice(5, 7)}월분)`
			: `(${payYearMonth})`);

	const issueFromView = rows.find((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r.issueDate || "").trim()))
		?.issueDate;
	const issueDate =
		issueDateOverride && /^\d{4}-\d{2}-\d{2}$/.test(issueDateOverride)
			? issueDateOverride
			: issueFromView || lastDayOfPayYearMonth(payYearMonth);

	const useGlobalReceiver = form.recipientName.trim() !== "";

	const bodyRows =
		rows.length === 0
			? `<tr><td class="ld-c" colspan="7">출력할 데이터가 없습니다.</td></tr>`
			: rows
					.map((row, j) => {
						const serial = j + 1;
						const copay = Number(row.recipientBurden || 0).toLocaleString("ko-KR");
						const rowDelivery =
							String(row.deliveryMethod || "").trim() ||
							deliveryMethodPrintLabel(row.sGu || form.deliveryMethod);
						const rowDeliverer = pickLedgerDeliverer(row.deliverer, form.deliverer);
						const rowEnm = (row.receiver || "").trim();
						const recvName = rowEnm
							? escapeHtml(rowEnm)
							: useGlobalReceiver
								? escapeHtml(form.recipientName.trim())
								: escapeHtml(row.recipient || "-");
						const rowRdes = (
							row.receiveContent ||
							form.receiveContent ||
							LEDGER_DEFAULT_RECEIVE
						).trim();
						return `<tr>
				<td class="ld-c">${serial}</td>
				<td class="ld-c">${escapeHtml(row.recipient || "-")}</td>
				<td class="ld-r">${copay}</td>
				<td class="ld-c">${escapeHtml(rowDelivery)}</td>
				<td class="ld-c">${escapeHtml(rowDeliverer)}</td>
				<td class="ld-c">${recvName}</td>
				<td class="ld-l">${escapeHtml(rowRdes)}</td>
			</tr>`;
					})
					.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>명세서 발부대장</title>
<style>
@page {
	size: A4 landscape;
	margin: 10mm 10mm 14mm 10mm;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 9pt; color: #000; background: #fff; }
.ld-head { position: relative; min-height: 54px; margin-bottom: 6px; page-break-after: avoid; break-after: avoid; }
.ld-title-wrap { text-align: center; padding: 2px 96px 0 0; }
.ld-title { font-size: 15pt; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.02em; }
.ld-period { font-size: 11pt; font-weight: 700; }
.ld-approval { position: absolute; top: 0; right: 0; border-collapse: collapse; border: 1px solid #000; font-size: 8.5pt; }
.ld-approval th, .ld-approval td { border: 1px solid #000; width: 52px; text-align: center; vertical-align: middle; padding: 2px 1px; }
.ld-approval th { font-weight: 700; background: #f2f2f2; height: 18px; }
.ld-approval td { height: 28px; }
.ld-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
.ld-tbl thead { display: table-header-group; }
.ld-tbl tbody { display: table-row-group; }
.ld-tbl tr { page-break-inside: avoid; break-inside: avoid; }
.ld-tbl th, .ld-tbl td { border: 1px solid #000; padding: 5px 4px; vertical-align: middle; font-size: 9pt; }
.ld-tbl th { background: #e8e8e8; font-weight: 700; text-align: center; }
.ld-c { text-align: center; }
.ld-r { text-align: right; font-variant-numeric: tabular-nums; padding-right: 6px; }
.ld-l { text-align: left; padding-left: 6px; }
.ld-print-foot {
	margin-top: 8px;
	display: flex;
	justify-content: space-between;
	font-size: 9pt;
	page-break-inside: avoid;
}
.ld-print-foot .ld-pg::after { content: counter(page); }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
	<div class="ld-head">
		<table class="ld-approval" aria-label="결재">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
		<div class="ld-title-wrap">
			<h1 class="ld-title">장기요양급여비용 명세서 발부대장</h1>
			<div class="ld-period">${escapeHtml(period)}</div>
		</div>
	</div>
	<table class="ld-tbl">
		${LEDGER_TABLE_HEAD}
		<tbody>${bodyRows}</tbody>
	</table>
	<div class="ld-print-foot">
		<span>발행일자: ${escapeHtml(issueDate)}</span>
		<span>페이지: <span class="ld-pg"></span></span>
	</div>
</body>
</html>`;
}

/** 장기요양급여명세서 [별지 제24호] — 기관값은 로그인 F00110 / 행 데이터만 사용 (해원 하드코딩 금지) */

function firstDayOfPayYearMonth(payYearMonth: string): string {
	if (payYearMonth.length < 7) return "";
	const y = payYearMonth.slice(0, 4);
	const mo = payYearMonth.slice(5, 7);
	return `${y}-${mo}-01`;
}

function daysInPayMonth(payYearMonth: string): number {
	if (payYearMonth.length < 7) return 0;
	const y = parseInt(payYearMonth.slice(0, 4), 10);
	const mo = parseInt(payYearMonth.slice(5, 7), 10);
	if (!Number.isFinite(y) || !Number.isFinite(mo)) return 0;
	return new Date(y, mo, 0).getDate();
}

function fmtAmt0Blank(n: number): string {
	return n === 0 ? "" : n.toLocaleString("ko-KR");
}

/** F40100 SALMM(YYYYMM / YYYY-MM) → 하단 일자 (일은 공란) */
function formatSalmmFooterDate(payYearMonth: string): string {
	const digits = String(payYearMonth || "").replace(/\D/g, "");
	if (digits.length >= 6) {
		const year = digits.slice(0, 4);
		const moNum = parseInt(digits.slice(4, 6), 10);
		if (Number.isFinite(moNum) && moNum >= 1 && moNum <= 12) {
			return `${year}년 ${moNum}월 &nbsp;&nbsp;&nbsp;일`;
		}
	}
	return `&nbsp;&nbsp;&nbsp;&nbsp;년 &nbsp;&nbsp;월 &nbsp;&nbsp;&nbsp;일`;
}

/** V40100E 월별 급여명세서 (API 매핑) */
export interface V40100EPrintRow {
	PNUM: string;
	SALMM: string;
	recipient: string;
	recognitionNo: string;
	periodFrom: string;
	periodTo: string;
	orgCode: string;
	orgName: string;
	orgAddr: string;
	orgBizNo: string;
	orgOwner: string;
	orgTel: string;
	bankAccount: string;
	otherCostDesc: string;
	daysUsed: number;
	nhaContribution: number;
	recipientContribution: number;
	mealFee: number;
	nonBenefitSnack: number;
	nonBenefitMedical: number;
	beautyCost: number;
	roomUpgradeFee: number;
	contractedMedical: number;
	contractedPrescription: number;
	otherCost: number;
	/** 퇴소 여부 (뷰에 없으면 SalaryStatementPrintSourceRow 보조) */
	pSt?: string;
}

export function statementRowToV40100EFallback(
	payYearMonth: string,
	row: SalaryStatementPrintSourceRow
): V40100EPrintRow {
	const sal1 = parseRowAmount(row.nhaContribution);
	const sal2 = parseRowAmount(row.recipientContribution);
	const meal = parseRowAmount(row.nonBenefitMeal);
	const snack = parseRowAmount(row.nonBenefitSnack);
	const medical = parseRowAmount(row.outpatientFee);
	const beauty = parseRowAmount(row.beautyCost);
	const room = parseRowAmount(row.roomUpgradeFee);
	const cMed = parseRowAmount(row.contractedMedical);
	const cRx = parseRowAmount(row.contractedPrescription);
	const other =
		parseRowAmount(row.bathFee) +
		parseRowAmount(row.dementiaFee) +
		parseRowAmount(row.otherCostsRecipient);
	return {
		PNUM: row.pnum,
		SALMM: payYearMonthToSalmm(payYearMonth) || "",
		recipient: row.recipient,
		recognitionNo: row.recognitionNo,
		periodFrom: firstDayOfPayYearMonth(payYearMonth),
		periodTo: lastDayOfPayYearMonth(payYearMonth),
		orgCode: row.angh,
		orgName: row.annm,
		orgAddr: row.anadd,
		orgBizNo: row.taxnum,
		orgOwner: row.taxown,
		orgTel: row.antel,
		bankAccount: "",
		otherCostDesc: "",
		daysUsed: daysInPayMonth(payYearMonth),
		nhaContribution: sal1,
		recipientContribution: sal2,
		mealFee: meal,
		nonBenefitSnack: snack,
		nonBenefitMedical: medical,
		beautyCost: beauty,
		roomUpgradeFee: room,
		contractedMedical: cMed,
		contractedPrescription: cRx,
		otherCost: other,
		pSt: row.pSt,
	};
}

function formatYmdDisp(ymd: string): string {
	const s = String(ymd || "").trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s;
}

/** 한 명분 본문(페이지 래퍼는 바깥에서 감쌈) — V40100E + 로그인 기관(F00110) */
export function buildBenefitStatement24Body(
	payYearMonth: string,
	row: V40100EPrintRow,
	facility?: LoginFacilityPrintInfo | null
): string {
	row = overlayLoginFacilityOnStatementRow(row, facility);
	const salmm = row.SALMM || payYearMonthToSalmm(payYearMonth) || "";
	const periodFrom = formatYmdDisp(row.periodFrom) || firstDayOfPayYearMonth(payYearMonth);
	const periodTo = formatYmdDisp(row.periodTo) || lastDayOfPayYearMonth(payYearMonth);
	const periodRange =
		periodFrom && periodTo ? `${periodFrom} ~ ${periodTo}` : escapeHtml(payYearMonth);

	const chkOut = row.pSt === "9" ? "■" : "□";
	const chkMid = "□";

	const sal1 = row.nhaContribution;
	const sal2 = row.recipientContribution;
	const v3 = sal1 + sal2;

	const v4 = row.mealFee;
	const v5 = row.roomUpgradeFee;
	const v6 = row.beautyCost;
	const v7a = row.nonBenefitMedical;
	const v7b = row.contractedMedical;
	const v7c = row.contractedPrescription;
	const v8 = row.otherCost + row.nonBenefitSnack;
	const v8Label = row.otherCostDesc || "기타";
	const v10 = v4 + v5 + v6 + v7a + v7b + v7c + v8;
	const v11 = v3 + v10;
	const v12 = sal2 + v10;
	const days = row.daysUsed > 0 ? row.daysUsed : daysInPayMonth(payYearMonth);

	const recognition = String(row.recognitionNo || "").trim() || "—";
	const orgCode = row.orgCode || "";
	const orgName = row.orgName || "";
	const orgAddr = row.orgAddr || "";
	const orgBiz = row.orgBizNo || "";
	const orgOwner = row.orgOwner || "";
	const bankRaw = String(row.bankAccount || "").trim();
	const bankLine = bankRaw
		? bankRaw.includes("입금통장")
			? bankRaw
			: `입금통장정보 : ${bankRaw}`
		: "";
	const footerYm = salmm.length === 6 ? `${salmm.slice(0, 4)}-${salmm.slice(4, 6)}` : payYearMonth;

	const MAIN_BODY_ROWS = 12;
	const innerCalc = `<table class="f24-innercalc" cellspacing="0">
<tr><td class="f24-il">총액(급여+비급여) ⑪(③+⑩)</td><td class="f24-iv">${fmtAmt0Blank(v11)}</td></tr>
<tr><td class="f24-il">본인부담총액 ⑫(①+⑩)</td><td class="f24-iv">${fmtAmt0Blank(v12)}</td></tr>
<tr><td class="f24-il">이미납부 한 금액 ⑬</td><td class="f24-iv">&nbsp;</td></tr>
<tr><td class="f24-il f24-il-top">수납금액 ⑭(⑫-⑬)</td><td class="f24-ipad">
	<table class="f24-fourpay" cellspacing="0">
		<tr><td class="f24-pl">카드</td><td class="f24-pb">&nbsp;</td></tr>
		<tr><td class="f24-pl">현금영수증</td><td class="f24-pb">&nbsp;</td></tr>
		<tr><td class="f24-pl">현금</td><td class="f24-pb">&nbsp;</td></tr>
		<tr><td class="f24-pl">합계</td><td class="f24-pb">&nbsp;</td></tr>
	</table>
</td></tr>
<tr><td class="f24-icash" colspan="2">현금영수증</td></tr>
<tr><td class="f24-il">신분확인번호</td><td class="f24-iv2">&nbsp;</td></tr>
<tr><td class="f24-il">현금승인번호</td><td class="f24-iv2">&nbsp;</td></tr>
<tr><td class="f24-il">비고</td><td class="f24-iv2">&nbsp;</td></tr>
<tr><td class="f24-iuse" colspan="2">사용일수: ${days}</td></tr>
</table>`;

	const fineBullets = [
		"이 명세서(영수증)는 「소득세법」에 따른 의료비 또는 「조세특례제한법」에 따른 현금영수증(현금영수증 승인번호가 적힌 경우) 공제신청에 사용할 수 있습니다. 다만, 지출증빙용으로 발급된 현금영수증(지출증빙)은 공제신청에 사용할 수 없습니다.",
		"이 명세서(영수증)에 대한 세부내역을 요구할 수 있습니다.",
		"비고란은 장기요양기관의 임의활용 란으로 사용합니다. 다만, 복지용구의 경우 품목과 구입·대여를 구분하여 적으시기 바랍니다.",
	]
		.map((t) => `* ${escapeHtml(t)}`)
		.join("<br/>");

	return `<div class="f24-sheet">
<div class="f24-doc">
<div class="f24-toprow">
	<div class="f24-legal">■ 노인장기요양보험법 시행규칙 [별지 제24호서식] &lt;개정 2013.6.10&gt;</div>
	<table class="f24-chktbl" aria-hidden="true">
		<tr><td>퇴소</td><td class="f24-chk">${chkOut}</td></tr>
		<tr><td>중간</td><td class="f24-chk">${chkMid}</td></tr>
	</table>
</div>
<h1 class="f24-title">장기요양급여명세서</h1>

<table class="f24-info" cellspacing="0">
	<tr>
		<td class="f24-lb">장기요양기관기호</td>
		<td class="f24-val">${escapeHtml(orgCode)}</td>
		<td class="f24-lb">장기요양기관명</td>
		<td class="f24-val" colspan="3">${escapeHtml(orgName)}</td>
	</tr>
	<tr>
		<td class="f24-lb">주소</td>
		<td class="f24-val" colspan="3">${escapeHtml(orgAddr)}</td>
		<td class="f24-lb">사업자등록번호</td>
		<td class="f24-val">${escapeHtml(orgBiz)}</td>
	</tr>
	<tr>
		<td class="f24-lb">성명</td>
		<td class="f24-lb">장기요양인정번호</td>
		<td class="f24-lb" colspan="2">급여제공기간</td>
		<td class="f24-lb" colspan="2">영수증번호(연-급여제공월-일련번호)</td>
	</tr>
	<tr>
		<td class="f24-c">${escapeHtml(row.recipient || "—")}</td>
		<td class="f24-c sm">${escapeHtml(recognition)}</td>
		<td class="f24-c" colspan="2">${escapeHtml(periodRange)}</td>
		<td class="f24-c" colspan="2">&nbsp;</td>
	</tr>
</table>

<table class="f24-main" cellspacing="0">
	<colgroup>
		<col class="f24-w-grp" />
		<col class="f24-w-it1" />
		<col class="f24-w-it2" />
		<col class="f24-w-amt" />
		<col class="f24-w-calc" />
	</colgroup>
	<thead>
		<tr>
			<th class="f24-hside">&nbsp;</th>
			<th colspan="2">항목</th>
			<th>금액</th>
			<th>금액산정내역</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td rowspan="3" class="f24-cat">급여</td>
			<td class="f24-item" colspan="2">본인부담금①</td>
			<td class="f24-r">${fmtAmt0Blank(sal2)}</td>
			<td rowspan="${MAIN_BODY_ROWS}" class="f24-calc-cell">${innerCalc}</td>
		</tr>
		<tr>
			<td class="f24-item" colspan="2">공단부담금②</td>
			<td class="f24-r">${fmtAmt0Blank(sal1)}</td>
		</tr>
		<tr>
			<td class="f24-item" colspan="2">급여계 ③(①+②)</td>
			<td class="f24-r">${fmtAmt0Blank(v3)}</td>
		</tr>
		<tr>
			<td rowspan="9" class="f24-cat">비급여</td>
			<td class="f24-item" colspan="2">식사재료비④</td>
			<td class="f24-r">${fmtAmt0Blank(v4)}</td>
		</tr>
		<tr>
			<td class="f24-item" colspan="2">상급침실 이용에 따른 추가비용⑤</td>
			<td class="f24-r">${fmtAmt0Blank(v5)}</td>
		</tr>
		<tr>
			<td class="f24-item" colspan="2">이·미용비⑥</td>
			<td class="f24-r">${fmtAmt0Blank(v6)}</td>
		</tr>
		<tr>
			<td rowspan="5" class="f24-subcat">기타</td>
			<td class="f24-item">의료비⑦</td>
			<td class="f24-r">${fmtAmt0Blank(v7a)}</td>
		</tr>
		<tr>
			<td class="f24-item">촉탁진료비⑦</td>
			<td class="f24-r">${fmtAmt0Blank(v7b)}</td>
		</tr>
		<tr>
			<td class="f24-item">촉탁처방비⑦</td>
			<td class="f24-r">${fmtAmt0Blank(v7c)}</td>
		</tr>
		<tr>
			<td class="f24-item">${escapeHtml(v8Label)} ⑧</td>
			<td class="f24-r">${fmtAmt0Blank(v8)}</td>
		</tr>
		<tr>
			<td class="f24-item">&nbsp;</td>
			<td class="f24-r">&nbsp;</td>
		</tr>
		<tr>
			<td class="f24-item f24-item-sum" colspan="2">비급여계 ⑩(④+⑤+⑥+⑦+⑧)</td>
			<td class="f24-r">${fmtAmt0Blank(v10)}</td>
		</tr>
	</tbody>
</table>

<table class="f24-cardtbl" cellspacing="0">
	<tr>
		<td rowspan="2" class="f24-cardside">신용카드를<br/>사용하실때</td>
		<td class="f24-cl">회원번호</td>
		<td class="f24-cv"></td>
		<td class="f24-cl">승인번호</td>
		<td class="f24-cv"></td>
		<td class="f24-cl">할부</td>
		<td class="f24-cv"></td>
		<td class="f24-cl">사용금액</td>
		<td class="f24-cv f24-cv-amt" rowspan="2"></td>
	</tr>
	<tr>
		<td class="f24-cl">카드종류</td>
		<td class="f24-cv"></td>
		<td class="f24-cl">유효기간</td>
		<td class="f24-cv"></td>
		<td class="f24-cl">가맹점번호</td>
		<td class="f24-cv"></td>
	</tr>
</table>

<div class="f24-bank">${escapeHtml(bankLine)}</div>
<div class="f24-date">${formatSalmmFooterDate(footerYm)}</div>
<div class="f24-foot2">
	<span>장기요양기관명 : ${escapeHtml(orgName)}</span>
	<span class="f24-rep">대표자명 : ${escapeHtml(orgOwner)}</span>
</div>
<div class="f24-notes">${fineBullets}</div>
</div>
</div>`;
}

export function wrapF24PrintHtml(bodyPages: string): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>장기요양급여명세서</title>
<style>
@page { size: A4 portrait; margin: 4mm 5mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html {
	height: 100%;
}
body {
	font-family: 'Malgun Gothic', '맑은 고딕', 'Batang', serif;
	font-size: 9pt;
	line-height: 1.25;
	color: #000;
	background: #d8d8d8;
	min-height: 100%;
	margin: 0;
	padding: 10px 12px;
}
.f24-page {
	page-break-after: always;
	break-after: page;
	width: 100%;
	max-width: 210mm;
	margin: 0 auto;
	background: #fff;
	min-height: calc(100vh - 24px);
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}
.f24-page:last-child {
	page-break-after: auto;
	break-after: auto;
}
/* 서식 전체를 감싸는 굵은 외곽선 + 한 페이지 높이에 맞춤 */
.f24-sheet {
	page-break-inside: avoid;
	break-inside: avoid;
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: calc(100vh - 44px);
	border: 2.5pt solid #000;
	padding: 3.5mm 4mm 4mm;
	box-sizing: border-box;
}
.f24-doc {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	width: 100%;
}
.f24-toprow {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 6px;
	margin-bottom: 1px;
	flex-shrink: 0;
}
.f24-legal {
	font-size: 7.65pt;
	line-height: 1.3;
	flex: 1;
	max-width: 74%;
}
.f24-chktbl {
	border-collapse: collapse;
	border: 1px solid #000;
	font-size: 7.85pt;
	flex-shrink: 0;
}
.f24-chktbl td {
	border: 1px solid #000;
	padding: 3px 10px;
	text-align: center;
	vertical-align: middle;
}
.f24-chktbl td.f24-chk {
	width: 24px;
	font-family: 'Malgun Gothic', monospace;
}
.f24-title {
	text-align: center;
	font-size: 15.5pt;
	font-weight: 700;
	margin: 2px 0 6px;
	letter-spacing: 0.02em;
	flex-shrink: 0;
}
.f24-info {
	width: 100%;
	border-collapse: collapse;
	border: 1px solid #000;
	margin-bottom: 0;
	table-layout: fixed;
	flex-shrink: 0;
}
.f24-info td {
	border: 1px solid #000;
	padding: 5px 7px;
	vertical-align: middle;
	font-size: 8.75pt;
	line-height: 1.25;
}
.f24-info td.f24-lb {
	background: #e4e4e4;
	font-weight: 700;
	text-align: center;
	font-size: 8.2pt;
}
.f24-info td.f24-val { text-align: left; }
.f24-info td.f24-c { text-align: center; }
.f24-info td.sm { font-size: 7.75pt; }
.f24-main {
	width: 100%;
	border-collapse: collapse;
	border: 1px solid #000;
	border-top: none;
	table-layout: fixed;
	margin-top: 0;
	flex-shrink: 0;
}
.f24-main th,
.f24-main td {
	border: 1px solid #000;
	padding: 6px 8px;
	vertical-align: middle;
	font-size: 8.75pt;
	line-height: 1.25;
}
.f24-main thead th {
	background: #dcdcdc;
	font-weight: 700;
	text-align: center;
	padding: 7px 8px;
}
.f24-main thead th.f24-hside {
	width: 9%;
	font-size: 8pt;
	font-weight: 700;
	border-right: 1px solid #000;
}
.f24-w-grp { width: 9%; }
.f24-w-it1 { width: 10%; }
.f24-w-it2 { width: 33%; }
.f24-w-amt { width: 14%; }
.f24-w-calc { width: 34%; }
.f24-main td.f24-cat,
.f24-main td.f24-subcat {
	background: #ececec;
	font-weight: 700;
	text-align: center;
	vertical-align: middle;
	font-size: 8.1pt;
}
.f24-main td.f24-subcat {
	vertical-align: middle;
}
.f24-main td.f24-item {
	text-align: left;
	padding-left: 8px;
}
.f24-main td.f24-item-sum {
	font-weight: 700;
	background: #f4f4f4;
}
.f24-main td.f24-r {
	text-align: right;
	font-variant-numeric: tabular-nums;
	padding-right: 8px;
}
.f24-main td.f24-calc-cell {
	padding: 0;
	vertical-align: top;
}
.f24-innercalc {
	width: 100%;
	border-collapse: collapse;
}
.f24-innercalc td {
	border: 1px solid #000;
	padding: 5px 7px;
	font-size: 8.1pt;
	line-height: 1.2;
	vertical-align: middle;
}
.f24-innercalc td.f24-il {
	font-weight: 600;
	text-align: left;
	width: 54%;
}
.f24-innercalc td.f24-il-top {
	vertical-align: top;
	padding-top: 3px;
}
.f24-innercalc td.f24-iv {
	text-align: right;
	font-variant-numeric: tabular-nums;
	width: 46%;
	padding-right: 3px;
}
.f24-innercalc td.f24-iv2 {
	text-align: left;
	min-height: 16px;
}
.f24-innercalc td.f24-ipad {
	padding: 0;
	vertical-align: top;
	border-left: 1px solid #000;
}
.f24-innercalc td.f24-icash {
	text-align: center;
	font-weight: 700;
	background: #e0e0e0;
	padding: 2px;
}
.f24-innercalc td.f24-iuse {
	text-align: left;
	font-weight: 600;
	padding: 3px 4px;
}
.f24-fourpay {
	width: 100%;
	border-collapse: collapse;
	border: 1px solid #000;
}
.f24-fourpay td {
	border: none;
	border-bottom: 1px solid #000;
	padding: 4px 6px;
	font-size: 8.1pt;
	line-height: 1.2;
}
.f24-fourpay tr:last-child td { border-bottom: none; }
.f24-fourpay td.f24-pl {
	width: 36%;
	font-weight: 600;
	text-align: left;
	background: #f4f4f4;
	border-right: 1px solid #000;
}
.f24-fourpay td.f24-pb {
	text-align: right;
	min-height: 15px;
}
.f24-cardtbl {
	width: 100%;
	border-collapse: collapse;
	margin-top: 5px;
	border: 1px solid #000;
	flex-shrink: 0;
}
.f24-cardtbl td {
	border: 1px solid #000;
	padding: 5px 6px;
	font-size: 8pt;
	vertical-align: middle;
	text-align: center;
	line-height: 1.2;
}
.f24-cardtbl td.f24-cardside {
	width: 11%;
	font-weight: 700;
	background: #e0e0e0;
	line-height: 1.25;
	vertical-align: middle;
}
.f24-cardtbl td.f24-cl {
	background: #eaeaea;
	font-weight: 700;
	width: 8.5%;
}
.f24-cardtbl td.f24-cv {
	min-width: 9%;
	height: 22px;
	text-align: left;
}
.f24-cardtbl td.f24-cv-amt {
	vertical-align: top;
	min-height: 44px;
}
.f24-bank {
	margin-top: 5px;
	padding-top: 4px;
	border-top: 1px solid #000;
	font-size: 8.5pt;
	font-weight: 600;
	line-height: 1.25;
	flex-shrink: 0;
}
.f24-date {
	text-align: center;
	font-size: 10.5pt;
	margin-top: 10px;
	margin-bottom: 4px;
	flex-shrink: 0;
}
.f24-foot2 {
	margin-top: 4px;
	padding-top: 3px;
	border-top: 1px solid #000;
	font-size: 8.5pt;
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 8px;
	flex-shrink: 0;
}
.f24-foot2 .f24-rep { margin-left: auto; }
.f24-notes {
	margin-top: 5px;
	border: 1px solid #000;
	padding: 4px 6px;
	font-size: 7.35pt;
	line-height: 1.38;
	text-align: justify;
	color: #111;
	flex-shrink: 0;
}
@media print {
	html, body {
		background: #fff;
		padding: 0;
		margin: 0;
		height: auto;
	}
	body {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.f24-page {
		min-height: calc(297mm - 8mm);
		max-width: none;
		margin: 0;
		width: 100%;
	}
	.f24-sheet {
		min-height: calc(297mm - 8mm);
		padding: 3mm 3.5mm 3.5mm;
		page-break-inside: avoid;
		break-inside: avoid;
	}
}
</style>
</head>
<body>
${bodyPages}
</body>
</html>`;
}

/** 주민등록번호 마스킹(생년월일 표시값 기준 앞 6자리만) */
function maskResidentIdFromBirthday(birthdayDisp: string): string {
	const raw = String(birthdayDisp ?? "").replace(/\D/g, "");
	if (raw.length >= 8) return `${raw.slice(2, 8)}-*******`;
	if (raw.length === 6) return `${raw}-*******`;
	return "—";
}

/** V40100G 연간 납부확인 집계 (API 매핑) */
interface V40100GMonthAmt {
	month: number;
	nhaContribution: number;
	recipientContribution: number;
	nonBenefit: number;
	total: number;
	recipientBurdenTotal: number;
}

export interface V40100GPrintRow {
	PNUM: string;
	SALYY: string;
	recipient: string;
	rrn: string;
	birthday: string;
	orgCode: string;
	orgName: string;
	orgAddr: string;
	orgBizNo: string;
	orgOwner: string;
	orgTel: string;
	ANGH: string;
	months: V40100GMonthAmt[];
}

export function statementRowToV40100GFallback(
	payYearMonth: string,
	row: SalaryStatementPrintSourceRow
): V40100GPrintRow {
	const mo =
		payYearMonth.length >= 7 ? parseInt(payYearMonth.slice(5, 7), 10) : NaN;
	const sal1 = parseRowAmount(row.nhaContribution);
	const sal2 = parseRowAmount(row.recipientContribution);
	const v4 = parseRowAmount(row.nonBenefitMeal);
	const v5 = parseRowAmount(row.roomUpgradeFee);
	const v6 = parseRowAmount(row.beautyCost);
	const v7a = parseRowAmount(row.outpatientFee);
	const v7b = parseRowAmount(row.contractedMedical);
	const v7c = parseRowAmount(row.contractedPrescription);
	const v8 =
		parseRowAmount(row.bathFee) +
		parseRowAmount(row.dementiaFee) +
		parseRowAmount(row.nonBenefitSnack) +
		parseRowAmount(row.otherCostsRecipient);
	const nonBenefit = v4 + v5 + v6 + v7a + v7b + v7c + v8;
	const months: V40100GMonthAmt[] = [];
	for (let m = 1; m <= 12; m++) {
		if (Number.isFinite(mo) && m === mo) {
			months.push({
				month: m,
				nhaContribution: sal1,
				recipientContribution: sal2,
				nonBenefit,
				total: sal1 + sal2 + nonBenefit,
				recipientBurdenTotal: sal2 + nonBenefit,
			});
		} else {
			months.push({
				month: m,
				nhaContribution: 0,
				recipientContribution: 0,
				nonBenefit: 0,
				total: 0,
				recipientBurdenTotal: 0,
			});
		}
	}
	return {
		PNUM: row.pnum,
		SALYY: payYearMonth.slice(0, 4),
		recipient: row.recipient,
		rrn: "",
		birthday: row.birthday,
		orgCode: row.angh,
		orgName: row.annm,
		orgAddr: row.anadd,
		orgBizNo: row.taxnum,
		orgOwner: row.taxown,
		orgTel: row.antel,
		ANGH: row.angh,
		months,
	};
}

/** 장기요양급여비 납부확인서 [별지 제25호] — V40100G + 로그인 기관(F00110) */
function buildPaymentConfirmation25Body(
	payYearMonth: string,
	row: V40100GPrintRow,
	facility?: LoginFacilityPrintInfo | null
): string {
	row = overlayLoginFacilityOnPaymentRow(row, facility);
	const year =
		(row.SALYY && String(row.SALYY).replace(/\D/g, "").slice(0, 4)) ||
		(payYearMonth.length >= 4 ? payYearMonth.slice(0, 4) : String(new Date().getFullYear()));
	const footerDate = formatSalmmFooterDate(payYearMonth);

	const monthCells: {
		c1: string;
		c2: string;
		c3: string;
		c4: string;
		c5: string;
		c6: string;
		c7: string;
		c8: string;
		c9: string;
	}[] = [];
	let sum1 = 0;
	let sum2 = 0;
	let sum3tot = 0;
	let sum4nb = 0;
	let sum5 = 0;

	for (let i = 0; i < 12; i++) {
		const m =
			row.months?.[i] ??
			({
				month: i + 1,
				nhaContribution: 0,
				recipientContribution: 0,
				nonBenefit: 0,
				total: 0,
				recipientBurdenTotal: 0,
			} as V40100GMonthAmt);
		const hasData =
			m.nhaContribution !== 0 ||
			m.recipientContribution !== 0 ||
			m.nonBenefit !== 0;
		if (hasData) {
			sum1 += m.total;
			sum2 += m.nhaContribution;
			sum3tot += m.recipientContribution;
			sum4nb += m.nonBenefit;
			sum5 += m.recipientBurdenTotal;
			monthCells.push({
				c1: fmtAmt0Blank(m.total),
				c2: fmtAmt0Blank(m.nhaContribution),
				c3: fmtAmt0Blank(m.recipientContribution),
				c4: "",
				c5: "",
				c6: "",
				c7: fmtAmt0Blank(m.nonBenefit),
				c8: fmtAmt0Blank(m.recipientBurdenTotal),
				c9: "",
			});
		} else {
			monthCells.push({
				c1: "",
				c2: "",
				c3: "",
				c4: "",
				c5: "",
				c6: "",
				c7: "",
				c8: "",
				c9: "",
			});
		}
	}

	const f25IncomeDeductionTotal = fmtAmt0Blank(sum3tot);
	const rrnRaw = String(row.rrn || "").trim();
	const rrn = escapeHtml(rrnRaw || maskResidentIdFromBirthday(row.birthday));
	const orgCode = row.orgCode || row.ANGH || "";
	const orgName = row.orgName || "";
	const orgAddr = row.orgAddr || "";
	const orgBiz = row.orgBizNo || "";
	const orgOwner = row.orgOwner || "";
	const orgTel = row.orgTel || "";
	const uniqueLine = `${escapeHtml(orgCode)} (${escapeHtml(orgBiz)})`;
	const addrLine = orgTel
		? `${escapeHtml(orgAddr)} (전화번호: ${escapeHtml(orgTel)})`
		: `${escapeHtml(orgAddr)} (전화번호: )`;

	const bodyRows = monthCells
		.map(
			(c, idx) => `<tr>
	<td class="f25-c">${idx + 1}월</td>
	<td class="f25-r">${c.c1 || "&nbsp;"}</td>
	<td class="f25-r">${c.c2 || "&nbsp;"}</td>
	<td class="f25-r">${c.c3 || "&nbsp;"}</td>
	<td class="f25-r">${c.c4 || "&nbsp;"}</td>
	<td class="f25-r">${c.c5 || "&nbsp;"}</td>
	<td class="f25-r">${c.c6 || "&nbsp;"}</td>
	<td class="f25-r">${c.c7 || "&nbsp;"}</td>
	<td class="f25-r">${c.c8 || "&nbsp;"}</td>
	<td class="f25-c">${c.c9 ? escapeHtml(c.c9) : "&nbsp;"}</td>
</tr>`
		)
		.join("");

	const sumRow = `<tr class="f25-sum">
	<td class="f25-c">계</td>
	<td class="f25-r">${fmtAmt0Blank(sum1)}</td>
	<td class="f25-r">${fmtAmt0Blank(sum2)}</td>
	<td class="f25-r">${fmtAmt0Blank(sum3tot)}</td>
	<td class="f25-r">&nbsp;</td>
	<td class="f25-r">&nbsp;</td>
	<td class="f25-r">&nbsp;</td>
	<td class="f25-r">${fmtAmt0Blank(sum4nb)}</td>
	<td class="f25-r">${fmtAmt0Blank(sum5)}</td>
	<td class="f25-c">&nbsp;</td>
</tr>`;

	return `<div class="f25-sheet">
<div class="f25-legal">■ 노인장기요양보험법 시행규칙 [별지 제25호서식]</div>
<h1 class="f25-title">장기요양급여비 납부확인서</h1>
<div class="f25-issue">발급번호: ${escapeHtml(year)} - </div>

<table class="f25-info" cellspacing="0">
	<tr>
		<td class="f25-lb">수급자 성명</td>
		<td class="f25-v">${escapeHtml(row.recipient || "—")}</td>
		<td class="f25-lb">주민등록번호</td>
		<td class="f25-v">${rrn}</td>
	</tr>
	<tr>
		<td class="f25-lb">장기요양기관명</td>
		<td class="f25-v">${escapeHtml(orgName)}</td>
		<td class="f25-lb">고유번호<br/><span class="f25-sm">(사업자 등록번호)</span></td>
		<td class="f25-v">${uniqueLine}</td>
	</tr>
	<tr>
		<td class="f25-lb">장기요양기관 주소<br/><span class="f25-sm">(전화번호)</span></td>
		<td class="f25-v" colspan="3">${addrLine}</td>
	</tr>
	<tr>
		<td class="f25-lb">대표자 성명</td>
		<td class="f25-v" colspan="3">${escapeHtml(orgOwner)}</td>
	</tr>
</table>

<div class="f25-subcap">${escapeHtml(year)} 년 장기요양급여비 납부내역</div>

<table class="f25-main" cellspacing="0">
	<thead>
		<tr>
			<th rowspan="3" class="f25-th-m">월</th>
			<th rowspan="3" class="f25-th-1">① 총액<br/>(②+③+④)</th>
			<th colspan="5" class="f25-th-grp">급여비 내역</th>
			<th rowspan="3" class="f25-th-4">④ 비급여<br/>수급자<br/>부담액</th>
			<th rowspan="3" class="f25-th-5">⑤ 수급자<br/>부담총액<br/>(③+④)</th>
			<th rowspan="3" class="f25-th-6">⑥<br/>납부일자</th>
		</tr>
		<tr>
			<th rowspan="2" class="f25-th-2">② 공단<br/>부담액</th>
			<th colspan="4" class="f25-th-3">③ 수급자부담액</th>
		</tr>
		<tr>
			<th class="f25-th-s">총계</th>
			<th class="f25-th-s">카드</th>
			<th class="f25-th-s">현금영수증</th>
			<th class="f25-th-s">현금</th>
		</tr>
	</thead>
	<tbody>
		${bodyRows}
		${sumRow}
	</tbody>
</table>

<table class="f25-row7" cellspacing="0">
	<tr>
		<td class="f25-l7">⑦ 소득공제 대상액 총계(=③)</td>
		<td class="f25-r7">${f25IncomeDeductionTotal || "&nbsp;"}</td>
	</tr>
</table>
<p class="f25-note">※ 비급여항목(식사재료비, 상급침실이용료, 이미용비용)은 소득공제 대상에 해당하지 않음</p>

<div class="f25-date">${footerDate}</div>
<div class="f25-sign">장기요양기관 장<span class="f25-seal">(인)</span></div>
<p class="f25-foot">※ 이 납부확인서는 소득세법에 따른 의료비 공제신청에 사용할 수 있습니다.</p>
<p class="f25-foot2">알림: 현금영수증 문의 126 · 인터넷 홈페이지: http://www.taxsave.go.kr</p>
<div class="f25-paper">210mm × 297mm (백상지 80g/m²)</div>
</div>`;
}

function wrapF25PrintHtml(bodyPages: string): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>장기요양급여비 납부확인서</title>
<style>
@page { size: A4 portrait; margin: 6mm 8mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 9.5pt; color: #000; background: #e8e8e8; padding: 10px; }
.f25-page {
	max-width: 210mm;
	margin: 0 auto 12px;
	background: #fff;
	page-break-after: always;
	break-after: page;
}
.f25-page:last-child {
	page-break-after: auto;
	break-after: auto;
	margin-bottom: 0;
}
.f25-sheet {
	border: 2.25pt solid #000;
	padding: 4mm 5mm 5mm;
	min-height: calc(297mm - 12mm);
	page-break-inside: avoid;
	break-inside: avoid;
}
.f25-legal { font-size: 8.2pt; margin-bottom: 4px; }
.f25-title { text-align: center; font-size: 18pt; font-weight: 700; margin: 6px 0 8px; letter-spacing: 0.02em; }
.f25-issue { font-size: 10pt; margin-bottom: 10px; }
.f25-info { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 10px; table-layout: fixed; }
.f25-info td { border: 1px solid #000; padding: 7px 9px; vertical-align: middle; font-size: 9.2pt; line-height: 1.3; }
.f25-info td.f25-lb { width: 18%; background: #e4e4e4; font-weight: 700; text-align: center; }
.f25-info td.f25-v { text-align: left; }
.f25-sm { font-size: 8pt; font-weight: 400; }
.f25-subcap { text-align: center; font-size: 10.5pt; font-weight: 700; margin: 12px 0 6px; }
.f25-main { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
.f25-main th, .f25-main td { border: 1px solid #000; padding: 7px 5px; font-size: 8.4pt; line-height: 1.2; vertical-align: middle; }
.f25-main thead th { background: #dcdcdc; font-weight: 700; text-align: center; }
.f25-th-m { width: 6%; }
.f25-th-1 { width: 10%; }
.f25-th-grp { }
.f25-th-2 { width: 9%; }
.f25-th-3 { }
.f25-th-s { width: 8.5%; }
.f25-th-4 { width: 9%; }
.f25-th-5 { width: 10%; }
.f25-th-6 { width: 9%; }
.f25-main tbody tr td { min-height: 22px; }
.f25-main tbody td.f25-c { text-align: center; }
.f25-main tbody td.f25-r { text-align: right; font-variant-numeric: tabular-nums; padding-right: 5px; }
.f25-main tbody tr.f25-sum td { font-weight: 700; background: #f0f0f0; }
.f25-row7 { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; margin-top: 0; }
.f25-row7 td { border: 1px solid #000; padding: 8px 10px; font-size: 9.2pt; vertical-align: middle; }
.f25-row7 td.f25-l7 { font-weight: 700; width: 72%; background: #eaeaea; }
.f25-row7 td.f25-r7 { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; width: 28%; }
.f25-note { margin-top: 8px; font-size: 8.6pt; line-height: 1.45; }
.f25-date { text-align: center; font-size: 11pt; margin-top: 18px; margin-bottom: 10px; }
.f25-sign { text-align: center; font-size: 14pt; font-weight: 700; margin: 14px 0; }
.f25-seal { font-size: 11pt; font-weight: 400; }
.f25-foot { font-size: 8.8pt; margin-top: 12px; line-height: 1.4; }
.f25-foot2 { font-size: 8.5pt; margin-top: 4px; color: #222; }
.f25-paper { text-align: right; font-size: 7.5pt; color: #555; margin-top: 14px; }
@media print {
	body { background: #fff; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.f25-page { max-width: none; margin: 0; }
	.f25-sheet { min-height: auto; border: 2pt solid #000; page-break-inside: avoid; }
}
</style>
</head>
<body>
${bodyPages}
</body>
</html>`;
}

export function buildPaymentConfirmation25PrintHtml(
	payYearMonth: string,
	rows: V40100GPrintRow[],
	facility?: LoginFacilityPrintInfo | null
): string {
	const body = rows
		.map((row) => `<div class="f25-page">${buildPaymentConfirmation25Body(payYearMonth, row, facility)}</div>`)
		.join("");
	return wrapF25PrintHtml(body);
}
