"use client";

import React, { useMemo, useState } from "react";

interface VolunteerRow {
	id: string;
	name: string; // 봉사자
	phone: string; // 전화번호
	address: string; // 주소
}

interface PerformanceRow {
	id: string;
	volunteerId: string;
	date: string; // 봉사일자
	startTime: string;
	endTime: string;
	content: {
		bath: boolean; // 목욕
		beauty: boolean; // 이미용
		programOps: boolean; // 프로그램 운영
		programAssist: boolean; // 프로그램 보조
		other: boolean;
		otherText: string;
	};
}

interface PerformanceForm {
	date: string;
	volunteerName: string;
	startTime: string;
	endTime: string;
	content: PerformanceRow["content"];
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function IndividualVolunteerPerformance() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [fromDate, setFromDate] = useState<string>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState<string>(() => todayStr);
	const [nameQuery, setNameQuery] = useState<string>("");

	const [volunteers, setVolunteers] = useState<VolunteerRow[]>(() => [
		{ id: "v1", name: "홍길동", phone: "010-1111-2222", address: "서울시 ..." },
		{ id: "v2", name: "김철수", phone: "010-3333-4444", address: "인천시 ..." },
	]);
	const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>("v1");

	const [performances, setPerformances] = useState<PerformanceRow[]>(() => [
		{
			id: "p1",
			volunteerId: "v1",
			date: todayStr,
			startTime: "10:00",
			endTime: "12:00",
			content: {
				bath: true,
				beauty: false,
				programOps: true,
				programAssist: false,
				other: false,
				otherText: "",
			},
		},
	]);

	const filteredVolunteers = useMemo(() => {
		const q = nameQuery.trim();
		return volunteers.filter((v) => (q ? v.name.includes(q) : true));
	}, [volunteers, nameQuery]);

	const selectedVolunteer = useMemo(
		() =>
			filteredVolunteers.find((v) => v.id === selectedVolunteerId) ||
			volunteers.find((v) => v.id === selectedVolunteerId) ||
			null,
		[filteredVolunteers, volunteers, selectedVolunteerId]
	);

	const volunteerPerformances = useMemo(() => {
		const rows = performances.filter((p) => p.volunteerId === selectedVolunteerId);
		return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
	}, [performances, selectedVolunteerId]);

	const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>(() => volunteerPerformances[0]?.id || "");

	const selectedPerformance = useMemo(() => {
		return performances.find((p) => p.id === selectedPerformanceId) || null;
	}, [performances, selectedPerformanceId]);

	const [form, setForm] = useState<PerformanceForm>(() => ({
		date: todayStr,
		volunteerName: selectedVolunteer?.name || "",
		startTime: "",
		endTime: "",
		content: {
			bath: false,
			beauty: false,
			programOps: false,
			programAssist: false,
			other: false,
			otherText: "",
		},
	}));

	React.useEffect(() => {
		setForm((p) => ({ ...p, volunteerName: selectedVolunteer?.name || "" }));
	}, [selectedVolunteer]);

	React.useEffect(() => {
		if (!selectedPerformance) {
			setForm((p) => ({ ...p, date: todayStr }));
			return;
		}
		setForm({
			date: selectedPerformance.date,
			volunteerName: selectedVolunteer?.name || "",
			startTime: selectedPerformance.startTime,
			endTime: selectedPerformance.endTime,
			content: { ...selectedPerformance.content },
		});
	}, [selectedPerformance, selectedVolunteer, todayStr]);

