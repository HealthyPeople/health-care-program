export function parseNursingEtcDesc(raw: unknown): Record<string, any> | null {
	if (!raw) return null;
	try {
		const obj = JSON.parse(String(raw));
		return obj && typeof obj === 'object' ? obj : null;
	} catch {
		return null;
	}
}

const ynToFlag = (v: unknown): '1' | '0' => {
	const s = String(v ?? '').trim().toLowerCase();
	if (s === '1' || s === 'y' || s === 'true') return '1';
	return '0';
};

export const ynChecked = (v: unknown) => ynToFlag(v) === '1';

export const formatVitalSignsFromRow = (row: any) => {
	const sbp = String(row?.NS_SBDP ?? '').trim();
	const dbp = String(row?.NS_EBDP ?? '').trim();
	const temp = String(row?.NS_TMPBD ?? '').trim();
	if (!sbp && !dbp && !temp) return '';
	const bp = sbp || dbp ? `${sbp || '-'}/${dbp || '-'}` : '';
	return [bp, temp ? `${temp}℃` : ''].filter(Boolean).join(' ');
};

const combineNotes = (...parts: unknown[]) =>
	parts.map((p) => String(p ?? '').trim()).filter(Boolean).join(' / ');

/** LongtermNursingInstruction.applyDraft 와 동일한 건강·간호 필드 해석 */
export function resolveNursingFieldsFromRow(row: any) {
	const extra = parseNursingEtcDesc(row?.NS_ETC_DESC);

	let healthManagement = ynChecked(row?.NS_HLTH_HELP);
	let nursingManagement = ynChecked(row?.NS_NRSE_HELP);
	if (row?.NS_HLTH_HELP == null && extra?.healthManagement != null) {
		healthManagement = ynChecked(extra.healthManagement);
	}
	if (row?.NS_NRSE_HELP == null && extra?.nursingManagement != null) {
		nursingManagement = ynChecked(extra.nursingManagement);
	}

	let emergencyService = false;
	if (extra?.emergencyService != null) {
		emergencyService = ynChecked(extra.emergencyService);
	}

	return {
		vitalSigns: formatVitalSignsFromRow(row),
		healthManagement,
		nursingManagement,
		emergencyService,
		healthNotes: combineNotes(
			row?.NS_HEALTH_HELP_NM,
			row?.NS_NURSE_HELP_NM,
			row?.NS_SORE_MNG_NM,
			row?.NS_VIEW
		),
		healthPreparer: String(row?.NS_WRITE_NAME ?? row?.INEMPNM ?? '').trim()
	};
}

export type NursingDailyFields = ReturnType<typeof resolveNursingFieldsFromRow>;

const hasFieldValue = (v: unknown) => v != null && String(v).trim() !== '';

export function applyNursingFieldsToDay(
	row: any,
	idx: number,
	records: {
		vitalSigns: string[];
		healthManagement: boolean[];
		nursingManagement: boolean[];
		emergencyService: boolean[];
		healthNotes: string[];
		healthPreparer: string[];
	},
	merge = false
) {
	const resolved = resolveNursingFieldsFromRow(row);
	const setField = (has: boolean, apply: () => void) => {
		if (!merge || has) apply();
	};

	setField(
		hasFieldValue(row?.NS_SBDP) || hasFieldValue(row?.NS_EBDP) || hasFieldValue(row?.NS_TMPBD),
		() => {
			records.vitalSigns[idx] = resolved.vitalSigns;
		}
	);
	setField(row?.NS_HLTH_HELP != null || parseNursingEtcDesc(row?.NS_ETC_DESC)?.healthManagement != null, () => {
		records.healthManagement[idx] = resolved.healthManagement;
	});
	setField(row?.NS_NRSE_HELP != null || parseNursingEtcDesc(row?.NS_ETC_DESC)?.nursingManagement != null, () => {
		records.nursingManagement[idx] = resolved.nursingManagement;
	});
	setField(parseNursingEtcDesc(row?.NS_ETC_DESC)?.emergencyService != null, () => {
		records.emergencyService[idx] = resolved.emergencyService;
	});
	setField(
		hasFieldValue(row?.NS_HEALTH_HELP_NM) ||
			hasFieldValue(row?.NS_NURSE_HELP_NM) ||
			hasFieldValue(row?.NS_SORE_MNG_NM) ||
			hasFieldValue(row?.NS_VIEW),
		() => {
			records.healthNotes[idx] = resolved.healthNotes;
		}
	);
	setField(hasFieldValue(row?.NS_WRITE_NAME) || hasFieldValue(row?.INEMPNM), () => {
		records.healthPreparer[idx] = resolved.healthPreparer;
	});
}

export function applyNursingBaselineToAllDays(
	row: any,
	records: {
		vitalSigns: string[];
		healthManagement: boolean[];
		nursingManagement: boolean[];
		emergencyService: boolean[];
		healthNotes: string[];
		healthPreparer: string[];
	}
) {
	if (!row) return;
	const resolved = resolveNursingFieldsFromRow(row);
	for (let i = 0; i < 7; i++) {
		records.vitalSigns[i] = resolved.vitalSigns;
		records.healthManagement[i] = resolved.healthManagement;
		records.nursingManagement[i] = resolved.nursingManagement;
		records.emergencyService[i] = resolved.emergencyService;
		records.healthNotes[i] = resolved.healthNotes;
		records.healthPreparer[i] = resolved.healthPreparer;
	}
}
