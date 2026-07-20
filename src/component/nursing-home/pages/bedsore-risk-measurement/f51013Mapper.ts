/**
 * F51013(욕창위험도 측정) 화면 상태 ↔ DB 컬럼 매핑
 */

export type F51013Option = { code: string; label: string; description?: string };

export type F51013AssessmentField =
	| 'sensoryPerception'
	| 'moisture'
	| 'activity'
	| 'mobility'
	| 'nutritionalStatus'
	| 'frictionShear';

export type F51013AssessmentSection = {
	field: F51013AssessmentField;
	colId: string;
	category: string;
	options: F51013Option[];
	page: 1 | 2;
};

/** A01 감각인지도 */
export const A01_OPTIONS: F51013Option[] = [
	{
		code: '1',
		label: '감각 완전 제한됨',
		description:
			'의식수준이 떨어지거나 진정/안정제 복용/투여 등으로 통증 자극에 반응이 없다.\n 통증자극에 대해 신음하거나 주먹을 쥔다거나 할 수 없음) \n신체 대부분에서 통증을 느끼지 못한다.',
	},
	{
		code: '2',
		label: '감각 매우 제한됨',
		description:
			'통증자극에만 반응(신음하거나 불안정한 양상으로 통증이 있음을 나타냄) \n 또는 신체의 1/2이상에 통증이나 불편감을 느끼지 못한다.',
	},
	{
		code: '3',
		label: '감각 약간 제한됨',
		description:
			'말로 지시하면 반응하지만, 체위변경을 해달라고 하거나 불편하다고 항상 말할 수 있는 것은 아니다. 또는 6-2 사지에 통증이나 불편감을 느끼지 못한다.',
	},
	{
		code: '4',
		label: '감각 손상 없음',
		description: '말로 지시하면 반응을 보이며 통증이나 불편감을 느끼고 말로 표현 할 수 있다.',
	},
];

/** A02 습기 */
export const A02_OPTIONS: F51013Option[] = [
	{ code: '1', label: '항상 젖어 있음', description: '피부가 땀, 소변으로 항상 축축하다.' },
	{
		code: '2',
		label: '자주 젖어 있음',
		description: '늘 축축한 것은 아니지만 자주 축축해져 8시간에 한번은 린넨을 갈아주어야 한다.',
	},
	{
		code: '3',
		label: '가끔 젖어 있음',
		description: '가끔 축축하다. 하루에 한번 정도 린넨 교환이 필요하다.',
	},
	{
		code: '4',
		label: '거의 젖지 않음',
		description: '피부는 보통 건조하며 린넨은 평상시대로만 교환해 주면 된다.',
	},
];

/** A03 활동성 */
export const A03_OPTIONS: F51013Option[] = [
	{ code: '1', label: '항상 침대에만 \n누워 있음', description: '항상 침대에만 누워 있는 질환이다.' },
	{
		code: '2',
		label: '의자에 앉아 있을 수',
		description:
			'걸을 수 없거나 걷는 능력이 상당히 제한되어 있다. \n 체중 부하를 할 수 없어 의자나 휠체어로 이동시 도움을 필요로 한다.',
	},
	{
		code: '3',
		label: '가끔 걸을 수 있음',
		description:
			'낮 동안에 도움을 받거나 도움 없이 매우 짧은 거리를 걸을 수 있다. \n 그러나 대부분의 시간은 침상이나 의자에서 보낸다.',
	},
	{
		code: '4',
		label: '자주 걸을 수 있음',
		description: '적어도 하루에 두 번 방밖을 걷고, 방안은 적어도 2시간 마다 걷는다.',
	},
];

/** A04 움직임 */
export const A04_OPTIONS: F51013Option[] = [
	{
		code: '1',
		label: '완전히 못 움직임',
		description: '도움 없이는 신체나 사지를 전혀 움직이지 못한다.',
	},
	{
		code: '2',
		label: '매우 제한됨',
		description: '신체나 사지의 체위를 가끔 조금 변경시킬 수 있지만 자주하거나 많이 변경시키지 못한다.',
	},
	{
		code: '3',
		label: '약간 제한됨',
		description: '혼자서 신체나 사지의 체위를 조금이기는 하지만 자주 변경시킨다.',
	},
	{ code: '4', label: '제한 없음', description: '도움 없이도 체위를 자주 변경시킨다.' },
];

