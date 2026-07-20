/**
 * F51014(낙상위험도 측정) 화면 상태 ↔ DB 컬럼 매핑
 * 모달 UI: Huhn 평가 양식 / 저장 컬럼: B01~B08, B80, B81, B90, B99
 */

export type F51014Option = { code: string; label: string };

export type F51014AssessmentField =
	| 'age'
	| 'mentalState'
	| 'bowel'
	| 'fallExperience'
	| 'activity'
	| 'gaitBalance'
	| 'medication'
	| 'medicationGroup';

export type F51014AssessmentSection = {
	field: F51014AssessmentField;
	colId: string;
	category: string;
	options: F51014Option[];
};

/** B01 나이 */
export const B01_OPTIONS: F51014Option[] = [
	{ code: '3', label: '80세 이상' },
	{ code: '2', label: '70 ~ 79세' },
	{ code: '1', label: '60 ~ 69세' },
	{ code: '0', label: '60세 이하' },
];

/** B02 정신상태 */
export const B02_OPTIONS: F51014Option[] = [
	{ code: '4', label: '혼란스러움/방향감각장애' },
	{ code: '2', label: '때때로 혼란스러움/방향감각장애' },
	{ code: '0', label: '문제없음' },
];

/** B03 배변 */
export const B03_OPTIONS: F51014Option[] = [
	{ code: '4', label: '소변, 대변 실금' },
	{ code: '3', label: '조절능력 있지만 도움필요' },
	{ code: '1', label: '유치도뇨관/인공항문' },
	{ code: '0', label: '문제없음' },
];

/** B04 낙상경험 */
export const B04_OPTIONS: F51014Option[] = [
	{ code: '4', label: '이미 세 번 이상 넘어짐' },
	{ code: '2', label: '이미 한 번 또는 두 번 넘어짐' },
	{ code: '0', label: '없음' },
];

/** B05 활동 */
export const B05_OPTIONS: F51014Option[] = [
	{ code: '4', label: '전적으로 도움을 받음' },
	{ code: '3', label: '자리에서 일어나 앉기 도움' },
	{ code: '1', label: '자립/세면대, 화장실이용' },
];

/** B06 걸음걸이 및 균형 */
export const B06_OPTIONS: F51014Option[] = [
	{
		code: '4',
		label: '불규칙/불안정, 서있을 때와 걸을 때 균형을 거의 유지하지 못함',
	},
	{ code: '3', label: '일어서기/걸을 때 기립성빈혈/혈액순환문제' },
	{ code: '2', label: '보행장애/보조도구나 도움으로 걷기' },
	{ code: '0', label: '자립보행' },
];

/** B07 지난7일간 약복용이나 계획된 약물 */
export const B07_OPTIONS: F51014Option[] = [
	{ code: '4', label: '3개 또는 그 이상의 약 복용' },
	{ code: '3', label: '두 가지 약 복용' },
	{ code: '2', label: '한 가지 약 복용' },
	{ code: '0', label: '없음' },
];

/**
 * B08 복용약물(그룹) — F51014 스키마 항목 (모달에는 Huhn 7항목 + 본 항목 선택적)
 * 기본값 0으로 저장. 화면에서는 선택 가능하도록 옵션 제공.
 */
export const B08_OPTIONS: F51014Option[] = [
	{ code: '0', label: 'A:0개, B:0-2개' },
	{ code: '1', label: 'A:1-3개, B:0-2개' },
	{ code: '2', label: 'A:0개, B:3-6개' },
	{ code: '3', label: 'A:1-3개, B:3-6개' },
];

/** Huhn 모달용 섹션 (B01~B07) */
export const ASSESSMENT_SECTIONS: F51014AssessmentSection[] = [
	{ field: 'age', colId: 'B01', category: '나이', options: B01_OPTIONS },
	{ field: 'mentalState', colId: 'B02', category: '정신상태', options: B02_OPTIONS },
	{ field: 'bowel', colId: 'B03', category: '배변', options: B03_OPTIONS },
	{ field: 'fallExperience', colId: 'B04', category: '낙상경험', options: B04_OPTIONS },
	{ field: 'activity', colId: 'B05', category: '활동', options: B05_OPTIONS },
	{ field: 'gaitBalance', colId: 'B06', category: '걸음걸이 및 균형', options: B06_OPTIONS },
	{
		field: 'medication',
		colId: 'B07',
		category: '지난7일간  \n약복용이나 \n계획된 약물',
		options: B07_OPTIONS,
	},
];

export type F51014UiSnapshot = {
	inspectionDate: string;
	beneficiary: string;
	/** B01 */
	age: string;
	/** B02 */
	mentalState: string;
	/** B03 */
	bowel: string;
	/** B04 */
	fallExperience: string;
	/** B05 */
	activity: string;
	/** B06 */
	gaitBalance: string;
	/** B07 */
	medication: string;
	/** B08 */
	medicationGroup: string;
	/** B80 */
	score: string;
	/** B81 */
	riskLevel: string;
	examiner: string;
	examinerEmpno: string;
	/** B90 */
	opinion: string;
	/** B99 */
	inputComplete: boolean;
};

function coerceScalar(v: unknown): string {
	if (v == null) return '';
	if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
	if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) return v.toString('utf8').trim();
	return String(v).replace(/\u0000/g, '').trim();
}

function getRowVal(row: Record<string, unknown>, key: string): unknown {
	if (row[key] != null && row[key] !== '') return row[key];
	const upper = key.toUpperCase();
	const lower = key.toLowerCase();
	if (row[upper] != null && row[upper] !== '') return row[upper];
	if (row[lower] != null && row[lower] !== '') return row[lower];
	const found = Object.keys(row).find((k) => k.toUpperCase() === upper);
	return found != null ? row[found] : undefined;
}

