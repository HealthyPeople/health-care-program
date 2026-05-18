"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatCareGradeLabel, normalizePGrdForSelect } from "../../utils/careGrade";

interface F40010Row {
	ANCD: number | string;
	SDT: string;
	P_GRD: string;
	BAAMT: number | null;
	OUTAMT: number | null;
	INDT?: string | null;
	ETC?: string | null;
	INEMPNO?: number | null;
	INEMPNM?: string | null;
}

interface FormState {
	applyDate: string;
	grade: string;
	inpatientPrice: string;
	outpatientPrice: string;
}

const GRADE_OPTIONS = [
	{ value: "1", label: "1등급" },
	{ value: "2", label: "2등급" },
	{ value: "3", label: "3등급" },
	{ value: "4", label: "4등급" },
	{ value: "5", label: "5등급" },
	{ value: "9", label: "인지지원" },
	{ value: "0", label: "등급외" },
];

const ITEMS_PER_PAGE = 14;
/** 하단 페이지 번호 버튼 — 한 번에 표시할 개수 */
const PAGE_NUMBER_BLOCK = 5;

/** SDT 등 날짜를 YYYY-MM-DD(예: 2024-01-01)로 통일 */
function formatSdt(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	if (s.includes("T")) return s.split("T")[0] ?? "";
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	const head = s.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : "";
}

