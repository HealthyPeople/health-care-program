"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	buildNoticePrintHtml,
	openPrintPreviewWindow,
} from "../notice-registration/noticeRegistrationPrint";

interface NoticeDetail {
	seq: number | null;
	startDate: string;
	endDate: string;
	centerName: string;
	registrant: string;
	title: string;
	content: string;
}

interface F60030ListItem {
	SEQ: number;
	MDOC?: string;
	SDT?: string;
	EDT?: string;
	ANCD?: number | string;
	MNM?: string;
	ANNM?: string;
	INEMPNM?: string;
}

interface F60030Detail extends F60030ListItem {
	MDES?: string;
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) =>
	`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const labelClass =
	"rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center";
const inputClass =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const readOnlyCls =
	"rounded border border-blue-200 bg-gray-50 px-3 py-2 text-sm text-blue-900 min-h-[38px]";

const emptyDetail = (): NoticeDetail => ({
	seq: null,
	startDate: "",
	endDate: "",
	centerName: "",
	registrant: "",
	title: "",
	content: "",
});

function toText(v: unknown): string {
	if (v == null) return "";
	return String(v).trim();
}

function formatDateYmd(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapDetailToView(row: F60030Detail, centerFallback: string): NoticeDetail {
	return {
		seq: row.SEQ ?? null,
		startDate: formatDateYmd(row.SDT),
		endDate: formatDateYmd(row.EDT),
		centerName: toText(row.ANNM) || centerFallback,
		registrant: toText(row.MNM) || toText(row.INEMPNM),
		title: toText(row.MDOC),
		content: toText(row.MDES),
	};
}

function buildListItems(notices: F60030ListItem[], titleQuery: string): F60030ListItem[] {
	const q = titleQuery.trim();
	return [...notices]
		.filter((n) => (q ? String(n.MDOC ?? "").includes(q) : true))
		.sort((a, b) => {
			const sa = formatDateYmd(a.SDT);
			const sb = formatDateYmd(b.SDT);
			if (sa < sb) return 1;
			if (sa > sb) return -1;
			return (b.SEQ ?? 0) - (a.SEQ ?? 0);
		});
}

export default function NoticeInquiry() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [periodStart, setPeriodStart] = useState<string>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 1);
		return formatDate(d);
	});
	const [periodEnd, setPeriodEnd] = useState<string>(todayStr);
	const [titleQuery, setTitleQuery] = useState<string>("");

	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [centerName, setCenterName] = useState("");

	const [notices, setNotices] = useState<F60030ListItem[]>([]);
	const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
	const [detail, setDetail] = useState<NoticeDetail>(() => emptyDetail());
	const [loading, setLoading] = useState(false);

	const listItems = useMemo(
		() => buildListItems(notices, titleQuery),
		[notices, titleQuery]
	);

	const fetchUserInfo = async () => {
		const res = await fetch("/api/auth/user-info", { credentials: "include" });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "로그인 정보를 확인할 수 없습니다.");
		}
		const u = (json.data || {}) as UserInfo;
		if (u.ancd == null || u.ancd === "") {
			throw new Error("로그인 계정의 센터(고객코드)를 확인할 수 없습니다.");
		}
		setSessionAncd(u.ancd);
		setCenterName(toText(u.annm));
		return u;
	};

	const fetchNotices = async (
		ancd: string | number,
		range?: { start?: string; end?: string }
	) => {
		const start = range?.start ?? periodStart;
		const end = range?.end ?? periodEnd;
		const url = `/api/f60030?ancd=${encodeURIComponent(String(ancd))}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
		const res = await fetch(url, { credentials: "include" });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "공지 목록 조회 실패");
		}
		const list = Array.isArray(json.data) ? (json.data as F60030ListItem[]) : [];
		setNotices(list);
		return list;
	};

	const fetchNoticeDetail = async (ancd: string | number, seq: number) => {
		const url = `/api/f60030?ancd=${encodeURIComponent(String(ancd))}&seq=${encodeURIComponent(String(seq))}`;
		const res = await fetch(url, { credentials: "include" });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || "공지 상세 조회 실패");
		}
		return (json.data || {}) as F60030Detail;
	};

	const loadNoticeDetail = useCallback(
		async (seq: number) => {
			if (sessionAncd == null) return;
			const row = await fetchNoticeDetail(sessionAncd, seq);
			const mapped = mapDetailToView(row, centerName);
			setDetail(mapped);
			setSelectedSeq(seq);
		},
		[sessionAncd, centerName]
	);

	const selectFromList = async (
		list: F60030ListItem[],
		currentSeq: number | null,
		query: string
	) => {
		const items = buildListItems(list, query);
		if (items.length === 0) {
			setSelectedSeq(null);
			setDetail(emptyDetail());
			return;
		}
		const keep =
			currentSeq != null && items.some((n) => n.SEQ === currentSeq)
				? currentSeq
				: items[0].SEQ;
		await loadNoticeDetail(keep);
	};

	const initialize = async () => {
		setLoading(true);
		try {
			const u = await fetchUserInfo();
			const list = await fetchNotices(u.ancd!);
			await selectFromList(list, null, titleQuery);
		} catch (err) {
			console.error(err);
			alert(
				err instanceof Error ? err.message : "데이터 조회 중 오류가 발생했습니다."
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void initialize();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSearch = async () => {
		if (!sessionAncd) return;
		if (periodStart && periodEnd && periodStart > periodEnd) {
			alert("조회 시작일이 종료일보다 느을 수 없습니다.");
			return;
		}
		setLoading(true);
		try {
			const list = await fetchNotices(sessionAncd);
			await selectFromList(list, selectedSeq, titleQuery);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			window.history.back();
		}
	};

	const handlePrint = () => {
		if (!selectedSeq) {
			alert("출력할 공지를 선택해주세요.");
			return;
		}
		const html = buildNoticePrintHtml({
			startDate: detail.startDate,
			endDate: detail.endDate,
			centerName: detail.centerName || centerName,
			registrant: detail.registrant,
			title: detail.title,
			content: detail.content,
		});
		openPrintPreviewWindow(html);
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						공지사항 조회
					</div>
					<div className="flex items-center gap-3 flex-wrap">
						{sessionAncd != null && (
							<span className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900">
								로그인 센터 · 고객코드{" "}
								<strong>{String(sessionAncd)}</strong>
								{centerName ? ` (${centerName})` : ""}
							</span>
						)}
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className={`${labelClass} shrink-0`}>공지기준일자</span>
							<input
								type="date"
								value={periodStart}
								onChange={(e) => setPeriodStart(e.target.value)}
								disabled={loading}
								className={inputClass}
								title="조회 시작일"
							/>
							<span className="text-sm text-blue-900">~</span>
							<input
								type="date"
								value={periodEnd}
								onChange={(e) => setPeriodEnd(e.target.value)}
								disabled={loading}
								className={inputClass}
								title="조회 종료일"
							/>
						</div>
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className={`${labelClass} shrink-0`}>제목</span>
							<input
								value={titleQuery}
								onChange={(e) => setTitleQuery(e.target.value)}
								disabled={loading}
								className="w-64 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								placeholder="공지제목 검색"
							/>
						</div>
						<button
							type="button"
							onClick={() => void handleSearch()}
							disabled={loading || !sessionAncd}
							className="w-40 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							검색
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

				{loading && (
					<p className="text-sm text-blue-800/70">공지 목록을 불러오는 중…</p>
				)}

				<div className="grid grid-cols-12 gap-3">
					<div className="col-span-12 lg:col-span-4 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							공지시작일
						</div>
						<div className="max-h-[620px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											시작일
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">
											제목
										</th>
									</tr>
								</thead>
								<tbody>
									{listItems.length === 0 ? (
										<tr>
											<td
												colSpan={2}
												className="px-3 py-12 text-center text-blue-900/60"
											>
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										listItems.map((n) => {
											const isSelected = n.SEQ === selectedSeq;
											return (
												<tr
													key={n.SEQ}
													onClick={() => void loadNoticeDetail(n.SEQ)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-3 py-2">
														{formatDateYmd(n.SDT) || "-"}
													</td>
													<td className="px-3 py-2 truncate">
														{n.MDOC || ""}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="col-span-12 lg:col-span-8 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
							공지 상세
						</div>
						<div className="p-3 space-y-2">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-2 ${labelClass}`}>공지시작일</span>
								<span className={`col-span-4 ${readOnlyCls}`}>
									{detail.startDate || "-"}
								</span>
								<span className={`col-span-2 ${labelClass}`}>공지종료일</span>
								<span className={`col-span-4 ${readOnlyCls}`}>
									{detail.endDate || "-"}
								</span>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-2 ${labelClass}`}>등록센터</span>
								<span className={`col-span-7 ${readOnlyCls}`}>
									{detail.centerName || centerName || "-"}
								</span>
								<span className={`col-span-1 ${labelClass}`}>등록자</span>
								<span className={`col-span-2 ${readOnlyCls}`}>
									{detail.registrant || "-"}
								</span>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className={`col-span-2 ${labelClass}`}>제목</span>
								<span className={`col-span-10 ${readOnlyCls}`}>
									{detail.title || "-"}
								</span>
							</div>
							<div className="grid grid-cols-12 gap-2">
								<span className={`col-span-2 ${labelClass} self-start`}>내용</span>
								<div
									className={`col-span-10 ${readOnlyCls} min-h-[440px] whitespace-pre-wrap`}
								>
									{detail.content || "-"}
								</div>
							</div>
							<div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-200">
								<button
									type="button"
									onClick={handlePrint}
									disabled={!selectedSeq}
									className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
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
