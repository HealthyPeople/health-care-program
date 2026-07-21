"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import FacilityUserLinkModal, {
	EMPTY_LINK_DRAFT,
} from "./FacilityUserLinkModal";

interface FacilityUserRow {
	id: string;
	empName: string;
	empno: number | null;
	role: string;
	ugr: string;
	pwChangedAt: string;
	decyn: "Y" | "N";
	decpos: number | null;
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	uid?: string;
	ugr?: string | number;
};

type InstitutionOption = {
	ANCD: string | number;
	ANNM: string;
};

function ancdKey(v: string | number | null | undefined): string {
	if (v == null || v === "") return "";
	return String(v).trim();
}

function formatYmd(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (!s) return "";
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function sortUserRows(list: FacilityUserRow[]): FacilityUserRow[] {
	return [...list].sort((a, b) => {
		const aHas = a.empName.trim() ? 0 : 1;
		const bHas = b.empName.trim() ? 0 : 1;
		if (aHas !== bHas) return aHas - bHas;
		const byName = a.empName.localeCompare(b.empName, "ko");
		if (byName !== 0) return byName;
		return a.id.localeCompare(b.id, "ko");
	});
}

function mapApiRow(row: Record<string, unknown>): FacilityUserRow {
	const ugr = String(row.UGR ?? "").trim();
	const ugrNm = String(row.UGR_NM ?? "").trim();
	const decynRaw = String(row.DECYN ?? "N").trim().toUpperCase();
	const empnoRaw = row.EMPNO;
	return {
		id: String(row.UID ?? "").trim(),
		empName: String(row.EMPNM ?? "").trim(),
		empno:
			empnoRaw != null && empnoRaw !== "" && Number.isFinite(Number(empnoRaw))
				? Number(empnoRaw)
				: null,
		role: ugrNm || (ugr ? `등급 ${ugr}` : ""),
		ugr,
		pwChangedAt: formatYmd(row.PWDT),
		decyn: decynRaw === "Y" ? "Y" : "N",
		decpos:
			row.DECPOS != null && row.DECPOS !== "" && Number.isFinite(Number(row.DECPOS))
				? Number(row.DECPOS)
				: null,
	};
}

export default function FacilityUserManagement() {
	const [customerName, setCustomerName] = useState("");
	/** 현재 조회/작업 대상 기관 */
	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [sessionUgr, setSessionUgr] = useState("");
	const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
	const [searchEmpName, setSearchEmpName] = useState("");
	const [appliedSearch, setAppliedSearch] = useState("");

	const [rows, setRows] = useState<FacilityUserRow[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [actionBusyUid, setActionBusyUid] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [linkModalOpen, setLinkModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<FacilityUserRow | null>(null);

	const itemsPerPage = 10;
	const [currentPage, setCurrentPage] = useState(1);

	const isFullAdmin = sessionUgr === "1";

	const loadUsers = useCallback(async (ancd: string | number, empnmFilter = "") => {
		setLoading(true);
		setLoadError(null);
		try {
			const qs = new URLSearchParams();
			qs.set("ancd", String(ancd));
			const q = empnmFilter.trim();
			if (q) qs.set("empnm", q);

			const res = await fetch(`/api/f00120?${qs.toString()}`, {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "사용자 계정 목록을 불러오지 못했습니다.");
			}
			const list = sortUserRows(
				Array.isArray(json.data) ? json.data.map(mapApiRow) : []
			);
			setRows(list);
			setSelectedUserId((prev) => {
				if (prev && list.some((r: FacilityUserRow) => r.id === prev)) return prev;
				return list[0]?.id || "";
			});
			setCurrentPage(1);
		} catch (err) {
			console.error(err);
			const msg = err instanceof Error ? err.message : "사용자 계정 조회 중 오류가 발생했습니다.";
			setLoadError(msg);
			setRows([]);
			setSelectedUserId("");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadInstitutions = useCallback(async (preferAncd?: string | number) => {
		try {
			const res = await fetch("/api/f00110?list=all", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) return;
			const rawList = Array.isArray(json.data) ? json.data : [];
			const list: InstitutionOption[] = rawList
				.map((item: Record<string, unknown>): InstitutionOption => ({
					ANCD: item.ANCD as string | number,
					ANNM: String(item.ANNM ?? "").trim(),
				}))
				.filter((item) => item.ANCD != null && item.ANCD !== "" && !!item.ANNM);
			list.sort((a, b) => a.ANNM.localeCompare(b.ANNM, "ko"));
			setInstitutions(list);
			if (preferAncd != null) {
				const found = list.find((i) => ancdKey(i.ANCD) === ancdKey(preferAncd));
				if (found?.ANNM) setCustomerName(found.ANNM);
			}
		} catch (err) {
			console.error(err);
			setInstitutions([]);
		}
	}, []);

	const initializePage = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const userRes = await fetch("/api/auth/user-info", {
				method: "GET",
				credentials: "include",
			});
			const userJson = await userRes.json().catch(() => ({}));
			if (!userRes.ok || !userJson?.success) {
				throw new Error(userJson?.error || "로그인 정보를 확인할 수 없습니다.");
			}
			const user = (userJson.data || {}) as UserInfo;
			const loginAncdVal = user.ancd;
			if (loginAncdVal == null || loginAncdVal === "") {
				throw new Error("로그인 계정의 센터(고객코드)를 확인할 수 없습니다.");
			}
			const ugr = String(user.ugr ?? "").trim();
			setSessionAncd(loginAncdVal);
			setSessionUgr(ugr);
			setCustomerName(user.annm ? String(user.annm) : "");

			if (ugr === "1") {
				await loadInstitutions(loginAncdVal);
			} else {
				setInstitutions([
					{
						ANCD: loginAncdVal,
						ANNM: user.annm ? String(user.annm) : String(loginAncdVal),
					},
				]);
			}
			await loadUsers(loginAncdVal, "");
		} catch (err) {
			console.error(err);
			const msg = err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다.";
			setLoadError(msg);
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [loadUsers, loadInstitutions]);

	useEffect(() => {
		void initializePage();
	}, [initializePage]);

	const handleInstitutionChange = (nextAncd: string) => {
		if (!nextAncd || !isFullAdmin) return;
		const found = institutions.find((i) => ancdKey(i.ANCD) === ancdKey(nextAncd));
		setSessionAncd(nextAncd);
		setCustomerName(found?.ANNM || "");
		setSearchEmpName("");
		setAppliedSearch("");
		setSelectedUserId("");
		void loadUsers(nextAncd, "");
	};

	const filteredRows = useMemo(() => {
		const q = appliedSearch.trim().toLowerCase();
		const base = !q
			? rows
			: rows.filter((r) => r.empName.toLowerCase().includes(q));
		return sortUserRows(base);
	}, [rows, appliedSearch]);

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
	const page = Math.min(currentPage, totalPages);
	const startIndex = (page - 1) * itemsPerPage;
	const currentRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

	const handleSearch = () => {
		const q = searchEmpName.trim();
		setAppliedSearch(q);
		setCurrentPage(1);
		if (sessionAncd != null) {
			void loadUsers(sessionAncd, q);
		}
	};

	const refreshList = () => {
		if (sessionAncd == null) return;
		void loadUsers(sessionAncd, appliedSearch);
	};

	const handleDelete = async (uid: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (!uid || sessionAncd == null || actionBusyUid) return;
		const ok = window.confirm(
			`사용자ID [${uid}] 계정을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`
		);
		if (!ok) return;

		setActionBusyUid(uid);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				uid,
			});
			const res = await fetch(`/api/f00120?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "삭제에 실패했습니다.");
			}
			alert(`사용자ID [${uid}] 계정이 삭제되었습니다.`);
			refreshList();
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setActionBusyUid(null);
		}
	};

	const handleResetPassword = async (uid: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (!uid || sessionAncd == null || actionBusyUid) return;
		const ok = window.confirm(
			`사용자ID [${uid}] 의 암호를 초기화하시겠습니까?\n초기화 시 비밀번호는 0000 으로 변경됩니다.`
		);
		if (!ok) return;

		setActionBusyUid(uid);
		try {
			const res = await fetch("/api/f00120", {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: sessionAncd,
					UID: uid,
					action: "resetPassword",
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "암호초기화에 실패했습니다.");
			}
			alert(`사용자ID [${uid}] 의 암호가 0000 으로 초기화되었습니다.`);
			refreshList();
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "암호초기화 중 오류가 발생했습니다.");
		} finally {
			setActionBusyUid(null);
		}
	};

	const handleLinkEmployee = () => {
		if (sessionAncd == null) {
			alert("로그인 세션의 기관코드를 확인할 수 없습니다.");
			return;
		}
		setLinkModalOpen(true);
	};

	const handleEditUser = (row: FacilityUserRow, e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (sessionAncd == null) {
			alert("로그인 세션의 기관코드를 확인할 수 없습니다.");
			return;
		}
		setSelectedUserId(row.id);
		setEditTarget(row);
		setEditModalOpen(true);
	};
	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-3">
				{/* 상단 타이틀/고객명 */}
				<div className="flex flex-wrap items-stretch gap-3">
					<div className="flex-1 min-w-[320px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						사용자계정(ID)관리
					</div>
					<div className="flex-[2] min-w-[420px] rounded border border-blue-300 bg-white px-4 py-3">
						<div className="flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 shrink-0">
								고객명
							</span>
							{isFullAdmin ? (
								<select
									value={ancdKey(sessionAncd)}
									onChange={(e) => handleInstitutionChange(e.target.value)}
									disabled={loading || institutions.length === 0}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
								>
									{institutions.length === 0 ? (
										<option value="">기관 목록 로딩…</option>
									) : (
										institutions.map((inst) => (
											<option key={ancdKey(inst.ANCD)} value={ancdKey(inst.ANCD)}>
												{inst.ANNM}
											</option>
										))
									)}
								</select>
							) : (
								<input
									type="text"
									value={customerName}
									readOnly
									className="flex-1 rounded border border-blue-300 bg-gray-50 px-3 py-2 text-sm text-blue-900 focus:outline-none"
								/>
							)}
							{sessionAncd != null ? (
								<span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
									ANCD {String(sessionAncd)}
								</span>
							) : null}
						</div>
					</div>
				</div>

				{/* 검색/버튼 영역 */}
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 shrink-0">
							사원명
						</span>
						<input
							type="text"
							value={searchEmpName}
							onChange={(e) => setSearchEmpName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							placeholder="사원명 검색"
							className="w-80 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
						/>
						<button
							type="button"
							onClick={handleSearch}
							disabled={loading || sessionAncd == null}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							조회
						</button>
					</div>

					<div className="ml-auto flex flex-wrap gap-2">
						<button
							type="button"
							onClick={handleLinkEmployee}
							disabled={sessionAncd == null}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							사원연결작업
						</button>

					</div>
				</div>

				{loading ? (
					<p className="text-sm text-blue-800/70">사용자 계정을 불러오는 중…</p>
				) : null}
				{!loading && loadError ? (
					<p className="text-sm text-red-700">{loadError}</p>
				) : null}

				{/* 목록 테이블 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[520px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사용자ID
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사원명
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										관리등급
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										패스워드변경일자
									</th>
									<th className="px-3 py-2 text-center font-semibold text-blue-900 w-[280px]">
										관리
									</th>
								</tr>
							</thead>
							<tbody>
								{currentRows.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-3 py-10 text-center text-blue-900/60">
											{loading ? "조회 중…" : "데이터가 없습니다."}
										</td>
									</tr>
								) : (
									currentRows.map((row) => {
										const isSelected = row.id === selectedUserId;
										const busy = actionBusyUid === row.id;
										return (
											<tr
												key={row.id}
												onClick={() => setSelectedUserId(row.id)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{row.id}</td>
												<td className="border-r border-blue-100 px-3 py-2">{row.empName}</td>
												<td className="border-r border-blue-100 px-3 py-2">{row.role}</td>
												<td className="border-r border-blue-100 px-3 py-2">{row.pwChangedAt}</td>
												<td className="px-2 py-1.5">
													<div className="flex items-center justify-center gap-1.5">
														<button
															type="button"
															onClick={(e) => handleEditUser(row, e)}
															disabled={busy || loading}
															className="rounded border border-blue-400 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
														>
															수정
														</button>
														<button
															type="button"
															onClick={(e) => void handleResetPassword(row.id, e)}
															disabled={busy || loading}
															className="rounded border border-blue-400 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
														>
															{busy ? "처리중…" : "암호초기화"}
														</button>
														<button
															type="button"
															onClick={(e) => void handleDelete(row.id, e)}
															disabled={busy || loading}
															className="rounded border border-red-400 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900 hover:bg-red-200 disabled:opacity-50"
														>
															삭제
														</button>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* 하단 페이지네이션 */}
					<div className="border-t border-blue-200 bg-white p-3 flex items-center justify-center gap-2">
						<button
							type="button"
							onClick={() => setCurrentPage(1)}
							disabled={page === 1}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="처음"
						>
							«
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="이전"
						>
							‹
						</button>
						<span className="min-w-10 text-center text-sm font-semibold text-blue-900">{page}</span>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="다음"
						>
							›
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage(totalPages)}
							disabled={page === totalPages}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="마지막"
						>
							»
						</button>
					</div>
				</div>
			</div>

			{linkModalOpen && sessionAncd != null ? (
				<FacilityUserLinkModal
					key="link-employee-new"
					mode="create"
					customerName={customerName}
					uid=""
					initial={EMPTY_LINK_DRAFT}
					ancd={sessionAncd}
					onCancel={() => setLinkModalOpen(false)}
					onSaved={(savedUid) => {
						setLinkModalOpen(false);
						if (savedUid) setSelectedUserId(savedUid);
						refreshList();
					}}
				/>
			) : null}

			{editModalOpen && sessionAncd != null && editTarget ? (
				<FacilityUserLinkModal
					key={`edit-user-${editTarget.id}`}
					mode="edit"
					customerName={customerName}
					uid={editTarget.id}
					initial={{
						uid: editTarget.id,
						empno: editTarget.empno,
						empnm: editTarget.empName,
						ugr: editTarget.ugr,
						decyn: editTarget.decyn,
						decpos: editTarget.decpos,
					}}
					ancd={sessionAncd}
					onCancel={() => {
						setEditModalOpen(false);
						setEditTarget(null);
					}}
					onSaved={(savedUid) => {
						setEditModalOpen(false);
						setEditTarget(null);
						if (savedUid) setSelectedUserId(savedUid);
						refreshList();
					}}
				/>
			) : null}
		</div>
	);
}
