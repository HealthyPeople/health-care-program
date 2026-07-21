"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	buildIndividualVolunteerContentBatchPrintHtml,
	buildIndividualVolunteerListPrintHtml,
	openPrintPreviewWindow,
	type IndividualVolunteerPrintData,
} from "./individualVolunteerPerformancePrint";

interface VolunteerRow {
	phone: string;
	name: string;
	address: string;
	etc: string;
	indt: string;
}

interface PerformanceContent {
	bath: boolean;
	beauty: boolean;
	programAssist: boolean;
	programOps: boolean;
	other: boolean;
	otherText: string;
}

interface PerformanceRow {
	phone: string;
	date: string;
	startTime: string;
	endTime: string;
	content: PerformanceContent;
	etc: string;
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
};

type VolunteerFormState = {
	originalPhone: string | null;
	phone: string;
	name: string;
	address: string;
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

function mapVolunteer(row: Record<string, unknown>): VolunteerRow | null {
	const phone = String(row.P_PHONE ?? "").trim();
	if (!phone) return null;
	return {
		phone,
		name: String(row.P_NM ?? "").trim(),
		address: String(row.P_ADD ?? "").trim(),
		etc: String(row.ETC ?? "").trim(),
		indt: String(row.INDT ?? "").trim().slice(0, 10),
	};
}

function mapPerformance(row: Record<string, unknown>): PerformanceRow | null {
	const phone = String(row.P_PHONE ?? "").trim();
	const date = String(row.P_SDT ?? "").trim().slice(0, 10);
	if (!phone || !date) return null;
	return {
		phone,
		date,
		startTime: String(row.P_STM ?? "").trim().slice(0, 5),
		endTime: String(row.P_ETM ?? "").trim().slice(0, 5),
		content: {
			bath: flagOn(row.P_SRV01),
			beauty: flagOn(row.P_SRV02),
			programAssist: flagOn(row.P_SRV03),
			programOps: flagOn(row.P_SRV04),
			other: flagOn(row.P_SRV09),
			otherText: String(row.P_SRV09_NM ?? "").trim(),
		},
		etc: String(row.ETC ?? "").trim(),
	};
}

function emptyForm(today: string): PerformanceRow {
	return {
		phone: "",
		date: today,
		startTime: "",
		endTime: "",
		content: emptyContent(),
		etc: "",
	};
}

export default function IndividualVolunteerPerformance() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [facilityName, setFacilityName] = useState("");
	const [fromDate, setFromDate] = useState<string>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState<string>(() => todayStr);
	const [nameQuery, setNameQuery] = useState("");

	const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);
	const [selectedPhone, setSelectedPhone] = useState<string>("");
	const [performances, setPerformances] = useState<PerformanceRow[]>([]);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
	const [checkedVolunteers, setCheckedVolunteers] = useState<Set<string>>(new Set());

	const [form, setForm] = useState<PerformanceRow>(() => emptyForm(todayStr));
	const [loading, setLoading] = useState(false);
	const [perfLoading, setPerfLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
	const [volunteerForm, setVolunteerForm] = useState<VolunteerFormState>({
		originalPhone: null,
		phone: "",
		name: "",
		address: "",
		etc: "",
		indt: todayStr,
	});
	const [volunteerSaving, setVolunteerSaving] = useState(false);

	const selectedVolunteer = useMemo(
		() => volunteers.find((v) => v.phone === selectedPhone) || null,
		[volunteers, selectedPhone]
	);

	const selectedPerformance = useMemo(
		() => performances.find((p) => p.date === selectedDate) || null,
		[performances, selectedDate]
	);

	const loadVolunteers = useCallback(async (ancd: string | number, nameFilter = "") => {
		const qs = new URLSearchParams({ ancd: String(ancd) });
		const q = nameFilter.trim();
		if (q) qs.set("name", q);
		const res = await fetch(`/api/f71040?${qs.toString()}`, {
			credentials: "include",
			cache: "no-store",
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "봉사자 목록을 불러오지 못했습니다.");
		}
		const list: VolunteerRow[] = [];
		for (const raw of Array.isArray(json.data) ? json.data : []) {
			const mapped = mapVolunteer(raw as Record<string, unknown>);
			if (mapped) list.push(mapped);
		}
		setVolunteers(list);
		setCheckedVolunteers((prev) => {
			const next = new Set<string>();
			prev.forEach((phone) => {
				if (list.some((v) => v.phone === phone)) next.add(phone);
			});
			return next;
		});
		setSelectedPhone((prev) => {
			if (prev && list.some((v) => v.phone === prev)) return prev;
			return list[0]?.phone || "";
		});
	}, []);

	const loadPerformances = useCallback(
		async (ancd: string | number, phone: string, from: string, to: string) => {
			setPerfLoading(true);
			try {
				const qs = new URLSearchParams({
					ancd: String(ancd),
					phone,
				});
				if (from) qs.set("startDate", from);
				if (to) qs.set("endDate", to);
				const res = await fetch(`/api/f71041?${qs.toString()}`, {
					credentials: "include",
					cache: "no-store",
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json?.success) {
					throw new Error(json?.error || "봉사실적을 불러오지 못했습니다.");
				}
				const list: PerformanceRow[] = [];
				for (const raw of Array.isArray(json.data) ? json.data : []) {
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
			await loadVolunteers(loginAncd, "");
		} catch (err) {
			console.error(err);
			setLoadError(err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다.");
			setVolunteers([]);
		} finally {
			setLoading(false);
		}
	}, [loadVolunteers]);

	useEffect(() => {
		void initializePage();
	}, [initializePage]);

	useEffect(() => {
		if (sessionAncd == null || !selectedPhone) {
			setPerformances([]);
			setSelectedDate("");
			setCheckedDates(new Set());
			setForm(emptyForm(todayStr));
			return;
		}
		void loadPerformances(sessionAncd, selectedPhone, fromDate, toDate);
	}, [sessionAncd, selectedPhone, fromDate, toDate, loadPerformances, todayStr]);

	useEffect(() => {
		if (!selectedPerformance) {
			setForm({ ...emptyForm(todayStr), phone: selectedPhone });
			return;
		}
		setForm({ ...selectedPerformance, content: { ...selectedPerformance.content } });
	}, [selectedPerformance, selectedPhone, todayStr]);

	const handleSearch = async () => {
		if (sessionAncd == null) return;
		setLoading(true);
		setLoadError(null);
		try {
			await loadVolunteers(sessionAncd, nameQuery);
		} catch (err) {
			console.error(err);
			setLoadError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	const openAddVolunteer = () => {
		setVolunteerForm({
			originalPhone: null,
			phone: "",
			name: nameQuery.trim(),
			address: "",
			etc: "",
			indt: todayStr,
		});
		setVolunteerModalOpen(true);
	};

	const openEditVolunteer = (volunteer?: VolunteerRow | null) => {
		const target = volunteer ?? selectedVolunteer;
		if (!target) {
			alert("수정할 봉사자를 선택해주세요.");
			return;
		}
		setSelectedPhone(target.phone);
		setVolunteerForm({
			originalPhone: target.phone,
			phone: target.phone,
			name: target.name,
			address: target.address,
			etc: target.etc,
			indt: target.indt || todayStr,
		});
		setVolunteerModalOpen(true);
	};

	const handleDeleteVolunteer = async (volunteer: VolunteerRow) => {
		if (sessionAncd == null || volunteerSaving) return;
		if (!confirm(`「${volunteer.name}」 봉사자를 삭제하시겠습니까?`)) return;
		setVolunteerSaving(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				phone: volunteer.phone,
			});
			const res = await fetch(`/api/f71040?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "봉사자 삭제에 실패했습니다.");
			}
			alert("봉사자가 삭제되었습니다.");
			setCheckedVolunteers((prev) => {
				const next = new Set(prev);
				next.delete(volunteer.phone);
				return next;
			});
			await loadVolunteers(sessionAncd, nameQuery);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "봉사자 삭제 중 오류가 발생했습니다.");
		} finally {
			setVolunteerSaving(false);
		}
	};

	const handleSaveVolunteer = async () => {
		if (sessionAncd == null || volunteerSaving) return;
		if (!volunteerForm.phone.trim()) {
			alert("핸드폰번호를 입력해주세요.");
			return;
		}
		if (!volunteerForm.name.trim()) {
			alert("이름을 입력해주세요.");
			return;
		}
		setVolunteerSaving(true);
		try {
			const res = await fetch("/api/f71040", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: sessionAncd,
					P_PHONE: volunteerForm.phone.trim(),
					P_NM: volunteerForm.name.trim(),
					P_ADD: volunteerForm.address.trim() || null,
					ETC: volunteerForm.etc.trim() || null,
					INDT: volunteerForm.indt || todayStr,
					originalPhone: volunteerForm.originalPhone,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "봉사자 정보 저장에 실패했습니다.");
			}
			alert(volunteerForm.originalPhone == null ? "봉사자가 등록되었습니다." : "봉사자 정보가 수정되었습니다.");
			setVolunteerModalOpen(false);
			await loadVolunteers(sessionAncd, nameQuery);
			if (json.P_PHONE) setSelectedPhone(String(json.P_PHONE));
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "봉사자 저장 중 오류가 발생했습니다.");
		} finally {
			setVolunteerSaving(false);
		}
	};

	const handleClearForm = () => {
		setSelectedDate("");
		setForm({ ...emptyForm(todayStr), phone: selectedPhone });
	};

	const handleSave = async () => {
		if (sessionAncd == null || !selectedPhone || saving) return;
		if (!form.date) {
			alert("봉사일자를 입력해주세요.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f71041", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: sessionAncd,
					P_PHONE: selectedPhone,
					P_SDT: form.date,
					P_STM: form.startTime || null,
					P_ETM: form.endTime || null,
					P_SRV01: form.content.bath ? "1" : "0",
					P_SRV02: form.content.beauty ? "1" : "0",
					P_SRV03: form.content.programAssist ? "1" : "0",
					P_SRV04: form.content.programOps ? "1" : "0",
					P_SRV09: form.content.other ? "1" : "0",
					P_SRV09_NM: form.content.other ? form.content.otherText.trim() || null : null,
					ETC: form.etc.trim() || null,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "봉사정보 저장에 실패했습니다.");
			}
			alert("봉사정보가 저장되었습니다.");
			await loadPerformances(sessionAncd, selectedPhone, fromDate, toDate);
			setSelectedDate(form.date);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (sessionAncd == null || !selectedPhone || !selectedDate || saving) return;
		if (!confirm(`봉사일자 [${selectedDate}] 실적을 삭제하시겠습니까?`)) return;
		setSaving(true);
		try {
			const qs = new URLSearchParams({
				ancd: String(sessionAncd),
				phone: selectedPhone,
				pSdt: selectedDate,
			});
			const res = await fetch(`/api/f71041?${qs.toString()}`, {
				method: "DELETE",
				credentials: "include",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "봉사정보 삭제에 실패했습니다.");
			}
			alert("봉사정보가 삭제되었습니다.");
			await loadPerformances(sessionAncd, selectedPhone, fromDate, toDate);
			handleClearForm();
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const buildPrintDataFromPerformance = (p: PerformanceRow): IndividualVolunteerPrintData | null => {
		if (!selectedVolunteer) return null;
		return {
			facilityName,
			volunteerName: selectedVolunteer.name,
			phone: selectedVolunteer.phone,
			address: selectedVolunteer.address,
			date: p.date,
			startTime: p.startTime,
			endTime: p.endTime,
			services: { ...p.content },
			etc: p.etc,
		};
	};

	const getCheckedPrintList = (): IndividualVolunteerPrintData[] | null => {
		if (!selectedVolunteer) {
			alert("봉사자를 선택해주세요.");
			return null;
		}
		if (!checkedDates.size) {
			alert("출력할 봉사일자를 체크해주세요.");
			return null;
		}
		const list = performances
			.filter((p) => checkedDates.has(p.date))
			.map(buildPrintDataFromPerformance)
			.filter((d): d is IndividualVolunteerPrintData => d != null);
		if (!list.length) {
			alert("체크된 봉사일자에 해당하는 실적이 없습니다.");
			return null;
		}
		return list;
	};

	const handlePrintContent = () => {
		const list = getCheckedPrintList();
		if (!list) return;
		openPrintPreviewWindow(buildIndividualVolunteerContentBatchPrintHtml(list));
	};

	const handlePrintVolunteerList = () => {
		if (!checkedVolunteers.size) {
			alert("출력할 봉사자를 체크해주세요.");
			return;
		}
		const rows = volunteers
			.filter((v) => checkedVolunteers.has(v.phone))
			.map((v) => ({
				name: v.name,
				phone: v.phone,
				address: v.address,
				etc: v.etc,
				indt: v.indt,
			}));
		if (!rows.length) {
			alert("체크된 봉사자가 없습니다.");
			return;
		}
		openPrintPreviewWindow(buildIndividualVolunteerListPrintHtml(rows, todayStr));
	};

	const toggleCheckedDate = (date: string) => {
		setCheckedDates((prev) => {
			const next = new Set(prev);
			if (next.has(date)) next.delete(date);
			else next.add(date);
			return next;
		});
	};

	const toggleCheckedVolunteer = (phone: string) => {
		setCheckedVolunteers((prev) => {
			const next = new Set(prev);
			if (next.has(phone)) next.delete(phone);
			else next.add(phone);
			return next;
		});
	};

	const labelClass =
		"col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
	const inputClass =
		"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				<div className="flex flex-wrap items-stretch gap-3">
					<div className="flex-1 min-w-[240px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						개인봉사실적관리
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
								성 명
							</span>
							<input
								value={nameQuery}
								onChange={(e) => setNameQuery(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
								className={`w-40 ${inputClass}`}
							/>
							<button
								type="button"
								onClick={openAddVolunteer}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								개인정보 추가
							</button>
						</div>
					</div>
				</div>

				{loading ? <p className="text-sm text-blue-800/70">데이터를 불러오는 중…</p> : null}
				{!loading && loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}

				{/* 상단 봉사자 목록 F71040 */}
				<div className="space-y-2">
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handlePrintVolunteerList}
							disabled={!checkedVolunteers.size}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							봉사자출력{checkedVolunteers.size > 0 ? ` (${checkedVolunteers.size})` : ""}
						</button>
					</div>
					<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="max-h-[260px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="w-12 border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											선택
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											봉사자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											전화번호
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">주소</th>
									</tr>
								</thead>
								<tbody>
									{volunteers.length === 0 ? (
										<tr>
											<td colSpan={4} className="px-3 py-10 text-center text-blue-900/60">
												{loading ? "조회 중…" : "봉사자 데이터가 없습니다."}
											</td>
										</tr>
									) : (
										volunteers.map((v) => {
											const isSelected = v.phone === selectedPhone;
											const isChecked = checkedVolunteers.has(v.phone);
											return (
												<tr
													key={v.phone}
													onClick={() => {
														setSelectedPhone(v.phone);
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
															onChange={() => toggleCheckedVolunteer(v.phone)}
															className="h-4 w-4 accent-blue-600"
															aria-label={`${v.name} 출력 선택`}
														/>
													</td>
													<td className="border-r border-blue-100 px-3 py-2">
														<div className="flex items-center gap-2">
															<span className="min-w-0 flex-1">{v.name}</span>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	openEditVolunteer(v);
																}}
																className="shrink-0 rounded border border-blue-400 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900 hover:bg-blue-200"
															>
																수정
															</button>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	void handleDeleteVolunteer(v);
																}}
																disabled={volunteerSaving}
																className="shrink-0 rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
															>
																삭제
															</button>
														</div>
													</td>
													<td className="border-r border-blue-100 px-3 py-2">{v.phone}</td>
													<td className="px-3 py-2">{v.address}</td>
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
					{/* 좌: 봉사일자 F71041 */}
					<div className="col-span-12 lg:col-span-2 flex flex-col gap-2">
						<button
							type="button"
							onClick={handlePrintContent}
							disabled={!checkedDates.size}
							className="w-full rounded border border-blue-400 bg-blue-200 px-2 py-2.5 text-xs font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							봉사내용출력{checkedDates.size > 0 ? `(${checkedDates.size})` : ""}
						</button>
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden flex-1">
							<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
								봉사일자
							</div>
							<div className="max-h-[360px] overflow-auto">
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
														key={`${p.phone}-${p.date}`}
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

					{/* 우: 상세 */}
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
								<div className="col-span-3" />
								<span className={labelClass}>봉사자</span>
								<input
									readOnly
									value={selectedVolunteer?.name || ""}
									className={`col-span-3 ${inputClass} bg-gray-50`}
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center border-b border-blue-200 pb-3">
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
								<div className="col-span-5" />
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
									onClick={() => void handleSave()}
									disabled={saving || !selectedPhone}
									className="flex-1 min-w-[180px] rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									{saving ? "저장 중…" : "봉사정보 저장"}
								</button>
								<button
									type="button"
									onClick={handleClearForm}
									disabled={saving}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									봉사정보지움
								</button>
								<button
									type="button"
									onClick={() => void handleDelete()}
									disabled={saving || !selectedDate}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									봉사정보삭제
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 개인정보 추가/수정 모달 F71040 */}
			{volunteerModalOpen ? (
				<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-xl overflow-hidden rounded border-2 border-blue-400 bg-white shadow-xl">
						<div className="border-b border-blue-300 bg-blue-100 px-4 py-3 text-center text-lg font-semibold text-blue-900">
							{volunteerForm.originalPhone == null ? "개인봉사자 등록" : "개인봉사자 수정"}
						</div>
						<div className="space-y-2 p-4">
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									이름
								</span>
								<input
									value={volunteerForm.name}
									onChange={(e) => setVolunteerForm((p) => ({ ...p, name: e.target.value }))}
									maxLength={20}
									className="min-w-0 flex-1 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									핸드폰번호
								</span>
								<input
									value={volunteerForm.phone}
									onChange={(e) => setVolunteerForm((p) => ({ ...p, phone: e.target.value }))}
									maxLength={20}
									className="w-56 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									주소
								</span>
								<input
									value={volunteerForm.address}
									onChange={(e) => setVolunteerForm((p) => ({ ...p, address: e.target.value }))}
									maxLength={100}
									className="min-w-0 flex-1 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									등록일자
								</span>
								<input
									type="date"
									value={volunteerForm.indt}
									onChange={(e) => setVolunteerForm((p) => ({ ...p, indt: e.target.value }))}
									className="w-56 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-stretch gap-0">
								<span className="flex w-28 shrink-0 items-center justify-center border border-blue-300 bg-blue-100 px-2 text-sm font-medium text-blue-900">
									비고
								</span>
								<input
									value={volunteerForm.etc}
									onChange={(e) => setVolunteerForm((p) => ({ ...p, etc: e.target.value }))}
									maxLength={100}
									className="min-w-0 flex-1 border border-l-0 border-blue-300 bg-white px-3 py-2.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
						<div className="flex items-stretch gap-2 border-t border-blue-200 bg-blue-50/50 px-4 py-3">
							<button
								type="button"
								onClick={() => void handleSaveVolunteer()}
								disabled={volunteerSaving}
								className="flex-[4] rounded border border-blue-500 bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{volunteerSaving ? "저장 중…" : "저장"}
							</button>
							<button
								type="button"
								onClick={() => setVolunteerModalOpen(false)}
								disabled={volunteerSaving}
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
