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

interface CatheterData {
	MGDT: string; // 관리일자
	MGTM: string; // 관리시간
	URVOL: string; // 소변량
	CATH: string; // 도뇨관
	URPULSE: string; // 소변맥
	DISINF: string; // 소독
	ED_V: string;
	TOTURVOL: string; // 소변총량
	REMARKS: string; // 비고
	OBSERVER: string; // 관찰자
	MGNUM: string;
	[key: string]: any;
}

export default function IndwellingCatheter() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
	const [catheterList, setCatheterList] = useState<CatheterData[]>([]);
	const [loadingRecords, setLoadingRecords] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [listPage, setListPage] = useState(1);
	const listItemsPerPage = 10;

	// 폼 데이터
	const [formData, setFormData] = useState({
		beneficiary: '', // 수급자
		managementDate: '2025-12-11', // 관리일자
		managementTime: '05:00 - 06:00', // 관리시간
		totalUrineVolume: '', // 소변총량
		urineVolume: '', // 소변량
		catheter: true, // 도뇨관 (체크박스)
		urinePulse: false, // 소변맥 (체크박스)
		disinfection: false, // 소독 (체크박스)
		remarks: '', // 비고
		observer: '고경란' // 관찰자
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

	// 유치도뇨관리 목록 조회
	const fetchCatheterRecords = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setCatheterList([]);
			return;
		}

		setLoadingRecords(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/indwelling-catheter?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setCatheterList([]);
		} catch (err) {
			console.error('유치도뇨관리 목록 조회 오류:', err);
		} finally {
			setLoadingRecords(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchCatheterRecords(member.ANCD, member.PNUM);
	};

	// 기록 선택 함수
	const handleSelectRecord = (index: number, record: CatheterData) => {
		setSelectedRecordIndex(index);
		setIsEditMode(false);
		setFormData({
			beneficiary: selectedMember?.P_NM || '',
			managementDate: record.MGDT || '',
			managementTime: record.MGTM || '',
			totalUrineVolume: record.TOTURVOL || '',
			urineVolume: record.URVOL || '',
			catheter: record.CATH === '1' || record.CATH === 'Y',
			urinePulse: record.URPULSE === '1' || record.URPULSE === 'Y',
			disinfection: record.DISINF === '1' || record.DISINF === 'Y',
			remarks: record.REMARKS || '',
			observer: record.OBSERVER || ''
		});
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

	// 시간 형식 변환 함수
	const formatTimeDisplay = (timeStr: string) => {
		if (!timeStr) return '';
		return timeStr;
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.managementDate) {
			alert('관리일자를 입력해주세요.');
			return;
		}

		setLoadingRecords(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedRecordIndex !== null ? '/api/indwelling-catheter/update' : '/api/indwelling-catheter/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData
			// 	})
			// });

			alert(selectedRecordIndex !== null ? '유치도뇨관리가 수정되었습니다.' : '유치도뇨관리가 저장되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchCatheterRecords(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('유치도뇨관리 저장 오류:', err);
			alert('유치도뇨관리 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedRecordIndex === null) {
			alert('삭제할 유치도뇨관리를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingRecords(true);
		try {
			const recordToDelete = catheterList[selectedRecordIndex];
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/indwelling-catheter/${recordToDelete.MGNUM}`, {
			// 	method: 'DELETE'
			// });

			alert('유치도뇨관리가 삭제되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchCatheterRecords(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				managementTime: '',
				totalUrineVolume: '',
				urineVolume: '',
				catheter: true,
				urinePulse: false,
				disinfection: false,
				remarks: ''
			}));
			setSelectedRecordIndex(null);
		} catch (err) {
			console.error('유치도뇨관리 삭제 오류:', err);
			alert('유치도뇨관리 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 목록 페이지네이션
	const listTotalPages = Math.ceil(catheterList.length / listItemsPerPage);
	const listStartIndex = (listPage - 1) * listItemsPerPage;
	const listEndIndex = listStartIndex + listItemsPerPage;
	const currentRecords = catheterList.slice(listStartIndex, listEndIndex);

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

				{/* 중간 패널: 유치도뇨관리 목록 테이블 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="overflow-hidden border-b border-blue-200 bg-blue-50">
						<table className="w-full text-xs border-collapse">
							<thead>
								<tr>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">관리일자</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">관리시간</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">소변량</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">도뇨관</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">소변</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">소독</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900">ED_V</th>
								</tr>
							</thead>
						</table>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto">
							<table className="w-full text-xs border-collapse">
								<tbody>
									{loadingRecords ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : catheterList.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
												{selectedMember ? '유치도뇨관리 데이터가 없습니다' : '수급자를 선택해주세요'}
											</td>
										</tr>
									) : (
										currentRecords.map((record, localIndex) => {
											const globalIndex = listStartIndex + localIndex;
											return (
												<tr
													key={globalIndex}
													onClick={() => handleSelectRecord(globalIndex, record)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedRecordIndex === globalIndex ? 'bg-blue-100' : ''
													}`}
												>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">{formatDateDisplay(record.MGDT || '')}</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">{formatTimeDisplay(record.MGTM || '')}</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">{record.URVOL || '-'}</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">
														{record.CATH === '1' || record.CATH === 'Y' ? '✓' : '-'}
													</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">
														{record.URPULSE === '1' || record.URPULSE === 'Y' ? '✓' : '-'}
													</td>
													<td className="px-2 py-2 text-center text-blue-900 border-r border-blue-100">
														{record.DISINF === '1' || record.DISINF === 'Y' ? '✓' : '-'}
													</td>
													<td className="px-2 py-2 text-center text-blue-900">{record.ED_V || '-'}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
						{/* 목록 페이지네이션 */}
						{listTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setListPage(1)}
										disabled={listPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setListPage(prev => Math.max(1, prev - 1))}
										disabled={listPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, listTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(listTotalPages - 4, listPage - 2)) + i;
										if (pageNum > listTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setListPage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													listPage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setListPage(prev => Math.min(listTotalPages, prev + 1))}
										disabled={listPage >= listTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setListPage(listTotalPages)}
										disabled={listPage >= listTotalPages}
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
						{/* 수급자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
							<input
								type="text"
								value={formData.beneficiary}
								onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="수급자명"
							/>
						</div>

						{/* 관리일자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관리일자</label>
							<input
								type="text"
								value={formData.managementDate}
								readOnly
								className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50"
							/>
						</div>

						{/* 관리시간 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관리시간</label>
							<select
								value={formData.managementTime}
								onChange={(e) => setFormData(prev => ({ ...prev, managementTime: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								<option value="05:00 - 06:00">05:00 - 06:00</option>
								<option value="06:00 - 07:00">06:00 - 07:00</option>
								<option value="07:00 - 08:00">07:00 - 08:00</option>
								<option value="08:00 - 09:00">08:00 - 09:00</option>
								<option value="09:00 - 10:00">09:00 - 10:00</option>
								<option value="10:00 - 11:00">10:00 - 11:00</option>
								<option value="11:00 - 12:00">11:00 - 12:00</option>
								<option value="12:00 - 13:00">12:00 - 13:00</option>
								<option value="13:00 - 14:00">13:00 - 14:00</option>
								<option value="14:00 - 15:00">14:00 - 15:00</option>
								<option value="15:00 - 16:00">15:00 - 16:00</option>
								<option value="16:00 - 17:00">16:00 - 17:00</option>
								<option value="17:00 - 18:00">17:00 - 18:00</option>
								<option value="18:00 - 19:00">18:00 - 19:00</option>
								<option value="19:00 - 20:00">19:00 - 20:00</option>
								<option value="20:00 - 21:00">20:00 - 21:00</option>
								<option value="21:00 - 22:00">21:00 - 22:00</option>
								<option value="22:00 - 23:00">22:00 - 23:00</option>
								<option value="23:00 - 24:00">23:00 - 24:00</option>
							</select>
						</div>

						{/* 소변총량 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소변총량</label>
							<input
								type="text"
								value={formData.totalUrineVolume}
								onChange={(e) => setFormData(prev => ({ ...prev, totalUrineVolume: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="소변총량을 입력하세요"
							/>
						</div>

						{/* 소변량 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소변량</label>
							<input
								type="text"
								value={formData.urineVolume}
								onChange={(e) => setFormData(prev => ({ ...prev, urineVolume: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="소변량을 입력하세요"
							/>
						</div>

						{/* 도뇨관 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">도뇨관</label>
							<input
								type="checkbox"
								checked={formData.catheter}
								onChange={(e) => setFormData(prev => ({ ...prev, catheter: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 소변맥 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소변맥</label>
							<input
								type="checkbox"
								checked={formData.urinePulse}
								onChange={(e) => setFormData(prev => ({ ...prev, urinePulse: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 소독 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">소독</label>
							<input
								type="checkbox"
								checked={formData.disinfection}
								onChange={(e) => setFormData(prev => ({ ...prev, disinfection: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 비고 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">비고</label>
							<input
								type="text"
								value={formData.remarks}
								onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="비고를 입력하세요"
							/>
						</div>

						{/* 관찰자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관찰자</label>
							<input
								type="text"
								value={formData.observer}
								onChange={(e) => setFormData(prev => ({ ...prev, observer: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="관찰자를 입력하세요"
							/>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex justify-end gap-2 mt-6">
						<button
							onClick={handleSave}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							저장
						</button>
						<button
							onClick={handleDelete}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							삭제
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
