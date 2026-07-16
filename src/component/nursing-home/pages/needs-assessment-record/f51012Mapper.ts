/**
 * F51012(욕구사정기록) 화면 상태 ↔ DB 컬럼 매핑
 */

export type ActivityAssessment = { activity: string; value: '○' | '△' | 'X' | '' };

const ACTIVITY_ORDER = [
	'옷벗고 입기',
	'식사 하기',
	'일어나 앉기',
	'화장실 이용하기',
	'세수하기',
	'목욕하기',
	'옮겨 앉기',
	'대변 조절하기',
	'양치질하기',
	'체위변경 하기',
	'방밖으로 나오기',
	'소변조절하기',
] as const;

const C_KEYS = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12'] as const;

/** F51012 신체(C01~C12) — 화면/문서용 */
export const PHYSICAL_ACTIVITY_ITEMS: { key: (typeof C_KEYS)[number]; label: string }[] = C_KEYS.map((key, i) => ({
	key,
	label: ACTIVITY_ORDER[i],
}));

export function createEmptyActivities(): ActivityAssessment[] {
	return ACTIVITY_ORDER.map((activity) => ({ activity, value: '' }));
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

function coerceScalar(v: unknown): string {
	if (v == null) return '';
	if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
	if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) return v.toString('utf8').trim();
	// mssql CHAR 패딩 / 공백 제거
	return String(v).replace(/\u0000/g, '').trim();
}

function activityToDb(v: '○' | '△' | 'X' | ''): string | null {
	if (v === '○') return '3';
	if (v === '△') return '2';
	if (v === 'X') return '1';
	return null;
}

/** DB C01~C12 → 화면: 1=X, 2=△, 3=○ */
function dbToActivity(c: unknown): '○' | '△' | 'X' | '' {
	const s = coerceScalar(c);
	if (!s) return '';
	// 숫자 코드
	if (s === '1' || s.startsWith('1')) return 'X';
	if (s === '2' || s.startsWith('2')) return '△';
	if (s === '3' || s.startsWith('3')) return '○';
	// 이미 기호로 저장된 경우
	if (s === 'X' || s === 'x' || s === '×' || s === '✕') return 'X';
	if (s === '△' || s === '▲' || s === '^') return '△';
	if (s === '○' || s === 'O' || s === 'o' || s === '●' || s === '◯') return '○';
	return '';
}

function yn(b: boolean): string {
	return b ? 'Y' : 'N';
}

function parseYn(v: unknown): boolean {
	return String(v ?? '').trim().toUpperCase() === 'Y';
}

/** 질병1 UI 키 순서 → DB 컬럼 */
const DISEASE1_COLS: string[] = [
	'D01_01',
	'D01_02',
	'D01_03',
	'D01_04',
	'D01_05',
	'D01_06',
	'D01_07',
	'D01_08',
	'D02_01',
	'D02_02',
	'D02_03',
	'D02_04',
	'D02_05',
	'D02_06',
	'D03_01',
	'D03_02',
	'D03_03',
	'D03_04',
	'D03_05',
	'D03_06',
	'D04_01',
	'D04_02',
	'D04_03',
	'D04_04',
	'D04_05',
	'D05_01',
	'D05_02',
	'D05_03',
	'D05_04',
	'D05_05',
	'D05_06',
	'D06_01',
	'D06_02',
	'D06_03',
	'D06_04',
	'D07_01',
	'D07_02',
	'D07_03',
	'D07_04',
	'D08_01',
	'D08_02',
	'D08_03',
];

const DISEASE1_UI_KEYS: string[] = [
	'내분.대사-당뇨',
	'내분.대사-갑상선질환',
	'내분.대사-탈수',
	'내분.대사-영양상태이상',
	'내분.대사-만성간염',
	'내분.대사-자기면역질환',
	'내분.대사-빈혈',
	'내분.대사-기타',
	'소화기계-위염',
	'소화기계-위궤양',
	'소화기계-십이지궤양',
	'소화기계-변비',
	'소화기계-간경변증',
	'소화기계-기타',
	'순환기계-고혈압',
	'순환기계-저혈압',
	'순환기계-협심증',
	'순환기계-심근경색증',
	'순환기계-뇌혈관질환',
	'순환기계-기타',
	'근골격계-관절염',
	'근골격계-요통,좌골통',
	'근골격계-기타 척추질환',
	'근골격계-골다공증',
	'근골격계-기타',
	'신경계-치매',
	'신경계-뇌경색',
	'신경계-파킨슨병',
	'신경계-두통',
	'신경계-두통외 통증',
	'신경계-기타',
	'정신.행동-신경증',
	'정신.행동-우울증',
	'정신.행동-수면장애',
	'정신.행동-기타',
	'호흡기계-폐결핵',
	'호흡기계-만성기관지염',
	'호흡기계-호흡곤란',
	'호흡기계-기타',
	'눈.귀질환-시각장애',
	'눈.귀질환-난청',
	'눈.귀질환-기타',
];

