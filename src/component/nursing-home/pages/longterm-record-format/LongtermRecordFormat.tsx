"use client";

import { useState, useEffect, useRef } from 'react';

interface MemberData {
	[key: string]: any;
}

export default function LongtermRecordFormat() {
	// 수급자 목록 관련 state
	const [members, setMembers] = useState<MemberData[]>([]);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 년도 및 날짜 관련 state
	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [weekDates, setWeekDates] = useState<string[]>([]);

	// 수급자 상태 관련 state
	const [status, setStatus] = useState<'와상' | '준와상' | '자립'>('준와상');
	const [dementia, setDementia] = useState(false);
	const [stroke, setStroke] = useState(false);
	const [hypertension, setHypertension] = useState(false);
	const [diabetes, setDiabetes] = useState(false);
	const [arthritis, setArthritis] = useState(false);
	const [otherDisease, setOtherDisease] = useState(false);
	const [otherDiseaseText, setOtherDiseaseText] = useState('');
	const [tracheostomy, setTracheostomy] = useState(false);
	const [dentures, setDentures] = useState(false);
	const [nasogastricTube, setNasogastricTube] = useState(false);
	const [urinaryCatheter, setUrinaryCatheter] = useState(false);
	const [cystostomy, setCystostomy] = useState(false);
	const [urostomy, setUrostomy] = useState(false);
	const [colostomy, setColostomy] = useState(false);
	const [diaper, setDiaper] = useState(false);
	const [pressureSore, setPressureSore] = useState(false);
	const [pressureSoreArea, setPressureSoreArea] = useState('');
	const [pressureSorePrevention, setPressureSorePrevention] = useState(false);
	const [pressureSorePreventionTool, setPressureSorePreventionTool] = useState('');

	// 7일치 일일 기록 데이터 (각 항목별로 7일치 배열)
	const [dailyRecords, setDailyRecords] = useState({
		// 신체활동지원
		grooming: [false, false, false, false, false, false, false],
		bathTime: ['', '', '', '', '', '', ''],
		bathMethod: ['', '', '', '', '', '', ''],
		mealType: ['', '', '', '', '', '', ''],
		mealIntake: ['', '', '', '', '', '', ''],
		positionChange: [false, false, false, false, false, false, false],
		toiletUsage: ['', '', '', '', '', '', ''],
		movementAssistance: [false, false, false, false, false, false, false],
		walk: [false, false, false, false, false, false, false],
		outing: [false, false, false, false, false, false, false],
		physicalActivityNotes: '',
		physicalActivityPreparer: ['', '', '', '', '', '', ''],
		
		// 인지관리및의사소통
		cognitiveSupport: [false, false, false, false, false, false, false],
		communicationSupport: [false, false, false, false, false, false, false],
		cognitiveNotes: '',
		cognitivePreparer: ['', '', '', '', '', '', ''],
		
		// 건강및간호관리
		vitalSigns: ['', '', '', '', '', '', ''],
		healthManagementTime: ['', '', '', '', '', '', ''],
		healthManagement: [false, false, false, false, false, false, false],
		nursingManagementTime: ['', '', '', '', '', '', ''],
		nursingManagement: [false, false, false, false, false, false, false],
		emergencyService: [false, false, false, false, false, false, false],
		healthNotes: '',
		healthPreparer: ['', '', '', '', '', '', ''],
		
		// 기능회복훈련
		physicalFunctionTraining: [false, false, false, false, false, false, false],
		cognitiveTraining: [false, false, false, false, false, false, false],
		physicalTherapy: [false, false, false, false, false, false, false],
		trainingNotes: '',
		trainingPreparer: ['', '', '', '', '', '', ''],
		
		// 입퇴소시간
		admissionDischargeTime: ['', '', '', '', '', '', '']
	});

	const printRef = useRef<HTMLDivElement>(null);

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		setError(null);
		
		try {
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				setMembers(result.data);
				if (result.data.length > 0 && !selectedMember) {
					setSelectedMember(result.data[0]);
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

	// 주간 날짜 계산
	const calculateWeekDates = () => {
		const dates: string[] = [];
		const today = new Date();
		const currentDay = today.getDay();
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - currentDay);
		
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			dates.push(`${month}/${day}`);
		}
		setWeekDates(dates);
	};

	// 클라이언트 측 추가 필터링
	const filteredMembers = members.filter(member => {
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
			const matchesSearch = (
				member.P_NM?.toLowerCase().includes(searchLower) ||
				member.P_TEL?.includes(searchTerm) ||
				member.P_HP?.includes(searchTerm) ||
				String(member.ANCD || '').includes(searchTerm) ||
				String(member.PNUM || '').includes(searchTerm)
			);
			if (!matchesSearch) {
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

	const handleMemberSelect = (member: MemberData) => {
		setSelectedMember(member);
	};

	const handlePrint = () => {
		if (!printRef.current) return;
		
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		const printContent = printRef.current.innerHTML;
		
		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>장기요양급여 제공기록지</title>
				<style>
					@page {
						size: A4;
						margin: 0;
					}
					body {
						margin: 0;
						padding: 20px;
						font-family: 'Malgun Gothic', sans-serif;
						font-size: 10pt;
						line-height: 1.4;
					}
					.print-container {
						width: 100%;
					}
					table {
						width: 100%;
						border-collapse: collapse;
						font-size: 9pt;
					}
					td, th {
						border: 1px solid #000;
						padding: 4px;
						text-align: center;
						vertical-align: middle;
					}
					.text-left {
						text-align: left;
					}
					.text-right {
						text-align: right;
					}
					.header-info {
						display: flex;
						justify-content: space-between;
						margin-bottom: 10px;
					}
					.beneficiary-info {
						display: grid;
						grid-template-columns: repeat(4, 1fr);
						gap: 5px;
						margin-bottom: 10px;
					}
					.info-item {
						display: flex;
						align-items: center;
						gap: 5px;
					}
					.label {
						font-weight: bold;
					}
					input[type="checkbox"] {
						width: 12px;
						height: 12px;
					}
					input[type="text"] {
						border: none;
						border-bottom: 1px solid #000;
						width: 100%;
						text-align: center;
					}
					.section-title {
						background-color: #f0f0f0;
						font-weight: bold;
						text-align: left;
						padding: 5px;
					}
					@media print {
						body {
							margin: 0;
							padding: 10px;
						}
					}
				</style>
			</head>
			<body>
				${printContent}
			</body>
			</html>
		`);
		
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 250);
	};

	useEffect(() => {
		fetchMembers();
		calculateWeekDates();
	}, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor]);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1800px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<div className="overflow-hidden bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-3 py-2 font-semibold text-blue-900 bg-blue-100 border-b border-blue-300">수급자 목록</div>
							{/* 상단 상태/검색 영역 */}
							<div className="px-3 py-2 space-y-2 border-b border-blue-100">
								{/* 현황 필터 */}
								<div className="space-y-1">
									<div className="text-xs text-blue-900/80">현황</div>
									<select
										value={selectedStatus}
										onChange={(e) => {
											setSelectedStatus(e.target.value);
											setCurrentPage(1);
										}}
										className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
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
										onChange={(e) => {
											setSelectedGrade(e.target.value);
											setCurrentPage(1);
										}}
										className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
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
										onChange={(e) => {
											setSelectedFloor(e.target.value);
											setCurrentPage(1);
										}}
										className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
									>
										<option value="">층수 전체</option>
										{Array.from(new Set(members.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== ''))).sort((a, b) => Number(a) - Number(b)).map(floor => (
											<option key={floor} value={String(floor)}>{floor}층</option>
										))}
									</select>
								</div>
								{/* 이름 검색 */}
								<div className="space-y-1">
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
								</div>
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

					{/* 우측: 기록 양식 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							{/* 출력 버튼 */}
							<div className="flex justify-end px-4 py-3 bg-blue-100 border-b border-blue-200">
								<button
									onClick={handlePrint}
									className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
								>
									출력
								</button>
							</div>

							{/* 기록 양식 내용 */}
							<div className="p-4">
								<div ref={printRef} className="print-container">
									{/* 헤더 */}
									<div className="mb-4 text-xs text-right">
										노인장기요양보험법 시행규칙 [별지 제16호서식] &lt;개정 2019. 9. 27&gt;
									</div>
									<div className="mb-4 text-xs text-right">
										(앞쪽)
									</div>
									<div className="mb-4 text-lg font-bold text-center">
										장기요양급여 제공기록지(시설급여/단기보호)
									</div>

									{/* 수급자 정보 */}
									<div className="grid grid-cols-4 gap-2 mb-4 text-sm">
										<div className="flex items-center gap-2">
											<span className="font-semibold">수급자 성명:</span>
											<span className="flex-1 text-center border-b border-black">{selectedMember?.P_NM || ''}</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">생년월일:</span>
											<span className="flex-1 text-center border-b border-black">{selectedMember?.P_BRDT ? selectedMember.P_BRDT.substring(0, 10) : ''}</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">장기요양등급:</span>
											<span className="flex-1 text-center border-b border-black">{selectedMember?.P_GRD ? `${selectedMember.P_GRD}등급` : ''}</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">장기요양인정번호:</span>
											<span className="flex-1 text-center border-b border-black">{selectedMember?.P_CERTNO || ''}</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">장기요양기관명:</span>
											<span className="flex-1 text-center border-b border-black">너싱홈 해원</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">장기요양기관기호:</span>
											<span className="flex-1 text-center border-b border-black">14161000067</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">침실:</span>
											<span className="flex-1 text-center border-b border-black">{selectedMember?.P_ROOM || ''}</span>
										</div>
									</div>

									{/* 수급자 상태 */}
									<div className="mb-4 space-y-2 text-sm">
										<div className="font-semibold">수급자 상태</div>
										<div className="flex items-center gap-4">
											<span className="font-semibold">이동상태:</span>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={status === '와상'} readOnly className="w-4 h-4" />
												<span>와상</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={status === '준와상'} readOnly className="w-4 h-4" />
												<span>준와상</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={status === '자립'} readOnly className="w-4 h-4" />
												<span>자립</span>
											</label>
										</div>
										<div className="flex flex-wrap items-center gap-4">
											<span className="font-semibold">질병:</span>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={dementia} readOnly className="w-4 h-4" />
												<span>치매</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={stroke} readOnly className="w-4 h-4" />
												<span>중풍</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={hypertension} readOnly className="w-4 h-4" />
												<span>고혈압</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={diabetes} readOnly className="w-4 h-4" />
												<span>당뇨</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={arthritis} readOnly className="w-4 h-4" />
												<span>관절염</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={otherDisease} readOnly className="w-4 h-4" />
												<span>기타(</span>
											</label>
											<span className="w-20 border-b border-black">{otherDiseaseText}</span>
											<span>)</span>
										</div>
										<div className="flex flex-wrap items-center gap-4">
											<span className="font-semibold">보조:</span>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={tracheostomy} readOnly className="w-4 h-4" />
												<span>기관지절개관</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={dentures} readOnly className="w-4 h-4" />
												<span>틀니(부분/전체)</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={nasogastricTube} readOnly className="w-4 h-4" />
												<span>비위관(鼻胃管, L-tube)</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={urinaryCatheter} readOnly className="w-4 h-4" />
												<span>고정소변배출관(유치도뇨관)</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={cystostomy} readOnly className="w-4 h-4" />
												<span>방광루</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={urostomy} readOnly className="w-4 h-4" />
												<span>요루(요도샛길)</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={colostomy} readOnly className="w-4 h-4" />
												<span>장루(창자샛길)</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={diaper} readOnly className="w-4 h-4" />
												<span>기저귀</span>
											</label>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={pressureSore} readOnly className="w-4 h-4" />
												<span>욕창(부위:</span>
											</label>
											<span className="w-20 border-b border-black">{pressureSoreArea}</span>
											<span>)</span>
											<label className="flex items-center gap-1">
												<input type="checkbox" checked={pressureSorePrevention} readOnly className="w-4 h-4" />
												<span>욕창방지 보조도구(</span>
											</label>
											<span className="w-20 border-b border-black">{pressureSorePreventionTool}</span>
											<span>)</span>
										</div>
									</div>

									{/* 날짜 헤더 */}
									<div className="mb-2 text-sm">
										<span className="font-semibold">({year})년</span>
										<span className="ml-4">월/</span>
										{weekDates.map((date, idx) => (
											<span key={idx} className="ml-2">{date}</span>
										))}
									</div>

									{/* 7일치 기록 테이블 */}
									<table className="w-full text-xs border border-black" style={{ fontSize: '9pt' }}>
										<thead>
											<tr>
												<th className="p-1 text-left bg-gray-100 border border-black" style={{ width: '15%' }}>구분</th>
												{weekDates.map((date, idx) => (
													<th key={idx} className="p-1 border border-black" style={{ width: '12%' }}>{date}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{/* 신체활동지원 */}
											<tr>
												<td colSpan={8} className="p-1 font-semibold text-left bg-gray-100 border border-black">1. 신체활동지원</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">세면, 구강, 머리감기, 몸단장, 옷 갈아입히기</td>
												{dailyRecords.grooming.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">목욕 소요시간(분)</td>
												{dailyRecords.bathTime.map((time, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{time}</span>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">목욕 방법</td>
												{dailyRecords.bathMethod.map((method, idx) => (
													<td key={idx} className="p-1 text-xs border border-black">
														<div className="flex flex-col gap-1">
															<label className="flex items-center gap-1">
																<input type="radio" checked={method === '전신입욕'} readOnly className="w-3 h-3" />
																<span>전신입욕</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="radio" checked={method === '샤워식'} readOnly className="w-3 h-3" />
																<span>샤워식</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="radio" checked={method === '일반식'} readOnly className="w-3 h-3" />
																<span>일반식</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="radio" checked={method === '죽'} readOnly className="w-3 h-3" />
																<span>죽</span>
															</label>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">식사 종류</td>
												{dailyRecords.mealType.map((type, idx) => (
													<td key={idx} className="p-1 text-xs border border-black">
														<div className="flex flex-col gap-1">
															<label className="flex items-center gap-1">
																<input type="radio" checked={type === '죽'} readOnly className="w-3 h-3" />
																<span>죽</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="radio" checked={type === '유동식'} readOnly className="w-3 h-3" />
																<span>유동식(미음)</span>
															</label>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">식사 섭취량</td>
												{dailyRecords.mealIntake.map((intake, idx) => (
													<td key={idx} className="p-1 text-xs border border-black">
														<div className="flex flex-col gap-1">
															<label className="flex items-center gap-1">
																<input type="radio" checked={intake === '1'} readOnly className="w-3 h-3" />
																<span>1</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="radio" checked={intake === '1/2이상'} readOnly className="w-3 h-3" />
																<span>1/2이상</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="radio" checked={intake === '1/2미만'} readOnly className="w-3 h-3" />
																<span>1/2미만</span>
															</label>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">체위변경(2시간마다)</td>
												{dailyRecords.positionChange.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">화장실이용하기(기저귀 교환)(회)</td>
												{dailyRecords.toiletUsage.map((usage, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{usage}</span>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">이동도움 및 신체기능유지ㆍ증진</td>
												{dailyRecords.movementAssistance.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">산책(외출)동행</td>
												{dailyRecords.walk.map((walk, idx) => (
													<td key={idx} className="p-1 text-xs border border-black">
														<div className="flex flex-col gap-1">
															<label className="flex items-center gap-1">
																<input type="checkbox" checked={walk} readOnly className="w-3 h-3" />
																<span>산책</span>
															</label>
															<label className="flex items-center gap-1">
																<input type="checkbox" checked={dailyRecords.outing[idx]} readOnly className="w-3 h-3" />
																<span>외출</span>
															</label>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">특이사항</td>
												<td colSpan={7} className="p-1 border border-black">
													<span className="inline-block w-full text-left border-b border-black">{dailyRecords.physicalActivityNotes}</span>
												</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">작성자 성명(서명)</td>
												{dailyRecords.physicalActivityPreparer.map((name, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{name}</span>
													</td>
												))}
											</tr>

											{/* 인지관리및의사소통 */}
											<tr>
												<td colSpan={8} className="p-1 font-semibold text-left bg-gray-100 border border-black">2. 인지관리및의사소통</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">인지관리지원</td>
												{dailyRecords.cognitiveSupport.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">의사소통도움 등 발빛, 격려</td>
												{dailyRecords.communicationSupport.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">특이사항</td>
												<td colSpan={7} className="p-1 border border-black">
													<span className="inline-block w-full text-left border-b border-black">{dailyRecords.cognitiveNotes}</span>
												</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">작성자 성명(서명)</td>
												{dailyRecords.cognitivePreparer.map((name, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{name}</span>
													</td>
												))}
											</tr>

											{/* 건강및간호관리 */}
											<tr>
												<td colSpan={8} className="p-1 font-semibold text-left bg-gray-100 border border-black">3. 건강및간호관리</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">혈압/체온</td>
												{dailyRecords.vitalSigns.map((vital, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{vital}</span>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">건강관리(분)</td>
												{dailyRecords.healthManagementTime.map((time, idx) => (
													<td key={idx} className="p-1 border border-black">
														<div className="flex items-center gap-1">
															<span className="flex-1 inline-block text-center border-b border-black">{time}</span>
															<input type="checkbox" checked={dailyRecords.healthManagement[idx]} readOnly className="w-3 h-3" />
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">간호관리(분)</td>
												{dailyRecords.nursingManagementTime.map((time, idx) => (
													<td key={idx} className="p-1 border border-black">
														<div className="flex items-center gap-1">
															<span className="flex-1 inline-block text-center border-b border-black">{time}</span>
															<input type="checkbox" checked={dailyRecords.nursingManagement[idx]} readOnly className="w-3 h-3" />
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">기타(응급서비스)</td>
												{dailyRecords.emergencyService.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">특이사항</td>
												<td colSpan={7} className="p-1 border border-black">
													<span className="inline-block w-full text-left border-b border-black">{dailyRecords.healthNotes}</span>
												</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">작성자 성명(서명)</td>
												{dailyRecords.healthPreparer.map((name, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{name}</span>
													</td>
												))}
											</tr>

											{/* 기능회복훈련 */}
											<tr>
												<td colSpan={8} className="p-1 font-semibold text-left bg-gray-100 border border-black">4. 기능회복훈련</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">신체·인지기능 향상 프로그램</td>
												<td colSpan={7} className="p-1 text-xs border border-black">
													신체기능·기본동작, 일상생활동작훈련
												</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">신체기능·기본동작, 일상생활동작훈련</td>
												{dailyRecords.physicalFunctionTraining.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">인지기능 향상훈련</td>
												{dailyRecords.cognitiveTraining.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">물리(작업)치료</td>
												{dailyRecords.physicalTherapy.map((checked, idx) => (
													<td key={idx} className="p-1 border border-black">
														<input type="checkbox" checked={checked} readOnly className="w-3 h-3" />
													</td>
												))}
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">특이사항</td>
												<td colSpan={7} className="p-1 border border-black">
													<span className="inline-block w-full text-left border-b border-black">{dailyRecords.trainingNotes}</span>
												</td>
											</tr>
											<tr>
												<td className="p-1 text-left border border-black">작성자 성명(서명)</td>
												{dailyRecords.trainingPreparer.map((name, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{name}</span>
													</td>
												))}
											</tr>

											{/* 입퇴소시간 */}
											<tr>
												<td className="p-1 text-left border border-black">수급자의 입·퇴소시간, 외박 및 복귀시간, 외출시간</td>
												{dailyRecords.admissionDischargeTime.map((time, idx) => (
													<td key={idx} className="p-1 border border-black">
														<span className="inline-block w-full text-center border-b border-black">{time}</span>
													</td>
												))}
											</tr>
										</tbody>
									</table>

									<div className="mt-4 text-xs text-center">
										210mm X 297mm [백상지 80g/㎡]
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
