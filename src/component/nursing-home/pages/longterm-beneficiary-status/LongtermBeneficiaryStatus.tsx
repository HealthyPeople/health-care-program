"use client";

import { useState, useEffect } from 'react';

interface MemberData {
	[key: string]: any;
}

export default function LongtermBeneficiaryStatus() {
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

	// 상태 관련 state
	const [status, setStatus] = useState<'와상' | '준와상' | '자립'>('준와상');

	// 질병 관련 state
	const [dementia, setDementia] = useState(true);
	const [stroke, setStroke] = useState(true);
	const [hypertension, setHypertension] = useState(true);
	const [diabetes, setDiabetes] = useState(true);
	const [arthritis, setArthritis] = useState(true);
	const [otherDisease, setOtherDisease] = useState(false);
	const [otherDiseaseText, setOtherDiseaseText] = useState('');

	// 보조 관련 state
	const [tracheostomy, setTracheostomy] = useState(true);
	const [dentures, setDentures] = useState(true);
	const [denturesType, setDenturesType] = useState<'부분' | '전체'>('부분');
	const [nasogastricTube, setNasogastricTube] = useState(true);
	const [urinaryCatheter, setUrinaryCatheter] = useState(true);
	const [cystostomy, setCystostomy] = useState(true);
	const [urostomy, setUrostomy] = useState(true);
	const [colostomy, setColostomy] = useState(true);
	const [diaper, setDiaper] = useState(true);
	const [pressureSore, setPressureSore] = useState(true);
	const [pressureSoreArea, setPressureSoreArea] = useState('');
	const [pressureSorePrevention, setPressureSorePrevention] = useState(true);
	const [pressureSorePreventionTool, setPressureSorePreventionTool] = useState('');

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

	const handleSave = () => {
		// TODO: API 호출 등 실제 저장 로직 구현
		console.log({
			status,
			dementia,
			stroke,
			hypertension,
			diabetes,
			arthritis,
			otherDisease,
			otherDiseaseText,
			tracheostomy,
			dentures,
			denturesType,
			nasogastricTube,
			urinaryCatheter,
			cystostomy,
			urostomy,
			colostomy,
			diaper,
			pressureSore,
			pressureSoreArea,
			pressureSorePrevention,
			pressureSorePreventionTool
		});
		alert('수급자 현황이 저장되었습니다.');
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

					{/* 우측: 수급자 현황 입력 */}
					<section className="flex-1">
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">수급자 현황</h2>
							</div>

							<div className="p-4 space-y-4">
								{/* 상태 섹션 */}
								<div className="space-y-2">
									<button className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										상태
									</button>
									<div className="flex items-center gap-4">
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="status"
												value="와상"
												checked={status === '와상'}
												onChange={(e) => setStatus(e.target.value as '와상' | '준와상' | '자립')}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">와상</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="status"
												value="준와상"
												checked={status === '준와상'}
												onChange={(e) => setStatus(e.target.value as '와상' | '준와상' | '자립')}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">준와상</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="status"
												value="자립"
												checked={status === '자립'}
												onChange={(e) => setStatus(e.target.value as '와상' | '준와상' | '자립')}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">자립</span>
										</label>
									</div>
								</div>

								{/* 질병 섹션 */}
								<div className="space-y-2">
									<button className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										질병
									</button>
									<div className="flex flex-wrap items-center gap-4">
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={dementia}
												onChange={(e) => setDementia(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">치매</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={stroke}
												onChange={(e) => setStroke(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">중풍</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={hypertension}
												onChange={(e) => setHypertension(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">고혈압</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={diabetes}
												onChange={(e) => setDiabetes(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">당뇨</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={arthritis}
												onChange={(e) => setArthritis(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">관절염</span>
										</label>
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={otherDisease}
													onChange={(e) => setOtherDisease(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기타</span>
											</label>
											<input
												type="text"
												value={otherDiseaseText}
												onChange={(e) => setOtherDiseaseText(e.target.value)}
												disabled={!otherDisease}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="기타 질병 입력"
											/>
										</div>
									</div>
								</div>

								{/* 보조 섹션 */}
								<div className="space-y-2">
									<button className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										보조
									</button>
									<div className="space-y-2">
										{/* 기관지절개관 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={tracheostomy}
													onChange={(e) => setTracheostomy(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기관지절개관</span>
											</label>
										</div>

										{/* 틀니 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={dentures}
													onChange={(e) => setDentures(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">틀니</span>
											</label>
											{dentures && (
												<div className="flex items-center gap-3 ml-4">
													<label className="flex items-center gap-1 cursor-pointer">
														<input
															type="radio"
															name="denturesType"
															value="부분"
															checked={denturesType === '부분'}
															onChange={(e) => setDenturesType(e.target.value as '부분' | '전체')}
															className="w-4 h-4 border border-blue-300"
														/>
														<span className="text-sm text-blue-900">부분</span>
													</label>
													<label className="flex items-center gap-1 cursor-pointer">
														<input
															type="radio"
															name="denturesType"
															value="전체"
															checked={denturesType === '전체'}
															onChange={(e) => setDenturesType(e.target.value as '부분' | '전체')}
															className="w-4 h-4 border border-blue-300"
														/>
														<span className="text-sm text-blue-900">전체</span>
													</label>
												</div>
											)}
										</div>

										{/* 비위관(L-tube) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={nasogastricTube}
													onChange={(e) => setNasogastricTube(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">비위관(L-tube)</span>
											</label>
										</div>

										{/* 고정소변배출관(유치도뇨관) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={urinaryCatheter}
													onChange={(e) => setUrinaryCatheter(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">고정소변배출관(유치도뇨관)</span>
											</label>
										</div>

										{/* 방광루 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={cystostomy}
													onChange={(e) => setCystostomy(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">방광루</span>
											</label>
										</div>

										{/* 요루(요도샛길) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={urostomy}
													onChange={(e) => setUrostomy(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">요루(요도샛길)</span>
											</label>
										</div>

										{/* 장루(창자샛길) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={colostomy}
													onChange={(e) => setColostomy(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">장루(창자샛길)</span>
											</label>
										</div>

										{/* 기저귀 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={diaper}
													onChange={(e) => setDiaper(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기저귀</span>
											</label>
										</div>

										{/* 욕창(부위: */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={pressureSore}
													onChange={(e) => setPressureSore(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">욕창(부위:</span>
											</label>
											<input
												type="text"
												value={pressureSoreArea}
												onChange={(e) => setPressureSoreArea(e.target.value)}
												disabled={!pressureSore}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="욕창 부위 입력"
											/>
										</div>

										{/* 욕창방지 보조도구( */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={pressureSorePrevention}
													onChange={(e) => setPressureSorePrevention(e.target.checked)}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">욕창방지 보조도구(</span>
											</label>
											<input
												type="text"
												value={pressureSorePreventionTool}
												onChange={(e) => setPressureSorePreventionTool(e.target.value)}
												disabled={!pressureSorePrevention}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="보조도구 입력"
											/>
											<span className="text-sm text-blue-900">)</span>
										</div>
									</div>
								</div>

								{/* 저장 버튼 */}
								<div className="pt-4">
									<button
										onClick={handleSave}
										className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									>
										저장
									</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