const DISEASE2_COLS = ['D09_01', 'D09_02', 'D09_03', 'D09_04', 'D10_01', 'D10_02'] as const;
const DISEASE2_UI_KEYS = [
	'비뇨.생식-전립선비대',
	'비뇨.생식-요실금',
	'비뇨.생식-만성방광염',
	'비뇨.생식-기타',
	'만성신장-만성신부전증',
	'만성신장-기타',
] as const;

const REHAB_UI_TO_COL: Record<string, string> = {
	우측상지: 'E01',
	좌측상지: 'E02',
	우측하지: 'E03',
	좌측하지: 'E04',
	'어깨관절(우)': 'E05_01',
	'어깨관절(좌)': 'E05_02',
	'팔꿈치관절(우)': 'E06_01',
	'팔꿈치관절(좌)': 'E06_02',
	'손목 및 수지관절(우)': 'E07_01',
	'손목 및 수지관절(좌)': 'E07_02',
	'고관절(우)': 'E08_01',
	'고관절(좌)': 'E08_02',
	'무릎관절(우)': 'E09_01',
	'무릎관절(좌)': 'E09_02',
	'발목관절(우)': 'E10_01',
	'발목관절(좌)': 'E10_02',
};

const NURSING_UI_TO_COL: Record<string, string> = {
	'기관지 절개관 간호': 'F01',
	흡인: 'F02',
	산소요법: 'F03',
	욕창간호: 'F04',
	경관영양: 'F05',
	통증간호: 'F06',
	장루간호: 'F07',
	도뇨관리: 'F08',
	투석간호: 'F09',
	당뇨발간호: 'F10',
	상처간호: 'F11',
};

const COG_LABELS = [
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
] as const;

/** 의사소통 H01 청취능력 */
export const H01_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '들리는지 판단불능' },
	{ code: '2', label: '거의 들리지 않는다' },
	{ code: '3', label: '큰 소리는 들을 수 있다' },
	{ code: '4', label: '보통의 소리를 듣기는 하고, 못 듣기도 한다' },
	{ code: '5', label: '정상(보청기사용포함)' },
];

/** 의사소통 H02 */
export const H02_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '모두 이해하고 의사를 표현한다' },
	{ code: '2', label: '대부분 이해하고 의사를 표현한다' },
	{ code: '3', label: '가끔 이해하고 의사를 표현한다' },
	{ code: '4', label: '거의 이해하지 못하고 의사를 전달하지 못한다' },
];

/** 의사소통 H03 발음능력 */
export const H03_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '정확하게 발음이 가능하다' },
	{ code: '2', label: '응얼거리는 소리로만 한다' },
	{ code: '3', label: '간혹 어눌한 발음이 섞인다' },
	{ code: '4', label: '전혀 발음하지 못한다' },
];

const H1_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...H01_OPTIONS.map((o) => [o.label, o.code] as const),
	// 구 UI 라벨 호환
	['정상적으로 들린다', '5'],
	['거의 들리지 않는다', '2'],
	['보통의 소리를 듣기는 하고, 못 듣기도 한다', '4'],
]);
const H1_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(H01_OPTIONS.map((o) => [o.code, o.label]));

const H2_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...H02_OPTIONS.map((o) => [o.label, o.code] as const),
	['정상적으로 의사소통한다', '1'],
	['가끔 이해하고 의사를 표현한다', '3'],
	['의사소통이 어렵다', '4'],
]);
const H2_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(H02_OPTIONS.map((o) => [o.code, o.label]));

const H3_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...H03_OPTIONS.map((o) => [o.label, o.code] as const),
	['정상적인 발음', '1'],
	['간혹 어눌한 발음이 섞인다', '3'],
	['발음이 매우 어눌하다', '2'],
]);
const H3_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(H03_OPTIONS.map((o) => [o.code, o.label]));

