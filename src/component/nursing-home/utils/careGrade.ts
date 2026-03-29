/**
 * 수정 폼 `<select value>`와 일치시키기.
 * DB/API에서 공백, "2등급", 전각 숫자, number 타입 등으로 올 수 있음.
 * 구코드 6은 인지지원 옵션(value 9)에 맞춤.
 */
export function normalizePGrdForSelect(raw: unknown): string {
	if (raw === null || raw === undefined) return '';
	let s = String(raw).trim();
	if (s === '' || s === 'null' || s === 'undefined') return '';
	s = s.replace(/[０-９]/g, (ch) =>
		String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30)
	);
	s = s.replace(/\s*등급\s*$/u, '').trim();
	const n = Number.parseInt(s, 10);
	if (!Number.isNaN(n)) {
		if (n === 6) return '9';
		if (n >= 0 && n <= 9) return String(n);
		return '';
	}
	if (/^[0-9]$/.test(s)) {
		return s === '6' ? '9' : s;
	}
	return '';
}

/**
 * F10010 P_GRD 표시: 1~5등급, 9(및 구데이터 6)는 인지지원, 0은 등급외.
 */
export function formatCareGradeLabel(pGrd: unknown, emptyLabel = '-'): string {
	const g = String(pGrd ?? '').trim();
	if (g === '' || g === 'null' || g === 'undefined') return emptyLabel;
	if (g === '0') return '등급외';
	if (g === '9' || g === '6') return '인지지원';
	if (/^[1-5]$/.test(g)) return `${g}등급`;
	return `${g}등급`;
}