	const handleSearch = () => {
		// 퍼블: 추후 API 연동
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleAddVolunteer = () => {
		const id = `v${Date.now()}`;
		const name = nameQuery.trim() || "새 봉사자";
		setVolunteers((prev) => [{ id, name, phone: "", address: "" }, ...prev]);
		setSelectedVolunteerId(id);
		setSelectedPerformanceId("");
		handleClearForm();
	};

	const handleEditVolunteer = () => {
		// 퍼블: 실제 수정 UI는 추후
	};

	const handleSave = () => {
		const id = selectedPerformanceId || `p${Date.now()}`;
		const row: PerformanceRow = {
			id,
			volunteerId: selectedVolunteerId,
			date: form.date,
			startTime: form.startTime,
			endTime: form.endTime,
			content: { ...form.content },
		};
		setPerformances((prev) => {
			const exists = prev.some((p) => p.id === id);
			return exists ? prev.map((p) => (p.id === id ? row : p)) : [row, ...prev];
		});
		setSelectedPerformanceId(id);
	};

	const handleClearForm = () => {
		setSelectedPerformanceId("");
		setForm({
			date: todayStr,
			volunteerName: selectedVolunteer?.name || "",
			startTime: "",
			endTime: "",
			content: {
				bath: false,
				beauty: false,
				programOps: false,
				programAssist: false,
				other: false,
				otherText: "",
			},
		});
	};

	const handleDelete = () => {
		if (!selectedPerformanceId) return;
		setPerformances((prev) => prev.filter((p) => p.id !== selectedPerformanceId));
		handleClearForm();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						개인봉사실적관리
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								기 간
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

						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								성 명
							</span>
							<input
								value={nameQuery}
								onChange={(e) => setNameQuery(e.target.value)}
								className="w-40 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
							<button
								type="button"
								onClick={handleAddVolunteer}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								개인정보 추가
							</button>
							<button
								type="button"
								onClick={handleEditVolunteer}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
								disabled={!selectedVolunteerId}
							>
								개인정보 수정
							</button>
						</div>

						<button
							type="button"
							onClick={handleSearch}
							className="w-32 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-20 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 상단 봉사자 목록 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[260px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
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
								{filteredVolunteers.length === 0 ? (
									<tr>
										<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									filteredVolunteers.map((v) => {
										const isSelected = v.id === selectedVolunteerId;
										return (
											<tr
												key={v.id}
												onClick={() => {
													setSelectedVolunteerId(v.id);
													setSelectedPerformanceId("");
													handleClearForm();
												}}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{v.name}</td>
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

				{/* 하단 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌: 봉사일자 */}
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							봉사일자
						</div>
						<div className="max-h-[360px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{volunteerPerformances.length === 0 ? (
										<tr>
											<td className="px-3 py-10 text-center text-blue-900/60">데이터가 없습니다.</td>
										</tr>
									) : (
										volunteerPerformances.map((p) => {
											const isSelected = p.id === selectedPerformanceId;
											return (
												<tr
													key={p.id}
													onClick={() => setSelectedPerformanceId(p.id)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="px-3 py-2">{p.date}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 우: 상세 */}
					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 space-y-3">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									봉사일자
								</span>
								<input
									type="date"
									value={form.date}
									onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
									className="col-span-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>

								<div className="col-span-3" />
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									봉사자
								</span>
								<input
									readOnly
									value={form.volunteerName}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center border-b border-blue-200 pb-3">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									봉사시간
								</span>
								<input
									type="time"
									value={form.startTime}
									onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
									className="col-span-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<span className="col-span-1 text-center text-blue-900/70">~</span>
								<input
									type="time"
									value={form.endTime}
									onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
									className="col-span-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<div className="col-span-5" />
							</div>

							<div className="grid grid-cols-12 gap-2 items-start">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									봉사내용
								</span>
								<div className="col-span-10 grid grid-cols-12 gap-2">
									<label className="col-span-3 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.bath}
											onChange={(e) =>
												setForm((p) => ({ ...p, content: { ...p.content, bath: e.target.checked } }))
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
									<label className="col-span-4 flex items-center gap-2 text-sm text-blue-900">
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
									<label className="col-span-4 flex items-center gap-2 text-sm text-blue-900">
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
												setForm((p) => ({ ...p, content: { ...p.content, other: e.target.checked } }))
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
										className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 disabled:bg-blue-50"
									/>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200">
								<button
									type="button"
									onClick={handleSave}
									className="flex-1 min-w-[180px] rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									봉사정보 저장
								</button>
								<button
									type="button"
									onClick={handleClearForm}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									봉사정보지움
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={!selectedPerformanceId}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									봉사정보삭제
								</button>
								<button
									type="button"
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									봉사내용출력
								</button>
								<button
									type="button"
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									봉사자출력
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

