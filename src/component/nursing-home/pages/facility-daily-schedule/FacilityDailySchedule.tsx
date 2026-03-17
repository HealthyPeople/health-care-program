"use client";

import React, { useMemo, useState } from "react";

interface PlanDateRow {
	date: string; // YYYY-MM-DD
}

interface ScheduleRow {
	id: string;
	planDate: string; // 계획일자
	startTime: string;
	endTime: string;
	category: string; // 구분
	planTitle: string; // 수행계획
	planDetail: string; // 수행계획상세
}

interface ScheduleForm {
	planDate: string;
	copyDate: string;
	startTime: string;
	endTime: string;
	category: string;
	planTitle: string;
	leader: string; // 진행자
	assistant: string; // 보조진행자
	detail: string; // 상세내역
	place: string; // 장소
	attendees: string; // 참석자
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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

	const [planDates] = useState<PlanDateRow[]>(() => {
		const base = new Date();
		const rows: PlanDateRow[] = [];
		for (let i = -10; i <= 10; i++) {
			const d = new Date(base);
			d.setDate(base.getDate() + i);
			rows.push({ date: formatDate(d) });
		}
		return rows;
	});

	const [selectedPlanDate, setSelectedPlanDate] = useState<string>(() => todayStr);

	const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(() => [
		{
			id: "1",
			planDate: todayStr,
			startTime: "09:00",
			endTime: "10:00",
			category: "인지기능강화",
			planTitle: "아침식사",
			planDetail: "",
		},
	]);

	const filteredScheduleRows = useMemo(() => {
		return scheduleRows.filter((r) => r.planDate === selectedPlanDate);
	}, [scheduleRows, selectedPlanDate]);

	const [selectedScheduleId, setSelectedScheduleId] = useState<string>(filteredScheduleRows[0]?.id || "");

	const selectedSchedule = useMemo(() => {
		return filteredScheduleRows.find((r) => r.id === selectedScheduleId) || null;
	}, [filteredScheduleRows, selectedScheduleId]);

	const [form, setForm] = useState<ScheduleForm>(() => ({
		planDate: selectedPlanDate,
		copyDate: selectedPlanDate,
		startTime: "09:00",
		endTime: "10:00",
		category: "인지기능강화",
		planTitle: "아침식사",
		leader: "",
		assistant: "",
		detail: "",
		place: "",
		attendees: "",
	}));

	// 선택된 일정 → 하단 폼 동기화(퍼블 단계라 단순 적용)
	React.useEffect(() => {
		if (!selectedSchedule) {
			setForm((prev) => ({ ...prev, planDate: selectedPlanDate, copyDate: selectedPlanDate }));
			return;
		}
		setForm((prev) => ({
			...prev,
			planDate: selectedSchedule.planDate,
			copyDate: selectedSchedule.planDate,
			startTime: selectedSchedule.startTime,
			endTime: selectedSchedule.endTime,
			category: selectedSchedule.category,
			planTitle: selectedSchedule.planTitle,
		}));
	}, [selectedSchedule, selectedPlanDate]);

