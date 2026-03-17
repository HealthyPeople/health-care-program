"use client";

import React, { useMemo, useState } from "react";

interface GroupRow {
	id: string;
	name: string; // 단체명
	contact: string; // 연락담당자
	phone1: string; // 전화번호1
	phone2: string; // 전화번호2
}

interface PerformanceRow {
	id: string;
	groupId: string;
	date: string; // 봉사일자
	startTime: string;
	endTime: string;
	volunteers: string; // 봉사인원(문자 입력)
	roster: string; // 봉사자명단
	content: {
		list: boolean;
		beauty: boolean;
		programOps: boolean;
		programAssist: boolean;
		other: boolean;
		otherText: string;
	};
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function GroupVolunteerPerformance() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [fromDate, setFromDate] = useState<string>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState<string>(() => todayStr);
	const [groupNameQuery, setGroupNameQuery] = useState<string>("");

	const [groups, setGroups] = useState<GroupRow[]>(() => [
		{ id: "g1", name: "사랑나눔봉사단", contact: "김담당", phone1: "010-1234-5678", phone2: "" },
		{ id: "g2", name: "행복봉사회", contact: "이담당", phone1: "010-2222-3333", phone2: "02-123-4567" },
	]);
	const [selectedGroupId, setSelectedGroupId] = useState<string>("g1");

	const [performances, setPerformances] = useState<PerformanceRow[]>(() => [
		{
			id: "p1",
			groupId: "g1",
			date: todayStr,
			startTime: "09:00",
			endTime: "11:00",
			volunteers: "5",
			roster: "홍길동, 김철수, ...",
			content: {
				list: true,
				beauty: false,
				programOps: true,
				programAssist: false,
				other: false,
				otherText: "",
			},
		},
	]);

	const filteredGroups = useMemo(() => {
		const q = groupNameQuery.trim();
		return groups.filter((g) => (q ? g.name.includes(q) : true));
	}, [groups, groupNameQuery]);

	const selectedGroup = useMemo(
		() => filteredGroups.find((g) => g.id === selectedGroupId) || groups.find((g) => g.id === selectedGroupId) || null,
		[filteredGroups, groups, selectedGroupId]
	);

	const groupPerformances = useMemo(() => {
		const rows = performances.filter((p) => p.groupId === selectedGroupId);
		return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
	}, [performances, selectedGroupId]);

	const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>(() => groupPerformances[0]?.id || "");

	const selectedPerformance = useMemo(() => {
		return performances.find((p) => p.id === selectedPerformanceId) || null;
	}, [performances, selectedPerformanceId]);

	const [form, setForm] = useState<PerformanceRow>(() => ({
		id: "new",
		groupId: selectedGroupId,
		date: todayStr,
		startTime: "",
		endTime: "",
		volunteers: "",
		roster: "",
		content: {
			list: false,
			beauty: false,
			programOps: false,
			programAssist: false,
			other: false,
			otherText: "",
		},
	}));

	React.useEffect(() => {
		if (!selectedGroupId) return;
		setForm((p) => ({ ...p, groupId: selectedGroupId }));
	}, [selectedGroupId]);

	React.useEffect(() => {
		if (!selectedPerformance) {
			setForm((p) => ({ ...p, date: todayStr }));
			return;
		}
		setForm({ ...selectedPerformance });
	}, [selectedPerformance, todayStr]);

	const handleSearch = () => {
		// 퍼블: 추후 API 연동
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleAddGroup = () => {
		const id = `g${Date.now()}`;
		const name = groupNameQuery.trim() || "새 단체";
		setGroups((prev) => [{ id, name, contact: "", phone1: "", phone2: "" }, ...prev]);
		setSelectedGroupId(id);
	};

	const handleEditGroup = () => {
		// 퍼블: 실제 수정 팝업/화면은 추후
	};

	const handleSavePerformance = () => {
		const id = form.id === "new" ? `p${Date.now()}` : form.id;
		const row: PerformanceRow = { ...form, id, groupId: selectedGroupId };
		setPerformances((prev) => {
			const exists = prev.some((p) => p.id === id);
			return exists ? prev.map((p) => (p.id === id ? row : p)) : [row, ...prev];
		});
		setSelectedPerformanceId(id);
	};

	const handleNewForm = () => {
		setSelectedPerformanceId("");
		setForm({
			id: "new",
			groupId: selectedGroupId,
			date: todayStr,
			startTime: "",
			endTime: "",
			volunteers: "",
			roster: "",
			content: {
				list: false,
				beauty: false,
				programOps: false,
				programAssist: false,
				other: false,
				otherText: "",
			},
		});
	};

	const handleDeletePerformance = () => {
		if (!selectedPerformanceId) return;
		setPerformances((prev) => prev.filter((p) => p.id !== selectedPerformanceId));
		setSelectedPerformanceId("");
		handleNewForm();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						단체봉사실적관리
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
								단체명
							</span>
							<input
								value={groupNameQuery}
								onChange={(e) => setGroupNameQuery(e.target.value)}
								className="w-40 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
							<button
								type="button"
								onClick={handleAddGroup}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								단체정보 추가
							</button>
							<button
								type="button"
								onClick={handleEditGroup}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
								disabled={!selectedGroupId}
							>
								단체정보 수정
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
							className="w-32 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 상단 테이블 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[240px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
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
								{filteredGroups.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-10 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									filteredGroups.map((g) => {
										const isSelected = g.id === selectedGroupId;
										return (
											<tr
												key={g.id}
												onClick={() => {
													setSelectedGroupId(g.id);
													setSelectedPerformanceId("");
													handleNewForm();
												}}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{g.name}</td>
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

				{/* 하단 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌측 날짜 리스트 */}
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							봉사일자
						</div>
						<div className="max-h-[340px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{groupPerformances.length === 0 ? (
										<tr>
											<td className="px-3 py-10 text-center text-blue-900/60">데이터가 없습니다.</td>
										</tr>
									) : (
										groupPerformances.map((p) => {
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

					{/* 우측 상세 */}
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

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									단체명
								</span>
								<input
									readOnly
									value={selectedGroup?.name || ""}
									className="col-span-6 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
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

								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									봉사인원
								</span>
								<input
									value={form.volunteers}
									onChange={(e) => setForm((p) => ({ ...p, volunteers: e.target.value }))}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									봉사자명단
								</span>
								<textarea
									value={form.roster}
									onChange={(e) => setForm((p) => ({ ...p, roster: e.target.value }))}
									rows={3}
									className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 resize-none"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-start">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									봉사내용
								</span>
								<div className="col-span-10 grid grid-cols-12 gap-2">
									<label className="col-span-3 flex items-center gap-2 text-sm text-blue-900">
										<input
											type="checkbox"
											checked={form.content.list}
											onChange={(e) =>
												setForm((p) => ({ ...p, content: { ...p.content, list: e.target.checked } }))
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
												setForm((p) => ({ ...p, content: { ...p.content, beauty: e.target.checked } }))
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

							{/* 하단 버튼 바 */}
							<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200">
								<button
									type="button"
									onClick={handleSavePerformance}
									className="flex-1 min-w-[180px] rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									봉사실적저장
								</button>
								<button
									type="button"
									onClick={handleNewForm}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									화면지움
								</button>
								<button
									type="button"
									onClick={handleDeletePerformance}
									disabled={!selectedPerformanceId}
									className="rounded border border-blue-400 bg-blue-200 px-5 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									봉사실적삭제
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

