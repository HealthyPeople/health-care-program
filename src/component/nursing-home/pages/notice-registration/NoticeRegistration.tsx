"use client";

import React, { useMemo, useState } from "react";

interface NoticeRow {
	id: string;
	startDate: string; // 공지시작일
	endDate: string; // 공지종료일
	centerName: string; // 등록센터
	registrant: string; // 등록자
	title: string; // 공지제목
	content: string; // 공지내용
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function NoticeRegistration() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [baseDate, setBaseDate] = useState<string>(todayStr);

	const [notices, setNotices] = useState<NoticeRow[]>(() => [
		{
			id: "n1",
			startDate: "2025-12-18",
			endDate: "2025-12-31",
			centerName: "실습요양원",
			registrant: "관리자",
			title: "연말 운영 안내",
			content: "연말 운영시간 및 프로그램 일정 안내드립니다.",
		},
		{
			id: "n2",
			startDate: todayStr,
			endDate: todayStr,
			centerName: "실습요양원",
			registrant: "관리자",
			title: "공지 테스트",
			content: "",
		},
	]);

	const filteredNotices = useMemo(() => {
		// 퍼블: 공지기준일자 기준으로 시작일이 baseDate 이전/이후 등 정책이 불명확하므로
		// 일단 startDate가 baseDate 이하인 것만 보여주도록 구성(필요 시 변경)
		return notices
			.filter((n) => !baseDate || n.startDate <= baseDate)
			.sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0));
	}, [notices, baseDate]);

	const [selectedNoticeId, setSelectedNoticeId] = useState<string>(() => filteredNotices[0]?.id || "");

	const selectedNotice = useMemo(() => {
		return notices.find((n) => n.id === selectedNoticeId) || null;
	}, [notices, selectedNoticeId]);

	const [form, setForm] = useState<NoticeRow>(() => ({
		id: "new",
		startDate: todayStr,
		endDate: todayStr,
		centerName: "실습요양원",
		registrant: "",
		title: "",
		content: "",
	}));

	React.useEffect(() => {
		if (!selectedNotice) return;
		setForm({ ...selectedNotice });
	}, [selectedNotice]);

	const handleSearch = () => {
		// 퍼블: 추후 API 연동
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleAdd = () => {
		setSelectedNoticeId("");
		setForm({
			id: "new",
			startDate: todayStr,
			endDate: todayStr,
			centerName: "실습요양원",
			registrant: "",
			title: "",
			content: "",
		});
	};

	const handleSave = () => {
		const id = form.id === "new" ? `n${Date.now()}` : form.id;
		const row: NoticeRow = { ...form, id };
		setNotices((prev) => {
			const exists = prev.some((n) => n.id === id);
			return exists ? prev.map((n) => (n.id === id ? row : n)) : [row, ...prev];
		});
		setSelectedNoticeId(id);
	};

	const handleDelete = () => {
		if (!selectedNoticeId) return;
		setNotices((prev) => prev.filter((n) => n.id !== selectedNoticeId));
		setSelectedNoticeId("");
		handleAdd();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						공지사항 관리
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								공지기준일자
							</span>
							<input
								type="date"
								value={baseDate}
								onChange={(e) => setBaseDate(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>

						<button
							type="button"
							onClick={handleSearch}
							className="w-40 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
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

				{/* 본문: 좌 목록 + 우 상세 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌측: 공지시작일 목록 */}
					<div className="col-span-12 lg:col-span-2 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							공지시작일
						</div>
						<div className="max-h-[520px] overflow-auto">
							<table className="w-full text-sm">
								<tbody>
									{filteredNotices.length === 0 ? (
										<tr>
											<td className="px-3 py-10 text-center text-blue-900/60">데이터가 없습니다.</td>
										</tr>
									) : (
										filteredNotices.map((n) => {
											const isSelected = n.id === selectedNoticeId;
											return (
												<tr
													key={n.id}
													onClick={() => setSelectedNoticeId(n.id)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="px-3 py-2">{n.startDate}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 우측: 상세 입력 */}
					<div className="col-span-12 lg:col-span-10 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="p-3 space-y-2">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									공지시작일
								</span>
								<input
									type="date"
									value={form.startDate}
									onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<div className="col-span-1" />
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									공지종료일
								</span>
								<input
									type="date"
									value={form.endDate}
									onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
									className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<div className="col-span-1" />
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									등록센터
								</span>
								<input
									value={form.centerName}
									onChange={(e) => setForm((p) => ({ ...p, centerName: e.target.value }))}
									className="col-span-7 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
								<span className="col-span-1" />
								<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									등록자
								</span>
								<input
									value={form.registrant}
									onChange={(e) => setForm((p) => ({ ...p, registrant: e.target.value }))}
									className="col-span-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									공지제목
								</span>
								<input
									value={form.title}
									onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
									className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									공지내용
								</span>
								<textarea
									value={form.content}
									onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
									rows={18}
									className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 resize-none"
								/>
							</div>

							{/* 하단 버튼 */}
							<div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-200">
								<button
									type="button"
									onClick={handleAdd}
									className="w-56 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									추가
								</button>
								<button
									type="button"
									onClick={handleSave}
									className="w-56 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									수정
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={!selectedNoticeId}
									className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									삭제
								</button>
								<button
									type="button"
									className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									출력
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

