"use client";

import { useState, useEffect } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

export default function LongtermBeneficiaryStatus() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loadingDefaults, setLoadingDefaults] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [originalDraft, setOriginalDraft] = useState<Record<string, any> | null>(null);

	// 상태 관련 state
	const [status, setStatus] = useState<'와상' | '준와상' | '자립'>('준와상');

	// 질병 관련 state
	const [dementia, setDementia] = useState(true);
	const [stroke, setStroke] = useState(true);
	const [hypertension, setHypertension] = useState(true);
	const [diabetes, setDiabetes] = useState(true);
	const [arthritis, setArthritis] = useState(true);
	const [otherDisease, setOtherDisease] = useState(false);
	const [otherDiseaseText, setOtherDiseaseText] = useState('');

	// 보조 관련 state
	const [tracheostomy, setTracheostomy] = useState(true);
	const [dentures, setDentures] = useState(true);
	const [denturesType, setDenturesType] = useState<'부분' | '전체'>('부분');
	const [nasogastricTube, setNasogastricTube] = useState(true);
	const [urinaryCatheter, setUrinaryCatheter] = useState(true);
	const [cystostomy, setCystostomy] = useState(true);
	const [urostomy, setUrostomy] = useState(true);
	const [colostomy, setColostomy] = useState(true);
	const [diaper, setDiaper] = useState(true);
	const [pressureSore, setPressureSore] = useState(true);
	const [pressureSoreArea, setPressureSoreArea] = useState('');
	const [pressureSorePrevention, setPressureSorePrevention] = useState(true);
	const [pressureSorePreventionTool, setPressureSorePreventionTool] = useState('');

	const selectedPnum = String(selectedMember?.PNUM ?? '').trim();

	// F30112에 현황 정보를 JSON으로 저장 (컬럼 존재 여부는 API에서 자동 필터링)
	const buildDraft = () => ({
		RG_JSON: JSON.stringify({
			status,
			dementia,
			stroke,
			hypertension,
			diabetes,
			arthritis,
			otherDisease,
			otherDiseaseText,
			tracheostomy,
			dentures,
			denturesType,
			nasogastricTube,
			urinaryCatheter,
			cystostomy,
			urostomy,
			colostomy,
			diaper,
			pressureSore,
			pressureSoreArea,
			pressureSorePrevention,
			pressureSorePreventionTool
		}),
		// 호환용: RG_JSON 컬럼이 없다면 아래 중 하나가 존재할 가능성이 있어 함께 전송
		RG_ETC_DESC: JSON.stringify({
			status,
			dementia,
			stroke,
			hypertension,
			diabetes,
			arthritis,
			otherDisease,
			otherDiseaseText,
			tracheostomy,
			dentures,
			denturesType,
			nasogastricTube,
			urinaryCatheter,
			cystostomy,
			urostomy,
			colostomy,
			diaper,
			pressureSore,
			pressureSoreArea,
			pressureSorePrevention,
			pressureSorePreventionTool
		}),
		NS_ETC_DESC: JSON.stringify({
			beneficiaryStatus: {
				status,
				dementia,
				stroke,
				hypertension,
				diabetes,
				arthritis,
				otherDisease,
				otherDiseaseText,
				tracheostomy,
				dentures,
				denturesType,
				nasogastricTube,
				urinaryCatheter,
				cystostomy,
				urostomy,
				colostomy,
				diaper,
				pressureSore,
				pressureSoreArea,
				pressureSorePrevention,
				pressureSorePreventionTool
			}
		})
	});

	const applyDraft = (d: any) => {
		const pickJson = () => {
			const raw = d?.RG_JSON ?? d?.RG_ETC_DESC ?? d?.NS_ETC_DESC ?? '';
			if (!raw) return null;
			try {
				const obj = JSON.parse(String(raw));
				// NS_ETC_DESC에 래핑된 경우
				if (obj?.beneficiaryStatus) return obj.beneficiaryStatus;
				return obj;
			} catch {
				return null;
			}
		};
		const j = pickJson();
		if (!j) return;
		if (j.status) setStatus(j.status);
		if (typeof j.dementia === 'boolean') setDementia(j.dementia);
		if (typeof j.stroke === 'boolean') setStroke(j.stroke);
		if (typeof j.hypertension === 'boolean') setHypertension(j.hypertension);
		if (typeof j.diabetes === 'boolean') setDiabetes(j.diabetes);
		if (typeof j.arthritis === 'boolean') setArthritis(j.arthritis);
		if (typeof j.otherDisease === 'boolean') setOtherDisease(j.otherDisease);
		if (typeof j.otherDiseaseText === 'string') setOtherDiseaseText(j.otherDiseaseText);
		if (typeof j.tracheostomy === 'boolean') setTracheostomy(j.tracheostomy);
		if (typeof j.dentures === 'boolean') setDentures(j.dentures);
		if (j.denturesType) setDenturesType(j.denturesType);
		if (typeof j.nasogastricTube === 'boolean') setNasogastricTube(j.nasogastricTube);
		if (typeof j.urinaryCatheter === 'boolean') setUrinaryCatheter(j.urinaryCatheter);
		if (typeof j.cystostomy === 'boolean') setCystostomy(j.cystostomy);
		if (typeof j.urostomy === 'boolean') setUrostomy(j.urostomy);
		if (typeof j.colostomy === 'boolean') setColostomy(j.colostomy);
		if (typeof j.diaper === 'boolean') setDiaper(j.diaper);
		if (typeof j.pressureSore === 'boolean') setPressureSore(j.pressureSore);
		if (typeof j.pressureSoreArea === 'string') setPressureSoreArea(j.pressureSoreArea);
		if (typeof j.pressureSorePrevention === 'boolean') setPressureSorePrevention(j.pressureSorePrevention);
		if (typeof j.pressureSorePreventionTool === 'string') setPressureSorePreventionTool(j.pressureSorePreventionTool);
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
						RG_JSON: row.RG_JSON,
						RG_ETC_DESC: row.RG_ETC_DESC,
						NS_ETC_DESC: row.NS_ETC_DESC
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

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<MemberListPanel onSelectMember={handleSelectMember} />
					</aside>

					{/* 우측: 수급자 현황 입력 */}
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
								<h2 className="text-xl font-semibold text-blue-900">수급자 현황</h2>
							</div>

							<div className="p-4 space-y-4">
								{/* 상태 섹션 */}
								<div className="space-y-2">
									<button className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										상태
									</button>
									<div className="flex items-center gap-4">
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="status"
												value="와상"
												checked={status === '와상'}
												onChange={(e) => setStatus(e.target.value as '와상' | '준와상' | '자립')}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">와상</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="status"
												value="준와상"
												checked={status === '준와상'}
												onChange={(e) => setStatus(e.target.value as '와상' | '준와상' | '자립')}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">준와상</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="radio"
												name="status"
												value="자립"
												checked={status === '자립'}
												onChange={(e) => setStatus(e.target.value as '와상' | '준와상' | '자립')}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300"
											/>
											<span className="text-sm text-blue-900">자립</span>
										</label>
									</div>
								</div>

								{/* 질병 섹션 */}
								<div className="space-y-2">
									<button className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										질병
									</button>
									<div className="flex flex-wrap items-center gap-4">
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={dementia}
												onChange={(e) => setDementia(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">치매</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={stroke}
												onChange={(e) => setStroke(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">중풍</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={hypertension}
												onChange={(e) => setHypertension(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">고혈압</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={diabetes}
												onChange={(e) => setDiabetes(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">당뇨</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={arthritis}
												onChange={(e) => setArthritis(e.target.checked)}
												disabled={!isEditing}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">관절염</span>
										</label>
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={otherDisease}
													onChange={(e) => setOtherDisease(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기타</span>
											</label>
											<input
												type="text"
												value={otherDiseaseText}
												onChange={(e) => setOtherDiseaseText(e.target.value)}
												disabled={!isEditing || !otherDisease}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="기타 질병 입력"
											/>
										</div>
									</div>
								</div>

								{/* 보조 섹션 */}
								<div className="space-y-2">
									<button className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded">
										보조
									</button>
									<div className="space-y-2">
										{/* 기관지절개관 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={tracheostomy}
													onChange={(e) => setTracheostomy(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기관지절개관</span>
											</label>
										</div>

										{/* 틀니 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={dentures}
													onChange={(e) => setDentures(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">틀니</span>
											</label>
											{dentures && (
												<div className="flex items-center gap-3 ml-4">
													<label className="flex items-center gap-1 cursor-pointer">
														<input
															type="radio"
															name="denturesType"
															value="부분"
															checked={denturesType === '부분'}
															onChange={(e) => setDenturesType(e.target.value as '부분' | '전체')}
															disabled={!isEditing}
															className="w-4 h-4 border border-blue-300"
														/>
														<span className="text-sm text-blue-900">부분</span>
													</label>
													<label className="flex items-center gap-1 cursor-pointer">
														<input
															type="radio"
															name="denturesType"
															value="전체"
															checked={denturesType === '전체'}
															onChange={(e) => setDenturesType(e.target.value as '부분' | '전체')}
															disabled={!isEditing}
															className="w-4 h-4 border border-blue-300"
														/>
														<span className="text-sm text-blue-900">전체</span>
													</label>
												</div>
											)}
										</div>

										{/* 비위관(L-tube) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={nasogastricTube}
													onChange={(e) => setNasogastricTube(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">비위관(L-tube)</span>
											</label>
										</div>

										{/* 고정소변배출관(유치도뇨관) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={urinaryCatheter}
													onChange={(e) => setUrinaryCatheter(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">고정소변배출관(유치도뇨관)</span>
											</label>
										</div>

										{/* 방광루 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={cystostomy}
													onChange={(e) => setCystostomy(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">방광루</span>
											</label>
										</div>

										{/* 요루(요도샛길) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={urostomy}
													onChange={(e) => setUrostomy(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">요루(요도샛길)</span>
											</label>
										</div>

										{/* 장루(창자샛길) */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={colostomy}
													onChange={(e) => setColostomy(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">장루(창자샛길)</span>
											</label>
										</div>

										{/* 기저귀 */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={diaper}
													onChange={(e) => setDiaper(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기저귀</span>
											</label>
										</div>

										{/* 욕창(부위: */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={pressureSore}
													onChange={(e) => setPressureSore(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">욕창(부위:</span>
											</label>
											<input
												type="text"
												value={pressureSoreArea}
												onChange={(e) => setPressureSoreArea(e.target.value)}
												disabled={!isEditing || !pressureSore}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="욕창 부위 입력"
											/>
										</div>

										{/* 욕창방지 보조도구( */}
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 cursor-pointer">
												<input
													type="checkbox"
													checked={pressureSorePrevention}
													onChange={(e) => setPressureSorePrevention(e.target.checked)}
													disabled={!isEditing}
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">욕창방지 보조도구(</span>
											</label>
											<input
												type="text"
												value={pressureSorePreventionTool}
												onChange={(e) => setPressureSorePreventionTool(e.target.value)}
												disabled={!isEditing || !pressureSorePrevention}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="보조도구 입력"
											/>
											<span className="text-sm text-blue-900">)</span>
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
