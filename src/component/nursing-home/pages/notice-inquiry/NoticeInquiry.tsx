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

export default function NoticeInquiry() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [baseDate, setBaseDate] = useState<string>(todayStr);
	const [titleQuery, setTitleQuery] = useState<string>("");

	// 조회 전용: 데모 데이터 (추후 Notice API 연동)
	const [notices] = useState<NoticeRow[]>(() => [
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
			content: "공지사항 조회 전용 화면입니다.",
		},
	]);

	const filteredNotices = useMemo(() => {
		const q = titleQuery.trim();
		return notices
			.filter((n) => (!baseDate ? true : n.startDate <= baseDate))
			.filter((n) => (q ? n.title.includes(q) : true))
			.sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0));
	}, [notices, baseDate, titleQuery]);

	const [selectedNoticeId, setSelectedNoticeId] = useState<string>(() => filteredNotices[0]?.id || "");

	const selectedNotice = useMemo(() => {
		return notices.find((n) => n.id === selectedNoticeId) || filteredNotices[0] || null;
	}, [notices, selectedNoticeId, filteredNotices]);

	const handleSearch = () => {
		// 퍼블: 로컬 필터링
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						공지사항 조회
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

						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								제목
							</span>
							<input
								value={titleQuery}
								onChange={(e) => setTitleQuery(e.target.value)}
								className="w-64 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								placeholder="공지제목 검색"
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
					{/* 좌측 목록 */}
					<div className="col-span-12 lg:col-span-4 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							공지 목록
						</div>
						<div className="max-h-[620px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											시작일
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">제목</th>
									</tr>
								</thead>
								<tbody>
									{filteredNotices.length === 0 ? (
										<tr>
											<td colSpan={2} className="px-3 py-12 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
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
													<td className="border-r border-blue-100 px-3 py-2">{n.startDate}</td>
													<td className="px-3 py-2">{n.title}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 우측 상세 */}
					<div className="col-span-12 lg:col-span-8 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							공지 상세
						</div>

						<div className="p-3 space-y-2">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									공지시작일
								</span>
								<input
									readOnly
									value={selectedNotice?.startDate || ""}
									className="col-span-4 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									공지종료일
								</span>
								<input
									readOnly
									value={selectedNotice?.endDate || ""}
									className="col-span-4 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									등록센터
								</span>
								<input
									readOnly
									value={selectedNotice?.centerName || ""}
									className="col-span-7 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
								<span className="col-span-1" />
								<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									등록자
								</span>
								<input
									readOnly
									value={selectedNotice?.registrant || ""}
									className="col-span-1 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									제목
								</span>
								<input
									readOnly
									value={selectedNotice?.title || ""}
									className="col-span-10 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
							</div>

							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									내용
								</span>
								<textarea
									readOnly
									value={selectedNotice?.content || ""}
									rows={22}
									className="col-span-10 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 resize-none"
								/>
							</div>

							<div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-200">
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

