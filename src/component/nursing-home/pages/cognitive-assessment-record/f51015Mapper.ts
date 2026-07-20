/**
 * F51015(인지상태평가 / MMSE-DS) 화면 상태 ↔ DB 컬럼 매핑
 * E01~E30: 0=맞음, 1=틀림 / E80 합계(맞음 개수) / E81 해석 / E90 의견 / E91 학력 / E99 입력완료
 */

export type F51015ScoreCode = '0' | '1' | '';

export type F51015Item = {
	colId: string; // E01..E30
	field: string;
	no: number;
	label: string;
	hint?: string;
	page: 1 | 2;
	group?: string;
};

export const EDUCATION_OPTIONS = [
	{ code: '1', label: '무학 ~ 초3' },
	{ code: '2', label: '초4 ~ 초6' },
	{ code: '3', label: '중1 ~ 고3' },
	{ code: '4', label: '대학이상' },
] as const;

/** MMSE-DS 문항 (이미지 1/2, 2/2) */
export const ASSESSMENT_ITEMS: F51015Item[] = [
	{ colId: 'E01', field: 'e01', no: 1, page: 1, label: '올해는 몇 년도 입니까?' },
	{ colId: 'E02', field: 'e02', no: 2, page: 1, label: '지금은 무슨 계절입니까?' },
	{ colId: 'E03', field: 'e03', no: 3, page: 1, label: '오늘은 며칠입니까?' },
	{ colId: 'E04', field: 'e04', no: 4, page: 1, label: '오늘은 무슨 요일입니까?' },
	{ colId: 'E05', field: 'e05', no: 5, page: 1, label: '지금은 몇 월입니까?' },
	{ colId: 'E06', field: 'e06', no: 6, page: 1, label: '우리가 있는 이곳은 무슨 도/특별시/광역시입니까?' },
	{ colId: 'E07', field: 'e07', no: 7, page: 1, label: '여기는 무슨 시/군/구입니까?' },
	{ colId: 'E08', field: 'e08', no: 8, page: 1, label: '여기는 무슨 구/동/읍/면입니까?' },
	{ colId: 'E09', field: 'e09', no: 9, page: 1, label: '우리는 지금 이 건물의 몇 층에 있습니까?' },
	{ colId: 'E10', field: 'e10', no: 10, page: 1, label: '이 장소의 이름이 무엇입니까?' },
	{
		colId: 'E11',
		field: 'e11',
		no: 11,
		page: 1,
		group: '기억등록',
		label: '나무',
		hint: '지금부터 내가 세가지 물건의 이름을 말씀드리겠습니다. 끝까지 다 들으신 다음에 세가지 물건의 이름을 모두 말해 보십시오. 그리고 몇 분 후에는 그 세가지 물건의 이름들을 다시 물어볼 것이니 잘 기억해 두십시오. (나무, 자동차, 모자)',
	},
	{ colId: 'E12', field: 'e12', no: 11, page: 1, group: '기억등록', label: '자동차' },
	{ colId: 'E13', field: 'e13', no: 11, page: 1, group: '기억등록', label: '모자' },
	{
		colId: 'E14',
		field: 'e14',
		no: 12,
		page: 1,
		group: '주의집중및계산',
		label: '100에서 7을 빼면 얼마가 됩니까?',
	},
	{ colId: 'E15', field: 'e15', no: 12, page: 1, group: '주의집중및계산', label: '거기에서 7을 빼면 얼마가 됩니까?' },
	{ colId: 'E16', field: 'e16', no: 12, page: 1, group: '주의집중및계산', label: '거기에서 7을 빼면 얼마가 됩니까?' },
	{ colId: 'E17', field: 'e17', no: 12, page: 1, group: '주의집중및계산', label: '거기에서 7을 빼면 얼마가 됩니까?' },
	{ colId: 'E18', field: 'e18', no: 12, page: 1, group: '주의집중및계산', label: '거기에서 7을 빼면 얼마가 됩니까?' },
	{
		colId: 'E19',
		field: 'e19',
		no: 13,
		page: 1,
		group: '기억회상',
		label: '나무',
		hint: '조금 전에 제가 기억하라고 말씀드렸던 세가지 물건의 이름이 무엇인지 말해 보십시오.',
	},
	{ colId: 'E20', field: 'e20', no: 13, page: 1, group: '기억회상', label: '자동차' },
	{ colId: 'E21', field: 'e21', no: 13, page: 1, group: '기억회상', label: '모자' },
	{
		colId: 'E22',
		field: 'e22',
		no: 14,
		page: 2,
		group: '이름대기',
		label: '(시계를 보여주며) 이것을 무엇이라고 합니까?',
	},
	{
		colId: 'E23',
		field: 'e23',
		no: 14,
		page: 2,
		group: '이름대기',
		label: '(연필을 보여주며) 이것을 무엇이라고 합니까?',
	},
	{
		colId: 'E24',
		field: 'e24',
		no: 15,
		page: 2,
		label: '제가 하는 말을 끝까지 듣고 따라 해 보십시오. 한 번만 말씀드릴 것이니 잘 듣고 따라 하십시오.\n「간장공장공장장」',
	},
	{
		colId: 'E25',
		field: 'e25',
		no: 16,
		page: 2,
		group: '3단계명령',
		label: '오른손으로 받는다',
		hint: '지금부터 제가 말씀드리는 대로 해 보십시오. 한 번만 말씀드릴 것이니 잘 들으시고 그대로 해 보십시오. 제가 종이를 한 장 드릴 것입니다. 그러면 그 종이를 오른손으로 받아, 반으로 접은 다음, 무릎 위에 올려놓으십시오.',
	},
	{ colId: 'E26', field: 'e26', no: 16, page: 2, group: '3단계명령', label: '반으로 접는다' },
	{ colId: 'E27', field: 'e27', no: 16, page: 2, group: '3단계명령', label: '무릎 위에 놓는다' },
	{
		colId: 'E28',
		field: 'e28',
		no: 17,
		page: 2,
		label: '(겹친 오각형 그림을 가리키며) 여기에 오각형이 겹쳐져 있는 그림이 있습니다. 이 그림을 아래 빈 곳에 그대로 그려보십시오.',
	},
	{ colId: 'E29', field: 'e29', no: 18, page: 2, label: '옷은 왜 빨아서 입습니까?' },
	{ colId: 'E30', field: 'e30', no: 19, page: 2, label: "'티끌모아 태산'은 무슨 뜻입니까?" },
];

