"use client";

import { useState, useEffect } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

export default function LongtermFunctionalCognitive() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loadingDefaults, setLoadingDefaults] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [originalDraft, setOriginalDraft] = useState<Record<string, any> | null>(null);

	// 왼쪽 컬럼 관련 state
	const [physicalCognitiveProgram, setPhysicalCognitiveProgram] = useState(true);
	const [physicalFunctionTraining, setPhysicalFunctionTraining] = useState(true);
	const [cognitiveTraining, setCognitiveTraining] = useState(true);
	const [physicalTherapy, setPhysicalTherapy] = useState(true);
	const [preparerName, setPreparerName] = useState('');

	// 오른쪽 컬럼 관련 state
	const [cognitiveSupport, setCognitiveSupport] = useState(true);
	const [communicationSupport, setCommunicationSupport] = useState(true);
	const [cognitivePreparerName, setCognitivePreparerName] = useState('');

	// 직원 검색 관련 state
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);
	const [cognitivePreparerSearchTerm, setCognitivePreparerSearchTerm] = useState('');
	const [cognitivePreparerSuggestions, setCognitivePreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showCognitivePreparerDropdown, setShowCognitivePreparerDropdown] = useState(false);

	const selectedPnum = String(selectedMember?.PNUM ?? '').trim();

	const buildDraft = () => ({
		FN_MIND_HELP: physicalCognitiveProgram,
		FN_MOVE_HELP: physicalFunctionTraining,
		FN_MIND_TRAIN: cognitiveTraining,
		FN_PHY_HELP: physicalTherapy,
		FN_COGN_HELP: cognitiveSupport,
		// 오른쪽 '의사소통도움...'은 FN_MOVE_HELP로 함께 관리(충돌 방지)
		INEMPNM: preparerName,
		ST_CONF: cognitivePreparerName
	});

	const applyDraft = (d: any) => {
		const yn = (v: any) => {
			const s = String(v ?? '').trim().toLowerCase();
			return s === '1' || s === 'y' || s === 'true';
		};
		setPhysicalCognitiveProgram(yn(d?.FN_MIND_HELP));
		setPhysicalFunctionTraining(yn(d?.FN_MOVE_HELP));
		setCommunicationSupport(yn(d?.FN_MOVE_HELP));
		setCognitiveTraining(yn(d?.FN_MIND_TRAIN));
		setPhysicalTherapy(yn(d?.FN_PHY_HELP));
		setCognitiveSupport(yn(d?.FN_COGN_HELP));
		setPreparerName(String(d?.INEMPNM ?? ''));
		setCognitivePreparerName(String(d?.ST_CONF ?? ''));
	};

	const isDirty = () => {
		if (!originalDraft) return false;
		const cur = buildDraft() as Record<string, any>;
		for (const k of Object.keys(cur)) {
			if (String(cur[k] ?? '') !== String(originalDraft[k] ?? '')) return true;
		}
		return false;
	};

	const fetchDefaults = async (pnum: string) => {
		if (!pnum) return;
		setLoadingDefaults(true);
		try {
			const res = await fetch(`/api/f30112?pnum=${encodeURIComponent(pnum)}`);
			const json = await res.json();
			const row = json?.success && Array.isArray(json.data) ? json.data[0] : null;
			const draft = row
				? {
						FN_MIND_HELP: row.FN_MIND_HELP,
						FN_MOVE_HELP: row.FN_MOVE_HELP,
						FN_MIND_TRAIN: row.FN_MIND_TRAIN,
						FN_PHY_HELP: row.FN_PHY_HELP,
						FN_COGN_HELP: row.FN_COGN_HELP,
						INEMPNM: row.INEMPNM,
						ST_CONF: row.ST_CONF
					}
				: buildDraft();
			applyDraft(draft);
			setOriginalDraft({ ...draft });
			setIsEditing(false);
		} catch (e) {
			console.error('F30112 조회 오류:', e);
			alert('기준정보를 조회하는 중 오류가 발생했습니다.');
		} finally {
			setLoadingDefaults(false);
		}
	};

	const handleSelectMember = async (member: MemberData) => {
		if (isEditing && isDirty()) {
			const ok = confirm('수정한 내용을 저장하지 않으면 적용되지 않습니다. 수급자를 변경하시겠습니까?');
			if (!ok) return;
		}
		setSelectedMember(member);
		await fetchDefaults(String(member?.PNUM ?? '').trim());
	};

	const handleEnterEdit = () => {
		if (!selectedPnum) return alert('수급자를 선택해주세요.');
		setIsEditing(true);
		if (!originalDraft) setOriginalDraft({ ...buildDraft() });
	};

	const handleCancelEdit = () => {
		if (isDirty()) {
			const ok = confirm('수정한 내용은 저장되지 않습니다. 취소하시겠습니까?');
			if (!ok) return;
		}
		if (originalDraft) applyDraft(originalDraft);
		setIsEditing(false);
	};

	const handleSaveEdit = async () => {
		if (!selectedPnum) return alert('수급자를 선택해주세요.');
		try {
			const payload = { pnum: selectedPnum, ...buildDraft() };
			const res = await fetch('/api/f30112', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const json = await res.json().catch(() => ({}));
			if (!json?.success) {
				alert(json?.error || '저장 중 오류가 발생했습니다.');
				return;
			}
			const cur = buildDraft();
			setOriginalDraft({ ...cur });
			setIsEditing(false);
			alert('성공적으로 수정되었습니다.');
		} catch (e) {
			console.error('F30112 저장 오류:', e);
			alert('저장 중 오류가 발생했습니다.');
		}
	};

	// 직원 검색 함수
	const searchEmployee = async (searchTerm: string, setSuggestions: (data: Array<{EMPNO: string; EMPNM: string}>) => void, setShowDropdown: (show: boolean) => void) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setSuggestions([]);
			setShowDropdown(false);
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setSuggestions(result.data);
				setShowDropdown(result.data.length > 0);
			} else {
				setSuggestions([]);
				setShowDropdown(false);
			}
		} catch (err) {
			console.error('직원 검색 오류:', err);
			setSuggestions([]);
			setShowDropdown(false);
		}
	};

	// 직원 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
				searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [preparerSearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (cognitivePreparerSearchTerm && cognitivePreparerSearchTerm.trim() !== '') {
				searchEmployee(cognitivePreparerSearchTerm, setCognitivePreparerSuggestions, setShowCognitivePreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [cognitivePreparerSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowPreparerDropdown(false);
				setShowCognitivePreparerDropdown(false);
			}
		};

		if (showPreparerDropdown || showCognitivePreparerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showPreparerDropdown, showCognitivePreparerDropdown]);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<MemberListPanel onSelectMember={handleSelectMember} />
					</aside>

					{/* 우측: 기능인지 입력 */}
					<section className="flex-1">
						<div className="mb-3 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2">
							<div className="text-sm text-blue-900">
								{selectedMember ? (
									<>
										<span className="font-semibold">{String(selectedMember.P_NM ?? '').trim() || '선택됨'}</span>
										<span className="ml-2 text-blue-900/70">PNUM: {selectedPnum || '-'}</span>
										{loadingDefaults && <span className="ml-2 text-blue-900/70">불러오는 중...</span>}
									</>
								) : (
									<span className="text-blue-900/70">왼쪽에서 수급자를 선택해주세요.</span>
								)}
							</div>
							<div className="flex gap-2">
								{isEditing ? (
									<>
										<button
											type="button"
											onClick={handleSaveEdit}
											disabled={!selectedPnum || loadingDefaults}
											className="px-4 py-1.5 text-sm font-medium text-green-900 bg-green-200 border border-green-400 rounded hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											저장
										</button>
										<button
											type="button"
											onClick={handleCancelEdit}
											className="px-4 py-1.5 text-sm font-medium text-red-900 bg-red-200 border border-red-400 rounded hover:bg-red-300"
										>
											취소
										</button>
									</>
								) : (
									<button
										type="button"
										onClick={handleEnterEdit}
										disabled={!selectedPnum || loadingDefaults}
										className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										수정
									</button>
								)}
							</div>
						</div>
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">기능인지</h2>
							</div>

							<div className="p-4">
								<div className="grid grid-cols-2 gap-4">
									{/* 왼쪽 컬럼 */}
									<div className="space-y-3">
										{/* 신체.인지기능 향상 프로그램 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												신체.인지기능 향상 프로그램
											</label>
											<input
												type="checkbox"
												checked={physicalCognitiveProgram}
												onChange={(e) => setPhysicalCognitiveProgram(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 신체기능.기본동작 일상생활활동작훈련 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												신체기능.기본동작 일상생활활동작훈련
											</label>
											<input
												type="checkbox"
												checked={physicalFunctionTraining}
												onChange={(e) => {
													setPhysicalFunctionTraining(e.target.checked);
													setCommunicationSupport(e.target.checked);
												}}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 인지기능 향상훈련 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지기능 향상훈련
											</label>
											<input
												type="checkbox"
												checked={cognitiveTraining}
												onChange={(e) => setCognitiveTraining(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 물리치료작업 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												물리치료작업
											</label>
											<input
												type="checkbox"
												checked={physicalTherapy}
												onChange={(e) => setPhysicalTherapy(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 작성자성명 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												작성자성명
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={preparerSearchTerm || preparerName}
													onChange={(e) => {
														const value = e.target.value;
														if (!isEditing) return;
														setPreparerName(value);
														setPreparerSearchTerm(value);
														if (!value || value.trim() === '') {
															setPreparerSuggestions([]);
															setShowPreparerDropdown(false);
														}
													}}
													onFocus={() => {
														if (!isEditing) return;
														if (preparerName) {
															setPreparerSearchTerm(preparerName);
														}
														if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
															searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
														}
													}}
													disabled={!isEditing}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="작성자 검색"
												/>
												{showPreparerDropdown && preparerSuggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{preparerSuggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	if (!isEditing) return;
																	setPreparerName(employee.EMPNM);
																	setPreparerSearchTerm(employee.EMPNM);
																	setShowPreparerDropdown(false);
																}}
																className="px-3 py-2 text-sm border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
															>
																{employee.EMPNM}
															</div>
														))}
													</div>
												)}
											</div>
										</div>
									</div>

									{/* 오른쪽 컬럼 */}
									<div className="space-y-3">
										{/* 인지관리 지원 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지관리 지원
											</label>
											<input
												type="checkbox"
												checked={cognitiveSupport}
												onChange={(e) => setCognitiveSupport(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 인지관리-의사소통도 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지관리-의사소통도
											</label>
											<input
												type="checkbox"
												checked={communicationSupport}
												onChange={(e) => {
													setCommunicationSupport(e.target.checked);
													setPhysicalFunctionTraining(e.target.checked);
												}}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>

										{/* 인지관리 작성자성명 */}
										<div className="flex items-center gap-2">
											<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
												인지관리 작성자성명
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={cognitivePreparerSearchTerm || cognitivePreparerName}
													onChange={(e) => {
														const value = e.target.value;
														if (!isEditing) return;
														setCognitivePreparerName(value);
														setCognitivePreparerSearchTerm(value);
														if (!value || value.trim() === '') {
															setCognitivePreparerSuggestions([]);
															setShowCognitivePreparerDropdown(false);
														}
													}}
													onFocus={() => {
														if (!isEditing) return;
														if (cognitivePreparerName) {
															setCognitivePreparerSearchTerm(cognitivePreparerName);
														}
														if (cognitivePreparerSearchTerm && cognitivePreparerSearchTerm.trim() !== '') {
															searchEmployee(cognitivePreparerSearchTerm, setCognitivePreparerSuggestions, setShowCognitivePreparerDropdown);
														}
													}}
													disabled={!isEditing}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="작성자 검색"
												/>
												{showCognitivePreparerDropdown && cognitivePreparerSuggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{cognitivePreparerSuggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	if (!isEditing) return;
																	setCognitivePreparerName(employee.EMPNM);
																	setCognitivePreparerSearchTerm(employee.EMPNM);
																	setShowCognitivePreparerDropdown(false);
																}}
																className="px-3 py-2 text-sm border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
															>
																{employee.EMPNM}
															</div>
														))}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>

							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
