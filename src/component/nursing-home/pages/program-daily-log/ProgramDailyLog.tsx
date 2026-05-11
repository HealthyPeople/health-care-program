"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

/** F14030 행 */
interface F14030Row {
	ANCD?: number;
	DSEQ?: number;
	SVDT?: string | Date | null;
	SVSTM?: string | null;
	SVETM?: string | null;
	SVGU?: string | null;
	SVDIC?: string | null;
	SVDES?: string | null;
	PGMAN0?: string | null;
	PGADD?: string | null;
	PGMAN1?: string | null;
	PGMAN2?: string | null;
	PGOJ?: string | null;
	PGJB?: string | null;
	PGDES?: string | null;
	INDT?: string | Date | null;
	ETC?: string | null;
	INEMPNO?: number | null;
	INEMPNM?: string | null;
	PGSEQ?: number | null;
	MIMG?: string | null;
	PG_GU?: string | null;
	PG_GU_NM?: string | null;
	SVDIC_SUB?: string | null;
}

const PG_GU_OPTIONS: { code: string; label: string }[] = [
	{ code: "1", label: "인지기능강화" },
	{ code: "2", label: "신체기능강화" },
	{ code: "3", label: "사회적응프로그램" },
	{ code: "4", label: "가족참여프로그램" },
	{ code: "6", label: "여가프로그램" },
	{ code: "9", label: "기타" },
];

/** 서비스구분 코드 SVGU — DB 1자리 */
const SVGU_OPTIONS: { code: string; label: string }[] = [
	{ code: "1", label: "프로그램" },
	{ code: "2", label: "교육" },
];

const DATE_PAGE_SIZE = 13;
/** 왼쪽 서비스일자 페이지 번호 표시 개수 */
const DATE_PAGE_NUMBER_WINDOW = 5;
/** 오른쪽 상단 프로그램 목록(표) — 한 페이지당 행 수, 영역 높이와 동일 */
const PROGRAM_LIST_PAGE_SIZE = 3;

function formatYmd(value: unknown): string {
	if (value == null || value === "") return "";
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return "";
		const y = value.getFullYear();
		const mo = String(value.getMonth() + 1).padStart(2, "0");
		const d = String(value.getDate()).padStart(2, "0");
		return `${y}-${mo}-${d}`;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		const str = String(Math.trunc(value));
		if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
	}
	const s = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return "";
}

function monthRangeYmd(d: Date): { start: string; end: string } {
	const y = d.getFullYear();
	const m = d.getMonth();
	const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
	const last = new Date(y, m + 1, 0).getDate();
	const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
	return { start, end };
}

function parsePgseq(value: unknown): number | null {
	if (value == null || value === "") return null;
	if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
	const n = parseInt(String(value).trim(), 10);
	return Number.isNaN(n) ? null : n;
}

function labelFromPgGuCode(guRaw: string): string {
	const gu = String(guRaw ?? "").trim().replace(/^0+/, "");
	if (!gu) return "";
	const o = PG_GU_OPTIONS.find((x) => x.code === gu);
	return o ? o.label : gu;
}

/** F14030 행 표시용 — PGSEQ로 F14040의 PG_GU를 우선 적용 */
function programCategoryLabel(row: F14030Row, pgseqToPgGu: ReadonlyMap<number, string>): string {
	const seq = parsePgseq(row.PGSEQ);
	if (seq != null) {
		const gu40 = pgseqToPgGu.get(seq);
		if (gu40 != null && String(gu40).trim() !== "") {
			const lbl = labelFromPgGuCode(String(gu40));
			if (lbl) return lbl;
		}
	}
	const nm = String(row.PG_GU_NM ?? "").trim();
	if (nm) return nm;
	const gu = String(row.PG_GU ?? "").trim().replace(/^0+/, "");
	if (gu) {
		const o = PG_GU_OPTIONS.find((x) => x.code === gu);
		if (o) return o.label;
		return gu;
	}
	const svgu = String(row.SVGU ?? "").trim();
	const svguOpt = SVGU_OPTIONS.find((x) => x.code === svgu);
	if (svguOpt) return svguOpt.label;
	return svgu || "-";
}

/** 폼 상태에 F14040 기준 PG_GU / PG_GU_NM 반영 */
function mergePlanPgGuFromF14040(
	fd: Record<string, string>,
	pgseqToPgGu: ReadonlyMap<number, string>,
): Record<string, string> {
	const seq = parsePgseq(fd.PGSEQ);
	if (seq == null) return fd;
	const gu40 = pgseqToPgGu.get(seq);
	if (gu40 == null || String(gu40).trim() === "") return fd;
	const code = String(gu40).trim().replace(/^0+/, "");
	const o = PG_GU_OPTIONS.find((x) => x.code === code);
	return { ...fd, PG_GU: code, PG_GU_NM: o ? o.label : fd.PG_GU_NM };
}

function emptyForm(svdDate: string): Record<string, string> {
	return {
		SVDT: svdDate,
		SVSTM: "",
		SVETM: "",
		SVGU: "",
		SVDIC: "",
		SVDES: "",
		PGMAN0: "",
		PGADD: "",
		PGMAN1: "",
		PGMAN2: "",
		PGOJ: "",
		PGJB: "",
		PGDES: "",
		INDT: formatYmd(new Date()),
		ETC: "",
		PGSEQ: "",
		MIMG: "",
		PG_GU: "",
		PG_GU_NM: "",
		SVDIC_SUB: "",
		INEMPNO: "",
		INEMPNM: "",
	};
}

function rowToForm(row: F14030Row): Record<string, string> {
	return {
		SVDT: formatYmd(row.SVDT),
		SVSTM: timeFromRow(row.SVSTM),
		SVETM: timeFromRow(row.SVETM),
		SVGU: (() => {
			const s = String(row.SVGU ?? "").trim();
			return s === "1" || s === "2" ? s : "";
		})(),
		SVDIC: String(row.SVDIC ?? ""),
		SVDES: String(row.SVDES ?? ""),
		PGMAN0: String(row.PGMAN0 ?? ""),
		PGADD: String(row.PGADD ?? ""),
		PGMAN1: String(row.PGMAN1 ?? ""),
		PGMAN2: String(row.PGMAN2 ?? ""),
		PGOJ: String(row.PGOJ ?? ""),
		PGJB: String(row.PGJB ?? ""),
		PGDES: String(row.PGDES ?? ""),
		INDT: formatYmd(row.INDT) || formatYmd(new Date()),
		ETC: String(row.ETC ?? ""),
		PGSEQ: row.PGSEQ != null ? String(row.PGSEQ) : "",
		MIMG: String(row.MIMG ?? ""),
		PG_GU: String(row.PG_GU ?? "").replace(/^0+/, ""),
		PG_GU_NM: String(row.PG_GU_NM ?? ""),
		SVDIC_SUB: String(row.SVDIC_SUB ?? ""),
		INEMPNO: row.INEMPNO != null ? String(row.INEMPNO) : "",
		INEMPNM: String(row.INEMPNM ?? ""),
	};
}

type UserInfo = { empno?: string | number; empnm?: string; [key: string]: unknown };

function padTimeForInput(t: string): string {
	const s = String(t ?? "").trim();
	if (/^\d{2}:\d{2}$/.test(s)) return s;
	const m = s.match(/^(\d{1,2}):(\d{1,2})/);
	if (m) {
		return `${String(parseInt(m[1], 10)).padStart(2, "0")}:${String(parseInt(m[2], 10)).padStart(2, "0")}`;
	}
	if (/^\d{3,4}$/.test(s)) {
		const padded = s.padStart(4, "0");
		return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
	}
	return "";
}

