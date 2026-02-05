"use client";

import React, { useState } from "react";

interface SalaryTableRow {
	applyDate: string;
	grade: string;
	inpatientPrice: string;
	outpatientPrice: string;
}

const initialForm = {
	applyDate: "2026-01-01",
	grade: "1등급",
	inpatientPrice: "93,070",
	outpatientPrice: "46,540",
};

const GRADES = ["1등급", "2등급", "3등급", "4등급", "5등급", "6등급", "등급외"];

export default function GradeSalaryTable() {
	const [salaryRows, setSalaryRows] = useState<SalaryTableRow[]>([
		{ applyDate: "2019-01-01", grade: "2등급", inpatientPrice: "64,170", outpatientPrice: "32,085" },
		{ applyDate: "2018-01-01", grade: "1등급", inpatientPrice: "65,190", outpatientPrice: "32,595" },
		{ applyDate: "2014-10-02", grade: "등급외", inpatientPrice: "10,000", outpatientPrice: "1,000" },
	]);
	const [formData, setFormData] = useState(initialForm);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const totalPages = Math.ceil(salaryRows.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentRows = salaryRows.slice(startIndex, endIndex);

	const handleSave = () => {
		// TODO: 저장 API 호출
		const newRow: SalaryTableRow = {
			applyDate: formData.applyDate,
			grade: formData.grade,
			inpatientPrice: formData.inpatientPrice,
			outpatientPrice: formData.outpatientPrice,
		};
		setSalaryRows((prev) => [newRow, ...prev]);
	};

	const handleDelete = () => {
		// TODO: 삭제 API 호출
		setSalaryRows((prev) => prev.filter((_, idx) => idx !== startIndex));
	};

	const handleCopyBenefits = () => {
		// TODO: 급여 복사 기능
	};

	const handleClose = () => {
		// TODO: 닫기
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			{/* 제목 영역 */}
			<div className="border-b border-blue-200 bg-blue-50/50 px-6 py-4">
				<h1 className="text-center text-lg font-semibold text-blue-900">
					수급자 급여단가 관리
				</h1>
			</div>

			{/* 메인 콘텐츠 영역 */}
			<div className="flex flex-1 gap-4 p-4">
				{/* 왼쪽 영역: 급여단가 목록 테이블 (약 60%) */}
				<div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
					<div className="flex-1 overflow-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
								<tr>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										적용일
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										등급
									</th>
									<th className="border-r border-blue-200 px-3 py-2 text-center font-semibold text-blue-900">
										입원단가
									</th>
									<th className="px-3 py-2 text-center font-semibold text-blue-900">
										외박단가
									</th>
								</tr>
							</thead>
							<tbody>
								{currentRows.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-3 py-8 text-center text-blue-900/60">
											급여단가 데이터가 없습니다.
										</td>
									</tr>
								) : (
									currentRows.map((row, idx) => (
										<tr
											key={`${row.applyDate}-${row.grade}-${idx}`}
											className="border-b border-blue-50 hover:bg-blue-50/50"
										>
											<td className="border-r border-blue-100 px-3 py-2 text-center">
												{row.applyDate}
											</td>
											<td className="border-r border-blue-100 px-3 py-2 text-center">
												{row.grade}
											</td>
											<td className="border-r border-blue-100 px-3 py-2 text-center">
												{row.inpatientPrice}
											</td>
											<td className="px-3 py-2 text-center">{row.outpatientPrice}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{/* 페이지네이션 */}
					{totalPages > 1 && (
						<div className="border-t border-blue-200 bg-white p-2">
							<div className="flex items-center justify-center gap-1">
								<button
									type="button"
									onClick={() => handlePageChange(1)}
									disabled={currentPage === 1}
									className="rounded border border-blue-300 px-3 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									≪
								</button>
								<button
									type="button"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="rounded border border-blue-300 px-3 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									〈
								</button>
								<button
									type="button"
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									className="rounded border border-blue-300 px-3 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									〉
								</button>
								<button
									type="button"
									onClick={() => handlePageChange(totalPages)}
									disabled={currentPage === totalPages}
									className="rounded border border-blue-300 px-3 py-1 text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									≫
								</button>
							</div>
						</div>
					)}
				</div>

				{/* 오른쪽 영역: 급여단가 입력/수정 폼 (약 40%) */}
				<div className="flex w-[40%] flex-col gap-4 rounded-lg border border-blue-300 bg-blue-50/30 p-4">
					{/* 세로 버튼 (왼쪽) + 입력 필드 (오른쪽) */}
					<div className="flex gap-3">
						{/* 세로 버튼 */}
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={handleSave}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap"
							>
								&lt;= 저장
							</button>
							<button
								type="button"
								onClick={handleDelete}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap"
							>
								삭제 =&gt;
							</button>
						</div>

						{/* 입력 필드 */}
						<div className="flex flex-1 flex-col gap-3">
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									적용 일자
								</label>
								<input
									type="date"
									value={formData.applyDate}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, applyDate: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									요양 등급
								</label>
								<select
									value={formData.grade}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, grade: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								>
									{GRADES.map((grade) => (
										<option key={grade} value={grade}>
											{grade}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									입원 단가
								</label>
								<input
									type="text"
									value={formData.inpatientPrice}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											inpatientPrice: e.target.value,
										}))
									}
									placeholder="예: 93,070"
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									외박 단가
								</label>
								<input
									type="text"
									value={formData.outpatientPrice}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											outpatientPrice: e.target.value,
										}))
									}
									placeholder="예: 46,540"
									className="flex-1 rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
					</div>

					{/* 하단 가로 버튼 */}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleCopyBenefits}
							className="flex-1 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							급여 복사
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="flex-1 rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
