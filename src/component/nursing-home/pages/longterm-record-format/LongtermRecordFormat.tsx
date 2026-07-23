"use client";

import { useEffect, useMemo, useState } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { resolveBathMethodFromRow } from '../../utils/physicalActivityFields';
import {
	applyNursingBaselineToAllDays,
	applyNursingFieldsToDay,
	formatVitalSignsFromRow
} from '../../utils/nursingFields';
import { mapF14070ToFormState } from './mapF14070';

interface MemberData {
	[key: string]: any;
}

function toYmd(d: Date) {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(base: Date) {
	const d = new Date(base);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay(); // 0=일 … 6=토
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return d;
}

const empty7 = () => ['', '', '', '', '', '', ''];
const empty7Bool = () => [false, false, false, false, false, false, false];

const MEAL_KIND_TO_LABEL: Record<string, string> = {
	'1': '일반식',
	'2': '죽',
	'3': '유동식(미음)',
	'4': '유동식(미음)',
	'5': '일반식',
	'6': '일반식',
	'7': '죽'
};
const MEAL_VAL_TO_LABEL: Record<string, string> = {
	'1': '1',
	'2': '1/2이상',
	'3': '1/2미만'
};

const ynToFlag = (v: unknown): '1' | '0' => {
	const s = String(v ?? '').trim().toLowerCase();
	if (s === '1' || s === 'y' || s === 'true') return '1';
	return '0';
};

const ynChecked = (v: unknown) => ynToFlag(v) === '1';

const toStatusLabel = (v: unknown): '와상' | '준와상' | '자립' => {
	const s = String(v ?? '').trim();
	if (s === '1' || s === '와상') return '와상';
	if (s === '3' || s === '자립') return '자립';
	return '준와상';
};

const resolveDenturesChecked = (dnt: unknown, dntDsc: unknown) => {
	const type = String(dntDsc ?? '').trim();
	return ynChecked(dnt) || type === '1' || type === '2';
};

const mealKindLabel = (row: any) => {
	const label = String(row?.PH_MEAL_KIND_NM ?? '').trim();
	if (label) return label.replace('유동식', '유동식(미음)');
	const code = String(row?.PH_MEAL_KIND ?? '').trim();
	return MEAL_KIND_TO_LABEL[code] ?? '';
};

const mealIntakeLabel = (row: any) => {
	const label = String(row?.PH_MEAL_VAL_NM ?? '').trim();
	if (label) return label;
	const code = String(row?.PH_MEAL_VAL ?? '').trim();
	return MEAL_VAL_TO_LABEL[code] ?? '';
};

const formatVitalSigns = formatVitalSignsFromRow;

const hasFieldValue = (v: unknown) => v != null && String(v).trim() !== '';

const mergeRowsByLatestField = (rows: any[]): any | null => {
	const sorted = [...rows]
		.filter(Boolean)
		.sort((a, b) => new Date(String(b?.INDT ?? 0)).getTime() - new Date(String(a?.INDT ?? 0)).getTime());
	if (sorted.length === 0) return null;

	const merged: Record<string, any> = { ...sorted[0] };
	const keys = new Set<string>();
	sorted.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));

	keys.forEach((key) => {
		if (key === 'INDT' || key === 'PNUM' || key === 'ANCD' || key === 'rn') return;
		for (const row of sorted) {
			if (hasFieldValue(row[key])) {
				merged[key] = row[key];
				return;
			}
		}
	});

	return merged;
};

const createEmptyDailyRecords = () => ({
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
	nursingManagement: empty7Bool(),
	emergencyService: empty7Bool(),
	healthNotes: empty7(),
	healthPreparer: empty7(),
	trainingProgram: empty7(),
	physicalFunctionTraining: empty7Bool(),
	cognitiveTraining: empty7Bool(),
	physicalTherapy: empty7Bool(),
	trainingNotes: empty7(),
	trainingPreparer: empty7(),
	admissionDischargeTime: empty7()
});

type DailyRecords = ReturnType<typeof createEmptyDailyRecords>;

const dayIndexInWeek = (indt: unknown, weekStart: Date) => {
	if (!indt) return -1;
	const d = new Date(String(indt));
	if (Number.isNaN(d.getTime())) return -1;
	d.setHours(0, 0, 0, 0);
	const start = new Date(weekStart);
	start.setHours(0, 0, 0, 0);
	const diff = Math.round((d.getTime() - start.getTime()) / 86400000);
	return diff >= 0 && diff < 7 ? diff : -1;
};