function rowStr(r: Record<string, unknown>, k: string): string {
	return coerceScalar(getRowVal(r, k));
}

function formatYmd(raw: unknown): string {
	const s = coerceScalar(raw);
	if (!s) return '';
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	if (s.includes('T')) return s.split('T')[0];
	return s;
}

function normalizeCode(raw: string, options: F51014Option[]): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (options.some((o) => o.code === s)) return s;
	if (/^\d+$/.test(s)) {
		const n = String(parseInt(s, 10));
		const byNum = options.find((o) => o.code === n);
		if (byNum) return byNum.code;
	}
	const byLabel = options.find((o) => o.label === s || `(${o.code}) ${o.label}` === s);
	return byLabel?.code || '';
}

/** Huhn 점수해석: 낮음(4점이하), 높음(5-10점), 아주높음(11점이상) */
export function interpretScore(total: number): string {
	if (!Number.isFinite(total) || total < 0) return '';
	if (total <= 4) return '낮음';
	if (total <= 10) return '높음';
	return '아주높음';
}

export function buildOpinionSummary(total: number, riskLevel: string): string {
	if (!Number.isFinite(total) || !riskLevel) return '';
	return `낙상위험 평가 ${total}점으로 ${riskLevel}으로 평가됨.`;
}

export function isAutoOpinionSummary(text: string): boolean {
	return /^낙상위험 평가 \d+점으로 .+으로 평가됨\.?$/.test(String(text ?? '').trim());
}

export function calcTotalScore(
	ui: Pick<
		F51014UiSnapshot,
		'age' | 'mentalState' | 'bowel' | 'fallExperience' | 'activity' | 'gaitBalance' | 'medication'
	>,
	opts?: { requireAll?: boolean }
): number {
	const requireAll = opts?.requireAll !== false;
	const nums = [
		ui.age,
		ui.mentalState,
		ui.bowel,
		ui.fallExperience,
		ui.activity,
		ui.gaitBalance,
		ui.medication,
	].map((c) => parseInt(String(c ?? ''), 10));
	if (requireAll) {
		if (nums.some((n) => !Number.isFinite(n))) return 0;
		return nums.reduce((a, b) => a + b, 0);
	}
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) return 0;
	return valid.reduce((a, b) => a + b, 0);
}

export function emptySnapshot(beneficiary = '', inspectionDate = ''): F51014UiSnapshot {
	return {
		inspectionDate,
		beneficiary,
		age: '',
		mentalState: '',
		bowel: '',
		fallExperience: '',
		activity: '',
		gaitBalance: '',
		medication: '',
		medicationGroup: '0',
		score: '',
		riskLevel: '',
		examiner: '',
		examinerEmpno: '',
		opinion: '',
		inputComplete: false,
	};
}

export function hydrateFromF51014Row(row: Record<string, unknown>, beneficiaryName = ''): F51014UiSnapshot {
	const age = normalizeCode(rowStr(row, 'B01'), B01_OPTIONS);
	const mentalState = normalizeCode(rowStr(row, 'B02'), B02_OPTIONS);
	const bowel = normalizeCode(rowStr(row, 'B03'), B03_OPTIONS);
	const fallExperience = normalizeCode(rowStr(row, 'B04'), B04_OPTIONS);
	const activity = normalizeCode(rowStr(row, 'B05'), B05_OPTIONS);
	const gaitBalance = normalizeCode(rowStr(row, 'B06'), B06_OPTIONS);
	const medication = normalizeCode(rowStr(row, 'B07'), B07_OPTIONS);
	const medicationGroup = normalizeCode(rowStr(row, 'B08'), B08_OPTIONS) || '0';

	const scoreRaw = rowStr(row, 'B80');
	const scoreN = parseInt(scoreRaw, 10);
	const calc = calcTotalScore({
		age,
		mentalState,
		bowel,
		fallExperience,
		activity,
		gaitBalance,
		medication,
	});
	const score = Number.isFinite(scoreN) && scoreN >= 0 ? String(scoreN) : calc > 0 ? String(calc) : '';
	const riskLevel = rowStr(row, 'B81') || interpretScore(parseInt(score, 10));

	return {
		inspectionDate: formatYmd(getRowVal(row, 'RQDT')),
		beneficiary: beneficiaryName || '',
		age,
		mentalState,
		bowel,
		fallExperience,
		activity,
		gaitBalance,
		medication,
		medicationGroup,
		score: score === '' ? '' : score,
		riskLevel,
		examiner: rowStr(row, 'RQEMP_NM'),
		examinerEmpno: rowStr(row, 'RQEMP'),
		opinion: rowStr(row, 'B90'),
		inputComplete: rowStr(row, 'B99') === '1',
	};
}

export function buildF51014RowPayload(
	ui: F51014UiSnapshot,
	pnum: string | number,
	rqdt: string
): Record<string, unknown> {
	const total = calcTotalScore(ui);
	return {
		PNUM: pnum,
		RQDT: rqdt,
		RQEMP: ui.examinerEmpno || null,
		B01: ui.age || null,
		B02: ui.mentalState || null,
		B03: ui.bowel || null,
		B04: ui.fallExperience || null,
		B05: ui.activity || null,
		B06: ui.gaitBalance || null,
		B07: ui.medication || null,
		B80: total > 0 ? total : ui.score ? parseInt(ui.score, 10) : null,
		B81: ui.riskLevel || interpretScore(total) || null,
		B90: ui.opinion || null,
	};
}
