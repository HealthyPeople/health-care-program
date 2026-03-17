"use client";

import React, { useMemo, useState } from "react";

interface EmployeeAccountRow {
	userId: string;
	empName: string;
	mobile: string;
	jobTitle: string;
	workStatus: string;
}

interface ProgramRow {
	name: string;
	role: string;
}

const demoEmployees: EmployeeAccountRow[] = [
	{ userId: "admin_01", empName: "", mobile: "", jobTitle: "", workStatus: "" },
	{ userId: "admin_02", empName: "박여울", mobile: "", jobTitle: "개발자", workStatus: "근무" },
	{ userId: "usprg_01", empName: "", mobile: "", jobTitle: "", workStatus: "" },
	{ userId: "usprg_02", empName: "", mobile: "", jobTitle: "", workStatus: "" },
];

const demoPrograms: ProgramRow[] = [
	{ name: "간호 서비스 항목 등록", role: "사원/수급자" },
	{ name: "간호계획 등록", role: "사원/수급자" },
	{ name: "간호계획 평가등록", role: "사원/수급자" },
	{ name: "간호문제 도출관리", role: "사원/수급자" },
	{ name: "계정과목 등록", role: "사원/수급자" },
	{ name: "계정과목 조회", role: "사원/수급자" },
	{ name: "계정과목별 결산서", role: "사원/수급자" },
	{ name: "고객 정보등록", role: "사원/수급자" },
	{ name: "급여명세서 발부대장", role: "사원/수급자" },
	{ name: "급여발생 내역관리", role: "사원/수급자" },
	{ name: "급여수금 내역관리", role: "사원/수급자" },
];

export default function EmployeeProgramMapping() {
	const [employees] = useState<EmployeeAccountRow[]>(demoEmployees);
	const [selectedUserId, setSelectedUserId] = useState<string>(demoEmployees[0]?.userId || "");

	// 좌/우 프로그램 목록
	const [availablePrograms, setAvailablePrograms] = useState<ProgramRow[]>(demoPrograms);
	const [mappedPrograms, setMappedPrograms] = useState<ProgramRow[]>([]);

	// 선택(체크박스) 상태
	const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
	const [selectedMapped, setSelectedMapped] = useState<Set<string>>(new Set());

	const currentEmployee = useMemo(
		() => employees.find((e) => e.userId === selectedUserId) || null,
		[employees, selectedUserId]
	);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const moveSelectedToMapped = () => {
		if (!selectedAvailable.size) return;
		const toMove = availablePrograms.filter((p) => selectedAvailable.has(p.name));
		if (!toMove.length) return;
		setAvailablePrograms((prev) => prev.filter((p) => !selectedAvailable.has(p.name)));
		setMappedPrograms((prev) => [...prev, ...toMove]);
		setSelectedAvailable(new Set());
	};

	const removeSelectedFromMapped = () => {
		if (!selectedMapped.size) return;
		const toMove = mappedPrograms.filter((p) => selectedMapped.has(p.name));
		if (!toMove.length) return;
		setMappedPrograms((prev) => prev.filter((p) => !selectedMapped.has(p.name)));
		setAvailablePrograms((prev) => [...prev, ...toMove]);
		setSelectedMapped(new Set());
	};

	const addAll = () => {
		if (!availablePrograms.length) return;
		setMappedPrograms((prev) => [...prev, ...availablePrograms]);
		setAvailablePrograms([]);
		setSelectedAvailable(new Set());
	};

	const removeAll = () => {
		if (!mappedPrograms.length) return;
		setAvailablePrograms((prev) => [...prev, ...mappedPrograms]);
		setMappedPrograms([]);
		setSelectedMapped(new Set());
	};

	const toggleSet = (set: Set<string>, key: string) => {
		const next = new Set(set);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		return next;
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 헤더 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						사원프로그램매핑
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="w-52 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
					>
						닫기
					</button>
				</div>

				{/* 상단 사원 목록 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[220px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사용자계정
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										사원명
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										핸드폰번호
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										직책
									</th>
									<th className="px-3 py-2 text-left font-semibold text-blue-900">근무상태</th>
								</tr>
							</thead>
							<tbody>
								{employees.map((e) => {
									const isSelected = e.userId === selectedUserId;
									return (
										<tr
											key={e.userId}
											onClick={() => {
												setSelectedUserId(e.userId);
												setSelectedAvailable(new Set());
												setSelectedMapped(new Set());
											}}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												isSelected ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{e.userId}</td>
											<td className="border-r border-blue-100 px-3 py-2">{e.empName}</td>
											<td className="border-r border-blue-100 px-3 py-2">{e.mobile}</td>
											<td className="border-r border-blue-100 px-3 py-2">{e.jobTitle}</td>
											<td className="px-3 py-2">{e.workStatus}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>

				{/* 하단: 좌/중/우 */}
				<div className="grid grid-cols-12 gap-4 min-h-[420px]">
					{/* 좌측 */}
					<div className="col-span-12 lg:col-span-5 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-50/60 p-3 flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								사용자계정
							</span>
							<input
								readOnly
								value={selectedUserId}
								className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
							/>
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											프로그램명
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">관리등급</th>
									</tr>
								</thead>
								<tbody>
									{availablePrograms.map((p) => (
										<tr
											key={p.name}
											onClick={() => setSelectedAvailable((s) => toggleSet(s, p.name))}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												selectedAvailable.has(p.name) ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{p.name}</td>
											<td className="px-3 py-2">{p.role}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* 가운데 버튼 */}
					<div className="col-span-12 lg:col-span-2 flex flex-col items-center justify-center gap-3">
						<button
							type="button"
							onClick={moveSelectedToMapped}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							추가=&gt;
						</button>
						<button
							type="button"
							onClick={removeSelectedFromMapped}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							&lt;=삭제
						</button>
						<button
							type="button"
							onClick={addAll}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							전체추가\n==&gt;
						</button>
						<button
							type="button"
							onClick={removeAll}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							전체삭제\n&lt;==
						</button>
					</div>

					{/* 우측 */}
					<div className="col-span-12 lg:col-span-5 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-50/60 p-3 flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								사원명
							</span>
							<input
								readOnly
								value={currentEmployee?.empName || ""}
								className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
							/>
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											프로그램명
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">관리등급</th>
									</tr>
								</thead>
								<tbody>
									{mappedPrograms.length === 0 ? (
										<tr>
											<td colSpan={2} className="px-3 py-10 text-center text-blue-900/60">
												매핑된 프로그램이 없습니다.
											</td>
										</tr>
									) : (
										mappedPrograms.map((p) => (
											<tr
												key={p.name}
												onClick={() => setSelectedMapped((s) => toggleSet(s, p.name))}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													selectedMapped.has(p.name) ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{p.name}</td>
												<td className="px-3 py-2">{p.role}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
