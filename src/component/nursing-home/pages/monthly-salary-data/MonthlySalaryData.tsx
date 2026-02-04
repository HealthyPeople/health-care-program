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

// 급여 발생 행 타입 (테이블용)
interface SalaryRow {
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
	otherCosts: string;
	recipientContributionTotal: string;
}

// 하단 상세 폼 데이터
interface SalaryDetailForm {
	recipient: string;
	birthday: string;
	nhaContribution: string;
	recipientContribution: string;
	beautyCost: string;
	nonBenefitMeal: string;
	nonBenefitSnack: string;
	otherCosts: string;
	premiumRoomFee: string;
	outpatientFee: string;
	roomAdjustFee: string;
	contractedMedicalFee: string;
	prescriptionFee: string;
}

const initialDetailForm: SalaryDetailForm = {
	recipient: "",
	birthday: "",
	nhaContribution: "",
	recipientContribution: "",
	beautyCost: "",
	nonBenefitMeal: "",
	nonBenefitSnack: "",
	otherCosts: "",
	premiumRoomFee: "",
	outpatientFee: "",
	roomAdjustFee: "",
	contractedMedicalFee: "",
	prescriptionFee: "",
};

export default function MonthlySalaryData() {
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

	// 급여발생자료 (우측)
	const [payYearMonth, setPayYearMonth] = useState("2026-01");
	const [payCalcUnit, setPayCalcUnit] = useState(true); // true: 십미만절사
	const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
	const [detailForm, setDetailForm] = useState<SalaryDetailForm>(initialDetailForm);

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
		if (dateStr.length >= 8) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
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
				if (!member.P_NM?.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
			}
			return true;
		})
		.sort((a, b) => (a.P_NM || "").trim().localeCompare((b.P_NM || "").trim(), "ko"));

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

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
		setDetailForm((prev) => ({
			...prev,
			recipient: member.P_NM || "",
			birthday: formatBirthday(member.P_BRDT || ""),
		}));
		// TODO: 선택 수급자 급여 데이터 로드 시 salaryRows/ detailForm 연동
	};

	const handleSearch = () => {
		// TODO: 급여년월 기준 검색 API
		setSalaryRows([]);
	};

	const handleCalcAll = () => {
		// TODO: 전체급여계산
	};

	const handleCalcIndividual = () => {
		// TODO: 개별계산
	};

	const handleClose = () => {
		// TODO: 닫기 (뒤로가기 또는 모달 닫기)
	};

	const handleDetailHistory = () => {
		// TODO: 상세내역
	};

	const handleSave = () => {
		// TODO: 저장
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 (CognitiveAssessmentRecord와 동일) */}
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded"
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
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
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
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
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
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
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

					<div className="flex flex-col overflow-hidden bg-white border border-blue-300 rounded-lg">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">
											연번
										</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">
											현황
										</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">
											수급자명
										</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">
											성별
										</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">
											등급
										</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">
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
												className={`border-b border-blue-50 cursor-pointer hover:bg-blue-50 ${
													selectedMember?.ANCD === member.ANCD &&
													selectedMember?.PNUM === member.PNUM
														? "bg-blue-100"
														: ""
												}`}
											>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{startIndex + index + 1}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_ST === "1" ? "입소" : member.P_ST === "9" ? "퇴소" : "-"}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_NM || "-"}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_SEX === "1" ? "남" : member.P_SEX === "2" ? "여" : "-"}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
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
										onClick={() => setCurrentPage(1)}
										disabled={currentPage === 1}
										className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
												onClick={() => setCurrentPage(pageNum)}
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
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage === totalPages}
										className="rounded border border-blue-300 px-2 py-1 text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage(totalPages)}
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

				{/* 우측 패널: 수급자급여발생자료 */}
				<div className="flex flex-1 flex-col overflow-hidden bg-white">
					{/* 상단: 제목 + 급여년월/계산단위 + 버튼 */}
					<div className="flex flex-wrap items-center gap-4 border-b border-blue-200 bg-blue-50/50 p-4">
						<h2 className="text-lg font-semibold text-blue-900">수급자급여발생자료</h2>
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
							<label className="text-sm font-medium text-blue-900">급여계산단위</label>
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									checked={payCalcUnit}
									onChange={(e) => setPayCalcUnit(e.target.checked)}
									className="rounded border-blue-300 text-blue-600"
								/>
								<span className="text-sm text-blue-900">십미만절사</span>
							</label>
						</div>
						<div className="ml-auto flex flex-wrap gap-2">
							<button
								type="button"
								onClick={handleSearch}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								검색
							</button>
							<button
								type="button"
								onClick={handleCalcAll}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								전체급여계산
							</button>
							<button
								type="button"
								onClick={handleCalcIndividual}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								개별계산
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

					{/* 중앙: 급여 테이블 */}
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
											기타비용
										</th>
										<th className="whitespace-nowrap px-2 py-2 text-center font-semibold text-blue-900">
											수급자부담금합
										</th>
									</tr>
								</thead>
								<tbody>
									{salaryRows.length === 0 ? (
										<tr>
											<td
												colSpan={13}
												className="px-2 py-8 text-center text-blue-900/60"
											>
												급여 데이터가 없습니다. 검색 또는 수급자를 선택해 주세요.
											</td>
										</tr>
									) : (
										salaryRows.map((row, idx) => (
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
													{row.otherCosts}
												</td>
												<td className="px-2 py-1.5 text-center">
													{row.recipientContributionTotal}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* 하단: 상세 입력/표시 영역 */}
					<div className="border-t border-blue-200 bg-blue-50/30 p-4">
						<div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									수급자
								</label>
								<input
									type="text"
									value={detailForm.recipient}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, recipient: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									생일
								</label>
								<input
									type="text"
									value={detailForm.birthday}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, birthday: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									공단부담금
								</label>
								<input
									type="text"
									value={detailForm.nhaContribution}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nhaContribution: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									수급자부담금
								</label>
								<input
									type="text"
									value={detailForm.recipientContribution}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											recipientContribution: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									이미용비
								</label>
								<input
									type="text"
									value={detailForm.beautyCost}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, beautyCost: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									비급여식대
								</label>
								<input
									type="text"
									value={detailForm.nonBenefitMeal}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nonBenefitMeal: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									비급여간식
								</label>
								<input
									type="text"
									value={detailForm.nonBenefitSnack}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											nonBenefitSnack: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									기타비용
								</label>
								<input
									type="text"
									value={detailForm.otherCosts}
									onChange={(e) =>
										setDetailForm((prev) => ({ ...prev, otherCosts: e.target.value }))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									상급병실료
								</label>
								<input
									type="text"
									value={detailForm.premiumRoomFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											premiumRoomFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									외래진료비
								</label>
								<input
									type="text"
									value={detailForm.outpatientFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											outpatientFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									병실조정료
								</label>
								<input
									type="text"
									value={detailForm.roomAdjustFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											roomAdjustFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									촉탁진료비
								</label>
								<input
									type="text"
									value={detailForm.contractedMedicalFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											contractedMedicalFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 text-sm font-medium text-blue-900">
									처방비
								</label>
								<input
									type="text"
									value={detailForm.prescriptionFee}
									onChange={(e) =>
										setDetailForm((prev) => ({
											...prev,
											prescriptionFee: e.target.value,
										}))
									}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={handleDetailHistory}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								상세내역
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="rounded border border-blue-400 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
							>
								저장
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