/** A05 영양상태 */
export const A05_OPTIONS: F51013Option[] = [
	{
		code: '1',
		label: '매우 나쁨',
		description:
			'제공된 음식의 1/3 이하를 섭취한다. \n 단백질(고기나 유제품)을 하루에 2회 섭취량 이하 섭취한다. \n 수분을 잘 섭취안함. \n 유동성 영양보충액도 섭취하지 않음. \n또는 5일 이상 동안 금식상태이거나 유동식으로 유지한다.',
	},
	{
		code: '2',
		label: '부족함',
		description:
			'제공된 음식의 1/2를 먹는다. 단백질(고기나 유제품)은 하루에 약 3회 섭취량을 먹는다. \n가끔 영양보충식이를 섭취한다. \n또는 유동식이나 위관영양을 적정량 미만으로 투여 받는다.',
	},
	{
		code: '3',
		label: '적당함',
		description:
			'식사의 반 이상을 먹는다. 단백질(고기나 유제품)을 하루에 4회 섭취량을 섭취한다. \n가끔 식사를 거부하지만 보통 영양보충식이는 섭취한다. \n또는 위관영양이나 TPN으로 대부분의 영양요구량이 충족된다.',
	},
	{
		code: '4',
		label: '우수함',
		description:
			'대부분의 식사를 섭취하며 절대 거절하는 일이 없다. \n단백질(고기나 유제품)을 하루에 4회 섭취량 이상 섭취하며 가끔 식간에도 먹는다. \n영양보충식이는 필요로 되지 않는다.',
	},
];

/** A06 마찰력과 응전력 */
export const A06_OPTIONS: F51013Option[] = [
	{
		code: '1',
		label: '문제 있음',
		description:
			'움직이는데 중정도 이상의 많은 도움을 필요로 한다. \n린넨으로 끌어당기지 않고 완전히 들어 올리는 것은 불가능하다. \n자주 침대나 의자에서 미끄러져 내려가 다시 제 위치로 옮기는데 많은 도움이 필요로 된다. \n관절구축이나 강직, 움직임 등으로 항상 마찰이 생긴다.',
	},
	{
		code: '2',
		label: '잠정적으로 \n문제 있음',
		description:
			'자유로이 움직이나 약간의 도움을 필요로 한다. \n움직이는 동안 의자억제대나 린넨 또는 다른 장비에 의해 마찰이 생길 수 있다. \n의자나 침대에서 대부분 좋은 체위를 유지하고 있지만 가끔은 미끄러져 내려온다.',
	},
	{
		code: '3',
		label: '문제없음',
		description:
			'침대나 의자에서 자유로이 움직이며 움직일 때 스스로 자신을 들어 올릴 수 있을 정도로 충분한 근력이 있다. \n침대나 의자에 누워 있을 때 항상 좋은 체위를 유지한다.',
	},
];

/** 평가 모달용 섹션 (페이지 1: A01~A04, 페이지 2: A05~A06) */
export const ASSESSMENT_SECTIONS: F51013AssessmentSection[] = [
	{ field: 'sensoryPerception', colId: 'A01', category: '감각 인지 정도', options: A01_OPTIONS, page: 1 },
	{ field: 'moisture', colId: 'A02', category: '습기 여부', options: A02_OPTIONS, page: 1 },
	{ field: 'activity', colId: 'A03', category: '활동 상태', options: A03_OPTIONS, page: 1 },
	{ field: 'mobility', colId: 'A04', category: '움직임', options: A04_OPTIONS, page: 1 },
	{ field: 'nutritionalStatus', colId: 'A05', category: '영양 상태', options: A05_OPTIONS, page: 2 },
	{ field: 'frictionShear', colId: 'A06', category: '마찰력과 응전력', options: A06_OPTIONS, page: 2 },
];

export type F51013UiSnapshot = {
	/** RQDT */
	inspectionDate: string;
	beneficiary: string;
	/** A01 */
	sensoryPerception: string;
	/** A02 */
	moisture: string;
	/** A03 */
	activity: string;
	/** A04 */
	mobility: string;
	/** A05 */
	nutritionalStatus: string;
	/** A06 */
	frictionShear: string;
	/** A80 */
	score: string;
	/** A81 */
	interpretation: string;
	/** 화면 표시용 검사자명 (F01010.EMPNM) */
	examiner: string;
	/** RQEMP = F01010.EMPNO */
	examinerEmpno: string;
	/** A90 */
	opinion: string;
	/** A99 */
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

function normalizeCode(raw: string, options: F51013Option[]): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (options.some((o) => o.code === s)) return s;
	if (/^\d+$/.test(s)) {
		const n = String(parseInt(s, 10));
		const byNum = options.find((o) => o.code === n);
		if (byNum) return byNum.code;
	}
	const byLabel = options.find((o) => o.label === s || `${o.code}.${o.label}` === s);
	return byLabel?.code || '';
}

/** Braden(2001) 합계점수 → 해석 (A81) */
export function interpretScore(total: number): string {
	if (!Number.isFinite(total) || total <= 0) return '';
	if (total >= 19) return '위험 없음';
	if (total >= 15) return '약간의 위험 있음';
	if (total >= 13) return '중간 정도의 위험 있음';
	if (total >= 10) return '위험이 높음';
	return '위험이 매우 높음';
}

