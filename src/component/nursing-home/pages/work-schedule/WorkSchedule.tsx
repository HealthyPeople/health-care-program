"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
	buildWorkScheduleStatusPrintHtml,
	leaveDisplayLabel,
	normalizeWguCode,
	openPrintPreviewWindow,
	scheduleCellLabel,
	type WorkSchedulePrintRow,
} from "./workSchedulePrint";

interface Employee {
	ANCD: number;
	EMPNO: number;
	EMPNM: string;
	EMPHP?: string;
	JOB?: string;
	JOBST?: string;
	JOBADD?: string;
	JOBSH?: string;
	[key: string]: unknown;
}

/** F02010 행 */
interface ScheduleRow {
	ANCD: number;
	EMPNO: number;
	EMPNM?: string;
	JOB?: string;
	WDT: string;
	JOBADD: string;
	JOBSH: string;
	WGU: string;
	HODES: string;
	STM: string;
	ETM: string;
}

type RegisterForm = {
	WDT: string;
	JOBSH: string; // 1=주간, 2=야간, 3=심야
	JOBADD: string; // 근무위치(층)
	/** ""=근무(1) | ANNUAL(2) | MONTHLY(3) | HOLIDAY(4) | COMP(5) | SICK(6) | FAMILY(7) | ABSENT(9) */
	LEAVE_KIND: string;
	STM: string;
	ETM: string;
	HODES: string;
};

const FLOOR_OPTIONS = ["1층", "2층", "3층", "4층", "5층", "요양외"];

/** JOBSH — 근무형태 */
const JOBSH_OPTIONS = [
	{ value: "1", label: "주간" },
	{ value: "2", label: "야간" },
	{ value: "3", label: "심야" },
];

/**
 * 휴무 종류 UI → WGU / HODES
 * 1=근무, 2=연차, 3=월차, 4=정기, 5=대휴, 6=병가, 7=경조사, 9=결근
 */
const LEAVE_KIND_OPTIONS = [
	{ value: "", label: "없음(근무)", wgu: "1", hodes: "" },
	{ value: "ANNUAL", label: "연차", wgu: "2", hodes: "연차" },
	{ value: "MONTHLY", label: "월차", wgu: "3", hodes: "월차" },
	{ value: "HOLIDAY", label: "정기휴무", wgu: "4", hodes: "정기휴무" },
	{ value: "COMP", label: "대휴", wgu: "5", hodes: "대휴" },
	{ value: "SICK", label: "병가", wgu: "6", hodes: "병가" },
	{ value: "FAMILY", label: "경조사", wgu: "7", hodes: "경조사" },
	{ value: "ABSENT", label: "결근", wgu: "9", hodes: "결근" },
];

function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getMonthDates(year: number, month: number): Date[] {
	const daysInMonth = new Date(year, month, 0).getDate();
	const dates: Date[] = [];
	for (let d = 1; d <= daysInMonth; d++) {
		dates.push(new Date(year, month - 1, d));
	}
	return dates;
}

function getWorkStatusText(jobst?: string): string {
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
}

function leaveKindFromRow(wgu?: string, hodes?: string): string {
	const w = String(wgu ?? "").trim();
	const h = String(hodes ?? "").trim();
	if (!w || w === "1") return "";
	if (w === "2") return "ANNUAL";
	if (w === "3") return "MONTHLY";
	if (w === "4") return "HOLIDAY";
	if (w === "5") return "COMP";
	if (w === "6") return "SICK";
	if (w === "7") return "FAMILY";
	if (w === "9") return "ABSENT";
	// 구 코드 호환 (연월차 등)
	if (w === "5" && /월/.test(h)) return "MONTHLY";
	if (/연|년/.test(h)) return "ANNUAL";
	if (/월/.test(h)) return "MONTHLY";
	if (/대휴/.test(h)) return "COMP";
	if (/병/.test(h)) return "SICK";
	if (/경조/.test(h)) return "FAMILY";
	if (/결근/.test(h)) return "ABSENT";
	if (/정기/.test(h)) return "HOLIDAY";
	return "";
}

