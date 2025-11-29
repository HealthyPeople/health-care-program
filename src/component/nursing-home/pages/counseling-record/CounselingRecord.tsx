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

interface CounselingData {
	ANCD: string;
	PNUM: string;
	CSDT: string;
	EMPNO: string;
	EMPNM: string;
	BHREL: string;
	STM: string;
	ETM: string;
	CSGU: string;
	CSINFO: string;
	CSM: string;
	CSNUM: string;
	INDT: string;
	ETC: string;
	INEMPNO: string;
	INEMPNM: string;
	BHRELNM: string;
	[key: string]: any;
}

export default function CounselingRecord() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [consultationDates, setConsultationDates] = useState<string[]>([]);
	const [consultationList, setConsultationList] = useState<CounselingData[]>([]);
	const [loadingConsultations, setLoadingConsultations] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [consultationDatePage, setConsultationDatePage] = useState(1);
	const consultationDateItemsPerPage = 10;
	const [formData, setFormData] = useState({
		beneficiary: '',
		consultationSubstitute: '',
		consultationSubstituteCode: '', // BHREL 코드 저장
		consultationDate: '',
		startTime: '',
		endTime: '',
		consultant: '',
		consultantCode: '', // EMPNO 저장
		consultationMethod: '',
		consultationMethodCode: '', // CSGU 코드 저장
		consultationContent: '',
		actionTaken: ''
	});

	// 상담사 자동완성 관련 상태
	const [consultantSearchTerm, setConsultantSearchTerm] = useState('');
	const [consultantSuggestions, setConsultantSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
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

	// 검색어 변경 시 실시간 검색 (디바운싱)
	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300); // 300ms 후 검색 실행

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// 상담사 검색어 변경 시 검색 (디바운싱)
	useEffect(() => {
		const timer = setTimeout(() => {
			if (consultantSearchTerm && consultantSearchTerm.trim() !== '') {
				searchConsultants(consultantSearchTerm);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [consultantSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.consultant-dropdown-container')) {
				setShowConsultantDropdown(false);
			}
		};

		if (showConsultantDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showConsultantDropdown]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	// 상담 기록 조회 (수급자 선택 시)
	const fetchConsultations = async (ancd: string, pnum: string, member: MemberData | null) => {
		if (!ancd || !pnum) {
			setConsultationList([]);
			setConsultationDates([]);
			return;
		}

		setLoadingConsultations(true);
		try {
			const url = `/api/f11020?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				const consultations = Array.isArray(result.data) ? result.data : [];
				setConsultationList(consultations);
				
				// 상담일자 목록 생성 (CSDT 기준)
				const dates = consultations.map((c: CounselingData) => c.CSDT || '').filter((d: string) => d);
				setConsultationDates(dates);
				
				// 첫 번째 상담 기록이 있으면 자동 선택
				if (consultations.length > 0) {
					setSelectedDateIndex(0);
					handleSelectDate(0, consultations[0], member);
					setIsEditMode(false); // 상담 기록 로드 시 편집 모드 해제
					setConsultantSearchTerm('');
					setConsultantSuggestions([]);
					setShowConsultantDropdown(false);
				} else {
					setSelectedDateIndex(null);
					resetForm(member);
					setIsEditMode(false); // 상담 기록 없을 때 편집 모드 해제
					setConsultantSearchTerm('');
					setConsultantSuggestions([]);
					setShowConsultantDropdown(false);
				}
			} else {
				console.error('상담 기록 조회 실패:', result.error);
				setConsultationList([]);
				setConsultationDates([]);
				setSelectedDateIndex(null);
				resetForm(member);
				setIsEditMode(false);
			}
		} catch (err) {
			console.error('상담 기록 조회 오류:', err);
			setConsultationList([]);
			setConsultationDates([]);
			setSelectedDateIndex(null);
			resetForm(member);
			setIsEditMode(false);
		} finally {
			setLoadingConsultations(false);
		}
	};

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
		
		// 새 상담 기록을 위한 폼 초기화 (수급자명은 유지)
		setFormData({
			beneficiary: selectedMember?.P_NM || '',
			consultationSubstitute: '',
			consultationSubstituteCode: '',
			consultationDate: formattedDate,
			startTime: '',
			endTime: '',
			consultant: '',
			consultantCode: '',
			consultationMethod: '',
			consultationMethodCode: '',
			consultationContent: '',
			actionTaken: ''
		});
		
		// 편집 모드로 전환
		setIsEditMode(true);
		// 새로 생성된 날짜를 선택
		const newIndex = consultationDates.includes(formattedDate) 
			? consultationDates.indexOf(formattedDate)
			: 0;
		setSelectedDateIndex(newIndex);
	};

	// 날짜 형식 변환 함수 (YYYYMMDD 또는 ISO 형식 -> yyyy-mm-dd)
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
		if (dateStr.length === 8 && !dateStr.includes('-')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	// 날짜 선택 함수
	const handleSelectDate = (index: number, consultation?: CounselingData, member: MemberData | null = null) => {
		setSelectedDateIndex(index);
		setIsEditMode(false); // 날짜 선택 시 편집 모드 해제
		
		// 해당 날짜의 상담 기록 찾기
		const selectedConsultation = consultation || consultationList[index];
		
		// member 파라미터가 없으면 selectedMember 사용 (수동 선택 시)
		const currentMember = member || selectedMember;
		
		if (selectedConsultation) {
			// 관계 코드를 한글로 변환
			const relationshipMap: { [key: string]: string } = {
				'10': '남편',
				'11': '부인',
				'20': '아들',
				'21': '딸',
				'22': '며느리',
				'23': '사위',
				'31': '손주'
			};

			// 상담방법 코드를 한글로 변환
			const methodMap: { [key: string]: string } = {
				'1': '센타방문',
				'2': '전화',
				'9': '기타'
			};

			// 날짜 형식 변환 (YYYYMMDD 또는 ISO 형식 -> yyyy-mm-dd)
			const formatDate = (dateStr: string) => {
				if (!dateStr) return '';
				// ISO 형식에서 T00:00:00.000Z 제거
				if (dateStr.includes('T')) {
					dateStr = dateStr.split('T')[0];
				}
				// YYYYMMDD 형식 처리
				if (dateStr.length === 8 && !dateStr.includes('-')) {
					return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
				}
				// 이미 yyyy-mm-dd 형식이면 그대로 반환
				if (dateStr.includes('-') && dateStr.length >= 10) {
					return dateStr.substring(0, 10);
				}
				return dateStr;
			};

			// 시간 형식 변환 (HHMM -> HH:MM)
			const formatTime = (timeStr: string) => {
				if (!timeStr) return '';
				if (timeStr.length === 4) {
					return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
				}
				return timeStr;
			};

			const consultationDate = formatDate(selectedConsultation.CSDT || '');
			const startTime = formatTime(selectedConsultation.STM || '');
			const endTime = formatTime(selectedConsultation.ETM || '');

			setFormData({
				beneficiary: currentMember?.P_NM || '',
				consultationSubstitute: selectedConsultation.BHRELNM || '',
				consultationSubstituteCode: selectedConsultation.BHREL || '',
				consultationDate: consultationDate,
				startTime: startTime,
				endTime: endTime,
				consultant: selectedConsultation.EMPNM || '',
				consultantCode: selectedConsultation.EMPNO || '',
				consultationMethod: methodMap[selectedConsultation.CSGU] || selectedConsultation.CSGU || '',
				consultationMethodCode: selectedConsultation.CSGU || '',
				consultationContent: selectedConsultation.CSINFO || '',
				actionTaken: selectedConsultation.CSM || ''
			});
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		// 해당 수급자의 상담 기록 조회 (member를 직접 전달)
		fetchConsultations(member.ANCD, member.PNUM, member);
	};

	// 폼 초기화
	const resetForm = (member: MemberData | null = null) => {
		const currentMember = member || selectedMember;
		setFormData({
			beneficiary: currentMember?.P_NM || '',
			consultationSubstitute: '',
			consultationSubstituteCode: '',
			consultationDate: '',
			startTime: '',
			endTime: '',
			consultant: '',
			consultantCode: '',
			consultationMethod: '',
			consultationMethodCode: '',
			consultationContent: '',
			actionTaken: ''
		});
		setConsultantSearchTerm('');
		setConsultantSuggestions([]);
		setShowConsultantDropdown(false);
	};

	// 상담사 검색 함수
	const searchConsultants = async (searchTerm: string) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setConsultantSuggestions([]);
			setShowConsultantDropdown(false);
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setConsultantSuggestions(result.data);
				setShowConsultantDropdown(result.data.length > 0);
			} else {
				setConsultantSuggestions([]);
				setShowConsultantDropdown(false);
			}
		} catch (err) {
			console.error('상담사 검색 오류:', err);
			setConsultantSuggestions([]);
			setShowConsultantDropdown(false);
		}
	};

	// 상담사 선택 함수
	const handleSelectConsultant = (consultant: {EMPNO: string; EMPNM: string}) => {
		setFormData(prev => ({
			...prev,
			consultant: consultant.EMPNM,
			consultantCode: consultant.EMPNO
		}));
		setConsultantSearchTerm(consultant.EMPNM);
		setShowConsultantDropdown(false);
	};

	// 폼 데이터 변경 함수
	const handleFormChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 수정 함수
	const handleModify = () => {
		// 수정 모드 진입 시 상담일자가 없으면 오늘 날짜로 설정
		if (!formData.consultationDate) {
			const today = new Date();
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const day = String(today.getDate()).padStart(2, '0');
			const formattedDate = `${year}-${month}-${day}`;
			setFormData(prev => ({ ...prev, consultationDate: formattedDate }));
		}
		setIsEditMode(true);
	};

	// 다음 CSNUM 조회
	const getNextCSNUM = async (ancd: string, pnum: string): Promise<string> => {
		try {
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `SELECT ISNULL(MAX(CAST(CSNUM AS INT)), 0) + 1 AS NEXT_CSNUM 
							FROM [돌봄시설DB].[dbo].[F11020] 
							WHERE ANCD = @ancd AND PNUM = @pnum`,
					params: { ancd, pnum }
				})
			});
			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
				return String(result.data[0].NEXT_CSNUM);
			}
			return '1';
		} catch (err) {
			console.error('CSNUM 생성 오류:', err);
			return '1';
		}
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.consultationDate) {
			alert('상담일자를 입력해주세요.');
			return;
		}

		setLoadingConsultations(true);
		try {
			// 현재 날짜/시간
			const now = new Date();
			const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

			// 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
			const formatDateForDB = (dateStr: string): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					// yyyy-mm-dd 형식을 YYYYMMDD로 변환
					if (dateStr.includes('-')) {
						return dateStr.replace(/-/g, '');
					}
					return dateStr;
				} catch (err) {
					return null;
				}
			};

			// 시간 형식 변환 (HHMM -> HH:MM 또는 HH:MM 유지)
			const formatTimeForDB = (timeStr: string): string | null => {
				if (!timeStr || timeStr.trim() === '') return null;
				try {
					const trimmed = String(timeStr).trim();
					// 이미 HH:MM 형식이면 그대로 반환
					if (trimmed.includes(':')) {
						return trimmed;
					}
					// HHMM 형식이면 HH:MM으로 변환
					if (trimmed.length === 4 && !isNaN(Number(trimmed))) {
						return `${trimmed.substring(0, 2)}:${trimmed.substring(2, 4)}`;
					}
					return trimmed;
				} catch (err) {
					return null;
				}
			};

			// 안전한 문자열 trim 함수
			const safeTrim = (value: any): string | null => {
				if (value === null || value === undefined) return null;
				if (typeof value !== 'string') {
					// 문자열이 아니면 문자열로 변환 시도
					try {
						const strValue = String(value);
						return strValue.trim() || null;
					} catch {
						return null;
					}
				}
				return value.trim() || null;
			};

			// 기존 상담 기록이 있는지 확인 (수정 모드인지 확인)
			const existingConsultation = selectedDateIndex !== null && consultationList[selectedDateIndex] 
				? consultationList[selectedDateIndex] 
				: null;

			let query: string;
			let params: any;

			if (existingConsultation && existingConsultation.CSNUM) {
				// 수정 모드: UPDATE 쿼리
				query = `
					UPDATE [돌봄시설DB].[dbo].[F11020]
					SET 
						[CSDT] = @CSDT,
						[EMPNO] = @EMPNO,
						[EMPNM] = @EMPNM,
						[BHREL] = @BHREL,
						[BHRELNM] = @BHRELNM,
						[STM] = @STM,
						[ETM] = @ETM,
						[CSGU] = @CSGU,
						[CSINFO] = @CSINFO,
						[CSM] = @CSM
					WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [CSNUM] = @CSNUM
				`;

				params = {
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM,
					CSNUM: existingConsultation.CSNUM,
					CSDT: formatDateForDB(formData.consultationDate),
					EMPNO: safeTrim(formData.consultantCode),
					EMPNM: safeTrim(formData.consultant),
					BHREL: safeTrim(formData.consultationSubstituteCode),
					BHRELNM: safeTrim(formData.consultationSubstitute),
					STM: formatTimeForDB(formData.startTime),
					ETM: formatTimeForDB(formData.endTime),
					CSGU: safeTrim(formData.consultationMethodCode),
					CSINFO: safeTrim(formData.consultationContent),
					CSM: safeTrim(formData.actionTaken)
				};
			} else {
				// 생성 모드: INSERT 쿼리
				// CSNUM 자동 생성
				const nextCSNUM = await getNextCSNUM(selectedMember.ANCD, selectedMember.PNUM);

				query = `
					INSERT INTO [돌봄시설DB].[dbo].[F11020] (
						[ANCD], [PNUM], [CSDT], [EMPNO], [EMPNM], [BHREL], [BHRELNM],
						[STM], [ETM], [CSGU], [CSINFO], [CSM], [CSNUM],
						[INDT], [ETC], [INEMPNO], [INEMPNM]
					) VALUES (
						@ANCD, @PNUM, @CSDT, @EMPNO, @EMPNM, @BHREL, @BHRELNM,
						@STM, @ETM, @CSGU, @CSINFO, @CSM, @CSNUM,
						@INDT, @ETC, @INEMPNO, @INEMPNM
					)
				`;

				params = {
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM,
					CSDT: formatDateForDB(formData.consultationDate),
					EMPNO: safeTrim(formData.consultantCode),
					EMPNM: safeTrim(formData.consultant),
					BHREL: safeTrim(formData.consultationSubstituteCode),
					BHRELNM: safeTrim(formData.consultationSubstitute),
					STM: formatTimeForDB(formData.startTime),
					ETM: formatTimeForDB(formData.endTime),
					CSGU: safeTrim(formData.consultationMethodCode),
					CSINFO: safeTrim(formData.consultationContent),
					CSM: safeTrim(formData.actionTaken),
					CSNUM: nextCSNUM,
					INDT: nowStr,
					ETC: null,
					INEMPNO: null,
					INEMPNM: null
				};
			}

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert(existingConsultation ? '상담일지가 수정되었습니다.' : '상담일지가 생성되었습니다.');
				setIsEditMode(false);
				// 상담 기록 다시 조회
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchConsultations(selectedMember.ANCD, selectedMember.PNUM, selectedMember);
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('상담일지 저장 실패:', result);
				alert(`상담일지 저장 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('상담일지 저장 오류:', err);
			alert('상담일지 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingConsultations(false);
		}
	};

	// 취소 함수
	const handleCancel = () => {
		setIsEditMode(false);
		
		// 현재 선택된 날짜가 오늘 날짜인지 확인
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		const todayDate = `${year}-${month}-${day}`;
		
		// 현재 선택된 날짜
		const currentDate = selectedDateIndex !== null ? consultationDates[selectedDateIndex] : null;
		
		// 현재 선택된 날짜가 오늘 날짜이고, 해당 날짜의 상담 기록이 없으면 제거
		if (currentDate === todayDate && selectedDateIndex !== null) {
			const hasRecord = consultationList.some(c => {
				const recordDate = formatDateDisplay(c.CSDT || '');
				return recordDate === todayDate;
			});
			
			// 상담 기록이 없으면 (새로 생성된 날짜) 목록에서 제거
			if (!hasRecord) {
				setConsultationDates(prev => prev.filter((_, index) => index !== selectedDateIndex));
				setSelectedDateIndex(null);
				// 폼 초기화
				resetForm(selectedMember);
				return;
			}
		}
		
		// 수정 전 데이터로 복원
		if (selectedDateIndex !== null && consultationList[selectedDateIndex]) {
			handleSelectDate(selectedDateIndex, consultationList[selectedDateIndex], selectedMember);
		} else if (selectedDateIndex !== null && consultationDates[selectedDateIndex]) {
			// 상담 기록이 없으면 폼만 초기화
			resetForm(selectedMember);
		}
	};

	// 출력 함수
	const handlePrint = async () => {
		if (!selectedMember || !formData.consultationDate) {
			alert('출력할 상담일지를 선택해주세요.');
			return;
		}

		// F00110 테이블에서 장기요양기관명 조회
		let institutionName = '-';
		try {
			const response = await fetch('/api/f00110');
			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data)) {
				const institution = result.data.find((item: any) => item.ANCD === selectedMember.ANCD);
				if (institution && institution.ANNM) {
					institutionName = institution.ANNM;
				}
			}
		} catch (err) {
			console.error('장기요양기관명 조회 오류:', err);
		}

		// 출력용 창 열기
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		// 관계 코드를 한글로 변환
		const relationshipMap: { [key: string]: string } = {
			'10': '남편',
			'11': '부인',
			'20': '아들',
			'21': '딸',
			'22': '며느리',
			'23': '사위',
			'31': '손주'
		};

		// 상담방법 코드를 한글로 변환
		const methodMap: { [key: string]: string } = {
			'1': '센타방문',
			'2': '전화',
			'9': '기타'
		};

		// 주민등록번호 마스킹 (뒤 6자리)
		const maskResidentNumber = (residentNumber: string) => {
			if (!residentNumber || residentNumber.length < 7) return residentNumber;
			return residentNumber.substring(0, 7) + '******';
		};

		// 상담시간 포맷
		const consultationTime = formData.startTime && formData.endTime
			? `${formData.startTime} ~ ${formData.endTime}`
			: formData.startTime || formData.endTime || '-';

		// 출력용 HTML 생성
		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>상담일지</title>
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
		.header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 20px;
		}
		.title {
			font-size: 24pt;
			font-weight: bold;
			text-align: center;
			flex: 1;
		}
		.signature-table {
			border-collapse: collapse;
			border: 1px solid #000;
			display: table !important;
			width: auto;
			table-layout: auto;
		}
		.signature-table tbody {
			display: table-row-group !important;
		}
		.signature-table tr {
			display: table-row !important;
		}
		.signature-table td {
			border: 1px solid #000;
			text-align: center;
			vertical-align: middle;
			display: table-cell !important;
		}
		.signature-table td.header {
			background-color: transparent;
			font-weight: normal;
			color: #8B4513;
			padding: 5px 20px;
			font-size: 10pt;
			white-space: nowrap;
		}
		.signature-table td.empty {
			width: 80px;
			height: 50px;
			padding: 0;
			background-color: #fff;
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
			.print-container {
				max-width: 100%;
			}
		}
	</style>
</head>
<body>
	<div class="print-container">
		<div class="header">
			<div class="title">상담일지</div>
			<table class="signature-table" style="border-collapse: collapse; border: 1px solid #000;">
				<tbody>
					<tr>
						<td class="header">담당</td>
						<td class="header">검토</td>
						<td class="header">결재</td>
					</tr>
					<tr>
						<td class="empty"></td>
						<td class="empty"></td>
						<td class="empty"></td>
					</tr>
				</tbody>
			</table>
		</div>

		<table class="info-table">
			<tr>
				<td class="label">장기요양기관코드</td>
				<td class="value">${selectedMember.ANCD || '-'}</td>
				<td class="label">장기요양기관명</td>
				<td class="value">${institutionName}</td>
			</tr>
			<tr>
				<td class="label">장기요양등급</td>
				<td class="value">${selectedMember.P_GRD === '0' ? '등급외' : selectedMember.P_GRD ? `${selectedMember.P_GRD}등급` : '-'}</td>
				<td class="label">수급자성명</td>
				<td class="value">${formData.beneficiary || '-'}</td>
			</tr>
			<tr>
				<td class="label">주민등록번호</td>
				<td class="value">${selectedMember.P_NO ? maskResidentNumber(selectedMember.P_NO) : '-'}</td>
				<td class="label">장기요양인정번호</td>
				<td class="value">${selectedMember.P_YYNO || '-'}</td>
			</tr>
			<tr>
				<td class="label">상담자</td>
				<td class="value">${formData.consultant || '-'}</td>
				<td class="label">상담방법</td>
				<td class="value">${formData.consultationMethod || '-'}</td>
			</tr>
			<tr>
				<td class="label">상담대상자</td>
				<td class="value">${formData.consultationSubstitute || '-'}</td>
				<td class="label">상담일자</td>
				<td class="value">${formData.consultationDate || '-'}</td>
			</tr>
			<tr>
				<td class="label">상담시간</td>
				<td class="value">${consultationTime}</td>
				<td class="label">수급자와관계</td>
				<td class="value">${formData.consultationSubstituteCode ? relationshipMap[formData.consultationSubstituteCode] || formData.consultationSubstitute : '-'}</td>
			</tr>
		</table>

		<div class="content-section">
			<div class="section-title">상담내용</div>
			<div class="section-content">${formData.consultationContent || ''}</div>
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

		// 현재 선택된 상담 기록 확인
		const currentConsultation = selectedDateIndex !== null && consultationList[selectedDateIndex] 
			? consultationList[selectedDateIndex] 
			: null;

		if (!currentConsultation || !currentConsultation.CSNUM) {
			alert('삭제할 상담일지를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingConsultations(true);
		try {
			const deleteQuery = `
				DELETE FROM [돌봄시설DB].[dbo].[F11020]
				WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [CSNUM] = @CSNUM
			`;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				CSNUM: currentConsultation.CSNUM
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: deleteQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				alert('상담일지가 삭제되었습니다.');
				setIsEditMode(false);
				// 상담 기록 다시 조회
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchConsultations(selectedMember.ANCD, selectedMember.PNUM, selectedMember);
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('상담일지 삭제 실패:', result);
				alert(`상담일지 삭제 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('상담일지 삭제 오류:', err);
			alert('상담일지 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingConsultations(false);
		}
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex h-[calc(80vh-56px)]">
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
					<div className="w-[320px] border-r border-blue-200 px-4 py-3 bg-blue-50 flex flex-col">
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
								{loadingConsultations ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
								) : consultationDates.length === 0 ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">
										{selectedMember ? '상담 기록이 없습니다' : '수급자를 선택해주세요'}
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
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담대상자</label>
								{isEditMode ? (
									<select
										value={formData.consultationSubstituteCode}
										onChange={(e) => {
											const code = e.target.value;
											const relationshipMap: { [key: string]: string } = {
												'10': '남편',
												'11': '부인',
												'20': '아들',
												'21': '딸',
												'22': '며느리',
												'23': '사위',
												'31': '손주'
											};
											handleFormChange('consultationSubstituteCode', code);
											handleFormChange('consultationSubstitute', relationshipMap[code] || '');
										}}
										className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
									>
										<option value="">선택하세요</option>
										<option value="10">10.남편</option>
										<option value="11">11.부인</option>
										<option value="20">20.아들</option>
										<option value="21">21.딸</option>
										<option value="22">22.며느리</option>
										<option value="23">23.사위</option>
										<option value="31">31.손주</option>
									</select>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.consultationSubstitute || '-'}
									</span>
								)}
							</div>
							{!isEditMode && (
								<div className="ml-auto flex items-center gap-2">
									<button
										onClick={handlePrint}
										className="px-4 py-1.5 text-xs border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
									>
										출력
									</button>
								</div>
							)}
						</div>

						{/* 두 번째 행 */}
						<div className="mb-4 flex items-center gap-4 flex-wrap">
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담일자</label>
								{isEditMode ? (
									<input
										type="date"
										value={formData.consultationDate}
										onChange={(e) => handleFormChange('consultationDate', e.target.value)}
										className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.consultationDate || '-'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담시간</label>
								{isEditMode ? (
									<div className="flex items-center gap-2">
										<input
											type="time"
											value={formData.startTime}
											onChange={(e) => handleFormChange('startTime', e.target.value)}
											className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[100px]"
										/>
										<span className="text-sm text-blue-900">~</span>
										<input
											type="time"
											value={formData.endTime}
											onChange={(e) => handleFormChange('endTime', e.target.value)}
											className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[100px]"
										/>
									</div>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.startTime && formData.endTime 
											? `${formData.startTime} ~ ${formData.endTime}`
											: formData.startTime || formData.endTime || '-'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2 relative">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담사</label>
								{isEditMode ? (
									<div className="relative consultant-dropdown-container">
										<input
											type="text"
											value={consultantSearchTerm || formData.consultant}
											onChange={(e) => {
												const value = e.target.value;
												setConsultantSearchTerm(value);
												if (value) {
													searchConsultants(value);
												} else {
													setConsultantSuggestions([]);
													setShowConsultantDropdown(false);
												}
											}}
											onFocus={() => {
												if (consultantSuggestions.length > 0) {
													setShowConsultantDropdown(true);
												}
											}}
											className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
											placeholder="상담사 검색"
										/>
										{showConsultantDropdown && consultantSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
												{consultantSuggestions.map((consultant, index) => (
													<div
														key={`${consultant.EMPNO}-${index}`}
														onClick={() => handleSelectConsultant(consultant)}
														className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
													>
														{consultant.EMPNM}
													</div>
												))}
											</div>
										)}
									</div>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.consultant || '-'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm text-blue-900 font-medium whitespace-nowrap">상담방법</label>
								{isEditMode ? (
									<select
										value={formData.consultationMethodCode}
										onChange={(e) => {
											const code = e.target.value;
											const methodMap: { [key: string]: string } = {
												'1': '센타방문',
												'2': '전화',
												'9': '기타'
											};
											handleFormChange('consultationMethodCode', code);
											handleFormChange('consultationMethod', methodMap[code] || '');
										}}
										className="px-3 py-1.5 text-sm border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 min-w-[150px]"
									>
										<option value="">선택하세요</option>
										<option value="1">1.센타방문</option>
										<option value="2">2.전화</option>
										<option value="9">9.기타</option>
									</select>
								) : (
									<span className="px-3 py-1.5 text-sm border-b-2 border-blue-200 min-w-[150px]">
										{formData.consultationMethod || '-'}
									</span>
								)}
							</div>
						</div>

						{/* 상담 내용 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">상담 내용</label>
							{isEditMode ? (
								<textarea
									value={formData.consultationContent}
									onChange={(e) => handleFormChange('consultationContent', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="상담 내용을 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[200px] whitespace-pre-wrap">
									{formData.consultationContent || '-'}
								</div>
							)}
						</div>

						{/* 조치 사항 */}
						<div className="mb-4">
							<label className="block text-sm text-blue-900 font-medium mb-2">조치 사항</label>
							{isEditMode ? (
								<textarea
									value={formData.actionTaken}
									onChange={(e) => handleFormChange('actionTaken', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									rows={8}
									placeholder="조치 사항을 입력하세요"
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

