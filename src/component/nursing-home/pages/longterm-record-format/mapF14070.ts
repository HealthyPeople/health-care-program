/** F14070 행 → 장기요양급여 제공기록지 화면/출력 상태 */

export type F14070Beneficiary = {
	status: '와상' | '준와상' | '자립';
	dementia: boolean;
	stroke: boolean;
	hypertension: boolean;
	diabetes: boolean;
	arthritis: boolean;
	otherDisease: boolean;
	otherDiseaseText: string;
	tracheostomy: boolean;
	dentures: boolean;
	nasogastricTube: boolean;
	urinaryCatheter: boolean;
	cystostomy: boolean;
	urostomy: boolean;
	colostomy: boolean;
	diaper: boolean;
	pressureSore: boolean;
	pressureSoreArea: string;
	pressureSorePrevention: boolean;
	pressureSorePreventionTool: string;
	roomNo: string;
};

export type F14070DailyRecords = {
	grooming: boolean[];
	bathTime: string[];
	bathMethod: string[];
	mealType: string[];
	mealIntake: string[];
	positionChange: boolean[];
	toiletUsage: string[];
	movementAssistance: boolean[];
	walk: boolean[];
	outing: boolean[];
	physicalActivityNotes: string[];
	physicalActivityPreparer: string[];
	cognitiveSupport: boolean[];
	communicationSupport: boolean[];
	cognitiveNotes: string[];
	cognitivePreparer: string[];
	vitalSigns: string[];
	healthManagement: boolean[];
	healthTime: string[];
	nursingManagement: boolean[];
	nursingTime: string[];
	emergencyService: boolean[];
	healthNotes: string[];
	healthPreparer: string[];
	trainingProgram: boolean[];
	physicalFunctionTraining: boolean[];
	cognitiveTraining: boolean[];
	physicalTherapy: boolean[];
	trainingNotes: string[];
	trainingPreparer: string[];
	admissionDischargeTime: string[];
};

export type F14070Header = {
	name: string;
	birthDate: string;
	gradeLabel: string;
	certNo: string;
	institutionName: string;
	institutionCode: string;
	roomNo: string;
	year: string;
	weekDates: string[];
};

const empty7 = () => ['', '', '', '', '', '', ''];
const empty7Bool = () => [false, false, false, false, false, false, false];

/** F14070 체크표시(√ 등) — 프로시저 변환 결과와 동일하게 인식 */
export const f14070Checked = (v: unknown) => {
	const s = String(v ?? '').trim();
	if (!s) return false;
	const lower = s.toLowerCase();
	if (lower === '0' || lower === 'n' || lower === 'no' || lower === 'false' || lower === 'x' || s === '×') {
		return false;
	}
	if (
		s === '√' ||
		s === '✓' ||
		s === '✔' ||
		lower === '1' ||
		lower === 'y' ||
		lower === 'yes' ||
		lower === 'true' ||
		lower === 'v' ||
		s === '○' ||
		lower === 'o'
	) {
		return true;
	}
	if (s.includes('√') || s.includes('✓')) return true;
	return false;
};

const pad2 = (v: unknown) => {
	const s = String(v ?? '').trim();
	if (!s) return '';
	if (/^\d+$/.test(s)) return s.padStart(2, '0');
	return s;
};

const daySuffix = (n: number) => String(n).padStart(2, '0');

const col = (row: any, base: string, day: number) => row?.[`${base}_${daySuffix(day)}`];

/**
 * Usp_P14070 / F14070 요일 컬럼: 01=월 … 07=일
 * 화면 배열 인덱스도 월~일(0=월 … 6=일)로 맞춤
 */
