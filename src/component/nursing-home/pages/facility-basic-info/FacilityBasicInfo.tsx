"use client";

import React, { useMemo, useState } from "react";

type TabKey = "customer" | "tax" | "service";

interface CustomerBasicForm {
	facilityCode: string; // 장기요양기관기호
	centerCapacity: string; // 센터 정원
	securityEnabled: boolean; // 보안적용
	approvalLevel: string; // 결재레벨

	transferSlip: boolean; // 수급전표이관
	transferAccount: string; // 수급이관계정
	transferAccountName: string; // 계정명(표시용)

	mealFee: string; // 식대
	snackFee: string; // 간식비

	useStartDate: string;
	useEndDate: string;
	managerName: string;
	managerMobile: string;
	phone: string;
	fax: string;
	zip: string;
	address: string;
	domain: string;
	email: string;
	paymentAmount: string; // 결제금액
	pwChangeDays: string; // PW변경일수
	depositAccountDesc: string; // 입금통장 설명
	depositAccountNo: string; // 입금통장번호
	contractNoticeDays: string; // 계약만기일수
}

interface TaxInvoiceForm {
	issue: "Y" | "N";
	companyName: string; // 상호
	ceoName: string; // 대표자명
	bizNo: string; // 사업자번호
	address: string;
	bizType: string; // 업태
	bizItem: string; // 종목
	email1: string;
	email2: string;
	email3: string;
}

interface ServiceGuideForm {
	content: string;
}

const labelClass =
	"shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900";
const inputClass =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