function normalizeHCode(raw: string, max: number, labelToCode: Record<string, string>): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (/^\d+$/.test(s)) {
		const n = parseInt(s, 10);
		if (n >= 1 && n <= max) return String(n);
	}
	return labelToCode[s] || '';
}

/** 영양 I01 치아상태 */
export const I01_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '양호' },
	{ code: '2', label: '불량' },
	{ code: '3', label: '의치' },
	{ code: '4', label: '잔존치아없음' },
];

/** 영양 I02 식사시문제점 */
export const I02_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '식욕저하' },
	{ code: '2', label: '저작곤란' },
	{ code: '3', label: '연하곤란' },
	{ code: '4', label: '소화불량' },
	{ code: '5', label: '구토' },
	{ code: '6', label: '없음' },
];

/** 영양 I03 식사형태 */
export const I03_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '미음' },
	{ code: '2', label: '죽' },
	{ code: '3', label: '일반식' },
	{ code: '4', label: '당뇨식' },
	{ code: '5', label: '경관식' },
];

/** 영양 I04 도구사용 */
export const I04_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '숟가락' },
	{ code: '2', label: '젓가락' },
	{ code: '3', label: '포크숟가락' },
	{ code: '4', label: '사용불가' },
];

/** 영양 I05 배설양상 */
export const I05_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '정상' },
	{ code: '2', label: '설사' },
	{ code: '3', label: '변비' },
	{ code: '4', label: '복부팽만' },
];

const I1_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...I01_OPTIONS.map((o) => [o.label, o.code] as const),
	['보통', '1'],
]);
const I2_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...I02_OPTIONS.map((o) => [o.label, o.code] as const),
	['삼킴곤란', '3'],
]);
const I3_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...I03_OPTIONS.map((o) => [o.label, o.code] as const),
	['경관영양', '5'],
	['연식', '2'],
	['유동식', '2'],
]);
const I4_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...I04_OPTIONS.map((o) => [o.label, o.code] as const),
	['손', '4'],
	['도움', '4'],
]);
const I5_LABEL_TO_CODE: Record<string, string> = Object.fromEntries([
	...I05_OPTIONS.map((o) => [o.label, o.code] as const),
	['실금', '1'],
]);

function normalizeICode(raw: string, max: number, labelToCode: Record<string, string>): string {
	return normalizeHCode(raw, max, labelToCode);
}

function normalizeCodeFromOptions(
	raw: string,
	options: { code: string; label: string }[],
	extraLabelMap: Record<string, string> = {}
): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (options.some((o) => o.code === s)) return s;
	if (/^\d+$/.test(s)) {
		const n = String(parseInt(s, 10));
		const byNum = options.find((o) => o.code === n || o.code === s);
		if (byNum) return byNum.code;
	}
	const labelMap: Record<string, string> = {
		...Object.fromEntries(options.map((o) => [o.label, o.code])),
		...extraLabelMap,
	};
	return labelMap[s] || '';
}

/** 가족환경 J01 결혼여부 */
export const J01_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '기혼' },
	{ code: '2', label: '미혼' },
];

/** 가족환경 J01_01 배우자생존여부 */
export const J01_01_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '생존' },
	{ code: '2', label: '사망' },
	{ code: '9', label: '관계없음' },
];

/** 가족환경 J02 주수발자 — 1.유 2.무 */
export const J02_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '유' },
	{ code: '2', label: '무' },
];

/** 가족환경 J02_02 주수발자-관계 */
export const J02_02_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '배우자' },
	{ code: '2', label: '자녀' },
	{ code: '3', label: '자부' },
	{ code: '4', label: '사위' },
	{ code: '5', label: '형제자매' },
	{ code: '6', label: '친척' },
	{ code: '9', label: '기타' },
];

/** 가족환경 J02_04 주수발자-경제상태 */
export const J02_04_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '안정' },
	{ code: '2', label: '불안' },
	{ code: '3', label: '연금생활' },
	{ code: '4', label: '생활보호' },
];

/** 가족환경 J03 동거인 */
export const J03_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '독거' },
	{ code: '2', label: '부부' },
	{ code: '3', label: '부모' },
	{ code: '4', label: '자녀' },
	{ code: '5', label: '손자녀' },
	{ code: '6', label: '친척' },
	{ code: '7', label: '친구/이웃' },
];

