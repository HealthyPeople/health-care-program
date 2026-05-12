"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCareGradeLabel } from "../../utils/careGrade";

function num(v: unknown): number {
	const n = parseInt(String(v ?? "0").replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

function fmtInt(n: number): string {
	return String(Math.round(n));
}

function formatBirthFromDb(v: unknown): string {
	if (v == null) return "";
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10).replace(/-/g, "");
	if (/^\d{8}$/.test(s)) return s;
	return s;
}

function displayBirth(s: string): string {
	if (!s) return "";
	if (s.length === 8 && /^\d{8}$/.test(s)) {
		return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	}
	if (s.includes("-") && s.length >= 10) return s.slice(0, 10);
	return s;
}

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

function openPrintPreviewWindow(html: string): void {
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

/** 인쇄 1페이지당 본문 행 수(가로 A4·제목·결재란 기준, 브라우저마다 약간 여유) */
const OCCURRENCE_PRINT_ROWS_PAGE1 = 14;
const OCCURRENCE_PRINT_ROWS_NEXT = 24;

function chunkOccurrencePrintPages(rows: StatementRow[]): StatementRow[][] {
	if (rows.length === 0) return [[]];
	const pages: StatementRow[][] = [];
	let i = 0;
	pages.push(rows.slice(i, i + OCCURRENCE_PRINT_ROWS_PAGE1));
	i += OCCURRENCE_PRINT_ROWS_PAGE1;
	while (i < rows.length) {
		pages.push(rows.slice(i, i + OCCURRENCE_PRINT_ROWS_NEXT));
		i += OCCURRENCE_PRINT_ROWS_NEXT;
	}
	return pages;
}

function computeOccurrenceColumnSums(rows: StatementRow[]) {
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
		sumNha += parseRowAmount(row.nhaContribution);
		sumSal2 += parseRowAmount(row.recipientContribution);
		sumB1 += parseRowAmount(row.nonBenefitMeal);
		sumB2 += parseRowAmount(row.nonBenefitSnack);
		sumB3 += parseRowAmount(row.outpatientFee);
		sumB4 += parseRowAmount(row.beautyCost);
		sumB6 += parseRowAmount(row.roomUpgradeFee);
		sumMed += parseRowAmount(row.contractedMedical);
		sumRx += parseRowAmount(row.contractedPrescription);
		sumEsal += parseRowAmount(row.otherCostsRecipient);
		sumBurden += parseRowAmount(row.recipientBurdenTotal);
	}
	return { sumNha, sumSal2, sumB1, sumB2, sumB3, sumB4, sumB6, sumMed, sumRx, sumEsal, sumBurden };
}

function renderOccurrencePrintDataRow(row: StatementRow): string {
	const idDisp = row.recognitionNo.trim() ? escapeHtml(row.recognitionNo) : "-";
	return `<tr>
				<td class="nm">${escapeHtml(row.recipient || "-")}</td>
				<td class="t">${escapeHtml(row.grade || "-")}</td>
				<td class="t id">${idDisp}</td>
				<td class="n">${moneyKo(row.nhaContribution)}</td>
				<td class="n">${moneyKo(row.recipientContribution)}</td>
				<td class="n">${moneyKo(row.nonBenefitMeal)}</td>
				<td class="n">${moneyKo(row.nonBenefitSnack)}</td>
				<td class="n">${moneyKo(row.outpatientFee)}</td>
				<td class="n">${moneyKo(row.beautyCost)}</td>
				<td class="n">${moneyKo(row.roomUpgradeFee)}</td>
				<td class="n">${moneyKo(row.contractedMedical)}</td>
				<td class="n">${moneyKo(row.contractedPrescription)}</td>
				<td class="n">${moneyKo(row.otherCostsRecipient)}</td>
				<td class="n">${moneyKo(row.recipientBurdenTotal)}</td>
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

/** 수급자급여 발생내역서 R40100A — 첨부 서식 레이아웃(가로, 결재란, 합계는 마지막 페이지만) */
function buildSalaryOccurrencePrintHtml(payYearMonth: string, rows: StatementRow[]): string {
	const period =
		payYearMonth.length >= 7
			? `(${payYearMonth.slice(0, 4)}-${payYearMonth.slice(5, 7)}월분)`
			: `(${escapeHtml(payYearMonth)}월분)`;

	const sums = computeOccurrenceColumnSums(rows);
	const fmtSum = (n: number) => n.toLocaleString("ko-KR");
	const sumFooter = `<tfoot>
				<tr>
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
				</tr>
			</tfoot>`;

	const pages = chunkOccurrencePrintPages(rows);
	const totalPages = Math.max(1, pages.length);

	const headFirst = `<div class="head">
		<table class="approval" aria-label="결재">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
		<div class="title-block">
			<h1 class="title">수급자급여 발생내역서</h1>
			<div class="period">${escapeHtml(period)}</div>
		</div>
	</div>`;

	const headContinue = `<div class="continuation-head">${escapeHtml(period)} <span class="cont-note">(계속)</span></div>`;

	const pagesHtml = pages
		.map((chunk, pageIdx) => {
			const isFirst = pageIdx === 0;
			const isLast = pageIdx === pages.length - 1;
			const bodyRows = chunk.map(renderOccurrencePrintDataRow).join("");
			return `<div class="print-page">
		${isFirst ? headFirst : headContinue}
	<div class="data-wrap">
		<table class="data">
			${OCCURRENCE_TABLE_HEAD}
			<tbody>
				${bodyRows}
			</tbody>
			${isLast ? sumFooter : ""}
		</table>
	</div>
	<div class="foot">
		<span>R40100A</span>
		<span>페이지: ${pageIdx + 1} / ${totalPages}</span>
	</div>
</div>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>수급자급여 발생내역서</title>
<style>
@page { size: A4 landscape; margin: 10mm 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', 'Batang', serif; font-size: 9.2pt; color: #000; background: #fff; }
.print-page { page-break-after: always; break-after: page; }
.print-page:last-child { page-break-after: auto; break-after: auto; }
.head { position: relative; min-height: 56px; margin-bottom: 6px; }
.title-block { text-align: center; padding-right: 120px; }
.title { font-size: 17pt; font-weight: 700; text-decoration: underline; letter-spacing: 0.02em; }
.period { font-size: 11pt; margin-top: 6px; }
.approval { position: absolute; top: 0; right: 0; border-collapse: collapse; border: 1px solid #000; font-size: 9pt; }
.approval th, .approval td { border: 1px solid #000; width: 58px; text-align: center; vertical-align: middle; padding: 4px 2px; }
.approval th { font-weight: 700; background: #f2f2f2; height: 22px; }
.approval td { height: 32px; }
.continuation-head { text-align: center; font-size: 11pt; font-weight: 700; margin-bottom: 8px; padding-top: 2px; }
.cont-note { font-weight: 400; font-size: 10pt; }
.data-wrap { margin-top: 4px; }
table.data { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
table.data thead { border-top: 2.5px solid #000; }
table.data th, table.data td { border: 1px solid #000; padding: 4px 3px; vertical-align: middle; word-break: break-word; }
table.data thead th { background: #e0e0e0; font-weight: 700; text-align: center; font-size: 8.5pt; line-height: 1.25; }
table.data tbody td.n { text-align: right; font-variant-numeric: tabular-nums; padding-right: 5px; }
table.data tbody td.t { text-align: center; }
table.data tbody td.nm { text-align: left; padding-left: 5px; }
table.data tbody td.id { font-size: 8.5pt; }
table.data tfoot td { font-weight: 700; background: #eaeaea; }
table.data tfoot td.n { text-align: right; padding-right: 5px; }
table.data tfoot td.lbl { text-align: center; }
.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 10pt; padding: 0 2mm; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/** 명세서 발부대장 인쇄 — 하단 폼(전달방법·전달자·수령자·수령내용) 반영 */
interface StatementLedgerPrintForm {
	deliveryMethod: string;
	deliverer: string;
	recipientName: string;
	receiveContent: string;
}

const LEDGER_DEFAULT_RECEIVE =
	"소식지, 급여제공기록지, 급여비용명세서, 식단표, 프로그램계획표";
const LEDGER_DEFAULT_DELIVERER = "너싱홈 해원";

function lastDayOfPayYearMonth(payYearMonth: string): string {
	if (payYearMonth.length < 7) return "";
	const y = parseInt(payYearMonth.slice(0, 4), 10);
	const mo = parseInt(payYearMonth.slice(5, 7), 10);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return "";
	const last = new Date(y, mo, 0);
	const d = String(last.getDate()).padStart(2, "0");
	return `${y}-${String(mo).padStart(2, "0")}-${d}`;
}

function deliveryMethodPrintLabel(method: string): string {
	const t = method.trim();
	if (t === "우편") return "우편발송";
	return t || "우편발송";
}

const LEDGER_PRINT_ROWS_PAGE1 = 18;
const LEDGER_PRINT_ROWS_NEXT = 26;

function chunkLedgerPrintPages(rows: StatementRow[]): StatementRow[][] {
	if (rows.length === 0) return [[]];
	const pages: StatementRow[][] = [];
	let i = 0;
	pages.push(rows.slice(i, i + LEDGER_PRINT_ROWS_PAGE1));
	i += LEDGER_PRINT_ROWS_PAGE1;
	while (i < rows.length) {
		pages.push(rows.slice(i, i + LEDGER_PRINT_ROWS_NEXT));
		i += LEDGER_PRINT_ROWS_NEXT;
	}
	return pages;
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

/** 장기요양급여비용 명세서 발부대장 — 세로 A4, 첨부 서식 레이아웃 */
function buildStatementLedgerPrintHtml(
	payYearMonth: string,
	rows: StatementRow[],
	form: StatementLedgerPrintForm
): string {
	const period =
		payYearMonth.length >= 7
			? `(${payYearMonth.slice(0, 4)}-${payYearMonth.slice(5, 7)}월분)`
			: `(${escapeHtml(payYearMonth)})`;
	const issueDate = lastDayOfPayYearMonth(payYearMonth);

	const deliveryLabel = escapeHtml(deliveryMethodPrintLabel(form.deliveryMethod));
	const delivererDisp = escapeHtml(form.deliverer.trim() || LEDGER_DEFAULT_DELIVERER);
	const receiveDisp = escapeHtml(form.receiveContent.trim() || LEDGER_DEFAULT_RECEIVE);
	const useGlobalReceiver = form.recipientName.trim() !== "";

	const pages = chunkLedgerPrintPages(rows);
	const totalPages = Math.max(1, pages.length);

	const headFirst = `<div class="ld-head">
		<table class="ld-approval" aria-label="결재">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
		<div class="ld-title-wrap">
			<h1 class="ld-title">장기요양급여비용 명세서 발부대장</h1>
			<div class="ld-period">${escapeHtml(period)}</div>
		</div>
	</div>`;

	const headContinue = `<div class="ld-continue">${escapeHtml(period)} <span class="ld-continue-note">(계속)</span></div>`;

	let serialOffset = 0;
	const pagesHtml = pages
		.map((chunk, pageIdx) => {
			const isFirst = pageIdx === 0;
			const bodyRows = chunk
				.map((row, j) => {
					const serial = serialOffset + j + 1;
					const copay = parseRowAmount(row.recipientBurdenTotal).toLocaleString("ko-KR");
					const recvName = useGlobalReceiver
						? escapeHtml(form.recipientName.trim())
						: escapeHtml(row.recipient || "-");
					return `<tr>
				<td class="ld-c">${serial}</td>
				<td class="ld-c">${escapeHtml(row.recipient || "-")}</td>
				<td class="ld-r">${copay}</td>
				<td class="ld-c">${deliveryLabel}</td>
				<td class="ld-c">${delivererDisp}</td>
				<td class="ld-c">${recvName}</td>
				<td class="ld-l">${receiveDisp}</td>
			</tr>`;
				})
				.join("");
			serialOffset += chunk.length;
			return `<div class="ld-page">
		${isFirst ? headFirst : headContinue}
	<div class="ld-data-wrap">
		<table class="ld-tbl">
			${LEDGER_TABLE_HEAD}
			<tbody>${bodyRows}</tbody>
		</table>
	</div>
	<div class="ld-foot">
		<span>발행일자: ${escapeHtml(issueDate)}</span>
		<span>페이지: ${pageIdx + 1} / ${totalPages}</span>
	</div>
</div>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>명세서 발부대장</title>
<style>
@page { size: A4 portrait; margin: 12mm 14mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 10pt; color: #000; background: #fff; }
.ld-page { page-break-after: always; break-after: page; }
.ld-page:last-child { page-break-after: auto; break-after: auto; }
.ld-head { position: relative; min-height: 72px; margin-bottom: 10px; }
.ld-title-wrap { text-align: center; padding: 4px 100px 0 0; }
.ld-title { font-size: 16pt; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.02em; }
.ld-period { font-size: 12pt; font-weight: 700; }
.ld-approval { position: absolute; top: 0; right: 0; border-collapse: collapse; border: 1px solid #000; font-size: 9pt; }
.ld-approval th, .ld-approval td { border: 1px solid #000; width: 58px; text-align: center; vertical-align: middle; padding: 4px 2px; }
.ld-approval th { font-weight: 700; background: #f2f2f2; height: 22px; }
.ld-approval td { height: 34px; }
.ld-continue { text-align: center; font-size: 11pt; font-weight: 700; margin-bottom: 10px; }
.ld-continue-note { font-weight: 400; font-size: 10pt; }
.ld-data-wrap { width: 100%; }
.ld-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; }
.ld-tbl th, .ld-tbl td { border: 1px solid #000; padding: 5px 5px; vertical-align: middle; word-break: break-word; }
.ld-tbl thead th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 9.5pt; }
.ld-tbl tbody td.ld-c { text-align: center; }
.ld-tbl tbody td.ld-r { text-align: right; font-variant-numeric: tabular-nums; padding-right: 6px; }
.ld-tbl tbody td.ld-l { text-align: left; font-size: 9pt; line-height: 1.35; vertical-align: middle; }
.ld-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 10.5pt; padding: 0 2mm; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/** F40100 한 행(+ F10010 병합 후) → 명세서 그리드 행 (금액 규칙은 월별급여자료와 동일) */
function f40100ToStatementRow(r: Record<string, unknown>): StatementRow {
	const sal1 = num(r.SAL1);
	const sal2 = num(r.SAL2);
	const b1 = num(r.BSAL1);
	const b2 = num(r.BSAL2);
	const b3 = num(r.BSAL3);
	const b4 = num(r.BSAL4);
	const b6 = num(r.BSAL6);
	const b7 = num(r.BSAL7);
	const b8 = num(r.BSAL8);
	const b9 = num(r.BSAL9);
	const esal = num(r.ESAL);
	const sumBs = b1 + b2 + b3 + b4 + b6 + b7 + b8 + b9;
	const benefitTotal = sal1 + sal2 + sumBs + esal;
	const recipientBurdenTotal = sal2 + sumBs + esal;
	const half = Math.floor(b9 / 2);
	return {
		pnum: String(r.PNUM ?? "").trim(),
		recipient: String(r.P_NM ?? ""),
		birthday: displayBirth(formatBirthFromDb(r.P_BRDT)),
		grade: formatCareGradeLabel(String(r.P_GRD ?? "")),
		recognitionNo: String(r.P_YYNO ?? "").trim(),
		benefitTotal: fmtInt(benefitTotal),
		nhaContribution: fmtInt(sal1),
		recipientContribution: fmtInt(sal2),
		nonBenefitMeal: fmtInt(b1),
		nonBenefitSnack: fmtInt(b2),
		roomUpgradeFee: fmtInt(b6),
		outpatientFee: fmtInt(b3),
		contractedMedical: fmtInt(half),
		contractedPrescription: fmtInt(b9 - half),
		beautyCost: fmtInt(b4),
		otherCostsRecipient: fmtInt(esal),
		recipientBurdenTotal: fmtInt(recipientBurdenTotal),
		pSt: String(r.P_ST ?? "").trim(),
		bathFee: fmtInt(b7),
		dementiaFee: fmtInt(b8),
	};
}

interface F10010Row {
	PNUM?: unknown;
	P_YYNO?: unknown;
	P_NM?: unknown;
	P_BRDT?: unknown;
	P_GRD?: unknown;
	P_SEX?: unknown;
	P_ST?: unknown;
	[key: string]: unknown;
}

function memberKey(p: unknown): string {
	return String(p ?? "").trim();
}

/** F40100 행에 F10010 동일 PNUM 수급자 표시 정보 병합 */
function mergeF40100WithF10010(
	f401: Record<string, unknown>,
	byPnum: Map<string, F10010Row>
): Record<string, unknown> {
	const k = memberKey(f401.PNUM);
	const m = k ? byPnum.get(k) : undefined;
	if (!m) return { ...f401 };
	return {
		...f401,
		P_NM: m.P_NM != null && String(m.P_NM).trim() !== "" ? m.P_NM : f401.P_NM,
		P_BRDT: m.P_BRDT != null && String(m.P_BRDT).trim() !== "" ? m.P_BRDT : f401.P_BRDT,
		P_GRD: m.P_GRD != null && String(m.P_GRD).trim() !== "" ? m.P_GRD : f401.P_GRD,
		P_SEX: m.P_SEX != null && String(m.P_SEX).trim() !== "" ? m.P_SEX : f401.P_SEX,
		P_ST: m.P_ST != null && String(m.P_ST).trim() !== "" ? m.P_ST : f401.P_ST,
		P_YYNO:
			m.P_YYNO != null && String(m.P_YYNO).trim() !== "" ? m.P_YYNO : f401.P_YYNO,
	};
}

// 명세서 테이블 행
interface StatementRow {
	pnum: string;
	recipient: string;
	birthday: string;
	grade: string;
	/** F10010/F40100 인정번호 */
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
	/** F10010/F40100 입소1·퇴소9 */
	pSt: string;
	bathFee: string;
	dementiaFee: string;
}

/** 장기요양급여명세서 [별지 제24호] — 기관 고정값(인쇄 서식) */
const F24_FACILITY = {
	code: "14161000067",
	name: "너싱홈 혜원",
	address: "경기도 광주시 초월읍 하오개길71번길 42-29 (초월읍)",
	businessNo: "126-90-05254",
	representative: "권영기",
	bankLine: "입금통장정보 : 기업은행:210-105122-01-015 예금주:너싱홈혜원",
} as const;

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

/** 한 명분 본문(페이지 래퍼는 바깥에서 감쌈) */
function buildBenefitStatement24Body(payYearMonth: string, row: StatementRow): string {
	const periodFrom = firstDayOfPayYearMonth(payYearMonth);
	const periodTo = lastDayOfPayYearMonth(payYearMonth);
	const periodRange =
		periodFrom && periodTo ? `${periodFrom} ~ ${periodTo}` : escapeHtml(payYearMonth);

	const chkOut = row.pSt === "9" ? "■" : "□";
	const chkMid = "□";

	const sal1 = parseRowAmount(row.nhaContribution);
	const sal2 = parseRowAmount(row.recipientContribution);
	const v3 = sal1 + sal2;

	const v4 = parseRowAmount(row.nonBenefitMeal);
	const v5 = parseRowAmount(row.roomUpgradeFee);
	const v6 = parseRowAmount(row.beautyCost);
	const v7a = parseRowAmount(row.outpatientFee);
	const v7b = parseRowAmount(row.contractedMedical);
	const v7c = parseRowAmount(row.contractedPrescription);
	const v8 = parseRowAmount(row.bathFee) + parseRowAmount(row.dementiaFee) + parseRowAmount(row.nonBenefitSnack) + parseRowAmount(row.otherCostsRecipient);
	const v10 = v4 + v5 + v6 + v7a + v7b + v7c + v8;
	const v11 = v3 + v10;
	const v12 = sal2 + v10;
	const days = daysInPayMonth(payYearMonth);

	const recognition = row.recognitionNo.trim() || "—";

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
		<td class="f24-val">${escapeHtml(F24_FACILITY.code)}</td>
		<td class="f24-lb">장기요양기관명</td>
		<td class="f24-val" colspan="3">${escapeHtml(F24_FACILITY.name)}</td>
	</tr>
	<tr>
		<td class="f24-lb">주소</td>
		<td class="f24-val" colspan="3">${escapeHtml(F24_FACILITY.address)}</td>
		<td class="f24-lb">사업자등록번호</td>
		<td class="f24-val">${escapeHtml(F24_FACILITY.businessNo)}</td>
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
			<td class="f24-item">수액1 ⑧</td>
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

<div class="f24-gapfill" aria-hidden="true"></div>

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

<div class="f24-bank">${escapeHtml(F24_FACILITY.bankLine)}</div>
<div class="f24-foot2">
	<span>장기요양기관명 : ${escapeHtml(F24_FACILITY.name)}</span>
	<span class="f24-rep">대표자명 : ${escapeHtml(F24_FACILITY.representative)}</span>
</div>
<div class="f24-notes">${fineBullets}</div>
</div>
</div>`;
}

function wrapF24PrintHtml(bodyPages: string): string {
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
.f24-gapfill {
	flex: 1 1 auto;
	min-height: 3mm;
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

/** 장기요양급여비 납부확인서 [별지 제25호] — 인쇄용 전체 HTML */
function buildPaymentConfirmation25PrintHtml(payYearMonth: string, row: StatementRow): string {
	const year =
		payYearMonth.length >= 4 ? payYearMonth.slice(0, 4) : String(new Date().getFullYear());
	const mo =
		payYearMonth.length >= 7 ? parseInt(payYearMonth.slice(5, 7), 10) : NaN;
	const moIdx = Number.isFinite(mo) && mo >= 1 && mo <= 12 ? mo - 1 : -1;

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
	const v10 = v4 + v5 + v6 + v7a + v7b + v7c + v8;
	const total1 = sal1 + sal2 + v10;
	const total5 = parseRowAmount(row.recipientBurdenTotal);
	const payDateStr = lastDayOfPayYearMonth(payYearMonth);
	const dayPart =
		payDateStr.length >= 10 ? String(parseInt(payDateStr.slice(8, 10), 10) || "") : "";
	const moDisp = Number.isFinite(mo) && mo >= 1 && mo <= 12 ? String(Number(mo)) : "";
	const footerDate =
		payYearMonth.length >= 7 && moDisp && dayPart
			? `${year}년 ${moDisp}월 ${dayPart}일`
			: `${year}년 &nbsp;&nbsp;월 &nbsp;&nbsp;일`;

	const monthCells: { c1: string; c2: string; c3: string; c4: string; c5: string; c6: string; c7: string; c8: string; c9: string }[] = [];
	let sum1 = 0;
	let sum2 = 0;
	let sum3tot = 0;
	let sum4nb = 0;
	let sum5 = 0;
	for (let i = 0; i < 12; i++) {
		if (i === moIdx) {
			sum1 += total1;
			sum2 += sal1;
			sum3tot += sal2;
			sum4nb += v10;
			sum5 += total5;
			monthCells.push({
				c1: fmtAmt0Blank(total1),
				c2: fmtAmt0Blank(sal1),
				c3: fmtAmt0Blank(sal2),
				c4: "",
				c5: "",
				c6: "",
				c7: fmtAmt0Blank(v10),
				c8: fmtAmt0Blank(total5),
				c9: payDateStr,
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
	const rrn = escapeHtml(maskResidentIdFromBirthday(row.birthday));
	const uniqueLine = `${escapeHtml(F24_FACILITY.code)} (${escapeHtml(F24_FACILITY.businessNo)})`;
	const addrLine = `${escapeHtml(F24_FACILITY.address)} (전화번호: )`;

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

	const inner = `<div class="f25-page">
<div class="f25-sheet">
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
		<td class="f25-v">${escapeHtml(F24_FACILITY.name)}</td>
		<td class="f25-lb">고유번호<br/><span class="f25-sm">(사업자 등록번호)</span></td>
		<td class="f25-v">${uniqueLine}</td>
	</tr>
	<tr>
		<td class="f25-lb">장기요양기관 주소<br/><span class="f25-sm">(전화번호)</span></td>
		<td class="f25-v" colspan="3">${addrLine}</td>
	</tr>
	<tr>
		<td class="f25-lb">대표자 성명</td>
		<td class="f25-v" colspan="3">${escapeHtml(F24_FACILITY.representative)}</td>
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
</div>
</div>`;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>장기요양급여비 납부확인서</title>
<style>
@page { size: A4 portrait; margin: 6mm 8mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 9.5pt; color: #000; background: #e8e8e8; padding: 10px; }
.f25-page { max-width: 210mm; margin: 0 auto; background: #fff; }
.f25-sheet {
	border: 2.25pt solid #000;
	padding: 4mm 5mm 5mm;
	min-height: calc(297mm - 12mm);
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
	.f25-page { max-width: none; }
	.f25-sheet { min-height: auto; border: 2pt solid #000; page-break-inside: avoid; }
}
</style>
</head>
<body>
${inner}
</body>
</html>`;
}

// 하단 폼 데이터
interface StatementForm {
	recipient: string;
	deliveryMethod: string;
	recipientName: string;
	receiveContent: string;
	birthday: string;
	deliverer: string;
}

const TABS = [
	{ id: "occurrence", label: "발생내역서" },
	{ id: "ledger", label: "발부대장" },
	{ id: "individual", label: "개별급여명세서" },
	{ id: "total", label: "전체급여명세서" },
	{ id: "payment", label: "납부확인서" },
] as const;

const TAB_TITLES: Record<(typeof TABS)[number]["id"], string> = {
	occurrence: "수급자급여 발생내역서",
	ledger: "명세서 발부대장",
	individual: "개별급여명세서",
	total: "전체급여명세서",
	payment: "납부확인서",
};

const initialForm: StatementForm = {
	recipient: "",
	deliveryMethod: "우편",
	recipientName: "",
	receiveContent: "소식지, 급여제공기록지, 급여비용명세서, 식단표, 프로그램계획표",
	birthday: "",
	deliverer: "너싱홈 해원",
};

export default function MonthlySalaryStatement() {
	const router = useRouter();
	const [payYearMonth, setPayYearMonth] = useState("2026-01");
	const [recipientFilter, setRecipientFilter] = useState("");
	const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("ledger");
	const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
	const [formData, setFormData] = useState<StatementForm>(initialForm);
	const [selectedPnum, setSelectedPnum] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);

	const tabTitle = TAB_TITLES[activeTab];

	const filteredRows = useMemo(() => {
		const q = recipientFilter.trim().toLowerCase();
		if (!q) return statementRows;
		return statementRows.filter((r) => r.recipient.toLowerCase().includes(q));
	}, [statementRows, recipientFilter]);

	const printOccurrence = useCallback(() => {
		if (filteredRows.length === 0) {
			alert(
				statementRows.length === 0
					? "급여년월을 선택한 뒤 검색해 주세요."
					: "출력할 행이 없습니다. 수급자 조건을 확인해 주세요."
			);
			return;
		}
		const html = buildSalaryOccurrencePrintHtml(payYearMonth, filteredRows);
		openPrintPreviewWindow(html);
	}, [payYearMonth, filteredRows, statementRows.length]);

	const printLedger = useCallback(() => {
		if (filteredRows.length === 0) {
			alert(
				statementRows.length === 0
					? "급여년월을 선택한 뒤 검색해 주세요."
					: "출력할 행이 없습니다. 수급자 조건을 확인해 주세요."
			);
			return;
		}
		const html = buildStatementLedgerPrintHtml(payYearMonth, filteredRows, {
			deliveryMethod: formData.deliveryMethod,
			deliverer: formData.deliverer,
			recipientName: formData.recipientName,
			receiveContent: formData.receiveContent,
		});
		openPrintPreviewWindow(html);
	}, [payYearMonth, filteredRows, statementRows.length, formData]);

	const printBenefitStatementIndividual = useCallback(() => {
		if (selectedPnum == null || String(selectedPnum).trim() === "") {
			alert("개별 급여명세서는 목록에서 수급자를 한 명 선택한 뒤 출력해 주세요.");
			return;
		}
		const row = statementRows.find((r) => r.pnum === selectedPnum);
		if (!row) {
			alert("선택한 수급자의 급여 데이터를 찾을 수 없습니다. 검색 후 다시 선택해 주세요.");
			return;
		}
		const body = `<div class="f24-page">${buildBenefitStatement24Body(payYearMonth, row)}</div>`;
		openPrintPreviewWindow(wrapF24PrintHtml(body));
	}, [payYearMonth, selectedPnum, statementRows]);

	const printBenefitStatementTotal = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const [res401, res100] = await Promise.all([
				fetch(`/api/f40100?salmm=${encodeURIComponent(salmm)}`),
				fetch("/api/f10010"),
			]);
			const j401 = await res401.json();
			const j100 = await res100.json();
			if (!j401.success) {
				alert(j401.error || "F40100 조회에 실패했습니다.");
				return;
			}
			const f401Rows: Record<string, unknown>[] = Array.isArray(j401.data) ? j401.data : [];
			const f100Rows: F10010Row[] = j100.success && Array.isArray(j100.data) ? j100.data : [];
			const byPnum = new Map<string, F10010Row>();
			for (const m of f100Rows) {
				const k = memberKey(m.PNUM);
				if (k) byPnum.set(k, m);
			}
			const merged = f401Rows.map((row) => mergeF40100WithF10010(row, byPnum));
			const rows = merged.map((r) => f40100ToStatementRow(r));
			if (rows.length === 0) {
				alert("해당 급여년월에 출력할 수급자 급여 데이터가 없습니다.");
				return;
			}
			const inner = rows
				.map((r) => `<div class="f24-page">${buildBenefitStatement24Body(payYearMonth, r)}</div>`)
				.join("");
			openPrintPreviewWindow(wrapF24PrintHtml(inner));
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다.");
		}
	}, [payYearMonth]);

	const printPaymentConfirmation = useCallback(() => {
		if (selectedPnum == null || String(selectedPnum).trim() === "") {
			alert("납부확인서는 목록에서 수급자를 한 명 선택한 뒤 출력해 주세요.");
			return;
		}
		const row = statementRows.find((r) => r.pnum === selectedPnum);
		if (!row) {
			alert("선택한 수급자의 급여 데이터를 찾을 수 없습니다. 검색 후 다시 선택해 주세요.");
			return;
		}
		const html = buildPaymentConfirmation25PrintHtml(payYearMonth, row);
		openPrintPreviewWindow(html);
	}, [payYearMonth, selectedPnum, statementRows]);

	const handleDocumentKindClick = useCallback(
		(id: (typeof TABS)[number]["id"]) => {
			if (id === "occurrence") {
				setActiveTab("occurrence");
				printOccurrence();
				return;
			}
			if (id === "ledger") {
				setActiveTab("ledger");
				printLedger();
				return;
			}
			if (id === "individual") {
				setActiveTab("individual");
				printBenefitStatementIndividual();
				return;
			}
			if (id === "total") {
				setActiveTab("total");
				void printBenefitStatementTotal();
				return;
			}
			if (id === "payment") {
				setActiveTab("payment");
				printPaymentConfirmation();
				return;
			}
			setActiveTab(id);
		},
		[
			printOccurrence,
			printLedger,
			printBenefitStatementIndividual,
			printBenefitStatementTotal,
			printPaymentConfirmation,
		]
	);

	const isOccurrenceView = activeTab === "occurrence";
	const handleSearch = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setSearchError(null);
		setLoading(true);
		try {
			const f100Url =
				recipientFilter.trim() !== ""
					? `/api/f10010?name=${encodeURIComponent(recipientFilter.trim())}`
					: "/api/f10010";

			const [res401, res100] = await Promise.all([
				fetch(`/api/f40100?salmm=${encodeURIComponent(salmm)}`),
				fetch(f100Url),
			]);

			const j401 = await res401.json();
			const j100 = await res100.json();

			if (!j401.success) {
				setSearchError(j401.error || "F40100 조회에 실패했습니다.");
				setStatementRows([]);
				return;
			}
			if (!j100.success) {
				setSearchError(j100.error || "F10010 조회에 실패했습니다. 급여만 표시합니다.");
			}

			const f401Rows: Record<string, unknown>[] = Array.isArray(j401.data) ? j401.data : [];
			const f100Rows: F10010Row[] = j100.success && Array.isArray(j100.data) ? j100.data : [];

			const byPnum = new Map<string, F10010Row>();
			for (const m of f100Rows) {
				const k = memberKey(m.PNUM);
				if (k) byPnum.set(k, m);
			}

			const pnumAllow =
				recipientFilter.trim() !== "" && f100Rows.length > 0
					? new Set(f100Rows.map((m) => memberKey(m.PNUM)).filter(Boolean))
					: null;

			let merged = f401Rows.map((row) => mergeF40100WithF10010(row, byPnum));
			if (pnumAllow && pnumAllow.size > 0) {
				merged = merged.filter((row) => pnumAllow!.has(memberKey(row.PNUM)));
			}

			setStatementRows(merged.map((r) => f40100ToStatementRow(r)));
			setSelectedPnum(null);
		} catch (e) {
			console.error(e);
			setSearchError(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다.");
			setStatementRows([]);
		} finally {
			setLoading(false);
		}
	}, [payYearMonth, recipientFilter]);

	const handleClose = () => {
		router.back();
	};

	const handleSave = () => {
		alert(
			"명세서 발부대장(전달방법·수령자 등) 저장용 DB/API는 아직 없습니다.\n" +
				"급여 금액은 F40100에서 관리되며, 월별 급여자료 화면에서 수정할 수 있습니다."
		);
	};

	const handleRowClick = (row: StatementRow) => {
		setSelectedPnum(row.pnum);
		const ym = payYearMonth;
		const dispYm =
			ym.length >= 7 ? `${ym.slice(0, 4)}년 ${ym.slice(5, 7).replace(/^0/, "") || ym.slice(5, 7)}월` : ym;
		const receiveContent =
			`장기요양급여비용 명세서 발부 — 급여년월 ${dispYm}\n` +
			`급여합계 ${row.benefitTotal}원 (공단 ${row.nhaContribution} / 본인부담 ${row.recipientContribution})`;
		setFormData((prev) => ({
			...prev,
			recipient: row.recipient,
			birthday: row.birthday,
			receiveContent,
		}));
	};

	return (
		<div className="flex min-h-screen flex-col bg-white text-black">
			<div className="flex h-[calc(100vh-56px)] min-h-0 flex-1 flex-col overflow-hidden bg-white">
				{/* 상단: 제목 + 조회조건 + 탭 + 버튼 */}
				<div className="border-b border-blue-200 bg-blue-50/50 p-4">
					<div className="mb-3 flex flex-wrap items-center gap-4">
						<h2 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-center text-base font-semibold text-blue-900">
							{activeTab === "occurrence" ? (
								<span className="block">{tabTitle}</span>
							) : (
								<>
									장기요양급여비용
									<br />
									{activeTab === "ledger" ? "명세서발부대장" : tabTitle}
								</>
							)}
						</h2>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">급여년월</label>
							<input
								type="month"
								value={payYearMonth}
								onChange={(e) => setPayYearMonth(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">수급자</label>
							<input
								type="text"
								value={recipientFilter}
								onChange={(e) => setRecipientFilter(e.target.value)}
								placeholder="이름 (검색 시 F10010·F40100 동시 조회)"
								className="min-w-[160px] rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="ml-auto flex gap-2">
							<button
								type="button"
								onClick={handleSearch}
								disabled={loading}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								{loading ? "조회 중…" : "검색"}
							</button>

						</div>
					</div>
					{searchError && (
						<div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
							{searchError}
						</div>
					)}
					{/* 탭 — 서식 구분(동일 F40100+F10010 데이터 기준, 추후 탭별 출력 분기 가능) */}
					<div className="flex flex-wrap gap-2">
						{TABS.map((tab) => (
							<button
								type="button"
								key={tab.id}
								onClick={() => handleDocumentKindClick(tab.id)}
								className={`rounded-lg border-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 ${
									activeTab === tab.id
										? "border-zinc-700 bg-zinc-200 text-zinc-900 shadow-inner"
										: "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* 중앙: 데이터 테이블 */}
				<div className="flex-1 overflow-hidden border-b border-blue-200">
					<div className="h-full overflow-auto">
						<table
							className={`w-full text-xs ${isOccurrenceView ? "min-w-[1280px]" : "min-w-[980px]"}`}
						>
							{isOccurrenceView ? (
								<>
									<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
										<tr>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												수급자
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												등급
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												인정번호
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												공단부담금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												수급자부담금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												비급여식대
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												비급여간식
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												비급여의료비
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												이미용
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												상급침실료
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												촉탁의료비
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												처방비
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												기타비용
											</th>
											<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
												수급자부담금합계
											</th>
										</tr>
									</thead>
									<tbody>
										{loading ? (
											<tr>
												<td colSpan={14} className="px-2 py-8 text-center text-blue-900/60">
													조회 중입니다…
												</td>
											</tr>
										) : filteredRows.length === 0 ? (
											<tr>
												<td colSpan={14} className="px-2 py-8 text-center text-blue-900/60">
													{statementRows.length === 0
														? "데이터가 없습니다. 급여년월을 선택한 뒤 검색해 주세요."
														: "수급자명 필터에 맞는 행이 없습니다."}
												</td>
											</tr>
										) : (
											filteredRows.map((row, idx) => (
												<tr
													key={`${row.pnum}-${idx}`}
													onClick={() => handleRowClick(row)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/50 ${
														selectedPnum != null && selectedPnum === row.pnum
															? "bg-blue-100"
															: ""
													}`}
												>
													<td className="border-r border-blue-100 px-2 py-1.5 text-left">
														{row.recipient}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.grade}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center text-[11px]">
														{row.recognitionNo || "—"}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.nhaContribution).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.recipientContribution).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.nonBenefitMeal).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.nonBenefitSnack).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.outpatientFee).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.beautyCost).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.roomUpgradeFee).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.contractedMedical).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.contractedPrescription).toLocaleString("ko-KR")}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-right tabular-nums">
														{Number(row.otherCostsRecipient).toLocaleString("ko-KR")}
													</td>
													<td className="px-2 py-1.5 text-right font-medium tabular-nums text-blue-900">
														{Number(row.recipientBurdenTotal).toLocaleString("ko-KR")}
													</td>
												</tr>
											))
										)}
									</tbody>
								</>
							) : (
								<>
									<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
										<tr>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												수급자
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												생일
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												등급
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												급여합계
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												공단부담금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												수급자부담금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												비급여식대
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												병실승급비
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												외래진료비
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												촉탁의료
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												촉탁처방
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
												이미용비
											</th>
											<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
												기타비용 수급
											</th>
										</tr>
									</thead>
									<tbody>
										{loading ? (
											<tr>
												<td colSpan={13} className="px-2 py-8 text-center text-blue-900/60">
													조회 중입니다…
												</td>
											</tr>
										) : filteredRows.length === 0 ? (
											<tr>
												<td colSpan={13} className="px-2 py-8 text-center text-blue-900/60">
													{statementRows.length === 0
														? "데이터가 없습니다. 급여년월을 선택한 뒤 검색해 주세요. (F40100 급여 HEAD)"
														: "수급자명 필터에 맞는 행이 없습니다."}
												</td>
											</tr>
										) : (
											filteredRows.map((row, idx) => (
												<tr
													key={`${row.pnum}-${idx}`}
													onClick={() => handleRowClick(row)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/50 ${
														selectedPnum != null && selectedPnum === row.pnum
															? "bg-blue-100"
															: ""
													}`}
												>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.recipient}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.birthday}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.grade}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.benefitTotal}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.nhaContribution}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.recipientContribution}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.nonBenefitMeal}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.roomUpgradeFee}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.outpatientFee}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.contractedMedical}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.contractedPrescription}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.beautyCost}
													</td>
													<td className="px-2 py-1.5 text-center">{row.otherCostsRecipient}</td>
												</tr>
											))
										)}
									</tbody>
								</>
							)}
						</table>
					</div>
				</div>

				{/* 하단: 데이터 입력 및 액션 폼 */}
				<div className="flex flex-wrap gap-6 border-t border-blue-200 bg-blue-50/30 p-4">
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex items-center gap-2">
							<label className="w-20 shrink-0 text-sm font-medium text-blue-900">수급자</label>
							<input
								type="text"
								value={formData.recipient}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, recipient: e.target.value }))
								}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-20 shrink-0 text-sm font-medium text-blue-900">전달방법</label>
							<select
								value={formData.deliveryMethod}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										deliveryMethod: e.target.value,
									}))
								}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							>
								<option value="직접전달">직접전달</option>
								<option value="우편">우편</option>
								<option value="기타">기타</option>
							</select>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-20 shrink-0 text-sm font-medium text-blue-900">수령자</label>
							<input
								type="text"
								value={formData.recipientName}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										recipientName: e.target.value,
									}))
								}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-start gap-2">
							<label className="w-20 shrink-0 pt-1.5 text-sm font-medium text-blue-900">수령내용</label>
							<textarea
								value={formData.receiveContent}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										receiveContent: e.target.value,
									}))
								}
								rows={3}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex items-center gap-2">
							<label className="w-20 shrink-0 text-sm font-medium text-blue-900">생년월일</label>
							<input
								type="text"
								value={formData.birthday}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, birthday: e.target.value }))
								}
								placeholder="YYYY-MM-DD"
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-20 shrink-0 text-sm font-medium text-blue-900">전달자</label>
							<input
								type="text"
								value={formData.deliverer}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, deliverer: e.target.value }))
								}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="mt-2 flex gap-2">
							<button
								type="button"
								onClick={handleSave}
								className="rounded border border-blue-500 bg-blue-500 px-6 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
							>
								저장
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
