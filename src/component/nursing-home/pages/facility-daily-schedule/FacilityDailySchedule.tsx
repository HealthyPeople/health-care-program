"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCareGradeLabel } from "../../utils/careGrade";
import {
	buildFacilityDailySchedulePrintHtml,
	openPrintPreviewWindow,
} from "./facilityDailySchedulePrint";

/** F14110.SH_GU 구분 코드 */
const SH_GU_OPTIONS: { code: string; label: string }[] = [
	{ code: "1", label: "인지기능강화" },
	{ code: "2", label: "신체기능강화" },
	{ code: "3", label: "사회적응프로그램" },
	{ code: "4", label: "영양관리(CE)" },
	{ code: "5", label: "위생관리(CF)" },
	{ code: "9", label: "기타관리(CG)" },
];

const SH_GU_LABEL_BY_CODE = Object.fromEntries(SH_GU_OPTIONS.map((o) => [o.code, o.label]));

interface F14110Row {
	ANCD?: number | string;
	SH_DT: string;
	SH_SEQ: number;
	SH_STM?: string;
	SH_ETM?: string;
	SH_GU?: string;
	SH_GU_NM?: string;
	SH_TIT_CD?: string;
	SH_TIT_CD_4?: string;
	SH_TIT_NM?: string;
	SH_TIT_DSC?: string;
	SH_ADD?: string;
	SH_MAN0?: string;
	SH_MAN1?: string;
	SH_PNUM_DSC?: string;
}

interface ScheduleForm {
	planDate: string;
	copyDate: string;
	startTime: string;
	endTime: string;
	categoryCode: string;
	planTitle: string;
	leader: string;
	assistant: string;
	detail: string;
	place: string;
	attendees: string;
}

type UserInfo = { ancd?: string | number; [key: string]: unknown };

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

function normalizeTime(t: unknown): string {
	if (t == null || t === "") return "";
	const s = String(t).trim();
	if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
	if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
	return s.slice(0, 10);
}

function rowKey(row: Pick<F14110Row, "SH_DT" | "SH_SEQ">): string {
	return `${formatDateYmd(row.SH_DT)}|${row.SH_SEQ}`;
}

function emptyForm(planDate: string): ScheduleForm {
	return {
		planDate,
		copyDate: planDate,
		startTime: "09:00",
		endTime: "10:00",
		categoryCode: "1",
		planTitle: "",
		leader: "",
		assistant: "",
		detail: "",
		place: "",
		attendees: "",
	};
}

function mapRowToForm(row: F14110Row): ScheduleForm {
	const gu = String(row.SH_GU ?? "").trim() || "1";
	return {
		planDate: formatDateYmd(row.SH_DT),
		copyDate: formatDateYmd(row.SH_DT),
		startTime: normalizeTime(row.SH_STM) || "09:00",
		endTime: normalizeTime(row.SH_ETM) || "10:00",
		categoryCode: SH_GU_LABEL_BY_CODE[gu] ? gu : "1",
		planTitle: String(row.SH_TIT_NM ?? "").trim(),
		leader: String(row.SH_MAN0 ?? "").trim(),
		assistant: String(row.SH_MAN1 ?? "").trim(),
		detail: String(row.SH_TIT_DSC ?? "").trim(),
		place: String(row.SH_ADD ?? "").trim(),
		attendees: String(row.SH_PNUM_DSC ?? "").trim(),
	};
}

function buildPayload(form: ScheduleForm, shSeq?: number) {
	const label = SH_GU_LABEL_BY_CODE[form.categoryCode] ?? SH_GU_OPTIONS[0].label;
	return {
		action: shSeq != null ? "update" : "create",
		SH_DT: form.planDate,
		SH_SEQ: shSeq,
		SH_STM: form.startTime,
		SH_ETM: form.endTime,
		SH_GU: form.categoryCode,
		SH_GU_NM: label,
		SH_TIT_NM: form.planTitle,
		SH_TIT_DSC: form.detail,
		SH_ADD: form.place,
		SH_MAN0: form.leader,
		SH_MAN1: form.assistant,
		SH_PNUM_DSC: form.attendees,
	};
}

interface AttendeeCandidate {
	pnum: number;
	name: string;
	sex: string;
	grade: string;
}

function sexCode(v: unknown): string {
	const s = String(v ?? "").trim().toUpperCase();
	if (s === "M" || s === "1" || s === "남" || s === "남자") return "M";
	if (s === "F" || s === "2" || s === "여" || s === "여자") return "F";
	return s || "-";
}