const J01_EXTRA: Record<string, string> = { 이혼: '2', 사별: '2' };
const J02_EXTRA: Record<string, string> = {}; // 구코드 유=2,무=1 이었을 수 있어 hydrate는 DB코드 우선
const J02_04_EXTRA: Record<string, string> = { 불안정: '2', 보통: '1' };
const J03_EXTRA: Record<string, string> = {
	혼자: '1',
	배우자: '2',
	형제자매: '6',
	기타: '7',
};

/** 자원이용 K01 종교 — 1.천주교 2.기독교 3.불교 4.기타 */
export const K01_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '천주교' },
	{ code: '2', label: '기독교' },
	{ code: '3', label: '불교' },
	{ code: '4', label: '기타' },
];
/** 구코드 9(기타) → 4 */
const K01_EXTRA: Record<string, string> = { '9': '4' };

export type F51012UiSnapshot = {
	formData: {
		beneficiary: string;
		creationDate: string;
		/** 화면 표시용 작성자명 (F01010.EMPNM) */
		creator: string;
		/** F51012.RQEMP = F01010.EMPNO */
		creatorEmpno: string;
		height: string;
		weight: string;
		judgmentBasis: string;
		/** F51012 C99 — 0: 미완료, 1: 입력완료 */
		physicalInputComplete: boolean;
	};
	activities: ActivityAssessment[];
	disease1Data: Record<string, boolean>;
	disease2Data: Record<string, boolean>;
	diseaseFormData: { pastMedicalHistory: string; currentDiagnosis: string; judgmentBasis: string };
	rehabilitationData: Record<string, boolean>;
	rehabilitationJudgmentBasis: string;
	nursingData: Record<string, boolean>;
	nursingJudgmentBasis: string;
	cognitionData: Record<string, boolean>;
	cognitionJudgmentBasis: string;
	communicationData: {
		/** H01 코드 1~5 (또는 구 라벨) */
		listeningAbility: string;
		/** H02 코드 1~4 */
		communication: string;
		/** H03 코드 1~4 */
		pronunciationAbility: string;
		judgmentBasis: string;
		/** H99 */
		inputComplete: boolean;
	};
	nutritionData: {
		/** I01 코드 */
		dentalCondition: string;
		/** I02 코드 */
		eatingProblems: string;
		/** I03 코드 */
		eatingStatus: string;
		/** I04 코드 */
		toolUsage: string;
		/** I05 코드 */
		excretionPattern: string;
		judgmentBasis: string;
		/** I99 */
		inputComplete: boolean;
	};
	familyEnvironmentData: {
		/** J01 */
		maritalStatus: string;
		/** J02 — 1.유 2.무 */
		primaryCaregiver: string;
		/** J02_02 */
		primaryCaregiverRelationship: string;
		/** J03 */
		cohabitant: string;
		/** J01_02 */
		numberOfChildren: string;
		/** J02_01 */
		primaryCaregiverAge: string;
		/** J02_03 */
		otherRelationship: string;
		/** J01_01 */
		spouseSurvivalStatus: string;
		/** J02_04 */
		primaryCaregiverEconomicStatus: string;
		/** J90 */
		judgmentBasis: string;
		/** J99 */
		inputComplete: boolean;
	};
	resourceUtilizationData: {
		/** K01 */
		religion: string;
		/** K01_01 */
		religionOther: string;
		/** K02 */
		primaryMedicalInstitution: string;
		/** K02_01 */
		phoneNumber: string;
		/** K03_01, K03_02 */
		communityServices: Record<string, boolean>;
		/** K03_03 */
		housingImprovementProject: boolean;
		/** K03_04 */
		other: string;
		/** K90 */
		judgmentBasis: string;
		/** K99 */
		inputComplete: boolean;
	};
	individualNeedsData: {
		medicationAdministrationRequest: boolean;
		hospitalAccompaniment: boolean;
		outingAccompaniment: boolean;
		notes: string;
	};
	overallAssessmentData: { content: string };
};

function rowStr(r: Record<string, unknown>, k: string): string {
	return coerceScalar(getRowVal(r, k));
}

