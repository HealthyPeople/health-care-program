import { formatCareGradeLabel } from '../../utils/careGrade';
import {
	ASSESSMENT_ITEMS,
	EDUCATION_OPTIONS,
	calcTotalScore,
	interpretScore,
	type F51015Item,
	type F51015UiSnapshot,
} from './f51015Mapper';

export type CognitiveAssessmentPrintMember = {
	P_NM?: string | null;
	P_GRD?: string | null;
	P_SEX?: string | null;
	P_YYNO?: string | null;
	P_NO?: string | null;
};

/** MMSE-DS 진단검사 점수표 (연령×성별×교육년수 절단점) */
const CUTOFF_TABLE: { age: string; male: number[]; female: number[] }[] = [
	{ age: '60-69세', male: [20, 22, 24, 25], female: [19, 21, 23, 24] },
	{ age: '70-74세', male: [19, 21, 23, 24], female: [18, 20, 22, 23] },
	{ age: '75-79세', male: [18, 20, 22, 23], female: [17, 19, 21, 22] },
	{ age: '≥80세', male: [17, 19, 21, 22], female: [16, 18, 20, 21] },
];

function esc(v: unknown): string {
	return String(v ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function nl(text: string): string {
	return esc(text).replace(/\r\n|\n|\r/g, '<br/>');
}

function formatYmd(raw: unknown): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	if (s.includes('T')) return s.split('T')[0];
	return s;
}

/** DB: 0=맞음 → 출력 점수 1 / 1=틀림 → 출력 점수 0 */
function pointOf(code: string): string {
	if (code === '0') return '1';
	if (code === '1') return '0';
	return '';
}

function scoreOf(snap: F51015UiSnapshot, field: string): string {
	return pointOf(String((snap as any)[field] ?? '').trim());
}

function approvalBox(): string {
	return `<table class="approve">
		<tr><th>담당</th><th>검토</th><th>결재</th></tr>
		<tr>
			<td class="stamp">&nbsp;</td>
			<td class="stamp">&nbsp;</td>
			<td class="stamp">&nbsp;</td>
		</tr>
	</table>`;
}

function infoHeader(snap: F51015UiSnapshot, member: CognitiveAssessmentPrintMember): string {
	const name = snap.beneficiary || member.P_NM || '';
	const grade = formatCareGradeLabel(member.P_GRD, '');
	const yyno = String(member.P_YYNO ?? member.P_NO ?? '').trim();
	const examiner = snap.examiner || '';
	const rqdt = formatYmd(snap.inspectionDate);
	return `
	<div class="header">
		<h1 class="title">인지상태 평가</h1>
		${approvalBox()}
	</div>
	<table class="info">
		<tr>
			<th>수급자성명</th><td>${esc(name)}</td>
			<th>장기요양인정번호</th><td>${esc(yyno)}</td>
			<th>장기요양등급</th><td>${esc(grade)}</td>
		</tr>
		<tr>
			<th>평가자</th><td>${esc(examiner)}</td>
			<th>평가일자</th><td>${esc(rqdt)}</td>
			<th></th><td></td>
		</tr>
	</table>`;
}

type Block =
	| { type: 'q'; item: F51015Item; showNo: boolean }
	| { type: 'hint'; no: number; text: string }
	| { type: 'sep' };

function renderBlocks(blocks: Block[], snap: F51015UiSnapshot): string {
	return blocks
		.map((b) => {
			if (b.type === 'sep') return `<div class="sep"></div>`;
			if (b.type === 'hint') {
				const words =
					b.no === 11
						? `<div class="wordsBanner">나무 &nbsp;&nbsp; 자동차 &nbsp;&nbsp; 모자</div>`
						: '';
				return `<div class="hint"><span class="qno">${b.no}.</span> ${nl(b.text)}</div>${words}`;
			}
			const pt = scoreOf(snap, b.item.field);
			const indent = b.item.group ? ' sub' : '';
			const noHtml =
				!b.item.group && b.showNo
					? `<span class="qno">${b.item.no}.</span> `
					: b.item.group && b.showNo && !b.item.hint
						? `<span class="qno">${b.item.no}.</span> `
						: '';

			// 출력 양식: 이름대기(시계/연필)는 짧은 라벨
			let labelText = b.item.label;
			let prepend = '';
			let showItemNo = noHtml;
			if (b.item.colId === 'E22') {
				labelText = '시계';
				showItemNo = '';
				if (b.showNo) {
					prepend = `<div class="hint"><span class="qno">14.</span> (시계를 보여주며) 이것을 무엇이라고 합니까?</div>`;
				}
			} else if (b.item.colId === 'E23') {
				labelText = '연필';
				showItemNo = '';
			} else if (b.item.colId === 'E24') {
				labelText =
					'제가 하는 말을 끝까지 듣고 따라 해 보십시오. 한 번만 말씀드릴 것이니 잘 듣고 따라 하십시오.';
			}

			const phraseBanner =
				b.item.colId === 'E24'
					? `<div class="phraseBanner">「간장공장공장장」</div>`
					: '';
			const drawBox =
				b.item.colId === 'E28' ? `<div class="drawBox"></div>` : '';

			const centerName = b.item.colId === 'E22' || b.item.colId === 'E23' ? ' nameItem' : '';

			return `${prepend}<div class="qrow${indent}${centerName}">
				<div class="qlabel">${showItemNo}<span class="qtext">${nl(labelText)}</span>${phraseBanner}${drawBox}</div>
				<div class="qscore">${esc(pt)}</div>
			</div>`;
		})
		.join('');
}

/** Page1: 문항 1~15 / Page2: 문항 16~19 + 총점·의견·점수표 */
function itemsForPrintPage(printPage: 1 | 2): F51015Item[] {
	if (printPage === 1) return ASSESSMENT_ITEMS.filter((it) => it.no <= 15);
	return ASSESSMENT_ITEMS.filter((it) => it.no >= 16);
}

function buildPrintBlocks(printPage: 1 | 2): Block[] {
	const items = itemsForPrintPage(printPage);
	const blocks: Block[] = [];
	let lastNo = -1;
	for (const it of items) {
		const showNo = it.no !== lastNo;
		if (showNo && lastNo > 0 && [11, 12, 13, 14, 16].includes(it.no)) {
			blocks.push({ type: 'sep' });
		}
		if (it.hint && showNo) {
			blocks.push({ type: 'hint', no: it.no, text: it.hint });
		}
		blocks.push({ type: 'q', item: it, showNo });
		lastNo = it.no;
	}
	return blocks;
}

function educationMarks(code: string): string {
	return EDUCATION_OPTIONS.map(
		(o) =>
			`<td class="eduCell">${o.code === String(code ?? '').trim() ? '<b>V</b>' : '&nbsp;'}</td>`
	).join('');
}

function cutoffTableHtml(): string {
	const rows = CUTOFF_TABLE.map((r) => {
		const male = r.male.map((n) => `<td>${n}</td>`).join('');
		const female = r.female.map((n) => `<td>${n}</td>`).join('');
		return `<tr>
			<td class="age" rowspan="2">${esc(r.age)}</td>
			<td class="sex">남자</td>${male}
		</tr>
		<tr>
			<td class="sex">여자</td>${female}
		</tr>`;
	}).join('');
	return `<table class="cutoff">
		<thead>
			<tr>
				<th rowspan="2">연령</th>
				<th rowspan="2">성별</th>
				<th colspan="4">교육년수</th>
			</tr>
			<tr>
				<th>0-3년</th><th>4-6년</th><th>7-12년</th><th>≥13년</th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>`;
}

function buildPages(snap: F51015UiSnapshot, member: CognitiveAssessmentPrintMember): string {
	const total =
		calcTotalScore(snap) ||
		(parseInt(String(snap.score || ''), 10) >= 0 ? parseInt(String(snap.score), 10) : 0);
	const totalText = Number.isFinite(total) && total >= 0 ? String(total) : '';
	const opinion = String(snap.opinion || '').trim();
	const edu = String(snap.education || '').trim();

	const page1 = `
<div class="page">
	${infoHeader(snap, member)}
	<div class="secTitle">- 치매 선별용 한국어판 간이정신상태검사<br/>
		<span class="secEn">(Korean version of MMSE for Dementia Screening: MMSE-DS)</span>
	</div>
	<div class="qwrap">${renderBlocks(buildPrintBlocks(1), snap)}</div>
</div>`;

	const page2 = `
<div class="page page2">
	<div class="qwrap">${renderBlocks(buildPrintBlocks(2), snap)}</div>
	<div class="totalLine"><span>총 점</span><span class="totalVal">${esc(totalText)} / 30</span></div>
	<div class="opinion">
		<div class="opinionHead">평가결과에 대한 의견</div>
		<div class="opinionBody">${nl(opinion)}</div>
	</div>
	<div class="refTitle">인지평가(MMSE-DS) 진단검사 점수표</div>
	<table class="edu">
		<tr><th colspan="4">학력</th></tr>
		<tr>
			${EDUCATION_OPTIONS.map((o) => `<th>${esc(o.label)}</th>`).join('')}
		</tr>
		<tr>${educationMarks(edu)}</tr>
	</table>
	${cutoffTableHtml()}
</div>`;

	return page1 + page2;
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
	padding: 10mm 14mm 12mm;
	margin: 0 auto;
	page-break-after: always;
	break-after: page;
	position: relative;
}
.page:last-child { page-break-after: auto; break-after: auto; }
.header {
	display: flex; align-items: flex-start; justify-content: center;
	position: relative; min-height: 18mm; margin-bottom: 3mm;
}
.title {
	margin: 0; padding-top: 2mm;
	font-size: 18pt; font-weight: 700; text-align: center;
	text-decoration: underline; letter-spacing: 0.12em;
}
.approve {
	position: absolute; right: 0; top: 0;
	border-collapse: collapse; width: 38mm; font-size: 9pt;
}
.approve th, .approve td { border: 1px solid #000; text-align: center; padding: 1px; }
.approve th { font-weight: 700; background: #f3f3f3; height: 6mm; }
.approve td.stamp { height: 12mm; }
.info {
	width: 100%; border-collapse: collapse; margin-bottom: 3mm; table-layout: fixed;
}
.info th, .info td {
	border: 1px solid #000; padding: 3px 5px; text-align: center; vertical-align: middle;
}
.info th { background: #f0f0f0; font-weight: 700; width: 16%; white-space: nowrap; }
.info td { width: 17.3%; }
.secTitle {
	font-weight: 700; font-size: 10pt; margin: 2mm 0 3mm; line-height: 1.35;
}
.secEn { font-weight: 400; font-size: 8.5pt; }
.qwrap { width: 100%; }
.qrow {
	display: flex; align-items: flex-start; justify-content: space-between;
	padding: 2.5px 0; min-height: 5mm;
}
.qrow.sub { padding-left: 8mm; }
.qlabel { flex: 1; padding-right: 8px; line-height: 1.35; }
.qno { font-weight: 700; margin-right: 2px; }
.qtext { white-space: pre-wrap; }
.qscore {
	width: 14mm; text-align: right; font-weight: 700; font-size: 11pt;
	flex-shrink: 0; padding-top: 0;
}
.hint {
	padding: 3px 0 2px; line-height: 1.4; font-size: 9pt;
}
.sep {
	border-top: 1px solid #333; margin: 2.5mm 0 1.5mm;
}
.drawBox {
	width: 55mm; height: 28mm; border: 1px solid #000;
	margin: 2mm auto 1mm; display: block;
}
.wordsBanner {
	text-align: center; font-size: 14pt; font-weight: 700;
	letter-spacing: 0.08em; margin: 2mm 0 1mm;
}
.phraseBanner {
	text-align: center; font-size: 12pt; font-weight: 700;
	margin: 2mm 0 1mm;
}
.qrow.nameItem .qtext {
	display: block; text-align: center; font-weight: 700; font-size: 11pt;
}
.totalLine {
	display: flex; justify-content: flex-end; align-items: center; gap: 10mm;
	margin: 4mm 0 3mm; font-weight: 700; font-size: 12pt;
}
.totalVal { min-width: 28mm; text-align: right; }
.opinion {
	border: 1.5px solid #000; margin-bottom: 4mm;
}
.opinionHead {
	border-bottom: 1px solid #000; padding: 4px 8px;
	font-weight: 700; background: #111; color: #fff; font-size: 10.5pt;
}
.opinionBody {
	padding: 8px 10px; min-height: 28mm; line-height: 1.55; white-space: pre-wrap;
}
.refTitle {
	font-weight: 700; font-size: 11pt; text-align: center;
	margin: 2mm 0 3mm; letter-spacing: 0.05em;
}
.edu {
	width: 72%; margin: 0 auto 3mm; border-collapse: collapse; font-size: 9pt;
}
.edu th, .edu td {
	border: 1px solid #000; text-align: center; padding: 3px 4px;
}
.edu th { background: #f5f5f5; font-weight: 700; }
.eduCell { height: 8mm; font-size: 12pt; }
.cutoff {
	width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 1mm;
}
.cutoff th, .cutoff td {
	border: 1px solid #000; text-align: center; padding: 3px 2px;
}
.cutoff th { background: #f0f0f0; font-weight: 700; }
.cutoff .age { font-weight: 600; width: 16%; }
.cutoff .sex { width: 10%; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.page { width: auto; min-height: auto; padding: 6mm 10mm; margin: 0; }
}
@page { size: A4; margin: 8mm; }
`;

export function buildCognitiveAssessmentPrintHtml(
	snap: F51015UiSnapshot,
	member: CognitiveAssessmentPrintMember
): string {
	const name = snap.beneficiary || member.P_NM || '';
	const rqdt = formatYmd(snap.inspectionDate);
	const title = `인지상태 평가${name ? ` - ${name}` : ''}${rqdt ? ` (${rqdt})` : ''}`;
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${buildPages(snap, member)}
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

export function openCognitiveAssessmentPrint(
	snap: F51015UiSnapshot,
	member: CognitiveAssessmentPrintMember
): void {
	const total = calcTotalScore(snap);
	const filled: F51015UiSnapshot = {
		...snap,
		score: snap.score || String(total),
		interpretation: snap.interpretation || interpretScore(total),
	};
	openPrintWindow(buildCognitiveAssessmentPrintHtml(filled, member));
}

export function openCognitiveAssessmentBatchPrint(
	items: Array<{ snap: F51015UiSnapshot; member: CognitiveAssessmentPrintMember }>
): void {
	if (!items.length) {
		alert('출력할 기록이 없습니다.');
		return;
	}
	const first = buildCognitiveAssessmentPrintHtml(items[0].snap, items[0].member);
	const styleMatch = first.match(/<style>([\s\S]*?)<\/style>/i);
	const styles = styleMatch ? styleMatch[1] : '';
	const body = items
		.map(({ snap, member }) => {
			const total = calcTotalScore(snap);
			const filled = {
				...snap,
				score: snap.score || String(total),
				interpretation: snap.interpretation || interpretScore(total),
			};
			const full = buildCognitiveAssessmentPrintHtml(filled, member);
			const m = full.match(/<body>([\s\S]*?)<\/body>/i);
			return m ? m[1].trim() : '';
		})
		.filter(Boolean)
		.join('\n');
	openPrintWindow(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8" /><title>인지상태평가 일괄출력 (${items.length}건)</title><style>${styles}</style></head><body>${body}</body></html>`);
}