export const ITEM_FIELDS = ASSESSMENT_ITEMS.map((i) => i.field);

export type F51015UiSnapshot = {
	inspectionDate: string;
	beneficiary: string;
	e01: string;
	e02: string;
	e03: string;
	e04: string;
	e05: string;
	e06: string;
	e07: string;
	e08: string;
	e09: string;
	e10: string;
	e11: string;
	e12: string;
	e13: string;
	e14: string;
	e15: string;
	e16: string;
	e17: string;
	e18: string;
	e19: string;
	e20: string;
	e21: string;
	e22: string;
	e23: string;
	e24: string;
	e25: string;
	e26: string;
	e27: string;
	e28: string;
	e29: string;
	e30: string;
	/** E80 — 맞음(0) 개수 */
	score: string;
	/** E81 */
	interpretation: string;
	examiner: string;
	examinerEmpno: string;
	/** E90 */
	opinion: string;
	/** E91 */
	education: string;
	/** E99 */
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

function normalize01(raw: string): string {
	const s = String(raw ?? '').trim();
	if (s === '0' || s === '1') return s;
	if (/^\d+$/.test(s)) {
		const n = parseInt(s, 10);
		if (n === 0 || n === 1) return String(n);
	}
	return '';
}

/** 맞음(0) 개수 = 총점 (만점 30) */
export function calcTotalScore(ui: Partial<F51015UiSnapshot>, opts?: { requireAll?: boolean }): number {
	const requireAll = opts?.requireAll === true;
	let correct = 0;
	let answered = 0;
	for (const item of ASSESSMENT_ITEMS) {
		const v = normalize01(String((ui as any)[item.field] ?? ''));
		if (v === '') {
			if (requireAll) return 0;
			continue;
		}
		answered += 1;
		if (v === '0') correct += 1;
	}
	if (requireAll && answered < ASSESSMENT_ITEMS.length) return 0;
	return correct;
}

export function interpretScore(total: number): string {
	if (!Number.isFinite(total) || total < 0) return '';
	if (total >= 24) return '정상범위';
	if (total >= 18) return '경도인지저하 의심';
	if (total >= 10) return '중등도인지저하 의심';
	return '고도인지저하 의심';
}

export function buildOpinionSummary(total: number, interpretation: string): string {
	if (!Number.isFinite(total) || !interpretation) return '';
	return `인지상태평가 ${total}/30점으로 ${interpretation}으로 평가됨.`;
}

export function isAutoOpinionSummary(text: string): boolean {
	return /^인지상태평가 \d+\/30점으로 .+으로 평가됨\.?$/.test(String(text ?? '').trim());
}

export function emptySnapshot(beneficiary = '', inspectionDate = ''): F51015UiSnapshot {
	const base: any = {
		inspectionDate,
		beneficiary,
		score: '',
		interpretation: '',
		examiner: '',
		examinerEmpno: '',
		opinion: '',
		education: '',
		inputComplete: false,
	};
	for (const item of ASSESSMENT_ITEMS) base[item.field] = '';
	return base as F51015UiSnapshot;
}

export function hydrateFromF51015Row(row: Record<string, unknown>, beneficiaryName = ''): F51015UiSnapshot {
	const snap = emptySnapshot(beneficiaryName, formatYmd(getRowVal(row, 'RQDT')));
	for (const item of ASSESSMENT_ITEMS) {
		(snap as any)[item.field] = normalize01(rowStr(row, item.colId));
	}
	const scoreRaw = rowStr(row, 'E80');
	const scoreN = parseInt(scoreRaw, 10);
	const calc = calcTotalScore(snap);
	snap.score = Number.isFinite(scoreN) && scoreN >= 0 ? String(scoreN) : calc > 0 ? String(calc) : String(calc);
	snap.interpretation = rowStr(row, 'E81') || interpretScore(parseInt(snap.score, 10) || 0);
	snap.examiner = rowStr(row, 'RQEMP_NM');
	snap.examinerEmpno = rowStr(row, 'RQEMP');
	snap.opinion = rowStr(row, 'E90');
	const edu = rowStr(row, 'E91');
	snap.education = EDUCATION_OPTIONS.some((o) => o.code === edu) ? edu : '';
	snap.inputComplete = rowStr(row, 'E99') === '1';
	return snap;
}

export function buildF51015RowPayload(
	ui: F51015UiSnapshot,
	pnum: string | number,
	rqdt: string
): Record<string, unknown> {
	const total = calcTotalScore(ui);
	const row: Record<string, unknown> = {
		PNUM: pnum,
		RQDT: rqdt,
		RQEMP: ui.examinerEmpno || null,
		E80: total,
		E81: ui.interpretation || interpretScore(total) || null,
		E90: ui.opinion || null,
		E91: ui.education || null,
		E99: ui.inputComplete ? '1' : '0',
	};
	for (const item of ASSESSMENT_ITEMS) {
		const v = normalize01(String((ui as any)[item.field] ?? ''));
		row[item.colId] = v === '' ? null : v;
	}
	return row;
}
