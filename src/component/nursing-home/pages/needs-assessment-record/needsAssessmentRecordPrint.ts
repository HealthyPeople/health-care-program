import { formatCareGradeLabel } from '../../utils/careGrade';
import {
	PHYSICAL_ACTIVITY_ITEMS,
	H01_OPTIONS,
	H02_OPTIONS,
	H03_OPTIONS,
	I01_OPTIONS,
	I02_OPTIONS,
	I03_OPTIONS,
	I04_OPTIONS,
	I05_OPTIONS,
	J01_OPTIONS,
	J01_01_OPTIONS,
	J02_OPTIONS,
	J02_02_OPTIONS,
	J02_04_OPTIONS,
	J03_OPTIONS,
	K01_OPTIONS,
	type F51012UiSnapshot,
} from './f51012Mapper';

export type NeedsAssessmentPrintMember = {
	P_NM?: string | null;
	P_SEX?: string | null;
	P_GRD?: string | null;
	P_BRDT?: string | null;
	P_YYNO?: string | null;
	P_NO?: string | null;
};

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

function sexLabel(sex: unknown): string {
	const s = String(sex ?? '').trim();
	if (s === '1') return '남';
	if (s === '2') return '여';
	return s || '';
}

function calcAge(birthDate: unknown): string {
	const ymd = formatYmd(birthDate);
	if (!ymd || ymd.length < 4) return '';
	const year = parseInt(ymd.slice(0, 4), 10);
	if (!Number.isFinite(year)) return '';
	return String(new Date().getFullYear() - year);
}

function nl(text: string): string {
	return esc(text).replace(/\r\n|\n|\r/g, '<br/>');
}

function mark(on: boolean): string {
	return on ? 'V' : '';
}

function optionMarks(code: string, options: { code: string; label: string }[]): string {
	return options
		.map((o) => `<span class="opt">${mark(code === o.code) ? '<b>V</b> ' : ''}${esc(o.label)}</span>`)
		.join('&nbsp;&nbsp;');
}

function labelOf(code: string, options: { code: string; label: string }[]): string {
	return options.find((o) => o.code === code)?.label || '';
}

const DISEASE_ROWS: { category: string; diseases: string[] }[] = [
	{ category: '내분.대사', diseases: ['당뇨', '갑상선질환', '탈수', '영양상태이상', '만성간염', '자기면역질환', '빈혈', '기타'] },
	{ category: '소화기계', diseases: ['위염', '위궤양', '십이지궤양', '변비', '간경변증', '기타'] },
	{ category: '순환기계', diseases: ['고혈압', '저혈압', '협심증', '심근경색증', '뇌혈관질환', '기타'] },
	{ category: '근골격계', diseases: ['관절염', '요통,좌골통', '기타 척추질환', '골다공증', '기타'] },
	{ category: '신경계', diseases: ['치매', '뇌경색', '파킨슨병', '두통', '두통외 통증', '기타'] },
	{ category: '정신.행동', diseases: ['신경증', '우울증', '수면장애', '기타'] },
	{ category: '호흡기계', diseases: ['폐결핵', '만성기관지염', '호흡곤란', '기타'] },
	{ category: '눈.귀질환', diseases: ['시각장애', '난청', '기타'] },
	{ category: '비뇨.생식', diseases: ['전립선비대', '요실금', '만성방광염', '기타'] },
	{ category: '만성신장', diseases: ['만성신부전증', '기타'] },
];

const REHAB_GRID: { label: string; items: string[] }[] = [
	{ label: '우측상지', items: ['어깨관절(우)', '손목 및 수지관절(우)', '무릎관절(우)'] },
	{ label: '좌측상지', items: ['어깨관절(좌)', '손목 및 수지관절(좌)', '무릎관절(좌)'] },
	{ label: '우측하지', items: ['팔꿈치관절(우)', '고관절(우)', '발목관절(우)'] },
	{ label: '좌측하지', items: ['팔꿈치관절(좌)', '고관절(좌)', '발목관절(좌)'] },
];

const NURSING_ITEMS = [
	'기관지 절개관 간호',
	'흡인',
	'산소요법',
	'욕창간호',
	'경관영양',
	'통증간호',
	'장루간호',
	'도뇨관리',
	'투석간호',
	'당뇨발간호',
	'상처간호',
];

