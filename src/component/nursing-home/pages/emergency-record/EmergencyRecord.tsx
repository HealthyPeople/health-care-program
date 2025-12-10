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

export default function EmergencyRecord() {
	interface EmergencyData {
		ANCD: string;
		PNUM: string;
		EMDT: string; // 응급일자
		EMSIT: string; // 응급상황
		EMACT: string; // 조치사항
		EMHND: string; // 담당자
		EMNUM: string;
		INDT: string;
		ETC: string;
		INEMPNO: string;
		INEMPNM: string;
		[key: string]: any;
	}

	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [emergencyDates, setEmergencyDates] = useState<string[]>([]);
	const [emergencyList, setEmergencyList] = useState<EmergencyData[]>([]);
	const [loadingEmergencies, setLoadingEmergencies] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [emergencyDatePage, setEmergencyDatePage] = useState(1);
	const emergencyDateItemsPerPage = 10;
	const [formData, setFormData] = useState({
		beneficiary: '',
		emergencyDate: '', // EMDT (응급일자)
		emergencySituation: '', // EMSIT (응급상황)
		actionTaken: '', // EMACT (조치사항)
		handler: '' // EMHND (담당자)
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

	// 날짜 생성 함수
	const handleCreateDate = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const formattedDate = `${year}-${month}-${day}`;
		
		if (!emergencyDates.includes(formattedDate)) {
			setEmergencyDates(prev => [formattedDate, ...prev]);
			setEmergencyDatePage(1);
		}
		
		setFormData({
			beneficiary: selectedMember?.P_NM || '',
			emergencyDate: formattedDate,
			emergencySituation: '',
			actionTaken: '',
			handler: ''
		});
		
		setIsEditMode(true);
		const newIndex = emergencyDates.includes(formattedDate) 
			? emergencyDates.indexOf(formattedDate)
			: 0;
		setSelectedDateIndex(newIndex);
	};

	// 응급 기록 조회 (수급자 선택 시)
	const fetchEmergencies = async (ancd: string, pnum: string, member: MemberData | null) => {
		if (!ancd || !pnum) {
			setEmergencyList([]);
			setEmergencyDates([]);
			return;
		}

		setLoadingEmergencies(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/f11070?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setEmergencyList([]);
			setEmergencyDates([]);
			setSelectedDateIndex(null);
			resetForm(member);
			setIsEditMode(false);
		} catch (err) {
			console.error('[응급 기록 조회] 오류 발생:', err);
			setEmergencyList([]);
			setEmergencyDates([]);
			setSelectedDateIndex(null);
			resetForm(member);
			setIsEditMode(false);
		} finally {
			setLoadingEmergencies(false);
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

	// 날짜 선택 함수
	const handleSelectDate = (index: number, emergency?: EmergencyData, member: MemberData | null = null) => {
		setSelectedDateIndex(index);
		setIsEditMode(false);
		
		const selectedEmergency = emergency || emergencyList[index];
		const currentMember = member || selectedMember;
		
		if (selectedEmergency) {
			const formatDate = (dateStr: string) => {
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

			const emergencyDate = formatDate(selectedEmergency.EMDT || '');

			setFormData({
				beneficiary: currentMember?.P_NM || '',
				emergencyDate: emergencyDate,
				emergencySituation: selectedEmergency.EMSIT || '',
				actionTaken: selectedEmergency.EMACT || '',
				handler: selectedEmergency.EMHND || ''
			});
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchEmergencies(member.ANCD, member.PNUM, member);
	};

	// 폼 초기화
	const resetForm = (member: MemberData | null = null) => {
		const currentMember = member || selectedMember;
		setFormData({
			beneficiary: currentMember?.P_NM || '',
			emergencyDate: '',
			emergencySituation: '',
			actionTaken: '',
			handler: ''
		});
	};

	// 폼 데이터 변경 함수
	const handleFormChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 수정 함수
	const handleModify = () => {
		if (!formData.emergencyDate) {
			const today = new Date();
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			const formattedDate = `${year}-${month}-${day}`;
			setFormData(prev => ({ ...prev, emergencyDate: formattedDate }));
		}
		setIsEditMode(true);
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.emergencyDate) {
			alert('응급일자를 입력해주세요.');
			return;
		}

		setLoadingEmergencies(true);
		try {
			const now = new Date();
			const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

			const formatDateForDB = (dateStr: string): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					if (dateStr.includes('-')) {
						return dateStr.replace(/-/g, '');
					}
					return dateStr;
				} catch (err) {
					return null;
				}
			};

			const existingEmergency = selectedDateIndex !== null && emergencyList[selectedDateIndex] 
				? emergencyList[selectedDateIndex] 
				: null;

			// TODO: 실제 API 엔드포인트로 변경 필요
			// const query = existingEmergency && existingEmergency.EMNUM
			// 	? `UPDATE [돌봄시설DB].[dbo].[F11070] SET ...`
			// 	: `INSERT INTO [돌봄시설DB].[dbo].[F11070] ...`;

			alert(existingEmergency ? '응급 기록이 수정되었습니다.' : '응급 기록이 생성되었습니다.');
			setIsEditMode(false);
			if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
				await fetchEmergencies(selectedMember.ANCD, selectedMember.PNUM, selectedMember);
			}
		} catch (err) {
			console.error('응급 기록 저장 오류:', err);
			alert('응급 기록 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingEmergencies(false);
		}
	};

	// 취소 함수
	const handleCancel = () => {
		setIsEditMode(false);
		
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const formattedToday = `${year}-${month}-${day}`;
		
		const currentDate = selectedDateIndex !== null ? emergencyDates[selectedDateIndex] : null;
		
		if (currentDate === formattedToday && selectedDateIndex !== null) {
			setEmergencyDates(prev => prev.filter((_, index) => index !== selectedDateIndex));
			setSelectedDateIndex(null);
			resetForm(selectedMember);
			return;
		}
		
		if (selectedDateIndex !== null && emergencyList[selectedDateIndex]) {
			handleSelectDate(selectedDateIndex, emergencyList[selectedDateIndex], selectedMember);
		} else if (selectedDateIndex !== null && emergencyDates[selectedDateIndex]) {
			resetForm(selectedMember);
		}
	};

	// 출력 함수
	const handlePrint = async () => {
		if (!selectedMember || !formData.emergencyDate) {
			alert('출력할 응급 기록을 선택해주세요.');
			return;
		}

		// F00110 테이블에서 장기요양기관 정보 조회
		let institutionName = '-';
		let facilityManager = '-';
		let facilityAddress = '-';
		let facilityPhone = '-';
		let facilityFax = '-';
		try {
			const response = await fetch('/api/f00110');
			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data)) {
				const institution = result.data.find((item: any) => item.ANCD === selectedMember.ANCD);
				if (institution) {
					institutionName = institution.ANNM || '-';
					facilityManager = institution.MNM || '-';
					facilityAddress = institution.ANADD || '-';
					facilityPhone = institution.ANTEL || '-';
					facilityFax = institution.ANFAX || '-';
				}
			}
		} catch (err) {
			console.error('장기요양기관 정보 조회 오류:', err);
		}

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		const maskResidentNumber = (residentNumber: string) => {
			if (!residentNumber || residentNumber.length < 7) return residentNumber || '-';
			return residentNumber.substring(0, 7) + '******';
		};

		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const issueDate = `${year}-${month}-${day}`;
		const printDate = `${year}-${month}-${day}`;

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>응급상황기록</title>
	<style>
		@page {
			size: A4;
			margin: 20mm;
		}
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
			font-size: 11pt;
			line-height: 1.5;
			color: #000;
			background: #fff;
		}
		.print-container {
			width: 100%;
			max-width: 210mm;
			margin: 0 auto;
			padding: 0;
		}
		.info-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #000;
		}
		.info-table td {
			border: 1px solid #000;
			padding: 8px 10px;
			font-size: 10pt;
		}
		.info-table td.label {
			background-color: #f0f0f0;
			font-weight: bold;
			width: 120px;
			text-align: center;
		}
		.info-table td.value {
			width: auto;
		}
		.content-section {
			margin-top: 20px;
			margin-bottom: 20px;
		}
		.section-title {
			font-size: 12pt;
			font-weight: bold;
			margin-bottom: 10px;
			padding: 5px;
			background-color: #f0f0f0;
			border: 1px solid #000;
		}
		.section-content {
			border: 1px solid #000;
			padding: 15px;
			min-height: 150px;
			font-size: 10pt;
			line-height: 1.8;
			white-space: pre-wrap;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}
	</style>
