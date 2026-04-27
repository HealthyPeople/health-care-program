"use client";
import React, { useState, useEffect } from 'react';

interface CaseData {
	ANCD: string | number;
	MDT: string; // 회의일자 (PK)
	STM?: string; // 시작시간
	ETM?: string; // 종료시간
	MPL?: string; // 장소
	MPNM?: string; // 수급자명
	MPGRD?: string; // 수급자등급
	MPAGE?: string; // 수급자나이
	MDOC?: string; // 선정사유
	MDES?: string; // 회의내용
	MRES?: string; // 회의결과
	MNM?: string; // 참석자
	MODT?: string; // 반영일자
	MODES?: string; // 반영내용
	INEMPNO?: string;
	INEMPNM?: string;
	[key: string]: any;
}

type UserInfo = {
	ancd?: string | number;
	uid?: string;
	empno?: string | number;
	empnm?: string;
	[key: string]: any;
};

export default function CaseManagement() {
	const formatDateYmd = (dateStr: string) => {
		if (!dateStr) return '';
		const s = String(dateStr).trim();
		if (!s) return '';

		// ISO or "YYYY-MM-DD..."
		if (s.includes('T') && s.length >= 10) return s.split('T')[0];
		if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

		// "YYYYMMDD"
		if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

		// "Fri Mar 12 2021 09:00:00 GMT..."
		const d = new Date(s);
		if (!Number.isNaN(d.getTime())) {
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${day}`;
		}

		return s.length >= 10 ? s.slice(0, 10) : s;
	};

	const [caseList, setCaseList] = useState<CaseData[]>([]);
	const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [hasProgramAccess, setHasProgramAccess] = useState<boolean>(true);

	// 기간 필터
	const [startDate, setStartDate] = useState<string>('');
	const [endDate, setEndDate] = useState<string>('');

	// 폼 데이터
	const [formData, setFormData] = useState({
		meetingDate: '', // 회의일자
		meetingStartTime: '', // 회의시작시간
		meetingEndTime: '', // 회의종료시간
		meetingLocation: '', // 회의장소
		beneficiary: '', // 수급자
		beneficiaryGrade: '', // 수급자등급
		beneficiaryAge: '', // 수급자나이
		selectionReason: '', // 선정사유
		meetingContent: '', // 회의내용
		meetingResult: '', // 회의결과
		meetingAttendees: '', // 회의참석자
		reflectionDate: '', // 반영일자
		reflectionContent: '' // 반영내용
	});

	const fetchUserAndPermission = async () => {
		try {
			const res = await fetch('/api/auth/user-info', { method: 'GET' });
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '사용자 정보 조회 실패');
			}

			const u = (result.data || {}) as UserInfo;
			setUserInfo(u);

			const ancd = u?.ancd;
			const uid = u?.uid;
			if (!ancd || !uid) {
				setHasProgramAccess(true);
				return;
			}

			const permRes = await fetch(
				`/api/f00131?ancd=${encodeURIComponent(String(ancd))}&uid=${encodeURIComponent(
					String(uid)
				)}&pgmid=${encodeURIComponent('F60020')}`,
				{ method: 'GET' }
			);
			const perm = await permRes.json().catch(() => ({}));
			if (!permRes.ok || !perm?.success) {
				setHasProgramAccess(true);
				return;
			}
			// F00131은 "사용 가능 목록" 형태인 경우가 많아, 레코드가 없으면 기본 허용으로 처리
			setHasProgramAccess(true);
		} catch (e) {
			console.error('사용자/권한 조회 오류:', e);
			setHasProgramAccess(true);
		}
	};

	// 사례 목록 조회
	const fetchCases = async () => {
		setLoading(true);
		try {
			const ancd = userInfo?.ancd;
			if (!ancd) {
				setCaseList([]);
				return;
			}

			const url = `/api/f60020?ancd=${encodeURIComponent(String(ancd))}&startDate=${encodeURIComponent(
				startDate
			)}&endDate=${encodeURIComponent(endDate)}`;
			const response = await fetch(url, { method: 'GET' });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || '사례 목록 조회 실패');
			}
			const list = Array.isArray(result.data) ? result.data : [];
			// 날짜 표시 통일(YYYY-MM-DD)
			setCaseList(
				list.map((r: any) => ({
					...r,
					MDT: formatDateYmd(r?.MDT),
					MODT: formatDateYmd(r?.MODT),
					URDT: formatDateYmd(r?.URDT),
				}))
			);
		} catch (err) {
			console.error('사례 목록 조회 오류:', err);
			setCaseList([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// 최초 진입 시: 오늘 기준 최근 1년
		const today = new Date();
		const end = formatDateYmd(today.toISOString());
		const oneYearAgo = new Date(today);
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
		const start = formatDateYmd(oneYearAgo.toISOString());
		setStartDate(start);
		setEndDate(end);

		fetchUserAndPermission();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!userInfo?.ancd) return;
		if (!startDate || !endDate) return;
		fetchCases();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [startDate, endDate, userInfo?.ancd]);

	// 페이지네이션 계산
	const totalPages = Math.ceil(caseList.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentCases = caseList.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// 사례 선택
	const handleSelectCase = (caseItem: CaseData) => {
		setSelectedCase(caseItem);
		setIsEditMode(false);
		setFormData({
			meetingDate: formatDateYmd(caseItem.MDT || ''),
			meetingStartTime: caseItem.STM || '',
			meetingEndTime: caseItem.ETM || '',
			meetingLocation: caseItem.MPL || '',
			beneficiary: caseItem.MPNM || '',
			beneficiaryGrade: caseItem.MPGRD || '',
			beneficiaryAge: caseItem.MPAGE || '',
			selectionReason: caseItem.MDOC || '',
			meetingContent: caseItem.MDES || '',
			meetingResult: caseItem.MRES || '',
			meetingAttendees: caseItem.MNM || '',
			reflectionDate: formatDateYmd(caseItem.MODT || ''),
			reflectionContent: caseItem.MODES || ''
		});
	};

	// 폼 데이터 변경
	const handleFormChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	// 검색
	const handleSearch = () => {
		setCurrentPage(1);
		fetchCases();
	};

	// 추가
	const handleAdd = () => {
		if (!hasProgramAccess) {
			alert('프로그램 사용 권한이 없습니다.');
			return;
		}
		setSelectedCase(null);
		setIsEditMode(true);
		setFormData({
			meetingDate: '',
			meetingStartTime: '',
			meetingEndTime: '',
			meetingLocation: '',
			beneficiary: '',
			beneficiaryGrade: '',
			beneficiaryAge: '',
			selectionReason: '',
			meetingContent: '',
			meetingResult: '',
			meetingAttendees: '',
			reflectionDate: '',
			reflectionContent: ''
		});
	};

	// 수정
	const handleModify = () => {
		if (!hasProgramAccess) {
			alert('프로그램 사용 권한이 없습니다.');
			return;
		}
		if (!selectedCase) {
			alert('수정할 사례를 선택해주세요.');
			return;
		}
		setIsEditMode(true);
	};

	// 저장
	const handleSave = async () => {
		if (!hasProgramAccess) {
			alert('프로그램 사용 권한이 없습니다.');
			return;
		}
		if (!formData.meetingDate) {
			alert('회의일자를 입력해주세요.');
			return;
		}

		setLoading(true);
		try {
			const ancd = userInfo?.ancd;
			if (!ancd) throw new Error('기관정보(ANCD)를 확인할 수 없습니다.');

			const payload: any = {
				ANCD: ancd,
				MDT: formatDateYmd(formData.meetingDate),
				STM: formData.meetingStartTime || null,
				ETM: formData.meetingEndTime || null,
				MPL: formData.meetingLocation || null,
				MPNM: formData.beneficiary || null,
				MPGRD: formData.beneficiaryGrade || null,
				MPAGE: formData.beneficiaryAge || null,
				MDOC: formData.selectionReason || null,
				MDES: formData.meetingContent || null,
				MRES: formData.meetingResult || null,
				MNM: formData.meetingAttendees || null,
				MODT: formData.reflectionDate ? formatDateYmd(formData.reflectionDate) : null,
				MODES: formData.reflectionContent || null,
				INEMPNO: userInfo?.empno != null ? String(userInfo.empno) : null,
				INEMPNM: userInfo?.empnm != null ? String(userInfo.empnm) : null,
				MIMG: null,
			};

			const res = await fetch(`/api/f60020?ancd=${encodeURIComponent(String(ancd))}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '사례 저장에 실패했습니다.');
			}

			alert(selectedCase ? '사례가 수정되었습니다.' : '사례가 생성되었습니다.');
			setIsEditMode(false);
			await fetchCases();
		} catch (err) {
			console.error('사례 저장 오류:', err);
			alert('사례 저장 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 삭제
	const handleDelete = async () => {
		if (!hasProgramAccess) {
			alert('프로그램 사용 권한이 없습니다.');
			return;
		}
		if (!selectedCase) {
			alert('삭제할 사례를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoading(true);
		try {
			const ancd = userInfo?.ancd;
			if (!ancd) throw new Error('기관정보(ANCD)를 확인할 수 없습니다.');
			const mdt = formatDateYmd(selectedCase.MDT);
			if (!mdt) throw new Error('회의일자(MDT)를 확인할 수 없습니다.');

			const res = await fetch(
				`/api/f60020?ancd=${encodeURIComponent(String(ancd))}&mdt=${encodeURIComponent(String(mdt))}`,
				{ method: 'DELETE' }
			);
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '사례 삭제에 실패했습니다.');
			}

			alert('사례가 삭제되었습니다.');
			setSelectedCase(null);
			setFormData({
				meetingDate: '',
				meetingStartTime: '',
				meetingEndTime: '',
				meetingLocation: '',
				beneficiary: '',
				beneficiaryGrade: '',
				beneficiaryAge: '',
				selectionReason: '',
				meetingContent: '',
				meetingResult: '',
				meetingAttendees: '',
				reflectionDate: '',
				reflectionContent: ''
			});
			await fetchCases();
		} catch (err) {
			console.error('사례 삭제 오류:', err);
			alert('사례 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 반영내용등록
	const handleRegisterReflection = async () => {
		if (!hasProgramAccess) {
			alert('프로그램 사용 권한이 없습니다.');
			return;
		}
		if (!selectedCase) {
			alert('반영내용을 등록할 사례를 선택해주세요.');
			return;
		}

		if (!formData.reflectionDate) {
			alert('반영일자를 입력해주세요.');
			return;
		}

		if (!formData.reflectionContent) {
			alert('반영내용을 입력해주세요.');
			return;
		}

		setLoading(true);
		try {
			const ancd = userInfo?.ancd;
			if (!ancd) throw new Error('기관정보(ANCD)를 확인할 수 없습니다.');
			const payload: any = {
				ANCD: ancd,
				MDT: formatDateYmd(selectedCase.MDT),
				MODT: formatDateYmd(formData.reflectionDate),
				MODES: formData.reflectionContent,
				INEMPNO: userInfo?.empno != null ? String(userInfo.empno) : null,
				INEMPNM: userInfo?.empnm != null ? String(userInfo.empnm) : null,
			};

			const res = await fetch(`/api/f60020?ancd=${encodeURIComponent(String(ancd))}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '반영내용 등록에 실패했습니다.');
			}

			alert('반영내용이 등록되었습니다.');
			await fetchCases();
		} catch (err) {
			console.error('반영내용 등록 오류:', err);
			alert('반영내용 등록 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 출력
	const handlePrint = async () => {
		if (!selectedCase) {
			alert('출력할 사례를 선택해주세요.');
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
	<title>사례관리</title>
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
		<h1 style="text-align: center; font-size: 18pt; margin-bottom: 20px;">사례관리</h1>
		
		<table class="info-table">
			<tr>
				<td class="label">회의일자</td>
				<td class="value">${formData.meetingDate || '-'}</td>
				<td class="label">회의시간</td>
				<td class="value">${formData.meetingStartTime || '-'} ~ ${formData.meetingEndTime || '-'}</td>
			</tr>
			<tr>
				<td class="label">회의장소</td>
				<td class="value" colspan="3">${formData.meetingLocation || '-'}</td>
			</tr>
			<tr>
				<td class="label">수급자</td>
				<td class="value">${formData.beneficiary || '-'}</td>
				<td class="label">수급자등급</td>
				<td class="value">${formData.beneficiaryGrade || '-'}</td>
			</tr>
			<tr>
				<td class="label">수급자나이</td>
				<td class="value" colspan="3">${formData.beneficiaryAge || '-'}</td>
			</tr>
		</table>

		<div class="content-section">
			<div class="section-title">선정사유</div>
			<div class="section-content">${formData.selectionReason || ''}</div>
		</div>

		<div class="content-section">
			<div class="section-title">회의내용</div>
			<div class="section-content">${formData.meetingContent || ''}</div>
		</div>

		<div class="content-section">
			<div class="section-title">회의결과</div>
			<div class="section-content">${formData.meetingResult || ''}</div>
		</div>

		<table class="info-table">
			<tr>
				<td class="label">회의참석자</td>
				<td class="value" colspan="3">${formData.meetingAttendees || '-'}</td>
			</tr>
			<tr>
				<td class="label">반영일자</td>
				<td class="value">${formData.reflectionDate || '-'}</td>
				<td class="label">반영내용</td>
				<td class="value">${formData.reflectionContent || '-'}</td>
			</tr>
		</table>
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
		// TODO: 모달이나 페이지 닫기 로직 구현
		window.history.back();
	};

	return (
		<div className="min-h-screen text-black bg-white">
			{/* 상단 헤더 */}
			<div className="p-4 border-b border-blue-200 bg-blue-50">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-blue-900">사례관리</h1>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<button
								onClick={handleAdd}
								disabled={!hasProgramAccess || isEditMode}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							>
								생성
							</button>
							<button
								onClick={handleModify}
								disabled={!hasProgramAccess || isEditMode || !selectedCase}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							>
								수정
							</button>
							<button
								onClick={handleDelete}
								disabled={!hasProgramAccess || isEditMode || !selectedCase}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							>
								삭제
							</button>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900">기간</label>
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
							{/* <button
								onClick={handleClose}
								className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
							>
								닫기
							</button> */}
						</div>
					</div>
				</div>
			</div>

			{/* 메인 컨텐츠 영역 */}
			<div className="flex h-[calc(100vh-120px)]">
				{/* 좌측 패널: 사례 목록 */}
				<div className="flex flex-col w-1/3 bg-white border-r border-blue-200">
					<div className="p-2 border-b border-blue-200 bg-blue-50">
						<div className="grid grid-cols-2 gap-2 text-xs font-semibold text-blue-900">
							<div className="text-center">일자</div>
							<div className="text-center">선정사유</div>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						{loading ? (
							<div className="p-4 text-center text-blue-900/60">로딩 중...</div>
						) : caseList.length === 0 ? (
							<div className="p-4 text-center text-blue-900/60">사례 데이터가 없습니다</div>
						) : (
							currentCases.map((caseItem, index) => (
								<div
									key={index}
									onClick={() => handleSelectCase(caseItem)}
									className={`p-2 border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
										selectedCase?.MDT === caseItem.MDT ? 'bg-blue-100' : ''
									}`}
								>
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div className="text-blue-900">{formatDateYmd(caseItem.MDT || '') || '-'}</div>
										<div className="text-blue-900 truncate">{caseItem.MDOC || '-'}</div>
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
						{/* 회의일자, 회의시간 */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">회의일자</label>
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
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">회의시간</label>
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

						{/* 회의장소 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">회의장소</label>
							{isEditMode ? (
								<input
									type="text"
									value={formData.meetingLocation}
									onChange={(e) => handleFormChange('meetingLocation', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="회의장소를 입력하세요"
								/>
							) : (
								<span className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50">
									{formData.meetingLocation || '-'}
								</span>
							)}
						</div>

						{/* 수급자, 수급자등급, 수급자나이 */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자</label>
								{isEditMode ? (
									<input
										type="text"
										value={formData.beneficiary}
										onChange={(e) => handleFormChange('beneficiary', e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
										placeholder="수급자명"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]">
										{formData.beneficiary || '-'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자등급</label>
								{isEditMode ? (
									<input
										type="text"
										value={formData.beneficiaryGrade}
										onChange={(e) => handleFormChange('beneficiaryGrade', e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[100px]"
										placeholder="등급"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[100px]">
										{formData.beneficiaryGrade || '-'}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap">수급자나이</label>
								{isEditMode ? (
									<input
										type="text"
										value={formData.beneficiaryAge}
										onChange={(e) => handleFormChange('beneficiaryAge', e.target.value)}
										className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[100px]"
										placeholder="나이"
									/>
								) : (
									<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[100px]">
										{formData.beneficiaryAge || '-'}
									</span>
								)}
							</div>
						</div>

						{/* 선정사유 */}
						<div>
							<label className="block mb-2 text-sm font-medium text-blue-900">선정사유</label>
							{isEditMode ? (
								<textarea
									value={formData.selectionReason}
									onChange={(e) => handleFormChange('selectionReason', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={5}
									placeholder="선정사유를 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
									{formData.selectionReason || '-'}
								</div>
							)}
						</div>

						{/* 회의내용 */}
						<div>
							<label className="block mb-2 text-sm font-medium text-blue-900">회의내용</label>
							{isEditMode ? (
								<textarea
									value={formData.meetingContent}
									onChange={(e) => handleFormChange('meetingContent', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={5}
									placeholder="회의내용을 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
									{formData.meetingContent || '-'}
								</div>
							)}
						</div>

						{/* 회의결과 */}
						<div>
							<label className="block mb-2 text-sm font-medium text-blue-900">회의결과</label>
							{isEditMode ? (
								<textarea
									value={formData.meetingResult}
									onChange={(e) => handleFormChange('meetingResult', e.target.value)}
									className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
									rows={5}
									placeholder="회의결과를 입력하세요"
								/>
							) : (
								<div className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
									{formData.meetingResult || '-'}
								</div>
							)}
						</div>

						{/* 회의참석자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">회의참석자</label>
							{isEditMode ? (
								<input
									type="text"
									value={formData.meetingAttendees}
									onChange={(e) => handleFormChange('meetingAttendees', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="회의참석자를 입력하세요"
								/>
							) : (
								<span className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50">
									{formData.meetingAttendees || '-'}
								</span>
							)}
						</div>

						{/* 반영일자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">반영일자</label>
							{isEditMode ? (
								<input
									type="date"
									value={formData.reflectionDate}
									onChange={(e) => handleFormChange('reflectionDate', e.target.value)}
									className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								/>
							) : (
								<span className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]">
									{formData.reflectionDate || '-'}
								</span>
							)}
						</div>

						{/* 반영내용 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap">반영내용</label>
							{isEditMode ? (
								<input
									type="text"
									value={formData.reflectionContent}
									onChange={(e) => handleFormChange('reflectionContent', e.target.value)}
									className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
									placeholder="반영내용을 입력하세요"
								/>
							) : (
								<span className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50">
									{formData.reflectionContent || '-'}
								</span>
							)}
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex justify-end gap-2 pt-4 mt-6 border-t border-blue-200">
						{!isEditMode ? (
							<>
								<button
									onClick={handleAdd}
									disabled={!hasProgramAccess}
									className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
								>
									추가
								</button>
								<button
									onClick={handleModify}
									disabled={!hasProgramAccess}
									className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
								>
									수정
								</button>
								<button
									onClick={handleDelete}
									disabled={!hasProgramAccess}
									className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
								>
									삭제
								</button>
								{/* <button
									onClick={handleRegisterReflection}
									disabled={!hasProgramAccess}
									className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
								>
									반영내용등록
								</button> */}
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
										if (selectedCase) {
											handleSelectCase(selectedCase);
										}
									}}
									className="px-4 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
								>
									취소
								</button>
								<button
									onClick={handleSave}
									disabled={!hasProgramAccess}
									className="px-4 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
								>
									저장
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
