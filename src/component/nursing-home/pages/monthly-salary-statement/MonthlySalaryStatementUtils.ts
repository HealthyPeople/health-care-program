/**
 * @file 월 급여명세서 — 유틸/타입/매퍼 (MonthlySalaryStatementUtils.ts)
 *
 * @description
 * 요양원 월 급여명세서 기능의 유틸/타입/매퍼입니다. 폴더: component/nursing-home/pages/monthly-salary-statement
 *
 * @module component/nursing-home/pages/monthly-salary-statement/MonthlySalaryStatementUtils
 */
/**
 * 월별 급여명세서 — 순수 유틸·매핑·상수 (React state/fetch 없음)
 */
import { formatCareGradeLabel } from "../../utils/careGrade";
import { isHaewonHardcodedLabel, normalizeSGu } from "./MonthlySalaryStatementPrint";

export function num(v: unknown): number {
	const n = parseInt(String(v ?? "0").replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

export function fmtInt(n: number): string {
	return String(Math.round(n));
}

export function formatWon(n: number): string {
	return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

/** 식대합계 = 비급여식대 + 비급여간식 */
export function rowMealTotal(row: Pick<StatementRow, "nonBenefitMeal" | "nonBenefitSnack">): number {
	return num(row.nonBenefitMeal) + num(row.nonBenefitSnack);
}

/** 기타합계 = 비급여의료비 + 촉탁의료비 + 처방비 + 기타비용 */
export function rowOtherTotal(
	row: Pick<StatementRow, "outpatientFee" | "contractedMedical" | "contractedPrescription" | "otherCostsRecipient">
): number {
	return (
		num(row.outpatientFee) +
		num(row.contractedMedical) +
		num(row.contractedPrescription) +
		num(row.otherCostsRecipient)
	);
}

export function sumMealTotal(
	rows: Array<Pick<StatementRow, "nonBenefitMeal" | "nonBenefitSnack">>
): number {
	return rows.reduce((s, r) => s + rowMealTotal(r), 0);
}

export function sumOtherTotal(
	rows: Array<
		Pick<StatementRow, "outpatientFee" | "contractedMedical" | "contractedPrescription" | "otherCostsRecipient">
	>
): number {
	return rows.reduce((s, r) => s + rowOtherTotal(r), 0);
}

export function formatBirthFromDb(v: unknown): string {
	if (v == null) return "";
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10).replace(/-/g, "");
	if (/^\d{8}$/.test(s)) return s;
	return s;
}

export function displayBirth(s: string): string {
	if (!s) return "";
	if (s.length === 8 && /^\d{8}$/.test(s)) {
		return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	}
	if (s.includes("-") && s.length >= 10) return s.slice(0, 10);
	return s;
}

export function payYearMonthToSalmm(ym: string): string | null {
	const d = String(ym || "").replace(/\D/g, "");
	if (d.length === 6) return d;
	return null;
}

/** 기본 급여년월 = 전월 (YYYY-MM) */
export function getPreviousYearMonthInput(): string {
	const d = new Date();
	d.setMonth(d.getMonth() - 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 명세서 테이블 행
export interface StatementRow {
	pnum: string;
	recipient: string;
	birthday: string;
	grade: string;
	/** F10010/F40100 인정번호 */
	recognitionNo: string;
	benefitTotal: string;
	nhaContribution: string;
	recipientContribution: string;
	nonBenefitMeal: string;
	nonBenefitSnack: string;
	roomUpgradeFee: string;
	outpatientFee: string;
	contractedMedical: string;
	contractedPrescription: string;
	beautyCost: string;
	otherCostsRecipient: string;
	recipientBurdenTotal: string;
	/** F10010/F40100 입소1·퇴소9 */
	pSt: string;
	bathFee: string;
	dementiaFee: string;
	/** F40100 전달자 */
	snm: string;
	/** F40100 전달방법 코드 1~4 */
	sGu: string;
	/** F40100 수령자 */
	enm: string;
	/** F40100 수령내용 */
	rdes: string;
	/** F40100 고유번호 */
	angh: string;
	/** F40100 장기요양기관명 */
	annm: string;
	/** F40100 장기요양기관 주소 */
	anadd: string;
	/** F40100 사업자 등록번호 */
	taxnum: string;
	/** F40100 대표자 성명 */
	taxown: string;
	/** F40100 전화번호 */
	antel: string;
}

/** F40100 한 행(+ F10010 병합 후) → 명세서 그리드 행 (금액 규칙은 월별급여자료와 동일) */
export function f40100ToStatementRow(r: Record<string, unknown>): StatementRow {
	const sal1 = num(r.SAL1);
	const sal2 = num(r.SAL2);
	const b1 = num(r.BSAL1);
	const b2 = num(r.BSAL2);
	const b3 = num(r.BSAL3);
	const b4 = num(r.BSAL4);
	const b6 = num(r.BSAL6);
	const b7 = num(r.BSAL7);
	const b8 = num(r.BSAL8);
	const b9 = num(r.BSAL9);
	const esal = num(r.ESAL);
	const sumBs = b1 + b2 + b3 + b4 + b6 + b7 + b8 + b9;
	/** 급여합계 = 공단부담금 + 수급자부담금 (V40100). 비급여는 수급자부담금합계에만 포함 */
	/** BSAL1/BSAL2 = 계약 식대·간식비 1회가 있는 수급자만. 저녁 간식은 부담금에 넣지 않음 */
	const benefitTotal = sal1 + sal2;
	const recipientBurdenTotal = sal2 + sumBs + esal;
	return {
		pnum: String(r.PNUM ?? "").trim(),
		recipient: String(r.P_NM ?? ""),
		birthday: displayBirth(formatBirthFromDb(r.P_BRDT)),
		grade: formatCareGradeLabel(String(r.P_GRD ?? "")),
		recognitionNo: String(r.P_YYNO ?? "").trim(),
		benefitTotal: fmtInt(benefitTotal),
		nhaContribution: fmtInt(sal1),
		recipientContribution: fmtInt(sal2),
		nonBenefitMeal: fmtInt(b1),
		nonBenefitSnack: fmtInt(b2),
		roomUpgradeFee: fmtInt(b6),
		outpatientFee: fmtInt(b3),
		contractedMedical: fmtInt(b8),
		contractedPrescription: fmtInt(b9),
		beautyCost: fmtInt(b4),
		otherCostsRecipient: fmtInt(esal),
		recipientBurdenTotal: fmtInt(recipientBurdenTotal),
		pSt: String(r.P_ST ?? "").trim(),
		bathFee: fmtInt(b7),
		dementiaFee: fmtInt(b8),
		snm: String(r.SNM ?? "").trim(),
		sGu: (() => {
			const t = String(r.S_GU ?? "").trim();
			return t ? normalizeSGu(t) : "";
		})(),
		enm: String(r.ENM ?? "").trim(),
		rdes: String(r.RDES ?? "").trim(),
		/** F40100 기관정보 */
		angh: String(r.ANGH ?? "").trim(),
		annm: String(r.ANNM ?? "").trim(),
		anadd: String(r.ANADD ?? "").trim(),
		taxnum: String(r.TAXNUM ?? "").trim(),
		taxown: String(r.TAXOWN ?? "").trim(),
		antel: String(r.ANTEL ?? "").trim(),
	};
}

export interface F10010Row {
	PNUM?: unknown;
	P_YYNO?: unknown;
	P_NM?: unknown;
	P_BRDT?: unknown;
	P_GRD?: unknown;
	P_SEX?: unknown;
	P_ST?: unknown;
	[key: string]: unknown;
}

export function memberKey(p: unknown): string {
	return String(p ?? "").trim();
}

/** F40100 행에 F10010 동일 PNUM 수급자 표시 정보 병합 */
export function mergeF40100WithF10010(
	f401: Record<string, unknown>,
	byPnum: Map<string, F10010Row>
): Record<string, unknown> {
	const k = memberKey(f401.PNUM);
	const m = k ? byPnum.get(k) : undefined;
	if (!m) return { ...f401 };
	return {
		...f401,
		P_NM: m.P_NM != null && String(m.P_NM).trim() !== "" ? m.P_NM : f401.P_NM,
		P_BRDT: m.P_BRDT != null && String(m.P_BRDT).trim() !== "" ? m.P_BRDT : f401.P_BRDT,
		P_GRD: m.P_GRD != null && String(m.P_GRD).trim() !== "" ? m.P_GRD : f401.P_GRD,
		P_SEX: m.P_SEX != null && String(m.P_SEX).trim() !== "" ? m.P_SEX : f401.P_SEX,
		P_ST: m.P_ST != null && String(m.P_ST).trim() !== "" ? m.P_ST : f401.P_ST,
		P_YYNO:
			m.P_YYNO != null && String(m.P_YYNO).trim() !== "" ? m.P_YYNO : f401.P_YYNO,
	};
}

/** F40100 기관정보가 비어 있거나 구 해원 하드코딩이면 F00110 값으로 대체 */
export function mergeF40100FacilityFromF00110(
	f401: Record<string, unknown>,
	facility: Record<string, unknown> | null
): Record<string, unknown> {
	if (!facility) return { ...f401 };
	const pick = (key: string) => {
		const cur = String(f401[key] ?? "").trim();
		const fromFac = String(facility[key] ?? "").trim();
		if (fromFac) {
			if (!cur) return fromFac;
			if (isHaewonHardcodedLabel(cur) && !isHaewonHardcodedLabel(fromFac)) return fromFac;
			if (cur === "14161000067" && fromFac !== cur) return fromFac;
		}
		return cur || fromFac || f401[key];
	};
	return {
		...f401,
		ANGH: pick("ANGH"),
		ANNM: pick("ANNM"),
		ANADD: pick("ANADD"),
		TAXNUM: pick("TAXNUM"),
		TAXOWN: pick("TAXOWN"),
		ANTEL: pick("ANTEL"),
	};
}

// 하단 폼 데이터
export interface StatementForm {
	recipient: string;
	deliveryMethod: string;
	recipientName: string;
	receiveContent: string;
	birthday: string;
	deliverer: string;
}

export const TABS = [
	{ id: "occurrence", label: "전체 발생내역서 출력" },
	{ id: "ledger", label: "전체 발부대장 출력" },
	{ id: "statement", label: "급여명세서 출력" },
	{ id: "payment", label: "납부확인서 출력" },
] as const;

export const TAB_TITLES: Record<(typeof TABS)[number]["id"], string> = {
	occurrence: "수급자급여 발생내역서",
	ledger: "명세서 발부대장",
	statement: "급여명세서",
	payment: "납부확인서",
};

export const initialForm: StatementForm = {
	recipient: "",
	deliveryMethod: "2",
	recipientName: "",
	receiveContent: "소식지, 급여제공기록지, 급여비용명세서, 식단표, 프로그램계획표",
	birthday: "",
	deliverer: "",
};

/** 전달자: 로그인 기관명(F00110.ANNM) 우선. 구 하드코딩 기본값은 쓰지 않는다. */
export function loginFacilityDeliverer(facilityName: string, savedSnm?: string): string {
	const facility = String(facilityName ?? "").trim();
	if (facility) return facility;
	const saved = String(savedSnm ?? "").trim();
	if (saved && !isHaewonHardcodedLabel(saved)) return saved;
	return "";
}
