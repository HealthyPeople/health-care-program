/**
 * @file 수급자정보 — 유틸/타입/매퍼 (MemberInfoUtils.ts)
 *
 * @description
 * 요양원 수급자정보 기능의 유틸/타입/매퍼입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoUtils
 */
import { normalizePGrdForSelect } from '../../utils/careGrade';

export interface MemberData {
	[key: string]: any;
}

/** 주소 검색 결과와 상세주소를 한 줄로 이어 붙인다 */
export function composeMemberAddress(...parts: unknown[]): string {
	return parts
		.map((v) => String(v ?? '').trim())
		.filter(Boolean)
		.join(' ');
}

export function escapeHtml(v: unknown): string {
	const s = String(v ?? '');
	return s
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

/** DB/API에서 오는 날짜를 date input용 YYYY-MM-DD 문자열로 */
export function toDateInputString(v: unknown): string {
	if (v == null || v === '') return '';
	if (typeof v === 'string') {
		const s = v.trim();
		return s.length >= 10 ? s.slice(0, 10) : s;
	}
	if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
	return '';
}

/** DB/API 시간을 time input용 HH:mm 문자열로 */
export function toTimeInputString(v: unknown): string {
	if (v == null || v === '') return '';
	if (v instanceof Date && !isNaN(v.getTime())) {
		const h = String(v.getHours()).padStart(2, '0');
		const m = String(v.getMinutes()).padStart(2, '0');
		return `${h}:${m}`;
	}
	const s = String(v).trim();
	const colon = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
	if (colon) return `${String(Number(colon[1])).padStart(2, '0')}:${colon[2]}`;
	if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2)}`;
	// Date 문자열에 시간이 포함된 경우
	const embedded = s.match(/[T\s](\d{1,2}):(\d{2})/);
	if (embedded) return `${String(Number(embedded[1])).padStart(2, '0')}:${embedded[2]}`;
	return '';
}

function parseTimeMinutes(tm: unknown): number | null {
	const s = toTimeInputString(tm);
	const m = /^(\d{2}):(\d{2})$/.exec(s);
	if (!m) return null;
	const mins = Number(m[1]) * 60 + Number(m[2]);
	return Number.isFinite(mins) ? mins : null;
}

/**
 * 입소 당일 기관 체류시간(입소시각~24시)이 12시간 이하이면 급여50%(PAY_COM_GU=1)
 */
export function calcAdmitPayComGu(time: unknown): string {
	const mins = parseTimeMinutes(time);
	if (mins == null) return '0';
	const facilityHours = (24 * 60 - mins) / 60;
	return facilityHours <= 12 ? '1' : '0';
}

/**
 * 퇴소 당일 기관 체류시간(0시~퇴소시각)이 12시간 이하이면 급여50%(PAY_COM_GU=1)
 */
export function calcDischargePayComGu(time: unknown): string {
	const mins = parseTimeMinutes(time);
	if (mins == null) return '0';
	return mins / 60 <= 12 ? '1' : '0';
}

/** 조회 화면용: 일자 + 시간 */
export function formatDateTimeDisplay(date: unknown, time: unknown): string {
	const d = toDateInputString(date);
	const t = toTimeInputString(time);
	if (!d && !t) return '-';
	if (d && t) return `${d} ${t}`;
	return d || t || '-';
}

export function fmtDate10(v: unknown): string {
	const s = toDateInputString(v);
	return s || '';
}

export function fmtStatus(v: unknown): string {
	const s = String(v ?? '').trim();
	if (s === '1') return '입소';
	if (s === '9') return '퇴소';
	return s || '';
}

export function fmtSex(v: unknown): string {
	const s = String(v ?? '').trim();
	if (s === '1') return '남';
	if (s === '2') return '여';
	return s || '';
}

export function todayYYYYMMDD(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** 수정 모드 진입 시 select·input과 맞추기 위해 스칼라 필드 정규화 */
export function buildMemberForEdit(m: MemberData): MemberData {
	const floor = m.P_FLOOR;
	const floorStr =
		floor === 0 || floor === '0'
			? String(floor)
			: floor !== null && floor !== undefined && floor !== ''
				? String(floor)
				: '';

	return {
		...m,
		selectedANCD: String(m.ANCD ?? ''),
		P_GRD: normalizePGrdForSelect(m.P_GRD),
		P_FLOOR: floorStr,
		ROOM_NO: m.ROOM_NO == null ? '' : String(m.ROOM_NO),
		P_BRDT: toDateInputString(m.P_BRDT),
		P_YYDT: toDateInputString(m.P_YYDT),
		P_CTDT: toDateInputString(m.P_CTDT),
		P_SDT: toDateInputString(m.P_SDT),
		P_SDT_TM: toTimeInputString(m.P_SDT_TM),
		P_EDT: toDateInputString(m.P_EDT),
		P_EDT_TM: toTimeInputString(m.P_EDT_TM),
		P_YYSDT: toDateInputString(m.P_YYSDT),
		P_YYEDT: toDateInputString(m.P_YYEDT),
		INSPER: m.INSPER !== undefined && m.INSPER !== null ? String(m.INSPER) : '',
		USRPER: m.USRPER !== undefined && m.USRPER !== null ? String(m.USRPER) : '',
	};
}

/** 보호자 정보 카드 조회 모드의 관계 표시 (BHREL 코드 → 라벨, 없으면 GUARDIAN_P_TEL) */
export function formatGuardianRelation(member: MemberData | null | undefined): string {
	const m = member ?? ({} as MemberData);
	return m.BHREL === '10'
		? '남편'
		: m.BHREL === '11'
			? '부인'
			: m.BHREL === '20'
				? '아들'
				: m.BHREL === '21'
					? '딸'
					: m.BHREL === '22'
						? '며느리'
						: m.BHREL === '23'
							? '사위'
							: m.BHREL === '31'
								? '손주'
								: !m.BHREL || m.BHREL === null || m.BHREL === ''
									? m.GUARDIAN_P_TEL || '-'
									: m.BHREL || m.BHETC || '-';
}
