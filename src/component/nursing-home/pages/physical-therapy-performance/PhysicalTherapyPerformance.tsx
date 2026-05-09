"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import BeneficiaryListPanel, { BeneficiaryMember } from '../../components/BeneficiaryListPanel';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	[key: string]: any;
}

interface TherapyRecordData {
	TDT: string; // 치료일자 (F32020)
	JHEMP?: number | string | null; // 담당자(사번)
	[key: string]: any;
}

export default function PhysicalTherapyPerformance() {
	const [selectedMember, setSelectedMember] = useState<BeneficiaryMember | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [treatmentDates, setTreatmentDates] = useState<string[]>([]);
	const [treatmentRecords, setTreatmentRecords] = useState<TherapyRecordData[]>([]);
	const [loadingRecords, setLoadingRecords] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const dateItemsPerPage = 10;

	// F32020 폼 데이터(이미지 스키마 기반: 실시=1, 미실시=0 / 횟수·시간 등은 TVAL/TETCVAL로 입력)
	const createEmptyForm = (tdt?: string) => ({
		TDT: tdt || new Date().toISOString().slice(0, 10),
		JHEMP: '',
		// 기구이용: TCHK01~07 / TVAL01~07
		TCHK01: '0', TVAL01: '',
		TCHK02: '0', TVAL02: '',
		TCHK03: '0', TVAL03: '',
		TCHK04: '0', TVAL04: '',
		TCHK05: '0', TVAL05: '',
		TCHK06: '0', TVAL06: '',
		TCHK07: '0', TVAL07: '',
		// 단순운동(기본): TCHK08~12 / TVAL08~12
		TCHK08: '0', TVAL08: '',
		TCHK09: '0', TVAL09: '',
		TCHK10: '0', TVAL10: '',
		TCHK11: '0', TVAL11: '',
		TCHK12: '0', TVAL12: '',
		TTEXT_1: '',
		// 단순운동(치료/훈련): TCHK21~26 / TVAL21~26
		TCHK21: '0', TVAL21: '',
		TCHK22: '0', TVAL22: '',
		TCHK23: '0', TVAL23: '',
		TCHK24: '0', TVAL24: '',
		TCHK25: '0', TVAL25: '',
		TCHK26: '0', TVAL26: '',
		TTEXT_2: '',
		// Modalities: TCHK31~37 / TVAL31~37
		TCHK31: '0', TVAL31: '',
		TCHK32: '0', TVAL32: '',
		TCHK33: '0', TVAL33: '',
		TCHK34: '0', TVAL34: '',
		TCHK35: '0', TVAL35: '',
		TCHK36: '0', TVAL36: '',
		TCHK37: '0', TVAL37: '',
		TTEXT_3: '',
		// 기타치료: TETC_1~5 / TETCVAL_1~5
		TETC_1: '', TETCVAL_1: '',
		TETC_2: '', TETCVAL_2: '',
		TETC_3: '', TETCVAL_3: '',
		TETC_4: '', TETCVAL_4: '',
		TETC_5: '', TETCVAL_5: '',
		TTEXT_4: '',
		ETC: '',
	});
	const [formData, setFormData] = useState(() => createEmptyForm());

	const extractFloorFromRoomNo = (roomNo: any): number | null => {
		const s = String(roomNo ?? '').trim();
		if (!s) return null;
		const digits = s.replace(/\D/g, '');
		if (!digits) return null;
		const n = parseInt(digits, 10);
		if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return null;
		return Math.floor(n / 100);
	};

	// 나이 계산 함수
	const calculateAge = (birthDate: any) => {
		const s = String(birthDate ?? '').trim();
		if (s.length < 4) return '-';
		try {
			const year = parseInt(s.substring(0, 4));
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return '-';
		}
	};

	// 치료일자 목록 조회
	const fetchTreatmentDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setTreatmentDates([]);
			setTreatmentRecords([]);
			return;
		}

		setLoadingRecords(true);
		try {
			const url = `/api/f32020?pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url, { cache: 'no-store' });
			const result = await response.json();

			if (result.success) {
				const list: TherapyRecordData[] = result.data || [];
				setTreatmentRecords(list);
				setTreatmentDates(list.map((r) => r.TDT).filter(Boolean));
				setSelectedDateIndex(null);
				setDatePage(1);
			} else {
				setTreatmentRecords([]);
				setTreatmentDates([]);
			}
		} catch (err) {
			console.error('치료일자 조회 오류:', err);
		} finally {
			setLoadingRecords(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: BeneficiaryMember) => {
		setSelectedMember(member as any);
		setFormData(createEmptyForm(new Date().toISOString().slice(0, 10)));
		fetchTreatmentDates(String(member.ANCD), String(member.PNUM));
	};

	// 치료일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedRecord = treatmentRecords[index];
		const selectedDate = treatmentDates[index];
		setIsEditMode(false);
		if (selectedRecord) {
			setFormData((prev) => ({
				...prev,
				...selectedRecord,
				JHEMP: String((selectedRecord as any).JHEMP ?? ''),
				TDT: selectedRecord.TDT || selectedDate || prev.TDT,
			}));
		} else {
			setFormData(createEmptyForm(selectedDate || undefined));
		}
	};

	// 날짜 형식 변환 함수
	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		if (dateStr.includes('T')) {
			dateStr = dateStr.split('T')[0];
		}
		if (dateStr.includes('-') && dateStr.length >= 10) {
			return dateStr.substring(0, 10);
		}
		if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	// 저장 함수
	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (!formData.TDT) {
			alert('치료일자를 입력해주세요.');
			return;
		}

		setLoadingRecords(true);
		try {
			const response = await fetch('/api/f32020', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					PNUM: selectedMember.PNUM,
					...formData,
				}),
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result.success) {
				throw new Error(result?.error || '저장 실패');
			}

			alert(selectedDateIndex !== null ? '물리치료실적이 수정되었습니다.' : '물리치료실적이 저장되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchTreatmentDates(selectedMember.ANCD, selectedMember.PNUM);
			}
		} catch (err) {
			console.error('물리치료실적 저장 오류:', err);
			alert('물리치료실적 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 지움 함수
	const handleClear = () => {
		setFormData(createEmptyForm());
		setIsEditMode(true);
		setSelectedDateIndex(null);
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 물리치료실적을 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingRecords(true);
		try {
			const tdt = treatmentDates[selectedDateIndex];
			const response = await fetch(
				`/api/f32020?pnum=${encodeURIComponent(selectedMember.PNUM)}&tdt=${encodeURIComponent(tdt)}`,
				{ method: 'DELETE' }
			);
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result.success) {
				throw new Error(result?.error || '삭제 실패');
			}

			alert('물리치료실적이 삭제되었습니다.');
			setIsEditMode(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchTreatmentDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			handleClear();
		} catch (err) {
			console.error('물리치료실적 삭제 오류:', err);
			alert('물리치료실적 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingRecords(false);
		}
	};

	// 출력 함수들
	const handlePrintRecord = async () => {
		if (!selectedMember || !formData.TDT) {
			alert('출력할 물리치료실적을 선택해주세요.');
			return;
		}
		// TODO: 기록출력 구현
		alert('기록출력 기능은 준비 중입니다.');
	};

	const handlePrintPeriod = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		// TODO: 기간기록출력 구현
		alert('기간기록출력 기능은 준비 중입니다.');
	};

	const handlePlanAndEvaluation = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		// TODO: 계획 및 평가 페이지로 이동
		alert('계획 및 평가 기능은 준비 중입니다.');
	};

	// 치료일자 목록 페이지네이션
	const dateTotalPages = Math.ceil(treatmentDates.length / dateItemsPerPage);
	const dateStartIndex = (datePage - 1) * dateItemsPerPage;
	const dateEndIndex = dateStartIndex + dateItemsPerPage;
	const currentDateItems = treatmentDates.slice(dateStartIndex, dateEndIndex);

	// 치료 항목 렌더링 함수
	const renderTreatmentItem = (chkKey: string, valKey: string, label: string) => {
		const checked = String((formData as any)[chkKey] ?? '0') === '1';
		const value = String((formData as any)[valKey] ?? '');
		return (
			<div key={`${chkKey}-${valKey}`} className="flex items-center gap-2 py-2 border-b border-blue-100">
				<input
					type="checkbox"
					checked={checked}
					onChange={(e) =>
						setFormData((prev: any) => ({
							...prev,
							[chkKey]: e.target.checked ? '1' : '0',
						}))
					}
					className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
				/>
				<label className="text-sm text-blue-900 flex-1">{label}</label>
				<input
					type="text"
					value={value}
					onChange={(e) =>
						setFormData((prev: any) => ({
							...prev,
							[valKey]: e.target.value,
						}))
					}
					className="w-24 px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
					placeholder="횟수/분"
				/>
			</div>
		);
	};

	const equipmentItems = [
		{ chk: 'TCHK01', val: 'TVAL01', label: '자전거' },
		{ chk: 'TCHK02', val: 'TVAL02', label: '탄력밴드운동' },
		{ chk: 'TCHK03', val: 'TVAL03', label: '전신안마기' },
		{ chk: 'TCHK04', val: 'TVAL04', label: 'Pully' },
		{ chk: 'TCHK05', val: 'TVAL05', label: '견관절운동기' },
		{ chk: 'TCHK06', val: 'TVAL06', label: '평행봉걷기' },
		{ chk: 'TCHK07', val: 'TVAL07', label: '러닝머신' },
	];

	const simpleBaseItems = [
		{ chk: 'TCHK08', val: 'TVAL08', label: '발맛사지기' },
		{ chk: 'TCHK09', val: 'TVAL09', label: '틸팅테이블' },
		{ chk: 'TCHK10', val: 'TVAL10', label: '공운동' },
		{ chk: 'TCHK11', val: 'TVAL11', label: '구술꿰기' },
		{ chk: 'TCHK12', val: 'TVAL12', label: '패기보드끼우기' },
	];

	const simpleTherapyItems = [
		{ chk: 'TCHK21', val: 'TVAL21', label: '도수운동' },
		{ chk: 'TCHK22', val: 'TVAL22', label: 'ROM' },
		{ chk: 'TCHK23', val: 'TVAL23', label: '근력운동' },
		{ chk: 'TCHK24', val: 'TVAL24', label: '기능향상운동' },
		{ chk: 'TCHK25', val: 'TVAL25', label: '체중이동/지지' },
		{ chk: 'TCHK26', val: 'TVAL26', label: '보행훈련' },
	];

	const modalityItems = [
		{ chk: 'TCHK31', val: 'TVAL31', label: 'Hot&Cold Pack' },
		{ chk: 'TCHK32', val: 'TVAL32', label: '적외선치료' },
		{ chk: 'TCHK33', val: 'TVAL33', label: '초음파치료' },
		{ chk: 'TCHK34', val: 'TVAL34', label: '경피신경전기자극치료' },
		{ chk: 'TCHK35', val: 'TVAL35', label: '간섭전류치료' },
		{ chk: 'TCHK36', val: 'TVAL36', label: '전기자극치료' },
		{ chk: 'TCHK37', val: 'TVAL37', label: '파라핀치료' },
	];

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				<BeneficiaryListPanel selectedMember={selectedMember} onSelect={handleSelectMember} className="w-1/4" />

				{/* 중간-왼쪽 패널: 치료일자 목록 */}
				<div className="flex flex-col w-[220px] bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900">치료일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingRecords ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
							) : treatmentDates.length === 0 ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">
									{selectedMember ? '치료일자가 없습니다' : '수급자를 선택해주세요'}
								</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = dateStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
												selectedDateIndex === globalIndex ? 'bg-blue-100 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									);
								})
							)}
						</div>
						{/* 치료일자 페이지네이션 */}
						{dateTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setDatePage(1)}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setDatePage(prev => Math.max(1, prev - 1))}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									{Array.from({ length: Math.min(5, dateTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(dateTotalPages - 4, datePage - 2)) + i;
										if (pageNum > dateTotalPages) return null;
										return (
											<button
												key={pageNum}
												onClick={() => setDatePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													datePage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									}).filter(Boolean)}
									
									<button
										onClick={() => setDatePage(prev => Math.min(dateTotalPages, prev + 1))}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setDatePage(dateTotalPages)}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 우측 패널: 입력 폼 */}
				<div className="relative flex-1 p-4 overflow-y-auto bg-white">
					{selectedMember && !loadingRecords && treatmentDates.length === 0 && !isEditMode && (
						<div className="absolute inset-0 z-20 flex items-start justify-center pt-10 bg-white/65 backdrop-blur-[1px]">
							<div className="w-[min(520px,90%)] px-4 py-3 text-sm text-blue-900 bg-white border border-blue-200 rounded shadow-sm">
								<div className="font-medium">데이터가 없습니다.</div>
								<div className="mt-2 flex justify-end">
									<button
										onClick={handleClear}
										className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-300 rounded hover:bg-blue-300"
									>
										신규등록
									</button>
								</div>
							</div>
						</div>
					)}

					{/* 상단: 수급자, 치료일자, 담당자 */}
					<div
						className={`flex flex-wrap items-center gap-4 mb-4 ${
							selectedMember && !loadingRecords && treatmentDates.length === 0 && !isEditMode ? 'pointer-events-none opacity-70' : ''
						}`}
					>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
							<input
								type="text"
								value={selectedMember?.P_NM || ''}
								readOnly
								className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]"
								placeholder="수급자를 선택해주세요"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">치료일자</label>
							<input
								type="date"
								value={String((formData as any).TDT || '').slice(0, 10)}
								onChange={(e) => {
									setIsEditMode(true);
									setSelectedDateIndex(null);
									setFormData((prev: any) => ({ ...prev, TDT: e.target.value }));
								}}
								disabled={!selectedMember}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 w-[140px] disabled:bg-gray-50 disabled:border-blue-200"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">담당자(사번)</label>
							<input
								type="number"
								value={String((formData as any).JHEMP ?? '')}
								onChange={(e) => setFormData((prev: any) => ({ ...prev, JHEMP: e.target.value }))}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
								placeholder="예) 1001"
							/>
						</div>
						{selectedMember && (
							<div className="text-sm text-blue-900/80">
								<span className="mr-3">등급: {formatCareGradeLabel(selectedMember.P_GRD)}</span>
								<span className="mr-3">성별: {selectedMember.P_SEX === '1' ? '남' : selectedMember.P_SEX === '2' ? '여' : '-'}</span>
								<span className="mr-3">나이: {calculateAge((selectedMember as any).P_BRDT)}</span>
								<span>
									층: {extractFloorFromRoomNo((selectedMember as any).ROOM_NO) !== null ? `${extractFloorFromRoomNo((selectedMember as any).ROOM_NO)}층` : '-'}
								</span>
							</div>
						)}
					</div>

					{/* 메인 컨텐츠: 4개 컬럼 */}
					<div
						className={`flex gap-4 mb-4 ${
							selectedMember && !loadingRecords && treatmentDates.length === 0 && !isEditMode ? 'pointer-events-none opacity-70' : ''
						}`}
					>
						{/* Column 1: 운동치료 - 기구이용 */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">운동치료 - 기구이용</h3>
							</div>
							<div className="space-y-1">
								{equipmentItems.map((it) => renderTreatmentItem(it.chk, it.val, it.label))}
							</div>
						</div>

						{/* Column 2: 운동치료 - 단순운동 */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">운동치료 - 단순운동</h3>
							</div>
							<div className="space-y-1">
								{simpleBaseItems.map((it) => renderTreatmentItem(it.chk, it.val, it.label))}
							</div>
							<div className="mt-3">
								<div className="text-xs text-blue-900/80 mb-1">특이사항및변경사유(운동치료)</div>
								<textarea
									value={String((formData as any).TTEXT_1 ?? '')}
									onChange={(e) => setFormData((prev: any) => ({ ...prev, TTEXT_1: e.target.value }))}
									className="w-full min-h-[72px] px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="미실시 사유를 입력하세요"
								/>
							</div>
						</div>

						{/* Column 3: 단순운동(치료/훈련) */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">단순운동(치료/훈련)</h3>
							</div>
							<div className="space-y-1">
								{simpleTherapyItems.map((it) => renderTreatmentItem(it.chk, it.val, it.label))}
							</div>
							<div className="mt-3">
								<div className="text-xs text-blue-900/80 mb-1">특이사항및변경사유(단순운동-치료/훈련)</div>
								<textarea
									value={String((formData as any).TTEXT_2 ?? '')}
									onChange={(e) => setFormData((prev: any) => ({ ...prev, TTEXT_2: e.target.value }))}
									className="w-full min-h-[60px] px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								/>
							</div>
						</div>

						{/* Column 4: Modalities (기존 기타 위치) */}
						<div className="flex-1 border border-blue-300 rounded-lg p-4 bg-white">
							<div className="mb-4 pb-2 border-b border-blue-200">
								<h3 className="text-base font-semibold text-blue-900">Modalities</h3>
							</div>
							<div className="space-y-1">
								{modalityItems.map((it) => renderTreatmentItem(it.chk, it.val, it.label))}
							</div>
							<div className="mt-3">
								<div className="text-xs text-blue-900/80 mb-1">특이사항및변경사유(Modalities)</div>
								<textarea
									value={String((formData as any).TTEXT_3 ?? '')}
									onChange={(e) => setFormData((prev: any) => ({ ...prev, TTEXT_3: e.target.value }))}
									className="w-full min-h-[60px] px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								/>
							</div>
						</div>
					</div>

					{/* 하단: 기타 (가로 널찍하게) */}
					<div
						className={`border border-blue-300 rounded-lg p-4 bg-white mb-6 ${
							selectedMember && !loadingRecords && treatmentDates.length === 0 && !isEditMode ? 'pointer-events-none opacity-70' : ''
						}`}
					>
						<div className="mb-4 pb-2 border-b border-blue-200 flex items-center justify-between">
							<h3 className="text-base font-semibold text-blue-900">기타</h3>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								{[1, 2, 3].map((n) => (
									<div key={n} className="flex items-center gap-2 py-1.5 border-b border-blue-100">
										<input
											type="text"
											value={String((formData as any)[`TETC_${n}`] ?? '')}
											onChange={(e) => setFormData((prev: any) => ({ ...prev, [`TETC_${n}`]: e.target.value }))}
											className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
											placeholder={`기타치료 ${n}`}
										/>
										<input
											type="text"
											value={String((formData as any)[`TETCVAL_${n}`] ?? '')}
											onChange={(e) => setFormData((prev: any) => ({ ...prev, [`TETCVAL_${n}`]: e.target.value }))}
											className="w-28 px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
											placeholder="시간/횟수"
										/>
									</div>
								))}
							</div>
							<div className="space-y-2">
								{[4, 5].map((n) => (
									<div key={n} className="flex items-center gap-2 py-1.5 border-b border-blue-100">
										<input
											type="text"
											value={String((formData as any)[`TETC_${n}`] ?? '')}
											onChange={(e) => setFormData((prev: any) => ({ ...prev, [`TETC_${n}`]: e.target.value }))}
											className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
											placeholder={`기타치료 ${n}`}
										/>
										<input
											type="text"
											value={String((formData as any)[`TETCVAL_${n}`] ?? '')}
											onChange={(e) => setFormData((prev: any) => ({ ...prev, [`TETCVAL_${n}`]: e.target.value }))}
											className="w-28 px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
											placeholder="시간/횟수"
										/>
									</div>
								))}
								<div className="mt-2">
									<div className="text-xs text-blue-900/80 mb-1">특이사항및변경사유(기타치료)</div>
									<textarea
										value={String((formData as any).TTEXT_4 ?? '')}
										onChange={(e) => setFormData((prev: any) => ({ ...prev, TTEXT_4: e.target.value }))}
										className="w-full min-h-[60px] px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									/>
								</div>
								<div>
									<div className="text-xs text-blue-900/80 mb-1">비고</div>
									<textarea
										value={String((formData as any).ETC ?? '')}
										onChange={(e) => setFormData((prev: any) => ({ ...prev, ETC: e.target.value }))}
										className="w-full min-h-[72px] px-2 py-1 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div
						className={`flex justify-end gap-2 ${
							selectedMember && !loadingRecords && treatmentDates.length === 0 && !isEditMode ? 'pointer-events-none opacity-70' : ''
						}`}
					>
						<button
							onClick={handleSave}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							저장
						</button>
						<button
							onClick={handleClear}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							지움
						</button>
						<button
							onClick={handleDelete}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							삭제
						</button>
						<button
							onClick={handlePrintRecord}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							기록출력
						</button>
						<button
							onClick={handlePrintPeriod}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							기간기록출력
						</button>
						<button
							onClick={handlePlanAndEvaluation}
							className="px-4 py-2 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
						>
							계획 및 평가
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

