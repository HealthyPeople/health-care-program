"use client";
import React, { useState, useEffect } from 'react';

interface MemberData {
  [key: string]: any;
}

export default function MemberContractInfo() {
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
	const [contractInfo, setContractInfo] = useState<MemberData | null>(null);
	const [contractLoading, setContractLoading] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [newContractInfo, setNewContractInfo] = useState<MemberData>({});
	const [editedContractInfo, setEditedContractInfo] = useState<MemberData | null>(null);

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
				if (result.data.length > 0 && !selectedMember) {
					setSelectedMember(result.data[0]);
				} else if (result.data.length === 0) {
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

	// USRGU 값 변환 함수
	const getUSRGULabel = (value: string | number | null | undefined): string => {
		if (!value) return '-';
		const val = String(value);
		if (val === '1') return '일반';
		if (val === '2') return '50%경감대상자';
		if (val === '3') return '국민기초생활수급권자';
		return val;
	};

	// CHGU 값 변환 함수
	const getCHGULabel = (value: string | number | null | undefined): string => {
		if (!value) return '-';
		const val = String(value);
		if (val === '1') return '카드';
		if (val === '2') return '현금';
		return val;
	};

	// F10110 테이블에서 계약 정보 조회
	const fetchContractInfo = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setContractInfo(null);
			return;
		}

		setContractLoading(true);
		try {
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						SELECT TOP 1
							[ANCD], [PNUM], [CDT], [SVSDT], [SVEDT],
							[INSPER], [USRPER], [USRGU], [USRINFO],
							[EAMT], [ETAMT], [ESAMT],
							[CHGU], [INDT], [ETC], [INEMPNO], [INEMPNM]
						FROM [돌봄시설DB].[dbo].[F10110]
						WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
						ORDER BY [INDT] DESC
					`,
					params: { ANCD: String(ancd), PNUM: String(pnum) }
				})
			});

			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
				setContractInfo(result.data[0]);
			} else {
				setContractInfo(null);
			}
		} catch (err) {
			console.error('계약 정보 조회 오류:', err);
			setContractInfo(null);
		} finally {
			setContractLoading(false);
		}
	};

	// 클라이언트 측 추가 필터링 (서버에서 이미 이름으로 필터링됨)
	// 모든 필터 조건을 AND로 결합하여 적용
	const filteredMembers = members.filter(member => {
		// 상태 필터링
		if (selectedStatus) {
			const memberStatus = String(member.P_ST || '').trim();
			if (selectedStatus === '입소' && memberStatus !== '1') {
				return false;
			}
			if (selectedStatus === '퇴소' && memberStatus !== '9') {
				return false;
			}
		}
		
		// 등급 필터링
		if (selectedGrade) {
			const memberGrade = String(member.P_GRD || '').trim();
			const selectedGradeTrimmed = String(selectedGrade).trim();
			if (memberGrade !== selectedGradeTrimmed) {
				return false;
			}
		}
		
		// 층수 필터링
		if (selectedFloor) {
			const memberFloor = String(member.P_FLOOR || '').trim();
			const selectedFloorTrimmed = String(selectedFloor).trim();
			if (memberFloor !== selectedFloorTrimmed) {
				return false;
			}
		}
		
		// 검색어 필터링 (검색어가 있을 때만 적용)
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
		
		// 모든 필터 조건을 통과한 경우만 true 반환
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

	// 검색어가 변경될 때 페이지를 1로 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor]);

	// 선택된 수급자가 변경될 때 계약 정보 조회
	useEffect(() => {
		if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
			fetchContractInfo(selectedMember.ANCD, selectedMember.PNUM);
		} else {
			setContractInfo(null);
		}
		setIsCreating(false);
		setIsEditing(false);
		setNewContractInfo({});
		setEditedContractInfo(null);
	}, [selectedMember]);

	// 계약정보 생성 버튼 클릭
	const handleCreateClick = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		setIsCreating(true);
		// F10010의 P_CTDT를 초기 계약일자로 설정
		const initialContractDate = selectedMember.P_CTDT 
			? selectedMember.P_CTDT.substring(0, 10)
			: '';
		setNewContractInfo({
			ANCD: selectedMember.ANCD,
			PNUM: selectedMember.PNUM,
			CDT: initialContractDate
		});
		setIsEditing(false);
		setEditedContractInfo(null);
	};

	// 계약정보 생성 취소
	const handleCreateCancel = () => {
		setIsCreating(false);
		setNewContractInfo({});
	};

	// 계약정보 생성 저장
	const handleCreateSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		setContractLoading(true);
		try {
			// 현재 날짜/시간
			const now = new Date();
			const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

			// 날짜 형식 변환 함수
			const formatDate = (dateStr: string | undefined): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					const date = new Date(dateStr);
					if (isNaN(date.getTime())) return null;
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day} 00:00:00`;
				} catch (err) {
					return null;
				}
			};

			const contractDate = formatDate(newContractInfo.CDT);

			// F10110 INSERT 쿼리
			const insertQuery = `
				INSERT INTO [돌봄시설DB].[dbo].[F10110] (
					[ANCD], [PNUM], [CDT], [SVSDT], [SVEDT],
					[INSPER], [USRPER], [USRGU], [USRINFO],
					[EAMT], [ETAMT], [ESAMT],
					[CHGU], [INDT], [ETC], [INEMPNO], [INEMPNM]
				) VALUES (
					@ANCD, @PNUM, @CDT, @SVSDT, @SVEDT,
					@INSPER, @USRPER, @USRGU, @USRINFO,
					@EAMT, @ETAMT, @ESAMT,
					@CHGU, @INDT, @ETC, @INEMPNO, @INEMPNM
				)
			`;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				CDT: contractDate,
				SVSDT: formatDate(newContractInfo.SVSDT),
				SVEDT: formatDate(newContractInfo.SVEDT),
				INSPER: newContractInfo.INSPER ? parseFloat(newContractInfo.INSPER) : null,
				USRPER: newContractInfo.USRPER ? parseFloat(newContractInfo.USRPER) : null,
				USRGU: newContractInfo.USRGU || null,
				USRINFO: newContractInfo.USRINFO?.trim() || null,
				EAMT: newContractInfo.EAMT ? parseFloat(newContractInfo.EAMT) : null,
				ETAMT: newContractInfo.ETAMT ? parseFloat(newContractInfo.ETAMT) : null,
				ESAMT: newContractInfo.ESAMT ? parseFloat(newContractInfo.ESAMT) : null,
				CHGU: newContractInfo.CHGU || null,
				INDT: nowStr,
				ETC: newContractInfo.ETC?.trim() || null,
				INEMPNO: newContractInfo.INEMPNO?.trim() || null,
				INEMPNM: newContractInfo.INEMPNM?.trim() || null
			};

			// F10110 저장
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: insertQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				// F10010의 P_CTDT 업데이트
				if (contractDate) {
					const updateF10010Query = `
						UPDATE [돌봄시설DB].[dbo].[F10010]
						SET [P_CTDT] = @P_CTDT
						WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
					`;

					const updateParams = {
						ANCD: selectedMember.ANCD,
						PNUM: selectedMember.PNUM,
						P_CTDT: contractDate
					};

					await fetch('/api/f10010', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ query: updateF10010Query, params: updateParams })
					});
				}

				alert('계약정보가 생성되었습니다.');
				setIsCreating(false);
				setNewContractInfo({});
				// 수급자 목록과 계약정보 다시 조회
				await fetchMembers();
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchContractInfo(selectedMember.ANCD, selectedMember.PNUM);
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('계약정보 생성 실패:', result);
				alert(`계약정보 생성 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('계약정보 생성 오류:', err);
			alert('계약정보 생성 중 오류가 발생했습니다.');
		} finally {
			setContractLoading(false);
		}
	};

	// 계약정보 수정 버튼 클릭
	const handleEditClick = () => {
		if (!contractInfo) return;
		setIsEditing(true);
		// F10010의 P_CTDT를 계약일자로 사용 (없으면 F10110의 CDT 사용)
		const contractDate = selectedMember?.P_CTDT 
			? selectedMember.P_CTDT.substring(0, 10)
			: (contractInfo.CDT ? contractInfo.CDT.substring(0, 10) : '');
		setEditedContractInfo({ 
			...contractInfo,
			CDT: contractDate
		});
		setIsCreating(false);
		setNewContractInfo({});
	};

	// 계약정보 수정 취소
	const handleEditCancel = () => {
		setIsEditing(false);
		setEditedContractInfo(null);
	};

	// 계약정보 수정 저장
	const handleEditSave = async () => {
		if (!editedContractInfo || !selectedMember) return;

		setContractLoading(true);
		try {
			// 날짜 형식 변환 함수
			const formatDate = (dateStr: string | undefined): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					const date = new Date(dateStr);
					if (isNaN(date.getTime())) return null;
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day} 00:00:00`;
				} catch (err) {
					return null;
				}
			};

			// UPDATE 쿼리 생성
			const updateQuery = `
				UPDATE [돌봄시설DB].[dbo].[F10110]
				SET 
					[CDT] = @CDT,
					[SVSDT] = @SVSDT,
					[SVEDT] = @SVEDT,
					[INSPER] = @INSPER,
					[USRPER] = @USRPER,
					[USRGU] = @USRGU,
					[USRINFO] = @USRINFO,
					[EAMT] = @EAMT,
					[ETAMT] = @ETAMT,
					[ESAMT] = @ESAMT,
					[CHGU] = @CHGU,
					[ETC] = @ETC,
					[INEMPNO] = @INEMPNO,
					[INEMPNM] = @INEMPNM
				WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [INDT] = @INDT
			`;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				INDT: editedContractInfo.INDT,
				CDT: formatDate(editedContractInfo.CDT),
				SVSDT: formatDate(editedContractInfo.SVSDT),
				SVEDT: formatDate(editedContractInfo.SVEDT),
				INSPER: editedContractInfo.INSPER ? parseFloat(editedContractInfo.INSPER) : null,
				USRPER: editedContractInfo.USRPER ? parseFloat(editedContractInfo.USRPER) : null,
				USRGU: editedContractInfo.USRGU || null,
				USRINFO: editedContractInfo.USRINFO?.trim() || null,
				EAMT: editedContractInfo.EAMT ? parseFloat(editedContractInfo.EAMT) : null,
				ETAMT: editedContractInfo.ETAMT ? parseFloat(editedContractInfo.ETAMT) : null,
				ESAMT: editedContractInfo.ESAMT ? parseFloat(editedContractInfo.ESAMT) : null,
				CHGU: editedContractInfo.CHGU || null,
				ETC: editedContractInfo.ETC?.trim() || null,
				INEMPNO: editedContractInfo.INEMPNO?.trim() || null,
				INEMPNM: editedContractInfo.INEMPNM?.trim() || null
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: updateQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert('계약정보가 수정되었습니다.');
				setIsEditing(false);
				setEditedContractInfo(null);
				// 계약정보 다시 조회
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchContractInfo(selectedMember.ANCD, selectedMember.PNUM);
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('계약정보 수정 실패:', result);
				alert(`계약정보 수정 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('계약정보 수정 오류:', err);
			alert('계약정보 수정 중 오류가 발생했습니다.');
		} finally {
			setContractLoading(false);
		}
	};

	// 계약정보 삭제
	const handleDelete = async () => {
		if (!contractInfo || !selectedMember) return;

		if (confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			setContractLoading(true);
			try {
				const deleteQuery = `
					DELETE FROM [돌봄시설DB].[dbo].[F10110]
					WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [INDT] = @INDT
				`;

				const params = {
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM,
					INDT: contractInfo.INDT
				};

				const response = await fetch('/api/f10010', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: deleteQuery, params })
				});

				const result = await response.json();

				if (result && result.success) {
					alert('계약정보가 삭제되었습니다.');
					setContractInfo(null);
					setIsEditing(false);
					setEditedContractInfo(null);
				} else {
					const errorMessage = result?.error || result?.details || '알 수 없는 오류';
					console.error('계약정보 삭제 실패:', result);
					alert(`계약정보 삭제 실패: ${errorMessage}`);
				}
			} catch (err) {
				console.error('계약정보 삭제 오류:', err);
				alert('계약정보 삭제 중 오류가 발생했습니다.');
			} finally {
				setContractLoading(false);
			}
		}
	};

	const handleNewContractFieldChange = (field: string, value: any) => {
		setNewContractInfo({ ...newContractInfo, [field]: value });
	};

	const handleEditedContractFieldChange = (field: string, value: any) => {
		if (editedContractInfo) {
			setEditedContractInfo({ ...editedContractInfo, [field]: value });
		}
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1200px] p-4">
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
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded text-blue-900"
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
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded text-blue-900"
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
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded text-blue-900"
									>
										<option value="">층수 전체</option>
										{/* 동적으로 층수 목록 생성 */}
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

					{/* 우측: 계약정보 상세 영역 */}
					<section className="flex-1 space-y-4">
						{/* 계약정보 카드 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
							<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
								<h2 className="text-xl font-semibold text-blue-900">계약정보</h2>
								<div className="flex items-center gap-2">
									{!contractInfo && !isCreating ? (
										<button 
											onClick={handleCreateClick}
											className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900"
										>
											계약정보 생성
										</button>
									) : contractInfo && !isEditing ? (
										<button 
											onClick={handleEditClick}
											className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900"
										>
											수정 및 삭제
										</button>
									) : null}
									{isCreating && (
										<>
											<button 
												onClick={handleCreateSave}
												disabled={contractLoading}
												className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 disabled:opacity-50"
											>
												{contractLoading ? '저장 중...' : '저장'}
											</button>
											<button 
												onClick={handleCreateCancel}
												className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
											>
												취소
											</button>
										</>
									)}
									{isEditing && editedContractInfo && (
										<>
											<button 
												onClick={handleEditSave}
												disabled={contractLoading}
												className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 disabled:opacity-50"
											>
												{contractLoading ? '저장 중...' : '저장'}
											</button>
											<button 
												onClick={handleEditCancel}
												className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
											>
												취소
											</button>
											<button 
												onClick={handleDelete}
												disabled={contractLoading}
												className="px-3 py-1 text-sm border border-red-400 rounded bg-red-200 hover:bg-red-300 text-red-900 disabled:opacity-50"
											>
												삭제
											</button>
										</>
									)}
								</div>
							</div>

							<div className="p-4">
								<div className="grid grid-cols-12 gap-4">
									{/* 입력 필드 영역 */}
									<div className="col-span-12 grid grid-cols-12 gap-3">
										{contractLoading ? (
											<div className="col-span-12 text-center py-4 text-blue-900/60">계약 정보 로딩 중...</div>
										) : isCreating ? (
											<>
												{/* 계약정보 생성 폼 */}
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자명</label>
													<input className="w-full border border-blue-300 rounded px-2 py-1 bg-white" value={selectedMember?.P_NM || ''} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약일자</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.CDT || ''}
														onChange={(e) => handleNewContractFieldChange('CDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 시작일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.SVSDT || ''}
														onChange={(e) => handleNewContractFieldChange('SVSDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 종료일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.SVEDT || ''}
														onChange={(e) => handleNewContractFieldChange('SVEDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">보험자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.INSPER || ''}
														onChange={(e) => handleNewContractFieldChange('INSPER', e.target.value)}
														placeholder="예: 80"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.USRPER || ''}
														onChange={(e) => handleNewContractFieldChange('USRPER', e.target.value)}
														placeholder="예: 20"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 구분</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={newContractInfo.USRGU || ''}
														onChange={(e) => handleNewContractFieldChange('USRGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">일반</option>
														<option value="2">50%경감대상자</option>
														<option value="3">국민기초생활수급권자</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 내용</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.USRINFO || ''}
														onChange={(e) => handleNewContractFieldChange('USRINFO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">기본급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.EAMT || ''}
														onChange={(e) => handleNewContractFieldChange('EAMT', e.target.value)}
														placeholder="원"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">추가급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.ETAMT || ''}
														onChange={(e) => handleNewContractFieldChange('ETAMT', e.target.value)}
														placeholder="원"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">특별급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.ESAMT || ''}
														onChange={(e) => handleNewContractFieldChange('ESAMT', e.target.value)}
														placeholder="원"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">결제방법</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={newContractInfo.CHGU || ''}
														onChange={(e) => handleNewContractFieldChange('CHGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">카드</option>
														<option value="2">현금</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원번호</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.INEMPNO || ''}
														onChange={(e) => handleNewContractFieldChange('INEMPNO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원명</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.INEMPNM || ''}
														onChange={(e) => handleNewContractFieldChange('INEMPNM', e.target.value)}
													/>
												</div>
												<div className="col-span-12 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">비고</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.ETC || ''}
														onChange={(e) => handleNewContractFieldChange('ETC', e.target.value)}
													/>
												</div>
											</>
										) : isEditing && editedContractInfo ? (
											<>
												{/* 계약정보 수정 폼 */}
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자명</label>
													<input className="w-full border border-blue-300 rounded px-2 py-1 bg-white" value={selectedMember?.P_NM || ''} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약일자</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.CDT ? editedContractInfo.CDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('CDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 시작일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.SVSDT ? editedContractInfo.SVSDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('SVSDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 종료일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.SVEDT ? editedContractInfo.SVEDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('SVEDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">보험자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.INSPER || ''}
														onChange={(e) => handleEditedContractFieldChange('INSPER', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.USRPER || ''}
														onChange={(e) => handleEditedContractFieldChange('USRPER', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 구분</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={editedContractInfo.USRGU || ''}
														onChange={(e) => handleEditedContractFieldChange('USRGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">일반</option>
														<option value="2">50%경감대상자</option>
														<option value="3">국민기초생활수급권자</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 내용</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.USRINFO || ''}
														onChange={(e) => handleEditedContractFieldChange('USRINFO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">기본급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.EAMT || ''}
														onChange={(e) => handleEditedContractFieldChange('EAMT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">추가급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.ETAMT || ''}
														onChange={(e) => handleEditedContractFieldChange('ETAMT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">특별급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.ESAMT || ''}
														onChange={(e) => handleEditedContractFieldChange('ESAMT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">결제방법</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={editedContractInfo.CHGU || ''}
														onChange={(e) => handleEditedContractFieldChange('CHGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">카드</option>
														<option value="2">현금</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원번호</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.INEMPNO || ''}
														onChange={(e) => handleEditedContractFieldChange('INEMPNO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원명</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.INEMPNM || ''}
														onChange={(e) => handleEditedContractFieldChange('INEMPNM', e.target.value)}
													/>
												</div>
												<div className="col-span-12 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">비고</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.ETC || ''}
														onChange={(e) => handleEditedContractFieldChange('ETC', e.target.value)}
													/>
												</div>
											</>
										) : !contractInfo ? (
											<div className="col-span-12 text-center py-4 text-blue-900/60">계약 정보가 없습니다</div>
										) : (
											<>
												{/* 계약정보 조회 모드 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자명</label>
													<input className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" value={selectedMember?.P_NM || ''} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약일자</label>
													<input 
														type="date" 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={
															selectedMember?.P_CTDT 
																? selectedMember.P_CTDT.substring(0, 10)
																: (contractInfo.CDT ? contractInfo.CDT.substring(0, 10) : '')
														}
														readOnly
													/>
												</div>

												{/* 2행 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">보험자 부담율</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.INSPER ? `${contractInfo.INSPER}%` : ''}
														readOnly
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.USRPER ? `${contractInfo.USRPER}%` : ''}
														readOnly
													/>
												</div>

												{/* 3행 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 구분</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={getUSRGULabel(contractInfo.USRGU)}
														readOnly
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약기간</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={
															contractInfo.SVSDT && contractInfo.SVEDT
																? `${contractInfo.SVSDT.substring(0, 10)} ~ ${contractInfo.SVEDT.substring(0, 10)}`
																: contractInfo.SVSDT
																	? `${contractInfo.SVSDT.substring(0, 10)} ~`
																	: ''
														}
														readOnly
													/>
												</div>

												{/* 4행 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.INEMPNM || ''}
														readOnly
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">비고</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.ETC || ''}
														readOnly
													/>
												</div>
											</>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* 하단 2컬럼 카드: 요양급여 상세 / 부담금 정보 */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* 요양급여 상세 */}
							<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
								<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
									<h3 className="text-lg font-semibold text-blue-900">요양급여 상세</h3>
									{/* <button className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900">상세보기</button> */}
								</div>
								<div className="p-4 space-y-2 text-sm">
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">기본급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.EAMT ? `${Number(contractInfo.EAMT).toLocaleString()}원` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">추가급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.ETAMT ? `${Number(contractInfo.ETAMT).toLocaleString()}원` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">특별급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.ESAMT ? `${Number(contractInfo.ESAMT).toLocaleString()}원` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">총급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo ? 
												`${(Number(contractInfo.EAMT || 0) + Number(contractInfo.ETAMT || 0) + Number(contractInfo.ESAMT || 0)).toLocaleString()}원`
												: '-'
											}
										</span>
									</div>
								</div>
							</div>

							{/* 부담금 정보 */}
							<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
								<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
									<h3 className="text-lg font-semibold text-blue-900">부담금 정보</h3>
									{/* <button className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900">부담금 관리</button> */}
								</div>
								<div className="p-4 space-y-2 text-sm">
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">본인부담률</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.USRPER ? `${contractInfo.USRPER}%` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">부담금액</span>
										<span className="flex-1 border-b border-blue-200">-</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">수급자 내용</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.USRINFO || '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">결제방법</span>
										<span className="flex-1 border-b border-blue-200">
											{getCHGULabel(contractInfo?.CHGU)}
										</span>
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
