"use client";

import React, { useState, useEffect } from "react";
import { formatCareGradeLabel } from "../../utils/careGrade";

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	[key: string]: unknown;
}

// 수금 내역 메인 그리드 행
interface CollectionRow {
	recipient: string;
	status: string;
	occurYearMonth: string;
	recipientContribution: string;
	cash: string;
	card: string;
	deposit: string;
	unpaid: string;
}

// 상세 수금 그리드 행
interface DetailCollectionRow {
	yearMonth: string;
	collectionDate: string;
	cash: string;
	card: string;
	deposit: string;
}

// 수급자 정보 폼
interface RecipientInfoForm {
	payYearMonth: string;
	unpaid: string;
	date: string;
	depositorName: string;
	cash: string;
	card: string;
	deposit: string;
}

const initialRecipientForm: RecipientInfoForm = {
	payYearMonth: "",
	unpaid: "",
	date: "",
	depositorName: "",
	cash: "",
	card: "",
	deposit: "",
};

export default function MonthlySalaryCollection() {
	// 수급자 목록 (좌측)
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>("입소");
	const [selectedGrade, setSelectedGrade] = useState<string>("");
	const [selectedFloor, setSelectedFloor] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 급여 수금내역 (우측)
	const [payYearMonth, setPayYearMonth] = useState("2026-01");
	const [recipientFilter, setRecipientFilter] = useState("");
	const [collectionRows, setCollectionRows] = useState<CollectionRow[]>([]);
	const [detailRows, setDetailRows] = useState<DetailCollectionRow[]>([]);
	const [recipientForm, setRecipientForm] = useState<RecipientInfoForm>(initialRecipientForm);

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ""
					? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
					: "/api/f10010";
			const response = await fetch(url);
			const result = await response.json();
			if (result.success) {
				setMemberList(result.data || []);
			}
		} catch (err) {
			console.error("수급자 목록 조회 오류:", err);
		} finally {
			setLoading(false);
		}
	};

	const calculateAge = (birthDate: string) => {
		if (!birthDate) return "-";
		try {
			const year = parseInt(birthDate.substring(0, 4), 10);
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return "-";
		}
	};

	const filteredMembers = memberList
		.filter((member) => {
			if (selectedStatus) {
				const memberStatus = String(member.P_ST || "").trim();
				if (selectedStatus === "입소" && memberStatus !== "1") return false;
				if (selectedStatus === "퇴소" && memberStatus !== "9") return false;
			}
			if (selectedGrade) {
				const memberGrade = String(member.P_GRD || "").trim();
				if (memberGrade !== String(selectedGrade).trim()) return false;
			}
			if (selectedFloor) {
				const memberFloor = String(member.P_FLOOR || "").trim();
				if (memberFloor !== String(selectedFloor).trim()) return false;
			}
			if (searchTerm && searchTerm.trim() !== "") {
				if (!member.P_NM?.toLowerCase().includes(searchTerm.toLowerCase().trim()))
					return false;
			}
			return true;
		})
		.sort((a, b) => (a.P_NM || "").trim().localeCompare((b.P_NM || "").trim(), "ko"));

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	useEffect(() => {
		fetchMembers();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setRecipientFilter(member.P_NM || "");
		setRecipientForm((prev) => ({
			...prev,
			payYearMonth: payYearMonth.replace("-", ""),
		}));
	};

	const handleSearch = () => {
		// TODO: 급여년월/수급자 기준 수금 내역 검색 API
		setCollectionRows([]);
		setDetailRows([]);
	};

	const handleClose = () => {
		// TODO: 닫기
	};

	const handlePrintSelfContribution = () => {
		// TODO: 본인부담금 출력
	};

	const handlePrintCollection = () => {
		// TODO: 수금내역서 출력
	};

	const handlePrintUnpaid = () => {
		// TODO: 미수금내역서 출력
	};

	const handleSaveCollection = () => {
		// TODO: 수금 저장
	};

	const handleDeleteCollection = () => {
		// TODO: 수금 삭제
	};

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 (CognitiveAssessmentRecord와 동일) */}
				<div className="flex flex-col w-1/4 border-r border-blue-200 bg-white p-4">
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs"
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">현황</div>
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900"
								>
									<option value="">현황 전체</option>
									<option value="입소">입소</option>
									<option value="퇴소">퇴소</option>
								</select>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">등급</div>
								<select
									value={selectedGrade}
									onChange={(e) => setSelectedGrade(e.target.value)}
									className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900"
								>
									<option value="">등급 전체</option>
									<option value="1">1등급</option>
									<option value="2">2등급</option>
									<option value="3">3등급</option>
									<option value="4">4등급</option>
									<option value="5">5등급</option>
									<option value="9">인지지원</option>
								</select>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<select
									value={selectedFloor}
									onChange={(e) => setSelectedFloor(e.target.value)}
									className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900"
								>
									<option value="">층수 전체</option>
									{Array.from(
										new Set(
											memberList
												.map((m) => m.P_FLOOR)
												.filter((f) => f != null && f !== "")
										)
									)
										.sort((a, b) => Number(a) - Number(b))
										.map((floor) => {
											const f = String(floor);
											return (
												<option key={f} value={f}>
													{f}층
												</option>
											);
										})}
								</select>
							</div>
						</div>
					</div>

					<div className="flex flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
											연번
										</th>
										<th className="border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
											현황
										</th>
										<th className="border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
											수급자명
										</th>
										<th className="border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
											성별
										</th>
										<th className="border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
											등급
										</th>
										<th className="px-2 py-1.5 text-center font-semibold text-blue-900">
											나이
										</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
												수급자 데이터가 없습니다
											</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`cursor-pointer border-b border-blue-50 hover:bg-blue-50 ${
													selectedMember?.ANCD === member.ANCD &&
													selectedMember?.PNUM === member.PNUM
														? "bg-blue-100"
														: ""
												}`}
											>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{startIndex + index + 1}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{member.P_ST === "1"
														? "입소"
														: member.P_ST === "9"
															? "퇴소"
															: "-"}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{member.P_NM || "-"}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{member.P_SEX === "1"
														? "남"
														: member.P_SEX === "2"
															? "여"
															: "-"}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{formatCareGradeLabel(member.P_GRD)}
												</td>
												<td className="px-2 py-1.5 text-center">
													{calculateAge(member.P_BRDT)}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{totalPages > 1 && (
							<div className="border-t border-blue-200 bg-white p-2">
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										onClick={() => handlePageChange(1)}
										disabled={currentPage === 1}
										className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										&lt;
									</button>
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const pageNum =
											Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
										return (
											<button
												type="button"
												key={pageNum}
												onClick={() => handlePageChange(pageNum)}
												className={`rounded border px-2 py-1 text-xs ${
													currentPage === pageNum
														? "border-blue-500 bg-blue-500 text-white"
														: "border-blue-300 hover:bg-blue-50"
												}`}
											>
												{pageNum}
											</button>
										);
									})}
									<button
										type="button"
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => handlePageChange(totalPages)}
										disabled={currentPage === totalPages}
										className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 우측 패널: 급여 수금내역 관리 */}
				<div className="flex flex-1 flex-col overflow-hidden bg-white">
					{/* 상단: 제목 + 필터 + 버튼 */}
					<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
						<h2 className="text-lg font-semibold text-blue-900">급여 수금내역 관리</h2>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">급여년월</label>
							<input
								type="month"
								value={payYearMonth}
								onChange={(e) => {
									setPayYearMonth(e.target.value);
									setRecipientForm((prev) => ({
										...prev,
										payYearMonth: e.target.value.replace("-", ""),
									}));
								}}
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">수급자</label>
							<input
								type="text"
								value={recipientFilter}
								onChange={(e) => setRecipientFilter(e.target.value)}
								placeholder="수급자명"
								className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none min-w-[120px]"
							/>
						</div>
						<div className="ml-auto flex gap-2">
							<button
								type="button"
								onClick={handleSearch}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								검색
							</button>
							<button
								type="button"
								onClick={handleClose}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
					</div>

					{/* 출력 버튼 행 */}
					<div className="flex flex-wrap gap-2 border-b border-blue-200 bg-white px-4 py-2">
						<button
							type="button"
							onClick={handlePrintSelfContribution}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							본인부담금 출력
						</button>
						<button
							type="button"
							onClick={handlePrintCollection}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							수금내역서 출력
						</button>
						<button
							type="button"
							onClick={handlePrintUnpaid}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							미수금내역서 출력
						</button>
					</div>

					{/* 중앙: 수금 내역 메인 그리드 */}
					<div className="flex-1 overflow-hidden border-b border-blue-200">
						<div className="h-full overflow-auto">
							<table className="w-full min-w-[700px] text-xs">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											상태
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											발생년월
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											현금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											카드
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											예금
										</th>
										<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
											미수금
										</th>
									</tr>
								</thead>
								<tbody>
									{collectionRows.length === 0 ? (
										<tr>
											<td colSpan={8} className="px-2 py-8 text-center text-blue-900/60">
												수금 데이터가 없습니다. 검색해 주세요.
											</td>
										</tr>
									) : (
										collectionRows.map((row, idx) => (
											<tr key={idx} className="border-b border-blue-50 hover:bg-blue-50/50">
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipient}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.status}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.occurYearMonth}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipientContribution}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.cash}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.card}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.deposit}
												</td>
												<td className="px-2 py-1.5 text-center">{row.unpaid}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 하단: 좌측 상세 수금 그리드 + 우측 수급자 정보 폼 */}
					<div className="flex min-h-0 flex-1 gap-4 border-t border-blue-200 p-4">
						{/* 좌측: 상세 수금 그리드 */}
						<div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-blue-300 bg-white">
							<div className="overflow-auto">
								<table className="w-full min-w-[400px] text-xs">
									<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
										<tr>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												년월
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												수금일자
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												현금
											</th>
											<th className="whitespace-nowrap border-r border-blue-200 px-2 py-1.5 text-center font-semibold text-blue-900">
												카드
											</th>
											<th className="whitespace-nowrap px-2 py-1.5 text-center font-semibold text-blue-900">
												예금
											</th>
										</tr>
									</thead>
									<tbody>
										{detailRows.length === 0 ? (
											<tr>
												<td
													colSpan={5}
													className="px-2 py-4 text-center text-blue-900/60"
												>
													상세 수금 내역이 없습니다.
												</td>
											</tr>
										) : (
											detailRows.map((row, idx) => (
												<tr
													key={idx}
													className="border-b border-blue-50 hover:bg-blue-50/50"
												>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.yearMonth}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.collectionDate}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.cash}
													</td>
													<td className="border-r border-blue-100 px-2 py-1.5 text-center">
														{row.card}
													</td>
													<td className="px-2 py-1.5 text-center">
														{row.deposit}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* 우측: 수급자 정보 입력 폼 */}
						<div className="flex w-80 shrink-0 flex-col gap-3 rounded-lg border border-blue-300 bg-blue-50/50 p-4">
							<h3 className="text-sm font-semibold text-blue-900">수급자 정보</h3>
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										급여년월
									</label>
									<input
										type="text"
										value={recipientForm.payYearMonth}
										onChange={(e) =>
											setRecipientForm((prev) => ({
												...prev,
												payYearMonth: e.target.value,
											}))
										}
										placeholder="202601"
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										미수금
									</label>
									<input
										type="text"
										value={recipientForm.unpaid}
										onChange={(e) =>
											setRecipientForm((prev) => ({
												...prev,
												unpaid: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										일자
									</label>
									<input
										type="text"
										value={recipientForm.date}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, date: e.target.value }))
										}
										placeholder="수금일자"
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										입금자명
									</label>
									<input
										type="text"
										value={recipientForm.depositorName}
										onChange={(e) =>
											setRecipientForm((prev) => ({
												...prev,
												depositorName: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										현금
									</label>
									<input
										type="text"
										value={recipientForm.cash}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, cash: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										카드
									</label>
									<input
										type="text"
										value={recipientForm.card}
										onChange={(e) =>
											setRecipientForm((prev) => ({ ...prev, card: e.target.value }))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-20 shrink-0 text-xs font-medium text-blue-900">
										예금
									</label>
									<input
										type="text"
										value={recipientForm.deposit}
										onChange={(e) =>
											setRecipientForm((prev) => ({
												...prev,
												deposit: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>
							</div>
							<div className="mt-2 flex gap-2">
								<button
									type="button"
									onClick={handleSaveCollection}
									className="flex-1 rounded border border-blue-400 bg-blue-500 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
								>
									수금 저장
								</button>
								<button
									type="button"
									onClick={handleDeleteCollection}
									className="flex-1 rounded border border-blue-400 bg-blue-200 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									수금 삭제
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
