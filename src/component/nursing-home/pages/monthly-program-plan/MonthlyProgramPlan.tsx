"use client";
import React, { useState, useEffect, useMemo } from 'react';

/** type="month" 값 — 당월 `YYYY-MM` */
function getCurrentYearMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface Program {
	id: string;
	category: string;
	name: string;
	goals?: string[];
}

type F14040Row = {
	ANCD?: number;
	PGSEQ?: number;
	PGNM?: string | null;
	PGOJ?: string | null;
	PG_GU?: string | number | null;
	DEL?: string | null;
};

const PG_GU_LABEL: Record<string, string> = {
	'1': '인지기능강화',
	'2': '신체기능강화',
	'3': '사회적응프로그램',
	'4': '가족참여프로그램',
	'6': '여가프로그램',
	'9': '기타',
};

function pgGuLabel(value: unknown): string {
	const code = String(value ?? '').trim().replace(/^0+/, '');
	if (!code) return '';
	return PG_GU_LABEL[code] ?? code;
}

export default function MonthlyProgramPlan() {
	const [executionYearMonth, setExecutionYearMonth] = useState(() => getCurrentYearMonth());
	const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
	const [selectedPrograms, setSelectedPrograms] = useState<Program[]>([]);
	const [selectedAvailableIndex, setSelectedAvailableIndex] = useState<number | null>(null);
	const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
	const [selectedDetailProgram, setSelectedDetailProgram] = useState<Program | null>(null);

	// 프로그램 설정 폼 데이터
	const [programConfig, setProgramConfig] = useState({
		programName: '',
		category: '',
		cycle: '주', // 주/월
		executionCount: '',
		remarks: ''
	});

	// 사용 가능한 프로그램 목록 (F14040: 세션 ANCD 기준)
	const [availableLoading, setAvailableLoading] = useState(false);
	const [availableError, setAvailableError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			setAvailableLoading(true);
			setAvailableError(null);
			try {
				// ANCD는 서버에서 세션으로 필터링하지만, user-info로 선조회해도 OK
				const ui = await fetch('/api/auth/user-info', { cache: 'no-store' }).then((r) => r.json());
				const ancd = ui?.success ? ui?.data?.ancd : null;
				const url = ancd != null && String(ancd).trim() !== '' ? `/api/f14040?ancd=${encodeURIComponent(String(ancd))}` : '/api/f14040';
				const res = await fetch(url, { cache: 'no-store' });
				const json = await res.json();
				if (!res.ok || !json?.success) throw new Error(json?.error || '프로그램 목록 조회에 실패했습니다.');
				const rows: F14040Row[] = Array.isArray(json.data) ? json.data : [];
				const mapped: Program[] = rows
					.filter((r) => String(r.DEL ?? '').trim().toUpperCase() !== 'D')
					.map((r) => ({
						id: r.PGSEQ != null ? String(r.PGSEQ) : crypto.randomUUID(),
						category: pgGuLabel(r.PG_GU) || '기타',
						name: String(r.PGNM ?? '').trim() || '(프로그램명 없음)',
						goals: String(r.PGOJ ?? '').trim() ? [String(r.PGOJ ?? '').trim()] : undefined,
					}));
				if (!alive) return;
				setAvailablePrograms(mapped);
				setSelectedAvailableIndex(null);
			} catch (e) {
				if (!alive) return;
				setAvailablePrograms([]);
				setSelectedAvailableIndex(null);
				setAvailableError(e instanceof Error ? e.message : '프로그램 목록 조회 중 오류가 발생했습니다.');
			} finally {
				if (alive) setAvailableLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	// 페이지네이션 (사용 가능한 프로그램: 10개)
	const AVAILABLE_PAGE_SIZE = 10;
	const [availablePage, setAvailablePage] = useState(1);
	const availableTotalPages = useMemo(
		() => Math.max(1, Math.ceil(availablePrograms.length / AVAILABLE_PAGE_SIZE)),
		[availablePrograms.length],
	);
	useEffect(() => {
		setAvailablePage((p) => Math.min(p, availableTotalPages));
	}, [availableTotalPages]);

	const availablePageStart = (availablePage - 1) * AVAILABLE_PAGE_SIZE;
	const pagedAvailablePrograms = useMemo(
		() => availablePrograms.slice(availablePageStart, availablePageStart + AVAILABLE_PAGE_SIZE),
		[availablePrograms, availablePageStart],
	);

	// 날짜 형식 변환 (YYYY-MM -> YYYY년MM월)
	const formatYearMonth = (dateStr: string) => {
		if (!dateStr) return '';
		const [year, month] = dateStr.split('-');
		return `${year}년${month}월`;
	};

	// 날짜 형식 변환 (YYYY년MM월 -> YYYY-MM)
	const parseYearMonth = (dateStr: string) => {
		if (!dateStr) return '';
		const match = dateStr.match(/(\d{4})년(\d{1,2})월/);
		if (match) {
			const year = match[1];
			const month = match[2].padStart(2, '0');
			return `${year}-${month}`;
		}
		return dateStr;
	};

	// 추가 함수 (왼쪽 -> 오른쪽)
	const handleAdd = () => {
		if (selectedAvailableIndex === null) {
			alert('추가할 프로그램을 선택해주세요.');
			return;
		}

		const programToAdd = availablePrograms[selectedAvailableIndex];
		if (!selectedPrograms.find(p => p.id === programToAdd.id)) {
			setSelectedPrograms([...selectedPrograms, { ...programToAdd }]);
			setSelectedAvailableIndex(null);
		} else {
			alert('이미 추가된 프로그램입니다.');
		}
	};

	// 삭제 함수 (오른쪽 -> 왼쪽)
	const handleRemove = () => {
		if (selectedProgramIndex === null) {
			alert('삭제할 프로그램을 선택해주세요.');
			return;
		}

		const updatedPrograms = selectedPrograms.filter((_, index) => index !== selectedProgramIndex);
		setSelectedPrograms(updatedPrograms);
		setSelectedProgramIndex(null);
		
		if (selectedDetailProgram && selectedPrograms[selectedProgramIndex]?.id === selectedDetailProgram.id) {
			setSelectedDetailProgram(null);
			setProgramConfig({
				programName: '',
				category: '',
				cycle: '주',
				executionCount: '',
				remarks: ''
			});
		}
	};

	// 프로그램 선택 함수 (왼쪽 목록)
	const handleSelectAvailable = (index: number) => {
		setSelectedAvailableIndex(index);
		const program = availablePrograms[index];
		setSelectedDetailProgram(program);
		setProgramConfig({
			programName: program.name,
			category: program.category,
			cycle: '주',
			executionCount: '',
			remarks: ''
		});
	};

	// 프로그램 선택 함수 (오른쪽 목록)
	const handleSelectProgram = (index: number) => {
		setSelectedProgramIndex(index);
		const program = selectedPrograms[index];
		setSelectedDetailProgram(program);
		setProgramConfig({
			programName: program.name,
			category: program.category,
			cycle: '주',
			executionCount: '',
			remarks: ''
		});
	};

	// 계획 검색 함수
	const handleSearch = async () => {
		// TODO: 실제 API 엔드포인트로 변경 필요
		// const url = `/api/monthly-program-plan/search?yearMonth=${executionYearMonth}`;
		// const response = await fetch(url);
		// const result = await response.json();
		
		alert('기능 개발 중입니다.');
	};

	// 전월 수행계획 이관 함수
	const handleTransferPreviousMonth = async () => {
		// TODO: 실제 API 엔드포인트로 변경 필요
		// const url = `/api/monthly-program-plan/transfer-previous`;
		// const response = await fetch(url);
		// const result = await response.json();
		
		alert('기능 개발 중입니다.');
	};

	// 저장 함수
	const handleSave = async () => {
		alert('기능 개발 중입니다.');
	};

	// 출력 함수
	const handlePrint = () => {
		alert('기능 개발 중입니다.');
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50">
				<h1 className="text-xl font-semibold text-blue-900">(월)치료프로그램 수행 계획</h1>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-blue-900">수행년월</label>
						<input
							type="month"
							value={executionYearMonth}
							onChange={(e) => setExecutionYearMonth(e.target.value)}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={handleSearch}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							계획검색
						</button>
						<button
							onClick={handleTransferPreviousMonth}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							전월수행계획이관
						</button>

					</div>
				</div>
			</div>

			{/* 메인 컨텐츠 영역 */}
			<div className="flex flex-1 overflow-hidden">
				{/* 왼쪽: 사용 가능한 프로그램 목록 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<h3 className="text-sm font-semibold text-blue-900">사용 가능한 프로그램</h3>
					</div>
					<div className="flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">프로그램구분명</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900">프로그램명</th>
								</tr>
							</thead>
							<tbody>
								{availableLoading ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">
											로딩 중...
										</td>
									</tr>
								) : availableError ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-red-700">
											{availableError}
										</td>
									</tr>
								) : pagedAvailablePrograms.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">프로그램이 없습니다</td>
									</tr>
								) : (
									pagedAvailablePrograms.map((program, index) => {
										const globalIndex = availablePageStart + index;
										return (
										<tr
											key={program.id}
											onClick={() => handleSelectAvailable(globalIndex)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedAvailableIndex === globalIndex ? 'bg-blue-100' : ''
											}`}
										>
											<td className="px-3 py-2 text-center border-r border-blue-100">{program.category}</td>
											<td className="px-3 py-2 text-center">{program.name}</td>
										</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{availableTotalPages > 1 ? (
						<div className="shrink-0 flex items-center justify-center gap-1 px-2 py-2 border-t border-blue-200 bg-blue-50/60">
							<button
								type="button"
								onClick={() => setAvailablePage(1)}
								disabled={availablePage === 1}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
								aria-label="첫 페이지"
							>
								&lt;&lt;
							</button>
							<button
								type="button"
								onClick={() => setAvailablePage((p) => Math.max(1, p - 1))}
								disabled={availablePage === 1}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
								aria-label="이전 페이지"
							>
								&lt;
							</button>
							<span className="text-xs text-blue-900 px-2 tabular-nums">
								{availablePage} / {availableTotalPages}
							</span>
							<button
								type="button"
								onClick={() => setAvailablePage((p) => Math.min(availableTotalPages, p + 1))}
								disabled={availablePage >= availableTotalPages}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
								aria-label="다음 페이지"
							>
								&gt;
							</button>
							<button
								type="button"
								onClick={() => setAvailablePage(availableTotalPages)}
								disabled={availablePage >= availableTotalPages}
								className="px-2 py-0.5 text-xs border border-blue-300 rounded disabled:opacity-40 hover:bg-blue-50"
								aria-label="마지막 페이지"
							>
								&gt;&gt;
							</button>
						</div>
					) : null}
				</div>

				{/* 중간: 버튼 영역 */}
				<div className="flex flex-col items-center justify-center w-32 gap-4 p-4 bg-white border-r border-blue-200">
					<button
						onClick={handleAdd}
						className="w-full px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						추가 =&gt;
					</button>
					<button
						onClick={handleRemove}
						className="w-full px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						&lt;=삭제
					</button>
					<button
						onClick={handlePrint}
						className="w-full px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						출력
					</button>
				</div>

				{/* 오른쪽: 선택된 프로그램 목록 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<h3 className="text-sm font-semibold text-blue-900">선택된 프로그램</h3>
					</div>
					<div className="flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">프로그램구분명</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900">프로그램명</th>
								</tr>
							</thead>
							<tbody>
								{selectedPrograms.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">선택된 프로그램이 없습니다</td>
									</tr>
								) : (
									selectedPrograms.map((program, index) => (
										<tr
											key={program.id}
											onClick={() => handleSelectProgram(index)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedProgramIndex === index ? 'bg-blue-100' : ''
											}`}
										>
											<td className="px-3 py-2 text-center border-r border-blue-100">{program.category}</td>
											<td className="px-3 py-2 text-center">{program.name}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* 하단 영역 */}
			<div className="flex flex-1 overflow-hidden border-t border-blue-200">
				{/* 왼쪽: 프로그램 상세 정보 */}
				<div className="flex flex-col w-1/2 p-4 bg-white border-r border-blue-200">
					<h3 className="mb-4 text-lg font-semibold text-blue-900">프로그램 상세</h3>
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<label className="w-20 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">구분</label>
							<input
								type="text"
								value={selectedDetailProgram?.category || ''}
								readOnly
								className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-20 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">명</label>
							<input
								type="text"
								value={selectedDetailProgram?.name || ''}
								readOnly
								className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
							/>
						</div>
						<div className="flex items-start gap-2">
							<label className="w-20 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">목표</label>
							<div className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-blue-300 rounded min-h-[120px]">
								{selectedDetailProgram?.goals && selectedDetailProgram.goals.length > 0 ? (
									<ul className="space-y-1 list-disc list-inside">
										{selectedDetailProgram.goals.map((goal, index) => (
											<li key={index} className="text-blue-900">{goal}</li>
										))}
									</ul>
								) : (
									<span className="text-blue-900/60">목표가 없습니다</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* 오른쪽: 프로그램 설정 및 저장 */}
				<div className="flex flex-col w-1/2 p-4 bg-white">
					<h3 className="mb-4 text-lg font-semibold text-blue-900">프로그램 설정</h3>
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">프로그램명</label>
							<input
								type="text"
								value={programConfig.programName}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, programName: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">구분</label>
							<input
								type="text"
								value={programConfig.category}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, category: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-4">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">시행주기</label>
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="cycle"
										value="주"
										checked={programConfig.cycle === '주'}
										onChange={(e) => setProgramConfig(prev => ({ ...prev, cycle: e.target.value }))}
										className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-blue-900">주</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="cycle"
										value="월"
										checked={programConfig.cycle === '월'}
										onChange={(e) => setProgramConfig(prev => ({ ...prev, cycle: e.target.value }))}
										className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-blue-900">월</span>
								</label>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">시행횟수</label>
							<input
								type="text"
								value={programConfig.executionCount}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, executionCount: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-start gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">비고</label>
							<textarea
								value={programConfig.remarks}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, remarks: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 min-h-[100px]"
								rows={4}
							/>
						</div>
					</div>
					<div className="flex justify-end mt-6">
						<button
							onClick={handleSave}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							저장
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
