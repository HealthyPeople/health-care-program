"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ASSESSMENT_ITEMS,
	EDUCATION_OPTIONS,
	buildOpinionSummary,
	calcTotalScore,
	interpretScore,
	isAutoOpinionSummary,
	type F51015UiSnapshot,
} from './f51015Mapper';

export type CognitiveModalDraft = F51015UiSnapshot;

type Props = {
	mode: 'create' | 'edit';
	beneficiary: string;
	initialDate: string;
	initialValues?: Partial<F51015UiSnapshot> | null;
	onCancel: () => void;
	onConfirm: (draft: CognitiveModalDraft) => void;
};

function emptyAnswers(): Record<string, string> {
	const o: Record<string, string> = {};
	for (const it of ASSESSMENT_ITEMS) o[it.field] = '';
	return o;
}

function answersFromInitial(initial?: Partial<F51015UiSnapshot> | null) {
	const o = emptyAnswers();
	if (!initial) return o;
	for (const it of ASSESSMENT_ITEMS) {
		const v = String((initial as any)[it.field] ?? '').trim();
		o[it.field] = v === '0' || v === '1' ? v : '';
	}
	return o;
}

export default function CognitiveAssessmentModal({
	mode,
	beneficiary,
	initialDate,
	initialValues,
	onCancel,
	onConfirm,
}: Props) {
	const [inspectionDate, setInspectionDate] = useState(
		initialValues?.inspectionDate || initialDate
	);
	const [answers, setAnswers] = useState(() =>
		mode === 'edit' ? answersFromInitial(initialValues) : emptyAnswers()
	);
	const [education, setEducation] = useState(
		mode === 'edit' ? initialValues?.education || '' : ''
	);
	const [opinion, setOpinion] = useState(mode === 'edit' ? initialValues?.opinion || '' : '');
	const [examiner, setExaminer] = useState(mode === 'edit' ? initialValues?.examiner || '' : '');
	const [examinerEmpno, setExaminerEmpno] = useState(
		mode === 'edit' ? initialValues?.examinerEmpno || '' : ''
	);

	const [examinerSuggestions, setExaminerSuggestions] = useState<
		Array<{ EMPNO: string | number; EMPNM: string }>
	>([]);
	const [showExaminerDropdown, setShowExaminerDropdown] = useState(false);
	const [examinerSearchLoading, setExaminerSearchLoading] = useState(false);
	const examinerWrapRef = useRef<HTMLDivElement | null>(null);
	const lastAutoOpinionRef = useRef('');

	const scoreN = useMemo(() => calcTotalScore(answers as any, { requireAll: false }), [answers]);
	const allAnswered = ASSESSMENT_ITEMS.every((it) => answers[it.field] === '0' || answers[it.field] === '1');
	const interpretation = allAnswered ? interpretScore(scoreN) : '';
	const autoOpinion = useMemo(
		() => (allAnswered && interpretation ? buildOpinionSummary(scoreN, interpretation) : ''),
		[allAnswered, scoreN, interpretation]
	);

	useEffect(() => {
		if (!autoOpinion) return;
		setOpinion((prev) => {
			const prevTrim = String(prev ?? '').trim();
			if (!prevTrim || prevTrim === lastAutoOpinionRef.current || isAutoOpinionSummary(prevTrim)) {
				lastAutoOpinionRef.current = autoOpinion;
				return autoOpinion;
			}
			return prev;
		});
	}, [autoOpinion]);

	const setAnswer = (field: string, code: string) => {
		setAnswers((prev) => ({ ...prev, [field]: code }));
	};

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
				list
					.map((e: any) => ({ EMPNO: e.EMPNO, EMPNM: String(e.EMPNM ?? '').trim() }))
					.filter((e: any) => e.EMPNM)
			);
		} catch {
			setExaminerSuggestions([]);
		} finally {
			setExaminerSearchLoading(false);
		}
	}, []);

	useEffect(() => {
		if (String(examinerEmpno ?? '').trim()) {
			setShowExaminerDropdown(false);
			return;
		}
		const t = setTimeout(() => {
			const q = String(examiner ?? '').trim();
			if (q.length >= 1) {
				setShowExaminerDropdown(true);
				void searchExaminerByName(q);
			} else {
				setShowExaminerDropdown(false);
				setExaminerSuggestions([]);
			}
		}, 250);
		return () => clearTimeout(t);
	}, [examiner, examinerEmpno, searchExaminerByName]);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!examinerWrapRef.current?.contains(e.target as Node)) setShowExaminerDropdown(false);
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, []);

	const handleConfirm = () => {
		const missing = ASSESSMENT_ITEMS.filter((it) => answers[it.field] !== '0' && answers[it.field] !== '1');
		if (missing.length > 0) {
			alert(`미선택 문항이 ${missing.length}개 있습니다. 모든 항목을 선택해주세요.`);
			return;
		}
		if (!inspectionDate) {
			alert('사정일자를 입력해주세요.');
			return;
		}
		if (!String(examinerEmpno).trim()) {
			alert('검사자를 직원 검색에서 선택해 주세요.');
			return;
		}
		if (!education) {
			alert('학력을 선택해주세요.');
			return;
		}
		const total = calcTotalScore(answers as any);
		const interp = interpretScore(total);
		onConfirm({
			inspectionDate,
			beneficiary,
			...answers,
			score: String(total),
			interpretation: interp,
			opinion,
			education,
			examiner,
			examinerEmpno,
			inputComplete: false,
		} as CognitiveModalDraft);
	};

	let lastGroup = '';
	let lastNo = -1;

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4">
			<div
				className="flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden bg-white border border-blue-300 rounded-lg shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-label="인지상태평가"
			>
				<div className="flex items-center gap-3 px-4 py-3 border-b border-blue-200 bg-blue-50">
					<div className="flex-1 px-4 py-2 text-base font-bold text-center text-blue-900 bg-white border border-blue-300 rounded">
						인지상태평가
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handleConfirm}
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
						>
							확인
						</button>
						<button
							type="button"
							onClick={onCancel}
							className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200"
						>
							취소
						</button>
					</div>
				</div>

				<div className="flex-1 p-4 overflow-y-auto">
					<div className="flex flex-wrap items-center gap-4 mb-3">
						<div className="flex items-center gap-2">
							<span className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded">
								수급자
							</span>
							<span className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[100px]">
								{beneficiary || '-'}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded">
								사정일자
							</span>
							<input
								type="date"
								value={inspectionDate}
								onChange={(e) => setInspectionDate(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-2">
							<span className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded">
								검사자
							</span>
							<div ref={examinerWrapRef} className="relative min-w-[160px]">
								<input
									type="text"
									value={examiner}
									onChange={(e) => {
										setExaminer(e.target.value);
										setExaminerEmpno('');
									}}
									onFocus={() => {
										if (String(examiner ?? '').trim().length >= 1) setShowExaminerDropdown(true);
									}}
									className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="이름 검색 후 선택"
									autoComplete="off"
								/>
								{showExaminerDropdown ? (
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
														setExaminer(String(emp.EMPNM ?? '').trim());
														setExaminerEmpno(emp.EMPNO != null ? String(emp.EMPNO) : '');
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
							</div>
						</div>
					</div>

					<p className="mb-3 text-sm text-blue-900/80">
						- 치매 선별용 한국어판 간이정신상태검사 (MMSE-DS) · 0=맞음, 1=틀림
					</p>

					<div className="overflow-hidden border border-blue-300 rounded">
						<table className="w-full text-sm border-collapse">
							<tbody>
								{ASSESSMENT_ITEMS.map((it) => {
									const showNo = it.no !== lastNo;
									const showGroupHint = !!it.hint && (it.group !== lastGroup || showNo);
									lastNo = it.no;
									if (it.group) lastGroup = it.group;
									const selected = answers[it.field];
									return (
										<React.Fragment key={it.field}>
											{showGroupHint && it.hint ? (
												<tr className="bg-blue-50/60">
													<td
														colSpan={2}
														className="px-3 py-2 text-xs leading-relaxed text-blue-900 border border-blue-200 whitespace-pre-line"
													>
														{showNo ? <span className="mr-1 font-semibold">{it.no}.</span> : null}
														{it.hint}
													</td>
												</tr>
											) : null}
											<tr
												className={`hover:bg-blue-50/40 ${selected !== '' ? 'bg-blue-50/30' : 'bg-white'}`}
											>
												<td className="px-3 py-2 text-blue-900 border border-blue-200">
													{!it.group && showNo ? (
														<span className="mr-1 font-semibold">{it.no}.</span>
													) : null}
													{it.group && showNo && !it.hint ? (
														<span className="mr-1 font-semibold">{it.no}.</span>
													) : null}
													<span className="whitespace-pre-line">{it.label}</span>
													<span className="ml-2 text-[10px] text-blue-800/60">{it.colId}</span>
												</td>
												<td className="w-[7.5rem] px-2 py-2 text-center border border-blue-200 whitespace-nowrap">
													<label className="inline-flex items-center gap-1 mr-3 cursor-pointer">
														<input
															type="radio"
															name={it.field}
															checked={selected === '0'}
															onChange={() => setAnswer(it.field, '0')}
															className="w-4 h-4 text-blue-600 border-blue-400"
														/>
														<span>0</span>
													</label>
													<label className="inline-flex items-center gap-1 cursor-pointer">
														<input
															type="radio"
															name={it.field}
															checked={selected === '1'}
															onChange={() => setAnswer(it.field, '1')}
															className="w-4 h-4 text-blue-600 border-blue-400"
														/>
														<span>1</span>
													</label>
												</td>
											</tr>
										</React.Fragment>
									);
								})}
							</tbody>
						</table>
					</div>

					<div className="mt-4 space-y-3">
						<div className="flex flex-wrap items-center gap-3 p-3 border border-blue-300 rounded bg-blue-50/50">
							<span className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded">
								총점
							</span>
							<span className="text-lg font-bold text-blue-900 min-w-[4.5rem]">{scoreN} / 30</span>
							<span className="text-sm font-semibold text-blue-800">{interpretation}</span>
						</div>

						<div>
							<div className="mb-2 text-sm font-semibold text-blue-900">인지상태평가 결과요약 · 학력 (E91)</div>
							<div className="grid grid-cols-4 gap-2 overflow-hidden border border-blue-300 rounded">
								{EDUCATION_OPTIONS.map((o) => (
									<label
										key={o.code}
										className={`flex flex-col items-center gap-1 px-2 py-2 text-xs text-center cursor-pointer border-r border-blue-200 last:border-r-0 ${
											education === o.code ? 'bg-blue-100' : 'bg-white hover:bg-blue-50'
										}`}
									>
										<span className="font-medium text-blue-900">{o.label}</span>
										<input
											type="radio"
											name="education"
											checked={education === o.code}
											onChange={() => setEducation(o.code)}
											className="w-4 h-4 text-blue-600 border-blue-400"
										/>
									</label>
								))}
							</div>
						</div>

						<div>
							<div className="mb-1 text-sm font-semibold text-blue-900">의견 (E90)</div>
							<textarea
								value={opinion}
								onChange={(e) => setOpinion(e.target.value)}
								rows={5}
								className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-h-[100px]"
								placeholder="기타 소견을 입력해주세요"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
