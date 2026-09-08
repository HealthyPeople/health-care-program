"use client";

/**
 * @file 수급자정보 — UI 부분 컴포넌트 (MemberInfoForm.tsx)
 *
 * @description
 * 요양원 수급자정보 기능의 UI 부분 컴포넌트입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoForm
 */
import React from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { normalizeRoomNo } from '../../utils/roomNoFloor';
import { formatDateTimeDisplay, toDateInputString, type MemberData } from './MemberInfoUtils';

export type MemberInfoFormMode = 'create' | 'edit' | 'view' | 'placeholder';

export type MemberInfoFormProps = {
	mode: MemberInfoFormMode;
	institutions?: Array<{ ANCD: string; ANNM: string }>;
	selectedMember?: MemberData | null;
	editedMember?: MemberData | null;
	newMember?: MemberData;
	onNewMemberFieldChange?: (field: string, value: any) => void;
	onFieldChange?: (field: string, value: any) => void;
	onNewMemberPhoneChange?: (value: string) => void;
	onEditedMemberPhoneChange?: (value: string) => void;
	onAddressSearch?: (isNewMember: boolean) => void;
};

/** 개인정보 입력 필드 영역 (생성/수정/조회/스켈레톤) Presentational */
export default function MemberInfoForm({
	mode,
	institutions = [],
	selectedMember = null,
	editedMember = null,
	newMember = {},
	onNewMemberFieldChange,
	onFieldChange,
	onNewMemberPhoneChange,
	onEditedMemberPhoneChange,
	onAddressSearch,
}: MemberInfoFormProps) {
	if (mode === 'placeholder') {
		return (
			<div className="bg-white border border-blue-300 rounded-lg shadow-sm min-h-[420px]">
				<div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-blue-100 border-b border-blue-200">
					<h2 className="text-xl font-semibold text-blue-900">개인정보</h2>
				</div>
				<div className="p-8 grid grid-cols-12 gap-3 opacity-50">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="col-span-12 md:col-span-6 flex flex-col gap-1">
							<div className="h-7 rounded bg-blue-100 border border-blue-200" />
							<div className="h-8 rounded border border-blue-200 bg-white" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (mode === 'create') {
		return (
			<div className="p-4">
				<div className="grid grid-cols-12 gap-4">
					{/* 입력 필드 영역 */}
					<div className="grid grid-cols-12 col-span-12 gap-3">
						{/* 기관 선택 */}
						<div className="flex flex-col col-span-12 gap-1">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">기관명 *</label>
							<select
								value={newMember.selectedANCD || ''}
								onChange={(e) => onNewMemberFieldChange?.('selectedANCD', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">기관을 선택하세요</option>
								{institutions.map((inst) => (
									<option key={inst.ANCD} value={inst.ANCD}>
										{inst.ANNM}
									</option>
								))}
							</select>
						</div>
						{/* 1행: 수급자명 + 성별 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-8">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자명 *</label>
							<input
								type="text"
								value={newMember.P_NM || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_NM', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="수급자명을 입력하세요"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-4">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">성별</label>
							<select
								value={newMember.P_SEX || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_SEX', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">선택</option>
								<option value="1">남자</option>
								<option value="2">여자</option>
							</select>
						</div>

						{/* 2행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">생년월일</label>
							<input
								type="date"
								value={newMember.P_BRDT || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_BRDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주민번호</label>
							<input
								type="text"
								value={newMember.P_NO || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_NO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="주민번호를 입력하세요"
							/>
						</div>

						{/* 3행 - 주소 검색 버튼 */}
						<div className="flex col-span-12 gap-2">
							<button
								type="button"
								onClick={() => onAddressSearch?.(true)}
								className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600"
							>
								주소 검색
							</button>
						</div>
						{/* 4행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">우편번호</label>
							<input
								type="text"
								value={newMember.P_ZIP || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_ZIP', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="우편번호"
								readOnly
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주소</label>
							<input
								type="text"
								value={newMember.P_ADDR || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_ADDR', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="주소를 검색하세요"
								readOnly
							/>
						</div>

						{/* 5행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">연락처</label>
							<input
								type="text"
								value={newMember.P_HP ?? newMember.P_TEL ?? ''}
								onChange={(e) => onNewMemberPhoneChange?.(e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="연락처를 입력하세요"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">요양등급</label>
							<select
								value={String(newMember.P_GRD ?? '')}
								onChange={(e) => onNewMemberFieldChange?.('P_GRD', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">선택</option>
								<option value="0">등급외</option>
								<option value="1">1등급</option>
								<option value="2">2등급</option>
								<option value="3">3등급</option>
								<option value="4">4등급</option>
								<option value="5">5등급</option>
								<option value="9">인지지원</option>
							</select>
						</div>

						{/* 6행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양인정번호</label>
							<input
								type="text"
								value={newMember.P_YYNO || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_YYNO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="장기요양인정번호"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">인정번호 발급일</label>
							<input
								type="date"
								value={newMember.P_YYDT || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_YYDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						</div>

						{/* 장기요양 유효기간 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효시작일</label>
							<input
								type="date"
								value={newMember.P_YYSDT || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_YYSDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효종료일</label>
							<input
								type="date"
								value={newMember.P_YYEDT || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_YYEDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						</div>

						{/* 7행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">상태</label>
							<select
								value={newMember.P_ST || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_ST', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">선택</option>
								<option value="1">입소</option>
								<option value="9">퇴소</option>
							</select>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">계약일자</label>
							<input
								type="date"
								value={newMember.P_CTDT || ''}
								onChange={(e) => onNewMemberFieldChange?.('P_CTDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						</div>

						{/* 8행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">입소일자 / 시간</label>
							<div className="flex gap-2">
								<input
									type="date"
									value={newMember.P_SDT || ''}
									onChange={(e) => onNewMemberFieldChange?.('P_SDT', e.target.value)}
									className="w-full min-w-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
								<input
									type="time"
									value={newMember.P_SDT_TM || ''}
									onChange={(e) => onNewMemberFieldChange?.('P_SDT_TM', e.target.value)}
									className="w-[7.5rem] shrink-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
							</div>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">퇴소일자 / 시간</label>
							<div className="flex gap-2">
								<input
									type="date"
									value={newMember.P_EDT || ''}
									onChange={(e) => onNewMemberFieldChange?.('P_EDT', e.target.value)}
									className="w-full min-w-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
								<input
									type="time"
									value={newMember.P_EDT_TM || ''}
									onChange={(e) => onNewMemberFieldChange?.('P_EDT_TM', e.target.value)}
									className="w-[7.5rem] shrink-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
							</div>
						</div>

						{/* 9행 */}
						{/* <div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">담당의</label>
							<input
								type="text"
								value={newMember.DTNM || ''}
								onChange={(e) => handleNewMemberFieldChange('DTNM', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="담당의 이름"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주치의 연락처</label>
							<input
								type="text"
								value={newMember.DTTEL || ''}
								onChange={(e) => handleNewMemberFieldChange('DTTEL', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="주치의 연락처"
							/>
						</div> */}

						{/* 10행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">이용병원</label>
							<input
								type="text"
								value={newMember.HSPT || ''}
								onChange={(e) => onNewMemberFieldChange?.('HSPT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="이용병원"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">간호지시서번호</label>
							<input
								type="text"
								value={newMember.HCANUM || ''}
								onChange={(e) => onNewMemberFieldChange?.('HCANUM', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="간호지시서번호"
							/>
						</div>

						{/* 11행 */}
						<div className="flex flex-col col-span-12 gap-1">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">간호지시서정보</label>
							<input
								type="text"
								value={newMember.HCAINFO || ''}
								onChange={(e) => onNewMemberFieldChange?.('HCAINFO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="간호지시서정보"
							/>
						</div>

						{/* 12행 */}
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">생활실</label>
							<input
								type="text"
								value={newMember.ROOM_NO ?? ''}
								onChange={(e) => onNewMemberFieldChange?.('ROOM_NO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="예: 101호"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">층수</label>
							<input
								type="number"
								min="0"
								step="1"
								value={newMember.P_FLOOR || ''}
								onChange={(e) => {
									const value = e.target.value;
									// 0 이상의 정수만 허용
									if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number.isInteger(Number(value)))) {
										onNewMemberFieldChange?.('P_FLOOR', value);
									}
								}}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="층수 (0 이상의 정수)"
							/>
						</div>
						<div className="flex flex-col col-span-12 gap-1">
							<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">비고</label>
							<input
								type="text"
								value={newMember.ETC || ''}
								onChange={(e) => onNewMemberFieldChange?.('ETC', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="비고"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const isEditing = mode === 'edit';
	const member = selectedMember ?? ({} as MemberData);

	return (
		<div className="p-4">
			<div className="grid grid-cols-12 gap-4">
				{/* 입력 필드 영역 */}
				<div className="grid grid-cols-12 col-span-12 gap-3">
					{/* 기관명 — 수급자 생성 폼과 동일한 필드 순서 */}
					<div className="flex flex-col col-span-12 gap-1">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">기관명 *</label>
						{isEditing && editedMember ? (
							<select
								value={String(editedMember.selectedANCD ?? editedMember.ANCD ?? '')}
								onChange={(e) => onFieldChange?.('selectedANCD', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">기관을 선택하세요</option>
								{institutions.map((inst) => (
									<option key={String(inst.ANCD)} value={String(inst.ANCD)}>
										{inst.ANNM}
									</option>
								))}
							</select>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{institutions.find((i) => String(i.ANCD) === String(member.ANCD))?.ANNM ||
									member.ANCD ||
									'-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-8">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자명 *</label>
						{isEditing && editedMember ? (
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={editedMember.P_NM || ''}
									onChange={(e) => onFieldChange?.('P_NM', e.target.value)}
									className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									placeholder="수급자명을 입력하세요"
								/>
								<span className="shrink-0 text-xs text-blue-900/55 whitespace-nowrap">
									No.{member.PNUM || '-'}
								</span>
							</div>
						) : (
							<span className="flex w-full items-baseline gap-2 border-b border-blue-200 py-1">
								<span>{member.P_NM || '-'}</span>
								<span className="text-xs text-blue-900/55 whitespace-nowrap">
									No.{member.PNUM || '-'}
								</span>
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-4">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">성별</label>
						{isEditing && editedMember ? (
							<select
								value={editedMember.P_SEX || ''}
								onChange={(e) => onFieldChange?.('P_SEX', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">선택</option>
								<option value="1">남자</option>
								<option value="2">여자</option>
							</select>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{member.P_SEX === '1' ? '남자' : member.P_SEX === '2' ? '여자' : '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">생년월일</label>
						{isEditing && editedMember ? (
							<input
								type="date"
								value={editedMember.P_BRDT || ''}
								onChange={(e) => onFieldChange?.('P_BRDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{toDateInputString(member.P_BRDT) || '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주민번호</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.P_NO || ''}
								onChange={(e) => onFieldChange?.('P_NO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="주민번호를 입력하세요"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.P_NO || '-'}</span>
						)}
					</div>

					{isEditing && editedMember && (
						<div className="flex flex-col col-span-12 gap-1 sm:flex-row sm:items-center sm:gap-3">
							<button
								type="button"
								onClick={() => onAddressSearch?.(false)}
								className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600"
							>
								주소 검색
							</button>
							<p className="text-sm text-blue-800">
								주소 입력란을 클릭하거나 주소 검색 버튼으로 주소를 수정할 수 있습니다.
							</p>
						</div>
					)}
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">우편번호</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.P_ZIP || ''}
								onChange={(e) => onFieldChange?.('P_ZIP', e.target.value)}
								onClick={() => onAddressSearch?.(false)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded cursor-pointer"
								readOnly
								title="주소 검색으로 수정할 수 있습니다."
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.P_ZIP || '-'}</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주소</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.P_ADDR || ''}
								onChange={(e) => onFieldChange?.('P_ADDR', e.target.value)}
								onClick={() => onAddressSearch?.(false)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded cursor-pointer"
								readOnly
								title="주소 검색으로 수정할 수 있습니다."
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.P_ADDR || '-'}</span>
						)}
					</div>

					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">연락처</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.P_HP ?? editedMember.P_TEL ?? ''}
								onChange={(e) => onEditedMemberPhoneChange?.(e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="연락처를 입력하세요"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{member.P_HP || member.P_TEL || '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">요양등급</label>
						{isEditing && editedMember ? (
							<select
								value={String(editedMember.P_GRD ?? '')}
								onChange={(e) => onFieldChange?.('P_GRD', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">선택</option>
								<option value="0">등급외</option>
								<option value="1">1등급</option>
								<option value="2">2등급</option>
								<option value="3">3등급</option>
								<option value="4">4등급</option>
								<option value="5">5등급</option>
								<option value="9">인지지원</option>
							</select>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{formatCareGradeLabel(member.P_GRD, '등급 없음')}
							</span>
						)}
					</div>

					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양인정번호</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.P_YYNO || ''}
								onChange={(e) => onFieldChange?.('P_YYNO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="장기요양인정번호"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.P_YYNO || '-'}</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">인정번호 발급일</label>
						{isEditing && editedMember ? (
							<input
								type="date"
								value={editedMember.P_YYDT || ''}
								onChange={(e) => onFieldChange?.('P_YYDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{toDateInputString(member.P_YYDT) || '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효시작일</label>
						{isEditing && editedMember ? (
							<input
								type="date"
								value={editedMember.P_YYSDT || ''}
								onChange={(e) => onFieldChange?.('P_YYSDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{toDateInputString(member.P_YYSDT) || '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효종료일</label>
						{isEditing && editedMember ? (
							<input
								type="date"
								value={editedMember.P_YYEDT || ''}
								onChange={(e) => onFieldChange?.('P_YYEDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{toDateInputString(member.P_YYEDT) || '-'}
							</span>
						)}
					</div>

					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">상태</label>
						{isEditing && editedMember ? (
							<select
								value={editedMember.P_ST || ''}
								onChange={(e) => onFieldChange?.('P_ST', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							>
								<option value="">선택</option>
								<option value="1">입소</option>
								<option value="9">퇴소</option>
							</select>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">계약일자</label>
						{isEditing && editedMember ? (
							<input
								type="date"
								value={editedMember.P_CTDT || ''}
								onChange={(e) => onFieldChange?.('P_CTDT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{toDateInputString(member.P_CTDT) || '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">입소일자 / 시간</label>
						{isEditing && editedMember ? (
							<div className="flex gap-2">
								<input
									type="date"
									value={editedMember.P_SDT || ''}
									onChange={(e) => onFieldChange?.('P_SDT', e.target.value)}
									className="w-full min-w-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
								<input
									type="time"
									value={editedMember.P_SDT_TM || ''}
									onChange={(e) => onFieldChange?.('P_SDT_TM', e.target.value)}
									className="w-[7.5rem] shrink-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
							</div>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{formatDateTimeDisplay(member.P_SDT, member.P_SDT_TM)}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">퇴소일자 / 시간</label>
						{isEditing && editedMember ? (
							<div className="flex gap-2">
								<input
									type="date"
									value={editedMember.P_EDT || ''}
									onChange={(e) => onFieldChange?.('P_EDT', e.target.value)}
									className="w-full min-w-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
								<input
									type="time"
									value={editedMember.P_EDT_TM || ''}
									onChange={(e) => onFieldChange?.('P_EDT_TM', e.target.value)}
									className="w-[7.5rem] shrink-0 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								/>
							</div>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{formatDateTimeDisplay(member.P_EDT, member.P_EDT_TM)}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">퇴소 사유</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.P_CINFO || ''}
								onChange={(e) => onFieldChange?.('P_CINFO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="퇴소 시 사유"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.P_CINFO || '-'}</span>
						)}
					</div>

					{/* <div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">담당의</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.DTNM || ''}
								onChange={(e) => handleFieldChange('DTNM', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="담당의 이름"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{selectedMember.DTNM || '-'}</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주치의 연락처</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.DTTEL || ''}
								onChange={(e) => handleFieldChange('DTTEL', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="주치의 연락처"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{selectedMember.DTTEL || '-'}</span>
						)}
					</div> */}
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">이용병원</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.HSPT || ''}
								onChange={(e) => onFieldChange?.('HSPT', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="이용병원"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.HSPT || '-'}</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">간호지시서번호</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.HCANUM || ''}
								onChange={(e) => onFieldChange?.('HCANUM', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="간호지시서번호"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.HCANUM || '-'}</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">간호지시서정보</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.HCAINFO || ''}
								onChange={(e) => onFieldChange?.('HCAINFO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="간호지시서정보"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.HCAINFO || '-'}</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">생활실</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.ROOM_NO ?? ''}
								onChange={(e) => onFieldChange?.('ROOM_NO', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="예: 101호"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{normalizeRoomNo(member.ROOM_NO) !== '' ? String(member.ROOM_NO) : '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">층수</label>
						{isEditing && editedMember ? (
							<input
								type="number"
								min="0"
								step="1"
								value={
									editedMember.P_FLOOR === '' ||
									editedMember.P_FLOOR === undefined ||
									editedMember.P_FLOOR === null
										? ''
										: String(editedMember.P_FLOOR)
								}
								onChange={(e) => {
									const value = e.target.value;
									if (
										value === '' ||
										(!isNaN(Number(value)) && Number(value) >= 0 && Number.isInteger(Number(value)))
									) {
										onFieldChange?.('P_FLOOR', value);
									}
								}}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="층수 (0 이상의 정수)"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">
								{member.P_FLOOR !== null && member.P_FLOOR !== undefined
									? member.P_FLOOR
									: '-'}
							</span>
						)}
					</div>
					<div className="flex flex-col col-span-12 gap-1">
						<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">비고</label>
						{isEditing && editedMember ? (
							<input
								type="text"
								value={editedMember.ETC || ''}
								onChange={(e) => onFieldChange?.('ETC', e.target.value)}
								className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
								placeholder="비고"
							/>
						) : (
							<span className="w-full border-b border-blue-200 py-1">{member.ETC || '-'}</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