export function mapF14070ToFormState(row: any): {
	header: F14070Header;
	beneficiary: F14070Beneficiary;
	daily: F14070DailyRecords;
} {
	const weekDates: string[] = [];
	let year = '';
	for (let d = 1; d <= 7; d++) {
		const y = String(col(row, 'YYYY', d) ?? '').trim();
		const mm = pad2(col(row, 'MM', d));
		const dd = pad2(col(row, 'DD', d));
		if (y && !year) year = y;
		// 서식: "7 / 13" (앞에 0 없음, 슬래시 앞뒤 공백)
		weekDates.push(mm && dd ? `${Number(mm)} / ${Number(dd)}` : '');
	}
	if (!year) {
		const sv = row?.SVDT_01;
		if (sv) {
			const s = String(sv);
			year = s.slice(0, 4);
		}
	}

	let status: '와상' | '준와상' | '자립' = '준와상';
	if (f14070Checked(row?.ST_SP_ST1)) status = '와상';
	else if (f14070Checked(row?.ST_SP_ST3)) status = '자립';
	else if (f14070Checked(row?.ST_SP_ST2)) status = '준와상';

	const dentures =
		f14070Checked(row?.ST_MNG_DNT) ||
		f14070Checked(row?.ST_MNG_DNT_DSC1) ||
		f14070Checked(row?.ST_MNG_DNT_DSC2);

	const beneficiary: F14070Beneficiary = {
		status,
		dementia: f14070Checked(row?.ST_SCK_ALZ),
		stroke: f14070Checked(row?.ST_SCK_APO),
		hypertension: f14070Checked(row?.ST_SCK_HBL),
		diabetes: f14070Checked(row?.ST_SCK_GLY),
		arthritis: f14070Checked(row?.ST_SCK_ARTH),
		otherDisease: f14070Checked(row?.ST_SCK_GITA),
		otherDiseaseText: String(row?.ST_SCK_GITA_DSC ?? '').trim(),
		tracheostomy: f14070Checked(row?.ST_MNG_BRN),
		dentures,
		nasogastricTube: f14070Checked(row?.ST_MNG_LTUB),
		urinaryCatheter: f14070Checked(row?.ST_MNG_FIX_TUB),
		cystostomy: f14070Checked(row?.ST_MNG_CYS),
		urostomy: f14070Checked(row?.ST_MNG_URB),
		colostomy: f14070Checked(row?.ST_MNG_TOP),
		diaper: f14070Checked(row?.ST_MNG_DAP),
		pressureSore: f14070Checked(row?.ST_MNG_BAD),
		pressureSoreArea: String(row?.ST_MNG_BAD_DSC ?? '').trim(),
		pressureSorePrevention: f14070Checked(row?.ST_MNG_BCHK),
		pressureSorePreventionTool: String(row?.ST_MNG_BCHK_DSC ?? '').trim(),
		roomNo: String(row?.ROOM_NO ?? '').trim()
	};

	const daily: F14070DailyRecords = {
		grooming: empty7Bool(),
		bathTime: empty7(),
		bathMethod: empty7(),
		mealType: empty7(),
		mealIntake: empty7(),
		positionChange: empty7Bool(),
		toiletUsage: empty7(),
		movementAssistance: empty7Bool(),
		walk: empty7Bool(),
		outing: empty7Bool(),
		physicalActivityNotes: empty7(),
		physicalActivityPreparer: empty7(),
		cognitiveSupport: empty7Bool(),
		communicationSupport: empty7Bool(),
		cognitiveNotes: empty7(),
		cognitivePreparer: empty7(),
		vitalSigns: empty7(),
		healthManagement: empty7Bool(),
		healthTime: empty7(),
		nursingManagement: empty7Bool(),
		nursingTime: empty7(),
		emergencyService: empty7Bool(),
		healthNotes: empty7(),
		healthPreparer: empty7(),
		trainingProgram: empty7Bool(),
		physicalFunctionTraining: empty7Bool(),
		cognitiveTraining: empty7Bool(),
		physicalTherapy: empty7Bool(),
		trainingNotes: empty7(),
		trainingPreparer: empty7(),
		admissionDischargeTime: empty7()
	};

	for (let i = 0; i < 7; i++) {
		const d = i + 1; // F14070 _01 … _07
		daily.grooming[i] = f14070Checked(col(row, 'PH_HEAD_HELP', d));

		const bathTm = col(row, 'PH_BATH_TM', d);
		daily.bathTime[i] = bathTm != null && String(bathTm).trim() !== '' ? String(bathTm).trim() : '';

		// Usp_P14070: meth='2' → METH1(샤워식), 그 외(A/B/1/3 등) → METH2
		// F14020 목욕방법은 A/B 코드가 많아 대부분 METH2에 √ 가 들어감
		if (f14070Checked(col(row, 'PH_BATH_METH1', d))) daily.bathMethod[i] = '2';
		else if (f14070Checked(col(row, 'PH_BATH_METH2', d))) daily.bathMethod[i] = '1';
		else daily.bathMethod[i] = '';

		// 식사: KIND1=일반식, KIND2=죽, KIND3=그 외(유동식 등). VAL1=1, VAL2=1/2이상, VAL3=1/2미만
		if (f14070Checked(col(row, 'PH_MEAL_KIND1', d))) daily.mealType[i] = '일반식';
		else if (f14070Checked(col(row, 'PH_MEAL_KIND2', d))) daily.mealType[i] = '죽';
		else if (f14070Checked(col(row, 'PH_MEAL_KIND3', d))) daily.mealType[i] = '유동식(미음)';
		else daily.mealType[i] = '';

		if (f14070Checked(col(row, 'PH_MEAL_VAL1', d))) daily.mealIntake[i] = '1';
		else if (f14070Checked(col(row, 'PH_MEAL_VAL2', d))) daily.mealIntake[i] = '1/2이상';
		else if (f14070Checked(col(row, 'PH_MEAL_VAL3', d))) daily.mealIntake[i] = '1/2미만';
		else daily.mealIntake[i] = '';

		daily.positionChange[i] = f14070Checked(col(row, 'PH_CHANG_HELP', d));
		const tol = col(row, 'PH_TOL_CNT', d);
		daily.toiletUsage[i] = tol != null && String(tol).trim() !== '' ? String(tol).trim() : '';
		daily.movementAssistance[i] = f14070Checked(col(row, 'PH_MOVE_HELP', d));
		daily.walk[i] = f14070Checked(col(row, 'PH_WORK_HELP', d));
		daily.outing[i] = f14070Checked(col(row, 'PH_OUT_HELP', d));
		daily.physicalActivityNotes[i] = String(col(row, 'PH_PS', d) ?? '').trim();
		daily.physicalActivityPreparer[i] = String(col(row, 'PH_WRITE_NAME', d) ?? '').trim();

		daily.cognitiveSupport[i] = f14070Checked(col(row, 'RG_AID_HELP', d));
		daily.communicationSupport[i] = f14070Checked(col(row, 'RG_TALK_HELP', d));
		daily.cognitiveNotes[i] = String(col(row, 'RG_PS', d) ?? '').trim();
		daily.cognitivePreparer[i] = String(col(row, 'RG_WRITE_NAME', d) ?? '').trim();

		daily.vitalSigns[i] = String(col(row, 'NS_SBDP_TMPBD', d) ?? '').trim();
		daily.healthManagement[i] = f14070Checked(col(row, 'NS_HLTH_HELP', d));
		const hlthTm = col(row, 'NS_HLTH_TIME', d);
		daily.healthTime[i] = hlthTm != null && String(hlthTm).trim() !== '' ? String(hlthTm).trim() : '';
		daily.nursingManagement[i] = f14070Checked(col(row, 'NS_NRSE_HELP', d));
		const nrseTm = col(row, 'NS_NRSE_TIME', d);
		daily.nursingTime[i] = nrseTm != null && String(nrseTm).trim() !== '' ? String(nrseTm).trim() : '';
		daily.emergencyService[i] = f14070Checked(col(row, 'NS_ETC', d));
		daily.healthNotes[i] = String(col(row, 'NS_PS', d) ?? '').trim();
		daily.healthPreparer[i] = String(col(row, 'NS_WRITE_NAME', d) ?? '').trim();

		daily.trainingProgram[i] = f14070Checked(col(row, 'FN_COGN_HELP', d));
		daily.physicalFunctionTraining[i] = f14070Checked(col(row, 'FN_MOVE_HELP', d));
		daily.cognitiveTraining[i] = f14070Checked(col(row, 'FN_MIND_TRAIN', d));
		daily.physicalTherapy[i] = f14070Checked(col(row, 'FN_PHY_HELP', d));
		daily.trainingNotes[i] = String(col(row, 'FN_PS', d) ?? '').trim();
		daily.trainingPreparer[i] = String(col(row, 'FN_WRITE_NAME', d) ?? '').trim();

		daily.admissionDischargeTime[i] = String(col(row, 'IO_TM_INFO', d) ?? '').trim();
	}

	const header: F14070Header = {
		name: String(row?.P_NM ?? '').trim(),
		birthDate: String(row?.P_BRDT ?? '').trim().slice(0, 10),
		gradeLabel: String(row?.P_GRD_NM ?? '').trim(),
		certNo: String(row?.P_YYNO ?? '').trim(),
		institutionName: String(row?.ANNM ?? '').trim() || '너싱홈 해원',
		institutionCode: String(row?.ANGH ?? '').trim() || '14161000067',
		roomNo: beneficiary.roomNo,
		year: year || String(new Date().getFullYear()),
		weekDates
	};

	return { header, beneficiary, daily };
}
