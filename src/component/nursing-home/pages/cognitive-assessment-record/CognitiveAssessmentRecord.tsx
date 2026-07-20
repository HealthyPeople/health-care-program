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
	hydrateFromF51015Row,
	buildF51015RowPayload,
	calcTotalScore,
	interpretScore,
	ASSESSMENT_ITEMS,
	EDUCATION_OPTIONS,
	type F51015UiSnapshot,
} from './f51015Mapper';
import CognitiveAssessmentModal from './CognitiveAssessmentModal';
import { openCognitiveAssessmentPrint, openCognitiveAssessmentBatchPrint } from './cognitiveAssessmentPrint';

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

function todayYmd() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string) {
	if (!dateStr) return '';
	if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
	if (dateStr.includes('-') && dateStr.length >= 10) return dateStr.substring(0, 10);
	if (dateStr.length === 8 && !dateStr.includes('-')) {
		return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
	}
	return dateStr;
}

export default function CognitiveAssessmentRecord() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [inspectionDates, setInspectionDates] = useState<string[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);
	/** 일괄출력용 체크된 수급자 키 (ANCD-PNUM) */
	const [checkedMemberKeys, setCheckedMemberKeys] = useState<Set<string>>(new Set());
	const [batchPrintFrom, setBatchPrintFrom] = useState('');
	const [batchPrintTo, setBatchPrintTo] = useState('');
	const [batchPrinting, setBatchPrinting] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [backupSnapshot, setBackupSnapshot] = useState<F51015UiSnapshot | null>(null);
	const [showAssessmentModal, setShowAssessmentModal] = useState(false);
	const [assessmentModalMode, setAssessmentModalMode] = useState<'create' | 'edit'>('create');

	const [formData, setFormData] = useState<F51015UiSnapshot>(emptySnapshot());

	const [examinerSuggestions, setExaminerSuggestions] = useState<
		Array<{ EMPNO: string | number; EMPNM: string }>
	>([]);
	const [showExaminerDropdown, setShowExaminerDropdown] = useState(false);
	const [examinerSearchLoading, setExaminerSearchLoading] = useState(false);
	const examinerWrapRef = useRef<HTMLDivElement | null>(null);

	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const availableFloors = availableFloorsFromMembers(memberList);
	const isReadOnly = !isEditMode;

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

	const applySnapshot = (s: F51015UiSnapshot) => setFormData(s);
	const captureSnapshot = (): F51015UiSnapshot => ({ ...formData });

	const answeredCount = ASSESSMENT_ITEMS.filter(
		(it) => (formData as any)[it.field] === '0' || (formData as any)[it.field] === '1'
	).length;

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ''
					? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
					: '/api/f10010';
			const response = await fetch(url);
			const result = await response.json();
			if (result.success) {
				const raw = Array.isArray(result.data) ? result.data : [];
				const merged = await attachLatestRoomNoByPnum<MemberData>(raw as MemberData[]);
				setMemberList(merged);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '-';
		try {
			const year = parseInt(birthDate.substring(0, 4));
			return (new Date().getFullYear() - year).toString();
		} catch {
			return '-';
		}
	};

	const filteredMembers = memberList
		.filter((member) => {
			if (selectedStatus) {
				const memberStatus = String(member.P_ST || '').trim();
				if (selectedStatus === '입소' && memberStatus !== '1') return false;
				if (selectedStatus === '퇴소' && memberStatus !== '9') return false;
			}
			if (selectedGrade) {
				if (String(member.P_GRD || '').trim() !== String(selectedGrade).trim()) return false;
			}
			if (!matchesSelectedFloorByRoomNo(member.ROOM_NO, selectedFloor)) return false;
			if (searchTerm && searchTerm.trim() !== '') {
				if (!member.P_NM?.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
			}
			return true;
		})
		.sort((a, b) => (a.P_NM || '').trim().localeCompare((b.P_NM || '').trim(), 'ko'));

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

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

	useEffect(() => {
		fetchMembers();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	const fetchInspectionDates = async (pnum: string): Promise<string[]> => {
		if (!pnum) {
			setInspectionDates([]);
			return [];
		}
		setLoadingDates(true);
		try {
			const res = await fetch(
				`/api/f51015?pnum=${encodeURIComponent(String(pnum).trim())}&_=${Date.now()}`,
				{ cache: 'no-store' }
			);
			const result = await res.json();
			if (result.success && Array.isArray(result.data)) {
				const dates = result.data.map((d: unknown) => formatDateDisplay(String(d))).filter(Boolean);
				setInspectionDates(dates);
				return dates;
			}
			setInspectionDates([]);
			return [];
		} catch (err) {
			console.error('검사일자 조회 오류:', err);
			setInspectionDates([]);
			return [];
		} finally {
			setLoadingDates(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedDateIndex(null);
		setIsEditMode(false);
		setBackupSnapshot(null);
		applySnapshot(emptySnapshot(member.P_NM || '', ''));
		void fetchInspectionDates(member.PNUM);
	};

	const handleSelectDate = async (index: number) => {
		if (!selectedMember) return;
		const rqdtRaw = inspectionDates[index];
		if (rqdtRaw == null) return;

		setSelectedDateIndex(index);
		setIsEditMode(false);
		setBackupSnapshot(null);
		const rqdt = formatDateDisplay(String(rqdtRaw));

		setLoadingDates(true);
		try {
			const res = await fetch(
				`/api/f51015?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}&_=${Date.now()}`,
				{ cache: 'no-store' }
			);
			const result = await res.json();
			if (result.success && result.data && typeof result.data === 'object') {
				applySnapshot(hydrateFromF51015Row(result.data as Record<string, unknown>, selectedMember.P_NM || ''));
			} else {
				console.error('인지상태평가 단건 조회 실패:', result);
				alert(result.error || '기록을 불러오지 못했습니다.');
				applySnapshot(emptySnapshot(selectedMember.P_NM || '', rqdt));
			}
		} catch (err) {
			console.error('인지상태평가 조회 오류:', err);
			alert('기록을 불러오는 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	/** 검사일자 목록 개별출력 — 해당 일자 데이터 즉시 인쇄 */
	const handlePrintRecord = async (index: number) => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const rqdtRaw = inspectionDates[index];
		if (rqdtRaw == null) return;
		const rqdt = formatDateDisplay(String(rqdtRaw));
		if (!rqdt) {
			alert('출력할 검사일자가 올바르지 않습니다.');
			return;
		}

		try {
			const res = await fetch(
				`/api/f51015?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}&_=${Date.now()}`,
				{ cache: 'no-store' }
			);
			const result = await res.json();
			if (!(result.success && result.data && typeof result.data === 'object')) {
				alert('출력할 기록을 찾을 수 없습니다.');
				return;
			}
			const snap = hydrateFromF51015Row(
				result.data as Record<string, unknown>,
				selectedMember.P_NM || ''
			);
			openCognitiveAssessmentPrint(snap, selectedMember);
		} catch (err) {
			console.error('인지상태평가 개별출력 오류:', err);
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
			const printItems: Array<{ snap: F51015UiSnapshot; member: MemberData }> = [];

			for (const member of targets) {
				const listRes = await fetch(
					`/api/f51015?pnum=${encodeURIComponent(String(member.PNUM).trim())}&_=${Date.now()}`,
					{ cache: 'no-store' }
				);
				const listJson = await listRes.json();
				const dates: string[] = Array.isArray(listJson?.data) ? listJson.data : [];
				const inRange = dates
					.map((d) => formatDateDisplay(String(d)))
					.filter((d) => d && d >= from && d <= to)
					.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

				for (const rqdt of inRange) {
					const detailRes = await fetch(
						`/api/f51015?pnum=${encodeURIComponent(String(member.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}&_=${Date.now()}`,
						{ cache: 'no-store' }
					);
					const detailJson = await detailRes.json();
					if (detailJson?.success && detailJson.data && typeof detailJson.data === 'object') {
						const snap = hydrateFromF51015Row(
							detailJson.data as Record<string, unknown>,
							member.P_NM || ''
						);
						printItems.push({ snap, member });
					}
				}
			}

			if (printItems.length === 0) {
				alert('선택한 수급자·기간에 해당하는 인지상태평가 기록이 없습니다.');
				return;
			}

			openCognitiveAssessmentBatchPrint(printItems);
		} catch (err) {
			console.error('인지상태평가 일괄출력 오류:', err);
			alert('일괄출력 준비 중 오류가 발생했습니다.');
		} finally {
			setBatchPrinting(false);
		}
	};

	// E01~E30 변경 시 E80/E81 자동 계산
	useEffect(() => {
		if (!isEditMode) return;
		const total = calcTotalScore(formData);
		const interp = interpretScore(total);
		setFormData((prev) => {
			const nextScore = total > 0 ? String(total) : prev.score === '0' ? '0' : '';
			if (prev.score === nextScore && prev.interpretation === interp) return prev;
			return { ...prev, score: nextScore, interpretation: interp };
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isEditMode,
		formData.e01,
		formData.e02,
		formData.e03,
		formData.e04,
		formData.e05,
		formData.e06,
		formData.e07,
		formData.e08,
		formData.e09,
		formData.e10,
		formData.e11,
		formData.e12,
		formData.e13,
		formData.e14,
		formData.e15,
		formData.e16,
		formData.e17,
		formData.e18,
		formData.e19,
		formData.e20,
		formData.e21,
		formData.e22,
		formData.e23,
		formData.e24,
		formData.e25,
		formData.e26,
		formData.e27,
		formData.e28,
		formData.e29,
		formData.e30,
	]);

	const searchExaminerByName = useCallback(async (name: string) => {
		const q = name.trim();
		if (q.length < 1) {
			setExaminerSuggestions([]);
			return;
		}
		setExaminerSearchLoading(true);
		try {
			const res = await fetch(`/api/f01010?name=${encodeURIComponent(q)}`);
			const result = await res.json();
			const list = Array.isArray(result?.data) ? result.data : [];
			setExaminerSuggestions(
				list.map((e: any) => ({ EMPNO: e.EMPNO, EMPNM: String(e.EMPNM ?? '').trim() })).filter((e: any) => e.EMPNM)
			);
		} catch {
			setExaminerSuggestions([]);
		} finally {
			setExaminerSearchLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!isEditMode) {
			setShowExaminerDropdown(false);
			return;
		}
		if (String(formData.examinerEmpno ?? '').trim()) {
			setShowExaminerDropdown(false);
			return;
		}
		const t = setTimeout(() => {
			const q = String(formData.examiner ?? '').trim();
			if (q.length >= 1) {
				setShowExaminerDropdown(true);
				void searchExaminerByName(q);
			} else {
				setShowExaminerDropdown(false);
				setExaminerSuggestions([]);
			}
		}, 250);
		return () => clearTimeout(t);
	}, [formData.examiner, formData.examinerEmpno, isEditMode, searchExaminerByName]);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!examinerWrapRef.current?.contains(e.target as Node)) {
				setShowExaminerDropdown(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, []);

	const handleEnterEditMode = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formatDateDisplay(formData.inspectionDate.trim())) {
			alert('수정할 검사일자를 목록에서 선택해 주세요.\n새 기록을 만들려면 「신규생성」을 눌러 주세요.');
			return;
		}
		setBackupSnapshot(captureSnapshot());
		setAssessmentModalMode('edit');
		setShowAssessmentModal(true);
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
		setAssessmentModalMode('create');
		setShowAssessmentModal(true);
	};

	const handleAssessmentModalCancel = () => {
		if (assessmentModalMode === 'edit' && !isEditMode) {
			setBackupSnapshot(null);
		}
		setShowAssessmentModal(false);
	};

	const handleAssessmentModalConfirm = (draft: F51015UiSnapshot) => {
		if (!selectedMember) return;
		if (assessmentModalMode === 'create') {
			setBackupSnapshot(captureSnapshot());
			setSelectedDateIndex(null);
			applySnapshot({
				...emptySnapshot(selectedMember.P_NM || '', draft.inspectionDate),
				...draft,
				inputComplete: false,
			});
		} else {
			applySnapshot({
				...formData,
				...draft,
				inputComplete: formData.inputComplete,
			});
		}
		setShowAssessmentModal(false);
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		if (backupSnapshot) applySnapshot(backupSnapshot);
		setBackupSnapshot(null);
		setIsEditMode(false);
	};

	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!isEditMode) {
			alert('수정 모드에서만 저장할 수 있습니다.');
			return;
		}
		const rqdt = formatDateDisplay(formData.inspectionDate.trim());
		if (!rqdt) {
			alert('검사일자를 YYYY-MM-DD 형식으로 입력해주세요.');
			return;
		}
		const empno = String(formData.examinerEmpno ?? '').trim();
		if (!empno) {
			alert('검사자를 직원 검색에서 선택해 주세요.');
			return;
		}

		setLoadingDates(true);
		try {
			const row = buildF51015RowPayload(formData, selectedMember.PNUM, rqdt);
			const res = await fetch('/api/f51015', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ row }),
			});
			const result = await res.json();
			if (!result.success) {
				alert(result.error || '저장에 실패했습니다.');
				return;
			}

			// 저장 직후 검사일자 목록 강제 재조회
			let dates = await fetchInspectionDates(selectedMember.PNUM);
			if (!dates.some((d) => formatDateDisplay(String(d)) === rqdt)) {
				dates = [rqdt, ...dates.filter((d) => formatDateDisplay(String(d)) !== rqdt)];
				setInspectionDates(dates);
			}
			const idx = dates.findIndex((d) => formatDateDisplay(String(d)) === rqdt);
			setSelectedDateIndex(idx >= 0 ? idx : 0);
			setIsEditMode(false);
			setBackupSnapshot(null);

			const detail = await fetch(
				`/api/f51015?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}&_=${Date.now()}`,
				{ cache: 'no-store' }
			);
			const detailJson = await detail.json();
			if (detailJson.success && detailJson.data) {
				applySnapshot(hydrateFromF51015Row(detailJson.data as Record<string, unknown>, selectedMember.P_NM || ''));
			}
			alert('저장되었습니다.');
		} catch (err) {
			console.error('인지상태평가 저장 오류:', err);
			alert('저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const rqdt = formatDateDisplay(formData.inspectionDate.trim());
		if (!rqdt || selectedDateIndex == null) {
			alert('삭제할 검사일자를 목록에서 선택해주세요.');
			return;
		}
		const name = String(selectedMember.P_NM || '').trim() || '해당 수급자';
		if (!window.confirm(`정말 삭제하시겠습니까?\n\n수급자: ${name}\n검사일자: ${rqdt}\n\n삭제된 기록은 복구할 수 없습니다.`)) {
			return;
		}

		setLoadingDates(true);
		try {
			const res = await fetch(
				`/api/f51015?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}&rqdt=${encodeURIComponent(rqdt)}`,
				{ method: 'DELETE' }
			);
			const result = await res.json();
			if (!result.success) {
				alert(result.error || '삭제에 실패했습니다.');
				return;
			}
			await fetchInspectionDates(selectedMember.PNUM);
			setSelectedDateIndex(null);
			setIsEditMode(false);
			setBackupSnapshot(null);
			applySnapshot(emptySnapshot(selectedMember.P_NM || '', ''));
			alert('삭제되었습니다.');
		} catch (err) {
			console.error('인지상태평가 삭제 오류:', err);
			alert('삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingDates(false);
		}
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{showAssessmentModal && selectedMember ? (
				<CognitiveAssessmentModal
					mode={assessmentModalMode}
					beneficiary={selectedMember.P_NM || ''}
					initialDate={
						assessmentModalMode === 'edit'
							? formatDateDisplay(formData.inspectionDate) || todayYmd()
							: todayYmd()
					}
					initialValues={assessmentModalMode === 'edit' ? { ...formData } : null}
					onCancel={handleAssessmentModalCancel}
					onConfirm={handleAssessmentModalConfirm}
				/>
			) : null}
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

					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded"
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
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
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-2 py-4 text-center text-blue-900/60">
												수급자 데이터가 없습니다
											</td>
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
													<td className="px-1 py-1.5 text-center border-r border-blue-100">
														{startIndex + index + 1}
													</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">
														{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
													</td>
													<td className="px-1 py-1.5 text-center border-r border-blue-100">
														{member.P_NM || '-'}
													</td>
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
						{totalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										onClick={() => setCurrentPage(1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
										return (
											<button
												type="button"
												key={pageNum}
												onClick={() => setCurrentPage(pageNum)}
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
										type="button"
										onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => setCurrentPage(totalPages)}
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

				{/* 우측 패널 */}
				<div className="flex flex-1 overflow-hidden bg-white">
					{/* 검사일자 목록 */}
					<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
						<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
							<label className="text-sm font-medium text-blue-900">검사일자</label>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="flex-1 overflow-y-auto bg-white">
								{loadingDates ? (
									<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
								) : inspectionDates.length === 0 ? (
									<div className="px-3 py-2 text-sm text-blue-900/60">
										{selectedMember ? '검사일자가 없습니다' : '수급자를 선택해주세요'}
									</div>
								) : (
									inspectionDates.map((date, index) => (
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

					{/* 검사 폼 */}
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
											<p className="text-xs text-blue-900/70 -mt-1">
												읽기모드 · 「신규생성」또는 「수정」으로 작성할 수 있습니다.
											</p>
										) : selectedDateIndex == null ? (
											<p className="text-xs text-green-800 -mt-1">
												신규 작성모드 · 검사일자·검사자 입력 후 「저장」하세요.
											</p>
										) : (
											<p className="text-xs text-green-800 -mt-1">수정모드 · 변경 후 「저장」으로 반영합니다.</p>
										)}

										<div className="flex items-center justify-end">
											<label className="flex items-center gap-2 text-sm text-blue-900">
												<input
													type="checkbox"
													checked={formData.inputComplete}
													onChange={(e) =>
														setFormData((prev) => ({ ...prev, inputComplete: e.target.checked }))
													}
													className="w-4 h-4 border-blue-300 rounded"
												/>
												<span className="font-medium">입력완료 (E99)</span>
											</label>
										</div>

										<div className="flex flex-wrap items-center gap-4">
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">
													검사일자
												</label>
												<input
													type="date"
													value={formatDateDisplay(formData.inspectionDate) || ''}
													onChange={(e) => setFormData((prev) => ({ ...prev, inspectionDate: e.target.value }))}
													readOnly={isReadOnly}
													disabled={isReadOnly}
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px] disabled:bg-gray-50"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">
													수급자
												</label>
												<input
													type="text"
													value={formData.beneficiary}
													readOnly
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[120px]"
												/>
											</div>
											<div className="px-3 py-1.5 text-xs text-blue-900/70 bg-blue-50/60 border border-blue-200 rounded">
												응답완료 문항 : <span className="font-semibold">{answeredCount} / 30</span>
												{isEditMode ? (
													<span className="ml-2 text-blue-900/50">문항 수정은 「신규생성/수정」 모달을 이용하세요.</span>
												) : null}
											</div>
										</div>

										<div className="grid grid-cols-3 gap-4">
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													점수
													<span className="block text-[10px] font-normal text-blue-800/70">E80</span>
												</label>
												<input
													type="text"
													value={formData.score ? `${formData.score} / 30` : ''}
													readOnly
													className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													해석
													<span className="block text-[10px] font-normal text-blue-800/70">E81</span>
												</label>
												<input
													type="text"
													value={formData.interpretation}
													readOnly
													className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
												/>
											</div>
											<div className="flex items-center gap-2">
												<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
													검사자
												</label>
												<div ref={examinerWrapRef} className="relative flex-1 min-w-[140px]">
													<input
														type="text"
														value={formData.examiner}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																examiner: e.target.value,
																examinerEmpno: '',
															}))
														}
														onFocus={() => {
															if (isReadOnly) return;
															if (String(formData.examiner ?? '').trim().length >= 1) {
																setShowExaminerDropdown(true);
															}
														}}
														readOnly={isReadOnly}
														className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
														placeholder={isReadOnly ? '' : '이름 검색 후 선택'}
														autoComplete="off"
													/>
													{!isReadOnly && showExaminerDropdown ? (
														<ul className="absolute z-[100] left-0 right-0 mt-1 max-h-48 overflow-auto rounded border border-blue-300 bg-white shadow-lg min-w-[220px]">
															{examinerSearchLoading ? (
																<li className="px-3 py-2 text-sm text-blue-900/60">검색 중...</li>
															) : examinerSuggestions.length === 0 ? (
																<li className="px-3 py-2 text-sm text-blue-900/60">검색 결과 없음</li>
															) : (
																examinerSuggestions.map((emp, i) => (
																	<li
																		key={`${emp.EMPNO}-${i}`}
																		className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
																		onMouseDown={(e) => {
																			e.preventDefault();
																			setFormData((prev) => ({
																				...prev,
																				examiner: String(emp.EMPNM ?? '').trim(),
																				examinerEmpno: emp.EMPNO != null ? String(emp.EMPNO) : '',
																			}));
																			setShowExaminerDropdown(false);
																			setExaminerSuggestions([]);
																		}}
																	>
																		{emp.EMPNM}
																		<span className="ml-2 text-xs text-blue-900/50">({emp.EMPNO})</span>
																	</li>
																))
															)}
														</ul>
													) : null}
													{formData.examinerEmpno && isEditMode ? (
														<p className="text-[10px] text-blue-900/60 mt-0.5">
															선택됨 (사번 {formData.examinerEmpno})
														</p>
													) : null}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												학력
												<span className="block text-[10px] font-normal text-blue-800/70">E91</span>
											</label>
											<select
												value={formData.education}
												onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))}
												disabled={isReadOnly}
												className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
											>
												<option value="">선택</option>
												{EDUCATION_OPTIONS.map((o) => (
													<option key={o.code} value={o.code}>
														{o.label}
													</option>
												))}
											</select>
										</div>

										<div className="flex items-start gap-2">
											<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												의견
												<span className="block text-[10px] font-normal text-blue-800/70">E90</span>
											</label>
											<textarea
												value={formData.opinion}
												onChange={(e) => setFormData((prev) => ({ ...prev, opinion: e.target.value }))}
												disabled={isReadOnly}
												className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[120px] disabled:bg-gray-50"
												rows={5}
												placeholder={isReadOnly ? '' : '기타 소견을 입력해주세요'}
											/>
										</div>
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

						{/* 버튼 */}
						<div className="flex flex-col gap-2 p-4 border-l border-blue-200">
							{isEditMode ? (
								<>
									<button
										type="button"
										onClick={() => void handleSave()}
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
								onClick={() => void handleDelete()}
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
	);
}
