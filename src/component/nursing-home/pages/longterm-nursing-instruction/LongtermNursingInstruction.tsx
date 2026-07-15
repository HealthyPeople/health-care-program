"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

export default function LongtermNursingInstruction() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loadingDefaults, setLoadingDefaults] = useState(false);

	// 생체징후 관련 state
	const [systolicBP, setSystolicBP] = useState('');
	const [diastolicBP, setDiastolicBP] = useState('');
	const [bodyTemperature, setBodyTemperature] = useState('');

	// 건강관리 관련 state
	const [healthHelp, setHealthHelp] = useState<'1' | '0'>('1'); // NS_HLTH_HELP
	const [healthManagementNote, setHealthManagementNote] = useState('');

	// 간호관리 관련 state
	const [nursingHelp, setNursingHelp] = useState<'1' | '0'>('1'); // NS_NRSE_HELP
	const [nursingManagementNote, setNursingManagementNote] = useState('');

	// 기타 관련 state
	const [emergencyService, setEmergencyService] = useState<'1' | '0'>('1');
	const [preparerName, setPreparerName] = useState('');
	const [pressureSoreObservation, setPressureSoreObservation] = useState<'1' | '0'>('1'); // NS_SORE_MNG
	const [soreConfirmer, setSoreConfirmer] = useState('');
	const [abnormalArea, setAbnormalArea] = useState('');

	// 증상 및 관리 관련 state
	const [problemBehavior, setProblemBehavior] = useState<'1' | '0'>('1');
	const [fall, setFall] = useState<'1' | '0'>('0');
	const [dehydration, setDehydration] = useState<'1' | '0'>('1');
	const [pressureSoreManagement, setPressureSoreManagement] = useState<'1' | '0'>('1'); // NS_SORE_CHK
	const [incontinence, setIncontinence] = useState<'1' | '0'>('1');
	const [delirium, setDelirium] = useState<'1' | '0'>('1');
	const [painVAS, setPainVAS] = useState('약');
	const [medicationManagement, setMedicationManagement] = useState<'1' | '0'>('1');
	const [roomNumber, setRoomNumber] = useState('201');

	// 직원 검색 관련 state
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);
	const [soreConfirmerSearchTerm, setSoreConfirmerSearchTerm] = useState('');
	const [soreConfirmerSuggestions, setSoreConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showSoreConfirmerDropdown, setShowSoreConfirmerDropdown] = useState(false);

	// 편집 모드 관련 state
	const [isEditMode, setIsEditMode] = useState(false);
	const [originalData, setOriginalData] = useState<any>(null);

	const selectedPnum = String(selectedMember?.PNUM ?? '').trim();

	const ynToFlag = (v: unknown): '1' | '0' => {
		const s = String(v ?? '').trim().toLowerCase();
		if (s === '1' || s === 'y' || s === 'true') return '1';
		return '0';
	};

	const extraToFlag = (v: unknown): '1' | '0' => {
		if (typeof v === 'boolean') return v ? '1' : '0';
		return ynToFlag(v);
	};

	const buildDraft = () => {
		const soreActive = pressureSoreManagement === '1';
		return {
		NS_SBDP: systolicBP,
		NS_EBDP: diastolicBP,
		NS_TMPBD: bodyTemperature,
		NS_HLTH_HELP: healthHelp,
		NS_NRSE_HELP: nursingHelp,
		NS_HEALTH_HELP_NM: healthManagementNote,
		NS_NURSE_HELP_NM: nursingManagementNote,
		NS_ETC: medicationManagement,
		NS_SORE_CHK: pressureSoreManagement,
		NS_SORE_MNG: soreActive ? pressureSoreObservation : '',
		NS_MEDI_CHK: problemBehavior,
		NS_SORE_MNG_NM: soreActive ? abnormalArea : '',
		NS_WRITE_NAME: preparerName,
		NS_SORE_CONF: soreActive ? soreConfirmer : '',
		ROOM_NO: roomNumber,
		NS_ETC_DESC: JSON.stringify({
			emergencyService,
			fall,
			dehydration,
			incontinence,
			delirium,
			painVAS
		})
	};
	};

	const applyDraft = (d: any) => {
		setSystolicBP(String(d?.NS_SBDP ?? ''));
		setDiastolicBP(String(d?.NS_EBDP ?? ''));
		setBodyTemperature(String(d?.NS_TMPBD ?? ''));
		setHealthHelp(ynToFlag(d?.NS_HLTH_HELP));
		setNursingHelp(ynToFlag(d?.NS_NRSE_HELP));
		setHealthManagementNote(String(d?.NS_HEALTH_HELP_NM ?? ''));
		setNursingManagementNote(String(d?.NS_NURSE_HELP_NM ?? ''));
		setMedicationManagement(ynToFlag(d?.NS_ETC));
		setPressureSoreManagement(ynToFlag(d?.NS_SORE_CHK));
		const soreActive = ynToFlag(d?.NS_SORE_CHK) === '1';
		setPressureSoreObservation(soreActive ? ynToFlag(d?.NS_SORE_MNG) : '0');
		setProblemBehavior(ynToFlag(d?.NS_MEDI_CHK));
		setAbnormalArea(soreActive ? String(d?.NS_SORE_MNG_NM ?? '') : '');
		setPreparerName(String(d?.NS_WRITE_NAME ?? d?.INEMPNM ?? ''));
		setPreparerSearchTerm(String(d?.NS_WRITE_NAME ?? d?.INEMPNM ?? ''));
		setSoreConfirmer(soreActive ? String(d?.NS_SORE_CONF ?? '') : '');
		setSoreConfirmerSearchTerm(soreActive ? String(d?.NS_SORE_CONF ?? '') : '');
		setRoomNumber(String(d?.ROOM_NO ?? ''));
		try {
			const extra = d?.NS_ETC_DESC ? JSON.parse(String(d.NS_ETC_DESC)) : null;
			if (extra && typeof extra === 'object') {
				if (d?.NS_HLTH_HELP == null && extra.healthManagement != null) {
					setHealthHelp(extraToFlag(extra.healthManagement));
				}
				if (d?.NS_NRSE_HELP == null && extra.nursingManagement != null) {
					setNursingHelp(extraToFlag(extra.nursingManagement));
				}
				if (extra.emergencyService != null) setEmergencyService(extraToFlag(extra.emergencyService));
				if (extra.fall != null) setFall(extraToFlag(extra.fall));
				if (extra.dehydration != null) setDehydration(extraToFlag(extra.dehydration));
				if (d?.NS_SORE_CHK == null && extra.pressureSoreManagement != null) {
					setPressureSoreManagement(extraToFlag(extra.pressureSoreManagement));
				}
				if (extra.incontinence != null) setIncontinence(extraToFlag(extra.incontinence));
				if (extra.delirium != null) setDelirium(extraToFlag(extra.delirium));
				if (typeof extra.painVAS === 'string') setPainVAS(extra.painVAS);
			}
		} catch {}
	};

	const isDirty = () => {
		if (!originalData) return false;
		const cur = buildDraft() as Record<string, any>;
		for (const k of Object.keys(cur)) {
			if (String(cur[k] ?? '') !== String(originalData[k] ?? '')) return true;
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
			const soreActiveFromRow = row ? ynToFlag(row.NS_SORE_CHK) === '1' : true;
			const draft = row
				? {
						NS_SBDP: row.NS_SBDP,
						NS_EBDP: row.NS_EBDP,
						NS_TMPBD: row.NS_TMPBD,
						NS_HLTH_HELP: row.NS_HLTH_HELP,
						NS_NRSE_HELP: row.NS_NRSE_HELP,
						NS_HEALTH_HELP_NM: row.NS_HEALTH_HELP_NM,
						NS_NURSE_HELP_NM: row.NS_NURSE_HELP_NM,
						NS_ETC: row.NS_ETC,
						NS_SORE_CHK: row.NS_SORE_CHK,
						NS_SORE_MNG: soreActiveFromRow ? row.NS_SORE_MNG : '',
						NS_MEDI_CHK: row.NS_MEDI_CHK,
						NS_SORE_MNG_NM: soreActiveFromRow ? (row.NS_SORE_MNG_NM ?? '') : '',
						NS_WRITE_NAME: row.NS_WRITE_NAME ?? row.INEMPNM ?? '',
						NS_SORE_CONF: soreActiveFromRow ? (row.NS_SORE_CONF ?? '') : '',
						ROOM_NO: row.ROOM_NO,
						NS_ETC_DESC: row.NS_ETC_DESC
					}
				: buildDraft();
			applyDraft(draft);
			setOriginalData({ ...draft });
			setIsEditMode(false);
		} catch (e) {
			console.error('F30112 조회 오류:', e);
			alert('기준정보를 조회하는 중 오류가 발생했습니다.');
		} finally {
			setLoadingDefaults(false);
		}
	};

	const handleSelectMember = async (member: MemberData) => {
		if (isEditMode && isDirty()) {
			const ok = confirm('수정한 내용을 저장하지 않으면 적용되지 않습니다. 수급자를 변경하시겠습니까?');
			if (!ok) return;
		}
		setSelectedMember(member);
		await fetchDefaults(String(member?.PNUM ?? '').trim());
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

	const handleEdit = () => {
		if (!selectedPnum) {
			alert('수급자를 선택해주세요.');
			return;
		}
		// 원본 데이터 백업
		setOriginalData({ ...buildDraft() });
		setIsEditMode(true);
	};

	const handleCancel = () => {
		if (isDirty()) {
			const ok = confirm('수정한 내용은 저장되지 않습니다. 취소하시겠습니까?');
			if (!ok) return;
		}
		// 원본 데이터로 복원
		if (originalData) {
			applyDraft(originalData);
		}
		setIsEditMode(false);
	};

	const handleSave = async () => {
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
			setOriginalData({ ...cur });
			setIsEditMode(false);
			alert('성공적으로 수정되었습니다.');
		} catch (e) {
			console.error('F30112 저장 오류:', e);
			alert('저장 중 오류가 발생했습니다.');
		}
	};

	const handleDelete = () => {
		if (confirm('정말 삭제하시겠습니까?')) {
			// TODO: API 호출 등 실제 삭제 로직 구현
			alert('간호지시가 삭제되었습니다.');
			// 삭제 후 초기화
			setSystolicBP('');
			setDiastolicBP('');
			setBodyTemperature('');
			setHealthHelp('0');
			setHealthManagementNote('');
			setNursingHelp('0');
			setNursingManagementNote('');
			setEmergencyService('0');
			setPreparerName('');
			setPreparerSearchTerm('');
			setPressureSoreObservation('0');
			setSoreConfirmer('');
			setSoreConfirmerSearchTerm('');
			setAbnormalArea('');
			setProblemBehavior('0');
			setFall('0');
			setDehydration('0');
			setPressureSoreManagement('0');
			setIncontinence('0');
			setDelirium('0');
			setPainVAS('약');
			setMedicationManagement('0');
			setRoomNumber('');
			setIsEditMode(false);
		}
	};

	// 직원 검색 debounce (편집 모드에서만)
	useEffect(() => {
		if (!isEditMode) {
			setShowPreparerDropdown(false);
			return;
		}
		const timer = setTimeout(() => {
			if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
				searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [preparerSearchTerm, isEditMode]);

	useEffect(() => {
		if (!isEditMode) {
			setShowSoreConfirmerDropdown(false);
			return;
		}
		const timer = setTimeout(() => {
			if (soreConfirmerSearchTerm && soreConfirmerSearchTerm.trim() !== '') {
				searchEmployee(soreConfirmerSearchTerm, setSoreConfirmerSuggestions, setShowSoreConfirmerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [soreConfirmerSearchTerm, isEditMode]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowPreparerDropdown(false);
				setShowSoreConfirmerDropdown(false);
			}
		};

		if (showPreparerDropdown || showSoreConfirmerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showPreparerDropdown, showSoreConfirmerDropdown]);

	const fieldLabelClass =
		'shrink-0 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap';

	const renderYnRadios = (
		name: string,
		value: '1' | '0',
		onChange: (next: '1' | '0') => void,
		labels: { yes: string; no: string } = { yes: '실시', no: '미실시' }
	) => (
		<div className="flex items-center gap-3">
			{(['1', '0'] as const).map((flag) => {
				const isChecked = value === flag;
				return (
					<label
						key={flag}
						className={`flex items-center gap-1 shrink-0 ${isEditMode ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
					>
						<input
							type="radio"
							name={name}
							value={flag}
							checked={isChecked}
							onChange={() => isEditMode && onChange(flag)}
							className="w-4 h-4 border border-blue-300 shrink-0 accent-blue-700"
							tabIndex={isEditMode ? 0 : -1}
						/>
						<span
							className={`text-sm whitespace-nowrap ${
								!isEditMode && isChecked ? 'font-semibold text-blue-800' : 'text-blue-900'
							}`}
						>
							{flag === '1' ? labels.yes : labels.no}
						</span>
					</label>
				);
			})}
		</div>
	);

	const yesNoLabels = { yes: '있음', no: '없음' };
	const deliriumLabels = { yes: '의심', no: '없음' };
	const soreObservationLabels = { yes: '이상있음', no: '이상없음' };

	const soreManagementActive = pressureSoreManagement === '1';

	const handlePressureSoreManagementChange = (next: '1' | '0') => {
		setPressureSoreManagement(next);
		if (next === '0') {
			setPressureSoreObservation('0');
			setSoreConfirmer('');
			setSoreConfirmerSearchTerm('');
			setSoreConfirmerSuggestions([]);
			setShowSoreConfirmerDropdown(false);
			setAbnormalArea('');
		}
	};
	const preparerDisplayValue = String(preparerSearchTerm || preparerName || '').trim();
	const soreConfirmerValue = String(soreConfirmerSearchTerm || soreConfirmer || '').trim();
	const readModeTextClass = 'text-sm font-semibold text-blue-800';

	const renderFieldRow = (label: string, labelClassName: string, children: ReactNode) => (
		<div className="flex items-center gap-2">
			<label className={`${labelClassName} ${fieldLabelClass}`}>{label}</label>
			{children}
		</div>
	);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<MemberListPanel onSelectMember={handleSelectMember} />
					</aside>

					{/* 우측: 간호지시 입력 */}
					<section className="flex-1">
						{!selectedMember ? (
							<div className="p-6 text-sm text-blue-900/70 bg-white border border-blue-300 rounded-lg">
								수급자를 선택해주세요.
							</div>
						) : (
							<>
						<div className="mb-3 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2">
							<div className="text-sm text-blue-900">
								<span className="font-semibold">{String(selectedMember.P_NM ?? '').trim() || '선택됨'}</span>
								<span className="ml-2 text-blue-900/70">PNUM: {selectedPnum || '-'}</span>
								{loadingDefaults && <span className="ml-2 text-blue-900/70">불러오는 중...</span>}
							</div>
						</div>
						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">간호지시</h2>
							</div>

							<div className="p-4 space-y-4">
								{/* 생체징후 */}
								<div className="flex items-center gap-2">
									<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										혈압(수축)
									</label>
									<input
										type="number"
										value={systolicBP}
										onChange={(e) => setSystolicBP(e.target.value)}
										disabled={!isEditMode}
										className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
									<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										혈압(이완)
									</label>
									<input
										type="number"
										value={diastolicBP}
										onChange={(e) => setDiastolicBP(e.target.value)}
										disabled={!isEditMode}
										className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
									<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										체온
									</label>
									<input
										type="number"
										step="0.1"
										value={bodyTemperature}
										onChange={(e) => setBodyTemperature(e.target.value)}
										disabled={!isEditMode}
										className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
								</div>

								{/* 건강관리 */}
								<div className="flex items-center gap-6">
									{renderFieldRow('건강관리', 'w-28', renderYnRadios('healthHelp', healthHelp, setHealthHelp))}
									{renderFieldRow('간호관리', 'w-28', renderYnRadios('nursingHelp', nursingHelp, setNursingHelp))}
								{renderFieldRow(
									'기타(응급서비스)',
									'w-32',
									renderYnRadios('emergencyService', emergencyService, setEmergencyService)
								)}
								</div>


								{renderFieldRow(
									'작성자성명',
									'w-28',
									!isEditMode ? (
										<span className={readModeTextClass}>{preparerDisplayValue}</span>
									) : (
									<div className="relative flex-1 employee-dropdown-container">
										<input
											type="text"
											value={preparerSearchTerm || preparerName}
											onChange={(e) => {
												const value = e.target.value;
												setPreparerName(value);
												setPreparerSearchTerm(value);
												if (!value || value.trim() === '') {
													setPreparerSuggestions([]);
													setShowPreparerDropdown(false);
												}
											}}
											onFocus={() => {
												if (preparerName) {
													setPreparerSearchTerm(preparerName);
												}
												if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
													searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
												}
											}}
											className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											placeholder="작성자 검색"
										/>
										{showPreparerDropdown && preparerSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
												{preparerSuggestions.map((employee, index) => (
													<div
														key={`${employee.EMPNO}-${index}`}
														onClick={() => {
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
									)
								)}

								<div className="flex items-center gap-6">
								{renderFieldRow(
									'욕창관리',
									'w-28',
									renderYnRadios(
										'pressureSoreManagement',
										pressureSoreManagement,
										handlePressureSoreManagementChange
									)
								)}

								{soreManagementActive &&
									renderFieldRow(
										'욕창발생관찰',
										'w-28',
										renderYnRadios(
											'pressureSoreObservation',
											pressureSoreObservation,
											setPressureSoreObservation,
											soreObservationLabels
										)
									)}

								{soreManagementActive &&
									renderFieldRow(
										'욕창확인자',
										'w-28',
										!isEditMode ? (
											<span className={readModeTextClass}>{soreConfirmerValue || '없음'}</span>
										) : (
										<div className="relative flex-1 employee-dropdown-container">
											<input
												type="text"
												value={soreConfirmerSearchTerm || soreConfirmer}
												onChange={(e) => {
													const value = e.target.value;
													setSoreConfirmer(value);
													setSoreConfirmerSearchTerm(value);
													if (!value || value.trim() === '') {
														setSoreConfirmerSuggestions([]);
														setShowSoreConfirmerDropdown(false);
													}
												}}
												onFocus={() => {
													if (soreConfirmer) {
														setSoreConfirmerSearchTerm(soreConfirmer);
													}
													if (soreConfirmerSearchTerm && soreConfirmerSearchTerm.trim() !== '') {
														searchEmployee(soreConfirmerSearchTerm, setSoreConfirmerSuggestions, setShowSoreConfirmerDropdown);
													}
												}}
												className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
												placeholder="욕창확인자 검색"
											/>
											{showSoreConfirmerDropdown && soreConfirmerSuggestions.length > 0 && (
												<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
													{soreConfirmerSuggestions.map((employee, index) => (
														<div
															key={`${employee.EMPNO}-${index}`}
															onClick={() => {
																setSoreConfirmer(employee.EMPNM);
																setSoreConfirmerSearchTerm(employee.EMPNM);
																setShowSoreConfirmerDropdown(false);
															}}
															className="px-3 py-2 text-sm border-b border-blue-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
														>
															{employee.EMPNM}
														</div>
													))}
												</div>
											)}
										</div>
										)
									)}
								</div>

							

								{soreManagementActive && (
								<div className="space-y-2">
									<label className="block px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded w-fit">
										이상부위 및 피부상태
									</label>
									<textarea
										value={abnormalArea}
										onChange={(e) => setAbnormalArea(e.target.value)}
										disabled={!isEditMode}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded min-h-[100px]"
										placeholder="이상부위 및 피부상태를 입력하세요"
									/>
								</div>
								)}

								{/* 증상 및 관리 */}
								<div className="pt-2 space-y-3 border-t border-blue-200 ">
									<div className="flex items-center gap-6">
										{renderFieldRow('문제행동', 'w-28', renderYnRadios('problemBehavior', problemBehavior, setProblemBehavior, yesNoLabels))}
										{renderFieldRow('낙상', 'w-28', renderYnRadios('fall', fall, setFall, yesNoLabels))}
										{renderFieldRow('탈수', 'w-28', renderYnRadios('dehydration', dehydration, setDehydration, yesNoLabels))}
									</div>
									<div className="flex items-center gap-6">
										{renderFieldRow('소변/대변실금', 'w-32', renderYnRadios('incontinence', incontinence, setIncontinence, yesNoLabels))}
										{renderFieldRow('섬망', 'w-28', renderYnRadios('delirium', delirium, setDelirium, deliriumLabels))}
										{renderFieldRow(
												'통증(VAS)',
												'w-28',
												<div className="flex items-center gap-3">
													{(['약', '중', '강'] as const).map((level) => {
														const isChecked = painVAS === level;
														return (
															<label
																key={level}
																className={`flex items-center gap-1 shrink-0 ${isEditMode ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
															>
																<input
																	type="radio"
																	name="painVAS"
																	value={level}
																	checked={isChecked}
																	onChange={() => isEditMode && setPainVAS(level)}
																	className="w-4 h-4 border border-blue-300 shrink-0 accent-blue-700"
																	tabIndex={isEditMode ? 0 : -1}
																/>
																<span
																	className={`text-sm whitespace-nowrap ${
																		!isEditMode && isChecked ? 'font-semibold text-blue-800' : 'text-blue-900'
																	}`}
																>
																	{level}
																</span>
															</label>
														);
													})}
												</div>
											)}
									</div>
									<div className="flex items-center gap-6">

									
										{renderFieldRow(
											'투약관리',
											'w-28',
											renderYnRadios('medicationManagement', medicationManagement, setMedicationManagement)
										)}
										{renderFieldRow(
											'침실호수',
											'w-28',
											<input
												type="text"
												value={roomNumber}
												onChange={(e) => setRoomNumber(e.target.value)}
												disabled={!isEditMode}
												className="w-32 px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
											/>
										)}
									</div>
								</div>

								{/* 버튼 영역 */}
								<div className="pt-4">
									{isEditMode ? (
										<div className="flex justify-end gap-2">
											<button
												onClick={handleCancel}
												className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
											>
												취소
											</button>
											<button
												onClick={handleDelete}
												className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded hover:bg-red-700"
											>
												삭제
											</button>
											<button
												onClick={handleSave}
												className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
											>
												저장
											</button>
										</div>
									) : (
										<button
											onClick={handleEdit}
											className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
										>
											수정 및 삭제
										</button>
									)}
								</div>
							</div>
						</div>
							</>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}

