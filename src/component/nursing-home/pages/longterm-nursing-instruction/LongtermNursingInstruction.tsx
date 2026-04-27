"use client";

import { useState, useEffect } from 'react';
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
	const [healthManagement, setHealthManagement] = useState(true);
	const [healthManagementNote, setHealthManagementNote] = useState('');

	// 간호관리 관련 state
	const [nursingManagement, setNursingManagement] = useState(true);
	const [nursingManagementNote, setNursingManagementNote] = useState('');

	// 기타 관련 state
	const [emergencyService, setEmergencyService] = useState(true);
	const [preparerName, setPreparerName] = useState('');
	const [pressureSoreObservation, setPressureSoreObservation] = useState(true);
	const [confirmer, setConfirmer] = useState('');
	const [abnormalArea, setAbnormalArea] = useState('');

	// 증상 및 관리 관련 state
	const [problemBehavior, setProblemBehavior] = useState(true);
	const [fall, setFall] = useState(false);
	const [dehydration, setDehydration] = useState(true);
	const [pressureSoreManagement, setPressureSoreManagement] = useState(true);
	const [incontinence, setIncontinence] = useState(true);
	const [delirium, setDelirium] = useState(true);
	const [painVAS, setPainVAS] = useState('약');
	const [medicationManagement, setMedicationManagement] = useState(true);
	const [roomNumber, setRoomNumber] = useState('201');

	// 직원 검색 관련 state
	const [preparerSearchTerm, setPreparerSearchTerm] = useState('');
	const [preparerSuggestions, setPreparerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showPreparerDropdown, setShowPreparerDropdown] = useState(false);
	const [confirmerSearchTerm, setConfirmerSearchTerm] = useState('');
	const [confirmerSuggestions, setConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showConfirmerDropdown, setShowConfirmerDropdown] = useState(false);

	// 편집 모드 관련 state
	const [isEditMode, setIsEditMode] = useState(false);
	const [originalData, setOriginalData] = useState<any>(null);

	const selectedPnum = String(selectedMember?.PNUM ?? '').trim();

	const buildDraft = () => ({
		NS_SBDP: systolicBP,
		NS_EBDP: diastolicBP,
		NS_TMPBD: bodyTemperature,
		NS_HEALTH_HELP_NM: healthManagementNote,
		NS_NURSE_HELP_NM: nursingManagementNote,
		NS_ETC: medicationManagement,
		NS_SORE_CHK: pressureSoreObservation,
		NS_MEDI_CHK: problemBehavior,
		NS_SORE_MNG_NM: abnormalArea,
		INEMPNM: preparerName,
		ST_CONF: confirmer,
		ROOM_NO: roomNumber,
		NS_ETC_DESC: JSON.stringify({
			healthManagement,
			nursingManagement,
			emergencyService,
			fall,
			dehydration,
			pressureSoreManagement,
			incontinence,
			delirium,
			painVAS
		})
	});

	const applyDraft = (d: any) => {
		const yn = (v: any) => {
			const s = String(v ?? '').trim().toLowerCase();
			return s === '1' || s === 'y' || s === 'true';
		};
		setSystolicBP(String(d?.NS_SBDP ?? ''));
		setDiastolicBP(String(d?.NS_EBDP ?? ''));
		setBodyTemperature(String(d?.NS_TMPBD ?? ''));
		setHealthManagementNote(String(d?.NS_HEALTH_HELP_NM ?? ''));
		setNursingManagementNote(String(d?.NS_NURSE_HELP_NM ?? ''));
		setMedicationManagement(yn(d?.NS_ETC));
		setPressureSoreObservation(yn(d?.NS_SORE_CHK));
		setProblemBehavior(yn(d?.NS_MEDI_CHK));
		setAbnormalArea(String(d?.NS_SORE_MNG_NM ?? ''));
		setPreparerName(String(d?.INEMPNM ?? ''));
		setPreparerSearchTerm(String(d?.INEMPNM ?? ''));
		setConfirmer(String(d?.ST_CONF ?? ''));
		setConfirmerSearchTerm(String(d?.ST_CONF ?? ''));
		setRoomNumber(String(d?.ROOM_NO ?? ''));
		try {
			const extra = d?.NS_ETC_DESC ? JSON.parse(String(d.NS_ETC_DESC)) : null;
			if (extra && typeof extra === 'object') {
				if (typeof extra.healthManagement === 'boolean') setHealthManagement(extra.healthManagement);
				if (typeof extra.nursingManagement === 'boolean') setNursingManagement(extra.nursingManagement);
				if (typeof extra.emergencyService === 'boolean') setEmergencyService(extra.emergencyService);
				if (typeof extra.fall === 'boolean') setFall(extra.fall);
				if (typeof extra.dehydration === 'boolean') setDehydration(extra.dehydration);
				if (typeof extra.pressureSoreManagement === 'boolean') setPressureSoreManagement(extra.pressureSoreManagement);
				if (typeof extra.incontinence === 'boolean') setIncontinence(extra.incontinence);
				if (typeof extra.delirium === 'boolean') setDelirium(extra.delirium);
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
			const draft = row
				? {
						NS_SBDP: row.NS_SBDP,
						NS_EBDP: row.NS_EBDP,
						NS_TMPBD: row.NS_TMPBD,
						NS_HEALTH_HELP_NM: row.NS_HEALTH_HELP_NM,
						NS_NURSE_HELP_NM: row.NS_NURSE_HELP_NM,
						NS_ETC: row.NS_ETC,
						NS_SORE_CHK: row.NS_SORE_CHK,
						NS_MEDI_CHK: row.NS_MEDI_CHK,
						NS_SORE_MNG_NM: row.NS_SORE_MNG_NM,
						INEMPNM: row.INEMPNM,
						ST_CONF: row.ST_CONF,
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
			setHealthManagement(false);
			setHealthManagementNote('');
			setNursingManagement(false);
			setNursingManagementNote('');
			setEmergencyService(false);
			setPreparerName('');
			setPreparerSearchTerm('');
			setPressureSoreObservation(false);
			setConfirmer('');
			setConfirmerSearchTerm('');
			setAbnormalArea('');
			setProblemBehavior(false);
			setFall(false);
			setDehydration(false);
			setPressureSoreManagement(false);
			setIncontinence(false);
			setDelirium(false);
			setPainVAS('약');
			setMedicationManagement(false);
			setRoomNumber('');
			setIsEditMode(false);
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
			if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
				searchEmployee(confirmerSearchTerm, setConfirmerSuggestions, setShowConfirmerDropdown);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [confirmerSearchTerm]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowPreparerDropdown(false);
				setShowConfirmerDropdown(false);
			}
		};

		if (showPreparerDropdown || showConfirmerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showPreparerDropdown, showConfirmerDropdown]);

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
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
											건강관리
										</label>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">건강관리실시</label>
											<input
												type="checkbox"
												checked={healthManagement}
												onChange={(e) => setHealthManagement(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>
									</div>
									<input
										type="text"
										value={healthManagementNote}
										onChange={(e) => setHealthManagementNote(e.target.value)}
										disabled={!isEditMode}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
								</div>

								{/* 간호관리 */}
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<label className="w-24 px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
											간호관리
										</label>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">간호관리실시</label>
											<input
												type="checkbox"
												checked={nursingManagement}
												onChange={(e) => setNursingManagement(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">실시</span>
										</div>
									</div>
									<input
										type="text"
										value={nursingManagementNote}
										onChange={(e) => setNursingManagementNote(e.target.value)}
										disabled={!isEditMode}
										className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
									/>
								</div>

								{/* 기타(응급서비스) 및 작성자성명 */}
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-2">
										<label className="text-sm text-blue-900">기타(응급서비스)</label>
										<input
											type="checkbox"
											checked={emergencyService}
											onChange={(e) => setEmergencyService(e.target.checked)}
											disabled={!isEditMode}
											className="w-4 h-4 border border-blue-300 rounded"
										/>
										<span className="text-sm text-blue-900">실시</span>
									</div>
									<label className="ml-4 text-sm text-blue-900">작성자성명</label>
									<div className="relative flex-1 employee-dropdown-container">
										<input
											type="text"
											value={preparerSearchTerm || preparerName}
											onChange={(e) => {
												const value = e.target.value;
												if (!isEditMode) return;
												setPreparerName(value);
												setPreparerSearchTerm(value);
												if (!value || value.trim() === '') {
													setPreparerSuggestions([]);
													setShowPreparerDropdown(false);
												}
											}}
											onFocus={() => {
												if (!isEditMode) return;
												if (preparerName) {
													setPreparerSearchTerm(preparerName);
												}
												if (preparerSearchTerm && preparerSearchTerm.trim() !== '') {
													searchEmployee(preparerSearchTerm, setPreparerSuggestions, setShowPreparerDropdown);
												}
											}}
											className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											placeholder="작성자 검색"
											disabled={!isEditMode}
										/>
										{showPreparerDropdown && preparerSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
												{preparerSuggestions.map((employee, index) => (
													<div
														key={`${employee.EMPNO}-${index}`}
														onClick={() => {
															if (!isEditMode) return;
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

								{/* 욕창발생관찰 및 확인자 */}
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-2">
										<label className="text-sm text-blue-900">욕창발생관찰</label>
										<input
											type="checkbox"
											checked={pressureSoreObservation}
											onChange={(e) => setPressureSoreObservation(e.target.checked)}
											disabled={!isEditMode}
											className="w-4 h-4 border border-blue-300 rounded"
										/>
										<span className="text-sm text-blue-900">이상있음</span>
									</div>
									<label className="ml-4 text-sm text-blue-900">확인자</label>
									<div className="relative flex-1 employee-dropdown-container">
										<input
											type="text"
											value={confirmerSearchTerm || confirmer}
											onChange={(e) => {
												const value = e.target.value;
												if (!isEditMode) return;
												setConfirmer(value);
												setConfirmerSearchTerm(value);
												if (!value || value.trim() === '') {
													setConfirmerSuggestions([]);
													setShowConfirmerDropdown(false);
												}
											}}
											onFocus={() => {
												if (!isEditMode) return;
												if (confirmer) {
													setConfirmerSearchTerm(confirmer);
												}
												if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
													searchEmployee(confirmerSearchTerm, setConfirmerSuggestions, setShowConfirmerDropdown);
												}
											}}
											className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
											placeholder="확인자 검색"
											disabled={!isEditMode}
										/>
										{showConfirmerDropdown && confirmerSuggestions.length > 0 && (
											<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
												{confirmerSuggestions.map((employee, index) => (
													<div
														key={`${employee.EMPNO}-${index}`}
														onClick={() => {
															if (!isEditMode) return;
															setConfirmer(employee.EMPNM);
															setConfirmerSearchTerm(employee.EMPNM);
															setShowConfirmerDropdown(false);
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

								{/* 이상부위 및 피부상태 */}
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

								{/* 증상 및 관리 */}
								<div className="pt-2 space-y-3 border-t border-blue-200">
									{/* 첫 번째 행 */}
									<div className="flex flex-wrap items-center gap-4">
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">문제행동</label>
											<input
												type="checkbox"
												checked={problemBehavior}
												onChange={(e) => setProblemBehavior(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">유</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">낙상</label>
											<input
												type="checkbox"
												checked={fall}
												onChange={(e) => setFall(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">유</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">탈수</label>
											<input
												type="checkbox"
												checked={dehydration}
												onChange={(e) => setDehydration(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">있음</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">욕창관리</label>
											<input
												type="checkbox"
												checked={pressureSoreManagement}
												onChange={(e) => setPressureSoreManagement(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">관리</span>
										</div>
									</div>

									{/* 두 번째 행 */}
									<div className="flex flex-wrap items-center gap-4">
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">소변/대변실금</label>
											<input
												type="checkbox"
												checked={incontinence}
												onChange={(e) => setIncontinence(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">유</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">섬망</label>
											<input
												type="checkbox"
												checked={delirium}
												onChange={(e) => setDelirium(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">의심</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">통증(VAS)</label>
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="radio"
													name="painVAS"
													value="약"
													checked={painVAS === '약'}
													onChange={(e) => setPainVAS(e.target.value)}
													disabled={!isEditMode}
													className="w-4 h-4 border border-blue-300"
												/>
												<span className="text-sm text-blue-900">약</span>
											</label>
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="radio"
													name="painVAS"
													value="중"
													checked={painVAS === '중'}
													onChange={(e) => setPainVAS(e.target.value)}
													disabled={!isEditMode}
													className="w-4 h-4 border border-blue-300"
												/>
												<span className="text-sm text-blue-900">중</span>
											</label>
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="radio"
													name="painVAS"
													value="강"
													checked={painVAS === '강'}
													onChange={(e) => setPainVAS(e.target.value)}
													disabled={!isEditMode}
													className="w-4 h-4 border border-blue-300"
												/>
												<span className="text-sm text-blue-900">강</span>
											</label>
										</div>
										<div className="flex items-center gap-2">
											<label className="text-sm text-blue-900">투약관리</label>
											<input
												type="checkbox"
												checked={medicationManagement}
												onChange={(e) => setMedicationManagement(e.target.checked)}
												disabled={!isEditMode}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">관리</span>
										</div>
									</div>

									{/* 침실호수 */}
									<div className="flex items-center gap-2">
										<label className="text-sm text-blue-900">침실호수</label>
										<input
											type="text"
											value={roomNumber}
											onChange={(e) => setRoomNumber(e.target.value)}
											disabled={!isEditMode}
											className="w-32 px-2 py-1 text-sm bg-white border border-blue-300 rounded"
										/>
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
					</section>
				</div>
			</div>
		</div>
	);
}

