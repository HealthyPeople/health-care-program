/** F33021 관찰시간구분(VTM_GU) — 1시간 단위 슬롯 */
export const EXCRETION_TIME_SLOTS = [
	{ vtmGu: '05', label: '05:00 - 06:00' },
	{ vtmGu: '06', label: '06:00 - 07:00' },
	{ vtmGu: '07', label: '07:00 - 08:00' },
	{ vtmGu: '08', label: '08:00 - 09:00' },
	{ vtmGu: '09', label: '09:00 - 10:00' },
	{ vtmGu: '10', label: '10:00 - 11:00' },
	{ vtmGu: '11', label: '11:00 - 12:00' },
	{ vtmGu: '12', label: '12:00 - 13:00' },
	{ vtmGu: '13', label: '13:00 - 14:00' },
	{ vtmGu: '14', label: '14:00 - 15:00' },
	{ vtmGu: '15', label: '15:00 - 16:00' },
	{ vtmGu: '16', label: '16:00 - 17:00' },
	{ vtmGu: '17', label: '17:00 - 18:00' },
	{ vtmGu: '18', label: '18:00 - 19:00' },
	{ vtmGu: '19', label: '19:00 - 20:00' },
	{ vtmGu: '20', label: '20:00 - 21:00' },
	{ vtmGu: '21', label: '21:00 - 22:00' },
	{ vtmGu: '22', label: '22:00 - 23:00' },
	{ vtmGu: '23', label: '23:00 - 24:00' },
] as const;

/** F33021 ANNT_STAT_GU */
export const ANNT_STAT_OPTIONS = [
	{ code: '1', label: '일반' },
	{ code: '2', label: '기저귀착용' },
	{ code: '3', label: '장루(요루)' },
	{ code: '4', label: '도뇨관삽입' },
	{ code: '9', label: '기타' },
] as const;

export function vtmGuToLabel(vtmGu: string): string {
	const code = String(vtmGu ?? '').trim().padStart(2, '0').slice(-2);
	const slot = EXCRETION_TIME_SLOTS.find((s) => s.vtmGu === code);
	if (slot) return slot.label;
	if (/^\d{2}$/.test(code)) return `${code}:00`;
	return String(vtmGu ?? '');
}

export function labelToVtmGu(label: string): string {
	const trimmed = String(label ?? '').trim();
	const slot = EXCRETION_TIME_SLOTS.find((s) => s.label === trimmed);
	if (slot) return slot.vtmGu;
	const hour = trimmed.slice(0, 2);
	if (/^\d{2}$/.test(hour)) return hour;
	return trimmed.slice(0, 2);
}

export function anntStatToLabel(code: string): string {
	const c = String(code ?? '').trim();
	return ANNT_STAT_OPTIONS.find((o) => o.code === c)?.label ?? c;
}

export function isCheckedFlag(v: unknown): boolean {
	const s = String(v ?? '').trim();
	return s === '1' || s.toUpperCase() === 'Y';
}

export function toCheckFlag(checked: boolean): '0' | '1' {
	return checked ? '1' : '0';
}

export function diaperUseToFlag(value: string): '0' | '1' {
	const v = String(value ?? '').trim();
	if (v === '1' || v === '있음') return '1';
	return '0';
}

export function flagToDiaperUse(v: unknown): string {
	return isCheckedFlag(v) ? '있음' : '없음';
}

export interface F33021Row {
	ANCD?: string | number;
	PNUM?: string | number;
	VDT?: string;
	VTM_GU?: string;
	ANNT_STAT_GU?: string;
	ANNT_STAT_DESC?: string;
	PSS_NPPY_VAL_GU?: string;
	PSS_CTHT_VAL?: string;
	INTK_VAL?: string;
	PSS_GU?: string;
	DNG_GU?: string;
	NPPY_CNG_GU?: string;
	INEMPNO?: string | number | null;
	INEMPNM?: string | null;
	[key: string]: unknown;
}

export interface ExcretionFormData {
	beneficiary: string;
	observationDate: string;
	beneficiaryStatus: string;
	statusOther: string;
	observationTime: string;
	diaperUse: string;
	stomaCatheter: string;
	intakeAmount: string;
	urine: boolean;
	stool: boolean;
	diaperOrClothesChange: boolean;
	observer: string;
}

export function rowToExcretionForm(row: F33021Row, beneficiaryName = ''): ExcretionFormData {
	return {
		beneficiary: beneficiaryName,
		observationDate: formatDateYmd(row.VDT),
		beneficiaryStatus: String(row.ANNT_STAT_GU ?? '1').trim() || '1',
		statusOther: String(row.ANNT_STAT_DESC ?? ''),
		observationTime: vtmGuToLabel(String(row.VTM_GU ?? '')),
		diaperUse: flagToDiaperUse(row.PSS_NPPY_VAL_GU),
		stomaCatheter: String(row.PSS_CTHT_VAL ?? ''),
		intakeAmount: String(row.INTK_VAL ?? ''),
		urine: isCheckedFlag(row.PSS_GU),
		stool: isCheckedFlag(row.DNG_GU),
		diaperOrClothesChange: isCheckedFlag(row.NPPY_CNG_GU),
		observer: String(row.INEMPNM ?? ''),
	};
}

export function excretionFormToPayload(form: ExcretionFormData, pnum: string) {
	return {
		PNUM: pnum,
		VDT: form.observationDate,
		VTM_GU: labelToVtmGu(form.observationTime),
		ANNT_STAT_GU: form.beneficiaryStatus || '1',
		ANNT_STAT_DESC: form.statusOther || '',
		PSS_NPPY_VAL_GU: diaperUseToFlag(form.diaperUse),
		PSS_CTHT_VAL: form.stomaCatheter || '',
		INTK_VAL: form.intakeAmount || '',
		PSS_GU: toCheckFlag(form.urine),
		DNG_GU: toCheckFlag(form.stool),
		NPPY_CNG_GU: toCheckFlag(form.diaperOrClothesChange),
		INEMPNM: form.observer || null,
		INEMPNO: null,
	};
}

export function formatDateYmd(dateStr: unknown): string {
	if (!dateStr) return '';
	let s = String(dateStr);
	if (s.includes('T')) s = s.split('T')[0];
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s;
}

export function createEmptyExcretionForm(beneficiaryName = '', observer = ''): ExcretionFormData {
	const today = new Date();
	const y = today.getFullYear();
	const m = String(today.getMonth() + 1).padStart(2, '0');
	const d = String(today.getDate()).padStart(2, '0');
	return {
		beneficiary: beneficiaryName,
		observationDate: `${y}-${m}-${d}`,
		beneficiaryStatus: '1',
		statusOther: '',
		observationTime: EXCRETION_TIME_SLOTS[0].label,
		diaperUse: '없음',
		stomaCatheter: '',
		intakeAmount: '',
		urine: false,
		stool: false,
		diaperOrClothesChange: false,
		observer,
	};
}
