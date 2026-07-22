"use client";

import React, { useState, useEffect } from "react";
import { getCookie } from "@/utils/auth";
import {
	buildDailyAttendancePrintHtml,
	openPrintPreviewWindow,
} from "./employeeAttendancePrint";

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

interface AttendanceData {
	ANCD: number;
	EMPNO: number;
	WDT: string;
	JOBADD?: string;
	JOBSH?: string;
	WGU?: string;
	HODES?: string;
	STM?: string;
	ETM?: string;
	EMPNM?: string;
	[key: string]: unknown;
}

interface AttendanceForm {
	ANCD: number | null;
	EMPNO: number | null;
	employeeId: string;
	employeeName: string;
	workLocation: string;
	workType: string;
	workClassification: string;
	workDate: string;
	workStartTime: string;
	workEndTime: string;
	leaveReason: string;
}

const initialForm: AttendanceForm = {
	ANCD: null,
	EMPNO: null,
	employeeId: "",
	employeeName: "",
	workLocation: "",
	workType: "1",
	workClassification: "근무",
	workDate: "",
	workStartTime: "",
	workEndTime: "",
	leaveReason: "",
};

const WORK_CLASSIFICATIONS = [
	"근무",
	"연차",
	"월차",
	"정기휴무",
	"대휴",
	"병가",
	"경조사",
	"결근",
];

/** JOBSH — 근무형태: 1=주간, 2=야간, 3=심야 */
const JOBSH_OPTIONS = [
	{ value: "1", label: "주간" },
	{ value: "2", label: "야간" },
	{ value: "3", label: "심야" },
];

function normalizeJobsh(value?: string | null): string {
	const v = String(value ?? "").trim();
	if (v === "1" || v === "2" || v === "3") return v;
	if (v === "주간" || /day/i.test(v)) return "1";
	if (v === "야간" || /night/i.test(v)) return "2";
	if (v === "심야" || v === "저녁") return "3";
	return "";
}

/**
 * WGU 코드 (근무일정과 동일)
 * 1=근무, 2=연차, 3=월차, 4=정기휴무, 5=대휴, 6=병가, 7=경조사, 9=결근
 */

