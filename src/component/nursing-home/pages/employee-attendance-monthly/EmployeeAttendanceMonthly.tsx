"use client";

import React, { useState, useEffect } from "react";

interface Employee {
	ANCD: number;
	EMPNO: number;
	EMPNM: string;
	EMPHP?: string;
	JOB?: string;
	JOBST?: string;
	[key: string]: unknown;
}

interface AttendanceRow {
	WDT: string;
	WGU?: string;
	HODES?: string;
}

export default function EmployeeAttendanceMonthly() {
	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState<string>("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState<string>("");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 날짜 범위: 시작일, 끝나는날 (선택 가능)
	function getMonthStart(y: number, m: number): string {
		const d = new Date(y, m, 1);
		return formatDateStr(d);
	}
	function getMonthEnd(y: number, m: number): string {
		const d = new Date(y, m + 1, 0);
		return formatDateStr(d);
	}
	const now = new Date();
	const [startDateStr, setStartDateStr] = useState(() => getMonthStart(now.getFullYear(), now.getMonth()));
	const [endDateStr, setEndDateStr] = useState(() => getMonthEnd(now.getFullYear(), now.getMonth()));

	// 선택한 사원의 월별 근태 목록
	const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);
	const [loadingAttendance, setLoadingAttendance] = useState(false);

	function formatDateStr(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	}

	// 사원 목록 조회 (EmployeeBasicInfo와 동일)
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
		} catch (err) {
			// 사원 목록 조회 오류
		} finally {
			setLoading(false);
		}
	};

	// 근무상태 텍스트 (EmployeeBasicInfo와 동일)
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

	// 근무구분 텍스트
	const getWorkClassificationText = (wgu?: string): string => {
		if (!wgu || String(wgu).trim() === "") return "근무";
		switch (String(wgu).trim()) {
			case "4":
				return "정기휴일";
			case "5":
				return "연월차";
			case "6":
				return "결근";
			case "9":
				return "기타";
			default:
				return "근무";
		}
	};

	// 필터링된 사원 목록 (EmployeeBasicInfo와 동일 로직)
	const filteredEmployees = employeeList.filter((employee) => {
		const employeeName = String(employee.EMPNM || "").trim();
		if (!employeeName || employeeName === "") return false;
		if (selectedJob && selectedJob !== "") {
			const employeeJob = String(employee.JOB || "").trim();
			if (employeeJob !== selectedJob) return false;
		}
		if (selectedWorkStatus && selectedWorkStatus !== "") {
			const employeeStatus = String(employee.JOBST || "").trim();
			if (employeeStatus !== selectedWorkStatus) return false;
		}
		return true;
	});

	const uniqueJobs = Array.from(
		new Set(employeeList.map((emp) => emp.JOB).filter((job) => job && String(job).trim() !== ""))
	).sort();

	const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 개월 이동 (화살표): 해당 달의 1일 ~ 말일로 설정
	const handleMonthShift = (delta: number) => {
		const start = new Date(startDateStr);
		if (isNaN(start.getTime())) return;
		const newYear = start.getFullYear();
		const newMonth = start.getMonth() + delta;
		// 월이 넘어가면 년도 보정
		const y = newMonth > 11 ? newYear + 1 : newMonth < 0 ? newYear - 1 : newYear;
		const m = ((newMonth % 12) + 12) % 12;
		setStartDateStr(getMonthStart(y, m));
		setEndDateStr(getMonthEnd(y, m));
		setCurrentPage(1);
	};

	// 사원 선택 시 해당 기간 근태 조회 (간단히 일별 API 호출 또는 별도 월별 API 있으면 연동)
	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
		// 선택 사원의 해당 기간 근태 목록 조회 (F02010 기간 조회가 있으면 사용, 없으면 빈 배열)
		setLoadingAttendance(true);
		const start = startDateStr;
		const end = endDateStr;
		// 월별 근태 API가 없다면 일별로 묶어서 조회하거나, 추후 API 추가 시 교체
		fetch(`/api/f02010?workDate=${start}`)
			.then((res) => res.json())
			.then((result) => {
				if (result.success && Array.isArray(result.data)) {
					const list = (result.data as { WDT?: string; WGU?: string; HODES?: string; ANCD?: number; EMPNO?: number }[])
						.filter(
							(row) => {
								const wdt = row.WDT;
								return (
									row.ANCD === employee.ANCD &&
									row.EMPNO === employee.EMPNO &&
									wdt != null &&
									wdt >= start &&
									wdt <= end
								);
							}
						)
						.map((row) => ({ WDT: row.WDT || "", WGU: row.WGU, HODES: row.HODES }));
					setAttendanceList(list);
				} else {
					setAttendanceList([]);
				}
			})
			.catch(() => setAttendanceList([]))
			.finally(() => setLoadingAttendance(false));
	};

	// 검색
	const handleSearch = () => {
		setCurrentPage(1);
		fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
	};

	// 근태 출력 (인쇄)
	const handlePrint = () => {
		window.print();
	};

	// 닫기 (이전 페이지 또는 모달 닫기)
	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			window.history.back();
		}
	};

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

	// 선택 사원이 바뀌거나 기간이 바뀌면 근태 다시 조회
	useEffect(() => {
		if (selectedEmployee) {
			handleSelectEmployee(selectedEmployee);
		} else {
			setAttendanceList([]);
		}
	}, [startDateStr, endDateStr]);

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			{/* 상단: 제목 + 근무일자 + 근무상태 + 버튼 */}
			<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
				<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
					사원 근태현황
				</h1>
				<div className="flex items-center gap-2">
					<label className="text-sm font-medium text-blue-900 shrink-0">근무일자</label>
					<input
						type="date"
						value={startDateStr}
						onChange={(e) => setStartDateStr(e.target.value || startDateStr)}
						className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					/>
					<span className="text-sm text-blue-900">~</span>
					<input
						type="date"
						value={endDateStr}
						onChange={(e) => setEndDateStr(e.target.value || endDateStr)}
						className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					/>
					<div className="flex items-center border border-blue-300 rounded overflow-hidden bg-white">
						<button
							type="button"
							onClick={() => handleMonthShift(-1)}
							className="p-1.5 text-blue-900 hover:bg-blue-100 border-r border-blue-200"
							title="이전 달"
							aria-label="이전 달"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => handleMonthShift(1)}
							className="p-1.5 text-blue-900 hover:bg-blue-100"
							title="다음 달"
							aria-label="다음 달"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium text-blue-900">근무상태</label>
					<select
						value={selectedWorkStatus}
						onChange={(e) => setSelectedWorkStatus(e.target.value)}
						className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					>
						<option value="">전체</option>
						<option value="1">근무</option>
						<option value="2">휴직</option>
						<option value="9">퇴직</option>
					</select>
				</div>
				<div className="ml-auto flex items-end gap-2">
					<button
						type="button"
						onClick={handleSearch}
						className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						검색
					</button>
					<button
						type="button"
						onClick={handlePrint}
						className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						근태출력
					</button>
					{/* <button
						type="button"
						onClick={handleClose}
						className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						닫기
					</button> */}
				</div>
			</div>

			{/* 메인: 좌측 직원 목록 + 우측 근태 상세 */}
			<div className="flex flex-1 gap-4 p-4 overflow-hidden">
				{/* 왼쪽: 직원 목록 (사원명, 근무상태, 핸드폰번호) */}
				<div className="w-96 shrink-0 flex flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
					<div className="border-b border-blue-300 bg-blue-100 px-3 py-2 font-semibold text-blue-900">
						직원 목록
					</div>
					<div className="px-3 py-2 border-b border-blue-100">
						<input
							type="text"
							placeholder="이름 검색"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded border border-blue-300 px-2 py-1 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
						/>
						<div className="mt-2">
							<label className="text-xs text-blue-900/80">직책</label>
							<select
								value={selectedJob}
								onChange={(e) => setSelectedJob(e.target.value)}
								className="w-full mt-0.5 border border-blue-300 rounded px-2 py-1 text-sm bg-white text-blue-900"
							>
								<option value="">직책 전체</option>
								{uniqueJobs.map((job) => (
									<option key={job} value={job}>
										{job}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="flex-1 overflow-auto min-h-0">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										사원명
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										근무상태
									</th>
									<th className="px-3 py-2 text-center font-semibold text-blue-900">
										핸드폰번호
									</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
											로딩 중...
										</td>
									</tr>
								) : filteredEmployees.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
											사원 데이터가 없습니다
										</td>
									</tr>
								) : (
									currentEmployees.map((employee) => {
										const isSelected =
											selectedEmployee?.ANCD === employee.ANCD &&
											selectedEmployee?.EMPNO === employee.EMPNO;
										return (
											<tr
												key={`${employee.ANCD}-${employee.EMPNO}`}
												onClick={() => handleSelectEmployee(employee)}
												className={`border-b border-blue-50 cursor-pointer hover:bg-blue-50/50 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{employee.EMPNM || "-"}
												</td>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{getWorkStatusText(employee.JOBST)}
												</td>
												<td className="px-3 py-2 text-center">
													{employee.EMPHP || "-"}
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{totalPages > 1 && (
						<div className="border-t border-blue-200 bg-white p-2">
							<div className="flex items-center justify-center gap-1">
								<button
									type="button"
									onClick={() => handlePageChange(1)}
									disabled={currentPage === 1}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&lt;&lt;
								</button>
								<button
									type="button"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&lt;
								</button>
								{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									const pageNum =
										Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
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
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&gt;
								</button>
								<button
									type="button"
									onClick={() => handlePageChange(totalPages)}
									disabled={currentPage === totalPages}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&gt;&gt;
								</button>
							</div>
						</div>
					)}
				</div>

				{/* 오른쪽: 근태 상세 (근무일자, 근무구분, 휴무사유) */}
				<div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-blue-300 bg-white min-w-0">
					<div className="border-b border-blue-300 bg-blue-100 px-3 py-2 font-semibold text-blue-900">
						근태 상세
					</div>
					<div className="flex-1 overflow-auto min-h-0">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										근무일자
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										근무구분
									</th>
									<th className="px-3 py-2 text-center font-semibold text-blue-900">
										휴무사유
									</th>
								</tr>
							</thead>
							<tbody>
								{!selectedEmployee ? (
									<tr>
										<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
											좌측에서 사원을 선택하세요
										</td>
									</tr>
								) : loadingAttendance ? (
									<tr>
										<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
											로딩 중...
										</td>
									</tr>
								) : attendanceList.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-3 py-8 text-center text-blue-900/60">
											근태 데이터가 없습니다
										</td>
									</tr>
								) : (
									attendanceList.map((row, idx) => (
										<tr
											key={`${row.WDT ?? ""}-${idx}`}
											className="border-b border-blue-50 hover:bg-blue-50/50"
										>
											<td className="border-r border-blue-100 px-3 py-2 text-center">
												{row.WDT ?? "-"}
											</td>
											<td className="border-r border-blue-100 px-3 py-2 text-center">
												{getWorkClassificationText(row.WGU)}
											</td>
											<td className="px-3 py-2 text-center">
												{row.HODES || "-"}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
