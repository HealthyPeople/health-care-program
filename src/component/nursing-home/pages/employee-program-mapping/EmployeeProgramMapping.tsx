"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

interface EmployeeAccountRow {
	userId: string;
	empName: string;
	mobile: string;
	jobTitle: string;
	workStatus: string;
}

interface ProgramRow {
	pgmid: string;
	name: string;
	role: string;
	ugr: string;
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
	return c;
}

function sortEmployees(list: EmployeeAccountRow[]): EmployeeAccountRow[] {
	return [...list].sort((a, b) => {
		const aHas = a.empName.trim() ? 0 : 1;
		const bHas = b.empName.trim() ? 0 : 1;
		if (aHas !== bHas) return aHas - bHas;
		const byName = a.empName.localeCompare(b.empName, "ko");
		if (byName !== 0) return byName;
		return a.userId.localeCompare(b.userId, "ko");
	});
}

function mapUserRow(row: Record<string, unknown>): EmployeeAccountRow {
	return {
		userId: String(row.UID ?? "").trim(),
		empName: String(row.EMPNM ?? "").trim(),
		mobile: String(row.EMPHP ?? "").trim(),
		jobTitle: String(row.JOB ?? "").trim(),
		workStatus: jobstLabel(String(row.JOBST ?? "").trim()),
	};
}

function mapProgramRow(row: Record<string, unknown>): ProgramRow {
	const ugr = String(row.UGR ?? "").trim();
	const ugrNm = String(row.UGR_NM ?? "").trim();
	return {
		pgmid: String(row.PGMID ?? "").trim(),
		name: String(row.PGMNM ?? "").trim(),
		role: ugrNm || (ugr ? `등급 ${ugr}` : ""),
		ugr,
	};
}

const EMP_PAGE_SIZE = 5;
const PROG_PAGE_SIZE = 5;

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