const mapPhysicalActivityFromRow = (row: any, idx: number, records: DailyRecords, merge = false) => {
	const setField = (has: boolean, apply: () => void) => {
		if (!merge || has) apply();
	};

	setField(hasFieldValue(row?.PH_HEAD_HELP), () => {
		records.grooming[idx] = ynChecked(row?.PH_HEAD_HELP);
	});
	setField(hasFieldValue(row?.PH_BATH_TM) || hasFieldValue(row?.BATH_SPV_TM), () => {
		records.bathTime[idx] = String(row?.PH_BATH_TM ?? row?.BATH_SPV_TM ?? '').trim();
	});
	setField(hasFieldValue(row?.PH_MEAL_KIND) || hasFieldValue(row?.PH_MEAL_KIND_NM), () => {
		records.mealType[idx] = mealKindLabel(row);
	});
	setField(hasFieldValue(row?.PH_MEAL_VAL) || hasFieldValue(row?.PH_MEAL_VAL_NM), () => {
		records.mealIntake[idx] = mealIntakeLabel(row);
	});
	setField(hasFieldValue(row?.PH_CHANG_HELP), () => {
		records.positionChange[idx] = ynChecked(row?.PH_CHANG_HELP);
	});
	setField(hasFieldValue(row?.PH_TOL_CNT), () => {
		records.toiletUsage[idx] = String(row?.PH_TOL_CNT ?? '').trim();
	});
	setField(hasFieldValue(row?.PH_MOVE_HELP), () => {
		records.movementAssistance[idx] = ynChecked(row?.PH_MOVE_HELP);
	});
	setField(hasFieldValue(row?.PH_WORK_HELP), () => {
		records.walk[idx] = ynChecked(row?.PH_WORK_HELP);
	});
	setField(hasFieldValue(row?.PH_OUT_HELP), () => {
		records.outing[idx] = ynChecked(row?.PH_OUT_HELP);
	});
	setField(hasFieldValue(row?.PH_VIEW), () => {
		records.physicalActivityNotes[idx] = String(row?.PH_VIEW ?? '').trim();
	});
	setField(hasFieldValue(row?.PH_WRITE_NAME) || hasFieldValue(row?.INEMPNM), () => {
		records.physicalActivityPreparer[idx] = String(row?.PH_WRITE_NAME ?? row?.INEMPNM ?? '').trim();
	});
};

const mapCognitiveFromRow = (row: any, idx: number, records: DailyRecords) => {
	records.cognitiveSupport[idx] = ynChecked(row?.RG_AID_HELP);
	records.communicationSupport[idx] = ynChecked(row?.RG_TALK_HELP);
	records.cognitiveNotes[idx] = String(row?.RG_VIEW ?? '').trim();
	records.cognitivePreparer[idx] = String(row?.RG_WRITE_NAME ?? '').trim();
};

const mapNursingFromRow = (row: any, idx: number, records: DailyRecords, merge = false) => {
	applyNursingFieldsToDay(row, idx, records, merge);
};

const mapTrainingFromRow = (row: any, idx: number, records: DailyRecords) => {
	records.trainingProgram[idx] = ynChecked(row?.FN_COGN_HELP) ? '실시' : '';
	records.physicalFunctionTraining[idx] = ynChecked(row?.FN_MOVE_HELP);
	records.cognitiveTraining[idx] = ynChecked(row?.FN_MIND_TRAIN ?? row?.FN_MIND_HELP);
	records.physicalTherapy[idx] = ynChecked(row?.FN_PHY_HELP);
	records.trainingNotes[idx] = String(row?.FN_VIEW ?? '').trim();
	records.trainingPreparer[idx] = String(row?.FN_WRITE_NAME ?? '').trim();
};

const applyBaselineToAllDays = (baselineRow: any, records: DailyRecords) => {
	for (let i = 0; i < 7; i++) {
		mapPhysicalActivityFromRow(baselineRow, i, records);
		mapCognitiveFromRow(baselineRow, i, records);
		mapNursingFromRow(baselineRow, i, records);
		mapTrainingFromRow(baselineRow, i, records);
	}
};

const applyBathMethodToAllDays = (row: any, records: DailyRecords) => {
	const bathCode = resolveBathMethodFromRow(row);
	for (let i = 0; i < 7; i++) {
		records.bathMethod[i] = bathCode;
	}
};

const buildDailyRecords = (baselineRow: any | null, rangeRows: any[], weekStart: Date) => {
	const records = createEmptyDailyRecords();
	const mergedBaseline = mergeRowsByLatestField([baselineRow, ...rangeRows].filter(Boolean));
	if (mergedBaseline) applyBaselineToAllDays(mergedBaseline, records);

	if (baselineRow) applyBathMethodToAllDays(baselineRow, records);
	if (baselineRow) applyNursingBaselineToAllDays(baselineRow, records);

	const byDay = new Map<number, any>();
	rangeRows.forEach((row) => {
		const idx = dayIndexInWeek(row?.INDT, weekStart);
		if (idx < 0) return;
		const existing = byDay.get(idx);
		if (!existing || new Date(String(row.INDT)) > new Date(String(existing.INDT))) {
			byDay.set(idx, row);
		}
	});
	byDay.forEach((row, idx) => {
		mapPhysicalActivityFromRow(row, idx, records, true);
		mapCognitiveFromRow(row, idx, records);
		mapNursingFromRow(row, idx, records, true);
		mapTrainingFromRow(row, idx, records);
		const bathCode = resolveBathMethodFromRow(row);
		if (bathCode) records.bathMethod[idx] = bathCode;
	});
	return records;
};

