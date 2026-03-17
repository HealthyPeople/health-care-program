"use client";

import React, { useMemo, useState } from "react";

interface CenterRow {
	ancd: string; // ANCD
	centerName: string; // 센터명
	startDate: string; // 시작일
	endDate: string; // 종료일
	monthlyFee: number | null; // 월사용료
}

interface ApprovalRow {
	id: string;
	ancd: string;
	year: number;
	month: number; // 1-12
	approvalDate: string; // 결재일자 YYYY-MM-DD
	amount: number; // 결재금액
	depositCenter: string; // 입금센터
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const formatYyyyMm = (year: number, month: number) => `${year}-${pad2(month)}`;
const formatAmount = (n: number) => n.toLocaleString("ko-KR");

const demoCenters: CenterRow[] = [
	{ ancd: "180004", centerName: "교육문화사업부", startDate: "2017-02-03", endDate: "2099-02-28", monthlyFee: null },
	{ ancd: "180001", centerName: "나성홈 해원", startDate: "2014-05-05", endDate: "2099-12-31", monthlyFee: 100_000 },
	{ ancd: "182020", centerName: "나성홈로아", startDate: "2022-12-01", endDate: "2099-12-31", monthlyFee: null },
	{ ancd: "181008", centerName: "더사랑 효인요양센터", startDate: "2016-09-01", endDate: "2022-03-31", monthlyFee: null },
	{ ancd: "110000", centerName: "돌봄시설Admin", startDate: "2014-01-01", endDate: "2099-12-31", monthlyFee: null },
	{ ancd: "190000", centerName: "TEST요양원", startDate: "2014-07-01", endDate: "2099-12-31", monthlyFee: null },
	{ ancd: "185021", centerName: "좋은이웃데이케어센터-단기", startDate: "2022-03-01", endDate: "2099-12-31", monthlyFee: 50_000 },
	{ ancd: "185020", centerName: "좋은이웃요양센터", startDate: "2019-11-01", endDate: "2022-03-31", monthlyFee: 50_000 },
	{ ancd: "180010", centerName: "조단-나성홈 해원", startDate: "2016-11-01", endDate: "2016-11-02", monthlyFee: null },
	{ ancd: "180011", centerName: "조단-다산노인전문요양원", startDate: "2017-01-01", endDate: "2017-01-01", monthlyFee: null },
];

const demoApprovals: ApprovalRow[] = [
	{
		id: "a1",
		ancd: "180004",
		year: 2026,
		month: 1,
		approvalDate: "2026-01-05",
		amount: 120_000,
		depositCenter: "교육문화사업부",
	},
	{
		id: "a2",
		ancd: "180004",
		year: 2026,
		month: 2,
		approvalDate: "2026-02-05",
		amount: 120_000,
		depositCenter: "교육문화사업부",
	},
];

export default function FacilityWorkLogApproval() {
	const today = useMemo(() => new Date(), []);

	const [centerNameQuery, setCenterNameQuery] = useState<string>("");
	const [year, setYear] = useState<number>(today.getFullYear());

	const [centers] = useState<CenterRow[]>(demoCenters);
	const [approvals, setApprovals] = useState<ApprovalRow[]>(demoApprovals);

	const [selectedCenterAncd, setSelectedCenterAncd] = useState<string>(demoCenters[0]?.ancd || "");
	const selectedCenter = useMemo(
		() => centers.find((c) => c.ancd === selectedCenterAncd) || null,
		[centers, selectedCenterAncd]
	);

	const filteredCenters = useMemo(() => {
		const q = centerNameQuery.trim();
		return centers.filter((c) => (q ? c.centerName.includes(q) : true));
	}, [centers, centerNameQuery]);

	const centerPageSize = 15;
	const [centerPage, setCenterPage] = useState<number>(1);
	const centerTotalPages = Math.max(1, Math.ceil(filteredCenters.length / centerPageSize));
	const safeCenterPage = Math.min(Math.max(1, centerPage), centerTotalPages);
	const pagedCenters = useMemo(() => {
		const start = (safeCenterPage - 1) * centerPageSize;
		return filteredCenters.slice(start, start + centerPageSize);
	}, [filteredCenters, safeCenterPage]);

	React.useEffect(() => {
		setCenterPage(1);
	}, [centerNameQuery]);

	React.useEffect(() => {
		if (!filteredCenters.length) {
			setSelectedCenterAncd("");
			return;
		}
		if (!selectedCenterAncd || !filteredCenters.some((c) => c.ancd === selectedCenterAncd)) {
			setSelectedCenterAncd(filteredCenters[0].ancd);
		}
	}, [filteredCenters, selectedCenterAncd]);

	const filteredApprovals = useMemo(() => {
		if (!selectedCenterAncd) return [];
		return approvals
			.filter((a) => a.ancd === selectedCenterAncd)
			.filter((a) => a.year === year)
			.sort((a, b) => (formatYyyyMm(a.year, a.month) < formatYyyyMm(b.year, b.month) ? 1 : -1));
	}, [approvals, selectedCenterAncd, year]);

	const [selectedApprovalId, setSelectedApprovalId] = useState<string>("");
	const selectedApproval = useMemo(
		() => filteredApprovals.find((a) => a.id === selectedApprovalId) || null,
		[filteredApprovals, selectedApprovalId]
	);

	const [formYearMonth, setFormYearMonth] = useState<string>(() => `${year}-${pad2(today.getMonth() + 1)}`);
	const [formApprovalDate, setFormApprovalDate] = useState<string>(() => formatDate(today));
	const [formAmount, setFormAmount] = useState<string>("");
	const [formDepositCenter, setFormDepositCenter] = useState<string>("");

	React.useEffect(() => {
		setFormYearMonth(`${year}-${pad2(today.getMonth() + 1)}`);
	}, [year, today]);

	React.useEffect(() => {
		if (!selectedApproval) return;
		setFormYearMonth(formatYyyyMm(selectedApproval.year, selectedApproval.month));
		setFormApprovalDate(selectedApproval.approvalDate);
		setFormAmount(String(selectedApproval.amount));
		setFormDepositCenter(selectedApproval.depositCenter);
	}, [selectedApproval]);

	const approvalCount = filteredApprovals.length;

	const handleSearch = () => {
		// 퍼블: 로컬 필터링
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleRegister = () => {
		if (!selectedCenterAncd) return;
		const [yStr, mStr] = (formYearMonth || "").split("-");
		const y = Number(yStr);
		const m = Number(mStr);
		if (!y || !m) return;
		const amount = Number(String(formAmount).replaceAll(",", "")) || 0;

		const id = selectedApprovalId || `a${Date.now()}`;
		const row: ApprovalRow = {
			id,
			ancd: selectedCenterAncd,
			year: y,
			month: m,
			approvalDate: formApprovalDate || formatDate(new Date()),
			amount,
			depositCenter: formDepositCenter || selectedCenter?.centerName || "",
		};

		setApprovals((prev) => {
			const exists = prev.some((a) => a.id === id);
			return exists ? prev.map((a) => (a.id === id ? row : a)) : [row, ...prev];
		});
		setSelectedApprovalId(id);
	};

	const handleDelete = () => {
		if (!selectedApprovalId) return;
		setApprovals((prev) => prev.filter((a) => a.id !== selectedApprovalId));
		setSelectedApprovalId("");
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						센터 결재관리
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								센터명
							</span>
							<input
								value={centerNameQuery}
								onChange={(e) => setCenterNameQuery(e.target.value)}
								className="w-56 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								년도
							</span>
							<input
								type="number"
								value={year}
								onChange={(e) => setYear(Number(e.target.value || today.getFullYear()))}
								className="w-24 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<button
							type="button"
							onClick={handleSearch}
							className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 본문 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌측 센터 목록 */}
					<div className="col-span-12 lg:col-span-7 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="max-h-[720px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[90px]">
											ANCD
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											센터명
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[120px]">
											시작일
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[120px]">
											종료일
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900 w-[110px]">
											월사용료
										</th>
									</tr>
								</thead>
								<tbody>
									{pagedCenters.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-3 py-12 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										pagedCenters.map((c) => {
											const isSelected = c.ancd === selectedCenterAncd;
											return (
												<tr
													key={c.ancd}
													onClick={() => {
														setSelectedCenterAncd(c.ancd);
														setSelectedApprovalId("");
													}}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="border-r border-blue-100 px-3 py-2">{c.ancd}</td>
													<td className="border-r border-blue-100 px-3 py-2">{c.centerName}</td>
													<td className="border-r border-blue-100 px-3 py-2">{c.startDate}</td>
													<td className="border-r border-blue-100 px-3 py-2">{c.endDate}</td>
													<td className="px-3 py-2">
														{c.monthlyFee == null ? "" : formatAmount(c.monthlyFee)}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{/* 페이지네이션 */}
						<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 flex items-center justify-center gap-2">
							<button
								type="button"
								onClick={() => setCenterPage(1)}
								disabled={safeCenterPage === 1}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								{"<<"}
							</button>
							<button
								type="button"
								onClick={() => setCenterPage((p) => Math.max(1, p - 1))}
								disabled={safeCenterPage === 1}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								{"<"}
							</button>
							<div className="min-w-10 text-center text-sm text-blue-900">{safeCenterPage}</div>
							<button
								type="button"
								onClick={() => setCenterPage((p) => Math.min(centerTotalPages, p + 1))}
								disabled={safeCenterPage === centerTotalPages}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								{">"}
							</button>
							<button
								type="button"
								onClick={() => setCenterPage(centerTotalPages)}
								disabled={safeCenterPage === centerTotalPages}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							>
								{">>"}
							</button>
						</div>
					</div>

					{/* 우측 패널 */}
					<div className="col-span-12 lg:col-span-5 space-y-3">
						{/* 우측 상단 요약 */}
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
							<div className="p-3 grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									결재횟수
								</span>
								<input
									readOnly
									value={String(approvalCount)}
									className="col-span-2 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
								<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									센터명
								</span>
								<input
									readOnly
									value={selectedCenter?.centerName || ""}
									className="col-span-5 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
								/>
							</div>
						</div>

						{/* 결재 내역 */}
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
							<div className="max-h-[440px] overflow-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
										<tr>
											<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[120px]">
												결재년월
											</th>
											<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[120px]">
												결재일자
											</th>
											<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[120px]">
												결재금액
											</th>
											<th className="px-3 py-2 text-left font-semibold text-blue-900">입금센터</th>
										</tr>
									</thead>
									<tbody>
										{filteredApprovals.length === 0 ? (
											<tr>
												<td colSpan={4} className="px-3 py-12 text-center text-blue-900/60">
													데이터가 없습니다.
												</td>
											</tr>
										) : (
											filteredApprovals.map((a) => {
												const isSelected = a.id === selectedApprovalId;
												return (
													<tr
														key={a.id}
														onClick={() => setSelectedApprovalId(a.id)}
														className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
															isSelected ? "bg-blue-100" : ""
														}`}
													>
														<td className="border-r border-blue-100 px-3 py-2">
															{formatYyyyMm(a.year, a.month)}
														</td>
														<td className="border-r border-blue-100 px-3 py-2">{a.approvalDate}</td>
														<td className="border-r border-blue-100 px-3 py-2">{formatAmount(a.amount)}</td>
														<td className="px-3 py-2">{a.depositCenter}</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* 하단 등록 폼 */}
						<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
							<div className="p-3 space-y-2">
								<div className="grid grid-cols-12 gap-2 items-center">
									<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
										결재년월
									</span>
									<input
										type="month"
										value={formYearMonth}
										onChange={(e) => setFormYearMonth(e.target.value)}
										className="col-span-4 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
									/>
									<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
										결재일자
									</span>
									<input
										type="date"
										value={formApprovalDate}
										onChange={(e) => setFormApprovalDate(e.target.value)}
										className="col-span-3 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
									/>
								</div>

								<div className="grid grid-cols-12 gap-2 items-center">
									<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
										결재금액
									</span>
									<input
										value={formAmount}
										onChange={(e) => setFormAmount(e.target.value)}
										placeholder="예: 100000"
										className="col-span-4 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
									/>
									<div className="col-span-5" />
								</div>

								<div className="grid grid-cols-12 gap-2 items-center">
									<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
										입금센터
									</span>
									<input
										value={formDepositCenter}
										onChange={(e) => setFormDepositCenter(e.target.value)}
										className="col-span-9 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
									/>
								</div>

								<div className="grid grid-cols-12 gap-2 pt-2">
									<button
										type="button"
										onClick={handleRegister}
										className="col-span-9 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
									>
										등록
									</button>
									<button
										type="button"
										onClick={handleDelete}
										disabled={!selectedApprovalId}
										className="col-span-3 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
									>
										삭제
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