export default function EmployeeAttendance() {
	const [employeeList, setEmployeeList] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedJob, setSelectedJob] = useState<string>("");
	const [selectedWorkStatus, setSelectedWorkStatus] = useState<string>("");
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
	const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
	const [loadingAttendance, setLoadingAttendance] = useState(false);
	const [formData, setFormData] = useState<AttendanceForm>(initialForm);
	const [currentPage, setCurrentPage] = useState(1);
	const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
	const [workDate, setWorkDate] = useState(new Date());
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [createFormData, setCreateFormData] = useState<AttendanceForm>(initialForm);
	const [createEmpSearch, setCreateEmpSearch] = useState("");
	const [createEmpList, setCreateEmpList] = useState<Employee[]>([]);
	const [createEmpLoading, setCreateEmpLoading] = useState(false);
	const [createSaving, setCreateSaving] = useState(false);
	/** 출력용 선택 키: `${ANCD}-${EMPNO}-${WDT}` */
	const [selectedPrintKeys, setSelectedPrintKeys] = useState<Set<string>>(new Set());
	const itemsPerPage = 10;
	const attendanceItemsPerPage = 10;

	const attendanceRowKey = (row: Pick<AttendanceData, "ANCD" | "EMPNO" | "WDT">) =>
		`${row.ANCD}-${row.EMPNO}-${String(row.WDT ?? "").slice(0, 10)}`;

	// 날짜 포맷팅 함수
	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// 요일 구하기
	const getDayOfWeek = (date: Date): string => {
		const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
		return days[date.getDay()];
	};

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
			// 사원 목록 조회 오류
		} finally {
			setLoading(false);
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

	// 근무구분 코드를 텍스트로 변환 (목록 표시)
	const getWorkClassificationText = (wgu?: string, hodes?: string): string => {
		return getWorkClassificationTextFromCode(wgu, hodes);
	};

	// 텍스트를 근무구분 코드로 변환
	const getWorkClassificationCode = (text: string): string => {
		switch (String(text ?? "").trim()) {
			case "근무":
				return "1";
			case "연차":
			case "년차":
				return "2";
			case "월차":
				return "3";
			case "정기":
			case "정기휴일":
			case "정기휴무":
				return "4";
			case "대휴":
				return "5";
			case "병가":
				return "6";
			case "경조사":
				return "7";
			case "결근":
				return "9";
			default:
				return "1";
		}
	};

	// 근무구분 코드를 텍스트로 변환 (폼 바인딩)
	const getWorkClassificationTextFromCode = (wgu?: string, hodes?: string): string => {
		const w = String(wgu ?? "").trim();
		const h = String(hodes ?? "").trim();
		if (!w || w === "1") return "근무";
		if (w === "2") return "연차";
		if (w === "3") return "월차";
		if (w === "4") return "정기휴무";
		if (w === "5") return "대휴";
		if (w === "6") return "병가";
		if (w === "7") return "경조사";
		if (w === "9") return "결근";
		// 구 코드 호환
		if (/월/.test(h)) return "월차";
		if (/연|년/.test(h)) return "연차";
		if (/대휴/.test(h)) return "대휴";
		if (/병/.test(h)) return "병가";
		if (/경조/.test(h)) return "경조사";
		if (/결근/.test(h)) return "결근";
		if (/정기/.test(h)) return "정기휴무";
		return "근무";
	};

	const defaultHodesForClassification = (text: string): string => {
		switch (String(text ?? "").trim()) {
			case "연차":
			case "년차":
				return "연차";
			case "월차":
				return "월차";
			case "정기":
			case "정기휴일":
			case "정기휴무":
				return "정기휴무";
			case "대휴":
				return "대휴";
			case "병가":
				return "병가";
			case "경조사":
				return "경조사";
			case "결근":
				return "결근";
			default:
				return "";
		}
	};

	// 근태 데이터 조회
	const fetchAttendanceData = async (date: string) => {
		setLoadingAttendance(true);
		try {
			const response = await fetch(`/api/f02010?workDate=${encodeURIComponent(date)}`);
			const result = await response.json();
			if (result.success) {
				setAttendanceData(result.data || []);
				setSelectedPrintKeys(new Set());
			}
		} catch (err) {
			// 근태 데이터 조회 오류
		} finally {
			setLoadingAttendance(false);
		}
	};

	// 사원 선택 핸들러
	const handleSelectEmployee = (employee: Employee) => {
		setSelectedEmployee(employee);
		
		// 해당 날짜의 근태 데이터가 있는지 확인
		const existingAttendance = attendanceData.find(
			(att) => att.ANCD === employee.ANCD && att.EMPNO === employee.EMPNO
		);

		if (existingAttendance) {
			// 기존 데이터가 있으면 폼에 채우기
			setFormData({
				ANCD: existingAttendance.ANCD,
				EMPNO: existingAttendance.EMPNO,
				employeeId: String(existingAttendance.EMPNO || ""),
				employeeName: existingAttendance.EMPNM || employee.EMPNM || "",
				workLocation: existingAttendance.JOBADD || employee.JOBADD || "",
				workType: normalizeJobsh(existingAttendance.JOBSH || employee.JOBSH) || "1",
				workClassification: getWorkClassificationTextFromCode(
					existingAttendance.WGU,
					existingAttendance.HODES
				),
				workDate: existingAttendance.WDT || formatDate(workDate),
				workStartTime: existingAttendance.STM || "",
				workEndTime: existingAttendance.ETM || "",
				leaveReason: existingAttendance.HODES || "",
			});
		} else {
			// 기존 데이터가 없으면 기본값으로 설정
			setFormData({
				...initialForm,
				ANCD: employee.ANCD,
				EMPNO: employee.EMPNO,
				employeeId: String(employee.EMPNO || ""),
				employeeName: employee.EMPNM || "",
				workLocation: employee.JOBADD || "",
				workType: normalizeJobsh(employee.JOBSH) || "1",
				workDate: formatDate(workDate),
			});
		}
	};

	// 필터링된 사원 목록
	const filteredEmployees = employeeList.filter((employee) => {
		const employeeName = String(employee.EMPNM || "").trim();
		if (!employeeName || employeeName === "") {
			return false;
		}
		if (selectedJob && selectedJob !== "") {
			const employeeJob = String(employee.JOB || "").trim();
			if (employeeJob !== selectedJob) {
				return false;
			}
		}
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

	// 날짜 변경 핸들러
	const handleDateChange = (days: number) => {
		const newDate = new Date(workDate);
		newDate.setDate(newDate.getDate() + days);
		setWorkDate(newDate);
	};

	// 초기 로드
	useEffect(() => {
		fetchEmployees();
		fetchAttendanceData(formatDate(workDate));
	}, []);

	// 날짜 변경 시 근태 데이터 조회
	useEffect(() => {
		fetchAttendanceData(formatDate(workDate));
		setFormData(initialForm);
		setSelectedEmployee(null);
		setAttendanceCurrentPage(1); // 날짜 변경 시 페이지 초기화
	}, [workDate]);

	// 현재 로그인 사용자 정보 조회 함수 (F01010 테이블에서 직접 조회)
	const getCurrentLoginUser = async (): Promise<Employee | null> => {
		// 먼저 API를 통해 쿠키 읽기 시도 (httpOnly 쿠키는 클라이언트에서 읽을 수 없음)
		let loginUid = "";
		let loginAncd: number | null = null;
		
		try {
			const response = await fetch('/api/auth/user-info', {
				method: 'GET',
				credentials: 'include',
			});
			const result = await response.json();
			
			if (result.success && result.data) {
				loginUid = result.data.uid || "";
				loginAncd = result.data.ancd || null;
			} else {
				// API에서 읽지 못한 경우 클라이언트 쿠키 시도
				const userInfoCookie = getCookie("user_info");
				
				if (userInfoCookie) {
					try {
						let decodedCookie = userInfoCookie;
						try {
							decodedCookie = decodeURIComponent(userInfoCookie);
							try {
								decodedCookie = decodeURIComponent(decodedCookie);
							} catch (e) {
								// 이미 디코딩된 경우
							}
						} catch (e) {
							decodedCookie = userInfoCookie;
						}
						const userInfo = JSON.parse(decodedCookie);
						loginUid = userInfo.uid || "";
						loginAncd = userInfo.ancd || null;
					} catch (err) {
						// 클라이언트 쿠키 파싱 오류
					}
				}
			}
		} catch (err) {
			// user-info API 오류
			// API 실패 시 클라이언트 쿠키 시도
			const userInfoCookie = getCookie("user_info");
			if (userInfoCookie) {
				try {
					let decodedCookie = userInfoCookie;
					try {
						decodedCookie = decodeURIComponent(userInfoCookie);
					} catch (e) {
						decodedCookie = userInfoCookie;
					}
					const userInfo = JSON.parse(decodedCookie);
					loginUid = userInfo.uid || "";
					loginAncd = userInfo.ancd || null;
				} catch (parseErr) {
					// 쿠키 파싱 오류
				}
			}
		}
		
		if (!loginAncd) {
			return null;
		}

		try {
			// F01010 API를 통해 ancd로 사원 조회 (uid도 함께 전달하여 정확한 매칭)
			let apiUrl = `/api/f01010?ancd=${loginAncd}`;
			if (loginUid) {
				apiUrl += `&uid=${encodeURIComponent(loginUid)}`;
			}

			const response = await fetch(apiUrl);
			const result = await response.json();

			if (result.success && result.data && result.data.length > 0) {
				// 첫 번째 결과 반환
				return result.data[0] as Employee;
			}

			// API에서 찾지 못한 경우, 기존 employeeList에서도 시도
			if (employeeList.length > 0) {
				// 1. ANCD가 일치하고 사원명과 정확히 일치하는 경우
				if (loginAncd) {
					const found = employeeList.find(
						(emp) => emp.ANCD === loginAncd && emp.EMPNM === loginUid
					);
					if (found) {
						return found;
					}
				}

				// 2. 사원명과 정확히 일치하는 경우
				const foundByName = employeeList.find((emp) => emp.EMPNM === loginUid);
				if (foundByName) {
					return foundByName;
				}

				// 3. 사원번호와 일치하는 경우
				const empnoFromUid = parseInt(loginUid);
				if (!isNaN(empnoFromUid)) {
					const foundByEmpno = employeeList.find((emp) => emp.EMPNO === empnoFromUid);
					if (foundByEmpno) {
						return foundByEmpno;
					}
				}
			}

			return null;
		} catch (err) {
			// 현재 로그인 사용자 조회 오류
			return null;
		}
	};

	// 개별 생성 모달: 사원 검색
	const fetchCreateEmployees = async (nameSearch?: string) => {
		setCreateEmpLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ""
					? `/api/f01010?name=${encodeURIComponent(nameSearch.trim())}`
					: "/api/f01010";
			const response = await fetch(url, { credentials: "include" });
			const result = await response.json();
			if (result.success) {
				const list = (result.data || []).filter(
					(emp: Employee) => String(emp.EMPNM || "").trim() !== ""
				) as Employee[];
				setCreateEmpList(list);
			} else {
				setCreateEmpList([]);
			}
		} catch {
			setCreateEmpList([]);
		} finally {
			setCreateEmpLoading(false);
		}
	};

	const openIndividualCreateModal = () => {
		setCreateFormData({
			...initialForm,
			workDate: formatDate(workDate),
			workType: "1",
			workClassification: "근무",
		});
		setCreateEmpSearch("");
		setIsCreateModalOpen(true);
		fetchCreateEmployees();
	};

	const handleSelectCreateEmployee = (employee: Employee) => {
		setCreateFormData((prev) => ({
			...prev,
			ANCD: employee.ANCD,
			EMPNO: employee.EMPNO,
			employeeId: String(employee.EMPNO || ""),
			employeeName: employee.EMPNM || "",
			workLocation: employee.JOBADD || prev.workLocation || "",
			workType: normalizeJobsh(employee.JOBSH) || prev.workType || "1",
			workDate: prev.workDate || formatDate(workDate),
		}));
	};

	// 모달 사원 검색 디바운스
	useEffect(() => {
		if (!isCreateModalOpen) return;
		const timer = setTimeout(() => {
			fetchCreateEmployees(createEmpSearch.trim() !== "" ? createEmpSearch : undefined);
		}, 300);
		return () => clearTimeout(timer);
	}, [createEmpSearch, isCreateModalOpen]);

	// 근태 목록 페이지네이션 계산
	const attendanceTotalPages = Math.ceil(attendanceData.length / attendanceItemsPerPage);
	const attendanceStartIndex = (attendanceCurrentPage - 1) * attendanceItemsPerPage;
	const attendanceEndIndex = attendanceStartIndex + attendanceItemsPerPage;
	const currentAttendanceItems = attendanceData.slice(attendanceStartIndex, attendanceEndIndex);

	// 근태 목록 페이지 변경 핸들러
	const handleAttendancePageChange = (page: number) => {
		setAttendanceCurrentPage(page);
	};

	// 검색어 변경 시 실시간 검색 (디바운싱)
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

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedJob, selectedWorkStatus]);

	// 핸들러 함수들
	const handleSearch = () => {
		fetchAttendanceData(formatDate(workDate));
	};

	const handleCreate = async () => {
		const dateStr = formatDate(workDate);
		if (
			!confirm(
				`${dateStr} 근태를 근무 중인 사원 전원에게 일괄 생성하시겠습니까?\n(이미 등록된 사원은 건너뜁니다.)`,
			)
		) {
			return;
		}
		try {
			const response = await fetch("/api/f02010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "bulkCreate", workDate: dateStr }),
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || "근태 일괄 생성에 실패했습니다.");
			}
			alert(
				`근태 일괄 생성이 완료되었습니다.\n신규: ${result.created ?? 0}명\n건너뜀(기존): ${result.skipped ?? 0}명\n대상(근무): ${result.total ?? 0}명`,
			);
			await fetchAttendanceData(dateStr);
		} catch (err) {
			alert(err instanceof Error ? err.message : "근태 일괄 생성 중 오류가 발생했습니다.");
		}
	};

	const handleCloseModal = () => {
		setIsCreateModalOpen(false);
		setCreateFormData(initialForm);
		setCreateEmpSearch("");
		setCreateEmpList([]);
		setCreateSaving(false);
	};

	const handleSaveCreate = async () => {
		if (!createFormData.ANCD || !createFormData.EMPNO) {
			alert("사원을 선택해주세요.");
			return;
		}

		if (!createFormData.employeeName) {
			alert("사원명을 입력해주세요.");
			return;
		}

		if (!createFormData.workDate) {
			alert("근무날짜를 입력해주세요.");
			return;
		}

		setCreateSaving(true);
		try {
			const wgu = getWorkClassificationCode(createFormData.workClassification);
			const hodes =
				createFormData.leaveReason.trim() ||
				defaultHodesForClassification(createFormData.workClassification);
			const payload = {
				ANCD: createFormData.ANCD,
				EMPNO: createFormData.EMPNO,
				WDT: createFormData.workDate || formatDate(workDate),
				JOBADD: createFormData.workLocation,
				JOBSH: normalizeJobsh(createFormData.workType) || createFormData.workType || "1",
				WGU: wgu,
				HODES: hodes,
				STM: createFormData.workStartTime,
				ETM: createFormData.workEndTime,
			};

			const response = await fetch("/api/f02010", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const result = await response.json();
			if (result.success) {
				alert("근태 데이터가 생성되었습니다.");
				if (createFormData.workDate) {
					setWorkDate(new Date(createFormData.workDate));
				}
				fetchAttendanceData(createFormData.workDate || formatDate(workDate));
				handleCloseModal();
			} else {
				alert(result.error || "생성 중 오류가 발생했습니다.");
			}
		} catch (err) {
			alert("생성 중 오류가 발생했습니다.");
		} finally {
			setCreateSaving(false);
		}
	};

	const handleDeleteRow = async (row: AttendanceData, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const name = row.EMPNM || String(row.EMPNO);
		if (!confirm(`${name} 근태 데이터를 삭제하시겠습니까?`)) {
			return;
		}

		try {
			const wdt = String(row.WDT || formatDate(workDate)).slice(0, 10);
			const response = await fetch(
				`/api/f02010?ancd=${row.ANCD}&empno=${row.EMPNO}&wdt=${encodeURIComponent(wdt)}`,
				{ method: "DELETE" }
			);
			const result = await response.json();
			if (result.success) {
				alert("근태 데이터가 삭제되었습니다.");
				if (formData.ANCD === row.ANCD && formData.EMPNO === row.EMPNO) {
					setFormData(initialForm);
					setSelectedEmployee(null);
				}
				await fetchAttendanceData(formatDate(workDate));
			} else {
				alert(result.error || "삭제 중 오류가 발생했습니다.");
			}
		} catch (err) {
			alert("삭제 중 오류가 발생했습니다.");
		}
	};

	const togglePrintSelect = (row: AttendanceData, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const key = attendanceRowKey(row);
		setSelectedPrintKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const handleSelectAll = () => {
		if (attendanceData.length === 0) return;
		const allSelected =
			attendanceData.length > 0 &&
			attendanceData.every((row) => selectedPrintKeys.has(attendanceRowKey(row)));
		if (allSelected) {
			setSelectedPrintKeys(new Set());
		} else {
			setSelectedPrintKeys(new Set(attendanceData.map(attendanceRowKey)));
		}
	};

	const handlePrint = () => {
		if (attendanceData.length === 0) {
			alert("출력할 근태 데이터가 없습니다. 먼저 검색하거나 생성해 주세요.");
			return;
		}
		const selectedRows = attendanceData.filter((row) =>
			selectedPrintKeys.has(attendanceRowKey(row))
		);
		if (selectedRows.length === 0) {
			alert("출력할 항목을 선택해 주세요.");
			return;
		}
		const html = buildDailyAttendancePrintHtml(
			formatDate(workDate),
			getDayOfWeek(workDate),
			selectedRows,
		);
		openPrintPreviewWindow(html);
	};

	const handleClose = () => {
		// TODO: 닫기
	};

	const handleSave = async () => {
		if (!formData.ANCD || !formData.EMPNO) {
			alert("사원을 선택해주세요.");
			return;
		}

		if (!formData.employeeName) {
			alert("사원명을 입력해주세요.");
			return;
		}

		try {
			const wgu = getWorkClassificationCode(formData.workClassification);
			const hodes =
				formData.leaveReason.trim() ||
				defaultHodesForClassification(formData.workClassification);
			const payload = {
				ANCD: formData.ANCD,
				EMPNO: formData.EMPNO,
				WDT: formatDate(workDate),
				JOBADD: formData.workLocation,
				JOBSH: normalizeJobsh(formData.workType) || formData.workType || "1",
				WGU: wgu,
				HODES: hodes,
				STM: formData.workStartTime,
				ETM: formData.workEndTime,
			};

			const response = await fetch("/api/f02010", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const result = await response.json();
			if (result.success) {
				alert("근태 데이터가 저장되었습니다.");
				fetchAttendanceData(formatDate(workDate));
			} else {
				alert(result.error || "저장 중 오류가 발생했습니다.");
			}
		} catch (err) {
			alert("저장 중 오류가 발생했습니다.");
		}
	};

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			{/* 상단: 제목 + 날짜 + 버튼 */}
			<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
				<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
					사원근태관리
				</h1>
				<div className="flex items-center gap-2">
					<label className="text-sm font-medium text-blue-900">근무일자</label>
					<input
						type="date"
						value={formatDate(workDate)}
						onChange={(e) => {
							if (e.target.value) {
								setWorkDate(new Date(e.target.value));
							}
						}}
						className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					/>
					<span className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900">
						{getDayOfWeek(workDate)}
					</span>
					{/* <button
						type="button"
						onClick={() => handleDateChange(-1)}
						className="rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
					>
						-1일
					</button>
					<button
						type="button"
						onClick={() => handleDateChange(1)}
						className="rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
					>
						+1일
					</button> */}
				</div>
				<div className="ml-auto flex gap-2">
					{/* <button
						type="button"
						onClick={handleSearch}
						className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						검색
					</button> */}
					<button
						type="button"
						onClick={handleCreate}
						className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						사원 근태 일괄 생성
					</button>
					<button
						type="button"
						onClick={openIndividualCreateModal}
						className="rounded border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
					>
						사원 근태 개별 생성
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

			{/* 메인 콘텐츠 영역 */}
			<div className="flex flex-1 gap-4 p-4">
				{/* 왼쪽: 근태 목록 테이블 */}
				<div className="w-[440px] shrink-0 flex flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
					<div className="border-b border-blue-300 bg-blue-100 px-3 py-2 font-semibold text-blue-900">
						근태 목록
					</div>
					<div className="flex flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50/60 px-3 py-2">
						<button
							type="button"
							onClick={handleSelectAll}
							disabled={attendanceData.length === 0}
							className="rounded border border-blue-400 bg-white px-3 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
						>
							{attendanceData.length > 0 &&
							attendanceData.every((row) => selectedPrintKeys.has(attendanceRowKey(row)))
								? "전체해제"
								: "전체선택"}
						</button>
						<button
							type="button"
							onClick={handlePrint}
							disabled={attendanceData.length === 0}
							className="rounded border border-blue-400 bg-blue-200 px-3 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							출력
							{selectedPrintKeys.size > 0 ? ` (${selectedPrintKeys.size})` : ""}
						</button>
						<span className="text-[11px] text-blue-900/70">
							체크한 항목만 출력됩니다
						</span>
					</div>
					<div className="flex-1 overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-1 py-2 text-center font-semibold text-blue-900 w-8">
										<input
											type="checkbox"
											checked={
												attendanceData.length > 0 &&
												attendanceData.every((row) =>
													selectedPrintKeys.has(attendanceRowKey(row))
												)
											}
											onChange={handleSelectAll}
											disabled={attendanceData.length === 0}
											className="rounded border-blue-400"
											title="전체선택"
										/>
									</th>
									<th className="border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
										직원명
									</th>
									<th className="border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
										근무구분
									</th>
									<th className="border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
										휴무사유
									</th>
									<th className="px-2 py-2 text-center font-semibold text-blue-900 w-14">
										삭제
									</th>
								</tr>
							</thead>
							<tbody>
								{loadingAttendance ? (
									<tr>
										<td colSpan={5} className="px-3 py-8 text-center text-blue-900/60">
											로딩 중...
										</td>
									</tr>
								) : attendanceData.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-3 py-8 text-center text-blue-900/60">
											근태 데이터가 없습니다.
										</td>
									</tr>
								) : (
									currentAttendanceItems.map((row) => {
										const isSelected =
											formData.ANCD === row.ANCD && formData.EMPNO === row.EMPNO;
										const rowKey = attendanceRowKey(row);
										const isChecked = selectedPrintKeys.has(rowKey);
										return (
											<tr
												key={rowKey}
												onClick={() => {
													setFormData({
														ANCD: row.ANCD,
														EMPNO: row.EMPNO,
														employeeId: String(row.EMPNO || ""),
														employeeName: row.EMPNM || "",
														workLocation: row.JOBADD || "",
														workType: normalizeJobsh(row.JOBSH) || "1",
														workClassification: getWorkClassificationTextFromCode(
															row.WGU,
															row.HODES
														),
														workDate: row.WDT || formatDate(workDate),
														workStartTime: row.STM || "",
														workEndTime: row.ETM || "",
														leaveReason: row.HODES || "",
													});
												}}
												className={`border-b border-blue-50 cursor-pointer hover:bg-blue-50/50 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td
													className="border-r border-blue-100 px-1 py-2 text-center"
													onClick={(e) => e.stopPropagation()}
												>
													<input
														type="checkbox"
														checked={isChecked}
														onChange={() => togglePrintSelect(row)}
														className="rounded border-blue-400"
													/>
												</td>
												<td className="border-r border-blue-100 px-2 py-2 text-center">
													{row.EMPNM || "-"}
												</td>
												<td className="border-r border-blue-100 px-2 py-2 text-center">
													{getWorkClassificationText(row.WGU, row.HODES)}
												</td>
												<td className="border-r border-blue-100 px-2 py-2 text-center">
													{row.HODES || "-"}
												</td>
												<td className="px-1 py-2 text-center">
													<button
														type="button"
														onClick={(e) => handleDeleteRow(row, e)}
														className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100"
													>
														삭제
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{/* 페이지네이션 */}
					{attendanceTotalPages > 1 && (
						<div className="border-t border-blue-200 bg-white p-2">
							<div className="flex items-center justify-center gap-1">
								<button
									type="button"
									onClick={() => handleAttendancePageChange(1)}
									disabled={attendanceCurrentPage === 1}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&lt;&lt;
								</button>
								<button
									type="button"
									onClick={() => handleAttendancePageChange(attendanceCurrentPage - 1)}
									disabled={attendanceCurrentPage === 1}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&lt;
								</button>
								{Array.from({ length: Math.min(5, attendanceTotalPages) }, (_, i) => {
									const pageNum =
										Math.max(1, Math.min(attendanceTotalPages - 4, attendanceCurrentPage - 2)) + i;
									if (pageNum > attendanceTotalPages) return null;
									return (
										<button
											type="button"
											key={pageNum}
											onClick={() => handleAttendancePageChange(pageNum)}
											className={`rounded border px-2 py-1 text-xs ${
												attendanceCurrentPage === pageNum
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
									onClick={() => handleAttendancePageChange(attendanceCurrentPage + 1)}
									disabled={attendanceCurrentPage === attendanceTotalPages}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&gt;
								</button>
								<button
									type="button"
									onClick={() => handleAttendancePageChange(attendanceTotalPages)}
									disabled={attendanceCurrentPage === attendanceTotalPages}
									className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									&gt;&gt;
								</button>
							</div>
						</div>
					)}
				</div>

				{/* 오른쪽: 근태 입력 폼 */}
				<div className="flex flex-1 flex-col rounded-lg border border-blue-300 bg-blue-50/30 p-4">
					<div className="space-y-4">
							{/* 사원명 */}
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									사원명
								</label>
								{/* <input
									type="text"
									value={formData.employeeId}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, employeeId: e.target.value }))
									}
									placeholder="사번"
									className="w-24 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/> */}
								<input
									type="text"
									value={formData.employeeName}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, employeeName: e.target.value }))
									}
									placeholder="이름"
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							{/* 근무위치 */}
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									근무위치
								</label>
								<input
									type="text"
									value={formData.workLocation}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, workLocation: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							{/* 근무형태 (JOBSH: 1=주간, 2=야간, 3=심야) */}
							<div className="flex items-start gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									근무형태
								</label>
								<div className="flex flex-1 flex-wrap gap-2">
									{JOBSH_OPTIONS.map((opt) => (
										<label
											key={opt.value}
											className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 ${
												formData.workType === opt.value
													? "border-blue-500 bg-blue-50"
													: "border-blue-300 bg-white hover:bg-blue-50"
											}`}
										>
											<input
												type="radio"
												name="workType"
												value={opt.value}
												checked={formData.workType === opt.value}
												onChange={(e) =>
													setFormData((prev) => ({ ...prev, workType: e.target.value }))
												}
												className="rounded border-blue-300 text-blue-600"
											/>
											<span className="text-sm text-blue-900">
												{opt.label}
											</span>
										</label>
									))}
								</div>
							</div>

							{/* 근무구분 */}
							<div className="flex items-start gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									근무구분
								</label>
								<div className="flex-1">
									<div className="grid grid-cols-4 gap-2">
										{WORK_CLASSIFICATIONS.map((classification) => (
											<label
												key={classification}
												className="flex cursor-pointer items-center gap-2 rounded border border-blue-300 bg-white px-2 py-1.5 hover:bg-blue-50"
											>
												<input
													type="radio"
													name="workClassification"
													value={classification}
													checked={formData.workClassification === classification}
													onChange={(e) =>
														setFormData((prev) => {
															const next = e.target.value;
															const autoHodes = defaultHodesForClassification(next);
															return {
																...prev,
																workClassification: next,
																leaveReason:
																	prev.leaveReason.trim() === "" ||
																	prev.leaveReason ===
																		defaultHodesForClassification(prev.workClassification)
																		? autoHodes
																		: prev.leaveReason,
															};
														})
													}
													className="rounded border-blue-300 text-blue-600"
												/>
												<span className="text-sm text-blue-900">{classification}</span>
											</label>
										))}
									</div>
								</div>
							</div>

							{/* 근무시간 */}
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									근무시간
								</label>
								<input
									type="time"
									value={formData.workStartTime}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, workStartTime: e.target.value }))
									}
									className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
								<span className="text-sm text-blue-900">~</span>
								<input
									type="time"
									value={formData.workEndTime}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, workEndTime: e.target.value }))
									}
									className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
								<span className="ml-2 text-xs text-blue-900/70">Ex) 08:00</span>
							</div>

							{/* 휴무사유 */}
							<div className="flex items-start gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									휴무사유
								</label>
								<textarea
									value={formData.leaveReason}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, leaveReason: e.target.value }))
									}
									rows={4}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
									placeholder="휴무사유를 입력하세요"
								/>
							</div>

							{/* 저장 버튼 */}
							<div className="flex justify-end">
								<button
									type="button"
									onClick={handleSave}
									className="rounded border border-blue-500 bg-blue-500 px-8 py-2 text-sm font-medium text-white hover:bg-blue-600"
								>
									저장
								</button>
							</div>
					</div>
				</div>
			</div>

			{/* 개별 생성 모달 */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-lg border border-blue-300 bg-white shadow-lg">
						<div className="flex shrink-0 items-center justify-between border-b border-blue-200 bg-blue-100 px-6 py-4">
							<h2 className="text-lg font-semibold text-blue-900">사원 근태 개별 생성</h2>
							<button
								type="button"
								onClick={handleCloseModal}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>

						<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row">
							{/* 좌측: 사원 검색·선택 */}
							<div className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-blue-300 md:w-80">
								<div className="border-b border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">
									사원 검색
								</div>
								<div className="border-b border-blue-100 px-3 py-2">
									<input
										type="text"
										value={createEmpSearch}
										onChange={(e) => setCreateEmpSearch(e.target.value)}
										placeholder="이름 검색"
										className="w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="min-h-0 flex-1 overflow-auto">
									<table className="w-full text-sm">
										<thead className="sticky top-0 bg-blue-100">
											<tr>
												<th className="border-b border-blue-200 px-2 py-2 text-left text-blue-900">
													이름
												</th>
												<th className="border-b border-blue-200 px-2 py-2 text-left text-blue-900">
													직책
												</th>
											</tr>
										</thead>
										<tbody>
											{createEmpLoading ? (
												<tr>
													<td colSpan={2} className="px-2 py-6 text-center text-blue-900/60">
														로딩 중...
													</td>
												</tr>
											) : createEmpList.length === 0 ? (
												<tr>
													<td colSpan={2} className="px-2 py-6 text-center text-blue-900/60">
														사원이 없습니다
													</td>
												</tr>
											) : (
												createEmpList
													.filter((emp) => String(emp.JOBST || "").trim() !== "9")
													.slice(0, 50)
													.map((emp) => {
														const selected =
															createFormData.ANCD === emp.ANCD &&
															createFormData.EMPNO === emp.EMPNO;
														return (
															<tr
																key={`${emp.ANCD}-${emp.EMPNO}`}
																onClick={() => handleSelectCreateEmployee(emp)}
																className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50 ${
																	selected ? "bg-blue-100" : ""
																}`}
															>
																<td className="px-2 py-2">{emp.EMPNM || "-"}</td>
																<td className="px-2 py-2 text-blue-900/80">
																	{emp.JOB || "-"}
																</td>
															</tr>
														);
													})
											)}
										</tbody>
									</table>
								</div>
								{createFormData.EMPNO != null && (
									<div className="border-t border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
										선택: <strong>{createFormData.employeeName}</strong>
										{createFormData.employeeId
											? ` (사번 ${createFormData.employeeId})`
											: ""}
									</div>
								)}
							</div>

							{/* 우측: 근태 입력 */}
							<div className="min-w-0 flex-1 space-y-3">
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										사원명
									</label>
									<input
										type="text"
										value={createFormData.employeeName || ""}
										readOnly
										placeholder="좌측에서 사원을 선택하세요"
										className="flex-1 rounded border border-blue-300 bg-blue-50 px-2 py-1.5 text-sm text-blue-900"
									/>
								</div>

								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										근무날짜
									</label>
									<input
										type="date"
										value={createFormData.workDate || formatDate(workDate)}
										onChange={(e) =>
											setCreateFormData((prev) => ({
												...prev,
												workDate: e.target.value,
											}))
										}
										className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										근무위치
									</label>
									<input
										type="text"
										value={createFormData.workLocation}
										onChange={(e) =>
											setCreateFormData((prev) => ({
												...prev,
												workLocation: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								<div className="flex items-start gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										근무형태
									</label>
									<div className="flex flex-1 flex-wrap gap-2">
										{JOBSH_OPTIONS.map((opt) => (
											<label
												key={opt.value}
												className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 ${
													createFormData.workType === opt.value
														? "border-blue-500 bg-blue-50"
														: "border-blue-300 bg-white hover:bg-blue-50"
												}`}
											>
												<input
													type="radio"
													name="createWorkType"
													value={opt.value}
													checked={createFormData.workType === opt.value}
													onChange={(e) =>
														setCreateFormData((prev) => ({
															...prev,
															workType: e.target.value,
														}))
													}
													className="rounded border-blue-300 text-blue-600"
												/>
												<span className="text-sm text-blue-900">{opt.label}</span>
											</label>
										))}
									</div>
								</div>

								<div className="flex items-start gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										근무구분
									</label>
									<div className="flex-1">
										<div className="grid grid-cols-4 gap-2">
											{WORK_CLASSIFICATIONS.map((classification) => (
												<label
													key={classification}
													className="flex cursor-pointer items-center gap-2 rounded border border-blue-300 bg-white px-2 py-1.5 hover:bg-blue-50"
												>
													<input
														type="radio"
														name="createWorkClassification"
														value={classification}
														checked={
															createFormData.workClassification === classification
														}
														onChange={(e) =>
															setCreateFormData((prev) => {
																const next = e.target.value;
																const autoHodes = defaultHodesForClassification(next);
																return {
																	...prev,
																	workClassification: next,
																	leaveReason:
																		prev.leaveReason.trim() === "" ||
																		prev.leaveReason ===
																			defaultHodesForClassification(
																				prev.workClassification
																			)
																			? autoHodes
																			: prev.leaveReason,
																};
															})
														}
														className="rounded border-blue-300 text-blue-600"
													/>
													<span className="text-sm text-blue-900">{classification}</span>
												</label>
											))}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										근무시간
									</label>
									<input
										type="time"
										value={createFormData.workStartTime}
										onChange={(e) =>
											setCreateFormData((prev) => ({
												...prev,
												workStartTime: e.target.value,
											}))
										}
										className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<span className="text-sm text-blue-900">~</span>
									<input
										type="time"
										value={createFormData.workEndTime}
										onChange={(e) =>
											setCreateFormData((prev) => ({
												...prev,
												workEndTime: e.target.value,
											}))
										}
										className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								<div className="flex items-start gap-2">
									<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900">
										휴무사유
									</label>
									<textarea
										value={createFormData.leaveReason}
										onChange={(e) =>
											setCreateFormData((prev) => ({
												...prev,
												leaveReason: e.target.value,
											}))
										}
										rows={3}
										className="flex-1 resize-y rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
										placeholder="휴무사유를 입력하세요"
									/>
								</div>
							</div>
						</div>

						<div className="flex shrink-0 justify-end gap-2 border-t border-blue-200 bg-blue-50 px-6 py-4">
							<button
								type="button"
								onClick={handleCloseModal}
								disabled={createSaving}
								className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								취소
							</button>
							<button
								type="button"
								onClick={handleSaveCreate}
								disabled={createSaving}
								className="rounded border border-blue-500 bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{createSaving ? "저장 중..." : "저장"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