/** DB 한 행 → 화면 스냅샷 */
export function hydrateFromF51012Row(row: Record<string, unknown> | null | undefined, beneficiaryName: string): F51012UiSnapshot {
	if (!row || typeof row !== 'object') {
		return emptySnapshot(beneficiaryName, '');
	}

	const activities: ActivityAssessment[] = ACTIVITY_ORDER.map((activity, i) => ({
		activity,
		value: dbToActivity(getRowVal(row, C_KEYS[i])),
	}));

	const disease1Data: Record<string, boolean> = {};
	DISEASE1_UI_KEYS.forEach((key, i) => {
		disease1Data[key] = parseYn(row[DISEASE1_COLS[i]]);
	});

	const disease2Data: Record<string, boolean> = {};
	DISEASE2_UI_KEYS.forEach((key, i) => {
		disease2Data[key] = parseYn(row[DISEASE2_COLS[i]]);
	});

	const rehabilitationData: Record<string, boolean> = {};
	Object.keys(REHAB_UI_TO_COL).forEach((label) => {
		rehabilitationData[label] = parseYn(row[REHAB_UI_TO_COL[label]]);
	});

	const nursingData: Record<string, boolean> = {};
	Object.keys(NURSING_UI_TO_COL).forEach((label) => {
		nursingData[label] = parseYn(row[NURSING_UI_TO_COL[label]]);
	});

	const cognitionData: Record<string, boolean> = {};
	COG_LABELS.forEach((label, i) => {
		const col = `G${String(i + 1).padStart(2, '0')}`;
		cognitionData[label] = parseYn(row[col]);
	});

	const h1c = normalizeHCode(rowStr(row, 'H01'), 5, H1_LABEL_TO_CODE);
	const h2c = normalizeHCode(rowStr(row, 'H02'), 4, H2_LABEL_TO_CODE);
	const h3c = normalizeHCode(rowStr(row, 'H03'), 4, H3_LABEL_TO_CODE);

	return {
		formData: {
			beneficiary: beneficiaryName,
			creationDate: normalizeYmdFromRow(row.RQDT ?? row.rqdt),
			creator: rowStr(row, 'RQEMP_NM') || rowStr(row, 'EMPNM') || '',
			creatorEmpno: rowStr(row, 'RQEMP') || '',
			height: rowStr(row, 'HEIGHT') || '0.0',
			weight: rowStr(row, 'WEIGHT') || '0.0',
			judgmentBasis: rowStr(row, 'C90'),
			physicalInputComplete: rowStr(row, 'C99') === '1',
		},
		activities,
		disease1Data,
		disease2Data,
		diseaseFormData: {
			pastMedicalHistory: rowStr(row, 'D20'),
			currentDiagnosis: rowStr(row, 'D21'),
			judgmentBasis: rowStr(row, 'D90'),
		},
		rehabilitationData,
		rehabilitationJudgmentBasis: rowStr(row, 'E90'),
		nursingData,
		nursingJudgmentBasis: rowStr(row, 'F90'),
		cognitionData,
		cognitionJudgmentBasis: rowStr(row, 'G90'),
		communicationData: {
			listeningAbility: h1c,
			communication: h2c,
			pronunciationAbility: h3c,
			judgmentBasis: rowStr(row, 'H90'),
			inputComplete: rowStr(row, 'H99') === '1',
		},
		nutritionData: {
			dentalCondition: normalizeICode(rowStr(row, 'I01'), 4, I1_LABEL_TO_CODE),
			eatingProblems: normalizeICode(rowStr(row, 'I02'), 6, I2_LABEL_TO_CODE),
			eatingStatus: normalizeICode(rowStr(row, 'I03'), 5, I3_LABEL_TO_CODE),
			toolUsage: normalizeICode(rowStr(row, 'I04'), 4, I4_LABEL_TO_CODE),
			excretionPattern: normalizeICode(rowStr(row, 'I05'), 4, I5_LABEL_TO_CODE),
			judgmentBasis: rowStr(row, 'I90'),
			inputComplete: rowStr(row, 'I99') === '1',
		},
		familyEnvironmentData: {
			maritalStatus: normalizeCodeFromOptions(rowStr(row, 'J01'), J01_OPTIONS, J01_EXTRA),
			spouseSurvivalStatus: normalizeCodeFromOptions(rowStr(row, 'J01_01'), J01_01_OPTIONS),
			numberOfChildren: rowStr(row, 'J01_02') || '',
			primaryCaregiver: normalizeCodeFromOptions(rowStr(row, 'J02'), J02_OPTIONS, J02_EXTRA),
			primaryCaregiverAge: rowStr(row, 'J02_01') || '',
			primaryCaregiverRelationship: normalizeCodeFromOptions(rowStr(row, 'J02_02'), J02_02_OPTIONS),
			otherRelationship: rowStr(row, 'J02_03'),
			primaryCaregiverEconomicStatus: normalizeCodeFromOptions(rowStr(row, 'J02_04'), J02_04_OPTIONS, J02_04_EXTRA),
			cohabitant: normalizeCodeFromOptions(rowStr(row, 'J03'), J03_OPTIONS, J03_EXTRA),
			judgmentBasis: rowStr(row, 'J90'),
			inputComplete: rowStr(row, 'J99') === '1',
		},
		resourceUtilizationData: {
			religion: normalizeCodeFromOptions(rowStr(row, 'K01'), K01_OPTIONS, K01_EXTRA),
			religionOther: rowStr(row, 'K01_01'),
			primaryMedicalInstitution: rowStr(row, 'K02'),
			phoneNumber: rowStr(row, 'K02_01'),
			communityServices: {
				'급식 및 도시락배달': parseYn(row['K03_01']),
				이미용: parseYn(row['K03_02']),
			},
			housingImprovementProject: parseYn(row['K03_03']),
			other: rowStr(row, 'K03_04'),
			judgmentBasis: rowStr(row, 'K90'),
			inputComplete: rowStr(row, 'K99') === '1',
		},
		individualNeedsData: {
			medicationAdministrationRequest: parseYn(row['L01_01']),
			hospitalAccompaniment: parseYn(row['L01_02']),
			outingAccompaniment: parseYn(row['L01_03']),
			notes: rowStr(row, 'L01'),
		},
		overallAssessmentData: { content: rowStr(row, 'L02') },
	};
}

