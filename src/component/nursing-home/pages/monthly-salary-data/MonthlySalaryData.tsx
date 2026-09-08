"use client";

/**
 * @file 월 급여자료 — 화면 컴포넌트 (MonthlySalaryData.tsx)
 *
 * @description
 * 요양원 월 급여자료 기능의 화면 컴포넌트입니다. 폴더: component/nursing-home/pages/monthly-salary-data
 *
 * @module component/nursing-home/pages/monthly-salary-data/MonthlySalaryData
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatCareGradeLabel } from "../../utils/careGrade";
import { useTabRefresh } from "../../hooks/useTabRefresh";
import {
	type MemberData,
	type SalaryDetailForm,
	type SalaryRow,
	buildF40100Row,
	calcRecipientBurdenTotal,
	fmtAmt,
	formatAmountCell,
	formatAmountInput,
	formatPercentCell,
	formatSignedAmountInput,
	initialDetailForm,
	mapDbToDetailForm,
	mapDbToSalaryRow,
	parseAmt,
	payYearMonthToSalmm,
	salaryRecordToMemberData,
	toYmd,
	collectRoomAdjustsForCalc,
} from "./MonthlySalaryDataUtils";

const DETAIL_ITEMS_PER_PAGE = 20;
const DETAIL_PAGE_NUMBER_BLOCK = 5;

/** 현재 월의 이전 월 (YYYY-MM, 로컬 시간 기준) */
function previousYearMonth() {
	const now = new Date();
	const dt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const y = dt.getFullYear();
	const m = String(dt.getMonth() + 1).padStart(2, "0");
	return `${y}-${m}`;
}

