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

export default function ConnectionRecord() {
	interface ConnectionData {
		ANCD: string;
		PNUM: string;
		MEDT: string;
		MDIC: string;
		MINFO: string;
		MENUM: string;
		INDT: string;
		ETC: string;
		INEMPNO: string;
		INEMPNM: string;
		[key: string]: any;
	}

	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [consultationDates, setConsultationDates] = useState<string[]>([]);
	const [connectionList, setConnectionList] = useState<ConnectionData[]>([]);
	const [loadingConnections, setLoadingConnections] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [consultationDatePage, setConsultationDatePage] = useState(1);
	const consultationDateItemsPerPage = 10;
	const [formData, setFormData] = useState({
		beneficiary: '',
		consultationSubstitute: '',
		consultationDateTime: '',
		consultant: '',
		consultationMethod: '',
		consultationContent: '',
		actionTaken: '',
		servicePlan: ''
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
			// 이름 검색 파라미터 추가
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
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
		// 상태 필터링
		if (selectedStatus) {
			if (selectedStatus === '입소' && member.P_ST !== '1') return false;
			if (selectedStatus === '퇴소' && member.P_ST !== '9') return false;
		}
		
		// 등급 필터링
		if (selectedGrade) {
			if (member.P_GRD !== selectedGrade) return false;
		}
		
		// 층수 필터링
		if (selectedFloor) {
			if (String(member.P_FLOOR || '') !== selectedFloor) return false;
		}
		
		// 이름 검색 필터링
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase();
			if (!member.P_NM?.toLowerCase().includes(searchLower)) return false;
		}
		
		return true;
	}).sort((a, b) => {
		// 이름 가나다순 정렬
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
		}, 300); // 300ms 후 검색 실행

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	// 날짜 생성 함수
	const handleCreateDate = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const formattedDate = `${year}-${month}-${day}`;
		
		// 상담일자 목록에 추가 (이미 있으면 추가하지 않음)
		if (!consultationDates.includes(formattedDate)) {
			setConsultationDates(prev => [formattedDate, ...prev]);
			setConsultationDatePage(1); // 새 날짜 생성 시 첫 페이지로 이동
		}
		
		// 새 연계 기록을 위한 폼 초기화 (수급자명은 유지)
		setFormData({
			beneficiary: selectedMember?.P_NM || '',
			consultationSubstitute: '',
			consultationDateTime: formattedDate,
			consultant: '',
			consultationMethod: '',
			consultationContent: '',
			actionTaken: '',
			servicePlan: ''
		});
		
		// 편집 모드로 전환
		setIsEditMode(true);
		// 새로 생성된 날짜를 선택
		const newIndex = consultationDates.includes(formattedDate) 
			? consultationDates.indexOf(formattedDate)
			: 0;
		setSelectedDateIndex(newIndex);
	};

	// 연계 기록 조회 (수급자 선택 시)
	const fetchConnections = async (ancd: string, pnum: string, member: MemberData | null) => {
		if (!ancd || !pnum) {
			setConnectionList([]);
			setConsultationDates([]);
			return;
		}

		setLoadingConnections(true);
		try {
			const url = `/api/f11040?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			console.log('[연계기록 조회] 요청 URL:', url);
			const response = await fetch(url);
			const result = await response.json();
			
			console.log('[연계기록 조회] 응답 결과:', result);
			
			if (result.success) {
				const connections = Array.isArray(result.data) ? result.data : [];
				console.log('[연계기록 조회] 조회된 연계기록 수:', connections.length);
				console.log('[연계기록 조회] 연계기록 데이터:', connections);
				
				setConnectionList(connections);
				
				// 연계일자 목록 생성 (MEDT 기준)
				const dates = connections.map((c: ConnectionData) => {
					const medt = c.MEDT;
					console.log('[연계기록 조회] MEDT 원본:', medt, '타입:', typeof medt);
					return medt ? String(medt) : '';
				}).filter((d: string) => d && d.trim() !== '');
				
				console.log('[연계기록 조회] 추출된 날짜 목록:', dates);
				
				// 날짜 형식 변환 (YYYYMMDD -> yyyy-mm-dd)
				const formattedDates = dates.map((date: string) => {
					if (!date) return '';
					const originalDate = date;
					// ISO 형식에서 T00:00:00.000Z 제거
					if (date.includes('T')) {
						date = date.split('T')[0];
					}
					// YYYYMMDD 형식 처리
					if (date.length === 8 && !date.includes('-') && !date.includes('년')) {
						const formatted = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
						console.log('[연계기록 조회] YYYYMMDD 변환:', originalDate, '->', formatted);
						return formatted;
					}
					// 이미 yyyy-mm-dd 형식이면 그대로 반환
					if (date.includes('-') && date.length >= 10) {
						const formatted = date.substring(0, 10);
						console.log('[연계기록 조회] yyyy-mm-dd 형식:', originalDate, '->', formatted);
						return formatted;
					}
					// YYYY년MM월DD일 형식을 yyyy-mm-dd로 변환
					if (date.includes('년') && date.includes('월') && date.includes('일')) {
						const yearMatch = date.match(/(\d{4})년/);
						const monthMatch = date.match(/(\d{1,2})월/);
						const dayMatch = date.match(/(\d{1,2})일/);
						if (yearMatch && monthMatch && dayMatch) {
							const year = yearMatch[1];
							const month = monthMatch[1].padStart(2, '0');
							const day = dayMatch[1].padStart(2, '0');
							const formatted = `${year}-${month}-${day}`;
							console.log('[연계기록 조회] YYYY년MM월DD일 변환:', originalDate, '->', formatted);
							return formatted;
						}
					}
					console.log('[연계기록 조회] 변환되지 않은 날짜:', originalDate);
					return date;
				}).filter((d: string) => d && d.trim() !== '');
				
				console.log('[연계기록 조회] 변환된 날짜 목록:', formattedDates);
				
				// 중복 제거 및 정렬
				const uniqueDates = Array.from(new Set(formattedDates)).filter((d): d is string => typeof d === 'string' && d.trim() !== '').sort().reverse();
				console.log('[연계기록 조회] 최종 날짜 목록:', uniqueDates);
				
				setConsultationDates(uniqueDates);
				
				// 첫 번째 연계 기록이 있으면 자동 선택
				if (connections.length > 0) {
					setSelectedDateIndex(0);
					handleSelectDate(0, connections[0], member);
					setIsEditMode(false);
				} else {
					setSelectedDateIndex(null);
					resetForm(member);
					setIsEditMode(false);
				}
			} else {
				console.error('[연계기록 조회] 조회 실패:', result.error);
				setConnectionList([]);
				setConsultationDates([]);
				setSelectedDateIndex(null);
				resetForm(member);
				setIsEditMode(false);
			}
		} catch (err) {
			console.error('[연계기록 조회] 오류 발생:', err);
			setConnectionList([]);
			setConsultationDates([]);
			setSelectedDateIndex(null);
			resetForm(member);
			setIsEditMode(false);
		} finally {
			setLoadingConnections(false);
		}
	};

	// 날짜 형식 변환 함수 (다양한 형식 -> yyyy-mm-dd)
	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		// ISO 형식에서 T00:00:00.000Z 제거
		if (dateStr.includes('T')) {
			dateStr = dateStr.split('T')[0];
		}
		// 이미 yyyy-mm-dd 형식이면 그대로 반환
		if (dateStr.includes('-') && dateStr.length >= 10) {
			return dateStr.substring(0, 10);
		}
		// YYYYMMDD 형식을 yyyy-mm-dd로 변환
		if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		// YYYY년MM월DD일 형식을 yyyy-mm-dd로 변환
		if (dateStr.includes('년') && dateStr.includes('월') && dateStr.includes('일')) {
			const yearMatch = dateStr.match(/(\d{4})년/);
			const monthMatch = dateStr.match(/(\d{1,2})월/);
			const dayMatch = dateStr.match(/(\d{1,2})일/);
			if (yearMatch && monthMatch && dayMatch) {
				const year = yearMatch[1];
				const month = monthMatch[1].padStart(2, '0');
				const day = dayMatch[1].padStart(2, '0');
				return `${year}-${month}-${day}`;
			}
		}
		// YYYY.MM.DD 형식을 yyyy-mm-dd로 변환
		const parts = dateStr.split('.');
		if (parts.length === 3) {
			return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
		}
		return dateStr;
	};

	// 날짜 선택 함수
	const handleSelectDate = (index: number, connection?: ConnectionData, member: MemberData | null = null) => {
		setSelectedDateIndex(index);
		setIsEditMode(false); // 날짜 선택 시 편집 모드 해제
		
		// 해당 날짜의 연계 기록 찾기
		const selectedConnection = connection || connectionList[index];
		
		// member 파라미터가 없으면 selectedMember 사용 (수동 선택 시)
		const currentMember = member || selectedMember;
		
		if (selectedConnection) {
			// 날짜 형식 변환 (YYYYMMDD -> yyyy-mm-dd)
			const formatDate = (dateStr: string) => {
				if (!dateStr) return '';
				// ISO 형식에서 T00:00:00.000Z 제거
				if (dateStr.includes('T')) {
					dateStr = dateStr.split('T')[0];
				}
				// 이미 yyyy-mm-dd 형식이면 그대로 반환
				if (dateStr.includes('-') && dateStr.length >= 10) {
					return dateStr.substring(0, 10);
				}
				// YYYYMMDD 형식 처리
				if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
					return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
				}
				// YYYY년MM월DD일 형식을 yyyy-mm-dd로 변환
				if (dateStr.includes('년') && dateStr.includes('월') && dateStr.includes('일')) {
					const yearMatch = dateStr.match(/(\d{4})년/);
					const monthMatch = dateStr.match(/(\d{1,2})월/);
					const dayMatch = dateStr.match(/(\d{1,2})일/);
					if (yearMatch && monthMatch && dayMatch) {
						const year = yearMatch[1];
						const month = monthMatch[1].padStart(2, '0');
						const day = dayMatch[1].padStart(2, '0');
						return `${year}-${month}-${day}`;
					}
				}
				return dateStr;
			};

			const connectionDate = formatDate(selectedConnection.MEDT || '');

			setFormData({
				beneficiary: currentMember?.P_NM || '',
				consultationSubstitute: '',
				consultationDateTime: connectionDate,
				consultant: '',
				consultationMethod: '',
				consultationContent: selectedConnection.MINFO || '',
				actionTaken: '',
				servicePlan: ''
			});
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		// 해당 수급자의 연계 기록 조회 (member를 직접 전달)
		fetchConnections(member.ANCD, member.PNUM, member);
	};

	// 폼 초기화
	const resetForm = (member: MemberData | null = null) => {
		const currentMember = member || selectedMember;
		setFormData({
			beneficiary: currentMember?.P_NM || '',
			consultationSubstitute: '',
			consultationDateTime: '',
			consultant: '',
			consultationMethod: '',
			consultationContent: '',
			actionTaken: '',
			servicePlan: ''
		});
	};

	// 폼 데이터 변경 함수
	const handleFormChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 수정 함수
	const handleModify = () => {
		// 수정 모드 진입 시 연계일자가 없으면 오늘 날짜로 설정
		if (!formData.consultationDateTime) {
			const today = new Date();
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			const formattedDate = `${year}-${month}-${day}`;
			setFormData(prev => ({ ...prev, consultationDateTime: formattedDate }));
		}
		setIsEditMode(true);
	};

	// 저장 함수
	const handleSave = () => {
		// 저장 로직
		console.log('저장:', formData);
		setIsEditMode(false);
		// TODO: API 호출하여 데이터 저장
	};

	// 취소 함수
	const handleCancel = () => {
		setIsEditMode(false);
		
		// 현재 선택된 날짜가 오늘 날짜인지 확인
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const formattedToday = `${year}-${month}-${day}`;
		
		// 현재 선택된 날짜
		const currentDate = selectedDateIndex !== null ? consultationDates[selectedDateIndex] : null;
		
		// 현재 선택된 날짜가 오늘 날짜이고, 해당 날짜의 연계 기록이 없으면 제거
		if (currentDate === formattedToday && selectedDateIndex !== null) {
			// 연계 기록이 없으면 (새로 생성된 날짜) 목록에서 제거
			setConsultationDates(prev => prev.filter((_, index) => index !== selectedDateIndex));
			setSelectedDateIndex(null);
			// 폼 초기화
			resetForm();
			return;
		}
		
		// 수정 전 데이터로 복원
		if (selectedDateIndex !== null && connectionList[selectedDateIndex]) {
			handleSelectDate(selectedDateIndex, connectionList[selectedDateIndex], selectedMember);
		} else if (selectedDateIndex !== null && consultationDates[selectedDateIndex]) {
			// 연계 기록이 없으면 폼만 초기화
			resetForm(selectedMember);
		}
	};

	// 출력 함수
	const handlePrint = () => {
		// 출력 로직
		console.log('출력:', formData);
	};

	// 삭제 함수
	const handleDelete = () => {
		// 삭제 로직
		console.log('삭제');
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널 (약 25%) */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					{/* 필터 헤더 */}
					<div className="mb-3">
						<h3 className="text-sm font-semibold text-blue-900 mb-2">수급자 목록</h3>
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
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-900"
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
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-900"
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
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-900"
								>
									<option value="">층수 전체</option>
									{/* 동적으로 층수 목록 생성 */}
									{Array.from(new Set(memberList.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== ''))).sort((a, b) => Number(a) - Number(b)).map(floor => (
										<option key={floor} value={String(floor)}>{floor}층</option>
									))}
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

				{/* 우측 패널 (약 75%) */}
				<div className="flex-1 flex bg-white">
					{/* 좌측: 상담 일자 (세로 박스) */}
					<div className="w-1/4 border-r border-blue-200 px-4 py-3 bg-blue-50 flex flex-col">
						<div className="flex items-center justify-between mb-2">
							<label className="text-sm font-medium text-blue-900">상담 일자</label>
							<button
								onClick={handleCreateDate}
								className="px-3 py-1.5 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								생성
							</button>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="overflow-y-auto">
								{loadingConnections ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
								) : consultationDates.length === 0 ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">
										{selectedMember ? '연계 기록이 없습니다' : '수급자를 선택해주세요'}
									</div>
								) : (
									(() => {
										// 페이지네이션 계산
										const totalDatePages = Math.ceil(consultationDates.length / consultationDateItemsPerPage);
										const dateStartIndex = (consultationDatePage - 1) * consultationDateItemsPerPage;
										const dateEndIndex = dateStartIndex + consultationDateItemsPerPage;
										const currentDateItems = consultationDates.slice(dateStartIndex, dateEndIndex);
										
										return currentDateItems.map((date, localIndex) => {
											const globalIndex = dateStartIndex + localIndex;
											return (
												<div
													key={globalIndex}
													onClick={() => handleSelectDate(globalIndex)}
													className={`px-2 py-1.5 text-base cursor-pointer hover:bg-blue-100 rounded ${
														selectedDateIndex === globalIndex ? 'bg-blue-200 font-semibold' : ''
													}`}
												>
													{globalIndex + 1}. {formatDateDisplay(date)}
												</div>
											);
										});
									})()
								)}
							</div>
							{/* 상담일자 페이지네이션 */}
							{consultationDates.length > consultationDateItemsPerPage && (
								<div className="p-2 mt-2">
									<div className="flex items-center justify-center gap-1">
										<button
											onClick={() => setConsultationDatePage(1)}
											disabled={consultationDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;&lt;
										</button>
										<button
											onClick={() => setConsultationDatePage(prev => Math.max(1, prev - 1))}
											disabled={consultationDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;
										</button>
										
										{(() => {
											const totalDatePages = Math.ceil(consultationDates.length / consultationDateItemsPerPage);
											const pagesToShow = Math.min(5, totalDatePages);
											const startPage = Math.max(1, Math.min(totalDatePages - 4, consultationDatePage - 2));
											
											return Array.from({ length: pagesToShow }, (_, i) => {
												const pageNum = startPage + i;
												if (pageNum > totalDatePages) return null;
												return (
													<button
														key={pageNum}
														onClick={() => setConsultationDatePage(pageNum)}
														className={`px-2 py-1 text-xs border rounded ${
															consultationDatePage === pageNum
																? 'bg-blue-500 text-white border-blue-500'
																: 'border-blue-300 hover:bg-blue-50'
														}`}
													>
														{pageNum}
													</button>
												);
											}).filter(Boolean);
										})()}
										
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(consultationDates.length / consultationDateItemsPerPage);
												setConsultationDatePage(prev => Math.min(totalDatePages, prev + 1));
											}}
											disabled={consultationDatePage >= Math.ceil(consultationDates.length / consultationDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;
										</button>
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(consultationDates.length / consultationDateItemsPerPage);
												setConsultationDatePage(totalDatePages);
											}}
											disabled={consultationDatePage >= Math.ceil(consultationDates.length / consultationDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* 우측: 상담 상세 폼 */}
					<div className="flex-1 overflow-y-auto p-4">
						{/* 첫 번째 행 */}
						<div className="mb-4 flex items-center gap-4 flex-wrap">
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">수급자</label>
								<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
									{formData.beneficiary || '-'}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">연계일자</label>
								{isEditMode ? (
									<input
										type="date"
										value={formData.consultationDateTime}
										onChange={(e) => handleFormChange('consultationDateTime', e.target.value)}
										className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.consultationDateTime || '-'}
									</span>
								)}
							</div>
							<div className="ml-auto flex items-center gap-2">
								<button
									onClick={handlePrint}
									className="px-4 py-1.5 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
								>
									출력
								</button>
							</div>
						</div>
						

						{/* 심신 기능 상태 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">심신 기능 상태</label>
							{isEditMode ? (
								<textarea
									value={formData.consultationContent}
									onChange={(e) => handleFormChange('consultationContent', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="심신 기능 상태를 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
									{formData.consultationContent || '-'}
								</div>
							)}
						</div>

						{/* 제공한 급여 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">제공한 급여</label>
							{isEditMode ? (
								<textarea
									value={formData.actionTaken}
									onChange={(e) => handleFormChange('actionTaken', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="제공한 급여를 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
									{formData.actionTaken || '-'}
								</div>
							)}
						</div>

						{/* 서비스 이용계획 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">서비스 이용계획</label>
							{isEditMode ? (
								<textarea
									value={formData.servicePlan}
									onChange={(e) => handleFormChange('servicePlan', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="서비스 이용계획을 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
									{formData.servicePlan || '-'}
								</div>
							)}
						</div>

						{/* 하단 버튼 영역 */}
						<div className="flex justify-end gap-2 mt-4">
							{!isEditMode ? (
								<>
									<button
										onClick={handleModify}
										className="px-4 py-1.5 text-xs border border-green-400 rounded bg-green-200 hover:bg-green-300 text-green-900 font-medium"
									>
										수정
									</button>
									<button
										onClick={handleDelete}
										className="px-4 py-1.5 text-xs border border-orange-400 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-medium"
									>
										삭제
									</button>
								</>
							) : (
								<>
									<button
										onClick={handleCancel}
										className="px-4 py-1.5 text-xs border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
									>
										취소
									</button>
									<button
										onClick={handleSave}
										className="px-4 py-1.5 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
									>
										저장
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