function todayYmd(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function formatAmount(v: number | null | undefined): string {
	if (v == null || Number.isNaN(Number(v))) return "";
	return Number(v).toLocaleString("ko-KR");
}

function parseAmountInput(v: string): number {
	const n = parseInt(String(v).replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

function rowKey(row: Pick<F40010Row, "SDT" | "P_GRD">): string {
	return `${formatSdt(row.SDT)}|${String(row.P_GRD ?? "").trim()}`;
}

const emptyForm = (): FormState => ({
	applyDate: todayYmd(),
	grade: "1",
	inpatientPrice: "",
	outpatientPrice: "",
});

function rowToForm(row: F40010Row): FormState {
	return {
		applyDate: formatSdt(row.SDT) || todayYmd(),
		grade: normalizePGrdForSelect(row.P_GRD) || "1",
		inpatientPrice: formatAmount(row.BAAMT),
		outpatientPrice: formatAmount(row.OUTAMT),
	};
}

export default function GradeSalaryTable() {
	const [salaryRows, setSalaryRows] = useState<F40010Row[]>([]);
	const [formData, setFormData] = useState<FormState>(emptyForm);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageWindowStart, setPageWindowStart] = useState(1);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [userEmp, setUserEmp] = useState<{ empno?: number | string; empnm?: string }>({});

	const totalPages = Math.max(1, Math.ceil(salaryRows.length / ITEMS_PER_PAGE));
	const maxPageWindowStart = useMemo(() => {
		if (totalPages <= 1) return 1;
		return Math.floor((totalPages - 1) / PAGE_NUMBER_BLOCK) * PAGE_NUMBER_BLOCK + 1;
	}, [totalPages]);
	const pageNumbers = useMemo(() => {
		const end = Math.min(pageWindowStart + PAGE_NUMBER_BLOCK - 1, totalPages);
		if (pageWindowStart > totalPages) return [];
		return Array.from({ length: end - pageWindowStart + 1 }, (_, i) => pageWindowStart + i);
	}, [pageWindowStart, totalPages]);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const currentRows = useMemo(
		() => salaryRows.slice(startIndex, startIndex + ITEMS_PER_PAGE),
		[salaryRows, startIndex],
	);

	const selectedRow = useMemo(
		() => (selectedKey ? salaryRows.find((r) => rowKey(r) === selectedKey) ?? null : null),
		[salaryRows, selectedKey],
	);

	const loadRows = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/f40010", { credentials: "include", cache: "no-store" });
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "급여단가 목록 조회에 실패했습니다.");
			}
			const rows: F40010Row[] = (Array.isArray(json.data) ? json.data : []).map((r: F40010Row) => ({
				...r,
				SDT: formatSdt(r.SDT),
				INDT: r.INDT != null ? formatSdt(r.INDT) : r.INDT,
			}));
			setSalaryRows(rows);
		} catch (e) {
			setSalaryRows([]);
			setError(e instanceof Error ? e.message : "급여단가 목록 조회 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadRows();
		(async () => {
			try {
				const res = await fetch("/api/auth/user-info", { credentials: "include", cache: "no-store" });
				const json = await res.json();
				if (json?.success && json?.data) {
					setUserEmp({ empno: json.data.empno, empnm: json.data.empnm });
				}
			} catch {
				// ignore
			}
		})();
	}, [loadRows]);

	useEffect(() => {
		setCurrentPage((p) => Math.min(p, totalPages));
		setPageWindowStart((s) => Math.min(s, maxPageWindowStart));
	}, [totalPages, maxPageWindowStart]);

	const handleRowSelect = (row: F40010Row) => {
		const key = rowKey(row);
		setSelectedKey(key);
		setFormData(rowToForm(row));
	};

	const handleSave = async () => {
		if (!formData.applyDate || !formData.grade) {
			alert("적용 일자와 요양 등급을 입력해 주세요.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/f40010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					SDT: formatSdt(formData.applyDate),
					P_GRD: formData.grade,
					BAAMT: parseAmountInput(formData.inpatientPrice),
					OUTAMT: parseAmountInput(formData.outpatientPrice),
					INEMPNO: userEmp.empno ?? null,
					INEMPNM: userEmp.empnm ?? null,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "저장에 실패했습니다.");
			}
			await loadRows();
			const key = rowKey({ SDT: formData.applyDate, P_GRD: formData.grade });
			setSelectedKey(key);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.";
			setError(msg);
			alert(msg);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedRow) {
			alert("삭제할 항목을 목록에서 선택해 주세요.");
			return;
		}
		if (!confirm("정말 삭제하시겠습니까?")) return;

		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/f40010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "delete",
					SDT: formatSdt(selectedRow.SDT),
					P_GRD: normalizePGrdForSelect(selectedRow.P_GRD) || selectedRow.P_GRD,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "삭제에 실패했습니다.");
			}
			setSelectedKey(null);
			setFormData(emptyForm());
			await loadRows();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.";
			setError(msg);
			alert(msg);
		} finally {
			setSaving(false);
		}
	};

	const handleCopyBenefits = () => {
		alert("준비중입니다");
	};

	const handleClose = () => {
		// TODO: 닫기
	};

	const handlePageChange = (page: number) => {
		const p = Math.max(1, Math.min(page, totalPages));
		setCurrentPage(p);
		const blockStart = Math.floor((p - 1) / PAGE_NUMBER_BLOCK) * PAGE_NUMBER_BLOCK + 1;
		setPageWindowStart(blockStart);
	};

	const handlePrevPageBlock = () => {
		const prevStart = Math.max(1, pageWindowStart - PAGE_NUMBER_BLOCK);
		setPageWindowStart(prevStart);
		setCurrentPage(prevStart);
	};

	const handleNextPageBlock = () => {
		const nextStart = pageWindowStart + PAGE_NUMBER_BLOCK;
		if (nextStart <= maxPageWindowStart) {
			setPageWindowStart(nextStart);
			setCurrentPage(nextStart);
		}
	};

	const handleNewEntry = () => {
		setSelectedKey(null);
		setFormData(emptyForm());
	};

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			<div className="border-b border-blue-200 bg-blue-50/50 px-6 py-4">
				<h1 className="text-center text-lg font-semibold text-blue-900">수급자 급여단가 관리</h1>
			</div>

			{error && (
				<div className="mx-4 mt-2 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
					{error}
				</div>
			)}

			<div className="flex flex-1 gap-4 p-4">
				<div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
					<div className="flex-1 overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										적용일
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										등급
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										입원단가
									</th>
									<th className="px-3 py-2 text-center font-semibold text-blue-900">외박단가</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={4} className="px-3 py-8 text-center text-blue-900/60">
											불러오는 중...
										</td>
									</tr>
								) : currentRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-8 text-center text-blue-900/60">
											급여단가 데이터가 없습니다.
										</td>
									</tr>
								) : (
									currentRows.map((row) => {
										const key = rowKey(row);
										const isSelected = selectedKey === key;
										return (
											<tr
												key={key}
												onClick={() => handleRowSelect(row)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/50 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{formatSdt(row.SDT)}
												</td>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{formatCareGradeLabel(row.P_GRD)}
												</td>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{formatAmount(row.BAAMT)}
												</td>
												<td className="px-3 py-2 text-center">{formatAmount(row.OUTAMT)}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{salaryRows.length > 0 && (
						<div className="border-t border-blue-200 bg-white p-2">
							<div className="flex flex-wrap items-center justify-center gap-2 text-sm text-blue-900">
								<span className="tabular-nums">
									{currentPage} / {totalPages} (총 {salaryRows.length}건)
								</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={handlePrevPageBlock}
										disabled={pageWindowStart <= 1}
										className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										aria-label="이전 페이지 번호 묶음"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										aria-label="이전 페이지"
									>
										&lt;
									</button>
									{pageNumbers.map((pageNum) => (
										<button
											key={pageNum}
											type="button"
											onClick={() => handlePageChange(pageNum)}
											className={`min-w-[2rem] rounded border px-2 py-1 text-sm tabular-nums ${
												currentPage === pageNum
													? "border-blue-500 bg-blue-500 font-semibold text-white"
													: "border-blue-300 hover:bg-blue-50"
											}`}
										>
											{pageNum}
										</button>
									))}
									<button
										type="button"
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										aria-label="다음 페이지"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={handleNextPageBlock}
										disabled={pageWindowStart >= maxPageWindowStart}
										className="rounded border border-blue-300 px-2 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
										aria-label="다음 페이지 번호 묶음"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="flex w-[40%] flex-col gap-4 rounded-lg border border-blue-300 bg-blue-50/30 p-4">
					<div className="flex gap-3">
						<div className="flex flex-col gap-2">
							{/* <button
								type="button"
								onClick={handleNewEntry}
								disabled={saving}
								className="rounded border border-blue-400 bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 whitespace-nowrap disabled:opacity-50"
							>
								신규
							</button> */}
							<button
								type="button"
								onClick={handleSave}
								disabled={saving}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap disabled:opacity-50"
							>
								&lt;= 저장
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={saving || !selectedRow}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap disabled:opacity-50"
							>
								삭제 =&gt;
							</button>
						</div>

						<div className="flex flex-1 flex-col gap-3">
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">적용 일자</label>
								<input
									type="date"
									value={formData.applyDate}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, applyDate: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">요양 등급</label>
								<select
									value={formData.grade}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, grade: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								>
									{GRADE_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">입원 단가</label>
								<input
									type="text"
									value={formData.inpatientPrice}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											inpatientPrice: e.target.value,
										}))
									}
									placeholder="예: 93,070"
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">외박 단가</label>
								<input
									type="text"
									value={formData.outpatientPrice}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											outpatientPrice: e.target.value,
										}))
									}
									placeholder="예: 46,540"
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleCopyBenefits}
							className="flex-1 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							급여 복사
						</button>
						{/* <button
							type="button"
							onClick={handleClose}
							className="flex-1 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button> */}
					</div>
				</div>
			</div>
		</div>
	);
}
