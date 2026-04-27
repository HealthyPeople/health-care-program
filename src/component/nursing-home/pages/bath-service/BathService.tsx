"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { attachLatestRoomNoByPnum } from '../../utils/roomNoFloor';
import { RoomNoFloorSelect } from '../../components/RoomNoFloorSelect';
import { matchesSelectedFloorByRoomNo } from '../../utils/roomNoFloorFilter';

interface MemberData {
	ANCD?: string;
	PNUM?: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	ROOM_NO?: string;
	[key: string]: any;
}

/** MSSQL/clients가 ancd·pnum 소문자로 줄 때 조회 파라미터가 비어 목록만 비는 현상 방지 */
function memberAncd(m: MemberData | null | undefined): string {
	if (!m) return '';
	const raw = m.ANCD ?? (m as Record<string, unknown>).ancd;
	return raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

function memberPnum(m: MemberData | null | undefined): string {
	if (!m) return '';
	const raw = m.PNUM ?? (m as Record<string, unknown>).pnum;
	return raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

function memberKey(m: MemberData | null | undefined): string {
	return `${memberAncd(m)}-${memberPnum(m)}`;
}

interface BathServiceData {
	SVDT: string; // 제공일자
	SVTM: string; // 제공시간
	[key: string]: any;
}

type UserInfo = {
	ancd?: string | number;
	uid?: string;
	empno?: string | number;
	empnm?: string;
	[key: string]: any;
};

export default function BathService() {
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [serviceDates, setServiceDates] = useState<string[]>([]);
	const [loadingServices, setLoadingServices] = useState(false);
	const [serviceDatePage, setServiceDatePage] = useState(1);
	const serviceDateItemsPerPage = 10;

	// 폼 데이터
	const [formData, setFormData] = useState({
		serviceDate: '', // 제공일자(VDT)
		serviceTime: '', // 제공시간
		beneficiary: '', // 수급자
		// 수급자상태 - 목욕전
		beforeBathFace: false, // 얼굴
		beforeBathLips: false, // 입술
		beforeBathNailColor: false, // 손톱색깔
		beforeBathCognitiveState: false, // 인지상태
		// 수급자상태 - 목욕후
		afterBathFace: false, // 얼굴
		afterBathLips: false, // 입술
		afterBathNailColor: false, // 손톱색깔
		afterBathCognitiveState: false, // 인지상태
		bathingMethod: '샤워식-목욕의자', // 목욕방법
		provider: '', // 제공자
		clearPersonInCharge: false, // 담당자지움
		serviceUnavailableReason: '' // 서비스불가사유
	});

	/** 네트워크 JSON의 VDT가 ISO·로케일 문자열(Date 직렬화)·빈값 혼재해도 yyyy-mm-dd로 통일 */
	const formatDateYmd = (v: unknown) => {
		if (v == null || v === '') return '';
		if (v instanceof Date && !Number.isNaN(v.getTime())) {
			const y = v.getFullYear();
			const m = String(v.getMonth() + 1).padStart(2, '0');
			const d = String(v.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		}
		const s = String(v).trim();
		if (!s) return '';
		if (s.includes('T')) return s.split('T')[0].slice(0, 10);
		if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
		if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
		const parsed = Date.parse(s);
		if (!Number.isNaN(parsed)) {
			const dt = new Date(parsed);
			const y = dt.getFullYear();
			const m = String(dt.getMonth() + 1).padStart(2, '0');
			const d = String(dt.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		}
		return '';
	};

	const boolToXO = (checked: boolean) => (checked ? 'O' : 'X');
	const xoToBool = (v: unknown) => String(v ?? '').trim().toUpperCase() === 'O';

	const bathMethodToCode = (label: string) => {
		const s = String(label || '').trim();
		if (!s) return null;
		// 1: 전신입욕, 2: 샤워식, 3: 침상목욕(추정)
		if (s === '입욕') return '1';
		if (s.startsWith('샤워식')) return '2';
		if (s === '목욕의자') return '2';
		return null;
	};

	const codeToBathMethod = (code: unknown) => {
		const c = String(code ?? '').trim();
		if (c === '1') return '입욕';
		if (c === '2') return '샤워식-목욕의자';
		if (c === '3') return '기타';
		return '샤워식-목욕의자';
	};

	const fetchUserInfo = async () => {
		try {
			const res = await fetch('/api/auth/user-info', { method: 'GET' });
			const json = await res.json().catch(() => ({}));
			if (res.ok && json?.success) {
				setUserInfo(json.data || null);
			}
		} catch {
			// ignore
		}
	};

	// 수급자 목록 데이터
	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// 수급자 목록 조회
	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				const list = Array.isArray(result.data) ? (result.data as MemberData[]) : [];
				const merged = await attachLatestRoomNoByPnum(list as any);
				setMemberList(merged as MemberData[]);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	// 나이 계산 함수
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

	// 필터링된 수급자 목록
	const filteredMembers = memberList.filter((member) => {
		if (selectedStatus) {
			const memberStatus = String(member.P_ST || '').trim();
			if (selectedStatus === '입소' && memberStatus !== '1') {
				return false;
			}
			if (selectedStatus === '퇴소' && memberStatus !== '9') {
				return false;
			}
		}
		
		if (selectedGrade) {
			const memberGrade = String(member.P_GRD || '').trim();
			const selectedGradeTrimmed = String(selectedGrade).trim();
			if (memberGrade !== selectedGradeTrimmed) {
				return false;
			}
		}
		
		if (selectedFloor) {
			if (!matchesSelectedFloorByRoomNo((member as any).ROOM_NO, selectedFloor)) return false;
		}
		
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase().trim();
			if (!member.P_NM?.toLowerCase().includes(searchLower)) {
				return false;
			}
		}
		
		return true;
	}).sort((a, b) => {
		const nameA = (a.P_NM || '').trim();
		const nameB = (b.P_NM || '').trim();
		return nameA.localeCompare(nameB, 'ko');
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	useEffect(() => {
		fetchMembers();
		fetchUserInfo();
	}, []);

	// 검색어 변경 시 실시간 검색 (디바운싱)
	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	// 제공일자 목록 조회
	const fetchServiceDates = async (ancd: string, pnum: string) => {
		if (!ancd || !pnum) {
			setServiceDates([]);
			return;
		}

		setLoadingServices(true);
		try {
			const url = `/api/f33030?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}`;
			const res = await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) throw new Error(json?.error || '제공일자 조회 실패');

			const list = Array.isArray(json.data) ? json.data : [];
			const dates: string[] = Array.from(
				new Set(
					list
						.map((r: any) => formatDateYmd(r?.VDT ?? r?.vdt))
						.filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
				)
			) as string[];
			dates.sort((a: string, b: string) => (a > b ? -1 : a < b ? 1 : 0));
			setServiceDates(dates);
		} catch (err) {
			console.error('제공일자 조회 오류:', err);
			setServiceDates([]);
		} finally {
			setLoadingServices(false);
		}
	};

	const fetchDetail = async (ancd: string, pnum: string, vdt: string) => {
		setLoadingServices(true);
		try {
			const url = `/api/f33030?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(pnum)}&vdt=${encodeURIComponent(
				vdt
			)}`;
			const res = await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) throw new Error(json?.error || '상세 조회 실패');

			const row = Array.isArray(json.data) ? json.data?.[0] : null;
			if (!row) return;

			setFormData(prev => ({
				...prev,
				serviceDate: formatDateYmd(row?.VDT ?? row?.vdt) || vdt,
				serviceTime: row?.SRV_TM ?? row?.srv_tm ?? '',
				beneficiary: selectedMember?.P_NM || prev.beneficiary,
				// DB 정의: 목욕전=AF_*, 목욕후=BF_* (표준 정의서 기준)
				beforeBathFace: xoToBool(row?.AF_FACE ?? row?.af_face),
				beforeBathLips: xoToBool(row?.AF_LIP ?? row?.af_lip),
				beforeBathNailColor: xoToBool(
					row?.AF_NAIL_COLOR ?? row?.AF_NAIL_COLO ?? row?.af_nail_color ?? row?.af_nail_colo
				),
				beforeBathCognitiveState: xoToBool(row?.AF_COG_STAT ?? row?.af_cog_stat),
				afterBathFace: xoToBool(row?.BF_FACE ?? row?.bf_face),
				afterBathLips: xoToBool(row?.BF_LIP ?? row?.bf_lip),
				afterBathNailColor: xoToBool(
					row?.BF_NAIL_COLOR ?? row?.BF_NAIL_COLO ?? row?.bf_nail_color ?? row?.bf_nail_colo
				),
				afterBathCognitiveState: xoToBool(row?.BF_COG_STAT ?? row?.bf_cog_stat),
				bathingMethod: codeToBathMethod(row?.BATH_METH ?? row?.bath_meth),
				// 제공자/담당자지움은 테이블에 명확한 매핑이 없어 화면값 유지
				serviceUnavailableReason: row?.SRV_WRNG_DESC ?? row?.srv_wrng_desc ?? ''
			}));
		} catch (e) {
			console.error('상세 조회 오류:', e);
		} finally {
			setLoadingServices(false);
		}
	};

	// 수급자 선택 함수
	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedDateIndex(null);
		setServiceDatePage(1);
		setFormData(prev => ({
			...prev,
			beneficiary: member.P_NM || '',
			serviceDate: '',
			serviceTime: '',
			beforeBathFace: false,
			beforeBathLips: false,
			beforeBathNailColor: false,
			beforeBathCognitiveState: false,
			afterBathFace: false,
			afterBathLips: false,
			afterBathNailColor: false,
			afterBathCognitiveState: false,
			bathingMethod: '샤워식-목욕의자',
			provider: '',
			clearPersonInCharge: false,
			serviceUnavailableReason: ''
		}));
		fetchServiceDates(memberAncd(member), memberPnum(member));
	};

	// 제공일자 선택 함수
	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const selectedDate = serviceDates[index];
		setFormData(prev => ({ ...prev, serviceDate: selectedDate || '' }));
		if (selectedMember && selectedDate) {
			fetchDetail(memberAncd(selectedMember), memberPnum(selectedMember), selectedDate);
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

		if (!formData.serviceDate) {
			alert('제공일자를 입력해주세요.');
			return;
		}

		setLoadingServices(true);
		try {
			const payload: any = {
				PNUM: memberPnum(selectedMember),
				VDT: formData.serviceDate,
				SRV_TM: formData.serviceTime || '',
				// 체크=문제있음(O), 미체크=문제없음(X) — 목욕전=AF_*, 목욕후=BF_*
				AF_FACE: boolToXO(formData.beforeBathFace),
				AF_LIP: boolToXO(formData.beforeBathLips),
				AF_NAIL_COLOR: boolToXO(formData.beforeBathNailColor),
				AF_COG_STAT: boolToXO(formData.beforeBathCognitiveState),
				BF_FACE: boolToXO(formData.afterBathFace),
				BF_LIP: boolToXO(formData.afterBathLips),
				BF_NAIL_COLOR: boolToXO(formData.afterBathNailColor),
				BF_COG_STAT: boolToXO(formData.afterBathCognitiveState),
				SRV_WRNG_DESC: formData.serviceUnavailableReason || '',
				BATH_METH: bathMethodToCode(formData.bathingMethod),
				INEMPNO: userInfo?.empno != null ? String(userInfo.empno) : null,
				// 제공자 입력이 숫자면 사원번호2로 저장 (그 외는 null)
				INEMPNO1: formData.clearPersonInCharge
					? null
					: (() => {
							const n = parseInt(String(formData.provider || '').trim(), 10);
							return Number.isFinite(n) ? String(n) : null;
						})(),
			};

			const res = await fetch(`/api/f33030?ancd=${encodeURIComponent(memberAncd(selectedMember))}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '목욕서비스 저장 실패');
			}

			alert(selectedDateIndex !== null ? '목욕서비스가 수정되었습니다.' : '목욕서비스가 저장되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchServiceDates(memberAncd(selectedMember), memberPnum(selectedMember));
				if (formData.serviceDate) {
					await fetchDetail(memberAncd(selectedMember), memberPnum(selectedMember), formData.serviceDate);
				}
			}
		} catch (err) {
			console.error('목욕서비스 저장 오류:', err);
			alert('목욕서비스 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingServices(false);
		}
	};

	// 삭제 함수
	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		if (selectedDateIndex === null) {
			alert('삭제할 목욕서비스를 선택해주세요.');
			return;
		}

		if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			return;
		}

		setLoadingServices(true);
		try {
			const dateToDelete = serviceDates[selectedDateIndex];
			const url = `/api/f33030?ancd=${encodeURIComponent(memberAncd(selectedMember))}&pnum=${encodeURIComponent(
				memberPnum(selectedMember)
			)}&vdt=${encodeURIComponent(dateToDelete)}`;
			const res = await fetch(url, { method: 'DELETE', cache: 'no-store', credentials: 'same-origin' });
			const result = await res.json().catch(() => ({}));
			if (!res.ok || !result?.success) {
				throw new Error(result?.error || '목욕서비스 삭제 실패');
			}

			alert('목욕서비스가 삭제되었습니다.');
			
			// 데이터 다시 조회
			if (selectedMember) {
				await fetchServiceDates(memberAncd(selectedMember), memberPnum(selectedMember));
			}
			
			// 폼 초기화
			setFormData(prev => ({
				...prev,
				serviceTime: '',
				beforeBathFace: false,
				beforeBathLips: false,
				beforeBathNailColor: false,
				beforeBathCognitiveState: false,
				afterBathFace: false,
				afterBathLips: false,
				afterBathNailColor: false,
				afterBathCognitiveState: false,
				bathingMethod: '샤워식-목욕의자',
				provider: '',
				clearPersonInCharge: false,
				serviceUnavailableReason: ''
			}));
			setSelectedDateIndex(null);
			setServiceDatePage(1);
		} catch (err) {
			console.error('목욕서비스 삭제 오류:', err);
			alert('목욕서비스 삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingServices(false);
		}
	};

	// 제공일자 목록 페이지네이션
	const serviceDateTotalPages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
	const serviceDateStartIndex = (serviceDatePage - 1) * serviceDateItemsPerPage;
	const serviceDateEndIndex = serviceDateStartIndex + serviceDateItemsPerPage;
	const currentDateItems = serviceDates.slice(serviceDateStartIndex, serviceDateEndIndex);

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					{/* 필터 헤더 */}
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							{/* 이름 검색 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input 
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded" 
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
							{/* 현황 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">현황</div>
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">현황 전체</option>
									<option value="입소">입소</option>
									<option value="퇴소">퇴소</option>
								</select>
							</div>
							{/* 등급 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">등급</div>
								<select
									value={selectedGrade}
									onChange={(e) => setSelectedGrade(e.target.value)}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								>
									<option value="">등급 전체</option>
									<option value="1">1등급</option>
									<option value="2">2등급</option>
									<option value="3">3등급</option>
									<option value="4">4등급</option>
									<option value="5">5등급</option>
									<option value="9">인지지원</option>
								</select>
							</div>
							{/* 층수 필터 */}
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<RoomNoFloorSelect
									members={memberList as any}
									value={selectedFloor}
									onChange={setSelectedFloor}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								/>
							</div>
						</div>
					</div>

					{/* 수급자 목록 테이블 */}
					<div className="flex flex-col overflow-hidden bg-white border border-blue-300 rounded-lg">
						<div className="overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">연번</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">현황</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">수급자명</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">성별</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900 border-r border-blue-200">등급</th>
										<th className="px-2 py-1.5 font-semibold text-center text-blue-900">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">로딩 중...</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">수급자 데이터가 없습니다</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${memberAncd(member)}-${memberPnum(member)}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													memberKey(selectedMember) === memberKey(member) ? 'bg-blue-100' : ''
												}`}
											>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{startIndex + index + 1}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{member.P_NM || '-'}</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="px-2 py-1.5 text-center border-r border-blue-100">
													{formatCareGradeLabel(member.P_GRD)}
												</td>
												<td className="px-2 py-1.5 text-center">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
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
				</div>

				{/* 중간-왼쪽 패널: 제공일자 목록 */}
				<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
					<div className="mb-2">
						<label className="text-sm font-medium text-blue-900">제공일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingServices ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
							) : serviceDates.length === 0 ? (
								<div className="px-2 py-1 text-sm text-blue-900/60">
									{selectedMember ? '제공일자가 없습니다' : '수급자를 선택해주세요'}
								</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = serviceDateStartIndex + localIndex;
									return (
										<div
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`px-2 py-1.5 text-base cursor-pointer hover:bg-blue-100 rounded ${
												selectedDateIndex === globalIndex ? 'bg-blue-200 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</div>
									);
								})
							)}
						</div>
						{/* 제공일자 페이지네이션 */}
						{serviceDateTotalPages > 1 && (
							<div className="p-2 mt-2">
								<div className="flex items-center justify-center gap-1">
									<button
										onClick={() => setServiceDatePage(1)}
										disabled={serviceDatePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										onClick={() => setServiceDatePage(prev => Math.max(1, prev - 1))}
										disabled={serviceDatePage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;
									</button>
									
									<input
										type="number"
										value={serviceDatePage}
										onChange={(e) => {
											const page = parseInt(e.target.value);
											if (page >= 1 && page <= serviceDateTotalPages) {
												setServiceDatePage(page);
											}
										}}
										className="w-12 px-2 py-1 text-xs text-center border border-blue-300 rounded"
										min={1}
										max={serviceDateTotalPages}
									/>
									
									<button
										onClick={() => setServiceDatePage(prev => Math.min(serviceDateTotalPages, prev + 1))}
										disabled={serviceDatePage >= serviceDateTotalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										onClick={() => setServiceDatePage(serviceDateTotalPages)}
										disabled={serviceDatePage >= serviceDateTotalPages}
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
				<div className="flex-1 p-4 overflow-y-auto bg-white">
					<div className="space-y-4">
						{/* 상단 행: 제공일자, 제공시간, 수급자 */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">제공일자</label>
								<input
									type="text"
									value={formData.serviceDate}
									readOnly
									className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">제공시간</label>
								<input
									type="text"
									value={formData.serviceTime}
									onChange={(e) => setFormData(prev => ({ ...prev, serviceTime: e.target.value }))}
									className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[150px]"
									placeholder="제공시간을 입력하세요"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">수급자</label>
								<input
									type="text"
									value={formData.beneficiary}
									readOnly
									className="px-3 py-1.5 text-sm border border-blue-200 rounded bg-gray-50 min-w-[150px]"
								/>
							</div>
						</div>

						{/* 수급자상태 섹션 */}
						<div className="p-4 border border-blue-300 rounded">
							<div className="mb-3">
								<label className="text-sm font-medium text-blue-900">수급자상태</label>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-xs border-collapse">
									<thead>
										<tr className="bg-blue-50">
											<th className="px-3 py-2 font-semibold text-center text-blue-900 border border-blue-200"></th>
											<th className="px-3 py-2 font-semibold text-center text-blue-900 border border-blue-200">얼굴</th>
											<th className="px-3 py-2 font-semibold text-center text-blue-900 border border-blue-200">입술</th>
											<th className="px-3 py-2 font-semibold text-center text-blue-900 border border-blue-200">손톱색깔</th>
											<th className="px-3 py-2 font-semibold text-center text-blue-900 border border-blue-200">인지상태</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td className="px-3 py-2 font-medium text-center text-blue-900 border border-blue-200 bg-blue-50">목욕전</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.beforeBathFace}
													onChange={(e) => setFormData(prev => ({ ...prev, beforeBathFace: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.beforeBathLips}
													onChange={(e) => setFormData(prev => ({ ...prev, beforeBathLips: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.beforeBathNailColor}
													onChange={(e) => setFormData(prev => ({ ...prev, beforeBathNailColor: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.beforeBathCognitiveState}
													onChange={(e) => setFormData(prev => ({ ...prev, beforeBathCognitiveState: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
										</tr>
										<tr>
											<td className="px-3 py-2 font-medium text-center text-blue-900 border border-blue-200 bg-blue-50">목욕후</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.afterBathFace}
													onChange={(e) => setFormData(prev => ({ ...prev, afterBathFace: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.afterBathLips}
													onChange={(e) => setFormData(prev => ({ ...prev, afterBathLips: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.afterBathNailColor}
													onChange={(e) => setFormData(prev => ({ ...prev, afterBathNailColor: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
											<td className="px-3 py-2 text-center border border-blue-200">
												<input
													type="checkbox"
													checked={formData.afterBathCognitiveState}
													onChange={(e) => setFormData(prev => ({ ...prev, afterBathCognitiveState: e.target.checked }))}
													className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
												/>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
							{/* 범례 */}
							<div className="flex items-center gap-4 mt-3">
								<div className="flex items-center gap-2">
									<span className="px-2 py-1 text-xs text-blue-900 border border-red-500 rounded">√: 문제있음</span>
								</div>
								<div className="flex items-center gap-2">
									<input type="checkbox" disabled className="w-4 h-4 border border-blue-300 rounded" />
									<span className="px-2 py-1 text-xs text-blue-900 border border-red-500 rounded">: 문제없음</span>
								</div>
							</div>
						</div>

						{/* 목욕방법 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">목욕방법</label>
							<select
								value={formData.bathingMethod}
								onChange={(e) => setFormData(prev => ({ ...prev, bathingMethod: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
							>
								<option value="샤워식-목욕의자">샤워식-목욕의자</option>
								<option value="샤워식-입욕">샤워식-입욕</option>
								<option value="목욕의자">목욕의자</option>
								<option value="입욕">입욕</option>
								<option value="기타">기타</option>
							</select>
						</div>

						{/* 제공자 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">제공자</label>
							<input
								type="text"
								value={formData.provider}
								onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
								placeholder="제공자를 입력하세요"
							/>
						</div>

						{/* 담당자지움 */}
						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">담당자지움</label>
							<input
								type="checkbox"
								checked={formData.clearPersonInCharge}
								onChange={(e) => setFormData(prev => ({ ...prev, clearPersonInCharge: e.target.checked }))}
								className="w-4 h-4 text-blue-500 border border-blue-300 rounded focus:ring-blue-500"
							/>
						</div>

						{/* 서비스불가사유 */}
						<div className="flex items-start gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">서비스불가사유</label>
							<textarea
								value={formData.serviceUnavailableReason}
								onChange={(e) => setFormData(prev => ({ ...prev, serviceUnavailableReason: e.target.value }))}
								className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:border-blue-500"
								rows={5}
								placeholder="서비스불가사유를 입력하세요"
							/>
						</div>
					</div>

					{/* 하단 버튼 영역 */}
					<div className="flex justify-end gap-2 mt-6">
						<button
							onClick={handleSave}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							저장
						</button>
						<button
							onClick={handleDelete}
							className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
						>
							삭제
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
