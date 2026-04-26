"use client";

import { useState, useEffect } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

export default function LongtermFunctionalCognitive() {
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

	const handleSave = () => {
		// TODO: API 호출 등 실제 저장 로직 구현
		console.log({
			physicalCognitiveProgram,
			physicalFunctionTraining,
			cognitiveTraining,
			physicalTherapy,
			preparerName,
			cognitiveSupport,
			communicationSupport,
			cognitivePreparerName
		});
		alert('기능인지 정보가 저장되었습니다.');
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
						<MemberListPanel />
					</aside>

					{/* 우측: 기능인지 입력 */}
					<section className="flex-1">
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
												onChange={(e) => setPhysicalFunctionTraining(e.target.checked)}
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
												onChange={(e) => setCommunicationSupport(e.target.checked)}
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
														setCognitivePreparerName(value);
														setCognitivePreparerSearchTerm(value);
														if (!value || value.trim() === '') {
															setCognitivePreparerSuggestions([]);
															setShowCognitivePreparerDropdown(false);
														}
													}}
													onFocus={() => {
														if (cognitivePreparerName) {
															setCognitivePreparerSearchTerm(cognitivePreparerName);
														}
														if (cognitivePreparerSearchTerm && cognitivePreparerSearchTerm.trim() !== '') {
															searchEmployee(cognitivePreparerSearchTerm, setCognitivePreparerSuggestions, setShowCognitivePreparerDropdown);
														}
													}}
													className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													placeholder="작성자 검색"
												/>
												{showCognitivePreparerDropdown && cognitivePreparerSuggestions.length > 0 && (
													<div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border border-blue-300 rounded shadow-lg max-h-40">
														{cognitivePreparerSuggestions.map((employee, index) => (
															<div
																key={`${employee.EMPNO}-${index}`}
																onClick={() => {
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