const applyBeneficiaryFromRow = (row: any, applyLegacy: (raw: unknown) => void) => {
	const hasDirect =
		row?.ST_SP_ST != null ||
		row?.ST_SCK_ALZ != null ||
		row?.ST_MNG_BRN != null;

	if (hasDirect) {
		return {
			status: toStatusLabel(row?.ST_SP_ST),
			dementia: ynChecked(row?.ST_SCK_ALZ),
			stroke: ynChecked(row?.ST_SCK_APO),
			hypertension: ynChecked(row?.ST_SCK_HBL),
			diabetes: ynChecked(row?.ST_SCK_GLY),
			arthritis: ynChecked(row?.ST_SCK_ARTH),
			otherDisease: ynChecked(row?.ST_SCK_GITA),
			otherDiseaseText: String(row?.ST_SCK_GITA_DSC ?? '').trim(),
			tracheostomy: ynChecked(row?.ST_MNG_BRN),
			dentures: resolveDenturesChecked(row?.ST_MNG_DNT, row?.ST_MNG_DNT_DSC),
			nasogastricTube: ynChecked(row?.ST_MNG_LTUB),
			urinaryCatheter: ynChecked(row?.ST_MNG_FIX_TUB),
			cystostomy: ynChecked(row?.ST_MNG_CYS),
			urostomy: ynChecked(row?.ST_MNG_URB),
			colostomy: ynChecked(row?.ST_MNG_TOP),
			diaper: ynChecked(row?.ST_MNG_DAP),
			pressureSore: ynChecked(row?.ST_MNG_BAD),
			pressureSoreArea: String(row?.ST_MNG_BAD_DSC ?? '').trim(),
			pressureSorePrevention: ynChecked(row?.ST_MNG_BCHK),
			pressureSorePreventionTool: String(row?.ST_MNG_BCHK_DSC ?? '').trim(),
			roomNo: String(row?.ROOM_NO ?? '').trim()
		};
	}

	applyLegacy(row?.RG_JSON ?? row?.RG_ETC_DESC ?? row?.NS_ETC_DESC);
	return null;
};

