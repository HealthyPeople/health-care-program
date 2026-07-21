"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

interface UdcGroupRow {
	code: string;
	dsc: string;
	etc: string;
	del: string;
	indt: string;
	urdt: string;
}

interface UdcDetailRow {
	code: string;
	ucd: string;
	dsc1: string;
	dsc2: string;
	seq: string;
	etc: string;
	del: string;
	indt: string;
	urdt: string;
}

type GroupModalMode = "create" | "edit" | null;
type DetailModalMode = "create" | "edit" | null;

const labelCls =
	"rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
const inputCls =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const btnCls =
	"rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50";

function toText(v: unknown): string {
	if (v == null) return "";
	return String(v).trim();
}

function formatYmd(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (!s) return "";
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.slice(0, 10);
}

function mapGroupRow(r: Record<string, unknown>): UdcGroupRow {
	return {
		code: toText(r.CODE).toUpperCase(),
		dsc: toText(r.DSC),
		etc: toText(r.ETC),
		del: toText(r.DEL).toUpperCase(),
		indt: formatYmd(r.INDT),
		urdt: formatYmd(r.URDT),
	};
}

function mapDetailRow(r: Record<string, unknown>): UdcDetailRow {
	return {
		code: toText(r.CODE).toUpperCase(),
		ucd: toText(r.UCD),
		dsc1: toText(r.DSC1),
		dsc2: toText(r.DSC2),
		seq: r.SEQ == null || r.SEQ === "" ? "" : String(r.SEQ),
		etc: toText(r.ETC),
		del: toText(r.DEL).toUpperCase(),
		indt: formatYmd(r.INDT),
		urdt: formatYmd(r.URDT),
	};
}

const emptyGroupForm = { code: "", dsc: "", etc: "" };
const emptyDetailForm = { ucd: "", dsc1: "", dsc2: "", seq: "", etc: "" };
const ITEMS_PER_PAGE = 10;

function PaginationBar({
	page,
	totalPages,
	onChange,
}: {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
}) {
	if (totalPages <= 1) return null;
	return (
		<div className="border-t border-blue-200 bg-white p-2 flex items-center justify-center gap-2">
			<button
				type="button"
				onClick={() => onChange(1)}
				disabled={page === 1}
				className="h-9 w-9 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="처음"
			>
				«
			</button>
			<button
				type="button"
				onClick={() => onChange(Math.max(1, page - 1))}
				disabled={page === 1}
				className="h-9 w-9 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="이전"
			>
				‹
			</button>
			<span className="min-w-14 text-center text-sm font-semibold text-blue-900">
				{page} / {totalPages}
			</span>
			<button
				type="button"
				onClick={() => onChange(Math.min(totalPages, page + 1))}
				disabled={page === totalPages}
				className="h-9 w-9 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="다음"
			>
				›
			</button>
			<button
				type="button"
				onClick={() => onChange(totalPages)}
				disabled={page === totalPages}
				className="h-9 w-9 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
				aria-label="마지막"
			>
				»
			</button>
		</div>
	);
}

