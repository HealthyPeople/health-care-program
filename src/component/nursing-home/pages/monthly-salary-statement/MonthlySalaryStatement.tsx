"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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

/** 기본 급여년월 = 전월 (YYYY-MM) */
function getPreviousYearMonthInput(): string {
	const d = new Date();
	d.setMonth(d.getMonth() - 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
interface V40100PrintRow {
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
function buildSalaryOccurrencePrintHtml(payYearMonth: string, rows: V40100PrintRow[]): string {
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
interface StatementLedgerPrintForm {
	deliveryMethod: string;
	deliverer: string;
	recipientName: string;
	receiveContent: string;
}

/** V40100D 명세서 발부대장 (API 매핑) */
interface V40100DPrintRow {
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
	const t = String(method ?? "").trim();
	if (t === "1" || t === "직접전달") return "직접전달";
	if (t === "2" || t === "우편" || t === "우편발송") return "우편발송";
	if (t === "3" || t === "E-Mail" || t === "이메일") return "E-Mail";
	if (t === "4" || t === "SMS") return "SMS";
	return t || "우편발송";
}

function normalizeSGu(v: unknown): string {
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
function buildStatementLedgerPrintHtml(
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
						const rowDeliverer = (
							row.deliverer ||
							form.deliverer ||
							LEDGER_DEFAULT_DELIVERER
						).trim();
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
		snm: String(r.SNM ?? "").trim(),
		sGu: (() => {
			const t = String(r.S_GU ?? "").trim();
			return t ? normalizeSGu(t) : "";
		})(),
		enm: String(r.ENM ?? "").trim(),
		rdes: String(r.RDES ?? "").trim(),
		/** F40100 기관정보 */
		angh: String(r.ANGH ?? "").trim(),
		annm: String(r.ANNM ?? "").trim(),
		anadd: String(r.ANADD ?? "").trim(),
		taxnum: String(r.TAXNUM ?? "").trim(),
		taxown: String(r.TAXOWN ?? "").trim(),
		antel: String(r.ANTEL ?? "").trim(),
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
	/** F40100 전달자 */
	snm: string;
	/** F40100 전달방법 코드 1~4 */
	sGu: string;
	/** F40100 수령자 */
	enm: string;
	/** F40100 수령내용 */
	rdes: string;
	/** F40100 고유번호 */
	angh: string;
	/** F40100 장기요양기관명 */
	annm: string;
	/** F40100 장기요양기관 주소 */
	anadd: string;
	/** F40100 사업자 등록번호 */
	taxnum: string;
	/** F40100 대표자 성명 */
	taxown: string;
	/** F40100 전화번호 */
	antel: string;
}

/** 장기요양급여명세서 [별지 제24호] — 기관 고정값(인쇄 서식, F40100 공란 시 보조) */
const F24_FACILITY = {
	code: "14161000067",
	name: "너싱홈 혜원",
	address: "경기도 광주시 초월읍 하오개길71번길 42-29 (초월읍)",
	businessNo: "126-90-05254",
	representative: "권영기",
	bankLine: "입금통장정보 : 기업은행:210-105122-01-015 예금주:너싱홈혜원",
} as const;

/** F40100 기관정보가 비어 있으면 F00110 값으로 보완 */
function mergeF40100FacilityFromF00110(
	f401: Record<string, unknown>,
	facility: Record<string, unknown> | null
): Record<string, unknown> {
	if (!facility) return { ...f401 };
	const pick = (key: string) => {
		const cur = String(f401[key] ?? "").trim();
		if (cur) return cur;
		return String(facility[key] ?? "").trim() || f401[key];
	};
	return {
		...f401,
		ANGH: pick("ANGH"),
		ANNM: pick("ANNM"),
		ANADD: pick("ANADD"),
		TAXNUM: pick("TAXNUM"),
		TAXOWN: pick("TAXOWN"),
		ANTEL: pick("ANTEL"),
	};
}

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
interface V40100EPrintRow {
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
	/** 퇴소 여부 (뷰에 없으면 StatementRow 보조) */
	pSt?: string;
}

function statementRowToV40100EFallback(
	payYearMonth: string,
	row: StatementRow
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

/** 한 명분 본문(페이지 래퍼는 바깥에서 감쌈) — V40100E 기준 */
function buildBenefitStatement24Body(
	payYearMonth: string,
	row: V40100EPrintRow
): string {
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
	const orgCode = row.orgCode || F24_FACILITY.code;
	const orgName = row.orgName || F24_FACILITY.name;
	const orgAddr = row.orgAddr || F24_FACILITY.address;
	const orgBiz = row.orgBizNo || F24_FACILITY.businessNo;
	const orgOwner = row.orgOwner || F24_FACILITY.representative;
	const bankLine = row.bankAccount
		? `입금통장정보 : ${row.bankAccount}`
		: F24_FACILITY.bankLine;
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

interface V40100GPrintRow {
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

function statementRowToV40100GFallback(
	payYearMonth: string,
	row: StatementRow
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

/** 장기요양급여비 납부확인서 [별지 제25호] — V40100G 기준 본문 */
function buildPaymentConfirmation25Body(
	payYearMonth: string,
	row: V40100GPrintRow
): string {
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
	const orgCode = row.orgCode || row.ANGH || F24_FACILITY.code;
	const orgName = row.orgName || F24_FACILITY.name;
	const orgAddr = row.orgAddr || F24_FACILITY.address;
	const orgBiz = row.orgBizNo || F24_FACILITY.businessNo;
	const orgOwner = row.orgOwner || F24_FACILITY.representative;
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

function buildPaymentConfirmation25PrintHtml(
	payYearMonth: string,
	rows: V40100GPrintRow[]
): string {
	const body = rows
		.map((row) => `<div class="f25-page">${buildPaymentConfirmation25Body(payYearMonth, row)}</div>`)
		.join("");
	return wrapF25PrintHtml(body);
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
	{ id: "occurrence", label: "전체 발생내역서 출력" },
	{ id: "ledger", label: "전체 발부대장 출력" },
	{ id: "statement", label: "급여명세서 출력" },
	{ id: "payment", label: "납부확인서 출력" },
] as const;

const TAB_TITLES: Record<(typeof TABS)[number]["id"], string> = {
	occurrence: "수급자급여 발생내역서",
	ledger: "명세서 발부대장",
	statement: "급여명세서",
	payment: "납부확인서",
};

const initialForm: StatementForm = {
	recipient: "",
	deliveryMethod: "2",
	recipientName: "",
	receiveContent: "소식지, 급여제공기록지, 급여비용명세서, 식단표, 프로그램계획표",
	birthday: "",
	deliverer: "너싱홈 해원",
};

export default function MonthlySalaryStatement() {
	const router = useRouter();
	const [payYearMonth, setPayYearMonth] = useState(() => getPreviousYearMonthInput());
	const [recipientFilter, setRecipientFilter] = useState("");
	const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"] | null>(null);
	const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
	const [formData, setFormData] = useState<StatementForm>(initialForm);
	const [formSnapshot, setFormSnapshot] = useState<StatementForm>(initialForm);
	const [formEditMode, setFormEditMode] = useState(false);
	const [selectedPnum, setSelectedPnum] = useState<string | null>(null);
	const [checkedPnums, setCheckedPnums] = useState<Set<string>>(() => new Set());
	const [loading, setLoading] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [facilityIssueDate, setFacilityIssueDate] = useState("");
	const [issueDateModalOpen, setIssueDateModalOpen] = useState(false);
	const [issueDateDraft, setIssueDateDraft] = useState("");

	const tabTitle = activeTab ? TAB_TITLES[activeTab] : TAB_TITLES.ledger;

	const filteredRows = useMemo(() => {
		const q = recipientFilter.trim().toLowerCase();
		if (!q) return statementRows;
		return statementRows.filter(
			(r) =>
				r.recipient.toLowerCase().includes(q) ||
				String(r.pnum ?? "")
					.toLowerCase()
					.includes(q)
		);
	}, [statementRows, recipientFilter]);

	const filteredPnums = useMemo(
		() => filteredRows.map((r) => r.pnum).filter((p) => p != null && String(p).trim() !== ""),
		[filteredRows]
	);

	const allFilteredChecked =
		filteredPnums.length > 0 && filteredPnums.every((p) => checkedPnums.has(p));
	const someFilteredChecked =
		filteredPnums.some((p) => checkedPnums.has(p)) && !allFilteredChecked;

	const toggleCheckedPnum = (pnum: string, next?: boolean) => {
		setCheckedPnums((prev) => {
			const n = new Set(prev);
			const shouldCheck = next ?? !n.has(pnum);
			if (shouldCheck) n.add(pnum);
			else n.delete(pnum);
			return n;
		});
	};

	const toggleSelectAllFiltered = () => {
		setCheckedPnums((prev) => {
			const n = new Set(prev);
			if (allFilteredChecked) {
				for (const p of filteredPnums) n.delete(p);
			} else {
				for (const p of filteredPnums) n.add(p);
			}
			return n;
		});
	};

	const printOccurrence = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch(`/api/v40100?salmm=${encodeURIComponent(salmm)}`);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100(발생내역서) 조회에 실패했습니다.");
				return;
			}
			let list: V40100PrintRow[] = Array.isArray(json.data) ? json.data : [];
			const q = recipientFilter.trim().toLowerCase();
			if (q) {
				list = list.filter(
					(r) =>
						r.recipient.toLowerCase().includes(q) ||
						String(r.PNUM ?? "")
							.toLowerCase()
							.includes(q)
				);
			}
			if (list.length === 0) {
				alert(
					q
						? "수급자 조건에 맞는 발생내역 데이터가 없습니다."
						: "해당 급여년월에 출력할 발생내역 데이터가 없습니다."
				);
				return;
			}
			const html = buildSalaryOccurrencePrintHtml(payYearMonth, list);
			openPrintPreviewWindow(html);
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "발생내역서 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, recipientFilter]);

	const printLedger = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch(`/api/v40100d?salmm=${encodeURIComponent(salmm)}`);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100D(발부대장) 조회에 실패했습니다.");
				return;
			}
			let list: V40100DPrintRow[] = Array.isArray(json.data) ? json.data : [];
			const q = recipientFilter.trim().toLowerCase();
			if (q) {
				list = list.filter(
					(r) =>
						r.recipient.toLowerCase().includes(q) ||
						String(r.PNUM ?? "")
							.toLowerCase()
							.includes(q)
				);
			}
			if (list.length === 0) {
				alert(
					q
						? "수급자 조건에 맞는 발부대장 데이터가 없습니다."
						: "해당 급여년월에 출력할 발부대장 데이터가 없습니다."
				);
				return;
			}
			const html = buildStatementLedgerPrintHtml(
				payYearMonth,
				list,
				{
					deliveryMethod: formData.deliveryMethod,
					deliverer: formData.deliverer,
					recipientName: formData.recipientName,
					receiveContent: formData.receiveContent,
				},
				facilityIssueDate || undefined
			);
			openPrintPreviewWindow(html);
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "발부대장 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, recipientFilter, formData, facilityIssueDate]);

	const printBenefitStatement = useCallback(async () => {
		const selectedRows = statementRows.filter((r) => checkedPnums.has(r.pnum));
		if (selectedRows.length === 0) {
			alert(
				"급여명세서는 목록에서 수급자를 한 명 이상 선택한 뒤 출력해 주세요. (체크박스 또는 전체선택)"
			);
			return;
		}
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const pnums = selectedRows.map((r) => r.pnum).join(",");
			const res = await fetch(
				`/api/v40100e?salmm=${encodeURIComponent(salmm)}&pnums=${encodeURIComponent(pnums)}`
			);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100E(급여명세서) 조회에 실패했습니다.");
				return;
			}
			const list: V40100EPrintRow[] = Array.isArray(json.data) ? json.data : [];
			const byPnum = new Map<string, V40100EPrintRow>();
			for (const d of list) {
				const k = String(d.PNUM ?? "").trim();
				if (k) byPnum.set(k, d);
			}
			const printRows = selectedRows.map((sr) => {
				const fromView = byPnum.get(String(sr.pnum).trim());
				if (fromView) {
					return { ...fromView, pSt: fromView.pSt || sr.pSt };
				}
				return statementRowToV40100EFallback(payYearMonth, sr);
			});
			const body = printRows
				.map((row) => `<div class="f24-page">${buildBenefitStatement24Body(payYearMonth, row)}</div>`)
				.join("");
			openPrintPreviewWindow(wrapF24PrintHtml(body));
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "급여명세서 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, statementRows, checkedPnums]);

	const printPaymentConfirmation = useCallback(async () => {
		const selectedRows = statementRows.filter((r) => checkedPnums.has(r.pnum));
		if (selectedRows.length === 0) {
			alert(
				"납부확인서는 목록에서 수급자를 한 명 이상 선택한 뒤 출력해 주세요. (체크박스 또는 전체선택)"
			);
			return;
		}
		const year = payYearMonth.length >= 4 ? payYearMonth.slice(0, 4) : "";
		if (!year) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const pnums = selectedRows.map((r) => r.pnum).join(",");
			const res = await fetch(
				`/api/v40100g?salyy=${encodeURIComponent(year)}&pnums=${encodeURIComponent(pnums)}`
			);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100G(납부확인) 조회에 실패했습니다.");
				return;
			}
			const list: V40100GPrintRow[] = Array.isArray(json.data) ? json.data : [];
			const byPnum = new Map<string, V40100GPrintRow>();
			for (const d of list) {
				const k = String(d.PNUM ?? "").trim();
				if (k) byPnum.set(k, d);
			}
			const printRows = selectedRows.map(
				(sr) => byPnum.get(String(sr.pnum).trim()) ?? statementRowToV40100GFallback(payYearMonth, sr)
			);
			const html = buildPaymentConfirmation25PrintHtml(payYearMonth, printRows);
			openPrintPreviewWindow(html);
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "납부확인서 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, statementRows, checkedPnums]);

	const handleDocumentKindClick = useCallback(
		(id: (typeof TABS)[number]["id"]) => {
			if (id === "occurrence") {
				setActiveTab("occurrence");
				void printOccurrence();
				return;
			}
			if (id === "ledger") {
				setActiveTab("ledger");
				void printLedger();
				return;
			}
			if (id === "statement") {
				setActiveTab("statement");
				void printBenefitStatement();
				return;
			}
			if (id === "payment") {
				setActiveTab("payment");
				void printPaymentConfirmation();
				return;
			}
			setActiveTab(id);
		},
		[printOccurrence, printLedger, printBenefitStatement, printPaymentConfirmation]
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
			const [res401, res100, resFac] = await Promise.all([
				fetch(`/api/f40100?salmm=${encodeURIComponent(salmm)}`),
				fetch("/api/f10010"),
				fetch("/api/f00110"),
			]);

			const j401 = await res401.json();
			const j100 = await res100.json();
			const jFac = await resFac.json();

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
			const facilityRow: Record<string, unknown> | null =
				jFac.success && Array.isArray(jFac.data) && jFac.data.length > 0
					? (jFac.data[0] as Record<string, unknown>)
					: jFac.success && jFac.data && !Array.isArray(jFac.data)
						? (jFac.data as Record<string, unknown>)
						: null;

			const byPnum = new Map<string, F10010Row>();
			for (const m of f100Rows) {
				const k = memberKey(m.PNUM);
				if (k) byPnum.set(k, m);
			}

			const merged = f401Rows.map((row) =>
				mergeF40100FacilityFromF00110(mergeF40100WithF10010(row, byPnum), facilityRow)
			);

			setStatementRows(merged.map((r) => f40100ToStatementRow(r)));
			setSelectedPnum(null);
			setCheckedPnums(new Set());
			setFormData(initialForm);
			setFormSnapshot(initialForm);
			setFormEditMode(false);
		} catch (e) {
			console.error(e);
			setSearchError(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다.");
			setStatementRows([]);
		} finally {
			setLoading(false);
		}
	}, [payYearMonth]);

	useEffect(() => {
		void handleSearch();
	}, [handleSearch]);

	const confirmLeaveEditMode = useCallback((): boolean => {
		if (!formEditMode) return true;
		return window.confirm(
			"저장하지 않으면 수정된 내용이 저장되지 않습니다. 계속하시겠습니까?"
		);
	}, [formEditMode]);

	const discardEditAndLeave = useCallback(() => {
		setFormData(formSnapshot);
		setFormEditMode(false);
	}, [formSnapshot]);

	const handleClose = () => {
		router.back();
	};

	const handleEnterEdit = () => {
		if (!selectedPnum) {
			alert("수급자를 선택해주세요");
			return;
		}
		setFormSnapshot(formData);
		setFormEditMode(true);
	};

	const handleSave = async () => {
		if (!selectedPnum) {
			alert("수급자를 선택해주세요");
			return;
		}
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch("/api/f40100", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					salmm,
					pnum: selectedPnum,
					fields: {
						SNM: formData.deliverer.trim().slice(0, 20) || null,
						S_GU: normalizeSGu(formData.deliveryMethod),
						ENM: formData.recipientName.trim().slice(0, 20) || null,
						RDES: formData.receiveContent.trim().slice(0, 200) || null,
					},
				}),
			});
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "저장에 실패했습니다.");
				return;
			}
			setStatementRows((prev) =>
				prev.map((r) =>
					r.pnum === selectedPnum
						? {
								...r,
								snm: formData.deliverer.trim(),
								sGu: normalizeSGu(formData.deliveryMethod),
								enm: formData.recipientName.trim(),
								rdes: formData.receiveContent.trim(),
							}
						: r
				)
			);
			setFormSnapshot(formData);
			setFormEditMode(false);
			alert("저장되었습니다.");
		} catch (e) {
			console.error(e);
			alert("저장 중 오류가 발생했습니다.");
		}
	};

	const handleDelete = async () => {
		if (!selectedPnum) {
			alert("수급자를 선택해주세요");
			return;
		}
		if (!window.confirm("선택한 수급자의 발부 정보(전달방법·수령자·수령내용)를 삭제할까요?")) return;
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch("/api/f40100", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					salmm,
					pnum: selectedPnum,
					fields: {
						SNM: null,
						S_GU: null,
						ENM: null,
						RDES: null,
					},
				}),
			});
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "삭제에 실패했습니다.");
				return;
			}
			setStatementRows((prev) =>
				prev.map((r) =>
					r.pnum === selectedPnum
						? { ...r, snm: "", sGu: "", enm: "", rdes: "" }
						: r
				)
			);
			setFormData(initialForm);
			setFormSnapshot(initialForm);
			setFormEditMode(false);
			setSelectedPnum(null);
			alert("삭제되었습니다.");
		} catch (e) {
			console.error(e);
			alert("삭제 중 오류가 발생했습니다.");
		}
	};

	const handleRowClick = (row: StatementRow) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setSelectedPnum(row.pnum);
		toggleCheckedPnum(row.pnum, true);
		setFormEditMode(false);
		const next: StatementForm = {
			recipient: row.recipient,
			birthday: row.birthday,
			deliverer: row.snm || LEDGER_DEFAULT_DELIVERER,
			deliveryMethod: row.sGu ? normalizeSGu(row.sGu) : "2",
			recipientName: row.enm,
			receiveContent: row.rdes || LEDGER_DEFAULT_RECEIVE,
		};
		setFormData(next);
		setFormSnapshot(next);
	};

	const handleCheckClick = (
		e: React.MouseEvent,
		row: StatementRow
	) => {
		e.stopPropagation();
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		const nextChecked = !checkedPnums.has(row.pnum);
		toggleCheckedPnum(row.pnum, nextChecked);
		if (nextChecked) {
			setSelectedPnum(row.pnum);
			setFormEditMode(false);
			const next: StatementForm = {
				recipient: row.recipient,
				birthday: row.birthday,
				deliverer: row.snm || LEDGER_DEFAULT_DELIVERER,
				deliveryMethod: row.sGu ? normalizeSGu(row.sGu) : "2",
				recipientName: row.enm,
				receiveContent: row.rdes || LEDGER_DEFAULT_RECEIVE,
			};
			setFormData(next);
			setFormSnapshot(next);
		}
	};

	const handlePayYearMonthChange = (v: string) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setFacilityIssueDate("");
		setPayYearMonth(v);
	};

	const openIssueDateModal = () => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setIssueDateDraft(
			facilityIssueDate || lastDayOfPayYearMonth(payYearMonth) || ""
		);
		setIssueDateModalOpen(true);
	};

	const handleSaveFacilityIssueDate = () => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDateDraft)) {
			alert("발행일자를 YYYY-MM-DD 형식으로 선택해 주세요.");
			return;
		}
		setFacilityIssueDate(issueDateDraft);
		setIssueDateModalOpen(false);
		alert("발행일자가 일괄 저장되었습니다.");
	};

	const handleRecipientFilterChange = (v: string) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setRecipientFilter(v);
	};

	const handleDocumentKindClickSafe = (id: (typeof TABS)[number]["id"]) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		handleDocumentKindClick(id);
	};

	const readOnlyInputClass =
		"flex-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-1.5 text-sm text-blue-900/90 outline-none cursor-default";
	const editableInputClass =
		"flex-1 rounded border border-blue-400 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
	const readOnlySelectClass =
		"flex-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-1.5 text-sm text-blue-900/90 outline-none cursor-default";
	const editableSelectClass =
		"flex-1 rounded border border-blue-400 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
	const readOnlyTextareaClass =
		"flex-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-1.5 text-sm text-blue-900/90 outline-none cursor-default resize-none";
	const editableTextareaClass =
		"flex-1 rounded border border-blue-400 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

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
									{!activeTab || activeTab === "ledger"
										? "명세서발부대장"
										: tabTitle}
								</>
							)}
						</h2>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">급여년월</label>
							<input
								type="month"
								value={payYearMonth}
								onChange={(e) => handlePayYearMonthChange(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">수급자</label>
							<input
								type="text"
								value={recipientFilter}
								onChange={(e) => handleRecipientFilterChange(e.target.value)}
								placeholder="이름 입력 시 즉시 필터"
								className="min-w-[160px] rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
							{checkedPnums.size > 0 ? (
								<span className="text-xs text-blue-800">
									선택 {checkedPnums.size}명
								</span>
							) : null}
						</div>
						<button
							type="button"
							onClick={openIssueDateModal}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							발행일자전체변경
						</button>
						{facilityIssueDate ? (
							<span className="text-xs text-blue-800">
								발행일자: {facilityIssueDate}
							</span>
						) : null}
						<div className="ml-auto flex gap-2">
							{/* 검색 버튼 영역 */}
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
								onClick={() => handleDocumentKindClickSafe(tab.id)}
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
											<th className="w-10 whitespace-nowrap border-r border-blue-200 px-1 py-2 text-center font-semibold text-blue-900">
												<input
													type="checkbox"
													checked={allFilteredChecked}
													ref={(el) => {
														if (el) el.indeterminate = someFilteredChecked;
													}}
													onChange={toggleSelectAllFiltered}
													disabled={filteredPnums.length === 0}
													title="전체선택"
													aria-label="전체선택"
													className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
												/>
											</th>
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
												<td colSpan={15} className="px-2 py-8 text-center text-blue-900/60">
													조회 중입니다…
												</td>
											</tr>
										) : filteredRows.length === 0 ? (
											<tr>
												<td colSpan={15} className="px-2 py-8 text-center text-blue-900/60">
													{statementRows.length === 0
														? "데이터가 없습니다. 해당 급여년월 급여 자료를 확인해 주세요."
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
															: checkedPnums.has(row.pnum)
																? "bg-blue-50"
																: ""
													}`}
												>
													<td
														className="border-r border-blue-100 px-1 py-1.5 text-center"
														onClick={(e) => handleCheckClick(e, row)}
													>
														<input
															type="checkbox"
															checked={checkedPnums.has(row.pnum)}
															readOnly
															aria-label={`${row.recipient} 선택`}
															className="pointer-events-none h-3.5 w-3.5 accent-blue-600"
														/>
													</td>
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
											<th className="w-10 whitespace-nowrap border-r border-blue-200 px-1 py-2 text-center font-semibold text-blue-900">
												<input
													type="checkbox"
													checked={allFilteredChecked}
													ref={(el) => {
														if (el) el.indeterminate = someFilteredChecked;
													}}
													onChange={toggleSelectAllFiltered}
													disabled={filteredPnums.length === 0}
													title="전체선택"
													aria-label="전체선택"
													className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
												/>
											</th>
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
												<td colSpan={14} className="px-2 py-8 text-center text-blue-900/60">
													조회 중입니다…
												</td>
											</tr>
										) : filteredRows.length === 0 ? (
											<tr>
												<td colSpan={14} className="px-2 py-8 text-center text-blue-900/60">
													{statementRows.length === 0
														? "데이터가 없습니다. 해당 급여년월 급여 자료를 확인해 주세요. (F40100 급여 HEAD)"
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
															: checkedPnums.has(row.pnum)
																? "bg-blue-50"
																: ""
													}`}
												>
													<td
														className="border-r border-blue-100 px-1 py-1.5 text-center"
														onClick={(e) => handleCheckClick(e, row)}
													>
														<input
															type="checkbox"
															checked={checkedPnums.has(row.pnum)}
															readOnly
															aria-label={`${row.recipient} 선택`}
															className="pointer-events-none h-3.5 w-3.5 accent-blue-600"
														/>
													</td>
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
				<div className="relative flex flex-wrap gap-6 border-t border-blue-200 bg-blue-50/30 p-4">
					{!selectedPnum && (
						<div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
							<p className="rounded-lg border border-blue-300 bg-white/90 px-5 py-3 text-base font-semibold text-blue-900 shadow-sm">
								수급자를 선택해주세요
							</p>
						</div>
					)}
					<div
						className={`flex w-full min-w-0 flex-col gap-3 ${
							!selectedPnum ? "pointer-events-none select-none blur-[2px]" : ""
						}`}
						aria-hidden={!selectedPnum}
					>
						<div className="flex flex-wrap gap-x-8 gap-y-3">
							<div className="flex min-w-[220px] flex-1 items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">수급자</label>
								<input
									type="text"
									value={formData.recipient}
									readOnly
									className={readOnlyInputClass}
								/>
							</div>
							<div className="flex min-w-[220px] flex-1 items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">생년월일</label>
								<input
									type="text"
									value={formData.birthday}
									readOnly
									placeholder="YYYY-MM-DD"
									className={readOnlyInputClass}
								/>
							</div>
							<div className="flex min-w-[220px] flex-1 items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">전달자</label>
								<input
									type="text"
									value={formData.deliverer}
									readOnly
									className={readOnlyInputClass}
								/>
							</div>
							<div className="flex min-w-[220px] flex-1 items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">전달방법</label>
								<select
									value={formData.deliveryMethod}
									disabled={!formEditMode}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											deliveryMethod: e.target.value,
										}))
									}
									className={formEditMode ? editableSelectClass : readOnlySelectClass}
								>
									<option value="1">직접전달</option>
									<option value="2">우편발송</option>
									<option value="3">E-Mail</option>
									<option value="4">SMS</option>
								</select>
							</div>
							<div className="flex min-w-[220px] flex-1 items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">수령자</label>
								<input
									type="text"
									value={formData.recipientName}
									readOnly={!formEditMode}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											recipientName: e.target.value,
										}))
									}
									className={formEditMode ? editableInputClass : readOnlyInputClass}
								/>
							</div>
							<div className="flex min-w-[280px] flex-[1.4] items-start gap-2">
								<label className="w-20 shrink-0 pt-1.5 text-sm font-medium text-blue-900">수령내용</label>
								<textarea
									value={formData.receiveContent}
									readOnly={!formEditMode}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											receiveContent: e.target.value,
										}))
									}
									rows={2}
									className={formEditMode ? editableTextareaClass : readOnlyTextareaClass}
								/>
							</div>
						</div>
						<div className="mt-1 flex justify-end gap-2 border-t border-blue-100 pt-3">
							{formEditMode ? (
								<>
									<button
										type="button"
										onClick={() => void handleSave()}
										className="rounded border border-blue-500 bg-blue-500 px-6 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
									>
										저장
									</button>
									<button
										type="button"
										onClick={discardEditAndLeave}
										className="rounded border border-blue-400 bg-blue-200 px-6 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
									>
										취소
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={handleEnterEdit}
										className="rounded border border-blue-500 bg-blue-500 px-6 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
									>
										수정
									</button>
									<button
										type="button"
										onClick={() => void handleDelete()}
										className="rounded border border-blue-400 bg-blue-200 px-6 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
									>
										삭제
									</button>
								</>
							)}
						</div>
					</div>
				</div>

				{issueDateModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
						<div className="w-full max-w-md rounded-lg border border-blue-300 bg-white p-5 shadow-lg">
							<h3 className="mb-3 text-base font-semibold text-blue-900">발행일자 전체 변경</h3>
							<p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
								저장한 날짜로 해당 기관 발행일자의 전체 값이 일괄저장됩니다.
							</p>
							<div className="mb-4 flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">발행일자</label>
								<input
									type="date"
									value={issueDateDraft}
									onChange={(e) => setIssueDateDraft(e.target.value)}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIssueDateModalOpen(false)}
									className="rounded border border-blue-300 bg-white px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-50"
								>
									취소
								</button>
								<button
									type="button"
									onClick={handleSaveFacilityIssueDate}
									className="rounded border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
								>
									저장
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
