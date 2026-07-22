"use client";

import React, { useState, useEffect, useMemo } from "react";

interface ScheduleItem {
	id: number;
	date: string;
	endDate: string;
	title: string;
	content: string;
	type: string;
}

const SCHEDULE_TYPES = ["행사", "휴무", "교육", "기타"];

function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatPeriod(start: string, end?: string): string {
	const s = String(start ?? "").slice(0, 10);
	const e = String(end ?? s).slice(0, 10);
	if (!s) return "-";
	if (!e || e === s) return s;
	return `${s} ~ ${e}`;
}

/** dateStr가 [start, end] 구간에 포함되는지 */
function dateInRange(dateStr: string, start: string, end: string): boolean {
	const d = dateStr.slice(0, 10);
	const s = start.slice(0, 10);
	const e = (end || start).slice(0, 10);
	return d >= s && d <= e;
}

/** 일정이 선택한 년월과 겹치는지 */
function overlapsMonth(start: string, end: string, year: number, month: number): boolean {
	const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
	const s = start.slice(0, 10);
	const e = (end || start).slice(0, 10);
	return s <= monthEnd && e >= monthStart;
}

function typeBadgeClass(type?: string): string {
	switch (String(type ?? "").trim()) {
		case "행사":
			return "bg-blue-200 text-blue-900";
		case "휴무":
			return "bg-amber-200 text-amber-900";
		case "교육":
			return "bg-emerald-200 text-emerald-900";
		case "기타":
			return "bg-slate-200 text-slate-800";
		default:
			return "bg-blue-100 text-blue-900";
	}
}

type WeekDay = { date: Date | null; dateStr: string | null };

type EventSegment = {
	schedule: ScheduleItem;
	startCol: number;
	span: number;
	lane: number;
};

function buildCalendarWeeks(leadingBlanks: number, monthDates: Date[]): WeekDay[][] {
	const cells: WeekDay[] = [];
	for (let i = 0; i < leadingBlanks; i++) {
		cells.push({ date: null, dateStr: null });
	}
	for (const d of monthDates) {
		cells.push({ date: d, dateStr: formatDate(d) });
	}
	while (cells.length % 7 !== 0) {
		cells.push({ date: null, dateStr: null });
	}
	const weeks: WeekDay[][] = [];
	for (let i = 0; i < cells.length; i += 7) {
		weeks.push(cells.slice(i, i + 7));
	}
	return weeks;
}

/** 주 단위로 기간 일정을 연속 막대 세그먼트로 배치 */
function buildWeekSegments(week: WeekDay[], schedules: ScheduleItem[]): EventSegment[] {
	const raw: Omit<EventSegment, "lane">[] = [];
	for (const schedule of schedules) {
		const start = schedule.date.slice(0, 10);
		const end = (schedule.endDate || schedule.date).slice(0, 10);
		let startCol = -1;
		let endCol = -1;
		for (let c = 0; c < 7; c++) {
			const ds = week[c]?.dateStr;
			if (!ds) continue;
			if (dateInRange(ds, start, end)) {
				if (startCol < 0) startCol = c;
				endCol = c;
			}
		}
		if (startCol >= 0 && endCol >= startCol) {
			raw.push({ schedule, startCol, span: endCol - startCol + 1 });
		}
	}

	raw.sort((a, b) => a.startCol - b.startCol || b.span - a.span || a.schedule.id - b.schedule.id);

	const laneEnds: number[] = [];
	const result: EventSegment[] = [];
	for (const seg of raw) {
		let lane = 0;
		while (lane < laneEnds.length && laneEnds[lane] > seg.startCol) lane += 1;
		if (lane === laneEnds.length) laneEnds.push(0);
		laneEnds[lane] = seg.startCol + seg.span;
		result.push({ ...seg, lane });
	}
	return result;
}

