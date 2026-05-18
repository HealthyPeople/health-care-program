"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	buildMeetingMinutesPrintHtml,
	openPrintPreviewWindow,
} from "./employeeMeetingMinutesPrint";

interface MeetingMinutesRow {
	ANCD?: string | number;
	MDT: string;
	STM?: string;
	ETM?: string;
	MPL?: string;
	MDOC?: string;
	MDES?: string;
	MNM?: string;
	MIMG?: string;
	MODT?: string;
	MODES?: string;
	ETC?: string;
	URDT?: string;
	INEMPNO?: string | number;
	INEMPNM?: string;
	[key: string]: unknown;
}

type UserInfo = {
	ancd?: string | number;
	uid?: string;
	empno?: string | number;
	empnm?: string;
	[key: string]: unknown;
};

const ITEMS_PER_PAGE = 10;
const PROGRAM_ID = "F60010";

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function toText(value: unknown): string {
	if (value == null) return "";
	return String(value).trim();
}

function formatDateYmd(value: unknown): string {
	if (value == null || value === "") return "";
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return formatDate(value);
	}
	const s = String(value).trim();
	if (!s) return "";
	if (s.includes("T")) {
		const parsed = new Date(s);
		if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
		return s.split("T")[0].slice(0, 10);
	}
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	const d = new Date(s);
	if (!Number.isNaN(d.getTime())) return formatDate(d);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function normalizeTime(t: string): string {
	if (!t) return "";
	const s = String(t).trim();
	if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
	return s;
}

const emptyForm = {
	meetingDate: "",
	title: "",
	place: "",
	startTime: "",
	endTime: "",
	content: "",
	attendees: "",
	appliedDate: "",
	appliedContent: "",
};

const emptyModalForm = {
	meetingDate: "",
	title: "",
	place: "",
	startTime: "",
	endTime: "",
	content: "",
	attendees: "",
};

const modalLabelCls =
	"w-28 shrink-0 bg-blue-100 border border-blue-300 px-2 py-1.5 text-sm font-medium text-blue-900 text-center";
const modalFieldCls =
	"flex-1 min-w-0 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const modalTimeCls =
	"w-28 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const readOnlyCls =
	"flex-1 rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900 min-h-[38px]";
const readOnlyTextareaCls =
	"flex-1 rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900 whitespace-pre-wrap resize-none min-h-[120px]";
const inputCls =
	"flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