/** DB/직렬화된 시간 → HH:mm (5자) */
function timeFromRow(value: unknown): string {
	if (value == null || value === "") return "";
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		const h = value.getHours();
		const mi = value.getMinutes();
		return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
	}
	const s = String(value).trim();
	const iso = s.match(/(\d{1,2}):(\d{2})/);
	if (iso) return padTimeForInput(`${iso[1]}:${iso[2]}`);
	return padTimeForInput(s);
}

/** 출력용 F14040 행(참여 실적 집계) */
type F14040PlanForPrint = { PGSEQ?: number; PG_GU?: string | null; PGNM?: string | null };

type ParticipationSection = {
	participant: string;
	lines: { programLine: string; count: number }[];
	subtotal: number;
};

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** 참여 실적 표 — 프로그램 명 앞 분류 접두어 */
const PG_GU_SHORT_PRINT: Record<string, string> = {
	"1": "인지",
	"2": "신체",
	"3": "사회",
	"4": "가족",
	"6": "여가",
	"9": "기타",
};

function shortPgGuLabelForPrint(codeRaw: string): string {
	const code = String(codeRaw ?? "")
		.trim()
		.replace(/^0+/, "");
	return PG_GU_SHORT_PRINT[code] ?? (code || "기타");
}

/** PGMAN0(프로그램 참석자)에서 수급자 이름 목록 */
function extractParticipantNames(pgm0: string | null | undefined): string[] {
	const s = String(pgm0 ?? "").trim();
	if (!s) return [];
	const parts = s.split(/[\s,，、;/|]+/).map((x) => x.trim()).filter(Boolean);
	const seen = new Set<string>();
	const out: string[] = [];
	for (const p of parts) {
		if (seen.has(p)) continue;
		seen.add(p);
		out.push(p);
	}
	return out;
}

function buildPlanMetaFromF14040Json(
	plans: F14040PlanForPrint[],
): Map<number, { pgGu: string; pgnm: string }> {
	const m = new Map<number, { pgGu: string; pgnm: string }>();
	for (const r of plans) {
		const seq = r.PGSEQ;
		if (seq == null) continue;
		const n = typeof seq === "number" ? Math.trunc(seq) : parseInt(String(seq), 10);
		if (Number.isNaN(n)) continue;
		m.set(n, {
			pgGu: r.PG_GU != null ? String(r.PG_GU).trim() : "",
			pgnm: r.PGNM != null ? String(r.PGNM).trim() : "",
		});
	}
	return m;
}

function buildParticipationSections(
	rows: F14030Row[],
	planMeta: ReadonlyMap<number, { pgGu: string; pgnm: string }>,
): ParticipationSection[] {
	const outer = new Map<string, Map<string, { programLine: string; count: number }>>();

	for (const row of rows) {
		const names = extractParticipantNames(row.PGMAN0);
		if (names.length === 0) continue;
		const seq = parsePgseq(row.PGSEQ);
		const plan = seq != null ? planMeta.get(seq) : undefined;
		const titleFromPlan = plan?.pgnm?.trim() ?? "";
		const svdic = String(row.SVDIC ?? "").trim();
		const sub = String(row.SVDIC_SUB ?? "").trim();
		const title =
			titleFromPlan || (sub ? `${svdic} (${sub})` : svdic) || "(프로그램명 없음)";
		let guCode = "";
		if (plan?.pgGu && plan.pgGu.trim()) guCode = plan.pgGu.trim().replace(/^0+/, "");
		else guCode = String(row.PG_GU ?? "").trim().replace(/^0+/, "");
		const short = shortPgGuLabelForPrint(guCode);
		const programLine = `${short} - ${title}`;
		const aggKey = `${seq ?? "x"}|${title}`;

		for (const name of names) {
			if (!outer.has(name)) outer.set(name, new Map());
			const inner = outer.get(name)!;
			const cur = inner.get(aggKey);
			if (cur) cur.count += 1;
			else inner.set(aggKey, { programLine, count: 1 });
		}
	}

	const participants = Array.from(outer.keys()).sort((a, b) => a.localeCompare(b, "ko"));
	return participants.map((participant) => {
		const inner = outer.get(participant)!;
		const lines = Array.from(inner.values()).sort((a, b) =>
			a.programLine.localeCompare(b.programLine, "ko"),
		);
		const subtotal = lines.reduce((acc, x) => acc + x.count, 0);
		return { participant, lines, subtotal };
	});
}

