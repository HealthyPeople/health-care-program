"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

interface EmployeeRow {
	empno: number;
	empName: string;
	mobile: string;
	jobTitle: string;
	workStatus: string;
}

interface BeneficiaryRow {
	pnum: number;
	name: string;
	sex: string;
	birth: string;
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	uid?: string;
};

function jobstLabel(code: string): string {
	const c = String(code ?? "").trim();
	if (c === "1") return "근무";
	if (c === "2") return "휴직";
	if (c === "9") return "퇴사";
	return c || "";
}

function sexLabel(v: unknown): string {
	const s = String(v ?? "").trim().toUpperCase();
	if (s === "M" || s === "1" || s === "남" || s === "남자") return "남";
	if (s === "F" || s === "2" || s === "여" || s === "여자") return "여";
	return String(v ?? "").trim();
}

function formatYmd(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (!s) return "";
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function sortEmployees(list: EmployeeRow[]): EmployeeRow[] {
	return [...list].sort((a, b) => {
		const aHas = a.empName.trim() ? 0 : 1;
		const bHas = b.empName.trim() ? 0 : 1;
		if (aHas !== bHas) return aHas - bHas;
		const byName = a.empName.localeCompare(b.empName, "ko");
		if (byName !== 0) return byName;
		return a.empno - b.empno;
	});
}

function mapEmployeeFromAccount(row: Record<string, unknown>): EmployeeRow | null {
	const empnoRaw = row.EMPNO;
	const empno =
		empnoRaw != null && empnoRaw !== "" && Number.isFinite(Number(empnoRaw))
			? Number(empnoRaw)
			: null;
	// F00132는 EMPNO 기준이므로 계정이 있어도 사원번호 미연결이면 제외
	if (empno == null) return null;
	return {
		empno,
		empName: String(row.EMPNM ?? "").trim(),
		mobile: String(row.EMPHP ?? "").trim(),
		jobTitle: String(row.JOB ?? "").trim(),
		workStatus: jobstLabel(String(row.JOBST ?? "").trim()),
	};
}

function mapBeneficiaryRow(row: Record<string, unknown>): BeneficiaryRow | null {
	const pnumRaw = row.PNUM;
	const pnum =
		pnumRaw != null && pnumRaw !== "" && Number.isFinite(Number(pnumRaw))
			? Number(pnumRaw)
			: null;
	if (pnum == null) return null;
	return {
		pnum,
		name: String(row.P_NM ?? "").trim(),
		sex: sexLabel(row.P_SEX),
		birth: formatYmd(row.P_BRDT),
	};
}

const EMP_PAGE_SIZE = 5;
const BENE_PAGE_SIZE = 5;

function PaginationBar({
	page,
	totalPages,
	onChange,
}: {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
}) {
	const safeTotal = Math.max(1, totalPages);
	const safePage = Math.min(Math.max(1, page), safeTotal);
	return (
		<div className="flex items-center justify-center gap-2 border-t border-blue-200 bg-white p-2">
			<button
				type="button"
				onClick={() => onChange(1)}
				disabled={safePage === 1}
				className="h-8 w-8 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="처음"
			>
				«
			</button>
			<button
				type="button"
				onClick={() => onChange(Math.max(1, safePage - 1))}
				disabled={safePage === 1}
				className="h-8 w-8 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="이전"
			>
				‹
			</button>
			<span className="min-w-14 text-center text-sm font-semibold text-blue-900">
				{safePage} / {safeTotal}
			</span>
			<button
				type="button"
				onClick={() => onChange(Math.min(safeTotal, safePage + 1))}
				disabled={safePage === safeTotal}
				className="h-8 w-8 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="다음"
			>
				›
			</button>
			<button
				type="button"
				onClick={() => onChange(safeTotal)}
				disabled={safePage === safeTotal}
				className="h-8 w-8 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="마지막"
			>
				»
			</button>
		</div>
	);
}

export default function EmployeeBeneficiaryMapping() {
	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [employees, setEmployees] = useState<EmployeeRow[]>([]);
	const [selectedEmpno, setSelectedEmpno] = useState<number | null>(null);
	const [allBeneficiaries, setAllBeneficiaries] = useState<BeneficiaryRow[]>([]);
	const [mappedBeneficiaries, setMappedBeneficiaries] = useState<BeneficiaryRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [mappingLoading, setMappingLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
	const [selectedMapped, setSelectedMapped] = useState<Set<number>>(new Set());

	const [empPage, setEmpPage] = useState(1);
	const [availPage, setAvailPage] = useState(1);
	const [mappedPage, setMappedPage] = useState(1);

	const currentEmployee = useMemo(
		() => employees.find((e) => e.empno === selectedEmpno) || null,
		[employees, selectedEmpno]
	);

	const availableBeneficiaries = useMemo(
		() =>
			[...allBeneficiaries].sort(
				(a, b) => a.name.localeCompare(b.name, "ko") || a.pnum - b.pnum
			),
		[allBeneficiaries]
	);

	const mappedSorted = useMemo(
		() =>
			[...mappedBeneficiaries].sort(
				(a, b) => a.name.localeCompare(b.name, "ko") || a.pnum - b.pnum
			),
		[mappedBeneficiaries]
	);

	const mappedIdSet = useMemo(
		() => new Set(mappedBeneficiaries.map((b) => b.pnum)),
		[mappedBeneficiaries]
	);

	const empTotalPages = Math.max(1, Math.ceil(employees.length / EMP_PAGE_SIZE));
	const empPageSafe = Math.min(empPage, empTotalPages);
	const empRows = useMemo(() => {
		const start = (empPageSafe - 1) * EMP_PAGE_SIZE;
		return employees.slice(start, start + EMP_PAGE_SIZE);
	}, [employees, empPageSafe]);

	const availTotalPages = Math.max(1, Math.ceil(availableBeneficiaries.length / BENE_PAGE_SIZE));
	const availPageSafe = Math.min(availPage, availTotalPages);
	const availRows = useMemo(() => {
		const start = (availPageSafe - 1) * BENE_PAGE_SIZE;
		return availableBeneficiaries.slice(start, start + BENE_PAGE_SIZE);
	}, [availableBeneficiaries, availPageSafe]);

	const mappedTotalPages = Math.max(1, Math.ceil(mappedSorted.length / BENE_PAGE_SIZE));
	const mappedPageSafe = Math.min(mappedPage, mappedTotalPages);
	const mappedRows = useMemo(() => {
		const start = (mappedPageSafe - 1) * BENE_PAGE_SIZE;
		return mappedSorted.slice(start, start + BENE_PAGE_SIZE);
	}, [mappedSorted, mappedPageSafe]);

	useEffect(() => {
		setEmpPage(1);
	}, [employees.length]);

	useEffect(() => {
		setAvailPage(1);
	}, [availableBeneficiaries.length]);

	useEffect(() => {
		setMappedPage(1);
	}, [mappedBeneficiaries.length, selectedEmpno]);

	useEffect(() => {
		setSelectedAvailable((prev) => {
			if (!prev.size) return prev;
			let changed = false;
			const next = new Set<number>();
			prev.forEach((id) => {
				if (mappedIdSet.has(id)) {
					changed = true;
					return;
				}
				next.add(id);
			});
			return changed ? next : prev;
		});
	}, [mappedIdSet]);

	const loadEmployees = useCallback(async (ancd: string | number) => {
		// F00120 계정이 있고 EMPNO가 연결된 사원만 표시
		const qs = new URLSearchParams({
			ancd: String(ancd),
			includeEmp: "1",
		});
		const res = await fetch(`/api/f00120?${qs.toString()}`, {
			credentials: "include",
			cache: "no-store",
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "사용자 계정 목록을 불러오지 못했습니다.");
		}
		const byEmpno = new Map<number, EmployeeRow>();
		for (const raw of Array.isArray(json.data) ? json.data : []) {
			const mapped = mapEmployeeFromAccount(raw as Record<string, unknown>);
			if (!mapped) continue;
			if (!byEmpno.has(mapped.empno)) byEmpno.set(mapped.empno, mapped);
		}
		const list = sortEmployees(
			Array.from(byEmpno.entries()).map((entry) => entry[1])
		);
		setEmployees(list);
		setSelectedEmpno((prev) => {
			if (prev != null && list.some((e) => e.empno === prev)) return prev;
			return list[0]?.empno ?? null;
		});
	}, []);

	const loadBeneficiaries = useCallback(async () => {
		const res = await fetch("/api/f10010", {
			credentials: "include",
			cache: "no-store",
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "수급자 목록을 불러오지 못했습니다.");
		}
		const list = (Array.isArray(json.data) ? json.data : [])
			.map(mapBeneficiaryRow)
			.filter((b: BeneficiaryRow | null): b is BeneficiaryRow => b != null)
			.sort((a: BeneficiaryRow, b: BeneficiaryRow) => a.name.localeCompare(b.name, "ko"));
		setAllBeneficiaries(list);
	}, []);

	const loadMapped = useCallback(async (ancd: string | number, empno: number) => {
		setMappingLoading(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(ancd),
				empno: String(empno),
			});
			const res = await fetch(`/api/f00132?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "매핑 수급자를 불러오지 못했습니다.");
			}
			const list = (Array.isArray(json.data) ? json.data : [])
				.map(mapBeneficiaryRow)
				.filter((b: BeneficiaryRow | null): b is BeneficiaryRow => b != null);
			setMappedBeneficiaries(list);
		} catch (err) {
			console.error(err);
			setMappedBeneficiaries([]);
			alert(err instanceof Error ? err.message : "매핑 조회 중 오류가 발생했습니다.");
		} finally {
			setMappingLoading(false);
		}
	}, []);

	const initializePage = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const userRes = await fetch("/api/auth/user-info", {
				credentials: "include",
			});
			const userJson = await userRes.json().catch(() => ({}));
			if (!userRes.ok || !userJson?.success) {
				throw new Error(userJson?.error || "로그인 정보를 확인할 수 없습니다.");
			}
			const user = (userJson.data || {}) as UserInfo;
			const loginAncd = user.ancd;
			if (loginAncd == null || loginAncd === "") {
				throw new Error("로그인 계정의 센터(고객코드)를 확인할 수 없습니다.");
			}
			setSessionAncd(loginAncd);
			await Promise.all([loadEmployees(loginAncd), loadBeneficiaries()]);
		} catch (err) {
			console.error(err);
			setLoadError(err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다.");
			setEmployees([]);
			setAllBeneficiaries([]);
		} finally {
			setLoading(false);
		}
	}, [loadEmployees, loadBeneficiaries]);

	useEffect(() => {
		void initializePage();
	}, [initializePage]);

	useEffect(() => {
		if (sessionAncd == null || selectedEmpno == null) {
			setMappedBeneficiaries([]);
			return;
		}
		setSelectedAvailable(new Set());
		setSelectedMapped(new Set());
		void loadMapped(sessionAncd, selectedEmpno);
	}, [sessionAncd, selectedEmpno, loadMapped]);

	const toggleSet = (set: Set<number>, key: number) => {
		const next = new Set(set);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		return next;
	};

	const moveSelectedToMapped = async () => {
		if (selectedEmpno == null || sessionAncd == null || !selectedAvailable.size || saving) return;
		const ids: number[] = [];
		selectedAvailable.forEach((id) => {
			if (!mappedIdSet.has(id)) ids.push(id);
		});
		if (!ids.length) {
			alert("선택한 수급자는 이미 매핑되어 있습니다.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f00132", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, EMPNO: selectedEmpno, PNUMS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "수급자 추가에 실패했습니다.");
			}
			setSelectedAvailable(new Set());
			await loadMapped(sessionAncd, selectedEmpno);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "추가 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const removeSelectedFromMapped = async () => {
		if (selectedEmpno == null || sessionAncd == null || !selectedMapped.size || saving) return;
		const ids: number[] = [];
		selectedMapped.forEach((id) => ids.push(id));
		setSaving(true);
		try {
			const res = await fetch("/api/f00132", {
				method: "DELETE",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, EMPNO: selectedEmpno, PNUMS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "수급자 삭제에 실패했습니다.");
			}
			setSelectedMapped(new Set());
			await loadMapped(sessionAncd, selectedEmpno);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const addAll = async () => {
		if (selectedEmpno == null || sessionAncd == null || !availableBeneficiaries.length || saving)
			return;
		const ids = availableBeneficiaries.map((b) => b.pnum).filter((id) => !mappedIdSet.has(id));
		if (!ids.length) {
			alert("추가할 미매핑 수급자가 없습니다.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f00132", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, EMPNO: selectedEmpno, PNUMS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "전체 추가에 실패했습니다.");
			}
			setSelectedAvailable(new Set());
			await loadMapped(sessionAncd, selectedEmpno);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "전체 추가 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const removeAll = async () => {
		if (selectedEmpno == null || sessionAncd == null || !mappedBeneficiaries.length || saving)
			return;
		if (!confirm("매핑된 수급자를 모두 삭제하시겠습니까?")) return;
		const ids = mappedBeneficiaries.map((b) => b.pnum);
		setSaving(true);
		try {
			const res = await fetch("/api/f00132", {
				method: "DELETE",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, EMPNO: selectedEmpno, PNUMS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "전체 삭제에 실패했습니다.");
			}
			setSelectedMapped(new Set());
			await loadMapped(sessionAncd, selectedEmpno);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "전체 삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 헤더 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						사원환자매핑
					</div>
				</div>

				{loading ? (
					<p className="text-sm text-blue-800/70">데이터를 불러오는 중…</p>
				) : null}
				{!loading && loadError ? (
					<p className="text-sm text-red-700">{loadError}</p>
				) : null}

				{/* 상단 사원 목록 (F00120 계정 + EMPNO 연결) */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<table className="w-full text-sm">
						<thead className="border-b border-blue-200 bg-blue-100">
							<tr>
								<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
									사원번호
								</th>
								<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
									사원명
								</th>
								<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
									핸드폰번호
								</th>
								<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
									직책
								</th>
								<th className="px-3 py-2 text-left font-semibold text-blue-900">근무상태</th>
							</tr>
						</thead>
						<tbody>
							{employees.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-3 py-8 text-center text-blue-900/60">
										{loading ? "조회 중…" : "계정이 연결된 사원이 없습니다."}
									</td>
								</tr>
							) : (
								empRows.map((e) => {
									const isSelected = e.empno === selectedEmpno;
									return (
										<tr
											key={e.empno}
											onClick={() => setSelectedEmpno(e.empno)}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												isSelected ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{e.empno}</td>
											<td className="border-r border-blue-100 px-3 py-2">{e.empName}</td>
											<td className="border-r border-blue-100 px-3 py-2">{e.mobile}</td>
											<td className="border-r border-blue-100 px-3 py-2">{e.jobTitle}</td>
											<td className="px-3 py-2">{e.workStatus}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
					{employees.length > 0 ? (
						<PaginationBar page={empPageSafe} totalPages={empTotalPages} onChange={setEmpPage} />
					) : null}
				</div>

				{/* 하단: 좌/중/우 */}
				<div className="grid grid-cols-12 gap-4">
					{/* 좌측: 수급자 목록 (F10010) */}
					<div className="col-span-12 lg:col-span-5 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-50/60 p-3 flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								사원명
							</span>
							<input
								readOnly
								value={currentEmployee?.empName || ""}
								className="flex-1 rounded border border-blue-300 bg-gray-50 px-3 py-2 text-sm text-blue-900"
							/>
						</div>
						<table className="w-full text-sm">
							<thead className="border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										수급자
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										성별
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">생일</th>
								</tr>
							</thead>
							<tbody>
								{availableBeneficiaries.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
											수급자 목록이 없습니다.
										</td>
									</tr>
								) : (
									availRows.map((b) => {
										const alreadyMapped = mappedIdSet.has(b.pnum);
										const isSelected = selectedAvailable.has(b.pnum);
										return (
											<tr
												key={b.pnum}
												onClick={() => {
													if (alreadyMapped) return;
													setSelectedAvailable((s) => toggleSet(s, b.pnum));
												}}
												className={`border-b border-blue-50 ${
													alreadyMapped
														? "bg-emerald-50 text-emerald-900 cursor-not-allowed"
														: `cursor-pointer hover:bg-blue-50/60 ${isSelected ? "bg-blue-100" : ""}`
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">
													{b.name}
													{alreadyMapped ? (
														<span className="ml-2 text-[10px] font-medium text-emerald-700">
															매핑됨
														</span>
													) : null}
												</td>
												<td className="border-r border-blue-100 px-3 py-2">{b.sex}</td>
												<td className="px-3 py-2">{b.birth}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
						{availableBeneficiaries.length > 0 ? (
							<PaginationBar
								page={availPageSafe}
								totalPages={availTotalPages}
								onChange={setAvailPage}
							/>
						) : null}
					</div>

					{/* 가운데 버튼 */}
					<div className="col-span-12 lg:col-span-2 flex flex-col items-center justify-center gap-3 py-4">
						<button
							type="button"
							onClick={() => void moveSelectedToMapped()}
							disabled={saving || !selectedAvailable.size}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							추가=&gt;
						</button>
						<button
							type="button"
							onClick={() => void removeSelectedFromMapped()}
							disabled={saving || !selectedMapped.size}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							&lt;=삭제
						</button>
						<button
							type="button"
							onClick={() => void addAll()}
							disabled={saving || !availableBeneficiaries.length}
							className="w-36 whitespace-pre-line rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							{"전체추가\n==>"}
						</button>
						<button
							type="button"
							onClick={() => void removeAll()}
							disabled={saving || !mappedBeneficiaries.length}
							className="w-36 whitespace-pre-line rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							{"전체삭제\n<=="}
						</button>
					</div>

					{/* 우측: 매핑된 수급자 (F00132) */}
					<div className="col-span-12 lg:col-span-5 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-50/60 p-3 flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								사원번호
							</span>
							<input
								readOnly
								value={selectedEmpno != null ? String(selectedEmpno) : ""}
								className="flex-1 rounded border border-blue-300 bg-gray-50 px-3 py-2 text-sm text-blue-900"
							/>
						</div>
						<table className="w-full text-sm">
							<thead className="border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										수급자
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										성별
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">생일</th>
								</tr>
							</thead>
							<tbody>
								{mappingLoading ? (
									<tr>
										<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
											매핑 조회 중…
										</td>
									</tr>
								) : mappedSorted.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
											매핑된 수급자가 없습니다.
										</td>
									</tr>
								) : (
									mappedRows.map((b) => (
										<tr
											key={b.pnum}
											onClick={() => setSelectedMapped((s) => toggleSet(s, b.pnum))}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												selectedMapped.has(b.pnum) ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{b.name}</td>
											<td className="border-r border-blue-100 px-3 py-2">{b.sex}</td>
											<td className="px-3 py-2">{b.birth}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
						{mappedSorted.length > 0 ? (
							<PaginationBar
								page={mappedPageSafe}
								totalPages={mappedTotalPages}
								onChange={setMappedPage}
							/>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
