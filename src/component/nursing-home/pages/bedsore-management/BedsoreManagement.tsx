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

interface BedsoreData {
	OBSDT: string; // 관찰일자
	PART: string; // 부위
	SIZE: string; // 크기
	DEPTH: string; // 깊이
	COLOR: string; // 색깔
	PHOTO: string; // 사진
	TREATMENT: string; // 처치
	OBSNUM: string;
	[key: string]: any;
}

export default function BedsoreManagement() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [observationDates, setObservationDates] = useState<string[]>([]);
	const [observationList, setObservationList] = useState<BedsoreData[]>([]);
	const [loadingObservations, setLoadingObservations] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const dateItemsPerPage = 10;

	// 폼 데이터
	const [formData, setFormData] = useState({
		observationDate: '2025-12-11', // 관찰일자
		beneficiary: '', // 수급자
		part: '', // 부위
		size: '', // 크기
		depth: '', // 깊이
		color: '', // 색깔
		photo: true, // 사진 (체크박스)
		treatment: '' // 처치
	});

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 수급자 목록 조회
	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				setMemberList(result.data || []);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
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
		if (selectedStatus) {
			const memberStatus = String(member.P_ST || '').trim();
			if (selectedStatus === '입소' && memberStatus !== '1') {
				return false;
			}
			if (selectedStatus === '퇴소' && memberStatus !== '9') {
				return false;
			}
		}
		
		if (selectedGrade) {
			const memberGrade = String(member.P_GRD || '').trim();
			const selectedGradeTrimmed = String(selectedGrade).trim();
			if (memberGrade !== selectedGradeTrimmed) {
				return false;
			}
		}
		
		if (selectedFloor) {
			const memberFloor = String(member.P_FLOOR || '').trim();
			const selectedFloorTrimmed = String(selectedFloor).trim();
			if (memberFloor !== selectedFloorTrimmed) {
				return false;
			}
		}
		
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase().trim();
			if (!member.P_NM?.toLowerCase().includes(searchLower)) {
				return false;
			}
		}
		
		return true;
	}).sort((a, b) => {
		const nameA = (a.P_NM || '').trim();
		const nameB = (b.P_NM || '').trim();
		return nameA.localeCompare(nameB, 'ko');
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

	// 검색어 변경 시 실시간 검색 (디바운싱)
	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	// 관찰일자 목록 조회
	const fetchObservationDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setObservationDates([]);
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/bedsore-management/dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setObservationDates([]);
		} catch (err) {
			console.error('관찰일자 조회 오류:', err);
		} finally {
			setLoadingObservations(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchObservationDates(member.ANCD, member.PNUM);
	};

	// 관찰일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = observationDates[index];
		setFormData(prev => ({ ...prev, observationDate: selectedDate || '' }));
		setIsEditMode(false);
		// TODO: 선택한 날짜의 관찰 데이터 조회
		const selectedObservation = observationList[index];
		if (selectedObservation) {
			setFormData({
				observationDate: selectedObservation.OBSDT || '',
				beneficiary: selectedMember?.P_NM || '',
				part: selectedObservation.PART || '',
				size: selectedObservation.SIZE || '',
				depth: selectedObservation.DEPTH || '',
				color: selectedObservation.COLOR || '',
				photo: selectedObservation.PHOTO === '1' || selectedObservation.PHOTO === 'Y',
				treatment: selectedObservation.TREATMENT || ''
			});
		}
	};

	// 날짜 형식 변환 함수
	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		if (dateStr.includes('T')) {
			dateStr = dateStr.split('T')[0];
		}
		if (dateStr.includes('-') && dateStr.length >= 10) {
			return dateStr.substring(0, 10);
		}
		if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.observationDate) {
			alert('관찰일자를 입력해주세요.');
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedDateIndex !== null ? '/api/bedsore-management/update' : '/api/bedsore-management/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData
			// 	})
			// });

			alert(selectedDateIndex !== null ? '욕창관리가 수정되었습니다.' : '욕창관리가 저장되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchObservationDates(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('욕창관리 저장 오류:', err);
			alert('욕창관리 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingObservations(false);
		}
	};

	// 입력화면지움 함수
	const handleClearInput = () => {
		setFormData({
			observationDate: formData.observationDate,
			beneficiary: formData.beneficiary,
			part: '',
			size: '',
			depth: '',
			color: '',
			photo: true,
			treatment: ''
		});
		setIsEditMode(true);
		setSelectedDateIndex(null);
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 욕창관리를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingObservations(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/bedsore-management/${selectedDateIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('욕창관리가 삭제되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchObservationDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				part: '',
				size: '',
				depth: '',
				color: '',
				photo: true,
				treatment: ''
			}));
			setSelectedDateIndex(null);
		} catch (err) {
			console.error('욕창관리 삭제 오류:', err);
			alert('욕창관리 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingObservations(false);
		}
	};

	// 사진 등록 함수
	const handleRegisterPhoto = async () => {
		if (!selectedMember || !formData.observationDate) {
			alert('사진을 등록할 관찰일자를 선택해주세요.');
			return;
		}

		// TODO: 사진 업로드 기능 구현
		alert('사진 등록 기능은 준비 중입니다.');
	};

	// 관찰일자 목록 페이지네이션
	const dateTotalPages = Math.ceil(observationDates.length / dateItemsPerPage);
	const dateStartIndex = (datePage - 1) * dateItemsPerPage;
	const dateEndIndex = dateStartIndex + dateItemsPerPage;
	const currentDateItems = observationDates.slice(dateStartIndex, dateEndIndex);

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					{/* 필터 헤더 */}
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							{/* 이름 검색 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input 
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded" 
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							{/* 현황 필터 */}
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
							{/* 등급 필터 */}
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
							{/* 층수 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<select
									value={selectedFloor}
									onChange={(e) => setSelectedFloor(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">층수 전체</option>
									{Array.from(new Set(memberList.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== ''))).sort((a, b) => Number(a) - Number(b)).map(floor => (
										<option key={floor} value={String(floor)}>{floor}층</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* 수급자 목록 테이블 */}
					<div className="flex flex-col overflow-hidden bg-white border border-blue-300 rounded-lg">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">현황</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">등급</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">수급자 데이터가 없습니다</td>
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
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_GRD === '0' ? '등급외' : member.P_GRD ? `${member.P_GRD}등급` : '-'}
												</td>
												<td className="px-2 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{/* 페이지네이션 */}
						{totalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
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

				{/* 중간-왼쪽 패널: 관찰일자 목록 */}
				<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900">관찰일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingObservations ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
							) : observationDates.length === 0 ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">
									{selectedMember ? '관찰일자가 없습니다' : '수급자를 선택해주세요'}
								</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = dateStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
												selectedDateIndex === globalIndex ? 'bg-blue-100 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									);
								})
							)}
						</div>
						{/* 관찰일자 페이지네이션 */}
						{dateTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setDatePage(1)}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setDatePage(prev => Math.max(1, prev - 1))}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, dateTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(dateTotalPages - 4, datePage - 2)) + i;
										if (pageNum > dateTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setDatePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													datePage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setDatePage(prev => Math.min(dateTotalPages, prev + 1))}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setDatePage(dateTotalPages)}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 우측 패널: 입력 폼 */}
				<div className="flex-1 p-4 overflow-y-auto bg-white">
					<div className="space-y-4">
						{/* 첫 번째 행: 관찰일자, 수급자 */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관찰일자</label>
								<input
									type="text"
									value={formData.observationDate}
									readOnly
									className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
								<input
									type="text"
									value={formData.beneficiary}
									onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
									className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
									placeholder="수급자명"
								/>
							</div>
						</div>

						{/* 부위 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">부위</label>
							<input
								type="text"
								value={formData.part}
								onChange={(e) => setFormData(prev => ({ ...prev, part: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="부위를 입력하세요"
							/>
						</div>

						{/* 크기 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">크기</label>
							<input
								type="text"
								value={formData.size}
								onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="크기를 입력하세요"
							/>
							<span className="text-sm text-blue-900">cm</span>
						</div>

						{/* 깊이 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">깊이</label>
							<input
								type="text"
								value={formData.depth}
								onChange={(e) => setFormData(prev => ({ ...prev, depth: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="깊이를 입력하세요"
							/>
							<span className="text-sm text-blue-900">cm</span>
						</div>

						{/* 색깔, 사진 */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">색깔</label>
								<input
									type="text"
									value={formData.color}
									onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
									className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
									placeholder="색깔을 입력하세요"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">사진</label>
								<input
									type="checkbox"
									checked={formData.photo}
									onChange={(e) => setFormData(prev => ({ ...prev, photo: e.target.checked }))}
									className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
								/>
							</div>
						</div>

						{/* 처치 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">처치</label>
							<input
								type="text"
								value={formData.treatment}
								onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="처치를 입력하세요"
							/>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex justify-end gap-2 mt-6">
						<button
							onClick={handleSave}
							className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							저장
						</button>
						<button
							onClick={handleClearInput}
							className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							입력화면지움
						</button>
						<button
							onClick={handleDelete}
							className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							삭제
						</button>
						<button
							onClick={handleRegisterPhoto}
							className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							사진 등록
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