function normalizeYmdFromRow(v: unknown): string {
	if (v == null) return '';
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s;
}

export function emptySnapshot(beneficiaryName: string, creationDate: string): F51012UiSnapshot {
	const disease1: Record<string, boolean> = {};
	DISEASE1_UI_KEYS.forEach((k) => {
		disease1[k] = false;
	});
	const disease2: Record<string, boolean> = {};
	DISEASE2_UI_KEYS.forEach((k) => {
		disease2[k] = false;
	});
	const rehab: Record<string, boolean> = {};
	Object.keys(REHAB_UI_TO_COL).forEach((k) => {
		rehab[k] = false;
	});
	const nurse: Record<string, boolean> = {};
	Object.keys(NURSING_UI_TO_COL).forEach((k) => {
		nurse[k] = false;
	});
	const cog: Record<string, boolean> = {};
	COG_LABELS.forEach((l) => {
		cog[l] = false;
	});
	return {
		formData: {
			beneficiary: beneficiaryName,
			creationDate,
			creator: '',
			creatorEmpno: '',
			height: '0.0',
			weight: '0.0',
			judgmentBasis: '',
			physicalInputComplete: false,
		},
		activities: createEmptyActivities(),
		disease1Data: disease1,
		disease2Data: disease2,
		diseaseFormData: { pastMedicalHistory: '', currentDiagnosis: '', judgmentBasis: '' },
		rehabilitationData: rehab,
		rehabilitationJudgmentBasis: '',
		nursingData: nurse,
		nursingJudgmentBasis: '',
		cognitionData: cog,
		cognitionJudgmentBasis: '',
		communicationData: {
			listeningAbility: '',
			communication: '',
			pronunciationAbility: '',
			judgmentBasis: '',
			inputComplete: false,
		},
		nutritionData: {
			dentalCondition: '',
			eatingProblems: '',
			eatingStatus: '',
			toolUsage: '',
			excretionPattern: '',
			judgmentBasis: '',
			inputComplete: false,
		},
		familyEnvironmentData: {
			maritalStatus: '',
			primaryCaregiver: '',
			primaryCaregiverRelationship: '',
			cohabitant: '',
			numberOfChildren: '',
			primaryCaregiverAge: '',
			otherRelationship: '',
			spouseSurvivalStatus: '',
			primaryCaregiverEconomicStatus: '',
			judgmentBasis: '',
			inputComplete: false,
		},
		resourceUtilizationData: {
			religion: '',
			religionOther: '',
			primaryMedicalInstitution: '',
			phoneNumber: '',
			communityServices: { '급식 및 도시락배달': false, 이미용: false },
			housingImprovementProject: false,
			other: '',
			judgmentBasis: '',
			inputComplete: false,
		},
		individualNeedsData: {
			medicationAdministrationRequest: false,
			hospitalAccompaniment: false,
			outingAccompaniment: false,
			notes: '',
		},
		overallAssessmentData: { content: '' },
	};
}

