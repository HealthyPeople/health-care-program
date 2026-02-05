"use client";

import React, { useState, useEffect } from "react";

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

// 명세서 테이블 행
interface StatementRow {
	recipient: string;
	birthday: string;
	grade: string;
	benefitTotal: string;
	nhaContribution: string;
	recipientContribution: string;
	nonBenefitMeal: string;
	roomUpgradeFee: string;
	outpatientFee: string;
	contractedMedical: string;
	contractedPrescription: string;
	beautyCost: string;
	otherCostsRecipient: string;
}

// 하단 폼 데이터
interface StatementForm {
	recipient: string;
	deliveryMethod: string;
	recipientName: string;
	receiveContent: string;
	birthday: string;
	deliverer: string;
	issueDate: string;
}

const TABS = [
	{ id: "occurrence", label: "발생내역서" },
	{ id: "ledger", label: "발부대장" },
	{ id: "individual", label: "개별급여명세서" },
	{ id: "total", label: "전체급여명세서" },
	{ id: "payment", label: "납부확인서" },
] as const;

const initialForm: StatementForm = {
	recipient: "",
	deliveryMethod: "직접전달",
	recipientName: "",
	receiveContent: "",
	birthday: "",
	deliverer: "",
	issueDate: "2026-02-05",
};

export default function MonthlySalaryStatement() {
	// 수급자 목록 (좌측)
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>("");
	const [selectedGrade, setSelectedGrade] = useState<string>("");
	const [selectedFloor, setSelectedFloor] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 명세서 발부대장 (우측)
	const [payYearMonth, setPayYearMonth] = useState("2026-01");
	const [recipientFilter, setRecipientFilter] = useState("");
	const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("occurrence");
	const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
	const [formData, setFormData] = useState<StatementForm>(initialForm);

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

	const formatBirthday = (dateStr: string) => {
		if (!dateStr) return "";
		const s = String(dateStr).replace(/\D/g, "");
		if (s.length >= 8) {
			return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
		}
		return dateStr;
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
		setFormData((prev) => ({
			...prev,
			recipient: member.P_NM || "",
			birthday: formatBirthday(member.P_BRDT || ""),
		}));
	};

	const handleSearch = () => {
		// TODO: 급여년월/수급자 기준 명세서 데이터 검색 API
		setStatementRows([]);
	};

	const handleClose = () => {
		// TODO: 닫기
	};

	const handleIssueDateChangeAll = () => {
		// TODO: 발행일자전체변경
	};

	const handleSave = () => {
		// TODO: 저장
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
									<option value="6">6등급</option>
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
													{member.P_GRD === "0"
														? "등급외"
														: member.P_GRD
															? `${member.P_GRD}등급`
															: "-"}
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

				{/* 우측 패널: 장기요양급여비용 명세서발부대장 */}
				<div className="flex flex-1 flex-col overflow-hidden bg-white">
					{/* 상단: 제목 + 조회조건 + 탭 + 버튼 */}
					<div className="border-b border-blue-200 bg-blue-50/50 p-4">
						<div className="mb-3 flex flex-wrap items-center gap-4">
							<h2 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-center text-base font-semibold text-blue-900">
								장기요양급여비용
								<br />
								명세서발부대장
							</h2>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900">급여년월</label>
								<input
									type="month"
									value={payYearMonth}
									onChange={(e) => setPayYearMonth(e.target.value)}
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
									className="min-w-[120px] rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
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
						{/* 탭 */}
						<div className="flex gap-1">
							{TABS.map((tab) => (
								<button
									type="button"
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`rounded-t border border-b-0 px-4 py-2 text-sm font-medium ${
										activeTab === tab.id
											? "border-blue-400 bg-blue-200 text-blue-900"
											: "border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>
					</div>

					{/* 중앙: 데이터 테이블 */}
					<div className="flex-1 overflow-hidden border-b border-blue-200">
						<div className="h-full overflow-auto">
							<table className="w-full min-w-[900px] text-xs">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-100">
									<tr>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											생일
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											등급
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											급여합계
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											공단부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											수급자부담금
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											비급여식대
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											병실승급비
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											외래진료비
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											촉탁의료
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											촉탁처방
										</th>
										<th className="whitespace-nowrap border-r border-blue-200 px-2 py-2 text-center font-semibold text-blue-900">
											이미용비
										</th>
										<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
											기타비용 수급
										</th>
									</tr>
								</thead>
								<tbody>
									{statementRows.length === 0 ? (
										<tr>
											<td colSpan={13} className="px-2 py-8 text-center text-blue-900/60">
												명세서 데이터가 없습니다. 검색해 주세요.
											</td>
										</tr>
									) : (
										statementRows.map((row, idx) => (
											<tr
												key={idx}
												className="border-b border-blue-50 hover:bg-blue-50/50"
											>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipient}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.birthday}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.grade}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.benefitTotal}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.nhaContribution}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.recipientContribution}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.nonBenefitMeal}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.roomUpgradeFee}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.outpatientFee}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.contractedMedical}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.contractedPrescription}
												</td>
												<td className="border-r border-blue-100 px-2 py-1.5 text-center">
													{row.beautyCost}
												</td>
												<td className="px-2 py-1.5 text-center">
													{row.otherCostsRecipient}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 하단: 데이터 입력 및 액션 폼 */}
					<div className="flex flex-wrap gap-6 border-t border-blue-200 bg-blue-50/30 p-4">
						{/* 왼쪽 열 */}
						<div className="flex min-w-0 flex-1 flex-col gap-3">
							<div className="flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">
									수급자
								</label>
								<input
									type="text"
									value={formData.recipient}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, recipient: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">
									전달방법
								</label>
								<select
									value={formData.deliveryMethod}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											deliveryMethod: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								>
									<option value="직접전달">직접전달</option>
									<option value="우편">우편</option>
									<option value="기타">기타</option>
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">
									수령자
								</label>
								<input
									type="text"
									value={formData.recipientName}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											recipientName: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-start gap-2">
								<label className="w-20 shrink-0 pt-1.5 text-sm font-medium text-blue-900">
									수령내용
								</label>
								<textarea
									value={formData.receiveContent}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											receiveContent: e.target.value,
										}))
									}
									rows={3}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
						{/* 오른쪽 열 */}
						<div className="flex min-w-0 flex-1 flex-col gap-3">
							<div className="flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">
									생년월일
								</label>
								<input
									type="text"
									value={formData.birthday}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, birthday: e.target.value }))
									}
									placeholder="YYYY-MM-DD"
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">
									전달자
								</label>
								<input
									type="text"
									value={formData.deliverer}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, deliverer: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-20 shrink-0 text-sm font-medium text-blue-900">
									발행일자
								</label>
								<input
									type="text"
									value={formData.issueDate}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, issueDate: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="mt-2 flex gap-2">
								<button
									type="button"
									onClick={handleIssueDateChangeAll}
									className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									발행일자전체변경
								</button>
								<button
									type="button"
									onClick={handleSave}
									className="rounded border border-blue-500 bg-blue-500 px-6 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
								>
									저장
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
