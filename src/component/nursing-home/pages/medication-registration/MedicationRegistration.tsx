"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import {
	ymdToYm,
	openPrintWindowNow,
	writeAndPrint,
	buildIndividualPrintHtml,
	buildMonthlyPrintHtml,
	buildDrugsPrintHtml,
} from '../../utils/medicationPrintBuilders';

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

type MedicationTypeKey =
	| '아침식전'
	| '아침식후'
	| '점심식전'
	| '점심식후'
	| '저녁식전'
	| '저녁식후'
	| '취침복용';

interface FormDataState {
	beneficiary: string;
	medicationDate: string;
	morningBeforeMeal: string;
	morningBeforeMealNote: string;
	morningBeforeMealTime: string;
	morningAfterMeal: string;
	morningAfterMealNote: string;
	morningAfterMealTime: string;
	lunchBeforeMeal: string;
	lunchBeforeMealNote: string;
	lunchBeforeMealTime: string;
	lunchAfterMeal: string;
	lunchAfterMealNote: string;
	lunchAfterMealTime: string;
	dinnerBeforeMeal: string;
	dinnerBeforeMealNote: string;
	dinnerBeforeMealTime: string;
	dinnerAfterMeal: string;
	dinnerAfterMealNote: string;
	dinnerAfterMealTime: string;
	bedtime: string;
	bedtimeNote: string;
	bedtimeTime: string;
	medicationStatus: string;
	medicationConfirmer: string;
}

