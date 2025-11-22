"use client";
import React, { useState, useEffect } from 'react';

interface MemberData {
  [key: string]: any;
}

export default function MemberInfoView() {
	const [members, setMembers] = useState<MemberData[]>([]);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		setError(null);
		
		try {
			// 이름 검색 파라미터 추가
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				setMembers(result.data);
				if (result.data.length > 0) {
					setSelectedMember(result.data[0]);
				} else {
					setSelectedMember(null);
				}
			} else {
				setError(result.error || '수급자 데이터 조회 실패');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '알 수 없는 오류');
		} finally {
			setLoading(false);
		}
	};

	const handleMemberSelect = (member: MemberData) => {
		setSelectedMember(member);
	};

	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 클라이언트 측 추가 필터링 (서버에서 이미 이름으로 필터링됨)
	const filteredMembers = members.filter(member => 
		(searchTerm === '' || 
		 member.P_NM?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		 member.P_TEL?.includes(searchTerm) ||
		 member.P_HP?.includes(searchTerm) ||
		 String(member.ANCD || '').includes(searchTerm) ||
		 String(member.PNUM || '').includes(searchTerm))
	);

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

	// 검색어가 변경될 때 페이지를 1로 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1200px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<div className="overflow-hidden bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-3 py-2 font-semibold text-blue-900 bg-blue-100 border-b border-blue-300">수급자 목록</div>
							{/* 상단 상태/검색 영역 (간단히 구성) */}
							<div className="px-3 py-2 space-y-2 border-b border-blue-100">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input 
									className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded" 
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											setCurrentPage(1);
											fetchMembers(searchTerm);
										}
									}}
								/>
								<button 
									className="w-full py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									onClick={() => {
										setCurrentPage(1);
										fetchMembers(searchTerm);
									}}
								>
									{loading ? '검색 중...' : '검색'}
								</button>
							</div>
							{/* 목록 테이블 */}
							<div className="max-h-[540px] overflow-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
										<tr>
											<th className="px-2 py-2 font-semibold text-left text-blue-900">이름</th>
											<th className="px-2 py-2 font-semibold text-left text-blue-900">등급</th>
											<th className="px-2 py-2 font-semibold text-left text-blue-900">상태</th>
										</tr>
									</thead>
									<tbody>
										{loading ? (
											<tr>
												<td colSpan={3} className="px-2 py-4 text-center text-blue-900/60">
													로딩 중...
												</td>
											</tr>
										) : error ? (
											<tr>
												<td colSpan={3} className="px-2 py-4 text-center text-red-600">
													{error}
												</td>
											</tr>
										) : filteredMembers.length === 0 ? (
											<tr>
												<td colSpan={3} className="px-2 py-4 text-center text-blue-900/60">
													수급자 데이터가 없습니다
												</td>
											</tr>
										) : (
											currentMembers.map((member, idx) => (
												<tr 
													key={`${member.ANCD}-${member.PNUM}-${idx}`} 
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM ? 'bg-blue-100' : ''
													}`}
													onClick={() => handleMemberSelect(member)}
												>
													<td className="px-2 py-2">{member.P_NM || member.ANCD || '이름 없음'}</td>
													<td className="px-2 py-2">{member.P_GRD || '등급 없음'}</td>
													<td className="px-2 py-2">
														{member.P_ST === '1' 
															? '입소' 
															: member.P_ST === '9' 
																? '퇴소' 
																: '-'}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
							
							{/* 페이지네이션 */}
							{totalPages > 1 && (
								<div className="p-3 border-t border-blue-100">
									<div className="flex items-center justify-center">
										{/* <div className="text-sm text-blue-900/80">
											총 {filteredMembers.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)}개 표시
										</div> */}
										<div className="flex gap-1">
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
								</div>
							)}
						</div>
					</aside>

					{/* 우측: 상세 영역 */}
					<section className="flex-1 space-y-4">
						{selectedMember ? (
							<>
								{/* 개인정보 카드 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h2 className="text-xl font-semibold text-blue-900">개인정보</h2>
										<div className="flex items-center gap-2">
											<button className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">저장</button>
										</div>
									</div>

									<div className="p-4">
										<div className="grid grid-cols-12 gap-4">
											{/* 사진 영역 */}
											<div className="col-span-12 md:col-span-3">
												<div className="flex items-center justify-center bg-white border border-blue-300 rounded-lg h-36 text-blue-900/70">사진</div>
												<div className="flex gap-2 mt-2">
													<button className="flex-1 px-2 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">촬영</button>
													<button className="flex-1 px-2 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">첨부</button>
												</div>
											</div>

											{/* 입력 필드 영역 */}
											<div className="grid grid-cols-12 col-span-12 gap-3 md:col-span-9">
												{/* 1행 */}
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자명</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.P_NM || '-'}
													</span>
												</div>
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자번호</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.PNUM || '-'}
													</span>
												</div>

												{/* 2행 */}
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주소</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.P_ADDR || '-'}
													</span>
												</div>
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">연락처</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.P_TEL || selectedMember.P_HP || '-'}
													</span>
												</div>

												{/* 3행 */}
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">성별</label>
													<span className="flex-1 border-b border-blue-200">
														{
															selectedMember.P_SEX === '1' 
																? '남자' 
																: selectedMember.P_SEX === '2' 
																	? '여자' 
																	: '-'
														}
													</span>
												</div>
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">등급</label>
													<span className="flex-1 border-b border-blue-200">
														{
															selectedMember.P_GRD 
																? selectedMember.P_GRD === '0' 
																	? '등급외' 
																	: `${selectedMember.P_GRD}등급`
																: '등급 없음'
														}
													</span>
												</div>

												{/* 4행 */}
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">입소일</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.P_SDT ? selectedMember.P_SDT.substring(0, 10) : '-'}
													</span>
												</div>
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">퇴소일</label>
													<span className="flex-1 border-b border-blue-200">
														{
															selectedMember.P_ST === '1' 
																? '입소중' 
																: selectedMember.P_ST === '9'
																	? '퇴소'
																	: selectedMember.P_EDT
																		? selectedMember.P_EDT.substring(0, 10)
																		: '-'
														}
													</span>
												</div>

												{/* 5행 */}
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">담당의</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.DTNM || '-'}
													</span>
												</div>
												<div className="flex items-center col-span-12 gap-2 md:col-span-6">
													<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주치의 연락처</label>
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.DTTEL || '-'}
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* 하단 2컬럼 카드: 계약정보 / 보호자 정보 */}
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									{/* 계약정보 */}
									<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
										<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
											<h3 className="text-lg font-semibold text-blue-900">계약정보 (최근건만 View)</h3>
											{/* <button className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">계약상세</button> */}
										</div>
										<div className="p-4 space-y-2 text-sm">
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">계약일자</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.P_CTDT ? selectedMember.P_CTDT.substring(0, 10) : '-'}
												</span>
											</div>
											{/* <div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">서비스 시작일</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.SVSDT ? selectedMember.SVSDT.substring(0, 10) : '-'}
												</span>
											</div> */}
											{/* <div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">서비스 종료일</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.SVEDT ? selectedMember.SVEDT.substring(0, 10) : '-'}
												</span>
											</div> */}
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">보험자부담율</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.INSPER || '-'}%
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">수급자부담율</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.USRPER || '-'}%
												</span>
											</div>
											{/* <div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">비급여 식대 1회</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.EAMT || '-'}
												</span>
											</div> */}
											{/* <div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">비급여 간식비 1회</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.ETAMT || '-'}
												</span>
											</div> */}
											{/* <div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">상급 병실료</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.ESAMT || '-'}
												</span>
											</div> */}
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">비고</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.ETC || '-'}
												</span>
											</div>
										</div>
									</div>

									{/* 보호자 정보 */}
									<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
										<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
											<h3 className="text-lg font-semibold text-blue-900">보호자 정보</h3>
											{/* <button className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">보호자 관리</button> */}
										</div>
										<div className="p-4 space-y-2 text-sm">
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">성명</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.BHNM || '-'}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">관계</span>
												<span className="flex-1 border-b border-blue-200">
													{
														selectedMember.BHREL === '10' 
															? '남편'
															: selectedMember.BHREL === '11'
																? '부인'
																: selectedMember.BHREL === '20'
																	? '아들'
																	: selectedMember.BHREL === '21'
																		? '딸'
																		: selectedMember.BHREL === '22'
																			? '며느리'
																			: selectedMember.BHREL === '23'
																				? '사위'
																				: selectedMember.BHREL === '31'
																					? '손주'
																					: !selectedMember.BHREL || selectedMember.BHREL === null || selectedMember.BHREL === ''
																						? (selectedMember.GUARDIAN_P_TEL || '-')
																						: (selectedMember.BHREL || selectedMember.BHETC || '-')
													}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">연락처</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.GUARDIAN_P_HP || '-'}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">주소</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.GUARDIAN_P_ADDR || '-'}
												</span>
											</div>
											<div className="flex items-center gap-2">
												{/* <span className="w-24 text-blue-900/80">이메일</span> */}
												<span className="w-24 text-blue-900/80">기타</span>
												<span className="flex-1 border-b border-blue-200">
													{selectedMember.P_EMAIL || '-'}
												</span>
											</div>
										</div>
									</div>
								</div>
							</>
						) : (
							<div className="flex items-center justify-center h-96">
								<div className="text-center text-gray-500">
									<p className="text-lg">수급자를 선택해주세요</p>
									<p className="mt-2 text-sm">왼쪽 목록에서 수급자를 클릭하면 상세 정보를 확인할 수 있습니다</p>
								</div>
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
    );
}