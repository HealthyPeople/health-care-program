import { formatCareGradeLabel } from '../../utils/careGrade';
import {
	A01_OPTIONS,
	A02_OPTIONS,
	A03_OPTIONS,
	A04_OPTIONS,
	A05_OPTIONS,
	A06_OPTIONS,
	calcTotalScore,
	interpretScore,
	type F51013Option,
	type F51013UiSnapshot,
} from './f51013Mapper';

export type BedsoreRiskPrintMember = {
	P_NM?: string | null;
	P_GRD?: string | null;
	P_YYNO?: string | null;
	P_NO?: string | null;
};

type PrintSection = {
	field: keyof Pick<
		F51013UiSnapshot,
		| 'sensoryPerception'
		| 'moisture'
		| 'activity'
		| 'mobility'
		| 'nutritionalStatus'
		| 'frictionShear'
	>;
	title: string;
	subtitle: string;
	options: F51013Option[];
};

/** 출력 양식 구분/부제 (첨부 서식 기준) */
const PRINT_SECTIONS_PAGE1: PrintSection[] = [
	{
		field: 'sensoryPerception',
		title: '감각인지도',
		subtitle: '(압박에 의한 불쾌감에 대해 적절히 반응 할 수 있는 능력)',
		options: A01_OPTIONS,
	},
	{
		field: 'moisture',
		title: '습기',
		subtitle: '(피부가 습윤에 노출되는 정도)',
		options: A02_OPTIONS,
	},
	{
		field: 'activity',
		title: '활동성',
		subtitle: '',
		options: A03_OPTIONS,
	},
	{
		field: 'mobility',
		title: '움직임',
		subtitle: '(체위를 바꾸거나 조절할 수 있는 능력)',
		options: A04_OPTIONS,
	},
];

const PRINT_SECTIONS_PAGE2: PrintSection[] = [
	{
		field: 'nutritionalStatus',
		title: '영양상태',
		subtitle: '(평상시 식사섭취 상황)',
		options: A05_OPTIONS,
	},
	{
		field: 'frictionShear',
		title: '마찰력, 응전력',
		subtitle: '',
		options: A06_OPTIONS,
	},
];