	const handleSearch = () => {
		// 퍼블: 실제 조회 로직은 추후 API 연동
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleAdd = () => {
		const id = String(Date.now());
		const newRow: ScheduleRow = {
			id,
			planDate: form.planDate || selectedPlanDate,
			startTime: form.startTime,
			endTime: form.endTime,
			category: form.category,
			planTitle: form.planTitle,
			planDetail: form.detail,
		};
		setScheduleRows((prev) => [newRow, ...prev]);
		setSelectedScheduleId(id);
	};

	const handleUpdate = () => {
		if (!selectedScheduleId) return;
		setScheduleRows((prev) =>
			prev.map((r) =>
				r.id !== selectedScheduleId
					? r
					: {
							...r,
							planDate: form.planDate,
							startTime: form.startTime,
							endTime: form.endTime,
							category: form.category,
							planTitle: form.planTitle,
							planDetail: form.detail,
					  }
			)
		);
	};

	const handleDelete = () => {
		if (!selectedScheduleId) return;
		setScheduleRows((prev) => prev.filter((r) => r.id !== selectedScheduleId));
		setSelectedScheduleId("");
	};

	const handleCopy = () => {
		if (!selectedScheduleId) return;
		const src = scheduleRows.find((r) => r.id === selectedScheduleId);
		if (!src) return;
		const id = String(Date.now());
		setScheduleRows((prev) => [
			{
				...src,
				id,
				planDate: form.copyDate || src.planDate,
			},
			...prev,
		]);
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 바 */}
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
							onClick={handleSearch}
							className="w-44 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-32 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 상단 목록 영역 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌: 계획일자 */}
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							계획일자
						</div>
						<div className="max-h-[260px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{planDates.map((r) => {
										const isSelected = r.date === selectedPlanDate;
										return (
											<tr
												key={r.date}
												onClick={() => {
													setSelectedPlanDate(r.date);
													setSelectedScheduleId("");
												}}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="px-3 py-2">{r.date}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					{/* 우: 일정 테이블 */}
					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="max-h-[260px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
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
									{filteredScheduleRows.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-3 py-10 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										filteredScheduleRows.map((r) => {
											const isSelected = r.id === selectedScheduleId;
											return (
												<tr
													key={r.id}
													onClick={() => setSelectedScheduleId(r.id)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-3 py-2">{r.startTime}</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.endTime}</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.category}</td>
													<td className="border-r border-blue-100 px-3 py-2">{r.planTitle}</td>
													<td className="px-3 py-2">{r.planDetail}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 하단 상세 입력 + 우측 버튼 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 입력 폼 */}
					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 space-y-2">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									계획일자
								</span>
								<input
									type="date"
									value={form.planDate}
									onChange={(e) => setForm((p) => ({ ...p, planDate: e.target.value }))}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									복사일자
								</span>
								<input
									type="date"
									value={form.copyDate}
									onChange={(e) => setForm((p) => ({ ...p, copyDate: e.target.value }))}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<div className="col-span-2" />
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									구분
								</span>
								<select
									value={form.category}
									onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								>
									<option value="인지기능강화">인지기능강화</option>
									<option value="일상생활">일상생활</option>
									<option value="여가활동">여가활동</option>
									<option value="기타">기타</option>
								</select>

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									시작시간
								</span>
								<input
									type="time"
									value={form.startTime}
									onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
									className="col-span-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									종료시간
								</span>
								<input
									type="time"
									value={form.endTime}
									onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
									className="col-span-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									수행계획
								</span>
								<input
									value={form.planTitle}
									onChange={(e) => setForm((p) => ({ ...p, planTitle: e.target.value }))}
									className="col-span-4 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									진행자
								</span>
								<input
									value={form.leader}
									onChange={(e) => setForm((p) => ({ ...p, leader: e.target.value }))}
									className="col-span-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<div className="col-span-1" />
								<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									보조진행자
								</span>
								<input
									value={form.assistant}
									onChange={(e) => setForm((p) => ({ ...p, assistant: e.target.value }))}
									className="col-span-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									상세내역
								</span>
								<textarea
									value={form.detail}
									onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
									rows={3}
									className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 resize-none"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									장소
								</span>
								<input
									value={form.place}
									onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
									className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									참석자
								</span>
								<textarea
									value={form.attendees}
									onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
									rows={4}
									className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 resize-none"
								/>
							</div>
						</div>
					</div>

					{/* 우측 버튼 */}
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 grid grid-cols-1 gap-2">
							<button
								type="button"
								onClick={handleAdd}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								추 가
							</button>
							<button
								type="button"
								onClick={handleUpdate}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								disabled={!selectedScheduleId}
							>
								수 정
							</button>
							<button
								type="button"
								onClick={handleDelete}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								disabled={!selectedScheduleId}
							>
								삭 제
							</button>
							<button
								type="button"
								onClick={handleCopy}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								disabled={!selectedScheduleId}
							>
								복 사
							</button>
							<button
								type="button"
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								입력항목지원
							</button>
							<button
								type="button"
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								명단 생성
							</button>
							<button
								type="button"
								className="rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								출 력
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

