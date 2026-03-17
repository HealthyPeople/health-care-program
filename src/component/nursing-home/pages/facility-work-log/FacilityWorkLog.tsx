"use client";

import React, { useMemo, useState } from "react";

interface AbsenteeRow {
	name: string;
	reason: string;
}

interface ApprovalHistoryRow {
	id: string;
	approver: string; // 결재자
	instruction: string; // 지시사항
	approvedAt: string; // YYYY-MM-DD HH:mm
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function FacilityWorkLog() {
	const today = useMemo(() => new Date(), []);
	const [approvalDate, setApprovalDate] = useState<string>(() => formatDate(today));

	const [orgName, setOrgName] = useState<string>("TEST요양원");

	const [capacity, setCapacity] = useState<string>("");
	const [currentPeople, setCurrentPeople] = useState<string>("");
	const [usingPeople, setUsingPeople] = useState<string>("");
	const [newAdmission, setNewAdmission] = useState<string>("");
	const [discharge, setDischarge] = useState<string>("");

	const [absentees] = useState<AbsenteeRow[]>(() => [
		{ name: "임동수", reason: "기타" },
		{ name: "홍길동", reason: "연월차" },
	]);
	const [selectedAbsenteeIdx, setSelectedAbsenteeIdx] = useState<number>(0);
	const selectedAbsentee = useMemo(() => absentees[selectedAbsenteeIdx] || null, [absentees, selectedAbsenteeIdx]);

	const [workContent, setWorkContent] = useState<string>("");
	const [expenseContent, setExpenseContent] = useState<string>("");

	const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRow[]>(() => [
		{ id: "h1", approver: "관리자", instruction: "업무일지 확인 바랍니다.", approvedAt: "2026-03-18 10:10" },
	]);

	const [instructionDraft, setInstructionDraft] = useState<string>("");

	const handleShiftDay = (delta: number) => {
		const d = new Date(approvalDate);
		if (isNaN(d.getTime())) return;
		d.setDate(d.getDate() + delta);
		setApprovalDate(formatDate(d));
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleApprove = () => {
		const id = `h${Date.now()}`;
		const now = new Date();
		const approvedAt = `${formatDate(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
		setApprovalHistory((prev) => [
			{ id, approver: "관리자", instruction: instructionDraft.trim(), approvedAt },
			...prev,
		]);
		setInstructionDraft("");
	};

	const handleCancel = () => {
		setApprovalHistory((prev) => prev.slice(1));
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-3">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						시설 일일업무 결재
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								결재일자
							</span>
							<input
								type="date"
								value={approvalDate}
								onChange={(e) => setApprovalDate(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>

						<button
							type="button"
							onClick={() => handleShiftDay(-1)}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							-1일
						</button>
						<button
							type="button"
							onClick={() => handleShiftDay(1)}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							+1일
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

				{/* 기관명 */}
				<div className="grid grid-cols-12 gap-2 items-center rounded border border-blue-300 bg-white p-2">
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						기관명
					</span>
					<input
						value={orgName}
						onChange={(e) => setOrgName(e.target.value)}
						className="col-span-11 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
					/>
				</div>

				{/* 인원 현황 */}
				<div className="grid grid-cols-12 gap-2 items-center rounded border border-blue-300 bg-white p-2">
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						정원
					</span>
					<input
						value={capacity}
						onChange={(e) => setCapacity(e.target.value)}
						className="col-span-1 rounded border border-blue-300 bg-white px-2 py-2 text-sm text-blue-900"
					/>
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						현인원
					</span>
					<input
						value={currentPeople}
						onChange={(e) => setCurrentPeople(e.target.value)}
						className="col-span-1 rounded border border-blue-300 bg-white px-2 py-2 text-sm text-blue-900"
					/>
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						이용인원
					</span>
					<input
						value={usingPeople}
						onChange={(e) => setUsingPeople(e.target.value)}
						className="col-span-1 rounded border border-blue-300 bg-white px-2 py-2 text-sm text-blue-900"
					/>
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						신규입소
					</span>
					<input
						value={newAdmission}
						onChange={(e) => setNewAdmission(e.target.value)}
						className="col-span-1 rounded border border-blue-300 bg-white px-2 py-2 text-sm text-blue-900"
					/>
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						퇴소자
					</span>
					<input
						value={discharge}
						onChange={(e) => setDischarge(e.target.value)}
						className="col-span-1 rounded border border-blue-300 bg-white px-2 py-2 text-sm text-blue-900"
					/>
					<div className="col-span-2" />
				</div>

				{/* 본문 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 좌측 */}
					<div className="col-span-12 lg:col-span-2 space-y-3">
						<div className="rounded border border-blue-300 bg-white p-2 space-y-2">
							<button
								type="button"
								className="w-full rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								결근자명단
							</button>
							<button
								type="button"
								className="w-full rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								업무내용
							</button>
						</div>

						<div className="rounded border border-blue-300 bg-white overflow-hidden">
							<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
								결근자
							</div>
							<div className="max-h-[260px] overflow-auto">
								<table className="w-full text-sm">
									<tbody>
										{absentees.map((a, idx) => {
											const isSelected = idx === selectedAbsenteeIdx;
											return (
												<tr
													key={`${a.name}-${idx}`}
													onClick={() => setSelectedAbsenteeIdx(idx)}
													className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
														isSelected ? "bg-blue-100" : ""
													}`}
												>
													<td className="px-3 py-2">{a.name}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
							<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-blue-900/70">
								{selectedAbsentee ? `${selectedAbsentee.name} · ${selectedAbsentee.reason}` : "선택 없음"}
							</div>
						</div>

						<div className="rounded border border-blue-300 bg-white p-2 space-y-2">
							<button
								type="button"
								className="w-full rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								지출내역
							</button>
							<button
								type="button"
								className="w-full rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								결재내역조회
							</button>
						</div>
					</div>

					{/* 우측 */}
					<div className="col-span-12 lg:col-span-10 space-y-3">
						<div className="rounded border border-blue-300 bg-white overflow-hidden">
							<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
								업무내용
							</div>
							<textarea
								value={workContent}
								onChange={(e) => setWorkContent(e.target.value)}
								rows={14}
								className="w-full resize-none border-0 bg-white p-3 text-sm text-blue-900 focus:outline-none"
							/>
						</div>

						<div className="rounded border border-blue-300 bg-white overflow-hidden">
							<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900">
								지출내역
							</div>
							<textarea
								value={expenseContent}
								onChange={(e) => setExpenseContent(e.target.value)}
								rows={6}
								className="w-full resize-none border-0 bg-white p-3 text-sm text-blue-900 focus:outline-none"
							/>
						</div>

						<div className="grid grid-cols-12 gap-3">
							<div className="col-span-12 lg:col-span-10 rounded border border-blue-300 bg-white overflow-hidden">
								<div className="max-h-[180px] overflow-auto">
									<table className="w-full text-sm">
										<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
											<tr>
												<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[140px]">
													결재자
												</th>
												<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
													지시사항
												</th>
												<th className="px-3 py-2 text-left font-semibold text-blue-900 w-[170px]">
													결재일시
												</th>
											</tr>
										</thead>
										<tbody>
											{approvalHistory.length === 0 ? (
												<tr>
													<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
														데이터가 없습니다.
													</td>
												</tr>
											) : (
												approvalHistory.map((h) => (
													<tr key={h.id} className="border-b border-blue-50">
														<td className="border-r border-blue-100 px-3 py-2">{h.approver}</td>
														<td className="border-r border-blue-100 px-3 py-2">{h.instruction}</td>
														<td className="px-3 py-2">{h.approvedAt}</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>

								<div className="border-t border-blue-200 bg-blue-50/40 p-2 grid grid-cols-12 gap-2 items-center">
									<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
										지시사항경재
									</span>
									<input
										value={instructionDraft}
										onChange={(e) => setInstructionDraft(e.target.value)}
										className="col-span-10 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
									/>
								</div>
							</div>

							<div className="col-span-12 lg:col-span-2 rounded border border-blue-300 bg-white overflow-hidden">
								<div className="p-2 grid grid-cols-1 gap-2">
									<button
										type="button"
										onClick={handleApprove}
										className="h-24 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
									>
										결재
									</button>
									<button
										type="button"
										onClick={handleCancel}
										className="h-24 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
									>
										취소
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
