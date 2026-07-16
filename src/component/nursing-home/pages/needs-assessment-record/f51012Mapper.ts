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

const H1_LABEL_TO_CODE: Record<string, string> = {
	'정상적으로 들린다': '3',
	'거의 들리지 않는다': '2',
	'보통의 소리를 듣기는 하고, 못 듣기도 한다': '2',
};
const H1_CODE_TO_LABEL: Record<string, string> = {
	'1': '거의 들리지 않는다',
	'2': '보통의 소리를 듣기는 하고, 못 듣기도 한다',
	'3': '정상적으로 들린다',
};

const H2_LABEL_TO_CODE: Record<string, string> = {
	'정상적으로 의사소통한다': '1',
	'가끔 이해하고 의사를 표현한다': '2',
	'의사소통이 어렵다': '3',
};
const H2_CODE_TO_LABEL: Record<string, string> = {
	'1': '정상적으로 의사소통한다',
	'2': '가끔 이해하고 의사를 표현한다',
	'3': '의사소통이 어렵다',
};

const H3_LABEL_TO_CODE: Record<string, string> = {
	'정상적인 발음': '1',
	'간혹 어눌한 발음이 섞인다': '2',
	'발음이 매우 어눌하다': '3',
};
const H3_CODE_TO_LABEL: Record<string, string> = {
	'1': '정상적인 발음',
	'2': '간혹 어눌한 발음이 섞인다',
	'3': '발음이 매우 어눌하다',
};

const I1_LABEL_TO_CODE: Record<string, string> = {
	양호: '1',
	보통: '1',
	불량: '2',
	의치: '3',
};
const I1_CODE_TO_LABEL: Record<string, string> = {
	'1': '양호',
	'2': '불량',
	'3': '의치',
	'4': '불량',
};

const I2_LABEL_TO_CODE: Record<string, string> = {
	식욕저하: '1',
	없음: '1',
	저작곤란: '2',
	삼킴곤란: '3',
};
const I2_CODE_TO_LABEL: Record<string, string> = {
	'1': '식욕저하',
	'2': '저작곤란',
	'3': '삼킴곤란',
	'4': '식욕저하',
	'5': '식욕저하',
	'6': '식욕저하',
};

const I3_LABEL_TO_CODE: Record<string, string> = {
	미음: '1',
	죽: '2',
	일반식: '3',
	연식: '2',
	유동식: '2',
	당뇨식: '4',
	경관영양: '5',
};
const I3_CODE_TO_LABEL: Record<string, string> = {
	'1': '미음',
	'2': '죽',
	'3': '일반식',
	'4': '당뇨식',
	'5': '경관영양',
};

const I4_LABEL_TO_CODE: Record<string, string> = {
	숟가락: '1',
	젓가락: '2',
	포크숟가락: '3',
	손: '4',
	도움: '4',
};
const I4_CODE_TO_LABEL: Record<string, string> = {
	'1': '숟가락',
	'2': '젓가락',
	'3': '포크숟가락',
	'4': '도움',
};

const I5_LABEL_TO_CODE: Record<string, string> = {
	정상: '1',
	설사: '2',
	변비: '3',
	실금: '1',
};
const I5_CODE_TO_LABEL: Record<string, string> = {
	'1': '정상',
	'2': '설사',
	'3': '변비',
	'4': '정상',
};

const J01_MAP: Record<string, string> = { 기혼: '1', 미혼: '2', 이혼: '2', 사별: '2' };
const J01_REV: Record<string, string> = { '1': '기혼', '2': '미혼' };

const J01_01_MAP: Record<string, string> = { 생존: '1', 사망: '2' };
const J01_01_REV: Record<string, string> = { '1': '생존', '2': '사망', '9': '생존' };

const J02_MAP: Record<string, string> = { 무: '1', 유: '2' };
const J02_REV: Record<string, string> = { '1': '무', '2': '유' };

const J02_02_MAP: Record<string, string> = {
	배우자: '1',
	자녀: '2',
	자부: '3',
	사위: '4',
	형제자매: '5',
	친척: '6',
	기타: '9',
};
const J02_02_REV: Record<string, string> = {
	'1': '배우자',
	'2': '자녀',
	'3': '자부',
	'4': '사위',
	'5': '형제자매',
	'6': '친척',
	'9': '기타',
};