/** 화면 상태 → F51012 컬럼 객체 (ANCD, PNUM, RQDT 제외) */
export function buildF51012RowPayload(
	ui: F51012UiSnapshot,
	ancd: string | number,
	pnum: string | number,
	rqdtYmd: string
): Record<string, unknown> {
	const rqempRaw = String(ui.formData.creatorEmpno ?? '').trim();
	const rqempNum = parseInt(rqempRaw, 10);

	const row: Record<string, unknown> = {
		ANCD: ancd,
		PNUM: pnum,
		RQDT: rqdtYmd,
		RQEMP: Number.isFinite(rqempNum) ? rqempNum : null,
		HEIGHT: ui.formData.height === '' ? null : Number(ui.formData.height),
		WEIGHT: ui.formData.weight === '' ? null : Number(ui.formData.weight),
		C90: ui.formData.judgmentBasis || null,
		C99: ui.formData.physicalInputComplete ? '1' : '0',
	};

	C_KEYS.forEach((ck, i) => {
		row[ck] = activityToDb(ui.activities[i]?.value || '');
	});

	DISEASE1_UI_KEYS.forEach((key, i) => {
		row[DISEASE1_COLS[i]] = yn(!!ui.disease1Data[key]);
	});

	DISEASE2_UI_KEYS.forEach((key, i) => {
		row[DISEASE2_COLS[i]] = yn(!!ui.disease2Data[key]);
	});

	row.D20 = ui.diseaseFormData.pastMedicalHistory || null;
	row.D21 = ui.diseaseFormData.currentDiagnosis || null;
	row.D90 = ui.diseaseFormData.judgmentBasis || null;
	row.D10_02_01 = null;

	Object.keys(REHAB_UI_TO_COL).forEach((label) => {
		row[REHAB_UI_TO_COL[label]] = yn(!!ui.rehabilitationData[label]);
	});
	row.E90 = ui.rehabilitationJudgmentBasis || null;

	Object.keys(NURSING_UI_TO_COL).forEach((label) => {
		row[NURSING_UI_TO_COL[label]] = yn(!!ui.nursingData[label]);
	});
	row.F90 = ui.nursingJudgmentBasis || null;

	COG_LABELS.forEach((label, i) => {
		const col = i < 9 ? `G0${i + 1}` : `G${i + 1}`;
		row[col] = yn(!!ui.cognitionData[label]);
	});
	row.G90 = ui.cognitionJudgmentBasis || null;

	row.H01 = normalizeHCode(ui.communicationData.listeningAbility, 5, H1_LABEL_TO_CODE) || null;
	row.H02 = normalizeHCode(ui.communicationData.communication, 4, H2_LABEL_TO_CODE) || null;
	row.H03 = normalizeHCode(ui.communicationData.pronunciationAbility, 4, H3_LABEL_TO_CODE) || null;
	row.H90 = ui.communicationData.judgmentBasis || null;
	row.H99 = ui.communicationData.inputComplete ? '1' : '0';

	row.I01 = normalizeICode(ui.nutritionData.dentalCondition, 4, I1_LABEL_TO_CODE) || null;
	row.I02 = normalizeICode(ui.nutritionData.eatingProblems, 6, I2_LABEL_TO_CODE) || null;
	row.I03 = normalizeICode(ui.nutritionData.eatingStatus, 5, I3_LABEL_TO_CODE) || null;
	row.I04 = normalizeICode(ui.nutritionData.toolUsage, 4, I4_LABEL_TO_CODE) || null;
	row.I05 = normalizeICode(ui.nutritionData.excretionPattern, 4, I5_LABEL_TO_CODE) || null;
	row.I90 = ui.nutritionData.judgmentBasis || null;
	row.I99 = ui.nutritionData.inputComplete ? '1' : '0';

	row.J01 = normalizeCodeFromOptions(ui.familyEnvironmentData.maritalStatus, J01_OPTIONS, J01_EXTRA) || null;
	row.J01_01 = normalizeCodeFromOptions(ui.familyEnvironmentData.spouseSurvivalStatus, J01_01_OPTIONS) || null;
	const childrenN = parseInt(String(ui.familyEnvironmentData.numberOfChildren || ''), 10);
	row.J01_02 = Number.isFinite(childrenN) ? childrenN : null;
	row.J02 = normalizeCodeFromOptions(ui.familyEnvironmentData.primaryCaregiver, J02_OPTIONS, J02_EXTRA) || null;
	const ageN = parseInt(String(ui.familyEnvironmentData.primaryCaregiverAge || ''), 10);
	row.J02_01 = Number.isFinite(ageN) ? ageN : null;
	row.J02_02 = normalizeCodeFromOptions(ui.familyEnvironmentData.primaryCaregiverRelationship, J02_02_OPTIONS) || null;
	row.J02_03 = ui.familyEnvironmentData.otherRelationship || null;
	row.J02_04 = normalizeCodeFromOptions(ui.familyEnvironmentData.primaryCaregiverEconomicStatus, J02_04_OPTIONS, J02_04_EXTRA) || null;
	row.J03 = normalizeCodeFromOptions(ui.familyEnvironmentData.cohabitant, J03_OPTIONS, J03_EXTRA) || null;
	row.J90 = ui.familyEnvironmentData.judgmentBasis || null;
	row.J99 = ui.familyEnvironmentData.inputComplete ? '1' : '0';

	row.K01 = normalizeCodeFromOptions(ui.resourceUtilizationData.religion, K01_OPTIONS, K01_EXTRA) || null;
	row.K01_01 = ui.resourceUtilizationData.religionOther || null;
	row.K02 = ui.resourceUtilizationData.primaryMedicalInstitution || null;
	row.K02_01 = ui.resourceUtilizationData.phoneNumber || null;
	row.K03_01 = yn(!!ui.resourceUtilizationData.communityServices['급식 및 도시락배달']);
	row.K03_02 = yn(!!ui.resourceUtilizationData.communityServices['이미용']);
	row.K03_03 = yn(ui.resourceUtilizationData.housingImprovementProject);
	row.K03_04 = ui.resourceUtilizationData.other || null;
	row.K90 = ui.resourceUtilizationData.judgmentBasis || null;
	row.K99 = ui.resourceUtilizationData.inputComplete ? '1' : '0';

	row.L01 = ui.individualNeedsData.notes || null;
	row.L01_01 = yn(ui.individualNeedsData.medicationAdministrationRequest);
	row.L01_02 = yn(ui.individualNeedsData.hospitalAccompaniment);
	row.L01_03 = yn(ui.individualNeedsData.outingAccompaniment);
	row.L02 = ui.overallAssessmentData.content || null;

	return row;
}

