"use client";

import React, { useMemo, useState } from "react";

interface EmployeeRow {
	empName: string;
	mobile: string;
	jobTitle: string;
	workStatus: string; // 근무/휴직/퇴직
}

interface BeneficiaryRow {
	name: string;
	sex: string;
	birth: string; // YYYY-MM-DD
}

const demoEmployees: EmployeeRow[] = [
	{ empName: "박여울", mobile: "", jobTitle: "개발자", workStatus: "근무" },
];

const demoBeneficiaries: BeneficiaryRow[] = [
	{ name: "임종수", sex: "남", birth: "1959-10-14" },
];

export default function EmployeeBeneficiaryMapping() {
	const [workStatus, setWorkStatus] = useState<string>("근무");
	const [searchTerm, setSearchTerm] = useState<string>("");

	const [employees] = useState<EmployeeRow[]>(demoEmployees);
	const [selectedEmpName, setSelectedEmpName] = useState<string>(demoEmployees[0]?.empName || "");

	const selectedEmployee = useMemo(
		() => employees.find((e) => e.empName === selectedEmpName) || null,
		[employees, selectedEmpName]
	);

	// 수급자 좌/우 리스트 (로컬 이동)
	const [available, setAvailable] = useState<BeneficiaryRow[]>(demoBeneficiaries);
	const [mapped, setMapped] = useState<BeneficiaryRow[]>([]);
	const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
	const [selectedMapped, setSelectedMapped] = useState<Set<string>>(new Set());

	const filteredEmployees = useMemo(() => {
		return employees.filter((e) => {
			if (workStatus && e.workStatus !== workStatus) return false;
			if (searchTerm.trim()) {
				const q = searchTerm.trim();
				return e.empName.includes(q);
			}
			return true;
		});
	}, [employees, workStatus, searchTerm]);

	const toggleSet = (set: Set<string>, key: string) => {
		const next = new Set(set);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		return next;
	};

	const moveSelectedToMapped = () => {
		if (!selectedAvailable.size) return;
		const toMove = available.filter((b) => selectedAvailable.has(b.name));
		if (!toMove.length) return;
		setAvailable((prev) => prev.filter((b) => !selectedAvailable.has(b.name)));
		setMapped((prev) => [...prev, ...toMove]);
		setSelectedAvailable(new Set());
	};

	const removeSelectedFromMapped = () => {
		if (!selectedMapped.size) return;
		const toMove = mapped.filter((b) => selectedMapped.has(b.name));
		if (!toMove.length) return;
		setMapped((prev) => prev.filter((b) => !selectedMapped.has(b.name)));
		setAvailable((prev) => [...prev, ...toMove]);
		setSelectedMapped(new Set());
	};

	const addAll = () => {
		if (!available.length) return;
		setMapped((prev) => [...prev, ...available]);
		setAvailable([]);
		setSelectedAvailable(new Set());
	};

	const removeAll = () => {
		if (!mapped.length) return;
		setAvailable((prev) => [...prev, ...mapped]);
		setMapped([]);
		setSelectedMapped(new Set());
	};

	const handleSearch = () => {
		// 로컬 필터링(추후 API 연동)
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 헤더 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						사원환자매핑
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								근무상태
							</span>
							<select
								value={workStatus}
								onChange={(e) => setWorkStatus(e.target.value)}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							>
								<option value="근무">근무</option>
								<option value="휴직">휴직</option>
								<option value="퇴직">퇴직</option>
							</select>
						</div>
						<button
							type="button"
							onClick={handleSearch}
							className="w-52 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-40 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 상단 사원 목록 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[240px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
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
								{filteredEmployees.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-10 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									filteredEmployees.map((e) => {
										const isSelected = e.empName === selectedEmpName;
										return (
											<tr
												key={e.empName}
												onClick={() => setSelectedEmpName(e.empName)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{e.empName}</td>
												<td className="border-r border-blue-100 px-3 py-2">{e.mobile}</td>
												<td className="border-r border-blue-100 px-3 py-2">{e.jobTitle}</td>
												<td className="px-3 py-2">{e.workStatus}</td>
											</tr>
										);
									})
								)}
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
								사원명
							</span>
							<input
								readOnly
								value={selectedEmployee?.empName || ""}
								className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
							/>
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											수급자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											성별
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">생일</th>
									</tr>
								</thead>
								<tbody>
									{available.map((b) => (
										<tr
											key={b.name}
											onClick={() => setSelectedAvailable((s) => toggleSet(s, b.name))}
											className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
												selectedAvailable.has(b.name) ? "bg-blue-100" : ""
											}`}
										>
											<td className="border-r border-blue-100 px-3 py-2">{b.name}</td>
											<td className="border-r border-blue-100 px-3 py-2">{b.sex}</td>
											<td className="px-3 py-2">{b.birth}</td>
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
							추가==&gt;
						</button>
						<button
							type="button"
							onClick={removeSelectedFromMapped}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							&lt;==삭제
						</button>
						<button
							type="button"
							onClick={addAll}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							전체추가==&gt;
						</button>
						<button
							type="button"
							onClick={removeAll}
							className="w-36 rounded border border-blue-400 bg-blue-200 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							전체삭제&lt;==
						</button>
					</div>

					{/* 우측 */}
					<div className="col-span-12 lg:col-span-5 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-50/60 p-3 flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								수급자
							</span>
							<div className="text-sm text-blue-900/70">(매핑된 목록)</div>
						</div>
						<div className="flex-1 overflow-auto min-h-0">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											수급자
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											성별
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">생일</th>
									</tr>
								</thead>
								<tbody>
									{mapped.length === 0 ? (
										<tr>
											<td colSpan={3} className="px-3 py-10 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										mapped.map((b) => (
											<tr
												key={b.name}
												onClick={() => setSelectedMapped((s) => toggleSet(s, b.name))}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													selectedMapped.has(b.name) ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{b.name}</td>
												<td className="border-r border-blue-100 px-3 py-2">{b.sex}</td>
												<td className="px-3 py-2">{b.birth}</td>
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
