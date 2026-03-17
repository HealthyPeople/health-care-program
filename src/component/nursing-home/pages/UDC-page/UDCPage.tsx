"use client";

import React, { useMemo, useState } from "react";

interface UdcGroupRow {
	codeGroup: string; // 코드구분
	description: string; // 설명
	remark: string; // 비고
	deleted: boolean; // DEL
}

const demoRows: UdcGroupRow[] = [
	{ codeGroup: "AA", description: "환자정보-요양등급", remark: "", deleted: false },
	{ codeGroup: "AB", description: "보호자_환자와의관계", remark: "", deleted: false },
	{ codeGroup: "AC", description: "서비스계약-수급자부담율구분", remark: "", deleted: false },
	{ codeGroup: "AD", description: "상담일지_상담방법", remark: "", deleted: false },
	{ codeGroup: "AE", description: "하루일과표 서비스구분", remark: "", deleted: false },
	{ codeGroup: "AF", description: "시설구분(요양.공생)", remark: "", deleted: false },
	{ codeGroup: "AG", description: "서비스구분", remark: "", deleted: false },
	{ codeGroup: "AH", description: "메세지구분", remark: "", deleted: false },
	{ codeGroup: "AI", description: "근무구분", remark: "", deleted: false },
	{ codeGroup: "AJ", description: "근무시기", remark: "", deleted: false },
	{ codeGroup: "AK", description: "성별", remark: "", deleted: false },
	{ codeGroup: "AL", description: "촉탁의 진료구분(1.초진,2.재진)", remark: "", deleted: false },
	{ codeGroup: "AM", description: "확인구분", remark: "", deleted: false },
	{ codeGroup: "AN", description: "치료프로그램 진행구분", remark: "", deleted: false },
	{ codeGroup: "AP", description: "치료프로그램 구분", remark: "", deleted: false },
	{ codeGroup: "AQ", description: "식사구분", remark: "", deleted: false },
	{ codeGroup: "AR", description: "간식구분", remark: "", deleted: false },
	{ codeGroup: "AS", description: "상태구분", remark: "", deleted: false },
	{ codeGroup: "AT", description: "거주형태", remark: "", deleted: false },
	{ codeGroup: "AU", description: "입소구분", remark: "", deleted: false },
	{ codeGroup: "AV", description: "퇴소사유", remark: "", deleted: false },
	{ codeGroup: "AW", description: "계약상태", remark: "", deleted: false },
	{ codeGroup: "AX", description: "직책", remark: "", deleted: false },
	{ codeGroup: "AY", description: "부서", remark: "", deleted: false },
	{ codeGroup: "AZ", description: "근무상태", remark: "", deleted: false },
];

export default function UDCPage() {
	const [codeGroupQuery, setCodeGroupQuery] = useState<string>("");
	const [rows, setRows] = useState<UdcGroupRow[]>(demoRows);
	const [selectedCodeGroup, setSelectedCodeGroup] = useState<string>(demoRows[0]?.codeGroup || "");

	const filteredRows = useMemo(() => {
		const q = codeGroupQuery.trim().toUpperCase();
		return rows.filter((r) => (q ? r.codeGroup.includes(q) : true));
	}, [rows, codeGroupQuery]);

	React.useEffect(() => {
		if (!filteredRows.length) {
			setSelectedCodeGroup("");
			return;
		}
		if (!selectedCodeGroup || !filteredRows.some((r) => r.codeGroup === selectedCodeGroup)) {
			setSelectedCodeGroup(filteredRows[0].codeGroup);
		}
	}, [filteredRows, selectedCodeGroup]);

	const selectedRow = useMemo(
		() => rows.find((r) => r.codeGroup === selectedCodeGroup) || null,
		[rows, selectedCodeGroup]
	);

	const handleSearch = () => {
		// 퍼블: 로컬 필터링
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleNew = () => {
		const codeGroup = `N${String(Date.now()).slice(-2)}`;
		setRows((prev) => [{ codeGroup, description: "새 코드구분", remark: "", deleted: false }, ...prev]);
		setSelectedCodeGroup(codeGroup);
	};

	const handleEdit = () => {
		// 퍼블: 실제 수정 UI는 추후(현재는 DEL 토글 정도만 제공)
		if (!selectedCodeGroup) return;
		setRows((prev) =>
			prev.map((r) => (r.codeGroup === selectedCodeGroup ? { ...r, remark: "수정됨" } : r))
		);
	};

	const handleDelete = () => {
		if (!selectedCodeGroup) return;
		setRows((prev) => prev.map((r) => (r.codeGroup === selectedCodeGroup ? { ...r, deleted: true } : r)));
	};

	const handleRegisterUserCode = () => {
		// 퍼블: 사용자코드등록 화면으로 라우팅/모달 등 추후 연동
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-3">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="w-[280px] rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						일반코드관리
					</div>

					<div className="flex-1 rounded border border-blue-300 bg-white p-2 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								코드구분
							</span>
							<input
								value={codeGroupQuery}
								onChange={(e) => setCodeGroupQuery(e.target.value)}
								className="w-24 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
							<button
								type="button"
								onClick={handleSearch}
								className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								검색
							</button>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleNew}
								className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								신규
							</button>
							<button
								type="button"
								onClick={handleEdit}
								disabled={!selectedCodeGroup}
								className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								수정
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={!selectedCodeGroup}
								className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								삭제
							</button>
							<button
								type="button"
								onClick={handleRegisterUserCode}
								disabled={!selectedCodeGroup}
								className="w-32 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								사용자코드등록
							</button>
							<button
								type="button"
								onClick={handleClose}
								className="w-24 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
					</div>
				</div>

				{/* 테이블 */}
				<div className="rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="max-h-[760px] overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[140px]">
										코드구분
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
										설명
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900 w-[260px]">
										비고
									</th>
									<th className="px-3 py-2 text-center font-semibold text-blue-900 w-[90px]">
										DEL
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-12 text-center text-blue-900/60">
											데이터가 없습니다.
										</td>
									</tr>
								) : (
									filteredRows.map((r) => {
										const isSelected = r.codeGroup === selectedCodeGroup;
										return (
											<tr
												key={r.codeGroup}
												onClick={() => setSelectedCodeGroup(r.codeGroup)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50/60 ${
													isSelected ? "bg-blue-100" : ""
												}`}
											>
												<td className="border-r border-blue-100 px-3 py-2">{r.codeGroup}</td>
												<td className="border-r border-blue-100 px-3 py-2">{r.description}</td>
												<td className="border-r border-blue-100 px-3 py-2">{r.remark}</td>
												<td className="px-3 py-2 text-center">{r.deleted ? "D" : ""}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-blue-900/60">
						선택: {selectedRow ? `${selectedRow.codeGroup} - ${selectedRow.description}` : "-"}
					</div>
				</div>
			</div>
		</div>
	);
}

