"use client";
import React, { useState, useEffect, useRef } from 'react';

interface MemberData {
  [key: string]: any;
}

export default function MemberInfoView() {
	const [members, setMembers] = useState<MemberData[]>([]);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [isEditing, setIsEditing] = useState(false);
	const [editedMember, setEditedMember] = useState<MemberData | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [newMember, setNewMember] = useState<MemberData>({});
	const [newMemberDetailAddr, setNewMemberDetailAddr] = useState('');
	const [editedMemberDetailAddr, setEditedMemberDetailAddr] = useState('');
	const [institutions, setInstitutions] = useState<Array<{ANCD: string, ANNM: string}>>([]);
	const hasUnsavedChanges = useRef(false);

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
		if (isCreating) {
			if (Object.keys(newMember).length > 1 || newMemberDetailAddr.trim() !== '') {
				if (confirm('입력한 내용이 저장되지 않았습니다. 정말 이동하시겠습니까?')) {
					setIsCreating(false);
					setNewMember({});
					setNewMemberDetailAddr('');
					setSelectedMember(member);
					setIsEditing(false);
					setEditedMember(null);
					setEditedMemberDetailAddr('');
				}
			} else {
				setIsCreating(false);
				setNewMember({});
				setNewMemberDetailAddr('');
				setSelectedMember(member);
				setIsEditing(false);
				setEditedMember(null);
				setEditedMemberDetailAddr('');
			}
		} else if (hasUnsavedChanges.current) {
			if (confirm('수정된 내용이 저장되지 않았습니다. 정말 이동하시겠습니까?')) {
				hasUnsavedChanges.current = false;
				setIsEditing(false);
				setEditedMember(null);
				setSelectedMember(member);
			}
		} else {
			setSelectedMember(member);
			setIsEditing(false);
			setEditedMember(null);
		}
	};

	const handleEditClick = () => {
		if (selectedMember) {
			setIsEditing(true);
			setEditedMember({ ...selectedMember, selectedANCD: selectedMember.ANCD });
			hasUnsavedChanges.current = false;
		}
	};

	const handleSave = async () => {
		if (!editedMember || !selectedMember) return;
		
		setLoading(true);
		try {
			// 주소와 상세주소 합치기
			const fullAddress = editedMember.P_ADDR?.trim() 
				? (editedMember.P_ADDR.trim() + (editedMemberDetailAddr.trim() ? ' ' + editedMemberDetailAddr.trim() : ''))
				: null;

			// 날짜 형식 변환 함수
			const formatDate = (dateStr: string | undefined): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					// YYYY-MM-DD 형식을 검증하고 SQL Server 형식으로 변환
					const date = new Date(dateStr);
					if (isNaN(date.getTime())) return null;
					// YYYY-MM-DD HH:mm:ss 형식으로 변환
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day} 00:00:00`;
				} catch (err) {
					return null;
				}
			};

			// 선택한 기관의 ANCD 가져오기 (수정 시 변경 가능)
			const selectedANCD = editedMember.selectedANCD || selectedMember.ANCD;
			
			// UPDATE 쿼리 생성
			const updateQuery = `
				UPDATE [돌봄시설DB].[dbo].[F10010]
				SET 
					[ANCD] = @NEW_ANCD,
					[P_NM] = @P_NM,
					[P_BRDT] = @P_BRDT,
					[P_NO] = @P_NO,
					[P_SEX] = @P_SEX,
					[P_ZIP] = @P_ZIP,
					[P_ADDR] = @P_ADDR,
					[P_TEL] = @P_TEL,
					[P_HP] = @P_HP,
					[P_GRD] = @P_GRD,
					[P_YYNO] = @P_YYNO,
					[P_YYDT] = @P_YYDT,
					[P_ST] = @P_ST,
					[P_CINFO] = @P_CINFO,
					[P_CTDT] = @P_CTDT,
					[P_SDT] = @P_SDT,
					[P_EDT] = @P_EDT,
					[HCANUM] = @HCANUM,
					[HCAINFO] = @HCAINFO,
					[HSPT] = @HSPT,
					[DTNM] = @DTNM,
					[DTTEL] = @DTTEL,
					[ETC] = @ETC,
					[P_YYSDT] = @P_YYSDT,
					[P_YYEDT] = @P_YYEDT,
					[P_FLOOR] = @P_FLOOR
				WHERE [ANCD] = @OLD_ANCD AND [PNUM] = @PNUM
			`;
			
			const params = {
				OLD_ANCD: selectedMember.ANCD,
				NEW_ANCD: selectedANCD,
				PNUM: selectedMember.PNUM,
				P_NM: editedMember.P_NM?.trim() || null,
				P_BRDT: formatDate(editedMember.P_BRDT),
				P_NO: editedMember.P_NO?.trim() || null,
				P_SEX: editedMember.P_SEX || null,
				P_ZIP: editedMember.P_ZIP?.trim() || null,
				P_ADDR: fullAddress,
				P_TEL: editedMember.P_TEL?.trim() || null,
				P_HP: editedMember.P_HP?.trim() || null,
				P_GRD: editedMember.P_GRD?.trim() || null,
				P_YYNO: editedMember.P_YYNO?.trim() || null,
				P_YYDT: formatDate(editedMember.P_YYDT),
				P_ST: editedMember.P_ST || null,
				P_CINFO: editedMember.P_CINFO?.trim() || null,
				P_CTDT: formatDate(editedMember.P_CTDT),
				P_SDT: formatDate(editedMember.P_SDT),
				P_EDT: formatDate(editedMember.P_EDT),
				HCANUM: editedMember.HCANUM?.trim() || null,
				HCAINFO: editedMember.HCAINFO?.trim() || null,
				HSPT: editedMember.HSPT?.trim() || null,
				DTNM: editedMember.DTNM?.trim() || null,
				DTTEL: editedMember.DTTEL?.trim() || null,
				ETC: editedMember.ETC?.trim() || null,
				P_YYSDT: formatDate(editedMember.P_YYSDT),
				P_YYEDT: formatDate(editedMember.P_YYEDT),
				P_FLOOR: editedMember.P_FLOOR && editedMember.P_FLOOR !== '' ? parseInt(editedMember.P_FLOOR) : null
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: updateQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert('저장되었습니다.');
				// 목록 새로고침하여 최신 데이터 가져오기
				await fetchMembers();
				// 수정된 멤버를 다시 선택
				const updatedMember = {
					...editedMember,
					P_ADDR: fullAddress,
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM
				};
				setSelectedMember(updatedMember);
				setIsEditing(false);
				setEditedMember(null);
				setEditedMemberDetailAddr('');
				hasUnsavedChanges.current = false;
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('수정 실패:', result);
				alert(`저장 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('저장 중 오류:', err);
			alert('저장 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		if (hasUnsavedChanges.current) {
			if (confirm('수정된 내용이 저장되지 않았습니다. 정말 취소하시겠습니까?')) {
				setIsEditing(false);
				setEditedMember(null);
				setEditedMemberDetailAddr('');
				hasUnsavedChanges.current = false;
			}
		} else {
			setIsEditing(false);
			setEditedMember(null);
			setEditedMemberDetailAddr('');
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) return;
		
		if (confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			setLoading(true);
			try {
				// DELETE 쿼리 생성
				const deleteQuery = `
					DELETE FROM [돌봄시설DB].[dbo].[F10010]
					WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
				`;

				const params = {
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM
				};

				const response = await fetch('/api/f10010', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: deleteQuery, params })
				});

				const result = await response.json();

				if (result && result.success) {
					alert('삭제되었습니다.');
					// 목록 새로고침
					await fetchMembers();
					setSelectedMember(null);
					setIsEditing(false);
					setEditedMember(null);
					setEditedMemberDetailAddr('');
					hasUnsavedChanges.current = false;
				} else {
					const errorMessage = result?.error || result?.details || '알 수 없는 오류';
					console.error('삭제 실패:', result);
					alert(`삭제 실패: ${errorMessage}`);
				}
			} catch (err) {
				console.error('삭제 중 오류:', err);
				alert('삭제 중 오류가 발생했습니다.');
			} finally {
				setLoading(false);
			}
		}
	};

	const handleFieldChange = (field: string, value: any) => {
		if (editedMember) {
			setEditedMember({ ...editedMember, [field]: value });
			hasUnsavedChanges.current = true;
		}
	};

	const handleNewMemberFieldChange = (field: string, value: any) => {
		setNewMember({ ...newMember, [field]: value });
	};

	// ANCD별 최대 PNUM 조회 및 새 PNUM 생성
	const getNextPNUM = async (ancd: string): Promise<string> => {
		try {
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `SELECT ISNULL(MAX(CAST(PNUM AS INT)), 0) + 1 AS NEXT_PNUM 
							FROM [돌봄시설DB].[dbo].[F10010] 
							WHERE ANCD = @ancd`,
					params: { ancd }
				})
			});
			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
				return String(result.data[0].NEXT_PNUM);
			}
			// 데이터가 없거나 실패한 경우 기본값 반환
			return '1';
		} catch (err) {
			console.error('PNUM 생성 오류:', err);
			// 오류 발생 시 기본값 반환
			return '1';
		}
	};

	const handleCreateClick = () => {
		setIsCreating(true);
		setNewMember({});
		setNewMemberDetailAddr('');
		setSelectedMember(null);
		setIsEditing(false);
		setEditedMember(null);
		setEditedMemberDetailAddr('');
		hasUnsavedChanges.current = false;
	};

	const handleCreateCancel = () => {
		if (Object.keys(newMember).length > 1 || newMemberDetailAddr.trim() !== '') {
			if (confirm('입력한 내용이 저장되지 않았습니다. 정말 취소하시겠습니까?')) {
				setIsCreating(false);
				setNewMember({});
				setNewMemberDetailAddr('');
			}
		} else {
			setIsCreating(false);
			setNewMember({});
			setNewMemberDetailAddr('');
		}
	};

	const handleCreateSave = async () => {
		if (!newMember.P_NM || newMember.P_NM.trim() === '') {
			alert('수급자명을 입력해주세요.');
			return;
		}

		setLoading(true);
		try {
			// 선택한 기관의 ANCD 가져오기
			const selectedANCD = newMember.selectedANCD || (institutions.length > 0 ? institutions[0].ANCD : '190000');
			if (!selectedANCD) {
				alert('기관을 선택해주세요.');
				setLoading(false);
				return;
			}
			
			// PNUM 자동 생성
			const nextPNUM = await getNextPNUM(selectedANCD);
			
			// 현재 날짜/시간
			const now = new Date();
			const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

			// INSERT 쿼리 생성
			const insertQuery = `
				INSERT INTO [돌봄시설DB].[dbo].[F10010] (
					[ANCD], [PNUM], [P_NM], [P_BRDT], [P_NO], [P_SEX], 
					[P_ZIP], [P_ADDR], [P_TEL], [P_HP], [P_GRD], 
					[P_YYNO], [P_YYDT], [P_ST], [P_CINFO], 
					[P_CTDT], [P_SDT], [P_EDT], 
					[HCANUM], [HCAINFO], [HSPT], [DTNM], [DTTEL], 
					[INDT], [ETC], [P_YYSDT], [P_YYEDT], [P_FLOOR]
				) VALUES (
					@ANCD, @PNUM, @P_NM, @P_BRDT, @P_NO, @P_SEX,
					@P_ZIP, @P_ADDR, @P_TEL, @P_HP, @P_GRD,
					@P_YYNO, @P_YYDT, @P_ST, @P_CINFO,
					@P_CTDT, @P_SDT, @P_EDT,
					@HCANUM, @HCAINFO, @HSPT, @DTNM, @DTTEL,
					@INDT, @ETC, @P_YYSDT, @P_YYEDT, @P_FLOOR
				)
			`;

			// 날짜 형식 변환 함수
			const formatDate = (dateStr: string | undefined): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					// YYYY-MM-DD 형식을 검증하고 SQL Server 형식으로 변환
					const date = new Date(dateStr);
					if (isNaN(date.getTime())) return null;
					// YYYY-MM-DD HH:mm:ss 형식으로 변환
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day} 00:00:00`;
				} catch (err) {
					return null;
				}
			};

			// 주소와 상세주소 합치기
			const fullAddress = newMember.P_ADDR?.trim() 
				? (newMember.P_ADDR.trim() + (newMemberDetailAddr.trim() ? ' ' + newMemberDetailAddr.trim() : ''))
				: null;

			const params = {
				ANCD: selectedANCD,
				PNUM: nextPNUM,
				P_NM: newMember.P_NM?.trim() || null,
				P_BRDT: formatDate(newMember.P_BRDT),
				P_NO: newMember.P_NO?.trim() || null,
				P_SEX: newMember.P_SEX || null,
				P_ZIP: newMember.P_ZIP?.trim() || null,
				P_ADDR: fullAddress,
				P_TEL: newMember.P_TEL?.trim() || null,
				P_HP: newMember.P_HP?.trim() || null,
				P_GRD: newMember.P_GRD?.trim() || null,
				P_YYNO: newMember.P_YYNO?.trim() || null,
				P_YYDT: formatDate(newMember.P_YYDT),
				P_ST: newMember.P_ST || null,
				P_CINFO: newMember.P_CINFO?.trim() || null,
				P_CTDT: formatDate(newMember.P_CTDT),
				P_SDT: formatDate(newMember.P_SDT),
				P_EDT: formatDate(newMember.P_EDT),
				HCANUM: newMember.HCANUM?.trim() || null,
				HCAINFO: newMember.HCAINFO?.trim() || null,
				HSPT: newMember.HSPT?.trim() || null,
				DTNM: newMember.DTNM?.trim() || null,
				DTTEL: newMember.DTTEL?.trim() || null,
				INDT: nowStr,
				ETC: newMember.ETC?.trim() || null,
				P_YYSDT: formatDate(newMember.P_YYSDT),
				P_YYEDT: formatDate(newMember.P_YYEDT),
				P_FLOOR: newMember.P_FLOOR && newMember.P_FLOOR !== '' ? parseInt(newMember.P_FLOOR) : null
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: insertQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert('수급자가 생성되었습니다.');
				setIsCreating(false);
				setNewMember({});
				setNewMemberDetailAddr('');
				// 목록 새로고침
				await fetchMembers();
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('수급자 생성 실패:', result);
				alert(`수급자 생성 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('수급자 생성 오류:', err);
			alert('수급자 생성 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 클라이언트 측 추가 필터링 (서버에서 이미 이름으로 필터링됨)
	const filteredMembers = members.filter(member => {
		// 상태 필터링
		if (selectedStatus) {
			if (selectedStatus === '입소' && member.P_ST !== '1') return false;
			if (selectedStatus === '퇴소' && member.P_ST !== '9') return false;
		}
		
		// 검색어 필터링
		if (searchTerm === '') return true;
		return (
			member.P_NM?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			member.P_TEL?.includes(searchTerm) ||
			member.P_HP?.includes(searchTerm) ||
			String(member.ANCD || '').includes(searchTerm) ||
			String(member.PNUM || '').includes(searchTerm)
		);
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// F00110 테이블에서 기관 목록 가져오기
	const fetchInstitutions = async () => {
		try {
			const response = await fetch('/api/f00110');
			const result = await response.json();
			if (result.success && result.data) {
				// ANCD와 ANNM만 추출
				const institutionList = result.data.map((item: any) => ({
					ANCD: item.ANCD,
					ANNM: item.ANNM || ''
				})).filter((item: any) => item.ANCD && item.ANNM); // ANCD와 ANNM이 있는 것만
				setInstitutions(institutionList);
			}
		} catch (err) {
			console.error('기관 목록 조회 오류:', err);
		}
	};

	useEffect(() => {
		fetchMembers();
		fetchInstitutions();
	}, []);

	// 다음 주소 API 스크립트 로드
	useEffect(() => {
		const script = document.createElement('script');
		script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
		script.async = true;
		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, []);

	// 주소 검색 함수
	const handleAddressSearch = (isNewMember: boolean = false) => {
		if (typeof window === 'undefined' || !(window as any).daum || !(window as any).daum.Postcode) {
			alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
			return;
		}

		new (window as any).daum.Postcode({
			oncomplete: function(data: any) {
				const zipCode = data.zonecode;
				const address = data.address;
				const extraAddress = data.addressType === 'R' ? data.bname + data.buildingName : '';

				if (isNewMember) {
					setNewMember({
						...newMember,
						P_ZIP: zipCode,
						P_ADDR: address + (extraAddress ? ' ' + extraAddress : '')
					});
					setNewMemberDetailAddr(''); // 상세주소 초기화
				} else if (editedMember) {
					setEditedMember({
						...editedMember,
						P_ZIP: zipCode,
						P_ADDR: address + (extraAddress ? ' ' + extraAddress : '')
					});
					setEditedMemberDetailAddr(''); // 상세주소 초기화
					hasUnsavedChanges.current = true;
				}
			}
		}).open();
	};

	// 화면 이탈 시 알림
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges.current) {
				e.preventDefault();
				e.returnValue = '';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, []);

	// 검색어가 변경될 때 페이지를 1로 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	// 상태 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus]);

	return (
		<div className="min-h-screen text-black bg-white">
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
										onChange={(e) => setSelectedStatus(e.target.value)}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded text-blue-900"
									>
										<option value="">현황 전체</option>
										<option value="입소">입소</option>
										<option value="퇴소">퇴소</option>
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
							{/* 수급자 생성 버튼 - 표 하단 중앙 */}
							<div className="p-3 border-t border-blue-100">
								<div className="flex items-center justify-center">
									<button
										onClick={handleCreateClick}
										className="px-6 py-2 text-sm font-semibold text-white bg-blue-500 border border-blue-600 rounded-lg shadow hover:bg-blue-600 transition-colors"
									>
										수급자 생성
									</button>
								</div>
							</div>
						</div>
					</aside>

					{/* 우측: 상세 영역 */}
					<section className="flex-1 space-y-4">
						{isCreating ? (
							<>
								{/* 수급자 생성 폼 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h2 className="text-xl font-semibold text-blue-900">수급자 생성</h2>
										<div className="flex items-center gap-2">
											<button 
												onClick={handleCreateSave}
												disabled={loading}
												className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50"
											>
												{loading ? '저장 중...' : '저장'}
											</button>
											<button 
												onClick={handleCreateCancel}
												className="px-3 py-1 text-sm text-blue-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
											>
												취소
											</button>
										</div>
									</div>

									<div className="p-4">
										<div className="grid grid-cols-12 gap-4">
											{/* 사진 영역 */}
											<div className="col-span-12 md:col-span-3">
												<div className="flex items-center justify-center bg-white border border-blue-300 rounded-lg h-36 text-blue-900/70">사진</div>
											</div>

											{/* 입력 필드 영역 */}
											<div className="grid grid-cols-12 col-span-12 gap-3 md:col-span-9">
												{/* 기관 선택 */}
												<div className="flex flex-col col-span-12 gap-1">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">기관명 *</label>
													<select
														value={newMember.selectedANCD || ''}
														onChange={(e) => handleNewMemberFieldChange('selectedANCD', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													>
														<option value="">기관을 선택하세요</option>
														{institutions.map((inst) => (
															<option key={inst.ANCD} value={inst.ANCD}>
																{inst.ANNM}
															</option>
														))}
													</select>
												</div>
												{/* 1행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자명 *</label>
													<input
														type="text"
														value={newMember.P_NM || ''}
														onChange={(e) => handleNewMemberFieldChange('P_NM', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="수급자명을 입력하세요"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">생년월일</label>
													<input
														type="date"
														value={newMember.P_BRDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_BRDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>

												{/* 2행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주민번호</label>
													<input
														type="text"
														value={newMember.P_NO || ''}
														onChange={(e) => handleNewMemberFieldChange('P_NO', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="주민번호를 입력하세요"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">성별</label>
													<select
														value={newMember.P_SEX || ''}
														onChange={(e) => handleNewMemberFieldChange('P_SEX', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													>
														<option value="">선택</option>
														<option value="1">남자</option>
														<option value="2">여자</option>
													</select>
												</div>

												{/* 3행 - 주소 검색 버튼 */}
												<div className="flex col-span-12 gap-2">
													<button
														type="button"
														onClick={() => handleAddressSearch(true)}
														className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600"
													>
														주소 검색
													</button>
												</div>
												{/* 4행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">우편번호</label>
													<input
														type="text"
														value={newMember.P_ZIP || ''}
														onChange={(e) => handleNewMemberFieldChange('P_ZIP', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="우편번호"
														readOnly
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주소</label>
													<input
														type="text"
														value={newMember.P_ADDR || ''}
														onChange={(e) => handleNewMemberFieldChange('P_ADDR', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="주소를 검색하세요"
														readOnly
													/>
												</div>
												{/* 상세주소 */}
												<div className="flex flex-col col-span-12 gap-1">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">상세주소</label>
													<input
														type="text"
														value={newMemberDetailAddr}
														onChange={(e) => setNewMemberDetailAddr(e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="상세주소를 입력하세요 (예: 101동 101호)"
													/>
												</div>

												{/* 5행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">연락처</label>
													<input
														type="text"
														value={newMember.P_HP || newMember.P_TEL || ''}
														onChange={(e) => {
															handleNewMemberFieldChange('P_HP', e.target.value);
															handleNewMemberFieldChange('P_TEL', e.target.value);
														}}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="연락처를 입력하세요"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">요양등급</label>
													<select
														value={newMember.P_GRD || ''}
														onChange={(e) => handleNewMemberFieldChange('P_GRD', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													>
														<option value="">선택</option>
														<option value="1">1등급</option>
														<option value="2">2등급</option>
														<option value="3">3등급</option>
														<option value="4">4등급</option>
														<option value="5">5등급</option>
														<option value="6">6등급</option>
													</select>
												</div>

												{/* 6행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양인정번호</label>
													<input
														type="text"
														value={newMember.P_YYNO || ''}
														onChange={(e) => handleNewMemberFieldChange('P_YYNO', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="장기요양인정번호"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">인정번호 발급일</label>
													<input
														type="date"
														value={newMember.P_YYDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_YYDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>

												{/* 장기요양 유효기간 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효시작일</label>
													<input
														type="date"
														value={newMember.P_YYSDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_YYSDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효종료일</label>
													<input
														type="date"
														value={newMember.P_YYEDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_YYEDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>

												{/* 7행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">상태</label>
													<select
														value={newMember.P_ST || ''}
														onChange={(e) => handleNewMemberFieldChange('P_ST', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													>
														<option value="">선택</option>
														<option value="1">입소</option>
														<option value="9">퇴소</option>
													</select>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">계약일자</label>
													<input
														type="date"
														value={newMember.P_CTDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_CTDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>

												{/* 8행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">입소일자</label>
													<input
														type="date"
														value={newMember.P_SDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_SDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">퇴소일자</label>
													<input
														type="date"
														value={newMember.P_EDT || ''}
														onChange={(e) => handleNewMemberFieldChange('P_EDT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												</div>

												{/* 9행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">담당의</label>
													<input
														type="text"
														value={newMember.DTNM || ''}
														onChange={(e) => handleNewMemberFieldChange('DTNM', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="담당의 이름"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주치의 연락처</label>
													<input
														type="text"
														value={newMember.DTTEL || ''}
														onChange={(e) => handleNewMemberFieldChange('DTTEL', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="주치의 연락처"
													/>
												</div>

												{/* 10행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">이용병원</label>
													<input
														type="text"
														value={newMember.HSPT || ''}
														onChange={(e) => handleNewMemberFieldChange('HSPT', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="이용병원"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">간호지시서번호</label>
													<input
														type="text"
														value={newMember.HCANUM || ''}
														onChange={(e) => handleNewMemberFieldChange('HCANUM', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="간호지시서번호"
													/>
												</div>

												{/* 11행 */}
												<div className="flex flex-col col-span-12 gap-1">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">간호지시서정보</label>
													<input
														type="text"
														value={newMember.HCAINFO || ''}
														onChange={(e) => handleNewMemberFieldChange('HCAINFO', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="간호지시서정보"
													/>
												</div>

												{/* 12행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">층수</label>
													<input
														type="number"
														min="0"
														step="1"
														value={newMember.P_FLOOR || ''}
														onChange={(e) => {
															const value = e.target.value;
															// 0 이상의 정수만 허용
															if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number.isInteger(Number(value)))) {
																handleNewMemberFieldChange('P_FLOOR', value);
															}
														}}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="층수 (0 이상의 정수)"
													/>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">비고</label>
													<input
														type="text"
														value={newMember.ETC || ''}
														onChange={(e) => handleNewMemberFieldChange('ETC', e.target.value)}
														className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="비고"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
							</>
						) : selectedMember ? (
							<>
								{/* 개인정보 카드 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h2 className="text-xl font-semibold text-blue-900">개인정보</h2>
										<div className="flex items-center gap-2">
											{isEditing ? (
												<>
													<button 
														onClick={handleSave}
														disabled={loading}
														className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50"
													>
														{loading ? '저장 중...' : '저장'}
													</button>
													<button 
														onClick={handleCancel}
														className="px-3 py-1 text-sm text-blue-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
													>
														취소
													</button>
													<button 
														onClick={handleDelete}
														disabled={loading}
														className="px-3 py-1 text-sm text-white bg-red-500 border border-red-600 rounded hover:bg-red-600 disabled:opacity-50"
													>
														삭제
													</button>
												</>
											) : (
												<button 
													onClick={handleEditClick}
													className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
												>
													수정 및 삭제
												</button>
											)}
										</div>
									</div>

									<div className="p-4">
										<div className="grid grid-cols-12 gap-4">
											{/* 사진 영역 */}
											<div className="col-span-12 md:col-span-3">
												<div className="flex items-center justify-center bg-white border border-blue-300 rounded-lg h-36 text-blue-900/70">사진</div>
												{/* <div className="flex gap-2 mt-2">
													<button className="flex-1 px-2 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">촬영</button>
													<button className="flex-1 px-2 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">첨부</button>
												</div> */}
											</div>

											{/* 입력 필드 영역 */}
											<div className="grid grid-cols-12 col-span-12 gap-3 md:col-span-9">
												{/* 기관 선택 */}
												{isEditing && editedMember && (
													<div className="flex flex-col col-span-12 gap-1">
														<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">기관명</label>
														<select
															value={editedMember.selectedANCD || editedMember.ANCD || ''}
															onChange={(e) => handleFieldChange('selectedANCD', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														>
															<option value="">기관을 선택하세요</option>
															{institutions.map((inst) => (
																<option key={inst.ANCD} value={inst.ANCD}>
																	{inst.ANNM}
																</option>
															))}
														</select>
													</div>
												)}
												{/* 1행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자명</label>
													{isEditing && editedMember ? (
														<input
															type="text"
															value={editedMember.P_NM || ''}
															onChange={(e) => handleFieldChange('P_NM', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_NM || '-'}
														</span>
													)}
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">수급자번호</label>
													<span className="w-full border-b border-blue-200">
														{selectedMember.PNUM || '-'}
													</span>
												</div>

												{/* 2행 - 주소 검색 버튼 */}
												{isEditing && editedMember && (
													<div className="flex col-span-12 gap-2">
														<button
															type="button"
															onClick={() => handleAddressSearch(false)}
															className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600"
														>
															주소 검색
														</button>
													</div>
												)}
												{/* 3행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">우편번호</label>
													{isEditing && editedMember ? (
														<input
															type="text"
															value={editedMember.P_ZIP || ''}
															onChange={(e) => handleFieldChange('P_ZIP', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
															readOnly
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_ZIP || '-'}
														</span>
													)}
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주소</label>
													{isEditing && editedMember ? (
														<input
															type="text"
															value={editedMember.P_ADDR || ''}
															onChange={(e) => handleFieldChange('P_ADDR', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
															readOnly
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_ADDR || '-'}
														</span>
													)}
												</div>
												{/* 상세주소 */}
												{isEditing && editedMember && (
													<div className="flex flex-col col-span-12 gap-1">
														<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">상세주소</label>
														<input
															type="text"
															value={editedMemberDetailAddr}
															onChange={(e) => {
																setEditedMemberDetailAddr(e.target.value);
																hasUnsavedChanges.current = true;
															}}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
															placeholder="상세주소를 입력하세요 (예: 101동 101호)"
														/>
													</div>
												)}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">연락처</label>
													{isEditing && editedMember ? (
														<input
															type="text"
															value={editedMember.P_TEL || editedMember.P_HP || ''}
															onChange={(e) => {
																handleFieldChange('P_TEL', e.target.value);
																handleFieldChange('P_HP', e.target.value);
															}}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_TEL || selectedMember.P_HP || '-'}
														</span>
													)}
												</div>

												{/* 4행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">성별</label>
													<span className="w-full border-b border-blue-200">
														{
															selectedMember.P_SEX === '1' 
																? '남자' 
																: selectedMember.P_SEX === '2' 
																	? '여자' 
																	: '-'
														}
													</span>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">등급</label>
													{isEditing && editedMember ? (
														<select
															value={editedMember.P_GRD || ''}
															onChange={(e) => handleFieldChange('P_GRD', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														>
															<option value="">선택</option>
															<option value="1">1등급</option>
															<option value="2">2등급</option>
															<option value="3">3등급</option>
															<option value="4">4등급</option>
															<option value="5">5등급</option>
															<option value="6">6등급</option>
														</select>
													) : (
														<span className="w-full border-b border-blue-200">
															{
																selectedMember.P_GRD 
																	? selectedMember.P_GRD === '0' 
																		? '등급외' 
																		: `${selectedMember.P_GRD}등급`
																	: '등급 없음'
															}
														</span>
													)}
												</div>

												{/* 5행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">입소일</label>
													<span className="w-full border-b border-blue-200">
														{selectedMember.P_SDT ? selectedMember.P_SDT.substring(0, 10) : '-'}
													</span>
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">퇴소일</label>
													<span className="w-full border-b border-blue-200">
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

												{/* 6행 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">담당의</label>
													{isEditing && editedMember ? (
														<input
															type="text"
															value={editedMember.DTNM || ''}
															onChange={(e) => handleFieldChange('DTNM', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.DTNM || '-'}
														</span>
													)}
												</div>
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">주치의 연락처</label>
													{isEditing && editedMember ? (
														<input
															type="text"
															value={editedMember.DTTEL || ''}
															onChange={(e) => handleFieldChange('DTTEL', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.DTTEL || '-'}
														</span>
													)}
												</div>
												{/* 층수 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">층수</label>
													{isEditing && editedMember ? (
														<input
															type="number"
															min="0"
															step="1"
															value={editedMember.P_FLOOR || ''}
															onChange={(e) => {
																const value = e.target.value;
																// 0 이상의 정수만 허용
																if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number.isInteger(Number(value)))) {
																	handleFieldChange('P_FLOOR', value);
																}
															}}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
															placeholder="층수 (0 이상의 정수)"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_FLOOR !== null && selectedMember.P_FLOOR !== undefined ? selectedMember.P_FLOOR : '-'}
														</span>
													)}
												</div>
												{/* 장기요양유효시작일 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효시작일</label>
													{isEditing && editedMember ? (
														<input
															type="date"
															value={editedMember.P_YYSDT ? editedMember.P_YYSDT.substring(0, 10) : ''}
															onChange={(e) => handleFieldChange('P_YYSDT', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_YYSDT ? selectedMember.P_YYSDT.substring(0, 10) : '-'}
														</span>
													)}
												</div>
												{/* 장기요양유효종료일 */}
												<div className="flex flex-col col-span-12 gap-1 md:col-span-6">
													<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">장기요양유효종료일</label>
													{isEditing && editedMember ? (
														<input
															type="date"
															value={editedMember.P_YYEDT ? editedMember.P_YYEDT.substring(0, 10) : ''}
															onChange={(e) => handleFieldChange('P_YYEDT', e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														/>
													) : (
														<span className="w-full border-b border-blue-200">
															{selectedMember.P_YYEDT ? selectedMember.P_YYEDT.substring(0, 10) : '-'}
														</span>
													)}
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
											<h3 className="text-lg font-semibold text-blue-900">계약정보</h3>
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
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.INSPER || ''}
														onChange={(e) => handleFieldChange('INSPER', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="숫자만 입력"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.INSPER || '-'}%
													</span>
												)}
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">수급자부담율</span>
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.USRPER || ''}
														onChange={(e) => handleFieldChange('USRPER', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="숫자만 입력"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.USRPER || '-'}%
													</span>
												)}
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
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.ETC || ''}
														onChange={(e) => handleFieldChange('ETC', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.ETC || '-'}
													</span>
												)}
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
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.BHNM || ''}
														onChange={(e) => handleFieldChange('BHNM', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.BHNM || '-'}
													</span>
												)}
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">관계</span>
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.BHREL || editedMember.BHETC || ''}
														onChange={(e) => handleFieldChange('BHREL', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												) : (
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
												)}
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">연락처</span>
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.GUARDIAN_P_HP || ''}
														onChange={(e) => handleFieldChange('GUARDIAN_P_HP', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.GUARDIAN_P_HP || '-'}
													</span>
												)}
											</div>
											<div className="flex items-center gap-2">
												<span className="w-24 text-blue-900/80">주소</span>
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.GUARDIAN_P_ADDR || ''}
														onChange={(e) => handleFieldChange('GUARDIAN_P_ADDR', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.GUARDIAN_P_ADDR || '-'}
													</span>
												)}
											</div>
											<div className="flex items-center gap-2">
												{/* <span className="w-24 text-blue-900/80">이메일</span> */}
												<span className="w-24 text-blue-900/80">기타</span>
												{isEditing && editedMember ? (
													<input
														type="text"
														value={editedMember.P_EMAIL || ''}
														onChange={(e) => handleFieldChange('P_EMAIL', e.target.value)}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													/>
												) : (
													<span className="flex-1 border-b border-blue-200">
														{selectedMember.P_EMAIL || '-'}
													</span>
												)}
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