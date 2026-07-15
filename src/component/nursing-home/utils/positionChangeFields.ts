import { EXCRETION_TIME_SLOTS, formatDateYmd, labelToVtmGu, vtmGuToLabel } from './excretionObservationFields';

/** F33040 변경시간구분(CHNG_GU) — 배설관찰과 동일 1시간 슬롯 */
export const POSITION_CHANGE_TIME_SLOTS = EXCRETION_TIME_SLOTS;

/** F33040 CHNG_POSI */
export const CHNG_POSI_OPTIONS = [
	{ code: '1', label: '좌측위' },
	{ code: '2', label: '배위' },
	{ code: '3', label: '우측위' },
	{ code: '4', label: '기타' },
] as const;

const LEGACY_POSI_TO_CODE: Record<string, string> = {
	좌측위: '1',
	배위: '2',
	복위: '2',
	우측위: '3',
	좌측경사위: '4',
	우측경사위: '4',
	기타: '4',
};

export function chngGuToLabel(chngGu: string): string {
	return vtmGuToLabel(chngGu);
}

export function labelToChngGu(label: string): string {
	return labelToVtmGu(label);
}

export function chngPosiToLabel(code: string): string {
	const c = String(code ?? '').trim();
	return CHNG_POSI_OPTIONS.find((o) => o.code === c)?.label ?? String(code ?? '');
}

export function labelToChngPosi(label: string): string {
	const trimmed = String(label ?? '').trim();
	const opt = CHNG_POSI_OPTIONS.find((o) => o.label === trimmed);
	if (opt) return opt.code;
	return LEGACY_POSI_TO_CODE[trimmed] ?? '4';
}

export interface F33040Row {
	ANCD?: string | number;
	PNUM?: string | number;
	CHNG_DT?: string;
	VDT?: string;
	CHNG_GU?: string;
	CHNG_POSI?: string;
	CHNG_ETC?: string;
	CHNG_EMPNO?: string | number | null;
	CHNG_EMPNM?: string | null;
	[key: string]: unknown;
}

export interface PositionChangeFormData {
	beneficiary: string;
	changeDate: string;
	changeTime: string;
	changedPosture: string;
	remarks: string;
	changer: string;
}

export function rowToPositionChangeForm(row: F33040Row, beneficiaryName = ''): PositionChangeFormData {
	const changeDate = formatDateYmd(row.CHNG_DT ?? row.VDT);
	return {
		beneficiary: beneficiaryName,
		changeDate,
		changeTime: chngGuToLabel(String(row.CHNG_GU ?? '')),
		changedPosture: String(row.CHNG_POSI ?? '1').trim() || '1',
		remarks: String(row.CHNG_ETC ?? ''),
		changer: String(row.CHNG_EMPNM ?? ''),
	};
}

export function positionChangeFormToPayload(form: PositionChangeFormData, pnum: string) {
	const posi = String(form.changedPosture ?? '').trim();
	return {
		PNUM: pnum,
		CHNG_DT: form.changeDate,
		VDT: form.changeDate,
		CHNG_GU: labelToChngGu(form.changeTime),
		CHNG_POSI: /^\d$/.test(posi) ? posi : labelToChngPosi(posi),
		CHNG_ETC: form.remarks || '',
		CHNG_EMPNM: form.changer || null,
	};
}

export function createEmptyPositionChangeForm(beneficiaryName = '', changer = ''): PositionChangeFormData {
	const today = new Date();
	const y = today.getFullYear();
	const m = String(today.getMonth() + 1).padStart(2, '0');
	const d = String(today.getDate()).padStart(2, '0');
	return {
		beneficiary: beneficiaryName,
		changeDate: `${y}-${m}-${d}`,
		changeTime: POSITION_CHANGE_TIME_SLOTS[0].label,
		changedPosture: '1',
		remarks: '',
		changer,
	};
}

export { formatDateYmd };