const J02_04_MAP: Record<string, string> = {
	안정: '1',
	보통: '1',
	불안정: '2',
	연금생활: '3',
	생활보호: '4',
};
const J02_04_REV: Record<string, string> = {
	'1': '안정',
	'2': '불안정',
	'3': '안정',
	'4': '안정',
};

const J03_MAP: Record<string, string> = {
	혼자: '1',
	배우자: '2',
	부모: '3',
	자녀: '4',
	형제자매: '6',
	친척: '6',
	기타: '7',
};
const J03_REV: Record<string, string> = {
	'1': '혼자',
	'2': '배우자',
	'3': '부모',
	'4': '자녀',
	'5': '자녀',
	'6': '친척',
	'7': '기타',
};

const K01_MAP: Record<string, string> = {
	천주교: '1',
	기독교: '2',
	불교: '3',
	기타: '9',
};
const K01_REV: Record<string, string> = {
	'1': '천주교',
	'2': '기독교',
	'3': '불교',
	'9': '기타',
};

export type F51012UiSnapshot = {
	formData: {
		beneficiary: string;
		creationDate: string;
		creator: string;
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
		listeningAbility: string;
		communication: string;
		pronunciationAbility: string;
		judgmentBasis: string;
	};
	nutritionData: {
		dentalCondition: string;
		eatingProblems: string;
		eatingStatus: string;
		toolUsage: string;
		excretionPattern: string;
		judgmentBasis: string;
	};
	familyEnvironmentData: {
		maritalStatus: string;
		primaryCaregiver: string;
		primaryCaregiverRelationship: string;
		cohabitant: string;
		numberOfChildren: string;
		primaryCaregiverAge: string;
		otherRelationship: string;
		spouseSurvivalStatus: string;
		primaryCaregiverEconomicStatus: string;
		judgmentBasis: string;
	};
	resourceUtilizationData: {
		religion: string;
		religionOther: string;
		primaryMedicalInstitution: string;
		phoneNumber: string;
		communityServices: Record<string, boolean>;
		housingImprovementProject: boolean;
		other: string;
		judgmentBasis: string;
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

	const h1c = rowStr(row, 'H01');
	const h2c = rowStr(row, 'H02');
	const h3c = rowStr(row, 'H03');

	return {
		formData: {
			beneficiary: beneficiaryName,
			creationDate: normalizeYmdFromRow(row.RQDT ?? row.rqdt),
			creator: rowStr(row, 'RQEMP') || '',
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
			listeningAbility: H1_CODE_TO_LABEL[h1c] || H1_CODE_TO_LABEL['2'],
			communication: H2_CODE_TO_LABEL[h2c] || H2_CODE_TO_LABEL['2'],
			pronunciationAbility: H3_CODE_TO_LABEL[h3c] || H3_CODE_TO_LABEL['2'],
			judgmentBasis: rowStr(row, 'H90'),
		},
		nutritionData: {
			dentalCondition: I1_CODE_TO_LABEL[rowStr(row, 'I01')] || '양호',
			eatingProblems: I2_CODE_TO_LABEL[rowStr(row, 'I02')] || '식욕저하',
			eatingStatus: I3_CODE_TO_LABEL[rowStr(row, 'I03')] || '일반식',
			toolUsage: I4_CODE_TO_LABEL[rowStr(row, 'I04')] || '젓가락',
			excretionPattern: I5_CODE_TO_LABEL[rowStr(row, 'I05')] || '정상',
			judgmentBasis: rowStr(row, 'I90'),
		},
		familyEnvironmentData: {
			maritalStatus: J01_REV[rowStr(row, 'J01')] || '기혼',
			spouseSurvivalStatus: J01_01_REV[rowStr(row, 'J01_01')] || '사망',
			numberOfChildren: rowStr(row, 'J01_02') || '0',
			primaryCaregiver: J02_REV[rowStr(row, 'J02')] || '유',
			primaryCaregiverAge: rowStr(row, 'J02_01') || '',
			primaryCaregiverRelationship: J02_02_REV[rowStr(row, 'J02_02')] || '자녀',
			otherRelationship: rowStr(row, 'J02_03'),
			primaryCaregiverEconomicStatus: J02_04_REV[rowStr(row, 'J02_04')] || '안정',
			cohabitant: J03_REV[rowStr(row, 'J03')] || '자녀',
			judgmentBasis: rowStr(row, 'J90'),
		},
		resourceUtilizationData: {
			religion: K01_REV[rowStr(row, 'K01')] || '기타',
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
			listeningAbility: '보통의 소리를 듣기는 하고, 못 듣기도 한다',
			communication: '가끔 이해하고 의사를 표현한다',
			pronunciationAbility: '간혹 어눌한 발음이 섞인다',
			judgmentBasis: '',
		},
		nutritionData: {
			dentalCondition: '양호',
			eatingProblems: '식욕저하',
			eatingStatus: '일반식',
			toolUsage: '젓가락',
			excretionPattern: '정상',
			judgmentBasis: '',
		},
		familyEnvironmentData: {
			maritalStatus: '기혼',
			primaryCaregiver: '유',
			primaryCaregiverRelationship: '자녀',
			cohabitant: '자녀',
			numberOfChildren: '0',
			primaryCaregiverAge: '',
			otherRelationship: '',
			spouseSurvivalStatus: '사망',
			primaryCaregiverEconomicStatus: '안정',
			judgmentBasis: '',
		},
		resourceUtilizationData: {
			religion: '기타',
			religionOther: '',
			primaryMedicalInstitution: '',
			phoneNumber: '',
			communityServices: { '급식 및 도시락배달': false, 이미용: false },
			housingImprovementProject: false,
			other: '',
			judgmentBasis: '',
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
	const rqempRaw = String(ui.formData.creator ?? '').trim();
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

	row.H01 = H1_LABEL_TO_CODE[ui.communicationData.listeningAbility] || '2';
	row.H02 = H2_LABEL_TO_CODE[ui.communicationData.communication] || '2';
	row.H03 = H3_LABEL_TO_CODE[ui.communicationData.pronunciationAbility] || '2';
	row.H90 = ui.communicationData.judgmentBasis || null;

	row.I01 = I1_LABEL_TO_CODE[ui.nutritionData.dentalCondition] || '1';
	row.I02 = I2_LABEL_TO_CODE[ui.nutritionData.eatingProblems] || '1';
	row.I03 = I3_LABEL_TO_CODE[ui.nutritionData.eatingStatus] || '3';
	row.I04 = I4_LABEL_TO_CODE[ui.nutritionData.toolUsage] || '2';
	row.I05 = I5_LABEL_TO_CODE[ui.nutritionData.excretionPattern] || '1';
	row.I90 = ui.nutritionData.judgmentBasis || null;

	row.J01 = J01_MAP[ui.familyEnvironmentData.maritalStatus] || '1';
	row.J01_01 = J01_01_MAP[ui.familyEnvironmentData.spouseSurvivalStatus] || '2';
	row.J01_02 = parseInt(String(ui.familyEnvironmentData.numberOfChildren || '0'), 10) || 0;
	row.J02 = J02_MAP[ui.familyEnvironmentData.primaryCaregiver] || '2';
	row.J02_01 = parseInt(String(ui.familyEnvironmentData.primaryCaregiverAge || '0'), 10) || null;
	row.J02_02 = J02_02_MAP[ui.familyEnvironmentData.primaryCaregiverRelationship] || '2';
	row.J02_03 = ui.familyEnvironmentData.otherRelationship || null;
	row.J02_04 = J02_04_MAP[ui.familyEnvironmentData.primaryCaregiverEconomicStatus] || '1';
	row.J03 = J03_MAP[ui.familyEnvironmentData.cohabitant] || '4';
	row.J90 = ui.familyEnvironmentData.judgmentBasis || null;

	row.K01 = K01_MAP[ui.resourceUtilizationData.religion] || '9';
	row.K01_01 = ui.resourceUtilizationData.religionOther || null;
	row.K02 = ui.resourceUtilizationData.primaryMedicalInstitution || null;
	row.K02_01 = ui.resourceUtilizationData.phoneNumber || null;
	row.K03_01 = yn(!!ui.resourceUtilizationData.communityServices['급식 및 도시락배달']);
	row.K03_02 = yn(!!ui.resourceUtilizationData.communityServices['이미용']);
	row.K03_03 = yn(ui.resourceUtilizationData.housingImprovementProject);
	row.K03_04 = ui.resourceUtilizationData.other || null;
	row.K90 = ui.resourceUtilizationData.judgmentBasis || null;

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