export default function FacilityBasicInfo() {
	const [activeTab, setActiveTab] = useState<TabKey>("customer");

	// 상단
	const [facilityName, setFacilityName] = useState("실습요양원");

	const [customerForm, setCustomerForm] = useState<CustomerBasicForm>(() => ({
		facilityCode: "K1-I2-N3-G4",
		centerCapacity: "700",
		securityEnabled: true,
		approvalLevel: "1",
		transferSlip: true,
		transferAccount: "",
		transferAccountName: "",
		mealFee: "",
		snackFee: "",
		useStartDate: "2014-10-08",
		useEndDate: "2099-12-31",
		managerName: "자자자",
		managerMobile: "010-9999-0000",
		phone: "02-0000-2256",
		fax: "02-0000-2266",
		zip: "110-110",
		address: "서울특별시 종로구 필동 1",
		domain: "www.king@wang.com",
		email: "www.king@wang.com",
		paymentAmount: "",
		pwChangeDays: "999",
		depositAccountDesc:
			"입금통장 : 국민은행 037601-04-030859 예금주 : 임종수(지지그린)\n담당자 : 임종수 (010-9270-5264)",
		depositAccountNo: "KM1-11567-000009",
		contractNoticeDays: "30",
	}));

	const [taxForm, setTaxForm] = useState<TaxInvoiceForm>(() => ({
		issue: "Y",
		companyName: "ㅅㅅㅅ",
		ceoName: "ㄷㄷㄷ",
		bizNo: "ㅅㅅㅅ",
		address: "ㅈㅈㅈ",
		bizType: "ㅇㅇㅇ",
		bizItem: "ㅈㅈㅈ",
		email1: "ㄷㄷㄷ 111",
		email2: "ㄷㄷㄷ 222",
		email3: "ㄷㄷㄷ",
	}));

	const [serviceForm, setServiceForm] = useState<ServiceGuideForm>(() => ({
		content: "",
	}));

	const tabs = useMemo(
		() => [
			{ key: "customer" as const, label: "고객기본" },
			{ key: "tax" as const, label: "세금계산서" },
			{ key: "service" as const, label: "서비스안내" },
		],
		[]
	);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			{/* 상단 바 */}
			<div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50/50 p-4">
				<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-lg font-semibold text-blue-900">
					센터 조회
				</h1>

				<div className="flex items-center gap-2 flex-1 min-w-[280px]">
					<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 shrink-0">
						장기요양기관명
					</span>
					<input
						type="text"
						value={facilityName}
						onChange={(e) => setFacilityName(e.target.value)}
						className={`${inputClass} flex-1`}
					/>
				</div>

				<div className="ml-auto flex flex-wrap gap-2">
					<button
						type="button"
						className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						고객정보수정
					</button>
					<button
						type="button"
						className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						사용자(ID)계정
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

			{/* 탭 */}
			<div className="px-4 pt-3">
				<div className="flex gap-2">
					{tabs.map((t) => {
						const isActive = t.key === activeTab;
						return (
							<button
								key={t.key}
								type="button"
								onClick={() => setActiveTab(t.key)}
								className={`rounded-t border px-4 py-2 text-sm font-medium ${
									isActive
										? "border-blue-300 bg-white text-blue-900"
										: "border-blue-200 bg-blue-50 text-blue-900/70 hover:bg-blue-100"
								}`}
							>
								{t.label}
							</button>
						);
					})}
				</div>
				<div className="rounded-b rounded-tr border border-blue-300 bg-white p-4">
					{activeTab === "customer" && (
						<div className="space-y-3">
							{/* row 1 */}
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>장기요양기관기호</label>
									<input
										value={customerForm.facilityCode}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, facilityCode: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>센터 정원</label>
									<input
										value={customerForm.centerCapacity}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, centerCapacity: e.target.value }))
										}
										className={`${inputClass} w-36 text-right`}
									/>
								</div>
							</div>

							{/* row 2 */}
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>보안적용</label>
									<input
										type="checkbox"
										checked={customerForm.securityEnabled}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, securityEnabled: e.target.checked }))
										}
										className="h-5 w-5 accent-blue-600"
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>결재 레벨</label>
									<input
										value={customerForm.approvalLevel}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, approvalLevel: e.target.value }))
										}
										className={`${inputClass} w-20 text-right`}
									/>
									<span className="text-sm text-blue-900/70">범위 : 1 ~ 4</span>
								</div>
							</div>

							{/* row 3 */}
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>수급전표이관</label>
									<input
										type="checkbox"
										checked={customerForm.transferSlip}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, transferSlip: e.target.checked }))
										}
										className="h-5 w-5 accent-blue-600"
									/>
									<label className={`${labelClass} w-28`}>수급이관계정</label>
									<input
										value={customerForm.transferAccount}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, transferAccount: e.target.value }))
										}
										className={`${inputClass} w-40`}
									/>
									<input
										value={customerForm.transferAccountName}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, transferAccountName: e.target.value }))
										}
										className={`${inputClass} flex-1 min-w-[200px]`}
									/>
								</div>
							</div>

							{/* row 4 */}
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>식대</label>
									<input
										value={customerForm.mealFee}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, mealFee: e.target.value }))
										}
										className={`${inputClass} w-28 text-right`}
									/>
									<label className={`${labelClass} w-28`}>간식비</label>
									<input
										value={customerForm.snackFee}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, snackFee: e.target.value }))
										}
										className={`${inputClass} w-28 text-right`}
									/>
								</div>
							</div>

							{/* row 5 */}
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>사용기간</label>
									<input
										type="date"
										value={customerForm.useStartDate}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, useStartDate: e.target.value }))
										}
										className={`${inputClass} w-44`}
									/>
									<span className="text-sm text-blue-900">~</span>
									<input
										type="date"
										value={customerForm.useEndDate}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, useEndDate: e.target.value }))
										}
										className={`${inputClass} w-44`}
									/>
								</div>
							</div>

							{/* row 6 */}
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>관리자명</label>
									<input
										value={customerForm.managerName}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, managerName: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>핸드폰번호</label>
									<input
										value={customerForm.managerMobile}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, managerMobile: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							{/* row 7 */}
							<div className="grid grid-cols-12 gap-3 border-t border-blue-200 pt-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>전화번호</label>
									<input
										value={customerForm.phone}
										onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>FAX번호</label>
									<input
										value={customerForm.fax}
										onChange={(e) => setCustomerForm((p) => ({ ...p, fax: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>우편번호</label>
									<input
										value={customerForm.zip}
										onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>주소</label>
									<input
										value={customerForm.address}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, address: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>도메인</label>
									<input
										value={customerForm.domain}
										onChange={(e) => setCustomerForm((p) => ({ ...p, domain: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>이메일</label>
									<input
										value={customerForm.email}
										onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>결제금액</label>
									<input
										value={customerForm.paymentAmount}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, paymentAmount: e.target.value }))
										}
										className={`${inputClass} flex-1 text-right`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 whitespace-pre-line rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
									{customerForm.depositAccountDesc}
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>PW변경일수</label>
									<input
										value={customerForm.pwChangeDays}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, pwChangeDays: e.target.value }))
										}
										className={`${inputClass} flex-1 text-right`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>입금통장번호</label>
									<input
										value={customerForm.depositAccountNo}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, depositAccountNo: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>계약만기일수</label>
									<input
										value={customerForm.contractNoticeDays}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, contractNoticeDays: e.target.value }))
										}
										className={`${inputClass} w-24 text-right`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 text-sm text-blue-900/70 flex items-center">
									&lt;= 로그인시 수급자 계약만기일 메시지 처리 기준일수
								</div>
							</div>
						</div>
					)}

					{activeTab === "tax" && (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<label className={`${labelClass} w-24`}>발행유무</label>
								<div className="flex items-center gap-6 rounded border border-blue-200 bg-blue-50 px-4 py-2">
									<label className="flex items-center gap-2 text-sm text-blue-900">
										<input
											type="radio"
											name="taxIssue"
											checked={taxForm.issue === "Y"}
											onChange={() => setTaxForm((p) => ({ ...p, issue: "Y" }))}
											className="h-4 w-4 accent-blue-600"
										/>
										예
									</label>
									<label className="flex items-center gap-2 text-sm text-blue-900">
										<input
											type="radio"
											name="taxIssue"
											checked={taxForm.issue === "N"}
											onChange={() => setTaxForm((p) => ({ ...p, issue: "N" }))}
											className="h-4 w-4 accent-blue-600"
										/>
										아니요
									</label>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>상 호</label>
									<input
										value={taxForm.companyName}
										onChange={(e) => setTaxForm((p) => ({ ...p, companyName: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>대표자명</label>
									<input
										value={taxForm.ceoName}
										onChange={(e) => setTaxForm((p) => ({ ...p, ceoName: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>사업자번호</label>
									<input
										value={taxForm.bizNo}
										onChange={(e) => setTaxForm((p) => ({ ...p, bizNo: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>주 소</label>
									<input
										value={taxForm.address}
										onChange={(e) => setTaxForm((p) => ({ ...p, address: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>업 태</label>
									<input
										value={taxForm.bizType}
										onChange={(e) => setTaxForm((p) => ({ ...p, bizType: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>종 목</label>
									<input
										value={taxForm.bizItem}
										onChange={(e) => setTaxForm((p) => ({ ...p, bizItem: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>EMAIL1</label>
									<input
										value={taxForm.email1}
										onChange={(e) => setTaxForm((p) => ({ ...p, email1: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>EMAIL2</label>
									<input
										value={taxForm.email2}
										onChange={(e) => setTaxForm((p) => ({ ...p, email2: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>EMAIL3</label>
									<input
										value={taxForm.email3}
										onChange={(e) => setTaxForm((p) => ({ ...p, email3: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>
						</div>
					)}

					{activeTab === "service" && (
						<div className="flex gap-4">
							<div className="w-28 shrink-0">
								<div className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
									서비스 안내
								</div>
							</div>
							<div className="flex-1 min-w-0 flex items-center gap-4">
								<textarea
									value={serviceForm.content}
									onChange={(e) => setServiceForm((p) => ({ ...p, content: e.target.value }))}
									rows={10}
									className="flex-1 min-h-[360px] rounded border border-blue-300 bg-white p-3 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-none"
								/>
								<button
									type="button"
									className="h-12 w-32 rounded border border-blue-400 bg-blue-200 text-sm font-medium text-blue-900 hover:bg-blue-300"
								>
									저장
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
