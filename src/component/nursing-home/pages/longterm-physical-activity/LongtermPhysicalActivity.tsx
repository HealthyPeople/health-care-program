"use client";

import { useState, useEffect } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';
import { BATH_METH_TO_LABEL, resolveBathMethodFromRow } from '../../utils/physicalActivityFields';

interface MemberData {
	[key: string]: any;
}

export default function LongtermPhysicalActivity() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loadingDefaults, setLoadingDefaults] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [originalDraft, setOriginalDraft] = useState<Record<string, any> | null>(null);

	const WEEKDAY_CODE_TO_LABEL: Record<string, string> = {
		'1': '일요일',
		'2': '월요일',
		'3': '화요일',
		'4': '수요일',
		'5': '목요일',
		'6': '금요일',
		'7': '토요일'
	};

	const MEAL_VAL_TO_LABEL: Record<string, string> = {
		'1': '1',
		'2': '1/2이상',
		'3': '1/2미만'
	};
	const MEAL_LABEL_TO_VAL: Record<string, string> = {
		'1': '1',
		'1/2이상': '2',
		'1/2미만': '3'
	};

	const MEAL_KIND_TO_LABEL: Record<string, string> = {
		'1': '일반식',
		'2': '죽',
		'3': '유동식(미음)'
	};
	const MEAL_KIND_LABEL_TO_CODE: Record<string, string> = {
		'일반식': '1',
		'죽': '2',
		'유동식(미음)': '3',
		'경관식': '3',
		'일반식(당뇨)': '1',
		'일반식(저염식)': '1',
		'다진식': '2'
	};
	const LEGACY_MEAL_KIND_CODE: Record<string, '1' | '2' | '3'> = {
		'4': '3',
		'5': '1',
		'6': '1',
		'7': '2'
	};

	// 식사 정보 관련 state
	const [mealType, setMealType] = useState<'1' | '2' | '3'>('1'); // PH_MEAL_KIND
	const [mealIntake, setMealIntake] = useState('1');
	const [mealClassification, setMealClassification] = useState(''); // 식사구분 (ST_KIND)
	const [mealLocation, setMealLocation] = useState('지층 생활실');
	const [mealConfirmer, setMealConfirmer] = useState('');

	// 목욕 정보 관련 state
	const [bathMethod, setBathMethod] = useState<'1' | '2' | '3'>('2');
	const [bathTimeRequired, setBathTimeRequired] = useState('40');
	const [bathTime, setBathTime] = useState('');
	const [bathDay1, setBathDay1] = useState('2 월요일');
	const [bathProvider1, setBathProvider1] = useState('');
	const [bathDay2, setBathDay2] = useState('5 목요일');
	const [bathProvider2, setBathProvider2] = useState('');

	// 신체활동 관련 state
	const [faceWashing, setFaceWashing] = useState(true);
	const [grooming, setGrooming] = useState(true);
	const [movementAssistance, setMovementAssistance] = useState(true);
	const [positionChange, setPositionChange] = useState(true);
	const [walkAccompany, setWalkAccompany] = useState(true);
	const [toiletUsage, setToiletUsage] = useState('');
	const [outingAccompany, setOutingAccompany] = useState(true);
	const [preparerName, setPreparerName] = useState('');

	// 직원 검색 관련 state
	const [mealConfirmerSearchTerm, setMealConfirmerSearchTerm] = useState('');
	const [mealConfirmerSuggestions, setMealConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showMealConfirmerDropdown, setShowMealConfirmerDropdown] = useState(false);
	const [bathProvider1SearchTerm, setBathProvider1SearchTerm] = useState('');
	const [bathProvider1Suggestions, setBathProvider1Suggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showBathProvider1Dropdown, setShowBathProvider1Dropdown] = useState(false);
	const [bathProvider2SearchTerm, setBathProvider2SearchTerm] = useState('');
	const [bathProvider2Suggestions, setBathProvider2Suggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showBathProvider2Dropdown, setShowBathProvider2Dropdown] = useState(false);
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);

	const selectedPnum = String(selectedMember?.PNUM ?? '').trim();

	const buildDraft = () => ({
		// 식사
		ST_KIND: mealClassification,
		PH_MEAL_KIND: mealType,
		PH_MEAL_KIND_NM: MEAL_KIND_TO_LABEL[mealType] ?? '',
		PH_MEAL_VAL: MEAL_LABEL_TO_VAL[mealIntake] ?? '',
		PH_MEAL_VAL_NM: mealIntake,
		PH_MEAL_WT_NM: '',
		ST_PLAC: mealLocation,
		ST_CONF: mealConfirmer,
		// 목욕
		PH_BATH_METH: bathMethod,
		PH_BATH_METH_NM: BATH_METH_TO_LABEL[bathMethod] ?? '',
		PH_BATH_TM: bathTimeRequired,
		BATH_SPV_TM: bathTime,
		PH_BATH_WK1: String(bathDay1 || '').trim().split(/\s+/)[0] || '',
		BATH_EMPNM01: bathProvider1,
		PH_BATH_WK2: String(bathDay2 || '').trim().split(/\s+/)[0] || '',
		BATH_EMPNM02: bathProvider2,
		// 신체활동
		PH_HEAD_HELP: faceWashing || grooming,
		PH_MOVE_HELP: movementAssistance,
		PH_CHANG_HELP: positionChange,
		PH_WORK_HELP: walkAccompany,
		PH_OUT_HELP: outingAccompany,
		PH_TOL_CNT: toiletUsage,
		// 작성자
		PH_WRITE_NAME: preparerName
	});

	const isDirty = () => {
		if (!originalDraft) return false;
		const cur = buildDraft() as Record<string, any>;
		const keys = Object.keys(cur);
		for (const k of keys) {
			if (String(cur[k] ?? '') !== String(originalDraft[k] ?? '')) return true;
		}
		return false;
	};

	const applyDraft = (d: any) => {
		const toWeekdayOption = (codeOrLabel: any, fallback: string) => {
			const s = String(codeOrLabel ?? '').trim();
			if (/^[1-7]$/.test(s)) return `${s} ${WEEKDAY_CODE_TO_LABEL[s] || ''}`.trim();
			// 이미 "2 월요일" 형태면 그대로
			if (/^[1-7]\s+/.test(s)) return s;
			return fallback;
		};
		{
			const code = String(d?.PH_MEAL_KIND ?? '').trim();
			const label = String(d?.PH_MEAL_KIND_NM ?? '').trim();
			if (code && MEAL_KIND_TO_LABEL[code]) {
				setMealType(code as '1' | '2' | '3');
			} else if (code && LEGACY_MEAL_KIND_CODE[code]) {
				setMealType(LEGACY_MEAL_KIND_CODE[code]);
			} else if (label && MEAL_KIND_LABEL_TO_CODE[label]) {
				setMealType(MEAL_KIND_LABEL_TO_CODE[label] as '1' | '2' | '3');
			}
		}
		{
			const v = String(d?.PH_MEAL_VAL ?? '').trim();
			if (v && MEAL_VAL_TO_LABEL[v]) setMealIntake(MEAL_VAL_TO_LABEL[v]);
			else setMealIntake(String(d?.PH_MEAL_VAL_NM ?? mealIntake));
		}
		setMealClassification(String(d?.ST_KIND ?? mealClassification));
		setMealLocation(String(d?.ST_PLAC ?? mealLocation));
		const mealConfirmerValue = String(d?.ST_CONF ?? '').trim();
		setMealConfirmer(mealConfirmerValue);
		setMealConfirmerSearchTerm(mealConfirmerValue);

		{
			const resolved = resolveBathMethodFromRow(d);
			if (resolved) setBathMethod(resolved);
		}
		setBathTimeRequired(String(d?.PH_BATH_TM ?? bathTimeRequired));
		setBathTime(String(d?.BATH_SPV_TM ?? bathTime));
		setBathDay1(toWeekdayOption(d?.PH_BATH_WK1, bathDay1));
		setBathProvider1(String(d?.BATH_EMPNM01 ?? bathProvider1));
		setBathDay2(toWeekdayOption(d?.PH_BATH_WK2, bathDay2));
		setBathProvider2(String(d?.BATH_EMPNM02 ?? bathProvider2));

		const yn = (v: any) => {
			const s = String(v ?? '').trim().toLowerCase();
			return s === '1' || s === 'y' || s === 'true';
		};
		const head = yn(d?.PH_HEAD_HELP);
		setFaceWashing(head);
		setGrooming(head);
		setMovementAssistance(yn(d?.PH_MOVE_HELP));
		setPositionChange(yn(d?.PH_CHANG_HELP));
		setWalkAccompany(yn(d?.PH_WORK_HELP));
		setOutingAccompany(yn(d?.PH_OUT_HELP));
		setToiletUsage(String(d?.PH_TOL_CNT ?? ''));

		setPreparerName(String(d?.PH_WRITE_NAME ?? d?.INEMPNM ?? ''));
	};

	const fetchDefaults = async (pnum: string) => {
		if (!pnum) return;
		setLoadingDefaults(true);
		try {
			const res = await fetch(`/api/f30112?pnum=${encodeURIComponent(pnum)}`);
			const json = await res.json();
			const row = json?.success && Array.isArray(json.data) ? json.data[0] : null;
			const draft = row ? {
				ST_KIND: row.ST_KIND ?? '',
				PH_MEAL_KIND: row.PH_MEAL_KIND ?? '',
				PH_MEAL_KIND_NM: row.PH_MEAL_KIND_NM ?? '',
				PH_MEAL_VAL: row.PH_MEAL_VAL ?? '',
				PH_MEAL_VAL_NM: row.PH_MEAL_VAL_NM ?? '',
				PH_MEAL_WT_NM: row.PH_MEAL_WT_NM ?? '',
				ST_PLAC: row.ST_PLAC ?? '',
				ST_CONF: row.ST_CONF ?? '',
				PH_BATH_METH: row.PH_BATH_METH ?? '',
				PH_BATH_METH_NM: row.PH_BATH_METH_NM ?? row.PH_BATH_METH ?? '',
				PH_BATH_TM: row.PH_BATH_TM ?? '',
				BATH_SPV_TM: row.BATH_SPV_TM ?? '',
				PH_BATH_WK1: row.PH_BATH_WK1 ?? '',
				BATH_EMPNM01: row.BATH_EMPNM01 ?? '',
				PH_BATH_WK2: row.PH_BATH_WK2 ?? '',
				BATH_EMPNM02: row.BATH_EMPNM02 ?? '',
				PH_HEAD_HELP: row.PH_HEAD_HELP ?? '',
				PH_MOVE_HELP: row.PH_MOVE_HELP ?? '',
				PH_CHANG_HELP: row.PH_CHANG_HELP ?? '',
				PH_WORK_HELP: row.PH_WORK_HELP ?? '',
				PH_OUT_HELP: row.PH_OUT_HELP ?? '',
				PH_TOL_CNT: row.PH_TOL_CNT ?? '',
				PH_WRITE_NAME: row.PH_WRITE_NAME ?? row.INEMPNM ?? '',
			} : buildDraft();

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
		const pnum = String(member?.PNUM ?? '').trim();
		await fetchDefaults(pnum);
	};

	const handleEnterEdit = () => {
		if (!selectedPnum) {
			alert('수급자를 선택해주세요.');
			return;
		}
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
		if (!selectedPnum) {
			alert('수급자를 선택해주세요.');
			return;
		}
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

	// 직원 검색 debounce (편집 모드에서만)
	useEffect(() => {
		if (!isEditing) {
			setShowMealConfirmerDropdown(false);
			return;
		}
		const timer = setTimeout(() => {
			if (mealConfirmerSearchTerm && mealConfirmerSearchTerm.trim() !== '') {
				searchEmployee(mealConfirmerSearchTerm, setMealConfirmerSuggestions, setShowMealConfirmerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [mealConfirmerSearchTerm, isEditing]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (bathProvider1SearchTerm && bathProvider1SearchTerm.trim() !== '') {
				searchEmployee(bathProvider1SearchTerm, setBathProvider1Suggestions, setShowBathProvider1Dropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [bathProvider1SearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (bathProvider2SearchTerm && bathProvider2SearchTerm.trim() !== '') {
				searchEmployee(bathProvider2SearchTerm, setBathProvider2Suggestions, setShowBathProvider2Dropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [bathProvider2SearchTerm]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
				searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [preparerSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowMealConfirmerDropdown(false);
				setShowBathProvider1Dropdown(false);
				setShowBathProvider2Dropdown(false);
				setShowPreparerDropdown(false);
			}
		};

		if (showMealConfirmerDropdown || showBathProvider1Dropdown || showBathProvider2Dropdown || showPreparerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showMealConfirmerDropdown, showBathProvider1Dropdown, showBathProvider2Dropdown, showPreparerDropdown]);

	const weekDays = [
		'1 일요일', '2 월요일', '3 화요일', '4 수요일', 
		'5 목요일', '6 금요일', '7 토요일'
	];

	const mealIntakeOptions = ['1', '1/2이상', '1/2미만'] as const;

	const selectClass = isEditing
		? 'flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded'
		: 'flex-1 px-2 py-1 text-sm border border-blue-300 rounded pointer-events-none text-blue-800 font-semibold bg-blue-50';

	const readLabelClass = (active: boolean) =>
		`text-sm ${!isEditing && active ? 'font-semibold text-blue-800' : 'text-blue-900'}`;

	const radioInputClass = 'w-4 h-4 border border-blue-300 shrink-0 accent-blue-700';
	const checkboxInputClass = 'w-4 h-4 border border-blue-300 rounded shrink-0 accent-blue-700';
	const mealConfirmerDisplayValue = String(mealConfirmerSearchTerm || mealConfirmer || '').trim();
	const readModeTextClass = 'text-sm font-semibold text-blue-800';

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<MemberListPanel onSelectMember={handleSelectMember} />
					</aside>

					{/* 우측: 신체활동 입력 */}
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
											className="px-4 py-1.5 text-sm font-medium text-green-900 bg-green-200 border border-green-400 rounded hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
											disabled={!selectedPnum || loadingDefaults}
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
										className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
										disabled={!selectedPnum || loadingDefaults}
									>
										수정
									</button>
								)}
							</div>
						</div>
						{selectedMember ? (
						<div className="grid grid-cols-2 gap-4">
							{/* 좌측: 식사 정보, 목욕 정보 */}
							<div className="space-y-4">
								{/* 식사 정보 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h3 className="text-lg font-semibold text-blue-900">식사 정보</h3>
									</div>
									<div className="p-4 space-y-3">
										{/* 식사종류 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사종류
											</label>
											<select
												value={mealType}
												onChange={(e) => setMealType(e.target.value as '1' | '2' | '3')}
												className={selectClass}
												tabIndex={isEditing ? 0 : -1}
											>
												<option value="1">일반식</option>
												<option value="2">죽</option>
												<option value="3">유동식(미음)</option>
											</select>
										</div>
										{/* 식사섭취량 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사섭취량
											</label>
											<div className="flex items-center gap-3">
												{mealIntakeOptions.map((option) => {
													const isChecked = mealIntake === option;
													return (
														<label
															key={option}
															className={`flex items-center gap-1 shrink-0 ${isEditing ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
														>
															<input
																type="radio"
																name="mealIntake"
																value={option}
																checked={isChecked}
																onChange={(e) => isEditing && setMealIntake(e.target.value)}
																className={radioInputClass}
																tabIndex={isEditing ? 0 : -1}
															/>
															<span className={readLabelClass(isChecked)}>{option}</span>
														</label>
													);
												})}
											</div>
										</div>
										{/* 식사구분 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사구분
											</label>
											<input
												type="text"
												value={mealClassification}
												onChange={(e) => setMealClassification(e.target.value)}
												disabled={!isEditing}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
												placeholder="ST_KIND"
											/>
										</div>
										{/* 식사장소 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												식사장소
											</label>
											<input
												type="text"
												value={mealLocation}
												onChange={(e) => setMealLocation(e.target.value)}
												disabled={!isEditing}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 확인자 (ST_CONF) */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												확인자
											</label>
											{!isEditing ? (
												<span className={readModeTextClass}>{mealConfirmerDisplayValue || '없음'}</span>
											) : (
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={mealConfirmerSearchTerm || mealConfirmer}
													onChange={(e) => {
														const value = e.target.value;
														setMealConfirmer(value);
														setMealConfirmerSearchTerm(value);
														if (!value || value.trim() === '') {
															setMealConfirmerSuggestions([]);
															setShowMealConfirmerDropdown(false);
														}
													}}
													onFocus={() => {
														if (mealConfirmer) {
															setMealConfirmerSearchTerm(mealConfirmer);
														}
														if (mealConfirmerSearchTerm && mealConfirmerSearchTerm.trim() !== '') {
															searchEmployee(mealConfirmerSearchTerm, setMealConfirmerSuggestions, setShowMealConfirmerDropdown);
														}
													}}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="확인자 검색"
												/>
												{showMealConfirmerDropdown && mealConfirmerSuggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{mealConfirmerSuggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	setMealConfirmer(employee.EMPNM);
																	setMealConfirmerSearchTerm(employee.EMPNM);
																	setShowMealConfirmerDropdown(false);
																}}
																className="px-3 py-2 text-sm border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
															>
																{employee.EMPNM}
															</div>
														))}
													</div>
												)}
											</div>
											)}
										</div>
									</div>
								</div>

								{/* 목욕 정보 */}
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h3 className="text-lg font-semibold text-blue-900">목욕 정보</h3>
									</div>
									<div className="p-4 space-y-3">
										{/* 목욕방법 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕방법
											</label>
											<select
												value={bathMethod}
												onChange={(e) => setBathMethod(e.target.value as '1' | '2' | '3')}
												className={selectClass}
												tabIndex={isEditing ? 0 : -1}
											>
												<option value="1">전신입욕</option>
												<option value="2">샤워식</option>
												<option value="3">침상목욕</option>
											</select>
										</div>
										{/* 소요시간(분) */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												소요시간(분)
											</label>
											<input
												type="number"
												value={bathTimeRequired}
												onChange={(e) => setBathTimeRequired(e.target.value)}
												disabled={!isEditing}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 목욕시간 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕시간
											</label>
											<input
												type="time"
												value={bathTime}
												onChange={(e) => setBathTime(e.target.value)}
												disabled={!isEditing}
												className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										{/* 목욕요일1 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕요일1
											</label>
											<select
												value={bathDay1}
												onChange={(e) => setBathDay1(e.target.value)}
												className={selectClass}
												tabIndex={isEditing ? 0 : -1}
											>
												{weekDays.map(day => (
													<option key={day} value={day}>{day}</option>
												))}
											</select>
										</div>
										{/* 제공자1 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												제공자1
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<input
													type="text"
													value={bathProvider1SearchTerm || bathProvider1}
													onChange={(e) => {
														const value = e.target.value;
														if (!isEditing) return;
														setBathProvider1(value);
														setBathProvider1SearchTerm(value);
														if (!value || value.trim() === '') {
															setBathProvider1Suggestions([]);
															setShowBathProvider1Dropdown(false);
														}
													}}
													onFocus={() => {
														if (!isEditing) return;
														if (bathProvider1) {
															setBathProvider1SearchTerm(bathProvider1);
														}
													}}
													disabled={!isEditing}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="제공자 검색"
												/>
												{showBathProvider1Dropdown && bathProvider1Suggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{bathProvider1Suggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	if (!isEditing) return;
																	setBathProvider1(employee.EMPNM);
																	setBathProvider1SearchTerm(employee.EMPNM);
																	setShowBathProvider1Dropdown(false);
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
										{/* 목욕요일2 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												목욕요일2
											</label>
											<select
												value={bathDay2}
												onChange={(e) => setBathDay2(e.target.value)}
												className={selectClass}
												tabIndex={isEditing ? 0 : -1}
											>
												{weekDays.map(day => (
													<option key={day} value={day}>{day}</option>
												))}
											</select>
										</div>
										{/* 제공자2 */}
										<div className="flex items-center gap-2">
											<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
												제공자2
											</label>
											<div className="relative flex-1 employee-dropdown-container">
												<div className="flex gap-2">
													<input
														type="text"
														value={bathProvider2SearchTerm || bathProvider2}
														onChange={(e) => {
															const value = e.target.value;
															if (!isEditing) return;
															setBathProvider2(value);
															setBathProvider2SearchTerm(value);
															if (!value || value.trim() === '') {
																setBathProvider2Suggestions([]);
																setShowBathProvider2Dropdown(false);
															}
														}}
														onFocus={() => {
															if (!isEditing) return;
															if (bathProvider2) {
																setBathProvider2SearchTerm(bathProvider2);
															}
														}}
														disabled={!isEditing}
														className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
														placeholder="제공자 검색"
													/>
													<button
														onClick={() => {
															if (!isEditing) return;
															setBathProvider2('');
															setBathProvider2SearchTerm('');
														}}
														className="px-3 py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
													>
														지움
													</button>
												</div>
												{showBathProvider2Dropdown && bathProvider2Suggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{bathProvider2Suggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
																	if (!isEditing) return;
																	setBathProvider2(employee.EMPNM);
																	setBathProvider2SearchTerm(employee.EMPNM);
																	setShowBathProvider2Dropdown(false);
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

							{/* 우측: 신체활동 체크박스 */}
							<div className="space-y-4">
								<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
									<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
										<h3 className="text-lg font-semibold text-blue-900">신체활동</h3>
									</div>
									<div className="p-4 space-y-3">
										{/* 신체활동 체크박스들 */}
										<div className={`flex items-center gap-2 ${!isEditing ? 'pointer-events-none' : ''}`}>
											<input
												type="checkbox"
												checked={faceWashing}
												onChange={(e) => isEditing && setFaceWashing(e.target.checked)}
												className={checkboxInputClass}
												tabIndex={isEditing ? 0 : -1}
											/>
											<label className={readLabelClass(faceWashing)}>세면, 구강, 머리감기</label>
											{/* <span className="text-sm text-blue-900/70">실시</span> */}
										</div>
										<div className={`flex items-center gap-2 ${!isEditing ? 'pointer-events-none' : ''}`}>
											<input
												type="checkbox"
												checked={grooming}
												onChange={(e) => isEditing && setGrooming(e.target.checked)}
												className={checkboxInputClass}
												tabIndex={isEditing ? 0 : -1}
											/>
											<label className={readLabelClass(grooming)}>몸단장, 옷갈아입히기</label>
											{/* <span className="text-sm text-blue-900/70">실시</span> */}
										</div>
										<div className={`flex items-center gap-2 ${!isEditing ? 'pointer-events-none' : ''}`}>
											<input
												type="checkbox"
												checked={movementAssistance}
												onChange={(e) => isEditing && setMovementAssistance(e.target.checked)}
												className={checkboxInputClass}
												tabIndex={isEditing ? 0 : -1}
											/>
											<label className={readLabelClass(movementAssistance)}>이동도움 및 신체 기능유지. 증진</label>
											{/* <span className="text-sm text-blue-900/70">실시</span> */}
										</div>
										<div className={`flex items-center gap-2 ${!isEditing ? 'pointer-events-none' : ''}`}>
											<input
												type="checkbox"
												checked={positionChange}
												onChange={(e) => isEditing && setPositionChange(e.target.checked)}
												className={checkboxInputClass}
												tabIndex={isEditing ? 0 : -1}
											/>
											<label className={readLabelClass(positionChange)}>체위변경(2시간마다)</label>
											{/* <span className="text-sm text-blue-900/70">실시</span> */}
										</div>
										<div className={`flex items-center gap-2 ${!isEditing ? 'pointer-events-none' : ''}`}>
											<input
												type="checkbox"
												checked={walkAccompany}
												onChange={(e) => isEditing && setWalkAccompany(e.target.checked)}
												className={checkboxInputClass}
												tabIndex={isEditing ? 0 : -1}
											/>
											<label className={readLabelClass(walkAccompany)}>산책동행</label>
											{/* <span className="text-sm text-blue-900/70">실시</span> */}
										</div>
										{/* 화장실이용하기 */}
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">화장실이용하기 (기저귀교환) - 회</label>
											<input
												type="number"
												value={toiletUsage}
												onChange={(e) => setToiletUsage(e.target.value)}
												disabled={!isEditing}
												className="w-20 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											/>
										</div>
										<div className={`flex items-center gap-2 ${!isEditing ? 'pointer-events-none' : ''}`}>
											<input
												type="checkbox"
												checked={outingAccompany}
												onChange={(e) => isEditing && setOutingAccompany(e.target.checked)}
												className={checkboxInputClass}
												tabIndex={isEditing ? 0 : -1}
											/>
											<label className={readLabelClass(outingAccompany)}>외출동행</label>
											{/* <span className="text-sm text-blue-900/70">실시</span> */}
										</div>
										{/* 작성자성명 */}
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">작성자성명</label>
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
								</div>
							</div>
						</div>
						) : (
							<div className="rounded border border-blue-200 bg-white p-8 text-center text-blue-900/70">
								왼쪽에서 수급자를 선택하면 내용을 확인/수정할 수 있습니다.
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}