const COG_ITEMS = [
	'지남력',
	'기억력',
	'주의집중 및 계산',
	'언어적기능',
	'판단력',
	'편집증과 망상',
	'환각',
	'배회',
	'반복적인 활동',
	'부적절한 행동',
	'언어폭팔',
	'신체적 공격 또는 폭력행위',
	'우울',
	'일반적인 불안',
	'혼자 남겨짐에 대한 공포',
];

function pageFooter(n: number): string {
	return `<div class="footer">- ${n} -</div>`;
}

function sectionTitle(text: string, note = '※ 표기 : □에 V표'): string {
	return `<div class="secHead"><span>${esc(text)}</span><span class="note">${esc(note)}</span></div>`;
}

export function buildNeedsAssessmentPrintHtml(
	snap: F51012UiSnapshot,
	member: NeedsAssessmentPrintMember
): string {
	const name = snap.formData.beneficiary || member.P_NM || '';
	const rqdt = formatYmd(snap.formData.creationDate);
	const creator = snap.formData.creator || '';
	const height = snap.formData.height || '0.0';
	const weight = snap.formData.weight || '0.0';
	const birth = formatYmd(member.P_BRDT);
	const sex = sexLabel(member.P_SEX);
	const age = calcAge(member.P_BRDT);
	const grade = formatCareGradeLabel(member.P_GRD, '');
	const yyno = String(member.P_YYNO ?? '').trim();
	const recog = yyno ? `${yyno}${grade ? ` / ${grade}` : ''}` : grade;

	const actMap = new Map(snap.activities.map((a) => [a.activity, a.value]));
	const actCols: string[][] = [[], [], []];
	PHYSICAL_ACTIVITY_ITEMS.forEach((item, i) => {
		actCols[i % 3].push(
			`<tr><td class="item">${esc(item.label)}</td><td class="chk">${esc(actMap.get(item.label) || '')}</td></tr>`
		);
	});

	const diseaseRowsHtml = DISEASE_ROWS.map((row) => {
		const diseases = row.diseases
			.map((d) => {
				const key = `${row.category}-${d}`;
				const on = !!(snap.disease1Data[key] || snap.disease2Data[key]);
				return `<span class="opt">${on ? '<b>V</b> ' : ''}${esc(d)}</span>`;
			})
			.join('&nbsp;&nbsp;');
		return `<tr><td class="cat">${esc(row.category)}</td><td>${diseases}</td></tr>`;
	}).join('');

	const rehabHtml = REHAB_GRID.map((col) => {
		const head = `<div class="rehabItem"><span class="chkBox">${mark(!!snap.rehabilitationData[col.label])}</span>${esc(col.label)}</div>`;
		const items = col.items
			.map(
				(it) =>
					`<div class="rehabItem sub"><span class="chkBox">${mark(!!snap.rehabilitationData[it])}</span>${esc(it)}</div>`
			)
			.join('');
		return `<td class="rehabCol">${head}${items}</td>`;
	}).join('');

	const nursingHtml = NURSING_ITEMS.map(
		(it) =>
			`<div class="nurseItem"><span class="chkBox">${mark(!!snap.nursingData[it])}</span>${esc(it)}</div>`
	).join('');

	const cogHtml = COG_ITEMS.map(
		(it, i) =>
			`<tr><td class="num">${i + 1}</td><td>${esc(it)}</td><td class="chk">${mark(!!snap.cognitionData[it])}</td></tr>`
	).join('');

	const j01 = snap.familyEnvironmentData.maritalStatus;
	const j0101 = snap.familyEnvironmentData.spouseSurvivalStatus;
	const j02 = snap.familyEnvironmentData.primaryCaregiver;
	const j0202 = snap.familyEnvironmentData.primaryCaregiverRelationship;
	const j0204 = snap.familyEnvironmentData.primaryCaregiverEconomicStatus;
	const j03 = snap.familyEnvironmentData.cohabitant;
	const k01 = snap.resourceUtilizationData.religion;
	const k01Label = labelOf(k01, K01_OPTIONS);

	const page1 = `
<div class="page">
	<div class="topMeta">
		<table class="metaBox">
			<tr><th>작성일</th><td>${esc(rqdt)}</td></tr>
			<tr><th>작성자</th><td>${esc(creator)}</td></tr>
		</table>
	</div>
	<h1 class="title">욕구사정 기록지</h1>
	<table class="info">
		<tr>
			<th>수급자성명</th><td>${esc(name)}</td>
			<th>키</th><td>${esc(height)}</td>
			<th>생년월일</th><td>${esc(birth)}</td>
		</tr>
		<tr>
			<th>인정번호/등급</th><td>${esc(recog)}</td>
			<th>체중</th><td>${esc(weight)}</td>
			<th>성별/연령</th><td>${esc(sex)}${age ? ` / ${esc(age)}` : ''}</td>
		</tr>
	</table>

	${sectionTitle('1. 신체상태(일상생활동작 수행능력)', '※ 표기 : X 완전 도움, △ 부분 도움, O 완전 자립')}
	<table class="adlWrap"><tr>
		<td><table class="inner"><tr><th>항목</th><th>확인</th></tr>${actCols[0].join('')}</table></td>
		<td><table class="inner"><tr><th>항목</th><th>확인</th></tr>${actCols[1].join('')}</table></td>
		<td><table class="inner"><tr><th>항목</th><th>확인</th></tr>${actCols[2].join('')}</table></td>
	</tr></table>
	<table class="block">
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.formData.judgmentBasis)}</td></tr>
	</table>

	${sectionTitle('2. 질병상태')}
	<table class="block">
		${diseaseRowsHtml}
		<tr><th>과거병력</th><td>${esc(snap.diseaseFormData.pastMedicalHistory)}</td></tr>
		<tr><th>현 진단명</th><td>${esc(snap.diseaseFormData.currentDiagnosis)}</td></tr>
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.diseaseFormData.judgmentBasis)}</td></tr>
	</table>
	${pageFooter(1)}
</div>`;

	const page2 = `
<div class="page">
	${sectionTitle('3. 재활상태')}
	<table class="block rehabTable"><tr>${rehabHtml}</tr></table>
	<table class="block">
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.rehabilitationJudgmentBasis)}</td></tr>
	</table>

	${sectionTitle('4. 간호처치 상태')}
	<div class="nurseGrid">${nursingHtml}</div>
	<table class="block">
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.nursingJudgmentBasis)}</td></tr>
	</table>

	${sectionTitle('5. 인지상태', '※ 표기 : □에 V표')}
	<p class="subNote">(인지기능저하, 정신상태, 감정, 문제행동 등)</p>
	<table class="block cog">
		<tr><th style="width:36px">No</th><th>구분</th><th style="width:48px">확인</th></tr>
		${cogHtml}
		<tr><th class="basis">판단근거</th><td colspan="2" class="basisText">${nl(snap.cognitionJudgmentBasis)}</td></tr>
	</table>
	${pageFooter(2)}
</div>`;

	const page3 = `
<div class="page">
	${sectionTitle('6. 의사소통')}
	<table class="block">
		<tr><th>청취능력</th><td>${optionMarks(snap.communicationData.listeningAbility, H01_OPTIONS)}</td></tr>
		<tr><th>의사소통</th><td>${optionMarks(snap.communicationData.communication, H02_OPTIONS)}</td></tr>
		<tr><th>발음능력</th><td>${optionMarks(snap.communicationData.pronunciationAbility, H03_OPTIONS)}</td></tr>
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.communicationData.judgmentBasis)}</td></tr>
	</table>

	${sectionTitle('7. 영양상태')}
	<table class="block">
		<tr><th>치아상태</th><td>${optionMarks(snap.nutritionData.dentalCondition, I01_OPTIONS)}</td></tr>
		<tr><th>식사 시 문제점</th><td>${optionMarks(snap.nutritionData.eatingProblems, I02_OPTIONS)}</td></tr>
		<tr><th>식사형태</th><td>${optionMarks(snap.nutritionData.eatingStatus, I03_OPTIONS)}</td></tr>
		<tr><th>도구사용</th><td>${optionMarks(snap.nutritionData.toolUsage, I04_OPTIONS)}</td></tr>
		<tr><th>배설양상</th><td>${optionMarks(snap.nutritionData.excretionPattern, I05_OPTIONS)}</td></tr>
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.nutritionData.judgmentBasis)}</td></tr>
	</table>

	${sectionTitle('8. 가족 및 환경 상태')}
	<table class="block">
		<tr><th>결혼여부</th><td>${optionMarks(j01, J01_OPTIONS)}</td></tr>
		<tr><th>배우자 생존여부</th><td>${optionMarks(j0101, J01_01_OPTIONS)}</td></tr>
		<tr><th>자녀수</th><td>${esc(snap.familyEnvironmentData.numberOfChildren)}${snap.familyEnvironmentData.numberOfChildren ? ' 명' : ''}</td></tr>
		<tr><th>주수발자</th><td>${optionMarks(j02, J02_OPTIONS)}</td></tr>
		<tr><th>주수발자 연령</th><td>${esc(snap.familyEnvironmentData.primaryCaregiverAge)}${snap.familyEnvironmentData.primaryCaregiverAge ? ' 세' : ''}</td></tr>
		<tr><th>주수발자 관계</th><td>${optionMarks(j0202, J02_02_OPTIONS)}${snap.familyEnvironmentData.otherRelationship ? ` (기타: ${esc(snap.familyEnvironmentData.otherRelationship)})` : ''}</td></tr>
		<tr><th>주수발자 경제상태</th><td>${optionMarks(j0204, J02_04_OPTIONS)}</td></tr>
		<tr><th>동거인</th><td>${optionMarks(j03, J03_OPTIONS)}</td></tr>
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.familyEnvironmentData.judgmentBasis)}</td></tr>
	</table>
	${pageFooter(3)}
</div>`;

	const mealOn = !!snap.resourceUtilizationData.communityServices['급식 및 도시락배달'];
	const hairOn = !!snap.resourceUtilizationData.communityServices['이미용'];
	const houseOn = !!snap.resourceUtilizationData.housingImprovementProject;

	const page4 = `
<div class="page">
	${sectionTitle('9. 자원이용 욕구', '※ 표기 : □에 V표 ___에 기재')}
	<table class="block">
		<tr><th>종교</th><td>${optionMarks(k01, K01_OPTIONS)}${k01 === '4' && snap.resourceUtilizationData.religionOther ? ` : ${esc(snap.resourceUtilizationData.religionOther)}` : k01Label === '기타' && snap.resourceUtilizationData.religionOther ? ` : ${esc(snap.resourceUtilizationData.religionOther)}` : ''}</td></tr>
		<tr><th>주이용의료기관</th><td>${esc(snap.resourceUtilizationData.primaryMedicalInstitution)}&nbsp;&nbsp;전화번호: ${esc(snap.resourceUtilizationData.phoneNumber)}</td></tr>
		<tr><th>지역사회</th><td>
			<span class="opt">${mealOn ? '<b>V</b> ' : ''}급식 및 도시락배달</span>&nbsp;&nbsp;
			<span class="opt">${hairOn ? '<b>V</b> ' : ''}이미용</span>&nbsp;&nbsp;
			<span class="opt">${houseOn ? '<b>V</b> ' : ''}주거개선사업</span>&nbsp;&nbsp;
			기타: ${esc(snap.resourceUtilizationData.other)}
		</td></tr>
		<tr><th class="basis">판단근거</th><td class="basisText">${nl(snap.resourceUtilizationData.judgmentBasis)}</td></tr>
	</table>

	${sectionTitle('10. 수급자 및 보호자 개별 욕구', '※ 표기 : □에 V표')}
	<table class="block needs3">
		<tr>
			<td class="center"><div>약물투약요구</div><div class="chkBig">${mark(!!snap.individualNeedsData.medicationAdministrationRequest)}</div></td>
			<td class="center"><div>병원동행</div><div class="chkBig">${mark(!!snap.individualNeedsData.hospitalAccompaniment)}</div></td>
			<td class="center"><div>외출동행(은행등)</div><div class="chkBig">${mark(!!snap.individualNeedsData.outingAccompaniment)}</div></td>
		</tr>
		<tr><td colspan="3" class="basisText tall">${nl(snap.individualNeedsData.notes)}</td></tr>
	</table>

	${sectionTitle('11. 총평', '※ 표기 : 서술형 작성')}
	<table class="block">
		<tr><td class="basisText overall">${nl(snap.overallAssessmentData.content)}</td></tr>
	</table>
	${pageFooter(4)}
</div>`;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>욕구사정 기록지 - ${esc(name)} ${esc(rqdt)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
	font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
	font-size: 9.5pt;
	color: #000;
	background: #fff;
	line-height: 1.35;
}
@page { size: A4 portrait; margin: 10mm 8mm; }
.page { page-break-after: always; position: relative; min-height: 260mm; padding-bottom: 12mm; }
.record:last-child .page:last-child { page-break-after: auto; }
.title { text-align: center; font-size: 18pt; font-weight: 700; margin: 4mm 0 3mm; letter-spacing: 2px; }
.topMeta { display: flex; justify-content: flex-end; }
.metaBox { border-collapse: collapse; font-size: 9pt; }
.metaBox th, .metaBox td { border: 1px solid #000; padding: 2px 6px; }
.metaBox th { background: #f3f3f3; width: 48px; text-align: center; }
.metaBox td { min-width: 72px; }
table.info, table.block, table.inner, table.adlWrap, table.rehabTable {
	width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 2.5mm;
}
table.info th, table.info td,
table.block th, table.block td,
table.inner th, table.inner td {
	border: 1px solid #000; padding: 3px 5px; vertical-align: middle; word-break: break-word;
}
table.info th, table.block th, table.inner th {
	background: #f5f5f5; font-weight: 700; text-align: center; width: 22%;
}
table.inner th { width: auto; }
table.inner td.item { width: 78%; }
table.inner td.chk, .chk { text-align: center; font-weight: 700; width: 22%; }
table.adlWrap > tbody > tr > td { border: none; padding: 0 1px; vertical-align: top; width: 33.33%; }
.secHead {
	display: flex; justify-content: space-between; align-items: baseline;
	font-weight: 700; font-size: 11pt; margin: 3mm 0 1.5mm;
}
.secHead .note { font-size: 8pt; font-weight: 400; }
.subNote { font-size: 8.5pt; margin: -1mm 0 1.5mm; }
.basis { width: 18% !important; }
.basisText { vertical-align: top !important; white-space: normal; min-height: 18mm; }
.basisText.tall { min-height: 28mm; }
.basisText.overall { min-height: 90mm; }
.cat { width: 18%; text-align: center; font-weight: 700; background: #fafafa; }
.opt { white-space: nowrap; display: inline-block; margin: 1px 0; }
.rehabTable td.rehabCol { border: 1px solid #000; vertical-align: top; padding: 4px 6px; width: 25%; }
.rehabItem { margin: 2px 0; }
.rehabItem.sub { padding-left: 4px; }
.chkBox {
	display: inline-block; width: 14px; text-align: center; font-weight: 700; margin-right: 3px;
}
.nurseGrid {
	display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px 8px;
	border: 1px solid #000; padding: 5px 8px; margin-bottom: 2.5mm;
}
.nurseItem { white-space: nowrap; }
table.cog .num { width: 36px; text-align: center; }
.needs3 td.center { text-align: center; padding: 6px; }
.chkBig { margin-top: 4px; font-weight: 700; font-size: 12pt; min-height: 16px; }
.footer {
	position: absolute; left: 0; right: 0; bottom: 2mm;
	text-align: center; font-size: 10pt;
}
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
<div class="record">
${page1}
${page2}
${page3}
${page4}
</div>
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

export function openNeedsAssessmentPrint(
	snap: F51012UiSnapshot,
	member: NeedsAssessmentPrintMember
): void {
	openPrintWindow(buildNeedsAssessmentPrintHtml(snap, member));
}

/** 여러 건을 한 번에 인쇄 (각 기록 4페이지) */
export function openNeedsAssessmentBatchPrint(
	items: Array<{ snap: F51012UiSnapshot; member: NeedsAssessmentPrintMember }>
): void {
	if (!items.length) {
		alert('출력할 기록이 없습니다.');
		return;
	}
	const firstHtml = buildNeedsAssessmentPrintHtml(items[0].snap, items[0].member);
	const styleMatch = firstHtml.match(/<style>([\s\S]*?)<\/style>/i);
	const styles = styleMatch ? styleMatch[1] : '';
	const recordsHtml = items
		.map(({ snap, member }) => {
			const full = buildNeedsAssessmentPrintHtml(snap, member);
			const bodyMatch = full.match(/<body>([\s\S]*?)<\/body>/i);
			return bodyMatch ? bodyMatch[1].trim() : '';
		})
		.filter(Boolean)
		.join('\n');
	const title = `욕구사정 기록지 일괄출력 (${items.length}건)`;
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