function buildProgramParticipationPrintHtml(
	periodStart: string,
	periodEnd: string,
	sections: ParticipationSection[],
): string {
	const rowsHtml = sections
		.map((sec) => {
			const body = sec.lines
				.map((line, idx) => {
					const nameCell = idx === 0 ? escapeHtml(sec.participant) : "";
					return `<tr>
	<td class="td-name">${nameCell}</td>
	<td class="td-kind"></td>
	<td class="td-prog">${escapeHtml(line.programLine)}</td>
	<td class="td-num">${line.count}</td>
</tr>`;
				})
				.join("");
			const sub = `<tr class="tr-sub">
	<td class="td-name"></td>
	<td class="td-kind td-subtxt">소계</td>
	<td class="td-prog"></td>
	<td class="td-num">${sec.subtotal}</td>
</tr>`;
			return body + sub;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>프로그램 참여 실적</title>
<style>
@page { size: A4; margin: 14mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 11pt; color: #000; background: #fff; }
.wrap { max-width: 190mm; margin: 0 auto; }
h1 { text-align: center; font-size: 18pt; font-weight: 700; text-decoration: underline; margin-bottom: 10px; }
.period { margin-bottom: 14px; }
table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
th { text-align: center; font-weight: 600; background: #f5f5f5; }
.td-name { width: 18%; }
.td-kind { width: 10%; text-align: center; }
.td-prog { width: 52%; word-break: break-word; }
.td-num { width: 12%; text-align: right; }
.tr-sub td { border-top: 2px solid #000; font-weight: 600; }
.td-subtxt { text-align: center; }
.footer { margin-top: 16px; text-align: right; font-size: 10pt; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
<div class="wrap">
<h1>프로그램 참여 실적</h1>
<div class="period">기간: ${escapeHtml(periodStart)} ~ ${escapeHtml(periodEnd)}</div>
<table>
<thead><tr>
<th>수급자</th><th>구분</th><th>프로그램 명</th><th>참여횟수</th>
</tr></thead>
<tbody>
${rowsHtml}
</tbody>
</table>
<div class="footer">페이지: 1</div>
</div>
</body>
</html>`;
}

function programTitleForLogPrint(
	row: F14030Row,
	planMeta: ReadonlyMap<number, { pgGu: string; pgnm: string }>,
): string {
	const seq = parsePgseq(row.PGSEQ);
	const plan = seq != null ? planMeta.get(seq) : undefined;
	const titleFromPlan = plan?.pgnm?.trim() ?? "";
	const svdic = String(row.SVDIC ?? "").trim();
	const sub = String(row.SVDIC_SUB ?? "").trim();
	return titleFromPlan || (sub ? `${svdic} (${sub})` : svdic) || "(프로그램명 없음)";
}

function programNameFullLineForLogPrint(
	row: F14030Row,
	planMeta: ReadonlyMap<number, { pgGu: string; pgnm: string }>,
): string {
	const seq = parsePgseq(row.PGSEQ);
	const plan = seq != null ? planMeta.get(seq) : undefined;
	let guCode = "";
	if (plan?.pgGu && plan.pgGu.trim()) guCode = plan.pgGu.trim().replace(/^0+/, "");
	else guCode = String(row.PG_GU ?? "").trim().replace(/^0+/, "");
	const short = shortPgGuLabelForPrint(guCode);
	const title = programTitleForLogPrint(row, planMeta);
	return `${short} - ${title}`;
}

function svguLabelForPrint(codeRaw: string): string {
	const c = String(codeRaw ?? "").trim();
	const o = SVGU_OPTIONS.find((x) => x.code === c);
	return o ? o.label : c || "—";
}

function formatDateTimeForLogPrint(row: F14030Row): string {
	const d = formatYmd(row.SVDT);
	const a = timeFromRow(row.SVSTM);
	const b = timeFromRow(row.SVETM);
	if (!d) return "—";
	if (a && b) return `${d} ${a} ~ ${b}`;
	if (a) return `${d} ${a}`;
	return d;
}

function sortRowsChronologicalForLogPrint(a: F14030Row, b: F14030Row): number {
	const da = formatYmd(a.SVDT);
	const db = formatYmd(b.SVDT);
	if (da !== db) return da.localeCompare(db);
	const ta = String(a.SVSTM ?? "");
	const tb = String(b.SVSTM ?? "");
	if (ta !== tb) return ta.localeCompare(tb);
	return (a.DSEQ ?? 0) - (b.DSEQ ?? 0);
}

function buildSingleProgramDailyLogSheetHtml(
	row: F14030Row,
	planMeta: ReadonlyMap<number, { pgGu: string; pgnm: string }>,
	institutionName: string,
	pageBreakAfter: boolean,
): string {
	const pb = pageBreakAfter ? "page-break-after:always;break-after:page;" : "";
	const org = escapeHtml(institutionName.trim() || "—");
	const progName = escapeHtml(programNameFullLineForLogPrint(row, planMeta));
	const place = escapeHtml(String(row.PGADD ?? "").trim() || " ");
	const dt = escapeHtml(formatDateTimeForLogPrint(row));
	const svgu = escapeHtml(svguLabelForPrint(String(row.SVGU ?? "")));
	const man1 = escapeHtml(String(row.PGMAN1 ?? "").trim() || " ");
	const man2 = escapeHtml(String(row.PGMAN2 ?? "").trim() || " ");
	const attendees = escapeHtml(String(row.PGMAN0 ?? "").trim() || " ");
	const goal = escapeHtml(String(row.PGOJ ?? "").trim() || " ");
	const materials = escapeHtml(String(row.PGJB ?? "").trim() || " ");
	const process = escapeHtml(String(row.PGDES ?? "").trim() || " ");
	const evaluation = escapeHtml(String(row.SVDES ?? "").trim() || " ");

	return `<div class="log-sheet" style="${pb}">
<div class="log-top">
	<div class="log-title-block">
		<h1 class="log-title">프로그램일지</h1>
		<div class="log-org">기관명 : ${org}</div>
	</div>
	<table class="sign-table" aria-label="담당 검토 결재">
		<tr><th>담당</th><th>검토</th><th>결재</th></tr>
		<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
		<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
	</table>
</div>
<table class="log-main">
	<colgroup>
		<col style="width:14%"/>
		<col style="width:38%"/>
		<col style="width:14%"/>
		<col style="width:34%"/>
	</colgroup>
	<tbody>
	<tr>
		<td class="cell-label">프로그램명</td>
		<td class="cell-val">${progName}</td>
		<td class="cell-label">장소</td>
		<td class="cell-val">${place}</td>
	</tr>
	<tr>
		<td class="cell-label">일시</td>
		<td class="cell-val">${dt}</td>
		<td class="cell-label">구분</td>
		<td class="cell-val">${svgu}</td>
	</tr>
	<tr>
		<td class="cell-label">진행자</td>
		<td class="cell-val">${man1}</td>
		<td class="cell-label">보조진행자</td>
		<td class="cell-val">${man2}</td>
	</tr>
	<tr>
		<td class="cell-label">참석자</td>
		<td class="cell-val cell-pre cell-tall-sm" colspan="3">${attendees}</td>
	</tr>
	<tr>
		<td class="cell-label">프로그램 목표</td>
		<td class="cell-val cell-pre cell-tall-sm" colspan="3">${goal}</td>
	</tr>
	<tr>
		<td class="cell-label">준비물</td>
		<td class="cell-val cell-pre cell-tall-sm" colspan="3">${materials}</td>
	</tr>
	<tr>
		<td class="cell-label">프로그램 운영<br/>과정 및 내용</td>
		<td class="cell-val cell-pre cell-tall-lg" colspan="3">${process}</td>
	</tr>
	<tr>
		<td class="cell-label">평가</td>
		<td class="cell-val cell-pre cell-tall-lg" colspan="3">${evaluation}</td>
	</tr>
	<tr>
		<td class="cell-label">&nbsp;</td>
		<td class="cell-val" colspan="3">&nbsp;</td>
	</tr>
	</tbody>
</table>
</div>`;
}

function wrapProgramDailyLogPrintDocument(sheetsInnerHtml: string): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>프로그램일지</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 10.5pt; color: #000; background: #fff; }
.log-sheet { max-width: 186mm; margin: 0 auto 0 auto; padding-bottom: 4mm; }
.log-top { display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.log-title-block { flex: 1; min-width: 0; }
.log-title { text-align: center; font-size: 18pt; font-weight: 700; text-decoration: underline; margin: 0 0 8px 0; line-height: 1.2; }
.log-org { text-align: left; font-size: 11pt; padding-left: 2mm; }
.sign-table { border-collapse: collapse; border: 1px solid #000; font-size: 9pt; flex-shrink: 0; }
.sign-table th, .sign-table td { border: 1px solid #000; width: 64px; min-width: 56px; text-align: center; vertical-align: middle; padding: 4px 2px; }
.sign-table th { font-weight: 700; background: #f7f7f7; height: 26px; }
.sign-table td { height: 34px; }
.log-main { width: 100%; border-collapse: collapse; border: 2px solid #000; table-layout: fixed; }
.log-main td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; font-size: 10.5pt; }
.cell-label { text-align: center; font-weight: 600; background: #fafafa; }
.cell-val { text-align: left; word-break: break-word; }
.cell-pre { white-space: pre-wrap; vertical-align: top; }
.cell-tall-sm { min-height: 3.2em; }
.cell-tall-lg { min-height: 10em; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
${sheetsInnerHtml}
</body>
</html>`;
}

function openProgramDailyLogPrintWindow(html: string): void {
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

export default function ProgramDailyLog() {
	const initialRange = useMemo(() => monthRangeYmd(new Date()), []);

	const [workPeriodStart, setWorkPeriodStart] = useState(initialRange.start);
	const [workPeriodEnd, setWorkPeriodEnd] = useState(initialRange.end);
	const [rows, setRows] = useState<F14030Row[]>([]);
	const [loading, setLoading] = useState(false);
	const [listError, setListError] = useState<string | null>(null);

	const [selectedSvdDate, setSelectedSvdDate] = useState<string | null>(null);
	const [editingDseq, setEditingDseq] = useState<number | null>(null);
	/** 「추가」로 신규 입력 중이면 상단 행 미선택이어도 하단 폼 잠금 해제 */
	const [isAddingNewProgram, setIsAddingNewProgram] = useState(false);
	/** 기존 일지 선택 후 「수정」을 누른 경우에만 필드 편집 허용 */
	const [formFieldsUnlocked, setFormFieldsUnlocked] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const [formData, setFormData] = useState<Record<string, string>>(() => emptyForm(initialRange.start));
	const [saveLoading, setSaveLoading] = useState(false);
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	/** 「검색」으로 조회를 한 번이라도 성공한 뒤(빈 목록 포함) — 안내 문구 구분용 */
	const [hasSearched, setHasSearched] = useState(false);
	/** 기간설정 일지출력 모달 */
	const [periodLogModalOpen, setPeriodLogModalOpen] = useState(false);
	const [periodLogStart, setPeriodLogStart] = useState(initialRange.start);
	const [periodLogEnd, setPeriodLogEnd] = useState(initialRange.end);

	/** F14040 치료프로그램(일지 PGSEQ → PG_GU·PGNM) */
	type F14040PlanLite = { PGSEQ?: number; PG_GU?: string | null; PGNM?: string | null };
	const [f14040Plans, setF14040Plans] = useState<F14040PlanLite[]>([]);

	const didInitialMonthLoad = useRef(false);
	/** 목록 조회 세대 — 기간 변경·새 조회 시작 시 이전 비동기 결과 무시 */
	const listFetchEpoch = useRef(0);

	const uniqueDates = useMemo(() => {
		const set = new Set<string>();
		for (const r of rows) {
			const d = formatYmd(r.SVDT);
			if (d) set.add(d);
		}
		return Array.from(set).sort((a, b) => b.localeCompare(a));
	}, [rows]);

	const dateTotalPages = Math.max(1, Math.ceil(uniqueDates.length / DATE_PAGE_SIZE));
	const pagedDates = useMemo(() => {
		const start = (datePage - 1) * DATE_PAGE_SIZE;
		return uniqueDates.slice(start, start + DATE_PAGE_SIZE);
	}, [uniqueDates, datePage]);

	/** 페이지 번호 버튼에 표시할 구간(최대 5개), 현재 페이지가 가능한 한 가운데 오도록 */
	const datePageNumberWindow = useMemo(() => {
		const n = dateTotalPages;
		if (n <= 1) return [];
		const size = Math.min(DATE_PAGE_NUMBER_WINDOW, n);
		const startMax = Math.max(1, n - DATE_PAGE_NUMBER_WINDOW + 1);
		const start = Math.min(Math.max(1, datePage - 2), startMax);
		return Array.from({ length: size }, (_, i) => start + i);
	}, [datePage, dateTotalPages]);

	const programsForDate = useMemo(() => {
		if (!selectedSvdDate) return [];
		return rows
			.filter((r) => formatYmd(r.SVDT) === selectedSvdDate)
			.sort((a, b) => {
				const ta = String(a.SVSTM ?? "");
				const tb = String(b.SVSTM ?? "");
				if (ta !== tb) return ta.localeCompare(tb);
				return (a.DSEQ ?? 0) - (b.DSEQ ?? 0);
			});
	}, [rows, selectedSvdDate]);

	const pgseqToPlanMeta = useMemo(() => {
		const m = new Map<number, { pgGu: string; pgnm: string }>();
		for (const r of f14040Plans) {
			const seq = r.PGSEQ;
			if (seq == null) continue;
			const n = typeof seq === "number" ? Math.trunc(seq) : parseInt(String(seq), 10);
			if (Number.isNaN(n)) continue;
			m.set(n, {
				pgGu: r.PG_GU != null ? String(r.PG_GU).trim() : "",
				pgnm: r.PGNM != null ? String(r.PGNM).trim() : "",
			});
		}
		return m;
	}, [f14040Plans]);

	const pgseqToPgGuMap = useMemo(() => {
		const m = new Map<number, string>();
		pgseqToPlanMeta.forEach((v, k) => {
			if (v.pgGu) m.set(k, v.pgGu);
		});
		return m;
	}, [pgseqToPlanMeta]);

	const [programListPage, setProgramListPage] = useState(1);
	const programTotalPages = Math.max(1, Math.ceil(programsForDate.length / PROGRAM_LIST_PAGE_SIZE));
	const pagedProgramsForDate = useMemo(() => {
		const start = (programListPage - 1) * PROGRAM_LIST_PAGE_SIZE;
		return programsForDate.slice(start, start + PROGRAM_LIST_PAGE_SIZE);
	}, [programsForDate, programListPage]);

	const fetchDataRows = useCallback(async (): Promise<F14030Row[]> => {
		const url = `/api/f14030?startDate=${encodeURIComponent(workPeriodStart)}&endDate=${encodeURIComponent(workPeriodEnd)}`;
		const res = await fetch(url, { cache: "no-store" });
		const json = await res.json();
		if (!res.ok || !json.success) {
			throw new Error(json.error || "조회에 실패했습니다.");
		}
		return Array.isArray(json.data) ? json.data : [];
	}, [workPeriodStart, workPeriodEnd]);

	const reloadFull = useCallback(async () => {
		const run = ++listFetchEpoch.current;
		setLoading(true);
		setListError(null);
		try {
			const data = await fetchDataRows();
			if (run !== listFetchEpoch.current) return;
			setRows(data);
			setHasSearched(true);
			setSelectedSvdDate(null);
			setEditingDseq(null);
			setIsAddingNewProgram(false);
			setFormFieldsUnlocked(false);
			setProgramListPage(1);
			setDatePage(1);
			setFormData(emptyForm(workPeriodStart));
		} catch (e) {
			if (run !== listFetchEpoch.current) return;
			setRows([]);
			setHasSearched(false);
			setListError(e instanceof Error ? e.message : "조회 오류");
		} finally {
			if (run === listFetchEpoch.current) setLoading(false);
		}
	}, [fetchDataRows, workPeriodStart]);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/api/auth/user-info");
				const json = await res.json();
				if (json?.success && json?.data) setUserInfo(json.data as UserInfo);
			} catch {
				/* ignore */
			}
		})();
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/api/f14040", { cache: "no-store" });
				const json = await res.json();
				if (json?.success && Array.isArray(json.data)) setF14040Plans(json.data as F14040PlanLite[]);
			} catch {
				/* ignore */
			}
		})();
	}, []);

	useEffect(() => {
		setDatePage((p) => Math.min(p, dateTotalPages));
	}, [dateTotalPages]);

	useEffect(() => {
		setProgramListPage((p) => Math.min(p, programTotalPages));
	}, [programTotalPages]);

	useEffect(() => {
		setProgramListPage(1);
	}, [selectedSvdDate]);

	/** 최초 진입 시에만 당월(업무기간 기본값) 전체 조회 */
	useEffect(() => {
		if (didInitialMonthLoad.current) return;
		didInitialMonthLoad.current = true;
		void reloadFull();
	}, [reloadFull]);

	const handleSearch = () => {
		void reloadFull();
	};

	const handleSelectDate = (svdDate: string) => {
		setSelectedSvdDate(svdDate);
		setEditingDseq(null);
		setIsAddingNewProgram(false);
		setFormFieldsUnlocked(false);
		setFormData(emptyForm(svdDate));
	};

	const handleSelectProgram = (program: F14030Row) => {
		if (program.DSEQ == null) return;
		setIsAddingNewProgram(false);
		setFormFieldsUnlocked(false);
		setEditingDseq(program.DSEQ);
		setFormData(mergePlanPgGuFromF14040(rowToForm(program), pgseqToPgGuMap));
	};

	const handleNew = () => {
		if (!selectedSvdDate) {
			alert("왼쪽에서 서비스일자를 먼저 선택해 주세요.");
			return;
		}
		setIsAddingNewProgram(true);
		setFormFieldsUnlocked(true);
		setEditingDseq(null);
		setFormData(emptyForm(selectedSvdDate));
	};

	/** 수정·신규 입력 모드 종료 — 저장 없이 읽기 전용으로 복귀 */
	const handleCancelEdit = () => {
		if (isAddingNewProgram) {
			setIsAddingNewProgram(false);
			setFormFieldsUnlocked(false);
			setEditingDseq(null);
			if (selectedSvdDate) setFormData(emptyForm(selectedSvdDate));
			else setFormData(emptyForm(workPeriodStart));
			return;
		}
		if (editingDseq != null && selectedSvdDate) {
			const row = rows.find(
				(r) => r.DSEQ === editingDseq && formatYmd(r.SVDT) === selectedSvdDate,
			);
			if (row) setFormData(mergePlanPgGuFromF14040(rowToForm(row), pgseqToPgGuMap));
			setFormFieldsUnlocked(false);
			return;
		}
		setFormFieldsUnlocked(false);
	};

	const buildSaveBody = (action: "create" | "save") => {
		let INEMPNO: number | null = null;
		const eno = userInfo?.empno;
		if (eno !== undefined && eno !== null && String(eno).trim() !== "") {
			const n = parseInt(String(eno), 10);
			INEMPNO = Number.isNaN(n) ? null : n;
		}
		const INEMPNM = (userInfo?.empnm && String(userInfo.empnm).trim()) || null;

		const body: Record<string, unknown> = {
			action,
			SVDT: formData.SVDT?.trim(),
			SVSTM: formData.SVSTM?.trim() ?? "",
			SVETM: formData.SVETM?.trim() ?? "",
			SVGU: formData.SVGU?.trim() ?? "",
			SVDIC: formData.SVDIC ?? "",
			SVDES: formData.SVDES ?? "",
			PGMAN0: formData.PGMAN0 ?? "",
			PGADD: formData.PGADD ?? "",
			PGMAN1: formData.PGMAN1 ?? "",
			PGMAN2: formData.PGMAN2 ?? "",
			PGOJ: formData.PGOJ ?? "",
			PGJB: formData.PGJB ?? "",
			PGDES: formData.PGDES ?? "",
			INDT: formData.INDT?.trim() || null,
			ETC: formData.ETC ?? "",
			INEMPNO,
			INEMPNM,
			PGSEQ: formData.PGSEQ?.trim() ? parseInt(formData.PGSEQ, 10) : null,
			MIMG: formData.MIMG?.trim() || null,
			PG_GU: formData.PG_GU?.trim() || null,
			PG_GU_NM: formData.PG_GU_NM?.trim() || null,
			SVDIC_SUB: formData.SVDIC_SUB?.trim() || null,
		};
		if (action === "save" && editingDseq != null) {
			body.dseq = editingDseq;
		}
		return body;
	};

	const handleSave = async () => {
		const areaLocked =
			!selectedSvdDate ||
			(programsForDate.length > 0 && editingDseq == null && !isAddingNewProgram);
		const mayEdit =
			!areaLocked && (isAddingNewProgram || (editingDseq != null && formFieldsUnlocked));
		if (!mayEdit) {
			alert("「수정」으로 편집을 시작하거나 「추가」로 신규 작성을 시작한 뒤 저장할 수 있습니다.");
			return;
		}
		if (!formData.SVDT?.trim()) {
			alert("서비스일자를 입력해 주세요.");
			return;
		}
		if (!formData.SVDIC?.trim()) {
			alert("서비스제목을 입력해 주세요.");
			return;
		}

		const action = editingDseq != null ? "save" : "create";
		setSaveLoading(true);
		try {
			const res = await fetch("/api/f14030", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(buildSaveBody(action)),
			});
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw new Error(json.error || "저장에 실패했습니다.");
			}
			alert(action === "create" ? "등록되었습니다." : "수정되었습니다.");
			const newDseq = json.dseq as number | undefined;
			const data = await fetchDataRows();
			setRows(data);
			const svd = formData.SVDT.trim();
			setSelectedSvdDate(svd);
			const pickDseq = action === "create" ? (newDseq != null ? Number(newDseq) : null) : editingDseq;
			if (pickDseq != null) {
				const row = data.find((r) => r.DSEQ === pickDseq && formatYmd(r.SVDT) === svd);
				if (row) {
					setIsAddingNewProgram(false);
					setFormFieldsUnlocked(false);
					setEditingDseq(pickDseq);
					setFormData(mergePlanPgGuFromF14040(rowToForm(row), pgseqToPgGuMap));
					const sorted = data
						.filter((r) => formatYmd(r.SVDT) === svd)
						.sort((a, b) => {
							const ta = String(a.SVSTM ?? "");
							const tb = String(b.SVSTM ?? "");
							if (ta !== tb) return ta.localeCompare(tb);
							return (a.DSEQ ?? 0) - (b.DSEQ ?? 0);
						});
					const idx = sorted.findIndex((r) => r.DSEQ === pickDseq);
					if (idx >= 0) {
						setProgramListPage(Math.floor(idx / PROGRAM_LIST_PAGE_SIZE) + 1);
					}
				}
			} else {
				setIsAddingNewProgram(false);
				setFormFieldsUnlocked(false);
				setEditingDseq(null);
				setFormData(emptyForm(svd));
			}
		} catch (e) {
			alert(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaveLoading(false);
		}
	};

	const handleDelete = async () => {
		if (editingDseq == null) {
			alert("삭제할 행을 목록에서 선택해 주세요.");
			return;
		}
		if (!confirm("정말 삭제하시겠습니까?")) return;
		setSaveLoading(true);
		try {
			const res = await fetch("/api/f14030", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "delete", dseq: editingDseq }),
			});
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw new Error(json.error || "삭제에 실패했습니다.");
			}
			alert("삭제되었습니다.");
			const keepDate = selectedSvdDate;
			const data = await fetchDataRows();
			setRows(data);
			if (keepDate && data.some((r) => formatYmd(r.SVDT) === keepDate)) {
				setSelectedSvdDate(keepDate);
				setFormData(emptyForm(keepDate));
			} else {
				setSelectedSvdDate(null);
				setFormData(emptyForm(workPeriodStart));
			}
			setEditingDseq(null);
			setIsAddingNewProgram(false);
			setFormFieldsUnlocked(false);
		} catch (e) {
			alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaveLoading(false);
		}
	};

	const handleCopyDate = () => {
		alert("기능 개발 중입니다.");
	};
	const handleCopyByCase = () => {
		alert("기능 개발 중입니다.");
	};
	const handleCopyToCenter = () => {
		alert("기능 개발 중입니다.");
	};

	const institutionNameForPrint = useMemo(
		() => String(userInfo?.annm ?? "").trim() || "—",
		[userInfo],
	);

	const handleOpenPeriodLogModal = () => {
		setPeriodLogStart(workPeriodStart);
		setPeriodLogEnd(workPeriodEnd);
		setPeriodLogModalOpen(true);
	};

	const handlePrintSingleProgramLog = () => {
		if (editingDseq == null || !selectedSvdDate) {
			alert("출력할 일지를 목록에서 선택해 주세요.");
			return;
		}
		if (isAddingNewProgram) {
			alert("신규 작성 중인 일지는 저장한 뒤 출력해 주세요.");
			return;
		}
		const row = rows.find((r) => r.DSEQ === editingDseq && formatYmd(r.SVDT) === selectedSvdDate);
		if (!row) {
			alert("선택한 일지 데이터를 찾을 수 없습니다.");
			return;
		}
		const sheet = buildSingleProgramDailyLogSheetHtml(
			row,
			pgseqToPlanMeta,
			institutionNameForPrint,
			false,
		);
		openProgramDailyLogPrintWindow(wrapProgramDailyLogPrintDocument(sheet));
	};

	const handlePrintProgramLogsInPeriod = async () => {
		const start = periodLogStart.trim();
		const end = periodLogEnd.trim();
		if (!start || !end) {
			alert("시작일·종료일을 입력해 주세요.");
			return;
		}
		if (start > end) {
			alert("시작일이 종료일보다 늦을 수 없습니다.");
			return;
		}
		try {
			const [j30, j40] = await Promise.all([
				fetch(
					`/api/f14030?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
					{ cache: "no-store" },
				).then((r) => r.json()),
				fetch("/api/f14040", { cache: "no-store" }).then((r) => r.json()),
			]);
			if (!j30?.success) {
				alert(String(j30?.error || "일지 데이터를 불러오지 못했습니다."));
				return;
			}
			const dataRows: F14030Row[] = Array.isArray(j30.data) ? j30.data : [];
			const plans: F14040PlanForPrint[] =
				j40?.success && Array.isArray(j40.data) ? j40.data : [];
			const planMeta = buildPlanMetaFromF14040Json(plans);
			const sorted = [...dataRows].sort(sortRowsChronologicalForLogPrint);
			if (sorted.length === 0) {
				alert("해당 기간에 출력할 일지가 없습니다.");
				return;
			}
			const inner = sorted
				.map((row, i) =>
					buildSingleProgramDailyLogSheetHtml(
						row,
						planMeta,
						institutionNameForPrint,
						i < sorted.length - 1,
					),
				)
				.join("");
			openProgramDailyLogPrintWindow(wrapProgramDailyLogPrintDocument(inner));
			setPeriodLogModalOpen(false);
		} catch (e) {
			alert(e instanceof Error ? e.message : "출력 중 오류가 발생했습니다.");
		}
	};

	const handlePrintProgramParticipation = async () => {
		try {
			const [j30, j40] = await Promise.all([
				fetch(
					`/api/f14030?startDate=${encodeURIComponent(workPeriodStart)}&endDate=${encodeURIComponent(workPeriodEnd)}`,
					{ cache: "no-store" },
				).then((r) => r.json()),
				fetch("/api/f14040", { cache: "no-store" }).then((r) => r.json()),
			]);
			if (!j30?.success) {
				alert(String(j30?.error || "일지 데이터를 불러오지 못했습니다."));
				return;
			}
			const dataRows: F14030Row[] = Array.isArray(j30.data) ? j30.data : [];
			const plans: F14040PlanForPrint[] =
				j40?.success && Array.isArray(j40.data) ? j40.data : [];
			const planMeta = buildPlanMetaFromF14040Json(plans);
			const sections = buildParticipationSections(dataRows, planMeta);
			if (sections.length === 0) {
				alert(
					"출력할 참여 데이터가 없습니다. 해당 기간 일지에 프로그램 참석자(PGMAN0)가 입력된 행이 있는지 확인해 주세요.",
				);
				return;
			}
			const html = buildProgramParticipationPrintHtml(workPeriodStart, workPeriodEnd, sections);
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
		} catch (e) {
			alert(e instanceof Error ? e.message : "출력 중 오류가 발생했습니다.");
		}
	};

	const fieldRo = "px-2 py-1.5 text-sm border border-blue-300 rounded bg-white w-full max-w-full";

	/** 상단 표에서 행을 고르지 않았을 때 하단 폼 비활성 표시(「추가」로 신규 입력 중은 제외) */
	const formAreaLocked =
		!selectedSvdDate ||
		(programsForDate.length > 0 && editingDseq == null && !isAddingNewProgram);

	const canEditFormFields =
		!formAreaLocked &&
		(isAddingNewProgram || (editingDseq != null && formFieldsUnlocked));

	const onPgGuChange = (code: string) => {
		if (!canEditFormFields) return;
		const o = PG_GU_OPTIONS.find((x) => x.code === code);
		setFormData((prev) => ({
			...prev,
			PG_GU: code,
			PG_GU_NM: o ? o.label : prev.PG_GU_NM,
		}));
	};

	const showModifyButton =
		!formAreaLocked && editingDseq != null && !isAddingNewProgram && !formFieldsUnlocked;

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50 print:hidden">
				<h1 className="text-xl font-semibold text-blue-900">프로그램 일지</h1>
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-blue-900 whitespace-nowrap">업무기간</label>
						<input
							type="date"
							value={workPeriodStart}
							onChange={(e) => setWorkPeriodStart(e.target.value)}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
						<span className="text-sm text-blue-900">~</span>
						<input
							type="date"
							value={workPeriodEnd}
							onChange={(e) => setWorkPeriodEnd(e.target.value)}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
						<span className="text-xs text-blue-900/80 max-w-[260px] leading-snug">
							처음에는 이번 달이 자동 조회됩니다. 기간만 바꾼 경우 목록은 그대로 두고, 새 기간으로 보려면 「검색」을 누릅니다.
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleSearch}
							disabled={loading}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50"
						>
							검색
						</button>
						<button
							type="button"
							onClick={() => window.close()}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>
			</div>

			{listError ? (
				<div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200">{listError}</div>
			) : null}

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<div className="flex flex-col w-[22%] min-w-[200px] shrink-0 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900">프로그램</label>
					</div>
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-xs text-blue-900/80">서비스일자 (같은 날짜는 한 줄)</label>
					</div>
					<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
						<div className="flex-1 min-h-0 overflow-y-auto bg-white flex flex-col">
							<div className="shrink-0">
								{loading ? (
									<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
								) : pagedDates.length === 0 ? (
									<div className="px-3 py-2 text-sm text-blue-900/60">
										{!hasSearched
											? "업무기간을 설정한 뒤 「검색」을 눌러 주세요."
											: "해당 기간에 서비스일자가 없습니다."}
									</div>
								) : (
									pagedDates.map((date) => (
										<div
											key={date}
											role="button"
											tabIndex={0}
											onClick={() => handleSelectDate(date)}
											onKeyDown={(ev) => {
												if (ev.key === "Enter" || ev.key === " ") handleSelectDate(date);
											}}
											className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
												selectedSvdDate === date ? "bg-blue-100 font-semibold" : ""
											}`}
										>
											{date}
										</div>
									))
								)}
							</div>
							{dateTotalPages > 1 ? (
								<div className="shrink-0 border-t border-blue-200 bg-white px-1.5 py-1.5 mt-0">
									<div className="flex items-center justify-center gap-0.5 flex-wrap">
										<button
											type="button"
											onClick={() => setDatePage(1)}
											disabled={datePage === 1}
											className="px-1.5 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50 shrink-0"
											aria-label="첫 페이지"
										>
											&lt;&lt;
										</button>
										<button
											type="button"
											onClick={() => setDatePage((p) => Math.max(1, p - 1))}
											disabled={datePage === 1}
											className="px-1.5 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50 shrink-0"
											aria-label="이전 페이지"
										>
											&lt;
										</button>
										{datePageNumberWindow.map((p) => (
											<button
												key={p}
												type="button"
												onClick={() => setDatePage(p)}
												className={`min-w-[1.75rem] px-1.5 py-0.5 text-xs border rounded shrink-0 tabular-nums ${
													p === datePage
														? "border-blue-500 bg-blue-200 font-semibold text-blue-900"
														: "border-blue-300 hover:bg-blue-50 text-blue-900"
												}`}
											>
												{p}
											</button>
										))}
										<button
											type="button"
											onClick={() => setDatePage((p) => Math.min(dateTotalPages, p + 1))}
											disabled={datePage >= dateTotalPages}
											className="px-1.5 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50 shrink-0"
											aria-label="다음 페이지"
										>
											&gt;
										</button>
										<button
											type="button"
											onClick={() => setDatePage(dateTotalPages)}
											disabled={datePage >= dateTotalPages}
											className="px-1.5 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50 shrink-0"
											aria-label="마지막 페이지"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							) : null}
						</div>
					</div>
				</div>

				<div className="flex flex-col flex-1 min-w-0 bg-white">
					<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
						<div className="shrink-0 border-b border-blue-200 bg-white flex flex-col">
							<table className="w-full text-sm min-w-[640px] table-fixed border-collapse">
								<thead>
									<tr className="h-10 border-b border-blue-200 bg-blue-50">
										<th className="px-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap align-middle">
											서비스일자
										</th>
										<th className="px-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap align-middle">
											시작시간
										</th>
										<th className="px-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap align-middle">
											종료시간
										</th>
										<th className="px-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap align-middle">
											프로그램구분
										</th>
										<th className="px-2 font-semibold text-center text-blue-900 whitespace-nowrap align-middle">서비스제목</th>
									</tr>
								</thead>
								<tbody className="h-[9rem]">
									{loading ? (
										<tr className="h-[9rem]">
											<td colSpan={5} className="px-3 align-middle text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : !selectedSvdDate ? (
										<tr className="h-[9rem]">
											<td colSpan={5} className="px-3 align-middle text-center text-blue-900/60">
												서비스일자를 선택해 주세요
											</td>
										</tr>
									) : programsForDate.length === 0 ? (
										<tr className="h-[9rem]">
											<td colSpan={5} className="px-3 align-middle text-center text-blue-900/60">
												해당 일자에 등록된 프로그램이 없습니다. 아래에서 추가할 수 있습니다.
											</td>
										</tr>
									) : (
										<>
											{pagedProgramsForDate.map((program) => {
												const selected = editingDseq != null && program.DSEQ === editingDseq;
												return (
													<tr
														key={program.DSEQ ?? String(program.SVSTM) + String(program.SVDIC)}
														onClick={() => handleSelectProgram(program)}
														className={`h-12 max-h-12 border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
															selected ? "bg-blue-100" : ""
														}`}
													>
														<td className="px-2 align-middle text-center border-r border-blue-100 whitespace-nowrap truncate">
															{formatYmd(program.SVDT)}
														</td>
														<td className="px-2 align-middle text-center border-r border-blue-100 truncate">
															{String(program.SVSTM ?? "")}
														</td>
														<td className="px-2 align-middle text-center border-r border-blue-100 truncate">
															{String(program.SVETM ?? "")}
														</td>
														<td className="px-2 align-middle text-center border-r border-blue-100 text-xs truncate">
															{programCategoryLabel(program, pgseqToPgGuMap)}
														</td>
														<td className="px-2 align-middle text-left truncate">{String(program.SVDIC ?? "")}</td>
													</tr>
												);
											})}
											{Array.from({
												length: Math.max(0, PROGRAM_LIST_PAGE_SIZE - pagedProgramsForDate.length),
											}).map((_, i) => (
												<tr
													key={`program-pad-${i}`}
													className="h-12 max-h-12 border-b border-blue-50/50 pointer-events-none bg-blue-50/10"
													aria-hidden
												>
													<td colSpan={5} />
												</tr>
											))}
										</>
									)}
								</tbody>
							</table>
							{programsForDate.length > PROGRAM_LIST_PAGE_SIZE ? (
								<div className="flex items-center justify-center gap-1 py-1.5 border-t border-blue-200 bg-blue-50/60 shrink-0">
									<button
										type="button"
										onClick={() => setProgramListPage(1)}
										disabled={programListPage === 1}
										className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => setProgramListPage((p) => Math.max(1, p - 1))}
										disabled={programListPage === 1}
										className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
									>
										&lt;
									</button>
									<span className="text-xs text-blue-900 px-1 tabular-nums">
										{programListPage} / {programTotalPages}
									</span>
									<button
										type="button"
										onClick={() => setProgramListPage((p) => Math.min(programTotalPages, p + 1))}
										disabled={programListPage >= programTotalPages}
										className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => setProgramListPage(programTotalPages)}
										disabled={programListPage >= programTotalPages}
										className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							) : null}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2 p-4 border-y border-blue-200 bg-blue-50 print:hidden shrink-0">
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={handleCopyToCenter}
									className="px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									센터로복사
								</button>
								<button
									type="button"
									onClick={handleNew}
									className="px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									추가
								</button>
								{showModifyButton ? (
									<button
										type="button"
										onClick={() => setFormFieldsUnlocked(true)}
										className="px-3 py-2 text-sm font-medium text-blue-900 bg-amber-100 border border-amber-400 rounded hover:bg-amber-200"
									>
										수정
									</button>
								) : null}
								{canEditFormFields ? (
									<button
										type="button"
										onClick={handleCancelEdit}
										disabled={saveLoading}
										className="px-3 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50 disabled:opacity-50"
									>
										취소
									</button>
								) : null}
								<button
									type="button"
									onClick={() => void handleSave()}
									disabled={saveLoading || !canEditFormFields}
									className="px-3 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 disabled:opacity-50"
								>
									{saveLoading ? "처리 중…" : editingDseq != null ? "저장(수정)" : "저장(등록)"}
								</button>
								<button
									type="button"
									onClick={() => void handleDelete()}
									disabled={saveLoading || editingDseq == null}
									className="px-3 py-2 text-sm font-medium text-red-800 bg-red-50 border border-red-300 rounded hover:bg-red-100 disabled:opacity-40"
								>
									삭제
								</button>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={handleCopyDate}
									className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									일자복사
								</button>
								<button
									type="button"
									onClick={handleCopyByCase}
									className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									건별복사
								</button>
								<button
									type="button"
									onClick={handlePrintSingleProgramLog}
									className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									해당 일지 출력
								</button>
								<button
									type="button"
									onClick={handleOpenPeriodLogModal}
									className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									기간설정 일지출력
								</button>
								<button
									type="button"
									onClick={() => void handlePrintProgramParticipation()}
									className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									프로그램 참여 실적 출력
								</button>
							</div>
						</div>

						<div className="relative flex-1 min-h-0 overflow-hidden bg-white">
							<div
								className={`h-full overflow-y-auto p-4 ${formAreaLocked ? "pointer-events-none" : ""}`}
							>
								<fieldset
									disabled={!canEditFormFields}
									className={`grid gap-3 max-w-5xl min-w-0 border-0 p-0 m-0 ${
										formAreaLocked ? "blur-sm select-none opacity-70" : ""
									}`}
								>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">서비스일자 (SVDT)</label>
										<input
											type="date"
											value={formData.SVDT}
											onChange={(e) => setFormData((p) => ({ ...p, SVDT: e.target.value }))}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">시작 (SVSTM, HH:mm)</label>
										<input
											type="time"
											value={padTimeForInput(formData.SVSTM)}
											onChange={(e) =>
												setFormData((p) => ({ ...p, SVSTM: e.target.value ? e.target.value.slice(0, 5) : "" }))
											}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">종료 (SVETM, HH:mm)</label>
										<input
											type="time"
											value={padTimeForInput(formData.SVETM)}
											onChange={(e) =>
												setFormData((p) => ({ ...p, SVETM: e.target.value ? e.target.value.slice(0, 5) : "" }))
											}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">등록일자 (INDT)</label>
										<input
											type="date"
											value={formData.INDT}
											onChange={(e) => setFormData((p) => ({ ...p, INDT: e.target.value }))}
											className={fieldRo}
										/>
									</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">서비스구분 (SVGU)</label>
										<select
											value={
												formData.SVGU === "1" || formData.SVGU === "2" ? formData.SVGU : ""
											}
											onChange={(e) => setFormData((p) => ({ ...p, SVGU: e.target.value }))}
											className={fieldRo}
										>
											<option value="">선택</option>
											{SVGU_OPTIONS.map((o) => (
												<option key={o.code} value={o.code}>
													{o.code}. {o.label}
												</option>
											))}
										</select>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">프로그램 구분 (PG_GU)</label>
										<select
											value={formData.PG_GU}
											onChange={(e) => onPgGuChange(e.target.value)}
											className={fieldRo}
										>
											<option value="">선택</option>
											{PG_GU_OPTIONS.map((o) => (
												<option key={o.code} value={o.code}>
													{o.code}. {o.label}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-2 sm:gap-3 items-end min-w-0">
									<div className="min-w-0">
										<label className="block text-xs text-blue-900/80 mb-0.5">프로그램구분명 (PG_GU_NM)</label>
										<input
											value={formData.PG_GU_NM}
											onChange={(e) => setFormData((p) => ({ ...p, PG_GU_NM: e.target.value }))}
											maxLength={50}
											className={fieldRo}
										/>
									</div>
									<div className="min-w-0">
										<label className="block text-xs text-blue-900/80 mb-0.5">서비스제목 (SVDIC)</label>
										<input
											value={formData.SVDIC}
											onChange={(e) => setFormData((p) => ({ ...p, SVDIC: e.target.value }))}
											maxLength={200}
											className={fieldRo}
										/>
									</div>
									<div className="min-w-0">
										<label className="block text-xs text-blue-900/80 mb-0.5">서비스제목 보조 (SVDIC_SUB)</label>
										<input
											value={formData.SVDIC_SUB}
											onChange={(e) => setFormData((p) => ({ ...p, SVDIC_SUB: e.target.value }))}
											maxLength={50}
											className={fieldRo}
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs text-blue-900/80 mb-0.5">서비스평가 (SVDES)</label>
									<textarea
										value={formData.SVDES}
										onChange={(e) => setFormData((p) => ({ ...p, SVDES: e.target.value }))}
										maxLength={2000}
										rows={5}
										className={fieldRo + " min-h-[100px] resize-y"}
									/>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">프로그램 참석자 (PGMAN0)</label>
										<input
											value={formData.PGMAN0}
											onChange={(e) => setFormData((p) => ({ ...p, PGMAN0: e.target.value }))}
											maxLength={200}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">프로그램 장소 (PGADD)</label>
										<input
											value={formData.PGADD}
											onChange={(e) => setFormData((p) => ({ ...p, PGADD: e.target.value }))}
											maxLength={50}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">진행자 (PGMAN1)</label>
										<input
											value={formData.PGMAN1}
											onChange={(e) => setFormData((p) => ({ ...p, PGMAN1: e.target.value }))}
											maxLength={20}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">보조 진행자 (PGMAN2)</label>
										<input
											value={formData.PGMAN2}
											onChange={(e) => setFormData((p) => ({ ...p, PGMAN2: e.target.value }))}
											maxLength={20}
											className={fieldRo}
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs text-blue-900/80 mb-0.5">프로그램 목표 (PGOJ)</label>
									<textarea
										value={formData.PGOJ}
										onChange={(e) => setFormData((p) => ({ ...p, PGOJ: e.target.value }))}
										maxLength={500}
										rows={2}
										className={fieldRo + " resize-y"}
									/>
								</div>
								<div>
									<label className="block text-xs text-blue-900/80 mb-0.5">준비물 (PGJB)</label>
									<textarea
										value={formData.PGJB}
										onChange={(e) => setFormData((p) => ({ ...p, PGJB: e.target.value }))}
										maxLength={200}
										rows={4}
										className={fieldRo + " min-h-[5.5rem] resize-y"}
									/>
								</div>
								<div>
									<label className="block text-xs text-blue-900/80 mb-0.5">프로그램운영과정및내용 (PGDES)</label>
									<textarea
										value={formData.PGDES}
										onChange={(e) => setFormData((p) => ({ ...p, PGDES: e.target.value }))}
										maxLength={1000}
										rows={20}
										className={fieldRo + " min-h-[30rem] resize-y"}
									/>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">비고 (ETC)</label>
										<input
											value={formData.ETC}
											onChange={(e) => setFormData((p) => ({ ...p, ETC: e.target.value }))}
											maxLength={1000}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">PGSEQ</label>
										<input
											value={formData.PGSEQ}
											onChange={(e) => setFormData((p) => ({ ...p, PGSEQ: e.target.value.replace(/\D/g, "") }))}
											className={fieldRo}
										/>
									</div>
									<div>
										<label className="block text-xs text-blue-900/80 mb-0.5">MIMG</label>
										<input
											value={formData.MIMG}
											onChange={(e) => setFormData((p) => ({ ...p, MIMG: e.target.value }))}
											maxLength={100}
											className={fieldRo}
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-900/70 border-t border-blue-100 pt-2">
									<div>
										DSEQ: {editingDseq != null ? editingDseq : "(신규)"} · 저장 시 등록자:{" "}
										{userInfo?.empnm ? `${userInfo.empnm} (${userInfo.empno ?? "-"})` : "로그인 정보 없음"}
									</div>
								</div>
								</fieldset>
							</div>
							{formAreaLocked ? (
								<div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/30 backdrop-blur-[1px]">
									<p className="text-center text-lg font-semibold text-blue-900 bg-white/95 px-8 py-5 rounded-lg border border-blue-300 shadow-md max-w-sm">
										프로그램 일지를 선택해 주세요
									</p>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>

			{periodLogModalOpen ? (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 print:hidden p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="period-log-print-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) setPeriodLogModalOpen(false);
					}}
				>
					<div
						className="bg-white rounded-lg border border-blue-300 shadow-xl w-full max-w-md p-5"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 id="period-log-print-title" className="text-lg font-semibold text-blue-900 mb-4">
							기간설정 일지출력
						</h2>
						<div className="flex flex-col gap-4 mb-5">
							<div className="flex flex-col gap-1">
								<label htmlFor="period-log-start" className="text-sm font-medium text-blue-900">
									시작일
								</label>
								<input
									id="period-log-start"
									type="date"
									value={periodLogStart}
									onChange={(e) => setPeriodLogStart(e.target.value)}
									className="px-2 py-1.5 text-sm bg-white border border-blue-300 rounded w-full max-w-full"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label htmlFor="period-log-end" className="text-sm font-medium text-blue-900">
									종료일
								</label>
								<input
									id="period-log-end"
									type="date"
									value={periodLogEnd}
									onChange={(e) => setPeriodLogEnd(e.target.value)}
									className="px-2 py-1.5 text-sm bg-white border border-blue-300 rounded w-full max-w-full"
								/>
							</div>
							<p className="text-xs text-blue-900/75 leading-snug">
								선택한 기간의 일지를 날짜·시간 순으로 모두 인쇄합니다. 각 일지는 한 페이지 양식으로 이어집니다.
							</p>
						</div>
						<div className="flex justify-end gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setPeriodLogModalOpen(false)}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50"
							>
								취소
							</button>
							<button
								type="button"
								onClick={() => void handlePrintProgramLogsInPeriod()}
								className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700"
							>
								출력
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
