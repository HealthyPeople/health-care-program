"use client";

import { useState, useEffect } from 'react';

interface MemberData {
	[key: string]: any;
}

export default function SnackBulkRegistration() {
	// 수급자 목록 관련 state
	const [members, setMembers] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 간식 정보 관련 state
	const [morningSnackEnabled, setMorningSnackEnabled] = useState(true);
	const [morningSnackStatus, setMorningSnackStatus] = useState('');
	const [morningSnackItem, setMorningSnackItem] = useState('');
	const [afternoonSnackEnabled, setAfternoonSnackEnabled] = useState(true);
	const [afternoonSnackStatus, setAfternoonSnackStatus] = useState('양호');
	const [afternoonSnackItem, setAfternoonSnackItem] = useState('');
	const [mealNotes, setMealNotes] = useState('');

	// 오늘 날짜 가져오기
	const getTodayDate = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// 모달 관련 state
	const [showModal, setShowModal] = useState(false);
	const [modalMealDate, setModalMealDate] = useState(getTodayDate());
	const [modalMorningSnack, setModalMorningSnack] = useState('');
	const [modalAfternoonSnack, setModalAfternoonSnack] = useState('');
	const [modalEveningSnack, setModalEveningSnack] = useState('');

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
			} else {
				setError(result.error || '수급자 데이터 조회 실패');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '알 수 없는 오류');
		} finally {
			setLoading(false);
		}
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

	const handleSubmit = () => {
		// 모달 열기
		setShowModal(true);
	};

	const handleCloseModal = () => {
		setShowModal(false);
	};

	const handleModalSubmit = () => {
		// 모달에서 등록 버튼 클릭 시 처리
		// TODO: API 호출 등 실제 등록 로직 구현
		console.log({
			mealDate: modalMealDate,
			morningSnack: modalMorningSnack,
			afternoonSnack: modalAfternoonSnack,
			eveningSnack: modalEveningSnack
		});
		handleCloseModal();
	};

	useEffect(() => {
		fetchMembers();
	}, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor]);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
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
													className="border-b border-blue-50 hover:bg-blue-50"
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

					{/* 우측: 간식 정보 입력 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							{/* 헤더 */}
							<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">간식정보</h2>
							</div>

							<div className="p-4 space-y-4">
								{/* 오전간식여부 */}
								<div className="flex items-center gap-2">
									<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										오전간식여부
									</label>
									<input
										type="checkbox"
										checked={morningSnackEnabled}
										onChange={(e) => setMorningSnackEnabled(e.target.checked)}
										className="w-4 h-4 border border-blue-300 rounded"
									/>
									<div className="flex items-center gap-2 ml-2">
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="morningStatus"
												value="양호"
												checked={morningSnackStatus === '양호'}
												onChange={(e) => setMorningSnackStatus(e.target.value)}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">양호</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="morningStatus"
												value="이상"
												checked={morningSnackStatus === '이상'}
												onChange={(e) => setMorningSnackStatus(e.target.value)}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">이상</span>
										</label>
									</div>
									<input
										type="text"
										value={morningSnackItem}
										onChange={(e) => setMorningSnackItem(e.target.value)}
										className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
										placeholder="간식 항목"
									/>
								</div>

								{/* 오후간식여부 */}
								<div className="flex items-center gap-2">
									<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										오후간식여부
									</label>
									<input
										type="checkbox"
										checked={afternoonSnackEnabled}
										onChange={(e) => setAfternoonSnackEnabled(e.target.checked)}
										className="w-4 h-4 border border-blue-300 rounded"
									/>
									<div className="flex items-center gap-2 ml-2">
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="afternoonStatus"
												value="양호"
												checked={afternoonSnackStatus === '양호'}
												onChange={(e) => setAfternoonSnackStatus(e.target.value)}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">양호</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="afternoonStatus"
												value="이상"
												checked={afternoonSnackStatus === '이상'}
												onChange={(e) => setAfternoonSnackStatus(e.target.value)}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">이상</span>
										</label>
									</div>
									<input
										type="text"
										value={afternoonSnackItem}
										onChange={(e) => setAfternoonSnackItem(e.target.value)}
										className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
										placeholder="간식 항목"
									/>
								</div>

								{/* 식사 특이 및 조치사항 */}
								<div className="flex flex-col gap-2">
									<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded w-fit">
										식사 특이 및 조치사항
									</label>
									<textarea
										value={mealNotes}
										onChange={(e) => setMealNotes(e.target.value)}
										className="w-full px-2 py-1 bg-white border border-blue-300 rounded min-h-[200px]"
										placeholder="식사 특이사항 및 조치사항을 입력하세요"
									/>
								</div>

								{/* 간식일괄등록 버튼 */}
								<div className="pt-4">
									<button
										onClick={handleSubmit}
										className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									>
										간식일괄등록
									</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>

			{/* 간식정보일괄 등록 모달 */}
			{showModal && (
				<div 
					className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
					onClick={handleCloseModal}
				>
					<div 
						className="w-full max-w-2xl mx-4 bg-white border border-blue-300 rounded-lg shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						{/* 모달 헤더 */}
						<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200 rounded-t-lg">
							<h3 className="text-lg font-semibold text-blue-900">간식정보일괄 등록</h3>
							<button
								onClick={handleCloseModal}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								닫기
							</button>
						</div>

						{/* 모달 내용 */}
						<div className="p-6 space-y-4">
							{/* 식사일자 */}
							<div className="flex items-center gap-2">
								<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
									식사일자
								</label>
								<input
									type="date"
									value={modalMealDate}
									onChange={(e) => setModalMealDate(e.target.value)}
									className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
								/>
							</div>

							{/* 오전 간식 */}
							<div className="flex items-center gap-2">
								<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
									오전 간식
								</label>
								<input
									type="text"
									value={modalMorningSnack}
									onChange={(e) => setModalMorningSnack(e.target.value)}
									className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
								/>
							</div>

							{/* 오후 간식 */}
							<div className="flex items-center gap-2">
								<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
									오후 간식
								</label>
								<input
									type="text"
									value={modalAfternoonSnack}
									onChange={(e) => setModalAfternoonSnack(e.target.value)}
									className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
								/>
							</div>

							{/* 저녁 간식 */}
							{/* <div className="flex items-center gap-2">
								<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
									저녁 간식
								</label>
								<input
									type="text"
									value={modalEveningSnack}
									onChange={(e) => setModalEveningSnack(e.target.value)}
									className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded"
								/>
							</div> */}

							{/* 간식일괄등록 버튼 */}
							<div className="pt-4">
								<button
									onClick={handleModalSubmit}
									className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									간식일괄등록
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