function parseAttendeeNames(text: string): string[] {
	return String(text ?? "")
		.split(/[,，、/\n\r\t]+/)
		.map((n) => n.trim())
		.filter(Boolean);
}

function toggleNumberSet(set: Set<number>, key: number): Set<number> {
	const next = new Set(set);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	return next;
}

const transferBtnCls =
	"w-36 whitespace-pre-line rounded border border-blue-400 bg-blue-200 px-4 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50";

const modalLabelCls =
	"col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
const inputCls =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const readOnlyCls =
	"rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900 min-h-[38px] flex items-center";
const readOnlyTextareaCls =
	"rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900 whitespace-pre-wrap resize-none";
const actionBtnCls =
	"min-w-[5.5rem] rounded border border-blue-400 bg-blue-200 px-4 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed";

export default function FacilityDailySchedule() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [fromDate, setFromDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() - 14);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return formatDate(d);
	});

	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [centerName, setCenterName] = useState("");
	const [planDates, setPlanDates] = useState<string[]>([]);
	const [allRows, setAllRows] = useState<F14110Row[]>([]);
	const [selectedPlanDate, setSelectedPlanDate] = useState<string>(todayStr);
	const [selectedKey, setSelectedKey] = useState<string>("");
	const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
	const [form, setForm] = useState<ScheduleForm>(() => emptyForm(todayStr));
	const [isEditMode, setIsEditMode] = useState(false);
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [modalForm, setModalForm] = useState<ScheduleForm>(() => emptyForm(todayStr));
	const [modalSaveLoading, setModalSaveLoading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [listError, setListError] = useState<string | null>(null);

	const [rosterModalOpen, setRosterModalOpen] = useState(false);
	const [rosterTarget, setRosterTarget] = useState<"form" | "modal">("form");
	const [admittedMembers, setAdmittedMembers] = useState<AttendeeCandidate[]>([]);
	const [selectedAttendees, setSelectedAttendees] = useState<AttendeeCandidate[]>([]);
	const [pickedAvailable, setPickedAvailable] = useState<Set<number>>(new Set());
	const [pickedSelected, setPickedSelected] = useState<Set<number>>(new Set());
	const [rosterLoading, setRosterLoading] = useState(false);

	const fetchEpoch = useRef(0);

	const filteredScheduleRows = useMemo(() => {
		return allRows
			.filter((r) => formatDateYmd(r.SH_DT) === selectedPlanDate)
			.sort((a, b) => {
				const ta = normalizeTime(a.SH_STM);
				const tb = normalizeTime(b.SH_STM);
				if (ta !== tb) return ta.localeCompare(tb);
				return (a.SH_SEQ ?? 0) - (b.SH_SEQ ?? 0);
			});
	}, [allRows, selectedPlanDate]);

	const selectedRow = useMemo(
		() => filteredScheduleRows.find((r) => rowKey(r) === selectedKey) ?? null,
		[filteredScheduleRows, selectedKey],
	);

	const hasSelectedRow = Boolean(selectedKey && selectedRow);

	const loadCenterName = useCallback(async () => {
		try {
			const res = await fetch("/api/f00110", { credentials: "include", cache: "no-store" });
			const json = await res.json();
			if (res.ok && json?.success && Array.isArray(json.data) && json.data[0]?.ANNM) {
				setCenterName(String(json.data[0].ANNM).trim());
			}
		} catch {
			/* ignore */
		}
	}, []);

	const loadData = useCallback(async () => {
		const run = ++fetchEpoch.current;
		setLoading(true);
		setListError(null);
		try {
			const ancd = userInfo?.ancd;
			if (ancd == null) {
				setAllRows([]);
				setPlanDates([]);
				return;
			}
			const base = `/api/f14110?ancd=${encodeURIComponent(String(ancd))}`;
			const rangeQs = `&startDate=${encodeURIComponent(fromDate)}&endDate=${encodeURIComponent(toDate)}`;

			const [datesRes, rowsRes] = await Promise.all([
				fetch(`${base}&datesOnly=true${rangeQs}`, { credentials: "include", cache: "no-store" }),
				fetch(`${base}${rangeQs}`, { credentials: "include", cache: "no-store" }),
			]);

			const datesJson = await datesRes.json().catch(() => ({}));
			const rowsJson = await rowsRes.json().catch(() => ({}));

			if (run !== fetchEpoch.current) return;

			if (!datesRes.ok || !datesJson?.success) {
				throw new Error(datesJson?.error || "계획일자 조회 실패");
			}
			if (!rowsRes.ok || !rowsJson?.success) {
				throw new Error(rowsJson?.error || "일정 조회 실패");
			}

			const dates = (Array.isArray(datesJson.data) ? datesJson.data : [])
				.map((d: unknown) => formatDateYmd(d))
				.filter(Boolean);
			const rows = (Array.isArray(rowsJson.data) ? rowsJson.data : []) as F14110Row[];

			setPlanDates(dates);
			setAllRows(rows);

			setSelectedPlanDate((prev) => {
				if (dates.length === 0) return prev;
				if (dates.includes(prev)) return prev;
				setSelectedKey("");
				return dates[0];
			});
		} catch (e) {
			if (run !== fetchEpoch.current) return;
			setAllRows([]);
			setPlanDates([]);
			setListError(e instanceof Error ? e.message : "조회 오류");
		} finally {
			if (run === fetchEpoch.current) setLoading(false);
		}
	}, [userInfo?.ancd, fromDate, toDate]);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/api/auth/user-info", { credentials: "include" });
				const json = await res.json();
				if (json?.success && json?.data) setUserInfo(json.data as UserInfo);
			} catch {
				/* ignore */
			}
		})();
		loadCenterName();
	}, [loadCenterName]);

	useEffect(() => {
		if (!userInfo?.ancd) return;
		void loadData();
	}, [userInfo?.ancd, loadData]);

	useEffect(() => {
		if (isEditMode) return;
		if (!selectedRow) {
			setForm((prev) => ({
				...emptyForm(selectedPlanDate),
				copyDate: prev.copyDate || selectedPlanDate,
			}));
			return;
		}
		setForm(mapRowToForm(selectedRow));
	}, [selectedRow, selectedPlanDate, isEditMode]);

	const handleSelectRow = (key: string) => {
		setSelectedKey(key);
		setIsEditMode(false);
	};

	const handleSelectPlanDate = (date: string) => {
		setSelectedPlanDate(date);
		setSelectedKey("");
		setCheckedKeys(new Set());
		setIsEditMode(false);
	};

	const toggleCheckedKey = (key: string) => {
		setCheckedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const openAddModal = () => {
		setModalForm(emptyForm(selectedPlanDate));
		setAddModalOpen(true);
	};

	const closeAddModal = () => {
		if (modalSaveLoading) return;
		setAddModalOpen(false);
		setModalForm(emptyForm(selectedPlanDate));
	};

	const handleModify = () => {
		if (!hasSelectedRow) return;
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		setIsEditMode(false);
		if (selectedRow) {
			setForm(mapRowToForm(selectedRow));
		} else {
			setForm(emptyForm(selectedPlanDate));
		}
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const refreshAfterMutation = async (keepDate?: string, keepSeq?: number) => {
		await loadData();
		if (keepDate && keepSeq != null) {
			setSelectedPlanDate(keepDate);
			setSelectedKey(`${keepDate}|${keepSeq}`);
		}
	};

	const handleModalSave = async () => {
		if (!userInfo?.ancd) {
			alert("로그인 정보를 확인할 수 없습니다.");
			return;
		}
		if (!modalForm.planTitle.trim()) {
			alert("수행계획을 입력해 주세요.");
			return;
		}
		setModalSaveLoading(true);
		try {
			const res = await fetch("/api/f14110", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(buildPayload(modalForm)),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) throw new Error(json?.error || "등록 실패");
			const dt = formatDateYmd(json.SH_DT ?? modalForm.planDate);
			const seq = Number(json.SH_SEQ);
			alert("일정이 등록되었습니다.");
			closeAddModal();
			setIsEditMode(false);
			await refreshAfterMutation(dt, seq);
		} catch (e) {
			alert(e instanceof Error ? e.message : "등록 중 오류가 발생했습니다.");
		} finally {
			setModalSaveLoading(false);
		}
	};

	const handleSave = async () => {
		if (!isEditMode) {
			alert("수정 버튼을 눌러 편집 모드로 전환한 후 저장해 주세요.");
			return;
		}
		if (!selectedRow) {
			alert("수정할 일정을 선택해 주세요.");
			return;
		}
		if (!form.planTitle.trim()) {
			alert("수행계획을 입력해 주세요.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f14110", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(buildPayload(form, selectedRow.SH_SEQ)),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) throw new Error(json?.error || "수정 실패");
			alert("일정이 수정되었습니다.");
			setIsEditMode(false);
			await refreshAfterMutation(formatDateYmd(form.planDate), selectedRow.SH_SEQ);
		} catch (e) {
			alert(e instanceof Error ? e.message : "수정 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedRow) {
			alert("삭제할 일정을 선택해 주세요.");
			return;
		}
		if (!confirm("선택한 일정을 삭제하시겠습니까?")) return;

		setSaving(true);
		try {
			const res = await fetch("/api/f14110", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					action: "delete",
					SH_DT: formatDateYmd(selectedRow.SH_DT),
					SH_SEQ: selectedRow.SH_SEQ,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) throw new Error(json?.error || "삭제 실패");
			alert("일정이 삭제되었습니다.");
			setSelectedKey("");
			setIsEditMode(false);
			await loadData();
		} catch (e) {
			alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const availableMembers = useMemo(() => {
		const selectedIds = new Set(selectedAttendees.map((m) => m.pnum));
		return admittedMembers.filter((m) => !selectedIds.has(m.pnum));
	}, [admittedMembers, selectedAttendees]);

	const handleCopy = () => {
		alert("기능개발중입니다");
	};

	const handleInputSupport = () => {
		alert("기능개발중입니다");
	};

	const closeRosterModal = () => {
		if (rosterLoading) return;
		setRosterModalOpen(false);
		setPickedAvailable(new Set());
		setPickedSelected(new Set());
	};

	const rosterSourceForm = rosterTarget === "modal" ? modalForm : form;

	const handleGenerateList = async (target: "form" | "modal" = "form") => {
		if (target === "form" && !hasSelectedRow) {
			alert("명단을 생성할 일과를 선택해 주세요.");
			return;
		}
		const sourceAttendees = target === "modal" ? modalForm.attendees : form.attendees;
		setRosterTarget(target);
		setRosterLoading(true);
		setRosterModalOpen(true);
		setPickedAvailable(new Set());
		setPickedSelected(new Set());
		try {
			const res = await fetch("/api/f10010", { credentials: "include", cache: "no-store" });
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "수급자 목록을 불러오지 못했습니다.");
			}
			const list: AttendeeCandidate[] = (Array.isArray(json.data) ? json.data : [])
				.filter((row: Record<string, unknown>) => String(row.P_ST ?? "").trim() === "1")
				.map((row: Record<string, unknown>) => {
					const pnum = Number(row.PNUM);
					if (!Number.isFinite(pnum)) return null;
					return {
						pnum,
						name: String(row.P_NM ?? "").trim(),
						sex: sexCode(row.P_SEX),
						grade: formatCareGradeLabel(row.P_GRD),
					} as AttendeeCandidate;
				})
				.filter((m: AttendeeCandidate | null): m is AttendeeCandidate => m != null && Boolean(m.name))
				.sort((a: AttendeeCandidate, b: AttendeeCandidate) => a.name.localeCompare(b.name, "ko"));

			setAdmittedMembers(list);

			const existingNames = new Set(parseAttendeeNames(sourceAttendees));
			const preselected = list.filter((m) => existingNames.has(m.name));
			setSelectedAttendees(preselected);
		} catch (e) {
			alert(e instanceof Error ? e.message : "수급자 목록 조회 중 오류가 발생했습니다.");
			setAdmittedMembers([]);
			setSelectedAttendees([]);
			setRosterModalOpen(false);
		} finally {
			setRosterLoading(false);
		}
	};

	const addPickedAttendees = () => {
		if (!pickedAvailable.size) return;
		const moving = availableMembers.filter((m) => pickedAvailable.has(m.pnum));
		setSelectedAttendees((prev) =>
			[...prev, ...moving].sort((a, b) => a.name.localeCompare(b.name, "ko"))
		);
		setPickedAvailable(new Set());
	};

	const removePickedAttendees = () => {
		if (!pickedSelected.size) return;
		setSelectedAttendees((prev) => prev.filter((m) => !pickedSelected.has(m.pnum)));
		setPickedSelected(new Set());
	};

	const addAllAttendees = () => {
		setSelectedAttendees(
			[...admittedMembers].sort((a, b) => a.name.localeCompare(b.name, "ko"))
		);
		setPickedAvailable(new Set());
		setPickedSelected(new Set());
	};

	const removeAllAttendees = () => {
		setSelectedAttendees([]);
		setPickedAvailable(new Set());
		setPickedSelected(new Set());
	};

	const applyAttendeeRoster = () => {
		const text = selectedAttendees.map((m) => m.name).join(", ");
		if (rosterTarget === "modal") {
			setModalForm((p) => ({ ...p, attendees: text }));
		} else {
			setForm((p) => ({ ...p, attendees: text }));
			setIsEditMode(true);
		}
		closeRosterModal();
	};

	const handlePrint = () => {
		if (!selectedPlanDate) {
			alert("출력할 계획일자를 선택해 주세요.");
			return;
		}
		if (!checkedKeys.size) {
			alert("출력할 일과를 체크해 주세요.");
			return;
		}
		const printRows = filteredScheduleRows
			.filter((r) => checkedKeys.has(rowKey(r)))
			.map((r) => ({
				startTime: normalizeTime(r.SH_STM),
				endTime: normalizeTime(r.SH_ETM),
				category: String(r.SH_GU_NM ?? SH_GU_LABEL_BY_CODE[String(r.SH_GU ?? "")] ?? "").trim(),
				planTitle: String(r.SH_TIT_NM ?? "").trim(),
				planDetail: String(r.SH_TIT_DSC ?? "").trim(),
				place: String(r.SH_ADD ?? "").trim(),
				leader: String(r.SH_MAN0 ?? "").trim(),
				assistant: String(r.SH_MAN1 ?? "").trim(),
				attendees: String(r.SH_PNUM_DSC ?? "").trim(),
			}));

		if (!printRows.length) {
			alert("체크된 일과가 없습니다.");
			return;
		}

		const html = buildFacilityDailySchedulePrintHtml({
			planDate: selectedPlanDate,
			facilityName: centerName || "요양시설",
			rows: printRows,
		});
		openPrintPreviewWindow(html);
	};

	const displayPlanDates =
		planDates.length > 0
			? planDates
			: selectedPlanDate
				? [selectedPlanDate]
				: [];

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						센터 일과표
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								조회 기간
							</span>
							<input
								type="date"
								value={fromDate}
								onChange={(e) => setFromDate(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
							<span className="px-1 text-blue-900/70">~</span>
							<input
								type="date"
								value={toDate}
								onChange={(e) => setToDate(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>

						<button
							type="button"
							onClick={openAddModal}
							disabled={saving || modalSaveLoading}
							className="w-44 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							추 가
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

				{listError && (
					<div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
						{listError}
					</div>
				)}

				<div className="grid grid-cols-12 gap-3">
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							계획일자
						</div>
						<div className="max-h-[260px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{displayPlanDates.length === 0 ? (
										<tr>
											<td className="px-3 py-6 text-center text-blue-900/60">일자 없음</td>
										</tr>
									) : (
										displayPlanDates.map((date) => {
											const isSelected = date === selectedPlanDate;
											return (
												<tr
													key={date}
													onClick={() => handleSelectPlanDate(date)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="px-3 py-2">{date}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="col-span-12 lg:col-span-10 flex flex-col gap-2">
						<div className="flex justify-end">
							<button
								type="button"
								onClick={handlePrint}
								disabled={!checkedKeys.size}
								className="rounded border border-blue-400 bg-blue-200 px-5 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								출 력{checkedKeys.size > 0 ? ` (${checkedKeys.size})` : ""}
							</button>
						</div>
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden flex-1">
						<div className="max-h-[260px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="w-12 border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											선택
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											시작시간
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											종료시간
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											구분
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											수행계획
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">수행계획상세</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="px-3 py-10 text-center text-blue-900/60">
												조회 중...
											</td>
										</tr>
									) : filteredScheduleRows.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-3 py-10 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										filteredScheduleRows.map((r) => {
											const key = rowKey(r);
											const isSelected = key === selectedKey;
											const isChecked = checkedKeys.has(key);
											const categoryLabel =
												String(r.SH_GU_NM ?? "").trim() ||
												SH_GU_LABEL_BY_CODE[String(r.SH_GU ?? "")] ||
												"";
											return (
												<tr
													key={key}
													onClick={() => handleSelectRow(key)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-2 py-2 text-center">
														<input
															type="checkbox"
															checked={isChecked}
															onClick={(e) => e.stopPropagation()}
															onChange={() => toggleCheckedKey(key)}
															className="h-4 w-4 accent-blue-600"
															aria-label={`${normalizeTime(r.SH_STM)} 일과 출력 선택`}
														/>
													</td>
													<td className="border-r border-blue-100 px-3 py-2">
														{normalizeTime(r.SH_STM)}
													</td>
													<td className="border-r border-blue-100 px-3 py-2">
														{normalizeTime(r.SH_ETM)}
													</td>
													<td className="border-r border-blue-100 px-3 py-2">{categoryLabel}</td>
													<td className="border-r border-blue-100 px-3 py-2">
														{r.SH_TIT_NM}
													</td>
													<td className="px-3 py-2">{r.SH_TIT_DSC}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="p-3 space-y-2 min-h-[280px]">
						{!hasSelectedRow ? (
							<p className="py-16 text-center text-sm text-blue-900/60">목록에서 일정을 선택하세요.</p>
						) : (
						<>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									계획일자
								</span>
								<input
									type="date"
									value={form.planDate}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, planDate: e.target.value }))}
									className={`col-span-3 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									복사일자
								</span>
								<input
									type="date"
									value={form.copyDate}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, copyDate: e.target.value }))}
									className={`col-span-3 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
								<div className="col-span-2" />
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									구분
								</span>
								<select
									value={form.categoryCode}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, categoryCode: e.target.value }))}
									className={`col-span-3 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								>
									{SH_GU_OPTIONS.map((opt) => (
										<option key={opt.code} value={opt.code}>
											{opt.label}
										</option>
									))}
								</select>

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									시작시간
								</span>
								<input
									type="time"
									value={form.startTime}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
									className={`col-span-2 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									종료시간
								</span>
								<input
									type="time"
									value={form.endTime}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
									className={`col-span-1 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									수행계획
								</span>
								<input
									value={form.planTitle}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, planTitle: e.target.value }))}
									className={`col-span-4 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									진행자
								</span>
								<input
									value={form.leader}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, leader: e.target.value }))}
									className={`col-span-1 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
								<div className="col-span-1" />
								<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									보조진행자
								</span>
								<input
									value={form.assistant}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, assistant: e.target.value }))}
									className={`col-span-1 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									상세내역
								</span>
								<textarea
									value={form.detail}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
									rows={3}
									className={`col-span-10 ${inputCls} resize-none disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									장소
								</span>
								<input
									value={form.place}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
									className={`col-span-10 ${inputCls} disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									참석자
								</span>
								<textarea
									value={form.attendees}
									disabled={!isEditMode}
									onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
									rows={4}
									className={`col-span-10 ${inputCls} resize-none disabled:bg-gray-50 disabled:cursor-not-allowed`}
								/>
							</div>
						</>
						)}
					</div>

					<div className="border-t border-blue-200 bg-blue-50/50 px-3 py-3">
						<div className="flex flex-wrap items-center justify-center gap-2">
							{!isEditMode ? (
								<>
							<button
								type="button"
								onClick={openAddModal}
								disabled={saving || modalSaveLoading}
								className={actionBtnCls}
							>
								추 가
							</button>
							<button
								type="button"
								onClick={handleModify}
								disabled={!hasSelectedRow || saving}
								className={actionBtnCls}
							>
								수 정
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={!hasSelectedRow || saving}
								className={actionBtnCls}
							>
								삭 제
							</button>
							{/* <button
								type="button"
								onClick={handleCopy}
								disabled={saving}
								className={actionBtnCls}
							>
								복 사
							</button> */}
							{/* <button
								type="button"
								onClick={handleInputSupport}
								disabled={saving}
								className={actionBtnCls}
							>
								입력항목지원
							</button> */}
							<button
								type="button"
								onClick={() => void handleGenerateList("form")}
								disabled={!hasSelectedRow || saving || rosterLoading}
								className={actionBtnCls}
							>
								명단 생성
							</button>
								</>
							) : (
								<>
								<button type="button" onClick={handleCancelEdit} disabled={saving} className="min-w-[5.5rem] rounded border border-gray-400 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50">취 소</button>
								<button type="button" onClick={() => void handleSave()} disabled={saving} className="min-w-[5.5rem] rounded border border-blue-500 bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">저 장</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{addModalOpen ? (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="presentation" onClick={closeAddModal}>
					<div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border-2 border-blue-300 bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="schedule-create-title" onClick={(e) => e.stopPropagation()}>
						<div className="border-b border-blue-200 bg-blue-50 px-4 py-3"><h2 id="schedule-create-title" className="text-center text-lg font-semibold text-blue-900">센터 일과표 등록</h2></div>
						<div className="overflow-y-auto space-y-2 p-4">
							<div className="grid grid-cols-12 gap-2 items-center"><span className={modalLabelCls}>계획일자</span><input type="date" value={modalForm.planDate} onChange={(e) => setModalForm((p) => ({ ...p, planDate: e.target.value }))} className={`col-span-4 ${inputCls}`} /></div>
							<div className="grid grid-cols-12 gap-2 items-center"><span className={modalLabelCls}>구분</span><select value={modalForm.categoryCode} onChange={(e) => setModalForm((p) => ({ ...p, categoryCode: e.target.value }))} className={`col-span-4 ${inputCls}`}>{SH_GU_OPTIONS.map((opt) => (<option key={opt.code} value={opt.code}>{opt.label}</option>))}</select><span className={modalLabelCls}>시작</span><input type="time" value={modalForm.startTime} onChange={(e) => setModalForm((p) => ({ ...p, startTime: e.target.value }))} className={`col-span-2 ${inputCls}`} /><span className={modalLabelCls}>종료</span><input type="time" value={modalForm.endTime} onChange={(e) => setModalForm((p) => ({ ...p, endTime: e.target.value }))} className={`col-span-2 ${inputCls}`} /></div>
							<div className="grid grid-cols-12 gap-2 items-center"><span className={modalLabelCls}>수행계획</span><input value={modalForm.planTitle} onChange={(e) => setModalForm((p) => ({ ...p, planTitle: e.target.value }))} className={`col-span-10 ${inputCls}`} /></div>
							<div className="grid grid-cols-12 gap-2 items-center"><span className={modalLabelCls}>진행자</span><input value={modalForm.leader} onChange={(e) => setModalForm((p) => ({ ...p, leader: e.target.value }))} className={`col-span-3 ${inputCls}`} /><span className={modalLabelCls}>보조진행자</span><input value={modalForm.assistant} onChange={(e) => setModalForm((p) => ({ ...p, assistant: e.target.value }))} className={`col-span-3 ${inputCls}`} /></div>
							<div className="grid grid-cols-12 gap-2"><span className={`${modalLabelCls} self-start`}>상세내역</span><textarea value={modalForm.detail} onChange={(e) => setModalForm((p) => ({ ...p, detail: e.target.value }))} rows={3} className={`col-span-10 ${inputCls} resize-none`} /></div>
							<div className="grid grid-cols-12 gap-2 items-center"><span className={modalLabelCls}>장소</span><input value={modalForm.place} onChange={(e) => setModalForm((p) => ({ ...p, place: e.target.value }))} className={`col-span-10 ${inputCls}`} /></div>
							<div className="grid grid-cols-12 gap-2">
								<span className={`${modalLabelCls} self-start`}>참석자</span>
								<div className="col-span-10 space-y-2">
									<textarea
										value={modalForm.attendees}
										onChange={(e) => setModalForm((p) => ({ ...p, attendees: e.target.value }))}
										rows={4}
										className={`w-full ${inputCls} resize-none`}
									/>
									<div className="flex justify-end">
										<button
											type="button"
											onClick={() => void handleGenerateList("modal")}
											disabled={rosterLoading || modalSaveLoading}
											className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
										>
											명단 생성
										</button>
									</div>
								</div>
							</div>
						</div>
						<div className="flex justify-center gap-3 border-t border-blue-200 bg-blue-50/50 px-4 py-3"><button type="button" onClick={closeAddModal} disabled={modalSaveLoading} className="min-w-24 rounded border border-gray-400 bg-gray-100 px-6 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50">취 소</button><button type="button" onClick={() => void handleModalSave()} disabled={modalSaveLoading} className="min-w-24 rounded border border-blue-500 bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">{modalSaveLoading ? "저장중..." : "저 장"}</button></div>
					</div>
				</div>
			) : null}

			{rosterModalOpen ? (
				<div
					className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4"
					role="presentation"
					onClick={closeRosterModal}
				>
					<div
						className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border-2 border-blue-300 bg-white shadow-xl"
						role="dialog"
						aria-modal="true"
						aria-labelledby="attendee-roster-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3">
							<h2 id="attendee-roster-title" className="text-lg font-semibold text-blue-900">
								참석 예정자 명단 작성
							</h2>
							<div className="flex flex-wrap items-center gap-2">
								<span className="rounded border border-blue-300 bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-900">
									계획일자
								</span>
								<input
									type="date"
									readOnly
									value={rosterSourceForm.planDate}
									className="rounded border border-blue-300 bg-gray-50 px-3 py-1.5 text-sm text-blue-900"
								/>
								<span className="rounded border border-blue-300 bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-900">
									서비스시간
								</span>
								<input
									type="time"
									readOnly
									value={rosterSourceForm.startTime}
									className="rounded border border-blue-300 bg-gray-50 px-3 py-1.5 text-sm text-blue-900"
								/>
								<span className="text-blue-900/70">-</span>
								<input
									type="time"
									readOnly
									value={rosterSourceForm.endTime}
									className="rounded border border-blue-300 bg-gray-50 px-3 py-1.5 text-sm text-blue-900"
								/>
							</div>
							<button
								type="button"
								onClick={closeRosterModal}
								className="ml-auto rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>

						<div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden p-4">
							<div className="col-span-12 lg:col-span-5 flex min-h-0 flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
								<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
									센터 수급자 전체 명단
								</div>
								<div className="min-h-0 flex-1 overflow-auto">
									<table className="w-full text-sm">
										<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
											<tr>
												<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
													수급자
												</th>
												<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
													성별
												</th>
												<th className="px-3 py-2 text-left font-semibold text-blue-900">요양등급</th>
											</tr>
										</thead>
										<tbody>
											{rosterLoading ? (
												<tr>
													<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
														조회 중…
													</td>
												</tr>
											) : availableMembers.length === 0 ? (
												<tr>
													<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
														입소 수급자가 없습니다.
													</td>
												</tr>
											) : (
												availableMembers.map((m) => {
													const isPicked = pickedAvailable.has(m.pnum);
													return (
														<tr
															key={m.pnum}
															onClick={() =>
																setPickedAvailable((s) => toggleNumberSet(s, m.pnum))
															}
															className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
																isPicked ? "bg-blue-100" : ""
															}`}
														>
															<td className="border-r border-blue-100 px-3 py-2">{m.name}</td>
															<td className="border-r border-blue-100 px-3 py-2">{m.sex}</td>
															<td className="px-3 py-2">{m.grade}</td>
														</tr>
													);
												})
											)}
										</tbody>
									</table>
								</div>
							</div>

							<div className="col-span-12 lg:col-span-2 flex flex-col items-center justify-center gap-3 py-2">
								<button
									type="button"
									onClick={addPickedAttendees}
									disabled={!pickedAvailable.size}
									className={transferBtnCls}
								>
									추가 =&gt;
								</button>
								<button
									type="button"
									onClick={removePickedAttendees}
									disabled={!pickedSelected.size}
									className={transferBtnCls}
								>
									&lt;= 삭제
								</button>
								<button
									type="button"
									onClick={addAllAttendees}
									disabled={!availableMembers.length}
									className={transferBtnCls}
								>
									{"전체추가\n=>"}
								</button>
								<button
									type="button"
									onClick={removeAllAttendees}
									disabled={!selectedAttendees.length}
									className={transferBtnCls}
								>
									{"<=\n전체삭제"}
								</button>
								<button
									type="button"
									onClick={applyAttendeeRoster}
									className="w-36 rounded border border-blue-500 bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
								>
									명단 생성
								</button>
							</div>

							<div className="col-span-12 lg:col-span-5 flex min-h-0 flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
								<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
									선택한 참석 예정자 명단
								</div>
								<div className="min-h-0 flex-1 overflow-auto">
									<table className="w-full text-sm">
										<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
											<tr>
												<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
													수급자
												</th>
												<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
													성별
												</th>
												<th className="px-3 py-2 text-left font-semibold text-blue-900">요양등급</th>
											</tr>
										</thead>
										<tbody>
											{selectedAttendees.length === 0 ? (
												<tr>
													<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
														선택된 참석자가 없습니다.
													</td>
												</tr>
											) : (
												selectedAttendees.map((m) => {
													const isPicked = pickedSelected.has(m.pnum);
													return (
														<tr
															key={m.pnum}
															onClick={() =>
																setPickedSelected((s) => toggleNumberSet(s, m.pnum))
															}
															className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
																isPicked ? "bg-blue-100" : ""
															}`}
														>
															<td className="border-r border-blue-100 px-3 py-2">{m.name}</td>
															<td className="border-r border-blue-100 px-3 py-2">{m.sex}</td>
															<td className="px-3 py-2">{m.grade}</td>
														</tr>
													);
												})
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