export default function EmployeeMeetingMinutes() {
	const [periodStart, setPeriodStart] = useState(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [periodEnd, setPeriodEnd] = useState(() => formatDate(new Date()));

	const [meetingList, setMeetingList] = useState<MeetingMinutesRow[]>([]);
	const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinutesRow | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [hasProgramAccess, setHasProgramAccess] = useState(true);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [modalForm, setModalForm] = useState(emptyModalForm);
	const [modalSaveLoading, setModalSaveLoading] = useState(false);

	const fetchUserAndPermission = async () => {
		try {
			const res = await fetch("/api/auth/user-info", { method: "GET" });
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || "사용자 정보 조회 실패");
			}
			const u = (result.data || {}) as UserInfo;
			setUserInfo(u);

			const ancd = u?.ancd;
			const uid = u?.uid;
			if (!ancd || !uid) {
				setHasProgramAccess(true);
				return;
			}

			const permRes = await fetch(
				`/api/f00131?ancd=${encodeURIComponent(String(ancd))}&uid=${encodeURIComponent(
					String(uid)
				)}&pgmid=${encodeURIComponent(PROGRAM_ID)}`,
				{ method: "GET" }
			);
			const perm = await permRes.json().catch(() => ({}));
			if (!permRes.ok || !perm?.success) {
				setHasProgramAccess(true);
				return;
			}
			if (typeof perm.allowed === "boolean") {
				setHasProgramAccess(perm.allowed !== false);
				return;
			}
			setHasProgramAccess(true);
		} catch (e) {
			console.error("사용자/권한 조회 오류:", e);
			setHasProgramAccess(true);
		}
	};

	const fetchMeetings = async (): Promise<MeetingMinutesRow[]> => {
		setLoading(true);
		try {
			const ancd = userInfo?.ancd;
			if (!ancd) {
				setMeetingList([]);
				return [];
			}
			const url = `/api/f60010?ancd=${encodeURIComponent(String(ancd))}&startDate=${encodeURIComponent(
				periodStart
			)}&endDate=${encodeURIComponent(periodEnd)}`;
			const response = await fetch(url, { method: "GET" });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || "회의록 목록 조회 실패");
			}
			const list = Array.isArray(result.data) ? result.data : [];
			const mapped = list.map((r: MeetingMinutesRow) => {
				const mdt = formatDateYmd(r?.MDT ?? (r as Record<string, unknown>)?.mdt);
				return {
					...r,
					MDT: mdt,
					MODT: formatDateYmd(r?.MODT),
					URDT: formatDateYmd(r?.URDT),
					STM: normalizeTime(toText(r?.STM)),
					ETM: normalizeTime(toText(r?.ETM)),
					MPL: toText(r?.MPL),
					MDOC: toText(r?.MDOC),
					MDES: toText(r?.MDES),
					MNM: toText(r?.MNM),
					MODES: toText(r?.MODES),
				};
			});
			setMeetingList(mapped);
			return mapped;
		} catch (err) {
			console.error("회의록 목록 조회 오류:", err);
			setMeetingList([]);
			return [];
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUserAndPermission();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!userInfo?.ancd) return;
		if (!periodStart || !periodEnd) return;
		fetchMeetings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [periodStart, periodEnd, userInfo?.ancd]);

	const totalPages = Math.max(1, Math.ceil(meetingList.length / ITEMS_PER_PAGE));
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const pagedList = meetingList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	const selectedKey = selectedMeeting ? formatDateYmd(selectedMeeting.MDT) : "";
	const hasSelectedMeeting = Boolean(selectedKey);

	const mapRowToForm = (row: MeetingMinutesRow) => ({
		meetingDate: formatDateYmd(row.MDT),
		title: toText(row.MDOC),
		place: toText(row.MPL),
		startTime: normalizeTime(toText(row.STM)),
		endTime: normalizeTime(toText(row.ETM)),
		content: toText(row.MDES),
		attendees: toText(row.MNM),
		appliedDate: formatDateYmd(row.MODT),
		appliedContent: toText(row.MODES),
	});

	const handleSelectMeeting = (row: MeetingMinutesRow) => {
		const normalized = {
			...row,
			MDT: formatDateYmd(row.MDT),
		};
		setSelectedMeeting(normalized);
		setIsEditMode(false);
		setForm(mapRowToForm(normalized));
	};

	const handleModify = () => {
		if (!hasProgramAccess) {
			alert("프로그램 사용 권한이 없습니다.");
			return;
		}
		if (!selectedMeeting?.MDT) {
			alert("수정할 회의록을 선택해주세요.");
			return;
		}
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		setIsEditMode(false);
		if (selectedMeeting) {
			setForm(mapRowToForm(selectedMeeting));
		} else {
			setForm(emptyForm);
		}
	};

	const handleSearch = () => {
		setCurrentPage(1);
		fetchMeetings();
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const openCreateModal = () => {
		setModalForm({
			...emptyModalForm,
			meetingDate: formatDate(new Date()),
		});
		setCreateModalOpen(true);
	};

	const closeCreateModal = () => {
		if (modalSaveLoading) return;
		setCreateModalOpen(false);
		setModalForm(emptyModalForm);
	};

	const handleAdd = () => {
		openCreateModal();
	};

	const persistMeeting = async (
		data: typeof emptyForm,
		options: { oldMdt?: string; isNew: boolean }
	) => {
		const ancd = userInfo?.ancd;
		if (!ancd) throw new Error("기관정보(ANCD)를 확인할 수 없습니다.");

		const newMdt = formatDateYmd(data.meetingDate);
		if (!newMdt) throw new Error("회의일자(MDT)를 확인할 수 없습니다.");

		const oldMdt = options.oldMdt ? formatDateYmd(options.oldMdt) : "";
		if (!options.isNew && oldMdt && oldMdt !== newMdt) {
			const delRes = await fetch(
				`/api/f60010?ancd=${encodeURIComponent(String(ancd))}&mdt=${encodeURIComponent(oldMdt)}`,
				{ method: "DELETE" }
			);
			const delResult = await delRes.json().catch(() => ({}));
			if (!delRes.ok || !delResult?.success) {
				throw new Error(delResult?.error || "기존 회의록 삭제에 실패했습니다.");
			}
		}

		const payload: Record<string, unknown> = {
			ANCD: ancd,
			MDT: newMdt,
			STM: data.startTime || null,
			ETM: data.endTime || null,
			MPL: data.place || null,
			MDOC: data.title || null,
			MDES: data.content || null,
			MNM: data.attendees || null,
			MODT: data.appliedDate ? formatDateYmd(data.appliedDate) : null,
			MODES: data.appliedContent || null,
			INEMPNO: userInfo?.empno != null ? String(userInfo.empno) : null,
			INEMPNM: userInfo?.empnm != null ? String(userInfo.empnm) : null,
		};

		const res = await fetch(`/api/f60010?ancd=${encodeURIComponent(String(ancd))}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const result = await res.json().catch(() => ({}));
		if (!res.ok || !result?.success) {
			throw new Error(result?.error || "회의록 저장에 실패했습니다.");
		}
		return newMdt;
	};

	const handleModalSave = async () => {
		if (!hasProgramAccess) {
			alert("프로그램 사용 권한이 없습니다.");
			return;
		}
		if (!modalForm.meetingDate) {
			alert("회의일자를 입력해주세요.");
			return;
		}

		setModalSaveLoading(true);
		try {
			const newMdt = await persistMeeting(
				{ ...emptyForm, ...modalForm, appliedDate: "", appliedContent: "" },
				{ isNew: true }
			);
			alert("회의록이 등록되었습니다.");
			closeCreateModal();
			const refreshed = await fetchMeetings();
			const saved = refreshed.find((m) => m.MDT === newMdt);
			if (saved) {
				setSelectedMeeting(saved);
				setIsEditMode(false);
				setForm(mapRowToForm(saved));
			}
		} catch (err) {
			console.error("회의록 등록 오류:", err);
			alert(err instanceof Error ? err.message : "회의록 등록 중 오류가 발생했습니다.");
		} finally {
			setModalSaveLoading(false);
		}
	};

	const handlePhotoRegister = (e: React.MouseEvent) => {
		e.stopPropagation();
		alert("기능개발중입니다");
	};

	const handleSave = async () => {
		if (!hasProgramAccess) {
			alert("프로그램 사용 권한이 없습니다.");
			return;
		}
		if (!isEditMode) {
			alert("수정 버튼을 눌러 편집 모드로 전환한 후 저장해주세요.");
			return;
		}
		if (!selectedMeeting?.MDT) {
			alert("저장할 회의록을 선택해주세요.");
			return;
		}
		if (!form.meetingDate) {
			alert("회의일자를 입력해주세요.");
			return;
		}

		setLoading(true);
		try {
			const newMdt = await persistMeeting(form, {
				oldMdt: selectedMeeting.MDT,
				isNew: false,
			});

			alert("회의록이 수정되었습니다.");
			setIsEditMode(false);
			const refreshed = await fetchMeetings();
			const saved = refreshed.find((m) => formatDateYmd(m.MDT) === newMdt);
			if (saved) {
				setSelectedMeeting(saved);
				setForm(mapRowToForm(saved));
			} else {
				setSelectedMeeting({ MDT: newMdt });
				setForm({ ...form, meetingDate: newMdt });
			}
		} catch (err) {
			console.error("회의록 저장 오류:", err);
			alert(err instanceof Error ? err.message : "회의록 저장 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!hasProgramAccess) {
			alert("프로그램 사용 권한이 없습니다.");
			return;
		}
		if (!selectedMeeting?.MDT) {
			alert("삭제할 회의록을 선택해주세요.");
			return;
		}
		if (!confirm("선택한 회의록을 삭제하시겠습니까?")) return;
		if (!confirm("정말 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) return;

		setLoading(true);
		try {
			const ancd = userInfo?.ancd;
			if (!ancd) throw new Error("기관정보(ANCD)를 확인할 수 없습니다.");
			const mdt = formatDateYmd(selectedMeeting.MDT);
			if (!mdt) throw new Error("회의일자(MDT)를 확인할 수 없습니다.");

			const res = await fetch(
				`/api/f60010?ancd=${encodeURIComponent(String(ancd))}&mdt=${encodeURIComponent(mdt)}`,
				{ method: "DELETE" }
			);
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || "회의록 삭제에 실패했습니다.");
			}

			alert("회의록이 삭제되었습니다.");
			setSelectedMeeting(null);
			setIsEditMode(false);
			setForm(emptyForm);
			await fetchMeetings();
		} catch (err) {
			console.error("회의록 삭제 오류:", err);
			alert(err instanceof Error ? err.message : "회의록 삭제 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	const handleRegisterApply = () => {
		alert("기능개발중입니다");
	};

	const handlePrint = () => {
		if (!form.meetingDate && !selectedMeeting?.MDT) {
			alert("출력할 회의록을 선택해주세요.");
			return;
		}

		const mdt = formatDateYmd(form.meetingDate || selectedMeeting?.MDT || "");
		const html = buildMeetingMinutesPrintHtml({
			meetingDate: mdt,
			startTime: form.startTime,
			endTime: form.endTime,
			place: form.place,
			title: form.title,
			content: form.content,
			attendees: form.attendees,
			appliedDate: formatDateYmd(form.appliedDate),
			appliedContent: form.appliedContent,
		});
		openPrintPreviewWindow(html);
	};


	const pageNumbers = useMemo(() => {
		const maxButtons = 5;
		let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
		const end = Math.min(totalPages, start + maxButtons - 1);
		start = Math.max(1, end - maxButtons + 1);
		const pages: number[] = [];
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	}, [currentPage, totalPages]);

	const leftPager = (
		<div className="flex items-center justify-between gap-3 px-3 py-3 border-t border-blue-200 bg-white">
			<div className="flex gap-2">
				<button
					type="button"
					disabled={currentPage <= 1}
					onClick={() => setCurrentPage(1)}
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-40"
					aria-label="처음"
				>
					«
				</button>
				<button
					type="button"
					disabled={currentPage <= 1}
					onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-40"
					aria-label="이전"
				>
					‹
				</button>
			</div>
			<div className="flex gap-1">
				{pageNumbers.map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => setCurrentPage(p)}
						className={`h-10 min-w-10 px-2 rounded border text-sm ${
							p === currentPage
								? "border-blue-500 bg-blue-200 text-blue-900 font-semibold"
								: "border-blue-300 bg-white text-blue-900 hover:bg-blue-50"
						}`}
					>
						{p}
					</button>
				))}
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					disabled={currentPage >= totalPages}
					onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-40"
					aria-label="다음"
				>
					›
				</button>
				<button
					type="button"
					disabled={currentPage >= totalPages}
					onClick={() => setCurrentPage(totalPages)}
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-40"
					aria-label="마지막"
				>
					»
				</button>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
				<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
					직원회의록관리
				</h1>

				<div className="flex items-center gap-2">
					<span className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900">
						기간
					</span>
					<input
						type="date"
						value={periodStart}
						onChange={(e) => setPeriodStart(e.target.value)}
						className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					/>
					<span className="text-sm text-blue-900">-</span>
					<input
						type="date"
						value={periodEnd}
						onChange={(e) => setPeriodEnd(e.target.value)}
						className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					/>
				</div>

				<div className="ml-auto flex gap-2">
					{/* <button
						type="button"
						onClick={handleSearch}
						disabled={loading}
						className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
					>
						검색
					</button> */}
					<button
						type="button"
						onClick={openCreateModal}
						className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						신규등록
					</button>
					{/* <button
						type="button"
						onClick={handleClose}
						className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						닫기
					</button> */}
				</div>
			</div>

			<div className="flex gap-4 p-4 min-h-[calc(100vh-76px)]">
				<aside className="w-[420px] shrink-0 flex flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
					<div className="flex-1 overflow-auto min-h-0">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										회의일자
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">회의제목</th>
								</tr>
							</thead>
							<tbody>
								{loading && pagedList.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
											조회 중...
										</td>
									</tr>
								) : pagedList.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									pagedList.map((m) => {
										const rowMdt = formatDateYmd(m.MDT);
										const isSelected = rowMdt === selectedKey && selectedKey !== "";
										return (
											<tr
												key={rowMdt || `row-${m.MDOC}`}
												onClick={() => handleSelectMeeting(m)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{rowMdt || "-"}</td>
												<td className="px-3 py-2">{m.MDOC || "-"}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{meetingList.length > 0 && leftPager}
				</aside>

				<section className="flex-1 min-w-0 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="flex-1 overflow-auto p-4">
						{!selectedMeeting ? (
							<p className="py-16 text-center text-sm text-blue-900/60">
								왼쪽 목록에서 회의록을 선택하세요.
							</p>
						) : (
						<div className="grid grid-cols-12 gap-3">
							<div className="col-span-12 md:col-span-6 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의일자
								</label>
								{isEditMode ? (
									<input
										type="date"
										value={form.meetingDate}
										onChange={(e) => setForm((p) => ({ ...p, meetingDate: e.target.value }))}
										className={inputCls}
									/>
								) : (
									<span className={readOnlyCls}>{form.meetingDate || "-"}</span>
								)}
							</div>

							<div className="col-span-12 md:col-span-6 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의시간
								</label>
								{isEditMode ? (
									<>
										<input
											type="time"
											value={form.startTime}
											onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
											className="w-36 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
										/>
										<span className="text-sm text-blue-900">~</span>
										<input
											type="time"
											value={form.endTime}
											onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
											className="w-36 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
										/>
									</>
								) : (
									<span className={readOnlyCls}>
										{form.startTime || "-"} ~ {form.endTime || "-"}
									</span>
								)}
							</div>

							<div className="col-span-12 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의장소
								</label>
								{isEditMode ? (
									<input
										type="text"
										value={form.place}
										onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
										className={inputCls}
									/>
								) : (
									<span className={readOnlyCls}>{form.place || "-"}</span>
								)}
							</div>

							<div className="col-span-12 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의제목
								</label>
								{isEditMode ? (
									<input
										type="text"
										value={form.title}
										onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
										className={inputCls}
									/>
								) : (
									<span className={readOnlyCls}>{form.title || "-"}</span>
								)}
							</div>

							<div className="col-span-12 flex items-start gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의내용
								</label>
								{isEditMode ? (
									<textarea
										value={form.content}
										onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
										rows={10}
										className={`${inputCls} resize-y min-h-[200px]`}
									/>
								) : (
									<div className={`${readOnlyTextareaCls} min-h-[200px]`}>
										{form.content || "-"}
									</div>
								)}
							</div>

							<div className="col-span-12 flex items-start gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의참석자
								</label>
								{isEditMode ? (
									<textarea
										value={form.attendees}
										onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
										rows={3}
										className={`${inputCls} resize-y`}
									/>
								) : (
									<div className={readOnlyTextareaCls}>{form.attendees || "-"}</div>
								)}
							</div>

							<div className="col-span-12 md:col-span-6 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									반영일자
								</label>
								{isEditMode ? (
									<input
										type="date"
										value={form.appliedDate}
										onChange={(e) => setForm((p) => ({ ...p, appliedDate: e.target.value }))}
										className={inputCls}
									/>
								) : (
									<span className={readOnlyCls}>{form.appliedDate || "-"}</span>
								)}
							</div>
							<div className="col-span-12 md:col-span-6" />

							<div className="col-span-12 flex items-start gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									반영내용
								</label>
								{isEditMode ? (
									<textarea
										value={form.appliedContent}
										onChange={(e) =>
											setForm((p) => ({ ...p, appliedContent: e.target.value }))
										}
										rows={6}
										className={`${inputCls} resize-y min-h-[120px]`}
									/>
								) : (
									<div className={`${readOnlyTextareaCls} min-h-[120px]`}>
										{form.appliedContent || "-"}
									</div>
								)}
							</div>
						</div>
						)}
					</div>

					<div className="border-t border-blue-200 bg-blue-50/50 p-3">
						<div className="flex flex-wrap items-center justify-center gap-3">
							{!isEditMode ? (
								<>
									{/* <button
										type="button"
										onClick={handleAdd}
										disabled={!hasProgramAccess || loading}
										className="min-w-40 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
									>
										추가
									</button> */}
									<button
										type="button"
										onClick={handleModify}
										disabled={!hasSelectedMeeting}
										className="min-w-28 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										수정
									</button>
									<button
										type="button"
										onClick={handleDelete}
										disabled={!hasSelectedMeeting}
										className="min-w-28 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										삭제
									</button>
									{/* <button
										type="button"
										onClick={handleRegisterApply}
										disabled={!hasProgramAccess || loading || !selectedMeeting}
										className="min-w-40 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
									>
										반영내용등록
									</button> */}
									<button
										type="button"
										onClick={handlePrint}
										disabled={!hasSelectedMeeting}
										className="min-w-28 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										출력
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={handleCancelEdit}
										disabled={loading}
										className="min-w-28 rounded border border-gray-400 bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
									>
										취소
									</button>
									<button
										type="button"
										onClick={() => void handleSave()}
										disabled={!hasProgramAccess || loading}
										className="min-w-28 rounded border border-blue-500 bg-blue-500 px-8 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
									>
										저장
									</button>
								</>
							)}
						</div>
					</div>
				</section>
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
						aria-labelledby="meeting-minutes-create-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="border-b border-blue-200 bg-blue-50 px-4 py-3">
							<h2
								id="meeting-minutes-create-title"
								className="text-center text-lg font-semibold text-blue-900"
							>
								직원회의록등록
							</h2>
						</div>

						<div className="overflow-y-auto space-y-2 p-4">
							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>회의일자</label>
								<input
									type="date"
									value={modalForm.meetingDate}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, meetingDate: e.target.value }))
									}
									className="w-44 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>회의시간</label>
								<input
									type="time"
									value={modalForm.startTime}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, startTime: e.target.value }))
									}
									className={modalTimeCls}
								/>
								<span className="text-sm text-blue-900">~</span>
								<input
									type="time"
									value={modalForm.endTime}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, endTime: e.target.value }))
									}
									className={modalTimeCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>회의장소</label>
								<input
									type="text"
									value={modalForm.place}
									onChange={(e) => setModalForm((f) => ({ ...f, place: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-center gap-2">
								<label className={modalLabelCls}>회의제목</label>
								<input
									type="text"
									value={modalForm.title}
									onChange={(e) => setModalForm((f) => ({ ...f, title: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="flex items-start gap-2">
								<label
									className={`${modalLabelCls} self-stretch flex items-center justify-center`}
								>
									회의내용
								</label>
								<textarea
									value={modalForm.content}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, content: e.target.value }))
									}
									rows={10}
									className={`${modalFieldCls} resize-y min-h-[200px]`}
								/>
							</div>

							<div className="flex items-start gap-2">
								<label
									className={`${modalLabelCls} self-stretch flex items-center justify-center`}
								>
									회의참석자
								</label>
								<textarea
									value={modalForm.attendees}
									onChange={(e) =>
										setModalForm((f) => ({ ...f, attendees: e.target.value }))
									}
									rows={4}
									className={`${modalFieldCls} resize-y min-h-[96px]`}
								/>
							</div>
						</div>

						<div className="flex border-t border-blue-200">
							<button
								type="button"
								disabled={modalSaveLoading}
								onClick={() => void handleModalSave()}
								className="flex-1 border-r border-blue-200 bg-blue-100 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-200 disabled:opacity-50"
							>
								{modalSaveLoading ? "저장 중…" : "저장"}
							</button>
							<button
								type="button"
								disabled={modalSaveLoading}
								onClick={(e) => handlePhotoRegister(e)}
								className="w-32 border-r border-blue-200 bg-white py-3 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								사진등록
							</button>
							<button
								type="button"
								disabled={modalSaveLoading}
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
