"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	empno?: string | number;
	empnm?: string;
	uid?: string;
	[key: string]: unknown;
};

type F14040Row = {
	PGSEQ?: number;
	PGNM?: string | null;
	PG_GU?: string | number | null;
	DEL?: string | null;
};

type Program = {
	pgseq: number;
	category: string;
	name: string;
};

type FeedbackApiRow = {
	OPINION_SEQ?: number;
	PGSEQ?: number;
	YM?: string;
	OPINION_CONTENT?: string;
	APPLY_CONTENT?: string;
	REMARK?: string;
	REG_ID?: string;
	REG_DATE?: string | null;
	MOD_ID?: string;
	MOD_DATE?: string | null;
	PGNM?: string;
	PG_GU?: string | number | null;
};

type FeedbackRecord = {
	opinionSeq: number;
	yyyymm: string;
	pgseq: number;
	category: string;
	name: string;
	opinion: string;
	reflection: string;
	remarks: string;
	writerName: string;
	writeDate: string;
	updatedAt: string;
	updatedBy: string;
};

type FormMode = 'idle' | 'create' | 'edit';

const PG_GU_LABEL: Record<string, string> = {
	'1': '인지기능강화',
	'2': '신체기능강화',
	'3': '사회적응프로그램',
	'4': '가족참여프로그램',
	'6': '여가프로그램',
	'9': '기타',
};

function getCurrentYearMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pgGuLabel(value: unknown): string {
	const code = String(value ?? '').trim().replace(/^0+/, '');
	if (!code) return '';
	return PG_GU_LABEL[code] ?? code;
}

function ymToDigits(yyyymm: string): string {
	return String(yyyymm ?? '').trim().replace(/-/g, '');
}

function defaultWriterName(userInfo: UserInfo | null): string {
	const nm = String(userInfo?.empnm ?? '').trim();
	if (nm) return nm;
	return String(userInfo?.empno ?? userInfo?.uid ?? '').trim();
}

