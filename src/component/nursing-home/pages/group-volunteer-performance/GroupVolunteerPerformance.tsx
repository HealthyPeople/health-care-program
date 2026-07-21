"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	buildGroupVolunteerContentBatchPrintHtml,
	buildGroupVolunteerListPrintHtml,
	openPrintPreviewWindow,
	type GroupVolunteerPrintData,
} from "./groupVolunteerPerformancePrint";

interface GroupRow {
	gSeq: number;
	name: string;
	contact: string;
	phone1: string;
	phone2: string;
	etc: string;
	indt: string;
}

interface PerformanceContent {
	bath: boolean; // G_SRV01 목욕
	beauty: boolean; // G_SRV02 이미용
	programAssist: boolean; // G_SRV03 프로그램보조
	programOps: boolean; // G_SRV04 프로그램운영
	other: boolean; // G_SRV09
	otherText: string; // G_SRV09_NM
}

interface PerformanceRow {
	gSeq: number;
	date: string;
	startTime: string;
	endTime: string;
	volunteers: string;
	roster: string;
	content: PerformanceContent;
	etc: string;
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
};

type GroupFormState = {
	gSeq: number | null;
	name: string;
	contact: string;
	phone1: string;
	phone2: string;
	etc: string;
	indt: string;
};

const emptyContent = (): PerformanceContent => ({
	bath: false,
	beauty: false,
	programAssist: false,
	programOps: false,
	other: false,
	otherText: "",
});

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function flagOn(v: unknown): boolean {
	const s = String(v ?? "").trim().toUpperCase();
	return s === "1" || s === "Y";
}

function mapGroup(row: Record<string, unknown>): GroupRow | null {
	const gSeq = row.G_SEQ != null && row.G_SEQ !== "" ? Number(row.G_SEQ) : NaN;
	if (!Number.isFinite(gSeq)) return null;
	return {
		gSeq,
		name: String(row.G_CIRCLE ?? "").trim(),
		contact: String(row.G_ASSI_NM ?? "").trim(),
		phone1: String(row.G_PHONE1 ?? "").trim(),
		phone2: String(row.G_PHONE2 ?? "").trim(),
		etc: String(row.ETC ?? "").trim(),
		indt: String(row.INDT ?? "").trim().slice(0, 10),
	};
}

function mapPerformance(row: Record<string, unknown>): PerformanceRow | null {
	const gSeq = row.G_SEQ != null && row.G_SEQ !== "" ? Number(row.G_SEQ) : NaN;
	const date = String(row.G_SDT ?? "").trim().slice(0, 10);
	if (!Number.isFinite(gSeq) || !date) return null;
	return {
		gSeq,
		date,
		startTime: String(row.G_STM ?? "").trim().slice(0, 5),
		endTime: String(row.G_ETM ?? "").trim().slice(0, 5),
		volunteers: row.G_CNT != null && row.G_CNT !== "" ? String(row.G_CNT) : "",
		roster: String(row.G_TAKE_NM ?? "").trim(),
		content: {
			bath: flagOn(row.G_SRV01),
			beauty: flagOn(row.G_SRV02),
			programAssist: flagOn(row.G_SRV03),
			programOps: flagOn(row.G_SRV04),
			other: flagOn(row.G_SRV09),
			otherText: String(row.G_SRV09_NM ?? "").trim(),
		},
		etc: String(row.ETC ?? "").trim(),
	};
}

function emptyForm(gSeq: number | null, today: string): PerformanceRow {
	return {
		gSeq: gSeq ?? 0,
		date: today,
		startTime: "",
		endTime: "",
		volunteers: "",
		roster: "",
		content: emptyContent(),
		etc: "",
	};
}