export function buildOpinionSummary(total: number, interpretation: string): string {
	if (!total || !interpretation) return '';
	// 예: 욕창위험 평가 22점으로 위험없음으로 평가됨.
	const interp = String(interpretation).replace(/\s+/g, '');
	return `욕창위험 평가 ${total}점으로 ${interp}으로 평가됨.`;
}

export function isAutoOpinionSummary(text: string): boolean {
	return /^욕창위험 평가 \d+점으로 .+으로 평가됨\.?$/.test(String(text ?? '').trim());
}

/** 신규 평가 모달 기본값 (스펙 기본: A01~A05=4, A06=3) */
export function defaultAssessmentCodes(): Pick<
	F51013UiSnapshot,
	F51013AssessmentField
> {
	return {
		sensoryPerception: '4',
		moisture: '4',
		activity: '4',
		mobility: '4',
		nutritionalStatus: '4',
		frictionShear: '3',
	};
}

export function calcTotalScore(
	ui: Pick<
		F51013UiSnapshot,
		'sensoryPerception' | 'moisture' | 'activity' | 'mobility' | 'nutritionalStatus' | 'frictionShear'
	>,
	opts?: { requireAll?: boolean }
): number {
	const requireAll = opts?.requireAll !== false;
	const nums = [
		ui.sensoryPerception,
		ui.moisture,
		ui.activity,
		ui.mobility,
		ui.nutritionalStatus,
		ui.frictionShear,
	].map((c) => parseInt(String(c || ''), 10));
	if (requireAll) {
		if (nums.some((n) => !Number.isFinite(n))) return 0;
		return nums.reduce((a, b) => a + b, 0);
	}
	const valid = nums.filter((n) => Number.isFinite(n));
	if (valid.length === 0) return 0;
	return valid.reduce((a, b) => a + b, 0);
}

export function emptySnapshot(beneficiary = '', inspectionDate = ''): F51013UiSnapshot {
	return {
		inspectionDate,
		beneficiary,
		sensoryPerception: '',
		moisture: '',
		activity: '',
		mobility: '',
		nutritionalStatus: '',
		frictionShear: '',
		score: '',
		interpretation: '',
		examiner: '',
		examinerEmpno: '',
		opinion: '',
		inputComplete: false,
	};
}

export function hydrateFromF51013Row(row: Record<string, unknown>, beneficiaryName = ''): F51013UiSnapshot {
	const a01 = normalizeCode(rowStr(row, 'A01'), A01_OPTIONS);
	const a02 = normalizeCode(rowStr(row, 'A02'), A02_OPTIONS);
	const a03 = normalizeCode(rowStr(row, 'A03'), A03_OPTIONS);
	const a04 = normalizeCode(rowStr(row, 'A04'), A04_OPTIONS);
	const a05 = normalizeCode(rowStr(row, 'A05'), A05_OPTIONS);
	const a06 = normalizeCode(rowStr(row, 'A06'), A06_OPTIONS);
	const scoreRaw = rowStr(row, 'A80');
	const scoreN = parseInt(scoreRaw, 10);
	const score =
		Number.isFinite(scoreN) && scoreN > 0
			? String(scoreN)
			: String(
					calcTotalScore({
						sensoryPerception: a01,
						moisture: a02,
						activity: a03,
						mobility: a04,
						nutritionalStatus: a05,
						frictionShear: a06,
					}) || ''
				);
	const interpretation = rowStr(row, 'A81') || interpretScore(parseInt(score, 10));

	return {
		inspectionDate: formatYmd(getRowVal(row, 'RQDT')),
		beneficiary: beneficiaryName || '',
		sensoryPerception: a01,
		moisture: a02,
		activity: a03,
		mobility: a04,
		nutritionalStatus: a05,
		frictionShear: a06,
		score: score === '0' ? '' : score,
		interpretation,
		examiner: rowStr(row, 'RQEMP_NM'),
		examinerEmpno: rowStr(row, 'RQEMP'),
		opinion: rowStr(row, 'A90'),
		inputComplete: rowStr(row, 'A99') === '1',
	};
}

/** 화면 상태 → F51013 컬럼 객체 (ANCD 제외, PNUM/RQDT는 호출측에서 넣음) */
export function buildF51013RowPayload(
	ui: F51013UiSnapshot,
	pnum: string | number,
	rqdt: string
): Record<string, unknown> {
	const total = calcTotalScore(ui);
	return {
		PNUM: String(pnum ?? '').trim(),
		RQDT: rqdt,
		RQEMP: ui.examinerEmpno ? parseInt(String(ui.examinerEmpno), 10) : null,
		A01: ui.sensoryPerception || null,
		A02: ui.moisture || null,
		A03: ui.activity || null,
		A04: ui.mobility || null,
		A05: ui.nutritionalStatus || null,
		A06: ui.frictionShear || null,
		A80: total > 0 ? total : null,
		A81: ui.interpretation || interpretScore(total) || null,
		A90: ui.opinion || null,
		A99: ui.inputComplete ? '1' : '0',
	};
}
