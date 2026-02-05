"use client";
import React, { useState, useEffect } from 'react';

interface Employee {
	ANCD: number;
	EMPNO: number;
	EMPNM: string;
	EMPHP?: string;
	JOB?: string;
	JOBST?: string;
	JOBADD?: string;
	JOBSH?: string;
	SDT?: string;
	EDT?: string;
	HSDT?: string;
	HEDT?: string;
	EMPTEL?: string;
	EMPADD?: string;
	YRNT?: number;
	MNG_GU?: string;
	BASE_DT?: string;
	ETC?: string;
	[key: string]: unknown;
}

interface EmployeeForm {
	name: string;
	yearsOfService: string;
	workLocation: string;
	workType: string;
	hireDate: string;
	retirementDate: string;
	leaveStartDate: string;
	leaveEndDate: string;
	homePhone: string;
	mobilePhone: string;
	homeAddress: string;
	attendanceManagement: boolean;
	annualLeaveStandardDate: string;
	notes: string;
}

const initialForm: EmployeeForm = {
	name: "",
	yearsOfService: "",
	workLocation: "",
	workType: "",
	hireDate: "",
	retirementDate: "",
	leaveStartDate: "",
	leaveEndDate: "",
	homePhone: "",
	mobilePhone: "",
	homeAddress: "",
	attendanceManagement: false,
	annualLeaveStandardDate: "",
	notes: "",
};

