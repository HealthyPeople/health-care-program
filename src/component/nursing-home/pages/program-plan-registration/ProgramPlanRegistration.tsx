"use client";
import React, { useEffect, useMemo, useState } from 'react';

type F14040ProgramRow = {
	ANCD?: number;
	PGSEQ?: number;
	PGNM?: string | null;
	DEL?: string | null;
	PGOJ?: string | null;
	PGJB?: string | null;
	PGDES?: string | null;
	PG_GU?: string | null;
	SCH_FDATE?: string | Date | null;
	SCH_TDATE?: string | Date | null;
	ACT_CYCLE?: string | null;
	ACT_NUM?: number | string | null;
	PGMAN1?: string | null;
	PGMAN2?: string | null;
	PGADD?: string | null;
	PGMAN0?: string | null;
};

/** F14040.PG_GU — 프로그램 구분 코드 */
const PG_GU_OPTIONS: { code: string; label: string }[] = [
	{ code: '1', label: '인지기능강화' },
	{ code: '2', label: '신체기능강화' },
	{ code: '3', label: '사회적응프로그램' },
	{ code: '4', label: '가족참여프로그램' },
	{ code: '9', label: '기타' },
];

const PG_GU_CODE_SET = new Set(PG_GU_OPTIONS.map((o) => o.code));

function normalizePgGu(value: unknown): string {
	return String(value ?? '')
		.trim()
		.replace(/^0+/, '');
}

function isKnownPgGu(code: string): boolean {
	return PG_GU_CODE_SET.has(code);
}