function esc(v: unknown): string {
	return String(v ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function formatYmd(raw: unknown): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	if (s.includes('T')) return s.split('T')[0];
	return s;
}

function nl(text: string): string {
	return esc(text).replace(/\r\n|\n|\r/g, '<br/>');
}

function scoreOf(snap: F51013UiSnapshot, field: PrintSection['field']): string {
	const v = String(snap[field] ?? '').trim();
	return v || '';
}

function renderSectionRows(section: PrintSection, selectedCode: string): string {
	const opts = section.options;
	const scoreCell = `<td class="score" rowspan="${opts.length}">${esc(selectedCode)}</td>`;
	return opts
		.map((opt, i) => {
			const catCell =
				i === 0
					? `<td class="cat" rowspan="${opts.length}"><div class="catTitle">${esc(section.title)}</div>${
							section.subtitle
								? `<div class="catSub">${nl(section.subtitle)}</div>`
								: ''
						}</td>`
					: '';
			return `<tr>
				${catCell}
				<td class="scale">${esc(opt.code)}. ${nl(opt.label)}</td>
				<td class="desc">${nl(opt.description || '')}</td>
				${i === 0 ? scoreCell : ''}
			</tr>`;
		})
		.join('');
}

function approvalBox(): string {
	return `<table class="approve">
		<tr>
			<th>담당</th><th>검토</th><th>결제</th>
		</tr>
		<tr>
			<td class="stamp">&nbsp;</td>
			<td class="stamp">&nbsp;</td>
			<td class="stamp">&nbsp;</td>
		</tr>
	</table>`;
}

function buildPage1(
	snap: F51013UiSnapshot,
	member: BedsoreRiskPrintMember
): string {
	const name = snap.beneficiary || member.P_NM || '';
	const grade = formatCareGradeLabel(member.P_GRD, '');
	const yyno = String(member.P_YYNO ?? member.P_NO ?? '').trim();
	const examiner = snap.examiner || '';
	const rqdt = formatYmd(snap.inspectionDate);

	const bodyRows = PRINT_SECTIONS_PAGE1.map((sec) =>
		renderSectionRows(sec, scoreOf(snap, sec.field))
	).join('');

	return `
<div class="page">
	<div class="header">
		<h1 class="title">욕창 위험도 측정</h1>
		${approvalBox()}
	</div>

	<table class="info">
		<tr>
			<th>수급자성명</th>
			<td>${esc(name)}</td>
			<th>장기요양인정번호</th>
			<td>${esc(yyno)}</td>
			<th>장기요양등급</th>
			<td>${esc(grade)}</td>
		</tr>
		<tr>
			<th>검사자</th>
			<td>${esc(examiner)}</td>
			<th>검사일자</th>
			<td colspan="3">${esc(rqdt)}</td>
		</tr>
	</table>

	<table class="assess">
		<thead>
			<tr>
				<th class="col-cat">구분</th>
				<th class="col-scale">척도</th>
				<th class="col-desc">내용</th>
				<th class="col-score">점수</th>
			</tr>
		</thead>
		<tbody>
			${bodyRows}
		</tbody>
	</table>
</div>`;
}

function buildPage2(snap: F51013UiSnapshot): string {
	const bodyRows = PRINT_SECTIONS_PAGE2.map((sec) =>
		renderSectionRows(sec, scoreOf(snap, sec.field))
	).join('');

	const total =
		calcTotalScore(snap) ||
		(parseInt(String(snap.score || ''), 10) > 0 ? parseInt(String(snap.score), 10) : 0);
	const totalText = total > 0 ? String(total) : esc(snap.score || '');
	const opinion = String(snap.opinion || '').trim();

	return `
<div class="page page2">
	<table class="assess">
		<thead>
			<tr>
				<th class="col-cat">구분</th>
				<th class="col-scale">척도</th>
				<th class="col-desc">내용</th>
				<th class="col-score">점수</th>
			</tr>
		</thead>
		<tbody>
			${bodyRows}
			<tr class="total">
				<td colspan="3" class="totalLabel">합 계</td>
				<td class="score">${totalText}</td>
			</tr>
		</tbody>
	</table>

	<div class="legend">
		<div class="legendTitle">※ Braden(2001) 욕창 위험도 평가도구 점수해석</div>
		<div class="legendGrid">
			<div>19-23 : 위험 없음</div>
			<div>15-18 : 약간의 위험 있음</div>
			<div>13-14 : 중간정도의 위험 있음</div>
			<div>10-12 : 위험이 높음</div>
			<div>9 이하 : 위험이 매우 높음</div>
		</div>
	</div>

	<div class="opinion">
		<div class="opinionHead">검사결과에 대한 의견</div>
		<div class="opinionBody">${nl(opinion)}</div>
	</div>
</div>`;
}

const PRINT_STYLES = `
* { box-sizing: border-box; }
html, body {
	margin: 0; padding: 0;
	font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
	color: #000; background: #fff;
	font-size: 9.5pt;
}
.page {
	width: 210mm;
	min-height: 297mm;
	padding: 12mm 12mm 14mm;
	margin: 0 auto;
	position: relative;
	page-break-after: always;
	break-after: page;
}
.page:last-child {
	page-break-after: auto;
	break-after: auto;
}
.header {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	position: relative;
	margin-bottom: 6mm;
	min-height: 22mm;
}
.title {
	margin: 0;
	padding-top: 4mm;
	font-size: 20pt;
	font-weight: 700;
	text-align: center;
	text-decoration: underline;
	letter-spacing: 0.12em;
}
.approve {
	position: absolute;
	right: 0;
	top: 0;
	border-collapse: collapse;
	width: 42mm;
	font-size: 9pt;
}
.approve th, .approve td {
	border: 1px solid #000;
	text-align: center;
	padding: 2px;
}
.approve th {
	font-weight: 700;
	background: #f3f3f3;
	height: 7mm;
}
.approve td.stamp {
	height: 14mm;
}
.info {
	width: 100%;
	border-collapse: collapse;
	margin-bottom: 4mm;
	table-layout: fixed;
}
.info th, .info td {
	border: 1px solid #000;
	padding: 4px 6px;
	vertical-align: middle;
}
.info th {
	width: 18%;
	background: #f0f0f0;
	font-weight: 700;
	text-align: center;
	white-space: nowrap;
}
.info td {
	width: 15.3%;
	text-align: center;
}
.assess {
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
	border: 1.5px solid #000;
}
.assess th, .assess td {
	border: 1px solid #000;
	vertical-align: middle;
	padding: 3px 5px;
}
.assess thead th {
	background: #f0f0f0;
	font-weight: 700;
	text-align: center;
	padding: 5px 4px;
}
.col-cat { width: 16%; }
.col-scale { width: 20%; }
.col-desc { width: 54%; }
.col-score { width: 10%; }
.cat {
	text-align: center;
	font-weight: 700;
	background: #fff;
	padding: 4px 3px !important;
}
.catTitle { font-size: 10.5pt; line-height: 1.3; }
.catSub {
	margin-top: 3px;
	font-size: 8pt;
	font-weight: 400;
	line-height: 1.25;
}
.scale {
	text-align: center;
	font-size: 9pt;
	line-height: 1.3;
	white-space: normal;
}
.desc {
	text-align: left;
	font-size: 8.5pt;
	line-height: 1.35;
	padding: 4px 6px !important;
}
.score {
	text-align: center;
	font-size: 16pt;
	font-weight: 700;
}
.total .totalLabel {
	text-align: center;
	font-weight: 700;
	font-size: 12pt;
	letter-spacing: 0.4em;
	padding: 8px !important;
}
.total .score {
	font-size: 16pt;
}
.legend {
	margin-top: 4mm;
	font-size: 9.5pt;
	line-height: 1.55;
	page-break-inside: avoid;
	break-inside: avoid;
}
.legendTitle {
	font-weight: 700;
	margin-bottom: 2mm;
}
.legendGrid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1px 10mm;
	padding-left: 2mm;
}
.opinion {
	margin-top: 4mm;
	border: 1.5px solid #000;
	min-height: 42mm;
	page-break-inside: avoid;
	break-inside: avoid;
	page-break-before: avoid;
}
.opinionHead {
	border-bottom: 1px solid #000;
	padding: 5px 8px;
	font-weight: 700;
	font-size: 10.5pt;
	background: #f7f7f7;
}
.opinionBody {
	padding: 8px 10px;
	min-height: 36mm;
	white-space: pre-wrap;
	line-height: 1.55;
	font-size: 10pt;
}
.page2 .assess .desc {
	font-size: 8pt;
	line-height: 1.3;
}
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.page {
		width: auto;
		min-height: auto;
		padding: 8mm 10mm;
		margin: 0;
	}
}
@page {
	size: A4;
	margin: 8mm;
}
`;

export function buildBedsoreRiskPrintHtml(
	snap: F51013UiSnapshot,
	member: BedsoreRiskPrintMember
): string {
	const name = snap.beneficiary || member.P_NM || '';
	const rqdt = formatYmd(snap.inspectionDate);
	const title = `욕창 위험도 측정${name ? ` - ${name}` : ''}${rqdt ? ` (${rqdt})` : ''}`;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${buildPage1(snap, member)}
${buildPage2(snap)}
</body>
</html>`;
}

function openPrintWindow(html: string): void {
	const w = window.open('', '_blank');
	if (!w) {
		alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
		return;
	}
	w.document.write(html);
	w.document.close();
	setTimeout(() => {
		try {
			w.focus();
			w.print();
		} catch {
			/* ignore */
		}
	}, 250);
}

export function openBedsoreRiskPrint(
	snap: F51013UiSnapshot,
	member: BedsoreRiskPrintMember
): void {
	// 점수/해석이 비어 있으면 출력 직전에 보정
	const total = calcTotalScore(snap);
	const filled: F51013UiSnapshot = {
		...snap,
		score: snap.score || (total > 0 ? String(total) : ''),
		interpretation: snap.interpretation || interpretScore(total),
	};
	openPrintWindow(buildBedsoreRiskPrintHtml(filled, member));
}

/** 여러 건을 한 번에 인쇄 (각 기록 2페이지) */
export function openBedsoreRiskBatchPrint(
	items: Array<{ snap: F51013UiSnapshot; member: BedsoreRiskPrintMember }>
): void {
	if (!items.length) {
		alert('출력할 기록이 없습니다.');
		return;
	}
	const firstHtml = buildBedsoreRiskPrintHtml(items[0].snap, items[0].member);
	const styleMatch = firstHtml.match(/<style>([\s\S]*?)<\/style>/i);
	const styles = styleMatch ? styleMatch[1] : '';
	const recordsHtml = items
		.map(({ snap, member }) => {
			const total = calcTotalScore(snap);
			const filled: F51013UiSnapshot = {
				...snap,
				score: snap.score || (total > 0 ? String(total) : ''),
				interpretation: snap.interpretation || interpretScore(total),
			};
			const full = buildBedsoreRiskPrintHtml(filled, member);
			const bodyMatch = full.match(/<body>([\s\S]*?)<\/body>/i);
			return bodyMatch ? bodyMatch[1].trim() : '';
		})
		.filter(Boolean)
		.join('\n');
	const title = `욕창 위험도 측정 일괄출력 (${items.length}건)`;
	const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>${styles}</style>
</head>
<body>
${recordsHtml}
</body>
</html>`;
	openPrintWindow(html);
}
