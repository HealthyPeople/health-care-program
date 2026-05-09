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

export default function PhysicalTherapyPerformanceEvaluation() {
	const [selectedMember, setSelectedMember] = useState<BeneficiaryMember | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [evaluationDates, setEvaluationDates] = useState<string[]>([]);
	const [loadingEvaluations, setLoadingEvaluations] = useState(false);
	const [activeTab, setActiveTab] = useState<string>('운동');
	const [evaluationRecords, setEvaluationRecords] = useState<Record<string, any>[]>([]);
	const [isCreatingNew, setIsCreatingNew] = useState(false);

	// 폼 데이터
	const [formData, setFormData] = useState({
		evaluationDate: new Date().toISOString().slice(0, 10), // 작성일자
		beneficiary: '', // 수급자
		// 운동장애 평가
		rightUpperLimb: '운동장애없음', // 우측상지
		leftUpperLimb: '운동장애없음', // 좌측상지
		rightLowerLimb: '운동장애없음', // 우측하지
		leftLowerLimb: '운동장애없음', // 좌측하지
		// 관절제한 평가
		shoulderJoint: '제한없음', // 어깨관절
		elbowJoint: '제한없음', // 팔꿈치관절
		wristFingerJoint: '제한없음', // 손목 및 수지관절
		hipJoint: '제한없음', // 고관절
		kneeJoint: '제한없음', // 무릎관절
		ankleJoint: '제한없음', // 발목관절
		bodyPain: '없음', // 신체통증유무
		// 기본동작평가
		bedMovement: false, // 침상이동 - 측면 & 침상위 이동
		sitting: false, // 앉기
		crawling: false, // 네발기기
		kneeling: false, // 무릎서기
		standing: false, // 기립
		walking: false, // 보행
		wheelchairOperation: false, // 휠체어 조작 및 이동
		assistiveDeviceMovement: false, // 보장구 장착 이동
		// ADL1
		bowelBladder: '0', // 대소변
		eating: '0', // 식사
		// ADL2
		clothing: '0', // 복장
		personalHygiene: '0', // 개인위생
		// ADL3
		gait: '0', // 보행
		bathing: '0', // 목욕하기
		// 총점
		totalScore: '', // 총점
		evaluator: '' // 평가자
	});

	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '-';
		try {
			const year = parseInt(birthDate.substring(0, 4));
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return '-';
		}
	};

	// 평가일자 목록 조회
	const fetchEvaluationDates = async (ancd: string, pnum: string, keepEvaldt?: string) => {
		if (!ancd || !pnum) {
			setEvaluationDates([]);
			setEvaluationRecords([]);
			return;
		}

		setLoadingEvaluations(true);
		try {
			const url = `/api/f51010?pnum=${encodeURIComponent(pnum)}`;
			const response = await fetch(url, { cache: 'no-store' });
			const result = await response.json();
			if (result.success) {
				const list: Record<string, any>[] = result.data || [];
				setEvaluationRecords(list);
				const dates = list.map((r) => r.EVALDT || r.evaldt || r.evaluationDate).filter(Boolean);
				setEvaluationDates(dates);

				if (keepEvaldt) {
					const idx = dates.findIndex((d) => formatDateDisplay(String(d)) === formatDateDisplay(String(keepEvaldt)));
					if (idx >= 0) {
						setSelectedDateIndex(idx);
						const record = list[idx];
						const boolKeys = [
							'bedMovement',
							'sitting',
							'crawling',
							'kneeling',
							'standing',
							'walking',
							'wheelchairOperation',
							'assistiveDeviceMovement',
						];
						setFormData((prev) => ({
							...prev,
							...record,
							evaluationDate: record.EVALDT || record.evaldt || keepEvaldt || prev.evaluationDate,
							beneficiary: selectedMember?.P_NM || prev.beneficiary,
							...Object.fromEntries(boolKeys.map((k) => [k, String(record[k] ?? '').trim() === '1' || record[k] === true])),
						}));
					} else {
						setSelectedDateIndex(null);
					}
				} else {
					setSelectedDateIndex(null);
				}
			} else {
				setEvaluationRecords([]);
				setEvaluationDates([]);
			}
		} catch (err) {
			console.error('평가일자 조회 오류:', err);
		} finally {
			setLoadingEvaluations(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: BeneficiaryMember) => {
		setSelectedMember(member);
		setFormData(prev => ({ ...prev, beneficiary: String(member.P_NM ?? '') }));
		setIsCreatingNew(false);
		fetchEvaluationDates(String(member.ANCD), String(member.PNUM));
	};

	// 평가일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		setIsCreatingNew(false);
		const selectedDate = evaluationDates[index];
		setFormData(prev => ({ ...prev, evaluationDate: selectedDate || '' }));
		const record = evaluationRecords[index];
		if (record) {
			const boolKeys = [
				'bedMovement',
				'sitting',
				'crawling',
				'kneeling',
				'standing',
				'walking',
				'wheelchairOperation',
				'assistiveDeviceMovement',
			];
			setFormData(prev => ({
				...prev,
				...record,
				evaluationDate: record.EVALDT || record.evaldt || selectedDate || prev.evaluationDate,
				beneficiary: selectedMember?.P_NM || prev.beneficiary,
				...Object.fromEntries(
					boolKeys.map((k) => [k, String(record[k] ?? '').trim() === '1' || record[k] === true])
				),
			}));
		}
	};

	const handleNewEvaluation = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		setSelectedDateIndex(null);
		setIsCreatingNew(true);
		setActiveTab('운동');
		setFormData((prev) => ({
			...prev,
			evaluationDate: new Date().toISOString().slice(0, 10),
			beneficiary: selectedMember.P_NM || prev.beneficiary,
			rightUpperLimb: '운동장애없음',
			leftUpperLimb: '운동장애없음',
			rightLowerLimb: '운동장애없음',
			leftLowerLimb: '운동장애없음',
			shoulderJoint: '제한없음',
			elbowJoint: '제한없음',
			wristFingerJoint: '제한없음',
			hipJoint: '제한없음',
			kneeJoint: '제한없음',
			ankleJoint: '제한없음',
			bodyPain: '없음',
			bedMovement: false,
			sitting: false,
			crawling: false,
			kneeling: false,
			standing: false,
			walking: false,
			wheelchairOperation: false,
			assistiveDeviceMovement: false,
			bowelBladder: '0',
			eating: '0',
			clothing: '0',
			personalHygiene: '0',
			gait: '0',
			bathing: '0',
			totalScore: '',
			evaluator: '',
		}));
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

		if (!formData.evaluationDate) {
			alert('작성일자를 입력해주세요.');
			return;
		}

		setLoadingEvaluations(true);
		try {
			const boolToChar = (v: any) => (v ? '1' : '0');
			const payload: Record<string, any> = {
				PNUM: selectedMember.PNUM,
				EVALDT: formData.evaluationDate,
				...formData,
				// DB 저장 시 boolean → '1'/'0'
				bedMovement: boolToChar(formData.bedMovement),
				sitting: boolToChar(formData.sitting),
				crawling: boolToChar(formData.crawling),
				kneeling: boolToChar(formData.kneeling),
				standing: boolToChar(formData.standing),
				walking: boolToChar(formData.walking),
				wheelchairOperation: boolToChar(formData.wheelchairOperation),
				assistiveDeviceMovement: boolToChar(formData.assistiveDeviceMovement),
			};

			const response = await fetch('/api/f51010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result.success) {
				throw new Error(result?.error || '저장 실패');
			}

			alert(selectedDateIndex !== null ? '물리치료실적 평가가 수정되었습니다.' : '물리치료실적 평가가 저장되었습니다.');
			setIsCreatingNew(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchEvaluationDates(selectedMember.ANCD, selectedMember.PNUM, formData.evaluationDate);
			}
		} catch (err) {
			console.error('물리치료실적 평가 저장 오류:', err);
			alert('물리치료실적 평가 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingEvaluations(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 평가를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingEvaluations(true);
		try {
			const evaldt = evaluationDates[selectedDateIndex];
			const response = await fetch(
				`/api/f51010?pnum=${encodeURIComponent(selectedMember.PNUM)}&evaldt=${encodeURIComponent(evaldt)}`,
				{ method: 'DELETE' }
			);
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result.success) {
				throw new Error(result?.error || '삭제 실패');
			}

			alert('물리치료실적 평가가 삭제되었습니다.');
			setIsCreatingNew(false);
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchEvaluationDates(selectedMember.ANCD, selectedMember.PNUM);
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				rightUpperLimb: '운동장애없음',
				leftUpperLimb: '운동장애없음',
				rightLowerLimb: '운동장애없음',
				leftLowerLimb: '운동장애없음',
				shoulderJoint: '제한없음',
				elbowJoint: '제한없음',
				wristFingerJoint: '제한없음',
				hipJoint: '제한없음',
				kneeJoint: '제한없음',
				ankleJoint: '제한없음',
				bodyPain: '없음',
				bedMovement: false,
				sitting: false,
				crawling: false,
				kneeling: false,
				standing: false,
				walking: false,
				wheelchairOperation: false,
				assistiveDeviceMovement: false,
				bowelBladder: '0',
				eating: '0',
				clothing: '0',
				personalHygiene: '0',
				gait: '0',
				bathing: '0',
				totalScore: '',
				evaluator: ''
			}));
			setSelectedDateIndex(null);
		} catch (err) {
			console.error('물리치료실적 평가 삭제 오류:', err);
			alert('물리치료실적 평가 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingEvaluations(false);
		}
	};

	// 총점 계산 함수
	const calculateTotalScore = () => {
		const scores = [
			parseInt(formData.bowelBladder) || 0,
			parseInt(formData.eating) || 0,
			parseInt(formData.clothing) || 0,
			parseInt(formData.personalHygiene) || 0,
			parseInt(formData.gait) || 0,
			parseInt(formData.bathing) || 0
		];
		const total = scores.reduce((sum, score) => sum + score, 0);
		setFormData(prev => ({ ...prev, totalScore: total.toString() }));
	};

	const tabs = ['운동', '관절', '동작', 'ADL1', 'ADL2', 'ADL3', '총점'];
	const isFormEnabled = !!selectedMember && (isCreatingNew || selectedDateIndex !== null);

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				<BeneficiaryListPanel selectedMember={selectedMember} onSelect={handleSelectMember} className="w-1/4" />

				{/* 우측 패널: 평가 폼 */}
				<div className={`relative flex flex-col flex-1 ${selectedMember ? 'bg-white' : 'bg-gray-100'}`}>
					{(!selectedMember || (selectedMember && !loadingEvaluations && evaluationDates.length === 0 && !isCreatingNew)) && (
						<div className="absolute inset-0 z-20 flex items-start justify-center pt-10 bg-gray-100/70">
							<div className="w-[min(520px,90%)] px-4 py-3 text-sm text-blue-900 bg-white border border-blue-200 rounded shadow-sm">
								<div className="font-medium">
									{!selectedMember ? '수급자를 선택해주세요.' : '등록된 평가가 없습니다.'}
								</div>
								{selectedMember && (
									<div className="mt-2 flex justify-end">
										<button
											onClick={handleNewEvaluation}
											className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-200 border border-blue-300 rounded hover:bg-blue-300"
										>
											신규등록
										</button>
									</div>
								)}
							</div>
						</div>
					)}
					{/* 상단: 탭과 수급자 필드 */}
					<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50">
						<div className="flex items-center gap-2">
							{tabs.map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									disabled={!isFormEnabled}
									className={`px-4 py-2 text-sm font-medium border border-blue-300 rounded ${
										activeTab === tab
											? 'bg-blue-500 text-white border-blue-500'
											: 'bg-white text-blue-900 hover:bg-blue-100'
									} disabled:opacity-50 disabled:cursor-not-allowed`}
								>
									{tab}
								</button>
							))}
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자</label>
							<input
								type="text"
								value={formData.beneficiary}
								readOnly
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[120px]"
							/>
						</div>
					</div>

					{selectedMember && !loadingEvaluations && evaluationDates.length > 0 && !isFormEnabled && (
						<div className="px-4 py-3 text-sm text-blue-900 border-b border-blue-100 bg-blue-50/40">
							좌측 목록에서 평가일자를 선택하거나, 신규등록을 눌러주세요.
						</div>
					)}

					{/* 메인 컨텐츠 영역 */}
					<div className={`flex-1 p-4 overflow-y-auto ${!isFormEnabled ? 'pointer-events-none opacity-60' : ''}`}>
						<div className="flex gap-4">
							{/* 왼쪽: 평가 폼 */}
							<div className="flex-1 space-y-4">
								{/* 작성일자 */}
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">작성일자</label>
									<input
										type="text"
										value={formData.evaluationDate}
										onChange={(e) => setFormData(prev => ({ ...prev, evaluationDate: e.target.value }))}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
										placeholder="YYYY-MM-DD"
									/>
								</div>

								{/* 탭별 컨텐츠 */}
								{activeTab === '운동' && (
									<div className="mt-6">
										<h2 className="mb-4 text-lg font-semibold text-blue-900">
											1. 운동장애 및 관절제한 평가 (운동장애정도)
										</h2>
										<div className="space-y-6">
											{/* (1) 우측상지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(1) 우측상지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightUpperLimb" value="운동장애없음" checked={formData.rightUpperLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, rightUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightUpperLimb" value="불완전운동장애" checked={formData.rightUpperLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightUpperLimb" value="완전운동장애" checked={formData.rightUpperLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
											{/* (2) 좌측상지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(2) 좌측상지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftUpperLimb" value="운동장애없음" checked={formData.leftUpperLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, leftUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftUpperLimb" value="불완전운동장애" checked={formData.leftUpperLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftUpperLimb" value="완전운동장애" checked={formData.leftUpperLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftUpperLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
											{/* (3) 우측하지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(3) 우측하지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightLowerLimb" value="운동장애없음" checked={formData.rightLowerLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, rightLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightLowerLimb" value="불완전운동장애" checked={formData.rightLowerLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="rightLowerLimb" value="완전운동장애" checked={formData.rightLowerLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, rightLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
											{/* (4) 좌측하지 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(4) 좌측하지</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftLowerLimb" value="운동장애없음" checked={formData.leftLowerLimb === '운동장애없음'} onChange={(e) => setFormData(prev => ({ ...prev, leftLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">운동장애없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftLowerLimb" value="불완전운동장애" checked={formData.leftLowerLimb === '불완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">불완전운동장애</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="leftLowerLimb" value="완전운동장애" checked={formData.leftLowerLimb === '완전운동장애'} onChange={(e) => setFormData(prev => ({ ...prev, leftLowerLimb: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">완전운동장애</span>
													</label>
												</div>
											</div>
										</div>
									</div>
								)}

								{activeTab === '관절' && (
									<div className="mt-6">
										<h2 className="mb-4 text-lg font-semibold text-blue-900">
											1. 운동장애 및 관절제한 평가 (관절제한정도)
										</h2>
										<div className="space-y-6">
											{['shoulderJoint', 'elbowJoint', 'wristFingerJoint', 'hipJoint', 'kneeJoint', 'ankleJoint'].map((joint, idx) => {
												const labels = ['어깨관절', '팔꿈치관절', '손목 및 수지관절', '고관절', '무릎관절', '발목관절'];
												const numbers = [5, 6, 7, 8, 9, 10];
												return (
													<div key={joint} className="space-y-2">
														<div className="text-sm font-medium text-blue-900">({numbers[idx]}) {labels[idx]}</div>
														<div className="flex gap-6 ml-4">
															<label className="flex items-center gap-2 cursor-pointer">
																<input type="radio" name={joint} value="제한없음" checked={formData[joint as keyof typeof formData] === '제한없음'} onChange={(e) => setFormData(prev => ({ ...prev, [joint]: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
																<span className="text-sm text-blue-900">제한없음</span>
															</label>
															<label className="flex items-center gap-2 cursor-pointer">
																<input type="radio" name={joint} value="좌/우관절제한" checked={formData[joint as keyof typeof formData] === '좌/우관절제한'} onChange={(e) => setFormData(prev => ({ ...prev, [joint]: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
																<span className="text-sm text-blue-900">좌/우관절제한</span>
															</label>
															<label className="flex items-center gap-2 cursor-pointer">
																<input type="radio" name={joint} value="양관절제한" checked={formData[joint as keyof typeof formData] === '양관절제한'} onChange={(e) => setFormData(prev => ({ ...prev, [joint]: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
																<span className="text-sm text-blue-900">양관절제한</span>
															</label>
														</div>
													</div>
												);
											})}
											{/* (11) 신체통증유무 */}
											<div className="space-y-2">
												<div className="text-sm font-medium text-blue-900">(11) 신체통증유무</div>
												<div className="flex gap-6 ml-4">
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="bodyPain" value="없음" checked={formData.bodyPain === '없음'} onChange={(e) => setFormData(prev => ({ ...prev, bodyPain: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">없음</span>
													</label>
													<label className="flex items-center gap-2 cursor-pointer">
														<input type="radio" name="bodyPain" value="있음" checked={formData.bodyPain === '있음'} onChange={(e) => setFormData(prev => ({ ...prev, bodyPain: e.target.value }))} className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500" />
														<span className="text-sm text-blue-900">있음</span>
													</label>
												</div>
											</div>
										</div>
									</div>
								)}

								{activeTab === '동작' && (
									<div className="mt-6">
										<h2 className="px-4 py-2 mb-4 text-lg font-semibold text-blue-900 bg-blue-100 border border-blue-300 rounded">
											2. 기본동작평가
										</h2>
										<div className="grid grid-cols-4 gap-4 mt-4">
											{[
												{ key: 'bedMovement', label: '침상이동 - 측면 & 침상위 이동' },
												{ key: 'sitting', label: '앉기' },
												{ key: 'crawling', label: '네발기기' },
												{ key: 'kneeling', label: '무릎서기' },
												{ key: 'standing', label: '기립' },
												{ key: 'walking', label: '보행' },
												{ key: 'wheelchairOperation', label: '휠체어 조작 및 이동' },
												{ key: 'assistiveDeviceMovement', label: '보장구 장착 이동' }
											].map((item) => (
												<label key={item.key} className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={formData[item.key as keyof typeof formData] as boolean}
														onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))}
														className="w-4 h-4 text-blue-500 border-blue-300 rounded focus:ring-blue-500"
													/>
													<span className="text-sm text-blue-900">{item.label}</span>
												</label>
											))}
										</div>
									</div>
								)}

								{activeTab === 'ADL1' && (
									<div className="mt-6 space-y-8">
										{/* 1. 대소변 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">1. 대소변</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '화장실을 완벽하게 사용할 수 있으며, 실금 현상이 전혀 없다.' },
													{ value: '1', label: '대소변을 볼 때 도움이 필요하며 가끔은 실금 현상이 있다.' },
													{ value: '2', label: '1주일에 1회 이상 수면중 대소변을 지리기도 한다.' },
													{ value: '4', label: '1주일에 1회 이상 낮 시간에 대소변을 지리기도 한다.' },
													{ value: '5', label: '대소변을 전혀 조절하지 못한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="bowelBladder"
															value={option.value}
															checked={formData.bowelBladder === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, bowelBladder: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
										{/* 2. 식사 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">2. 식사</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '도움 없이 혼자서 먹을 수 있다.' },
													{ value: '1', label: '식사중이나 특별한 음식을 먹을 때 약간의 도움이 필요하거나 식후 위생을 누군가 도와 주어야 한다.' },
													{ value: '2', label: '다른 사람의 중등 도의 도움을 받아 식사하며 지저분하게 식사한다.' },
													{ value: '4', label: '모든 식사를 다른 사람이 많이 도와 주어야 한다.' },
													{ value: '5', label: '스스로는 식사하지 못해 다른 사람이 먹여주어야 한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="eating"
															value={option.value}
															checked={formData.eating === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, eating: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
									</div>
								)}

								{activeTab === 'ADL2' && (
									<div className="mt-6 space-y-8">
										{/* 3. 복장 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">3. 복장</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '스스로 입고 벗을 수 있으며 자신의 옷장에서 옷을 고를 수 있다.' },
													{ value: '1', label: '옷이 미리골라져 있다면 입고 벗을 수 있다.' },
													{ value: '2', label: '미리 준비된 옷이라도 다른 사람이 약간 도와주어야 입을 수 있다.' },
													{ value: '4', label: '옷을 입을 때 많이 도와주어야 하는데, 협조 할 수 있다.' },
													{ value: '5', label: '전혀 스스로는 옷을 입을 수 없으며, 다른 사람이 입혀줄 때도 있다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="clothing"
															value={option.value}
															checked={formData.clothing === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, clothing: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
										{/* 4. 개인위생 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">4. 개인위생 (머리빗기, 양치질, 면도, 손발톱관리, 세면하기등)</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '다른 사람의 도움 없이도 항상 단정하게옷 입고 몸치장을 할 수 있다.' },
													{ value: '1', label: '적절한 몸치장을 스스로 할 수 있으나면도 같은 것들은 도움을 필요로 한다.' },
													{ value: '2', label: '몸치장에 다른 사람들의 도움과 규칙적인 감독을 필요로 한다.' },
													{ value: '4', label: '다른 사람들이 전적으로 몸치장을 도와주어야 하는데일단 몸치장을 한 다음에는 깨끗하게 유지할 수 있다.' },
													{ value: '5', label: '몸치장을 하고 유지하는데 다른 사람들이 적극적으로 도와주어야 한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="personalHygiene"
															value={option.value}
															checked={formData.personalHygiene === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, personalHygiene: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
									</div>
								)}

								{activeTab === 'ADL3' && (
									<div className="mt-6 space-y-8">
										{/* 5. 보행 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">5. 보행 (계단, 이동)</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '외출하여 스스로 걸어 다닐 수 있다.' },
													{ value: '1', label: '실내와 실외에서 걸어 다닐 수 있다.' },
													{ value: '2', label: '다른 사람의 도움을 받거나 walker, wheelchair등을 이용하여 움직일 수 있다.' },
													{ value: '4', label: '의자나 휠체어에 앉아 있을 수는 있는데 다른 사람의 도움 없이 움직일 수 없다.' },
													{ value: '5', label: '하루의 반 이상을 침대에 누운 상태로 지낸다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="gait"
															value={option.value}
															checked={formData.gait === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, gait: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
										{/* 6. 목욕하기 */}
										<div>
											<h3 className="mb-4 text-lg font-semibold text-blue-900">6. 목욕하기</h3>
											<div className="space-y-3">
												{[
													{ value: '0', label: '스스로 도움 없이 목욕할 수 있다.' },
													{ value: '1', label: '탕에 들어거고 나오는 것을 도와주면 혼자 목욕할 수 있다.' },
													{ value: '2', label: '얼굴과 손은 쉽게 씻지만 몸과 나머지 부분은 씻지 않는다.' },
													{ value: '4', label: '스스로 씻지는 못하나 다른 사람들이 목욕시킬 때 협조는 할 수 있다.' },
													{ value: '5', label: '스스로는 씻으려는 노력을 전혀 하지 않으며 다른 사람들이 씻어 주려해도 저항한다.' }
												].map((option) => (
													<label key={option.value} className="flex items-start gap-2 cursor-pointer">
														<input
															type="radio"
															name="bathing"
															value={option.value}
															checked={formData.bathing === option.value}
															onChange={(e) => setFormData(prev => ({ ...prev, bathing: e.target.value }))}
															className="w-4 h-4 mt-1 text-blue-500 border-blue-300 focus:ring-blue-500"
														/>
														<span className="text-sm text-blue-900">({option.value}) - {option.label}</span>
													</label>
												))}
											</div>
										</div>
									</div>
								)}

								{activeTab === '총점' && (
									<div className="mt-6">
										<div className="flex gap-4 mb-6">
											<div className="flex items-center gap-2">
												<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">총점</label>
												<input
													type="text"
													value={formData.totalScore}
													readOnly
													className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-gray-50 min-w-[150px]"
												/>
											</div>
											<button
												onClick={calculateTotalScore}
												className="px-4 py-2 text-sm font-medium text-red-600 bg-yellow-300 border border-yellow-400 rounded hover:bg-yellow-400"
											>
												총점계산
											</button>
										</div>
										<div className="mb-4 text-sm text-blue-900">
											<div>6개 항목에 0점부터 5점까지 배점</div>
											<div>총점: 0점(완전 독립수행) - 30점(완전도움의존)</div>
										</div>
										<div className="flex items-center gap-2 mt-6">
											<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">평가</label>
											<div className="flex-1 h-64 bg-white border border-blue-300 rounded"></div>
										</div>
										<div className="flex items-center gap-2 mt-4">
											<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">평가자</label>
											<input
												type="text"
												value={formData.evaluator}
												onChange={(e) => setFormData(prev => ({ ...prev, evaluator: e.target.value }))}
												className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[200px]"
												placeholder="평가자명"
											/>
										</div>
									</div>
								)}
							</div>

							{/* 오른쪽: 버튼 영역 */}
							<div className="flex flex-col gap-2">
								{activeTab !== '총점' && (
									<button
										onClick={handleDelete}
										disabled={!isFormEnabled || loadingEvaluations || selectedDateIndex === null}
										className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap"
									>
										삭제
									</button>
								)}
								<button
									onClick={handleSave}
									disabled={!isFormEnabled || loadingEvaluations}
									className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
								>
									저장
								</button>
								<button
									onClick={handleNewEvaluation}
									disabled={!selectedMember || loadingEvaluations}
									className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
								>
									신규등록
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
