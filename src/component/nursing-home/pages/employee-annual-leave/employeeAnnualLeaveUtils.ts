import { classifyAttendanceDisplay, type AttendancePrintRow } from "../employee-attendance/employeeAttendancePrint";

export interface LeavePeriod {
	accrualDate: string;
	endDate: string;
	accrualYear: number;
}

export interface AnnualLeaveSummaryRow {
	accrualDate: string;
	annualLeaveDays: number;
	usedDays: number;
	remainingDays: number;
	endDate: string;
	accrualYear: number;
}

export interface WorkDetailRow {
	workDate: string;
	workType: string;
	reason: string;
}

export interface F02010LeaveRow extends AttendancePrintRow {
	WDT?: string;
}

function parseDateOnly(value: string | null | undefined): Date | null {
	const s = String(value ?? "").trim().slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
	const d = new Date(`${s}T12:00:00`);
	return isNaN(d.getTime()) ? null : d;
}

function formatLocalDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function addYears(d: Date, years: number): Date {
	const r = new Date(d);
	r.setFullYear(r.getFullYear() + years);
	return r;
}

function addDays(d: Date, days: number): Date {
	const r = new Date(d);
	r.setDate(r.getDate() + days);
	return r;
}

/** 입사일(SDT) 기준 근무 기간 */
export function calcYearsOfService(hireDate?: string | null): string {
	const hire = parseDateOnly(hireDate);
	if (!hire) return "";
	const today = new Date();
	today.setHours(12, 0, 0, 0);
	let years = today.getFullYear() - hire.getFullYear();
	let months = today.getMonth() - hire.getMonth();
	if (today.getDate() < hire.getDate()) months -= 1;
	if (months < 0) {
		years -= 1;
		months += 12;
	}
	if (years < 0) return "";
	const parts: string[] = [];
	if (years > 0) parts.push(`${years}년`);
	if (months > 0) parts.push(`${months}개월`);
	if (parts.length === 0) return "1개월 미만";
	return parts.join(" ");
}

/** 년차기준일(BASE_DT) 또는 입사일 기준 연차 구간 목록 (최신순) */
export function buildLeavePeriods(
	anchorDate: string | null | undefined,
	hireDate: string | null | undefined,
	throughYear: number,
): LeavePeriod[] {
	const anchor = parseDateOnly(anchorDate) ?? parseDateOnly(hireDate);
	if (!anchor) return [];

	const today = new Date();
	today.setHours(12, 0, 0, 0);

	let accrual = addYears(anchor, 1);
	const periods: LeavePeriod[] = [];

	while (accrual.getFullYear() <= throughYear + 1) {
		if (accrual > today) break;
		const end = addDays(addYears(accrual, 1), -1);
		periods.push({
			accrualDate: formatLocalDate(accrual),
			endDate: formatLocalDate(end),
			accrualYear: accrual.getFullYear(),
		});
		accrual = addYears(accrual, 1);
	}

	return periods.reverse();
}

function isDateInRange(wdt: string, start: string, end: string): boolean {
	return wdt >= start && wdt <= end;
}

/** 년차 휴가 사용으로 집계하는 근무구분 */
const LEAVE_WGU_CODES = new Set(["2"]);

export function isLeaveWgu(wgu?: string | null): boolean {
	return LEAVE_WGU_CODES.has(String(wgu ?? "").trim());
}

function countLeaveDays(rows: F02010LeaveRow[], start: string, end: string): number {
	return rows.filter((row) => {
		const wdt = String(row.WDT ?? "").slice(0, 10);
		return isLeaveWgu(row.WGU) && isDateInRange(wdt, start, end);
	}).length;
}

export function buildAnnualLeaveSummary(
	periods: LeavePeriod[],
	attendanceRows: F02010LeaveRow[],
	annualLeaveDays: number,
): AnnualLeaveSummaryRow[] {
	const granted = annualLeaveDays > 0 ? annualLeaveDays : 0;
	return periods.map((period) => {
		const used = countLeaveDays(attendanceRows, period.accrualDate, period.endDate);
		return {
			accrualDate: period.accrualDate,
			endDate: period.endDate,
			accrualYear: period.accrualYear,
			annualLeaveDays: granted,
			usedDays: used,
			remainingDays: Math.max(0, granted - used),
		};
	});
}

export function findPeriodForBaseYear(
	periods: LeavePeriod[],
	baseYear: number,
): LeavePeriod | undefined {
	return (
		periods.find((p) => p.accrualYear === baseYear) ??
		periods.find((p) => {
			const startY = parseInt(p.accrualDate.slice(0, 4), 10);
			const endY = parseInt(p.endDate.slice(0, 4), 10);
			return baseYear >= startY && baseYear <= endY;
		})
	);
}

