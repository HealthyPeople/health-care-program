import {
	EXCRETION_TIME_SLOTS,
	formatDateYmd,
	isCheckedFlag,
	labelToVtmGu,
	toCheckFlag,
	vtmGuToLabel,
} from './excretionObservationFields';

/** F33050 관리시간구분(VTM_GU) */
export const CATHETER_TIME_SLOTS = EXCRETION_TIME_SLOTS;

export function vtmGuToTimeLabel(vtmGu: string): string {
	return vtmGuToLabel(vtmGu);
}

export function timeLabelToVtmGu(label: string): string {
	return labelToVtmGu(label);
}

export interface F33050Row {
	ANCD?: string | number;
	PNUM?: string | number;
	VDT?: string;
	VTM_GU?: string;
	PSS_VAL?: string | number | null;
	CH_01?: string;
	CH_02?: string;
	CH_03?: string;
	ETC?: string;
	INEMPNO?: string | number | null;
	INEMPNM?: string | null;
	[key: string]: unknown;
}

export interface CatheterFormData {
	beneficiary: string;
	managementDate: string;
	managementTime: string;
	totalUrineVolume: string;
	catheter: boolean;
	urinePulse: boolean;
	disinfection: boolean;
	remarks: string;
	observer: string;
}

export function rowToCatheterForm(row: F33050Row, beneficiaryName = ''): CatheterFormData {
	return {
		beneficiary: beneficiaryName,
		managementDate: formatDateYmd(row.VDT),
		managementTime: vtmGuToTimeLabel(String(row.VTM_GU ?? '')),
		totalUrineVolume: row.PSS_VAL != null && row.PSS_VAL !== '' ? String(row.PSS_VAL) : '',
		catheter: isCheckedFlag(row.CH_01),
		urinePulse: isCheckedFlag(row.CH_02),
		disinfection: isCheckedFlag(row.CH_03),
		remarks: String(row.ETC ?? ''),
		observer: String(row.INEMPNM ?? ''),
	};
}

export function catheterFormToPayload(form: CatheterFormData, pnum: string) {
	const pssRaw = String(form.totalUrineVolume ?? '').trim();
	let pssVal: number | null = null;
	if (pssRaw !== '') {
		const n = parseInt(pssRaw, 10);
		pssVal = Number.isNaN(n) ? null : n;
	}
	return {
		PNUM: pnum,
		VDT: form.managementDate,
		VTM_GU: timeLabelToVtmGu(form.managementTime),
		PSS_VAL: pssVal,
		CH_01: toCheckFlag(form.catheter),
		CH_02: toCheckFlag(form.urinePulse),
		CH_03: toCheckFlag(form.disinfection),
		ETC: form.remarks || '',
		INEMPNM: form.observer || null,
	};
}

export function createEmptyCatheterForm(beneficiaryName = '', observer = ''): CatheterFormData {
	const today = new Date();
	const y = today.getFullYear();
	const m = String(today.getMonth() + 1).padStart(2, '0');
	const d = String(today.getDate()).padStart(2, '0');
	return {
		beneficiary: beneficiaryName,
		managementDate: `${y}-${m}-${d}`,
		managementTime: CATHETER_TIME_SLOTS[0].label,
		totalUrineVolume: '',
		catheter: true,
		urinePulse: false,
		disinfection: false,
		remarks: '',
		observer,
	};
}

export { formatDateYmd, isCheckedFlag };
