"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface F40120ApiRow {
	ANCD?: string;
	SALMM?: string;
	PNUM?: string | number;
	INSDT?: string | Date;
	HAMT?: number | string;
	CAMT?: number | string;
	YAMT?: number | string;
	ETC?: string | null;
	INDT?: string | Date | null;
	DOC?: number | string | null;
	P_NM?: string | null;
	P_ST?: string | null;
	SAL2?: number | string | null;
}

/** GET /api/f40120 의 summary 행 (F40100 + F10010 + F40120 합계) */
interface SalaryCollectionSummaryRow {
	PNUM?: string | number;
	SAL2?: number | string | null;
	P_NM?: string | null;
	P_ST?: string | null;
	SumHAMT?: number | string | null;
	SumCAMT?: number | string | null;
	SumYAMT?: number | string | null;
}

interface CollectionRow {
	pnumKey: string;
	recipient: string;
	status: string;
	occurYearMonth: string;
	recipientContribution: string;
	cash: string;
	card: string;
	deposit: string;
	unpaid: string;
}

interface DetailCollectionRow {
	pnumKey: string;
	insdtIso: string;
	yearMonth: string;
	collectionDate: string;
	cash: string;
	card: string;
	deposit: string;
	etc: string;
	doc: string;
}

interface RecipientInfoForm {
	pnum: string;
	payYearMonth: string;
	unpaid: string;
	date: string;
	etc: string;
	doc: string;
	cash: string;
	card: string;
	deposit: string;
}

const initialRecipientForm: RecipientInfoForm = {
	pnum: "",
	payYearMonth: "",
	unpaid: "",
	date: "",
	etc: "",
	doc: "",
	cash: "",
	card: "",
	deposit: "",
};

function monthInputToSalmm(v: string): string {
	if (!v || typeof v !== "string") return "";
	const p = v.split("-");
	if (p.length >= 2 && p[0].length === 4) {
		return `${p[0]}${String(p[1]).padStart(2, "0")}`;
	}
	return String(v).replace(/\D/g, "").slice(0, 6);
}