/** 발생일자~종료일자 구간 내 WGU=2 근태만 근무 상세로 표시 */
export function buildWorkDetailListForDateRange(
	attendanceRows: F02010LeaveRow[],
	startDate: string,
	endDate: string,
): WorkDetailRow[] {
	if (!startDate || !endDate) return [];
	return attendanceRows
		.filter((row) => {
			const wdt = String(row.WDT ?? "").slice(0, 10);
			return isLeaveWgu(row.WGU) && isDateInRange(wdt, startDate, endDate);
		})
		.map((row) => ({
			workDate: String(row.WDT ?? "").slice(0, 10),
			workType: classifyAttendanceDisplay(row),
			reason: String(row.HODES ?? "").trim() || "-",
		}))
		.sort((a, b) => a.workDate.localeCompare(b.workDate));
}

export function buildWorkDetailList(
	attendanceRows: F02010LeaveRow[],
	period: LeavePeriod | undefined,
): WorkDetailRow[] {
	if (!period) return [];
	return buildWorkDetailListForDateRange(attendanceRows, period.accrualDate, period.endDate);
}

export function getAttendanceFetchRange(periods: LeavePeriod[]): { start: string; end: string } | null {
	if (periods.length === 0) return null;
	const starts = periods.map((p) => p.accrualDate).sort();
	const ends = periods.map((p) => p.endDate).sort();
	const today = formatLocalDate(new Date());
	const end = ends[ends.length - 1] > today ? today : ends[ends.length - 1];
	return { start: starts[0], end };
}

export interface EmployeeForAnnualLeavePrint {
	EMPNO: number;
	EMPNM: string;
	JOB?: string;
	JOBST?: string;
	SDT?: string;
	EDT?: string;
	BASE_DT?: string;
	YRNT?: number;
}

export interface FullAnnualLeavePrintRow {
	empnm: string;
	job: string;
	status: string;
	hireDate: string;
	resignDate: string;
	baseDate: string;
	startDate: string;
	endDate: string;
	yearIndex: number;
	annualLeaveDays: number;
	usedDays: number;
	remark: string;
	showEmployeeColumns: boolean;
}

