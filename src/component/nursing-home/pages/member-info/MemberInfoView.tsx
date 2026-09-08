"use client";

/**
 * @file 수급자정보 — UI 부분 컴포넌트 (MemberInfoView.tsx)
 *
 * @description
 * 요양원 수급자정보 기능의 UI 부분 컴포넌트입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoView
 */
import React from 'react';
import MemberInfoList from './MemberInfoList';
import MemberInfoDetailHeader from './MemberInfoDetailHeader';
import MemberInfoForm from './MemberInfoForm';
import MemberInfoAddressDetailModal from './MemberInfoAddressDetailModal';
import MemberInfoContractCard from './MemberInfoContractCard';
import MemberInfoGuardianCard from './MemberInfoGuardianCard';
import MemberInfoDiseaseCard from './MemberInfoDiseaseCard';
import { useMemberInfo } from './useMemberInfo';

export default function MemberInfoView() {
	const {
		selectedMember,
		loading,
		error,
		searchTerm,
		selectedStatus,
		selectedGrade,
		selectedFloor,
		isEditing,
		editedMember,
		isCreating,
		newMember,
		addressSearchDraft,
		institutions,
		availableFloors,
		noRoomValue,
		filteredMembers,
		currentMembers,
		currentPage,
		totalPages,
		handleMemberSelect,
		handleEditClick,
		handleSave,
		handleCancel,
		handleDelete,
		handleFieldChange,
		handleNewMemberFieldChange,
		handleNewMemberPhoneChange,
		handleEditedMemberPhoneChange,
		handleAddressDetailSave,
		handleAddressDetailCancel,
		handleCreateClick,
		handleCreateCancel,
		handleCreateSave,
		handlePageChange,
		handleStatusChange,
		handleGradeChange,
		handleFloorChange,
		handleSearchTermChange,
		handleSearch,
		handleAddressSearch,
		handlePrintRecipientCard,
		handlePrintAllMembers,
	} = useMemberInfo();

	return (
		<div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden text-black bg-white">
			<div className="mx-auto w-full max-w-[1200px] min-w-0 p-3 sm:p-4">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
					{/* 좌측: 수급자 목록 */}
					<MemberInfoList
						currentMembers={currentMembers}
						filteredCount={filteredMembers.length}
						selectedMember={selectedMember}
						loading={loading}
						error={error}
						currentPage={currentPage}
						totalPages={totalPages}
						selectedStatus={selectedStatus}
						selectedGrade={selectedGrade}
						selectedFloor={selectedFloor}
						searchTerm={searchTerm}
						availableFloors={availableFloors}
						noRoomValue={noRoomValue}
						onStatusChange={handleStatusChange}
						onGradeChange={handleGradeChange}
						onFloorChange={handleFloorChange}
						onSearchTermChange={handleSearchTermChange}
						onSearch={handleSearch}
						onMemberSelect={handleMemberSelect}
						onPageChange={handlePageChange}
						onCreateClick={handleCreateClick}
						onPrintAllMembers={() => void handlePrintAllMembers()}
					/>

					{/* 우측: 상세 영역 */}
					<section className="relative flex-1 min-w-0 space-y-4">
						{isCreating ? (
							<>
								{/* 수급자 생성 폼 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<MemberInfoDetailHeader
										mode="create"
										loading={loading}
										onSave={() => void handleCreateSave()}
										onCancel={handleCreateCancel}
									/>
									<MemberInfoForm
										mode="create"
										institutions={institutions}
										newMember={newMember}
										onNewMemberFieldChange={handleNewMemberFieldChange}
										onNewMemberPhoneChange={handleNewMemberPhoneChange}
										onAddressSearch={handleAddressSearch}
									/>
								</div>
							</>
						) : (
							<>
								<div
									className={`space-y-4 ${
										!selectedMember ? 'blur-sm select-none pointer-events-none opacity-70' : ''
									}`}
								>
									{selectedMember ? (
										<>
											{/* 개인정보 카드 */}
											<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
												<MemberInfoDetailHeader
													mode="detail"
													loading={loading}
													isEditing={isEditing}
													canPrintCard={!!selectedMember && !isEditing}
													onSave={() => void handleSave()}
													onCancel={handleCancel}
													onEditClick={handleEditClick}
													onDelete={() => void handleDelete()}
													onPrintRecipientCard={() => void handlePrintRecipientCard()}
												/>
												<MemberInfoForm
													mode={isEditing && editedMember ? 'edit' : 'view'}
													institutions={institutions}
													selectedMember={selectedMember}
													editedMember={editedMember}
													onFieldChange={handleFieldChange}
													onEditedMemberPhoneChange={handleEditedMemberPhoneChange}
													onAddressSearch={handleAddressSearch}
												/>
											</div>

											{/* 계약정보 / 보호자 정보는 조회 화면에만 표시 */}
											{!isEditing && (
												<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
													<MemberInfoContractCard selectedMember={selectedMember} />
													<MemberInfoGuardianCard selectedMember={selectedMember} />
												</div>
											)}

											{/* 질병내역 (F30030) — 읽기 전용 */}
											<MemberInfoDiseaseCard selectedMember={selectedMember} />
										</>
									) : (
										<>
											<MemberInfoForm mode="placeholder" />
											<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
												<MemberInfoContractCard placeholder />
												<MemberInfoGuardianCard placeholder />
											</div>
											<MemberInfoDiseaseCard placeholder />
										</>
									)}
								</div>
								{!selectedMember && (
									<div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/30 backdrop-blur-[1px]">
										<p className="text-center text-lg font-semibold text-blue-900 bg-white/95 px-8 py-5 rounded-lg border border-blue-300 shadow-md max-w-sm">
											수급자를 선택해주세요
										</p>
									</div>
								)}
							</>
						)}
					</section>
				</div>
			</div>
			{addressSearchDraft && (
				<MemberInfoAddressDetailModal
					zip={addressSearchDraft.zip}
					baseAddress={addressSearchDraft.baseAddress}
					onCancel={handleAddressDetailCancel}
					onSave={handleAddressDetailSave}
				/>
			)}
		</div>
    );
}
