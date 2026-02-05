"use client";
import React, { useState } from 'react';

interface EmployeeForm {
	name: string;
	yearsOfService: string;
	workLocation: string;
	workType: string;
	hireDate: string;
	retirementDate: string;
	leaveStartDate: string;
	leaveEndDate: string;
	homePhone: string;
	mobilePhone: string;
	homeAddress: string;
	attendanceManagement: boolean;
	annualLeaveStandardDate: string;
	notes: string;
}

const initialForm: EmployeeForm = {
	name: "박여울",
	yearsOfService: "",
	workLocation: "",
	workType: "",
	hireDate: "2025-05-01",
	retirementDate: "",
	leaveStartDate: "",
	leaveEndDate: "",
	homePhone: "",
	mobilePhone: "",
	homeAddress: "",
	attendanceManagement: true,
	annualLeaveStandardDate: "2025-05-01",
	notes: "",
};

export default function EmployeeBasicInfo() {
	const [formData, setFormData] = useState<EmployeeForm>(initialForm);
	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1200px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 사원 목록 */}
					<aside className="w-72 shrink-0">
						<div className="border border-blue-300 rounded-lg overflow-hidden bg-white shadow-sm">
							<div className="bg-blue-100 border-b border-blue-300 px-3 py-2 text-blue-900 font-semibold">사원 목록</div>
							{/* 상단 상태/검색 영역 */}
							<div className="px-3 py-2 border-b border-blue-100 space-y-2">
								<div className="text-xs text-blue-900/80">이름/사번/부서 검색</div>
								<input className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white" placeholder="예) 홍길동 / E001 / 간호팀" />
								<button className="w-full text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 py-1">검색</button>
							</div>
							{/* 목록 테이블 */}
							<div className="max-h-[540px] overflow-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 bg-blue-50 border-b border-blue-200">
										<tr>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">이름</th>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">핸드폰번호</th>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">직책</th>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">근무상태</th>
										</tr>
									</thead>
									<tbody>
										{[
											{ name: '김간호', phone: '010-1234-5678', position: '간호사', workStatus: '근무' },
											{ name: '이요양', phone: '010-2345-6789', position: '요양보호사', workStatus: '근무' },
											{ name: '박치료', phone: '010-3456-7890', position: '물리치료사', workStatus: '근무' },
											{ name: '최행정', phone: '010-4567-8901', position: '행정직', workStatus: '휴직' },
											{ name: '정프로그램', phone: '010-5678-9012', position: '프로그램 담당', workStatus: '근무' },
										].map((row, idx) => (
										<tr key={idx} className="border-b border-blue-50 hover:bg-blue-50 cursor-pointer">
											<td className="px-2 py-2">{row.name}</td>
											<td className="px-2 py-2">{row.phone}</td>
											<td className="px-2 py-2">{row.position}</td>
											<td className="px-2 py-2">{row.workStatus}</td>
										</tr>
									))}
									</tbody>
								</table>
							</div>
						</div>
					</aside>

					{/* 우측: 사원정보 상세 영역 */}
					<section className="flex-1">
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
							{/* 상단 헤더: 사원정보 탭 + 근태관리구분/년차기준일 */}
							<div className="flex items-center justify-between border-b border-blue-200 bg-blue-50/50 p-4">
								<div className="flex items-center gap-2">
									<div className="rounded-t border border-b-0 border-blue-300 bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-900">
										사원정보
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900">근태관리구분</label>
										<input
											type="checkbox"
											checked={formData.attendanceManagement}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													attendanceManagement: e.target.checked,
												}))
											}
											className="rounded border-blue-300 text-blue-600"
										/>
										<span className="text-sm text-blue-900">관리</span>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900">년차기준일</label>
										<input
											type="date"
											value={formData.annualLeaveStandardDate}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													annualLeaveStandardDate: e.target.value,
												}))
											}
											className="rounded border border-blue-300 bg-white px-2 py-1 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
										/>
									</div>
								</div>
							</div>

							{/* 메인 폼 영역 */}
							<div className="p-4 space-y-3">
								{/* Row 1: 사원명/년차 + 근무위치 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										사원명/년차
									</label>
									<input
										type="text"
										value={formData.name}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-16 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										년차
									</label>
									<input
										type="text"
										value={formData.yearsOfService}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												yearsOfService: e.target.value,
											}))
										}
										placeholder="년차"
										className="w-20 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										근무위치
									</label>
									<input
										type="text"
										value={formData.workLocation}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												workLocation: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 2: 근무형태 + 취업일자 + 퇴직일자 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										근무형태
									</label>
									<input
										type="text"
										value={formData.workType}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, workType: e.target.value }))
										}
										className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										취업일자
									</label>
									<input
										type="date"
										value={formData.hireDate}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, hireDate: e.target.value }))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-20 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										퇴직일자
									</label>
									<input
										type="date"
										value={formData.retirementDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												retirementDate: e.target.value,
											}))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 3: 휴직시작일 + 휴직종료일 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										휴직시작일
									</label>
									<input
										type="date"
										value={formData.leaveStartDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												leaveStartDate: e.target.value,
											}))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-20 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										휴직종료일
									</label>
									<input
										type="date"
										value={formData.leaveEndDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												leaveEndDate: e.target.value,
											}))
										}
										className="w-40 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 4: 집전화 + 핸드폰 */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										집전화
									</label>
									<input
										type="text"
										value={formData.homePhone}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, homePhone: e.target.value }))
										}
										className="w-32 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
									<label className="w-20 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 ml-4">
										핸드폰
									</label>
									<input
										type="text"
										value={formData.mobilePhone}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												mobilePhone: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* Row 5: 집주소 (전체 너비) */}
								<div className="flex items-center gap-2">
									<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
										집주소
									</label>
									<input
										type="text"
										value={formData.homeAddress}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												homeAddress: e.target.value,
											}))
										}
										className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
									/>
								</div>

								{/* 하단: 비고 영역 + 추가/수정 버튼 */}
								<div className="mt-4 flex items-start gap-4">
									<div className="flex flex-col gap-2 flex-1">
										<label className="w-24 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
											비고
										</label>
										<textarea
											value={formData.notes}
											onChange={(e) =>
												setFormData((prev) => ({ ...prev, notes: e.target.value }))
											}
											rows={4}
											className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
											placeholder="비고를 입력하세요"
										/>
									</div>
									<div className="flex flex-col gap-2 pt-7">
										<button
											type="button"
											className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap"
										>
											추가
										</button>
										<button
											type="button"
											className="rounded border border-blue-400 bg-blue-200 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 whitespace-nowrap"
										>
											수정
										</button>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
    );
}