export default function MonthlySalaryData() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);

	// 급여발생자료 (우측) — F40100
	const [payYearMonth, setPayYearMonth] = useState(() => previousYearMonth());
	const [payCalcUnit, setPayCalcUnit] = useState(true); // true: 십미만절사 (추후 계산로직 연동)
	const [recipientFilter, setRecipientFilter] = useState("");
	const [salaryRecords, setSalaryRecords] = useState<Record<string, unknown>[]>([]);
	const [salaryLoading, setSalaryLoading] = useState(false);
	const [calcLoading, setCalcLoading] = useState(false);
	const [calcConfirm, setCalcConfirm] = useState<"all" | "individual" | null>(null);
	const [detailForm, setDetailForm] = useState<SalaryDetailForm>(initialDetailForm);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [detailRows, setDetailRows] = useState<Record<string, unknown>[]>([]);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailPage, setDetailPage] = useState(1);
	const [detailPageWindowStart, setDetailPageWindowStart] = useState(1);

	const salaryRows: SalaryRow[] = useMemo(() => {
		const rows = salaryRecords.map(mapDbToSalaryRow);
		const q = recipientFilter.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter(
			(r) =>
				r.recipient.toLowerCase().includes(q) ||
				r.pnum.toLowerCase().includes(q)
		);
	}, [salaryRecords, recipientFilter]);

	const detailTotalPages = Math.max(1, Math.ceil(detailRows.length / DETAIL_ITEMS_PER_PAGE));
	const detailMaxPageWindowStart = useMemo(() => {
		if (detailTotalPages <= 1) return 1;
		return Math.floor((detailTotalPages - 1) / DETAIL_PAGE_NUMBER_BLOCK) * DETAIL_PAGE_NUMBER_BLOCK + 1;
	}, [detailTotalPages]);
	const detailPageNumbers = useMemo(() => {
		const end = Math.min(detailPageWindowStart + DETAIL_PAGE_NUMBER_BLOCK - 1, detailTotalPages);
		if (detailPageWindowStart > detailTotalPages) return [];
		return Array.from({ length: end - detailPageWindowStart + 1 }, (_, i) => detailPageWindowStart + i);
	}, [detailPageWindowStart, detailTotalPages]);
	const currentDetailRows = useMemo(() => {
		const start = (detailPage - 1) * DETAIL_ITEMS_PER_PAGE;
		return detailRows.slice(start, start + DETAIL_ITEMS_PER_PAGE);
	}, [detailRows, detailPage]);

	/** 수급자부담금 + 비급여/기타 등 (상단 그리드 수급자부담금합과 동일 구성). 병실조정료 음수는 할인 */
	const recipientBurdenTotal = useMemo(() => calcRecipientBurdenTotal(detailForm), [detailForm]);

	const readOnlyInputClass =
		"h-9 min-w-0 flex-1 rounded border border-blue-200 bg-slate-50 px-2.5 text-sm text-blue-900/90 outline-none cursor-default";
	const editableInputClass =
		"h-9 min-w-0 flex-1 rounded border border-blue-300 bg-white px-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400";
	const amountReadOnlyClass = `${readOnlyInputClass} text-right tabular-nums`;
	const amountEditableClass = `${editableInputClass} text-right tabular-nums`;
	const readOnlySelectClass =
		"h-9 min-w-0 flex-1 rounded border border-blue-200 bg-slate-50 px-2.5 text-sm text-blue-900/90 outline-none cursor-default";
	const editableTextareaClass =
		"min-h-[52px] min-w-0 flex-1 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400";
	const fieldLabelClass = "w-28 shrink-0 text-sm font-medium text-blue-900";

	useEffect(() => {
		setDetailPage((p) => Math.min(p, detailTotalPages));
		setDetailPageWindowStart((s) => Math.min(s, detailMaxPageWindowStart));
	}, [detailTotalPages, detailMaxPageWindowStart]);

	const fetchSalaryList = useCallback(async (ym?: string, opts?: { silent?: boolean }) => {
		const salmm = payYearMonthToSalmm(ym ?? payYearMonth);
		if (!salmm) {
			if (!opts?.silent) alert("급여년월을 선택해 주세요.");
			return [] as Record<string, unknown>[];
		}
		setSalaryLoading(true);
		try {
			const res = await fetch(`/api/f40100?salmm=${encodeURIComponent(salmm)}`);
			const result = await res.json();
			if (result.success && Array.isArray(result.data)) {
				setSalaryRecords(result.data);
				return result.data as Record<string, unknown>[];
			}
			setSalaryRecords([]);
			if (!result.success && !opts?.silent) {
				alert(result.error || "급여 데이터 조회에 실패했습니다.");
			}
			return [] as Record<string, unknown>[];
		} catch (err) {
			console.error("F40100 조회 오류:", err);
			setSalaryRecords([]);
			if (!opts?.silent) alert("급여 데이터 조회 중 오류가 발생했습니다.");
			return [] as Record<string, unknown>[];
		} finally {
			setSalaryLoading(false);
		}
	}, [payYearMonth]);

	useEffect(() => {
		setSelectedMember(null);
		setDetailForm(initialDetailForm);
		void fetchSalaryList(payYearMonth, { silent: true });
	}, [payYearMonth, fetchSalaryList]);

	// 탭 재활성화: 급여년월·선택 수급자는 유지하고 목록만 재조회
	useTabRefresh(() => {
		void (async () => {
			const prevPnum = selectedMember?.PNUM ? String(selectedMember.PNUM).trim() : "";
			const data = await fetchSalaryList(payYearMonth, { silent: true });
			if (!prevPnum) return;
			const rec = data.find((r) => String(r.PNUM ?? "").trim() === prevPnum);
			if (rec) {
				setSelectedMember(salaryRecordToMemberData(rec));
			}
		})();
	});

	const handleRowClick = (row: SalaryRow) => {
		const rec = salaryRecords.find((r) => String(r.PNUM ?? "").trim() === row.pnum.trim());
		if (!rec) return;
		setSelectedMember(salaryRecordToMemberData(rec));
		setDetailForm(mapDbToDetailForm(rec));
	};

	const handleSearch = () => {
		void fetchSalaryList();
	};

	const runSalaryCalc = async (pnum: number, successMessage: string) => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setCalcLoading(true);
		try {
			const res = await fetch("/api/f40100", {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					salmm,
					pnum,
					wonflag: payCalcUnit ? 1 : 0,
					roomAdjusts: collectRoomAdjustsForCalc(
						salaryRecords,
						selectedMember?.PNUM,
						detailForm.roomAdjustFee
					),
				}),
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || "급여계산에 실패했습니다.");
			}
			alert(successMessage);
			const selectedPnum = selectedMember?.PNUM ? String(selectedMember.PNUM).trim() : "";
			const rows = await fetchSalaryList(payYearMonth, { silent: true });
			if (selectedPnum) {
				const rec = rows.find((r) => String(r.PNUM ?? "").trim() === selectedPnum);
				if (rec) {
					setSelectedMember(salaryRecordToMemberData(rec));
					setDetailForm(mapDbToDetailForm(rec));
				}
			}
		} catch (err) {
			console.error("Usp_P40100 호출 오류:", err);
			alert(err instanceof Error ? err.message : "급여계산 중 오류가 발생했습니다.");
		} finally {
			setCalcLoading(false);
		}
	};

	const handleCalcAll = () => {
		if (!payYearMonthToSalmm(payYearMonth)) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setCalcConfirm("all");
	};

	const handleCalcIndividual = () => {
		if (!selectedMember?.PNUM) {
			alert("상단 급여 목록에서 수급자 행을 선택한 뒤 개별계산해 주세요.");
			return;
		}
		const pnum = Number(String(selectedMember.PNUM).trim());
		if (!Number.isFinite(pnum)) {
			alert("선택한 수급자번호(PNUM)가 올바르지 않습니다.");
			return;
		}
		setCalcConfirm("individual");
	};

	const closeCalcConfirm = () => {
		if (calcLoading) return;
		setCalcConfirm(null);
	};

	const confirmCalcAll = () => {
		setCalcConfirm(null);
		void runSalaryCalc(9999999, "전체 급여계산이 완료되었습니다.");
	};

	const confirmCalcIndividual = () => {
		if (!selectedMember?.PNUM) {
			setCalcConfirm(null);
			alert("상단 급여 목록에서 수급자 행을 선택한 뒤 개별계산해 주세요.");
			return;
		}
		const pnum = Number(String(selectedMember.PNUM).trim());
		if (!Number.isFinite(pnum)) {
			setCalcConfirm(null);
			alert("선택한 수급자번호(PNUM)가 올바르지 않습니다.");
			return;
		}
		setCalcConfirm(null);
		void runSalaryCalc(pnum, "개별 급여계산이 완료되었습니다.");
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			window.history.back();
		}
	};

	const handleDetailHistory = async () => {
		if (!selectedMember?.PNUM) {
			alert("상단 급여 목록에서 수급자 행을 선택한 뒤 상세내역을 조회해 주세요.");
			return;
		}
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setDetailModalOpen(true);
		setDetailLoading(true);
		setDetailRows([]);
		setDetailPage(1);
		setDetailPageWindowStart(1);
		try {
			const res = await fetch(
				`/api/f40110?salmm=${encodeURIComponent(salmm)}&pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}`,
				{ credentials: "include", cache: "no-store" }
			);
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || "상세내역 조회에 실패했습니다.");
			}
			setDetailRows(Array.isArray(result.data) ? result.data : []);
		} catch (err) {
			console.error("F40110 조회 오류:", err);
			alert(err instanceof Error ? err.message : "상세내역 조회 중 오류가 발생했습니다.");
			setDetailModalOpen(false);
		} finally {
			setDetailLoading(false);
		}
	};

	const closeDetailModal = () => {
		setDetailModalOpen(false);
		setDetailRows([]);
		setDetailPage(1);
		setDetailPageWindowStart(1);
	};

	const handleDetailPageChange = (page: number) => {
		const p = Math.max(1, Math.min(page, detailTotalPages));
		setDetailPage(p);
		const blockStart = Math.floor((p - 1) / DETAIL_PAGE_NUMBER_BLOCK) * DETAIL_PAGE_NUMBER_BLOCK + 1;
		setDetailPageWindowStart(blockStart);
	};

	const weekdayLabel = (ymd: string) => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
		const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
		const dt = new Date(y, m - 1, d);
		const names = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
		return names[dt.getDay()] || "";
	};

	const statusLabel = (st: string | undefined) => {
		const s = String(st ?? "").trim();
		if (s === "1") return "입원";
		if (s === "9") return "퇴소";
		return s || "-";
	};

	const formatDetailDate = (v: unknown) => {
		const ymd = toYmd(v);
		return ymd || "-";
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
			const rows = await fetchSalaryList();
			const savedPnum = String(selectedMember.PNUM).trim();
			const rec = rows.find((r) => String(r.PNUM ?? "").trim() === savedPnum);
			if (rec) {
				setSelectedMember(salaryRecordToMemberData(rec));
				setDetailForm(mapDbToDetailForm(rec));
			}
		} catch (err) {
			console.error("F40100 저장 오류:", err);
			alert("저장 중 오류가 발생했습니다.");
		} finally {
			setSalaryLoading(false);
		}
	};

	return (
		<div className="flex flex-col min-h-screen w-full max-w-full min-w-0 overflow-x-hidden text-black bg-white">
			<div className="flex flex-col xl:flex-row xl:h-[calc(100vh-56px)] min-h-0">
				<div className="flex flex-1 flex-col overflow-hidden bg-white">
					{/* 상단: 제목 + 급여년월/계산단위 + 버튼 */}
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3">
						<div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
							<h2 className="whitespace-nowrap text-xl font-semibold text-blue-900">
								수급자급여발생자료
							</h2>
							<div className="flex items-center gap-2">
								<label className="whitespace-nowrap text-sm font-medium text-blue-900">
									급여년월
								</label>
								<input
									type="month"
									value={payYearMonth}
									onChange={(e) => setPayYearMonth(e.target.value)}
									className="h-9 rounded border border-blue-300 bg-white px-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="whitespace-nowrap text-sm font-medium text-blue-900">
									수급자명
								</label>
								<input
									type="text"
									value={recipientFilter}
									onChange={(e) => setRecipientFilter(e.target.value)}
									placeholder="이름 입력 시 즉시 필터"
									className="h-9 w-44 min-w-[10rem] rounded border border-blue-300 bg-white px-2.5 text-sm text-blue-900 placeholder:text-blue-900/40 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
								/>
							</div>
							<div className="flex items-center gap-2">
								<span className="whitespace-nowrap text-sm font-medium text-blue-900">
									급여계산단위
								</span>
								<label className="flex h-9 cursor-pointer items-center gap-2 rounded border border-blue-300 bg-white px-2.5 hover:bg-blue-50">
									<input
										type="checkbox"
										checked={payCalcUnit}
										onChange={(e) => setPayCalcUnit(e.target.checked)}
										className="h-4 w-4 accent-blue-600"
									/>
									<span className="whitespace-nowrap text-sm text-blue-900">십미만절사</span>
								</label>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={handleCalcAll}
								disabled={calcLoading || salaryLoading}
								className="h-9 rounded border border-blue-700 bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
							>
								{calcLoading ? "계산 중..." : "전체급여계산"}
							</button>
							<button
								type="button"
								onClick={handleCalcIndividual}
								disabled={calcLoading || salaryLoading}
								className="h-9 rounded border border-blue-300 bg-white px-4 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:pointer-events-none disabled:opacity-50"
							>
								개별계산
							</button>
						</div>
					</div>

					{/* 중앙: 급여 테이블 */}
					<div className="min-h-0 min-w-0 flex-1 overflow-hidden border-b border-blue-200">
						<div className="h-full w-full min-w-0 overflow-x-auto overflow-y-auto">
							<table className="w-full min-w-[1120px] border-collapse text-xs">
								<colgroup>
									<col className="w-[9.5rem]" />
									<col className="w-[7.5rem]" />
									<col className="w-[5.5rem]" />
									<col />
									<col />
									<col />
									<col />
									<col />
									<col />
									<col />
									<col />
									<col />
									<col />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-blue-50">
									<tr className="border-b border-blue-200">
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											수급자
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											생일
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											등급
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											급여합계
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											공단부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											수급자부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											비급여식대
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											병실승급비
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											외래진료비
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											촉탁의료
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											촉탁처방
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2.5 text-center font-semibold text-blue-900">
											기타비용
										</th>
										<th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold text-blue-900">
											수급자부담금합
										</th>
									</tr>
								</thead>
								<tbody>
									{salaryLoading ? (
										<tr>
											<td colSpan={13} className="px-2 py-10 text-center text-sm text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : salaryRows.length === 0 ? (
										<tr>
											<td
												colSpan={13}
												className="px-2 py-10 text-center text-sm text-blue-900/60"
											>
												해당 급여년월 데이터가 없습니다.
											</td>
										</tr>
									) : (
										salaryRows.map((row, idx) => {
											const selected =
												selectedMember &&
												String(selectedMember.PNUM).trim() === row.pnum.trim();
											return (
											<tr
												key={`${row.pnum}-${idx}`}
												onClick={() => handleRowClick(row)}
												className={`cursor-pointer border-b border-blue-100 ${
													selected
														? "bg-blue-100 font-medium hover:bg-blue-100"
														: idx % 2 === 1
															? "bg-slate-50/80 hover:bg-blue-50"
															: "bg-white hover:bg-blue-50"
												}`}
											>
												<td className="truncate border-r border-blue-100 px-2 py-2 text-left text-blue-900">
													{row.recipient}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-center tabular-nums text-blue-900">
													{row.birthday}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-center text-blue-900">
													{row.grade}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.benefitTotal}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.nhaContribution}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.recipientContribution}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.nonBenefitMeal}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.roomUpgradeFee}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.outpatientFee}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.contractedMedical}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.contractedPrescription}
												</td>
												<td className="whitespace-nowrap border-r border-blue-100 px-2 py-2 text-right tabular-nums text-blue-900">
													{row.otherCosts}
												</td>
												<td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-blue-900">
													{row.recipientContributionTotal}
												</td>
											</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 하단: 상세 입력/표시 영역 */}
					<div className="relative border-t border-blue-200 bg-slate-50/60 p-4">
						{!selectedMember && (
							<div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50">
								<p className="rounded-lg border border-blue-300 bg-white px-8 py-4 text-base font-semibold text-blue-900 shadow-sm">
									수급자를 선택해주세요
								</p>
							</div>
						)}
						<div
							className={!selectedMember ? "pointer-events-none select-none blur-[2px]" : undefined}
							aria-hidden={!selectedMember}
						>
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-orange-300 bg-orange-50 px-4 py-2.5">
							<span className="text-sm font-semibold text-orange-800">
								수급자 {selectedMember?.P_NM || detailForm.recipient || "***"}님 부담금 합
							</span>
							<span className="text-2xl font-bold tabular-nums leading-none text-orange-700">
								{recipientBurdenTotal.toLocaleString("ko-KR")}
							</span>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-4">
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									수급자
								</label>
								<input
									type="text"
									value={detailForm.recipient}
									readOnly
									className={readOnlyInputClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									생일
								</label>
								<input
									type="text"
									value={detailForm.birthday}
									readOnly
									className={readOnlyInputClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									보험자부담율%
								</label>
								<input
									type="text"
									value={detailForm.inSper}
									readOnly
									className={amountReadOnlyClass}
									placeholder="INSPER"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									수급자부담율%
								</label>
								<input
									type="text"
									value={detailForm.usrPer}
									readOnly
									className={amountReadOnlyClass}
									placeholder="USRPER"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									부담구분
								</label>
								<select
									value={detailForm.usrGu}
									disabled
									className={readOnlySelectClass}
								>
									<option value="1">1 일반</option>
									<option value="2">2 50%경감</option>
									<option value="3">3 기초생활</option>
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									공단부담금
								</label>
								<input
									type="text"
									value={detailForm.nhaContribution}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nhaContribution: formatAmountInput(e.target.value),
										}))
									}
									className={amountEditableClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									수급자부담금
								</label>
								<input
									type="text"
									value={detailForm.recipientContribution}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											recipientContribution: formatAmountInput(e.target.value),
										}))
									}
									className={amountEditableClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									이미용비
								</label>
								<input
									type="text"
									value={detailForm.beautyCost}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											beautyCost: formatAmountInput(e.target.value),
										}))
									}
									className={amountEditableClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									비급여식대
								</label>
								<input
									type="text"
									value={detailForm.nonBenefitMeal}
									readOnly
									className={amountReadOnlyClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass} title="계약 간식비 1회가 있는 수급자만. 오전·오후 제공 시 계약 단가, 저녁은 미포함">
									비급여간식
								</label>
								<input
									type="text"
									value={detailForm.nonBenefitSnack}
									readOnly
									className={amountReadOnlyClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									목욕비
								</label>
								<input
									type="text"
									value={detailForm.bathFee}
									readOnly
									className={amountReadOnlyClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									촉탁진료비
								</label>
								<input
									type="text"
									value={detailForm.dementiaFee}
									readOnly
									className={amountReadOnlyClass}
									placeholder="BSAL8"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									상급병실료
								</label>
								<input
									type="text"
									value={detailForm.premiumRoomFee}
									readOnly
									className={amountReadOnlyClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									외래진료비
								</label>
								<input
									type="text"
									value={detailForm.outpatientFee}
									readOnly
									className={amountReadOnlyClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass} title="음수 입력 시 상급병실료에서 할인됩니다">
									병실조정료
								</label>
								<input
									type="text"
									value={detailForm.roomAdjustFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											roomAdjustFee: formatSignedAmountInput(e.target.value),
										}))
									}
									className={amountEditableClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									처방비
								</label>
								<input
									type="text"
									value={fmtAmt(
										parseAmt(detailForm.contractedMedicalFee) +
											parseAmt(detailForm.prescriptionFee)
									)}
									readOnly
									className={amountReadOnlyClass}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className={fieldLabelClass}>
									기타비용
								</label>
								<input
									type="text"
									value={detailForm.otherCosts}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											otherCosts: formatAmountInput(e.target.value),
										}))
									}
									className={amountEditableClass}
								/>
							</div>
							<div className="col-span-2 flex items-start gap-2 md:col-span-4">
								<label className={`${fieldLabelClass} pt-1.5`}>
									기타내역
								</label>
								<textarea
									value={detailForm.otherCostDesc}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, otherCostDesc: e.target.value }))
									}
									rows={2}
									className={editableTextareaClass}
									placeholder="기타내역을 입력해주세요"
								/>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={handleDetailHistory}
								disabled={!selectedMember}
								className="h-9 rounded border border-blue-300 bg-white px-4 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-50"
							>
								상세내역
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={!selectedMember}
								className="h-9 rounded border border-blue-700 bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
							>
								저장
							</button>
						</div>
						</div>
					</div>
				</div>
			</div>

			{calcConfirm === "individual" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div
						className="w-full max-w-md rounded-lg border border-blue-300 bg-white shadow-lg"
						role="dialog"
						aria-modal="true"
						aria-labelledby="calc-individual-title"
					>
						<div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
							<h2 id="calc-individual-title" className="text-base font-semibold text-blue-900">
								개별 급여계산
							</h2>
						</div>
						<div className="px-4 py-5 text-sm leading-relaxed text-blue-900">
							<strong>{selectedMember?.P_NM || "선택한 수급자"}</strong>의 급여를 다시 계산합니다.
						</div>
						<div className="flex justify-end gap-2 border-t border-blue-200 bg-blue-50/40 px-4 py-3">
							<button
								type="button"
								onClick={closeCalcConfirm}
								disabled={calcLoading}
								className="rounded border border-gray-400 bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50"
							>
								취소
							</button>
							<button
								type="button"
								onClick={confirmCalcIndividual}
								disabled={calcLoading}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								개별계산 수행하기
							</button>
						</div>
					</div>
				</div>
			)}

			{calcConfirm === "all" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div
						className="w-full max-w-md rounded-lg border border-blue-300 bg-white shadow-lg"
						role="dialog"
						aria-modal="true"
						aria-labelledby="calc-all-title"
					>
						<div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
							<h2 id="calc-all-title" className="text-base font-semibold text-blue-900">
								전체 급여계산
							</h2>
						</div>
						<div className="space-y-2 px-4 py-5 text-sm leading-relaxed text-blue-900">
							<p>
								급여명세서를 수급자(보호자)에게 보낸 경우에는 급여계산을 다시 하지 마십시요.
							</p>
							<p>그래도 다시 하시겠습니까?</p>
						</div>
						<div className="flex justify-end gap-2 border-t border-blue-200 bg-blue-50/40 px-4 py-3">
							<button
								type="button"
								onClick={closeCalcConfirm}
								disabled={calcLoading}
								className="rounded border border-gray-400 bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50"
							>
								취소
							</button>
							<button
								type="button"
								onClick={confirmCalcAll}
								disabled={calcLoading}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								전체급여 계산하기
							</button>
						</div>
					</div>
				</div>
			)}

			{detailModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
					<div
						className="flex h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-lg border border-blue-300 bg-white shadow-xl"
						role="dialog"
						aria-modal="true"
						aria-labelledby="salary-detail-modal-title"
					>
						<div className="relative flex items-center justify-center border-b border-blue-200 bg-blue-50 px-4 py-3">
							<h2
								id="salary-detail-modal-title"
								className="text-lg font-semibold text-blue-900"
							>
								수급자 급여발생자료 상세조회
							</h2>
							<button
								type="button"
								onClick={closeDetailModal}
								className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-blue-400 bg-blue-200 px-3 py-1 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>

						<div className="space-y-2 border-b border-blue-200 bg-blue-50/30 p-3 text-sm">
							<div className="grid grid-cols-12 gap-1">
								<div className="col-span-2 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										급여년월
									</span>
									<span className="rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{(payYearMonth || "").slice(0, 4) || "-"}
									</span>
									<span className="rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{(payYearMonth || "").slice(5, 7) || "-"}
									</span>
								</div>
								<div className="col-span-3 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										수급자
									</span>
									<span className="min-w-0 flex-1 truncate rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{selectedMember?.P_NM || "-"}
									</span>
								</div>
								<div className="col-span-3 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										상태
									</span>
									<span className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{statusLabel(selectedMember?.P_ST)}
									</span>
								</div>
								<div className="col-span-4 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										요양등급
									</span>
									<span className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{formatCareGradeLabel(selectedMember?.P_GRD || "")}
									</span>
								</div>
							</div>
							<div className="grid grid-cols-12 gap-1">
								<div className="col-span-4 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										인정번호
									</span>
									<span className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{selectedMember?.P_YYNO || "-"}
									</span>
								</div>
								<div className="col-span-3 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										발급일자
									</span>
									<span className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{formatDetailDate(selectedMember?.P_YYDT)}
									</span>
								</div>
								<div className="col-span-5 flex items-center gap-1">
									<span className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-blue-900">
										유효기간
									</span>
									<span className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-blue-900">
										{formatDetailDate(selectedMember?.P_YYSDT)} ~{" "}
										{formatDetailDate(selectedMember?.P_YYEDT)}
									</span>
								</div>
							</div>
						</div>

						<div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto w-full min-w-0 p-2">
							<table className="w-max max-w-none min-w-[1300px] border-collapse text-xs">
								<thead className="sticky top-0 z-10 bg-blue-100">
									<tr>
										{[
											"일자",
											"요일",
											"등급",
											"급여",
											"공단부담금",
											"수급자부담율",
											"본인부담금",
											"상급침실료",
											"외래진료",
											"아침",
											"점심",
											"저녁",
											"오전간식",
											"오후간식",
											"저녁간식(제공)",
											"촉탁진료",
											"촉탁처방비",
										].map((h) => (
											<th
												key={h}
												className="whitespace-nowrap border border-blue-300 px-2 py-2 text-center font-semibold text-blue-900"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{detailLoading ? (
										<tr>
											<td
												colSpan={17}
												className="border border-blue-200 px-3 py-10 text-center text-blue-900/60"
											>
												조회 중...
											</td>
										</tr>
									) : detailRows.length === 0 ? (
										<tr>
											<td
												colSpan={17}
												className="border border-blue-200 px-3 py-10 text-center text-blue-900/60"
											>
												상세내역 데이터가 없습니다.
											</td>
										</tr>
									) : (
										currentDetailRows.map((row, idx) => {
											const svdt = formatDetailDate(row.SVDT);
											const globalIdx = (detailPage - 1) * DETAIL_ITEMS_PER_PAGE + idx;
											return (
												<tr
													key={`${svdt}-${globalIdx}`}
													className="hover:bg-blue-50/60"
												>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-center text-blue-900">
														{svdt}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-center text-blue-900">
														{weekdayLabel(svdt)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-center text-blue-900">
														{formatCareGradeLabel(String(row.P_GRD ?? ""))}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.SALAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.SAL1)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatPercentCell(row.USRPER)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.SAL2)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.ESAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.MEGAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.MOAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.AFAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.EVAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.AMAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.PMAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-center text-blue-900">
														{String(row.DGST ?? "").trim() === "1" ? "○" : ""}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.DOCAMT)}
													</td>
													<td className="whitespace-nowrap border border-blue-200 px-2 py-1.5 text-right text-blue-900">
														{formatAmountCell(row.PREAMT)}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{detailRows.length > 0 && (
							<div className="border-t border-blue-200 bg-white p-2">
								<div className="flex flex-wrap items-center justify-center gap-2 text-sm text-blue-900">
									<span className="tabular-nums">
										{detailPage} / {detailTotalPages} (총 {detailRows.length}건)
									</span>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => {
												const prevStart = Math.max(1, detailPageWindowStart - DETAIL_PAGE_NUMBER_BLOCK);
												setDetailPageWindowStart(prevStart);
												setDetailPage(prevStart);
											}}
											disabled={detailPageWindowStart <= 1}
											className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											&lt;&lt;
										</button>
										<button
											type="button"
											onClick={() => handleDetailPageChange(detailPage - 1)}
											disabled={detailPage === 1}
											className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											&lt;
										</button>
										{detailPageNumbers.map((pageNum) => (
											<button
												key={pageNum}
												type="button"
												onClick={() => handleDetailPageChange(pageNum)}
												className={`min-w-[2rem] rounded border px-2 py-1 text-sm tabular-nums ${
													detailPage === pageNum
														? "border-blue-500 bg-blue-500 font-semibold text-white"
														: "border-blue-300 hover:bg-blue-50"
												}`}
											>
												{pageNum}
											</button>
										))}
										<button
											type="button"
											onClick={() => handleDetailPageChange(detailPage + 1)}
											disabled={detailPage === detailTotalPages}
											className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											&gt;
										</button>
										<button
											type="button"
											onClick={() => {
												const nextStart = detailPageWindowStart + DETAIL_PAGE_NUMBER_BLOCK;
												if (nextStart <= detailMaxPageWindowStart) {
													setDetailPageWindowStart(nextStart);
													setDetailPage(nextStart);
												}
											}}
											disabled={detailPageWindowStart >= detailMaxPageWindowStart}
											className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
