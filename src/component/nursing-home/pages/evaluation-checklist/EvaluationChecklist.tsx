"use client";

import React, { useMemo, useState } from "react";

type ChecklistStatus = "작성중" | "완료";
type ChecklistType = "운영" | "안전" | "위생" | "인력" | "기타";

interface ChecklistItemRow {
	id: string;
	section: string; // 구분(대분류)
	item: string; // 점검 항목
	standard: string; // 기준
	scoreMax: number; // 배점
	score: number; // 점수
	checked: boolean; // 체크 여부(간단 표시)
	note: string; // 비고
}

interface ChecklistDoc {
	id: string;
	docDate: string; // 작성일자 YYYY-MM-DD
	type: ChecklistType;
	title: string;
	inspector: string; // 점검자
	status: ChecklistStatus;
	items: ChecklistItemRow[];
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function sum(nums: number[]) {
	return nums.reduce((a, b) => a + b, 0);
}

export default function EvaluationChecklist() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [fromDate, setFromDate] = useState<string>(() => {
		const d = new Date();
		d.setMonth(d.getMonth() - 1);
		return formatDate(d);
	});
	const [toDate, setToDate] = useState<string>(() => todayStr);
	const [typeFilter, setTypeFilter] = useState<ChecklistType | "전체">("전체");
	const [statusFilter, setStatusFilter] = useState<ChecklistStatus | "전체">("전체");
	const [query, setQuery] = useState<string>("");

	const demoDocs = useMemo<ChecklistDoc[]>(() => {
		const baseItems: ChecklistItemRow[] = [
			{
				id: "i1",
				section: "시설/환경",
				item: "비상구 안내 표지 부착",
				standard: "식별 가능한 위치에 부착",
				scoreMax: 5,
				score: 5,
				checked: true,
				note: "",
			},
			{
				id: "i2",
				section: "안전",
				item: "소화기 점검(유효기간/압력)",
				standard: "정상/유효",
				scoreMax: 10,
				score: 8,
				checked: true,
				note: "1층 복도 1대 교체 예정",
			},
			{
				id: "i3",
				section: "위생",
				item: "손위생 물품 비치",
				standard: "손소독제/비누/타월 비치",
				scoreMax: 5,
				score: 5,
				checked: true,
				note: "",
			},
			{
				id: "i4",
				section: "운영",
				item: "프로그램 계획 및 기록 관리",
				standard: "월간 계획/일지 기록 보관",
				scoreMax: 10,
				score: 7,
				checked: false,
				note: "기록 누락 2건 보완 필요",
			},
		];

		return [
			{
				id: "d1",
				docDate: todayStr,
				type: "안전",
				title: "3월 안전 점검",
				inspector: "관리자",
				status: "작성중",
				items: baseItems.map((x) => ({ ...x })),
			},
			{
				id: "d2",
				docDate: "2026-02-10",
				type: "위생",
				title: "2월 위생 점검",
				inspector: "관리자",
				status: "완료",
				items: baseItems.map((x) => ({ ...x, id: `${x.id}-2`, score: x.scoreMax, checked: true, note: "" })),
			},
		];
	}, [todayStr]);

	const [docs, setDocs] = useState<ChecklistDoc[]>(demoDocs);
	const [selectedDocId, setSelectedDocId] = useState<string>(demoDocs[0]?.id || "");

	const filteredDocs = useMemo(() => {
		const q = query.trim();
		return docs
			.filter((d) => (!fromDate ? true : d.docDate >= fromDate))
			.filter((d) => (!toDate ? true : d.docDate <= toDate))
			.filter((d) => (typeFilter === "전체" ? true : d.type === typeFilter))
			.filter((d) => (statusFilter === "전체" ? true : d.status === statusFilter))
			.filter((d) => (q ? d.title.includes(q) || d.inspector.includes(q) : true))
			.sort((a, b) => (a.docDate < b.docDate ? 1 : a.docDate > b.docDate ? -1 : 0));
	}, [docs, fromDate, toDate, typeFilter, statusFilter, query]);