function formatSqlDate(value: unknown): string {
	if (value == null || value === '') return '';
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return '';
		const y = value.getFullYear();
		const m = String(value.getMonth() + 1).padStart(2, '0');
		const d = String(value.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return '';
}

function buildScheduleRange(start: unknown, end: unknown): string {
	const a = formatSqlDate(start);
	const b = formatSqlDate(end);
	if (a && b) return `${a} ~ ${b}`;
	if (a) return a;
	if (b) return b;
	return '';
}

function actCycleToExecutionCycle(cycle: unknown): '주' | '월' {
	const c = String(cycle ?? '').trim().toUpperCase();
	if (c === 'M') return '월';
	return '주';
}

type ProgramPlanFormState = {
	programName: string;
	/** PG_GU (1,2,3,4,9) */
	programGu: string;
	programSchedule: string;
	executionCycle: '주' | '월';
	frequency: string;
	targetAudience: string;
	programLocation: string;
	facilitator: string;
	assistantFacilitator: string;
	objectivesText: string;
	materialsText: string;
	processContentText: string;
};

function emptyProgramPlanForm(): ProgramPlanFormState {
	return {
		programName: '',
		programGu: '',
		programSchedule: '',
		executionCycle: '주',
		frequency: '',
		targetAudience: '',
		programLocation: '',
		facilitator: '',
		assistantFacilitator: '',
		objectivesText: '',
		materialsText: '',
		processContentText: '',
	};
}

/** 신규 등록 모달 전용 (일정: 시작·종료 날짜 분리) */
type CreateModalFormState = {
	programName: string;
	programGu: string;
	scheduleStart: string;
	scheduleEnd: string;
	programLocation: string;
	executionCycle: '주' | '월';
	frequency: string;
	facilitator: string;
	assistantFacilitator: string;
	targetAudience: string;
	objectivesText: string;
	materialsText: string;
	processContentText: string;
};

function emptyCreateForm(): CreateModalFormState {
	return {
		programName: '',
		programGu: '',
		scheduleStart: '',
		scheduleEnd: '',
		programLocation: '',
		executionCycle: '주',
		frequency: '',
		facilitator: '',
		assistantFacilitator: '',
		targetAudience: '',
		objectivesText: '',
		materialsText: '',
		processContentText: '',
	};
}

function isCreateFormPristine(form: CreateModalFormState): boolean {
	const e = emptyCreateForm();
	return (
		form.programName === e.programName &&
		form.programGu === e.programGu &&
		form.scheduleStart === e.scheduleStart &&
		form.scheduleEnd === e.scheduleEnd &&
		form.programLocation === e.programLocation &&
		form.executionCycle === e.executionCycle &&
		form.frequency === e.frequency &&
		form.facilitator === e.facilitator &&
		form.assistantFacilitator === e.assistantFacilitator &&
		form.targetAudience === e.targetAudience &&
		form.objectivesText === e.objectivesText &&
		form.materialsText === e.materialsText &&
		form.processContentText === e.processContentText
	);
}

function buildScheduleFromDates(start: string, end: string): string {
	const a = start.trim();
	const b = end.trim();
	if (a && b) return `${a} ~ ${b}`;
	if (a) return a;
	if (b) return b;
	return '';
}

type EmpSuggest = { EMPNO: string; EMPNM: string };

async function fetchF00120Employees(q: string): Promise<EmpSuggest[]> {
	const t = q.trim();
	if (!t) return [];
	try {
		const res = await fetch(
			`/api/f00120/search?q=${encodeURIComponent(t)}&activeOnly=0`,
			{ cache: 'no-store' }
		);
		const json = await res.json();
		if (!json?.success || !Array.isArray(json.data)) return [];
		return json.data.map((r: { EMPNO?: unknown; EMPNM?: unknown }) => ({
			EMPNO: String(r.EMPNO ?? ''),
			EMPNM: String(r.EMPNM ?? ''),
		}));
	} catch {
		return [];
	}
}

function rowToFormData(row: F14040ProgramRow): ProgramPlanFormState {
	const programGu = normalizePgGu(row.PG_GU);

	const actNum = row.ACT_NUM;
	const frequency =
		actNum != null && actNum !== '' ? String(actNum).replace(/\s/g, '') : '';

	return {
		programName: String(row.PGNM ?? ''),
		programGu,
		programSchedule: buildScheduleRange(row.SCH_FDATE, row.SCH_TDATE),
		executionCycle: actCycleToExecutionCycle(row.ACT_CYCLE),
		frequency,
		targetAudience: String(row.PGMAN0 ?? row.PGMAN0 ?? ''),
		programLocation: String(row.PGADD ?? ''),
		facilitator: String(row.PGMAN1 ?? ''),
		assistantFacilitator: String(row.PGMAN2 ?? ''),
		objectivesText: String(row.PGOJ ?? ''),
		materialsText: String(row.PGJB ?? ''),
		processContentText: String(row.PGDES ?? ''),
	};
}

function escapeHtml(text: string): string {
	return String(text ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** 인쇄용 프로그램 구분 표시 (이미지 양식과 같이 명칭 위주) */
function programGuPrintLabel(code: string): string {
	const c = normalizePgGu(code);
	if (!c) return '';
	const o = PG_GU_OPTIONS.find((x) => x.code === c);
	if (o) return o.label;
	return c;
}

function cellOrNbsp(raw: string): string {
	const s = String(raw ?? '');
	return s.trim() ? escapeHtml(s) : '&nbsp;';
}

/** A4 프로그램 계획서 — 첨부 서식과 동일한 격자·항목 배치 */
function buildProgramPlanPrintHtml(form: ProgramPlanFormState): string {
	const cycle = form.executionCycle === '월' ? '월' : '주';
	const pgGu = programGuPrintLabel(form.programGu);
	const pgGuHtml = pgGu ? escapeHtml(pgGu) : '&nbsp;';

	return `<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>프로그램 계획서</title>
	<style>
		@page { size: A4; margin: 14mm; }
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: 'Malgun Gothic', '맑은 고딕', Pretendard, sans-serif;
			font-size: 11pt;
			line-height: 1.45;
			color: #000;
			background: #fff;
		}
		.print-wrap {
			width: 100%;
			max-width: 190mm;
			margin: 0 auto;
		}
		.print-title {
			text-align: center;
			font-size: 19pt;
			font-weight: 700;
			letter-spacing: 0.03em;
			padding: 0 0 8px 0;
		}
		.print-title-line {
			border: 0;
			border-top: 4px solid #000;
			margin: 0 0 12px 0;
		}
		.print-pgnm {
			font-size: 11pt;
			margin-bottom: 12px;
			text-align: left;
		}
		.print-table {
			width: 100%;
			border-collapse: collapse;
			table-layout: fixed;
			border: 1px solid #000;
		}
		.print-table td {
			border: 1px solid #000;
			padding: 8px 10px;
			vertical-align: middle;
			word-break: break-word;
		}
		.print-table td.lb {
			width: 17%;
			text-align: center;
			font-weight: 400;
		}
		.print-table td.val {
			text-align: left;
		}
		.print-table td.val-top {
			vertical-align: top;
			white-space: pre-wrap;
		}
		.print-table tr.row-audience .val-top,
		.print-table tr.row-goals .val-top,
		.print-table tr.row-materials .val-top {
			min-height: 72px;
		}
		.print-table tr.row-process .val-top {
			min-height: 260px;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
			.print-table tr.row-process .val-top {
				min-height: 100mm;
			}
		}
	</style>
</head>
<body>
	<div class="print-wrap">
		<h1 class="print-title">프로그램 계획서</h1>
		<hr class="print-title-line" />
		<div class="print-pgnm">프로그램명: ${cellOrNbsp(form.programName)}</div>
		<table class="print-table">
			<tr>
				<td class="lb">프로그램 구분</td>
				<td class="val" colspan="5">${pgGuHtml}</td>
			</tr>
			<tr>
				<td class="lb">프로그램 일정</td>
				<td class="val" colspan="5">${cellOrNbsp(form.programSchedule)}</td>
			</tr>
			<tr>
				<td class="lb">실행 주기</td>
				<td class="val">${escapeHtml(cycle)}</td>
				<td class="lb">횟수</td>
				<td class="val">${cellOrNbsp(form.frequency)}</td>
				<td class="lb">프로그램 장소</td>
				<td class="val">${cellOrNbsp(form.programLocation)}</td>
			</tr>
			<tr>
				<td class="lb">진&nbsp;&nbsp;행&nbsp;&nbsp;자</td>
				<td class="val" colspan="2">${cellOrNbsp(form.facilitator)}</td>
				<td class="lb">보조 진행자</td>
				<td class="val" colspan="2">${cellOrNbsp(form.assistantFacilitator)}</td>
			</tr>
			<tr class="row-audience">
				<td class="lb">대&nbsp;&nbsp;상&nbsp;&nbsp;자</td>
				<td class="val val-top" colspan="5">${cellOrNbsp(form.targetAudience)}</td>
			</tr>
			<tr class="row-goals">
				<td class="lb">프로그램 목표</td>
				<td class="val val-top" colspan="5">${cellOrNbsp(form.objectivesText)}</td>
			</tr>
			<tr class="row-materials">
				<td class="lb">준&nbsp;&nbsp;비&nbsp;&nbsp;물</td>
				<td class="val val-top" colspan="5">${cellOrNbsp(form.materialsText)}</td>
			</tr>
			<tr class="row-process">
				<td class="lb">프로그램 운영 과정 및 내용</td>
				<td class="val val-top" colspan="5">${cellOrNbsp(form.processContentText)}</td>
			</tr>
		</table>
	</div>
</body>
</html>`;
}

function programRowKey(row: F14040ProgramRow): string {
	return `${row.ANCD ?? ''}-${row.PGSEQ ?? ''}`;
}

function formatDeletionLabel(del: string | null | undefined): string {
	const v = String(del ?? '').trim().toUpperCase();
	if (v === 'D') return '삭제';
	return '';
}

type DelFilter = 'all' | 'active' | 'deleted';

function matchesDelFilter(del: string | null | undefined, filter: DelFilter): boolean {
	const v = String(del ?? '').trim().toUpperCase();
	if (filter === 'all') return true;
	if (filter === 'deleted') return v === 'D';
	return v !== 'D';
}

const PAGE_NUMBER_WINDOW = 5;

/** 클릭 가능한 페이지 번호 — 항상 최대 5개(현재 페이지가 보이도록 윈도우 이동) */
function buildPageList(current: number, total: number): number[] {
	if (total <= 1) return total === 1 ? [1] : [];
	if (total <= PAGE_NUMBER_WINDOW) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}
	const half = Math.floor(PAGE_NUMBER_WINDOW / 2);
	let start = current - half;
	if (start < 1) start = 1;
	if (start > total - PAGE_NUMBER_WINDOW + 1) start = total - PAGE_NUMBER_WINDOW + 1;
	return Array.from({ length: PAGE_NUMBER_WINDOW }, (_, i) => start + i);
}

const LIST_PAGE_SIZE = 10;

type FormMode = 'view' | 'edit';

export default function ProgramPlanRegistration() {
	const [programs, setPrograms] = useState<F14040ProgramRow[]>([]);
	const [programsLoading, setProgramsLoading] = useState(true);
	const [programsError, setProgramsError] = useState<string | null>(null);
	const [searchInput, setSearchInput] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [delFilter, setDelFilter] = useState<DelFilter>('active');
	const [listPage, setListPage] = useState(1);
	const [selectedProgramKey, setSelectedProgramKey] = useState<string | null>(null);
	const [selectedRow, setSelectedRow] = useState<F14040ProgramRow | null>(null);
	const [formMode, setFormMode] = useState<FormMode>('view');
	const [saveLoading, setSaveLoading] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [createForm, setCreateForm] = useState<CreateModalFormState>(() => emptyCreateForm());
	const [createSaveLoading, setCreateSaveLoading] = useState(false);
	const [createSaveError, setCreateSaveError] = useState<string | null>(null);

	const [facilitatorEmpSuggest, setFacilitatorEmpSuggest] = useState<EmpSuggest[]>([]);
	const [showFacilitatorEmpDd, setShowFacilitatorEmpDd] = useState(false);
	const [assistantEmpSuggest, setAssistantEmpSuggest] = useState<EmpSuggest[]>([]);
	const [showAssistantEmpDd, setShowAssistantEmpDd] = useState(false);

	const [createFacEmpSuggest, setCreateFacEmpSuggest] = useState<EmpSuggest[]>([]);
	const [showCreateFacEmpDd, setShowCreateFacEmpDd] = useState(false);
	const [createAsstEmpSuggest, setCreateAsstEmpSuggest] = useState<EmpSuggest[]>([]);
	const [showCreateAsstEmpDd, setShowCreateAsstEmpDd] = useState(false);

	const isView = formMode === 'view';
	const fieldRoClass = isView
		? 'cursor-default border-blue-200 bg-gray-50 text-gray-800'
		: 'border-blue-300 bg-white';

	/** `false`: 목록만 갱신. `string`: 해당 키 행으로 폼 동기화(없으면 선택 해제) */
	const refreshList = async (syncSelectionKey: string | false) => {
		setProgramsLoading(true);
		setProgramsError(null);
		try {
			const res = await fetch('/api/f14040', { cache: 'no-store' });
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '프로그램 목록을 불러오지 못했습니다.');
			}
			const list: F14040ProgramRow[] = Array.isArray(json.data) ? json.data : [];
			setPrograms(list);
			if (syncSelectionKey === false) return;
			const found = list.find((r) => programRowKey(r) === syncSelectionKey);
			if (found) {
				setSelectedProgramKey(syncSelectionKey);
				setSelectedRow(found);
				setFormData(rowToFormData(found));
			} else {
				setSelectedProgramKey(null);
				setSelectedRow(null);
				setFormData(emptyProgramPlanForm());
			}
		} catch (e) {
			setProgramsError(e instanceof Error ? e.message : '프로그램 목록 조회 오류');
			setPrograms([]);
		} finally {
			setProgramsLoading(false);
		}
	};

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setProgramsLoading(true);
			setProgramsError(null);
			try {
				const res = await fetch('/api/f14040', { cache: 'no-store' });
				const json = await res.json();
				if (!res.ok || !json?.success) {
					throw new Error(json?.error || '프로그램 목록을 불러오지 못했습니다.');
				}
				if (!cancelled) {
					setPrograms(Array.isArray(json.data) ? json.data : []);
				}
			} catch (e) {
				if (!cancelled) {
					setProgramsError(e instanceof Error ? e.message : '프로그램 목록 조회 오류');
					setPrograms([]);
				}
			} finally {
				if (!cancelled) setProgramsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const filteredPrograms = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		const rows = programs.filter((p) => {
			if (q) {
				const name = String(p.PGNM ?? '').toLowerCase();
				if (!name.includes(q)) return false;
			}
			return matchesDelFilter(p.DEL, delFilter);
		});
		return rows.sort((a, b) => {
			const byName = String(a.PGNM ?? '').localeCompare(String(b.PGNM ?? ''), 'ko');
			if (byName !== 0) return byName;
			const seqA = Number(a.PGSEQ ?? 0);
			const seqB = Number(b.PGSEQ ?? 0);
			return seqA - seqB;
		});
	}, [programs, searchQuery, delFilter]);

	const listTotalPages = useMemo(
		() => Math.max(1, Math.ceil(filteredPrograms.length / LIST_PAGE_SIZE)),
		[filteredPrograms.length]
	);

	const pagedPrograms = useMemo(() => {
		const start = (listPage - 1) * LIST_PAGE_SIZE;
		return filteredPrograms.slice(start, start + LIST_PAGE_SIZE);
	}, [filteredPrograms, listPage]);

	useEffect(() => {
		setListPage(1);
	}, [searchQuery, delFilter]);

	useEffect(() => {
		setListPage((p) => Math.min(p, listTotalPages));
	}, [listTotalPages]);

	const applySearch = () => setSearchQuery(searchInput.trim());

	const [formData, setFormData] = useState<ProgramPlanFormState>(() => emptyProgramPlanForm());

	useEffect(() => {
		if (isView) {
			setFacilitatorEmpSuggest([]);
			setShowFacilitatorEmpDd(false);
			return;
		}
		const q = formData.facilitator.trim();
		if (!q) {
			setFacilitatorEmpSuggest([]);
			setShowFacilitatorEmpDd(false);
			return;
		}
		let cancelled = false;
		const t = setTimeout(() => {
			fetchF00120Employees(q).then((list) => {
				if (!cancelled) {
					setFacilitatorEmpSuggest(list);
					setShowFacilitatorEmpDd(list.length > 0);
				}
			});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [formData.facilitator, isView]);

	useEffect(() => {
		if (isView) {
			setAssistantEmpSuggest([]);
			setShowAssistantEmpDd(false);
			return;
		}
		const q = formData.assistantFacilitator.trim();
		if (!q) {
			setAssistantEmpSuggest([]);
			setShowAssistantEmpDd(false);
			return;
		}
		let cancelled = false;
		const t = setTimeout(() => {
			fetchF00120Employees(q).then((list) => {
				if (!cancelled) {
					setAssistantEmpSuggest(list);
					setShowAssistantEmpDd(list.length > 0);
				}
			});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [formData.assistantFacilitator, isView]);

	useEffect(() => {
		if (!createModalOpen) {
			setCreateFacEmpSuggest([]);
			setShowCreateFacEmpDd(false);
			setCreateAsstEmpSuggest([]);
			setShowCreateAsstEmpDd(false);
			return;
		}
		const q = createForm.facilitator.trim();
		if (!q) {
			setCreateFacEmpSuggest([]);
			setShowCreateFacEmpDd(false);
			return;
		}
		let cancelled = false;
		const t = setTimeout(() => {
			fetchF00120Employees(q).then((list) => {
				if (!cancelled) {
					setCreateFacEmpSuggest(list);
					setShowCreateFacEmpDd(list.length > 0);
				}
			});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [createModalOpen, createForm.facilitator]);

	useEffect(() => {
		if (!createModalOpen) return;
		const q = createForm.assistantFacilitator.trim();
		if (!q) {
			setCreateAsstEmpSuggest([]);
			setShowCreateAsstEmpDd(false);
			return;
		}
		let cancelled = false;
		const t = setTimeout(() => {
			fetchF00120Employees(q).then((list) => {
				if (!cancelled) {
					setCreateAsstEmpSuggest(list);
					setShowCreateAsstEmpDd(list.length > 0);
				}
			});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [createModalOpen, createForm.assistantFacilitator]);

	useEffect(() => {
		if (
			!showFacilitatorEmpDd &&
			!showAssistantEmpDd &&
			!showCreateFacEmpDd &&
			!showCreateAsstEmpDd
		) {
			return;
		}
		const h = (e: MouseEvent) => {
			const el = e.target as HTMLElement;
			if (!el.closest('.ppm-emp-search')) {
				setShowFacilitatorEmpDd(false);
				setShowAssistantEmpDd(false);
				setShowCreateFacEmpDd(false);
				setShowCreateAsstEmpDd(false);
			}
		};
		document.addEventListener('mousedown', h);
		return () => document.removeEventListener('mousedown', h);
	}, [
		showFacilitatorEmpDd,
		showAssistantEmpDd,
		showCreateFacEmpDd,
		showCreateAsstEmpDd,
	]);

	const handleCancel = () => {
		setSaveError(null);
		if (selectedRow) {
			setFormData(rowToFormData(selectedRow));
		} else {
			setFormData(emptyProgramPlanForm());
		}
		setFormMode('view');
	};

	const handleSave = async () => {
		if (!selectedRow || selectedRow.PGSEQ == null) return;
		setSaveLoading(true);
		setSaveError(null);
		const syncKey = selectedProgramKey;
		try {
			const res = await fetch('/api/f14040', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'save',
					pgseq: selectedRow.PGSEQ,
					PGNM: formData.programName,
					PGOJ: formData.objectivesText,
					PGJB: formData.materialsText,
					PGDES: formData.processContentText,
					PG_GU: formData.programGu,
					programSchedule: formData.programSchedule,
					executionCycle: formData.executionCycle,
					frequency: formData.frequency,
					PGMAN0: formData.targetAudience,
					PGADD: formData.programLocation,
					PGMAN1: formData.facilitator,
					PGMAN2: formData.assistantFacilitator,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '저장에 실패했습니다.');
			}
			setFormMode('view');
			if (syncKey) await refreshList(syncKey);
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : '저장 오류');
		} finally {
			setSaveLoading(false);
		}
	};

	const openCreateModal = () => {
		setCreateForm(emptyCreateForm());
		setCreateSaveError(null);
		setCreateFacEmpSuggest([]);
		setShowCreateFacEmpDd(false);
		setCreateAsstEmpSuggest([]);
		setShowCreateAsstEmpDd(false);
		setCreateModalOpen(true);
	};

	const closeCreateModal = () => {
		if (createSaveLoading) return;
		if (!isCreateFormPristine(createForm)) {
			if (
				!window.confirm(
					'저장하지 않으면 삭제됩니다. 정말로 닫으시겠습니까?'
				)
			) {
				return;
			}
		}
		setCreateModalOpen(false);
	};

	const handleCreateSave = async () => {
		if (!createForm.programName.trim()) {
			setCreateSaveError('프로그램 명을 입력해 주세요.');
			return;
		}
		if (!createForm.programGu.trim()) {
			setCreateSaveError('프로그램 구분을 선택해 주세요.');
			return;
		}
		setCreateSaveLoading(true);
		setCreateSaveError(null);
		try {
			const programSchedule = buildScheduleFromDates(createForm.scheduleStart, createForm.scheduleEnd);
			const res = await fetch('/api/f14040', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'create',
					PGNM: createForm.programName,
					PGOJ: createForm.objectivesText,
					PGJB: createForm.materialsText,
					PGDES: createForm.processContentText,
					PG_GU: createForm.programGu,
					programSchedule,
					executionCycle: createForm.executionCycle,
					frequency: createForm.frequency,
					PGMAN0: createForm.targetAudience,
					PGADD: createForm.programLocation,
					PGMAN1: createForm.facilitator,
					PGMAN2: createForm.assistantFacilitator,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '등록에 실패했습니다.');
			}
			const newKey = `${json.ancd}-${json.pgseq}`;
			setCreateModalOpen(false);
			setCreateForm(emptyCreateForm());
			setFormMode('view');
			setSaveError(null);
			await refreshList(newKey);
		} catch (e) {
			setCreateSaveError(e instanceof Error ? e.message : '등록 오류');
		} finally {
			setCreateSaveLoading(false);
		}
	};

	const handleProgramPlanPrint = () => {
		if (!selectedRow) {
			alert('프로그램 목록에서 출력할 프로그램을 선택해 주세요.');
			return;
		}
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.');
			return;
		}
		const html = buildProgramPlanPrintHtml(formData);
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
		setTimeout(() => {
			printWindow.focus();
			printWindow.print();
		}, 250);
	};

	const handleDelete = async () => {
		if (!selectedRow || selectedRow.PGSEQ == null) return;
		if (
			!window.confirm(
				'선택한 프로그램을 삭제 처리하시겠습니까?\n삭제 후에는 삭제유무 필터에서 「전체」 또는 「삭제」로 확인할 수 있습니다.'
			)
		) {
			return;
		}
		setSaveLoading(true);
		setSaveError(null);
		const syncKey = selectedProgramKey;
		try {
			const res = await fetch('/api/f14040', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'delete',
					pgseq: selectedRow.PGSEQ,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '삭제 처리에 실패했습니다.');
			}
			setFormMode('view');
			if (syncKey) await refreshList(syncKey);
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : '삭제 오류');
		} finally {
			setSaveLoading(false);
		}
	};

	const modalLabelCls =
		'w-32 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap';
	const modalFieldCls = 'flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-black';

	return (
		<>
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1200px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 프로그램 목록 */}
					<aside className="w-72 shrink-0">
						<div className="border border-blue-300 rounded-lg overflow-hidden bg-white shadow-sm">
							<div className="flex items-center justify-between gap-2 bg-blue-100 border-b border-blue-300 px-3 py-2">
								<span className="text-blue-900 font-semibold">프로그램 목록</span>
								<button
									type="button"
									onClick={openCreateModal}
									className="shrink-0 rounded border border-blue-500 bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600"
								>
									생성
								</button>
							</div>
							{/* 상단 상태/검색 영역 */}
							<div className="px-3 py-2 border-b border-blue-100 space-y-2">
								<div className="text-xs text-blue-900/80">프로그램명 검색</div>
								<input
									className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white"
									placeholder="예) 인지활동 / 운동프로그램"
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') applySearch();
									}}
								/>
								<button
									type="button"
									className="w-full text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 py-1"
									onClick={applySearch}
								>
									검색
								</button>
								<div className="space-y-1">
									<div className="text-xs text-blue-900/80">삭제유무</div>
									<select
										className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white"
										value={delFilter}
										onChange={(e) => setDelFilter(e.target.value as DelFilter)}
									>
										<option value="all">전체</option>
										<option value="active">정상</option>
										<option value="deleted">삭제</option>
									</select>
								</div>
							</div>
							{/* 목록 테이블 */}
							<div className="max-h-[540px] overflow-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 bg-blue-50 border-b border-blue-200">
										<tr>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">프로그램명</th>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">삭제유무</th>
										</tr>
									</thead>
									<tbody>
										{programsLoading ? (
											<tr>
												<td colSpan={2} className="px-2 py-4 text-center text-blue-900/70 text-sm">
													목록 불러오는 중…
												</td>
											</tr>
										) : programsError ? (
											<tr>
												<td colSpan={2} className="px-2 py-4 text-center text-red-600 text-sm">
													{programsError}
												</td>
											</tr>
										) : filteredPrograms.length === 0 ? (
											<tr>
												<td colSpan={2} className="px-2 py-4 text-center text-blue-900/60 text-sm">
													{programs.length === 0
														? '등록된 프로그램이 없습니다.'
														: '조건에 맞는 프로그램이 없습니다.'}
												</td>
											</tr>
										) : (
											pagedPrograms.map((row) => {
												const rowKey = programRowKey(row);
												const selected = selectedProgramKey === rowKey;
												return (
													<tr
														key={rowKey}
														onClick={() => {
															setSelectedProgramKey(rowKey);
															setSelectedRow(row);
															setFormMode('view');
															setSaveError(null);
															setFormData(rowToFormData(row));
														}}
														className={
															selected
																? 'border-b border-blue-200 bg-blue-100 cursor-pointer'
																: 'border-b border-blue-50 hover:bg-blue-50 cursor-pointer'
														}
													>
														<td className="px-2 py-2">{row.PGNM ?? ''}</td>
														<td className="px-2 py-2">{formatDeletionLabel(row.DEL)}</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
							{!programsLoading && !programsError && filteredPrograms.length > 0 ? (
								<div className="flex flex-col gap-2 border-t border-blue-100 bg-blue-50/50 px-2 py-2">
									{/* <div className="text-center text-xs text-blue-900/80">
										전체 {filteredPrograms.length}건 · 페이지당 {LIST_PAGE_SIZE}건
									</div> */}
									<div className="flex flex-wrap items-center justify-center gap-1">
										<button
											type="button"
											disabled={listPage <= 1}
											onClick={() => setListPage((p) => Math.max(1, p - 1))}
											className="rounded border border-blue-400 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
										>
											이전
										</button>
										{buildPageList(listPage, listTotalPages).map((item) => (
											<button
												key={item}
												type="button"
												onClick={() => setListPage(item)}
												className={
													item === listPage
														? 'min-w-[1.75rem] rounded border border-blue-600 bg-blue-600 px-1.5 py-1 text-xs font-semibold text-white'
														: 'min-w-[1.75rem] rounded border border-blue-400 bg-white px-1.5 py-1 text-xs text-blue-900 hover:bg-blue-100'
												}
											>
												{item}
											</button>
										))}
										<button
											type="button"
											disabled={listPage >= listTotalPages}
											onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
											className="rounded border border-blue-400 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
										>
											다음
										</button>
									</div>
								</div>
							) : null}
						</div>
					</aside>

					{/* 우측: 프로그램 계획서 상세 영역 */}
					<section className="flex-1 space-y-4">
						{!selectedRow ? (
							<div className="flex min-h-[360px] items-center justify-center rounded-lg border border-blue-200 bg-white p-8 shadow-sm">
								<p className="text-center text-lg font-medium text-blue-900/85">
									프로그램 목록에서 프로그램을 선택 해 주세요
								</p>
							</div>
						) : (
							<>
								<div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
									{/* <div className="text-sm">
										{isView ? (
											<span className="text-blue-900/80">읽기 전용 · 수정을 누르면 편집할 수 있습니다.</span>
										) : (
											<span className="text-blue-900/80">편집 중 · 같은 버튼으로 저장하거나 취소하세요.</span>
										)}
										{saveError ? (
											<span className="mt-1 block text-red-600">{saveError}</span>
										) : null}
									</div> */}
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											disabled={saveLoading}
											onClick={() => {
												if (isView) {
													setFormMode('edit');
													setSaveError(null);
												} else {
													void handleSave();
												}
											}}
											className={
												isView
													? 'rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
													: 'rounded border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40'
											}
										>
											{saveLoading ? '저장 중…' : isView ? '수정' : '저장'}
										</button>
										<button
											type="button"
											disabled={!isView || saveLoading}
											onClick={() => void handleDelete()}
											className="rounded border border-red-500 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
										>
											삭제
										</button>
										<button
											type="button"
											disabled={isView}
											onClick={handleCancel}
											className="rounded border border-gray-400 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
										>
											취소
										</button>
										<button
											type="button"
											onClick={() => handleProgramPlanPrint()}
											className="rounded border border-slate-600 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-slate-50"
										>
											출력
										</button>
									</div>
								</div>

								{/* 상단 정보 영역 */}
								<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<div className="grid grid-cols-2 gap-4">
								{/* 1행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 명</label>
									<input
										type="text"
										value={formData.programName}
										readOnly={isView}
										onChange={(e) => setFormData(prev => ({ ...prev, programName: e.target.value }))}
										className={`flex-1 rounded px-2 py-1.5 text-sm border ${fieldRoClass}`}
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 구분</label>
									<select
										value={formData.programGu}
										disabled={isView}
										onChange={(e) => setFormData((prev) => ({ ...prev, programGu: e.target.value }))}
										className={`flex-1 rounded px-2 py-1.5 text-sm border ${fieldRoClass}`}
									>
										<option value="">선택</option>
										{PG_GU_OPTIONS.map(({ code, label }) => (
											<option key={code} value={code}>
												{code}. {label}
											</option>
										))}
										{formData.programGu && !isKnownPgGu(formData.programGu) ? (
											<option value={formData.programGu}>
												{formData.programGu} (DB값)
											</option>
										) : null}
									</select>
								</div>

								{/* 2행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 일정</label>
									<input
										type="text"
										value={formData.programSchedule}
										readOnly={isView}
										onChange={(e) => setFormData(prev => ({ ...prev, programSchedule: e.target.value }))}
										className={`flex-1 rounded px-2 py-1.5 text-sm border text-black ${isView ? 'cursor-default border-blue-200 bg-gray-50' : 'border-blue-300 bg-white'}`}
										placeholder="2025-01-01 ~ 2025-12-31"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">실행주기</label>
									<div className="flex items-center gap-3 flex-1">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												name="executionCycle"
												value="주"
												checked={formData.executionCycle === '주'}
												disabled={isView}
												onChange={() =>
													setFormData((prev) => ({ ...prev, executionCycle: '주' }))
												}
												className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500 disabled:opacity-50"
											/>
											<span className="text-sm text-blue-900">주</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												name="executionCycle"
												value="월"
												checked={formData.executionCycle === '월'}
												disabled={isView}
												onChange={() =>
													setFormData((prev) => ({ ...prev, executionCycle: '월' }))
												}
												className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500 disabled:opacity-50"
											/>
											<span className="text-sm text-blue-900">월</span>
										</label>
										<label className="flex items-center gap-2">
											<span className="text-sm text-black">횟수</span>
											<input
												type="text"
												value={formData.frequency}
												readOnly={isView}
												onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
												className={`w-16 rounded border px-2 py-1 text-sm ${fieldRoClass}`}
											/>
										</label>
									</div>
								</div>

								{/* 3행 */}
								<div className="flex items-start gap-2 col-span-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">대상자</label>
									<textarea
										value={formData.targetAudience}
										readOnly={isView}
										onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
										className={`flex-1 rounded px-2 py-1.5 text-sm min-h-[60px] border ${fieldRoClass}`}
										rows={2}
									/>
								</div>

								{/* 4행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 장소</label>
									<input
										type="text"
										value={formData.programLocation}
										readOnly={isView}
										onChange={(e) => setFormData(prev => ({ ...prev, programLocation: e.target.value }))}
										className={`flex-1 rounded px-2 py-1.5 text-sm border ${fieldRoClass}`}
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">진행자</label>
									<div className={`relative ppm-emp-search flex flex-1 min-w-0`}>
										<input
											type="text"
											value={formData.facilitator}
											readOnly={isView}
											onChange={(e) => setFormData((prev) => ({ ...prev, facilitator: e.target.value }))}
											onFocus={() => {
												if (!isView && facilitatorEmpSuggest.length > 0) setShowFacilitatorEmpDd(true);
											}}
											className={`w-full rounded px-2 py-1.5 text-sm border ${fieldRoClass}`}
											placeholder={isView ? '' : '이름 검색'}
											autoComplete="off"
										/>
										{!isView && showFacilitatorEmpDd && facilitatorEmpSuggest.length > 0 ? (
											<ul className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-40 overflow-auto rounded border border-blue-300 bg-white py-1 text-sm shadow-md">
												{facilitatorEmpSuggest.map((emp, i) => (
													<li key={`${emp.EMPNO}-${i}`}>
														<button
															type="button"
															className="w-full px-2 py-1.5 text-left hover:bg-blue-50"
															onMouseDown={(e) => e.preventDefault()}
															onClick={() => {
																setFormData((prev) => ({ ...prev, facilitator: emp.EMPNM }));
																setShowFacilitatorEmpDd(false);
															}}
														>
															<span className="font-medium text-black">{emp.EMPNM}</span>
															{emp.EMPNO ? (
																<span className="ml-2 text-gray-600">({emp.EMPNO})</span>
															) : null}
														</button>
													</li>
												))}
											</ul>
										) : null}
									</div>
								</div>

								{/* 5행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">보조 진행자</label>
									<div className={`relative ppm-emp-search flex flex-1 min-w-0`}>
										<input
											type="text"
											value={formData.assistantFacilitator}
											readOnly={isView}
											onChange={(e) =>
												setFormData((prev) => ({ ...prev, assistantFacilitator: e.target.value }))
											}
											onFocus={() => {
												if (!isView && assistantEmpSuggest.length > 0) setShowAssistantEmpDd(true);
											}}
											className={`w-full rounded px-2 py-1.5 text-sm border ${fieldRoClass}`}
											placeholder={isView ? '' : '이름 검색'}
											autoComplete="off"
										/>
										{!isView && showAssistantEmpDd && assistantEmpSuggest.length > 0 ? (
											<ul className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-40 overflow-auto rounded border border-blue-300 bg-white py-1 text-sm shadow-md">
												{assistantEmpSuggest.map((emp, i) => (
													<li key={`${emp.EMPNO}-${i}`}>
														<button
															type="button"
															className="w-full px-2 py-1.5 text-left hover:bg-blue-50"
															onMouseDown={(e) => e.preventDefault()}
															onClick={() => {
																setFormData((prev) => ({ ...prev, assistantFacilitator: emp.EMPNM }));
																setShowAssistantEmpDd(false);
															}}
														>
															<span className="font-medium text-black">{emp.EMPNM}</span>
															{emp.EMPNO ? (
																<span className="ml-2 text-gray-600">({emp.EMPNO})</span>
															) : null}
														</button>
													</li>
												))}
											</ul>
										) : null}
									</div>
								</div>
							</div>
						</div>

						{/* 프로그램 목표 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<h3 className="mb-3 text-lg font-semibold text-blue-900">프로그램 목표</h3>
							<textarea
								value={formData.objectivesText}
								readOnly={isView}
								onChange={(e) => setFormData((prev) => ({ ...prev, objectivesText: e.target.value }))}
								className={`w-full min-h-[120px] rounded px-3 py-2 text-sm resize-y border ${fieldRoClass}`}
								rows={5}
								placeholder="프로그램 목표를 입력하세요."
							/>
						</div>

						{/* 준비물 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<h3 className="mb-3 text-lg font-semibold text-blue-900">준비물</h3>
							<textarea
								value={formData.materialsText}
								readOnly={isView}
								onChange={(e) => setFormData((prev) => ({ ...prev, materialsText: e.target.value }))}
								className={`w-full min-h-[100px] rounded px-3 py-2 text-sm resize-y border ${fieldRoClass}`}
								rows={4}
								placeholder="준비물을 입력하세요."
							/>
						</div>

						{/* 프로그램운영과정 및 내용 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<h3 className="mb-3 text-lg font-semibold text-blue-900">프로그램운영과정 및 내용</h3>
							<textarea
								value={formData.processContentText}
								readOnly={isView}
								onChange={(e) => setFormData((prev) => ({ ...prev, processContentText: e.target.value }))}
								className={`w-full min-h-[200px] rounded px-3 py-2 text-sm resize-y border ${fieldRoClass}`}
								rows={10}
								placeholder="준비·진행 등 운영 과정과 내용을 입력하세요."
							/>
						</div>

								{/* 하단 버튼 */}
								<div className="flex justify-end">
									<button
										type="button"
										disabled={!isView}
										onClick={() => alert('프로그램계획서 복사 기능은 개발 중입니다.')}
										className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
									>
										프로그램계획서 복사
									</button>
								</div>
							</>
						)}
					</section>
				</div>
			</div>
		</div>

		{createModalOpen ? (
			<div
				className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
				role="presentation"
			>
				<div
					className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border-2 border-blue-300 bg-white shadow-xl"
					role="dialog"
					aria-modal="true"
					aria-labelledby="create-program-plan-title"
				>
					<div className="relative border-b border-blue-200 bg-blue-50 px-4 py-3 pr-36">
						<h2
							id="create-program-plan-title"
							className="text-center text-lg font-semibold text-blue-900"
						>
							프로그램계획서 등록
						</h2>
						<div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-2">
							<button
								type="button"
								disabled={createSaveLoading}
								onClick={() => void handleCreateSave()}
								className="rounded border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
							>
								{createSaveLoading ? '저장 중…' : '저장'}
							</button>
							<button
								type="button"
								disabled={createSaveLoading}
								onClick={closeCreateModal}
								className="rounded border border-blue-400 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
							>
								닫기
							</button>
						</div>
					</div>

					<div className="overflow-y-auto p-4">
						{createSaveError ? (
							<div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
								{createSaveError}
							</div>
						) : null}

						<div className="grid grid-cols-2 gap-3">
							<div className="col-span-2 flex items-center gap-2">
								<label className={modalLabelCls}>프로그램 명</label>
								<input
									type="text"
									value={createForm.programName}
									onChange={(e) => setCreateForm((f) => ({ ...f, programName: e.target.value }))}
									className={modalFieldCls}
								/>
							</div>

							<div className="col-span-2 flex items-center gap-2">
								<label className={modalLabelCls}>프로그램 구분</label>
								<select
									value={createForm.programGu}
									onChange={(e) => setCreateForm((f) => ({ ...f, programGu: e.target.value }))}
									className={modalFieldCls}
								>
									<option value="">선택</option>
									{PG_GU_OPTIONS.map(({ code, label }) => (
										<option key={code} value={code}>
											{code}. {label}
										</option>
									))}
								</select>
							</div>

							<div className="col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="flex min-w-0 items-center gap-2">
									<label className={modalLabelCls}>프로그램 일정</label>
									<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
										<input
											type="date"
											value={createForm.scheduleStart}
											onChange={(e) => setCreateForm((f) => ({ ...f, scheduleStart: e.target.value }))}
											className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-black"
										/>
										<span className="text-black">~</span>
										<input
											type="date"
											value={createForm.scheduleEnd}
											onChange={(e) => setCreateForm((f) => ({ ...f, scheduleEnd: e.target.value }))}
											className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-black"
										/>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<label className={modalLabelCls}>프로그램 장소</label>
									<input
										type="text"
										value={createForm.programLocation}
										onChange={(e) => setCreateForm((f) => ({ ...f, programLocation: e.target.value }))}
										className={modalFieldCls}
									/>
								</div>
							</div>

							<div className="col-span-2 flex flex-wrap items-center gap-2">
								<label className={modalLabelCls}>실행주기</label>
								<div className="flex flex-1 flex-wrap items-center gap-3">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="createExecCycle"
											checked={createForm.executionCycle === '주'}
											onChange={() => setCreateForm((f) => ({ ...f, executionCycle: '주' }))}
											className="h-4 w-4 border-blue-300 text-blue-600"
										/>
										<span className="text-sm text-blue-900">주</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="createExecCycle"
											checked={createForm.executionCycle === '월'}
											onChange={() => setCreateForm((f) => ({ ...f, executionCycle: '월' }))}
											className="h-4 w-4 border-blue-300 text-blue-600"
										/>
										<span className="text-sm text-blue-900">월</span>
									</label>
									<label className="flex items-center gap-2">
										<span className="text-sm text-black">횟수</span>
										<input
											type="text"
											value={createForm.frequency}
											onChange={(e) => setCreateForm((f) => ({ ...f, frequency: e.target.value }))}
											className="w-16 rounded border border-blue-300 bg-white px-2 py-1 text-sm"
										/>
									</label>
								</div>
							</div>

							<div className="col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
								<div className="flex items-center gap-2">
									<label className={modalLabelCls}>진행자</label>
									<div className="relative ppm-emp-search min-w-0 flex flex-1">
										<input
											type="text"
											value={createForm.facilitator}
											onChange={(e) => setCreateForm((f) => ({ ...f, facilitator: e.target.value }))}
											onFocus={() => {
												if (createFacEmpSuggest.length > 0) setShowCreateFacEmpDd(true);
											}}
											className={modalFieldCls}
											placeholder="이름 검색"
											autoComplete="off"
										/>
										{showCreateFacEmpDd && createFacEmpSuggest.length > 0 ? (
											<ul className="absolute left-0 right-0 top-full z-[110] mt-0.5 max-h-40 overflow-auto rounded border border-blue-300 bg-white py-1 text-sm shadow-md">
												{createFacEmpSuggest.map((emp, i) => (
													<li key={`${emp.EMPNO}-${i}`}>
														<button
															type="button"
															className="w-full px-2 py-1.5 text-left hover:bg-blue-50"
															onMouseDown={(e) => e.preventDefault()}
															onClick={() => {
																setCreateForm((f) => ({ ...f, facilitator: emp.EMPNM }));
																setShowCreateFacEmpDd(false);
															}}
														>
															<span className="font-medium text-black">{emp.EMPNM}</span>
															{emp.EMPNO ? (
																<span className="ml-2 text-gray-600">({emp.EMPNO})</span>
															) : null}
														</button>
													</li>
												))}
											</ul>
										) : null}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<label className={modalLabelCls}>보조 진행자</label>
									<div className="relative ppm-emp-search min-w-0 flex flex-1">
										<input
											type="text"
											value={createForm.assistantFacilitator}
											onChange={(e) =>
												setCreateForm((f) => ({ ...f, assistantFacilitator: e.target.value }))
											}
											onFocus={() => {
												if (createAsstEmpSuggest.length > 0) setShowCreateAsstEmpDd(true);
											}}
											className={modalFieldCls}
											placeholder="이름 검색"
											autoComplete="off"
										/>
										{showCreateAsstEmpDd && createAsstEmpSuggest.length > 0 ? (
											<ul className="absolute left-0 right-0 top-full z-[110] mt-0.5 max-h-40 overflow-auto rounded border border-blue-300 bg-white py-1 text-sm shadow-md">
												{createAsstEmpSuggest.map((emp, i) => (
													<li key={`${emp.EMPNO}-${i}`}>
														<button
															type="button"
															className="w-full px-2 py-1.5 text-left hover:bg-blue-50"
															onMouseDown={(e) => e.preventDefault()}
															onClick={() => {
																setCreateForm((f) => ({
																	...f,
																	assistantFacilitator: emp.EMPNM,
																}));
																setShowCreateAsstEmpDd(false);
															}}
														>
															<span className="font-medium text-black">{emp.EMPNM}</span>
															{emp.EMPNO ? (
																<span className="ml-2 text-gray-600">({emp.EMPNO})</span>
															) : null}
														</button>
													</li>
												))}
											</ul>
										) : null}
									</div>
								</div>
							</div>

							<div className="col-span-2 flex items-start gap-2">
								<label className={modalLabelCls}>대상자</label>
								<textarea
									value={createForm.targetAudience}
									onChange={(e) => setCreateForm((f) => ({ ...f, targetAudience: e.target.value }))}
									className={`${modalFieldCls} min-h-[72px] resize-y`}
									rows={3}
								/>
							</div>

							<div className="col-span-2 flex items-start gap-2">
								<label className={modalLabelCls}>프로그램목표</label>
								<textarea
									value={createForm.objectivesText}
									onChange={(e) => setCreateForm((f) => ({ ...f, objectivesText: e.target.value }))}
									className={`${modalFieldCls} min-h-[100px] resize-y`}
									rows={4}
								/>
							</div>

							<div className="col-span-2 flex items-start gap-2">
								<label className={modalLabelCls}>준비물</label>
								<textarea
									value={createForm.materialsText}
									onChange={(e) => setCreateForm((f) => ({ ...f, materialsText: e.target.value }))}
									className={`${modalFieldCls} min-h-[88px] resize-y`}
									rows={3}
								/>
							</div>

							<div className="col-span-2 flex flex-col gap-2">
								<label className="w-fit px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-black">
									프로그램운영과정 및 내용
								</label>
								<textarea
									value={createForm.processContentText}
									onChange={(e) =>
										setCreateForm((f) => ({ ...f, processContentText: e.target.value }))
									}
									className="min-h-[220px] w-full resize-y rounded border border-blue-300 bg-white px-3 py-2 text-sm text-black"
									rows={12}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		) : null}
		</>
    );
}
