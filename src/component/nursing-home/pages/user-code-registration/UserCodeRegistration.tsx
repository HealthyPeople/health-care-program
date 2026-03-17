"use client";

import React, { useMemo, useState } from "react";

interface UserAccountRow {
	userId: string;
	empName: string;
	role: string; // 관리등급
	pwChangedAt: string; // YYYY-MM-DD
}

const demoRows: UserAccountRow[] = [
	{ userId: "admin_01", empName: "", role: "관리자 - 전체권한", pwChangedAt: "2014-07-07" },
	{ userId: "admin_02", empName: "", role: "관리자 - 전체권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_01", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_02", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_03", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_04", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_05", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_06", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_07", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_08", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
	{ userId: "usprg_09", empName: "", role: "Program 사용권한", pwChangedAt: "2014-07-07" },
];

export default function UserCodeRegistration() {
	const [customerName, setCustomerName] = useState<string>("돌봄시설Admin");
	const [searchUserId, setSearchUserId] = useState<string>("admin_01");

	const [rows, setRows] = useState<UserAccountRow[]>(demoRows);
	const [selectedUserId, setSelectedUserId] = useState<string>(demoRows[0]?.userId || "");

	const filteredRows = useMemo(() => {
		const q = searchUserId.trim();
		return rows.filter((r) => (q ? r.userId.includes(q) : true));
	}, [rows, searchUserId]);

	const pageSize = 10;
	const [currentPage, setCurrentPage] = useState<number>(1);
	const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
	const safePage = Math.min(Math.max(1, currentPage), totalPages);
	const pagedRows = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filteredRows.slice(start, start + pageSize);
	}, [filteredRows, safePage]);

	React.useEffect(() => {
		setCurrentPage(1);
	}, [searchUserId]);

	React.useEffect(() => {
		if (!filteredRows.length) {
			setSelectedUserId("");
			return;
		}
		if (!selectedUserId || !filteredRows.some((r) => r.userId === selectedUserId)) {
			setSelectedUserId(filteredRows[0].userId);
		}
	}, [filteredRows, selectedUserId]);

	const selectedRow = useMemo(() => rows.find((r) => r.userId === selectedUserId) || null, [rows, selectedUserId]);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleSearch = () => {
		// 퍼블: 로컬 필터링
	};

	const handleAdd = () => {
		const id = `user_${Date.now()}`;
		setRows((prev) => [
			{ userId: id, empName: "", role: "Program 사용권한", pwChangedAt: "2026-03-18" },
			...prev,
		]);
		setSelectedUserId(id);
	};

	const handleEdit = () => {
		// 퍼블: 실제 수정 UI는 추후
	};

	const handleDelete = () => {
		if (!selectedUserId) return;
		setRows((prev) => prev.filter((r) => r.userId !== selectedUserId));
		setSelectedUserId("");
	};

	const handleResetPassword = () => {
		// 퍼블: 비밀번호 초기화 처리(변경일자만 갱신)
		if (!selectedUserId) return;
		setRows((prev) =>
			prev.map((r) => (r.userId === selectedUserId ? { ...r, pwChangedAt: "2026-03-18" } : r))
		);
	};

	const handleCopyAccount = () => {
		if (!selectedRow) return;
		const id = `${selectedRow.userId}_copy_${String(Date.now()).slice(-4)}`;
		setRows((prev) => [{ ...selectedRow, userId: id }, ...prev]);
		setSelectedUserId(id);
	};

	const handleChangeUserId = () => {
		// 퍼블: 실제 변경 UI는 추후
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-3">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						사용자계정관리
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								고객명
							</span>
							<input
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								className="w-80 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<button
							type="button"
							onClick={handleChangeUserId}
							className="w-32 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							사용자ID변경
						</button>
					</div>
				</div>

				{/* 검색 + 버튼 */}
				<div className="grid grid-cols-12 gap-2 items-center rounded border border-blue-300 bg-white p-2">
					<span className="col-span-1 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
						사용자ID
					</span>
					<input
						value={searchUserId}
						onChange={(e) => setSearchUserId(e.target.value)}
						className="col-span-4 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
					/>
					<div className="col-span-7 flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={handleAdd}
							className="w-20 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							추가
						</button>
						<button
							type="button"
							onClick={handleEdit}
							disabled={!selectedUserId}
							className="w-20 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							수정
						</button>
						<button
							type="button"
							onClick={handleDelete}
							disabled={!selectedUserId}
							className="w-20 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							삭제
						</button>
						<button
							type="button"
							onClick={handleResetPassword}
							disabled={!selectedUserId}
							className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							암호초기화
						</button>
						<button
							type="button"
							onClick={handleCopyAccount}
							disabled={!selectedUserId}
							className="w-32 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							사용자계정 복사
						</button>
						<button
							type="button"
							onClick={handleSearch}
							className="w-20 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-20 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 테이블 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[640px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[180px]">
										사용자ID
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사원명
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										관리등급
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900 w-[160px]">
										패스워드변경일자
									</th>
								</tr>
							</thead>
							<tbody>
								{pagedRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-12 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									pagedRows.map((r) => {
										const isSelected = r.userId === selectedUserId;
										return (
											<tr
												key={r.userId}
												onClick={() => setSelectedUserId(r.userId)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{r.userId}</td>
												<td className="border-r border-blue-100 px-3 py-2">{r.empName}</td>
												<td className="border-r border-blue-100 px-3 py-2">{r.role}</td>
												<td className="px-3 py-2">{r.pwChangedAt}</td>
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
							onClick={() => setCurrentPage(1)}
							disabled={safePage === 1}
							className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
						>
							{"<<"}
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={safePage === 1}
							className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
						>
							{"<"}
						</button>
						<div className="min-w-10 text-center text-sm text-blue-900">{safePage}</div>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={safePage === totalPages}
							className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
						>
							{">"}
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage(totalPages)}
							disabled={safePage === totalPages}
							className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 disabled:opacity-50"
						>
							{">>"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

