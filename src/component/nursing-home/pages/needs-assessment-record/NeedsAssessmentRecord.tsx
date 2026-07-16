"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import {
	NO_ROOM_VALUE,
	attachLatestRoomNoByPnum,
	availableFloorsFromMembers,
} from '../../utils/roomNoFloor';
import { matchesSelectedFloorByRoomNo } from '../../utils/roomNoFloorFilter';
import {
	emptySnapshot,
	hydrateFromF51012Row,
	buildF51012RowPayload,
	collectUiSnapshot,
	PHYSICAL_ACTIVITY_ITEMS,
	H01_OPTIONS,
	H02_OPTIONS,
	H03_OPTIONS,
	I01_OPTIONS,
	I02_OPTIONS,
	I03_OPTIONS,
	I04_OPTIONS,
	I05_OPTIONS,
	J01_OPTIONS,
	J01_01_OPTIONS,
	J02_OPTIONS,
	J02_02_OPTIONS,
	J02_04_OPTIONS,
	J03_OPTIONS,
	K01_OPTIONS,
	type ActivityAssessment,
	type F51012UiSnapshot,
} from './f51012Mapper';
import { openNeedsAssessmentBatchPrint, openNeedsAssessmentPrint } from './needsAssessmentRecordPrint';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	P_YYNO?: string | null;
	P_NO?: string | null;
	ROOM_NO?: string | null;
	[key: string]: any;
}

