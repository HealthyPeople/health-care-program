"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ASSESSMENT_SECTIONS,
	buildOpinionSummary,
	calcTotalScore,
	interpretScore,
	isAutoOpinionSummary,
	type F51014AssessmentField,
	type F51014UiSnapshot,
} from './f51014Mapper';

export type FallAssessmentModalDraft = Pick<
	F51014UiSnapshot,
	| 'inspectionDate'
	| 'beneficiary'
	| 'age'
	| 'mentalState'
	| 'bowel'
	| 'fallExperience'
	| 'activity'
	| 'gaitBalance'
	| 'medication'
	| 'medicationGroup'
	| 'score'
	| 'riskLevel'
	| 'opinion'
	| 'examiner'
	| 'examinerEmpno'
>;

type Props = {
	mode: 'create' | 'edit';
	beneficiary: string;
	initialDate: string;
	initialValues?: Partial<FallAssessmentModalDraft> | null;
	onCancel: () => void;
	onConfirm: (draft: FallAssessmentModalDraft) => void;
};

const EMPTY_CODES: Record<F51014AssessmentField, string> = {
	age: '',
	mentalState: '',
	bowel: '',
	fallExperience: '',
	activity: '',
	gaitBalance: '',
	medication: '',
	medicationGroup: '',
};

function codesFromInitial(initial?: Partial<FallAssessmentModalDraft> | null) {
	if (!initial) return { ...EMPTY_CODES };
	return {
		age: initial.age || '',
		mentalState: initial.mentalState || '',
		bowel: initial.bowel || '',
		fallExperience: initial.fallExperience || '',
		activity: initial.activity || '',
		gaitBalance: initial.gaitBalance || '',
		medication: initial.medication || '',
		medicationGroup: initial.medicationGroup || '',
	};
}

export default function FallRiskAssessmentModal({
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
	const [codes, setCodes] = useState(() =>
		mode === 'edit' ? codesFromInitial(initialValues) : { ...EMPTY_CODES }
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

	const allSelected = ASSESSMENT_SECTIONS.every((s) => !!codes[s.field]);
	const scoreN = useMemo(() => calcTotalScore(codes, { requireAll: false }), [codes]);
	const score = scoreN > 0 || allSelected ? String(scoreN) : '';
	const riskLevel = allSelected ? interpretScore(scoreN) : scoreN > 0 ? interpretScore(scoreN) : '';
	const autoOpinion = useMemo(
		() => (allSelected && riskLevel ? buildOpinionSummary(scoreN, riskLevel) : ''),
		[allSelected, scoreN, riskLevel]
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

	const setField = (field: F51014AssessmentField, code: string) => {
		setCodes((prev) => ({ ...prev, [field]: code }));
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
			if (!examinerWrapRef.current?.contains(e.target as Node)) {
				setShowExaminerDropdown(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, []);

	const handleConfirm = () => {
		const missing = ASSESSMENT_SECTIONS.filter((s) => !codes[s.field]);
		if (missing.length > 0) {
			alert(`다음 항목을 선택해주세요.\n- ${missing.map((m) => m.category).join('\n- ')}`);
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
		const total = calcTotalScore(codes);
		const level = interpretScore(total);
		onConfirm({
			inspectionDate,
			beneficiary,
			...codes,
			medicationGroup: initialValues?.medicationGroup || '0',
			score: String(total),
			riskLevel: level,
			opinion,
			examiner,
			examinerEmpno,
		});
	};

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4">
			<div
				className="flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden bg-white border border-blue-300 rounded-lg shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-label="낙상위험도평가"
			>
				<div className="flex items-center gap-3 px-4 py-3 border-b border-blue-200 bg-blue-50">
					<div className="flex-1 px-4 py-2 text-base font-bold text-center text-blue-900 bg-white border border-blue-300 rounded">
						낙상위험도평가 (Huhn)
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
					<div className="flex flex-wrap items-center gap-4 mb-4">
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

					<div className="overflow-hidden border border-blue-300 rounded">
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="bg-blue-100">
									<th className="w-[18%] px-2 py-2 font-semibold text-center text-blue-900 border border-blue-300">
										분류
									</th>
									<th className="px-2 py-2 font-semibold text-center text-blue-900 border border-blue-300">
										낙상위험요인 평가항목
									</th>
								</tr>
							</thead>
							<tbody>
								{ASSESSMENT_SECTIONS.map((section) => (
									<tr key={section.field} className="bg-white align-top">
										<td className="px-2 py-3 font-semibold text-center text-blue-900 border border-blue-300 bg-blue-50/80 whitespace-pre-line">
											{section.category}
										</td>
										<td className="px-3 py-2 border border-blue-300">
											<div className="flex flex-col gap-1.5">
												{section.options.map((opt) => {
													const selected = codes[section.field] === opt.code;
													return (
														<label
															key={opt.code}
															className={`flex items-start gap-2 px-2 py-1 rounded cursor-pointer hover:bg-blue-50 ${
																selected ? 'bg-blue-50' : ''
															}`}
														>
															<input
																type="radio"
																name={section.field}
																checked={selected}
																onChange={() => setField(section.field, opt.code)}
																className="mt-0.5 w-4 h-4 text-blue-600 border-blue-400 focus:ring-blue-500"
															/>
															<span className="text-sm text-blue-900 leading-snug">
																({opt.code}) {opt.label}
															</span>
														</label>
													);
												})}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="mt-4 space-y-3">
						<div className="flex flex-wrap items-center gap-3 p-3 border border-blue-300 rounded bg-blue-50/50">
							<span className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded">
								점수
							</span>
							<input
								type="text"
								value={score}
								readOnly
								className="w-20 px-2 py-1.5 text-sm text-center border border-blue-300 rounded bg-white"
							/>
							<span className="text-xs text-blue-900/80">
								(위험도 - 낮음(4점이하), 높음(5-10점), 아주높음(11점이상))
							</span>
							<span className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded">
								위험도
							</span>
							<input
								type="text"
								value={riskLevel}
								readOnly
								className="w-28 px-2 py-1.5 text-sm text-center border border-blue-300 rounded bg-white font-semibold"
							/>
						</div>

						<div>
							<div className="mb-1 text-sm font-semibold text-blue-900">□ 낙상위험평가 결과에대한의견</div>
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