export function formatDateField(value: string | null | undefined): string {
	const s = String(value ?? "").trim().slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export function getWorkStatusLabel(jobst?: string | null): string {
	switch (String(jobst ?? "").trim()) {
		case "1":
			return "근무";
		case "2":
			return "휴직";
		case "9":
			return "퇴직";
		default:
			return "";
	}
}

/** 연차 구간 오래된 순 */
export function buildLeavePeriodsChronological(
	anchorDate: string | null | undefined,
	hireDate: string | null | undefined,
	throughYear: number,
): LeavePeriod[] {
	return buildLeavePeriods(anchorDate, hireDate, throughYear).slice().reverse();
}

export function buildFullAnnualLeavePrintRows(
	employee: EmployeeForAnnualLeavePrint,
	attendanceRows: F02010LeaveRow[],
	throughYear: number,
): FullAnnualLeavePrintRow[] {
	const periods = buildLeavePeriodsChronological(employee.BASE_DT, employee.SDT, throughYear);
	if (periods.length === 0) return [];

	const granted = typeof employee.YRNT === "number" ? employee.YRNT : Number(employee.YRNT) || 0;
	const summary = buildAnnualLeaveSummary(periods, attendanceRows, granted);
	const baseDate = formatDateField(employee.BASE_DT) || formatDateField(employee.SDT);

	return summary.map((s, idx) => ({
		empnm: String(employee.EMPNM ?? "").trim(),
		job: String(employee.JOB ?? "").trim(),
		status: getWorkStatusLabel(employee.JOBST),
		hireDate: formatDateField(employee.SDT),
		resignDate: formatDateField(employee.EDT),
		baseDate,
		startDate: s.accrualDate,
		endDate: s.endDate,
		yearIndex: idx,
		annualLeaveDays: s.annualLeaveDays,
		usedDays: s.usedDays,
		remark: "",
		showEmployeeColumns: idx === 0,
	}));
}

export function getGlobalAttendanceRangeForEmployees(
	employees: EmployeeForAnnualLeavePrint[],
	throughYear: number,
): { start: string; end: string } | null {
	let minStart: string | null = null;
	const today = formatLocalDate(new Date());
	for (const emp of employees) {
		const periods = buildLeavePeriods(emp.BASE_DT, emp.SDT, throughYear);
		const range = getAttendanceFetchRange(periods);
		if (range && (!minStart || range.start < minStart)) {
			minStart = range.start;
		}
	}
	if (!minStart) return null;
	return { start: minStart, end: today };
}

export function buildAllEmployeesAnnualLeavePrintRows(
	employees: EmployeeForAnnualLeavePrint[],
	attendanceByEmpno: Map<number, F02010LeaveRow[]>,
	throughYear: number,
): FullAnnualLeavePrintRow[] {
	const sorted = [...employees].sort((a, b) =>
		String(a.EMPNM ?? "").localeCompare(String(b.EMPNM ?? ""), "ko"),
	);
	const allRows: FullAnnualLeavePrintRow[] = [];
	for (const emp of sorted) {
		const empAttendance = attendanceByEmpno.get(emp.EMPNO) ?? [];
		const rows = buildFullAnnualLeavePrintRows(emp, empAttendance, throughYear);
		allRows.push(...rows);
	}
	return allRows;
}

/** 기준년도 보고서 1행 (사원당 해당 연도 연차 구간 1건) */
export interface BaseYearAnnualLeavePrintRow {
	empnm: string;
	job: string;
	status: string;
	hireDate: string;
	resignDate: string;
	startDate: string;
	endDate: string;
	yearIndex: number;
	annualLeaveDays: number;
	usedDays: number;
}

export function buildBaseYearAnnualLeavePrintRow(
	employee: EmployeeForAnnualLeavePrint,
	attendanceRows: F02010LeaveRow[],
	baseYear: number,
): BaseYearAnnualLeavePrintRow | null {
	const periodsChron = buildLeavePeriodsChronological(employee.BASE_DT, employee.SDT, baseYear);
	if (periodsChron.length === 0) return null;

	const period = findPeriodForBaseYear(periodsChron, baseYear);
	if (!period) return null;

	const granted = typeof employee.YRNT === "number" ? employee.YRNT : Number(employee.YRNT) || 0;
	const summary = buildAnnualLeaveSummary([period], attendanceRows, granted)[0];
	const yearIndex = periodsChron.findIndex((p) => p.accrualDate === period.accrualDate);

	return {
		empnm: String(employee.EMPNM ?? "").trim(),
		job: String(employee.JOB ?? "").trim(),
		status: getWorkStatusLabel(employee.JOBST),
		hireDate: formatDateField(employee.SDT),
		resignDate: formatDateField(employee.EDT),
		startDate: summary.accrualDate,
		endDate: summary.endDate,
		yearIndex: yearIndex >= 0 ? yearIndex : 0,
		annualLeaveDays: summary.annualLeaveDays,
		usedDays: summary.usedDays,
	};
}

export function buildAllBaseYearAnnualLeavePrintRows(
	employees: EmployeeForAnnualLeavePrint[],
	attendanceByEmpno: Map<number, F02010LeaveRow[]>,
	baseYear: number,
): BaseYearAnnualLeavePrintRow[] {
	const sorted = [...employees].sort((a, b) =>
		String(a.EMPNM ?? "").localeCompare(String(b.EMPNM ?? ""), "ko"),
	);
	const rows: BaseYearAnnualLeavePrintRow[] = [];
	for (const emp of sorted) {
		const empAttendance = attendanceByEmpno.get(emp.EMPNO) ?? [];
		const row = buildBaseYearAnnualLeavePrintRow(emp, empAttendance, baseYear);
		if (row) rows.push(row);
	}
	return rows;
}

export function getBaseYearAttendanceRangeForEmployees(
	employees: EmployeeForAnnualLeavePrint[],
	baseYear: number,
): { start: string; end: string } | null {
	let minStart: string | null = null;
	let maxEnd: string | null = null;
	for (const emp of employees) {
		const periods = buildLeavePeriods(emp.BASE_DT, emp.SDT, baseYear);
		const period = findPeriodForBaseYear(periods, baseYear);
		if (!period) continue;
		if (!minStart || period.accrualDate < minStart) minStart = period.accrualDate;
		if (!maxEnd || period.endDate > maxEnd) maxEnd = period.endDate;
	}
	if (!minStart || !maxEnd) return null;
	return { start: minStart, end: maxEnd };
}

/** 기준년도 상세 보고서 — 사원 요약 + 사용 내역 목록 */
export interface DetailAnnualLeavePrintSection extends BaseYearAnnualLeavePrintRow {
	details: { workDate: string; workType: string }[];
}

export function buildDetailAnnualLeavePrintSection(
	employee: EmployeeForAnnualLeavePrint,
	attendanceRows: F02010LeaveRow[],
	baseYear: number,
): DetailAnnualLeavePrintSection | null {
	const summary = buildBaseYearAnnualLeavePrintRow(employee, attendanceRows, baseYear);
	if (!summary) return null;

	const details = buildWorkDetailListForDateRange(
		attendanceRows,
		summary.startDate,
		summary.endDate,
	).map((d) => ({ workDate: d.workDate, workType: d.workType }));

	return { ...summary, details };
}

export function buildAllDetailAnnualLeavePrintSections(
	employees: EmployeeForAnnualLeavePrint[],
	attendanceByEmpno: Map<number, F02010LeaveRow[]>,
	baseYear: number,
): DetailAnnualLeavePrintSection[] {
	const sorted = [...employees].sort((a, b) =>
		String(a.EMPNM ?? "").localeCompare(String(b.EMPNM ?? ""), "ko"),
	);
	const sections: DetailAnnualLeavePrintSection[] = [];
	for (const emp of sorted) {
		const empAttendance = attendanceByEmpno.get(emp.EMPNO) ?? [];
		const section = buildDetailAnnualLeavePrintSection(emp, empAttendance, baseYear);
		if (section) sections.push(section);
	}
	return sections;
}