	const pageSize = 10;
	const [currentPage, setCurrentPage] = useState<number>(1);
	const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
	const safePage = Math.min(Math.max(1, currentPage), totalPages);
	const pagedDocs = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filteredDocs.slice(start, start + pageSize);
	}, [filteredDocs, safePage]);

	React.useEffect(() => {
		setCurrentPage(1);
	}, [fromDate, toDate, typeFilter, statusFilter, query]);

	React.useEffect(() => {
		if (!filteredDocs.length) {
			setSelectedDocId("");
			return;
		}
		if (!selectedDocId || !filteredDocs.some((d) => d.id === selectedDocId)) {
			setSelectedDocId(filteredDocs[0].id);
		}
	}, [filteredDocs, selectedDocId]);

	const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedDocId) || null, [docs, selectedDocId]);

	const totalMax = useMemo(() => (selectedDoc ? sum(selectedDoc.items.map((i) => i.scoreMax)) : 0), [selectedDoc]);
	const totalScore = useMemo(() => (selectedDoc ? sum(selectedDoc.items.map((i) => i.score)) : 0), [selectedDoc]);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleSearch = () => {
		// 퍼블: 로컬 필터링
	};

	const handleNew = () => {
		const id = `d${Date.now()}`;
		const newDoc: ChecklistDoc = {
			id,
			docDate: todayStr,
			type: "운영",
			title: "새 점검표",
			inspector: "관리자",
			status: "작성중",
			items: [
				{
					id: `i${Date.now()}-1`,
					section: "운영",
					item: "점검 항목을 입력하세요",
					standard: "-",
					scoreMax: 5,
					score: 0,
					checked: false,
					note: "",
				},
			],
		};
		setDocs((prev) => [newDoc, ...prev]);
		setSelectedDocId(id);
	};

	const handleSave = () => {
		// 퍼블: 이미 로컬 상태에 반영되므로 별도 동작 없음(추후 API 저장)
	};

	const handleComplete = () => {
		if (!selectedDocId) return;
		setDocs((prev) => prev.map((d) => (d.id === selectedDocId ? { ...d, status: "완료" } : d)));
	};

	const handlePrint = () => {
		// 퍼블: 추후 출력 API/기능 연동
	};

	const updateDoc = (patch: Partial<ChecklistDoc>) => {
		if (!selectedDocId) return;
		setDocs((prev) => prev.map((d) => (d.id === selectedDocId ? { ...d, ...patch } : d)));
	};

	const updateItem = (itemId: string, patch: Partial<ChecklistItemRow>) => {
		if (!selectedDocId) return;
		setDocs((prev) =>
			prev.map((d) => {
				if (d.id !== selectedDocId) return d;
				return {
					...d,
					items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
				};
			})
		);
	};

	const addItem = () => {
		if (!selectedDocId) return;
		const id = `i${Date.now()}`;
		setDocs((prev) =>
			prev.map((d) =>
				d.id !== selectedDocId
					? d
					: {
							...d,
							items: [
								...d.items,
								{
									id,
									section: "기타",
									item: "",
									standard: "",
									scoreMax: 5,
									score: 0,
									checked: false,
									note: "",
								},
							],
					  }
			)
		);
	};

	const deleteItem = (itemId: string) => {
		if (!selectedDocId) return;
		setDocs((prev) =>
			prev.map((d) => (d.id !== selectedDocId ? d : { ...d, items: d.items.filter((i) => i.id !== itemId) }))
		);
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						평가 체크리스트
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								기간
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
								구분
							</span>
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value as ChecklistType | "전체")}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
							>
								<option value="전체">전체</option>
								<option value="운영">운영</option>
								<option value="안전">안전</option>
								<option value="위생">위생</option>
								<option value="인력">인력</option>
								<option value="기타">기타</option>
							</select>
						</div>

						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								상태
							</span>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value as ChecklistStatus | "전체")}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
							>
								<option value="전체">전체</option>
								<option value="작성중">작성중</option>
								<option value="완료">완료</option>
							</select>
						</div>

						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								검색
							</span>
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="제목/점검자"
								className="w-56 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>

						<button
							type="button"
							onClick={handleSearch}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={handleNew}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							신규
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							저장
						</button>
						<button
							type="button"
							onClick={handleComplete}
							disabled={!selectedDocId || selectedDoc?.status === "완료"}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							완료
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							출력
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 본문 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌측 목록 */}
					<div className="col-span-12 xl:col-span-5 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900 flex items-center justify-between">
							<div>체크리스트 목록</div>
							<div className="text-xs text-blue-900/60">
								총 {filteredDocs.length}건 · {safePage}/{totalPages}페이지
							</div>
						</div>
						<div className="max-h-[680px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											작성일자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											구분
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											제목
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">상태</th>
									</tr>
								</thead>
								<tbody>
									{pagedDocs.length === 0 ? (
										<tr>
											<td colSpan={4} className="px-3 py-12 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										pagedDocs.map((d) => {
											const isSelected = d.id === selectedDocId;
											return (
												<tr
													key={d.id}
													onClick={() => setSelectedDocId(d.id)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-3 py-2">{d.docDate}</td>
													<td className="border-r border-blue-100 px-3 py-2">{d.type}</td>
													<td className="border-r border-blue-100 px-3 py-2">{d.title}</td>
													<td className="px-3 py-2">{d.status}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => setCurrentPage(1)}
								disabled={safePage === 1}
								className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								처음
							</button>
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={safePage === 1}
								className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								이전
							</button>
							<div className="text-xs text-blue-900">
								{safePage} / {totalPages}
							</div>
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={safePage === totalPages}
								className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								다음
							</button>
							<button
								type="button"
								onClick={() => setCurrentPage(totalPages)}
								disabled={safePage === totalPages}
								className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								마지막
							</button>
						</div>
					</div>

					{/* 우측 상세 */}
					<div className="col-span-12 xl:col-span-7 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900 flex items-center justify-between">
							<div>체크리스트 상세</div>
							<div className="text-xs text-blue-900/70">
								총점 {totalScore} / {totalMax}
							</div>
						</div>

						<div className="p-3 space-y-3">
							{!selectedDoc ? (
								<div className="py-24 text-center text-blue-900/60">좌측에서 항목을 선택하세요.</div>
							) : (
								<>
									<div className="grid grid-cols-12 gap-2 items-center">
										<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											작성일자
										</span>
										<input
											type="date"
											value={selectedDoc.docDate}
											onChange={(e) => updateDoc({ docDate: e.target.value })}
											className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
										/>
										<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											구분
										</span>
										<select
											value={selectedDoc.type}
											onChange={(e) => updateDoc({ type: e.target.value as ChecklistType })}
											className="col-span-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
										>
											<option value="운영">운영</option>
											<option value="안전">안전</option>
											<option value="위생">위생</option>
											<option value="인력">인력</option>
											<option value="기타">기타</option>
										</select>
										<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											점검자
										</span>
										<input
											value={selectedDoc.inspector}
											onChange={(e) => updateDoc({ inspector: e.target.value })}
											className="col-span-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
										/>
									</div>

									<div className="grid grid-cols-12 gap-2 items-center">
										<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											제목
										</span>
										<input
											value={selectedDoc.title}
											onChange={(e) => updateDoc({ title: e.target.value })}
											className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
										/>
									</div>

									<div className="rounded border border-blue-200 overflow-hidden">
										<div className="flex items-center justify-between bg-blue-50/60 px-3 py-2 border-b border-blue-200">
											<div className="text-sm font-semibold text-blue-900">점검 항목</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={addItem}
													className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-300"
												>
													항목추가
												</button>
											</div>
										</div>
										<div className="max-h-[460px] overflow-auto">
											<table className="w-full text-sm">
												<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
													<tr>
														<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[90px]">
															체크
														</th>
														<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[140px]">
															구분
														</th>
														<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
															항목
														</th>
														<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
															기준
														</th>
														<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[90px]">
															배점
														</th>
														<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[90px]">
															점수
														</th>
														<th className="px-3 py-2 text-left font-semibold text-blue-900 w-[260px]">
															비고
														</th>
														<th className="px-3 py-2 text-left font-semibold text-blue-900 w-[70px]">
															삭제
														</th>
													</tr>
												</thead>
												<tbody>
													{selectedDoc.items.map((it) => (
														<tr key={it.id} className="border-b border-blue-50">
															<td className="border-r border-blue-100 px-3 py-2">
																<input
																	type="checkbox"
																	checked={it.checked}
																	onChange={(e) => updateItem(it.id, { checked: e.target.checked })}
																	className="h-4 w-4 accent-blue-600"
																/>
															</td>
															<td className="border-r border-blue-100 px-3 py-2">
																<input
																	value={it.section}
																	onChange={(e) => updateItem(it.id, { section: e.target.value })}
																	className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-sm"
																/>
															</td>
															<td className="border-r border-blue-100 px-3 py-2">
																<input
																	value={it.item}
																	onChange={(e) => updateItem(it.id, { item: e.target.value })}
																	className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-sm"
																/>
															</td>
															<td className="border-r border-blue-100 px-3 py-2">
																<input
																	value={it.standard}
																	onChange={(e) => updateItem(it.id, { standard: e.target.value })}
																	className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-sm"
																/>
															</td>
															<td className="border-r border-blue-100 px-3 py-2">
																<input
																	type="number"
																	min={0}
																	value={it.scoreMax}
																	onChange={(e) => updateItem(it.id, { scoreMax: Number(e.target.value || 0) })}
																	className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-sm"
																/>
															</td>
															<td className="border-r border-blue-100 px-3 py-2">
																<input
																	type="number"
																	min={0}
																	max={it.scoreMax}
																	value={it.score}
																	onChange={(e) => updateItem(it.id, { score: Number(e.target.value || 0) })}
																	className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-sm"
																/>
															</td>
															<td className="px-3 py-2">
																<input
																	value={it.note}
																	onChange={(e) => updateItem(it.id, { note: e.target.value })}
																	className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-sm"
																/>
															</td>
															<td className="px-3 py-2">
																<button
																	type="button"
																	onClick={() => deleteItem(it.id)}
																	className="w-full rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
																>
																	삭제
																</button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

