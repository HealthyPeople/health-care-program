"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	buildAllBaseYearAnnualLeavePrintRows,
	buildAllDetailAnnualLeavePrintSections,
	buildAllEmployeesAnnualLeavePrintRows,
	buildAnnualLeaveSummary,
	buildLeavePeriods,
	buildWorkDetailListForDateRange,
	calcYearsOfService,
	getAttendanceFetchRange,
	getBaseYearAttendanceRangeForEmployees,
	getGlobalAttendanceRangeForEmployees,
	type AnnualLeaveSummaryRow,
	type EmployeeForAnnualLeavePrint,
	type F02010LeaveRow,
	type WorkDetailRow,
} from "./employeeAnnualLeaveUtils";
import {
	buildBaseYearAnnualLeavePrintHtml,
	buildDetailAnnualLeavePrintHtml,
	buildFullAnnualLeavePrintHtml,
	openPrintPreviewWindow,
} from "./employeeAnnualLeavePrint";

interface Employee {
	ANCD: number;
	EMPNO: number;
	EMPNM: string;
	EMPHP?: string;
	JOB?: string;
	JOBST?: string;
	SDT?: string;
	BASE_DT?: string;
	YRNT?: number;
	EDT?: string;
	[key: string]: unknown;
}

const WORK_DETAIL_ITEMS_PER_PAGE = 8;
const WORK_DETAIL_PAGE_BLOCK = 5;