function toDatetimeLocalValue(isoOrDate: string | null | undefined): string {
	if (!isoOrDate) return '';
	const d = new Date(isoOrDate);
	if (Number.isNaN(d.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowDatetimeLocalValue(): string {
	return toDatetimeLocalValue(new Date().toISOString());
}

function formatDisplayDate(isoOrDate: string | null | undefined): string {
	if (!isoOrDate) return '-';
	const d = new Date(isoOrDate);
	return Number.isNaN(d.getTime()) ? String(isoOrDate) : d.toLocaleString();
}

function mapApiRowToRecord(row: FeedbackApiRow, programs: Program[]): FeedbackRecord {
	const pgseq = Number(row.PGSEQ ?? 0);
	const program = programs.find((p) => p.pgseq === pgseq);
	const ym = String(row.YM ?? '').trim();
	const yyyymm = ym.length === 6 ? `${ym.slice(0, 4)}-${ym.slice(4, 6)}` : ym;
	const writerName = String(row.REG_ID ?? '').trim();
	const writeDate = row.REG_DATE ?? '';
	return {
		opinionSeq: Number(row.OPINION_SEQ ?? 0),
		yyyymm,
		pgseq,
		category: (program?.category ?? pgGuLabel(row.PG_GU)) || '기타',
		name: (program?.name ?? String(row.PGNM ?? '').trim()) || '(프로그램명 없음)',
		opinion: String(row.OPINION_CONTENT ?? ''),
		reflection: String(row.APPLY_CONTENT ?? ''),
		remarks: String(row.REMARK ?? ''),
		writerName,
		writeDate: writeDate ? String(writeDate) : '',
		updatedAt: String(row.MOD_DATE ?? row.REG_DATE ?? ''),
		updatedBy: String(row.MOD_ID ?? row.REG_ID ?? '').trim() || writerName || '-',
	};
}

export default function ProgramFeedback() {
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [executionYearMonth, setExecutionYearMonth] = useState(() => getCurrentYearMonth());

	const [programs, setPrograms] = useState<Program[]>([]);
	const [loadingPrograms, setLoadingPrograms] = useState(false);
	const [programError, setProgramError] = useState<string | null>(null);

	const [page, setPage] = useState(1);
	const PAGE_SIZE = 18;
	const totalPages = useMemo(() => Math.max(1, Math.ceil(programs.length / PAGE_SIZE)), [programs.length]);
	useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
	const pageStart = (page - 1) * PAGE_SIZE;
	const pagedPrograms = useMemo(
		() => programs.slice(pageStart, pageStart + PAGE_SIZE),
		[programs, pageStart],
	);

	const [selectedPgseq, setSelectedPgseq] = useState<number | null>(null);
	const [opinionSeq, setOpinionSeq] = useState<number | null>(null);
	const [formMode, setFormMode] = useState<FormMode>('idle');

	const ancdStr = useMemo(() => String(userInfo?.ancd ?? '').trim(), [userInfo]);
	const loginLabel = useMemo(() => {
		const nm = String(userInfo?.empnm ?? '').trim();
		const no = String(userInfo?.empno ?? '').trim();
		if (nm && no) return `${nm}(${no})`;
		return nm || no || '-';
	}, [userInfo]);

	const [writerName, setWriterName] = useState('');
	const [writeDate, setWriteDate] = useState('');
	const [opinion, setOpinion] = useState('');
	const [reflection, setReflection] = useState('');
	const [remarks, setRemarks] = useState('');

	const [loadingFeedback, setLoadingFeedback] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedRecordsForMonth, setSavedRecordsForMonth] = useState<FeedbackRecord[]>([]);
	const [feedbackError, setFeedbackError] = useState<string | null>(null);

	const selectedProgram = useMemo(
		() => (selectedPgseq == null ? null : programs.find((p) => p.pgseq === selectedPgseq) ?? null),
		[programs, selectedPgseq],
	);

	const canEditFields = formMode === 'create' || formMode === 'edit';
	const savedPgseqSet = useMemo(() => new Set(savedRecordsForMonth.map((r) => r.pgseq)), [savedRecordsForMonth]);

	const fetchMonthRecords = useCallback(async () => {
		if (!ancdStr) {
			setSavedRecordsForMonth([]);
			return;
		}
		const ym = ymToDigits(executionYearMonth);
		const qs = new URLSearchParams({ ancd: ancdStr, ym });
		const res = await fetch(`/api/f14041-program-feedback?${qs.toString()}`, { cache: 'no-store' });
		const json = await res.json();
		if (!res.ok || !json?.success) {
			throw new Error(json?.error || '저장 내역 조회에 실패했습니다.');
		}
		const rows: FeedbackApiRow[] = Array.isArray(json.data) ? json.data : [];
		return rows.map((r) => mapApiRowToRecord(r, programs));
	}, [ancdStr, executionYearMonth, programs]);

	const refreshMonthRecords = useCallback(async () => {
		try {
			const records = await fetchMonthRecords();
			setSavedRecordsForMonth(records ?? []);
			setFeedbackError(null);
		} catch (e) {
			setSavedRecordsForMonth([]);
			setFeedbackError(e instanceof Error ? e.message : '저장 내역 조회 중 오류가 발생했습니다.');
		}
	}, [fetchMonthRecords]);

	const resetFormFields = useCallback(() => {
		setOpinionSeq(null);
		setWriterName('');
		setWriteDate('');
		setOpinion('');
		setReflection('');
		setRemarks('');
		setFormMode('idle');
	}, []);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const res = await fetch('/api/auth/user-info', { cache: 'no-store' });
				const json = await res.json();
				if (!alive) return;
				if (json?.success && json?.data) setUserInfo(json.data as UserInfo);
			} catch {
				// ignore
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		let alive = true;
		(async () => {
			setLoadingPrograms(true);
			setProgramError(null);
			try {
				const res = await fetch('/api/f14040', { cache: 'no-store' });
				const json = await res.json();
				if (!res.ok || !json?.success) throw new Error(json?.error || '프로그램 목록 조회에 실패했습니다.');
				const rows: F14040Row[] = Array.isArray(json.data) ? json.data : [];
				const mapped: Program[] = rows
					.filter((r) => String(r.DEL ?? '').trim().toUpperCase() !== 'D')
					.map((r) => ({
						pgseq: Number(r.PGSEQ ?? 0),
						category: pgGuLabel(r.PG_GU) || '기타',
						name: String(r.PGNM ?? '').trim() || '(프로그램명 없음)',
					}))
					.filter((p) => Number.isFinite(p.pgseq) && p.pgseq > 0)
					.sort((a, b) => a.pgseq - b.pgseq);
				if (!alive) return;
				setPrograms(mapped);
				setSelectedPgseq(null);
				resetFormFields();
			} catch (e) {
				if (!alive) return;
				setPrograms([]);
				setSelectedPgseq(null);
				resetFormFields();
				setProgramError(e instanceof Error ? e.message : '프로그램 목록 조회 중 오류가 발생했습니다.');
			} finally {
				if (alive) setLoadingPrograms(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [resetFormFields]);

	useEffect(() => {
		let alive = true;
		(async () => {
			if (!ancdStr) return;
			try {
				const records = await fetchMonthRecords();
				if (!alive) return;
				setSavedRecordsForMonth(records ?? []);
				setFeedbackError(null);
			} catch (e) {
				if (!alive) return;
				setSavedRecordsForMonth([]);
				setFeedbackError(e instanceof Error ? e.message : '저장 내역 조회 중 오류가 발생했습니다.');
			}
		})();
		return () => {
			alive = false;
		};
	}, [ancdStr, executionYearMonth, fetchMonthRecords]);

	useEffect(() => {
		let alive = true;
		(async () => {
			if (!ancdStr || selectedPgseq == null) {
				resetFormFields();
				return;
			}
			setLoadingFeedback(true);
			try {
				const ym = ymToDigits(executionYearMonth);
				const qs = new URLSearchParams({
					ancd: ancdStr,
					ym,
					pgseq: String(selectedPgseq),
				});
				const res = await fetch(`/api/f14041-program-feedback?${qs.toString()}`, { cache: 'no-store' });
				const json = await res.json();
				if (!alive) return;
				if (!res.ok || !json?.success) throw new Error(json?.error || '피드백 조회에 실패했습니다.');
				const rows: FeedbackApiRow[] = Array.isArray(json.data) ? json.data : [];
				const row = rows[0];
				if (row) {
					setOpinionSeq(Number(row.OPINION_SEQ ?? 0) || null);
					setWriterName(String(row.REG_ID ?? '').trim());
					setWriteDate(toDatetimeLocalValue(row.REG_DATE));
					setOpinion(String(row.OPINION_CONTENT ?? ''));
					setReflection(String(row.APPLY_CONTENT ?? ''));
					setRemarks(String(row.REMARK ?? ''));
					setFormMode('edit');
				} else {
					setOpinionSeq(null);
					setWriterName('');
					setWriteDate('');
					setOpinion('');
					setReflection('');
					setRemarks('');
					setFormMode('idle');
				}
				setFeedbackError(null);
			} catch (e) {
				if (!alive) return;
				resetFormFields();
				setFeedbackError(e instanceof Error ? e.message : '피드백 조회 중 오류가 발생했습니다.');
			} finally {
				if (alive) setLoadingFeedback(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [ancdStr, executionYearMonth, selectedPgseq, resetFormFields]);

	const handleSelectProgram = (pgseq: number) => {
		setSelectedPgseq(pgseq);
	};

	const handleStartCreate = () => {
		if (!selectedProgram) {
			alert('프로그램을 선택해 주세요.');
			return;
		}
		if (opinionSeq != null) {
			alert('이미 저장된 글이 있습니다. 수정 모드에서 편집해 주세요.');
			return;
		}
		setFormMode('create');
		setWriterName(defaultWriterName(userInfo));
		setWriteDate(nowDatetimeLocalValue());
		setOpinion('');
		setReflection('');
		setRemarks('');
	};

	const handleSave = async () => {
		if (!ancdStr) {
			alert('로그인 정보를 확인할 수 없습니다.');
			return;
		}
		if (!selectedProgram) {
			alert('프로그램을 선택해 주세요.');
			return;
		}
		if (formMode !== 'create' && formMode !== 'edit') {
			alert('생성 버튼을 눌러 작성을 시작하거나, 저장된 글을 선택해 주세요.');
			return;
		}
		if (!String(writerName).trim()) {
			alert('작성자 이름을 입력해 주세요.');
			return;
		}
		if (!String(writeDate).trim()) {
			alert('작성 날짜를 설정해 주세요.');
			return;
		}
		setSaving(true);
		try {
			const qs = new URLSearchParams({ ancd: ancdStr });
			const res = await fetch(`/api/f14041-program-feedback?${qs.toString()}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					PGSEQ: selectedProgram.pgseq,
					YM: ymToDigits(executionYearMonth),
					OPINION_CONTENT: opinion ?? '',
					APPLY_CONTENT: reflection ?? '',
					REMARK: remarks ?? '',
					REG_ID: writerName.trim(),
					REG_DATE: writeDate,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json?.success) throw new Error(json?.error || '저장에 실패했습니다.');
			if (json.opinionSeq != null) setOpinionSeq(Number(json.opinionSeq));
			setFormMode('edit');
			await refreshMonthRecords();
			alert('저장되었습니다.');
		} catch (e) {
			alert(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!ancdStr) {
			alert('로그인 정보를 확인할 수 없습니다.');
			return;
		}
		if (!selectedProgram) {
			alert('프로그램을 선택해 주세요.');
			return;
		}
		if (opinionSeq == null) {
			alert('삭제할 저장 데이터가 없습니다.');
			return;
		}
		if (!confirm('정말 삭제하시겠습니까?')) return;
		setSaving(true);
		try {
			const qs = new URLSearchParams({
				ancd: ancdStr,
				opinionSeq: String(opinionSeq),
			});
			const res = await fetch(`/api/f14041-program-feedback?${qs.toString()}`, { method: 'DELETE' });
			const json = await res.json();
			if (!res.ok || !json?.success) throw new Error(json?.error || '삭제에 실패했습니다.');
			resetFormFields();
			await refreshMonthRecords();
			alert('삭제되었습니다.');
		} catch (e) {
			alert(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.');
		} finally {
			setSaving(false);
		}
	};

	const handleSelectSavedRecord = (rec: FeedbackRecord) => {
		setSelectedPgseq(rec.pgseq);
	};

	const formModeLabel =
		formMode === 'create' ? '신규 작성' : formMode === 'edit' ? '수정' : '대기';

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50 print:hidden">
				<h1 className="text-xl font-semibold text-blue-900">프로그램 의견수렴 및 반영(신규페이지)</h1>
					<h1 className="text-xl font-semibold text-blue-900">F14041_PROGRAM_FEEDBACK 신규테이블 생성 </h1>
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-blue-900">수행년월</label>
						<input
							type="month"
							value={executionYearMonth}
							onChange={(e) => setExecutionYearMonth(e.target.value)}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
					</div>
					<div className="text-xs text-blue-900/75">기관: {String(userInfo?.annm ?? '').trim() || '-'} · 로그인: {loginLabel}</div>
					<button
						type="button"
						onClick={() => window.close()}
						className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						닫기
					</button>
				</div>
			</div>

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<div className="flex flex-col w-[34%] min-w-[280px] shrink-0 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<h3 className="text-sm font-semibold text-blue-900">프로그램 목록 (F14040)</h3>
						<p className="text-xs text-blue-900/70 mt-0.5">저장됨 표시 · 18개 단위 페이지</p>
					</div>
					<div className="flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">
										구분
									</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 whitespace-nowrap">프로그램명</th>
								</tr>
							</thead>
							<tbody>
								{loadingPrograms ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">
											로딩 중...
										</td>
									</tr>
								) : programError ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-red-700">
											{programError}
										</td>
									</tr>
								) : pagedPrograms.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">
											프로그램이 없습니다
										</td>
									</tr>
								) : (
									pagedPrograms.map((p) => (
										<tr
											key={p.pgseq}
											onClick={() => handleSelectProgram(p.pgseq)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedPgseq === p.pgseq ? 'bg-blue-100' : ''
											}`}
										>
											<td className="px-3 py-2 text-center border-r border-blue-100 whitespace-nowrap">
												{p.category}
											</td>
											<td className="px-3 py-2 text-left">
												{p.name}
												{savedPgseqSet.has(p.pgseq) ? (
													<span className="ml-1.5 text-[10px] font-medium text-green-800 bg-green-100 px-1.5 py-0.5 rounded">
														저장됨
													</span>
												) : null}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{totalPages > 1 ? (
						<div className="shrink-0 flex items-center justify-center gap-1 px-2 py-2 border-t border-blue-200 bg-blue-50/60">
							<button type="button" onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50">
								&lt;&lt;
							</button>
							<button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50">
								&lt;
							</button>
							<span className="text-xs text-blue-900 px-2 tabular-nums">
								{page} / {totalPages}
							</span>
							<button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50">
								&gt;
							</button>
							<button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50">
								&gt;&gt;
							</button>
						</div>
					) : null}
				</div>

				<div className="flex flex-col flex-1 min-w-0 bg-white">
					<div className="px-4 py-3 border-b border-blue-200 bg-white">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<div className="text-sm font-semibold text-blue-900">
									선택 프로그램: {selectedProgram ? `${selectedProgram.category} · ${selectedProgram.name}` : '선택해 주세요'}
								</div>
								<div className="text-xs text-blue-900/70 mt-1">
									수행년월 {executionYearMonth} · 상태: {formModeLabel}
									{loadingFeedback ? ' · 불러오는 중...' : opinionSeq != null ? ` · OPINION_SEQ: ${opinionSeq}` : ''}
								</div>
								{formMode === 'idle' && selectedProgram && !loadingFeedback ? (
									<p className="text-xs text-amber-800 mt-1">저장된 글이 없습니다. 「생성」 버튼을 누른 뒤 작성해 주세요.</p>
								) : null}
								{feedbackError ? <div className="text-xs text-red-700 mt-1">{feedbackError}</div> : null}
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={handleStartCreate}
									className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-400 rounded hover:bg-blue-200 disabled:opacity-50"
									disabled={!selectedProgram || saving || loadingFeedback || opinionSeq != null}
								>
									생성
								</button>
								<button
									type="button"
									onClick={handleSave}
									className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 disabled:opacity-50"
									disabled={!selectedProgram || saving || loadingFeedback || !canEditFields}
								>
									{saving ? '처리 중...' : '저장'}
								</button>
								<button
									type="button"
									onClick={handleDelete}
									className="px-4 py-2 text-sm font-medium text-red-800 bg-red-50 border border-red-300 rounded hover:bg-red-100 disabled:opacity-50"
									disabled={!selectedProgram || saving || loadingFeedback || opinionSeq == null}
								>
									삭제
								</button>
							</div>
						</div>
					</div>

					<div className="flex-1 min-h-0 overflow-y-auto p-4">
						<div className="grid gap-4 max-w-5xl">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs text-blue-900/80 mb-1">작성자 이름</label>
									<input
										value={writerName}
										onChange={(e) => setWriterName(e.target.value)}
										className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full disabled:bg-gray-50"
										maxLength={50}
										placeholder="작성자 성명"
										disabled={!canEditFields}
									/>
								</div>
								<div>
									<label className="block text-xs text-blue-900/80 mb-1">작성 날짜</label>
									<input
										type="datetime-local"
										value={writeDate}
										onChange={(e) => setWriteDate(e.target.value)}
										className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full disabled:bg-gray-50"
										disabled={!canEditFields}
									/>
								</div>
							</div>
							<div>
								<label className="block text-xs text-blue-900/80 mb-1">의견수렴 내용</label>
								<textarea
									value={opinion}
									onChange={(e) => setOpinion(e.target.value)}
									rows={8}
									className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full resize-y disabled:bg-gray-50"
									placeholder="프로그램 운영 중 수급자/보호자/직원 의견을 정리해 주세요."
									disabled={!canEditFields}
								/>
							</div>
							<div>
								<label className="block text-xs text-blue-900/80 mb-1">반영 내용</label>
								<textarea
									value={reflection}
									onChange={(e) => setReflection(e.target.value)}
									rows={8}
									className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full resize-y disabled:bg-gray-50"
									placeholder="의견을 바탕으로 실제 반영한 조치/개선 내용을 기록해 주세요."
									disabled={!canEditFields}
								/>
							</div>
							<div>
								<label className="block text-xs text-blue-900/80 mb-1">비고</label>
								<input
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full disabled:bg-gray-50"
									maxLength={500}
									disabled={!canEditFields}
								/>
							</div>

							<div className="border-t border-blue-100 pt-3">
								<div className="text-sm font-semibold text-blue-900 mb-2">이번 달 저장 내역</div>
								{savedRecordsForMonth.length === 0 ? (
									<div className="text-sm text-blue-900/60">저장된 내역이 없습니다.</div>
								) : (
									<ul className="space-y-2">
										{savedRecordsForMonth.map((r) => (
											<li key={r.opinionSeq}>
												<button
													type="button"
													onClick={() => handleSelectSavedRecord(r)}
													className="w-full text-left border border-blue-200 rounded px-3 py-2 hover:bg-blue-50"
												>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="text-sm text-blue-900">
															<span className="font-semibold">{r.category}</span> · {r.name} (PGSEQ: {r.pgseq})
														</div>
														<div className="text-xs text-blue-900/70">
															작성: {r.writerName || '-'} · {formatDisplayDate(r.writeDate)}
														</div>
													</div>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