function salmmToDisplay(s: string): string {
	const d = String(s || "").replace(/\D/g, "");
	if (d.length === 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}`;
	return s || "";
}

/** `<input type="month">` 값 형식 (YYYY-MM), 로컬 달력 기준 */
function getLocalYearMonthInput(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function num(v: unknown): number {
	if (v == null || v === "") return 0;
	const n = parseInt(String(v).replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

function fmtInt(n: number): string {
	if (!Number.isFinite(n)) return "0";
	return n.toLocaleString("ko-KR");
}

function formatInsdT(v: unknown): string {
	if (v == null) return "";
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, "0");
		const d = String(v.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	const s = String(v);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) {
		return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	}
	return s;
}

function pStLabel(pSt: string | null | undefined): string {
	const t = String(pSt ?? "").trim();
	if (t === "1") return "입소";
	if (t === "9") return "퇴소";
	return "-";
}

/** 본인부담금수납대장 API 행 (F40120 + F40100 + F10010) */
interface SelfContributionLedgerRow {
	INSDT?: string | Date;
	PNUM?: string | number;
	HAMT?: number | string;
	CAMT?: number | string;
	YAMT?: number | string;
	ETC?: string | null;
	P_NM?: string | null;
	USRGU?: string | null;
	USRPER?: number | string | null;
	SAL2?: number | string | null;
	NonBenefitTotal?: number | string | null;
}

function escapeHtml(s: string): string {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function salmmToYearMonthKo(salmm6: string): { year: string; month: string } {
	const d = String(salmm6 || "").replace(/\D/g, "").slice(0, 6);
	return { year: d.slice(0, 4), month: d.slice(4, 6) };
}

/** F40100 USRGU / USRPER 기준 대상자 구분 (서식 예시와 유사) */
function recipientCategoryLabel(usrgu: unknown, usrper: unknown): string {
	const g = String(usrgu ?? "").trim();
	const pRaw = Number(String(usrper ?? "").replace(",", "."));
	if (g === "3") return "국민기초생활수급권자";
	if (g === "2") {
		if (pRaw === 40) return "40%경감대상자";
		if (pRaw === 60) return "60%경감대상자";
		return "50%경감대상자";
	}
	if (g === "1") return "일반";
	return g ? g : "-";
}

/** 수금액을 급여(본인부담) / 비급여로 비율 배분 (해당 월 청구액 기준) */
function splitLedgerCopayNonBenefit(
	lineTotal: number,
	sal2: number,
	nonBenefitTotal: number
): { copay: number; nonBen: number } {
	const billBenefit = Math.max(0, sal2);
	const billNon = Math.max(0, nonBenefitTotal);
	const denom = billBenefit + billNon;
	if (lineTotal <= 0) return { copay: 0, nonBen: 0 };
	if (denom <= 0) return { copay: lineTotal, nonBen: 0 };
	const copay = Math.floor((lineTotal * billBenefit) / denom);
	const nonBen = lineTotal - copay;
	return { copay, nonBen };
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

/** [별지 제34호] 본인부담금수납대장 — 첨부 서식 레이아웃 */
function buildSelfContributionLedgerPrintHtml(
	salmm6: string,
	ledger: SelfContributionLedgerRow[]
): string {
	const { year, month } = salmmToYearMonthKo(salmm6);
	let totLine = 0;
	let totCopay = 0;
	let totNon = 0;
	const body = ledger
		.map((row, idx) => {
			const lineTotal = num(row.HAMT) + num(row.CAMT) + num(row.YAMT);
			const { copay, nonBen } = splitLedgerCopayNonBenefit(
				lineTotal,
				num(row.SAL2),
				num(row.NonBenefitTotal)
			);
			totLine += lineTotal;
			totCopay += copay;
			totNon += nonBen;
			const dateStr = formatInsdT(row.INSDT);
			const name = escapeHtml(String(row.P_NM ?? "").trim() || "-");
			const cat = escapeHtml(recipientCategoryLabel(row.USRGU, row.USRPER));
			const itemCol =
				nonBen > 0
					? escapeHtml(String(row.ETC ?? "").trim() || "비급여")
					: "-";
			return `<tr>
				<td class="c">${idx + 1}</td>
				<td class="c">${escapeHtml(dateStr || "-")}</td>
				<td class="c">${name}</td>
				<td class="c">${cat}</td>
				<td class="r">${fmtInt(lineTotal)}</td>
				<td class="r">${fmtInt(copay)}</td>
				<td class="r">${fmtInt(nonBen)}</td>
				<td class="l sm">${itemCol}</td>
			</tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>본인부담금수납대장</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 9.5pt; color: #000; background: #fff; }
.wrap { max-width: 186mm; margin: 0 auto; }
.meta { font-size: 9pt; margin-bottom: 4px; }
.title { text-align: center; font-size: 18pt; font-weight: 700; margin: 6px 0 10px 0; letter-spacing: 0.02em; }
.period { font-size: 11pt; margin-bottom: 8px; padding-left: 2mm; }
table.ledger { width: 100%; border-collapse: collapse; table-layout: fixed; border: 2px solid #000; }
table.ledger th, table.ledger td { border: 1px solid #000; padding: 4px 5px; vertical-align: middle; word-break: break-word; }
table.ledger th { font-weight: 700; text-align: center; background: #fafafa; }
table.ledger td.c { text-align: center; }
table.ledger td.r { text-align: right; font-variant-numeric: tabular-nums; }
table.ledger td.l { text-align: left; }
table.ledger td.sm { font-size: 8.5pt; }
table.ledger tfoot td { font-weight: 700; background: #f5f5f5; }
table.ledger col.c0 { width: 5%; }
table.ledger col.c1 { width: 10%; }
table.ledger col.c2 { width: 12%; }
table.ledger col.c3 { width: 14%; }
table.ledger col.c4 { width: 12%; }
table.ledger col.c5 { width: 12%; }
table.ledger col.c6 { width: 12%; }
table.ledger col.c7 { width: 23%; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
<div class="wrap">
	<div class="meta">[별지 제34호서식] &lt;개정 2013.6.10&gt;</div>
	<h1 class="title">본인부담금수납대장</h1>
	<div class="period">${escapeHtml(year)} 년 ${escapeHtml(month)} 월</div>
	<table class="ledger">
		<colgroup>
			<col class="c0"/><col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/><col class="c5"/><col class="c6"/><col class="c7"/>
		</colgroup>
		<thead>
			<tr>
				<th rowspan="2">연번</th>
				<th rowspan="2">월 일</th>
				<th rowspan="2">성명</th>
				<th rowspan="2">대상자 구분</th>
				<th colspan="4">수납금액(원)</th>
			</tr>
			<tr>
				<th>계</th>
				<th>급여<br/>본인부담금</th>
				<th>비급여<br/>금액</th>
				<th>비급여<br/>항목</th>
			</tr>
		</thead>
		<tbody>${body}</tbody>
		<tfoot>
			<tr>
				<td colspan="4" class="c">계</td>
				<td class="r">${fmtInt(totLine)}</td>
				<td class="r">${fmtInt(totCopay)}</td>
				<td class="r">${fmtInt(totNon)}</td>
				<td class="c"></td>
			</tr>
		</tfoot>
	</table>
</div>
</body>
</html>`;
}

/** 수금내역서·미수금내역서 공통: 수급자별 부담금·수납·미수금 표 tbody + 합계 */
function buildCollectionRecipientMoneyTableSections(summary: SalaryCollectionSummaryRow[]): {
	body: string;
	totSal2: number;
	totH: number;
	totC: number;
	totY: number;
	totUnpaid: number;
} {
	let totSal2 = 0;
	let totH = 0;
	let totC = 0;
	let totY = 0;
	let totUnpaid = 0;

	const body = [...summary]
		.sort((a, b) =>
			String(a.P_NM || a.PNUM || "")
				.trim()
				.localeCompare(String(b.P_NM || b.PNUM || "").trim(), "ko")
		)
		.map((s) => {
			const name = escapeHtml(String(s.P_NM ?? "").trim() || String(s.PNUM ?? "").trim() || "-");
			const h = num(s.SumHAMT);
			const c = num(s.SumCAMT);
			const y = num(s.SumYAMT);
			const sal2Raw = s.SAL2 != null && s.SAL2 !== "" ? num(s.SAL2) : null;
			totH += h;
			totC += c;
			totY += y;
			const sal2Disp = sal2Raw != null ? fmtInt(sal2Raw) : "-";
			let unpaidDisp = "-";
			if (sal2Raw != null) {
				totSal2 += sal2Raw;
				const u = sal2Raw - h - c - y;
				totUnpaid += u;
				unpaidDisp = fmtInt(u);
			}
			return `<tr>
				<td class="name">${name}</td>
				<td class="num">${sal2Disp}</td>
				<td class="num">${fmtInt(h)}</td>
				<td class="num">${fmtInt(c)}</td>
				<td class="num">${fmtInt(y)}</td>
				<td class="num">${unpaidDisp}</td>
			</tr>`;
		})
		.join("");

	return { body, totSal2, totH, totC, totY, totUnpaid };
}

/** 급여발생 및 수금내역서 (R40120A) — A4 세로, 가로선 위주 */
function buildSalaryCollectionStatementPrintHtml(
	salmm6: string,
	summary: SalaryCollectionSummaryRow[]
): string {
	const { year, month } = salmmToYearMonthKo(salmm6);
	const periodLabel = `(${escapeHtml(year)}-${escapeHtml(month)}월분)`;
	const { body, totSal2, totH, totC, totY, totUnpaid } =
		buildCollectionRecipientMoneyTableSections(summary);

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>급여발생 및 수금내역서</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 10.5pt; color: #000; background: #fff; }
.wrap { max-width: 186mm; margin: 0 auto; }
.head { display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 14px; }
.head-spacer { flex: 0 0 72mm; min-height: 1px; }
.head-center { flex: 1; text-align: center; min-width: 0; }
.title { font-size: 17pt; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.02em; }
.subtitle { font-size: 11.5pt; margin: 0; }
.sign { border-collapse: collapse; flex-shrink: 0; font-size: 9pt; }
.sign th, .sign td { border: 1px solid #000; width: 56px; text-align: center; vertical-align: middle; padding: 4px 2px; }
.sign th { font-weight: 700; height: 26px; background: #fafafa; }
.sign td { height: 40px; }
table.stmt { width: 100%; border-collapse: collapse; margin-top: 4px; }
table.stmt th, table.stmt td { border: none; border-bottom: 1px solid #000; padding: 7px 6px; vertical-align: middle; }
table.stmt thead th { border-bottom: 2px solid #000; font-weight: 700; text-align: center; font-size: 10pt; }
table.stmt td.name { text-align: left; }
table.stmt td.num { text-align: right; font-variant-numeric: tabular-nums; }
table.stmt tfoot td { border-top: 1px solid #000; border-bottom: 2px solid #000; font-weight: 700; }
table.stmt tfoot td.name { text-align: left; }
table.stmt tfoot td.num { text-align: right; }
.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 8px; border-top: 2px solid #000; font-size: 9.5pt; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
<div class="wrap">
	<div class="head">
		<div class="head-spacer"></div>
		<div class="head-center">
			<h1 class="title">급여발생 및 수금내역서</h1>
			<p class="subtitle">${periodLabel}</p>
		</div>
		<table class="sign" aria-label="결재란">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
	</div>
	<table class="stmt">
		<thead>
			<tr>
				<th style="width:22%">수급자</th>
				<th style="width:15%">수급자부담금</th>
				<th style="width:13%">현금</th>
				<th style="width:13%">카드</th>
				<th style="width:13%">예금</th>
				<th style="width:14%">미수금</th>
			</tr>
		</thead>
		<tbody>${body}</tbody>
		<tfoot>
			<tr>
				<td class="name">합계</td>
				<td class="num">${fmtInt(totSal2)}</td>
				<td class="num">${fmtInt(totH)}</td>
				<td class="num">${fmtInt(totC)}</td>
				<td class="num">${fmtInt(totY)}</td>
				<td class="num">${fmtInt(totUnpaid)}</td>
			</tr>
		</tfoot>
	</table>
	<div class="foot">
		<span>R40120A</span>
		<span>페이지: 1</span>
	</div>
</div>
</body>
</html>`;
}

/** 미수금내역서 — A4 세로, 명조 계열, 가로선 위주 */
function buildUnpaidBalanceStatementPrintHtml(
	salmm6: string,
	summary: SalaryCollectionSummaryRow[]
): string {
	const { year, month } = salmmToYearMonthKo(salmm6);
	const periodLabel = `(${escapeHtml(year)}-${escapeHtml(month)}월분)`;
	const { body, totSal2, totH, totC, totY, totUnpaid } =
		buildCollectionRecipientMoneyTableSections(summary);

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>미수금내역서</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
	font-family: 'Batang', '바탕', 'New Batang', 'Malgun Gothic', '맑은 고딕', serif;
	font-size: 10.5pt;
	color: #000;
	background: #fff;
	line-height: 1.35;
}
.wrap { max-width: 186mm; margin: 0 auto; }
.head { display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 14px; }
.head-spacer { flex: 0 0 72mm; min-height: 1px; }
.head-center { flex: 1; text-align: center; min-width: 0; }
.title { font-size: 17pt; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 0.02em; }
.subtitle { font-size: 11.5pt; margin: 0; }
.sign { border-collapse: collapse; flex-shrink: 0; font-size: 9pt; }
.sign th, .sign td { border: 1px solid #000; width: 56px; text-align: center; vertical-align: middle; padding: 4px 2px; }
.sign th { font-weight: 700; height: 26px; background: #fafafa; }
.sign td { height: 40px; }
table.stmt { width: 100%; border-collapse: collapse; margin-top: 4px; }
table.stmt th, table.stmt td { border: none; border-bottom: 1px solid #000; padding: 7px 6px; vertical-align: middle; }
table.stmt thead th { border-bottom: 2px solid #000; font-weight: 700; text-align: center; font-size: 10pt; }
table.stmt td.name { text-align: left; }
table.stmt td.num { text-align: right; font-variant-numeric: tabular-nums; }
table.stmt tfoot td { border-top: 1px solid #000; border-bottom: 2px solid #000; font-weight: 700; }
table.stmt tfoot td.tot-label { text-align: center; }
table.stmt tfoot td.num { text-align: right; }
.foot { display: flex; justify-content: flex-end; align-items: center; margin-top: 16px; padding-top: 8px; border-top: 2px solid #000; font-size: 9.5pt; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
<div class="wrap">
	<div class="head">
		<div class="head-spacer"></div>
		<div class="head-center">
			<h1 class="title">미수금내역서</h1>
			<p class="subtitle">${periodLabel}</p>
		</div>
		<table class="sign" aria-label="결재란">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
	</div>
	<table class="stmt">
		<thead>
			<tr>
				<th style="width:22%">수급자</th>
				<th style="width:15%">수급자부담금</th>
				<th style="width:13%">현금</th>
				<th style="width:13%">카드</th>
				<th style="width:13%">예금</th>
				<th style="width:14%">미수금</th>
			</tr>
		</thead>
		<tbody>${body}</tbody>
		<tfoot>
			<tr>
				<td class="tot-label">합계</td>
				<td class="num">${fmtInt(totSal2)}</td>
				<td class="num">${fmtInt(totH)}</td>
				<td class="num">${fmtInt(totC)}</td>
				<td class="num">${fmtInt(totY)}</td>
				<td class="num">${fmtInt(totUnpaid)}</td>
			</tr>
		</tfoot>
	</table>
	<div class="foot">
		<span>페이지: 1</span>
	</div>
</div>
</body>
</html>`;
}

/** summary 없이 details만 온 구버전 응답용 */
function fallbackSummaryFromDetails(rows: F40120ApiRow[]): SalaryCollectionSummaryRow[] {
	const byPnum = new Map<
		string,
		{
			PNUM: string;
			SAL2: number | null;
			P_NM: string;
			P_ST: string | null | undefined;
			h: number;
			c: number;
			y: number;
		}
	>();
	for (const r of rows) {
		const p = String(r.PNUM ?? "").trim();
		if (!p) continue;
		let g = byPnum.get(p);
		if (!g) {
			g = {
				PNUM: p,
				SAL2: r.SAL2 != null && r.SAL2 !== "" ? num(r.SAL2) : null,
				P_NM: String(r.P_NM ?? "").trim(),
				P_ST: r.P_ST,
				h: 0,
				c: 0,
				y: 0,
			};
			byPnum.set(p, g);
		} else {
			if (g.SAL2 == null && r.SAL2 != null && r.SAL2 !== "") g.SAL2 = num(r.SAL2);
			if (!g.P_NM && r.P_NM) g.P_NM = String(r.P_NM).trim();
			if (g.P_ST == null || g.P_ST === "") g.P_ST = r.P_ST;
		}
		g.h += num(r.HAMT);
		g.c += num(r.CAMT);
		g.y += num(r.YAMT);
	}
	return Array.from(byPnum.values()).map((g) => ({
		PNUM: g.PNUM,
		SAL2: g.SAL2,
		P_NM: g.P_NM,
		P_ST: g.P_ST,
		SumHAMT: g.h,
		SumCAMT: g.c,
		SumYAMT: g.y,
	}));
}

function summaryToCollectionRows(
	summary: SalaryCollectionSummaryRow[],
	salmmDisplay: string
): CollectionRow[] {
	return [...summary]
		.sort((a, b) =>
			String(a.P_NM || a.PNUM || "")
				.trim()
				.localeCompare(String(b.P_NM || b.PNUM || "").trim(), "ko")
		)
		.map((s) => {
			const pnumKey = String(s.PNUM ?? "").trim();
			const sal2n = s.SAL2 != null && s.SAL2 !== "" ? num(s.SAL2) : null;
			const collected = num(s.SumHAMT) + num(s.SumCAMT) + num(s.SumYAMT);
			const unpaid = sal2n != null ? Math.max(0, sal2n - collected) : null;
			return {
				pnumKey,
				recipient: String(s.P_NM ?? "").trim() || pnumKey,
				status: pStLabel(s.P_ST),
				occurYearMonth: salmmDisplay,
				recipientContribution: sal2n != null ? fmtInt(sal2n) : "-",
				cash: fmtInt(num(s.SumHAMT)),
				card: fmtInt(num(s.SumCAMT)),
				deposit: fmtInt(num(s.SumYAMT)),
				unpaid: unpaid != null ? fmtInt(unpaid) : "-",
			};
		});
}

function computeUnpaidForPnumFromSummary(summary: SalaryCollectionSummaryRow[], pnum: string): string {
	const p = String(pnum).trim();
	const s = summary.find((x) => String(x.PNUM ?? "").trim() === p);
	if (!s) return "-";
	const sal2 = s.SAL2 != null && s.SAL2 !== "" ? num(s.SAL2) : null;
	if (sal2 == null) return "-";
	const collected = num(s.SumHAMT) + num(s.SumCAMT) + num(s.SumYAMT);
	return fmtInt(Math.max(0, sal2 - collected));
}

function buildDetailRows(rows: F40120ApiRow[], pnum: string | null, salmmDisplay: string): DetailCollectionRow[] {
	if (!pnum) return [];
	const p = String(pnum).trim();
	return rows
		.filter((r) => String(r.PNUM ?? "").trim() === p)
		.map((r) => {
			const iso = formatInsdT(r.INSDT);
			return {
				pnumKey: p,
				insdtIso: iso,
				yearMonth: salmmDisplay,
				collectionDate: iso,
				cash: fmtInt(num(r.HAMT)),
				card: fmtInt(num(r.CAMT)),
				deposit: fmtInt(num(r.YAMT)),
				etc: String(r.ETC ?? "").trim() || "-",
				doc: r.DOC != null && r.DOC !== "" ? String(r.DOC) : "-",
			};
		})
		.sort((a, b) => b.insdtIso.localeCompare(a.insdtIso));
}

export default function MonthlySalaryCollection() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [payYearMonth, setPayYearMonth] = useState<string>(() => getLocalYearMonthInput());
	const [recipientFilter, setRecipientFilter] = useState("");
	const [apiSummary, setApiSummary] = useState<SalaryCollectionSummaryRow[]>([]);
	const [rawDetails, setRawDetails] = useState<F40120ApiRow[]>([]);
	const [selectedPnum, setSelectedPnum] = useState<string | null>(null);
	const [recipientForm, setRecipientForm] = useState<RecipientInfoForm>(() => ({
		...initialRecipientForm,
		payYearMonth: monthInputToSalmm(getLocalYearMonthInput()),
	}));

	const salmm = useMemo(() => monthInputToSalmm(payYearMonth), [payYearMonth]);
	const salmmDisplay = useMemo(() => salmmToDisplay(salmm), [salmm]);

	const collectionRows = useMemo(
		() => summaryToCollectionRows(apiSummary, salmmDisplay),
		[apiSummary, salmmDisplay]
	);

	const detailRows = useMemo(
		() => buildDetailRows(rawDetails, selectedPnum, salmmDisplay),
		[rawDetails, selectedPnum, salmmDisplay]
	);

	const fetchCollections = useCallback(
		async (opts?: { resetUi?: boolean; preservePnum?: string }) => {
			const sm = monthInputToSalmm(payYearMonth);
			if (!sm || sm.length !== 6) {
				alert("급여년월을 선택해 주세요.");
				return;
			}
			setLoading(true);
			try {
				const q = new URLSearchParams({ salmm: sm });
				if (recipientFilter.trim()) q.set("name", recipientFilter.trim());
				const res = await fetch(`/api/f40120?${q.toString()}`);
				const json = await res.json();
				if (!json.success) {
					alert(json.error || "조회에 실패했습니다.");
					setApiSummary([]);
					setRawDetails([]);
					return;
				}
				const details: F40120ApiRow[] = Array.isArray(json.details)
					? json.details
					: Array.isArray(json.data)
						? json.data
						: [];
				let summary: SalaryCollectionSummaryRow[] = Array.isArray(json.summary)
					? json.summary
					: [];
				if (summary.length === 0 && details.length > 0) {
					summary = fallbackSummaryFromDetails(details);
				}
				setApiSummary(summary);
				setRawDetails(details);
				const resetUi = opts?.resetUi !== false;
				if (resetUi) {
					setSelectedPnum(null);
					setRecipientForm({
						...initialRecipientForm,
						payYearMonth: sm,
					});
				} else if (opts?.preservePnum) {
					const pr = String(opts.preservePnum).trim();
					setSelectedPnum(pr);
					setRecipientForm((prev) => ({
						...prev,
						pnum: pr,
						payYearMonth: sm,
						unpaid: computeUnpaidForPnumFromSummary(summary, pr),
					}));
				}
			} catch (e) {
				console.error(e);
				alert("네트워크 오류로 조회에 실패했습니다.");
				setApiSummary([]);
				setRawDetails([]);
			} finally {
				setLoading(false);
			}
		},
		[payYearMonth, recipientFilter]
	);

	useEffect(() => {
		void fetchCollections({ resetUi: true });
		// 진입 시 현재 달만 자동 조회 (급여년월·이름 변경 시에는 수동 검색)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSearch = () => {
		void fetchCollections({ resetUi: true });
	};

	const handleClose = () => {
		router.back();
	};

	const handlePrintSelfContribution = async () => {
		const sm = monthInputToSalmm(payYearMonth);
		if (!sm || sm.length !== 6) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch(
				`/api/f40120?salmm=${encodeURIComponent(sm)}&print=selfContribution`,
				{ cache: "no-store" }
			);
			const json = await res.json();
			if (!json.success) {
				alert(String(json.error || "대장 데이터를 불러오지 못했습니다."));
				return;
			}
			const ledger: SelfContributionLedgerRow[] = Array.isArray(json.ledger) ? json.ledger : [];
			if (ledger.length === 0) {
				alert("출력할 수금 내역이 없습니다. 해당 급여년월에 F40120 수금 데이터가 있는지 확인해 주세요.");
				return;
			}
			const html = buildSelfContributionLedgerPrintHtml(sm, ledger);
			openPrintPreviewWindow(html);
		} catch (e) {
			alert(e instanceof Error ? e.message : "출력 중 오류가 발생했습니다.");
		}
	};

	const handlePrintCollection = async () => {
		const sm = monthInputToSalmm(payYearMonth);
		if (!sm || sm.length !== 6) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			let summary = apiSummary;
			if (summary.length === 0) {
				const res = await fetch(`/api/f40120?salmm=${encodeURIComponent(sm)}`, { cache: "no-store" });
				const json = await res.json();
				if (!json.success) {
					alert(String(json.error || "데이터를 불러오지 못했습니다."));
					return;
				}
				summary = Array.isArray(json.summary) ? json.summary : [];
				if (summary.length === 0) {
					const details: F40120ApiRow[] = Array.isArray(json.details)
						? json.details
						: Array.isArray(json.data)
							? json.data
							: [];
					summary = details.length > 0 ? fallbackSummaryFromDetails(details) : [];
				}
			}
			if (summary.length === 0) {
				alert(
					"출력할 내역이 없습니다. 해당 급여년월에 F40100 급여 데이터가 있는지 확인한 뒤 검색해 주세요."
				);
				return;
			}
			const html = buildSalaryCollectionStatementPrintHtml(sm, summary);
			openPrintPreviewWindow(html);
		} catch (e) {
			alert(e instanceof Error ? e.message : "출력 중 오류가 발생했습니다.");
		}
	};

	const handlePrintUnpaid = async () => {
		const sm = monthInputToSalmm(payYearMonth);
		if (!sm || sm.length !== 6) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			let summary = apiSummary;
			if (summary.length === 0) {
				const res = await fetch(`/api/f40120?salmm=${encodeURIComponent(sm)}`, { cache: "no-store" });
				const json = await res.json();
				if (!json.success) {
					alert(String(json.error || "데이터를 불러오지 못했습니다."));
					return;
				}
				summary = Array.isArray(json.summary) ? json.summary : [];
				if (summary.length === 0) {
					const details: F40120ApiRow[] = Array.isArray(json.details)
						? json.details
						: Array.isArray(json.data)
							? json.data
							: [];
					summary = details.length > 0 ? fallbackSummaryFromDetails(details) : [];
				}
			}
			if (summary.length === 0) {
				alert(
					"출력할 내역이 없습니다. 해당 급여년월에 F40100 급여 데이터가 있는지 확인한 뒤 검색해 주세요."
				);
				return;
			}
			const html = buildUnpaidBalanceStatementPrintHtml(sm, summary);
			openPrintPreviewWindow(html);
		} catch (e) {
			alert(e instanceof Error ? e.message : "출력 중 오류가 발생했습니다.");
		}
	};

	const handleSelectSummaryRow = (row: CollectionRow) => {
		setSelectedPnum(row.pnumKey);
		const sm = monthInputToSalmm(payYearMonth);
		setRecipientForm((prev) => ({
			...prev,
			pnum: row.pnumKey,
			payYearMonth: sm,
			unpaid: computeUnpaidForPnumFromSummary(apiSummary, row.pnumKey),
			date: "",
			cash: "",
			card: "",
			deposit: "",
			etc: "",
			doc: "",
		}));
	};

	const handleSelectDetailRow = (d: DetailCollectionRow) => {
		const p = d.pnumKey;
		const match = rawDetails.find(
			(r) =>
				String(r.PNUM ?? "").trim() === p && formatInsdT(r.INSDT) === d.insdtIso
		);
		setSelectedPnum(p);
		const sm = monthInputToSalmm(payYearMonth);
		setRecipientForm({
			pnum: p,
			payYearMonth: sm,
			unpaid: computeUnpaidForPnumFromSummary(apiSummary, p),
			date: d.insdtIso,
			etc: match?.ETC != null ? String(match.ETC) : "",
			doc: match?.DOC != null && match.DOC !== "" ? String(match.DOC) : "",
			cash: match != null ? String(num(match.HAMT)) : "",
			card: match != null ? String(num(match.CAMT)) : "",
			deposit: match != null ? String(num(match.YAMT)) : "",
		});
	};

	const handleClearLineForm = () => {
		if (!selectedPnum) {
			alert("먼저 메인 그리드에서 수급자를 선택해 주세요.");
			return;
		}
		const sm = monthInputToSalmm(payYearMonth);
		setRecipientForm((prev) => ({
			...prev,
			payYearMonth: sm,
			unpaid: computeUnpaidForPnumFromSummary(apiSummary, selectedPnum),
			date: "",
			cash: "",
			card: "",
			deposit: "",
			etc: "",
			doc: "",
		}));
	};

	const handleSaveCollection = async () => {
		const sm = recipientForm.payYearMonth.trim() || monthInputToSalmm(payYearMonth);
		if (!sm || sm.length !== 6) {
			alert("급여년월(SALMM)이 올바르지 않습니다.");
			return;
		}
		const pnum = recipientForm.pnum.trim();
		if (!pnum) {
			alert("수급자번호(PNUM)를 입력하거나 메인 그리드에서 수급자를 선택해 주세요.");
			return;
		}
		const insdt = recipientForm.date.trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(insdt)) {
			alert("수금일자를 YYYY-MM-DD 형식으로 입력해 주세요.");
			return;
		}
		const payload = {
			row: {
				SALMM: sm,
				PNUM: pnum,
				INSDT: insdt,
				HAMT: num(recipientForm.cash),
				CAMT: num(recipientForm.card),
				YAMT: num(recipientForm.deposit),
				ETC: recipientForm.etc.trim() || null,
				DOC: recipientForm.doc.trim() === "" ? null : num(recipientForm.doc),
			},
		};
		try {
			const res = await fetch("/api/f40120", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "저장에 실패했습니다.");
				return;
			}
			alert("저장되었습니다.");
			await fetchCollections({ resetUi: false, preservePnum: pnum });
		} catch (e) {
			console.error(e);
			alert("저장 중 오류가 발생했습니다.");
		}
	};

	const handleDeleteCollection = async () => {
		const sm = recipientForm.payYearMonth.trim() || monthInputToSalmm(payYearMonth);
		const pnum = recipientForm.pnum.trim();
		const insdt = recipientForm.date.trim();
		if (!sm || !pnum || !/^\d{4}-\d{2}-\d{2}$/.test(insdt)) {
			alert("삭제할 행의 수급자번호·수금일자를 확인해 주세요.");
			return;
		}
		if (!window.confirm("선택한 수금일자의 수금 내역을 삭제할까요?")) return;
		try {
			const q = new URLSearchParams({ salmm: sm, pnum, insdt });
			const res = await fetch(`/api/f40120?${q.toString()}`, { method: "DELETE" });
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "삭제에 실패했습니다.");
				return;
			}
			alert("삭제되었습니다.");
			await fetchCollections({ resetUi: false, preservePnum: pnum });
		} catch (e) {
			console.error(e);
			alert("삭제 중 오류가 발생했습니다.");
		}
	};

	return (
		<div className="flex min-h-screen flex-col bg-white text-black">
			<div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
				<div className="flex flex-1 flex-col overflow-hidden bg-white">
					<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
						<h2 className="text-lg font-semibold text-blue-900">급여 수금내역 관리 (F40120)</h2>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">급여년월</label>
							<input
								type="month"
								value={payYearMonth}
								onChange={(e) => {
									const v = e.target.value;
									setPayYearMonth(v);
									setRecipientForm((prev) => ({
										...prev,
										payYearMonth: monthInputToSalmm(v),
									}));
								}}
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">수급자명</label>
							<input
								type="text"
								value={recipientFilter}
								onChange={(e) => setRecipientFilter(e.target.value)}
								placeholder="검색 시 이름 필터"
								className="min-w-[120px] rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
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
							<button
								type="button"
								onClick={handleClose}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
					</div>

					<div className="flex flex-wrap gap-2 border-b border-blue-200 bg-white px-4 py-2">
						<button
							type="button"
							onClick={() => void handlePrintSelfContribution()}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							본인부담금 출력
						</button>
						<button
							type="button"
							onClick={() => void handlePrintCollection()}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							수금내역서 출력
						</button>
						<button
							type="button"
							onClick={() => void handlePrintUnpaid()}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							미수금내역서 출력
						</button>
					</div>

					<div className="min-h-0 flex-1 overflow-hidden border-b border-blue-200">
						<div className="h-full overflow-auto">
							<table className="w-full min-w-[700px] text-xs">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											상태
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											발생년월
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											현금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											카드
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											예금
										</th>
										<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
											미수금
										</th>
									</tr>
								</thead>
								<tbody>
									{collectionRows.length === 0 ? (
										<tr>
											<td colSpan={8} className="px-2 py-8 text-center text-blue-900/60">
												{loading
													? "조회 중…"
													: "수금 데이터가 없습니다. 급여년월을 선택한 뒤 검색해 주세요."}
											</td>
										</tr>
									) : (
										collectionRows.map((row) => (
											<tr
												key={row.pnumKey}
												onClick={() => handleSelectSummaryRow(row)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/50 ${
													selectedPnum === row.pnumKey ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipient}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.status}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.occurYearMonth}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipientContribution}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.cash}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.card}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.deposit}
												</td>
												<td className="px-2 py-1.5 text-center">{row.unpaid}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex min-h-0 flex-1 gap-4 border-t border-blue-200 p-4">
						<div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
							<div className="border-b border-blue-100 bg-blue-50/80 px-2 py-1.5 text-xs font-medium text-blue-900">
								상세 수금 (수급자별 일자별) — 행을 클릭하면 우측 폼에 불러옵니다.
							</div>
							<div className="overflow-auto">
								<table className="w-full min-w-[520px] text-xs">
									<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
										<tr>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												년월
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												수금일자
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												현금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												카드
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												예금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												비고
											</th>
											<th className="whitespace-nowrap px-2 py-1.5 text-center font-semibold text-blue-900">
												출납번호
											</th>
										</tr>
									</thead>
									<tbody>
										{!selectedPnum ? (
											<tr>
												<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
													메인 그리드에서 수급자를 선택하면 상세 내역이 표시됩니다.
												</td>
											</tr>
										) : detailRows.length === 0 ? (
											<tr>
												<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
													해당 수급자의 수금 상세가 없습니다. 우측 폼에서 일자·금액을 입력해 저장할 수 있습니다.
												</td>
											</tr>
										) : (
											detailRows.map((row) => (
												<tr
													key={`${row.pnumKey}-${row.insdtIso}`}
													onClick={() => handleSelectDetailRow(row)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/50 ${
														recipientForm.date === row.insdtIso ? "bg-blue-50" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.yearMonth}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.collectionDate}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.cash}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.card}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.deposit}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.etc}
													</td>
													<td className="px-2 py-1.5 text-center">{row.doc}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>

						<div className="flex w-80 shrink-0 flex-col gap-3 rounded-lg border border-blue-300 bg-blue-50/50 p-4">
							<h3 className="text-sm font-semibold text-blue-900">수금 입력 (F40120)</h3>
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">수급자번호</label>
									<input
										type="text"
										value={recipientForm.pnum}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, pnum: e.target.value }))
										}
										placeholder="PNUM"
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">급여년월</label>
									<input
										type="text"
										value={recipientForm.payYearMonth}
										onChange={(e) =>
											setRecipientForm((prev) => ({
												...prev,
												payYearMonth: e.target.value.replace(/\D/g, "").slice(0, 6),
											}))
										}
										placeholder="YYYYMM"
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">미수금(참고)</label>
									<input
										type="text"
										readOnly
										value={recipientForm.unpaid}
										className="flex-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-1 text-xs text-blue-900"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">수금일자</label>
									<input
										type="date"
										value={recipientForm.date}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, date: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">비고(ETC)</label>
									<input
										type="text"
										value={recipientForm.etc}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, etc: e.target.value }))
										}
										maxLength={100}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">출납번호</label>
									<input
										type="text"
										value={recipientForm.doc}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, doc: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">현금</label>
									<input
										type="text"
										inputMode="numeric"
										value={recipientForm.cash}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, cash: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">카드</label>
									<input
										type="text"
										inputMode="numeric"
										value={recipientForm.card}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, card: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 text-xs font-medium text-blue-900">예금</label>
									<input
										type="text"
										inputMode="numeric"
										value={recipientForm.deposit}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, deposit: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
							</div>
							<div className="mt-1 flex flex-col gap-2">
								<button
									type="button"
									onClick={handleClearLineForm}
									className="w-full rounded border border-blue-300 bg-white py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-50"
								>
									새 수금행 입력 (일자·금액 비움)
								</button>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => void handleSaveCollection()}
										className="flex-1 rounded border border-blue-400 bg-blue-500 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
									>
										수금 저장
									</button>
									<button
										type="button"
										onClick={() => void handleDeleteCollection()}
										className="flex-1 rounded border border-blue-400 bg-blue-200 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
									>
										수금 삭제
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