export function collectUiSnapshot(st: {
	formData: F51012UiSnapshot['formData'];
	activities: ActivityAssessment[];
	disease1Data: Record<string, boolean>;
	disease2Data: Record<string, boolean>;
	diseaseFormData: F51012UiSnapshot['diseaseFormData'];
	rehabilitationData: Record<string, boolean>;
	rehabilitationJudgmentBasis: string;
	nursingData: Record<string, boolean>;
	nursingJudgmentBasis: string;
	cognitionData: Record<string, boolean>;
	cognitionJudgmentBasis: string;
	communicationData: F51012UiSnapshot['communicationData'];
	nutritionData: F51012UiSnapshot['nutritionData'];
	familyEnvironmentData: F51012UiSnapshot['familyEnvironmentData'];
	resourceUtilizationData: F51012UiSnapshot['resourceUtilizationData'];
	individualNeedsData: F51012UiSnapshot['individualNeedsData'];
	overallAssessmentData: F51012UiSnapshot['overallAssessmentData'];
}): F51012UiSnapshot {
	return {
		formData: st.formData,
		activities: st.activities,
		disease1Data: st.disease1Data,
		disease2Data: st.disease2Data,
		diseaseFormData: st.diseaseFormData,
		rehabilitationData: st.rehabilitationData,
		rehabilitationJudgmentBasis: st.rehabilitationJudgmentBasis,
		nursingData: st.nursingData,
		nursingJudgmentBasis: st.nursingJudgmentBasis,
		cognitionData: st.cognitionData,
		cognitionJudgmentBasis: st.cognitionJudgmentBasis,
		communicationData: st.communicationData,
		nutritionData: st.nutritionData,
		familyEnvironmentData: st.familyEnvironmentData,
		resourceUtilizationData: st.resourceUtilizationData,
		individualNeedsData: st.individualNeedsData,
		overallAssessmentData: st.overallAssessmentData,
	};
}
