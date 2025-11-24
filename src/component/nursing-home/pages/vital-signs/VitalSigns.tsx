"use client";
import React, { useState, useEffect } from 'react';

interface VitalSignsData {
	id: number;
	checked: boolean;
	number: number;
	status: string;
	beneficiaryName: string;
	livingRoom: string;
	bloodPressure: string;
	pulse: string;
	bodyTemperature: string;
	respiration: string;
	oxygenSaturation: string;
	nursingDetails: string;
	author: string;
	ancd?: string;
	pnum?: string;
}

export default function VitalSigns() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedLivingRoom, setSelectedLivingRoom] = useState<string>('');
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [vitalSignsData, setVitalSignsData] = useState<VitalSignsData[]>([]);
	const [nextId, setNextId] = useState(1);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	
	// 출력 모달 관련 상태
	const [showPrintModal, setShowPrintModal] = useState(false);
	const [memberSearchTerm, setMemberSearchTerm] = useState('');
	const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
	const [showMemberSearchResults, setShowMemberSearchResults] = useState(false);
	const [selectedMemberForPrint, setSelectedMemberForPrint] = useState<any>(null);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [printData, setPrintData] = useState<any[]>([]);
	const [loadingPrintData, setLoadingPrintData] = useState(false);

	// F30120 데이터 조회 함수
	const fetchVitalSignsData = async (rsdt: string) => {
		setLoading(true);
		try {
			const url = `/api/f30120?rsdt=${encodeURIComponent(rsdt)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				// F30120 데이터를 vitalSignsData 형식으로 변환
				const transformedData: VitalSignsData[] = result.data.map((item: any, index: number) => {
					// 혈압 조합 (수축기/이완기)
					const bloodPressure = item.SBDP && item.EBDP 
						? `${item.SBDP}/${item.EBDP}` 
						: item.SBDP || item.EBDP || '';
					
					// 현황 (P_ST: '1'=입소, '9'=퇴소)
					const status = item.P_ST === '1' ? '입소' : item.P_ST === '9' ? '퇴소' : '';
					
					return {
						id: index + 1,
						checked: false,
						number: index + 1,
						status: status,
						beneficiaryName: item.P_NM || '',
						livingRoom: '', // F30120에 생활실 정보가 없음
						bloodPressure: bloodPressure,
						pulse: item.PUCNT || '',
						bodyTemperature: item.TMPBD || '',
						respiration: item.BRCNT || '',
						oxygenSaturation: '', // F30120에 산소포화도 정보가 없음
						nursingDetails: item.NUDES || '',
						author: item.INEMPNM || '',
						ancd: item.ANCD || '',
						pnum: item.PNUM || ''
					};
				});
				
				setVitalSignsData(transformedData);
				setNextId(transformedData.length > 0 ? Math.max(...transformedData.map(d => d.id)) + 1 : 1);
			} else {
				setVitalSignsData([]);
				setNextId(1);
			}
		} catch (err) {
			console.error('활력증상 데이터 조회 오류:', err);
			setVitalSignsData([]);
			setNextId(1);
		} finally {
			setLoading(false);
		}
	};

	// 초기 로드 및 날짜 변경 시 데이터 조회
	useEffect(() => {
		setCurrentPage(1); // 날짜 변경 시 페이지를 1로 초기화
		fetchVitalSignsData(selectedDate);
	}, [selectedDate]);

	// 날짜 변경 함수
	const handleDateChange = (days: number) => {
		const date = new Date(selectedDate);
		date.setDate(date.getDate() + days);
		setSelectedDate(date.toISOString().split('T')[0]);
	};

	// 체크박스 토글
	const handleCheckboxChange = (id: number) => {
		setVitalSignsData(prev => prev.map(item => 
			item.id === id ? { ...item, checked: !item.checked } : item
		));
	};

	// 데이터 업데이트
	const handleDataChange = (id: number, field: string, value: string) => {
		setVitalSignsData(prev => prev.map(item => 
			item.id === id ? { ...item, [field]: value } : item
		));
	};

	// 수정 모드 토글
	const handleEditClick = (id: number) => {
		if (editingRowId === id) {
			// 수정 완료
			setEditingRowId(null);
		} else {
			// 수정 모드 진입
			setEditingRowId(id);
		}
	};

	// 삭제 함수
	const handleDeleteClick = (id: number) => {
		if (confirm('정말 삭제하시겠습니까?')) {
			setVitalSignsData(prev => prev.filter(item => item.id !== id));
			if (editingRowId === id) {
				setEditingRowId(null);
			}
		}
	};

	// 행 추가 함수
	const handleAddRow = () => {
		const newNumber = vitalSignsData.length > 0 
			? Math.max(...vitalSignsData.map(row => row.number)) + 1 
			: 1;
		
		const newRow: VitalSignsData = {
			id: nextId,
			checked: false,
			number: newNumber,
			status: '',
			beneficiaryName: '',
			livingRoom: '',
			bloodPressure: '',
			pulse: '',
			bodyTemperature: '',
			respiration: '',
			oxygenSaturation: '',
			nursingDetails: '',
			author: ''
		};
		
		setVitalSignsData(prev => [...prev, newRow]);
		setNextId(prev => prev + 1);
		setEditingRowId(newRow.id); // 새로 추가된 행을 수정 모드로 설정
	};

	// 필터링된 데이터
	const filteredData = vitalSignsData.filter(row => {
		// 현황 필터링
		if (selectedStatus && row.status !== selectedStatus) {
			return false;
		}
		
		// 생활실 필터링
		if (selectedLivingRoom && row.livingRoom !== selectedLivingRoom) {
			return false;
		}
		
		return true;
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredData.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedData = filteredData.slice(startIndex, endIndex);

	// 페이지 변경 함수
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 필터 변경 시 첫 페이지로 이동
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedLivingRoom]);

	// 날짜 포맷팅 (yyyy-mm-dd -> yyyy. mm. dd)
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}. ${month}. ${day}`;
	};

	// 수급자 검색 함수
	const handleSearchMemberForPrint = async (searchValue: string) => {
		if (!searchValue || searchValue.trim().length < 1) {
			setMemberSearchResults([]);
			setShowMemberSearchResults(false);
			return;
		}

		try {
			const response = await fetch(`/api/f10010?name=${encodeURIComponent(searchValue.trim())}`);
			if (!response.ok) {
				throw new Error('검색 요청 실패');
			}
			const data = await response.json();
			
			if (data.success && data.data) {
				setMemberSearchResults(data.data);
				setShowMemberSearchResults(data.data.length > 0);
			} else {
				setMemberSearchResults([]);
				setShowMemberSearchResults(false);
			}
		} catch (error) {
			console.error('수급자 검색 오류:', error);
			setMemberSearchResults([]);
			setShowMemberSearchResults(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMemberForPrint = (member: any) => {
		setSelectedMemberForPrint(member);
		setMemberSearchTerm(member.P_NM || '');
		setShowMemberSearchResults(false);
		setMemberSearchResults([]);
	};

	// 출력용 데이터 조회
	const handleLoadPrintData = async () => {
		if (!selectedMemberForPrint || !startDate || !endDate) {
			alert('수급자와 기간을 선택해주세요.');
			return;
		}

		if (startDate > endDate) {
			alert('시작일이 종료일보다 늦을 수 없습니다.');
			return;
		}

		setLoadingPrintData(true);
		try {
			const url = `/api/f30120?pnum=${encodeURIComponent(selectedMemberForPrint.PNUM)}&ancd=${encodeURIComponent(selectedMemberForPrint.ANCD || '')}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setPrintData(result.data);
			} else {
				setPrintData([]);
				alert('데이터를 조회할 수 없습니다.');
			}
		} catch (err) {
			console.error('출력 데이터 조회 오류:', err);
			alert('데이터 조회 중 오류가 발생했습니다.');
			setPrintData([]);
		} finally {
			setLoadingPrintData(false);
		}
	};

	// 출력 함수
	const handlePrint = () => {
		if (printData.length === 0) {
			alert('출력할 데이터가 없습니다. 먼저 데이터를 조회해주세요.');
			return;
		}

		// 날짜 포맷팅 (YYYY-MM-DD만 표시, 시간 제거)
		const formatDateForDisplay = (dateStr: string) => {
			if (!dateStr) return '';
			
			// YYYYMMDD 형식 (8자리)
			if (dateStr.length === 8 && !dateStr.includes('-')) {
				return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
			}
			
			// YYYY-MM-DD 형식이지만 시간이 포함된 경우
			if (dateStr.includes(' ')) {
				return dateStr.split(' ')[0];
			}
			
			// YYYY-MM-DD 형식
			if (dateStr.includes('-') && dateStr.length === 10) {
				return dateStr;
			}
			
			// Date 객체로 변환 시도
			try {
				const date = new Date(dateStr);
				if (!isNaN(date.getTime())) {
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day}`;
				}
			} catch (e) {
				// 변환 실패
			}
			
			return dateStr;
		};

		// 부종유무 변환
		const getEdemaText = (bjyen: string) => {
			if (bjyen === '1' || bjyen === 'Y' || bjyen === 'y') return '유';
			if (bjyen === '0' || bjyen === 'N' || bjyen === 'n') return '무';
			return bjyen || '';
		};

		// 출력용 HTML 생성
		const printContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>간호일지</title>
				<style>
					@page {
						size: A4 landscape;
						margin: 10mm;
					}
					body {
						font-family: 'Malgun Gothic', sans-serif;
						font-size: 9pt;
						margin: 0;
						padding: 0;
					}
					.container {
						position: relative;
						padding-right: 170px;
					}
					.header {
						margin-bottom: 10px;
					}
					.header-table {
						width: 100%;
						border-collapse: collapse;
						margin-bottom: 10px;
					}
					.header-table td {
						padding: 3px 5px;
						border: 1px solid #000;
						font-size: 9pt;
					}
					.header-table .label {
						background-color: #f0f0f0;
						font-weight: bold;
						width: 120px;
						text-align: center;
					}
					.signature-table {
						border: 1px solid #000;
						border-collapse: collapse;
						width: 150px;
						font-size: 9pt;
						position: absolute;
						top: 0;
						right: 0;
					}
					.signature-table th,
					.signature-table td {
						border: 1px solid #000;
						padding: 5px;
						text-align: center;
						height: 25px;
					}
					.main-table {
						width: 100%;
						border-collapse: collapse;
						border: 1px solid #000;
						font-size: 8pt;
						margin-top: 10px;
					}
					.main-table th,
					.main-table td {
						border: 1px solid #000;
						padding: 3px;
						text-align: center;
						vertical-align: middle;
					}
					.main-table th {
						background-color: #f0f0f0;
						font-weight: bold;
					}
					.nursing-details {
						text-align: left;
						padding: 5px;
						white-space: normal;
						word-wrap: break-word;
						max-width: 200px;
					}
					.footer {
						margin-top: 10px;
						text-align: right;
						font-size: 9pt;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<table class="signature-table">
						<tr>
							<th>담당</th>
							<th>검토</th>
							<th>결재</th>
						</tr>
						<tr>
							<td></td>
							<td></td>
							<td></td>
						</tr>
					</table>
					
					<div class="header">
					<table class="header-table">
						<tr>
							<td class="label">장기요양기관기호</td>
							<td>${selectedMemberForPrint.ANCD || ''}</td>
							<td class="label">수급자성명</td>
							<td>${selectedMemberForPrint.P_NM || ''}</td>
							<td class="label">장기요양기관명</td>
							<td>너싱홈 해원</td>
						</tr>
						<tr>
							<td class="label">주민등록번호</td>
							<td>${selectedMemberForPrint.P_BRDT ? selectedMemberForPrint.P_BRDT.replace(/(\d{6})(\d{7})/, '$1-*******') : ''}</td>
							<td class="label">장기요양등급</td>
							<td></td>
							<td class="label">장기요양인정번호</td>
							<td></td>
						</tr>
						<tr>
							<td class="label">조사기간</td>
							<td colspan="5">${startDate} ~ ${endDate}</td>
						</tr>
					</table>
				</div>

				<table class="main-table">
					<thead>
						<tr>
							<th style="width: 80px;">조사일자</th>
							<th style="width: 60px;">공복혈당</th>
							<th style="width: 60px;">식후혈당</th>
							<th style="width: 60px;">수축혈압</th>
							<th style="width: 60px;">이완혈압</th>
							<th style="width: 50px;">체온</th>
							<th style="width: 50px;">맥박수</th>
							<th style="width: 50px;">호흡수</th>
							<th style="width: 50px;">체중</th>
							<th style="width: 50px;">부종유무</th>
							<th style="width: 50px;">부종정도</th>
							<th style="width: 60px;">부종부위</th>
							<th style="width: 200px;">간호내역</th>
						</tr>
					</thead>
					<tbody>
						${printData.map((item: any) => `
							<tr>
								<td>${formatDateForDisplay(item.RSDT)}</td>
								<td>${item.SBDS || ''}</td>
								<td>${item.EBDS || ''}</td>
								<td>${item.SBDP || ''}</td>
								<td>${item.EBDP || ''}</td>
								<td>${item.TMPBD || ''}</td>
								<td>${item.PUCNT || ''}</td>
								<td>${item.BRCNT || ''}</td>
								<td>${item.WEIGHT || ''}</td>
								<td>${getEdemaText(item.BJYN)}</td>
								<td>${item.BJDG || ''}</td>
								<td>${item.BJPA || ''}</td>
								<td class="nursing-details">${item.NUDES || ''}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>

					<div class="footer">
						R30030<br>
						페이지: 1
					</div>
				</div>
			</body>
			</html>
		`;

		const printWindow = window.open('', '_blank');
		if (printWindow) {
			printWindow.document.write(printContent);
			printWindow.document.close();
			printWindow.onload = () => {
				printWindow.print();
			};
		}
	};

	// 모달 닫기
	const handleClosePrintModal = () => {
		setShowPrintModal(false);
		setSelectedMemberForPrint(null);
		setMemberSearchTerm('');
		setStartDate('');
		setEndDate('');
		setPrintData([]);
		setMemberSearchResults([]);
		setShowMemberSearchResults(false);
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1600px] p-4">
				{/* 상단: 날짜 네비게이션 및 출력 */}
				<div className="mb-4 flex items-center border-b border-blue-200 pb-3 relative">
					{/* 가운데: 날짜 네비게이션 */}
					<div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
						<button 
							onClick={() => handleDateChange(-1)}
							className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							<span>◀</span>
							<span>이전일</span>
						</button>
						<div className="flex items-center gap-2">
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white text-blue-900"
							/>
						</div>
						<button 
							onClick={() => handleDateChange(1)}
							className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-blue-100 hover:bg-blue-200 text-blue-900"
						>
							<span>다음일</span>
							<span>▶</span>
						</button>
					</div>
					{/* 오른쪽: 출력 버튼 */}
					<div className="ml-auto flex flex-col items-end gap-1">
						<button 
							onClick={() => setShowPrintModal(true)}
							className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							출력
						</button>
					</div>
				</div>

				{/* 메인 콘텐츠 영역 */}
				<div className="flex flex-col gap-4">
					{/* 상단 필터 패널 - 가로 배치 */}
					<div className="flex gap-4 items-end">
						<div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
							<label className="block text-sm font-semibold text-blue-900 mb-2">현황</label>
							<select
								value={selectedStatus}
								onChange={(e) => setSelectedStatus(e.target.value)}
								className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded bg-white min-w-[120px]"
							>
								<option value="">전체</option>
								<option value="입소">입소</option>
								<option value="퇴소">퇴소</option>
							</select>
						</div>
						<div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
							<label className="block text-sm font-semibold text-blue-900 mb-2">생활실(수급자정보, 활력증상정보 둘 다 데이터 없음)</label>
							<select
								value={selectedLivingRoom}
								onChange={(e) => setSelectedLivingRoom(e.target.value)}
								className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded bg-white min-w-[120px]"
							>
								<option value="">전체</option>
								<option value="1층">1층</option>
								<option value="2층">2층</option>
								<option value="3층">3층</option>
							</select>
						</div>
					</div>

					{/* 우측 메인 테이블 */}
					<div className="flex-1 border border-blue-300 rounded-lg bg-white shadow-sm">
						<div className="bg-blue-100 border-b border-blue-300 px-4 py-2">
							<h2 className="text-lg font-semibold text-blue-900">활력증상 등록(일상)</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-12">
											<input type="checkbox" className="cursor-pointer" />
										</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">번호</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">현황</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">생활실</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">혈압(mmHg)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">맥박(/분)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">체온(℃)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200">호흡(회)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-24">산소포화도(%SpO2)</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-80">간호내역</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold border-r border-blue-200 w-32">작성자</th>
										<th className="text-center px-3 py-2 text-blue-900 font-semibold w-32">작업</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={13} className="text-center px-3 py-4 text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : vitalSignsData.length === 0 ? (
										<tr>
											<td colSpan={13} className="text-center px-3 py-4 text-blue-900/60">
												데이터가 없습니다
											</td>
										</tr>
									) : (
										paginatedData.map((row) => (
										<tr 
											key={row.id} 
											className="border-b border-blue-50 hover:bg-blue-50"
										>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="checkbox"
													checked={row.checked}
													onChange={() => handleCheckboxChange(row.id)}
													className="cursor-pointer"
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">{row.number}</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.status}
													onChange={(e) => handleDataChange(row.id, 'status', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.beneficiaryName}
													onChange={(e) => handleDataChange(row.id, 'beneficiaryName', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.livingRoom}
													onChange={(e) => handleDataChange(row.id, 'livingRoom', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.bloodPressure}
													onChange={(e) => handleDataChange(row.id, 'bloodPressure', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
													placeholder="예: 120/80"
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.pulse}
													onChange={(e) => handleDataChange(row.id, 'pulse', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.bodyTemperature}
													onChange={(e) => handleDataChange(row.id, 'bodyTemperature', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.respiration}
													onChange={(e) => handleDataChange(row.id, 'respiration', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.oxygenSaturation}
													onChange={(e) => handleDataChange(row.id, 'oxygenSaturation', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
												/>
											</td>
											<td className="px-3 py-3 border-r border-blue-100 align-top">
												{editingRowId === row.id ? (
													<textarea
														value={row.nursingDetails}
														onChange={(e) => handleDataChange(row.id, 'nursingDetails', e.target.value)}
														className="w-full px-2 py-1 border border-blue-300 rounded bg-white resize-none"
														placeholder="간호내역 입력"
														rows={2}
													/>
												) : (
													<div className="w-full px-2 py-1 text-left whitespace-normal break-words">
														{row.nursingDetails || <span className="text-gray-400">-</span>}
													</div>
												)}
											</td>
											<td className="text-center px-3 py-3 border-r border-blue-100">
												<input
													type="text"
													value={row.author}
													onChange={(e) => handleDataChange(row.id, 'author', e.target.value)}
													disabled={editingRowId !== row.id}
													className={`w-full px-2 py-1 border border-blue-300 rounded text-center ${
														editingRowId === row.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
													}`}
													placeholder="작성자 입력"
												/>
											</td>
											<td className="text-center px-3 py-3">
												<div className="flex justify-center gap-2">
													<button
														onClick={() => handleEditClick(row.id)}
														className={`px-3 py-1 text-xs border rounded font-medium ${
															editingRowId === row.id
																? 'border-green-400 bg-green-200 hover:bg-green-300 text-green-900'
																: 'border-blue-400 bg-blue-200 hover:bg-blue-300 text-blue-900'
														}`}
													>
														{editingRowId === row.id ? '저장' : '수정'}
													</button>
													<button
														onClick={() => handleDeleteClick(row.id)}
														className="px-3 py-1 text-xs border border-red-400 rounded bg-red-200 hover:bg-red-300 text-red-900 font-medium"
													>
														삭제
													</button>
												</div>
											</td>
										</tr>
									)))}
								</tbody>
							</table>
						</div>
					</div>

					{/* 페이지네이션 */}
					{totalPages > 1 && (
						<div className="p-3 border-t border-blue-200 bg-white">
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
								<span className="ml-4 text-xs text-blue-900">
									{filteredData.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredData.length)} / ${filteredData.length}` : '0 / 0'}
								</span>
							</div>
						</div>
					)}

					{/* 하단 추가 버튼 */}
					<div className="flex justify-center mt-4">
						<button
							onClick={handleAddRow}
							className="px-6 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							추가
						</button>
					</div>
				</div>
			</div>

			{/* 출력 모달 */}
			{showPrintModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg border border-blue-400 w-[600px] max-h-[90vh] overflow-y-auto p-6 shadow-xl">
						<div className="mb-4">
							<h2 className="text-xl font-semibold text-blue-900 mb-4">간호일지 출력</h2>
							
							{/* 수급자 검색 */}
							<div className="mb-4">
								<label className="block text-sm font-semibold text-blue-900 mb-2">수급자 검색</label>
								<div className="relative">
									<input
										type="text"
										value={memberSearchTerm}
										onChange={(e) => {
											setMemberSearchTerm(e.target.value);
											handleSearchMemberForPrint(e.target.value);
										}}
										onFocus={() => {
											if (memberSearchResults.length > 0) {
												setShowMemberSearchResults(true);
											}
										}}
										placeholder="수급자명을 입력하세요"
										className="w-full px-3 py-2 border border-blue-300 rounded"
									/>
									{showMemberSearchResults && memberSearchResults.length > 0 && (
										<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
											{memberSearchResults.map((member, index) => (
												<div
													key={index}
													onClick={() => handleSelectMemberForPrint(member)}
													className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-blue-100"
												>
													{member.P_NM} ({member.PNUM})
												</div>
											))}
										</div>
									)}
								</div>
								{selectedMemberForPrint && (
									<div className="mt-2 text-sm text-blue-700">
										선택된 수급자: {selectedMemberForPrint.P_NM}
									</div>
								)}
							</div>

							{/* 기간 설정 */}
							<div className="mb-4">
								<label className="block text-sm font-semibold text-blue-900 mb-2">조사기간</label>
								<div className="flex items-center gap-2">
									<input
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
										className="flex-1 px-3 py-2 border border-blue-300 rounded"
									/>
									<span>~</span>
									<input
										type="date"
										value={endDate}
										onChange={(e) => setEndDate(e.target.value)}
										className="flex-1 px-3 py-2 border border-blue-300 rounded"
									/>
								</div>
							</div>

							{/* 조회된 데이터 정보 */}
							{printData.length > 0 && (
								<div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-900">
									조회된 데이터: {printData.length}건
								</div>
							)}

							{/* 버튼 */}
							<div className="flex gap-2 justify-end">
								<button
									onClick={handleLoadPrintData}
									disabled={!selectedMemberForPrint || !startDate || !endDate || loadingPrintData}
									className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loadingPrintData ? '조회 중...' : '조회'}
								</button>
								<button
									onClick={handlePrint}
									disabled={printData.length === 0}
									className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
								>
									출력
								</button>
								<button
									onClick={handleClosePrintModal}
									className="px-4 py-2 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
								>
									닫기
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

