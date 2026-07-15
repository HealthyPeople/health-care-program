export const BATH_METH_TO_LABEL: Record<string, string> = {
	'1': '전신입욕',
	'2': '샤워식',
	'3': '침상목욕'
};

export const BATH_METH_LABEL_TO_CODE: Record<string, '1' | '2' | '3'> = {
	전신입욕: '1',
	샤워식: '2',
	침상목욕: '3',
	'샤워식-목욕의자': '2',
	욕조식: '1',
	수건목욕: '3',
	입욕: '1',
	목욕의자: '2',
	기타: '3'
};

export type BathMethodCode = '1' | '2' | '3';

/** LongtermPhysicalActivity.applyDraft 와 동일한 목욕방법 해석 */
export function resolveBathMethodFromRow(row: any): BathMethodCode | '' {
	const code = String(row?.PH_BATH_METH ?? '').trim();
	const label = String(row?.PH_BATH_METH_NM ?? row?.PH_BATH_METH ?? '').trim();
	if (code && BATH_METH_TO_LABEL[code]) return code as BathMethodCode;
	if (label && BATH_METH_LABEL_TO_CODE[label]) return BATH_METH_LABEL_TO_CODE[label];
	return '';
}
