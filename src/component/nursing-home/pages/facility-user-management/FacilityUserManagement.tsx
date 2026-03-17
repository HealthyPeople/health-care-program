"use client";

import React, { useMemo, useState } from "react";

interface FacilityUserRow {
	id: string; // 사용자ID
	empName: string; // 사원명
	role: string; // 관리등급
	pwChangedAt: string; // 패스워드변경일자 (YYYY-MM-DD)
}

const demoRows: FacilityUserRow[] = [
	{ id: "admin_01", empName: "임종수", role: "관리자 - 전체권한", pwChangedAt: "2016-11-16" },
	{ id: "admin_02", empName: "박여울", role: "관리자 - 전체권한", pwChangedAt: "2025-07-29" },
	{ id: "usprg_01", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_02", empName: "임경숙", role: "사원/수급자 사용권한", pwChangedAt: "2014-09-25" },
	{ id: "usprg_03", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_04", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_05", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_06", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_07", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_08", empName: "", role: "", pwChangedAt: "" },
	{ id: "usprg_09", empName: "", role: "", pwChangedAt: "" },
];

export default function FacilityUserManagement() {
	const [customerName, setCustomerName] = useState("실습요양원");
	const [searchUserId, setSearchUserId] = useState("admin_01");

	const [rows, setRows] = useState<FacilityUserRow[]>(demoRows);
	const [selectedUserId, setSelectedUserId] = useState<string>("admin_01");

	const itemsPerPage = 10;
	const [currentPage, setCurrentPage] = useState(1);

	const filteredRows = useMemo(() => {
		const q = searchUserId.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => r.id.toLowerCase().includes(q));
	}, [rows, searchUserId]);

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
	const page = Math.min(currentPage, totalPages);
	const startIndex = (page - 1) * itemsPerPage;
	const currentRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

	const handleSearch = () => {
		setCurrentPage(1);
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleDelete = () => {
		if (!selectedUserId) return;
		if (!confirm("선택한 사용자 계정을 삭제하시겠습니까?")) return;
		setRows((prev) => prev.filter((r) => r.id !== selectedUserId));
		setSelectedUserId("");
	};

	const handleResetPassword = () => {
		if (!selectedUserId) return;
		alert("암호초기화는 추후 연동 예정입니다.");
	};

	const handleLinkEmployee = () => {
		if (!selectedUserId) return;
		alert("사원연결작업은 추후 연동 예정입니다.");
	};

	const handleCopyAccounts = () => {
		alert("사용자계정복사는 추후 연동 예정입니다.");
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-3">
				{/* 상단 타이틀/고객명 */}
				<div className="flex flex-wrap items-stretch gap-3">
					<div className="flex-1 min-w-[320px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						사용자계정(ID)관리
					</div>
					<div className="flex-[2] min-w-[420px] rounded border border-blue-300 bg-white px-4 py-3">
						<div className="flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 shrink-0">
								고객명
							</span>
							<input
								type="text"
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
					</div>
				</div>

				{/* 검색/버튼 영역 */}
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 shrink-0">
							사용자ID
						</span>
						<input
							type="text"
							value={searchUserId}
							onChange={(e) => setSearchUserId(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							className="w-80 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					<div className="ml-auto flex flex-wrap gap-2">
						<button
							type="button"
							onClick={handleLinkEmployee}
							disabled={!selectedUserId}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							사원연결작업
						</button>
						<button
							type="button"
							onClick={handleDelete}
							disabled={!selectedUserId}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							삭제
						</button>
						<button
							type="button"
							onClick={handleResetPassword}
							disabled={!selectedUserId}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							암호초기화
						</button>
						<button
							type="button"
							onClick={handleCopyAccounts}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							사용자계정복사
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 목록 테이블 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[520px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사용자ID
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사원명
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										관리등급
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">
										패스워드변경일자
									</th>
								</tr>
							</thead>
							<tbody>
								{currentRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-10 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									currentRows.map((row) => {
										const isSelected = row.id === selectedUserId;
										return (
											<tr
												key={row.id}
												onClick={() => setSelectedUserId(row.id)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{row.id}</td>
												<td className="border-r border-blue-100 px-3 py-2">{row.empName}</td>
												<td className="border-r border-blue-100 px-3 py-2">{row.role}</td>
												<td className="px-3 py-2">{row.pwChangedAt}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* 하단 페이지네이션 */}
					<div className="border-t border-blue-200 bg-white p-3 flex items-center justify-center gap-2">
						<button
							type="button"
							onClick={() => setCurrentPage(1)}
							disabled={page === 1}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="처음"
						>
							«
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="이전"
						>
							‹
						</button>
						<span className="min-w-10 text-center text-sm font-semibold text-blue-900">{page}</span>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="다음"
						>
							›
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage(totalPages)}
							disabled={page === totalPages}
							className="h-10 w-10 rounded border border-blue-300 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-50"
							aria-label="마지막"
						>
							»
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

