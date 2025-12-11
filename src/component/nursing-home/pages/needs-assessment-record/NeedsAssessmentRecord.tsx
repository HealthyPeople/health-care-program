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

interface ActivityAssessment {
	activity: string;
	value: '○' | '△' | 'X' | '';
}

export default function NeedsAssessmentRecord() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [recordDates, setRecordDates] = useState<string[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);
	const [activeTab, setActiveTab] = useState<string>('신체');

	// 폼 데이터
	const [formData, setFormData] = useState({
		beneficiary: '', // 수급자
		creationDate: '2025-11-05', // 작성일자
		creator: '염소연', // 작성자
		height: '0.0', // 키
		weight: '0.0', // 체중
		judgmentBasis: '' // 판단근거
	});

	// 활동 평가 데이터
	const [activities, setActivities] = useState<ActivityAssessment[]>([
		{ activity: '옷 벗고 입기', value: '△' },
		{ activity: '식사 하기', value: '○' },
		{ activity: '일어나 앉기', value: '△' },
		{ activity: '화장실 사용하기', value: 'X' },
		{ activity: '세수하기', value: 'X' },
		{ activity: '목욕하기', value: 'X' },
		{ activity: '옮겨 앉기', value: 'X' },
		{ activity: '대변 조절하기', value: '△' },
		{ activity: '양치질하기', value: '△' },
		{ activity: '체위변경 하기', value: '△' },
		{ activity: '방밖으로 나오기', value: '△' },
		{ activity: '소변조절하기', value: '△' }
	]);

	// 질병1/질병2 데이터
	const [disease1Data, setDisease1Data] = useState<{ [key: string]: boolean }>({
		'내분.대사-당뇨': false,
		'내분.대사-갑상선질환': false,
		'내분.대사-탈수': false,
		'내분.대사-영양상태이상': false,
		'내분.대사-만성간염': false,
		'내분.대사-자기면역질환': false,
		'내분.대사-빈혈': false,
		'내분.대사-기타': false,
		'소화기계-위염': false,
		'소화기계-위궤양': false,
		'소화기계-십이지궤양': false,
		'소화기계-변비': false,
		'소화기계-간경변증': false,
		'소화기계-기타': false,
		'순환기계-고혈압': true,
		'순환기계-저혈압': false,
		'순환기계-협심증': false,
		'순환기계-심근경색증': false,
		'순환기계-뇌혈관질환': false,
		'순환기계-기타': true,
		'근골격계-관절염': true,
		'근골격계-요통,좌골통': false,
		'근골격계-기타척추질환': false,
		'근골격계-골다공증': false,
		'근골격계-기타': false,
		'신경계-치매': true,
		'신경계-뇌경색': false,
		'신경계-파킨슨병': false,
		'신경계-두통': false,
		'신경계-두통외통증': false,
		'신경계-기타': false,
		'정신.행동-신경증': false,
		'정신.행동-우울증': false,
		'정신.행동-수면장애': false,
		'정신.행동-기타': false,
		'호흡기계-폐결핵': false,
		'호흡기계-만성기관지염': false,
		'호흡기계-호흡곤란': false,
		'호흡기계-기타': false,
		'눈.귀질환-시각장애': false,
		'눈.귀질환-난청': false,
		'눈.귀질환-기타': false
	});

	const [disease2Data, setDisease2Data] = useState<{ [key: string]: boolean }>({
		'비뇨.생식-전립선비대': true,
		'비뇨.생식-요실금': true,
		'비뇨.생식-만성방광염': true,
		'비뇨.생식-기타': true,
		'만성신장-만성신부전증': true,
		'만성신장-기타': true
	});

	const [diseaseFormData, setDiseaseFormData] = useState({
		pastMedicalHistory: '흉추골절로시술/낙상으로 인한 고관절수술',
		currentDiagnosis: '치매, 고혈압, 고지혈증, 관절염',
		judgmentBasis: '아리셉트정 / 펠로정 / 명인트라조돈염산염정50mg / 명인트라조돈염산염정25mg 노바스크정5mg / 리피토정10mg / 아모딘정 / 아토릭스정10mg / 세레콕시브캡슐 200mg / 라베뉴정 1일 2회 복용중이심'
	});

	// 재활 데이터
	const [rehabilitationData, setRehabilitationData] = useState<{ [key: string]: boolean }>({
		'우측상지': false,
		'어깨관절(우)': false,
		'손목 및 수지관절(우)': false,
		'무릎관절(우)': true,
		'좌측상지': false,
		'어깨관절(좌)': false,
		'손목 및 수지관절(좌)': false,
		'무릎관절(좌)': true,
		'우측하지': false,
		'팔꿈치관절(우)': false,
		'고관절(우)': false,
		'발목관절(우)': false,
		'좌측하지': false,
		'팔꿈치관절(좌)': false,
		'고관절(좌)': false,
		'발목관절(좌)': false
	});

	const [rehabilitationJudgmentBasis, setRehabilitationJudgmentBasis] = useState('고관절수술, 고관절 주의하여 움직임 가능, 경력과 무릎 관절 악화된 상태');

	// 간호 데이터
	const [nursingData, setNursingData] = useState<{ [key: string]: boolean }>({
		'기관지 절개관 간호': true,
		'흡인': true,
		'산소요법': true,
		'욕창간호': true,
		'경관영양': true,
		'통증간호': true,
		'장루간호': true,
		'도뇨관리': true,
		'투석간호': true,
		'당뇨발간호': true,
		'상처간호': true
	});

	const [nursingJudgmentBasis, setNursingJudgmentBasis] = useState('- 간호가 필요시 가정간호사의 도움을 받아 처치');

	// 인지 데이터
	const [cognitionData, setCognitionData] = useState<{ [key: string]: boolean }>({
		'지남력': true,
		'기억력': true,
		'주의집중 및 계산': true,
		'언어적기능': false,
		'판단력': true,
		'편집증과 망상': true,
		'환각': false,
		'배회': false,
		'반복적인 활동': true,
		'부적절한 행동': false,
		'언어폭팔': false,
		'신체적 공격 또는 폭력행위': false,
		'우울': true,
		'일반적인 불안': false,
		'혼자 남겨짐에 대한 공포': false
	});

	const [cognitionJudgmentBasis, setCognitionJudgmentBasis] = useState('- 지남력, 기억력, 계산능력, 시공간구성 사물 및 사람에 대한 기억등 저하가 심한 편이심.\n- 물건을 손에 쥐게 되면 접고 반듯하게 정리하는 행동을 반복적으로 하시며 식사 시 반찬을 한 그릇에 모아두시는 등의 행동을 보임.\n- 인지검사 중 질문에 대한 답을 하지 않으시고 동문서답을 하셔서 4점으로 평가됨');

	// 의사소통 데이터
	const [communicationData, setCommunicationData] = useState({
		listeningAbility: '보통의 소리를 듣기는 하고, 못 듣기도 한다',
		communication: '가끔 이해하고 의사를 표현한다',
		pronunciationAbility: '간혹 어눌한 발음이 섞인다',
		judgmentBasis: '좌측 청력 위주로 소통하심.\n말씀은 계속해서 하시나 동문서답하시고, 본인이 하고 싶은 이야기 위주로 하심.\n간혹 말을 이해하고 의사를 표현하시나 대부분 혼잣말을 하심.'
	});

	// 영양 데이터
	const [nutritionData, setNutritionData] = useState({
		dentalCondition: '양호',
		eatingProblems: '식욕저하',
		eatingStatus: '일반식',
		toolUsage: '젓가락',
		excretionPattern: '정상',
		judgmentBasis: '아래부분 앞니두개 임플란트이며, 대부분 본니를 유지하고 계심.\n상체운동기능 양호하시고 도구를 사용하여 식사시 어려움이 없으심\n식사량이 많지 않으시며, 입소 전에도 소식하셨음\n요의와 배뇨를 느끼시고 표현하시며 배설상태 양호하심'
	});

	// 가족환경 데이터
	const [familyEnvironmentData, setFamilyEnvironmentData] = useState({
		maritalStatus: '기혼',
		primaryCaregiver: '유',
		primaryCaregiverRelationship: '자녀',
		cohabitant: '자녀',
		numberOfChildren: '5',
		primaryCaregiverAge: '60',
		otherRelationship: '',
		spouseSurvivalStatus: '사망',
		primaryCaregiverEconomicStatus: '안정',
		judgmentBasis: '슬하에 1남 4녀를 두셨으며, 유대관계를 매우 돈독하게 유지하고 계심.\n85세까지 강연을 하시는 여류서예가로 50년 동안 활동하시어 모든 사람을 제자 및 자녀로 생각하심.'
	});

	// 자원이용 데이터
	const [resourceUtilizationData, setResourceUtilizationData] = useState<{
		religion: string;
		religionOther: string;
		primaryMedicalInstitution: string;
		phoneNumber: string;
		communityServices: { [key: string]: boolean };
		housingImprovementProject: boolean;
		other: string;
		judgmentBasis: string;
	}>({
		religion: '기타',
		religionOther: '무교',
		primaryMedicalInstitution: '한울 정신의학과',
		phoneNumber: '',
		communityServices: {
			'급식 및 도시락배달': true,
			'이미용': true
		},
		housingImprovementProject: false,
		other: '',
		judgmentBasis: '- 종교는 무교이고, 현재 한울 정신의학과에서 촉탁의 진료 및 처방을 받고 계심.\n- 이미용 등 필요시 요청에 따라 진행해 주기를 원하심.'
	});

	// 개별욕구 데이터
	const [individualNeedsData, setIndividualNeedsData] = useState({
		medicationAdministrationRequest: true,
		hospitalAccompaniment: false,
		outingAccompaniment: true,
		notes: '- 과거에 골절 시술 및 수술을 한 이력이 있어 더이상 악화되지 않고 유지 되기를 희망하심.\n- 촉탁의를 통한 진료 및 약처방을 원하심.'
	});

	// 총평 데이터
	const [overallAssessmentData, setOverallAssessmentData] = useState({
		content: '상체 기능은 양호하나 신체 활용에 대한 인지 저하로 인해 의복 착?탈의 시 부분적 도움이 필요함.\n양치질은 스스로 가능하나 마무리 과정에서 약간의 도움이 요구됨.\n식사 시에는 도구 사용에 어려움이 없으나 식사량이 적으며, 입소 전부터 지속된 소식 경향을 보이심.\n반찬을 한 그릇에 모으는 등 반복적 정리 행동이 관찰됨.\n배뇨?배변 감각과 표현은 가능하며, 전적인 도움을 통해 화장실 이용이 가능하고 배설 상태는 양호하심\n\n과거 고관절 수술 및 골절 시술 이력이 있으며 고관절과 무릎 관절 상태가 악화되지 않고 유지되기를 희망하심.\n상지 기능은 비교적 양호하나 청력은 좌측 위주로 소통이 가능하고 치아는 아래 앞니 두 개가 임플란트이며 대부분 자연치를 유지하고 있음.\n\n치매로 인한 지남력, 기억력, 계산능력, 시공간 구성 능력 등 전반적 인지 기능이 심하게 저하되어 있으며, 인지검사에서는 질문에 적절한 답을 하지 못하고 동문서답을 지속해 4점으로 평가되었음.\n평소에도 대화가 본인의 하고 싶은 말 위주로 이어지며, 혼잣말이 많고 의사소통의 일관성이 떨어진 상태이나 간혹 질문을 이해하고 의사를 표현할 때도 있으나 그 빈도는 낮은 편'
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
				setMemberList(result.data || []);
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

	// 작성일자 목록 조회
	const fetchRecordDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setRecordDates([]);
			return;
		}

		setLoadingDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/needs-assessment-record/dates?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시 데이터
			const mockDates = ['2025-11-05', '2025-04-07', '2024-10-02', '2024-04-05'];
			setRecordDates(mockDates);
		} catch (err) {
			console.error('작성일자 조회 오류:', err);
		} finally {
			setLoadingDates(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: member.P_NM || '' }));
		fetchRecordDates(member.ANCD, member.PNUM);
	};

	// 작성일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = recordDates[index];
		setFormData(prev => ({ ...prev, creationDate: selectedDate || '' }));
		// TODO: 선택한 날짜의 기록 데이터 조회
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
		return dateStr;
	};

	// 활동 평가 값 변경 함수
	const handleActivityChange = (index: number, value: '○' | '△' | 'X' | '') => {
		const updatedActivities = [...activities];
		updatedActivities[index].value = value;
		setActivities(updatedActivities);
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.creationDate) {
			alert('작성일자를 입력해주세요.');
			return;
		}

		setLoadingDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedDateIndex !== null ? '/api/needs-assessment-record/update' : '/api/needs-assessment-record/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		ancd: selectedMember.ANCD,
			// 		pnum: selectedMember.PNUM,
			// 		...formData,
			// 		activities
			// 	})
			// });

			alert(selectedDateIndex !== null ? '욕구 사정 기록지가 수정되었습니다.' : '욕구 사정 기록지가 저장되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchRecordDates(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('욕구 사정 기록지 저장 오류:', err);
			alert('욕구 사정 기록지 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 기록을 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingDates(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/needs-assessment-record/${selectedDateIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('욕구 사정 기록지가 삭제되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchRecordDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				creationDate: '',
				creator: '',
				height: '0.0',
				weight: '0.0',
				judgmentBasis: ''
			}));
			setActivities(activities.map(a => ({ ...a, value: '' })));
			setSelectedDateIndex(null);
		} catch (err) {
			console.error('욕구 사정 기록지 삭제 오류:', err);
			alert('욕구 사정 기록지 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	const tabs = ['신체', '질병1', '질병2', '재활', '간호', '인지', '의사소통', '영양', '가족환경', '자원이용', '개별욕구', '총평'];

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
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
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">현황</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">등급</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">나이</th>
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
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_GRD === '0' ? '등급외' : member.P_GRD ? `${member.P_GRD}등급` : '-'}
												</td>
												<td className="px-2 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
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

				{/* 우측 패널: 평가 폼 */}
				<div className="flex flex-col flex-1 bg-white">
					{/* 상단: 탭 */}
					<div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-blue-200 bg-blue-50">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-3 py-1.5 text-sm font-medium border border-blue-300 rounded whitespace-nowrap ${
									activeTab === tab
										? 'bg-blue-500 text-white border-blue-500'
										: 'bg-white text-blue-900 hover:bg-blue-100'
								}`}
							>
								{tab}
							</button>
						))}
					</div>

					{/* 메인 컨텐츠 영역 */}
					<div className="flex flex-1 overflow-hidden">
						{/* 왼쪽: 작성일자 목록 */}
						<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
							<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
								<label className="text-sm font-medium text-blue-900">작성일자</label>
							</div>
							<div className="flex flex-col flex-1 overflow-hidden">
								<div className="flex-1 overflow-y-auto bg-white">
									{loadingDates ? (
										<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
									) : recordDates.length === 0 ? (
										<div className="px-3 py-2 text-sm text-blue-900/60">
											{selectedMember ? '작성일자가 없습니다' : '수급자를 선택해주세요'}
										</div>
									) : (
										recordDates.map((date, index) => (
											<div
												key={index}
												onClick={() => handleSelectDate(index)}
												className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
													selectedDateIndex === index ? 'bg-blue-100 font-semibold' : ''
												}`}
											>
												{formatDateDisplay(date)}
											</div>
										))
									)}
								</div>
							</div>
						</div>

						{/* 오른쪽: 평가 폼 */}
						<div className="flex flex-1 overflow-hidden bg-white">
							<div className="flex-1 p-4 overflow-y-auto">
								<div className="space-y-4">
								{/* 상단 정보 필드 */}
								<div className="flex flex-wrap items-center gap-4">
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
										<input
											type="text"
											value={formData.beneficiary}
											readOnly
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[120px]"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">작성일자</label>
										<input
											type="text"
											value={formData.creationDate}
											onChange={(e) => setFormData(prev => ({ ...prev, creationDate: e.target.value }))}
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[120px]"
											placeholder="YYYY-MM-DD"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">작성자</label>
										<input
											type="text"
											value={formData.creator}
											onChange={(e) => setFormData(prev => ({ ...prev, creator: e.target.value }))}
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[120px]"
										/>
									</div>
								</div>

								{/* 탭별 컨텐츠 */}
								{activeTab === '신체' && (
									<>
										{/* 키, 체중 */}
										<div className="flex items-center gap-4">
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">키</label>
												<input
													type="text"
													value={formData.height}
													onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 w-24"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">체중</label>
												<input
													type="text"
													value={formData.weight}
													onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 w-24"
												/>
											</div>
										</div>

										{/* 활동 평가 그리드 */}
										<div className="p-4 bg-white border border-blue-300 rounded-lg">
											<h3 className="mb-4 text-base font-semibold text-blue-900">활동 평가</h3>
											<div className="grid grid-cols-3 gap-4">
												{activities.map((activity, index) => (
													<div key={index} className="flex items-center gap-2">
														<div className="flex items-center gap-1">
															<button
																type="button"
																onClick={() => handleActivityChange(index, '○')}
																className={`w-8 h-8 text-sm border border-blue-300 rounded flex items-center justify-center ${
																	activity.value === '○' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-900 hover:bg-blue-50'
																}`}
															>
																○
															</button>
															<button
																type="button"
																onClick={() => handleActivityChange(index, '△')}
																className={`w-8 h-8 text-sm border border-blue-300 rounded flex items-center justify-center ${
																	activity.value === '△' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-900 hover:bg-blue-50'
																}`}
															>
																△
															</button>
															<button
																type="button"
																onClick={() => handleActivityChange(index, 'X')}
																className={`w-8 h-8 text-sm border border-blue-300 rounded flex items-center justify-center ${
																	activity.value === 'X' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-900 hover:bg-blue-50'
																}`}
															>
																X
															</button>
														</div>
														<span className="text-sm text-blue-900">{activity.activity}</span>
													</div>
												))}
											</div>
										</div>

										{/* 판단근거 */}
										<div className="flex items-start gap-2">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={formData.judgmentBasis}
												onChange={(e) => setFormData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
												placeholder="- 상체 움직임에 이상은 없으시나 신체활용 인지가 저하되시어 부분적 도움으로 벗고 입기 가능하심&#10;- 양치질하기는 스스로 수행이 가능하며, 뒷마무리만 도움이 필요함.&#10;- 식사 도구를 활용하여 드시는데 어려움 없으심.&#10;- 변의를 느끼시며 저절로 조절이 가능하시나..."
											/>
										</div>
									</>
								)}

								{/* 질병1 탭 */}
								{activeTab === '질병1' && (
									<>
										{/* 질병 체크박스 그리드 */}
										<div className="space-y-2">
											{[
												{ category: '내분.대사', diseases: ['당뇨', '갑상선질환', '탈수', '영양상태이상', '만성간염', '자기면역질환', '빈혈', '기타'] },
												{ category: '소화기계', diseases: ['위염', '위궤양', '십이지궤양', '변비', '간경변증', '기타'] },
												{ category: '순환기계', diseases: ['고혈압', '저혈압', '협심증', '심근경색증', '뇌혈관질환', '기타'] },
												{ category: '근골격계', diseases: ['관절염', '요통,좌골통', '기타 척추질환', '골다공증', '기타'] },
												{ category: '신경계', diseases: ['치매', '뇌경색', '파킨슨병', '두통', '두통외 통증', '기타'] },
												{ category: '정신.행동', diseases: ['신경증', '우울증', '수면장애', '기타'] },
												{ category: '호흡기계', diseases: ['폐결핵', '만성기관지염', '호흡곤란', '기타'] },
												{ category: '눈.귀질환', diseases: ['시각장애', '난청', '기타'] }
											].map((row, rowIndex) => (
												<div key={rowIndex} className="flex items-center gap-2">
													<div className="w-32 px-2 py-1 text-sm font-medium text-blue-900 border border-blue-300 rounded bg-blue-50">{row.category}</div>
													<div className="flex flex-wrap items-center flex-1 gap-2">
														{row.diseases.map((disease) => {
															const key = `${row.category}-${disease}`;
															return (
																<label key={key} className="flex items-center gap-1 cursor-pointer">
																	<input
																		type="checkbox"
																		checked={disease1Data[key] || false}
																		onChange={(e) => setDisease1Data(prev => ({ ...prev, [key]: e.target.checked }))}
																		className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
																	/>
																	<span className="text-sm text-blue-900">{disease}</span>
																</label>
															);
														})}
													</div>
												</div>
											))}
										</div>

										{/* 과거병력, 현 진단명, 판단근거 */}
										<div className="mt-4 space-y-4">
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">과거병력</label>
												<input
													type="text"
													value={diseaseFormData.pastMedicalHistory}
													onChange={(e) => setDiseaseFormData(prev => ({ ...prev, pastMedicalHistory: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">현 진단명</label>
												<input
													type="text"
													value={diseaseFormData.currentDiagnosis}
													onChange={(e) => setDiseaseFormData(prev => ({ ...prev, currentDiagnosis: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												/>
											</div>
											<div className="flex items-start gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
												<textarea
													value={diseaseFormData.judgmentBasis}
													onChange={(e) => setDiseaseFormData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
													rows={6}
												/>
											</div>
										</div>
									</>
								)}

								{/* 질병2 탭 */}
								{activeTab === '질병2' && (
									<>
										{/* 질병 체크박스 그리드 */}
										<div className="space-y-2">
											{[
												{ category: '비뇨.생식', diseases: ['전립선비대', '요실금', '만성방광염', '기타'] },
												{ category: '만성신장', diseases: ['만성신부전증', '기타'] }
											].map((row, rowIndex) => (
												<div key={rowIndex} className="flex items-center gap-2">
													<div className="w-32 px-2 py-1 text-sm font-medium text-blue-900 border border-blue-300 rounded bg-blue-50">{row.category}</div>
													<div className="flex flex-wrap items-center flex-1 gap-2">
														{row.diseases.map((disease) => {
															const key = `${row.category}-${disease}`;
															return (
																<label key={key} className="flex items-center gap-1 cursor-pointer">
																	<input
																		type="checkbox"
																		checked={disease2Data[key] || false}
																		onChange={(e) => setDisease2Data(prev => ({ ...prev, [key]: e.target.checked }))}
																		className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
																	/>
																	<span className="text-sm text-blue-900">{disease}</span>
																</label>
															);
														})}
													</div>
												</div>
											))}
										</div>

										{/* 과거병력, 현 진단명, 판단근거 */}
										<div className="mt-4 space-y-4">
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">과거병력</label>
												<input
													type="text"
													value={diseaseFormData.pastMedicalHistory}
													onChange={(e) => setDiseaseFormData(prev => ({ ...prev, pastMedicalHistory: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">현 진단명</label>
												<input
													type="text"
													value={diseaseFormData.currentDiagnosis}
													onChange={(e) => setDiseaseFormData(prev => ({ ...prev, currentDiagnosis: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												/>
											</div>
											<div className="flex items-start gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
												<textarea
													value={diseaseFormData.judgmentBasis}
													onChange={(e) => setDiseaseFormData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
													rows={6}
												/>
											</div>
										</div>
									</>
								)}

								{/* 재활 탭 */}
								{activeTab === '재활' && (
									<>
										<div className="grid grid-cols-4 gap-4">
											{[
												{ label: '우측상지', items: ['어깨관절(우)', '손목 및 수지관절(우)', '무릎관절(우)'] },
												{ label: '좌측상지', items: ['어깨관절(좌)', '손목 및 수지관절(좌)', '무릎관절(좌)'] },
												{ label: '우측하지', items: ['팔꿈치관절(우)', '고관절(우)', '발목관절(우)'] },
												{ label: '좌측하지', items: ['팔꿈치관절(좌)', '고관절(좌)', '발목관절(좌)'] }
											].map((column, colIndex) => (
												<div key={colIndex} className="space-y-2">
													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={rehabilitationData[column.label] || false}
															onChange={(e) => setRehabilitationData(prev => ({ ...prev, [column.label]: e.target.checked }))}
															className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
														/>
														<span className="text-sm font-medium text-blue-900">{column.label}</span>
													</label>
													{column.items.map((item) => (
														<label key={item} className="flex items-center gap-2 ml-6 cursor-pointer">
															<input
																type="checkbox"
																checked={rehabilitationData[item] || false}
																onChange={(e) => setRehabilitationData(prev => ({ ...prev, [item]: e.target.checked }))}
																className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
															/>
															<span className="text-sm text-blue-900">{item}</span>
														</label>
													))}
												</div>
											))}
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={rehabilitationJudgmentBasis}
												onChange={(e) => setRehabilitationJudgmentBasis(e.target.value)}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 간호 탭 */}
								{activeTab === '간호' && (
									<>
										<div className="grid grid-cols-5 gap-4">
											{[
												'기관지 절개관 간호', '흡인', '산소요법', '욕창간호', '경관영양',
												'통증간호', '장루간호', '도뇨관리', '투석간호', '당뇨발간호',
												'상처간호'
											].map((item) => (
												<label key={item} className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={nursingData[item] || false}
														onChange={(e) => setNursingData(prev => ({ ...prev, [item]: e.target.checked }))}
														className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
													/>
													<span className="text-sm text-blue-900">{item}</span>
												</label>
											))}
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={nursingJudgmentBasis}
												onChange={(e) => setNursingJudgmentBasis(e.target.value)}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 인지 탭 */}
								{activeTab === '인지' && (
									<>
										<div className="space-y-2">
											{[
												{ num: 1, label: '지남력' },
												{ num: 2, label: '기억력' },
												{ num: 3, label: '주의집중 및 계산' },
												{ num: 4, label: '언어적기능' },
												{ num: 5, label: '판단력' },
												{ num: 6, label: '편집증과 망상' },
												{ num: 7, label: '환각' },
												{ num: 8, label: '배회' },
												{ num: 9, label: '반복적인 활동' },
												{ num: 10, label: '부적절한 행동' },
												{ num: 11, label: '언어폭팔' },
												{ num: 12, label: '신체적 공격 또는 폭력행위' },
												{ num: 13, label: '우울' },
												{ num: 14, label: '일반적인 불안' },
												{ num: '', label: '혼자 남겨짐에 대한 공포' }
											].map((item) => (
												<label key={item.label} className="flex items-center gap-2 cursor-pointer">
													<span className="w-8 text-sm text-blue-900">{item.num}</span>
													<input
														type="checkbox"
														checked={cognitionData[item.label] || false}
														onChange={(e) => setCognitionData(prev => ({ ...prev, [item.label]: e.target.checked }))}
														className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
													/>
													<span className="text-sm text-blue-900">{item.label}</span>
												</label>
											))}
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={cognitionJudgmentBasis}
												onChange={(e) => setCognitionJudgmentBasis(e.target.value)}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 의사소통 탭 */}
								{activeTab === '의사소통' && (
									<>
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">청취능력</label>
												<select
													value={communicationData.listeningAbility}
													onChange={(e) => setCommunicationData(prev => ({ ...prev, listeningAbility: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="보통의 소리를 듣기는 하고, 못 듣기도 한다">보통의 소리를 듣기는 하고, 못 듣기도 한다</option>
													<option value="정상적으로 들린다">정상적으로 들린다</option>
													<option value="거의 들리지 않는다">거의 들리지 않는다</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">의사소통</label>
												<select
													value={communicationData.communication}
													onChange={(e) => setCommunicationData(prev => ({ ...prev, communication: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="가끔 이해하고 의사를 표현한다">가끔 이해하고 의사를 표현한다</option>
													<option value="정상적으로 의사소통한다">정상적으로 의사소통한다</option>
													<option value="의사소통이 어렵다">의사소통이 어렵다</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">발음능력</label>
												<select
													value={communicationData.pronunciationAbility}
													onChange={(e) => setCommunicationData(prev => ({ ...prev, pronunciationAbility: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="간혹 어눌한 발음이 섞인다">간혹 어눌한 발음이 섞인다</option>
													<option value="정상적인 발음">정상적인 발음</option>
													<option value="발음이 매우 어눌하다">발음이 매우 어눌하다</option>
												</select>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={communicationData.judgmentBasis}
												onChange={(e) => setCommunicationData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 영양 탭 */}
								{activeTab === '영양' && (
									<>
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">치아상태</label>
												<select
													value={nutritionData.dentalCondition}
													onChange={(e) => setNutritionData(prev => ({ ...prev, dentalCondition: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="양호">양호</option>
													<option value="보통">보통</option>
													<option value="불량">불량</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">식사시문제점</label>
												<select
													value={nutritionData.eatingProblems}
													onChange={(e) => setNutritionData(prev => ({ ...prev, eatingProblems: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="식욕저하">식욕저하</option>
													<option value="없음">없음</option>
													<option value="삼킴곤란">삼킴곤란</option>
													<option value="저작곤란">저작곤란</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">식사상태</label>
												<select
													value={nutritionData.eatingStatus}
													onChange={(e) => setNutritionData(prev => ({ ...prev, eatingStatus: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="일반식">일반식</option>
													<option value="연식">연식</option>
													<option value="유동식">유동식</option>
													<option value="경관영양">경관영양</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">도구사용</label>
												<select
													value={nutritionData.toolUsage}
													onChange={(e) => setNutritionData(prev => ({ ...prev, toolUsage: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="젓가락">젓가락</option>
													<option value="숟가락">숟가락</option>
													<option value="손">손</option>
													<option value="도움">도움</option>
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">배설양상</label>
												<select
													value={nutritionData.excretionPattern}
													onChange={(e) => setNutritionData(prev => ({ ...prev, excretionPattern: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
												>
													<option value="정상">정상</option>
													<option value="변비">변비</option>
													<option value="설사">설사</option>
													<option value="실금">실금</option>
												</select>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={nutritionData.judgmentBasis}
												onChange={(e) => setNutritionData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 가족환경 탭 */}
								{activeTab === '가족환경' && (
									<>
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">결혼여부</label>
													<select
														value={familyEnvironmentData.maritalStatus}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, maritalStatus: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="기혼">기혼</option>
														<option value="미혼">미혼</option>
														<option value="이혼">이혼</option>
														<option value="사별">사별</option>
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">주수발자</label>
													<select
														value={familyEnvironmentData.primaryCaregiver}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, primaryCaregiver: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="유">유</option>
														<option value="무">무</option>
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">주수발자 관계</label>
													<select
														value={familyEnvironmentData.primaryCaregiverRelationship}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, primaryCaregiverRelationship: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="자녀">자녀</option>
														<option value="배우자">배우자</option>
														<option value="형제자매">형제자매</option>
														<option value="친척">친척</option>
														<option value="기타">기타</option>
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">동거인</label>
													<select
														value={familyEnvironmentData.cohabitant}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, cohabitant: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="자녀">자녀</option>
														<option value="배우자">배우자</option>
														<option value="형제자매">형제자매</option>
														<option value="친척">친척</option>
														<option value="혼자">혼자</option>
														<option value="기타">기타</option>
													</select>
												</div>
											</div>
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">자녀수</label>
													<input
														type="text"
														value={familyEnvironmentData.numberOfChildren}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, numberOfChildren: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">주수발자 연령</label>
													<input
														type="text"
														value={familyEnvironmentData.primaryCaregiverAge}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, primaryCaregiverAge: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">관계기타</label>
													<input
														type="text"
														value={familyEnvironmentData.otherRelationship}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, otherRelationship: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">배우자 생존여부</label>
													<select
														value={familyEnvironmentData.spouseSurvivalStatus}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, spouseSurvivalStatus: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="생존">생존</option>
														<option value="사망">사망</option>
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">주수발자 경제상태</label>
													<select
														value={familyEnvironmentData.primaryCaregiverEconomicStatus}
														onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, primaryCaregiverEconomicStatus: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="안정">안정</option>
														<option value="보통">보통</option>
														<option value="불안정">불안정</option>
													</select>
												</div>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={familyEnvironmentData.judgmentBasis}
												onChange={(e) => setFamilyEnvironmentData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 자원이용 탭 */}
								{activeTab === '자원이용' && (
									<>
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">종교</label>
													<select
														value={resourceUtilizationData.religion}
														onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, religion: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													>
														<option value="기독교">기독교</option>
														<option value="불교">불교</option>
														<option value="천주교">천주교</option>
														<option value="기타">기타</option>
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">주이용의료기관</label>
													<input
														type="text"
														value={resourceUtilizationData.primaryMedicalInstitution}
														onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, primaryMedicalInstitution: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
												<div className="flex items-start gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">지역사회</label>
													<div className="flex-1 space-y-2">
														{['급식 및 도시락배달', '이미용'].map((service) => {
															const serviceKey = service as keyof typeof resourceUtilizationData.communityServices;
															return (
																<label key={service} className="flex items-center gap-2 cursor-pointer">
																	<input
																		type="checkbox"
																		checked={resourceUtilizationData.communityServices[serviceKey] || false}
																		onChange={(e) => setResourceUtilizationData(prev => ({
																			...prev,
																			communityServices: {
																				...prev.communityServices,
																				[serviceKey]: e.target.checked
																			}
																		}))}
																		className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
																	/>
																	<span className="text-sm text-blue-900">{service}</span>
																</label>
															);
														})}
													</div>
												</div>
											</div>
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">종교 기타</label>
													<input
														type="text"
														value={resourceUtilizationData.religionOther}
														onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, religionOther: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">전화번호</label>
													<input
														type="text"
														value={resourceUtilizationData.phoneNumber}
														onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, phoneNumber: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap"></label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={resourceUtilizationData.housingImprovementProject}
															onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, housingImprovementProject: e.target.checked }))}
															className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">주거개선사업</span>
													</label>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">기타</label>
													<input
														type="text"
														value={resourceUtilizationData.other}
														onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, other: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
													/>
												</div>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">판단근거</label>
											<textarea
												value={resourceUtilizationData.judgmentBasis}
												onChange={(e) => setResourceUtilizationData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px]"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 개별욕구 탭 */}
								{activeTab === '개별욕구' && (
									<>
										<div className="p-4 bg-white border border-blue-300 rounded-lg">
											<h3 className="mb-4 text-base font-semibold text-blue-900">수급자 및 보호자 개별 욕구</h3>
											<div className="grid grid-cols-3 gap-4 mb-4">
												<div className="flex flex-col items-center gap-2">
													<div className="text-sm font-medium text-blue-900">약물투약요구</div>
													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={individualNeedsData.medicationAdministrationRequest}
															onChange={(e) => setIndividualNeedsData(prev => ({ ...prev, medicationAdministrationRequest: e.target.checked }))}
															className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
														/>
													</label>
												</div>
												<div className="flex flex-col items-center gap-2">
													<div className="text-sm font-medium text-blue-900">병원동행</div>
													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={individualNeedsData.hospitalAccompaniment}
															onChange={(e) => setIndividualNeedsData(prev => ({ ...prev, hospitalAccompaniment: e.target.checked }))}
															className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
														/>
													</label>
												</div>
												<div className="flex flex-col items-center gap-2">
													<div className="text-sm font-medium text-blue-900">외출동행(은행등)</div>
													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={individualNeedsData.outingAccompaniment}
															onChange={(e) => setIndividualNeedsData(prev => ({ ...prev, outingAccompaniment: e.target.checked }))}
															className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
														/>
													</label>
												</div>
											</div>
											<div className="mt-4">
												<textarea
													value={individualNeedsData.notes}
													onChange={(e) => setIndividualNeedsData(prev => ({ ...prev, notes: e.target.value }))}
													className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[200px]"
													rows={8}
													placeholder="- 과거에 골절 시술 및 수술을 한 이력이 있어 더이상 악화되지 않고 유지 되기를 희망하심.&#10;- 촉탁의를 통한 진료 및 약처방을 원하심."
												/>
											</div>
										</div>
									</>
								)}

								{/* 총평 탭 */}
								{activeTab === '총평' && (
									<>
										<div className="flex items-start gap-2">
											<textarea
												value={overallAssessmentData.content}
												onChange={(e) => setOverallAssessmentData(prev => ({ ...prev, content: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[500px]"
												rows={20}
												placeholder="상체 기능은 양호하나 신체 활용에 대한 인지 저하로 인해 의복 착?탈의 시 부분적 도움이 필요함.&#10;양치질은 스스로 가능하나 마무리 과정에서 약간의 도움이 요구됨.&#10;식사 시에는 도구 사용에 어려움이 없으나 식사량이 적으며, 입소 전부터 지속된 소식 경향을 보이심.&#10;반찬을 한 그릇에 모으는 등 반복적 정리 행동이 관찰됨.&#10;배뇨?배변 감각과 표현은 가능하며, 전적인 도움을 통해 화장실 이용이 가능하고 배설 상태는 양호하심&#10;&#10;과거 고관절 수술 및 골절 시술 이력이 있으며 고관절과 무릎 관절 상태가 악화되지 않고 유지되기를 희망하심.&#10;상지 기능은 비교적 양호하나 청력은 좌측 위주로 소통이 가능하고 치아는 아래 앞니 두 개가 임플란트이며 대부분 자연치를 유지하고 있음.&#10;&#10;치매로 인한 지남력, 기억력, 계산능력, 시공간 구성 능력 등 전반적 인지 기능이 심하게 저하되어 있으며, 인지검사에서는 질문에 적절한 답을 하지 못하고 동문서답을 지속해 4점으로 평가되었음.&#10;평소에도 대화가 본인의 하고 싶은 말 위주로 이어지며, 혼잣말이 많고 의사소통의 일관성이 떨어진 상태이나 간혹 질문을 이해하고 의사를 표현할 때도 있으나 그 빈도는 낮은 편"
											/>
										</div>
									</>
								)}
								</div>
							</div>

							{/* 오른쪽 버튼 영역 */}
							<div className="flex flex-col gap-2 p-4 border-l border-blue-200">
								{activeTab !== '총평' && (
									<button
										onClick={handleDelete}
										className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
									>
										삭제
									</button>
								)}
								<button
									onClick={handleSave}
									className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
								>
									저장
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
