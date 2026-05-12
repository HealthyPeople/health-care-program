"use client";

import React, { useState } from "react";
import { formatCareGradeLabel } from "../../utils/careGrade";

interface MemberData {
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

function num(v: unknown): number {
	const n = parseInt(String(v ?? "0").replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

function fmtInt(n: number): string {
	return String(Math.round(n));
}

function formatBirthFromDb(v: unknown): string {
	if (v == null) return "";
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10).replace(/-/g, "");
	if (/^\d{8}$/.test(s)) return s;
	return s;
}

function displayBirth(s: string): string {
	if (!s) return "";
	if (s.length === 8 && /^\d{8}$/.test(s)) {
		return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	}
	if (s.includes("-") && s.length >= 10) return s.slice(0, 10);
	return s;
}

/** F40100 한 행 → 상단 테이블 행 */
function mapDbToSalaryRow(r: Record<string, unknown>): SalaryRow {
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
	const benefitTotal = sal1 + sal2 + sumBs + esal;
	const recipientTotal = sal2 + sumBs + esal;
	const half = Math.floor(b9 / 2);
	return {
		pnum: String(r.PNUM ?? ""),
		recipient: String(r.P_NM ?? ""),
		birthday: displayBirth(formatBirthFromDb(r.P_BRDT)),
		grade: formatCareGradeLabel(String(r.P_GRD ?? "")),
		benefitTotal: fmtInt(benefitTotal),
		nhaContribution: fmtInt(sal1),
		recipientContribution: fmtInt(sal2),
		nonBenefitMeal: fmtInt(b1),
		roomUpgradeFee: fmtInt(b6),
		outpatientFee: fmtInt(b3),
		contractedMedical: fmtInt(half),
		contractedPrescription: fmtInt(b9 - half),
		otherCosts: fmtInt(esal),
		recipientContributionTotal: fmtInt(recipientTotal),
	};
}

/** F40100 → 하단 상세 */
function mapDbToDetailForm(r: Record<string, unknown>): SalaryDetailForm {
	const b9 = num(r.BSAL9);
	const half = Math.floor(b9 / 2);
	return {
		recipient: String(r.P_NM ?? ""),
		birthday: displayBirth(formatBirthFromDb(r.P_BRDT)),
		inSper: r.INSPER != null && r.INSPER !== "" ? String(r.INSPER) : "",
		usrPer: r.USRPER != null && r.USRPER !== "" ? String(r.USRPER) : "",
		usrGu: String(r.USRGU ?? "1").trim() || "1",
		nhaContribution: fmtInt(num(r.SAL1)),
		recipientContribution: fmtInt(num(r.SAL2)),
		beautyCost: fmtInt(num(r.BSAL4)),
		nonBenefitMeal: fmtInt(num(r.BSAL1)),
		nonBenefitSnack: fmtInt(num(r.BSAL2)),
		otherCosts: fmtInt(num(r.ESAL)),
		otherCostDesc: String(r.ESALDES ?? ""),
		premiumRoomFee: fmtInt(num(r.BSAL6)),
		outpatientFee: fmtInt(num(r.BSAL3)),
		roomAdjustFee: "",
		bathFee: fmtInt(num(r.BSAL7)),
		dementiaFee: fmtInt(num(r.BSAL8)),
		contractedMedicalFee: fmtInt(half),
		prescriptionFee: fmtInt(b9 - half),
	};
}

function parseAmt(s: string): number {
	const n = parseInt(String(s ?? "").replace(/,/g, "").trim(), 10);
	return Number.isFinite(n) ? n : 0;
}

function toYmd(v: unknown): string | null {
	if (v == null || v === "") return null;
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return null;
}

/** 상세 폼 + 수급자 → F40100 MERGE용 row */
function buildF40100Row(
	member: MemberData,
	salmm6: string,
	form: SalaryDetailForm
): Record<string, unknown> {
	const bsal9 =
		parseAmt(form.roomAdjustFee) +
		parseAmt(form.contractedMedicalFee) +
		parseAmt(form.prescriptionFee);
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
		BSAL7: parseAmt(form.bathFee),
		BSAL8: parseAmt(form.dementiaFee),
		BSAL9: bsal9,
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

/** 급여 그리드(F40100) 행 → 저장용 수급자 스텁 (좌측 목록 제거 후 행 선택 시 사용) */
function salaryRecordToMemberData(r: Record<string, unknown>): MemberData {
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

function payYearMonthToSalmm(ym: string): string | null {
	const d = String(ym || "").replace(/\D/g, "");
	if (d.length === 6) return d;
	return null;
}

// 급여 발생 행 타입 (테이블용)
interface SalaryRow {
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

// 하단 상세 폼 데이터 (F40100 매핑)
interface SalaryDetailForm {
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

const initialDetailForm: SalaryDetailForm = {
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

export default function MonthlySalaryData() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);

	// 급여발생자료 (우측) — F40100
	const [payYearMonth, setPayYearMonth] = useState("2026-01");
	const [payCalcUnit, setPayCalcUnit] = useState(true); // true: 십미만절사 (추후 계산로직 연동)
	const [salaryRecords, setSalaryRecords] = useState<Record<string, unknown>[]>([]);
	const [salaryLoading, setSalaryLoading] = useState(false);
	const [detailForm, setDetailForm] = useState<SalaryDetailForm>(initialDetailForm);

	const salaryRows: SalaryRow[] = salaryRecords.map(mapDbToSalaryRow);

	const fetchSalaryList = async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setSalaryLoading(true);
		try {
			const res = await fetch(`/api/f40100?salmm=${encodeURIComponent(salmm)}`);
			const result = await res.json();
			if (result.success && Array.isArray(result.data)) {
				setSalaryRecords(result.data);
			} else {
				setSalaryRecords([]);
				if (!result.success) alert(result.error || "급여 데이터 조회에 실패했습니다.");
			}
		} catch (err) {
			console.error("F40100 조회 오류:", err);
			setSalaryRecords([]);
			alert("급여 데이터 조회 중 오류가 발생했습니다.");
		} finally {
			setSalaryLoading(false);
		}
	};

	const handleRowClick = (row: SalaryRow) => {
		const rec = salaryRecords.find((r) => String(r.PNUM ?? "").trim() === row.pnum.trim());
		if (!rec) return;
		setSelectedMember(salaryRecordToMemberData(rec));
		setDetailForm(mapDbToDetailForm(rec));
	};

	const handleSearch = () => {
		void fetchSalaryList();
	};

	const handleCalcAll = () => {
		alert("전체 급여계산은 배치/별도 모듈에서 처리됩니다. (십미만절사 옵션은 추후 반영)");
	};

	const handleCalcIndividual = () => {
		alert("개별 급여계산은 추후 연동 예정입니다.");
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			window.history.back();
		}
	};

	const handleDetailHistory = () => {
		alert("상세내역 화면은 추후 연동 예정입니다.");
	};

	const handleSave = async () => {
		if (!selectedMember) {
			alert("상단 급여 목록에서 수급자 행을 선택한 뒤 저장해 주세요.");
			return;
		}
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setSalaryLoading(true);
		try {
			const row = buildF40100Row(selectedMember, salmm, detailForm);
			const res = await fetch("/api/f40100", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ row }),
			});
			const result = await res.json();
			if (!res.ok || !result.success) {
				alert(result.error || "저장에 실패했습니다.");
				return;
			}
			alert("저장되었습니다.");
			await fetchSalaryList();
		} catch (err) {
			console.error("F40100 저장 오류:", err);
			alert("저장 중 오류가 발생했습니다.");
		} finally {
			setSalaryLoading(false);
		}
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				<div className="flex flex-1 flex-col overflow-hidden bg-white">
					{/* 상단: 제목 + 급여년월/계산단위 + 버튼 */}
					<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
						<h2 className="text-lg font-semibold text-blue-900">수급자급여발생자료</h2>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">급여년월</label>
							<input
								type="month"
								value={payYearMonth}
								onChange={(e) => setPayYearMonth(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">급여계산단위</label>
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									checked={payCalcUnit}
									onChange={(e) => setPayCalcUnit(e.target.checked)}
									className="rounded border-blue-300 text-blue-600"
								/>
								<span className="text-sm text-blue-900">십미만절사</span>
							</label>
						</div>
						<div className="ml-auto flex flex-wrap gap-2">
							<button
								type="button"
								onClick={handleSearch}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								검색
							</button>
							<button
								type="button"
								onClick={handleCalcAll}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								전체급여계산
							</button>
							<button
								type="button"
								onClick={handleCalcIndividual}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								개별계산
							</button>
							<button
								type="button"
								onClick={handleClose}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
					</div>

					{/* 중앙: 급여 테이블 */}
					<div className="flex-1 overflow-hidden border-b border-blue-200">
						<div className="h-full overflow-auto">
							<table className="w-full min-w-[900px] text-xs">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											생일
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											등급
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											급여합계
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											공단부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											비급여식대
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											병실승급비
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											외래진료비
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											촉탁의료
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											촉탁처방
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											기타비용
										</th>
										<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
											수급자부담금합
										</th>
									</tr>
								</thead>
								<tbody>
									{salaryLoading ? (
										<tr>
											<td colSpan={13} className="px-2 py-8 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : salaryRows.length === 0 ? (
										<tr>
											<td
												colSpan={13}
												className="px-2 py-8 text-center text-blue-900/60"
											>
												급여 데이터가 없습니다. 급여년월을 선택한 뒤 검색해 주세요.
											</td>
										</tr>
									) : (
										salaryRows.map((row, idx) => (
											<tr
												key={`${row.pnum}-${idx}`}
												onClick={() => handleRowClick(row)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/50 ${
													selectedMember &&
													String(selectedMember.PNUM).trim() === row.pnum.trim()
														? "bg-blue-100"
														: ""
												}`}
											>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipient}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.birthday}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.grade}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.benefitTotal}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.nhaContribution}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipientContribution}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.nonBenefitMeal}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.roomUpgradeFee}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.outpatientFee}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.contractedMedical}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.contractedPrescription}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.otherCosts}
												</td>
												<td className="px-2 py-1.5 text-center">
													{row.recipientContributionTotal}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 하단: 상세 입력/표시 영역 */}
					<div className="border-t border-blue-200 bg-blue-50/30 p-4">
						<div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									수급자
								</label>
								<input
									type="text"
									value={detailForm.recipient}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, recipient: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									생일
								</label>
								<input
									type="text"
									value={detailForm.birthday}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, birthday: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									보험자부담율%
								</label>
								<input
									type="text"
									value={detailForm.inSper}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, inSper: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									placeholder="INSPER"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									수급자부담율%
								</label>
								<input
									type="text"
									value={detailForm.usrPer}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, usrPer: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									placeholder="USRPER"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									부담구분
								</label>
								<select
									value={detailForm.usrGu}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, usrGu: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								>
									<option value="1">1 일반</option>
									<option value="2">2 50%경감</option>
									<option value="3">3 기초생활</option>
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									공단부담금
								</label>
								<input
									type="text"
									value={detailForm.nhaContribution}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nhaContribution: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									수급자부담금
								</label>
								<input
									type="text"
									value={detailForm.recipientContribution}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											recipientContribution: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									이미용비
								</label>
								<input
									type="text"
									value={detailForm.beautyCost}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, beautyCost: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									비급여식대
								</label>
								<input
									type="text"
									value={detailForm.nonBenefitMeal}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nonBenefitMeal: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									비급여간식
								</label>
								<input
									type="text"
									value={detailForm.nonBenefitSnack}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nonBenefitSnack: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									목욕비
								</label>
								<input
									type="text"
									value={detailForm.bathFee}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, bathFee: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									placeholder="BSAL7"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									치매지원
								</label>
								<input
									type="text"
									value={detailForm.dementiaFee}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, dementiaFee: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									placeholder="BSAL8"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									기타비용
								</label>
								<input
									type="text"
									value={detailForm.otherCosts}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, otherCosts: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="col-span-2 flex items-start gap-2 md:col-span-4">
								<label className="w-24 shrink-0 pt-1.5 text-sm font-medium text-blue-900">
									기타내역
								</label>
								<textarea
									value={detailForm.otherCostDesc}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, otherCostDesc: e.target.value }))
									}
									rows={2}
									className="min-h-[52px] flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									placeholder="ESALDES"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									상급병실료
								</label>
								<input
									type="text"
									value={detailForm.premiumRoomFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											premiumRoomFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									외래진료비
								</label>
								<input
									type="text"
									value={detailForm.outpatientFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											outpatientFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									병실조정료
								</label>
								<input
									type="text"
									value={detailForm.roomAdjustFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											roomAdjustFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									촉탁진료비
								</label>
								<input
									type="text"
									value={detailForm.contractedMedicalFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											contractedMedicalFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									처방비
								</label>
								<input
									type="text"
									value={detailForm.prescriptionFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											prescriptionFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={handleDetailHistory}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								상세내역
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="rounded border border-blue-400 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
							>
								저장
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
