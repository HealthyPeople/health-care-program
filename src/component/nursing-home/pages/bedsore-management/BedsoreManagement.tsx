"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { attachLatestRoomNoByPnum } from '../../utils/roomNoFloor';
import { RoomNoFloorSelect } from '../../components/RoomNoFloorSelect';
import { matchesSelectedFloorByRoomNo } from '../../utils/roomNoFloorFilter';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	P_FLOOR?: string | number | null;
	ROOM_NO?: string | null;
	[key: string]: unknown;
}

/** F33010 욕창관리일지 */
interface BedsoreRecord {
	VDT: string;
	DCUB_AREA: string;
	DCUB_SIZE: string;
	DCUB_DEEP: string;
	DCUB_COLOR: string;
	DCUB_DISPO: string;
	MIMG?: string;
}

function todayYmd() {
	const d = new Date();
	const yyyy = String(d.getFullYear()).padStart(4, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function emptyForm(beneficiary: string, observationDate: string) {
	return {
		observationDate,
		beneficiary,
		dcubArea: '',
		dcubSize: '',
		dcubDeep: '',
		dcubColor: '',
		dcubDispo: '',
	};
}

type FormState = ReturnType<typeof emptyForm>;

const PRINT_STYLES = `
@page { size: A4; margin: 12mm; }
body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; color: #111; }
h1 { text-align: center; font-size: 18px; margin: 0 0 12px; }
.meta { margin-bottom: 10px; line-height: 1.6; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
th { background: #f0f4f8; font-weight: 600; }
.center { text-align: center; }
`;

function buildPrintHtml(opts: {
	facility: { ANNM?: string; ANGH?: string };
	member: MemberData | null;
	rows: BedsoreRecord[];
}) {
	const { facility, member, rows } = opts;
	const name = member?.P_NM ?? '';
	const brdt = member?.P_BRDT ? String(member.P_BRDT).slice(0, 10) : '';
	const sex =
		String(member?.P_SEX ?? '') === '1' ? '남' : String(member?.P_SEX ?? '') === '2' ? '여' : '';
	const bodyRows =
		rows.length > 0
			? rows
					.map(
						(r) => `
      <tr>
        <td class="center">${r.VDT ?? ''}</td>
        <td>${escapeHtml(String(r.DCUB_AREA ?? ''))}</td>
        <td>${escapeHtml(String(r.DCUB_SIZE ?? ''))}</td>
        <td>${escapeHtml(String(r.DCUB_DEEP ?? ''))}</td>
        <td>${escapeHtml(String(r.DCUB_COLOR ?? ''))}</td>
        <td>${escapeHtml(String(r.DCUB_DISPO ?? ''))}</td>
      </tr>`
					)
					.join('')
			: `<tr><td colspan="6" class="center">기록이 없습니다</td></tr>`;

	return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><style>${PRINT_STYLES}</style></head><body>
  <h1>욕창관리 일지</h1>
  <div class="meta">
    <div><strong>장기요양기관명</strong> ${escapeHtml(String(facility?.ANNM ?? ''))} &nbsp; <strong>기관기호</strong> ${escapeHtml(String(facility?.ANGH ?? ''))}</div>
    <div><strong>수급자명</strong> ${escapeHtml(name)} &nbsp; <strong>생년월일</strong> ${escapeHtml(brdt)} &nbsp; <strong>성별</strong> ${sex}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:11%">관찰일자</th>
        <th style="width:15%">부위</th>
        <th style="width:12%">크기</th>
        <th style="width:12%">깊이</th>
        <th style="width:14%">색깔</th>
        <th style="width:36%">처치</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`;
}

function escapeHtml(s: string) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export default function BedsoreManagement() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [observationDates, setObservationDates] = useState<string[]>([]);
	const [loadingObservations, setLoadingObservations] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isNewRecord, setIsNewRecord] = useState(false);
	const [datePage, setDatePage] = useState(1);
	const dateItemsPerPage = 10;

	const [formData, setFormData] = useState<FormState>(emptyForm('', todayYmd()));
	const [originalForm, setOriginalForm] = useState<FormState | null>(null);

	const [memberList, setMemberList] = useState<MemberData[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const fetchMembers = async (nameSearch?: string) => {
		setLoading(true);
		try {
			const url =
				nameSearch && nameSearch.trim() !== ''
					? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
					: '/api/f10010';
			const response = await fetch(url);
			const result = await response.json();
			if (result.success) {
				const list = Array.isArray(result.data) ? (result.data as MemberData[]) : [];
				const merged = await attachLatestRoomNoByPnum(list);
				setMemberList(merged);
			}
		} catch (err) {
			console.error('수급자 목록 조회 오류:', err);
		} finally {
			setLoading(false);
		}
	};

	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '-';
		try {
			const year = parseInt(birthDate.substring(0, 4), 10);
			const currentYear = new Date().getFullYear();
			return (currentYear - year).toString();
		} catch {
			return '-';
		}
	};

	const filteredMembers = memberList
		.filter((member) => {
			if (selectedStatus) {
				const memberStatus = String(member.P_ST || '').trim();
				if (selectedStatus === '입소' && memberStatus !== '1') return false;
				if (selectedStatus === '퇴소' && memberStatus !== '9') return false;
			}
			if (selectedGrade) {
				const memberGrade = String(member.P_GRD || '').trim();
				if (memberGrade !== String(selectedGrade).trim()) return false;
			}
			if (selectedFloor) {
				if (!matchesSelectedFloorByRoomNo(member.ROOM_NO, selectedFloor)) return false;
			}
			if (searchTerm.trim()) {
				const searchLower = searchTerm.toLowerCase().trim();
				if (!String(member.P_NM || '').toLowerCase().includes(searchLower)) return false;
			}
			return true;
		})
		.sort((a, b) => String(a.P_NM || '').trim().localeCompare(String(b.P_NM || '').trim(), 'ko'));

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

	const handlePageChange = (page: number) => setCurrentPage(page);

	useEffect(() => {
		fetchMembers();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setCurrentPage(1);
			fetchMembers(searchTerm);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor, searchTerm]);

	const fetchObservationDates = async (pnum: string) => {
		const pn = String(pnum || '').trim();
		if (!pn) {
			setObservationDates([]);
			return;
		}
		setLoadingObservations(true);
		try {
			const res = await fetch(`/api/f33010?mode=dates&pnum=${encodeURIComponent(pn)}`);
			const json = await res.json();
			const list = Array.isArray(json?.data)
				? json.data.map((r: { VDT?: string }) => String(r.VDT || '').trim()).filter(Boolean)
				: [];
			setObservationDates(list);
			setDatePage(1);
		} catch (e) {
			console.error('관찰일자 조회 오류:', e);
			setObservationDates([]);
		} finally {
			setLoadingObservations(false);
		}
	};

	const mapDetailToForm = (data: BedsoreRecord | null, beneficiary: string, dateStr: string): FormState => {
		if (!data) {
			return emptyForm(beneficiary, dateStr);
		}
		return {
			observationDate: String(data.VDT || dateStr).slice(0, 10),
			beneficiary,
			dcubArea: String(data.DCUB_AREA ?? ''),
			dcubSize: String(data.DCUB_SIZE ?? ''),
			dcubDeep: String(data.DCUB_DEEP ?? ''),
			dcubColor: String(data.DCUB_COLOR ?? ''),
			dcubDispo: String(data.DCUB_DISPO ?? ''),
		};
	};

	const loadDetail = async (member: MemberData, vdt: string) => {
		setDetailLoading(true);
		try {
			const pn = encodeURIComponent(String(member.PNUM).trim());
			const vd = encodeURIComponent(vdt);
			const res = await fetch(`/api/f33010?pnum=${pn}&vdt=${vd}`);
			const json = await res.json();
			const row = json?.data as BedsoreRecord | null;
			const beneficiary = member.P_NM || '';
			if (!row) {
				setFormData(emptyForm(beneficiary, vdt));
				setIsEditMode(true);
				setIsNewRecord(true);
				setOriginalForm(null);
				return;
			}
			const fd = mapDetailToForm(row, beneficiary, vdt);
			setFormData(fd);
			setIsEditMode(false);
			setIsNewRecord(false);
			setOriginalForm(JSON.parse(JSON.stringify(fd)));
		} catch (e) {
			console.error('욕창 상세 조회 오류:', e);
		} finally {
			setDetailLoading(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedDateIndex(null);
		setIsNewRecord(false);
		setIsEditMode(false);
		setFormData(emptyForm(member.P_NM || '', todayYmd()));
		setOriginalForm(null);
		fetchObservationDates(String(member.PNUM));
	};

	const handleSelectDate = async (index: number) => {
		setSelectedDateIndex(index);
		const d = observationDates[index];
		if (!selectedMember || !d) return;
		setFormData((prev) => ({ ...prev, observationDate: d }));
		await loadDetail(selectedMember, d);
	};

	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		let s = dateStr;
		if (s.includes('T')) s = s.split('T')[0];
		if (s.includes('-') && s.length >= 10) return s.substring(0, 10);
		if (s.length === 8 && !s.includes('-')) return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
		return s;
	};

	const handleAdd = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const t = todayYmd();
		setFormData(emptyForm(selectedMember.P_NM || '', t));
		setSelectedDateIndex(null);
		setIsNewRecord(true);
		setIsEditMode(true);
		setOriginalForm(null);
	};

	const handleModify = () => {
		if (!selectedMember || !formData.observationDate) {
			alert('수정할 관찰일자를 선택하거나 추가해 주세요.');
			return;
		}
		setOriginalForm(JSON.parse(JSON.stringify(formData)));
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		if (originalForm) {
			setFormData(JSON.parse(JSON.stringify(originalForm)));
		} else if (selectedMember) {
			setFormData(emptyForm(selectedMember.P_NM || '', todayYmd()));
		}
		setIsEditMode(false);
		setIsNewRecord(false);
	};

	const handleClearInput = () => {
		setFormData((prev) => ({
			...prev,
			dcubArea: '',
			dcubSize: '',
			dcubDeep: '',
			dcubColor: '',
			dcubDispo: '',
		}));
		setIsEditMode(true);
	};

	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.observationDate) {
			alert('관찰일자를 입력해주세요.');
			return;
		}
		setLoadingObservations(true);
		try {
			const payload = {
				PNUM: selectedMember.PNUM,
				VDT: formData.observationDate,
				DCUB_AREA: formData.dcubArea,
				DCUB_SIZE: formData.dcubSize,
				DCUB_DEEP: formData.dcubDeep,
				DCUB_COLOR: formData.dcubColor,
				DCUB_DISPO: formData.dcubDispo,
				MIMG: '',
			};
			const res = await fetch('/api/f33010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!json?.success) {
				alert(json?.error || '저장에 실패했습니다.');
				return;
			}
			alert('저장되었습니다.');
			setIsEditMode(false);
			setIsNewRecord(false);
			const pn = encodeURIComponent(String(selectedMember.PNUM).trim());
			const datesRes = await fetch(`/api/f33010?mode=dates&pnum=${pn}`);
			const dj = await datesRes.json();
			const list = Array.isArray(dj?.data)
				? dj.data.map((r: { VDT?: string }) => String(r.VDT || '').trim()).filter(Boolean)
				: [];
			setObservationDates(list);
			setDatePage(1);
			const idx = list.findIndex((x: string) => x === formData.observationDate);
			setSelectedDateIndex(idx >= 0 ? idx : null);
			await loadDetail(selectedMember, formData.observationDate);
		} catch (err) {
			console.error('저장 오류:', err);
			alert('저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingObservations(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.observationDate) {
			alert('삭제할 관찰일자가 없습니다.');
			return;
		}
		if (!confirm('선택한 관찰일자의 욕창관리 기록을 삭제할까요?')) return;
		setLoadingObservations(true);
		try {
			const pn = encodeURIComponent(String(selectedMember.PNUM).trim());
			const vd = encodeURIComponent(formData.observationDate);
			const res = await fetch(`/api/f33010?pnum=${pn}&vdt=${vd}`, { method: 'DELETE' });
			const json = await res.json();
			if (!json?.success) {
				alert(json?.error || '삭제에 실패했습니다.');
				return;
			}
			alert('삭제되었습니다.');
			setSelectedDateIndex(null);
			setIsEditMode(false);
			setFormData(emptyForm(selectedMember.P_NM || '', todayYmd()));
			await fetchObservationDates(String(selectedMember.PNUM));
		} catch (e) {
			console.error('삭제 오류:', e);
			alert('삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingObservations(false);
		}
	};

	const handlePrint = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		try {
			const [facRes, listRes] = await Promise.all([
				fetch('/api/f00110'),
				fetch(`/api/f33010?pnum=${encodeURIComponent(String(selectedMember.PNUM).trim())}`),
			]);
			const facJson = await facRes.json();
			const listJson = await listRes.json();
			const facility = Array.isArray(facJson?.data) && facJson.data[0] ? facJson.data[0] : {};
			const rows = Array.isArray(listJson?.data) ? (listJson.data as BedsoreRecord[]) : [];
			const html = buildPrintHtml({ facility, member: selectedMember, rows });
			const w = window.open('', '_blank');
			if (!w) {
				alert('팝업 차단을 해제해주세요.');
				return;
			}
			w.document.write(html);
			w.document.close();
			setTimeout(() => w.print(), 250);
		} catch (e) {
			console.error(e);
			alert('출력 준비 중 오류가 발생했습니다.');
		}
	};

	const dateTotalPages = Math.ceil(observationDates.length / dateItemsPerPage);
	const dateStartIndex = (datePage - 1) * dateItemsPerPage;
	const currentDateItems = observationDates.slice(dateStartIndex, dateStartIndex + dateItemsPerPage);

	const fieldsLocked = !isEditMode && !isNewRecord;
	const showCancel = isEditMode && (originalForm !== null || isNewRecord);

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				<div className="flex flex-col w-1/4 p-4 bg-white border-r border-blue-200">
					<div className="mb-3">
						<h3 className="mb-2 text-sm font-semibold text-blue-900">수급자 목록</h3>
						<div className="space-y-2">
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded"
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
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
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">층수</div>
								<RoomNoFloorSelect
									members={memberList}
									value={selectedFloor}
									onChange={setSelectedFloor}
									className="w-full px-2 py-1 text-xs text-blue-900 bg-white border border-blue-300 rounded"
								/>
							</div>
						</div>
					</div>

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
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-2 py-4 text-center text-blue-900/60">
												수급자 데이터가 없습니다
											</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleSelectMember(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM ? 'bg-blue-100' : ''
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
												<td className="px-2 py-1.5 text-center border-r border-blue-100">{formatCareGradeLabel(member.P_GRD)}</td>
												<td className="px-2 py-1.5 text-center">{calculateAge(String(member.P_BRDT || ''))}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{totalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										onClick={() => handlePageChange(1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50"
									>
										&lt;
									</button>
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
										return (
											<button
												key={pageNum}
												type="button"
												onClick={() => handlePageChange(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													currentPage === pageNum ? 'bg-blue-500 text-white border-blue-500' : 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									})}
									<button
										type="button"
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => handlePageChange(totalPages)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-col w-1/4 bg-white border-r border-blue-200">
					<div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
						<label className="text-sm font-medium text-blue-900">관찰일자</label>
					</div>
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-y-auto bg-white">
							{loadingObservations ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">로딩 중...</div>
							) : observationDates.length === 0 ? (
								<div className="px-3 py-2 text-sm text-blue-900/60">{selectedMember ? '관찰일자가 없습니다' : '수급자를 선택해주세요'}</div>
							) : (
								currentDateItems.map((date, localIndex) => {
									const globalIndex = dateStartIndex + localIndex;
									return (
										<button
											type="button"
											key={globalIndex}
											onClick={() => handleSelectDate(globalIndex)}
											className={`w-full text-left px-3 py-2 text-sm border-b border-blue-50 hover:bg-blue-50 ${
												selectedDateIndex === globalIndex ? 'bg-blue-100 font-semibold' : ''
											}`}
										>
											{formatDateDisplay(date)}
										</button>
									);
								})
							)}
						</div>
						{dateTotalPages > 1 && (
							<div className="p-2 bg-white border-t border-blue-200">
								<div className="flex items-center justify-center gap-1">
									<button type="button" onClick={() => setDatePage(1)} disabled={datePage === 1} className="px-2 py-1 text-xs border rounded disabled:opacity-50">
										&lt;&lt;
									</button>
									<button
										type="button"
										onClick={() => setDatePage((p) => Math.max(1, p - 1))}
										disabled={datePage === 1}
										className="px-2 py-1 text-xs border rounded disabled:opacity-50"
									>
										&lt;
									</button>
									{Array.from({ length: Math.min(5, dateTotalPages) }, (_, i) => {
										const pageNum = Math.max(1, Math.min(dateTotalPages - 4, datePage - 2)) + i;
										if (pageNum > dateTotalPages) return null;
										return (
											<button
												key={pageNum}
												type="button"
												onClick={() => setDatePage(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${datePage === pageNum ? 'bg-blue-500 text-white' : ''}`}
											>
												{pageNum}
											</button>
										);
									})}
									<button
										type="button"
										onClick={() => setDatePage((p) => Math.min(dateTotalPages, p + 1))}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border rounded disabled:opacity-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => setDatePage(dateTotalPages)}
										disabled={datePage >= dateTotalPages}
										className="px-2 py-1 text-xs border rounded disabled:opacity-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="flex-1 p-4 overflow-y-auto bg-white">
					<div className="flex flex-wrap items-center gap-2 mb-4">
						<button type="button" onClick={handleAdd} className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-medium">
							추가
						</button>
						<button type="button" onClick={handleModify} className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-medium">
							수정
						</button>
						<button type="button" onClick={handlePrint} className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-medium">
							출력
						</button>
					</div>

					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">관찰일자</label>
								<input
									type="date"
									value={formData.observationDate.slice(0, 10)}
									onChange={(e) => setFormData((p) => ({ ...p, observationDate: e.target.value }))}
									disabled={fieldsLocked}
									className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white min-w-[150px] disabled:bg-gray-50"
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

						{detailLoading && <div className="text-sm text-blue-900/60">상세 조회 중...</div>}

						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">부위</label>
							<input
								type="text"
								value={formData.dcubArea}
								onChange={(e) => setFormData((p) => ({ ...p, dcubArea: e.target.value }))}
								disabled={fieldsLocked}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white disabled:bg-gray-50"
								placeholder="부위를 입력하세요"
							/>
						</div>

						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">크기</label>
							<input
								type="text"
								value={formData.dcubSize}
								onChange={(e) => setFormData((p) => ({ ...p, dcubSize: e.target.value }))}
								disabled={fieldsLocked}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white disabled:bg-gray-50"
								placeholder="크기"
							/>
						</div>

						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">깊이</label>
							<input
								type="text"
								value={formData.dcubDeep}
								onChange={(e) => setFormData((p) => ({ ...p, dcubDeep: e.target.value }))}
								disabled={fieldsLocked}
								className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white disabled:bg-gray-50"
								placeholder="깊이"
							/>
						</div>

						<div className="flex items-center gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">색깔</label>
							<input
								type="text"
								value={formData.dcubColor}
								onChange={(e) => setFormData((p) => ({ ...p, dcubColor: e.target.value }))}
								disabled={fieldsLocked}
								className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white disabled:bg-gray-50"
								placeholder="색깔"
							/>
						</div>

						<div className="flex items-start gap-2">
							<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded mt-0.5">처치</label>
							<textarea
								value={formData.dcubDispo}
								onChange={(e) => setFormData((p) => ({ ...p, dcubDispo: e.target.value }))}
								disabled={fieldsLocked}
								rows={4}
								className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded bg-white disabled:bg-gray-50"
								placeholder="처치 내용을 입력하세요"
							/>
						</div>
					</div>

					<div className="flex flex-wrap justify-end gap-2 mt-6">
						<button
							type="button"
							onClick={handleSave}
							disabled={fieldsLocked}
							className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							저장
						</button>
						{showCancel && (
							<button type="button" onClick={handleCancelEdit} className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300">
								취소
							</button>
						)}
						<button type="button" onClick={handleClearInput} className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">
							입력화면지움
						</button>
						<button type="button" onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300">
							삭제
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
