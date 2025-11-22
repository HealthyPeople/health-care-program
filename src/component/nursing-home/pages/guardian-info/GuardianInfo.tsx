"use client";
import React, { useState, useEffect } from 'react';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	[key: string]: any;
}

interface GuardianData {
	ANCD: string;
	PNUM: string;
	BHNUM: string;
	BHNM: string;
	BHREL: string;
	BHETC: string;
	BHJB: string;
	P_ZIP: string;
	P_ADDR: string;
	P_TEL: string;
	P_HP: string;
	P_EMAIL: string;
	CONGU: string;
	SVSDT?: string;
	SVEDT?: string;
	[key: string]: any;
}

export default function GuardianInfo() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedGuardian, setSelectedGuardian] = useState<GuardianData | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [guardianList, setGuardianList] = useState<GuardianData[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingGuardians, setLoadingGuardians] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const [formData, setFormData] = useState({
		recipientName: '',
		guardianName: '',
		relationship: '',
		isMainGuardian: false,
		relationshipDetails: '',
		phoneNumber: '',
		address: '',
		hospitalUsed: '',
		attendingPhysician: '',
		hospitalAddress: ''
	});

	// 수급자 목록 조회
	const fetchMembers = async () => {
		setLoading(true);
		try {
			const response = await fetch('/api/f10010');
			const result = await response.json();
			
			if (result.success) {
				setMemberList(result.data);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	// 보호자 목록 조회 (수급자 선택 시)
	const fetchGuardians = async (ancd: string, pnum: string, autoSelectFirst: boolean = false) => {
		if (!ancd || !pnum) {
			setGuardianList([]);
			return;
		}

		setLoadingGuardians(true);
		try {
			const url = `/api/f10020?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				// 빈 배열이거나 null/undefined인 경우 빈 배열로 설정
				const guardianData = Array.isArray(result.data) ? result.data : [];
				console.log('보호자 목록 조회 결과:', { ancd, pnum, count: guardianData.length, data: guardianData });
				setGuardianList(guardianData);
				
				// 첫 번째 보호자 자동 선택
				if (autoSelectFirst && guardianData.length > 0) {
					handleSelectGuardian(guardianData[0]);
				} else if (guardianData.length === 0) {
					// 보호자가 없으면 선택 해제 및 폼 초기화
					setSelectedGuardian(null);
					resetForm();
				}
			} else {
				console.error('보호자 목록 조회 실패:', result.error);
				setGuardianList([]);
				setSelectedGuardian(null);
				resetForm();
			}
		} catch (err) {
			console.error('보호자 목록 조회 오류:', err);
			setGuardianList([]);
			setSelectedGuardian(null);
			resetForm();
		} finally {
			setLoadingGuardians(false);
		}
	};

	// 수급자 선택 시 보호자 목록 조회
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, recipientName: member.P_NM || '' }));
		// 보호자 선택 초기화
		setSelectedGuardian(null);
		// 보호자 목록 조회 시 첫 번째 보호자 자동 선택
		fetchGuardians(member.ANCD, member.PNUM, true);
	};

	// 보호자 선택 시 폼에 데이터 로드
	const handleSelectGuardian = (guardian: GuardianData) => {
		setSelectedGuardian(guardian);
		
		// 관계 코드를 한글로 변환
		const relationshipMap: { [key: string]: string } = {
			'10': '남편',
			'11': '부인',
			'20': '아들',
			'21': '딸',
			'22': '며느리',
			'23': '사위',
			'31': '손주'
		};

		const relationshipText = guardian.BHREL 
			? (relationshipMap[guardian.BHREL] || guardian.BHREL)
			: (guardian.P_TEL || '');

		setFormData({
			recipientName: selectedMember?.P_NM || '',
			guardianName: guardian.BHNM || '',
			relationship: relationshipText,
			isMainGuardian: guardian.BHJB === '1',
			relationshipDetails: guardian.P_EMAIL || '없음',
			phoneNumber: guardian.P_HP || '',
			address: guardian.P_ADDR || '',
			hospitalUsed: selectedMember?.HSPT || '',
			attendingPhysician: selectedMember?.DTNM || '',
			hospitalAddress: ''
		});
	};

	// 폼 초기화
	const resetForm = () => {
		setFormData({
			recipientName: selectedMember?.P_NM || '',
			guardianName: '',
			relationship: '',
			isMainGuardian: false,
			relationshipDetails: '',
			phoneNumber: '',
			address: '',
			hospitalUsed: selectedMember?.HSPT || '',
			attendingPhysician: selectedMember?.DTNM || '',
			hospitalAddress: ''
		});
	};

	// 나이 계산 함수
	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '-';
		try {
			const year = parseInt(birthDate.substring(0, 4));
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return '-';
		}
	};

	// 필터링된 수급자 목록
	const filteredMembers = memberList.filter((member) => {
		if (!selectedStatus) return true;
		if (selectedStatus === '입소') return member.P_ST === '1';
		if (selectedStatus === '퇴소') return member.P_ST === '9';
		return true;
	});

	// 페이지네이션 계산
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

	// 상태 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus]);

	const handleFormChange = (field: string, value: string | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 (CounselingRecord 스타일) */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					{/* 현황선택 헤더 */}
					<div className="">
						<div className="flex gap-2">
							<div className="mb-3">
								<h3 className="text-sm font-semibold text-blue-900">수급자 목록</h3>
							</div>
							<div className="h-6 flex-1 bg-white border border-blue-300 rounded flex items-center justify-center">
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full h-full text-xs text-blue-900 bg-transparent border-none outline-none px-2 cursor-pointer"
								>
									<option value="">현황 전체</option>
									<option value="입소">입소</option>
									<option value="퇴소">퇴소</option>
								</select>
							</div>
						</div>
					</div>

					{/* 수급자 목록 테이블 - 라운드 박스 */}
					<div className="border border-blue-300 rounded-lg overflow-hidden bg-white flex flex-col">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">현황</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">성별</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">등급</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-blue-900/60">수급자 데이터가 없습니다</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM ? 'bg-blue-100' : ''
												}`}
											>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="text-center px-2 py-1.5 border-r border-blue-100">
													{member.P_GRD === '0' ? '등급외' : member.P_GRD ? `${member.P_GRD}등급` : '-'}
												</td>
												<td className="text-center px-2 py-1.5">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{/* 페이지네이션 */}
						{totalPages > 1 && (
							<div className="p-2 border-t border-blue-200 bg-white">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => handlePageChange(1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
										return (
											<button
												key={pageNum}
												onClick={() => handlePageChange(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													currentPage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									})}
									
									<button
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => handlePageChange(totalPages)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 중간 패널: 보호자 목록 */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					<div className="mb-3">
						<h3 className="text-sm font-semibold text-blue-900">보호자 목록</h3>
					</div>
					<div className="border border-blue-300 rounded-lg overflow-hidden bg-white">
						<div className="overflow-y-auto h-full">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">보호자명</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold">계약기간</th>
									</tr>
								</thead>
								<tbody>
									{loadingGuardians ? (
										<tr>
											<td colSpan={3} className="text-center px-2 py-4 text-blue-900/60">로딩 중...</td>
										</tr>
									) : guardianList.length === 0 ? (
										<tr>
											<td colSpan={3} className="text-center px-2 py-4 text-blue-900/60">
												{selectedMember ? '보호자 없음' : '수급자를 선택해주세요'}
											</td>
										</tr>
									) : (
										guardianList.map((guardian, index) => {
											// 계약기간: F10110의 SVSDT(시작일)와 SVEDT(종료일) 사용
											const formatDate = (dateStr: string) => {
												if (!dateStr) return '-';
												try {
													return dateStr.substring(0, 10).replace(/-/g, '.');
												} catch {
													return dateStr;
												}
											};
											
											const startDate = formatDate(guardian.SVSDT || '');
											const endDate = formatDate(guardian.SVEDT || '');
											const contractPeriod = startDate !== '-' && endDate !== '-'
												? `${startDate} ~ ${endDate}`
												: startDate !== '-'
													? `${startDate} ~ -`
													: '-';
											
											return (
												<tr
													key={`${guardian.ANCD}-${guardian.PNUM}-${guardian.BHNUM || index}`}
													onClick={() => handleSelectGuardian(guardian)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedGuardian?.ANCD === guardian.ANCD && 
														selectedGuardian?.PNUM === guardian.PNUM &&
														selectedGuardian?.BHNUM === guardian.BHNUM
															? 'bg-blue-100 border-2 border-blue-400' : ''
													}`}
												>
													<td className="text-center px-2 py-1.5 border-r border-blue-100">{index + 1}</td>
													<td className="text-center px-2 py-1.5 border-r border-blue-100">{guardian.BHNM || '-'}</td>
													<td className="text-center px-2 py-1.5">
														{contractPeriod}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 우측 패널: 보호자 정보 */}
				<div className="flex-1 overflow-y-auto p-4 bg-white">
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-blue-900 mb-4">보호자 정보</h2>
						
						{/* 수급자명 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">수급자명</label>
							<input
								type="text"
								value={formData.recipientName}
								onChange={(e) => handleFormChange('recipientName', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="border-t border-blue-200 my-4"></div>

						{/* 보호자명 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">보호자명</label>
							<input
								type="text"
								value={formData.guardianName}
								onChange={(e) => handleFormChange('guardianName', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 관계 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">관계</label>
							<div className="flex items-center gap-2 flex-1">
								<input
									type="text"
									value={formData.relationship}
									onChange={(e) => handleFormChange('relationship', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								/>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={formData.isMainGuardian}
										onChange={(e) => handleFormChange('isMainGuardian', e.target.checked)}
										className="w-4 h-4 border-blue-300 rounded"
									/>
									<span className="text-sm text-blue-900">주 보호자</span>
								</label>
							</div>
						</div>

						{/* 관계내용 */}
						<div className="mb-4">
							{/* <label className="block text-sm text-blue-900 font-medium mb-2">관계내용</label> */}
							<label className="block text-sm text-blue-900 font-medium mb-2">기타사항</label>
							<textarea
								value={formData.relationshipDetails}
								onChange={(e) => handleFormChange('relationshipDetails', e.target.value)}
								className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								rows={3}
							/>
						</div>

						{/* 전화번호 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">전화번호</label>
							<input
								type="text"
								value={formData.phoneNumber}
								onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								placeholder="예) 010-0000-0000"
							/>
						</div>

						{/* 주소 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">주소</label>
							<input
								type="text"
								value={formData.address}
								onChange={(e) => handleFormChange('address', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						<div className="border-t border-blue-200 my-4"></div>

						{/* 이용병원 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">이용병원</label>
							<input
								type="text"
								value={formData.hospitalUsed}
								onChange={(e) => handleFormChange('hospitalUsed', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 주치의 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">주치의</label>
							<input
								type="text"
								value={formData.attendingPhysician}
								onChange={(e) => handleFormChange('attendingPhysician', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div>

						{/* 병원주소 */}
						{/* <div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">병원주소</label>
							<input
								type="text"
								value={formData.hospitalAddress}
								onChange={(e) => handleFormChange('hospitalAddress', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
							/>
						</div> */}
					</div>
				</div>
			</div>
		</div>
	);
}