export default function GroupVolunteerPerformance() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [facilityName, setFacilityName] = useState("");
	const [fromDate, setFromDate] = useState<string>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState<string>(() => todayStr);
	const [groupNameQuery, setGroupNameQuery] = useState("");

	const [groups, setGroups] = useState<GroupRow[]>([]);
	const [selectedGroupSeq, setSelectedGroupSeq] = useState<number | null>(null);
	const [performances, setPerformances] = useState<PerformanceRow[]>([]);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
	const [checkedGroups, setCheckedGroups] = useState<Set<number>>(new Set());

	const [form, setForm] = useState<PerformanceRow>(() => emptyForm(null, todayStr));
	const [loading, setLoading] = useState(false);
	const [perfLoading, setPerfLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [groupModalOpen, setGroupModalOpen] = useState(false);
	const [groupForm, setGroupForm] = useState<GroupFormState>({
		gSeq: null,
		name: "",
		contact: "",
		phone1: "",
		phone2: "",
		etc: "",
		indt: todayStr,
	});
	const [groupSaving, setGroupSaving] = useState(false);

	const selectedGroup = useMemo(
		() => groups.find((g) => g.gSeq === selectedGroupSeq) || null,
		[groups, selectedGroupSeq]
	);

	const selectedPerformance = useMemo(
		() => performances.find((p) => p.date === selectedDate) || null,
		[performances, selectedDate]
	);

	const loadGroups = useCallback(
		async (ancd: string | number, nameFilter = "") => {
			const qs = new URLSearchParams({ ancd: String(ancd) });
			const q = nameFilter.trim();
			if (q) qs.set("name", q);
			const res = await fetch(`/api/f71030?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "단체 목록을 불러오지 못했습니다.");
			}
			const list: GroupRow[] = (Array.isArray(json.data) ? json.data : [])
				.map((row: Record<string, unknown>) => mapGroup(row))
				.filter((g: GroupRow | null): g is GroupRow => g != null);
			setGroups(list);
			setCheckedGroups((prev) => {
				const next = new Set<number>();
				prev.forEach((seq) => {
					if (list.some((g: GroupRow) => g.gSeq === seq)) next.add(seq);
				});
				return next;
			});
			setSelectedGroupSeq((prev) => {
				if (prev != null && list.some((g: GroupRow) => g.gSeq === prev)) return prev;
				return list[0]?.gSeq ?? null;
			});
		},
		[]
	);

	const loadPerformances = useCallback(
		async (ancd: string | number, gSeq: number, from: string, to: string) => {
			setPerfLoading(true);
			try {
				const qs = new URLSearchParams({
					ancd: String(ancd),
					gSeq: String(gSeq),
				});
				if (from) qs.set("startDate", from);
				if (to) qs.set("endDate", to);
				const res = await fetch(`/api/f71031?${qs.toString()}`, {
					credentials: "include",
					cache: "no-store",
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json?.success) {
					throw new Error(json?.error || "봉사실적을 불러오지 못했습니다.");
				}
				const rawList = Array.isArray(json.data) ? json.data : [];
				const list: PerformanceRow[] = [];
				for (const raw of rawList) {
					const mapped = mapPerformance(raw as Record<string, unknown>);
					if (mapped) list.push(mapped);
				}
				list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
				setPerformances(list);
				setCheckedDates(new Set());
				setSelectedDate((prev) => {
					if (prev && list.some((row) => row.date === prev)) return prev;
					return list[0]?.date || "";
				});
			} catch (err) {
				console.error(err);
				setPerformances([]);
				setCheckedDates(new Set());
				setSelectedDate("");
				alert(err instanceof Error ? err.message : "봉사실적 조회 중 오류가 발생했습니다.");
			} finally {
				setPerfLoading(false);
			}
		},
		[]
	);

	const initializePage = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const userRes = await fetch("/api/auth/user-info", { credentials: "include" });
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
			setFacilityName(user.annm ? String(user.annm) : "");
			await loadGroups(loginAncd, "");
		} catch (err) {
			console.error(err);
			setLoadError(err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다.");
			setGroups([]);
		} finally {
			setLoading(false);
		}
	}, [loadGroups]);

	useEffect(() => {
		void initializePage();
	}, [initializePage]);

	useEffect(() => {
		if (sessionAncd == null || selectedGroupSeq == null) {
			setPerformances([]);
			setSelectedDate("");
			setCheckedDates(new Set());
			setForm(emptyForm(null, todayStr));
			return;
		}
		void loadPerformances(sessionAncd, selectedGroupSeq, fromDate, toDate);
	}, [sessionAncd, selectedGroupSeq, fromDate, toDate, loadPerformances, todayStr]);

	useEffect(() => {
		if (!selectedPerformance) {
			setForm(emptyForm(selectedGroupSeq, todayStr));
			return;
		}
		setForm({ ...selectedPerformance, content: { ...selectedPerformance.content } });
	}, [selectedPerformance, selectedGroupSeq, todayStr]);

	const handleSearch = async () => {
		if (sessionAncd == null) return;
		setLoading(true);
		setLoadError(null);
		try {
			await loadGroups(sessionAncd, groupNameQuery);
		} catch (err) {
			console.error(err);
			setLoadError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const openAddGroup = () => {
		setGroupForm({
			gSeq: null,
			name: groupNameQuery.trim(),
			contact: "",
			phone1: "",
			phone2: "",
			etc: "",
			indt: todayStr,
		});
		setGroupModalOpen(true);
	};

	const openEditGroup = (group?: GroupRow | null) => {
		const target = group ?? selectedGroup;
		if (!target) {
			alert("수정할 단체를 선택해주세요.");
			return;
		}
		setSelectedGroupSeq(target.gSeq);
		setGroupForm({
			gSeq: target.gSeq,
			name: target.name,
			contact: target.contact,
			phone1: target.phone1,
			phone2: target.phone2,
			etc: target.etc,
			indt: target.indt || todayStr,
		});
		setGroupModalOpen(true);
	};

	const handleDeleteGroup = async (group: GroupRow) => {
		if (sessionAncd == null || groupSaving) return;
		if (!confirm(`「${group.name}」 단체를 삭제하시겠습니까?`)) return;
		setGroupSaving(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				gSeq: String(group.gSeq),
			});
			const res = await fetch(`/api/f71030?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "단체 삭제에 실패했습니다.");
			}
			alert("단체가 삭제되었습니다.");
			setCheckedGroups((prev) => {
				const next = new Set(prev);
				next.delete(group.gSeq);
				return next;
			});
			await loadGroups(sessionAncd, groupNameQuery);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "단체 삭제 중 오류가 발생했습니다.");
		} finally {
			setGroupSaving(false);
		}
	};

	const handleSaveGroup = async () => {
		if (sessionAncd == null || groupSaving) return;
		if (!groupForm.name.trim()) {
			alert("단체명을 입력해주세요.");
			return;
		}
		setGroupSaving(true);
		try {
			const res = await fetch("/api/f71030", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: sessionAncd,
					G_SEQ: groupForm.gSeq,
					G_CIRCLE: groupForm.name.trim(),
					G_ASSI_NM: groupForm.contact.trim() || null,
					G_PHONE1: groupForm.phone1.trim() || null,
					G_PHONE2: groupForm.phone2.trim() || null,
					ETC: groupForm.etc.trim() || null,
					INDT: groupForm.indt || todayStr,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "단체 정보 저장에 실패했습니다.");
			}
			alert(groupForm.gSeq == null ? "단체가 등록되었습니다." : "단체 정보가 수정되었습니다.");
			setGroupModalOpen(false);
			await loadGroups(sessionAncd, groupNameQuery);
			if (json.G_SEQ != null) setSelectedGroupSeq(Number(json.G_SEQ));
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "단체 저장 중 오류가 발생했습니다.");
		} finally {
			setGroupSaving(false);
		}
	};

	const handleNewForm = () => {
		setSelectedDate("");
		setForm(emptyForm(selectedGroupSeq, todayStr));
	};

	const handleSavePerformance = async () => {
		if (sessionAncd == null || selectedGroupSeq == null || saving) return;
		if (!form.date) {
			alert("봉사일자를 입력해주세요.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f71031", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: sessionAncd,
					G_SEQ: selectedGroupSeq,
					G_SDT: form.date,
					G_STM: form.startTime || null,
					G_ETM: form.endTime || null,
					G_CNT: form.volunteers.trim() === "" ? null : Number(form.volunteers),
					G_TAKE_NM: form.roster.trim() || null,
					G_SRV01: form.content.bath ? "1" : "0",
					G_SRV02: form.content.beauty ? "1" : "0",
					G_SRV03: form.content.programAssist ? "1" : "0",
					G_SRV04: form.content.programOps ? "1" : "0",
					G_SRV09: form.content.other ? "1" : "0",
					G_SRV09_NM: form.content.other ? form.content.otherText.trim() || null : null,
					ETC: form.etc.trim() || null,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "봉사실적 저장에 실패했습니다.");
			}
			alert("봉사실적이 저장되었습니다.");
			await loadPerformances(sessionAncd, selectedGroupSeq, fromDate, toDate);
			setSelectedDate(form.date);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDeletePerformance = async () => {
		if (sessionAncd == null || selectedGroupSeq == null || !selectedDate || saving) return;
		if (!confirm(`봉사일자 [${selectedDate}] 실적을 삭제하시겠습니까?`)) return;
		setSaving(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				gSeq: String(selectedGroupSeq),
				gSdt: selectedDate,
			});
			const res = await fetch(`/api/f71031?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "봉사실적 삭제에 실패했습니다.");
			}
			alert("봉사실적이 삭제되었습니다.");
			await loadPerformances(sessionAncd, selectedGroupSeq, fromDate, toDate);
			handleNewForm();
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const buildPrintDataFromPerformance = (p: PerformanceRow): GroupVolunteerPrintData | null => {
		if (!selectedGroup) return null;
		return {
			facilityName,
			groupName: selectedGroup.name,
			contact: selectedGroup.contact,
			phone1: selectedGroup.phone1,
			phone2: selectedGroup.phone2,
			date: p.date,
			startTime: p.startTime,
			endTime: p.endTime,
			volunteers: p.volunteers,
			roster: p.roster,
			services: { ...p.content },
			etc: p.etc,
		};
	};

	const toggleCheckedDate = (date: string) => {
		setCheckedDates((prev) => {
			const next = new Set(prev);
			if (next.has(date)) next.delete(date);
			else next.add(date);
			return next;
		});
	};

	const toggleCheckedGroup = (gSeq: number) => {
		setCheckedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(gSeq)) next.delete(gSeq);
			else next.add(gSeq);
			return next;
		});
	};

	const handlePrintContent = () => {
		if (!selectedGroup) {
			alert("단체를 선택해주세요.");
			return;
		}
		if (!checkedDates.size) {
			alert("출력할 봉사일자를 체크해주세요.");
			return;
		}
		const list = performances
			.filter((p) => checkedDates.has(p.date))
			.map(buildPrintDataFromPerformance)
			.filter((d): d is GroupVolunteerPrintData => d != null);
		if (!list.length) {
			alert("체크된 봉사일자에 해당하는 실적이 없습니다.");
			return;
		}
		openPrintPreviewWindow(buildGroupVolunteerContentBatchPrintHtml(list));
	};

	const handlePrintGroupList = () => {
		if (!checkedGroups.size) {
			alert("출력할 단체를 체크해주세요.");
			return;
		}
		const rows = groups
			.filter((g) => checkedGroups.has(g.gSeq))
			.map((g) => ({
				name: g.name,
				contact: g.contact,
				phone: [g.phone1, g.phone2].filter((x) => String(x ?? "").trim()).join(" / "),
				etc: g.etc,
				indt: g.indt,
			}));
		if (!rows.length) {
			alert("체크된 단체가 없습니다.");
			return;
		}
		openPrintPreviewWindow(buildGroupVolunteerListPrintHtml(rows, todayStr));
	};

	const labelClass =
		"col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
	const inputClass =
		"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex flex-wrap items-stretch gap-3">
					<div className="flex-1 min-w-[240px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						단체봉사실적관리
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								기 간
							</span>
							<input
								type="date"
								value={fromDate}
								onChange={(e) => setFromDate(e.target.value)}
								className={inputClass}
							/>
							<span className="px-1 text-blue-900/70">~</span>
							<input
								type="date"
								value={toDate}
								onChange={(e) => setToDate(e.target.value)}
								className={inputClass}
							/>
						</div>

						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								단체명
							</span>
							<input
								value={groupNameQuery}
								onChange={(e) => setGroupNameQuery(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
								className={`w-40 ${inputClass}`}
							/>
							<button
								type="button"
								onClick={openAddGroup}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								단체정보 추가
							</button>
						</div>

						{/* <button
							type="button"
							onClick={() => void handleSearch()}
							disabled={loading || sessionAncd == null}
							className="w-32 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							검색
						</button> */}

					</div>
				</div>

				{loading ? <p className="text-sm text-blue-800/70">데이터를 불러오는 중…</p> : null}
				{!loading && loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}

				{/* 상단 테이블 F71030 */}
				<div className="space-y-2">
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handlePrintGroupList}
							disabled={!checkedGroups.size}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							봉사자출력{checkedGroups.size > 0 ? ` (${checkedGroups.size})` : ""}
						</button>
					</div>
					<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="max-h-[240px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="w-12 border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											선택
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											단체명
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											연락담당자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											전화번호1
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">전화번호2</th>
									</tr>
								</thead>
								<tbody>
									{groups.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-3 py-10 text-center text-blue-900/60">
												{loading ? "조회 중…" : "단체 데이터가 없습니다."}
											</td>
										</tr>
									) : (
										groups.map((g) => {
											const isSelected = g.gSeq === selectedGroupSeq;
											const isChecked = checkedGroups.has(g.gSeq);
											return (
												<tr
													key={g.gSeq}
													onClick={() => {
														setSelectedGroupSeq(g.gSeq);
														setSelectedDate("");
														setCheckedDates(new Set());
													}}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-2 py-2 text-center">
														<input
															type="checkbox"
															checked={isChecked}
															onClick={(e) => e.stopPropagation()}
															onChange={() => toggleCheckedGroup(g.gSeq)}
															className="h-4 w-4 accent-blue-600"
															aria-label={`${g.name} 출력 선택`}
														/>
													</td>
													<td className="border-r border-blue-100 px-3 py-2">
														<div className="flex items-center gap-2">
															<span className="min-w-0 flex-1">{g.name}</span>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	openEditGroup(g);
																}}
																className="shrink-0 rounded border border-blue-400 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900 hover:bg-blue-200"
															>
																수정
															</button>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	void handleDeleteGroup(g);
																}}
																disabled={groupSaving}
																className="shrink-0 rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
															>
																삭제
															</button>
														</div>
													</td>
													<td className="border-r border-blue-100 px-3 py-2">{g.contact}</td>
													<td className="border-r border-blue-100 px-3 py-2">{g.phone1}</td>
													<td className="px-3 py-2">{g.phone2}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 하단 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌측 날짜 리스트 F71031 */}
					<div className="col-span-12 lg:col-span-2 flex flex-col gap-2">
						<button
							type="button"
							onClick={handlePrintContent}
							disabled={!checkedDates.size}
							className="w-full rounded border border-blue-400 bg-blue-200 px-3 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							봉사내용출력{checkedDates.size > 0 ? ` (${checkedDates.size})` : ""}
						</button>
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden flex-1">
							<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
								봉사일자
							</div>
							<div className="max-h-[340px] overflow-auto">
								<table className="w-full text-sm">
									<tbody>
										{perfLoading ? (
											<tr>
												<td className="px-3 py-10 text-center text-blue-900/60">조회 중…</td>
											</tr>
										) : performances.length === 0 ? (
											<tr>
												<td className="px-3 py-10 text-center text-blue-900/60">데이터가 없습니다.</td>
											</tr>
										) : (
											performances.map((p) => {
												const isSelected = p.date === selectedDate;
												const isChecked = checkedDates.has(p.date);
												return (
													<tr
														key={`${p.gSeq}-${p.date}`}
														onClick={() => setSelectedDate(p.date)}
														className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
															isSelected ? "bg-blue-100" : ""
														}`}
													>
														<td className="w-10 px-2 py-2 text-center">
															<input
																type="checkbox"
																checked={isChecked}
																onClick={(e) => e.stopPropagation()}
																onChange={() => toggleCheckedDate(p.date)}
																className="h-4 w-4 accent-blue-600"
																aria-label={`${p.date} 출력 선택`}
															/>
														</td>
														<td className="px-2 py-2">{p.date}</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* 우측 상세 */}
					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 space-y-3">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={labelClass}>봉사일자</span>
								<input
									type="date"
									value={form.date}
									onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
									className={`col-span-2 ${inputClass}`}
								/>

								<span className={labelClass}>단체명</span>
								<input
									readOnly
									value={selectedGroup?.name || ""}
									className={`col-span-6 ${inputClass} bg-gray-50`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={labelClass}>봉사시간</span>
								<input
									type="time"
									value={form.startTime}
									onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
									className={`col-span-2 ${inputClass}`}
								/>
								<span className="col-span-1 text-center text-blue-900/70">~</span>
								<input
									type="time"
									value={form.endTime}
									onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
									className={`col-span-2 ${inputClass}`}
								/>

								<span className={labelClass}>봉사인원</span>
								<input
									type="number"
									min={0}
									value={form.volunteers}
									onChange={(e) => setForm((p) => ({ ...p, volunteers: e.target.value }))}
									className={`col-span-3 ${inputClass}`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className={`${labelClass} self-start`}>봉사자명단</span>
								<textarea
									value={form.roster}
									onChange={(e) => setForm((p) => ({ ...p, roster: e.target.value }))}
									rows={3}
									maxLength={500}
									className={`col-span-10 ${inputClass} resize-none`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-start">
								<span className={labelClass}>봉사내용</span>
								<div className="col-span-10 grid grid-cols-12 gap-2">
									<label className="col-span-3 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.bath}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													content: { ...p.content, bath: e.target.checked },
												}))
											}
											className="h-4 w-4 accent-blue-600"
										/>
										목욕
									</label>
									<label className="col-span-3 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.beauty}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													content: { ...p.content, beauty: e.target.checked },
												}))
											}
											className="h-4 w-4 accent-blue-600"
										/>
										이미용
									</label>
									<label className="col-span-3 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.programOps}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													content: { ...p.content, programOps: e.target.checked },
												}))
											}
											className="h-4 w-4 accent-blue-600"
										/>
										프로그램 운영
									</label>
									<label className="col-span-3 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.programAssist}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													content: { ...p.content, programAssist: e.target.checked },
												}))
											}
											className="h-4 w-4 accent-blue-600"
										/>
										프로그램 보조
									</label>
									<label className="col-span-2 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.other}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													content: { ...p.content, other: e.target.checked },
												}))
											}
											className="h-4 w-4 accent-blue-600"
										/>
										기타
									</label>
									<input
										value={form.content.otherText}
										onChange={(e) =>
											setForm((p) => ({
												...p,
												content: { ...p.content, otherText: e.target.value },
											}))
										}
										disabled={!form.content.other}
										maxLength={200}
										className={`col-span-10 ${inputClass} disabled:bg-blue-50`}
									/>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200">
								<button
									type="button"
									onClick={() => void handleSavePerformance()}
									disabled={saving || selectedGroupSeq == null}
									className="flex-1 min-w-[180px] rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									{saving ? "저장 중…" : "봉사실적저장"}
								</button>
								<button
									type="button"
									onClick={handleNewForm}
									disabled={saving}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									화면지움
								</button>
								<button
									type="button"
									onClick={() => void handleDeletePerformance()}
									disabled={saving || !selectedDate}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									봉사실적삭제
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 단체 추가/수정 모달 F71030 */}
			{groupModalOpen ? (
				<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-xl overflow-hidden rounded border-2 border-blue-400 bg-white shadow-xl">
						<div className="border-b border-blue-300 bg-blue-100 px-4 py-3 text-center text-lg font-semibold text-blue-900">
							{groupForm.gSeq == null ? "봉사회(단체) 등록" : "봉사회(단체) 수정"}
						</div>
						<div className="space-y-2 p-4">
							{/* 단체명 */}
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									단체명
								</span>
								<input
									value={groupForm.name}
									onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
									maxLength={100}
									className="min-w-0 flex-1 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							{/* 연락담당자 */}
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									연락담당자
								</span>
								<input
									value={groupForm.contact}
									onChange={(e) => setGroupForm((p) => ({ ...p, contact: e.target.value }))}
									maxLength={20}
									className="min-w-0 flex-1 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							{/* 전화번호1 */}
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									전화번호1
								</span>
								<input
									value={groupForm.phone1}
									onChange={(e) => setGroupForm((p) => ({ ...p, phone1: e.target.value }))}
									maxLength={20}
									className="w-56 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							{/* 전화번호2 */}
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									전화번호2
								</span>
								<input
									value={groupForm.phone2}
									onChange={(e) => setGroupForm((p) => ({ ...p, phone2: e.target.value }))}
									maxLength={20}
									className="w-56 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							{/* 등록일자 */}
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									등록일자
								</span>
								<input
									type="date"
									value={groupForm.indt}
									onChange={(e) => setGroupForm((p) => ({ ...p, indt: e.target.value }))}
									className="w-56 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							{/* 기타 */}
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									기타
								</span>
								<input
									value={groupForm.etc}
									onChange={(e) => setGroupForm((p) => ({ ...p, etc: e.target.value }))}
									maxLength={100}
									className="min-w-0 flex-1 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
						<div className="flex items-stretch gap-2 border-t border-blue-200 bg-blue-50/50 px-4 py-3">
							<button
								type="button"
								onClick={() => void handleSaveGroup()}
								disabled={groupSaving}
								className="flex-[4] rounded border border-blue-500 bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{groupSaving ? "저장 중…" : "저장"}
							</button>
							<button
								type="button"
								onClick={() => setGroupModalOpen(false)}
								disabled={groupSaving}
								className="flex-1 rounded border border-blue-400 bg-blue-100 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
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