export default function EmployeeBasicInfo() {
	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState<string>("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState<string>("");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [formData, setFormData] = useState<EmployeeForm>(initialForm);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 사원 목록 조회
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
			console.error("사원 목록 조회 오류:", err);
		} finally {
			setLoading(false);
		}
	};

	// 날짜 포맷팅 함수
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

	// 근무상태 변환 함수
	const getWorkStatusText = (jobst?: string): string => {
		if (!jobst) return "-";
		switch (jobst.trim()) {
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

	// 사원 선택 핸들러
	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
		setFormData({
			name: employee.EMPNM || "",
			yearsOfService: employee.YRNT ? String(employee.YRNT) : "",
			workLocation: employee.JOBADD || "",
			workType: employee.JOBSH || "",
			hireDate: formatDate(employee.SDT),
			retirementDate: formatDate(employee.EDT),
			leaveStartDate: formatDate(employee.HSDT),
			leaveEndDate: formatDate(employee.HEDT),
			homePhone: employee.EMPTEL || "",
			mobilePhone: employee.EMPHP || "",
			homeAddress: employee.EMPADD || "",
			attendanceManagement: employee.MNG_GU === "Y",
			annualLeaveStandardDate: formatDate(employee.BASE_DT),
			notes: employee.ETC || "",
		});
	};

	// 검색 핸들러
	const handleSearch = () => {
		setCurrentPage(1);
		fetchEmployees(searchTerm);
	};

	// 필터링된 사원 목록
	const filteredEmployees = employeeList.filter((employee) => {
		// 이름이 없는 데이터 제외
		const employeeName = String(employee.EMPNM || "").trim();
		if (!employeeName || employeeName === "") {
			return false;
		}
		// 직책 필터
		if (selectedJob && selectedJob !== "") {
			const employeeJob = String(employee.JOB || "").trim();
			if (employeeJob !== selectedJob) {
				return false;
			}
		}
		// 근무상태 필터
		if (selectedWorkStatus && selectedWorkStatus !== "") {
			const employeeStatus = String(employee.JOBST || "").trim();
			if (employeeStatus !== selectedWorkStatus) {
				return false;
			}
		}
		return true;
	});

	// 고유한 직책 목록 추출
	const uniqueJobs = Array.from(
		new Set(employeeList.map((emp) => emp.JOB).filter((job) => job && job.trim() !== ""))
	).sort();

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

	// 페이지 변경 핸들러
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 초기 로드
	useEffect(() => {
		fetchEmployees();
	}, []);

	// 검색어 변경 시 실시간 검색 (디바운싱)
	// 필터가 적용되어 있으면 검색어가 없어도 전체 목록 조회
	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			// 필터가 적용되어 있거나 검색어가 있으면 조회
			if (searchTerm.trim() !== "" || selectedJob !== "" || selectedWorkStatus !== "") {
				fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
			} else {
				// 필터도 없고 검색어도 없으면 전체 조회
				fetchEmployees();
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm, selectedJob, selectedWorkStatus]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedJob, selectedWorkStatus]);

	// 추가 버튼 핸들러
	const handleAdd = () => {
		setSelectedEmployee(null);
		setFormData(initialForm);
	};

	// 수정 버튼 핸들러
	const handleModify = async () => {
		if (!selectedEmployee) {
			alert("수정할 사원을 선택해주세요.");
			return;
		}
		// TODO: 수정 API 호출
		console.log("수정 데이터:", formData);
	};
	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1200px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 사원 목록 */}
					<aside className="w-96 shrink-0">
						<div className="border border-blue-300 rounded-lg overflow-hidden bg-white shadow-sm">
							<div className="bg-blue-100 border-b border-blue-300 px-3 py-2 text-blue-900 font-semibold">사원 목록</div>
							{/* 상단 상태/검색 영역 */}
							<div className="px-3 py-2 border-b border-blue-100 space-y-2">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white"
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleSearch();
										}
									}}
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
							{/* 목록 테이블 */}
							<div className="max-h-[540px] overflow-auto">
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
											currentEmployees.map((employee, index) => (
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
							{/* 페이지네이션 */}
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
					</aside>

					{/* 우측: 사원정보 상세 영역 */}
					<section className="flex-1">
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
							{/* 상단 헤더: 사원정보 탭 + 근태관리구분/년차기준일 */}
							<div className="flex items-center justify-between border-b border-blue-200 bg-blue-50/50 p-4">
								<div className="flex items-center gap-2">
									<div className="rounded-t border border-b-0 border-blue-300 bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-900">
										사원정보
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900">근태관리구분</label>
										<input
											type="checkbox"
											checked={formData.attendanceManagement}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													attendanceManagement: e.target.checked,
												}))
											}
											className="rounded border-blue-300 text-blue-600"
										/>
										<span className="text-sm text-blue-900">관리</span>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900">년차기준일</label>
										<input
											type="date"
											value={formData.annualLeaveStandardDate}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													annualLeaveStandardDate: e.target.value,
												}))
											}
											className="rounded border border-blue-300 bg-white px-2 py-1 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
										/>
									</div>
								</div>
							</div>

							{/* 메인 폼 영역 */}
							<div className="p-4 space-y-3">
								{/* Row 1: 사원명/년차 + 근무위치 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										사원명/년차
									</label>
									<input
										type="text"
										value={formData.name}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-16 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										년차
									</label>
									<input
										type="text"
										value={formData.yearsOfService}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												yearsOfService: e.target.value,
											}))
										}
										placeholder="년차"
										className="w-20 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										근무위치
									</label>
									<input
										type="text"
										value={formData.workLocation}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												workLocation: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 2: 근무형태 + 취업일자 + 퇴직일자 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										근무형태
									</label>
									<input
										type="text"
										value={formData.workType}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, workType: e.target.value }))
										}
										className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										취업일자
									</label>
									<input
										type="date"
										value={formData.hireDate}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, hireDate: e.target.value }))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-20 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										퇴직일자
									</label>
									<input
										type="date"
										value={formData.retirementDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												retirementDate: e.target.value,
											}))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 3: 휴직시작일 + 휴직종료일 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										휴직시작일
									</label>
									<input
										type="date"
										value={formData.leaveStartDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												leaveStartDate: e.target.value,
											}))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-20 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										휴직종료일
									</label>
									<input
										type="date"
										value={formData.leaveEndDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												leaveEndDate: e.target.value,
											}))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 4: 집전화 + 핸드폰 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										집전화
									</label>
									<input
										type="text"
										value={formData.homePhone}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, homePhone: e.target.value }))
										}
										className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-20 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										핸드폰
									</label>
									<input
										type="text"
										value={formData.mobilePhone}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												mobilePhone: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 5: 집주소 (전체 너비) */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										집주소
									</label>
									<input
										type="text"
										value={formData.homeAddress}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												homeAddress: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* 하단: 비고 영역 + 추가/수정 버튼 */}
								<div className="mt-4 flex items-start gap-4">
									<div className="flex flex-col gap-2 flex-1">
										<label className="w-24 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
											비고
										</label>
										<textarea
											value={formData.notes}
											onChange={(e) =>
												setFormData((prev) => ({ ...prev, notes: e.target.value }))
											}
											rows={4}
											className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
											placeholder="비고를 입력하세요"
										/>
									</div>
									<div className="flex flex-col gap-2 pt-7">
										<button
											type="button"
											onClick={handleAdd}
											className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap"
										>
											추가
										</button>
										<button
											type="button"
											onClick={handleModify}
											className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap"
										>
											수정
										</button>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
    );
}
