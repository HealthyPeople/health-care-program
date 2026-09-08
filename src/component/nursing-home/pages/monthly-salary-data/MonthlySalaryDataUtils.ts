/**
 * @file 월 급여자료 — 유틸/타입/매퍼 (MonthlySalaryDataUtils.ts)
 *
 * @description
 * 요양원 월 급여자료 화면의 순수 금액·매핑 헬퍼입니다.
 * V40100: 상급병실료=BSAL6, 병실조정료=BSAL7, 병실승급비=BSAL6+BSAL7
 *
 * @module component/nursing-home/pages/monthly-salary-data/MonthlySalaryDataUtils
 */
import { formatCareGradeLabel } from "../../utils/careGrade";

export interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	P_YYNO?: string;
	P_YYDT?: string;
	P_YYSDT?: string;
	P_YYEDT?: string;
	[key: string]: unknown;
}

export interface SalaryRow {
	pnum: string;
	recipient: string;
	birthday: string;
	grade: string;
	benefitTotal: string;
	nhaContribution: string;
	recipientContribution: string;
	nonBenefitMeal: string;
	roomUpgradeFee: string;
	outpatientFee: string;
	contractedMedical: string;
	contractedPrescription: string;
	otherCosts: string;
	recipientContributionTotal: string;
}

export interface SalaryDetailForm {
	recipient: string;
	birthday: string;
	inSper: string;
	usrPer: string;
	usrGu: string;
	nhaContribution: string;
	recipientContribution: string;
	beautyCost: string;
	nonBenefitMeal: string;
	nonBenefitSnack: string;
	otherCosts: string;
	otherCostDesc: string;
	premiumRoomFee: string;
	outpatientFee: string;
	roomAdjustFee: string;
	bathFee: string;
	dementiaFee: string;
	contractedMedicalFee: string;
	prescriptionFee: string;
}