</head>
<body>
	<div class="print-container">
		<table class="info-table">
			<tr>
				<td class="label">수급자</td>
				<td class="value">${formData.beneficiary || '-'}</td>
				<td class="label">응급일자</td>
				<td class="value">${formData.emergencyDate || '-'}</td>
			</tr>
			<tr>
				<td class="label">담당자</td>
				<td class="value" colspan="3">${formData.handler || '-'}</td>
			</tr>
		</table>

		<div class="content-section">
			<div class="section-title">응급상황</div>
			<div class="section-content">${formData.emergencySituation || ''}</div>
		</div>

		<div class="content-section">
			<div class="section-title">조치사항</div>
			<div class="section-content">${formData.actionTaken || ''}</div>
		</div>
	</div>
	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>
		`;

		printWindow.document.write(printHTML);
		printWindow.document.close();
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		const currentEmergency = selectedDateIndex !== null && emergencyList[selectedDateIndex] 
			? emergencyList[selectedDateIndex] 
			: null;

		if (!currentEmergency || !currentEmergency.EMNUM) {
			alert('삭제할 응급 기록을 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingEmergencies(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const deleteQuery = `DELETE FROM [돌봄시설DB].[dbo].[F11070] WHERE ...`;

			alert('응급 기록이 삭제되었습니다.');
			setIsEditMode(false);
			if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
				await fetchEmergencies(selectedMember.ANCD, selectedMember.PNUM, selectedMember);
			}
		} catch (err) {
			console.error('응급 기록 삭제 오류:', err);
			alert('응급 기록 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingEmergencies(false);
		}
	};

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널 (약 25%) */}
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

				{/* 우측 패널 (약 75%) */}
				<div className="flex flex-1 bg-white">
					{/* 좌측: 응급 일자 (세로 박스) */}
					<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
						<div className="flex items-center justify-between mb-2">
							<label className="text-sm font-medium text-blue-900">응급 일자</label>
							<button
								onClick={handleCreateDate}
								className="px-3 py-1.5 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								생성
							</button>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="overflow-y-auto">
								{loadingEmergencies ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
								) : emergencyDates.length === 0 ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">
										{selectedMember ? '응급 기록이 없습니다' : '수급자를 선택해주세요'}
									</div>
								) : (
									(() => {
										const totalDatePages = Math.ceil(emergencyDates.length / emergencyDateItemsPerPage);
										const dateStartIndex = (emergencyDatePage - 1) * emergencyDateItemsPerPage;
										const dateEndIndex = dateStartIndex + emergencyDateItemsPerPage;
										const currentDateItems = emergencyDates.slice(dateStartIndex, dateEndIndex);
										
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
							{/* 응급일자 페이지네이션 */}
							{emergencyDates.length > emergencyDateItemsPerPage && (
								<div className="p-2 mt-2">
									<div className="flex items-center justify-center gap-1">
										<button
											onClick={() => setEmergencyDatePage(1)}
											disabled={emergencyDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;&lt;
										</button>
										<button
											onClick={() => setEmergencyDatePage(prev => Math.max(1, prev - 1))}
											disabled={emergencyDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;
										</button>
										
										{(() => {
											const totalDatePages = Math.ceil(emergencyDates.length / emergencyDateItemsPerPage);
											const pagesToShow = Math.min(5, totalDatePages);
											const startPage = Math.max(1, Math.min(totalDatePages - 4, emergencyDatePage - 2));
											
											return Array.from({ length: pagesToShow }, (_, i) => {
												const pageNum = startPage + i;
												if (pageNum > totalDatePages) return null;
												return (
													<button
														key={pageNum}
														onClick={() => setEmergencyDatePage(pageNum)}
														className={`px-2 py-1 text-xs border rounded ${
															emergencyDatePage === pageNum
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
												const totalDatePages = Math.ceil(emergencyDates.length / emergencyDateItemsPerPage);
												setEmergencyDatePage(prev => Math.min(totalDatePages, prev + 1));
											}}
											disabled={emergencyDatePage >= Math.ceil(emergencyDates.length / emergencyDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;
										</button>
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(emergencyDates.length / emergencyDateItemsPerPage);
												setEmergencyDatePage(totalDatePages);
											}}
											disabled={emergencyDatePage >= Math.ceil(emergencyDates.length / emergencyDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* 우측: 응급 기록 폼 */}
					<div className="flex-1 p-4 overflow-y-auto">
						{/* 첫 번째 행 */}
						<div className="flex flex-wrap items-center gap-4 mb-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자</label>
								<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
									{formData.beneficiary || '-'}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">응급일자</label>
								{isEditMode ? (
									<input
										type="date"
										value={formData.emergencyDate}
										onChange={(e) => handleFormChange('emergencyDate', e.target.value)}
										className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.emergencyDate || '-'}
									</span>
								)}
							</div>
							{!isEditMode && (
								<div className="flex items-center gap-2 ml-auto">
									<button
										onClick={handlePrint}
										className="px-4 py-1.5 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
									>
										출력
									</button>
								</div>
							)}
						</div>

						{/* 담당자 */}
						<div className="mb-4">
							<label className="block mb-2 text-sm font-medium text-blue-900">담당자</label>
							{isEditMode ? (
								<input
									type="text"
									value={formData.handler}
									onChange={(e) => handleFormChange('handler', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									placeholder="담당자를 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[40px]">
									{formData.handler || '-'}
								</div>
							)}
						</div>

						{/* 응급상황 */}
						<div className="mb-4">
							<label className="block mb-2 text-sm font-medium text-blue-900">응급상황</label>
							{isEditMode ? (
								<textarea
									value={formData.emergencySituation}
									onChange={(e) => handleFormChange('emergencySituation', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="응급상황을 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
									{formData.emergencySituation || '-'}
								</div>
							)}
						</div>

						{/* 조치사항 */}
						<div className="mb-4">
							<label className="block mb-2 text-sm font-medium text-blue-900">조치사항</label>
							{isEditMode ? (
								<textarea
									value={formData.actionTaken}
									onChange={(e) => handleFormChange('actionTaken', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="조치사항을 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
									{formData.actionTaken || '-'}
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
