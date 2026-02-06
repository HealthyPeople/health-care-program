"use client";

import React, { useState, useEffect } from "react";

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
	[key: string]: unknown;
}

// 년차 요약 행 (좌측 테이블)
interface AnnualLeaveSummaryRow {
	accrualDate: string;
	annualLeaveDays: number;
	usedDays: number;
	endDate: string;
}

// 근무 상세 행 (우측 테이블)
interface WorkDetailRow {
	workDate: string;
	workType: string;
}

export default function EmployeeAnnualLeave() {
	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState<string>("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState<string>("");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 오른쪽 패널: 근무상태 필터(검색용), 선택 사원 정보, 기준년도
	const [rightWorkStatus, setRightWorkStatus] = useState<string>("1");
	const [baseYear, setBaseYear] = useState<number>(new Date().getFullYear());

	// 년차 요약 / 근무 상세 테이블 데이터 (추후 API 연동)
	const [annualLeaveList, setAnnualLeaveList] = useState<AnnualLeaveSummaryRow[]>([]);
	const [workDetailList, setWorkDetailList] = useState<WorkDetailRow[]>([]);

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

	const formatDate = (dateStr: string | null | undefined): string => {
		if (!dateStr) return "";
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

	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
		// 추후 선택 사원 기준 년차/근무상세 API 호출
		setAnnualLeaveList([]);
		setWorkDetailList([]);
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

			{/* 오른쪽: 이미지 레이아웃 */}
			<div className="flex-1 flex flex-col min-w-0 bg-blue-50/30">
				{/* 상단: 검색/닫기 + 근무상태 + 사원 정보 */}
				<div className="border-b border-blue-200 bg-blue-50/50 p-4 space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3">
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
						</div>
						<div className="flex gap-2">
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
						</div>
					</div>
					{/* 사원명, 입사일자, 근무년 수 */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="flex items-center gap-2">
							<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
								사원명
							</label>
							<input
								type="text"
								readOnly
								value={selectedEmployee?.EMPNM ?? ""}
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
								value={formatDate(selectedEmployee?.SDT) ?? ""}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
								근무년 수
							</label>
							<input
								type="text"
								readOnly
								value={selectedEmployee?.YRNT != null ? String(selectedEmployee.YRNT) : ""}
								className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900"
							/>
						</div>
					</div>
				</div>

				{/* 중단: 두 테이블 나란히 */}
				<div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
					{/* 좌측 테이블: 년차 요약 */}
					<div className="flex-1 flex flex-col rounded-lg border border-blue-300 bg-white min-w-0 overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 font-semibold text-blue-900 shrink-0">
							년차 요약
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 bg-blue-50 border-b border-blue-200">
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
										<th className="px-3 py-2 text-center font-semibold text-blue-900">
										종료일자
										</th>
									</tr>
								</thead>
								<tbody>
									{annualLeaveList.length === 0 ? (
										<tr>
											<td colSpan={4} className="px-3 py-8 text-center text-blue-900/60">
												데이터가 없습니다
											</td>
										</tr>
									) : (
										annualLeaveList.map((row, idx) => (
											<tr key={idx} className="border-b border-blue-50 hover:bg-blue-50/50">
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{row.accrualDate}
												</td>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{row.annualLeaveDays}
												</td>
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{row.usedDays}
												</td>
											<td className="px-3 py-2 text-center">{row.endDate}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
					{/* 우측 테이블: 근무 상세 */}
					<div className="flex-1 flex flex-col rounded-lg border border-blue-300 bg-white min-w-0 overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 font-semibold text-blue-900 shrink-0">
							근무 상세
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 bg-blue-50 border-b border-blue-200">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
											근무일자
										</th>
										<th className="px-3 py-2 text-center font-semibold text-blue-900">
											근무구분
										</th>
									</tr>
								</thead>
								<tbody>
									{workDetailList.length === 0 ? (
										<tr>
											<td colSpan={2} className="px-3 py-8 text-center text-blue-900/60">
												데이터가 없습니다
											</td>
										</tr>
									) : (
										workDetailList.map((row, idx) => (
											<tr key={idx} className="border-b border-blue-50 hover:bg-blue-50/50">
												<td className="border-r border-blue-100 px-3 py-2 text-center">
													{row.workDate}
												</td>
												<td className="px-3 py-2 text-center">{row.workType}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 하단: 버튼 + 기준년도 */}
				<div className="border-t border-blue-200 bg-blue-50/50 p-4 flex flex-wrap items-end justify-between gap-4">
					<div className="flex gap-2">
						<button
							type="button"
							className="rounded border border-blue-500 bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600"
						>
							년차 생성
						</button>
						<button
							type="button"
							className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							전체년차출력
						</button>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex flex-col items-center">
							<label className="text-sm font-medium text-blue-900">기준년도</label>
							<span className="rounded border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-900">
								{baseYear}
							</span>
						</div>
						<div className="flex flex-col gap-1">
							<button
								type="button"
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								기준년도출력
							</button>
							<button
								type="button"
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								기준상세출력
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
