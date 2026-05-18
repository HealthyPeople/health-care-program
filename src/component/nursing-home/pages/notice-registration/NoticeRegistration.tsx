"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	buildNoticePrintHtml,
	openPrintPreviewWindow,
} from "./noticeRegistrationPrint";

interface NoticeRow {
	seq: number | null;
	startDate: string;
	endDate: string;
	centerName: string;
	registrant: string;
	title: string;
	content: string;
	mgu: string;
	etc: string;
	viewerCodes: string;
}

interface F60030ListItem {
	SEQ: number;
	MDOC?: string;
	SDT?: string;
	EDT?: string;
	ANCD?: number | string;
	MNM?: string;
	MGU?: string;
	ETC?: string;
	ANNM?: string;
	INEMPNM?: string;
}

interface F60030Detail extends F60030ListItem {
	MDES?: string;
	INEMPNO?: number | string;
	viewers?: { D_ANCD?: number | string }[];
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	empno?: string | number;
	empnm?: string;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const labelClass =
	"rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
const inputClass =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const readOnlyCls =
	"rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900 min-h-[38px]";
const modalLabelCls =
	"w-28 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-900 text-center";
const modalFieldCls =
	"flex-1 min-w-0 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

const emptyForm = (today: string, centerName = "", registrant = ""): NoticeRow => ({
	seq: null,
	startDate: today,
	endDate: today,
	centerName,
	registrant,
	title: "",
	content: "",
	mgu: "1",
	etc: "",
	viewerCodes: "",
});

function toText(v: unknown): string {
	if (v == null) return "";
	return String(v).trim();
}

function formatDateYmd(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function parseViewerCodes(text: string): number[] {
	return String(text ?? "")
		.split(/[,，、\s\n\r]+/)
		.map((s) => parseInt(s.trim(), 10))
		.filter((n) => !Number.isNaN(n));
}

function mapDetailToForm(row: F60030Detail, centerFallback: string): NoticeRow {
	const viewers = Array.isArray(row.viewers) ? row.viewers : [];
	return {
		seq: row.SEQ ?? null,
		startDate: formatDateYmd(row.SDT),
		endDate: formatDateYmd(row.EDT),
		centerName: toText(row.ANNM) || centerFallback,
		registrant: toText(row.MNM) || toText(row.INEMPNM),
		title: toText(row.MDOC),
		content: toText(row.MDES),
		mgu: toText(row.MGU) || "1",
		etc: toText(row.ETC),
		viewerCodes: viewers.map((v) => String(v.D_ANCD ?? "").trim()).filter(Boolean).join(", "),
	};
}

export default function NoticeRegistration() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [periodStart, setPeriodStart] = useState<string>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [periodEnd, setPeriodEnd] = useState<string>(todayStr);
	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [centerName, setCenterName] = useState("");
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

	const [notices, setNotices] = useState<F60030ListItem[]>([]);
	const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
	const [form, setForm] = useState<NoticeRow>(() => emptyForm(todayStr));
	const [formSnapshot, setFormSnapshot] = useState<NoticeRow | null>(null);

	const [isEditMode, setIsEditMode] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [modalForm, setModalForm] = useState<NoticeRow>(() => emptyForm(todayStr));
	const [modalSaveLoading, setModalSaveLoading] = useState(false);

	const listItems = useMemo(
		() =>
			[...notices].sort((a, b) => {
				const sa = formatDateYmd(a.SDT);
				const sb = formatDateYmd(b.SDT);
				if (sa < sb) return 1;
				if (sa > sb) return -1;
				return (b.SEQ ?? 0) - (a.SEQ ?? 0);
			}),
		[notices]
	);

	const fetchUserInfo = async () => {
		const res = await fetch("/api/auth/user-info", { credentials: "include" });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "로그인 정보를 확인할 수 없습니다.");
		}
		const u = (json.data || {}) as UserInfo;
		if (u.ancd == null || u.ancd === "") {
			throw new Error("로그인 계정의 센터(고객코드)를 확인할 수 없습니다.");
		}
		setUserInfo(u);
		setSessionAncd(u.ancd);
		setCenterName(toText(u.annm));
		return u;
	};

	const fetchNotices = async (
		ancd: string | number,
		range?: { start?: string; end?: string }
	) => {
		const start = range?.start ?? periodStart;
		const end = range?.end ?? periodEnd;
		const url = `/api/f60030?ancd=${encodeURIComponent(String(ancd))}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
		const res = await fetch(url, { credentials: "include" });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "공지 목록 조회 실패");
		}
		const list = Array.isArray(json.data) ? (json.data as F60030ListItem[]) : [];
		setNotices(list);
		return list;
	};

	const fetchNoticeDetail = async (ancd: string | number, seq: number) => {
		const url = `/api/f60030?ancd=${encodeURIComponent(String(ancd))}&seq=${encodeURIComponent(String(seq))}`;
		const res = await fetch(url, { credentials: "include" });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "공지 상세 조회 실패");
		}
		return (json.data || {}) as F60030Detail;
	};

	const loadNoticeDetail = useCallback(
		async (seq: number) => {
			if (sessionAncd == null) return;
			const detail = await fetchNoticeDetail(sessionAncd, seq);
			const mapped = mapDetailToForm(detail, centerName);
			setForm(mapped);
			setSelectedSeq(seq);
			setIsEditMode(false);
		},
		[sessionAncd, centerName]
	);

	const initialize = async () => {
		setLoading(true);
		try {
			const u = await fetchUserInfo();
			const list = await fetchNotices(u.ancd!);
			if (list.length > 0) {
				await loadNoticeDetail(list[0].SEQ);
			} else {
				setSelectedSeq(null);
				setForm(emptyForm(todayStr, toText(u.annm), toText(u.empnm)));
				setIsEditMode(false);
			}
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "데이터 조회 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void initialize();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSearch = async () => {
		if (!sessionAncd) return;
		if (periodStart && periodEnd && periodStart > periodEnd) {
			alert("조회 시작일이 종료일보다 늦을 수 없습니다.");
			return;
		}
		setLoading(true);
		try {
			const list = await fetchNotices(sessionAncd);
			if (selectedSeq && list.some((n) => n.SEQ === selectedSeq)) {
				await loadNoticeDetail(selectedSeq);
			} else if (list.length > 0) {
				await loadNoticeDetail(list[0].SEQ);
			} else {
				setSelectedSeq(null);
				setForm(emptyForm(todayStr, centerName, toText(userInfo?.empnm)));
				setIsEditMode(false);
			}
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const openCreateModal = () => {
		setModalForm(emptyForm(todayStr, centerName, toText(userInfo?.empnm)));
		setCreateModalOpen(true);
	};

	const closeCreateModal = () => {
		if (modalSaveLoading) return;
		setCreateModalOpen(false);
		setModalForm(emptyForm(todayStr, centerName, toText(userInfo?.empnm)));
	};

	const handleModify = () => {
		if (!selectedSeq) {
			alert("수정할 공지를 선택해주세요.");
			return;
		}
		setFormSnapshot({ ...form });
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		if (formSnapshot) {
			setForm(formSnapshot);
		} else if (selectedSeq != null) {
			void loadNoticeDetail(selectedSeq);
		}
		setIsEditMode(false);
		setFormSnapshot(null);
	};

	const buildPayload = (row: NoticeRow) => {
		const viewers = row.mgu === "2" ? parseViewerCodes(row.viewerCodes) : [];
		return {
			ANCD: sessionAncd ?? null,
			MDOC: row.title || null,
			MDES: row.content || null,
			SDT: row.startDate,
			EDT: row.endDate,
			MNM: row.registrant || userInfo?.empnm || null,
			MGU: row.mgu || "1",
			ETC: row.etc || null,
			INEMPNO: userInfo?.empno != null ? String(userInfo.empno) : null,
			INEMPNM: userInfo?.empnm != null ? String(userInfo.empnm) : null,
			viewers,
		};
	};

	const handleModalSave = async () => {
		if (!modalForm.startDate || !modalForm.endDate) {
			alert("공지 기간을 입력해주세요.");
			return;
		}
		if (modalForm.mgu === "2" && parseViewerCodes(modalForm.viewerCodes).length === 0) {
			alert("조회자구분이 '다수'인 경우 조회 고객코드를 입력해주세요.");
			return;
		}

		if (!sessionAncd) {
			alert("로그인 센터 정보를 확인할 수 없습니다.");
			return;
		}

		setModalSaveLoading(true);
		try {
			const res = await fetch(
				`/api/f60030?ancd=${encodeURIComponent(String(sessionAncd))}`,
				{
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(buildPayload(modalForm)),
				}
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "공지 등록 실패");
			}
			alert("공지가 등록되었습니다.");
			closeCreateModal();
			const newSeq = Number(json.seq);
			const list = await fetchNotices(sessionAncd);
			if (!Number.isNaN(newSeq)) {
				await loadNoticeDetail(newSeq);
			} else if (list.length > 0) {
				await loadNoticeDetail(list[0].SEQ);
			}
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setModalSaveLoading(false);
		}
	};

	const handleSave = async () => {
		if (!isEditMode || form.seq == null) {
			alert("수정 후 저장해주세요.");
			return;
		}
		if (!sessionAncd) {
			alert("로그인 센터 정보를 확인할 수 없습니다.");
			return;
		}
		if (!form.startDate || !form.endDate) {
			alert("공지시작일과 공지종료일을 입력해주세요.");
			return;
		}
		if (form.mgu === "2" && parseViewerCodes(form.viewerCodes).length === 0) {
			alert("조회자구분이 '다수'인 경우 조회 고객코드를 입력해주세요.");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch(
				`/api/f60030?ancd=${encodeURIComponent(String(sessionAncd))}&seq=${encodeURIComponent(String(form.seq))}`,
				{
					method: "PUT",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...buildPayload(form), SEQ: form.seq }),
				}
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "공지 수정 실패");
			}
			alert("공지가 수정되었습니다.");
			await fetchNotices(sessionAncd);
			await loadNoticeDetail(form.seq);
			setFormSnapshot(null);
			setIsEditMode(false);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedSeq) {
			alert("삭제할 공지를 선택해주세요.");
			return;
		}
		if (!confirm("선택한 공지를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) return;
		if (!sessionAncd) {
			alert("로그인 센터 정보를 확인할 수 없습니다.");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch(
				`/api/f60030?ancd=${encodeURIComponent(String(sessionAncd))}&seq=${encodeURIComponent(String(selectedSeq))}`,
				{ method: "DELETE", credentials: "include" }
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "공지 삭제 실패");
			}
			alert("공지가 삭제되었습니다.");
			const list = await fetchNotices(sessionAncd);
			if (list.length > 0) {
				await loadNoticeDetail(list[0].SEQ);
			} else {
				setSelectedSeq(null);
				setForm(emptyForm(todayStr, centerName, toText(userInfo?.empnm)));
				setIsEditMode(false);
			}
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handlePrint = () => {
		if (!selectedSeq) {
			alert("출력할 공지를 선택해주세요.");
			return;
		}
		const html = buildNoticePrintHtml({
			startDate: form.startDate,
			endDate: form.endDate,
			centerName: form.centerName || centerName,
			registrant: form.registrant,
			title: form.title,
			content: form.content,
		});
		openPrintPreviewWindow(html);
	};

	const editable = isEditMode;

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						공지사항 관리
					</div>

					<div className="flex items-center gap-3 flex-wrap">
						{sessionAncd != null && (
							<span className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900">
								로그인 센터 · 고객코드 <strong>{String(sessionAncd)}</strong>
							</span>
						)}
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className={`${labelClass} shrink-0`}>공지기준일자</span>
							<input
								type="date"
								value={periodStart}
								onChange={(e) => setPeriodStart(e.target.value)}
								disabled={loading}
								className={inputClass}
								title="조회 시작일"
							/>
							<span className="text-sm text-blue-900">~</span>
							<input
								type="date"
								value={periodEnd}
								onChange={(e) => setPeriodEnd(e.target.value)}
								disabled={loading}
								className={inputClass}
								title="조회 종료일"
							/>
						</div>
						<button
							type="button"
							onClick={() => void handleSearch()}
							disabled={loading || !sessionAncd}
							className="w-40 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							검색
						</button>
						{/* <button
							type="button"
							onClick={handleClose}
							className="w-32 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button> */}
					</div>
				</div>

				{loading && (
					<p className="text-sm text-blue-800/70">공지 목록을 불러오는 중…</p>
				)}

				<div className="grid grid-cols-12 gap-3">
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							공지시작일
						</div>
						<div className="max-h-[520px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{listItems.length === 0 ? (
										<tr>
											<td className="px-3 py-10 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										listItems.map((n) => {
											const isSelected = n.SEQ === selectedSeq;
											return (
												<tr
													key={n.SEQ}
													onClick={() => {
														if (isEditMode) {
															if (
																!confirm(
																	"편집 중입니다. 선택을 변경하면 저장하지 않은 내용이 사라질 수 있습니다. 계속하시겠습니까?"
																)
															) {
																return;
															}
															setIsEditMode(false);
														}
														void loadNoticeDetail(n.SEQ);
													}}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="px-3 py-2">
														<div>{formatDateYmd(n.SDT) || "-"}</div>
														<div className="text-xs text-blue-900/60 truncate">
															{n.MDOC || ""}
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 space-y-2">
							<fieldset
								disabled={!editable || saving}
								className="space-y-2 border-0 p-0 m-0 min-w-0 disabled:opacity-100 [&:disabled_*]:bg-gray-50 [&:disabled_*]:cursor-default"
							>
								<div className="grid grid-cols-12 gap-2 items-center">
									<span className={`col-span-2 ${labelClass}`}>공지시작일</span>
									{editable ? (
										<input
											type="date"
											value={form.startDate}
											onChange={(e) =>
												setForm((p) => ({ ...p, startDate: e.target.value }))
											}
											className={`col-span-3 ${inputClass}`}
										/>
									) : (
										<span className={`col-span-3 ${readOnlyCls}`}>
											{form.startDate || "-"}
										</span>
									)}
									<div className="col-span-1" />
									<span className={`col-span-2 ${labelClass}`}>공지종료일</span>
									{editable ? (
										<input
											type="date"
											value={form.endDate}
											onChange={(e) =>
												setForm((p) => ({ ...p, endDate: e.target.value }))
											}
											className={`col-span-3 ${inputClass}`}
										/>
									) : (
										<span className={`col-span-3 ${readOnlyCls}`}>
											{form.endDate || "-"}
										</span>
									)}
								</div>

								<div className="grid grid-cols-12 gap-2 items-center">
									<span className={`col-span-2 ${labelClass}`}>등록센터</span>
									<span className={`col-span-7 ${readOnlyCls}`}>
										{form.centerName || centerName || "-"}
									</span>
									<span className={`col-span-1 ${labelClass}`}>등록자</span>
									{editable ? (
										<input
											value={form.registrant}
											onChange={(e) =>
												setForm((p) => ({ ...p, registrant: e.target.value }))
											}
											className={`col-span-2 ${inputClass}`}
										/>
									) : (
										<span className={`col-span-2 ${readOnlyCls}`}>
											{form.registrant || "-"}
										</span>
									)}
								</div>

								<div className="grid grid-cols-12 gap-2 items-center">
									<span className={`col-span-2 ${labelClass}`}>조회자구분</span>
									{editable ? (
										<select
											value={form.mgu}
											onChange={(e) =>
												setForm((p) => ({ ...p, mgu: e.target.value }))
											}
											className={`col-span-3 ${inputClass}`}
										>
											<option value="1">1 - 자체</option>
											<option value="2">2 - 다수</option>
											<option value="3">3 - 전체</option>
										</select>
									) : (
										<span className={`col-span-3 ${readOnlyCls}`}>
											{form.mgu === "1"
												? "자체"
												: form.mgu === "2"
													? "다수"
													: form.mgu === "3"
														? "전체"
														: form.mgu || "-"}
										</span>
									)}
									<div className="col-span-1" />
									<span className={`col-span-2 ${labelClass}`}>비고</span>
									{editable ? (
										<input
											value={form.etc}
											onChange={(e) =>
												setForm((p) => ({ ...p, etc: e.target.value }))
											}
											className={`col-span-4 ${inputClass}`}
										/>
									) : (
										<span className={`col-span-4 ${readOnlyCls}`}>
											{form.etc || "-"}
										</span>
									)}
								</div>

								{(editable ? form.mgu === "2" : form.mgu === "2") && (
									<div className="grid grid-cols-12 gap-2 items-start">
										<span className={`col-span-2 ${labelClass} self-start`}>
											조회고객코드
										</span>
										{editable ? (
											<textarea
												value={form.viewerCodes}
												onChange={(e) =>
													setForm((p) => ({
														...p,
														viewerCodes: e.target.value,
													}))
												}
												rows={2}
												placeholder="F60031 — 콤마로 구분 (예: 101, 102)"
												className={`col-span-10 ${inputClass} resize-y`}
											/>
										) : (
											<div className={`col-span-10 ${readOnlyCls} min-h-[48px]`}>
												{form.viewerCodes || "-"}
											</div>
										)}
									</div>
								)}

								<div className="grid grid-cols-12 gap-2 items-center">
									<span className={`col-span-2 ${labelClass}`}>공지제목</span>
									{editable ? (
										<input
											value={form.title}
											onChange={(e) =>
												setForm((p) => ({ ...p, title: e.target.value }))
											}
											className={`col-span-10 ${inputClass}`}
										/>
									) : (
										<span className={`col-span-10 ${readOnlyCls}`}>
											{form.title || "-"}
										</span>
									)}
								</div>

								<div className="grid grid-cols-12 gap-2">
									<span className={`col-span-2 ${labelClass} self-start`}>
										공지내용
									</span>
									{editable ? (
										<textarea
											value={form.content}
											onChange={(e) =>
												setForm((p) => ({ ...p, content: e.target.value }))
											}
											rows={18}
											className={`col-span-10 ${inputClass} resize-none`}
										/>
									) : (
										<div
											className={`col-span-10 ${readOnlyCls} min-h-[360px] whitespace-pre-wrap`}
										>
											{form.content || "-"}
										</div>
									)}
								</div>
							</fieldset>

							<div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-200">
								{!isEditMode ? (
									<>
										<button
											type="button"
											onClick={openCreateModal}
											disabled={loading || saving || !sessionAncd}
											className="w-40 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
										>
											추가
										</button>
										<button
											type="button"
											onClick={handleModify}
											disabled={!selectedSeq || loading || saving}
											className="w-40 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											수정
										</button>
										<button
											type="button"
											onClick={() => void handleDelete()}
											disabled={!selectedSeq || loading || saving}
											className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											삭제
										</button>
										<button
											type="button"
											onClick={handlePrint}
											disabled={!selectedSeq}
											className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
										>
											출력
										</button>
									</>
								) : (
									<>
										<button
											type="button"
											onClick={handleCancelEdit}
											disabled={saving}
											className="w-32 rounded border border-gray-400 bg-gray-100 px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
										>
											취소
										</button>
										<button
											type="button"
											onClick={() => void handleSave()}
											disabled={saving || !sessionAncd}
											className="w-40 rounded border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
										>
											{saving ? "저장 중…" : "저장"}
										</button>
									</>
								)}
							</div>
						</div>
					</div>
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
						aria-labelledby="notice-create-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-stretch border-b border-blue-200">
							<div className="flex flex-1 items-center justify-center border-r border-blue-200 bg-blue-100 px-4 py-3">
								<h2
									id="notice-create-title"
									className="text-lg font-semibold text-blue-900"
								>
									공지사항 등록
								</h2>
							</div>
							<button
								type="button"
								disabled={modalSaveLoading}
								onClick={() => void handleModalSave()}
								className="w-32 shrink-0 bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{modalSaveLoading ? "저장 중…" : "저장"}
							</button>
						</div>

						<div className="overflow-y-auto space-y-2 p-4">
							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>등록센터</label>
								<span className={`${modalFieldCls} bg-gray-50`}>
									{modalForm.centerName || centerName || "-"}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>등록자</label>
								<input
									type="text"
									value={modalForm.registrant}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, registrant: e.target.value }))
									}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<label className={modalLabelCls}>공지 기간</label>
								<input
									type="date"
									value={modalForm.startDate}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, startDate: e.target.value }))
									}
									className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
								<span className="text-sm text-blue-900">~</span>
								<input
									type="date"
									value={modalForm.endDate}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, endDate: e.target.value }))
									}
									className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>제목</label>
								<input
									type="text"
									value={modalForm.title}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, title: e.target.value }))
									}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex gap-2">
								<label
									className={`${modalLabelCls} self-stretch flex items-center justify-center`}
								>
									내용
								</label>
								<textarea
									value={modalForm.content}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, content: e.target.value }))
									}
									rows={14}
									className={`${modalFieldCls} resize-y min-h-[280px]`}
								/>
							</div>
						</div>

						<div className="flex border-t border-blue-200">
							<button
								type="button"
								disabled={modalSaveLoading}
								onClick={closeCreateModal}
								className="w-full bg-blue-50 py-3 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
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