export default function NeedsAssessmentRecord() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [recordDates, setRecordDates] = useState<string[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);
	/** 일괄출력용 체크된 수급자 키 (ANCD-PNUM) */
	const [checkedMemberKeys, setCheckedMemberKeys] = useState<Set<string>>(new Set());
	const [batchPrintFrom, setBatchPrintFrom] = useState('');
	const [batchPrintTo, setBatchPrintTo] = useState('');
	const [batchPrinting, setBatchPrinting] = useState(false);
	const [activeTab, setActiveTab] = useState<string>('신체');
	/** false = 읽기모드, true = 수정모드 */
	const [isEditMode, setIsEditMode] = useState(false);
	/** 수정 취소 시 복원용 */
	const [backupSnapshot, setBackupSnapshot] = useState<F51012UiSnapshot | null>(null);

	/** 작성자(F01010) 검색 */
	const [creatorSuggestions, setCreatorSuggestions] = useState<Array<{ EMPNO: string | number; EMPNM: string }>>([]);
	const [showCreatorDropdown, setShowCreatorDropdown] = useState(false);
	const [creatorSearchLoading, setCreatorSearchLoading] = useState(false);
	const creatorWrapRef = useRef<HTMLDivElement | null>(null);

	const initialSnap = emptySnapshot('', '');
	const [formData, setFormData] = useState(initialSnap.formData);
	const [activities, setActivities] = useState<ActivityAssessment[]>(initialSnap.activities);
	const [disease1Data, setDisease1Data] = useState<{ [key: string]: boolean }>(initialSnap.disease1Data);
	const [disease2Data, setDisease2Data] = useState<{ [key: string]: boolean }>(initialSnap.disease2Data);
	const [diseaseFormData, setDiseaseFormData] = useState(initialSnap.diseaseFormData);
	const [rehabilitationData, setRehabilitationData] = useState<{ [key: string]: boolean }>(initialSnap.rehabilitationData);
	const [rehabilitationJudgmentBasis, setRehabilitationJudgmentBasis] = useState(initialSnap.rehabilitationJudgmentBasis);
	const [nursingData, setNursingData] = useState<{ [key: string]: boolean }>(initialSnap.nursingData);
	const [nursingJudgmentBasis, setNursingJudgmentBasis] = useState(initialSnap.nursingJudgmentBasis);
	const [cognitionData, setCognitionData] = useState<{ [key: string]: boolean }>(initialSnap.cognitionData);
	const [cognitionJudgmentBasis, setCognitionJudgmentBasis] = useState(initialSnap.cognitionJudgmentBasis);
	const [communicationData, setCommunicationData] = useState(initialSnap.communicationData);
	const [nutritionData, setNutritionData] = useState(initialSnap.nutritionData);
	const [familyEnvironmentData, setFamilyEnvironmentData] = useState(initialSnap.familyEnvironmentData);
	const [resourceUtilizationData, setResourceUtilizationData] = useState(initialSnap.resourceUtilizationData);
	const [individualNeedsData, setIndividualNeedsData] = useState(initialSnap.individualNeedsData);
	const [overallAssessmentData, setOverallAssessmentData] = useState(initialSnap.overallAssessmentData);

	const applyF51012Snapshot = (s: F51012UiSnapshot) => {
		setFormData(s.formData);
		setActivities(s.activities);
		setDisease1Data(s.disease1Data);
		setDisease2Data(s.disease2Data);
		setDiseaseFormData(s.diseaseFormData);
		setRehabilitationData(s.rehabilitationData);
		setRehabilitationJudgmentBasis(s.rehabilitationJudgmentBasis);
		setNursingData(s.nursingData);
		setNursingJudgmentBasis(s.nursingJudgmentBasis);
		setCognitionData(s.cognitionData);
		setCognitionJudgmentBasis(s.cognitionJudgmentBasis);
		setCommunicationData(s.communicationData);
		setNutritionData(s.nutritionData);
		setFamilyEnvironmentData(s.familyEnvironmentData);
		setResourceUtilizationData(s.resourceUtilizationData);
		setIndividualNeedsData(s.individualNeedsData);
		setOverallAssessmentData(s.overallAssessmentData);
	};

	const captureCurrentSnapshot = (): F51012UiSnapshot =>
		collectUiSnapshot({
			formData,
			activities,
			disease1Data,
			disease2Data,
			diseaseFormData,
			rehabilitationData,
			rehabilitationJudgmentBasis,
			nursingData,
			nursingJudgmentBasis,
			cognitionData,
			cognitionJudgmentBasis,
			communicationData,
			nutritionData,
			familyEnvironmentData,
			resourceUtilizationData,
			individualNeedsData,
			overallAssessmentData,
		});

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const availableFloors = availableFloorsFromMembers(memberList);

	const memberKey = (m: Pick<MemberData, 'ANCD' | 'PNUM'>) =>
		`${String(m.ANCD ?? '').trim()}::${String(m.PNUM ?? '').trim()}`;

	const toggleMemberChecked = (member: MemberData, checked: boolean) => {
		const key = memberKey(member);
		setCheckedMemberKeys((prev) => {
			const next = new Set(prev);
			if (checked) next.add(key);
			else next.delete(key);
			return next;
		});
	};

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
				const raw = Array.isArray(result.data) ? result.data : [];
				// F10010에는 ROOM_NO가 없음 — MemberInfoView와 동일하게 F14090에서 병합
				const merged = await attachLatestRoomNoByPnum<MemberData>(raw as MemberData[]);
				setMemberList(merged);
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
		
		if (!matchesSelectedFloorByRoomNo(member.ROOM_NO, selectedFloor)) {
			return false;
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

	const allFilteredChecked =
		filteredMembers.length > 0 && filteredMembers.every((m) => checkedMemberKeys.has(memberKey(m)));

	const toggleAllFilteredChecked = (checked: boolean) => {
		setCheckedMemberKeys((prev) => {
			const next = new Set(prev);
			for (const m of filteredMembers) {
				const key = memberKey(m);
				if (checked) next.add(key);
				else next.delete(key);
			}
			return next;
		});
	};

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

	// 작성일자(RQDT) 목록 조회 — F51012
	const fetchRecordDates = async (ancd: string, pnum: string): Promise<string[]> => {
		if (!ancd || !pnum) {
			setRecordDates([]);
			return [];
		}

		setLoadingDates(true);
		try {
			const res = await fetch(`/api/f51012?pnum=${encodeURIComponent(String(pnum).trim())}`);
			const result = await res.json();
			if (result.success && Array.isArray(result.data)) {
				setRecordDates(result.data);
				return result.data;
			}
			setRecordDates([]);
			return [];
		} catch (err) {
			console.error('작성일자 조회 오류:', err);
			setRecordDates([]);
			return [];
		} finally {
			setLoadingDates(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedDateIndex(null);
		setIsEditMode(false);
		setBackupSnapshot(null);
		applyF51012Snapshot(emptySnapshot(member.P_NM || '', ''));
		void fetchRecordDates(member.ANCD, member.PNUM);
	};

	// 작성일자(RQDT) 선택 — 해당 일자 F51012 상세 조회
	const handleSelectDate = async (index: number) => {
		if (!selectedMember) return;
		const rqdtRaw = recordDates[index];
		if (rqdtRaw == null) return;

		setSelectedDateIndex(index);
		setIsEditMode(false);
		setBackupSnapshot(null);
		const rqdt = formatDateDisplay(String(rqdtRaw));
		setFormData((prev) => ({ ...prev, creationDate: rqdt }));

		setLoadingDates(true);
		try {
			const res = await fetch(
				`/api/f51012?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}`
			);
			const result = await res.json();
			if (result.success && result.data && typeof result.data === 'object') {
				const hydrated = hydrateFromF51012Row(result.data as Record<string, unknown>, selectedMember.P_NM || '');
				applyF51012Snapshot(hydrated);
			} else {
				console.warn('F51012 단건 없음:', { pnum: selectedMember.PNUM, rqdt, result });
				applyF51012Snapshot(emptySnapshot(selectedMember.P_NM || '', rqdt));
			}
		} catch (err) {
			console.error('욕구사정 기록 조회 오류:', err);
			alert('기록을 불러오는 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	/** 작성일자 목록 개별출력 — 해당 일자 데이터 즉시 인쇄 */
	const handlePrintRecord = async (index: number) => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const rqdtRaw = recordDates[index];
		if (rqdtRaw == null) return;
		const rqdt = formatDateDisplay(String(rqdtRaw));
		if (!rqdt) {
			alert('출력할 작성일자가 올바르지 않습니다.');
			return;
		}

		try {
			const res = await fetch(
				`/api/f51012?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}`
			);
			const result = await res.json();
			if (!(result.success && result.data && typeof result.data === 'object')) {
				alert('출력할 기록을 찾을 수 없습니다.');
				return;
			}
			const snap = hydrateFromF51012Row(result.data as Record<string, unknown>, selectedMember.P_NM || '');
			openNeedsAssessmentPrint(snap, selectedMember);
		} catch (err) {
			console.error('욕구사정 개별출력 오류:', err);
			alert('출력 준비 중 오류가 발생했습니다.');
		}
	};

	/** 체크된 수급자 + 기간 일괄출력 */
	const handleBatchPrint = async () => {
		if (checkedMemberKeys.size === 0) {
			alert('출력할 수급자를 체크해주세요.');
			return;
		}
		if (!batchPrintFrom || !batchPrintTo) {
			alert('출력 기간(시작일·종료일)을 설정해주세요.');
			return;
		}
		const from = formatDateDisplay(batchPrintFrom);
		const to = formatDateDisplay(batchPrintTo);
		if (!from || !to) {
			alert('출력 기간 형식이 올바르지 않습니다.');
			return;
		}
		if (from > to) {
			alert('시작일이 종료일보다 늦을 수 없습니다.');
			return;
		}

		const targets = memberList.filter((m) => checkedMemberKeys.has(memberKey(m)));
		if (targets.length === 0) {
			alert('체크된 수급자를 찾을 수 없습니다.');
			return;
		}

		setBatchPrinting(true);
		try {
			const printItems: Array<{ snap: F51012UiSnapshot; member: MemberData }> = [];

			for (const member of targets) {
				const listRes = await fetch(
					`/api/f51012?pnum=${encodeURIComponent(String(member.PNUM).trim())}`
				);
				const listJson = await listRes.json();
				const dates: string[] = Array.isArray(listJson?.data) ? listJson.data : [];
				const inRange = dates
					.map((d) => formatDateDisplay(String(d)))
					.filter((d) => d && d >= from && d <= to)
					.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

				for (const rqdt of inRange) {
					const detailRes = await fetch(
						`/api/f51012?pnum=${encodeURIComponent(String(member.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}`
					);
					const detailJson = await detailRes.json();
					if (detailJson?.success && detailJson.data && typeof detailJson.data === 'object') {
						const snap = hydrateFromF51012Row(
							detailJson.data as Record<string, unknown>,
							member.P_NM || ''
						);
						printItems.push({ snap, member });
					}
				}
			}

			if (printItems.length === 0) {
				alert('선택한 수급자·기간에 해당하는 욕구사정기록이 없습니다.');
				return;
			}

			openNeedsAssessmentBatchPrint(printItems);
		} catch (err) {
			console.error('욕구사정 일괄출력 오류:', err);
			alert('일괄출력 준비 중 오류가 발생했습니다.');
		} finally {
			setBatchPrinting(false);
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
		return dateStr;
	};

	const handleActivityChange = (index: number, value: '○' | '△' | 'X' | '') => {
		if (!isEditMode) return;
		setActivities((prev) => {
			const updatedActivities = [...prev];
			const current = updatedActivities[index];
			if (!current) return prev;
			updatedActivities[index] = {
				...current,
				value: current.value === value ? '' : value,
			};
			return updatedActivities;
		});
	};

	const isReadOnly = !isEditMode;

	const searchCreatorByName = useCallback(async (name: string) => {
		const q = name.trim();
		if (!q) {
			setCreatorSuggestions([]);
			setShowCreatorDropdown(false);
			return;
		}
		setCreatorSearchLoading(true);
		try {
			const res = await fetch(`/api/f01010?name=${encodeURIComponent(q)}`);
			const json = await res.json();
			if (json?.success && Array.isArray(json.data)) {
				setCreatorSuggestions(json.data);
				setShowCreatorDropdown(json.data.length > 0);
			} else {
				setCreatorSuggestions([]);
				setShowCreatorDropdown(false);
			}
		} catch {
			setCreatorSuggestions([]);
			setShowCreatorDropdown(false);
		} finally {
			setCreatorSearchLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!isEditMode) {
			setShowCreatorDropdown(false);
			return;
		}
		// 이미 목록에서 선택한 EMPNO가 있으면 재검색하지 않음
		if (String(formData.creatorEmpno ?? '').trim()) {
			setShowCreatorDropdown(false);
			return;
		}
		const name = String(formData.creator ?? '').trim();
		const timer = setTimeout(() => {
			if (name.length >= 1) {
				void searchCreatorByName(name);
			} else {
				setCreatorSuggestions([]);
				setShowCreatorDropdown(false);
			}
		}, 280);
		return () => clearTimeout(timer);
	}, [formData.creator, formData.creatorEmpno, isEditMode, searchCreatorByName]);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			const t = e.target as Node;
			if (creatorWrapRef.current && !creatorWrapRef.current.contains(t)) {
				setShowCreatorDropdown(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, []);

	const handlePickCreator = (emp: { EMPNO: string | number; EMPNM: string }) => {
		setFormData((prev) => ({
			...prev,
			creator: String(emp.EMPNM ?? '').trim(),
			creatorEmpno: emp.EMPNO != null ? String(emp.EMPNO) : '',
		}));
		setShowCreatorDropdown(false);
		setCreatorSuggestions([]);
	};

	const handleEnterEditMode = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formatDateDisplay(formData.creationDate.trim())) {
			alert('수정할 작성일자를 목록에서 선택해 주세요.\n새 기록을 만들려면 「신규생성」을 눌러 주세요.');
			return;
		}
		setBackupSnapshot(captureCurrentSnapshot());
		setIsEditMode(true);
	};

	const handleCreateNew = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (isEditMode) {
			alert('수정/작성 중에는 신규생성을 할 수 없습니다. 먼저 저장하거나 취소해 주세요.');
			return;
		}
		const d = new Date();
		const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		setBackupSnapshot(captureCurrentSnapshot());
		setSelectedDateIndex(null);
		applyF51012Snapshot(emptySnapshot(selectedMember.P_NM || '', today));
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		if (backupSnapshot) {
			applyF51012Snapshot(backupSnapshot);
		}
		setBackupSnapshot(null);
		setIsEditMode(false);
	};

	// 저장 — F51012 MERGE (작성일자 RQDT 기준)
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!isEditMode) {
			alert('수정 버튼을 눌러 수정모드로 전환해 주세요.');
			return;
		}

		const rqdt = formatDateDisplay(formData.creationDate.trim());
		if (!rqdt) {
			alert('작성일자(RQDT)를 YYYY-MM-DD 형식으로 입력해주세요.');
			return;
		}
		const empno = String(formData.creatorEmpno ?? '').trim();
		if (!empno || !Number.isFinite(parseInt(empno, 10))) {
			alert('작성자를 직원 검색에서 선택해 주세요. (F01010 EMPNO → RQEMP)');
			return;
		}

		setLoadingDates(true);
		try {
			const snap = collectUiSnapshot({
				formData: {
					...formData,
					beneficiary: selectedMember.P_NM || '',
					creationDate: rqdt,
				},
				activities,
				disease1Data,
				disease2Data,
				diseaseFormData,
				rehabilitationData,
				rehabilitationJudgmentBasis,
				nursingData,
				nursingJudgmentBasis,
				cognitionData,
				cognitionJudgmentBasis,
				communicationData,
				nutritionData,
				familyEnvironmentData,
				resourceUtilizationData,
				individualNeedsData,
				overallAssessmentData,
			});
			const row = buildF51012RowPayload(snap, selectedMember.ANCD, selectedMember.PNUM, rqdt);
			const response = await fetch('/api/f51012', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ row }),
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				alert(result.error || '욕구 사정 기록지 저장에 실패했습니다.');
				return;
			}

			alert('욕구 사정 기록지가 저장되었습니다.');
			setIsEditMode(false);
			setBackupSnapshot(null);
			const dates = await fetchRecordDates(selectedMember.ANCD, selectedMember.PNUM);
			const idx = dates.findIndex((d) => formatDateDisplay(d) === rqdt);
			if (idx >= 0) {
				setSelectedDateIndex(idx);
				// 저장 후 최신 데이터 재조회
				const res = await fetch(
					`/api/f51012?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}`
				);
				const detail = await res.json();
				if (detail.success && detail.data) {
					applyF51012Snapshot(hydrateFromF51012Row(detail.data as Record<string, unknown>, selectedMember.P_NM || ''));
				}
			}
		} catch (err) {
			console.error('욕구 사정 기록지 저장 오류:', err);
			alert('욕구 사정 기록지 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	// 삭제 — F51012 (ANCD, PNUM, RQDT)
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		const rqdt = formatDateDisplay(formData.creationDate.trim());
		if (!rqdt) {
			alert('삭제할 작성일자(RQDT)를 입력하거나 목록에서 선택해주세요.');
			return;
		}

		const name = String(selectedMember.P_NM || formData.beneficiary || '').trim() || '해당 수급자';
		const ok = window.confirm(
			`정말 삭제하시겠습니까?\n\n수급자: ${name}\n작성일자: ${rqdt}\n\n삭제된 기록은 복구할 수 없습니다.`
		);
		if (!ok) return;

		setLoadingDates(true);
		try {
			const response = await fetch(
				`/api/f51012?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}`,
				{ method: 'DELETE' }
			);
			const result = await response.json();
			if (!response.ok || !result.success) {
				alert(result.error || '삭제에 실패했습니다.');
				return;
			}

			alert('욕구 사정 기록지가 삭제되었습니다.');
			await fetchRecordDates(selectedMember.ANCD, selectedMember.PNUM);
			setSelectedDateIndex(null);
			setIsEditMode(false);
			setBackupSnapshot(null);
			applyF51012Snapshot(emptySnapshot(selectedMember.P_NM || '', ''));
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
					{/* 일괄출력: 기간 + 버튼 */}
					<div className="mb-3 p-2 space-y-2 border border-blue-200 rounded-lg bg-blue-50/60">
						<div className="text-xs font-semibold text-blue-900">일괄출력 기간</div>
						<div className="flex items-center gap-1">
							<input
								type="date"
								value={batchPrintFrom}
								onChange={(e) => setBatchPrintFrom(e.target.value)}
								className="flex-1 min-w-0 px-1 py-1 text-xs bg-white border border-blue-300 rounded"
							/>
							<span className="text-xs text-blue-900 shrink-0">~</span>
							<input
								type="date"
								value={batchPrintTo}
								onChange={(e) => setBatchPrintTo(e.target.value)}
								className="flex-1 min-w-0 px-1 py-1 text-xs bg-white border border-blue-300 rounded"
							/>
						</div>
						<button
							type="button"
							onClick={() => void handleBatchPrint()}
							disabled={batchPrinting || checkedMemberKeys.size === 0}
							className="w-full px-2 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{batchPrinting ? '출력 준비 중...' : `일괄출력 (${checkedMemberKeys.size}명)`}
						</button>
					</div>

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
									<option value="9">인지지원</option>
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
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">층수 전체</option>
									<option value={NO_ROOM_VALUE}>방번호 없음</option>
									{availableFloors.map((floor) => (
										<option key={floor} value={String(floor)}>
											{floor}층
										</option>
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
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200 w-8">
											<input
												type="checkbox"
												checked={allFilteredChecked}
												onChange={(e) => toggleAllFilteredChecked(e.target.checked)}
												className="w-3.5 h-3.5 border-blue-300 rounded"
												title="현재 필터 수급자 전체 선택"
											/>
										</th>
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">현황</th>
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">등급</th>
										<th className="px-1 py-1.5 font-semibold text-center text-blue-900">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">수급자 데이터가 없습니다</td>
										</tr>
									) : (
										currentMembers.map((member, index) => {
											const key = memberKey(member);
											const isChecked = checkedMemberKeys.has(key);
											return (
												<tr
													key={`${member.ANCD}-${member.PNUM}-${index}`}
													onClick={() => handleSelectMember(member)}
													className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
														selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM
															? 'bg-blue-100'
															: ''
													}`}
												>
													<td
														className="px-1 py-1.5 text-center border-r border-blue-100"
														onClick={(e) => e.stopPropagation()}
													>
														<input
															type="checkbox"
															checked={isChecked}
															onChange={(e) => toggleMemberChecked(member, e.target.checked)}
															className="w-3.5 h-3.5 border-blue-300 rounded"
														/>
													</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">{startIndex + index + 1}</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">
														{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
													</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">{member.P_NM || '-'}</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">
														{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
													</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">
														{formatCareGradeLabel(member.P_GRD)}
													</td>
													<td className="px-1 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
												</tr>
											);
										})
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
												className={`flex items-center gap-1 px-2 py-1.5 text-sm border-b border-blue-50 ${
													selectedDateIndex === index ? 'bg-blue-100 font-semibold' : ''
												}`}
											>
												<button
													type="button"
													onClick={() => void handleSelectDate(index)}
													className="flex-1 min-w-0 text-left hover:text-blue-700 truncate"
												>
													{formatDateDisplay(date)}
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														void handlePrintRecord(index);
													}}
													className="shrink-0 px-1.5 py-0.5 text-[11px] font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200"
													title="개별출력"
												>
													출력
												</button>
											</div>
										))
									)}
								</div>
							</div>
						</div>

						{/* 오른쪽: 평가 폼 */}
						<div className="flex flex-1 overflow-hidden bg-white">
							<div className="relative flex-1 min-w-0 overflow-hidden">
								<div
									className={`h-full p-4 overflow-y-auto ${
										selectedMember && selectedDateIndex == null && !isEditMode
											? 'blur-sm select-none pointer-events-none opacity-70'
											: ''
									}`}
								>
								{!selectedMember ? (
									<div className="flex items-center justify-center h-40 text-sm text-blue-900/60">
										수급자를 선택해주세요
									</div>
								) : (
								<fieldset
									className={`min-w-0 space-y-4 border-0 p-0 m-0 ${isReadOnly ? 'pointer-events-none select-none' : ''}`}
								>
								{!isEditMode ? (
									<p className="text-xs text-blue-900/70 -mt-1">읽기모드 · 「신규생성」또는 「수정」으로 작성할 수 있습니다.</p>
								) : selectedDateIndex == null ? (
									<p className="text-xs text-green-800 -mt-1">신규 작성모드 · 작성일자·작성자 입력 후 「저장」하세요.</p>
								) : (
									<p className="text-xs text-green-800 -mt-1">수정모드 · 변경 후 「저장」으로 반영합니다.</p>
								)}
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
											type="date"
											value={formatDateDisplay(formData.creationDate) || ''}
											onChange={(e) => setFormData((prev) => ({ ...prev, creationDate: e.target.value }))}
											readOnly={isReadOnly}
											disabled={isReadOnly}
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px] disabled:bg-gray-50 disabled:text-blue-900"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">작성자</label>
										<div ref={creatorWrapRef} className="relative employee-dropdown-container min-w-[160px]">
											<input
												type="text"
												value={formData.creator}
												onChange={(e) => {
													const v = e.target.value;
													setFormData((prev) => ({
														...prev,
														creator: v,
														// 이름을 직접 수정하면 EMPNO 매칭 해제
														creatorEmpno: '',
													}));
												}}
												onFocus={() => {
													if (isReadOnly) return;
													if (String(formData.creator ?? '').trim().length >= 1) {
														setShowCreatorDropdown(true);
													}
												}}
												className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[160px] disabled:bg-gray-50"
												placeholder={isReadOnly ? '' : '이름 검색 후 선택'}
												autoComplete="off"
												readOnly={isReadOnly}
											/>
											{!isReadOnly && showCreatorDropdown ? (
												<ul className="absolute z-[100] left-0 right-0 mt-1 max-h-48 overflow-auto rounded border border-blue-300 bg-white shadow-lg min-w-[220px]">
													{creatorSearchLoading ? (
														<li className="px-3 py-2 text-sm text-blue-900/60">검색 중...</li>
													) : creatorSuggestions.length === 0 ? (
														<li className="px-3 py-2 text-sm text-blue-900/60">검색 결과 없음</li>
													) : (
														creatorSuggestions.map((emp, i) => (
															<li
																key={`${emp.EMPNO}-${i}`}
																className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 last:border-0"
																onMouseDown={(e) => e.preventDefault()}
																onClick={() => handlePickCreator(emp)}
															>
																<span className="font-medium text-blue-900">{emp.EMPNM}</span>
																<span className="ml-2 text-blue-900/70">사번 {emp.EMPNO ?? '-'}</span>
															</li>
														))
													)}
												</ul>
											) : null}
											{formData.creatorEmpno && isEditMode ? (
												<p className="text-[10px] text-blue-900/60 mt-0.5">선택됨 (사번 {formData.creatorEmpno})</p>
											) : isEditMode ? (
												<p className="text-[10px] text-amber-700 mt-0.5">목록에서 직원을 선택해야 저장됩니다</p>
											) : null}
										</div>
									</div>
								</div>

								{/* 탭별 컨텐츠 */}
								{activeTab === '신체' && (
									<>
										<div className="flex items-center gap-4">
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">키</label>
												<input
													type="text"
													value={formData.height}
													onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
													disabled={isReadOnly}
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 w-24 disabled:bg-gray-50"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">체중</label>
												<input
													type="text"
													value={formData.weight}
													onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
													disabled={isReadOnly}
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 w-24 disabled:bg-gray-50"
												/>
											</div>
											<label className="flex items-center gap-2 text-sm text-blue-900 ml-auto">
												<input
													type="checkbox"
													checked={formData.physicalInputComplete}
													onChange={(e) =>
														setFormData((prev) => ({ ...prev, physicalInputComplete: e.target.checked }))
													}
													disabled={isReadOnly}
													className="w-4 h-4 border-blue-300 rounded"
												/>
												<span className="font-medium">신체 상태 입력완료 (C99)</span>
											</label>
										</div>

										<div className="p-4 bg-white border border-blue-300 rounded-lg">
											<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
												<h3 className="text-base font-semibold text-blue-900">활동 평가 (F51012 C01~C12)</h3>
												<p className="text-xs text-blue-900/80">
													<span className="font-semibold">X</span> 완전도움(1) ·{' '}
													<span className="font-semibold">△</span> 부분도움(2) ·{' '}
													<span className="font-semibold">○</span> 완전자립(3)
												</p>
											</div>
											<div className="grid grid-cols-3 gap-4">
												{PHYSICAL_ACTIVITY_ITEMS.map((item, index) => {
													const val = activities[index]?.value ?? '';
													const btnBase =
														'w-8 h-8 text-sm border rounded flex items-center justify-center';
													const selectedCls = 'bg-blue-500 text-white border-blue-500';
													const idleCls = isReadOnly
														? 'bg-white text-blue-900/50 border-blue-200'
														: 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50';
													return (
													<div key={item.key} className="flex items-center gap-2">
														<div className="flex items-center gap-1 shrink-0">
															<button
																type="button"
																onClick={() => handleActivityChange(index, 'X')}
																tabIndex={isReadOnly ? -1 : 0}
																title="완전도움 (1)"
																className={`${btnBase} ${val === 'X' ? selectedCls : idleCls}`}
															>
																X
															</button>
															<button
																type="button"
																onClick={() => handleActivityChange(index, '△')}
																tabIndex={isReadOnly ? -1 : 0}
																title="부분도움 (2)"
																className={`${btnBase} ${val === '△' ? selectedCls : idleCls}`}
															>
																△
															</button>
															<button
																type="button"
																onClick={() => handleActivityChange(index, '○')}
																tabIndex={isReadOnly ? -1 : 0}
																title="완전자립 (3)"
																className={`${btnBase} ${val === '○' ? selectedCls : idleCls}`}
															>
																○
															</button>
														</div>
														<span className="text-sm text-blue-900">
															<span className="text-[10px] text-blue-700/70 mr-1">{item.key}</span>
															{item.label}
														</span>
													</div>
													);
												})}
											</div>
										</div>

										<div className="flex items-start gap-2">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												판단근거
												<span className="block text-[10px] font-normal text-blue-800/70">C90</span>
											</label>
											<textarea
												value={formData.judgmentBasis}
												onChange={(e) => setFormData(prev => ({ ...prev, judgmentBasis: e.target.value }))}
												disabled={isReadOnly}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px] disabled:bg-gray-50"
												rows={6}
												placeholder="- 상체 움직임에 이상은 없으시나 신체활용 인지가 저하되시어 부분적 도움으로 벗고 입기 가능하심&#10;- 양치질하기는 스스로 수행이 가능하며, 뒷마무리만 도움이 필요함."
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
										<div className="flex items-center justify-end mb-1">
											<label className="flex items-center gap-2 text-sm text-blue-900">
												<input
													type="checkbox"
													checked={communicationData.inputComplete}
													onChange={(e) =>
														setCommunicationData((prev) => ({ ...prev, inputComplete: e.target.checked }))
													}
													className="w-4 h-4 border-blue-300 rounded"
												/>
												<span className="font-medium">의사소통 입력완료 (H99)</span>
											</label>
										</div>
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													청취능력
													<span className="block text-[10px] font-normal text-blue-800/70">H01</span>
												</label>
												<select
													value={communicationData.listeningAbility}
													onChange={(e) => setCommunicationData((prev) => ({ ...prev, listeningAbility: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{H01_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													의사소통
													<span className="block text-[10px] font-normal text-blue-800/70">H02</span>
												</label>
												<select
													value={communicationData.communication}
													onChange={(e) => setCommunicationData((prev) => ({ ...prev, communication: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{H02_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													발음능력
													<span className="block text-[10px] font-normal text-blue-800/70">H03</span>
												</label>
												<select
													value={communicationData.pronunciationAbility}
													onChange={(e) => setCommunicationData((prev) => ({ ...prev, pronunciationAbility: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{H03_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												판단근거
												<span className="block text-[10px] font-normal text-blue-800/70">H90</span>
											</label>
											<textarea
												value={communicationData.judgmentBasis}
												onChange={(e) => setCommunicationData((prev) => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px] disabled:bg-gray-50"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 영양 탭 */}
								{activeTab === '영양' && (
									<>
										<div className="flex items-center justify-end mb-1">
											<label className="flex items-center gap-2 text-sm text-blue-900">
												<input
													type="checkbox"
													checked={nutritionData.inputComplete}
													onChange={(e) =>
														setNutritionData((prev) => ({ ...prev, inputComplete: e.target.checked }))
													}
													className="w-4 h-4 border-blue-300 rounded"
												/>
												<span className="font-medium">영양상태 입력완료 (I99)</span>
											</label>
										</div>
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													치아상태
													<span className="block text-[10px] font-normal text-blue-800/70">I01</span>
												</label>
												<select
													value={nutritionData.dentalCondition}
													onChange={(e) => setNutritionData((prev) => ({ ...prev, dentalCondition: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{I01_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													식사시문제점
													<span className="block text-[10px] font-normal text-blue-800/70">I02</span>
												</label>
												<select
													value={nutritionData.eatingProblems}
													onChange={(e) => setNutritionData((prev) => ({ ...prev, eatingProblems: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{I02_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													식사형태
													<span className="block text-[10px] font-normal text-blue-800/70">I03</span>
												</label>
												<select
													value={nutritionData.eatingStatus}
													onChange={(e) => setNutritionData((prev) => ({ ...prev, eatingStatus: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{I03_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													도구사용
													<span className="block text-[10px] font-normal text-blue-800/70">I04</span>
												</label>
												<select
													value={nutritionData.toolUsage}
													onChange={(e) => setNutritionData((prev) => ({ ...prev, toolUsage: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{I04_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-32 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													배설양상
													<span className="block text-[10px] font-normal text-blue-800/70">I05</span>
												</label>
												<select
													value={nutritionData.excretionPattern}
													onChange={(e) => setNutritionData((prev) => ({ ...prev, excretionPattern: e.target.value }))}
													className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
												>
													<option value="">선택</option>
													{I05_OPTIONS.map((o) => (
														<option key={o.code} value={o.code}>
															{o.code}. {o.label}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												판단근거
												<span className="block text-[10px] font-normal text-blue-800/70">I90</span>
											</label>
											<textarea
												value={nutritionData.judgmentBasis}
												onChange={(e) => setNutritionData((prev) => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px] disabled:bg-gray-50"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 가족환경 탭 */}
								{activeTab === '가족환경' && (
									<>
										<div className="flex items-center justify-end mb-1">
											<label className="flex items-center gap-2 text-sm text-blue-900">
												<input
													type="checkbox"
													checked={familyEnvironmentData.inputComplete}
													onChange={(e) =>
														setFamilyEnvironmentData((prev) => ({ ...prev, inputComplete: e.target.checked }))
													}
													className="w-4 h-4 border-blue-300 rounded"
												/>
												<span className="font-medium">가족환경 입력완료 (J99)</span>
											</label>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														결혼여부
														<span className="block text-[10px] font-normal text-blue-800/70">J01</span>
													</label>
													<select
														value={familyEnvironmentData.maritalStatus}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{J01_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														배우자생존여부
														<span className="block text-[10px] font-normal text-blue-800/70">J01_01</span>
													</label>
													<select
														value={familyEnvironmentData.spouseSurvivalStatus}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, spouseSurvivalStatus: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{J01_01_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														자녀수
														<span className="block text-[10px] font-normal text-blue-800/70">J01_02</span>
													</label>
													<input
														type="number"
														min={0}
														value={familyEnvironmentData.numberOfChildren}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, numberOfChildren: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														주수발자
														<span className="block text-[10px] font-normal text-blue-800/70">J02</span>
													</label>
													<select
														value={familyEnvironmentData.primaryCaregiver}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, primaryCaregiver: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{J02_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														동거인
														<span className="block text-[10px] font-normal text-blue-800/70">J03</span>
													</label>
													<select
														value={familyEnvironmentData.cohabitant}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, cohabitant: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{J03_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
											</div>
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														주수발자-연령
														<span className="block text-[10px] font-normal text-blue-800/70">J02_01</span>
													</label>
													<input
														type="number"
														min={0}
														value={familyEnvironmentData.primaryCaregiverAge}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, primaryCaregiverAge: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														주수발자-관계
														<span className="block text-[10px] font-normal text-blue-800/70">J02_02</span>
													</label>
													<select
														value={familyEnvironmentData.primaryCaregiverRelationship}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, primaryCaregiverRelationship: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{J02_02_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														관계-기타
														<span className="block text-[10px] font-normal text-blue-800/70">J02_03</span>
													</label>
													<input
														type="text"
														value={familyEnvironmentData.otherRelationship}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, otherRelationship: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
														maxLength={100}
														placeholder="기타 관계 입력"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														주수발자-경제상태
														<span className="block text-[10px] font-normal text-blue-800/70">J02_04</span>
													</label>
													<select
														value={familyEnvironmentData.primaryCaregiverEconomicStatus}
														onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, primaryCaregiverEconomicStatus: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{J02_04_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												판단근거
												<span className="block text-[10px] font-normal text-blue-800/70">J90</span>
											</label>
											<textarea
												value={familyEnvironmentData.judgmentBasis}
												onChange={(e) => setFamilyEnvironmentData((prev) => ({ ...prev, judgmentBasis: e.target.value }))}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px] disabled:bg-gray-50"
												rows={6}
											/>
										</div>
									</>
								)}

								{/* 자원이용 탭 */}
								{activeTab === '자원이용' && (
									<>
										<div className="flex items-center justify-end mb-1">
											<label className="flex items-center gap-2 text-sm text-blue-900">
												<input
													type="checkbox"
													checked={resourceUtilizationData.inputComplete}
													onChange={(e) =>
														setResourceUtilizationData((prev) => ({ ...prev, inputComplete: e.target.checked }))
													}
													className="w-4 h-4 border-blue-300 rounded"
												/>
												<span className="font-medium">자원이용 입력완료 (K99)</span>
											</label>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														종교
														<span className="block text-[10px] font-normal text-blue-800/70">K01</span>
													</label>
													<select
														value={resourceUtilizationData.religion}
														onChange={(e) => setResourceUtilizationData((prev) => ({ ...prev, religion: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
													>
														<option value="">선택</option>
														{K01_OPTIONS.map((o) => (
															<option key={o.code} value={o.code}>
																{o.code}. {o.label}
															</option>
														))}
													</select>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														주이용의료기관
														<span className="block text-[10px] font-normal text-blue-800/70">K02</span>
													</label>
													<input
														type="text"
														value={resourceUtilizationData.primaryMedicalInstitution}
														onChange={(e) =>
															setResourceUtilizationData((prev) => ({ ...prev, primaryMedicalInstitution: e.target.value }))
														}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
														maxLength={100}
													/>
												</div>
												<div className="flex items-start gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														지역사회자원
														<span className="block text-[10px] font-normal text-blue-800/70">K03</span>
													</label>
													<div className="flex-1 space-y-2">
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																checked={resourceUtilizationData.communityServices['급식 및 도시락배달'] || false}
																onChange={(e) =>
																	setResourceUtilizationData((prev) => ({
																		...prev,
																		communityServices: {
																			...prev.communityServices,
																			'급식 및 도시락배달': e.target.checked,
																		},
																	}))
																}
																className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
															/>
															<span className="text-sm text-blue-900">급식 (K03_01)</span>
														</label>
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																checked={resourceUtilizationData.communityServices['이미용'] || false}
																onChange={(e) =>
																	setResourceUtilizationData((prev) => ({
																		...prev,
																		communityServices: {
																			...prev.communityServices,
																			이미용: e.target.checked,
																		},
																	}))
																}
																className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
															/>
															<span className="text-sm text-blue-900">이미용 (K03_02)</span>
														</label>
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																checked={resourceUtilizationData.housingImprovementProject}
																onChange={(e) =>
																	setResourceUtilizationData((prev) => ({
																		...prev,
																		housingImprovementProject: e.target.checked,
																	}))
																}
																className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
															/>
															<span className="text-sm text-blue-900">주거 (K03_03)</span>
														</label>
													</div>
												</div>
											</div>
											<div className="space-y-4">
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														종교-기타내역
														<span className="block text-[10px] font-normal text-blue-800/70">K01_01</span>
													</label>
													<input
														type="text"
														value={resourceUtilizationData.religionOther}
														onChange={(e) =>
															setResourceUtilizationData((prev) => ({ ...prev, religionOther: e.target.value }))
														}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
														maxLength={100}
														placeholder="기타 종교 입력"
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														전화번호
														<span className="block text-[10px] font-normal text-blue-800/70">K02_01</span>
													</label>
													<input
														type="text"
														value={resourceUtilizationData.phoneNumber}
														onChange={(e) =>
															setResourceUtilizationData((prev) => ({ ...prev, phoneNumber: e.target.value }))
														}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
														maxLength={20}
													/>
												</div>
												<div className="flex items-center gap-2">
													<label className="w-36 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
														지역사회-기타
														<span className="block text-[10px] font-normal text-blue-800/70">K03_04</span>
													</label>
													<input
														type="text"
														value={resourceUtilizationData.other}
														onChange={(e) => setResourceUtilizationData((prev) => ({ ...prev, other: e.target.value }))}
														className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
														maxLength={100}
													/>
												</div>
											</div>
										</div>
										<div className="flex items-start gap-2 mt-4">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												판단근거
												<span className="block text-[10px] font-normal text-blue-800/70">K90</span>
											</label>
											<textarea
												value={resourceUtilizationData.judgmentBasis}
												onChange={(e) =>
													setResourceUtilizationData((prev) => ({ ...prev, judgmentBasis: e.target.value }))
												}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[150px] disabled:bg-gray-50"
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
									</fieldset>
									)}
								</div>
								{selectedMember && selectedDateIndex == null && !isEditMode && (
									<div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/30 backdrop-blur-[1px]">
										<p className="px-6 py-3 text-lg font-semibold text-blue-900 bg-white/90 border border-blue-200 rounded-lg shadow-sm">
											열람 원하는 날짜를 선택해주세요
										</p>
									</div>
								)}
							</div>

							{/* 오른쪽 버튼 영역 */}
							<div className="flex flex-col gap-2 p-4 border-l border-blue-200">
								{isEditMode ? (
									<>
										<button
											type="button"
											onClick={handleSave}
											disabled={loadingDates || !selectedMember}
											className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 whitespace-nowrap disabled:opacity-50"
										>
											저장
										</button>
										<button
											type="button"
											onClick={handleCancelEdit}
											disabled={loadingDates}
											className="px-6 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50 whitespace-nowrap disabled:opacity-50"
										>
											취소
										</button>
									</>
								) : (
									<>
										<button
											type="button"
											onClick={handleCreateNew}
											disabled={!selectedMember || loadingDates}
											className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 whitespace-nowrap disabled:opacity-50"
										>
											신규생성
										</button>
										<button
											type="button"
											onClick={handleEnterEditMode}
											disabled={!selectedMember || loadingDates || selectedDateIndex == null}
											className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap disabled:opacity-50"
										>
											수정
										</button>
									</>
								)}
								<button
									type="button"
									onClick={handleDelete}
									disabled={!selectedMember || loadingDates || isEditMode || selectedDateIndex == null}
									className="px-6 py-2 text-sm font-medium text-red-800 bg-red-50 border border-red-300 rounded hover:bg-red-100 whitespace-nowrap disabled:opacity-50"
								>
									삭제
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