export default function LongtermRecordFormat() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const selectedPnum = useMemo(() => String(selectedMember?.PNUM ?? '').trim(), [selectedMember]);

	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [weekDates, setWeekDates] = useState<string[]>([]);
	const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
	const [loading, setLoading] = useState(false);

	const [headerInfo, setHeaderInfo] = useState({
		name: '',
		birthDate: '',
		gradeLabel: '',
		certNo: '',
		institutionName: '너싱홈 해원',
		institutionCode: '14161000067',
		roomNo: ''
	});

	const [status, setStatus] = useState<'와상' | '준와상' | '자립'>('준와상');
	const [dementia, setDementia] = useState(false);
	const [stroke, setStroke] = useState(false);
	const [hypertension, setHypertension] = useState(false);
	const [diabetes, setDiabetes] = useState(false);
	const [arthritis, setArthritis] = useState(false);
	const [otherDisease, setOtherDisease] = useState(false);
	const [otherDiseaseText, setOtherDiseaseText] = useState('');
	const [tracheostomy, setTracheostomy] = useState(false);
	const [dentures, setDentures] = useState(false);
	const [nasogastricTube, setNasogastricTube] = useState(false);
	const [urinaryCatheter, setUrinaryCatheter] = useState(false);
	const [cystostomy, setCystostomy] = useState(false);
	const [urostomy, setUrostomy] = useState(false);
	const [colostomy, setColostomy] = useState(false);
	const [diaper, setDiaper] = useState(false);
	const [pressureSore, setPressureSore] = useState(false);
	const [pressureSoreArea, setPressureSoreArea] = useState('');
	const [pressureSorePrevention, setPressureSorePrevention] = useState(false);
	const [pressureSorePreventionTool, setPressureSorePreventionTool] = useState('');
	const [roomNo, setRoomNo] = useState('');

	const [dailyRecords, setDailyRecords] = useState(createEmptyDailyRecords);

	const calculateWeekDates = (start: Date) => {
		const monday = startOfWeekMonday(start);
		const dates: string[] = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(monday);
			date.setDate(monday.getDate() + i);
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			dates.push(`${month}/${day}`);
		}
		setWeekDates(dates);
		setYear(String(monday.getFullYear()));
	};

	const weekDatesFromMonday = (monday: Date) => {
		const dates: string[] = [];
		const start = new Date(monday);
		start.setHours(0, 0, 0, 0);
		for (let i = 0; i < 7; i++) {
			const date = new Date(start);
			date.setDate(start.getDate() + i);
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			dates.push(`${month}/${day}`);
		}
		return dates;
	};

	const applyLegacyBeneficiaryJson = (raw: unknown) => {
		if (!raw) return;
		try {
			const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
			if (!j || typeof j !== 'object') return;

			const m = (j as any).beneficiaryStatus ?? j;
			if (m.status === '와상' || m.status === '준와상' || m.status === '자립') setStatus(m.status);
			if (typeof m.dementia === 'boolean') setDementia(m.dementia);
			if (typeof m.stroke === 'boolean') setStroke(m.stroke);
			if (typeof m.hypertension === 'boolean') setHypertension(m.hypertension);
			if (typeof m.diabetes === 'boolean') setDiabetes(m.diabetes);
			if (typeof m.arthritis === 'boolean') setArthritis(m.arthritis);
			if (typeof m.otherDisease === 'boolean') setOtherDisease(m.otherDisease);
			if (typeof m.otherDiseaseText === 'string') setOtherDiseaseText(m.otherDiseaseText);
			if (typeof m.tracheostomy === 'boolean') setTracheostomy(m.tracheostomy);
			if (typeof m.dentures === 'boolean') setDentures(m.dentures);
			if (typeof m.nasogastricTube === 'boolean') setNasogastricTube(m.nasogastricTube);
			if (typeof m.urinaryCatheter === 'boolean') setUrinaryCatheter(m.urinaryCatheter);
			if (typeof m.cystostomy === 'boolean') setCystostomy(m.cystostomy);
			if (typeof m.urostomy === 'boolean') setUrostomy(m.urostomy);
			if (typeof m.colostomy === 'boolean') setColostomy(m.colostomy);
			if (typeof m.diaper === 'boolean') setDiaper(m.diaper);
			if (typeof m.pressureSore === 'boolean') setPressureSore(m.pressureSore);
			if (typeof m.pressureSoreArea === 'string') setPressureSoreArea(m.pressureSoreArea);
			if (typeof m.pressureSorePrevention === 'boolean') setPressureSorePrevention(m.pressureSorePrevention);
			if (typeof m.pressureSorePreventionTool === 'string') setPressureSorePreventionTool(m.pressureSorePreventionTool);
		} catch {
			// ignore parse errors
		}
	};

	const applyBeneficiaryState = (state: {
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
	}) => {
		setStatus(state.status);
		setDementia(state.dementia);
		setStroke(state.stroke);
		setHypertension(state.hypertension);
		setDiabetes(state.diabetes);
		setArthritis(state.arthritis);
		setOtherDisease(state.otherDisease);
		setOtherDiseaseText(state.otherDiseaseText);
		setTracheostomy(state.tracheostomy);
		setDentures(state.dentures);
		setNasogastricTube(state.nasogastricTube);
		setUrinaryCatheter(state.urinaryCatheter);
		setCystostomy(state.cystostomy);
		setUrostomy(state.urostomy);
		setColostomy(state.colostomy);
		setDiaper(state.diaper);
		setPressureSore(state.pressureSore);
		setPressureSoreArea(state.pressureSoreArea);
		setPressureSorePrevention(state.pressureSorePrevention);
		setPressureSorePreventionTool(state.pressureSorePreventionTool);
		setRoomNo(state.roomNo);
	};

	const resetBeneficiaryDefaults = () => {
		setStatus('준와상');
		setDementia(false);
		setStroke(false);
		setHypertension(false);
		setDiabetes(false);
		setArthritis(false);
		setOtherDisease(false);
		setOtherDiseaseText('');
		setTracheostomy(false);
		setDentures(false);
		setNasogastricTube(false);
		setUrinaryCatheter(false);
		setCystostomy(false);
		setUrostomy(false);
		setColostomy(false);
		setDiaper(false);
		setPressureSore(false);
		setPressureSoreArea('');
		setPressureSorePrevention(false);
		setPressureSorePreventionTool('');
		setRoomNo('');
		setHeaderInfo({
			name: '',
			birthDate: '',
			gradeLabel: '',
			certNo: '',
			institutionName: '너싱홈 해원',
			institutionCode: '14161000067',
			roomNo: ''
		});
	};

	/** 조회: Usp_P14070로 F14070 갱신 후, 해당 수급자 F14070 행으로 화면/출력 데이터 구성 */
	const loadRecordData = async (pnum: string, start: Date) => {
		if (!pnum) {
			resetBeneficiaryDefaults();
			setDailyRecords(createEmptyDailyRecords());
			return;
		}
		setLoading(true);
		resetBeneficiaryDefaults();
		setDailyRecords(createEmptyDailyRecords());
		try {
			const monday = startOfWeekMonday(start);
			const frDt = toYmd(monday);

			const genRes = await fetch('/api/f14070', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ frDt })
			});
			const genJson = await genRes.json().catch(() => ({}));
			if (!genJson?.success) {
				alert(genJson?.error || 'F14070(Usp_P14070) 생성에 실패했습니다.');
				return;
			}

			const getRes = await fetch(`/api/f14070?pnum=${encodeURIComponent(pnum)}`);
			const getJson = await getRes.json().catch(() => ({}));
			if (!getJson?.success) {
				alert(getJson?.error || 'F14070 조회에 실패했습니다.');
				return;
			}

			const row =
				Array.isArray(getJson.data) && getJson.data.length > 0 ? getJson.data[0] : null;
			if (!row) {
				alert('선택한 수급자의 F14070 데이터가 없습니다. 기준일을 확인해 주세요.');
				return;
			}

			const mapped = mapF14070ToFormState(row);
			const fallbackDates = weekDatesFromMonday(monday);
			const dates = mapped.header.weekDates.some((d) => d)
				? mapped.header.weekDates.map((d, i) => d || fallbackDates[i] || '')
				: fallbackDates;

			setYear(mapped.header.year || String(monday.getFullYear()));
			setWeekDates(dates);
			setHeaderInfo({
				name: mapped.header.name || String(selectedMember?.P_NM ?? '').trim(),
				birthDate:
					mapped.header.birthDate ||
					(selectedMember?.P_BRDT ? String(selectedMember.P_BRDT).substring(0, 10) : ''),
				gradeLabel:
					mapped.header.gradeLabel || formatCareGradeLabel(selectedMember?.P_GRD, ''),
				certNo:
					mapped.header.certNo ||
					String(selectedMember?.P_CERTNO ?? selectedMember?.P_YYNO ?? '').trim(),
				institutionName: mapped.header.institutionName,
				institutionCode: mapped.header.institutionCode,
				roomNo: mapped.header.roomNo
			});
			applyBeneficiaryState(mapped.beneficiary);
			setDailyRecords(mapped.daily);
		} catch (e) {
			console.error('F14070 조회/생성 오류:', e);
			alert('기록양식 정보를 불러오는 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const ltFormCss = `
		.lt-sheet.lt-form table { width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; }
		.lt-sheet.lt-form td, .lt-sheet.lt-form th {
			border: 1px solid #000;
			padding: 2px 4px;
			vertical-align: middle;
			font-weight: normal;
			color: #000;
			box-sizing: border-box;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.lt-sheet.lt-form .lt-right { text-align: right; }
		.lt-sheet.lt-form .lt-center { text-align: center; }
		.lt-sheet.lt-form .lt-left { text-align: left; }
		.lt-sheet.lt-form .lt-bold { font-weight: 700; }
		.lt-sheet.lt-form .lt-title {
			font-size: 15pt;
			font-weight: 800;
			text-align: center;
			margin: 4px 0 8px 0;
		}
		.lt-sheet.lt-form .lt-law {
			font-size: 8.5pt;
			margin-bottom: 2px;
		}
		.lt-sheet.lt-form .lt-front {
			font-size: 8.5pt;
			text-align: right;
			margin-bottom: 4px;
		}
		.lt-sheet.lt-form .lbl { font-weight: 700; text-align: center; }
		.lt-sheet.lt-form .tight { padding: 3px 4px; }
		.lt-sheet.lt-form .val-bold { font-weight: 700; }
		.lt-sheet.lt-form .cb {
			display: inline-block;
			width: 10px;
			height: 10px;
			border: 1px solid #000;
			vertical-align: middle;
			margin-right: 3px;
			box-sizing: border-box;
		}
		.lt-sheet.lt-form .cb.checked { background: #000; }
		.lt-sheet.lt-form .cb-group { display: inline-block; margin-right: 10px; white-space: nowrap; }
		.lt-sheet.lt-form .split-top { display: flex; align-items: center; min-height: 26px; }
		.lt-sheet.lt-form .split-left { flex: 1; padding-right: 6px; border-right: 1px solid #000; margin-right: 6px; }
		.lt-sheet.lt-form .split-right { flex: 1; }
		.lt-sheet.lt-form .rec .cat {
			width: 22px;
			writing-mode: vertical-rl;
			text-orientation: upright;
			vertical-align: top;
			text-align: center;
			font-weight: 700;
			font-size: 8.5pt;
			line-height: 1.35;
			letter-spacing: 0.06em;
			padding-top: 2px;
		}
		.lt-sheet.lt-form .rec .cat .cat-label {
			display: inline-block;
		}
		.lt-sheet.lt-form .rec .grp { width: 34px; text-align: center; font-weight: 700; font-size: 8pt; vertical-align: middle; }
		.lt-sheet.lt-form .rec .sub { font-size: 8pt; text-align: left; line-height: 1.15; }
		.lt-sheet.lt-form .rec .day { font-size: 8pt; text-align: center; }
		.lt-sheet.lt-form .rec .tiny { font-size: 7.5pt; line-height: 1.1; }
		.lt-sheet.lt-form .rec .optcol { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
		.lt-sheet.lt-form .rec .sig { font-size: 8pt; text-align: center; }
		.lt-sheet.lt-form .rec .sig-r { font-size: 8pt; text-align: right; }
		.lt-sheet.lt-form .lt-footer { margin-top: 4px; font-size: 8pt; text-align: right; }
	`;

	/** 화면과 동일하게 보이도록 같은 문서에서 인쇄 (별도 창은 Tailwind 미적용·스타일 불일치 발생) */
	const ltPrintLayoutCss = `
		@media print {
			@page {
				size: A4 portrait;
				margin: 10mm;
			}
			html, body {
				background: #fff !important;
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
			.lt-no-print {
				display: none !important;
			}
			.lt-longterm-root {
				min-height: 0 !important;
			}
			.lt-longterm-page {
				max-width: none !important;
				padding: 0 !important;
				margin: 0 !important;
			}
			.lt-longterm-card {
				border: none !important;
				box-shadow: none !important;
				border-radius: 0 !important;
				background: #fff !important;
			}
			.lt-longterm-sheet-wrap {
				padding: 0 !important;
				overflow: visible !important;
			}
			.lt-sheet.lt-form {
				max-width: 210mm !important;
				margin-left: auto !important;
				margin-right: auto !important;
			}
			.lt-sheet.lt-form .cb,
			.lt-sheet.lt-form .cb.checked {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
		}
	`;

	const handlePrint = () => {
		if (typeof window === 'undefined') return;
		requestAnimationFrame(() => {
			window.print();
		});
	};

	useEffect(() => {
		calculateWeekDates(weekStart);
	}, [weekStart]);

	useEffect(() => {
		void loadRecordData(selectedPnum, weekStart);
	}, [selectedPnum, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

	const vitalDisplay = (i: number) => {
		const v = dailyRecords.vitalSigns[i]?.trim();
		return v || <span className="tiny lt-center">/</span>;
	};

return (
		<div className="lt-longterm-root min-h-screen text-black bg-white">
			<style dangerouslySetInnerHTML={{ __html: ltFormCss }} />
			<style dangerouslySetInnerHTML={{ __html: ltPrintLayoutCss }} />

			<div className="lt-longterm-page mx-auto max-w-[1800px] p-4">
				<div className="flex gap-4">
					<aside className="lt-no-print w-1/3 shrink-0">
						<MemberListPanel
							onSelectMember={(m) => { setSelectedMember(m); }}
						/>
					</aside>

					<section className="flex-1">
						<div className="lt-longterm-card bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="lt-no-print flex justify-end px-4 py-3 bg-blue-100 border-b border-blue-200">
								<div className="mr-auto flex items-center gap-2 text-sm text-blue-900">
									<span className="font-semibold">기준일(주 시작·월)</span>
									<input
										type="date"
										value={toYmd(weekStart)}
										onChange={(e) => {
											const v = e.target.value;
											if (!v) return;
											const d = new Date(`${v}T00:00:00`);
											setWeekStart(startOfWeekMonday(d));
										}}
										className="rounded border border-blue-300 bg-white px-2 py-1"
									/>
									<button
										type="button"
										onClick={() => void loadRecordData(selectedPnum, weekStart)}
										disabled={!selectedPnum || loading}
										className="px-3 py-1 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										조회
									</button>
									{loading && <span className="text-blue-900/70">불러오는 중...</span>}
								</div>
								<button
									type="button"
									onClick={handlePrint}
									className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
								>
									출력
								</button>
							</div>

							<div className="relative">
							<div
								className={`lt-longterm-sheet-wrap p-4 overflow-x-auto ${
									!selectedMember ? 'blur-sm select-none pointer-events-none opacity-70' : ''
								}`}
							>
								<div className="lt-sheet lt-form max-w-[210mm] mx-auto bg-white">
									<div className="lt-law">■ 노인장기요양보험법 시행규칙 [별지 제16호서식] &lt;개정 2019. 9. 27.&gt;</div>
									<div className="lt-front">(앞쪽)</div>
									<div className="lt-title">장기요양급여 제공기록지(시설급여/단기보호)</div>

									<table className="lt-info">
										<tbody>
											<tr>
												<td className="lbl tight" style={{ width: '11%' }}>수급자 성명</td>
												<td className="lt-left val-bold" style={{ width: '14%' }}>
													{headerInfo.name || String(selectedMember?.P_NM ?? '').trim()}
												</td>
												<td className="lbl tight" style={{ width: '11%' }}>생년월일</td>
												<td className="lt-center val-bold" style={{ width: '14%' }}>
													{headerInfo.birthDate ||
														(selectedMember?.P_BRDT
															? String(selectedMember.P_BRDT).substring(0, 10)
															: '')}
												</td>
												<td className="lbl tight" style={{ width: '11%' }}>장기요양등급</td>
												<td className="lt-center val-bold" style={{ width: '10%' }}>
													{headerInfo.gradeLabel ||
														formatCareGradeLabel(selectedMember?.P_GRD, '')}
												</td>
												<td className="lbl tight" style={{ width: '13%' }}>장기요양인정번호</td>
												<td className="lt-center val-bold" style={{ width: '16%' }}>
													{headerInfo.certNo ||
														String(
															selectedMember?.P_CERTNO ?? selectedMember?.P_YYNO ?? ''
														).trim()}
												</td>
											</tr>
											<tr>
												<td className="lbl tight">장기요양기관명</td>
												<td className="lt-left val-bold" colSpan={3}>
													{headerInfo.institutionName || '너싱홈 해원'}
												</td>
												<td className="lbl tight">장기요양기관기호</td>
												<td className="lt-center val-bold">
													{headerInfo.institutionCode || '14161000067'}
												</td>
												<td className="lbl tight">침실</td>
												<td className="lt-center val-bold">
													{roomNo ||
														headerInfo.roomNo ||
														String(selectedMember?.P_ROOM ?? '').trim()}
												</td>
											</tr>
										</tbody>
									</table>

									<table style={{ marginTop: '6px' }}>
										<tbody>
											<tr>
												<td className="lbl lt-center" rowSpan={4} style={{ width: '28px' }}>
													수급자
													<br />
													상태
												</td>
												<td colSpan={2} style={{ padding: 0 }}>
													<div className="split-top">
														<div className="split-left lt-left">
															<span className="cb-group">
																<span className={`cb ${status === '와상' ? 'checked' : ''}`} />
																와상
															</span>
															<span className="cb-group">
																<span className={`cb ${status === '준와상' ? 'checked' : ''}`} />
																준와상
															</span>
															<span className="cb-group">
																<span className={`cb ${status === '자립' ? 'checked' : ''}`} />
																자립
															</span>
														</div>
														<div className="split-right lt-left">
															<span className="cb-group">
																<span className={`cb ${dementia ? 'checked' : ''}`} />
																치매
															</span>
															<span className="cb-group">
																<span className={`cb ${stroke ? 'checked' : ''}`} />
																중풍
															</span>
															<span className="cb-group">
																<span className={`cb ${hypertension ? 'checked' : ''}`} />
																고혈압
															</span>
															<span className="cb-group">
																<span className={`cb ${diabetes ? 'checked' : ''}`} />
																당뇨
															</span>
															<span className="cb-group">
																<span className={`cb ${arthritis ? 'checked' : ''}`} />
																관절염
															</span>
															<span className="cb-group">
																<span className={`cb ${otherDisease ? 'checked' : ''}`} />
																기타({String(otherDiseaseText ?? '').trim()})
															</span>
														</div>
													</div>
												</td>
											</tr>
											<tr>
												<td className="lt-left" colSpan={2}>
													<span className="cb-group">
														<span className={`cb ${tracheostomy ? 'checked' : ''}`} />
														기관지절개관
													</span>
													<span className="cb-group">
														<span className={`cb ${dentures ? 'checked' : ''}`} />
														틀니(부분/전체)
													</span>
													<span className="cb-group">
														<span className={`cb ${nasogastricTube ? 'checked' : ''}`} />
														비위관(鼻胃管, L-tube)
													</span>
													<span className="cb-group">
														<span className={`cb ${urinaryCatheter ? 'checked' : ''}`} />
														고정소변배출관(유치도뇨관)
													</span>
												</td>
											</tr>
											<tr>
												<td className="lt-left" colSpan={2}>
													<span className="cb-group">
														<span className={`cb ${cystostomy ? 'checked' : ''}`} />
														방광루
													</span>
													<span className="cb-group">
														<span className={`cb ${urostomy ? 'checked' : ''}`} />
														요루(요도샛길)
													</span>
													<span className="cb-group">
														<span className={`cb ${colostomy ? 'checked' : ''}`} />
														장루(창자샛길)
													</span>
													<span className="cb-group">
														<span className={`cb ${diaper ? 'checked' : ''}`} />
														기저귀
													</span>
												</td>
											</tr>
											<tr>
												<td className="lt-left" colSpan={2}>
													<span className="cb-group">
														<span className={`cb ${pressureSore ? 'checked' : ''}`} />
														욕창(부위: {String(pressureSoreArea ?? '').trim()})
													</span>
													<span className="cb-group">
														<span className={`cb ${pressureSorePrevention ? 'checked' : ''}`} />
														욕창방지 보조도구({String(pressureSorePreventionTool ?? '').trim()})
													</span>
												</td>
											</tr>
										</tbody>
									</table>

									<table className="rec" style={{ marginTop: '6px' }}>
										<thead>
											<tr>
												<th className="lt-center" style={{ width: '22px' }} rowSpan={2} />
												<th className="lt-center lbl" colSpan={2} rowSpan={2} style={{ width: 'auto' }}>
													구분
												</th>
												<th className="lt-center lbl" colSpan={7}>
													({year})년&nbsp;&nbsp;월/일
												</th>
											</tr>
											<tr>
												{weekDates.map((d, i) => (
													<th key={i} className="day hdr">
														{d}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											<tr>
												<td className="cat" rowSpan={11}>
													신체활동지원
												</td>
												<td className="sub" colSpan={2}>
													세면, 구강, 머리감기, 몸단장, 옷 갈아입히기
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.grooming[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="grp" rowSpan={2}>
													목욕
												</td>
												<td className="sub">소요시간</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{dailyRecords.bathTime[i] ? `${dailyRecords.bathTime[i]} 분` : '분'}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub">방법</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.bathMethod[i] === '1' ? 'checked' : ''}`} />
																전신입욕
															</div>
															<div>
																<span className={`cb ${dailyRecords.bathMethod[i] === '2' ? 'checked' : ''}`} />
																샤워식
															</div>
															<div>
																<span className={`cb ${dailyRecords.bathMethod[i] === '3' ? 'checked' : ''}`} />
																침상목욕
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="grp" rowSpan={2}>
													식사
												</td>
												<td className="sub">종류</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.mealType[i] === '일반식' ? 'checked' : ''}`} />
																일반식
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealType[i] === '죽' ? 'checked' : ''}`} />
																죽
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealType[i] === '유동식(미음)' || dailyRecords.mealType[i] === '유동식' ? 'checked' : ''}`} />
																유동식(미음)
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="sub">섭취량</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.mealIntake[i] === '1' ? 'checked' : ''}`} />
																1
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealIntake[i] === '1/2이상' ? 'checked' : ''}`} />
																1/2이상
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealIntake[i] === '1/2미만' ? 'checked' : ''}`} />
																1/2미만
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													체위변경 (2시간마다)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.positionChange[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													화장실이용하기 (기저귀 교환)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{dailyRecords.toiletUsage[i] ? `${dailyRecords.toiletUsage[i]} 회` : '회'}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													이동도움 및 신체 기능유지 · 증진
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.movementAssistance[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													산책(외출)동행
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.walk[i] ? 'checked' : ''}`} />
																산책
															</div>
															<div>
																<span className={`cb ${dailyRecords.outing[i] ? 'checked' : ''}`} />
																외출
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left" style={{ minHeight: '22px' }}>
														{dailyRecords.physicalActivityNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig">
														<span className="tiny">{dailyRecords.physicalActivityPreparer[i] || '\u00a0'}</span>
														<br />
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="cat" rowSpan={4}>
													인지 관리 및 의사 소통
												</td>
												<td className="sub" colSpan={2}>
													인지관리지원
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.cognitiveSupport[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													의사소통도움 등 말벗, 격려
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.communicationSupport[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.cognitiveNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig">
														<span className="tiny">{dailyRecords.cognitivePreparer[i] || '\u00a0'}</span>
														<br />
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="cat" rowSpan={6}>
													<span className="cat-label">건강 및 간호 관리</span>
												</td>
												<td className="sub" colSpan={2}>
													혈압/체온
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{vitalDisplay(i)}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													건강관리( 분)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.healthManagement[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													간호관리( 분)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.nursingManagement[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													기타(응급서비스)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.emergencyService[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.healthNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig-r">
														<span className="tiny">{dailyRecords.healthPreparer[i] || '\u00a0'}</span>{' '}
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="cat" rowSpan={6}>
													기능회복훈련
												</td>
												<td className="sub" colSpan={2}>
													신체 · 인지기능 향상 프로그램
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.trainingProgram[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													신체기능 · 기본동작, 일상생활동작훈련
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.physicalFunctionTraining[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													인지기능 향상훈련
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.cognitiveTraining[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													물리(작업)치료
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.physicalTherapy[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.trainingNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig">
														<span className="tiny">{dailyRecords.trainingPreparer[i] || '\u00a0'}</span>
														<br />
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="lbl lt-center" colSpan={3} style={{ lineHeight: 1.25 }}>
													수급자의 입·퇴소시간,
													<br />
													외박 및 복귀시간, 외출시간
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{dailyRecords.admissionDischargeTime[i] || ''}
													</td>
												))}
											</tr>
										</tbody>
									</table>

									<div className="lt-footer">210mm X 297mm [백상지 80g/㎡]</div>
								</div>
							</div>
							{!selectedMember && (
								<div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/30 backdrop-blur-[1px] lt-no-print">
									<p className="text-center text-lg font-semibold text-blue-900 bg-white/95 px-8 py-5 rounded-lg border border-blue-300 shadow-md max-w-sm">
										수급자를 선택해주세요
									</p>
								</div>
							)}
						</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
