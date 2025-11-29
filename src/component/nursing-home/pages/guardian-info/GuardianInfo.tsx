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

interface GuardianData {
	ANCD: string;
	PNUM: string;
	BHNUM: string;
	BHNM: string;
	BHREL: string;
	BHETC: string;
	BHJB: string;
	P_ZIP: string;
	P_ADDR: string;
	P_TEL: string;
	P_HP: string;
	P_EMAIL: string;
	CONGU: string;
	SVSDT?: string;
	SVEDT?: string;
	[key: string]: any;
}

export default function GuardianInfo() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedGuardian, setSelectedGuardian] = useState<GuardianData | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [guardianList, setGuardianList] = useState<GuardianData[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingGuardians, setLoadingGuardians] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [detailAddress, setDetailAddress] = useState(''); // 상세주소
	const [formData, setFormData] = useState({
		BHNM: '', // 보호자-이름
		BHREL: '', // 수급자와의 관계
		BHETC: '', // 수급자와의 기타관계
		BHJB: '', // 보호자-주부 (주보호자: '1', 아니면 '')
		P_ZIP: '', // 보호자-집우편번호
		P_ADDR: '', // 보호자-집수소
		P_TEL: '', // 보호자-집전화번호
		P_HP: '', // 보호자-핸드폰
		P_EMAIL: '', // 보호자-E-Mail
		ETC: '', // 비고
		INEMPNO: '', // 등록-사원번호
		INEMPNM: '', // 등록-사원 이름
		CONGU: '0' // 계약자구분 (기본값: 0, 체크 시: 1)
	});

	// 수급자 목록 조회
	const fetchMembers = async () => {
		setLoading(true);
		try {
			const response = await fetch('/api/f10010');
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

	// 보호자 목록 조회 (수급자 선택 시)
	const fetchGuardians = async (ancd: string, pnum: string, member: MemberData | null, autoSelectFirst: boolean = false) => {
		if (!ancd || !pnum) {
			setGuardianList([]);
			return;
		}

		setLoadingGuardians(true);
		try {
			const url = `/api/f10020?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				// 빈 배열이거나 null/undefined인 경우 빈 배열로 설정
				const guardianData = Array.isArray(result.data) ? result.data : [];
				console.log('보호자 목록 조회 결과:', { ancd, pnum, count: guardianData.length, data: guardianData });
				setGuardianList(guardianData);
				
				// 첫 번째 보호자 자동 선택
				if (autoSelectFirst && guardianData.length > 0) {
					handleSelectGuardian(guardianData[0], member);
				} else if (guardianData.length === 0) {
					// 보호자가 없으면 선택 해제 및 폼 초기화
					setSelectedGuardian(null);
					resetForm(member);
				}
			} else {
				console.error('보호자 목록 조회 실패:', result.error);
				setGuardianList([]);
				setSelectedGuardian(null);
				resetForm(member);
			}
		} catch (err) {
			console.error('보호자 목록 조회 오류:', err);
			setGuardianList([]);
			setSelectedGuardian(null);
			resetForm(member);
		} finally {
			setLoadingGuardians(false);
		}
	};

	// 수급자 선택 시 보호자 목록 조회
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		// 보호자 선택 초기화
		setSelectedGuardian(null);
		setIsCreating(false);
		// 보호자 목록 조회 시 첫 번째 보호자 자동 선택
		fetchGuardians(member.ANCD, member.PNUM, member, true);
	};

	// 보호자 선택 시 폼에 데이터 로드
	const handleSelectGuardian = (guardian: GuardianData, member: MemberData | null = null) => {
		setSelectedGuardian(guardian);
		setIsCreating(false);
		setIsEditing(false);
		
		// 주소는 전체를 P_ADDR에 표시하고, 상세주소는 별도로 관리하지 않음
		// (저장 시에만 상세주소를 합쳐서 저장)
		setFormData({
			BHNM: guardian.BHNM || '',
			BHREL: guardian.BHREL || '',
			BHETC: guardian.BHETC || '',
			BHJB: guardian.BHJB || '',
			P_ZIP: guardian.P_ZIP || '',
			P_ADDR: guardian.P_ADDR || '',
			P_TEL: guardian.P_TEL || '',
			P_HP: guardian.P_HP || '',
			P_EMAIL: guardian.P_EMAIL || '',
			ETC: guardian.ETC || '',
			INEMPNO: guardian.INEMPNO || '',
			INEMPNM: guardian.INEMPNM || '',
			CONGU: guardian.CONGU || ''
		});
		setDetailAddress(''); // 조회 시에는 상세주소를 별도로 표시하지 않음
	};

	// 폼 초기화
	const resetForm = (member: MemberData | null = null) => {
		setFormData({
			BHNM: '',
			BHREL: '',
			BHETC: '',
			BHJB: '',
			P_ZIP: '',
			P_ADDR: '',
			P_TEL: '',
			P_HP: '',
			P_EMAIL: '',
			ETC: '',
			INEMPNO: '',
			INEMPNM: '',
			CONGU: '0' // 기본값: 0
		});
		setDetailAddress('');
	};

	// 보호자 생성 버튼 클릭
	const handleCreateClick = () => {
		if (!selectedMember) {
			alert('수급자를 먼저 선택해주세요.');
			return;
		}
		setIsCreating(true);
		setIsEditing(false);
		setSelectedGuardian(null);
		resetForm();
	};

	// 보호자 생성 취소
	const handleCreateCancel = () => {
		setIsCreating(false);
		resetForm();
	};

	// 다음 BHNUM 조회
	const getNextBHNUM = async (ancd: string, pnum: string): Promise<string> => {
		try {
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `SELECT ISNULL(MAX(CAST(BHNUM AS INT)), 0) + 1 AS NEXT_BHNUM 
							FROM [돌봄시설DB].[dbo].[F10020] 
							WHERE ANCD = @ancd AND PNUM = @pnum`,
					params: { ancd, pnum }
				})
			});
			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
				return String(result.data[0].NEXT_BHNUM);
			}
			return '1';
		} catch (err) {
			console.error('BHNUM 생성 오류:', err);
			return '1';
		}
	};

	// 보호자 저장
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.BHNM || formData.BHNM.trim() === '') {
			alert('보호자명을 입력해주세요.');
			return;
		}

		setSaving(true);
		try {
			// 현재 날짜/시간
			const now = new Date();
			const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

			// BHNUM 자동 생성
			const nextBHNUM = await getNextBHNUM(selectedMember.ANCD, selectedMember.PNUM);

			// INSERT 쿼리 생성
			const insertQuery = `
				INSERT INTO [돌봄시설DB].[dbo].[F10020] (
					[ANCD], [PNUM], [BHNUM], [BHNM], [BHREL], [BHETC], [BHJB],
					[P_ZIP], [P_ADDR], [P_TEL], [P_HP], [P_EMAIL],
					[INDT], [ETC], [INEMPNO], [INEMPNM], [CONGU]
				) VALUES (
					@ANCD, @PNUM, @BHNUM, @BHNM, @BHREL, @BHETC, @BHJB,
					@P_ZIP, @P_ADDR, @P_TEL, @P_HP, @P_EMAIL,
					@INDT, @ETC, @INEMPNO, @INEMPNM, @CONGU
				)
			`;

			// 주소와 상세주소 합치기
			const fullAddress = formData.P_ADDR?.trim() 
				? (formData.P_ADDR.trim() + (detailAddress.trim() ? ' ' + detailAddress.trim() : ''))
				: null;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				BHNUM: nextBHNUM,
				BHNM: formData.BHNM?.trim() || null,
				BHREL: formData.BHREL?.trim() || null,
				BHETC: formData.BHETC?.trim() || null,
				BHJB: formData.BHJB || null,
				P_ZIP: formData.P_ZIP?.trim() || null,
				P_ADDR: fullAddress,
				P_TEL: formData.P_TEL?.trim() || null,
				P_HP: formData.P_HP?.trim() || null,
				P_EMAIL: formData.P_EMAIL?.trim() || null,
				INDT: nowStr,
				ETC: formData.ETC?.trim() || null,
				INEMPNO: formData.INEMPNO?.trim() || null,
				INEMPNM: formData.INEMPNM?.trim() || null,
				CONGU: formData.CONGU?.trim() || '0'
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: insertQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert('보호자가 생성되었습니다.');
				setIsCreating(false);
				resetForm();
				// 보호자 목록 다시 조회
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchGuardians(selectedMember.ANCD, selectedMember.PNUM, selectedMember, false);
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('보호자 생성 실패:', result);
				alert(`보호자 생성 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('보호자 생성 오류:', err);
			alert('보호자 생성 중 오류가 발생했습니다.');
		} finally {
			setSaving(false);
		}
	};

	// 보호자 수정 버튼 클릭
	const handleEditClick = () => {
		if (!selectedGuardian) return;
		setIsEditing(true);
		setIsCreating(false);
		// 수정 모드에서는 상세주소를 표시하지 않음 (기존 주소 그대로 사용)
		setDetailAddress('');
	};

	// 보호자 수정 취소
	const handleEditCancel = () => {
		setIsEditing(false);
		// 원래 보호자 데이터로 복원
		if (selectedGuardian) {
			setFormData({
				BHNM: selectedGuardian.BHNM || '',
				BHREL: selectedGuardian.BHREL || '',
				BHETC: selectedGuardian.BHETC || '',
				BHJB: selectedGuardian.BHJB || '',
				P_ZIP: selectedGuardian.P_ZIP || '',
				P_ADDR: selectedGuardian.P_ADDR || '',
				P_TEL: selectedGuardian.P_TEL || '',
				P_HP: selectedGuardian.P_HP || '',
				P_EMAIL: selectedGuardian.P_EMAIL || '',
				ETC: selectedGuardian.ETC || '',
				INEMPNO: selectedGuardian.INEMPNO || '',
				INEMPNM: selectedGuardian.INEMPNM || '',
				CONGU: selectedGuardian.CONGU || ''
			});
			setDetailAddress('');
		}
	};

	// 보호자 수정 저장
	const handleEditSave = async () => {
		if (!selectedGuardian || !selectedMember) {
			alert('보호자를 선택해주세요.');
			return;
		}

		if (!formData.BHNM || formData.BHNM.trim() === '') {
			alert('보호자명을 입력해주세요.');
			return;
		}

		setSaving(true);
		try {
			// 주소와 상세주소 합치기
			const fullAddress = formData.P_ADDR?.trim() 
				? (formData.P_ADDR.trim() + (detailAddress.trim() ? ' ' + detailAddress.trim() : ''))
				: null;

			// UPDATE 쿼리 생성
			const updateQuery = `
				UPDATE [돌봄시설DB].[dbo].[F10020]
				SET 
					[BHNM] = @BHNM,
					[BHREL] = @BHREL,
					[BHETC] = @BHETC,
					[BHJB] = @BHJB,
					[P_ZIP] = @P_ZIP,
					[P_ADDR] = @P_ADDR,
					[P_TEL] = @P_TEL,
					[P_HP] = @P_HP,
					[P_EMAIL] = @P_EMAIL,
					[ETC] = @ETC,
					[CONGU] = @CONGU
				WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [BHNUM] = @BHNUM
			`;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				BHNUM: selectedGuardian.BHNUM,
				BHNM: formData.BHNM?.trim() || null,
				BHREL: formData.BHREL?.trim() || null,
				BHETC: formData.BHETC?.trim() || null,
				BHJB: formData.BHJB || null,
				P_ZIP: formData.P_ZIP?.trim() || null,
				P_ADDR: fullAddress,
				P_TEL: formData.P_TEL?.trim() || null,
				P_HP: formData.P_HP?.trim() || null,
				P_EMAIL: formData.P_EMAIL?.trim() || null,
				ETC: formData.ETC?.trim() || null,
				CONGU: formData.CONGU?.trim() || '0'
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: updateQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert('보호자 정보가 수정되었습니다.');
				setIsEditing(false);
				setDetailAddress('');
				// 보호자 목록 다시 조회
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchGuardians(selectedMember.ANCD, selectedMember.PNUM, selectedMember, false);
					// 수정된 보호자를 다시 선택
					const updatedGuardian = guardianList.find(g => 
						g.ANCD === selectedGuardian.ANCD && 
						g.PNUM === selectedGuardian.PNUM && 
						g.BHNUM === selectedGuardian.BHNUM
					);
					if (updatedGuardian) {
						handleSelectGuardian(updatedGuardian);
					}
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('보호자 수정 실패:', result);
				alert(`보호자 수정 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('보호자 수정 오류:', err);
			alert('보호자 수정 중 오류가 발생했습니다.');
		} finally {
			setSaving(false);
		}
	};

	// 보호자 삭제
	const handleDelete = async () => {
		if (!selectedGuardian || !selectedMember) return;

		if (confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			setSaving(true);
			try {
				const deleteQuery = `
					DELETE FROM [돌봄시설DB].[dbo].[F10020]
					WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [BHNUM] = @BHNUM
				`;

				const params = {
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM,
					BHNUM: selectedGuardian.BHNUM
				};

				const response = await fetch('/api/f10010', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: deleteQuery, params })
				});

				const result = await response.json();

				if (result && result.success) {
					alert('보호자가 삭제되었습니다.');
					setSelectedGuardian(null);
					setIsEditing(false);
					resetForm();
					// 보호자 목록 다시 조회
					if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
						await fetchGuardians(selectedMember.ANCD, selectedMember.PNUM, selectedMember, false);
					}
				} else {
					const errorMessage = result?.error || result?.details || '알 수 없는 오류';
					console.error('보호자 삭제 실패:', result);
					alert(`보호자 삭제 실패: ${errorMessage}`);
				}
			} catch (err) {
				console.error('보호자 삭제 오류:', err);
				alert('보호자 삭제 중 오류가 발생했습니다.');
			} finally {
				setSaving(false);
			}
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
	// 모든 필터 조건을 AND로 결합하여 적용
	const filteredMembers = memberList.filter((member) => {
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
		
		// 이름 검색 필터링 (검색어가 있을 때만 적용)
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase().trim();
			if (!member.P_NM?.toLowerCase().includes(searchLower)) {
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

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	const handleFormChange = (field: string, value: string | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 다음 주소 API 스크립트 로드
	useEffect(() => {
		const script = document.createElement('script');
		script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
		script.async = true;
		document.body.appendChild(script);

		return () => {
			if (document.body.contains(script)) {
				document.body.removeChild(script);
			}
		};
	}, []);

	// 주소 검색 함수
	const handleAddressSearch = () => {
		if (typeof window === 'undefined' || !(window as any).daum || !(window as any).daum.Postcode) {
			alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
			return;
		}

		new (window as any).daum.Postcode({
			oncomplete: function(data: any) {
				const zipCode = data.zonecode;
				const address = data.address;
				const extraAddress = data.addressType === 'R' ? data.bname + data.buildingName : '';

				setFormData(prev => ({
					...prev,
					P_ZIP: zipCode,
					P_ADDR: address + (extraAddress ? ' ' + extraAddress : '')
				}));
				setDetailAddress(''); // 상세주소 초기화
			}
		}).open();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex h-[calc(80vh-56px)]">
				{/* 좌측 패널: 수급자 목록 (CounselingRecord 스타일) */}
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

				{/* 중간 패널: 보호자 목록 */}
				<div className="w-1/4 border-r border-blue-200 bg-white flex flex-col p-4">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-blue-900">보호자 목록</h3>
						{selectedMember && (
							<button
								onClick={handleCreateClick}
								className="px-2 py-1 text-xs text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600"
							>
								보호자 생성
							</button>
						)}
					</div>
					<div className="border border-blue-300 rounded-lg overflow-hidden bg-white">
						<div className="overflow-y-auto h-full">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold border-r border-blue-200">보호자명</th>
										<th className="text-center px-2 py-1.5 text-blue-900 font-semibold">계약기간</th>
									</tr>
								</thead>
								<tbody>
									{loadingGuardians ? (
										<tr>
											<td colSpan={3} className="text-center px-2 py-4 text-blue-900/60">로딩 중...</td>
										</tr>
									) : guardianList.length === 0 ? (
										<tr>
											<td colSpan={3} className="text-center px-2 py-4 text-blue-900/60">
												{selectedMember ? '보호자 없음' : '수급자를 선택해주세요'}
											</td>
										</tr>
									) : (
										guardianList.map((guardian, index) => {
											// 계약기간: F10110의 SVSDT(시작일)와 SVEDT(종료일) 사용
											const formatDate = (dateStr: string) => {
												if (!dateStr) return '-';
												try {
													return dateStr.substring(0, 10).replace(/-/g, '.');
												} catch {
													return dateStr;
												}
											};
											
											const startDate = formatDate(guardian.SVSDT || '');
											const endDate = formatDate(guardian.SVEDT || '');
											const contractPeriod = startDate !== '-' && endDate !== '-'
												? `${startDate} ~ ${endDate}`
												: startDate !== '-'
													? `${startDate} ~ -`
													: '-';
											
											return (
												<tr
													key={`${guardian.ANCD}-${guardian.PNUM}-${guardian.BHNUM || index}`}
													onClick={() => handleSelectGuardian(guardian)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedGuardian?.ANCD === guardian.ANCD && 
														selectedGuardian?.PNUM === guardian.PNUM &&
														selectedGuardian?.BHNUM === guardian.BHNUM
															? 'bg-blue-100 border-2 border-blue-400' : ''
													}`}
												>
													<td className="text-center px-2 py-1.5 border-r border-blue-100">{index + 1}</td>
													<td className="text-center px-2 py-1.5 border-r border-blue-100">{guardian.BHNM || '-'}</td>
													<td className="text-center px-2 py-1.5">
														{contractPeriod}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 우측 패널: 보호자 정보 */}
				<div className="flex-1 overflow-y-auto p-4 bg-white">
					<div className="mb-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-blue-900">보호자 정보</h2>
							{isCreating ? (
								<div className="flex gap-2">
									<button
										onClick={handleSave}
										disabled={saving}
										className="px-3 py-1 text-sm text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600 disabled:opacity-50"
									>
										{saving ? '저장 중...' : '저장'}
									</button>
									<button
										onClick={handleCreateCancel}
										className="px-3 py-1 text-sm text-gray-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
									>
										취소
									</button>
								</div>
							) : selectedGuardian && !isEditing ? (
								<button
									onClick={handleEditClick}
									className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
								>
									수정 및 삭제
								</button>
							) : selectedGuardian && isEditing ? (
								<div className="flex gap-2">
									<button
										onClick={handleEditSave}
										disabled={saving}
										className="px-3 py-1 text-sm text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600 disabled:opacity-50"
									>
										{saving ? '저장 중...' : '저장'}
									</button>
									<button
										onClick={handleEditCancel}
										className="px-3 py-1 text-sm text-gray-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
									>
										취소
									</button>
									<button
										onClick={handleDelete}
										disabled={saving}
										className="px-3 py-1 text-sm text-white bg-red-500 border border-red-600 rounded hover:bg-red-600 disabled:opacity-50"
									>
										삭제
									</button>
								</div>
							) : null}
						</div>

						{/* 수급자명 (읽기 전용) */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">수급자명</label>
							<input
								type="text"
								value={selectedMember?.P_NM || ''}
								readOnly
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-gray-50"
							/>
						</div>
						<div className="border-t border-blue-200 my-4"></div>

						{/* 보호자명 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">보호자명 *</label>
							<input
								type="text"
								value={formData.BHNM}
								onChange={(e) => handleFormChange('BHNM', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								disabled={!isCreating && !isEditing}
							/>
						</div>

						{/* 관계 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">관계</label>
							<select
								value={formData.BHREL}
								onChange={(e) => handleFormChange('BHREL', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								disabled={!isCreating && !isEditing}
							>
								<option value="">선택</option>
								<option value="10">남편</option>
								<option value="11">부인</option>
								<option value="20">아들</option>
								<option value="21">딸</option>
								<option value="22">며느리</option>
								<option value="23">사위</option>
								<option value="31">손주</option>
							</select>
						</div>

						{/* 기타관계 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">기타관계</label>
							<input
								type="text"
								value={formData.BHETC}
								onChange={(e) => handleFormChange('BHETC', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								disabled={!isCreating && !isEditing}
							/>
						</div>

						{/* 주보호자 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">주보호자</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={formData.BHJB === '1'}
									onChange={(e) => handleFormChange('BHJB', e.target.checked ? '1' : '')}
									className="w-4 h-4 border-blue-300 rounded"
									disabled={!isCreating && !isEditing}
								/>
								<span className="text-sm text-blue-900">주 보호자</span>
							</label>
						</div>

						{/* 주소 검색 버튼 - 생성 모드 또는 수정 모드에서만 표시 */}
						{(isCreating || isEditing) && (
							<div className="mb-4">
								<button
									type="button"
									onClick={handleAddressSearch}
									className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600"
								>
									주소 검색
								</button>
							</div>
						)}

						{/* 우편번호 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">우편번호</label>
							<input
								type="text"
								value={formData.P_ZIP}
								onChange={(e) => handleFormChange('P_ZIP', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								readOnly
								disabled={!isCreating && !isEditing}
							/>
						</div>

						{/* 주소 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">주소</label>
							<input
								type="text"
								value={formData.P_ADDR}
								onChange={(e) => handleFormChange('P_ADDR', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								readOnly
								disabled={!isCreating && !isEditing}
							/>
						</div>

						{/* 상세주소 - 생성 모드에서만 표시 */}
						{isCreating && (
							<div className="mb-4 flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">상세주소</label>
								<input
									type="text"
									value={detailAddress}
									onChange={(e) => setDetailAddress(e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
									placeholder="상세주소를 입력하세요 (예: 101동 101호)"
								/>
							</div>
						)}

						{/* 집전화번호 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">집전화번호</label>
							<input
								type="text"
								value={formData.P_TEL}
								onChange={(e) => handleFormChange('P_TEL', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								disabled={!isCreating && !isEditing}
							/>
						</div>

						{/* 핸드폰 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">핸드폰</label>
							<input
								type="text"
								value={formData.P_HP}
								onChange={(e) => handleFormChange('P_HP', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								placeholder="예) 010-0000-0000"
								disabled={!isCreating && !isEditing}
							/>
						</div>

						{/* 이메일 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">이메일</label>
							<input
								type="email"
								value={formData.P_EMAIL}
								onChange={(e) => handleFormChange('P_EMAIL', e.target.value)}
								className="flex-1 px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500"
								disabled={!isCreating && !isEditing}
							/>
						</div>

						<div className="border-t border-blue-200 my-4"></div>

						{/* 계약자구분 */}
						<div className="mb-4 flex items-center gap-2">
							<label className="text-sm text-blue-900 font-medium whitespace-nowrap w-24">계약자구분</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={formData.CONGU === '1'}
									onChange={(e) => handleFormChange('CONGU', e.target.checked ? '1' : '0')}
									className="w-4 h-4 border-blue-300 rounded"
									disabled={!isCreating && !isEditing}
								/>
								<span className="text-sm text-blue-900">계약자</span>
							</label>
						</div>

						{/* 비고 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">비고</label>
							<textarea
								value={formData.ETC}
								onChange={(e) => handleFormChange('ETC', e.target.value)}
								className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								rows={3}
								disabled={!isCreating && !isEditing}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
