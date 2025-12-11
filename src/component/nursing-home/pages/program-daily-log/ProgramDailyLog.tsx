"use client";
import React, { useState, useEffect } from 'react';

interface ProgramData {
	serviceDate: string;
	startTime: string;
	endTime: string;
	programCategory: string;
	serviceTitle: string;
	creationDate: string;
	serviceEvaluation: string;
}

export default function ProgramDailyLog() {
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
	const [serviceDates, setServiceDates] = useState<string[]>([]);
	const [programList, setProgramList] = useState<ProgramData[]>([]);
	const [loading, setLoading] = useState(false);

	// 폼 데이터
	const [formData, setFormData] = useState({
		workPeriodStart: '2025-11-11',
		workPeriodEnd: '2025-12-11',
		serviceDate: '',
		creationDate: '',
		serviceTitle: '',
		serviceEvaluation: ''
	});

	// 서비스일자 목록 조회
	const fetchServiceDates = async () => {
		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/program-daily-log/service-dates?start=${formData.workPeriodStart}&end=${formData.workPeriodEnd}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시 데이터
			const mockDates = [
				'2025-12-11',
				'2025-12-09',
				'2025-12-08',
				'2025-12-07',
				'2025-12-04',
				'2025-12-02',
				'2025-12-01',
				'2025-11-29',
				'2025-11-27',
				'2025-11-26',
				'2025-11-25',
				'2025-11-24',
				'2025-11-23',
				'2025-11-22',
				'2025-11-21'
			];
			setServiceDates(mockDates);
		} catch (err) {
			console.error('서비스일자 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	// 프로그램 목록 조회
	const fetchProgramList = async (serviceDate: string) => {
		if (!serviceDate) {
			setProgramList([]);
			return;
		}

		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/program-daily-log/programs?serviceDate=${encodeURIComponent(serviceDate)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시 데이터
			const mockPrograms: ProgramData[] = [
				{
					serviceDate: '2025-12-11',
					startTime: '10:00',
					endTime: '11:00',
					programCategory: '신체기능강화',
					serviceTitle: '관절 및 근력운동',
					creationDate: '2025-12-11',
					serviceEvaluation: '*건강체조로 흥을 돋우어 몸을 풀고 자연스럽게 관절 및 근력운동이 시작됨으로 집중하여 따라하시려 하나 대부분은 동작을 모두 구사하기 힘들어하심. 함께 하기에 가능한 동작들과 구령들에 힘이 나시는지 눈을 감고도 숫자를 세고 계시는 모습임.'
				},
				{
					serviceDate: '2025-12-11',
					startTime: '11:00',
					endTime: '12:00',
					programCategory: '인지기능강화',
					serviceTitle: '인지강화활동',
					creationDate: '2025-12-11',
					serviceEvaluation: ''
				},
				{
					serviceDate: '2025-12-11',
					startTime: '14:00',
					endTime: '17:00',
					programCategory: '여가프로그램',
					serviceTitle: '꽃다방',
					creationDate: '2025-12-11',
					serviceEvaluation: ''
				},
				{
					serviceDate: '2025-12-11',
					startTime: '16:20',
					endTime: '17:00',
					programCategory: '인지기능강화',
					serviceTitle: '인지강화Table게임',
					creationDate: '2025-12-11',
					serviceEvaluation: ''
				}
			];
			setProgramList(mockPrograms);
		} catch (err) {
			console.error('프로그램 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchServiceDates();
	}, [formData.workPeriodStart, formData.workPeriodEnd]);

	// 서비스일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = serviceDates[index];
		fetchProgramList(selectedDate);
		setSelectedProgramIndex(null);
		setFormData(prev => ({
			...prev,
			serviceDate: '',
			creationDate: '',
			serviceTitle: '',
			serviceEvaluation: ''
		}));
	};

	// 프로그램 선택 함수
	const handleSelectProgram = (index: number) => {
		setSelectedProgramIndex(index);
		const program = programList[index];
		setFormData(prev => ({
			...prev,
			serviceDate: program.serviceDate,
			creationDate: program.creationDate,
			serviceTitle: program.serviceTitle,
			serviceEvaluation: program.serviceEvaluation
		}));
	};

	// 검색 함수
	const handleSearch = () => {
		fetchServiceDates();
	};

	// 저장 함수
	const handleSave = async () => {
		if (selectedDateIndex === null) {
			alert('서비스일자를 선택해주세요.');
			return;
		}

		if (!formData.serviceTitle) {
			alert('서비스제목을 입력해주세요.');
			return;
		}

		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedProgramIndex !== null ? '/api/program-daily-log/update' : '/api/program-daily-log/create';
			// const response = await fetch(url, {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify(formData)
			// });

			alert(selectedProgramIndex !== null ? '프로그램 일지가 수정되었습니다.' : '프로그램 일지가 저장되었습니다.');
			
			// 데이터 다시 조회
			if (selectedDateIndex !== null) {
				await fetchProgramList(serviceDates[selectedDateIndex]);
			}
		} catch (err) {
			console.error('프로그램 일지 저장 오류:', err);
			alert('프로그램 일지 저장 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (selectedProgramIndex === null) {
			alert('삭제할 프로그램을 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까?')) {
			return;
		}

		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/program-daily-log/${selectedProgramIndex}`, {
			// 	method: 'DELETE'
			// });

			alert('프로그램 일지가 삭제되었습니다.');
			
			// 데이터 다시 조회
			if (selectedDateIndex !== null) {
				await fetchProgramList(serviceDates[selectedDateIndex]);
			}
			
			setSelectedProgramIndex(null);
			setFormData(prev => ({
				...prev,
				serviceDate: '',
				creationDate: '',
				serviceTitle: '',
				serviceEvaluation: ''
			}));
		} catch (err) {
			console.error('프로그램 일지 삭제 오류:', err);
			alert('프로그램 일지 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 복사 함수들
	const handleCopyDate = () => {
		if (selectedProgramIndex === null) {
			alert('복사할 프로그램을 선택해주세요.');
			return;
		}
		// TODO: 일자복사 기능 구현
		alert('일자복사 기능은 준비 중입니다.');
	};

	const handleCopyByCase = () => {
		if (selectedProgramIndex === null) {
			alert('복사할 프로그램을 선택해주세요.');
			return;
		}
		// TODO: 건별복사 기능 구현
		alert('건별복사 기능은 준비 중입니다.');
	};

	const handleCopyToCenter = () => {
		if (selectedProgramIndex === null) {
			alert('복사할 프로그램을 선택해주세요.');
			return;
		}
		// TODO: 센터로복사 기능 구현
		alert('센터로복사 기능은 준비 중입니다.');
	};

	// 출력 함수들
	const handlePrintBeneficiaryEvaluation = () => {
		window.print();
	};

	const handlePrintBeneficiaryEvaluationPeriod = () => {
		window.print();
	};

	const handlePrintProgramPlanPerformance = () => {
		window.print();
	};

	const handlePrintProgramParticipation = () => {
		window.print();
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-50">
				<h1 className="text-xl font-semibold text-blue-900">프로그램 일지</h1>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-blue-900">업무기간</label>
						<input
							type="date"
							value={formData.workPeriodStart}
							onChange={(e) => setFormData(prev => ({ ...prev, workPeriodStart: e.target.value }))}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
						<span className="text-sm text-blue-900">~</span>
						<input
							type="date"
							value={formData.workPeriodEnd}
							onChange={(e) => setFormData(prev => ({ ...prev, workPeriodEnd: e.target.value }))}
							className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
						/>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={handleSearch}
							className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							검색
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
				{/* 왼쪽 패널: 서비스일자 목록 */}
				<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900">프로그램</label>
					</div>
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-xs text-blue-900/80">서비스일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loading ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
							) : serviceDates.length === 0 ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">서비스일자가 없습니다</div>
							) : (
								serviceDates.map((date, index) => (
									<div
										key={index}
										onClick={() => handleSelectDate(index)}
										className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 ${
											selectedDateIndex === index ? 'bg-blue-100 font-semibold' : ''
										}`}
									>
										{date}
									</div>
								))
							)}
						</div>
					</div>
				</div>

				{/* 오른쪽: 프로그램 목록 및 상세 */}
				<div className="flex flex-col flex-1 bg-white">
					{/* 프로그램 목록 테이블 */}
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="overflow-y-auto border-b border-blue-200">
							<table className="w-full text-sm">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">서비스일자</th>
										<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">시작시간</th>
										<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">종료시간</th>
										<th className="px-3 py-2 font-semibold text-center text-blue-900 border-r border-blue-200">프로그램구분</th>
										<th className="px-3 py-2 font-semibold text-center text-blue-900">서비스제목</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={5} className="px-3 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : programList.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-3 py-4 text-center text-blue-900/60">
												{selectedDateIndex !== null ? '프로그램이 없습니다' : '서비스일자를 선택해주세요'}
											</td>
										</tr>
									) : (
										programList.map((program, index) => (
											<tr
												key={index}
												onClick={() => handleSelectProgram(index)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedProgramIndex === index ? 'bg-blue-100' : ''
												}`}
											>
												<td className="px-3 py-2 text-center border-r border-blue-100">{program.serviceDate}</td>
												<td className="px-3 py-2 text-center border-r border-blue-100">{program.startTime}</td>
												<td className="px-3 py-2 text-center border-r border-blue-100">{program.endTime}</td>
												<td className="px-3 py-2 text-center border-r border-blue-100">{program.programCategory}</td>
												<td className="px-3 py-2 text-center">{program.serviceTitle}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{/* 상세 평가 영역 */}
						<div className="flex-1 p-4 overflow-y-auto bg-white">
							<div className="space-y-4">
								{/* 서비스일자, 생성일자 */}
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">서비스일자</label>
										<input
											type="text"
											value={formData.serviceDate}
											onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
											className="px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 min-w-[150px]"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">생성일자</label>
										<input
											type="text"
											value={formData.creationDate}
											onChange={(e) => setFormData(prev => ({ ...prev, creationDate: e.target.value }))}
											className="px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 min-w-[150px]"
										/>
									</div>
									<div className="flex items-center gap-2 ml-auto">
										<button
											onClick={handleCopyDate}
											className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
										>
											일자복사
										</button>
										<button
											onClick={handleCopyByCase}
											className="px-3 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
										>
											건별복사
										</button>
									</div>
								</div>

								{/* 서비스제목 */}
								<div className="flex items-center gap-2">
									<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">서비스제목</label>
									<input
										type="text"
										value={formData.serviceTitle}
										onChange={(e) => setFormData(prev => ({ ...prev, serviceTitle: e.target.value }))}
										className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									/>
								</div>

								{/* 서비스평가 */}
								<div className="flex items-start gap-2">
									<label className="w-24 px-3 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">서비스평가</label>
									<textarea
										value={formData.serviceEvaluation}
										onChange={(e) => setFormData(prev => ({ ...prev, serviceEvaluation: e.target.value }))}
										className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500 min-h-[200px]"
										rows={8}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex items-center justify-between p-4 border-t border-blue-200 bg-blue-50">
						<div className="flex items-center gap-2">
							<button
								onClick={handleCopyToCenter}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								센터로복사
							</button>
							<button
								onClick={() => {
									setSelectedProgramIndex(null);
									setFormData(prev => ({
										...prev,
										serviceDate: serviceDates[selectedDateIndex || 0] || '',
										creationDate: new Date().toISOString().split('T')[0],
										serviceTitle: '',
										serviceEvaluation: ''
									}));
								}}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								추가
							</button>
							<button
								onClick={handleSave}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								수정
							</button>
							<button
								onClick={handleDelete}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								삭제
							</button>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={handlePrintBeneficiaryEvaluation}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								수급자평가출력
							</button>
							<button
								onClick={handlePrintBeneficiaryEvaluationPeriod}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								수급자평가기간출력
							</button>
							<button
								onClick={handlePrintProgramPlanPerformance}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								프로그램 계획/실적 출력
							</button>
							<button
								onClick={handlePrintProgramParticipation}
								className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							>
								프로그램 참여 실적 출력
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
