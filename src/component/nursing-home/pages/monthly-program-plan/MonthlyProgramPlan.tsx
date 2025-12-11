"use client";
import React, { useState, useEffect } from 'react';

interface Program {
	id: string;
	category: string;
	name: string;
	goals?: string[];
}

export default function MonthlyProgramPlan() {
	const [executionYearMonth, setExecutionYearMonth] = useState('2025-12');
	const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
	const [selectedPrograms, setSelectedPrograms] = useState<Program[]>([]);
	const [selectedAvailableIndex, setSelectedAvailableIndex] = useState<number | null>(null);
	const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
	const [selectedDetailProgram, setSelectedDetailProgram] = useState<Program | null>(null);

	// 프로그램 설정 폼 데이터
	const [programConfig, setProgramConfig] = useState({
		programName: '',
		category: '',
		cycle: '주', // 주/월
		executionCount: '',
		remarks: ''
	});

	// 사용 가능한 프로그램 목록 (임시 데이터)
	useEffect(() => {
		const mockPrograms: Program[] = [
			{ id: '1', category: '인지기능강화', name: '감각인지활동', goals: ['올록볼록한 고무판, 곡물오재미를 누르며 감각을 인지할 수 있다', '고무판, 곡물오재미를 누르며 소근육을 강화할 수 있다'] },
			{ id: '2', category: '인지기능강화', name: '감각인지활동 - 만득이 만지기' },
			{ id: '3', category: '인지기능강화', name: '감각인지활동 - 오재미 주무르기' },
			{ id: '4', category: '인지기능강화', name: '감각인지활동 - 고무판누르기' },
			{ id: '5', category: '인지기능강화', name: '게골게임' },
			{ id: '6', category: '인지기능강화', name: '기억아! 기억아!' },
			{ id: '7', category: '인지기능강화', name: '꽃꽂이' },
			{ id: '8', category: '인지기능강화', name: '영화감상' },
			{ id: '9', category: '인지기능강화', name: '오늘의 방송' },
			{ id: '10', category: '인지기능강화', name: '워크북' },
			{ id: '11', category: '인지기능강화', name: '인지강화활동' },
			{ id: '12', category: '인지기능강화', name: '인지강화활동 - 미로찾기(6-B)' },
			{ id: '13', category: '인지기능강화', name: '인지강화활동 - 회상하기(6-A)' },
			{ id: '14', category: '인지기능강화', name: '인지강화활동 - 도형 맞추기/도형찾기' },
			{ id: '15', category: '인지기능강화', name: '인지강화활동 - 분류화 하기' },
			{ id: '16', category: '인지기능강화', name: '인지강화활동 - 색종이 찢어 붙이기' },
			{ id: '17', category: '인지기능강화', name: '인지강화활동 - 색칠하기(6-F)' },
			{ id: '18', category: '인지기능강화', name: '인지강화활동 - 실 꿰기' }
		];
		setAvailablePrograms(mockPrograms);
	}, []);

	// 날짜 형식 변환 (YYYY-MM -> YYYY년MM월)
	const formatYearMonth = (dateStr: string) => {
		if (!dateStr) return '';
		const [year, month] = dateStr.split('-');
		return `${year}년${month}월`;
	};

	// 날짜 형식 변환 (YYYY년MM월 -> YYYY-MM)
	const parseYearMonth = (dateStr: string) => {
		if (!dateStr) return '';
		const match = dateStr.match(/(\d{4})년(\d{1,2})월/);
		if (match) {
			const year = match[1];
			const month = match[2].padStart(2, '0');
			return `${year}-${month}`;
		}
		return dateStr;
	};

	// 추가 함수 (왼쪽 -> 오른쪽)
	const handleAdd = () => {
		if (selectedAvailableIndex === null) {
			alert('추가할 프로그램을 선택해주세요.');
			return;
		}

		const programToAdd = availablePrograms[selectedAvailableIndex];
		if (!selectedPrograms.find(p => p.id === programToAdd.id)) {
			setSelectedPrograms([...selectedPrograms, { ...programToAdd }]);
			setSelectedAvailableIndex(null);
		} else {
			alert('이미 추가된 프로그램입니다.');
		}
	};

	// 삭제 함수 (오른쪽 -> 왼쪽)
	const handleRemove = () => {
		if (selectedProgramIndex === null) {
			alert('삭제할 프로그램을 선택해주세요.');
			return;
		}

		const updatedPrograms = selectedPrograms.filter((_, index) => index !== selectedProgramIndex);
		setSelectedPrograms(updatedPrograms);
		setSelectedProgramIndex(null);
		
		if (selectedDetailProgram && selectedPrograms[selectedProgramIndex]?.id === selectedDetailProgram.id) {
			setSelectedDetailProgram(null);
			setProgramConfig({
				programName: '',
				category: '',
				cycle: '주',
				executionCount: '',
				remarks: ''
			});
		}
	};

	// 프로그램 선택 함수 (왼쪽 목록)
	const handleSelectAvailable = (index: number) => {
		setSelectedAvailableIndex(index);
		const program = availablePrograms[index];
		setSelectedDetailProgram(program);
		setProgramConfig({
			programName: program.name,
			category: program.category,
			cycle: '주',
			executionCount: '',
			remarks: ''
		});
	};

	// 프로그램 선택 함수 (오른쪽 목록)
	const handleSelectProgram = (index: number) => {
		setSelectedProgramIndex(index);
		const program = selectedPrograms[index];
		setSelectedDetailProgram(program);
		setProgramConfig({
			programName: program.name,
			category: program.category,
			cycle: '주',
			executionCount: '',
			remarks: ''
		});
	};

	// 계획 검색 함수
	const handleSearch = async () => {
		// TODO: 실제 API 엔드포인트로 변경 필요
		// const url = `/api/monthly-program-plan/search?yearMonth=${executionYearMonth}`;
		// const response = await fetch(url);
		// const result = await response.json();
		
		alert('계획 검색 기능은 준비 중입니다.');
	};

	// 전월 수행계획 이관 함수
	const handleTransferPreviousMonth = async () => {
		// TODO: 실제 API 엔드포인트로 변경 필요
		// const url = `/api/monthly-program-plan/transfer-previous`;
		// const response = await fetch(url);
		// const result = await response.json();
		
		alert('전월 수행계획 이관 기능은 준비 중입니다.');
	};

	// 저장 함수
	const handleSave = async () => {
		if (!programConfig.programName) {
			alert('프로그램명을 입력해주세요.');
			return;
		}

		if (!programConfig.executionCount) {
			alert('시행횟수를 입력해주세요.');
			return;
		}

		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = '/api/monthly-program-plan/save';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		yearMonth: executionYearMonth,
			// 		...programConfig
			// 	})
			// });

			alert('프로그램이 저장되었습니다.');
		} catch (err) {
			console.error('프로그램 저장 오류:', err);
			alert('프로그램 저장 중 오류가 발생했습니다.');
		}
	};

	// 출력 함수
	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50">
				<h1 className="text-xl font-semibold text-blue-900">(월)치료프로그램 수행 계획</h1>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-blue-900">수행년월</label>
						<input
							type="month"
							value={executionYearMonth}
							onChange={(e) => setExecutionYearMonth(e.target.value)}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={handleSearch}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							계획검색
						</button>
						<button
							onClick={handleTransferPreviousMonth}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							전월수행계획이관
						</button>
						<button
							onClick={() => window.close()}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>
			</div>

			{/* 메인 컨텐츠 영역 */}
			<div className="flex flex-1 overflow-hidden">
				{/* 왼쪽: 사용 가능한 프로그램 목록 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<h3 className="text-sm font-semibold text-blue-900">사용 가능한 프로그램</h3>
					</div>
					<div className="flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">프로그램구분명</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900">프로그램명</th>
								</tr>
							</thead>
							<tbody>
								{availablePrograms.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">프로그램이 없습니다</td>
									</tr>
								) : (
									availablePrograms.map((program, index) => (
										<tr
											key={program.id}
											onClick={() => handleSelectAvailable(index)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedAvailableIndex === index ? 'bg-blue-100' : ''
											}`}
										>
											<td className="px-3 py-2 text-center border-r border-blue-100">{program.category}</td>
											<td className="px-3 py-2 text-center">{program.name}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* 중간: 버튼 영역 */}
				<div className="flex flex-col items-center justify-center w-32 gap-4 p-4 bg-white border-r border-blue-200">
					<button
						onClick={handleAdd}
						className="w-full px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						추가 =&gt;
					</button>
					<button
						onClick={handleRemove}
						className="w-full px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						&lt;=삭제
					</button>
					<button
						onClick={handlePrint}
						className="w-full px-3 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						출력
					</button>
				</div>

				{/* 오른쪽: 선택된 프로그램 목록 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<h3 className="text-sm font-semibold text-blue-900">선택된 프로그램</h3>
					</div>
					<div className="flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
								<tr>
									<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">프로그램구분명</th>
									<th className="px-3 py-2 font-semibold text-center text-blue-900">프로그램명</th>
								</tr>
							</thead>
							<tbody>
								{selectedPrograms.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-3 py-4 text-center text-blue-900/60">선택된 프로그램이 없습니다</td>
									</tr>
								) : (
									selectedPrograms.map((program, index) => (
										<tr
											key={program.id}
											onClick={() => handleSelectProgram(index)}
											className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
												selectedProgramIndex === index ? 'bg-blue-100' : ''
											}`}
										>
											<td className="px-3 py-2 text-center border-r border-blue-100">{program.category}</td>
											<td className="px-3 py-2 text-center">{program.name}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* 하단 영역 */}
			<div className="flex flex-1 overflow-hidden border-t border-blue-200">
				{/* 왼쪽: 프로그램 상세 정보 */}
				<div className="flex flex-col w-1/2 p-4 bg-white border-r border-blue-200">
					<h3 className="mb-4 text-lg font-semibold text-blue-900">프로그램 상세</h3>
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<label className="w-20 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">구분</label>
							<input
								type="text"
								value={selectedDetailProgram?.category || ''}
								readOnly
								className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-20 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">명</label>
							<input
								type="text"
								value={selectedDetailProgram?.name || ''}
								readOnly
								className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-gray-50"
							/>
						</div>
						<div className="flex items-start gap-2">
							<label className="w-20 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">목표</label>
							<div className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-blue-300 rounded min-h-[120px]">
								{selectedDetailProgram?.goals && selectedDetailProgram.goals.length > 0 ? (
									<ul className="space-y-1 list-disc list-inside">
										{selectedDetailProgram.goals.map((goal, index) => (
											<li key={index} className="text-blue-900">{goal}</li>
										))}
									</ul>
								) : (
									<span className="text-blue-900/60">목표가 없습니다</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* 오른쪽: 프로그램 설정 및 저장 */}
				<div className="flex flex-col w-1/2 p-4 bg-white">
					<h3 className="mb-4 text-lg font-semibold text-blue-900">프로그램 설정</h3>
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">프로그램명</label>
							<input
								type="text"
								value={programConfig.programName}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, programName: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">구분</label>
							<input
								type="text"
								value={programConfig.category}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, category: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-4">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">시행주기</label>
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="cycle"
										value="주"
										checked={programConfig.cycle === '주'}
										onChange={(e) => setProgramConfig(prev => ({ ...prev, cycle: e.target.value }))}
										className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-blue-900">주</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="cycle"
										value="월"
										checked={programConfig.cycle === '월'}
										onChange={(e) => setProgramConfig(prev => ({ ...prev, cycle: e.target.value }))}
										className="w-4 h-4 text-blue-500 border-blue-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-blue-900">월</span>
								</label>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">시행횟수</label>
							<input
								type="text"
								value={programConfig.executionCount}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, executionCount: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-start gap-2">
							<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">비고</label>
							<textarea
								value={programConfig.remarks}
								onChange={(e) => setProgramConfig(prev => ({ ...prev, remarks: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 min-h-[100px]"
								rows={4}
							/>
						</div>
					</div>
					<div className="flex justify-end mt-6">
						<button
							onClick={handleSave}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							저장
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