const todayYmd = () => {
	const d = new Date();
	const yyyy = String(d.getFullYear()).padStart(4, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

function createEmptyFormData(beneficiary: string, medicationDate: string): FormDataState {
	return {
		beneficiary,
		medicationDate,
		morningBeforeMeal: 'none',
		morningBeforeMealNote: '',
		morningBeforeMealTime: '',
		morningAfterMeal: 'none',
		morningAfterMealNote: '',
		morningAfterMealTime: '',
		lunchBeforeMeal: 'none',
		lunchBeforeMealNote: '',
		lunchBeforeMealTime: '',
		lunchAfterMeal: 'none',
		lunchAfterMealNote: '',
		lunchAfterMealTime: '',
		dinnerBeforeMeal: 'none',
		dinnerBeforeMealNote: '',
		dinnerBeforeMealTime: '',
		dinnerAfterMeal: 'none',
		dinnerAfterMealNote: '',
		dinnerAfterMealTime: '',
		bedtime: 'none',
		bedtimeNote: '',
		bedtimeTime: '',
		medicationStatus: '',
		medicationConfirmer: '',
	};
}

function apiStatusToForm(status: string): string {
	if (status === '복용') return 'taken';
	if (status === '미복용') return 'not_taken';
	return 'none';
}

function formStatusToApi(v: string): '약없음' | '복용' | '미복용' {
	if (v === 'taken') return '복용';
	if (v === 'not_taken') return '미복용';
	return '약없음';
}

function buildTimesPayload(fd: FormDataState): Record<
	MedicationTypeKey,
	{ status: '약없음' | '복용' | '미복용'; time: string; helper: string }
> {
	return {
		아침식전: {
			status: formStatusToApi(fd.morningBeforeMeal),
			time: fd.morningBeforeMealTime || '',
			helper: fd.morningBeforeMealNote || '',
		},
		아침식후: {
			status: formStatusToApi(fd.morningAfterMeal),
			time: fd.morningAfterMealTime || '',
			helper: fd.morningAfterMealNote || '',
		},
		점심식전: {
			status: formStatusToApi(fd.lunchBeforeMeal),
			time: fd.lunchBeforeMealTime || '',
			helper: fd.lunchBeforeMealNote || '',
		},
		점심식후: {
			status: formStatusToApi(fd.lunchAfterMeal),
			time: fd.lunchAfterMealTime || '',
			helper: fd.lunchAfterMealNote || '',
		},
		저녁식전: {
			status: formStatusToApi(fd.dinnerBeforeMeal),
			time: fd.dinnerBeforeMealTime || '',
			helper: fd.dinnerBeforeMealNote || '',
		},
		저녁식후: {
			status: formStatusToApi(fd.dinnerAfterMeal),
			time: fd.dinnerAfterMealTime || '',
			helper: fd.dinnerAfterMealNote || '',
		},
		취침복용: {
			status: formStatusToApi(fd.bedtime),
			time: fd.bedtimeTime || '',
			helper: fd.bedtimeNote || '',
		},
	};
}

export default function MedicationRegistration() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [medicationDates, setMedicationDates] = useState<string[]>([]);
	const [loadingMedications, setLoadingMedications] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isNewRecord, setIsNewRecord] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const dateItemsPerPage = 10;

	const [formData, setFormData] = useState<FormDataState>(createEmptyFormData('', todayYmd()));

	const [confirmDate, setConfirmDate] = useState<string>(todayYmd());
	const [etc, setEtc] = useState('');
	const [originalFormData, setOriginalFormData] = useState<FormDataState | null>(null);
	const [originalConfirmDate, setOriginalConfirmDate] = useState('');
	const [originalEtc, setOriginalEtc] = useState('');

	const [helperSearchTerms, setHelperSearchTerms] = useState<Record<string, string>>({});
	const [helperSuggestions, setHelperSuggestions] = useState<Record<string, Array<{ EMPNO: string; EMPNM: string }>>>({});
	const [showHelperDropdowns, setShowHelperDropdowns] = useState<Record<string, boolean>>({});
	const [activeHelperType, setActiveHelperType] = useState<MedicationTypeKey | null>(null);

	const [confirmerSearchTerm, setConfirmerSearchTerm] = useState('');
	const [confirmerSuggestions, setConfirmerSuggestions] = useState<Array<{ EMPNO: string; EMPNM: string }>>([]);
	const [showConfirmerDropdown, setShowConfirmerDropdown] = useState(false);

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
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

	const searchHelpers = async (type: MedicationTypeKey, term: string) => {
		if (!term || term.trim() === '') {
			setHelperSuggestions((prev) => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns((prev) => ({ ...prev, [type]: false }));
			return;
		}
		try {
			const url = `/api/f01010?name=${encodeURIComponent(term.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			if (result.success && Array.isArray(result.data)) {
				setHelperSuggestions((prev) => ({ ...prev, [type]: result.data }));
				setShowHelperDropdowns((prev) => ({ ...prev, [type]: result.data.length > 0 }));
			} else {
				setHelperSuggestions((prev) => ({ ...prev, [type]: [] }));
				setShowHelperDropdowns((prev) => ({ ...prev, [type]: false }));
			}
		} catch (err) {
			console.error('복용도우미 검색 오류:', err);
			setHelperSuggestions((prev) => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns((prev) => ({ ...prev, [type]: false }));
		}
	};

	const searchConfirmer = async (term: string) => {
		if (!term || term.trim() === '') {
			setConfirmerSuggestions([]);
			setShowConfirmerDropdown(false);
			return;
		}
		try {
			const url = `/api/f01010?name=${encodeURIComponent(term.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			if (result.success && Array.isArray(result.data)) {
				setConfirmerSuggestions(result.data);
				setShowConfirmerDropdown(result.data.length > 0);
			} else {
				setConfirmerSuggestions([]);
				setShowConfirmerDropdown(false);
			}
		} catch (err) {
			console.error('복용 확인자 검색 오류:', err);
			setConfirmerSuggestions([]);
			setShowConfirmerDropdown(false);
		}
	};

	const handleSelectConfirmer = (item: { EMPNO: string; EMPNM: string }) => {
		setFormData((prev) => ({ ...prev, medicationConfirmer: item.EMPNM }));
		setConfirmerSearchTerm(item.EMPNM);
		setShowConfirmerDropdown(false);
	};

	const handleSelectHelper = (type: MedicationTypeKey, noteKey: keyof FormDataState, helper: { EMPNO: string; EMPNM: string }) => {
		setFormData((prev) => ({ ...prev, [noteKey]: helper.EMPNM }));
		setHelperSearchTerms((prev) => ({ ...prev, [type]: helper.EMPNM }));
		setShowHelperDropdowns((prev) => ({ ...prev, [type]: false }));
		setActiveHelperType(null);
	};

	const fetchMedicationDates = async (_ancd: string, pnum: string) => {
		setLoadingMedications(true);
		try {
			const pn = String(pnum || '').trim();
			if (!pn) {
				setMedicationDates([]);
				return;
			}
			const res = await fetch(`/api/f30111?mode=dates&pnum=${encodeURIComponent(pn)}`);
			const json = await res.json();
			const list = Array.isArray(json?.data)
				? json.data.map((r: { EADT?: string }) => String(r.EADT || '').trim()).filter(Boolean)
				: [];
			setMedicationDates(list);
			setDatePage(1);
		} catch (err) {
			console.error('복용일자 조회 오류:', err);
			setMedicationDates([]);
		} finally {
			setLoadingMedications(false);
		}
	};

	const applyDetailToForm = (data: any, beneficiaryName: string): FormDataState => {
		const t = data?.times || {};
		const slot = (k: MedicationTypeKey) => t[k] || {};
		return {
			beneficiary: beneficiaryName,
			medicationDate: String(data?.EADT || '').slice(0, 10) || todayYmd(),
			morningBeforeMeal: apiStatusToForm(String(slot('아침식전').status || '')),
			morningBeforeMealNote: String(slot('아침식전').helper ?? ''),
			morningBeforeMealTime: String(slot('아침식전').time ?? ''),
			morningAfterMeal: apiStatusToForm(String(slot('아침식후').status || '')),
			morningAfterMealNote: String(slot('아침식후').helper ?? ''),
			morningAfterMealTime: String(slot('아침식후').time ?? ''),
			lunchBeforeMeal: apiStatusToForm(String(slot('점심식전').status || '')),
			lunchBeforeMealNote: String(slot('점심식전').helper ?? ''),
			lunchBeforeMealTime: String(slot('점심식전').time ?? ''),
			lunchAfterMeal: apiStatusToForm(String(slot('점심식후').status || '')),
			lunchAfterMealNote: String(slot('점심식후').helper ?? ''),
			lunchAfterMealTime: String(slot('점심식후').time ?? ''),
			dinnerBeforeMeal: apiStatusToForm(String(slot('저녁식전').status || '')),
			dinnerBeforeMealNote: String(slot('저녁식전').helper ?? ''),
			dinnerBeforeMealTime: String(slot('저녁식전').time ?? ''),
			dinnerAfterMeal: apiStatusToForm(String(slot('저녁식후').status || '')),
			dinnerAfterMealNote: String(slot('저녁식후').helper ?? ''),
			dinnerAfterMealTime: String(slot('저녁식후').time ?? ''),
			bedtime: apiStatusToForm(String(slot('취침복용').status || '')),
			bedtimeNote: String(slot('취침복용').helper ?? ''),
			bedtimeTime: String(slot('취침복용').time ?? ''),
			medicationStatus: String(data?.EADES ?? ''),
			medicationConfirmer: String(data?.CONF_NAME ?? ''),
		};
	};

	const loadMedicationDetail = async (member: MemberData, eadt: string) => {
		setDetailLoading(true);
		try {
			const pnum = String(member?.PNUM ?? '').trim();
			if (!pnum || !eadt) return;
			const res = await fetch(`/api/f30111?mode=detail&pnum=${encodeURIComponent(pnum)}&eadt=${encodeURIComponent(eadt)}`);
			const json = await res.json();
			const data = json?.data;
			const name = member.P_NM || '';
			if (!data) {
				const empty = createEmptyFormData(name, eadt);
				setFormData(empty);
				setHelperSearchTerms({});
				setConfirmDate(todayYmd());
				setEtc('');
				setConfirmerSearchTerm('');
				setIsEditMode(true);
				setIsNewRecord(true);
				setOriginalFormData(null);
				return;
			}
			const fd = applyDetailToForm(data, name);
			setFormData(fd);
			setHelperSearchTerms({
				아침식전: fd.morningBeforeMealNote,
				아침식후: fd.morningAfterMealNote,
				점심식전: fd.lunchBeforeMealNote,
				점심식후: fd.lunchAfterMealNote,
				저녁식전: fd.dinnerBeforeMealNote,
				저녁식후: fd.dinnerAfterMealNote,
				취침복용: fd.bedtimeNote,
			});
			setConfirmDate(String(data.CONF_DATE || todayYmd()));
			setEtc(String(data.ETC ?? ''));
			setConfirmerSearchTerm(String(data.CONF_NAME ?? ''));
			setIsEditMode(false);
			setIsNewRecord(false);
			setOriginalFormData(JSON.parse(JSON.stringify(fd)));
			setOriginalConfirmDate(String(data.CONF_DATE || todayYmd()));
			setOriginalEtc(String(data.ETC ?? ''));
		} catch (e) {
			console.error('복용 상세 조회 오류:', e);
		} finally {
			setDetailLoading(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedDateIndex(null);
		setIsNewRecord(false);
		setIsEditMode(false);
		setFormData(createEmptyFormData(member.P_NM || '', todayYmd()));
		setConfirmDate(todayYmd());
		setEtc('');
		setConfirmerSearchTerm('');
		setOriginalFormData(null);
		fetchMedicationDates(member.ANCD, member.PNUM);
	};

	const handleSelectDate = async (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = medicationDates[index];
		setFormData((prev) => ({ ...prev, medicationDate: selectedDate || '' }));
		setIsEditMode(false);
		setIsNewRecord(false);
		if (selectedMember && selectedDate) {
			await loadMedicationDetail(selectedMember, selectedDate);
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

	const handleAdd = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const td = todayYmd();
		setFormData(createEmptyFormData(selectedMember.P_NM || '', td));
		setConfirmDate(td);
		setEtc('');
		setConfirmerSearchTerm('');
		setSelectedDateIndex(null);
		setIsNewRecord(true);
		setIsEditMode(true);
		setOriginalFormData(null);
		setHelperSearchTerms({});
		setShowHelperDropdowns({});
	};

	const handleModify = () => {
		if (!selectedMember || !formData.medicationDate) {
			alert('수정할 복용일자를 선택해주세요.');
			return;
		}
		setOriginalFormData(JSON.parse(JSON.stringify(formData)));
		setOriginalConfirmDate(confirmDate);
		setOriginalEtc(etc);
		setIsEditMode(true);
	};

	const handleCancel = () => {
		if (originalFormData) {
			const restored = JSON.parse(JSON.stringify(originalFormData)) as FormDataState;
			setFormData(restored);
			setHelperSearchTerms({
				아침식전: restored.morningBeforeMealNote,
				아침식후: restored.morningAfterMealNote,
				점심식전: restored.lunchBeforeMealNote,
				점심식후: restored.lunchAfterMealNote,
				저녁식전: restored.dinnerBeforeMealNote,
				저녁식후: restored.dinnerAfterMealNote,
				취침복용: restored.bedtimeNote,
			});
			setConfirmDate(originalConfirmDate);
			setEtc(originalEtc);
			setConfirmerSearchTerm(restored.medicationConfirmer);
		} else if (selectedMember) {
			setFormData(createEmptyFormData(selectedMember.P_NM || '', todayYmd()));
			setHelperSearchTerms({});
			setConfirmDate(todayYmd());
			setEtc('');
			setConfirmerSearchTerm('');
		}
		setIsEditMode(false);
		setShowHelperDropdowns({});
		setShowConfirmerDropdown(false);
		setActiveHelperType(null);
	};

	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.medicationDate) {
			alert('복용일자를 입력해주세요.');
			return;
		}
		setLoadingMedications(true);
		try {
			const payload = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				EADT: formData.medicationDate,
				EADES: formData.medicationStatus,
				ETC: etc,
				CONF_DATE: confirmDate,
				CONF_NAME: formData.medicationConfirmer,
				times: buildTimesPayload(formData),
			};
			const res = await fetch('/api/f30111', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!json?.success) {
				alert(json?.error || '저장 실패');
				return;
			}
			alert('복용약물이 저장되었습니다.');
			setIsEditMode(false);
			setIsNewRecord(false);
			const pn = encodeURIComponent(String(selectedMember.PNUM).trim());
			const datesRes = await fetch(`/api/f30111?mode=dates&pnum=${pn}`);
			const datesJson = await datesRes.json();
			const list = Array.isArray(datesJson?.data)
				? datesJson.data.map((r: { EADT?: string }) => String(r.EADT || '').trim()).filter(Boolean)
				: [];
			setMedicationDates(list);
			const idx = list.findIndex((d: string) => d === formData.medicationDate);
			setSelectedDateIndex(idx >= 0 ? idx : null);
			await loadMedicationDetail(selectedMember, formData.medicationDate);
		} catch (err) {
			console.error('복용약물 저장 오류:', err);
			alert('복용약물 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingMedications(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.medicationDate) {
			alert('삭제할 복용일자가 없습니다.');
			return;
		}
		if (isNewRecord) {
			handleCancel();
			return;
		}
		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}
		setLoadingMedications(true);
		try {
			const pnum = String(selectedMember.PNUM ?? '').trim();
			const res = await fetch(
				`/api/f30111?pnum=${encodeURIComponent(pnum)}&eadt=${encodeURIComponent(formData.medicationDate)}`,
				{ method: 'DELETE' }
			);
			const json = await res.json();
			if (!json?.success) {
				alert(json?.error || '삭제 실패');
				return;
			}
			alert('복용약물이 삭제되었습니다.');
			setIsEditMode(false);
			setSelectedDateIndex(null);
			setFormData(createEmptyFormData(selectedMember.P_NM || '', todayYmd()));
			setConfirmDate(todayYmd());
			setEtc('');
			setConfirmerSearchTerm('');
			setOriginalFormData(null);
			await fetchMedicationDates(selectedMember.ANCD, selectedMember.PNUM);
		} catch (err) {
			console.error('복용약물 삭제 오류:', err);
			alert('복용약물 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingMedications(false);
		}
	};

	const handlePrintIndividual = async () => {
		if (!selectedMember || !formData.medicationDate) {
			alert('출력할 복용약물을 선택해주세요.');
			return;
		}
		const ym = ymdToYm(formData.medicationDate) || ymdToYm(todayYmd());
		const pnum = String(selectedMember?.PNUM ?? '').trim();
		const w = openPrintWindowNow('약물관리기록지(개별)');
		if (!w) {
			alert('팝업 차단을 해제해주세요.');
			return;
		}
		try {
			const res = await fetch(`/api/medication-print/individual?pnum=${encodeURIComponent(pnum)}&month=${encodeURIComponent(ym)}`);
			const json = await res.json();
			if (!json?.success) {
				w.close();
				alert(json?.error || '출력 데이터 조회 실패');
				return;
			}
			writeAndPrint(w, '약물관리기록지(개별)', buildIndividualPrintHtml(json.data));
		} catch (e) {
			console.error(e);
			try {
				w.close();
			} catch {
				/* noop */
			}
			alert('출력 중 오류가 발생했습니다.');
		}
	};

	const handlePrintAll = async () => {
		const ym = ymdToYm(formData.medicationDate) || ymdToYm(todayYmd());
		const w = openPrintWindowNow('약물관리기록지(전체)');
		if (!w) {
			alert('팝업 차단을 해제해주세요.');
			return;
		}
		try {
			const res = await fetch(`/api/medication-print/monthly?month=${encodeURIComponent(ym)}`);
			const json = await res.json();
			if (!json?.success) {
				w.close();
				alert(json?.error || '출력 데이터 조회 실패');
				return;
			}
			writeAndPrint(w, '약물관리기록지(전체)', buildMonthlyPrintHtml(json.data));
		} catch (e) {
			console.error(e);
			try {
				w.close();
			} catch {
				/* noop */
			}
			alert('출력 중 오류가 발생했습니다.');
		}
	};

	const handlePrintMedication = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const ym = ymdToYm(formData.medicationDate) || ymdToYm(todayYmd());
		const pnum = String(selectedMember?.PNUM ?? '').trim();
		const w = openPrintWindowNow('질병 및 복용약물');
		if (!w) {
			alert('팝업 차단을 해제해주세요.');
			return;
		}
		try {
			const res = await fetch(`/api/medication-print/drugs?pnum=${encodeURIComponent(pnum)}&month=${encodeURIComponent(ym)}`);
			const json = await res.json();
			if (!json?.success) {
				w.close();
				alert(json?.error || '출력 데이터 조회 실패');
				return;
			}
			writeAndPrint(w, '질병 및 복용약물', buildDrugsPrintHtml(json.data));
		} catch (e) {
			console.error(e);
			try {
				w.close();
			} catch {
				/* noop */
			}
			alert('출력 중 오류가 발생했습니다.');
		}
	};

	const handleModifyConfirmer = async () => {
		if (!selectedMember || !formData.medicationDate) {
			alert('복용확인자를 수정할 복용약물을 선택해주세요.');
			return;
		}
		if (!formData.medicationConfirmer) {
			alert('복용확인자를 입력해주세요.');
			return;
		}
		setLoadingMedications(true);
		try {
			const payload = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				EADT: formData.medicationDate,
				EADES: formData.medicationStatus,
				ETC: etc,
				CONF_DATE: confirmDate,
				CONF_NAME: formData.medicationConfirmer,
				times: buildTimesPayload(formData),
			};
			const res = await fetch('/api/f30111', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!json?.success) {
				alert(json?.error || '저장 실패');
				return;
			}
			alert('복용확인자가 반영되었습니다.');
			if (selectedMember) {
				await loadMedicationDetail(selectedMember, formData.medicationDate);
			}
		} catch (err) {
			console.error('복용확인자 수정 오류:', err);
			alert('복용확인자 수정 중 오류가 발생했습니다.');
		} finally {
			setLoadingMedications(false);
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			if (activeHelperType && helperSearchTerms[activeHelperType]) {
				const term = helperSearchTerms[activeHelperType];
				if (term && term.trim() !== '') {
					searchHelpers(activeHelperType, term);
				}
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [helperSearchTerms, activeHelperType]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
				searchConfirmer(confirmerSearchTerm);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [confirmerSearchTerm]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.helper-dropdown-container') && !target.closest('.confirmer-dropdown-container')) {
				setShowHelperDropdowns({});
				setActiveHelperType(null);
				setShowConfirmerDropdown(false);
			}
		};
		if (Object.values(showHelperDropdowns).some(Boolean) || showConfirmerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showHelperDropdowns, showConfirmerDropdown]);

	const noteKeyToMedicationType = (noteKey: string): MedicationTypeKey | null => {
		const m: Record<string, MedicationTypeKey> = {
			morningBeforeMealNote: '아침식전',
			morningAfterMealNote: '아침식후',
			lunchBeforeMealNote: '점심식전',
			lunchAfterMealNote: '점심식후',
			dinnerBeforeMealNote: '저녁식전',
			dinnerAfterMealNote: '저녁식후',
			bedtimeNote: '취침복용',
		};
		return m[noteKey] ?? null;
	};

	// 복용일자 목록 페이지네이션
	const dateTotalPages = Math.ceil(medicationDates.length / dateItemsPerPage);
	const dateStartIndex = (datePage - 1) * dateItemsPerPage;
	const dateEndIndex = dateStartIndex + dateItemsPerPage;
	const currentDateItems = medicationDates.slice(dateStartIndex, dateEndIndex);

	const renderTimeSlot = (label: string, valueKey: keyof FormDataState, noteKey: keyof FormDataState) => {
		const value = formData[valueKey] as string;
		const note = formData[noteKey] as string;
		const medType = noteKeyToMedicationType(String(noteKey));
		const helperInputValue = medType ? (helperSearchTerms[medType] ?? note) : note;

		return (
			<div className="flex items-center gap-4 py-2 border-b border-blue-100">
				<label className="text-sm font-medium text-blue-900 whitespace-nowrap min-w-[100px]">{label}</label>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<input
							type="radio"
							name={String(valueKey)}
							value="none"
							checked={value === 'none'}
							onChange={(e) => setFormData((prev) => ({ ...prev, [valueKey]: e.target.value }))}
							disabled={!isEditMode}
							className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
						/>
						<label className="text-sm text-blue-900">약없음</label>
					</div>
					<div className="flex items-center gap-2">
						<input
							type="radio"
							name={String(valueKey)}
							value="taken"
							checked={value === 'taken'}
							onChange={(e) => setFormData((prev) => ({ ...prev, [valueKey]: e.target.value }))}
							disabled={!isEditMode}
							className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
						/>
						<label className="text-sm text-blue-900">복용</label>
					</div>
					<div className="flex items-center gap-2">
						<input
							type="radio"
							name={String(valueKey)}
							value="not_taken"
							checked={value === 'not_taken'}
							onChange={(e) => setFormData((prev) => ({ ...prev, [valueKey]: e.target.value }))}
							disabled={!isEditMode}
							className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
						/>
						<label className="text-sm text-blue-900">미복용</label>
					</div>
				</div>
				<div className="relative flex-1 helper-dropdown-container">
					<input
						type="text"
						value={helperInputValue}
						onChange={(e) => {
							const v = e.target.value;
							setFormData((prev) => ({ ...prev, [noteKey]: v }));
							if (medType) {
								setHelperSearchTerms((prev) => ({ ...prev, [medType]: v }));
								setActiveHelperType(medType);
								if (!v.trim()) {
									setHelperSuggestions((prev) => ({ ...prev, [medType]: [] }));
									setShowHelperDropdowns((prev) => ({ ...prev, [medType]: false }));
								}
							}
						}}
						onFocus={() => {
							if (!isEditMode || !medType) return;
							setActiveHelperType(medType);
							if (note && note.trim()) {
								searchHelpers(medType, note);
							}
						}}
						disabled={!isEditMode}
						className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
						placeholder="비고 · 복용도우미 검색"
					/>
					{isEditMode &&
						medType &&
						showHelperDropdowns[medType] &&
						helperSuggestions[medType] &&
						helperSuggestions[medType].length > 0 && (
							<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
								{helperSuggestions[medType].map((h, index) => (
									<div
										key={`${h.EMPNO}-${index}`}
										onClick={() => medType && handleSelectHelper(medType, noteKey, h)}
										className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
									>
										{h.EMPNM}
									</div>
								))}
							</div>
						)}
				</div>
			</div>
		);
	};

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
									<option value="9">인지지원</option>
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
													{formatCareGradeLabel(member.P_GRD)}
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

				{/* 중간-왼쪽 패널: 복용일자 목록 */}
				<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
					<div className="mb-2">
						<label className="text-sm font-medium text-blue-900">복용일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingMedications ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
							) : medicationDates.length === 0 ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">
									{selectedMember ? '복용일자가 없습니다' : '수급자를 선택해주세요'}
								</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = dateStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`px-2 py-1.5 text-base cursor-pointer hover:bg-blue-100 rounded ${
												selectedDateIndex === globalIndex ? 'bg-blue-200 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									);
								})
							)}
						</div>
						{/* 복용일자 페이지네이션 */}
						{dateTotalPages > 1 && (
							<div className="p-2 mt-2">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setDatePage(1)}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setDatePage(prev => Math.max(1, prev - 1))}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, dateTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(dateTotalPages - 4, datePage - 2)) + i;
										if (pageNum > dateTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setDatePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													datePage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setDatePage(prev => Math.min(dateTotalPages, prev + 1))}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setDatePage(dateTotalPages)}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 우측 패널: 입력 폼 */}
				<div className="flex-1 p-4 overflow-y-auto bg-white">
					{/* 상단: 수급자, 복용일자, 버튼들 */}
					<div className="flex flex-wrap items-center gap-4 mb-4">
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
							<input
								type="text"
								value={formData.beneficiary}
								onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
								disabled={!isEditMode}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px] disabled:bg-gray-50"
								placeholder="수급자명"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">복용일자</label>
							<input
								type="text"
								value={formData.medicationDate}
								readOnly
								className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]"
							/>
						</div>
						<div className="flex items-center gap-2 ml-auto">
							<button
								onClick={handleAdd}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								추가
							</button>
							<button
								onClick={handleModify}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								수정
							</button>
							<button
								onClick={handleDelete}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								삭제
							</button>
							<button
								onClick={handlePrintIndividual}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								개별복용출력
							</button>
							<button
								onClick={handlePrintAll}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								전체복용출력
							</button>
							<button
								onClick={handlePrintMedication}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								복용약물출력
							</button>
						</div>
					</div>

					{/* 중간: 시간대별 복용 상태 */}
					<div className="mb-4 space-y-1">
						{detailLoading && (
							<div className="mb-2 text-sm text-blue-900/60">상세 조회 중...</div>
						)}
						{renderTimeSlot('아침식전', 'morningBeforeMeal', 'morningBeforeMealNote')}
						{renderTimeSlot('아침식후', 'morningAfterMeal', 'morningAfterMealNote')}
						{renderTimeSlot('점심식전', 'lunchBeforeMeal', 'lunchBeforeMealNote')}
						{renderTimeSlot('점심식후', 'lunchAfterMeal', 'lunchAfterMealNote')}
						{renderTimeSlot('저녁식전', 'dinnerBeforeMeal', 'dinnerBeforeMealNote')}
						{renderTimeSlot('저녁식후', 'dinnerAfterMeal', 'dinnerAfterMealNote')}
						{renderTimeSlot('취침복용', 'bedtime', 'bedtimeNote')}
					</div>

					{/* 하단: 복용실태, 복용확인자 */}
					<div className="flex gap-4">
						<div className="flex-1">
							<label className="block text-sm font-medium text-blue-900 mb-2 bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">복용실태</label>
							<textarea
								value={formData.medicationStatus}
								onChange={(e) => setFormData(prev => ({ ...prev, medicationStatus: e.target.value }))}
								disabled={!isEditMode}
								className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
								rows={6}
								placeholder="복용실태를 입력하세요"
							/>
						</div>
						<div className="w-64">
							<div className="mb-2">
								<label className="block text-sm font-medium text-blue-900 bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">복용확인자</label>
								<div className="relative mt-2 confirmer-dropdown-container">
									<input
										type="text"
										value={confirmerSearchTerm || formData.medicationConfirmer}
										onChange={(e) => {
											const val = e.target.value;
											setFormData((prev) => ({ ...prev, medicationConfirmer: val }));
											setConfirmerSearchTerm(val);
											if (!val.trim()) {
												setConfirmerSuggestions([]);
												setShowConfirmerDropdown(false);
											}
										}}
										onFocus={() => {
											if (!isEditMode) return;
											if (formData.medicationConfirmer) {
												searchConfirmer(formData.medicationConfirmer);
											}
										}}
										disabled={!isEditMode}
										className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
										placeholder="복용확인자 검색"
									/>
									{isEditMode && showConfirmerDropdown && confirmerSuggestions.length > 0 && (
										<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
											{confirmerSuggestions.map((item, index) => (
												<div
													key={`${item.EMPNO}-${index}`}
													onClick={() => handleSelectConfirmer(item)}
													className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
												>
													{item.EMPNM}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
							<button
								onClick={handleModifyConfirmer}
								className="w-full px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								복용확인자수정
							</button>
						</div>
					</div>

					{/* 저장 버튼 (수정 모드일 때만 표시) */}
					{isEditMode && (
						<div className="flex justify-end gap-2 mt-4">
							<button
								type="button"
								onClick={handleCancel}
								className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
							>
								취소
							</button>
							<button
								onClick={handleSave}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								저장
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
