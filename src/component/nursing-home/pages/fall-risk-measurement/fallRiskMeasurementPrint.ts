import { formatCareGradeLabel } from '../../utils/careGrade';
import {
	ASSESSMENT_SECTIONS,
	calcTotalScore,
	interpretScore,
	type F51014Option,
	type F51014UiSnapshot,
} from './f51014Mapper';

export type FallRiskPrintMember = {
	P_NM?: string | null;
	P_GRD?: string | null;
	P_YYNO?: string | null;
	P_NO?: string | null;
};

/** 출력 양식 구분 표기 (서식 기준) */
const PRINT_CATEGORY: Record<string, string> = {
	age: '연령',
	mentalState: '정신상태',
	bowel: '배변',
	fallExperience: '낙상경험',
	activity: '활동',
	gaitBalance: '걸음걸이 및 균형',
	medication: '지난7일간\n약복용이나\n계획된 약물',
};

const POINT_COLS = ['4', '3', '2', '1'] as const;

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

function optionByCode(options: F51014Option[], code: string): F51014Option | undefined {
	return options.find((o) => o.code === code);
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

/** 구분 | 4점 | 3점 | 2점 | 1점 | 점수 */
function renderMatrixRow(
	section: (typeof ASSESSMENT_SECTIONS)[number],
	selectedCode: string
): string {
	const cat = PRINT_CATEGORY[section.field] || section.category;
	const pointCells = POINT_COLS.map((pt) => {
		const opt = optionByCode(section.options, pt);
		const text = opt ? nl(opt.label) : '';
		const selected = selectedCode !== '' && selectedCode === pt;
		return `<td class="pt${selected ? ' selected' : ''}">${text}</td>`;
	}).join('');
	const scoreText = selectedCode !== '' ? esc(selectedCode) : '';
	return `<tr>
		<td class="cat">${nl(cat)}</td>
		${pointCells}
		<td class="score">${scoreText}</td>
	</tr>`;
}

function buildPage(snap: F51014UiSnapshot, member: FallRiskPrintMember): string {
	const name = snap.beneficiary || member.P_NM || '';
	const grade = formatCareGradeLabel(member.P_GRD, '');
	const yyno = String(member.P_YYNO ?? member.P_NO ?? '').trim();
	const examiner = snap.examiner || '';
	const rqdt = formatYmd(snap.inspectionDate);

	const total =
		calcTotalScore(snap) ||
		(parseInt(String(snap.score || ''), 10) > 0 ? parseInt(String(snap.score), 10) : 0);
	const totalText = Number.isFinite(total) && total >= 0 ? String(total) : esc(snap.score || '');
	const opinion = String(snap.opinion || '').trim();

	const bodyRows = ASSESSMENT_SECTIONS.map((sec) =>
		renderMatrixRow(sec, String(snap[sec.field] ?? '').trim())
	).join('');

	return `
<div class="page">
	<div class="header">
		<h1 class="title">낙상 위험 측정(Huhn)</h1>
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
			<td>${esc(rqdt)}</td>
			<th></th>
			<td></td>
		</tr>
	</table>

	<table class="assess">
		<thead>
			<tr>
				<th class="col-cat">구 분</th>
				<th class="col-pt">4점</th>
				<th class="col-pt">3점</th>
				<th class="col-pt">2점</th>
				<th class="col-pt">1점</th>
				<th class="col-score">점수</th>
			</tr>
		</thead>
		<tbody>
			${bodyRows}
			<tr class="total">
				<td colspan="5" class="totalLabel">합 계 점 수</td>
				<td class="score">${totalText}</td>
			</tr>
		</tbody>
	</table>

	<div class="legend">
		<div class="legendTitle">※ 척도(합계점수 해석)</div>
		<div class="legendLines">
			<div>4점 이하 : 낙상위험 낮음</div>
			<div>5-10점 : 낙상위험</div>
			<div>11점 이상 : 낙상위험 매우 높음</div>
		</div>
	</div>

	<div class="opinionBlock">
		<div class="opinionTitle">검사결과에 대한 의견</div>
		<div class="opinionBox">${nl(opinion)}</div>
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
	padding: 10mm 12mm 12mm;
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
	margin-bottom: 5mm;
	min-height: 20mm;
}
.title {
	margin: 0;
	padding-top: 3mm;
	font-size: 18pt;
	font-weight: 700;
	text-align: center;
	text-decoration: underline;
	letter-spacing: 0.08em;
}
.approve {
	position: absolute;
	right: 0;
	top: 0;
	border-collapse: collapse;
	width: 40mm;
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
	height: 6.5mm;
}
.approve td.stamp {
	height: 13mm;
}
.info {
	width: 100%;
	border-collapse: collapse;
	margin-bottom: 3.5mm;
	table-layout: fixed;
}
.info th, .info td {
	border: 1px solid #000;
	padding: 4px 5px;
	vertical-align: middle;
	font-size: 9.5pt;
}
.info th {
	width: 16%;
	background: #f0f0f0;
	font-weight: 700;
	text-align: center;
	white-space: nowrap;
}
.info td {
	width: 17.3%;
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
	padding: 4px 3px;
}
.assess thead th {
	background: #f0f0f0;
	font-weight: 700;
	text-align: center;
	padding: 5px 2px;
	font-size: 10pt;
}
.col-cat { width: 14%; }
.col-pt { width: 18.5%; }
.col-score { width: 12%; }
.cat {
	text-align: center;
	font-weight: 700;
	font-size: 9.5pt;
	line-height: 1.3;
	padding: 6px 3px !important;
}
.pt {
	text-align: center;
	font-size: 8.5pt;
	line-height: 1.35;
	padding: 5px 4px !important;
}
.score {
	text-align: center;
	font-size: 14pt;
	font-weight: 700;
}
.total .totalLabel {
	text-align: center;
	font-weight: 700;
	font-size: 11pt;
	letter-spacing: 0.35em;
	padding: 7px !important;
}
.total .score {
	font-size: 15pt;
}
.legend {
	margin-top: 4mm;
	font-size: 9.5pt;
	line-height: 1.55;
}
.legendTitle {
	font-weight: 700;
	margin-bottom: 1.5mm;
}
.legendLines {
	padding-left: 2mm;
}
.opinionBlock {
	margin-top: 5mm;
}
.opinionTitle {
	font-weight: 700;
	font-size: 10.5pt;
	margin-bottom: 2mm;
}
.opinionBox {
	border: 1.5px solid #000;
	min-height: 42mm;
	padding: 8px 10px;
	white-space: pre-wrap;
	line-height: 1.55;
	font-size: 10pt;
}
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.page {
		width: auto;
		min-height: auto;
		padding: 6mm 8mm;
		margin: 0;
	}
}
@page {
	size: A4;
	margin: 8mm;
}
`;

export function buildFallRiskPrintHtml(snap: F51014UiSnapshot, member: FallRiskPrintMember): string {
	const name = snap.beneficiary || member.P_NM || '';
	const rqdt = formatYmd(snap.inspectionDate);
	const title = `낙상 위험 측정(Huhn)${name ? ` - ${name}` : ''}${rqdt ? ` (${rqdt})` : ''}`;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${buildPage(snap, member)}
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

export function openFallRiskPrint(snap: F51014UiSnapshot, member: FallRiskPrintMember): void {
	const total = calcTotalScore(snap);
	const filled: F51014UiSnapshot = {
		...snap,
		score: snap.score || (total >= 0 && Number.isFinite(total) ? String(total) : ''),
		riskLevel: snap.riskLevel || interpretScore(total),
	};
	openPrintWindow(buildFallRiskPrintHtml(filled, member));
}

export function openFallRiskBatchPrint(
	items: Array<{ snap: F51014UiSnapshot; member: FallRiskPrintMember }>
): void {
	if (!items.length) {
		alert('출력할 기록이 없습니다.');
		return;
	}
	const firstHtml = buildFallRiskPrintHtml(items[0].snap, items[0].member);
	const styleMatch = firstHtml.match(/<style>([\s\S]*?)<\/style>/i);
	const styles = styleMatch ? styleMatch[1] : '';
	const recordsHtml = items
		.map(({ snap, member }) => {
			const total = calcTotalScore(snap);
			const filled: F51014UiSnapshot = {
				...snap,
				score: snap.score || (total >= 0 && Number.isFinite(total) ? String(total) : ''),
				riskLevel: snap.riskLevel || interpretScore(total),
			};
			const full = buildFallRiskPrintHtml(filled, member);
			const bodyMatch = full.match(/<body>([\s\S]*?)<\/body>/i);
			return bodyMatch ? bodyMatch[1].trim() : '';
		})
		.filter(Boolean)
		.join('\n');
	const title = `낙상 위험 측정(Huhn) 일괄출력 (${items.length}건)`;
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
