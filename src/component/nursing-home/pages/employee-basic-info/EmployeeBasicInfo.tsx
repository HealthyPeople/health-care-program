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
	job: string;
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
	job: "",
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

interface EmployeeCreateForm {
	name: string;
	yearsOfService: string;
	job: string;
	workStatus: string;
	hireDate: string;
	leaveStartDate: string;
	retirementDate: string;
	attendanceManagement: boolean;
	annualLeaveStandardDate: string;
	workLocation: string;
	workType: string;
	salaryBank: string;
	bankAccount: string;
	mobilePhone: string;
	homePhone: string;
	zipCode: string;
	homeAddress: string;
	notes: string;
}

function todayYmd(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIntOrZero(v: string): number {
	const n = parseInt(String(v).replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

const initialCreateForm = (): EmployeeCreateForm => ({
	name: "",
	yearsOfService: "",
	job: "",
	workStatus: "1",
	hireDate: todayYmd(),
	leaveStartDate: "",
	retirementDate: "",
	attendanceManagement: true,
	annualLeaveStandardDate: "",
	workLocation: "",
	workType: "",
	salaryBank: "",
	bankAccount: "",
	mobilePhone: "",
	homePhone: "",
	zipCode: "",
	homeAddress: "",
	notes: "",
});

const modalLabelCls =
	"w-28 shrink-0 bg-blue-100 border border-blue-300 px-2 py-1.5 text-sm font-medium text-blue-900 text-center";
const modalFieldCls =
	"flex-1 min-w-0 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

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
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [createForm, setCreateForm] = useState<EmployeeCreateForm>(() => initialCreateForm());
	const [createSaveLoading, setCreateSaveLoading] = useState(false);
	const [createSaveError, setCreateSaveError] = useState<string | null>(null);
	const [userEmp, setUserEmp] = useState<{ empno?: number | string; empnm?: string }>({});
	const [isEditMode, setIsEditMode] = useState(false);
	const [editSaveLoading, setEditSaveLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const formLocked = !isEditMode;
	const fieldCls = (cls: string) =>
		`${cls}${formLocked ? " bg-blue-50/70 cursor-default" : ""}`;

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

	const employeeToForm = (employee: Employee): EmployeeForm => ({
		name: employee.EMPNM || "",
		yearsOfService: employee.YRNT ? String(employee.YRNT) : "",
		job: employee.JOB || "",
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

	// 사원 선택 핸들러
	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
		setFormData(employeeToForm(employee));
		setIsEditMode(false);
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

	const openCreateModal = () => {
		setIsEditMode(false);
		setCreateForm(initialCreateForm());
		setCreateSaveError(null);
		setCreateModalOpen(true);
	};

	const closeCreateModal = () => {
		if (createSaveLoading) return;
		setCreateModalOpen(false);
		setCreateSaveError(null);
	};

	const handleCreateSave = async () => {
		if (!createForm.name.trim()) {
			setCreateSaveError("사원명을 입력해 주세요.");
			return;
		}
		setCreateSaveLoading(true);
		setCreateSaveError(null);
		try {
			const res = await fetch("/api/f01010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					EMPNM: createForm.name.trim(),
					YRNT: createForm.yearsOfService,
					JOB: createForm.job,
					JOBST: createForm.workStatus,
					JOBADD: createForm.workLocation,
					JOBSH: createForm.workType,
					BK: createForm.salaryBank,
					BKNO: createForm.bankAccount,
					SDT: createForm.hireDate,
					EDT: createForm.retirementDate,
					HSDT: createForm.leaveStartDate,
					EMPHP: createForm.mobilePhone,
					EMPTEL: createForm.homePhone,
					EMPZIP: createForm.zipCode,
					EMPADD: createForm.homeAddress,
					ETC: createForm.notes,
					MNG_GU: createForm.attendanceManagement ? "Y" : "N",
					BASE_DT: createForm.annualLeaveStandardDate,
					INEMPNO: userEmp.empno ?? null,
					INEMPNM: userEmp.empnm ?? null,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "사원 등록에 실패했습니다.");
			}
			setCreateModalOpen(false);
			await fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
			const newEmp: Employee = {
				ANCD: json.ancd,
				EMPNO: json.empno,
				EMPNM: json.EMPNM || createForm.name.trim(),
				JOB: createForm.job,
				JOBST: createForm.workStatus,
				JOBADD: createForm.workLocation,
				JOBSH: createForm.workType,
				YRNT: parseIntOrZero(createForm.yearsOfService),
				SDT: createForm.hireDate,
				EDT: createForm.retirementDate,
				HSDT: createForm.leaveStartDate,
				EMPHP: createForm.mobilePhone,
				EMPTEL: createForm.homePhone,
				EMPADD: createForm.homeAddress,
				MNG_GU: createForm.attendanceManagement ? "Y" : "N",
				BASE_DT: createForm.annualLeaveStandardDate,
				ETC: createForm.notes,
				BK: createForm.salaryBank,
				BKNO: createForm.bankAccount,
			};
			handleSelectEmployee(newEmp);
			alert("사원정보가 등록되었습니다.");
		} catch (e) {
			setCreateSaveError(e instanceof Error ? e.message : "사원 등록 중 오류가 발생했습니다.");
		} finally {
			setCreateSaveLoading(false);
		}
	};

	const handleSignRegister = () => {
		alert("기능 준비중입니다");
	};

	const handleStartEdit = () => {
		if (!selectedEmployee) return;
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		if (selectedEmployee) {
			setFormData(employeeToForm(selectedEmployee));
		}
		setIsEditMode(false);
	};

	const handleDeleteEmployee = async () => {
		if (!selectedEmployee || isEditMode || deleteLoading) return;
		const name = String(selectedEmployee.EMPNM ?? "").trim() || String(selectedEmployee.EMPNO);

		setDeleteLoading(true);
		try {
			// 사원연결로 생성된 계정 확인
			const linkQs = new URLSearchParams({
				ancd: String(selectedEmployee.ANCD),
				empno: String(selectedEmployee.EMPNO),
			});
			const linkRes = await fetch(`/api/f00120?${linkQs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const linkJson = await linkRes.json().catch(() => ({}));
			const linkedAccounts = Array.isArray(linkJson?.data)
				? linkJson.data
						.map((r: { UID?: string }) => String(r?.UID ?? "").trim())
						.filter(Boolean)
				: [];

			let confirmMsg = `사원 [${name}] (사원번호 ${selectedEmployee.EMPNO}) 정보를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`;
			if (linkedAccounts.length > 0) {
				confirmMsg += `\n\n이 사원과 사원연결작업으로 연결된 사용자 계정이 있습니다.\n연결된 계정(${linkedAccounts.join(", ")})까지 함께 삭제됩니다.`;
			}

			const ok = window.confirm(confirmMsg);
			if (!ok) return;

			const qs = new URLSearchParams({
				ancd: String(selectedEmployee.ANCD),
				empno: String(selectedEmployee.EMPNO),
			});
			const res = await fetch(`/api/f01010?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "삭제에 실패했습니다.");
			}

			const deletedUids = Array.isArray(json.linkedUids) ? json.linkedUids : linkedAccounts;
			if (deletedUids.length > 0) {
				alert(
					`사원정보가 삭제되었습니다.\n함께 삭제된 사용자 계정: ${deletedUids.join(", ")}`
				);
			} else {
				alert("사원정보가 삭제되었습니다.");
			}
			setSelectedEmployee(null);
			setFormData(initialForm);
			setIsEditMode(false);
			await fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
		} catch (e) {
			alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setDeleteLoading(false);
		}
	};

	const buildUpdatePayload = () => ({
		action: "update",
		EMPNO: selectedEmployee!.EMPNO,
		EMPNM: formData.name.trim(),
		YRNT: formData.yearsOfService,
		JOB: formData.job,
		JOBADD: formData.workLocation,
		JOBSH: formData.workType,
		SDT: formData.hireDate,
		EDT: formData.retirementDate,
		HSDT: formData.leaveStartDate,
		HEDT: formData.leaveEndDate,
		EMPTEL: formData.homePhone,
		EMPHP: formData.mobilePhone,
		EMPADD: formData.homeAddress,
		MNG_GU: formData.attendanceManagement ? "Y" : "N",
		BASE_DT: formData.annualLeaveStandardDate,
		ETC: formData.notes,
	});

	const handleSaveEdit = async () => {
		if (!selectedEmployee) return;
		if (!formData.name.trim()) {
			alert("사원명을 입력해 주세요.");
			return;
		}
		setEditSaveLoading(true);
		try {
			const res = await fetch("/api/f01010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(buildUpdatePayload()),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "수정에 실패했습니다.");
			}
			await fetchEmployees(searchTerm.trim() !== "" ? searchTerm : undefined);
			const updated: Employee = {
				...selectedEmployee,
				EMPNM: formData.name.trim(),
				YRNT: parseIntOrZero(formData.yearsOfService),
				JOB: formData.job,
				JOBADD: formData.workLocation,
				JOBSH: formData.workType,
				SDT: formData.hireDate,
				EDT: formData.retirementDate,
				HSDT: formData.leaveStartDate,
				HEDT: formData.leaveEndDate,
				EMPTEL: formData.homePhone,
				EMPHP: formData.mobilePhone,
				EMPADD: formData.homeAddress,
				MNG_GU: formData.attendanceManagement ? "Y" : "N",
				BASE_DT: formData.annualLeaveStandardDate,
				ETC: formData.notes,
			};
			setSelectedEmployee(updated);
			setFormData(employeeToForm(updated));
			setIsEditMode(false);
			alert("사원정보가 수정되었습니다.");
		} catch (e) {
			alert(e instanceof Error ? e.message : "수정 중 오류가 발생했습니다.");
		} finally {
			setEditSaveLoading(false);
		}
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
						<div className="mb-2 flex justify-end gap-2">
							<button
								type="button"
								onClick={openCreateModal}
								disabled={isEditMode || deleteLoading}
								className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
							>
								추가
							</button>
							{!isEditMode ? (
								<>
									<button
										type="button"
										onClick={handleStartEdit}
										disabled={!selectedEmployee || deleteLoading}
										className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
									>
										수정
									</button>
									<button
										type="button"
										onClick={() => void handleDeleteEmployee()}
										disabled={!selectedEmployee || deleteLoading}
										className="rounded border border-red-400 bg-red-100 px-5 py-2 text-sm font-medium text-red-900 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{deleteLoading ? "삭제 중…" : "삭제"}
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={handleCancelEdit}
										disabled={editSaveLoading}
										className="rounded border border-blue-400 bg-white px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
									>
										취소
									</button>
									<button
										type="button"
										onClick={() => void handleSaveEdit()}
										disabled={editSaveLoading}
										className="rounded border border-blue-500 bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
									>
										{editSaveLoading ? "저장 중…" : "저장"}
									</button>
								</>
							)}
						</div>
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
											disabled={formLocked}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													attendanceManagement: e.target.checked,
												}))
											}
											className="rounded border-blue-300 text-blue-600 disabled:cursor-not-allowed"
										/>
										<span className="text-sm text-blue-900">관리</span>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900">년차기준일</label>
										<input
											type="date"
											value={formData.annualLeaveStandardDate}
											disabled={formLocked}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													annualLeaveStandardDate: e.target.value,
												}))
											}
											className={fieldCls(
												"rounded border border-blue-300 bg-white px-2 py-1 text-sm text-blue-900 focus:border-blue-500 focus:outline-none disabled:opacity-100",
											)}
										/>
									</div>
								</div>
							</div>

							{/* 메인 폼 영역 (수정 모드에서만 편집 가능) */}
							<fieldset disabled={formLocked} className="min-w-0 space-y-3 border-0 p-4 disabled:opacity-100">
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

								{/* Row 2: 직위/직책 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										직위/직책
									</label>
									<input
										type="text"
										value={formData.job}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, job: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 3: 근무형태 + 취업일자 + 퇴직일자 */}
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

								{/* 하단: 비고 */}
								<div className="mt-4 flex items-start gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										비고
									</label>
									<textarea
										value={formData.notes}
										disabled={formLocked}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, notes: e.target.value }))
										}
										rows={4}
										className={fieldCls(
											"flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y disabled:opacity-100",
										)}
										placeholder="비고를 입력하세요"
									/>
								</div>
							</fieldset>
						</div>
					</section>
				</div>
			</div>

			{createModalOpen ? (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
					role="presentation"
					onClick={closeCreateModal}
				>
					<div
						className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border-2 border-blue-300 bg-white shadow-xl"
						role="dialog"
						aria-modal="true"
						aria-labelledby="employee-create-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
							<h2 id="employee-create-title" className="text-center text-lg font-semibold text-blue-900">
								사원정보 등록
							</h2>
						</div>

						<div className="overflow-y-auto space-y-2 p-4">
							{createSaveError ? (
								<div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
									{createSaveError}
								</div>
							) : null}

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>사원명</label>
								<input
									type="text"
									value={createForm.name}
									onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>연차일수</label>
								<input
									type="text"
									value={createForm.yearsOfService}
									onChange={(e) => setCreateForm((f) => ({ ...f, yearsOfService: e.target.value }))}
									className="w-24 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>직위/직책</label>
								<input
									type="text"
									value={createForm.job}
									onChange={(e) => setCreateForm((f) => ({ ...f, job: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>근무상태</label>
								<div className="flex flex-wrap items-center gap-4 px-2 py-1.5">
									{[
										{ value: "1", label: "근무" },
										{ value: "2", label: "휴직" },
										{ value: "9", label: "퇴직" },
									].map((opt) => (
										<label key={opt.value} className="flex items-center gap-1.5 text-sm text-blue-900">
											<input
												type="radio"
												name="createWorkStatus"
												value={opt.value}
												checked={createForm.workStatus === opt.value}
												onChange={() => setCreateForm((f) => ({ ...f, workStatus: opt.value }))}
												className="text-blue-600"
											/>
											{opt.label}
										</label>
									))}
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<label className={modalLabelCls}>취업일자</label>
								<input
									type="date"
									value={createForm.hireDate}
									onChange={(e) => setCreateForm((f) => ({ ...f, hireDate: e.target.value }))}
									className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
								<label className={`${modalLabelCls} w-24`}>휴직시작일</label>
								<input
									type="date"
									value={createForm.leaveStartDate}
									onChange={(e) => setCreateForm((f) => ({ ...f, leaveStartDate: e.target.value }))}
									className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
								<label className={`${modalLabelCls} w-24`}>퇴직일자</label>
								<input
									type="date"
									value={createForm.retirementDate}
									onChange={(e) => setCreateForm((f) => ({ ...f, retirementDate: e.target.value }))}
									className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<label className={modalLabelCls}>근태관리구분</label>
								<label className="flex items-center gap-1.5 px-2 text-sm text-blue-900">
									<input
										type="checkbox"
										checked={createForm.attendanceManagement}
										onChange={(e) =>
											setCreateForm((f) => ({ ...f, attendanceManagement: e.target.checked }))
										}
										className="rounded border-blue-300 text-blue-600"
									/>
									관리
								</label>
								<label className={`${modalLabelCls} w-24`}>연차기준일</label>
								<input
									type="date"
									value={createForm.annualLeaveStandardDate}
									onChange={(e) =>
										setCreateForm((f) => ({ ...f, annualLeaveStandardDate: e.target.value }))
									}
									className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>근무위치</label>
								<input
									type="text"
									value={createForm.workLocation}
									onChange={(e) => setCreateForm((f) => ({ ...f, workLocation: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>근무형태</label>
								<input
									type="text"
									value={createForm.workType}
									onChange={(e) => setCreateForm((f) => ({ ...f, workType: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>급여이체은행</label>
								<input
									type="text"
									value={createForm.salaryBank}
									onChange={(e) => setCreateForm((f) => ({ ...f, salaryBank: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>통장계좌번호</label>
								<input
									type="text"
									value={createForm.bankAccount}
									onChange={(e) => setCreateForm((f) => ({ ...f, bankAccount: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>핸드폰번호</label>
								<input
									type="text"
									value={createForm.mobilePhone}
									onChange={(e) => setCreateForm((f) => ({ ...f, mobilePhone: e.target.value }))}
									className="w-44 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
								<label className={`${modalLabelCls} w-24`}>집전화번호</label>
								<input
									type="text"
									value={createForm.homePhone}
									onChange={(e) => setCreateForm((f) => ({ ...f, homePhone: e.target.value }))}
									className="flex-1 min-w-0 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>우편번호</label>
								<input
									type="text"
									value={createForm.zipCode}
									onChange={(e) => setCreateForm((f) => ({ ...f, zipCode: e.target.value }))}
									className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>주소</label>
								<input
									type="text"
									value={createForm.homeAddress}
									onChange={(e) => setCreateForm((f) => ({ ...f, homeAddress: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>비고</label>
								<input
									type="text"
									value={createForm.notes}
									onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>
						</div>

						<div className="flex border-t border-blue-200">
							<button
								type="button"
								disabled={createSaveLoading}
								onClick={() => void handleCreateSave()}
								className="flex-1 border-r border-blue-200 bg-blue-100 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-200 disabled:opacity-50"
							>
								{createSaveLoading ? "저장 중…" : "저장"}
							</button>
							<button
								type="button"
								disabled={createSaveLoading}
								onClick={handleSignRegister}
								className="w-28 border-r border-blue-200 bg-white py-3 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								Sign등록
							</button>
							<button
								type="button"
								disabled={createSaveLoading}
								onClick={closeCreateModal}
								className="w-28 bg-white py-3 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								닫기
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
    );
}