function toWguHodes(leaveKind: string): { WGU: string; HODES: string } {
	const opt = LEAVE_KIND_OPTIONS.find((o) => o.value === leaveKind);
	if (!opt) return { WGU: "1", HODES: "" };
	return { WGU: opt.wgu, HODES: opt.hodes };
}

const emptyForm = (wdt: string): RegisterForm => ({
	WDT: wdt,
	JOBSH: "1",
	JOBADD: "1층",
	LEAVE_KIND: "",
	STM: "",
	ETM: "",
	HODES: "",
});

export default function WorkSchedule() {
	const today = new Date();
	const [year, setYear] = useState(today.getFullYear());
	const [month, setMonth] = useState(today.getMonth() + 1);

	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState("1");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
	const [loadingSchedule, setLoadingSchedule] = useState(false);
	const [selectedCell, setSelectedCell] = useState<{ ancd: number; empno: number; wdt: string } | null>(
		null
	);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<RegisterForm>(() => emptyForm(formatDate(today)));

	const monthDates = useMemo(() => getMonthDates(year, month), [year, month]);
	const startDate = formatDate(monthDates[0]);
	const endDate = formatDate(monthDates[monthDates.length - 1]);

	const scheduleMap = useMemo(() => {
		const map: Record<string, ScheduleRow> = {};
		for (const row of schedules) {
			map[`${row.EMPNO}|${row.WDT}`] = row;
		}
		return map;
	}, [schedules]);

	const fetchEmployees = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ""
					? `/api/f01010?name=${encodeURIComponent(nameSearch.trim())}`
					: "/api/f01010";
			const response = await fetch(url, { credentials: "include" });
			const result = await response.json();
			if (result.success) {
				setEmployeeList(result.data || []);
			}
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	};

	const fetchSchedules = async () => {
		setLoadingSchedule(true);
		try {
			const response = await fetch(
				`/api/f02010?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
				{ credentials: "include" }
			);
			const result = await response.json();
			if (result.success) {
				const rows: ScheduleRow[] = (result.data || []).map(
					(r: Record<string, unknown>) => ({
						ANCD: Number(r.ANCD),
						EMPNO: Number(r.EMPNO),
						EMPNM: String(r.EMPNM ?? ""),
						JOB: String(r.JOB ?? ""),
						WDT: String(r.WDT ?? "").slice(0, 10),
						JOBADD: String(r.JOBADD ?? "").trim(),
						JOBSH: String(r.JOBSH ?? "").trim(),
						WGU: String(r.WGU ?? "").trim(),
						HODES: String(r.HODES ?? "").trim(),
						STM: String(r.STM ?? "").trim(),
						ETM: String(r.ETM ?? "").trim(),
					})
				);
				setSchedules(rows);
			} else {
				setSchedules([]);
			}
		} catch {
			setSchedules([]);
		} finally {
			setLoadingSchedule(false);
		}
	};

	useEffect(() => {
		fetchEmployees();
	}, []);

	useEffect(() => {
		fetchSchedules();
		setSelectedCell(null);
	}, [year, month]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchTerm, selectedJob, selectedWorkStatus]);

	const filteredEmployees = employeeList.filter((employee) => {
		const employeeName = String(employee.EMPNM || "").trim();
		if (!employeeName) return false;
		if (selectedJob) {
			if (String(employee.JOB || "").trim() !== selectedJob) return false;
		}
		if (selectedWorkStatus) {
			if (String(employee.JOBST || "").trim() !== selectedWorkStatus) return false;
		}
		return true;
	});

	const uniqueJobs = Array.from(
		new Set(employeeList.map((emp) => emp.JOB).filter((job) => job && String(job).trim() !== ""))
	).sort();

	const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
	const currentEmployees = filteredEmployees.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	const statusEmployees = filteredEmployees;

	const handleMonthChange = (delta: number) => {
		let m = month + delta;
		let y = year;
		if (m < 1) {
			m = 12;
			y -= 1;
		} else if (m > 12) {
			m = 1;
			y += 1;
		}
		setYear(y);
		setMonth(m);
	};

	const openRegisterModal = (emp?: Employee | null, wdt?: string) => {
		const target = emp ?? selectedEmployee;
		if (!target) {
			alert("현황표에서 사원(셀)을 선택하세요.");
			return;
		}
		const dateStr = wdt || selectedCell?.wdt || formatDate(today);
		const existing = scheduleMap[`${target.EMPNO}|${dateStr}`];
		if (existing) {
			const leaveKind = leaveKindFromRow(existing.WGU, existing.HODES);
			setForm({
				WDT: existing.WDT,
				JOBSH: existing.JOBSH || "1",
				JOBADD: existing.JOBADD || "",
				LEAVE_KIND: leaveKind,
				STM: existing.STM || "",
				ETM: existing.ETM || "",
				HODES: existing.HODES || "",
			});
		} else {
			setForm({
				...emptyForm(dateStr),
				JOBADD: String(target.JOBADD || "").trim() || "1층",
				JOBSH: String(target.JOBSH || "").trim() || "1",
			});
		}
		setSelectedEmployee(target);
		setSelectedCell({ ancd: target.ANCD, empno: target.EMPNO, wdt: dateStr });
		setIsModalOpen(true);
	};

	const handleSave = async () => {
		if (!selectedEmployee) {
			alert("사원을 선택하세요.");
			return;
		}
		if (!form.WDT) {
			alert("근무일자를 입력하세요.");
			return;
		}

		const isLeave = Boolean(form.LEAVE_KIND);
		if (!isLeave && !form.JOBSH) {
			alert("근무형태(주간/야간/심야)를 선택하세요.");
			return;
		}

		const { WGU, HODES } = toWguHodes(form.LEAVE_KIND);
		const hodesFinal = isLeave ? HODES || form.HODES : form.HODES;

		setSaving(true);
		try {
			const response = await fetch("/api/f02010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: selectedEmployee.ANCD,
					EMPNO: selectedEmployee.EMPNO,
					WDT: form.WDT,
					JOBADD: isLeave ? "" : form.JOBADD,
					JOBSH: isLeave ? "" : form.JOBSH,
					WGU: WGU || "1",
					HODES: hodesFinal,
					STM: isLeave ? "" : form.STM,
					ETM: isLeave ? "" : form.ETM,
				}),
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || "저장에 실패했습니다.");
			}
			alert("근무일정이 저장되었습니다.");
			setIsModalOpen(false);
			await fetchSchedules();
		} catch (err) {
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedCell) {
			alert("삭제할 일정을 현황표에서 선택하세요.");
			return;
		}
		const row = scheduleMap[`${selectedCell.empno}|${selectedCell.wdt}`];
		if (!row) {
			alert("선택한 날짜에 등록된 일정이 없습니다.");
			return;
		}
		const empName =
			statusEmployees.find((e) => e.EMPNO === selectedCell.empno)?.EMPNM ||
			row.EMPNM ||
			"";
		if (
			!confirm(
				`${empName} · ${selectedCell.wdt}\n${scheduleCellLabel(row)}\n\n이 근무일정을 삭제하시겠습니까?`
			)
		) {
			return;
		}
		try {
			const response = await fetch(
				`/api/f02010?ancd=${row.ANCD}&empno=${row.EMPNO}&wdt=${encodeURIComponent(row.WDT)}`,
				{ method: "DELETE", credentials: "include" }
			);
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || "삭제에 실패했습니다.");
			}
			alert("근무일정이 삭제되었습니다.");
			setSelectedCell(null);
			await fetchSchedules();
		} catch (err) {
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		}
	};

	const handlePrint = () => {
		if (statusEmployees.length === 0) {
			alert("출력할 사원이 없습니다.");
			return;
		}
		const printMap: Record<string, WorkSchedulePrintRow> = {};
		for (const [key, row] of Object.entries(scheduleMap)) {
			printMap[key] = row;
		}
		const html = buildWorkScheduleStatusPrintHtml({
			year,
			month,
			dates: monthDates,
			employees: statusEmployees.map((e) => ({
				EMPNO: e.EMPNO,
				EMPNM: e.EMPNM,
				JOB: e.JOB,
			})),
			scheduleMap: printMap,
		});
		openPrintPreviewWindow(html);
	};

	const selectedSchedule = selectedCell
		? scheduleMap[`${selectedCell.empno}|${selectedCell.wdt}`]
		: null;

	const isLeaveMode = Boolean(form.LEAVE_KIND);

	const cellToneClass = (row: ScheduleRow) => {
		const code = normalizeWguCode(row.WGU);
		if (code === "1") return "text-blue-600 font-semibold";
		if (code === "2" || code === "3" || code === "5") return "text-red-600 font-semibold";
		if (code === "4") return "text-orange-600 font-semibold";
		if (code === "6") return "text-red-700 font-black";
		if (code === "7") return "text-red-600 font-semibold";
		if (code === "9") return "text-red-700 font-semibold";
		return "text-blue-900";
	};

	return (
		<div className="flex min-h-screen bg-white text-black">
			{/* 왼쪽: 사원 목록 */}
			{/* <aside className="w-[420px] shrink-0 border-r border-blue-200 flex flex-col bg-white">
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
					/>
					<div className="text-xs text-blue-900/80">직책</div>
					<select
						value={selectedJob}
						onChange={(e) => setSelectedJob(e.target.value)}
						className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white text-blue-900"
					>
						<option value="">직책 전체</option>
						{uniqueJobs.map((job) => (
							<option key={String(job)} value={String(job)}>
								{String(job)}
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
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">직책</th>
								<th className="text-left px-2 py-2 text-blue-900 font-semibold">상태</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={3} className="px-2 py-4 text-center text-blue-900/60">
										로딩 중...
									</td>
								</tr>
							) : filteredEmployees.length === 0 ? (
								<tr>
									<td colSpan={3} className="px-2 py-4 text-center text-blue-900/60">
										사원 데이터가 없습니다
									</td>
								</tr>
							) : (
								currentEmployees.map((employee) => (
									<tr
										key={`${employee.ANCD}-${employee.EMPNO}`}
										onClick={() => setSelectedEmployee(employee)}
										className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
											selectedEmployee?.EMPNO === employee.EMPNO ? "bg-blue-100" : ""
										}`}
									>
										<td className="px-2 py-2">{employee.EMPNM || "-"}</td>
										<td className="px-2 py-2">{employee.JOB || "-"}</td>
										<td className="px-2 py-2">{getWorkStatusText(employee.JOBST)}</td>
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
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:opacity-50"
							>
								&lt;
							</button>
							<span className="text-xs text-blue-900 px-2">
								{currentPage} / {totalPages}
							</span>
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:opacity-50"
							>
								&gt;
							</button>
						</div>
					</div>
				)}
			</aside> */}

			{/* 오른쪽: 근무일정 현황 */}
			<div className="flex-1 flex flex-col min-w-0 bg-blue-50/30">
				<div className="border-b border-blue-200 bg-blue-50/50 p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
							근무일정 현황표
						</h1>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => handleMonthChange(-1)}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								이전달
							</button>
							<span className="rounded border border-blue-300 bg-white px-4 py-1.5 text-sm text-blue-900 font-medium">
								{year}년 {month}월
							</span>
							<button
								type="button"
								onClick={() => handleMonthChange(1)}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								다음달
							</button>
							<button
								type="button"
								onClick={() => {
									const n = new Date();
									setYear(n.getFullYear());
									setMonth(n.getMonth() + 1);
								}}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								이번달
							</button>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => openRegisterModal()}
								className="rounded border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
							>
								등록
							</button>
							<button
								type="button"
								onClick={handleDelete}
								className="rounded border border-red-400 bg-red-100 px-4 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
							>
								삭제
							</button>
							<button
								type="button"
								onClick={handlePrint}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								현황표 출력
							</button>
						</div>
					</div>
					<div className="mt-2 flex flex-wrap gap-4 text-xs text-blue-900/80">
						<span>주간 · 야간 · 심야 · 연차 · 월차 · 정기휴무 · 대휴 · 병가 · 경조사 · 결근</span>
						{selectedEmployee && (
							<span>
								선택 사원: <strong>{selectedEmployee.EMPNM}</strong>
							</span>
						)}
						{selectedSchedule && (
							<span>
								선택 일정:{" "}
								<strong>
									{selectedCell?.wdt} · {scheduleCellLabel(selectedSchedule)}
								</strong>
							</span>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-auto p-3">
					{loadingSchedule ? (
						<div className="flex items-center justify-center h-40 text-blue-900/60">로딩 중...</div>
					) : statusEmployees.length === 0 ? (
						<div className="flex items-center justify-center h-40 text-blue-900/60">
							표시할 사원이 없습니다
						</div>
					) : (
						<div className="rounded-lg border border-blue-300 bg-white overflow-auto">
							<table className="text-xs border-collapse min-w-max">
								<thead className="sticky top-0 z-10 bg-blue-100">
									<tr>
										<th className="sticky left-0 z-20 bg-blue-100 border border-blue-200 px-2 py-2 text-blue-900 font-semibold min-w-[72px]">
											성명
										</th>
										<th className="sticky left-[72px] z-20 bg-blue-100 border border-blue-200 px-2 py-2 text-blue-900 font-semibold min-w-[64px]">
											직책
										</th>
										{monthDates.map((d) => {
											const dow = d.getDay();
											const isSun = dow === 0;
											const isSat = dow === 6;
											const isToday = formatDate(d) === formatDate(new Date());
											return (
												<th
													key={formatDate(d)}
													className={`border border-blue-200 px-1 py-1 text-center font-semibold min-w-[52px] ${
														isToday ? "bg-blue-200" : ""
													} ${isSun ? "text-red-600" : isSat ? "text-blue-600" : "text-blue-900"}`}
												>
													<div>{d.getDate()}</div>
													<div className="font-normal text-[10px]">
														{["일", "월", "화", "수", "목", "금", "토"][dow]}
													</div>
												</th>
											);
										})}
									</tr>
								</thead>
								<tbody>
									{statusEmployees.map((emp) => (
										<tr key={emp.EMPNO} className="hover:bg-blue-50/40">
											<td
												className={`sticky left-0 z-[5] border border-blue-100 px-2 py-1 bg-white font-medium cursor-pointer ${
													selectedEmployee?.EMPNO === emp.EMPNO ? "bg-blue-100" : ""
												}`}
												onClick={() => setSelectedEmployee(emp)}
											>
												{emp.EMPNM}
											</td>
											<td className="sticky left-[72px] z-[5] border border-blue-100 px-2 py-1 bg-white text-blue-900/80">
												{emp.JOB || "-"}
											</td>
											{monthDates.map((d) => {
												const wdt = formatDate(d);
												const key = `${emp.EMPNO}|${wdt}`;
												const row = scheduleMap[key];
												const selected =
													selectedCell?.empno === emp.EMPNO && selectedCell?.wdt === wdt;
												const dow = d.getDay();
												return (
													<td
														key={key}
														onClick={() => {
															setSelectedEmployee(emp);
															setSelectedCell({
																ancd: emp.ANCD,
																empno: emp.EMPNO,
																wdt,
															});
														}}
														onDoubleClick={() => openRegisterModal(emp, wdt)}
														title={
															row
																? `${scheduleCellLabel(row)}${
																		leaveDisplayLabel(row.WGU, row.HODES) &&
																		normalizeWguCode(row.WGU) !== "1"
																			? ` (${leaveDisplayLabel(row.WGU, row.HODES)})`
																			: ""
																	}${row.JOBADD ? ` / ${row.JOBADD}` : ""}`
																: "더블클릭하여 등록"
														}
														className={`border border-blue-100 px-0.5 py-1 text-center cursor-pointer align-middle ${
															selected ? "ring-2 ring-inset ring-blue-500 bg-blue-100" : ""
														} ${dow === 0 ? "bg-red-50/40" : dow === 6 ? "bg-blue-50/50" : ""}`}
													>
														{row ? (
															<span className={`inline-block leading-tight text-[10px] ${cellToneClass(row)}`}>
																{scheduleCellLabel(row)}
															</span>
														) : (
															<span className="text-blue-200">·</span>
														)}
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					<p className="mt-2 text-xs text-blue-900/60">
						셀 클릭: 선택 · 더블클릭: 등록/수정 · 상단 등록/삭제/현황표 출력 버튼 사용
					</p>
				</div>
			</div>

			{/* 등록 모달 — F02010 필드 */}
			{isModalOpen && selectedEmployee && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-lg border border-blue-300 bg-white shadow-xl">
						<div className="border-b border-blue-200 bg-blue-100 px-4 py-3 font-semibold text-blue-900">
							근무일정 등록
						</div>
						<div className="space-y-3 p-4 text-sm">
							<div>
								<div className="mb-1 text-xs text-blue-900/80">사원</div>
								<div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
									{selectedEmployee.EMPNM}
									{selectedEmployee.JOB ? ` (${selectedEmployee.JOB})` : ""}
								</div>
							</div>
							<div>
								<label className="mb-1 block text-xs text-blue-900/80">근무일자 (WDT)</label>
								<input
									type="date"
									value={form.WDT}
									onChange={(e) => setForm((f) => ({ ...f, WDT: e.target.value }))}
									className="w-full rounded border border-blue-300 px-3 py-2 text-blue-900"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs text-blue-900/80">휴무 종류 선택 (WGU/HODES)</label>
								<select
									value={form.LEAVE_KIND}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											LEAVE_KIND: e.target.value,
											...(e.target.value
												? { JOBSH: "", JOBADD: "", STM: "", ETM: "" }
												: {
														JOBSH: f.JOBSH || "1",
														JOBADD: f.JOBADD || "1층",
													}),
										}))
									}
									className="w-full rounded border border-blue-300 px-3 py-2 text-blue-900"
								>
									{LEAVE_KIND_OPTIONS.map((o) => (
										<option key={o.value || "none"} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
							{!isLeaveMode && (
								<>
									<div>
										<label className="mb-1 block text-xs text-blue-900/80">
											근무 시간(형태) 설정 (JOBSH)
										</label>
										<div className="flex flex-col gap-2">
											{JOBSH_OPTIONS.map((o) => (
												<label
													key={o.value}
													className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 ${
														form.JOBSH === o.value
															? "border-blue-500 bg-blue-50"
															: "border-blue-200"
													}`}
												>
													<input
														type="radio"
														name="jobsh"
														checked={form.JOBSH === o.value}
														onChange={() => setForm((f) => ({ ...f, JOBSH: o.value }))}
													/>
													<span>
														{o.label} ({o.value})
													</span>
												</label>
											))}
										</div>
									</div>
									<div>
										<label className="mb-1 block text-xs text-blue-900/80">
											층/위치 선택 (JOBADD)
										</label>
										<select
											value={form.JOBADD}
											onChange={(e) => setForm((f) => ({ ...f, JOBADD: e.target.value }))}
											className="w-full rounded border border-blue-300 px-3 py-2 text-blue-900"
										>
											<option value="">미지정</option>
											{FLOOR_OPTIONS.map((f) => (
												<option key={f} value={f}>
													{f}
												</option>
											))}
										</select>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="mb-1 block text-xs text-blue-900/80">출근시간 STM</label>
											<input
												type="time"
												value={form.STM}
												onChange={(e) => setForm((f) => ({ ...f, STM: e.target.value }))}
												className="w-full rounded border border-blue-300 px-3 py-2 text-blue-900"
											/>
										</div>
										<div>
											<label className="mb-1 block text-xs text-blue-900/80">퇴근시간 ETM</label>
											<input
												type="time"
												value={form.ETM}
												onChange={(e) => setForm((f) => ({ ...f, ETM: e.target.value }))}
												className="w-full rounded border border-blue-300 px-3 py-2 text-blue-900"
											/>
										</div>
									</div>
								</>
							)}
							{isLeaveMode && (
								<div>
									<label className="mb-1 block text-xs text-blue-900/80">휴무사유 (HODES)</label>
									<input
										type="text"
										value={
											form.HODES ||
											LEAVE_KIND_OPTIONS.find((o) => o.value === form.LEAVE_KIND)?.hodes ||
											""
										}
										onChange={(e) => setForm((f) => ({ ...f, HODES: e.target.value }))}
										className="w-full rounded border border-blue-300 px-3 py-2 text-blue-900"
										placeholder="휴무 사유"
									/>
								</div>
							)}
						</div>
						<div className="flex justify-end gap-2 border-t border-blue-100 px-4 py-3">
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="rounded border border-blue-300 px-4 py-1.5 text-sm text-blue-900 hover:bg-blue-50"
								disabled={saving}
							>
								취소
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={saving}
								className="rounded border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{saving ? "저장 중..." : "저장"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
