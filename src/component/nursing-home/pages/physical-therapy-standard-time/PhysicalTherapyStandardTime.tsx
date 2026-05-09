"use client";
import React, { useEffect, useMemo, useState } from 'react';

export default function PhysicalTherapyStandardTime() {
	const [centerName, setCenterName] = useState('');
	const [loading, setLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

  	const createEmpty = () => ({
		SVAL01: '', SVAL02: '', SVAL03: '', SVAL04: '', SVAL05: '', SVAL06: '', SVAL07: '', SVAL08: '', SVAL09: '', SVAL10: '', SVAL11: '', SVAL12: '',
		SVAL21: '', SVAL22: '', SVAL23: '', SVAL24: '', SVAL25: '', SVAL26: '',
		SVAL31: '', SVAL32: '', SVAL33: '', SVAL34: '', SVAL35: '', SVAL36: '', SVAL37: '',
		ETC: '',
		INEMPNO: '',
		INEMPNM: '',
	});
	const [formData, setFormData] = useState(() => createEmpty());
	const [originalData, setOriginalData] = useState(() => createEmpty());

	// 등록자(사원) 검색
	const [registrarSearchTerm, setRegistrarSearchTerm] = useState('');
	const [registrarSuggestions, setRegistrarSuggestions] = useState<Array<{ EMPNO: string; EMPNM: string }>>([]);
	const [showRegistrarDropdown, setShowRegistrarDropdown] = useState(false);

	const equipmentItems = useMemo(
		() => [
			{ key: 'SVAL01', label: '자전거' },
			{ key: 'SVAL02', label: '탄력밴드운동' },
			{ key: 'SVAL03', label: '전신안마기' },
			{ key: 'SVAL04', label: 'Pully' },
			{ key: 'SVAL05', label: '견관절운동기' },
			{ key: 'SVAL06', label: '평행봉걷기' },
			{ key: 'SVAL07', label: '런닝머신' },
			{ key: 'SVAL08', label: '발맛사지기' },
			{ key: 'SVAL09', label: '틸팅테이블' },
			{ key: 'SVAL10', label: '공운동' },
			{ key: 'SVAL11', label: '구술꿰기' },
			{ key: 'SVAL12', label: '패그보드끼우기' },
		],
		[]
	);

	const simpleItems = useMemo(
		() => [
			{ key: 'SVAL21', label: '도수운동' },
			{ key: 'SVAL22', label: 'ROM' },
			{ key: 'SVAL23', label: '근력운동' },
			{ key: 'SVAL24', label: '기능향상운동' },
			{ key: 'SVAL25', label: '체중이동/지지훈련' },
			{ key: 'SVAL26', label: '보행훈련' },
		],
		[]
	);

	const modalityItems = useMemo(
		() => [
			{ key: 'SVAL31', label: 'Hot&Cold Pack' },
			{ key: 'SVAL32', label: '적외선치료' },
			{ key: 'SVAL33', label: '초음파치료' },
			{ key: 'SVAL34', label: '경피신경전기자극치료' },
			{ key: 'SVAL35', label: '간섭전류치료' },
			{ key: 'SVAL36', label: '전기자극치료' },
			{ key: 'SVAL37', label: '파라핀치료' },
		],
		[]
	);

	useEffect(() => {
		const boot = async () => {
			try {
				const res = await fetch('/api/f32090', { cache: 'no-store' });
				const json = await res.json();
				if (json?.success && json.data) {
					const raw = { ...createEmpty(), ...json.data } as Record<string, unknown>;
					// F32090의 SVALxx는 CHAR(3)이라 공백 패딩이 있을 수 있음 → number input 표시 위해 trim
					Object.keys(raw).forEach((k) => {
						const v = raw[k];
						if (v == null) {
							raw[k] = '';
							return;
						}
						if (typeof v === 'string') {
							raw[k] = v.trim();
						}
					});
					const next = raw as any;
					setFormData(next);
					setOriginalData(next);
				}
			} catch (e) {
				// ignore
			}
			try {
				const res = await fetch('/api/f00110');
				const json = await res.json();
				if (json?.success && Array.isArray(json.data) && json.data[0]) {
					setCenterName(String(json.data[0].ANNM ?? ''));
				}
			} catch (e) {
				// ignore
			}
		};
		boot();
	}, []);

	const searchEmployee = async (term: string) => {
		if (!term || term.trim() === '') {
			setRegistrarSuggestions([]);
			setShowRegistrarDropdown(false);
			return;
		}
		try {
			const url = `/api/f01010?name=${encodeURIComponent(term.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			if (result.success && Array.isArray(result.data)) {
				const list = result.data.map((r: any) => ({
					EMPNO: String(r?.EMPNO ?? ''),
					EMPNM: String(r?.EMPNM ?? ''),
				}));
				setRegistrarSuggestions(list);
				setShowRegistrarDropdown(list.length > 0);
			} else {
				setRegistrarSuggestions([]);
				setShowRegistrarDropdown(false);
			}
		} catch (err) {
			console.error('사원 검색 오류:', err);
			setRegistrarSuggestions([]);
			setShowRegistrarDropdown(false);
		}
	};

	// 사원 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (isEditing && registrarSearchTerm.trim() !== '') {
				searchEmployee(registrarSearchTerm);
			} else {
				setRegistrarSuggestions([]);
				setShowRegistrarDropdown(false);
			}
		}, 250);
		return () => clearTimeout(timer);
	}, [registrarSearchTerm, isEditing]);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.employee-dropdown-container')) {
				setShowRegistrarDropdown(false);
			}
		};
		if (showRegistrarDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showRegistrarDropdown]);

	const handleRegister = async () => {
		if (!isEditing) return;
		setLoading(true);
		try {
			const payload: Record<string, unknown> = { ...formData };
			// 저장 시에도 공백 제거(CHAR 컬럼 패딩 방지 및 일관성)
			Object.keys(payload).forEach((k) => {
				const v = payload[k];
				if (typeof v === 'string') payload[k] = v.trim();
			});
			const res = await fetch('/api/f32090', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json.success) throw new Error(json?.error || '저장 실패');
			alert('물리치료표준시간이 저장되었습니다.');
			setOriginalData(formData);
			setIsEditing(false);
		} catch (err) {
			console.error('물리치료표준시간 등록 오류:', err);
			alert('물리치료표준시간 등록 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		window.history.back();
	};

	const renderItem = (key: string, label: string) => {
		const value = String((formData as any)[key] ?? '');
		return (
			<div key={key} className="flex items-center gap-2 py-2 border-b border-blue-100">
				<label className="text-sm text-blue-900 min-w-[180px]">{label}</label>
				<div className="flex flex-1 items-center gap-2">
					<input
						type="number"
						value={value}
						onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
						disabled={!isEditing}
						className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:border-blue-200"
						placeholder=""
					/>
					<span className="text-sm text-blue-900/80 whitespace-nowrap">분</span>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측: 표준시간 폼 */}
				<div className="flex-1 p-6 overflow-y-auto">
					<div className="mb-6">
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">센터명</label>
							<input
								type="text"
								value={centerName}
								onChange={(e) => setCenterName(e.target.value)}
								disabled={!isEditing}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[200px] disabled:bg-gray-50 disabled:border-blue-200"
								placeholder="센터명"
							/>
						</div>
					</div>

					<div className="flex gap-6 mb-6">
						<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
							<div className="pb-2 mb-4 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">운동치료 - 기구이용</h3>
							</div>
							<div className="space-y-1">{equipmentItems.map((it) => renderItem(it.key, it.label))}</div>
						</div>

						<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
							<div className="pb-2 mb-4 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">운동치료 - 단순운동</h3>
							</div>
							<div className="space-y-1">{simpleItems.map((it) => renderItem(it.key, it.label))}</div>
						</div>

						<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
							<div className="pb-2 mb-4 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">Modalities</h3>
							</div>
							<div className="space-y-1">{modalityItems.map((it) => renderItem(it.key, it.label))}</div>
						</div>
					</div>

					<div className="flex items-start gap-6 mb-6">
						<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
							<div className="text-sm font-semibold text-blue-900 mb-2">비고</div>
							<textarea
								value={String((formData as any).ETC ?? '')}
								onChange={(e) => setFormData((prev) => ({ ...prev, ETC: e.target.value }))}
								disabled={!isEditing}
								className="w-full min-h-[96px] px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:border-blue-200"
							/>
						</div>
						<div className="w-[320px] p-4 bg-white border border-blue-300 rounded-lg">
							<div className="text-sm font-semibold text-blue-900 mb-2">등록자</div>
							<div className="space-y-2 employee-dropdown-container relative">
								<input
									type="text"
									value={registrarSearchTerm || String((formData as any).INEMPNM ?? '')}
									onChange={(e) => {
										setRegistrarSearchTerm(e.target.value);
										setFormData((prev) => ({ ...prev, INEMPNM: e.target.value }));
									}}
									onFocus={() => {
										if (isEditing && registrarSearchTerm.trim() !== '') searchEmployee(registrarSearchTerm);
									}}
									disabled={!isEditing}
									className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded disabled:bg-gray-50 disabled:border-blue-200"
									placeholder="등록자 검색(성명)"
								/>

								{isEditing && showRegistrarDropdown && registrarSuggestions.length > 0 && (
									<div className="absolute z-20 w-full mt-1 bg-white border border-blue-200 rounded shadow max-h-48 overflow-auto">
										{registrarSuggestions.map((emp, idx) => (
											<button
												key={`${emp.EMPNO}-${idx}`}
												type="button"
												onClick={() => {
													setFormData((prev) => ({ ...prev, INEMPNO: emp.EMPNO, INEMPNM: emp.EMPNM }));
													setRegistrarSearchTerm(emp.EMPNM);
													setShowRegistrarDropdown(false);
												}}
												className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
											>
												<span className="font-medium text-blue-900">{emp.EMPNM}</span>
												<span className="ml-2 text-blue-900/70">({emp.EMPNO})</span>
											</button>
										))}
									</div>
								)}

								<input
									type="text"
									value={String((formData as any).INEMPNO ?? '')}
									readOnly
									className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50"
									placeholder="사번(INEMPNO)"
								/>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						{isEditing && (
							<button
								onClick={() => {
									setFormData(originalData);
									setRegistrarSearchTerm(String((originalData as any).INEMPNM ?? ''));
									setShowRegistrarDropdown(false);
									setIsEditing(false);
								}}
								disabled={loading}
								className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								취소
							</button>
						)}
						<button
							onClick={() => {
								if (!isEditing) {
									setIsEditing(true);
									setRegistrarSearchTerm(String((formData as any).INEMPNM ?? ''));
									return;
								}
								handleRegister();
							}}
							disabled={loading}
							className={`px-6 py-2 text-sm font-medium border rounded disabled:opacity-50 disabled:cursor-not-allowed ${
								isEditing
									? 'text-blue-900 bg-blue-200 border-blue-400 hover:bg-blue-300'
									: 'text-white bg-green-600 border-green-700 hover:bg-green-700'
							}`}
						>
							{isEditing ? '저장' : '수정'}
						</button>
						{/* <button
							onClick={handleClose}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							닫기
						</button> */}
					</div>
				</div>
			</div>
		</div>
	);
}
