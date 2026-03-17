"use client";

import React, { useEffect, useMemo, useState } from "react";

interface MeetingMinutesItem {
	id: string;
	meetingDate: string; // YYYY-MM-DD
	title: string;
	place: string;
	startTime: string; // HH:mm
	endTime: string; // HH:mm
	content: string;
	attendees: string;
	appliedDate: string; // YYYY-MM-DD
	appliedContent: string;
}

const emptyForm: MeetingMinutesItem = {
	id: "",
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

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export default function EmployeeMeetingMinutes() {
	// 기간 필터
	const [periodStart, setPeriodStart] = useState(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [periodEnd, setPeriodEnd] = useState(() => formatDate(new Date()));

	// 목록/선택/폼 (추후 API 연동)
	const [list, setList] = useState<MeetingMinutesItem[]>([]);
	const [selectedId, setSelectedId] = useState<string>("");
	const [form, setForm] = useState<MeetingMinutesItem>(emptyForm);

	const filteredList = useMemo(() => {
		const start = periodStart ? new Date(periodStart) : null;
		const end = periodEnd ? new Date(periodEnd) : null;
		return list.filter((m) => {
			const md = new Date(m.meetingDate);
			if (start && !isNaN(start.getTime()) && md < start) return false;
			if (end && !isNaN(end.getTime())) {
				const endPlus = new Date(end);
				endPlus.setHours(23, 59, 59, 999);
				if (md > endPlus) return false;
			}
			return true;
		});
	}, [list, periodStart, periodEnd]);

	useEffect(() => {
		// 데모 데이터
		setList([
			{
				id: "1",
				meetingDate: formatDate(new Date()),
				title: "직원회의",
				place: "회의실",
				startTime: "09:00",
				endTime: "10:00",
				content: "",
				attendees: "",
				appliedDate: "",
				appliedContent: "",
			},
		]);
	}, []);

	useEffect(() => {
		const selected = list.find((m) => m.id === selectedId);
		if (selected) setForm(selected);
	}, [selectedId, list]);

	const handleSearch = () => {
		// TODO: API 연동 시 기간으로 조회
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleAdd = () => {
		setSelectedId("");
		setForm({
			...emptyForm,
			meetingDate: formatDate(new Date()),
			appliedDate: formatDate(new Date()),
		});
	};

	const handleEdit = () => {
		if (!selectedId) return;
		// TODO: 수정 모드(현재 폼은 항상 편집 가능)
	};

	const handleDelete = () => {
		if (!selectedId) return;
		if (!confirm("선택한 회의록을 삭제하시겠습니까?")) return;
		setList((prev) => prev.filter((m) => m.id !== selectedId));
		setSelectedId("");
		setForm(emptyForm);
	};

	const handleRegisterApply = () => {
		// TODO: 반영내용등록 API 연동
		alert("반영내용등록은 추후 연동 예정입니다.");
	};

	const handlePrint = () => {
		window.print();
	};

	const leftPager = (
		<div className="flex items-center justify-between gap-3 px-3 py-3 border-t border-blue-200 bg-white">
			<div className="flex gap-2">
				<button
					type="button"
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50"
					aria-label="처음"
				>
					«
				</button>
				<button
					type="button"
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50"
					aria-label="이전"
				>
					‹
				</button>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50"
					aria-label="다음"
				>
					›
				</button>
				<button
					type="button"
					className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50"
					aria-label="마지막"
				>
					»
				</button>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-white text-black">
			{/* 상단 바 */}
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
					<button
						type="button"
						onClick={handleSearch}
						className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						검색
					</button>
					<button
						type="button"
						onClick={handleClose}
						className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						닫기
					</button>
				</div>
			</div>

			{/* 본문 */}
			<div className="flex gap-4 p-4 min-h-[calc(100vh-76px)]">
				{/* 좌측 목록 */}
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
								{filteredList.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									filteredList.map((m) => {
										const isSelected = m.id === selectedId;
										return (
											<tr
												key={m.id}
												onClick={() => setSelectedId(m.id)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{m.meetingDate}</td>
												<td className="px-3 py-2">{m.title}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{leftPager}
				</aside>

				{/* 우측 입력 폼 */}
				<section className="flex-1 min-w-0 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="flex-1 overflow-auto p-4">
						<div className="grid grid-cols-12 gap-3">
							{/* 회의일자 */}
							<div className="col-span-12 md:col-span-6 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의일자
								</label>
								<input
									type="date"
									value={form.meetingDate}
									onChange={(e) => setForm((p) => ({ ...p, meetingDate: e.target.value }))}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							{/* 회의시간 */}
							<div className="col-span-12 md:col-span-6 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의시간
								</label>
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
							</div>

							{/* 회의장소 */}
							<div className="col-span-12 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의장소
								</label>
								<input
									type="text"
									value={form.place}
									onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							{/* 회의제목 */}
							<div className="col-span-12 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의제목
								</label>
								<input
									type="text"
									value={form.title}
									onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>

							{/* 회의내용 */}
							<div className="col-span-12 flex items-start gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의내용
								</label>
								<textarea
									value={form.content}
									onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
									rows={10}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
								/>
							</div>

							{/* 회의참석자 */}
							<div className="col-span-12 flex items-start gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									회의참석자
								</label>
								<textarea
									value={form.attendees}
									onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
									rows={3}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
								/>
							</div>

							{/* 반영일자 */}
							<div className="col-span-12 md:col-span-6 flex items-center gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									반영일자
								</label>
								<input
									type="date"
									value={form.appliedDate}
									onChange={(e) => setForm((p) => ({ ...p, appliedDate: e.target.value }))}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="col-span-12 md:col-span-6" />

							{/* 반영내용 */}
							<div className="col-span-12 flex items-start gap-2">
								<label className="w-24 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900">
									반영내용
								</label>
								<textarea
									value={form.appliedContent}
									onChange={(e) => setForm((p) => ({ ...p, appliedContent: e.target.value }))}
									rows={6}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
								/>
							</div>
						</div>
					</div>

					{/* 하단 버튼 */}
					<div className="border-t border-blue-200 bg-blue-50/50 p-3">
						<div className="flex flex-wrap items-center justify-center gap-3">
							<button
								type="button"
								onClick={handleAdd}
								className="min-w-40 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								추가
							</button>
							<button
								type="button"
								onClick={handleEdit}
								disabled={!selectedId}
								className="min-w-28 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								수정
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={!selectedId}
								className="min-w-28 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								삭제
							</button>
							<button
								type="button"
								onClick={handleRegisterApply}
								className="min-w-40 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								반영내용등록
							</button>
							<button
								type="button"
								onClick={handlePrint}
								className="min-w-28 rounded border border-blue-400 bg-blue-200 px-8 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								출력
							</button>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
