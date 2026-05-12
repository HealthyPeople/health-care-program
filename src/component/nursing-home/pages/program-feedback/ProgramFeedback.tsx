"use client";

import React, { useEffect, useMemo, useState } from 'react';

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	empno?: string | number;
	empnm?: string;
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

type FeedbackRecord = {
	key: string; // storage key
	yyyymm: string; // YYYY-MM
	pgseq: number;
	category: string;
	name: string;
	opinion: string;
	reflection: string;
	remarks: string;
	updatedAt: string; // ISO
	updatedBy: string; // empnm(empno)
};

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

function storageKey(ancd: string, yyyymm: string, pgseq: number): string {
	return `program-feedback:${ancd}:${yyyymm}:${pgseq}`;
}

function safeJsonParse<T>(s: string | null): T | null {
	if (!s) return null;
	try {
		return JSON.parse(s) as T;
	} catch {
		return null;
	}
}

export default function ProgramFeedback() {
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [executionYearMonth, setExecutionYearMonth] = useState(() => getCurrentYearMonth());

	const [programs, setPrograms] = useState<Program[]>([]);
	const [loadingPrograms, setLoadingPrograms] = useState(false);
	const [programError, setProgramError] = useState<string | null>(null);

	const [page, setPage] = useState(1);
	const PAGE_SIZE = 10;
	const totalPages = useMemo(() => Math.max(1, Math.ceil(programs.length / PAGE_SIZE)), [programs.length]);
	useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
	const pageStart = (page - 1) * PAGE_SIZE;
	const pagedPrograms = useMemo(
		() => programs.slice(pageStart, pageStart + PAGE_SIZE),
		[programs, pageStart],
	);

	const [selectedPgseq, setSelectedPgseq] = useState<number | null>(null);

	const ancdStr = useMemo(() => String(userInfo?.ancd ?? '').trim(), [userInfo]);
	const updatedBy = useMemo(() => {
		const nm = String(userInfo?.empnm ?? '').trim();
		const no = String(userInfo?.empno ?? '').trim();
		if (nm && no) return `${nm}(${no})`;
		return nm || no || '-';
	}, [userInfo]);

	const [opinion, setOpinion] = useState('');
	const [reflection, setReflection] = useState('');
	const [remarks, setRemarks] = useState('');

	const selectedProgram = useMemo(
		() => (selectedPgseq == null ? null : programs.find((p) => p.pgseq === selectedPgseq) ?? null),
		[programs, selectedPgseq],
	);

	// user-info 로드
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

	// 프로그램 목록(F14040) 로드
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
				setOpinion('');
				setReflection('');
				setRemarks('');
			} catch (e) {
				if (!alive) return;
				setPrograms([]);
				setSelectedPgseq(null);
				setOpinion('');
				setReflection('');
				setRemarks('');
				setProgramError(e instanceof Error ? e.message : '프로그램 목록 조회 중 오류가 발생했습니다.');
			} finally {
				if (alive) setLoadingPrograms(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	// 선택 프로그램 변경 시 localStorage에서 로드
	useEffect(() => {
		if (!ancdStr || selectedPgseq == null) return;
		const k = storageKey(ancdStr, executionYearMonth, selectedPgseq);
		const saved = safeJsonParse<FeedbackRecord>(localStorage.getItem(k));
		if (saved) {
			setOpinion(saved.opinion ?? '');
			setReflection(saved.reflection ?? '');
			setRemarks(saved.remarks ?? '');
		} else {
			setOpinion('');
			setReflection('');
			setRemarks('');
		}
	}, [ancdStr, executionYearMonth, selectedPgseq]);

	const savedRecordsForMonth = useMemo(() => {
		if (!ancdStr) return [] as FeedbackRecord[];
		const prefix = `program-feedback:${ancdStr}:${executionYearMonth}:`;
		const out: FeedbackRecord[] = [];
		for (let i = 0; i < localStorage.length; i += 1) {
			const key = localStorage.key(i);
			if (!key || !key.startsWith(prefix)) continue;
			const rec = safeJsonParse<FeedbackRecord>(localStorage.getItem(key));
			if (rec && rec.yyyymm === executionYearMonth) out.push(rec);
		}
		out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		return out;
	}, [ancdStr, executionYearMonth]);

	const handleSelectProgram = (pgseq: number) => {
		setSelectedPgseq(pgseq);
	};

	const handleSave = () => {
		if (!ancdStr) {
			alert('로그인 정보를 확인할 수 없습니다.');
			return;
		}
		if (!selectedProgram) {
			alert('프로그램을 선택해 주세요.');
			return;
		}
		const now = new Date().toISOString();
		const k = storageKey(ancdStr, executionYearMonth, selectedProgram.pgseq);
		const rec: FeedbackRecord = {
			key: k,
			yyyymm: executionYearMonth,
			pgseq: selectedProgram.pgseq,
			category: selectedProgram.category,
			name: selectedProgram.name,
			opinion: opinion ?? '',
			reflection: reflection ?? '',
			remarks: remarks ?? '',
			updatedAt: now,
			updatedBy,
		};
		localStorage.setItem(k, JSON.stringify(rec));
		alert('저장되었습니다. (임시 저장: 브라우저에 저장됨)');
	};

	const handleDelete = () => {
		if (!ancdStr) {
			alert('로그인 정보를 확인할 수 없습니다.');
			return;
		}
		if (!selectedProgram) {
			alert('프로그램을 선택해 주세요.');
			return;
		}
		const k = storageKey(ancdStr, executionYearMonth, selectedProgram.pgseq);
		if (!localStorage.getItem(k)) {
			alert('삭제할 저장 데이터가 없습니다.');
			return;
		}
		if (!confirm('정말 삭제하시겠습니까?')) return;
		localStorage.removeItem(k);
		setOpinion('');
		setReflection('');
		setRemarks('');
		alert('삭제되었습니다. (임시 저장 데이터)');
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50 print:hidden">
				<h1 className="text-xl font-semibold text-blue-900">프로그램 의견수렴 및 반영(신규/임의개발)</h1>
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
					<div className="text-xs text-blue-900/75">
						기관: {String(userInfo?.annm ?? '').trim() || '-'} · 작성자: {updatedBy}
					</div>
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
				{/* 좌측: 프로그램 목록 */}
				<div className="flex flex-col w-[34%] min-w-[280px] shrink-0 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<h3 className="text-sm font-semibold text-blue-900">프로그램 목록 (F14040)</h3>
						<p className="text-xs text-blue-900/70 mt-0.5">10개 단위 페이지네이션</p>
					</div>
					<div className="flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200 whitespace-nowrap">
										구분
									</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 whitespace-nowrap">
										프로그램명
									</th>
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
											<td className="px-3 py-2 text-left">{p.name}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{totalPages > 1 ? (
						<div className="shrink-0 flex items-center justify-center gap-1 px-2 py-2 border-t border-blue-200 bg-blue-50/60">
							<button
								type="button"
								onClick={() => setPage(1)}
								disabled={page === 1}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
							>
								&lt;&lt;
							</button>
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
							>
								&lt;
							</button>
							<span className="text-xs text-blue-900 px-2 tabular-nums">
								{page} / {totalPages}
							</span>
							<button
								type="button"
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page >= totalPages}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
							>
								&gt;
							</button>
							<button
								type="button"
								onClick={() => setPage(totalPages)}
								disabled={page >= totalPages}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
							>
								&gt;&gt;
							</button>
						</div>
					) : null}
				</div>

				{/* 우측: 입력/저장 */}
				<div className="flex flex-col flex-1 min-w-0 bg-white">
					<div className="px-4 py-3 border-b border-blue-200 bg-white">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<div className="text-sm font-semibold text-blue-900">
									선택 프로그램: {selectedProgram ? `${selectedProgram.category} · ${selectedProgram.name}` : '선택해 주세요'}
								</div>
								<div className="text-xs text-blue-900/70 mt-1">
									저장 단위: {executionYearMonth} / PGSEQ(프로그램) 단위
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={handleSave}
									className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 disabled:opacity-50"
									disabled={!selectedProgram}
								>
									저장
								</button>
								<button
									type="button"
									onClick={handleDelete}
									className="px-4 py-2 text-sm font-medium text-red-800 bg-red-50 border border-red-300 rounded hover:bg-red-100 disabled:opacity-50"
									disabled={!selectedProgram}
								>
									삭제
								</button>
							</div>
						</div>
					</div>

					<div className="flex-1 min-h-0 overflow-y-auto p-4">
						<div className="grid gap-4 max-w-5xl">
							<div>
								<label className="block text-xs text-blue-900/80 mb-1">의견수렴 내용</label>
								<textarea
									value={opinion}
									onChange={(e) => setOpinion(e.target.value)}
									rows={8}
									className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full resize-y"
									placeholder="프로그램 운영 중 수급자/보호자/직원 의견을 정리해 주세요."
								/>
							</div>
							<div>
								<label className="block text-xs text-blue-900/80 mb-1">반영 내용</label>
								<textarea
									value={reflection}
									onChange={(e) => setReflection(e.target.value)}
									rows={8}
									className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full resize-y"
									placeholder="의견을 바탕으로 실제 반영한 조치/개선 내용을 기록해 주세요."
								/>
							</div>
							<div>
								<label className="block text-xs text-blue-900/80 mb-1">비고</label>
								<input
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									className="px-2 py-2 text-sm border border-blue-300 rounded bg-white w-full"
									maxLength={200}
								/>
							</div>

							<div className="border-t border-blue-100 pt-3">
								<div className="text-sm font-semibold text-blue-900 mb-2">이번 달 저장 내역(임시)</div>
								{savedRecordsForMonth.length === 0 ? (
									<div className="text-sm text-blue-900/60">저장된 내역이 없습니다.</div>
								) : (
									<ul className="space-y-2">
										{savedRecordsForMonth.map((r) => (
											<li key={r.key} className="border border-blue-200 rounded px-3 py-2">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div className="text-sm text-blue-900">
														<span className="font-semibold">{r.category}</span> · {r.name} (PGSEQ: {r.pgseq})
													</div>
													<div className="text-xs text-blue-900/70">
														{new Date(r.updatedAt).toLocaleString()} · {r.updatedBy}
													</div>
												</div>
											</li>
										))}
									</ul>
								)}
								<p className="text-xs text-blue-900/60 mt-2 leading-snug">
									현재는 전용 DB/API가 없어 브라우저 임시 저장(localStorage)로 동작합니다. 서버 저장이 필요하면 테이블/API를
									추가해 연동하겠습니다.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