export default function AnnualSchedule() {
	const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
	const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [formData, setFormData] = useState({
		date: "",
		endDate: "",
		title: "",
		content: "",
		type: "",
	});

	const filteredSchedules = useMemo(
		() =>
			scheduleList.filter((schedule) =>
				overlapsMonth(schedule.date, schedule.endDate, selectedYear, selectedMonth)
			),
		[scheduleList, selectedYear, selectedMonth]
	);

	const monthDates = useMemo(() => {
		const dates: Date[] = [];
		const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
		for (let i = 1; i <= lastDay; i++) {
			dates.push(new Date(selectedYear, selectedMonth - 1, i));
		}
		return dates;
	}, [selectedYear, selectedMonth]);

	/** 달력 첫 칸 앞 빈 칸 (일요일 시작) */
	const leadingBlanks = useMemo(() => {
		const first = new Date(selectedYear, selectedMonth - 1, 1);
		return first.getDay();
	}, [selectedYear, selectedMonth]);

	const calendarWeeks = useMemo(
		() => buildCalendarWeeks(leadingBlanks, monthDates),
		[leadingBlanks, monthDates]
	);

	const weekSegments = useMemo(
		() => calendarWeeks.map((week) => buildWeekSegments(week, filteredSchedules)),
		[calendarWeeks, filteredSchedules]
	);

	const fetchSchedules = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/annual-schedule?year=${selectedYear}`, {
				credentials: "include",
			});
			const result = await response.json();
			if (result.success) {
				const rows: ScheduleItem[] = (result.data || []).map(
					(r: {
						AS_SEQ: number;
						SCH_DATE?: string;
						SCH_START_DATE?: string;
						SCH_END_DATE?: string;
						TITLE: string;
						CONTENT?: string;
						SCH_TYPE?: string;
					}) => {
						const start = String(r.SCH_DATE ?? r.SCH_START_DATE ?? "").slice(0, 10);
						const end = String(r.SCH_END_DATE ?? start).slice(0, 10) || start;
						return {
							id: r.AS_SEQ,
							date: start,
							endDate: end,
							title: r.TITLE || "",
							content: r.CONTENT || "",
							type: r.SCH_TYPE || "",
						};
					}
				);
				setScheduleList(rows);
			} else {
				setScheduleList([]);
				if (result.error) {
					console.error(result.error);
				}
			}
		} catch {
			setScheduleList([]);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!formData.date || !formData.title.trim()) {
			alert("시작일과 제목을 입력해주세요.");
			return;
		}
		const endDate = formData.endDate || formData.date;
		if (endDate < formData.date) {
			alert("종료일은 시작일보다 빠를 수 없습니다.");
			return;
		}

		setSaving(true);
		try {
			const payload: Record<string, unknown> = {
				SCH_DATE: formData.date,
				SCH_END_DATE: endDate,
				TITLE: formData.title.trim(),
				CONTENT: formData.content,
				SCH_TYPE: formData.type,
			};
			if (isEditMode && selectedSchedule?.id) {
				payload.AS_SEQ = selectedSchedule.id;
			}

			const response = await fetch("/api/annual-schedule", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || "저장에 실패했습니다.");
			}
			alert(isEditMode ? "일정이 수정되었습니다." : "일정이 등록되었습니다.");
			handleCloseModal();
			await fetchSchedules();
		} catch (err) {
			alert(err instanceof Error ? err.message : "일정 저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedSchedule) {
			alert("삭제할 일정을 선택해주세요.");
			return;
		}
		if (!confirm(`「${selectedSchedule.title}」 일정을 삭제하시겠습니까?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/annual-schedule?asSeq=${selectedSchedule.id}`, {
				method: "DELETE",
				credentials: "include",
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || "삭제에 실패했습니다.");
			}
			alert("일정이 삭제되었습니다.");
			setSelectedSchedule(null);
			await fetchSchedules();
		} catch (err) {
			alert(err instanceof Error ? err.message : "일정 삭제 중 오류가 발생했습니다.");
		}
	};

	const handleOpenModal = () => {
		setIsEditMode(false);
		setSelectedSchedule(null);
		const d = formatDate(new Date(selectedYear, selectedMonth - 1, 1));
		setFormData({
			date: d,
			endDate: d,
			title: "",
			content: "",
			type: "",
		});
		setIsModalOpen(true);
	};

	const handleOpenEditModal = (schedule: ScheduleItem) => {
		setIsEditMode(true);
		setSelectedSchedule(schedule);
		setFormData({
			date: schedule.date,
			endDate: schedule.endDate || schedule.date,
			title: schedule.title,
			content: schedule.content,
			type: schedule.type || "",
		});
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setIsEditMode(false);
		setFormData({ date: "", endDate: "", title: "", content: "", type: "" });
	};

	const handleSelectSchedule = (schedule: ScheduleItem) => {
		setSelectedSchedule(schedule);
	};

	const handleDateClick = (date: Date) => {
		setIsEditMode(false);
		setSelectedSchedule(null);
		const d = formatDate(date);
		setFormData({
			date: d,
			endDate: d,
			title: "",
			content: "",
			type: "",
		});
		setIsModalOpen(true);
	};

	const handleMonthChange = (delta: number) => {
		let newMonth = selectedMonth + delta;
		let newYear = selectedYear;
		if (newMonth > 12) {
			newMonth = 1;
			newYear += 1;
		} else if (newMonth < 1) {
			newMonth = 12;
			newYear -= 1;
		}
		setSelectedMonth(newMonth);
		setSelectedYear(newYear);
	};

	const handleYearMonthPick = (value: string) => {
		const m = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
		if (!m) return;
		const y = parseInt(m[1], 10);
		const mo = parseInt(m[2], 10);
		if (!Number.isFinite(y) || mo < 1 || mo > 12) return;
		setSelectedYear(y);
		setSelectedMonth(mo);
	};

	const handleToday = () => {
		const today = new Date();
		setSelectedYear(today.getFullYear());
		setSelectedMonth(today.getMonth() + 1);
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const yearMonthValue = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

	useEffect(() => {
		fetchSchedules();
		setSelectedSchedule(null);
	}, [selectedYear]);

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			<div className="border-b border-blue-200 bg-blue-50/50 p-4">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
						연간 일정
					</h1>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => handleMonthChange(-1)}
							className="rounded border border-blue-400 bg-blue-200 px-2 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							aria-label="이전 달"
						>
							◀
						</button>
						<input
							type="month"
							value={yearMonthValue}
							onChange={(e) => handleYearMonthPick(e.target.value)}
							className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							aria-label="년월 선택"
						/>
						<button
							type="button"
							onClick={() => handleMonthChange(1)}
							className="rounded border border-blue-400 bg-blue-200 px-2 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							aria-label="다음 달"
						>
							▶
						</button>
						<button
							type="button"
							onClick={handleToday}
							className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							오늘
						</button>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleOpenModal}
							className="rounded border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
						>
							일정 등록
						</button>

					</div>
				</div>
			</div>

			<div className="flex flex-1 gap-4 p-4 overflow-hidden">
				{/* 왼쪽: 월별 캘린더 */}
				<div className="flex-1 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden min-w-0">
					<div className="border-b border-blue-200 bg-blue-100 px-4 py-2 font-semibold text-blue-900 shrink-0">
						{selectedYear}년 {selectedMonth}월
					</div>
					<div className="flex-1 overflow-auto p-4">
						{loading ? (
							<div className="flex h-40 items-center justify-center text-blue-900/60">로딩 중...</div>
						) : (
							<div className="rounded-lg border border-blue-300 overflow-hidden">
								<div className="grid grid-cols-7 bg-blue-50 border-b border-blue-200">
									{["일", "월", "화", "수", "목", "금", "토"].map((day) => (
										<div
											key={day}
											className={`text-center font-semibold py-2 text-sm border-r border-blue-200 last:border-r-0 ${
												day === "일"
													? "text-red-600"
													: day === "토"
														? "text-blue-600"
														: "text-blue-900"
											}`}
										>
											{day}
										</div>
									))}
								</div>
								{calendarWeeks.map((week, wi) => {
									const segments = weekSegments[wi] || [];
									const laneCount =
										segments.length > 0
											? Math.max(...segments.map((s) => s.lane)) + 1
											: 0;
									const eventRows = Math.max(laneCount, 1);
									return (
										<div
											key={`week-${wi}`}
											className="relative min-h-[8.5rem] border-b border-blue-200 last:border-b-0"
										>
											{/* 칸 전체 높이 배경·클릭 영역 */}
											<div className="absolute inset-0 grid grid-cols-7">
												{week.map((cell, ci) => {
													if (!cell.date || !cell.dateStr) {
														return (
															<div
																key={`empty-bg-${wi}-${ci}`}
																className="border-r border-blue-100 bg-slate-50/60 last:border-r-0"
															/>
														);
													}
													const dateStr = cell.dateStr;
													const isToday = formatDate(new Date()) === dateStr;
													const isSelected =
														selectedSchedule != null &&
														dateInRange(
															dateStr,
															selectedSchedule.date,
															selectedSchedule.endDate || selectedSchedule.date
														);
													return (
														<div
															key={`bg-${dateStr}`}
															onClick={() => handleDateClick(cell.date!)}
															className={`border-r border-blue-100 last:border-r-0 cursor-pointer hover:bg-blue-50/80 ${
																isToday ? "bg-blue-100/70" : "bg-white"
															} ${isSelected ? "ring-2 ring-inset ring-blue-500" : ""}`}
														/>
													);
												})}
											</div>

											{/* 날짜 숫자 + 일정 막대 (숫자 바로 아래부터) */}
											<div
												className="relative z-10 grid grid-cols-7 pointer-events-none"
												style={{
													gridTemplateRows: `1.75rem repeat(${eventRows}, 1.5rem)`,
												}}
											>
												{week.map((cell, ci) => {
													if (!cell.date || !cell.dateStr) {
														return (
															<div
																key={`empty-${wi}-${ci}`}
																style={{ gridColumn: ci + 1, gridRow: 1 }}
															/>
														);
													}
													const dow = cell.date.getDay();
													const isToday = formatDate(new Date()) === cell.dateStr;
													return (
														<div
															key={cell.dateStr}
															className="flex items-start px-1.5 pt-1"
															style={{ gridColumn: ci + 1, gridRow: 1 }}
														>
															<span
																className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
																	isToday
																		? "bg-blue-500 text-white"
																		: dow === 0
																			? "text-red-600"
																			: dow === 6
																				? "text-blue-600"
																				: "text-blue-900"
																}`}
															>
																{cell.date.getDate()}
															</span>
														</div>
													);
												})}
												{segments.map((seg) => {
													const { schedule, startCol, span, lane } = seg;
													const eventStart = schedule.date.slice(0, 10);
													const eventEnd = (schedule.endDate || schedule.date).slice(0, 10);
													const segStart = week[startCol]?.dateStr ?? "";
													const segEnd = week[startCol + span - 1]?.dateStr ?? "";
													const isRangeStart = segStart === eventStart;
													const isRangeEnd = segEnd === eventEnd;
													const isSelected = selectedSchedule?.id === schedule.id;
													return (
														<button
															key={`${schedule.id}-${startCol}-${lane}`}
															type="button"
															title={`${schedule.title} (${formatPeriod(schedule.date, schedule.endDate)})`}
															onClick={(e) => {
																e.stopPropagation();
																handleSelectSchedule(schedule);
															}}
															className={`pointer-events-auto mx-0.5 my-0.5 flex items-center overflow-hidden px-1.5 text-left text-xs font-medium leading-none whitespace-nowrap ${typeBadgeClass(
																schedule.type
															)} ${isRangeStart ? "rounded-l-md" : "rounded-l-none"} ${
																isRangeEnd ? "rounded-r-md" : "rounded-r-none"
															} ${isSelected ? "ring-2 ring-blue-600 ring-offset-0 z-10" : ""} hover:brightness-95`}
															style={{
																gridColumn: `${startCol + 1} / span ${span}`,
																gridRow: lane + 2,
															}}
														>
															<span className="truncate">{schedule.title}</span>
														</button>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* 오른쪽: 일정 목록 */}
				<div className="w-96 shrink-0 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 font-semibold text-blue-900 shrink-0">
						일정 목록 ({filteredSchedules.length}개)
					</div>
					<div className="flex-1 overflow-auto min-h-0">
						{loading ? (
							<div className="px-3 py-8 text-center text-blue-900/60">로딩 중...</div>
						) : filteredSchedules.length === 0 ? (
							<div className="px-3 py-8 text-center text-blue-900/60">일정이 없습니다</div>
						) : (
							<div className="p-2 space-y-2">
								{filteredSchedules.map((schedule) => (
									<div
										key={schedule.id}
										onClick={() => handleSelectSchedule(schedule)}
										className={`border border-blue-200 rounded p-3 cursor-pointer hover:bg-blue-50 ${
											selectedSchedule?.id === schedule.id
												? "bg-blue-100 border-blue-400"
												: ""
										}`}
									>
										<div className="text-sm font-semibold text-blue-900 mb-1">
											{schedule.title}
										</div>
										<div className="text-xs text-blue-700 mb-1">
											{formatPeriod(schedule.date, schedule.endDate)}
										</div>
										{schedule.content && (
											<div className="text-xs text-blue-900/70 line-clamp-2">
												{schedule.content}
											</div>
										)}
										{schedule.type && (
											<div
												className={`inline-block text-xs mt-1 px-1.5 py-0.5 rounded ${typeBadgeClass(schedule.type)}`}
											>
												{schedule.type}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
					{selectedSchedule && (
						<div className="border-t border-blue-200 bg-blue-50 p-3 space-y-2 shrink-0">
							<button
								type="button"
								onClick={() => handleOpenEditModal(selectedSchedule)}
								className="w-full rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								수정
							</button>
							<button
								type="button"
								onClick={handleDelete}
								className="w-full rounded border border-red-400 bg-red-200 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-300"
							>
								삭제
							</button>
						</div>
					)}
				</div>
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-2xl rounded-lg border border-blue-300 bg-white shadow-lg">
						<div className="border-b border-blue-200 bg-blue-100 px-6 py-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-blue-900">
								{isEditMode ? "일정 수정" : "일정 등록"}
							</h2>
							<button
								type="button"
								onClick={handleCloseModal}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									시작일
								</label>
								<input
									type="date"
									value={formData.date}
									onChange={(e) => {
										const next = e.target.value;
										setFormData((prev) => ({
											...prev,
											date: next,
											endDate:
												!prev.endDate || prev.endDate < next ? next : prev.endDate,
										}));
									}}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									종료일
								</label>
								<input
									type="date"
									value={formData.endDate || formData.date}
									min={formData.date || undefined}
									onChange={(e) =>
										setFormData({ ...formData, endDate: e.target.value })
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<p className="text-xs text-blue-900/60 -mt-2 pl-28">
								하루 일정이면 시작일·종료일을 같게 두세요.
							</p>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									제목
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) => setFormData({ ...formData, title: e.target.value })}
									placeholder="일정 제목을 입력하세요"
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									유형
								</label>
								<select
									value={formData.type}
									onChange={(e) => setFormData({ ...formData, type: e.target.value })}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								>
									<option value="">선택</option>
									{SCHEDULE_TYPES.map((t) => (
										<option key={t} value={t}>
											{t}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-start gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									내용
								</label>
								<textarea
									value={formData.content}
									onChange={(e) => setFormData({ ...formData, content: e.target.value })}
									rows={4}
									placeholder="일정 내용을 입력하세요"
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
								/>
							</div>
						</div>
						<div className="border-t border-blue-200 bg-blue-50 px-6 py-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={handleCloseModal}
								disabled={saving}
								className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								취소
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={saving}
								className="rounded border border-blue-500 bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
							>
								{saving ? "저장 중..." : "저장"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
