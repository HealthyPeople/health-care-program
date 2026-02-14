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

interface WorkScheduleEntry {
	date: string;
	startTime: string;
	endTime: string;
	workType?: string;
}

export default function WorkSchedule() {
	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState<string>("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState<string>("");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 주간 뷰: 현재 주의 시작일 (월요일)
	const [currentWeekStart, setCurrentWeekStart] = useState(() => {
		const today = new Date();
		const day = today.getDay();
		const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
		const monday = new Date(today.setDate(diff));
		return new Date(monday.setHours(0, 0, 0, 0));
	});

	// 선택한 사원의 주간 근무 스케줄
	const [scheduleData, setScheduleData] = useState<Record<string, WorkScheduleEntry>>({});
	const [loadingSchedule, setLoadingSchedule] = useState(false);

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

	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const getDayOfWeek = (date: Date): string => {
		const days = ["일", "월", "화", "수", "목", "금", "토"];
		return days[date.getDay()];
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

	// 현재 주의 날짜들 (월~일)
	const getWeekDates = (): Date[] => {
		const dates: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(currentWeekStart);
			date.setDate(currentWeekStart.getDate() + i);
			dates.push(date);
		}
		return dates;
	};

	const weekDates = getWeekDates();

	// 주 이동
	const handleWeekChange = (delta: number) => {
		const newDate = new Date(currentWeekStart);
		newDate.setDate(newDate.getDate() + delta * 7);
		setCurrentWeekStart(newDate);
	};

	// 선택한 사원의 근무 스케줄 조회
	const fetchSchedule = async (employee: Employee) => {
		if (!employee) return;
		setLoadingSchedule(true);
		try {
			// 주간 날짜들에 대해 F02010 API로 근태 데이터 조회
			const schedules: Record<string, WorkScheduleEntry> = {};
			for (const date of weekDates) {
				const dateStr = formatDate(date);
				try {
					const response = await fetch(`/api/f02010?workDate=${dateStr}`);
					const result = await response.json();
					if (result.success && Array.isArray(result.data)) {
						const entry = result.data.find(
							(row: { ANCD?: number; EMPNO?: number; WDT?: string }) =>
								row.ANCD === employee.ANCD && row.EMPNO === employee.EMPNO && row.WDT === dateStr
						);
						if (entry) {
							schedules[dateStr] = {
								date: dateStr,
								startTime: entry.STM || "",
								endTime: entry.ETM || "",
								workType: entry.WGU || "",
							};
						}
					}
				} catch (err) {
					// 개별 날짜 조회 실패 시 무시
				}
			}
			setScheduleData(schedules);
		} catch (err) {
			// 스케줄 조회 오류
		} finally {
			setLoadingSchedule(false);
		}
	};

	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
		fetchSchedule(employee);
	};

	const handleSearch = () => {
		setCurrentPage(1);
		fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
	};

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

	const handlePageChange = (page: number) => setCurrentPage(page);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	// 주가 변경되면 선택한 사원의 스케줄 다시 조회
	useEffect(() => {
		if (selectedEmployee) {
			fetchSchedule(selectedEmployee);
		} else {
			setScheduleData({});
		}
	}, [currentWeekStart]);

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

	return (
		<div className="flex min-h-screen bg-white text-black">
			{/* 왼쪽: 사원 목록 */}
			<aside className="w-[480px] shrink-0 border-r border-blue-200 flex flex-col bg-white">
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
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={4} className="px-2 py-4 text-center text-blue-900/60">
										로딩 중...
									</td>
								</tr>
							) : filteredEmployees.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-2 py-4 text-center text-blue-900/60">
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

			{/* 오른쪽: 근무 시간표 */}
			<div className="flex-1 flex flex-col min-w-0 bg-blue-50/30">
				{/* 상단: 제목 + 주 선택 + 버튼 */}
				<div className="border-b border-blue-200 bg-blue-50/50 p-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
							근무시간표
						</h1>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => handleWeekChange(-1)}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								이전 주
							</button>
							<span className="rounded border border-blue-300 bg-white px-4 py-1.5 text-sm text-blue-900 font-medium">
								{formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
							</span>
							<button
								type="button"
								onClick={() => handleWeekChange(1)}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								다음 주
							</button>
							<button
								type="button"
								onClick={() => setCurrentWeekStart(new Date())}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								오늘
							</button>
						</div>
						<button
							type="button"
							onClick={handleClose}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
					{selectedEmployee && (
						<div className="mt-3 text-sm text-blue-900">
							선택된 사원: <span className="font-semibold">{selectedEmployee.EMPNM}</span>
						</div>
					)}
				</div>

				{/* 메인: 주간 근무 시간표 */}
				<div className="flex-1 overflow-auto p-4">
					{!selectedEmployee ? (
						<div className="flex items-center justify-center h-full text-blue-900/60">
							좌측에서 사원을 선택하세요
						</div>
					) : loadingSchedule ? (
						<div className="flex items-center justify-center h-full text-blue-900/60">
							로딩 중...
						</div>
					) : (
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
							<table className="w-full text-sm">
								<thead className="bg-blue-100 border-b border-blue-200">
									<tr>
										<th className="border-r border-blue-200 px-4 py-3 text-center font-semibold text-blue-900">
											날짜
										</th>
										<th className="border-r border-blue-200 px-4 py-3 text-center font-semibold text-blue-900">
											요일
										</th>
										<th className="border-r border-blue-200 px-4 py-3 text-center font-semibold text-blue-900">
											출근시간
										</th>
										<th className="border-r border-blue-200 px-4 py-3 text-center font-semibold text-blue-900">
											퇴근시간
										</th>
										<th className="px-4 py-3 text-center font-semibold text-blue-900">
											근무구분
										</th>
									</tr>
								</thead>
								<tbody>
									{weekDates.map((date, idx) => {
										const dateStr = formatDate(date);
										const schedule = scheduleData[dateStr];
										const isToday =
											formatDate(new Date()) === dateStr;
										return (
											<tr
												key={idx}
												className={`border-b border-blue-50 ${
													isToday ? "bg-blue-50" : ""
												} hover:bg-blue-50/50`}
											>
												<td className="border-r border-blue-100 px-4 py-3 text-center">
													{dateStr}
												</td>
												<td className="border-r border-blue-100 px-4 py-3 text-center">
													{getDayOfWeek(date)}
												</td>
												<td className="border-r border-blue-100 px-4 py-3 text-center">
													{schedule?.startTime || "-"}
												</td>
												<td className="border-r border-blue-100 px-4 py-3 text-center">
													{schedule?.endTime || "-"}
												</td>
												<td className="px-4 py-3 text-center">
													{schedule?.workType || "-"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
