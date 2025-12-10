"use client";
import React, { useState, useEffect } from 'react';

interface GuardianMeetingData {
	MTDT: string; // 간담회일자
	MTST: string; // 간담회시작시간
	MTET: string; // 간담회종료시간
	MTLOC: string; // 간담회장소
	MTSUB: string; // 간담회주제
	MTCNT: string; // 간담회내용
	ATTNUM: number; // 참석인원
	ATTLIST: string; // 참석자명단
	MTRSLT: string; // 간담회결과
	MTNUM: string; // 간담회번호
	[key: string]: any;
}

export default function GuardianMeeting() {
	const [meetingList, setMeetingList] = useState<GuardianMeetingData[]>([]);
	const [selectedMeeting, setSelectedMeeting] = useState<GuardianMeetingData | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 기간 필터
	const [startDate, setStartDate] = useState<string>('2024-12-11');
	const [endDate, setEndDate] = useState<string>('2025-12-11');

	// 폼 데이터
	const [formData, setFormData] = useState({
		meetingDate: '', // 간담회일자
		meetingStartTime: '', // 간담회시작시간
		meetingEndTime: '', // 간담회종료시간
		meetingLocation: '', // 간담회장소
		meetingSubject: '', // 간담회주제
		meetingContent: '', // 간담회내용
		attendeeCount: '', // 참석인원
		attendeeList: '', // 참석자명단
		meetingResult: '' // 간담회결과
	});

	// 간담회 목록 조회
	const fetchMeetings = async () => {
		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = `/api/guardian-meeting?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
			// const response = await fetch(url);
			// const result = await response.json();
			
			// 임시로 빈 데이터 반환
			setMeetingList([]);
		} catch (err) {
			console.error('간담회 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchMeetings();
	}, [startDate, endDate]);

	// 페이지네이션 계산
	const totalPages = Math.ceil(meetingList.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMeetings = meetingList.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 간담회 선택
	const handleSelectMeeting = (meeting: GuardianMeetingData) => {
		setSelectedMeeting(meeting);
		setIsEditMode(false);
		setFormData({
			meetingDate: meeting.MTDT || '',
			meetingStartTime: meeting.MTST || '',
			meetingEndTime: meeting.MTET || '',
			meetingLocation: meeting.MTLOC || '',
			meetingSubject: meeting.MTSUB || '',
			meetingContent: meeting.MTCNT || '',
			attendeeCount: String(meeting.ATTNUM || ''),
			attendeeList: meeting.ATTLIST || '',
			meetingResult: meeting.MTRSLT || ''
		});
	};

	// 폼 데이터 변경
	const handleFormChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 검색
	const handleSearch = () => {
		setCurrentPage(1);
		fetchMeetings();
	};

	// 추가
	const handleAdd = () => {
		setSelectedMeeting(null);
		setIsEditMode(true);
		setFormData({
			meetingDate: '',
			meetingStartTime: '',
			meetingEndTime: '',
			meetingLocation: '',
			meetingSubject: '',
			meetingContent: '',
			attendeeCount: '',
			attendeeList: '',
			meetingResult: ''
		});
	};

	// 수정
	const handleModify = () => {
		if (!selectedMeeting) {
			alert('수정할 간담회를 선택해주세요.');
			return;
		}
		setIsEditMode(true);
	};

	// 저장
	const handleSave = async () => {
		if (!formData.meetingDate) {
			alert('간담회일자를 입력해주세요.');
			return;
		}

		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const url = selectedMeeting ? '/api/guardian-meeting/update' : '/api/guardian-meeting/create';
			// const response = await fetch(url, { method: 'POST', body: JSON.stringify(formData) });

			alert(selectedMeeting ? '간담회가 수정되었습니다.' : '간담회가 생성되었습니다.');
			setIsEditMode(false);
			await fetchMeetings();
		} catch (err) {
			console.error('간담회 저장 오류:', err);
			alert('간담회 저장 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 삭제
	const handleDelete = async () => {
		if (!selectedMeeting) {
			alert('삭제할 간담회를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/guardian-meeting/${selectedMeeting.MTNUM}`, { method: 'DELETE' });

			alert('간담회가 삭제되었습니다.');
			setSelectedMeeting(null);
			setFormData({
				meetingDate: '',
				meetingStartTime: '',
				meetingEndTime: '',
				meetingLocation: '',
				meetingSubject: '',
				meetingContent: '',
				attendeeCount: '',
				attendeeList: '',
				meetingResult: ''
			});
			await fetchMeetings();
		} catch (err) {
			console.error('간담회 삭제 오류:', err);
			alert('간담회 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 결과등록
	const handleRegisterResult = async () => {
		if (!selectedMeeting) {
			alert('결과를 등록할 간담회를 선택해주세요.');
			return;
		}

		if (!formData.meetingResult) {
			alert('간담회결과를 입력해주세요.');
			return;
		}

		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch(`/api/guardian-meeting/${selectedMeeting.MTNUM}/result`, {
			// 	method: 'POST',
			// 	body: JSON.stringify({ meetingResult: formData.meetingResult })
			// });

			alert('간담회결과가 등록되었습니다.');
			await fetchMeetings();
		} catch (err) {
			console.error('간담회결과 등록 오류:', err);
			alert('간담회결과 등록 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 출력
	const handlePrint = async () => {
		if (!selectedMeeting) {
			alert('출력할 간담회를 선택해주세요.');
			return;
		}

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
			return;
		}

		const printHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>보호자간담회</title>
	<style>
		@page {
			size: A4;
			margin: 20mm;
		}
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
			font-size: 11pt;
			line-height: 1.5;
			color: #000;
			background: #fff;
		}
		.print-container {
			width: 100%;
			max-width: 210mm;
			margin: 0 auto;
			padding: 0;
		}
		.header {
			text-align: center;
			margin-bottom: 20px;
		}
		.header h1 {
			font-size: 18pt;
			font-weight: bold;
		}
		.info-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #000;
		}
		.info-table td {
			border: 1px solid #000;
			padding: 8px 10px;
			font-size: 10pt;
		}
		.info-table td.label {
			background-color: #f0f0f0;
			font-weight: bold;
			width: 120px;
			text-align: center;
		}
		.info-table td.value {
			width: auto;
		}
		.content-section {
			margin-top: 20px;
			margin-bottom: 20px;
		}
		.section-title {
			font-size: 12pt;
			font-weight: bold;
			margin-bottom: 10px;
			padding: 5px;
			background-color: #f0f0f0;
			border: 1px solid #000;
		}
		.section-content {
			border: 1px solid #000;
			padding: 15px;
			min-height: 150px;
			font-size: 10pt;
			line-height: 1.8;
			white-space: pre-wrap;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}
	</style>
</head>
<body>
	<div class="print-container">
		<div class="header">
			<h1>보호자간담회</h1>
		</div>
		
		<table class="info-table">
			<tr>
				<td class="label">간담회일자</td>
				<td class="value">${formData.meetingDate || '-'}</td>
				<td class="label">간담회시간</td>
				<td class="value">${formData.meetingStartTime || '-'} ~ ${formData.meetingEndTime || '-'}</td>
			</tr>
			<tr>
				<td class="label">간담회장소</td>
				<td class="value" colspan="3">${formData.meetingLocation || '-'}</td>
			</tr>
			<tr>
				<td class="label">간담회주제</td>
				<td class="value" colspan="3">${formData.meetingSubject || '-'}</td>
			</tr>
			<tr>
				<td class="label">참석인원</td>
				<td class="value" colspan="3">${formData.attendeeCount || '-'}명</td>
			</tr>
		</table>

		<div class="content-section">
			<div class="section-title">간담회내용</div>
			<div class="section-content">${formData.meetingContent || ''}</div>
		</div>

		<div class="content-section">
			<div class="section-title">참석자명단</div>
			<div class="section-content">${formData.attendeeList || ''}</div>
		</div>

		<div class="content-section">
			<div class="section-title">간담회결과</div>
			<div class="section-content">${formData.meetingResult || ''}</div>
		</div>
	</div>
	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>
		`;

		printWindow.document.write(printHTML);
		printWindow.document.close();
	};

	// 닫기
	const handleClose = () => {
		window.history.back();
	};

	// 날짜 형식 변환
	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-';
		if (dateStr.includes('-')) return dateStr.substring(0, 10);
		if (dateStr.length === 8) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="p-4 border-b border-blue-200 bg-blue-50">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-blue-900">보호자간담회</h1>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">기간</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
							<span className="text-blue-900">~</span>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							/>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={handleSearch}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								검색
							</button>
							<button
								onClick={handleClose}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								닫기
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* 메인 컨텐츠 영역 */}
			<div className="flex flex-1 h-[calc(100vh-180px)]">
				{/* 좌측 패널: 간담회 목록 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="p-2 border-b border-blue-200 bg-blue-50">
						<div className="grid grid-cols-2 gap-2 text-xs font-semibold text-blue-900">
							<div className="text-center">일자</div>
							<div className="text-center">주제</div>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						{loading ? (
							<div className="p-4 text-center text-blue-900/60">로딩 중...</div>
						) : meetingList.length === 0 ? (
							<div className="p-4 text-center text-blue-900/60">간담회 데이터가 없습니다</div>
						) : (
							currentMeetings.map((meeting, index) => (
								<div
									key={index}
									onClick={() => handleSelectMeeting(meeting)}
									className={`p-2 border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
										selectedMeeting?.MTNUM === meeting.MTNUM ? 'bg-blue-100' : ''
									}`}
								>
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div className="text-blue-900">{formatDate(meeting.MTDT || '')}</div>
										<div className="text-blue-900 truncate">{meeting.MTSUB || '-'}</div>
									</div>
								</div>
							))
						)}
					</div>
					{/* 페이지네이션 */}
					{totalPages > 1 && (
						<div className="p-2 bg-white border-t border-blue-200">
							<div className="flex items-center justify-center gap-1">
								<button
									onClick={() => handlePageChange(1)}
									disabled={currentPage === 1}
									className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
								>
									&lt;&lt;
								</button>
								<button
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
								>
									&lt;
								</button>
								
								{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
									return (
										<button
											key={pageNum}
											onClick={() => handlePageChange(pageNum)}
											className={`px-2 py-1 text-xs border rounded ${
												currentPage === pageNum
													? 'bg-blue-500 text-white border-blue-500'
													: 'border-blue-300 hover:bg-blue-50'
											}`}
										>
											{pageNum}
										</button>
									);
								})}
								
								<button
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
								>
									&gt;
								</button>
								<button
									onClick={() => handlePageChange(totalPages)}
									disabled={currentPage === totalPages}
									className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
								>
									&gt;&gt;
								</button>
							</div>
						</div>
					)}
				</div>

				{/* 우측 패널: 상세 입력 폼 */}
				<div className="flex-1 p-4 overflow-y-auto bg-white">
					<div className="space-y-4">
						{/* 간담회일자, 간담회시간 */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">간담회일자</label>
								{isEditMode ? (
									<input
										type="date"
										value={formData.meetingDate}
										onChange={(e) => handleFormChange('meetingDate', e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]">
										{formData.meetingDate || '-'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">간담회시간</label>
								{isEditMode ? (
									<>
										<input
											type="time"
											value={formData.meetingStartTime}
											onChange={(e) => handleFormChange('meetingStartTime', e.target.value)}
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
										/>
										<span className="text-blue-900">~</span>
										<input
											type="time"
											value={formData.meetingEndTime}
											onChange={(e) => handleFormChange('meetingEndTime', e.target.value)}
											className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
										/>
									</>
								) : (
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50">
										{formData.meetingStartTime || '-'} ~ {formData.meetingEndTime || '-'}
									</span>
								)}
							</div>
						</div>

						{/* 간담회장소 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">간담회장소</label>
							{isEditMode ? (
								<input
									type="text"
									value={formData.meetingLocation}
									onChange={(e) => handleFormChange('meetingLocation', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="간담회장소를 입력하세요"
								/>
							) : (
								<span className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50">
									{formData.meetingLocation || '-'}
								</span>
							)}
						</div>

						{/* 간담회주제 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">간담회주제</label>
							{isEditMode ? (
								<input
									type="text"
									value={formData.meetingSubject}
									onChange={(e) => handleFormChange('meetingSubject', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="간담회주제를 입력하세요"
								/>
							) : (
								<span className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50">
									{formData.meetingSubject || '-'}
								</span>
							)}
						</div>

						{/* 간담회내용 */}
						<div>
							<label className="block mb-2 text-sm font-medium text-blue-900">간담회내용</label>
							{isEditMode ? (
								<textarea
									value={formData.meetingContent}
									onChange={(e) => handleFormChange('meetingContent', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={5}
									placeholder="간담회내용을 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
									{formData.meetingContent || '-'}
								</div>
							)}
						</div>

						{/* 참석인원, 참석자명단 */}
						<div className="flex items-start gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">참석인원</label>
								{isEditMode ? (
									<input
										type="number"
										value={formData.attendeeCount}
										onChange={(e) => handleFormChange('attendeeCount', e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 w-24"
										placeholder="인원"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 w-24">
										{formData.attendeeCount || '-'}
									</span>
								)}
							</div>
							<div className="flex-1">
								<label className="block mb-2 text-sm font-medium text-blue-900">참석자명단</label>
								{isEditMode ? (
									<textarea
										value={formData.attendeeList}
										onChange={(e) => handleFormChange('attendeeList', e.target.value)}
										className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
										rows={5}
										placeholder="참석자명단을 입력하세요"
									/>
								) : (
									<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
										{formData.attendeeList || '-'}
									</div>
								)}
							</div>
						</div>

						{/* 간담회결과 */}
						<div>
							<label className="block mb-2 text-sm font-medium text-blue-900">간담회결과</label>
							{isEditMode ? (
								<textarea
									value={formData.meetingResult}
									onChange={(e) => handleFormChange('meetingResult', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={5}
									placeholder="간담회결과를 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
									{formData.meetingResult || '-'}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* 하단 버튼 영역 */}
			<div className="p-4 border-t border-blue-200 bg-blue-50">
				<div className="flex justify-end gap-2">
					{!isEditMode ? (
						<>
							<button
								onClick={handleAdd}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								추가
							</button>
							<button
								onClick={handleModify}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								수정
							</button>
							<button
								onClick={handleDelete}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								삭제
							</button>
							<button
								onClick={handleRegisterResult}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								결과등록
							</button>
							<button
								onClick={handlePrint}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								출력
							</button>
						</>
					) : (
						<>
							<button
								onClick={() => {
									setIsEditMode(false);
									if (selectedMeeting) {
										handleSelectMeeting(selectedMeeting);
									}
								}}
								className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
							>
								취소
							</button>
							<button
								onClick={handleSave}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								저장
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
