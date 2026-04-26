"use client";

import { useState, useEffect } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

export default function LongtermBeneficiaryStatus() {
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

	const handleSave = () => {
		// TODO: API 호출 등 실제 저장 로직 구현
		console.log({
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
		});
		alert('수급자 현황이 저장되었습니다.');
	};

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-1/3 shrink-0">
						<MemberListPanel />
					</aside>

					{/* 우측: 수급자 현황 입력 */}
					<section className="flex-1">
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
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">치매</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={stroke}
												onChange={(e) => setStroke(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">중풍</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={hypertension}
												onChange={(e) => setHypertension(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">고혈압</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={diabetes}
												onChange={(e) => setDiabetes(e.target.checked)}
												className="w-4 h-4 border border-blue-300 rounded"
											/>
											<span className="text-sm text-blue-900">당뇨</span>
										</label>
										<label className="flex items-center gap-1 cursor-pointer">
											<input
												type="checkbox"
												checked={arthritis}
												onChange={(e) => setArthritis(e.target.checked)}
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
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">기타</span>
											</label>
											<input
												type="text"
												value={otherDiseaseText}
												onChange={(e) => setOtherDiseaseText(e.target.value)}
												disabled={!otherDisease}
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
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">욕창(부위:</span>
											</label>
											<input
												type="text"
												value={pressureSoreArea}
												onChange={(e) => setPressureSoreArea(e.target.value)}
												disabled={!pressureSore}
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
													className="w-4 h-4 border border-blue-300 rounded"
												/>
												<span className="text-sm text-blue-900">욕창방지 보조도구(</span>
											</label>
											<input
												type="text"
												value={pressureSorePreventionTool}
												onChange={(e) => setPressureSorePreventionTool(e.target.value)}
												disabled={!pressureSorePrevention}
												className="px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="보조도구 입력"
											/>
											<span className="text-sm text-blue-900">)</span>
										</div>
									</div>
								</div>

								{/* 저장 버튼 */}
								<div className="pt-4">
									<button
										onClick={handleSave}
										className="w-full px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
									>
										저장
									</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