export default function EmployeeProgramMapping() {
	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [employees, setEmployees] = useState<EmployeeAccountRow[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [allPrograms, setAllPrograms] = useState<ProgramRow[]>([]);
	const [mappedPrograms, setMappedPrograms] = useState<ProgramRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [mappingLoading, setMappingLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
	const [selectedMapped, setSelectedMapped] = useState<Set<string>>(new Set());

	const [empPage, setEmpPage] = useState(1);
	const [availPage, setAvailPage] = useState(1);
	const [mappedPage, setMappedPage] = useState(1);

	const currentEmployee = useMemo(
		() => employees.find((e) => e.userId === selectedUserId) || null,
		[employees, selectedUserId]
	);

	const availablePrograms = useMemo(
		() =>
			[...allPrograms].sort((a, b) => a.name.localeCompare(b.name, "ko") || a.pgmid.localeCompare(b.pgmid)),
		[allPrograms]
	);

	const mappedProgramsSorted = useMemo(
		() =>
			[...mappedPrograms].sort(
				(a, b) => a.name.localeCompare(b.name, "ko") || a.pgmid.localeCompare(b.pgmid)
			),
		[mappedPrograms]
	);

	const mappedIdSet = useMemo(
		() => new Set(mappedPrograms.map((p) => p.pgmid)),
		[mappedPrograms]
	);

	const empTotalPages = Math.max(1, Math.ceil(employees.length / EMP_PAGE_SIZE));
	const empPageSafe = Math.min(empPage, empTotalPages);
	const empRows = useMemo(() => {
		const start = (empPageSafe - 1) * EMP_PAGE_SIZE;
		return employees.slice(start, start + EMP_PAGE_SIZE);
	}, [employees, empPageSafe]);

	const availTotalPages = Math.max(1, Math.ceil(availablePrograms.length / PROG_PAGE_SIZE));
	const availPageSafe = Math.min(availPage, availTotalPages);
	const availRows = useMemo(() => {
		const start = (availPageSafe - 1) * PROG_PAGE_SIZE;
		return availablePrograms.slice(start, start + PROG_PAGE_SIZE);
	}, [availablePrograms, availPageSafe]);

	const mappedTotalPages = Math.max(1, Math.ceil(mappedProgramsSorted.length / PROG_PAGE_SIZE));
	const mappedPageSafe = Math.min(mappedPage, mappedTotalPages);
	const mappedRows = useMemo(() => {
		const start = (mappedPageSafe - 1) * PROG_PAGE_SIZE;
		return mappedProgramsSorted.slice(start, start + PROG_PAGE_SIZE);
	}, [mappedProgramsSorted, mappedPageSafe]);

	useEffect(() => {
		setEmpPage(1);
	}, [employees.length]);

	useEffect(() => {
		setAvailPage(1);
	}, [availablePrograms.length]);

	useEffect(() => {
		setMappedPage(1);
	}, [mappedPrograms.length, selectedUserId]);

	// 이미 매핑된 항목은 왼쪽 선택에서 제외
	useEffect(() => {
		setSelectedAvailable((prev) => {
			if (!prev.size) return prev;
			let changed = false;
			const next = new Set<string>();
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

	const loadUsers = useCallback(async (ancd: string | number) => {
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
			throw new Error(json?.error || "사용자 목록을 불러오지 못했습니다.");
		}
		const list = sortEmployees(
			(Array.isArray(json.data) ? json.data : []).map(mapUserRow)
		);
		setEmployees(list);
		setSelectedUserId((prev) => {
			if (prev && list.some((e) => e.userId === prev)) return prev;
			return list[0]?.userId || "";
		});
	}, []);

	const loadPrograms = useCallback(async () => {
		const res = await fetch("/api/f00130", {
			credentials: "include",
			cache: "no-store",
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "프로그램 목록을 불러오지 못했습니다.");
		}
		const list = (Array.isArray(json.data) ? json.data : [])
			.map(mapProgramRow)
			.filter((p: ProgramRow) => p.pgmid)
			.sort((a: ProgramRow, b: ProgramRow) => a.name.localeCompare(b.name, "ko"));
		setAllPrograms(list);
	}, []);

	const loadMapped = useCallback(async (ancd: string | number, uid: string) => {
		if (!uid) {
			setMappedPrograms([]);
			return;
		}
		setMappingLoading(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(ancd),
				uid,
			});
			const res = await fetch(`/api/f00131?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "매핑 프로그램을 불러오지 못했습니다.");
			}
			const list = (Array.isArray(json.data) ? json.data : [])
				.map(mapProgramRow)
				.filter((p: ProgramRow) => p.pgmid);
			setMappedPrograms(list);
		} catch (err) {
			console.error(err);
			setMappedPrograms([]);
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
			await Promise.all([loadUsers(loginAncd), loadPrograms()]);
		} catch (err) {
			console.error(err);
			setLoadError(err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다.");
			setEmployees([]);
			setAllPrograms([]);
		} finally {
			setLoading(false);
		}
	}, [loadUsers, loadPrograms]);

	useEffect(() => {
		void initializePage();
	}, [initializePage]);

	useEffect(() => {
		if (sessionAncd == null || !selectedUserId) {
			setMappedPrograms([]);
			return;
		}
		setSelectedAvailable(new Set());
		setSelectedMapped(new Set());
		void loadMapped(sessionAncd, selectedUserId);
	}, [sessionAncd, selectedUserId, loadMapped]);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const toggleSet = (set: Set<string>, key: string) => {
		const next = new Set(set);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		return next;
	};

	const moveSelectedToMapped = async () => {
		if (!selectedUserId || sessionAncd == null || !selectedAvailable.size || saving) return;
		const ids: string[] = [];
		selectedAvailable.forEach((id) => {
			if (!mappedIdSet.has(id)) ids.push(id);
		});
		if (!ids.length) {
			alert("선택한 프로그램은 이미 매핑되어 있습니다.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f00131", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, UID: selectedUserId, PGMIDS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "프로그램 추가에 실패했습니다.");
			}
			setSelectedAvailable(new Set());
			await loadMapped(sessionAncd, selectedUserId);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "추가 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const removeSelectedFromMapped = async () => {
		if (!selectedUserId || sessionAncd == null || !selectedMapped.size || saving) return;
		const ids: string[] = [];
		selectedMapped.forEach((id) => ids.push(id));
		setSaving(true);
		try {
			const res = await fetch("/api/f00131", {
				method: "DELETE",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, UID: selectedUserId, PGMIDS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "프로그램 삭제에 실패했습니다.");
			}
			setSelectedMapped(new Set());
			await loadMapped(sessionAncd, selectedUserId);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const addAll = async () => {
		if (!selectedUserId || sessionAncd == null || !availablePrograms.length || saving) return;
		const ids = availablePrograms.map((p) => p.pgmid).filter((id) => !mappedIdSet.has(id));
		if (!ids.length) {
			alert("추가할 미매핑 프로그램이 없습니다.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f00131", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, UID: selectedUserId, PGMIDS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "전체 추가에 실패했습니다.");
			}
			setSelectedAvailable(new Set());
			await loadMapped(sessionAncd, selectedUserId);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "전체 추가 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const removeAll = async () => {
		if (!selectedUserId || sessionAncd == null || !mappedPrograms.length || saving) return;
		if (!confirm("매핑된 프로그램을 모두 삭제하시겠습니까?")) return;
		const ids = mappedPrograms.map((p) => p.pgmid);
		setSaving(true);
		try {
			const res = await fetch("/api/f00131", {
				method: "DELETE",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ANCD: sessionAncd, UID: selectedUserId, PGMIDS: ids }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "전체 삭제에 실패했습니다.");
			}
			setSelectedMapped(new Set());
			await loadMapped(sessionAncd, selectedUserId);
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
						사원프로그램매핑
					</div>

				</div>

				{loading ? (
					<p className="text-sm text-blue-800/70">데이터를 불러오는 중…</p>
				) : null}
				{!loading && loadError ? (
					<p className="text-sm text-red-700">{loadError}</p>
				) : null}

				{/* 상단 사원 목록 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<table className="w-full text-sm">
						<thead className="border-b border-blue-200 bg-blue-100">
							<tr>
								<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
									사용자계정
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
										{loading ? "조회 중…" : "사용자 계정이 없습니다."}
									</td>
								</tr>
							) : (
								empRows.map((e) => {
									const isSelected = e.userId === selectedUserId;
									return (
										<tr
											key={e.userId}
											onClick={() => setSelectedUserId(e.userId)}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												isSelected ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{e.userId}</td>
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
					{/* 좌측: 프로그램 목록 (F00130) */}
					<div className="col-span-12 lg:col-span-5 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-50/60 p-3 flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								사용자계정
							</span>
							<input
								readOnly
								value={selectedUserId}
								className="flex-1 rounded border border-blue-300 bg-gray-50 px-3 py-2 text-sm text-blue-900"
							/>
						</div>
						<table className="w-full text-sm">
							<thead className="border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										프로그램명
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">관리등급</th>
								</tr>
							</thead>
							<tbody>
								{availablePrograms.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
											프로그램 목록이 없습니다.
										</td>
									</tr>
								) : (
									availRows.map((p) => {
										const alreadyMapped = mappedIdSet.has(p.pgmid);
										const isSelected = selectedAvailable.has(p.pgmid);
										return (
											<tr
												key={p.pgmid}
												onClick={() => {
													if (alreadyMapped) return;
													setSelectedAvailable((s) => toggleSet(s, p.pgmid));
												}}
												className={`border-b border-blue-50 ${
													alreadyMapped
														? "bg-emerald-50 text-emerald-900 cursor-not-allowed"
														: `cursor-pointer hover:bg-blue-50/60 ${isSelected ? "bg-blue-100" : ""}`
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">
													{p.name}
													{alreadyMapped ? (
														<span className="ml-2 text-[10px] font-medium text-emerald-700">
															권한있음
														</span>
													) : null}
												</td>
												<td className="px-3 py-2">{p.role}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
						{availablePrograms.length > 0 ? (
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
							disabled={saving || !availablePrograms.length}
							className="w-36 whitespace-pre-line rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							{"전체추가\n==>"}
						</button>
						<button
							type="button"
							onClick={() => void removeAll()}
							disabled={saving || !mappedPrograms.length}
							className="w-36 whitespace-pre-line rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							{"전체삭제\n<=="}
						</button>
					</div>

					{/* 우측: 매핑된 프로그램 (F00131) */}
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
										프로그램명
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">관리등급</th>
								</tr>
							</thead>
							<tbody>
								{mappingLoading ? (
									<tr>
										<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
											매핑 조회 중…
										</td>
									</tr>
								) : mappedProgramsSorted.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
											매핑된 프로그램이 없습니다.
										</td>
									</tr>
								) : (
									mappedRows.map((p) => (
										<tr
											key={p.pgmid}
											onClick={() => setSelectedMapped((s) => toggleSet(s, p.pgmid))}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												selectedMapped.has(p.pgmid) ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{p.name}</td>
											<td className="px-3 py-2">{p.role}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
						{mappedProgramsSorted.length > 0 ? (
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