export default function UDCPage() {
	const [codeGroupQuery, setCodeGroupQuery] = useState("");
	const [includeDeleted, setIncludeDeleted] = useState(true);

	const [groups, setGroups] = useState<UdcGroupRow[]>([]);
	const [details, setDetails] = useState<UdcDetailRow[]>([]);
	const [selectedCode, setSelectedCode] = useState("");
	const [selectedUcd, setSelectedUcd] = useState("");

	const [loadingGroups, setLoadingGroups] = useState(false);
	const [loadingDetails, setLoadingDetails] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [groupModal, setGroupModal] = useState<GroupModalMode>(null);
	const [groupForm, setGroupForm] = useState(emptyGroupForm);

	const [detailModal, setDetailModal] = useState<DetailModalMode>(null);
	const [detailForm, setDetailForm] = useState(emptyDetailForm);

	const [groupPage, setGroupPage] = useState(1);
	const [detailPage, setDetailPage] = useState(1);

	const filteredGroups = useMemo(() => {
		const q = codeGroupQuery.trim().toUpperCase();
		if (!q) return groups;
		return groups.filter((r) => {
			const dsc = r.dsc.toUpperCase();
			const code = r.code.toUpperCase();
			// 설명 기준 검색 (부분 일치), 코드구분도 함께 허용
			return dsc.includes(q) || code.includes(q);
		});
	}, [groups, codeGroupQuery]);

	const groupTotalPages = Math.max(1, Math.ceil(filteredGroups.length / ITEMS_PER_PAGE));
	const safeGroupPage = Math.min(groupPage, groupTotalPages);
	const pagedGroups = useMemo(() => {
		const start = (safeGroupPage - 1) * ITEMS_PER_PAGE;
		return filteredGroups.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredGroups, safeGroupPage]);

	const detailTotalPages = Math.max(1, Math.ceil(details.length / ITEMS_PER_PAGE));
	const safeDetailPage = Math.min(detailPage, detailTotalPages);
	const pagedDetails = useMemo(() => {
		const start = (safeDetailPage - 1) * ITEMS_PER_PAGE;
		return details.slice(start, start + ITEMS_PER_PAGE);
	}, [details, safeDetailPage]);

	const selectedGroup = useMemo(
		() => groups.find((r) => r.code === selectedCode) || null,
		[groups, selectedCode]
	);

	const selectedDetail = useMemo(
		() => details.find((r) => r.ucd === selectedUcd) || null,
		[details, selectedUcd]
	);

	const loadGroups = useCallback(async () => {
		setLoadingGroups(true);
		setLoadError(null);
		try {
			const qs = new URLSearchParams();
			if (includeDeleted) qs.set("includeDeleted", "1");
			const res = await fetch(`/api/f01001?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "코드구분 조회에 실패했습니다.");
			}
			const list = (Array.isArray(json.data) ? json.data : []).map((r: Record<string, unknown>) =>
				mapGroupRow(r)
			) as UdcGroupRow[];
			setGroups(list);
			setSelectedCode((prev) => {
				if (prev && list.some((r) => r.code === prev)) return prev;
				return list[0]?.code || "";
			});
		} catch (err) {
			console.error(err);
			setGroups([]);
			setSelectedCode("");
			setLoadError(err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.");
		} finally {
			setLoadingGroups(false);
		}
	}, [includeDeleted]);

	const loadDetails = useCallback(async (code: string) => {
		if (!code) {
			setDetails([]);
			setSelectedUcd("");
			return;
		}
		setLoadingDetails(true);
		try {
			const qs = new URLSearchParams({ code });
			if (includeDeleted) qs.set("includeDeleted", "1");
			const res = await fetch(`/api/f01002?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "사용자코드 조회에 실패했습니다.");
			}
			const list = (Array.isArray(json.data) ? json.data : []).map((r: Record<string, unknown>) =>
				mapDetailRow(r)
			) as UdcDetailRow[];
			setDetails(list);
			setSelectedUcd((prev) => {
				if (prev && list.some((r) => r.ucd === prev)) return prev;
				return list[0]?.ucd || "";
			});
		} catch (err) {
			console.error(err);
			setDetails([]);
			setSelectedUcd("");
			alert(err instanceof Error ? err.message : "사용자코드 조회 중 오류가 발생했습니다.");
		} finally {
			setLoadingDetails(false);
		}
	}, [includeDeleted]);

	useEffect(() => {
		void loadGroups();
	}, [loadGroups]);

	useEffect(() => {
		void loadDetails(selectedCode);
		setDetailPage(1);
	}, [selectedCode, loadDetails]);

	useEffect(() => {
		setGroupPage(1);
	}, [codeGroupQuery, includeDeleted]);

	useEffect(() => {
		if (groupPage > groupTotalPages) setGroupPage(groupTotalPages);
	}, [groupPage, groupTotalPages]);

	useEffect(() => {
		if (detailPage > detailTotalPages) setDetailPage(detailTotalPages);
	}, [detailPage, detailTotalPages]);

	useEffect(() => {
		if (!filteredGroups.length) {
			if (selectedCode) setSelectedCode("");
			return;
		}
		if (!selectedCode || !filteredGroups.some((r) => r.code === selectedCode)) {
			setSelectedCode(filteredGroups[0].code);
		}
	}, [filteredGroups, selectedCode]);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const openCreateGroup = () => {
		setGroupForm(emptyGroupForm);
		setGroupModal("create");
	};

	const openEditGroup = (row: UdcGroupRow) => {
		setSelectedCode(row.code);
		setGroupForm({
			code: row.code,
			dsc: row.dsc,
			etc: row.etc,
		});
		setGroupModal("edit");
	};

	const saveGroup = async () => {
		const code = groupForm.code.trim().toUpperCase().slice(0, 2);
		if (!code) {
			alert("코드구분을 입력해 주세요. (최대 2자)");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f01001", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					CODE: code,
					DSC: groupForm.dsc.trim() || null,
					ETC: groupForm.etc.trim() || null,
					DEL: " ",
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "코드구분 저장에 실패했습니다.");
			}
			setGroupModal(null);
			await loadGroups();
			setSelectedCode(code);
			alert(groupModal === "edit" ? "수정되었습니다." : "등록되었습니다.");
		} catch (err) {
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteGroup = async (row: UdcGroupRow) => {
		if (row.del === "D") {
			alert("이미 삭제된 코드구분입니다.");
			return;
		}
		if (!confirm(`코드구분 [${row.code}] 를 삭제하시겠습니까?\n(실제 삭제가 아니라 DEL='D'로 표시됩니다.)`)) return;
		setSaving(true);
		try {
			const qs = new URLSearchParams({ code: row.code });
			const res = await fetch(`/api/f01001?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "코드구분 삭제에 실패했습니다.");
			}
			await loadGroups();
			alert("삭제 처리되었습니다.");
		} catch (err) {
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleRestoreGroup = async (row: UdcGroupRow) => {
		if (row.del !== "D") return;
		if (!confirm(`코드구분 [${row.code}] 를 복구하시겠습니까?`)) return;
		setSaving(true);
		try {
			const res = await fetch("/api/f01001", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					CODE: row.code,
					DSC: row.dsc || null,
					ETC: row.etc || null,
					DEL: "I",
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "코드구분 복구에 실패했습니다.");
			}
			await loadGroups();
			setSelectedCode(row.code);
			alert("복구되었습니다.");
		} catch (err) {
			alert(err instanceof Error ? err.message : "복구 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleHardDeleteGroup = async (row: UdcGroupRow) => {
		if (row.del !== "D") return;
		const ok = confirm(
			`코드구분 [${row.code}] 를 완전삭제하시겠습니까?\n\n` +
				`해당 코드구분과 연관된 사용자코드(F01002)도 함께 삭제되며,\n` +
				`삭제 후에는 복구할 수 없습니다.`
		);
		if (!ok) return;
		setSaving(true);
		try {
			const qs = new URLSearchParams({ code: row.code, hard: "1" });
			const res = await fetch(`/api/f01001?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "코드구분 완전삭제에 실패했습니다.");
			}
			const detailCnt = Number(json?.deletedDetails ?? 0);
			await loadGroups();
			alert(
				detailCnt > 0
					? `완전삭제되었습니다. (연관 사용자코드 ${detailCnt}건 포함)`
					: "완전삭제되었습니다."
			);
		} catch (err) {
			alert(err instanceof Error ? err.message : "완전삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const openCreateDetail = () => {
		if (!selectedCode) {
			alert("왼쪽에서 코드구분을 먼저 선택해 주세요.");
			return;
		}
		setDetailForm(emptyDetailForm);
		setDetailModal("create");
	};

	const openEditDetail = (row: UdcDetailRow) => {
		setSelectedUcd(row.ucd);
		setDetailForm({
			ucd: row.ucd,
			dsc1: row.dsc1,
			dsc2: row.dsc2,
			seq: row.seq,
			etc: row.etc,
		});
		setDetailModal("edit");
	};

	const saveDetail = async () => {
		if (!selectedCode) {
			alert("코드구분이 선택되지 않았습니다.");
			return;
		}
		const ucd = detailForm.ucd.trim().slice(0, 2);
		if (!ucd) {
			alert("사용자코드를 입력해 주세요. (최대 2자)");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f01002", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					CODE: selectedCode,
					UCD: ucd,
					DSC1: detailForm.dsc1.trim() || null,
					DSC2: detailForm.dsc2.trim() || null,
					SEQ: detailForm.seq.trim() === "" ? null : Number(detailForm.seq),
					ETC: detailForm.etc.trim() || null,
					DEL: " ",
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "사용자코드 저장에 실패했습니다.");
			}
			setDetailModal(null);
			await loadDetails(selectedCode);
			setSelectedUcd(ucd);
			alert(detailModal === "edit" ? "수정되었습니다." : "등록되었습니다.");
		} catch (err) {
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteDetail = async (row: UdcDetailRow) => {
		if (!selectedCode) return;
		if (row.del === "D") {
			alert("이미 삭제된 사용자코드입니다.");
			return;
		}
		if (!confirm(`사용자코드 [${row.ucd}] 를 삭제하시겠습니까?\n(실제 삭제가 아니라 DEL='D'로 표시됩니다.)`)) return;
		setSaving(true);
		try {
			const qs = new URLSearchParams({
				code: selectedCode,
				ucd: row.ucd,
			});
			const res = await fetch(`/api/f01002?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "사용자코드 삭제에 실패했습니다.");
			}
			await loadDetails(selectedCode);
			alert("삭제 처리되었습니다.");
		} catch (err) {
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleRestoreDetail = async (row: UdcDetailRow) => {
		if (!selectedCode || row.del !== "D") return;
		if (!confirm(`사용자코드 [${row.ucd}] 를 복구하시겠습니까?`)) return;
		setSaving(true);
		try {
			const res = await fetch("/api/f01002", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					CODE: selectedCode,
					UCD: row.ucd,
					DSC1: row.dsc1 || null,
					DSC2: row.dsc2 || null,
					SEQ: row.seq.trim() === "" ? null : Number(row.seq),
					ETC: row.etc || null,
					DEL: "I",
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "사용자코드 복구에 실패했습니다.");
			}
			await loadDetails(selectedCode);
			setSelectedUcd(row.ucd);
			alert("복구되었습니다.");
		} catch (err) {
			alert(err instanceof Error ? err.message : "복구 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-3">
				<div className="flex items-stretch gap-3">
					<div className="w-[280px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						일반코드관리
					</div>

					<div className="flex-1 rounded border border-blue-300 bg-white p-2 flex flex-wrap items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<span className={labelCls}>설명</span>
							<input
								value={codeGroupQuery}
								onChange={(e) => setCodeGroupQuery(e.target.value)}
								placeholder="설명으로 검색"
								className={`w-56 ${inputCls}`}
							/>
							<label className="ml-2 flex items-center gap-1.5 text-sm text-blue-900">
								<input
									type="checkbox"
									checked={includeDeleted}
									onChange={(e) => setIncludeDeleted(e.target.checked)}
								/>
								삭제포함
							</label>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<button type="button" onClick={openCreateGroup} disabled={saving} className={`w-20 ${btnCls}`}>
								신규
							</button>
							{/* <button
								type="button"
								onClick={openCreateDetail}
								disabled={!selectedCode || saving}
								className={`w-32 ${btnCls}`}
							>
								사용자코드등록
							</button>
							<button type="button" onClick={handleClose} className={`w-20 ${btnCls}`}>
								닫기
							</button> */}
						</div>
					</div>
				</div>

				{loadError ? (
					<div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
						{loadError}
					</div>
				) : null}

				<div className="grid grid-cols-12 gap-3">
					{/* 좌측: F01001 */}
					<div className="col-span-12 lg:col-span-5 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							코드구분 (F01001)
						</div>
						<div className="max-h-[680px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[90px]">
											코드구분
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											설명
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[120px]">
											비고
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900 w-[50px]">
											DEL
										</th>
										<th className="px-2 py-2 text-center font-semibold text-blue-900 w-[150px]">
											관리
										</th>
									</tr>
								</thead>
								<tbody>
									{loadingGroups ? (
										<tr>
											<td colSpan={5} className="px-3 py-12 text-center text-blue-900/60">
												조회 중…
											</td>
										</tr>
									) : filteredGroups.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-3 py-12 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										pagedGroups.map((r) => {
											const isSelected = r.code === selectedCode;
											return (
												<tr
													key={r.code}
													onClick={() => setSelectedCode(r.code)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													} ${r.del === "D" ? "opacity-50" : ""}`}
												>
													<td className="border-r border-blue-100 px-3 py-2 font-medium">
														{r.code}
													</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.dsc}</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.etc}</td>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{r.del === "D" ? "D" : ""}
													</td>
													<td className="px-2 py-1.5 text-right">
														<div className="flex items-center justify-end gap-1">
															{r.del === "D" ? (
																<>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			void handleRestoreGroup(r);
																		}}
																		disabled={saving}
																		className="rounded border border-green-500 bg-green-100 px-2 py-1 text-xs font-medium text-green-900 hover:bg-green-200 disabled:opacity-50"
																	>
																		복구
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			void handleHardDeleteGroup(r);
																		}}
																		disabled={saving}
																		className="rounded border border-red-600 bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
																	>
																		완전삭제
																	</button>
																</>
															) : (
																<>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			openEditGroup(r);
																		}}
																		disabled={saving}
																		className="rounded border border-blue-400 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
																	>
																		수정
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			void handleDeleteGroup(r);
																		}}
																		disabled={saving}
																		className="rounded border border-red-400 bg-red-100 px-2 py-1 text-xs font-medium text-red-900 hover:bg-red-200 disabled:opacity-50"
																	>
																		삭제
																	</button>
																</>
															)}
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						{filteredGroups.length > ITEMS_PER_PAGE ? (
							<PaginationBar
								page={safeGroupPage}
								totalPages={groupTotalPages}
								onChange={setGroupPage}
							/>
						) : null}
						<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-blue-900/60">
							선택:{" "}
							{selectedGroup ? `${selectedGroup.code} - ${selectedGroup.dsc || "(설명없음)"}` : "-"}
							{filteredGroups.length > 0
								? ` · 총 ${filteredGroups.length}건`
								: ""}
						</div>
					</div>

					{/* 우측: F01002 */}
					<div className="col-span-12 lg:col-span-7 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
							<span className="text-sm font-semibold text-blue-900">
								사용자코드 (F01002)
								{selectedCode ? ` · ${selectedCode}` : ""}
							</span>
							<button
								type="button"
								onClick={openCreateDetail}
								disabled={!selectedCode || saving}
								className={`w-20 ${btnCls}`}
							>
								추가
							</button>
						</div>
						<div className="max-h-[680px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[80px]">
											사용자코드
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											코드설명1
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											코드설명2
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900 w-[70px]">
											우선순위
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[100px]">
											비고
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900 w-[50px]">
											DEL
										</th>
										<th className="px-2 py-2 text-center font-semibold text-blue-900 w-[150px]">
											관리
										</th>
									</tr>
								</thead>
								<tbody>
									{!selectedCode ? (
										<tr>
											<td colSpan={7} className="px-3 py-12 text-center text-blue-900/60">
												왼쪽에서 코드구분을 선택해 주세요.
											</td>
										</tr>
									) : loadingDetails ? (
										<tr>
											<td colSpan={7} className="px-3 py-12 text-center text-blue-900/60">
												조회 중…
											</td>
										</tr>
									) : details.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-3 py-12 text-center text-blue-900/60">
												등록된 사용자코드가 없습니다.
											</td>
										</tr>
									) : (
										pagedDetails.map((r) => {
											const isSelected = r.ucd === selectedUcd;
											return (
												<tr
													key={`${r.code}-${r.ucd}`}
													onClick={() => setSelectedUcd(r.ucd)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													} ${r.del === "D" ? "opacity-50" : ""}`}
												>
													<td className="border-r border-blue-100 px-3 py-2 font-medium">
														{r.ucd}
													</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.dsc1}</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.dsc2}</td>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{r.seq}
													</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.etc}</td>
													<td className="border-r border-blue-100 px-3 py-2 text-center">
														{r.del === "D" ? "D" : ""}
													</td>
													<td className="px-2 py-1.5 text-right">
														<div className="flex items-center justify-end gap-1">
															{r.del === "D" ? (
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		void handleRestoreDetail(r);
																	}}
																	disabled={saving}
																	className="rounded border border-green-500 bg-green-100 px-2 py-1 text-xs font-medium text-green-900 hover:bg-green-200 disabled:opacity-50"
																>
																	복구
																</button>
															) : (
																<>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			openEditDetail(r);
																		}}
																		disabled={saving}
																		className="rounded border border-blue-400 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
																	>
																		수정
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			void handleDeleteDetail(r);
																		}}
																		disabled={saving}
																		className="rounded border border-red-400 bg-red-100 px-2 py-1 text-xs font-medium text-red-900 hover:bg-red-200 disabled:opacity-50"
																	>
																		삭제
																	</button>
																</>
															)}
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						{details.length > ITEMS_PER_PAGE ? (
							<PaginationBar
								page={safeDetailPage}
								totalPages={detailTotalPages}
								onChange={setDetailPage}
							/>
						) : null}
						<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-blue-900/60">
							선택:{" "}
							{selectedDetail
								? `${selectedDetail.ucd} - ${selectedDetail.dsc1 || "(설명없음)"}`
								: "-"}
							{details.length > 0 ? ` · 총 ${details.length}건` : ""}
						</div>
					</div>
				</div>
			</div>

			{/* 일반 코드 등록/수정 모달 (F01001) */}
			{groupModal ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-xl rounded border border-blue-400 bg-white shadow-lg overflow-hidden">
						<div className="border-b border-blue-300 bg-blue-100 px-4 py-4 text-center text-xl font-semibold text-blue-900 tracking-wide">
							{groupModal === "create" ? "일반 코드 등록" : "일반 코드 수정"}
						</div>

						<div className="m-3 rounded border border-blue-300 bg-white p-3 space-y-2">
							<div className="flex items-stretch gap-2">
								<span className="w-24 shrink-0 flex items-center justify-center rounded border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									코드구분
								</span>
								<input
									value={groupForm.code}
									onChange={(e) =>
										setGroupForm((p) => ({
											...p,
											code: e.target.value.toUpperCase().slice(0, 2),
										}))
									}
									disabled={groupModal === "edit"}
									maxLength={2}
									className={`w-28 ${inputCls} disabled:bg-blue-50`}
									placeholder="2자리"
								/>
								<div className="flex-1" />
							</div>
							<div className="flex items-stretch gap-2">
								<span className="w-24 shrink-0 flex items-center justify-center rounded border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									설&nbsp;&nbsp;명
								</span>
								<input
									value={groupForm.dsc}
									onChange={(e) => setGroupForm((p) => ({ ...p, dsc: e.target.value.slice(0, 100) }))}
									className={`flex-1 ${inputCls}`}
								/>
							</div>
							<div className="flex items-stretch gap-2">
								<span className="w-24 shrink-0 flex items-center justify-center rounded border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									비&nbsp;&nbsp;고
								</span>
								<input
									value={groupForm.etc}
									onChange={(e) => setGroupForm((p) => ({ ...p, etc: e.target.value.slice(0, 100) }))}
									className={`flex-1 ${inputCls}`}
								/>
							</div>
						</div>

						<div className="flex gap-2 px-3 pb-3">
							<button
								type="button"
								onClick={() => void saveGroup()}
								disabled={saving}
								className="flex-[3] rounded border border-blue-500 bg-blue-500 py-3 text-base font-semibold tracking-[0.4em] text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{saving ? "저장중…" : "저 장"}
							</button>
							<button
								type="button"
								onClick={() => setGroupModal(null)}
								disabled={saving}
								className="flex-1 rounded border border-blue-400 bg-blue-100 py-3 text-base font-semibold tracking-[0.3em] text-blue-900 hover:bg-blue-200 disabled:opacity-50"
							>
								닫 기
							</button>
						</div>
					</div>
				</div>
			) : null}

			{/* 사용자코드 모달 */}
			{detailModal ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-lg rounded-lg border border-blue-300 bg-white shadow-lg">
						<div className="border-b border-blue-200 bg-blue-100 px-4 py-3 text-lg font-semibold text-blue-900">
							사용자코드 {detailModal === "create" ? "등록" : "수정"}
							<span className="ml-2 text-sm font-normal text-blue-800/80">
								코드구분 {selectedCode}
							</span>
						</div>
						<div className="space-y-3 p-4">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-3 ${labelCls}`}>사용자코드</span>
								<input
									value={detailForm.ucd}
									onChange={(e) =>
										setDetailForm((p) => ({ ...p, ucd: e.target.value.slice(0, 2) }))
									}
									disabled={detailModal === "edit"}
									maxLength={2}
									className={`col-span-9 ${inputCls} disabled:bg-gray-50`}
									placeholder="최대 2자"
								/>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-3 ${labelCls}`}>코드설명1</span>
								<input
									value={detailForm.dsc1}
									onChange={(e) =>
										setDetailForm((p) => ({ ...p, dsc1: e.target.value.slice(0, 100) }))
									}
									className={`col-span-9 ${inputCls}`}
								/>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-3 ${labelCls}`}>코드설명2</span>
								<input
									value={detailForm.dsc2}
									onChange={(e) =>
										setDetailForm((p) => ({ ...p, dsc2: e.target.value.slice(0, 100) }))
									}
									className={`col-span-9 ${inputCls}`}
								/>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-3 ${labelCls}`}>우선순위</span>
								<input
									type="number"
									value={detailForm.seq}
									onChange={(e) => setDetailForm((p) => ({ ...p, seq: e.target.value }))}
									className={`col-span-9 ${inputCls}`}
								/>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-3 ${labelCls}`}>비고</span>
								<input
									value={detailForm.etc}
									onChange={(e) =>
										setDetailForm((p) => ({ ...p, etc: e.target.value.slice(0, 100) }))
									}
									className={`col-span-9 ${inputCls}`}
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2 border-t border-blue-100 px-4 py-3">
							<button type="button" onClick={() => setDetailModal(null)} className={btnCls}>
								취소
							</button>
							<button
								type="button"
								onClick={() => void saveDetail()}
								disabled={saving}
								className="rounded border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{saving ? "저장중…" : "저장"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
