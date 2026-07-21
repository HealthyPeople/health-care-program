"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	uid?: string;
	empnm?: string;
	empno?: string | number;
	decyn?: string;
	decpos?: number | string;
};

interface WorkLogRow {
	jodt: string;
	fcnt: string;
	hcnt: string;
	scnt: string;
	ncnt: string;
	ecnt: string;
	svnm: string;
	jdes: string;
	otdes: string;
	inempno: string;
	inempnm: string;
	ordes1: string;
	ordes1nm: string;
	ordes2: string;
	ordes2nm: string;
	ordes3: string;
	ordes3nm: string;
	ordes4: string;
	ordes4nm: string;
	prc1: string;
	prc2: string;
	prc3: string;
	prc4: string;
}

interface ApprovalRow {
	empno: number;
	decpos: number | null;
	ordesNm: string;
	ordes: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function formatDateYmd(value: unknown): string {
	if (value == null || value === "") return "";
	if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDate(value);
	const s = String(value).trim();
	if (!s) return "";
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s.slice(0, 10);
}

function numStr(v: unknown): string {
	if (v == null || v === "") return "";
	return String(v);
}

function emptyRow(jodt: string): WorkLogRow {
	return {
		jodt,
		fcnt: "",
		hcnt: "",
		scnt: "",
		ncnt: "",
		ecnt: "",
		svnm: "",
		jdes: "",
		otdes: "",
		inempno: "",
		inempnm: "",
		ordes1: "",
		ordes1nm: "",
		ordes2: "",
		ordes2nm: "",
		ordes3: "",
		ordes3nm: "",
		ordes4: "",
		ordes4nm: "",
		prc1: "0",
		prc2: "0",
		prc3: "0",
		prc4: "0",
	};
}

function mapApiRow(row: Record<string, unknown>): WorkLogRow {
	return {
		jodt: formatDateYmd(row.JODT),
		fcnt: numStr(row.FCNT),
		hcnt: numStr(row.HCNT),
		scnt: numStr(row.SCNT),
		ncnt: numStr(row.NCNT),
		ecnt: numStr(row.ECNT),
		svnm: String(row.SVNM ?? "").trim(),
		jdes: String(row.JDES ?? "").trim(),
		otdes: String(row.OTDES ?? "").trim(),
		inempno: numStr(row.INEMPNO),
		inempnm: String(row.INEMPNM ?? "").trim(),
		ordes1: String(row.ORDES1 ?? "").trim(),
		ordes1nm: String(row.ORDES1NM ?? "").trim(),
		ordes2: String(row.ORDES2 ?? "").trim(),
		ordes2nm: String(row.ORDES2NM ?? "").trim(),
		ordes3: String(row.ORDES3 ?? "").trim(),
		ordes3nm: String(row.ORDES3NM ?? "").trim(),
		ordes4: String(row.ORDES4 ?? "").trim(),
		ordes4nm: String(row.ORDES4NM ?? "").trim(),
		prc1: String(row.PRC_1 ?? "0").trim() || "0",
		prc2: String(row.PRC_2 ?? "0").trim() || "0",
		prc3: String(row.PRC_3 ?? "0").trim() || "0",
		prc4: String(row.PRC_4 ?? "0").trim() || "0",
	};
}

const labelCls =
	"rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
const inputCls =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const readOnlyCls =
	"rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900";

export default function FacilityWorkLogApproval() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [fromDate, setFromDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState(todayStr);

	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [facilityName, setFacilityName] = useState("");
	const [approverName, setApproverName] = useState("");
	const [approverUid, setApproverUid] = useState("");
	const [approverEmpno, setApproverEmpno] = useState<number | null>(null);
	const [canApprove, setCanApprove] = useState(false);
	const [decpos, setDecpos] = useState<number | null>(null);

	const [workDates, setWorkDates] = useState<string[]>([]);
	const [rowsByDate, setRowsByDate] = useState<Record<string, WorkLogRow>>({});
	const [selectedDate, setSelectedDate] = useState("");
	const [form, setForm] = useState<WorkLogRow>(() => emptyRow(todayStr));
	const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
	const [instructionDraft, setInstructionDraft] = useState("");
	const [editingEmpno, setEditingEmpno] = useState<number | null>(null);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const hasSelected = Boolean(selectedDate && rowsByDate[selectedDate]);

	const myApproval = useMemo(
		() =>
			approverEmpno != null
				? approvals.find((a) => a.empno === approverEmpno) ?? null
				: null,
		[approvals, approverEmpno]
	);

	const loadApprovals = useCallback(
		async (jodt: string) => {
			if (sessionAncd == null || !jodt) {
				setApprovals([]);
				return;
			}
			try {
				const qs = new URLSearchParams({
					ancd: String(sessionAncd),
					jodt,
				});
				const res = await fetch(`/api/f11061?${qs.toString()}`, {
					credentials: "include",
					cache: "no-store",
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json?.success) {
					throw new Error(json?.error || "결재내역 조회에 실패했습니다.");
				}
				const list = (Array.isArray(json.data) ? json.data : [])
					.map((r: Record<string, unknown>) => {
						const empno = Number(r.EMPNO);
						if (!Number.isFinite(empno)) return null;
						return {
							empno,
							decpos:
								r.DECPOS != null && Number.isFinite(Number(r.DECPOS))
									? Number(r.DECPOS)
									: null,
							ordesNm: String(r.ORDES_NM ?? "").trim(),
							ordes: String(r.ORDES ?? "").trim(),
						} as ApprovalRow;
					})
					.filter(Boolean) as ApprovalRow[];
				setApprovals(list);
			} catch (err) {
				console.error(err);
				setApprovals([]);
			}
		},
		[sessionAncd]
	);

	const loadData = useCallback(async () => {
		if (sessionAncd == null) return;
		setLoading(true);
		setLoadError(null);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				startDate: fromDate,
				endDate: toDate,
			});
			const res = await fetch(`/api/f11060?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "업무일지 조회에 실패했습니다.");
			}
			const list = (Array.isArray(json.data) ? json.data : []).map((r: Record<string, unknown>) =>
				mapApiRow(r)
			) as WorkLogRow[];
			const map: Record<string, WorkLogRow> = {};
			const dates: string[] = [];
			for (const row of list) {
				if (!row.jodt) continue;
				map[row.jodt] = row;
				dates.push(row.jodt);
			}
			dates.sort((a, b) => b.localeCompare(a));
			setRowsByDate(map);
			setWorkDates(dates);
			setSelectedDate((prev) => {
				if (prev && map[prev]) return prev;
				return dates[0] || "";
			});
		} catch (err) {
			console.error(err);
			setRowsByDate({});
			setWorkDates([]);
			setSelectedDate("");
			setLoadError(err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	}, [sessionAncd, fromDate, toDate]);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/api/auth/user-info", { credentials: "include" });
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json?.success) {
					throw new Error(json?.error || "로그인 정보를 확인할 수 없습니다.");
				}
				const user = (json.data || {}) as UserInfo;
				if (user.ancd == null || user.ancd === "") {
					throw new Error("로그인 계정의 센터(고객코드)를 확인할 수 없습니다.");
				}
				setSessionAncd(user.ancd);
				setFacilityName(user.annm ? String(user.annm) : "");
				setApproverName(user.empnm ? String(user.empnm) : String(user.uid || ""));
				setApproverUid(user.uid ? String(user.uid) : "");
				const empnoNum = Number(user.empno);
				setApproverEmpno(Number.isFinite(empnoNum) ? empnoNum : null);
				const yn = String(user.decyn ?? "N").trim().toUpperCase() === "Y";
				const pos = Number(user.decpos);
				const validPos = Number.isFinite(pos) && pos >= 1 && pos <= 4 ? pos : null;
				setCanApprove(yn && validPos != null);
				setDecpos(validPos);
			} catch (err) {
				setLoadError(err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다.");
			}
		})();
	}, []);

	useEffect(() => {
		if (sessionAncd == null) return;
		void loadData();
	}, [sessionAncd, loadData]);

	useEffect(() => {
		if (selectedDate && rowsByDate[selectedDate]) {
			setForm({ ...rowsByDate[selectedDate] });
		} else {
			setForm(emptyRow(selectedDate || todayStr));
		}
		setInstructionDraft("");
		setEditingEmpno(null);
		if (selectedDate) {
			void loadApprovals(selectedDate);
		} else {
			setApprovals([]);
		}
	}, [selectedDate, rowsByDate, todayStr, loadApprovals]);

	const handleApprove = async () => {
		if (!hasSelected) {
			alert("결재할 업무일지를 선택해 주세요.");
			return;
		}
		if (!canApprove || decpos == null) {
			alert("결재 권한이 없습니다. (결재권자·결재위치 확인)");
			return;
		}
		const text = instructionDraft.trim();
		if (!text) {
			alert("지시사항 내용을 입력한 뒤 결재해 주세요.");
			return;
		}

		const isEdit = editingEmpno != null;
		if (!isEdit && myApproval) {
			alert("이미 결재한 내역이 있습니다. 수정하려면 결재내역의 수정 버튼을 이용해 주세요.");
			return;
		}
		if (!isEdit && approvals.length >= 4) {
			alert("결재는 최대 4건까지 등록할 수 있습니다.");
			return;
		}
		if (isEdit && editingEmpno !== approverEmpno) {
			alert("본인이 등록한 결재만 수정할 수 있습니다.");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch("/api/f11061", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					JODT: selectedDate,
					EMPNO: approverEmpno,
					DECPOS: decpos,
					ORDES_NM: approverName || approverUid,
					ORDES: text,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "결재 저장에 실패했습니다.");
			}
			alert(isEdit ? "결재 내용이 수정되었습니다." : "결재가 완료되었습니다.");
			setInstructionDraft("");
			setEditingEmpno(null);
			await loadData();
			await loadApprovals(selectedDate);
			setSelectedDate(selectedDate);
		} catch (err) {
			alert(err instanceof Error ? err.message : "결재 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleEditApproval = (row: ApprovalRow) => {
		if (!canApprove) {
			alert("결재 권한이 없습니다.");
			return;
		}
		if (approverEmpno == null || row.empno !== approverEmpno) {
			alert("본인이 등록한 결재만 수정할 수 있습니다.");
			return;
		}
		setEditingEmpno(row.empno);
		setInstructionDraft(row.ordes);
	};

	const handleDeleteApproval = async (row: ApprovalRow) => {
		if (!hasSelected) return;
		if (!canApprove) {
			alert("결재 권한이 없습니다.");
			return;
		}
		if (approverEmpno == null || row.empno !== approverEmpno) {
			alert("본인이 등록한 결재만 삭제할 수 있습니다.");
			return;
		}
		if (!confirm(`${row.ordesNm || "결재자"} 결재 내용을 삭제하시겠습니까?`)) return;

		setSaving(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				jodt: selectedDate,
				empno: String(row.empno),
			});
			const res = await fetch(`/api/f11061?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "결재 삭제에 실패했습니다.");
			}
			alert("결재 내용이 삭제되었습니다.");
			setInstructionDraft("");
			setEditingEmpno(null);
			await loadData();
			await loadApprovals(selectedDate);
		} catch (err) {
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				<div className="flex flex-wrap items-stretch gap-3">
					<div className="flex-1 min-w-[240px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						시설 일일업무 결재
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className={labelCls}>업무기간</span>
							<input
								type="date"
								value={fromDate}
								onChange={(e) => setFromDate(e.target.value)}
								className={inputCls}
							/>
							<span className="px-1 text-blue-900/70">~</span>
							<input
								type="date"
								value={toDate}
								onChange={(e) => setToDate(e.target.value)}
								className={inputCls}
							/>
						</div>
						{/* <div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className={labelCls}>결재일자</span>
							<input
								type="date"
								value={selectedDate || todayStr}
								onChange={(e) => setSelectedDate(e.target.value)}
								className={inputCls}
							/>
						</div> */}

					</div>
				</div>

				{loadError ? (
					<div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
						{loadError}
					</div>
				) : null}

				{!canApprove ? (
					<p className="text-sm text-amber-800">
						현재 계정은 결재권자가 아니거나 결재위치가 없어 조회만 가능합니다.
					</p>
				) : (
					<p className="text-sm text-blue-800/80">
						결재권자: {approverName || "-"} · 결재위치 {decpos}
					</p>
				)}

				<div className="grid grid-cols-12 gap-3">
					{/* 좌측 업무일자 */}
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							업무일자
						</div>
						<div className="max-h-[640px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{loading ? (
										<tr>
											<td className="px-3 py-10 text-center text-blue-900/60">조회 중…</td>
										</tr>
									) : workDates.length === 0 ? (
										<tr>
											<td className="px-3 py-10 text-center text-blue-900/60">데이터가 없습니다.</td>
										</tr>
									) : (
										workDates.map((date) => {
											const isSelected = date === selectedDate;
											const row = rowsByDate[date];
											const approvedCount = [row?.prc1, row?.prc2, row?.prc3, row?.prc4].filter(
												(v) => v === "1"
											).length;
											return (
												<tr
													key={date}
													onClick={() => setSelectedDate(date)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="px-3 py-2">
														<div>{date}</div>
														{approvedCount > 0 ? (
															<div className="text-[11px] text-blue-700/70">결재 {approvedCount}/4</div>
														) : null}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 우측 상세 */}
					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 space-y-2 min-h-[520px]">
							{!hasSelected ? (
								<p className="py-24 text-center text-sm text-blue-900/60">
									좌측에서 업무일자를 선택해 주세요.
								</p>
							) : (
								<>
									<div className="grid grid-cols-12 gap-2 items-center">
										<span className={`col-span-2 ${labelCls}`}>기관명</span>
										<input
											readOnly
											value={facilityName}
											className={`col-span-10 ${readOnlyCls}`}
										/>
									</div>

									<div className="grid grid-cols-12 gap-2 items-center">
										<span className={`col-span-1 ${labelCls}`}>정원</span>
										<input readOnly value={form.fcnt} className={`col-span-1 ${readOnlyCls}`} />
										<span className={`col-span-1 ${labelCls}`}>현인원</span>
										<input readOnly value={form.hcnt} className={`col-span-1 ${readOnlyCls}`} />
										<span className={`col-span-1 ${labelCls}`}>이용인원</span>
										<input readOnly value={form.scnt} className={`col-span-1 ${readOnlyCls}`} />
										<span className={`col-span-1 ${labelCls}`}>신규입소</span>
										<input readOnly value={form.ncnt} className={`col-span-1 ${readOnlyCls}`} />
										<span className={`col-span-1 ${labelCls}`}>퇴소자</span>
										<input readOnly value={form.ecnt} className={`col-span-1 ${readOnlyCls}`} />
										<div className="col-span-2" />
									</div>

									<div className="grid grid-cols-12 gap-2 items-center">
										<span className={`col-span-2 ${labelCls}`}>외박명단</span>
										<input readOnly value={form.svnm} className={`col-span-10 ${readOnlyCls}`} />
									</div>

									<div className="grid grid-cols-12 gap-2">
										<div className="col-span-2 space-y-2">
											<span className={`block ${labelCls}`}>업무내용</span>
											<input
												readOnly
												value={form.inempnm || "-"}
												className={`w-full ${readOnlyCls} text-xs`}
												title="등록자"
											/>
											<input
												readOnly
												value={form.inempno || "-"}
												className={`w-full ${readOnlyCls} text-xs`}
												title="등록사원번호"
											/>
										</div>
										<textarea
											readOnly
											value={form.jdes}
											rows={8}
											className={`col-span-10 ${readOnlyCls} resize-none`}
										/>
									</div>

									<div className="grid grid-cols-12 gap-2">
										<span className={`col-span-2 ${labelCls} self-start`}>지출내역</span>
										<textarea
											readOnly
											value={form.otdes}
											rows={3}
											className={`col-span-10 ${readOnlyCls} resize-none`}
										/>
									</div>

									<div className="grid grid-cols-12 gap-2">
										<div className="col-span-2 space-y-2">
											<span className={`block ${labelCls}`}>지시사항결재</span>
											<input
												readOnly
												value={approverName || "-"}
												className={`w-full ${readOnlyCls} text-xs`}
												title="결재자"
											/>
											{editingEmpno != null ? (
												<p className="text-[11px] text-blue-800/80 text-center">
													수정중
												</p>
											) : null}
										</div>
										<textarea
											value={instructionDraft}
											onChange={(e) => setInstructionDraft(e.target.value)}
											placeholder="결재 지시사항을 입력하세요"
											disabled={!canApprove}
											rows={8}
											className={`col-span-8 ${inputCls} resize-none disabled:bg-gray-50`}
										/>
										<button
											type="button"
											onClick={() => void handleApprove()}
											disabled={saving || !canApprove}
											className="col-span-2 rounded border border-blue-500 bg-blue-500 px-3 py-3 text-base font-medium text-white hover:bg-blue-600 disabled:opacity-50"
										>
											{saving ? "처리중…" : editingEmpno != null ? "수 정" : "결 재"}
										</button>
									</div>

									<div className="grid grid-cols-12 gap-2">
										<span className={`col-span-2 ${labelCls} self-start`}>결재내역조회</span>
										<div className="col-span-10 rounded border border-blue-300 overflow-hidden">
											<div className="max-h-[200px] overflow-auto">
												<table className="w-full text-sm">
													<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
														<tr>
															<th className="w-[140px] border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
																결재자
															</th>
															<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
																지시사항
															</th>
															<th className="w-[70px] border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
																상태
															</th>
															<th className="w-[140px] px-2 py-2 text-center font-semibold text-blue-900">
																관리
															</th>
														</tr>
													</thead>
													<tbody>
														{approvals.length === 0 ? (
															<tr>
																<td colSpan={4} className="px-3 py-8 text-center text-blue-900/60">
																	결재 내역이 없습니다.
																</td>
															</tr>
														) : (
															approvals.map((r) => {
																const isMine =
																	approverEmpno != null && r.empno === approverEmpno;
																return (
																	<tr key={r.empno} className="border-b border-blue-50">
																		<td className="border-r border-blue-100 px-3 py-2">
																			{r.ordesNm || "-"}
																			{r.decpos != null ? (
																				<span className="ml-1 text-[11px] text-blue-700/70">
																					({r.decpos})
																				</span>
																			) : null}
																		</td>
																		<td className="border-r border-blue-100 px-3 py-2">
																			{r.ordes || "-"}
																		</td>
																		<td className="border-r border-blue-100 px-2 py-2 text-center text-xs">
																			결재
																		</td>
																		<td className="px-2 py-1.5 text-center">
																			{isMine ? (
																				<div className="flex items-center justify-center gap-1.5">
																					<button
																						type="button"
																						onClick={() => handleEditApproval(r)}
																						disabled={saving || !canApprove}
																						className="rounded border border-blue-400 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
																					>
																						수정
																					</button>
																					<button
																						type="button"
																						onClick={() => void handleDeleteApproval(r)}
																						disabled={saving || !canApprove}
																						className="rounded border border-red-400 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900 hover:bg-red-200 disabled:opacity-50"
																					>
																						삭제
																					</button>
																				</div>
																			) : (
																				<span className="text-blue-900/40">-</span>
																			)}
																		</td>
																	</tr>
																);
															})
														)}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