export function num(v: unknown): number {
	const n = parseInt(String(v ?? "0").replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

export function fmtAmt(n: number): string {
	return Math.round(n).toLocaleString("ko-KR");
}

/** 금액 입력값 → 콤마 포맷 (숫자만 허용) */
export function formatAmountInput(raw: string): string {
	const digits = String(raw ?? "").replace(/[^\d]/g, "");
	if (digits === "") return "";
	const n = parseInt(digits, 10);
	if (!Number.isFinite(n)) return "";
	return n.toLocaleString("ko-KR");
}

/** 금액 입력값 → 콤마 포맷 (음수 허용, 병실조정료 할인) */
export function formatSignedAmountInput(raw: string): string {
	const s = String(raw ?? "").trimStart();
	const negative = s.startsWith("-");
	const digits = s.replace(/[^\d]/g, "");
	if (digits === "") return negative ? "-" : "";
	const n = parseInt(digits, 10);
	if (!Number.isFinite(n)) return negative ? "-" : "";
	const formatted = n.toLocaleString("ko-KR");
	return negative ? `-${formatted}` : formatted;
}

export function formatAmountCell(v: unknown): string {
	if (v == null || v === "") return "0";
	const n = Number(String(v).replace(/,/g, ""));
	if (!Number.isFinite(n)) return "0";
	return Math.round(n).toLocaleString("ko-KR");
}

export function formatPercentCell(v: unknown): string {
	if (v == null || v === "") return "";
	const n = Number(String(v).replace(/,/g, ""));
	if (!Number.isFinite(n)) return "";
	return n.toFixed(1);
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

export function parseAmt(s: string): number {
	const n = parseInt(String(s ?? "").replace(/,/g, "").trim(), 10);
	return Number.isFinite(n) ? n : 0;
}

export function toYmd(v: unknown): string | null {
	if (v == null || v === "") return null;
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return null;
}

/** F40100 한 행 → 상단 테이블 행 */
export function mapDbToSalaryRow(r: Record<string, unknown>): SalaryRow {
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
	/** 급여합계 = 공단부담금 + 수급자부담금 (V40100). 비급여는 수급자부담금합에만 포함 */
	/** BSAL1/BSAL2 = 계약 식대·간식비 1회가 있는 수급자만. 저녁 간식은 미포함 */
	const benefitTotal = sal1 + sal2;
	const recipientTotal = sal2 + sumBs + esal;
	return {
		pnum: String(r.PNUM ?? ""),
		recipient: String(r.P_NM ?? ""),
		birthday: displayBirth(formatBirthFromDb(r.P_BRDT)),
		grade: formatCareGradeLabel(String(r.P_GRD ?? "")),
		benefitTotal: fmtAmt(benefitTotal),
		nhaContribution: fmtAmt(sal1),
		recipientContribution: fmtAmt(sal2),
		nonBenefitMeal: fmtAmt(b1 + b2),
		/** 병실승급비 = 상급병실료 + 병실조정료(음수 할인) */
		roomUpgradeFee: fmtAmt(b6 + b7),
		outpatientFee: fmtAmt(b3),
		contractedMedical: fmtAmt(b8),
		contractedPrescription: fmtAmt(b9),
		otherCosts: fmtAmt(esal),
		recipientContributionTotal: fmtAmt(recipientTotal),
	};
}

/** F40100 → 하단 상세 */
export function mapDbToDetailForm(r: Record<string, unknown>): SalaryDetailForm {
	const b9 = num(r.BSAL9);
	return {
		recipient: String(r.P_NM ?? ""),
		birthday: displayBirth(formatBirthFromDb(r.P_BRDT)),
		inSper: r.INSPER != null && r.INSPER !== "" ? String(r.INSPER) : "",
		usrPer: r.USRPER != null && r.USRPER !== "" ? String(r.USRPER) : "",
		usrGu: String(r.USRGU ?? "1").trim() || "1",
		nhaContribution: fmtAmt(num(r.SAL1)),
		recipientContribution: fmtAmt(num(r.SAL2)),
		beautyCost: fmtAmt(num(r.BSAL4)),
		nonBenefitMeal: fmtAmt(num(r.BSAL1)),
		/** 계약 간식비 1회가 있는 수급자의 오전·오후만. 저녁은 제외 */
		nonBenefitSnack: fmtAmt(num(r.BSAL2)),
		otherCosts: fmtAmt(num(r.ESAL)),
		otherCostDesc: String(r.ESALDES ?? ""),
		premiumRoomFee: fmtAmt(num(r.BSAL6)),
		outpatientFee: fmtAmt(num(r.BSAL3)),
		roomAdjustFee: fmtAmt(num(r.BSAL7)),
		bathFee: fmtAmt(0),
		dementiaFee: fmtAmt(num(r.BSAL8)),
		contractedMedicalFee: fmtAmt(0),
		prescriptionFee: fmtAmt(b9),
	};
}

/** 상세 폼 + 수급자 → F40100 MERGE용 row */
export function buildF40100Row(
	member: MemberData,
	salmm6: string,
	form: SalaryDetailForm
): Record<string, unknown> {
	return {
		ANCD: member.ANCD,
		SALMM: salmm6,
		PNUM: member.PNUM,
		INSPER: form.inSper.trim() === "" ? null : Number(form.inSper.replace(",", ".")),
		USRPER: form.usrPer.trim() === "" ? null : Number(form.usrPer.replace(",", ".")),
		USRGU: (form.usrGu || "1").trim().slice(0, 1),
		SAL1: parseAmt(form.nhaContribution),
		SAL2: parseAmt(form.recipientContribution),
		BSAL1: parseAmt(form.nonBenefitMeal),
		BSAL2: parseAmt(form.nonBenefitSnack),
		BSAL3: parseAmt(form.outpatientFee),
		BSAL4: parseAmt(form.beautyCost),
		BSAL6: parseAmt(form.premiumRoomFee),
		BSAL7: parseAmt(form.roomAdjustFee),
		BSAL8: parseAmt(form.dementiaFee),
		BSAL9: parseAmt(form.contractedMedicalFee) + parseAmt(form.prescriptionFee),
		ESAL: parseAmt(form.otherCosts),
		ESALDES: form.otherCostDesc.trim() || null,
		SNM: null,
		S_GU: null,
		ENM: null,
		RDES: null,
		P_GRD: String(member.P_GRD ?? "").trim().slice(0, 2) || null,
		P_YYNO: member.P_YYNO != null ? String(member.P_YYNO) : null,
		P_YYDT: toYmd(member.P_YYDT),
		P_YYSDT: toYmd(member.P_YYSDT),
		P_YYEDT: toYmd(member.P_YYEDT),
		ETC: null,
		P_NM: member.P_NM || null,
		P_BRDT: member.P_BRDT || null,
		P_SEX: String(member.P_SEX ?? "").trim().slice(0, 1) || null,
		P_ST: String(member.P_ST ?? "").trim().slice(0, 1) || null,
		ANGH: null,
		ANNM: null,
		ANADD: null,
		TAXNUM: null,
		TAXOWN: null,
		ANTEL: null,
	};
}

export function calcRecipientBurdenTotal(form: SalaryDetailForm): number {
	return (
		parseAmt(form.recipientContribution) +
		parseAmt(form.nonBenefitMeal) +
		parseAmt(form.nonBenefitSnack) +
		parseAmt(form.outpatientFee) +
		parseAmt(form.beautyCost) +
		parseAmt(form.premiumRoomFee) +
		parseAmt(form.bathFee) +
		parseAmt(form.dementiaFee) +
		parseAmt(form.roomAdjustFee) +
		parseAmt(form.contractedMedicalFee) +
		parseAmt(form.prescriptionFee) +
		parseAmt(form.otherCosts)
	);
}

/** 급여 그리드(F40100) 행 → 저장용 수급자 스텁 (좌측 목록 제거 후 행 선택 시 사용) */
export function salaryRecordToMemberData(r: Record<string, unknown>): MemberData {
	return {
		ANCD: String(r.ANCD ?? ""),
		PNUM: String(r.PNUM ?? ""),
		P_NM: String(r.P_NM ?? ""),
		P_SEX: String(r.P_SEX ?? ""),
		P_GRD: String(r.P_GRD ?? ""),
		P_BRDT: String(r.P_BRDT ?? ""),
		P_ST: String(r.P_ST ?? ""),
		P_YYNO: r.P_YYNO != null ? String(r.P_YYNO) : undefined,
		P_YYDT: r.P_YYDT != null ? String(r.P_YYDT) : undefined,
		P_YYSDT: r.P_YYSDT != null ? String(r.P_YYSDT) : undefined,
		P_YYEDT: r.P_YYEDT != null ? String(r.P_YYEDT) : undefined,
	};
}

export function payYearMonthToSalmm(ym: string): string | null {
	const d = String(ym || "").replace(/\D/g, "");
	if (d.length === 6) return d;
	return null;
}

/** 급여계산 요청에 실을 해당 월 병실조정료. 화면 미저장 값도 포함 */
export function collectRoomAdjustsForCalc(
	records: Record<string, unknown>[],
	selectedPnum?: string | null,
	roomAdjustFee?: string
): Array<{ pnum: string; bsal7: number }> {
	const map = new Map<string, number>();
	for (const r of records) {
		const pnum = String(r.PNUM ?? "").trim();
		if (!pnum) continue;
		map.set(pnum, num(r.BSAL7));
	}
	const sel = String(selectedPnum ?? "").trim();
	const typed = String(roomAdjustFee ?? "").trim();
	if (sel && typed !== "" && typed !== "-") {
		map.set(sel, parseAmt(typed));
	}
	return Array.from(map.entries()).map(([pnum, bsal7]) => ({ pnum, bsal7 }));
}

export const initialDetailForm: SalaryDetailForm = {
	recipient: "",
	birthday: "",
	inSper: "",
	usrPer: "",
	usrGu: "1",
	nhaContribution: "",
	recipientContribution: "",
	beautyCost: "",
	nonBenefitMeal: "",
	nonBenefitSnack: "",
	otherCosts: "",
	otherCostDesc: "",
	premiumRoomFee: "",
	outpatientFee: "",
	roomAdjustFee: "",
	bathFee: "",
	dementiaFee: "",
	contractedMedicalFee: "",
	prescriptionFee: "",
};
