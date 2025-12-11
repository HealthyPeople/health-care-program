"use client";
import React, { useState } from 'react';

export default function ProgramPlanRegistration() {
	const [formData, setFormData] = useState({
		programName: '감각인지활동',
		programClassification: '인지기능강화',
		programSchedule: '2025-01-01 ~ 2025-12-31',
		executionCycle: '주',
		frequency: '1',
		targetAudience: '인지기능검사 불가한 어르신',
		programLocation: '지층 프로그램실',
		facilitator: '사회복지사',
		assistantFacilitator: '',
		objectives: [
			'올록볼록한 고무판, 곡물오재미를 누르며 감각을 인지할 수 있다',
			'고무판, 곡물오재미를 누르며 소근육을 강화할 수 있다'
		],
		materials: [
			'다양한 모양의 고무판',
			'곡물오재미 주무르기'
		],
		preparation: [
			'다양한 모양의 고무판, 오재미를 준비한 뒤 어떤활동을 할지 먼저 시범을 보인다.',
			'어르신들께 고무판, 곡물오재미를 나눠드린다.'
		],
		execution: [
			'다양한 고무판, 오재미를 직접 누를 수 있도록 도움을 제공한다.',
			'다 눌렀으면 뒤집어서 한번 더 누를수 있게 한다.',
			'다 해봤으면 다른 모양의 고무판을 제공하여 활동을 할 수 있도록 한다.'
		]
	});

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="mx-auto max-w-[1200px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 프로그램 목록 */}
					<aside className="w-72 shrink-0">
						<div className="border border-blue-300 rounded-lg overflow-hidden bg-white shadow-sm">
							<div className="bg-blue-100 border-b border-blue-300 px-3 py-2 text-blue-900 font-semibold">프로그램 목록</div>
							{/* 상단 상태/검색 영역 */}
							<div className="px-3 py-2 border-b border-blue-100 space-y-2">
								<div className="text-xs text-blue-900/80">프로그램명/분류 검색</div>
								<input className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white" placeholder="예) 인지활동 / 운동프로그램" />
								<button className="w-full text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 py-1">검색</button>
							</div>
							{/* 목록 테이블 */}
							<div className="max-h-[540px] overflow-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 bg-blue-50 border-b border-blue-200">
										<tr>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">프로그램명</th>
											<th className="text-left px-2 py-2 text-blue-900 font-semibold">분류</th>
										</tr>
									</thead>
									<tbody>
										{[
											{ name: '인지활동', category: '인지프로그램' },
											{ name: '신체운동', category: '운동프로그램' },
											{ name: '음악치료', category: '예술프로그램' },
											{ name: '원예치료', category: '자연치료' },
											{ name: '요리활동', category: '생활프로그램' },
										].map((row, idx) => (
										<tr key={idx} className="border-b border-blue-50 hover:bg-blue-50 cursor-pointer">
											<td className="px-2 py-2">{row.name}</td>
											<td className="px-2 py-2">{row.category}</td>
										</tr>
									))}
									</tbody>
								</table>
							</div>
						</div>
					</aside>

					{/* 우측: 프로그램 계획서 상세 영역 */}
					<section className="flex-1 space-y-4">
						{/* 상단 정보 영역 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<div className="grid grid-cols-2 gap-4">
								{/* 1행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 명</label>
									<input
										type="text"
										value={formData.programName}
										onChange={(e) => setFormData(prev => ({ ...prev, programName: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 구분</label>
									<select
										value={formData.programClassification}
										onChange={(e) => setFormData(prev => ({ ...prev, programClassification: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm"
									>
										<option>인지기능강화</option>
										<option>운동프로그램</option>
										<option>예술프로그램</option>
										<option>자연치료</option>
										<option>생활프로그램</option>
									</select>
								</div>

								{/* 2행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 일정</label>
									<input
										type="text"
										value={formData.programSchedule}
										onChange={(e) => setFormData(prev => ({ ...prev, programSchedule: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm"
										placeholder="2025-01-01 ~ 2025-12-31"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">실행주기</label>
									<div className="flex items-center gap-3 flex-1">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												name="executionCycle"
												value="주"
												checked={formData.executionCycle === '주'}
												onChange={(e) => setFormData(prev => ({ ...prev, executionCycle: e.target.value }))}
												className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
											/>
											<span className="text-sm text-blue-900">주</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												name="executionCycle"
												value="월"
												checked={formData.executionCycle === '월'}
												onChange={(e) => setFormData(prev => ({ ...prev, executionCycle: e.target.value }))}
												className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
											/>
											<span className="text-sm text-blue-900">월</span>
										</label>
										<label className="flex items-center gap-2">
											<span className="text-sm text-blue-900">횟수</span>
											<input
												type="text"
												value={formData.frequency}
												onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
												className="w-16 border border-blue-300 rounded px-2 py-1 text-sm bg-white"
											/>
										</label>
									</div>
								</div>

								{/* 3행 */}
								<div className="flex items-start gap-2 col-span-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">대상자</label>
									<textarea
										value={formData.targetAudience}
										onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm min-h-[60px]"
										rows={2}
									/>
								</div>

								{/* 4행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">프로그램 장소</label>
									<input
										type="text"
										value={formData.programLocation}
										onChange={(e) => setFormData(prev => ({ ...prev, programLocation: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">진행자</label>
									<input
										type="text"
										value={formData.facilitator}
										onChange={(e) => setFormData(prev => ({ ...prev, facilitator: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm"
									/>
								</div>

								{/* 5행 */}
								<div className="flex items-center gap-2">
									<label className="w-28 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900 whitespace-nowrap">보조 진행자</label>
									<input
										type="text"
										value={formData.assistantFacilitator}
										onChange={(e) => setFormData(prev => ({ ...prev, assistantFacilitator: e.target.value }))}
										className="flex-1 border border-blue-300 rounded px-2 py-1.5 bg-white text-sm"
									/>
								</div>
							</div>
						</div>

						{/* 프로그램 목표 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<h3 className="mb-3 text-lg font-semibold text-blue-900">프로그램 목표</h3>
							<div className="space-y-2">
								{formData.objectives.map((objective, index) => (
									<div key={index} className="flex items-start gap-2">
										<span className="text-blue-900 mt-1">•</span>
										<input
											type="text"
											value={objective}
											onChange={(e) => {
												const newObjectives = [...formData.objectives];
												newObjectives[index] = e.target.value;
												setFormData(prev => ({ ...prev, objectives: newObjectives }));
											}}
											className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white text-sm"
										/>
									</div>
								))}
							</div>
						</div>

						{/* 준비물 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<h3 className="mb-3 text-lg font-semibold text-blue-900">준비물</h3>
							<div className="space-y-2">
								{formData.materials.map((material, index) => (
									<div key={index} className="flex items-start gap-2">
										<span className="text-blue-900 mt-1">•</span>
										<input
											type="text"
											value={material}
											onChange={(e) => {
												const newMaterials = [...formData.materials];
												newMaterials[index] = e.target.value;
												setFormData(prev => ({ ...prev, materials: newMaterials }));
											}}
											className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white text-sm"
										/>
									</div>
								))}
							</div>
						</div>

						{/* 프로그램운영과정 및 내용 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm p-4">
							<h3 className="mb-3 text-lg font-semibold text-blue-900">프로그램운영과정 및 내용</h3>
							
							{/* 준비 */}
							<div className="mb-4">
								<h4 className="mb-2 text-base font-medium text-blue-900">준비 (5분)</h4>
								<div className="space-y-2 ml-4">
									{formData.preparation.map((item, index) => (
										<div key={index} className="flex items-start gap-2">
											<span className="text-blue-900 mt-1">•</span>
											<input
												type="text"
												value={item}
												onChange={(e) => {
													const newPreparation = [...formData.preparation];
													newPreparation[index] = e.target.value;
													setFormData(prev => ({ ...prev, preparation: newPreparation }));
												}}
												className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white text-sm"
											/>
										</div>
									))}
								</div>
							</div>

							{/* 진행 */}
							<div>
								<h4 className="mb-2 text-base font-medium text-blue-900">진행 (10~20분)</h4>
								<div className="space-y-2 ml-4">
									{formData.execution.map((item, index) => (
										<div key={index} className="flex items-start gap-2">
											<span className="text-blue-900 mt-1">•</span>
											<input
												type="text"
												value={item}
												onChange={(e) => {
													const newExecution = [...formData.execution];
													newExecution[index] = e.target.value;
													setFormData(prev => ({ ...prev, execution: newExecution }));
												}}
												className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white text-sm"
											/>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* 하단 버튼 */}
						<div className="flex justify-end">
							<button className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">
								프로그램계획서 복사
							</button>
						</div>
					</section>
				</div>
			</div>
		</div>
    );
}