export default function EmployeeAnnualLeave() {
	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState<string>("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState<string>("1");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const [rightWorkStatus, setRightWorkStatus] = useState<string>("1");
	const [baseYear, setBaseYear] = useState<number>(new Date().getFullYear());

	const [annualLeaveList, setAnnualLeaveList] = useState<AnnualLeaveSummaryRow[]>([]);
	const [workDetailList, setWorkDetailList] = useState<WorkDetailRow[]>([]);
	const [attendanceCache, setAttendanceCache] = useState<F02010LeaveRow[]>([]);
	const [selectedSummaryAccrualDate, setSelectedSummaryAccrualDate] = useState<string | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [detailError, setDetailError] = useState<string | null>(null);
	const [workDetailPage, setWorkDetailPage] = useState(1);
	const [workDetailPageWindowStart, setWorkDetailPageWindowStart] = useState(1);
	const [printingAll, setPrintingAll] = useState(false);
	const [printingBaseYear, setPrintingBaseYear] = useState(false);
	const [printingDetail, setPrintingDetail] = useState(false);

	const workDetailTotalPages = Math.max(1, Math.ceil(workDetailList.length / WORK_DETAIL_ITEMS_PER_PAGE));
	const workDetailMaxPageWindowStart = useMemo(() => {
		if (workDetailTotalPages <= 1) return 1;
		return Math.floor((workDetailTotalPages - 1) / WORK_DETAIL_PAGE_BLOCK) * WORK_DETAIL_PAGE_BLOCK + 1;
	}, [workDetailTotalPages]);
	const workDetailPageNumbers = useMemo(() => {
		const end = Math.min(workDetailPageWindowStart + WORK_DETAIL_PAGE_BLOCK - 1, workDetailTotalPages);
		if (workDetailPageWindowStart > workDetailTotalPages) return [];
		return Array.from({ length: end - workDetailPageWindowStart + 1 }, (_, i) => workDetailPageWindowStart + i);
	}, [workDetailPageWindowStart, workDetailTotalPages]);
	const workDetailStartIndex = (workDetailPage - 1) * WORK_DETAIL_ITEMS_PER_PAGE;
	const pagedWorkDetailList = useMemo(
		() => workDetailList.slice(workDetailStartIndex, workDetailStartIndex + WORK_DETAIL_ITEMS_PER_PAGE),
		[workDetailList, workDetailStartIndex],
	);

	const applyWorkDetailForSummary = useCallback((row: AnnualLeaveSummaryRow, rows: F02010LeaveRow[]) => {
		setSelectedSummaryAccrualDate(row.accrualDate);
		setWorkDetailList(buildWorkDetailListForDateRange(rows, row.accrualDate, row.endDate));
		setWorkDetailPage(1);
		setWorkDetailPageWindowStart(1);
	}, []);

	const handleWorkDetailPageChange = (page: number) => {
		const p = Math.max(1, Math.min(page, workDetailTotalPages));
		setWorkDetailPage(p);
		const blockStart = Math.floor((p - 1) / WORK_DETAIL_PAGE_BLOCK) * WORK_DETAIL_PAGE_BLOCK + 1;
		setWorkDetailPageWindowStart(blockStart);
	};

	const handleWorkDetailPrevPageBlock = () => {
		const prevStart = Math.max(1, workDetailPageWindowStart - WORK_DETAIL_PAGE_BLOCK);
		setWorkDetailPageWindowStart(prevStart);
		setWorkDetailPage(prevStart);
	};

	const handleWorkDetailNextPageBlock = () => {
		const nextStart = workDetailPageWindowStart + WORK_DETAIL_PAGE_BLOCK;
		if (nextStart <= workDetailMaxPageWindowStart) {
			setWorkDetailPageWindowStart(nextStart);
			setWorkDetailPage(nextStart);
		}
	};

	const fetchEmployees = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ""
					? `/api/f01010?name=${encodeURIComponent(nameSearch.trim())}`
					: "/api/f01010";
			const response = await fetch(url);
			const result = await response.json();
			if (result.success) {
				setEmployeeList(result.data || []);
			}
		} catch {
			// 사원 목록 조회 오류
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateStr: string | null | undefined): string => {
		if (!dateStr) return "";
		const s = String(dateStr).trim().slice(0, 10);
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
		try {
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) return "";
			return date.toISOString().split("T")[0];
		} catch {
			return "";
		}
	};

	const getWorkStatusText = (jobst?: string): string => {
		if (!jobst) return "-";
		switch (String(jobst).trim()) {
			case "1":
				return "근무";
			case "2":
				return "휴직";
			case "9":
				return "퇴직";
			default:
				return "-";
		}
	};

	const loadEmployeeAnnualLeave = useCallback(async (employee: Employee, year: number) => {
		const anchor = formatDate(employee.BASE_DT) || formatDate(employee.SDT);
		if (!anchor) {
			setAnnualLeaveList([]);
			setWorkDetailList([]);
			setDetailError("년차기준일 또는 입사일자가 없어 조회할 수 없습니다.");
			return;
		}

		const periods = buildLeavePeriods(employee.BASE_DT, employee.SDT, year);
		if (periods.length === 0) {
			setAnnualLeaveList([]);
			setWorkDetailList([]);
			setDetailError("생성된 연차 구간이 없습니다.");
			return;
		}

		const range = getAttendanceFetchRange(periods);
		if (!range) {
			setAnnualLeaveList([]);
			setWorkDetailList([]);
			return;
		}

		setLoadingDetail(true);
		setDetailError(null);
		try {
			const url = `/api/f02010?startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}&empno=${employee.EMPNO}`;
			const response = await fetch(url);
			const result = await response.json();
			if (!result.success || !Array.isArray(result.data)) {
				setAnnualLeaveList([]);
				setWorkDetailList([]);
				setDetailError(result.error || "근태 데이터를 불러오지 못했습니다.");
				return;
			}

			const attendanceRows = result.data as F02010LeaveRow[];
			const grantedDays = typeof employee.YRNT === "number" ? employee.YRNT : Number(employee.YRNT) || 0;
			const summary = buildAnnualLeaveSummary(periods, attendanceRows, grantedDays);

			setAttendanceCache(attendanceRows);
			setAnnualLeaveList(summary);
			const defaultRow = summary.find((r) => r.accrualYear === year) ?? summary[0];
			if (defaultRow) {
				applyWorkDetailForSummary(defaultRow, attendanceRows);
			} else {
				setSelectedSummaryAccrualDate(null);
				setWorkDetailList([]);
			}
		} catch {
			setAnnualLeaveList([]);
			setWorkDetailList([]);
			setDetailError("년차·근무 데이터 조회 중 오류가 발생했습니다.");
		} finally {
			setLoadingDetail(false);
		}
	}, [applyWorkDetailForSummary]);

	const handleSelectSummaryRow = (row: AnnualLeaveSummaryRow) => {
		applyWorkDetailForSummary(row, attendanceCache);
	};

	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
	};

	const handleSearch = () => {
		setCurrentPage(1);
		fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
	};

	const filteredEmployees = employeeList.filter((employee) => {
		const employeeName = String(employee.EMPNM || "").trim();
		if (!employeeName) return false;
		if (selectedJob && String(employee.JOB || "").trim() !== selectedJob) return false;
		if (selectedWorkStatus && String(employee.JOBST || "").trim() !== selectedWorkStatus) return false;
		return true;
	});

	const uniqueJobs = Array.from(
		new Set(employeeList.map((emp) => emp.JOB).filter((job) => job && String(job).trim() !== "")),
	).sort();

	const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

	const handlePageChange = (page: number) => setCurrentPage(page);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleBaseYearShift = (delta: number) => {
		setBaseYear((y) => y + delta);
	};

	const formatToday = (): string => {
		const d = new Date();
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	};

	const handlePrintAll = async () => {
		const targets = getPrintTargets();

		if (targets.length === 0) {
			alert("출력할 사원이 없습니다.");
			return;
		}

		const printThroughYear = new Date().getFullYear();
		const range = getGlobalAttendanceRangeForEmployees(targets, printThroughYear);
		if (!range) {
			alert("년차기준일 또는 입사일자가 있는 사원이 없어 출력할 수 없습니다.");
			return;
		}

		setPrintingAll(true);
		try {
			const url = `/api/f02010?startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`;
			const response = await fetch(url);
			const result = await response.json();
			if (!result.success || !Array.isArray(result.data)) {
				alert(result.error || "근태 데이터를 불러오지 못했습니다.");
				return;
			}

			const attendanceByEmpno = groupAttendanceByEmpno(result.data);

			const printRows = buildAllEmployeesAnnualLeavePrintRows(targets, attendanceByEmpno, printThroughYear);
			if (printRows.length === 0) {
				alert("출력할 년차 데이터가 없습니다.");
				return;
			}

			const html = buildFullAnnualLeavePrintHtml(formatToday(), printRows);
			openPrintPreviewWindow(html);
		} catch {
			alert("전체 년차 출력 중 오류가 발생했습니다.");
		} finally {
			setPrintingAll(false);
		}
	};

	const getPrintTargets = (): EmployeeForAnnualLeavePrint[] =>
		filteredEmployees
			.filter((e) => String(e.EMPNM ?? "").trim() !== "")
			.map((e) => ({
				EMPNO: e.EMPNO,
				EMPNM: String(e.EMPNM ?? ""),
				JOB: e.JOB,
				JOBST: e.JOBST,
				SDT: e.SDT,
				EDT: e.EDT,
				BASE_DT: e.BASE_DT,
				YRNT: e.YRNT,
			}));

	const groupAttendanceByEmpno = (data: unknown[]): Map<number, F02010LeaveRow[]> => {
		const attendanceByEmpno = new Map<number, F02010LeaveRow[]>();
		for (const row of data as (F02010LeaveRow & { EMPNO?: number })[]) {
			const empno = Number(row.EMPNO);
			if (!empno) continue;
			if (!attendanceByEmpno.has(empno)) attendanceByEmpno.set(empno, []);
			attendanceByEmpno.get(empno)!.push(row);
		}
		return attendanceByEmpno;
	};

	const handlePrintBaseYear = async () => {
		const targets = getPrintTargets();
		if (targets.length === 0) {
			alert("출력할 사원이 없습니다.");
			return;
		}

		const range = getBaseYearAttendanceRangeForEmployees(targets, baseYear);
		if (!range) {
			alert(`${baseYear}년에 해당하는 연차 구간이 있는 사원이 없습니다.`);
			return;
		}

		setPrintingBaseYear(true);
		try {
			const url = `/api/f02010?startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`;
			const response = await fetch(url);
			const result = await response.json();
			if (!result.success || !Array.isArray(result.data)) {
				alert(result.error || "근태 데이터를 불러오지 못했습니다.");
				return;
			}

			const attendanceByEmpno = groupAttendanceByEmpno(result.data);
			const printRows = buildAllBaseYearAnnualLeavePrintRows(targets, attendanceByEmpno, baseYear);
			if (printRows.length === 0) {
				alert(`${baseYear}년 출력할 연차 데이터가 없습니다.`);
				return;
			}

			const html = buildBaseYearAnnualLeavePrintHtml(formatToday(), baseYear, printRows);
			openPrintPreviewWindow(html);
		} catch {
			alert("기준년도 출력 중 오류가 발생했습니다.");
		} finally {
			setPrintingBaseYear(false);
		}
	};

	const handlePrintDetail = async () => {
		const targets = getPrintTargets();
		if (targets.length === 0) {
			alert("출력할 사원이 없습니다.");
			return;
		}

		const range = getBaseYearAttendanceRangeForEmployees(targets, baseYear);
		if (!range) {
			alert(`${baseYear}년에 해당하는 연차 구간이 있는 사원이 없습니다.`);
			return;
		}

		setPrintingDetail(true);
		try {
			const url = `/api/f02010?startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`;
			const response = await fetch(url);
			const result = await response.json();
			if (!result.success || !Array.isArray(result.data)) {
				alert(result.error || "근태 데이터를 불러오지 못했습니다.");
				return;
			}

			const attendanceByEmpno = groupAttendanceByEmpno(result.data);
			const sections = buildAllDetailAnnualLeavePrintSections(targets, attendanceByEmpno, baseYear);
			if (sections.length === 0) {
				alert(`${baseYear}년 출력할 연차 상세 데이터가 없습니다.`);
				return;
			}

			const html = buildDetailAnnualLeavePrintHtml(formatToday(), baseYear, sections);
			openPrintPreviewWindow(html);
		} catch {
			alert("기준 상세 출력 중 오류가 발생했습니다.");
		} finally {
			setPrintingDetail(false);
		}
	};

	const selectedSummary =
		annualLeaveList.find((r) => r.accrualDate === selectedSummaryAccrualDate) ??
		annualLeaveList.find((r) => r.accrualYear === baseYear);
	const yearsOfService = selectedEmployee ? calcYearsOfService(formatDate(selectedEmployee.SDT)) : "";
	const annualLeaveDaysDisplay =
		selectedEmployee?.YRNT != null && !Number.isNaN(Number(selectedEmployee.YRNT))
			? String(selectedEmployee.YRNT)
			: "-";

	useEffect(() => {
		fetchEmployees();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			if (searchTerm.trim() !== "" || selectedJob !== "" || selectedWorkStatus !== "") {
				fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
			} else {
				fetchEmployees();
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [searchTerm, selectedJob, selectedWorkStatus]);

	useEffect(() => {
		if (!selectedEmployee) {
			setAnnualLeaveList([]);
			setWorkDetailList([]);
			setAttendanceCache([]);
			setSelectedSummaryAccrualDate(null);
			setDetailError(null);
			setWorkDetailPage(1);
			setWorkDetailPageWindowStart(1);
			return;
		}
		loadEmployeeAnnualLeave(selectedEmployee, baseYear);
	}, [selectedEmployee, baseYear, loadEmployeeAnnualLeave]);

	useEffect(() => {
		setWorkDetailPage((p) => Math.min(p, workDetailTotalPages));
		setWorkDetailPageWindowStart((s) => Math.min(s, workDetailMaxPageWindowStart));
	}, [workDetailTotalPages, workDetailMaxPageWindowStart]);

	return (
		<div className="flex min-h-screen bg-white text-black">
			<aside className="w-[560px] shrink-0 border-r border-blue-200 flex flex-col bg-white">
				<div className="border-b border-blue-300 bg-blue-100 px-3 py-2 text-blue-900 font-semibold">
					사원 목록
				</div>
				<div className="px-3 py-2 border-b border-blue-100 space-y-2">
					<div className="text-xs text-blue-900/80">이름 검색</div>
					<input
						className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white text-blue-900"
						placeholder="예) 홍길동"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					/>
					<div className="text-xs text-blue-900/80">직책</div>
					<select
						value={selectedJob}
						onChange={(e) => setSelectedJob(e.target.value)}
						className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white text-blue-900"
					>
						<option value="">직책 전체</option>
						{uniqueJobs.map((job) => (
							<option key={job} value={job}>
								{job}
							</option>
						))}
					</select>
					<div className="text-xs text-blue-900/80">근무상태</div>
					<select
						value={selectedWorkStatus}
						onChange={(e) => setSelectedWorkStatus(e.target.value)}
						className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white text-blue-900"
					>
						<option value="">근무상태 전체</option>
						<option value="1">근무</option>
						<option value="2">휴직</option>
						<option value="9">퇴직</option>
					</select>
				</div>
				<div className="flex-1 overflow-auto min-h-0">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-blue-50 border-b border-blue-200">
							<tr>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">이름</th>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">핸드폰번호</th>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">직책</th>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">근무상태</th>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">년차기준일</th>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">입사일자</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
										로딩 중...
									</td>
								</tr>
							) : filteredEmployees.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
										사원 데이터가 없습니다
									</td>
								</tr>
							) : (
								currentEmployees.map((employee) => (
									<tr
										key={`${employee.ANCD}-${employee.EMPNO}`}
										onClick={() => handleSelectEmployee(employee)}
										className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
											selectedEmployee?.ANCD === employee.ANCD &&
											selectedEmployee?.EMPNO === employee.EMPNO
												? "bg-blue-100"
												: ""
										}`}
									>
										<td className="px-2 py-2">{employee.EMPNM || "-"}</td>
										<td className="px-2 py-2">{employee.EMPHP || "-"}</td>
										<td className="px-2 py-2">{employee.JOB || "-"}</td>
										<td className="px-2 py-2">{getWorkStatusText(employee.JOBST)}</td>
										<td className="px-2 py-2">{formatDate(employee.BASE_DT) || "-"}</td>
										<td className="px-2 py-2">{formatDate(employee.SDT) || "-"}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{totalPages > 1 && (
					<div className="border-t border-blue-200 bg-white p-2">
						<div className="flex items-center justify-center gap-1 flex-wrap">
							<button
								type="button"
								onClick={() => handlePageChange(1)}
								disabled={currentPage === 1}
								className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:opacity-50"
							>
								&lt;&lt;
							</button>
							<button
								type="button"
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage === 1}
								className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:opacity-50"
							>
								&lt;
							</button>
							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
								if (pageNum > totalPages) return null;
								return (
									<button
										type="button"
										key={pageNum}
										onClick={() => handlePageChange(pageNum)}
										className={`rounded border px-2 py-1 text-xs ${
											currentPage === pageNum
												? "border-blue-500 bg-blue-500 text-white"
												: "border-blue-300 hover:bg-blue-50"
										}`}
									>
										{pageNum}
									</button>
								);
							})}
							<button
								type="button"
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:opacity-50"
							>
								&gt;
							</button>
							<button
								type="button"
								onClick={() => handlePageChange(totalPages)}
								disabled={currentPage === totalPages}
								className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:opacity-50"
							>
								&gt;&gt;
							</button>
						</div>
					</div>
				)}
			</aside>

			<div className="flex-1 flex flex-col min-w-0 bg-blue-50/30">
				<div className="border-b border-blue-200 bg-blue-50/50 p-4 space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						{/* <div className="flex items-center gap-3">
							<label className="text-sm font-medium text-blue-900 shrink-0">근무상태</label>
							<select
								value={rightWorkStatus}
								onChange={(e) => setRightWorkStatus(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							>
								<option value="1">근무</option>
								<option value="2">휴직</option>
								<option value="9">퇴직</option>
							</select>
						</div> */}
						{/* <div className="flex gap-2">
							<button
								type="button"
								onClick={handleSearch}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								검색
							</button>
							<button
								type="button"
								onClick={handleClose}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div> */}
					</div>

					{!selectedEmployee ? (
						<p className="text-sm text-blue-900/70">좌측에서 사원을 선택하면 정보가 표시됩니다.</p>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										사원명
									</label>
									<input
										type="text"
										readOnly
										value={selectedEmployee.EMPNM ?? ""}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										입사일자
									</label>
									<input
										type="text"
										readOnly
										value={formatDate(selectedEmployee.SDT)}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										근무년수
									</label>
									<input
										type="text"
										readOnly
										value={yearsOfService || "-"}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										년차기준일
									</label>
									<input
										type="text"
										readOnly
										value={formatDate(selectedEmployee.BASE_DT) || formatDate(selectedEmployee.SDT) || "-"}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										년차일수
									</label>
									<input
										type="text"
										readOnly
										value={annualLeaveDaysDisplay}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										근무상태
									</label>
									<input
										type="text"
										readOnly
										value={getWorkStatusText(selectedEmployee.JOBST)}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>
							</div>
							{selectedSummary && (
								<div className="flex flex-wrap gap-4 text-sm text-blue-900">
									<span>
										<strong>{baseYear}년</strong> 연차: 발생 {selectedSummary.accrualDate} ~ 종료{" "}
										{selectedSummary.endDate}
									</span>
									<span>사용 {selectedSummary.usedDays}일</span>
									<span>잔여 {selectedSummary.remainingDays}일</span>
								</div>
							)}
						</>
					)}
				</div>

				<div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
					<div className="flex-1 flex flex-col rounded-lg border border-blue-300 bg-white min-w-0 overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 font-semibold text-blue-900 shrink-0 flex items-center justify-between">
							<span>년차 요약</span>
							{loadingDetail && <span className="text-xs font-normal text-blue-700">조회 중...</span>}
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 bg-blue-50 border-b border-blue-200 z-10">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											근무년수 발생일자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											년차일수
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											사용일수
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											잔여일수
										</th>
										<th className="px-3 py-2 text-center font-semibold text-blue-900">종료일자</th>
									</tr>
								</thead>
								<tbody>
									{!selectedEmployee ? (
										<tr>
											<td colSpan={5} className="px-3 py-8 text-center text-blue-900/60">
												사원을 선택하세요
											</td>
										</tr>
									) : loadingDetail ? (
										<tr>
											<td colSpan={5} className="px-3 py-8 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : detailError ? (
										<tr>
											<td colSpan={5} className="px-3 py-8 text-center text-red-600/80">
												{detailError}
											</td>
										</tr>
									) : annualLeaveList.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-3 py-8 text-center text-blue-900/60">
												년차 요약 데이터가 없습니다
											</td>
										</tr>
									) : (
										annualLeaveList.map((row) => {
											const isActive = row.accrualDate === selectedSummaryAccrualDate;
											return (
												<tr
													key={row.accrualDate}
													onClick={() => handleSelectSummaryRow(row)}
													className={`border-b border-blue-50 cursor-pointer ${
														isActive ? "bg-blue-100 font-medium" : "hover:bg-blue-50/50"
													}`}
												>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{row.accrualDate}
													</td>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{row.annualLeaveDays}
													</td>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{row.usedDays}
													</td>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{row.remainingDays}
													</td>
													<td className="px-3 py-2 text-center">{row.endDate}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex-1 flex flex-col rounded-lg border border-blue-300 bg-white min-w-0 overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 font-semibold text-blue-900 shrink-0">
							근무 상세
							{selectedSummary && (
								<span className="ml-2 text-xs font-normal text-blue-800">
									({selectedSummary.accrualDate} ~ {selectedSummary.endDate}, WGU=2)
								</span>
							)}
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 bg-blue-50 border-b border-blue-200 z-10">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											근무일자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											근무구분
										</th>
										<th className="px-3 py-2 text-center font-semibold text-blue-900">휴무사유</th>
									</tr>
								</thead>
								<tbody>
									{!selectedEmployee ? (
										<tr>
											<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
												사원을 선택하세요
											</td>
										</tr>
									) : loadingDetail ? (
										<tr>
											<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : !selectedSummary ? (
										<tr>
											<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
												년차 요약에서 구간을 선택하세요
											</td>
										</tr>
									) : workDetailList.length === 0 ? (
										<tr>
											<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
												{selectedSummary.accrualDate} ~ {selectedSummary.endDate} 구간에 연차(WGU=2) 사용
												내역이 없습니다
											</td>
										</tr>
									) : (
										pagedWorkDetailList.map((row, idx) => (
											<tr
												key={`${row.workDate}-${workDetailStartIndex + idx}`}
												className="border-b border-blue-50 hover:bg-blue-50/50"
											>
												<td className="border-r border-blue-100 px-3 py-2 text-center">{row.workDate}</td>
												<td className="border-r border-blue-100 px-3 py-2 text-center">{row.workType}</td>
												<td className="px-3 py-2 text-center">{row.reason}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{workDetailList.length > 0 && (
							<div className="border-t border-blue-200 bg-white p-2 shrink-0">
								<div className="flex flex-wrap items-center justify-center gap-2 text-sm text-blue-900">
									<span className="tabular-nums text-xs">
										{workDetailPage} / {workDetailTotalPages} (총 {workDetailList.length}건)
									</span>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={handleWorkDetailPrevPageBlock}
											disabled={workDetailPageWindowStart <= 1}
											className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
											aria-label="이전 페이지 번호 묶음"
										>
											&lt;&lt;
										</button>
										<button
											type="button"
											onClick={() => handleWorkDetailPageChange(workDetailPage - 1)}
											disabled={workDetailPage === 1}
											className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
											aria-label="이전 페이지"
										>
											&lt;
										</button>
										{workDetailPageNumbers.map((pageNum) => (
											<button
												key={pageNum}
												type="button"
												onClick={() => handleWorkDetailPageChange(pageNum)}
												className={`min-w-[1.75rem] rounded border px-2 py-1 text-xs tabular-nums ${
													workDetailPage === pageNum
														? "border-blue-500 bg-blue-500 font-semibold text-white"
														: "border-blue-300 hover:bg-blue-50"
												}`}
											>
												{pageNum}
											</button>
										))}
										<button
											type="button"
											onClick={() => handleWorkDetailPageChange(workDetailPage + 1)}
											disabled={workDetailPage === workDetailTotalPages}
											className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
											aria-label="다음 페이지"
										>
											&gt;
										</button>
										<button
											type="button"
											onClick={handleWorkDetailNextPageBlock}
											disabled={workDetailPageWindowStart >= workDetailMaxPageWindowStart}
											className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
											aria-label="다음 페이지 번호 묶음"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="border-t border-blue-200 bg-blue-50/50 p-4 flex flex-wrap items-end justify-between gap-4">
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => alert("기능 준비중입니다.")}
							className="rounded border border-blue-500 bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600"
						>
							년차 생성
						</button>
						<button
							type="button"
							onClick={handlePrintAll}
							disabled={printingAll}
							className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{printingAll ? "출력 준비중..." : "전체년차출력"}
						</button>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex flex-col items-center gap-1">
							<label className="text-sm font-medium text-blue-900">기준년도</label>
							<div className="flex items-center border border-blue-300 rounded overflow-hidden bg-white">
								<button
									type="button"
									onClick={() => handleBaseYearShift(-1)}
									className="px-2 py-1.5 text-blue-900 hover:bg-blue-100 border-r border-blue-200"
									aria-label="이전 년도"
								>
									&lt;
								</button>
								<span className="px-4 py-1.5 text-sm font-medium text-blue-900 min-w-[4rem] text-center">
									{baseYear}
								</span>
								<button
									type="button"
									onClick={() => handleBaseYearShift(1)}
									className="px-2 py-1.5 text-blue-900 hover:bg-blue-100 border-l border-blue-200"
									aria-label="다음 년도"
								>
									&gt;
								</button>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<button
								type="button"
								onClick={handlePrintBaseYear}
								disabled={printingBaseYear}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{printingBaseYear ? "출력 준비중..." : "기준년도출력"}
							</button>
							<button
								type="button"
								onClick={handlePrintDetail}
								disabled={printingDetail}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{printingDetail ? "출력 준비중..." : "기준상세출력"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
