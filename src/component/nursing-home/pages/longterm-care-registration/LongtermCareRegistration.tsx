"use client";
import React, { useState, useEffect } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';
import { attachLatestRoomNoByPnum, normalizeRoomNo } from '../../utils/roomNoFloor';
import { RoomNoFloorSelect } from '../../components/RoomNoFloorSelect';
import { matchesSelectedFloorByRoomNo } from '../../utils/roomNoFloorFilter';
import { BATH_METH_TO_LABEL, resolveBathMethodFromRow } from '../../utils/physicalActivityFields';

interface MemberData {
	ANCD: string;
	PNUM: string;
	P_NM: string;
	P_SEX: string;
	P_GRD: string;
	P_BRDT: string;
	P_ST: string;
	ROOM_NO?: string;
	[key: string]: any;
}

type Yn01 = '0' | '1';

interface CareFormData {
	beneficiary: string;
	provisionDate: string;
	// 신체활동지원
	PH_HEAD_HELP: Yn01;
	PH_BATH_HELP: Yn01;
	PH_BATH_TM: string;
	PH_BATH_METH: string;
	PH_MEAL_KIND: string;
	PH_MEAL_VAL: string;
	PH_TOL_CNT: string;
	PH_MOVE_HELP: Yn01;
	PH_CHANG_HELP: Yn01;
	PH_WORK_HELP: Yn01;
	PH_OUT_HELP: Yn01;
	PH_PS: string;
	PH_WRITE_NAME: string;
	// 인지관리
	RG_AID_HELP: Yn01;
	RG_TALK_HELP: Yn01;
	RG_PS: string;
	RG_WRITE_NAME: string;
	// 건강/간호
	NS_SBDP: string;
	NS_EBDP: string;
	NS_TMPBD: string;
	NS_HLTH_TIME: string;
	NS_HLTH_HELP: Yn01;
	NS_NRSE_TIME: string;
	NS_NRSE_HELP: Yn01;
	NS_ETC: Yn01;
	NS_PS: string;
	NS_WRITE_NAME: string;
	// 기능/프로그램
	FN_COGN_HELP: Yn01;
	FN_MOVE_HELP: Yn01;
	FN_MIND_HELP: Yn01;
	FN_MIND_TRAIN: Yn01;
	FN_PHY_HELP: Yn01;
	FN_PS: string;
	FN_WRITE_NAME: string;
	IO_TM_INFO: string;
	ROOM_NO: string;
}

const defaultCareForm = (overrides: Partial<CareFormData> = {}): CareFormData => ({
	beneficiary: '',
	provisionDate: '',
	PH_HEAD_HELP: '1',
	PH_BATH_HELP: '0',
	PH_BATH_TM: '30',
	PH_BATH_METH: '',
	PH_MEAL_KIND: '1',
	PH_MEAL_VAL: '1',
	PH_TOL_CNT: '1',
	PH_MOVE_HELP: '1',
	PH_CHANG_HELP: '1',
	PH_WORK_HELP: '1',
	PH_OUT_HELP: '1',
	PH_PS: '',
	PH_WRITE_NAME: '',
	RG_AID_HELP: '1',
	RG_TALK_HELP: '1',
	RG_PS: '',
	RG_WRITE_NAME: '',
	NS_SBDP: '',
	NS_EBDP: '',
	NS_TMPBD: '',
	NS_HLTH_TIME: '10',
	NS_HLTH_HELP: '1',
	NS_NRSE_TIME: '10',
	NS_NRSE_HELP: '1',
	NS_ETC: '0',
	NS_PS: '',
	NS_WRITE_NAME: '',
	FN_COGN_HELP: '1',
	FN_MOVE_HELP: '1',
	FN_MIND_HELP: '1',
	FN_MIND_TRAIN: '1',
	FN_PHY_HELP: '1',
	FN_PS: '',
	FN_WRITE_NAME: '',
	IO_TM_INFO: '',
	ROOM_NO: '',
	...overrides
});

const yn = (v: unknown, fallback: Yn01 = '0'): Yn01 => {
	const s = String(v ?? '').trim().toLowerCase();
	if (s === '1' || s === 'y' || s === 'true') return '1';
	if (s === '0' || s === 'n' || s === 'false') return '0';
	return fallback;
};

const strOr = (v: unknown, fallback = '') => {
	if (v == null) return fallback;
	const s = String(v).trim();
	return s === '' ? fallback : s;
};

const labelClass = 'bg-blue-100 border border-blue-300 px-2 py-1.5 text-sm text-blue-900 flex items-center';
const valueClass = 'border border-blue-300 px-2 py-1 bg-white flex items-center gap-1 min-h-[34px]';
const inputClass = 'w-full px-1 py-0.5 text-sm bg-transparent outline-none disabled:text-blue-900';
const selectClass = 'w-full px-1 py-0.5 text-sm bg-white outline-none disabled:bg-transparent disabled:text-blue-900';

export default function LongtermCareRegistration() {
	const formatDateYmd = (v: unknown) => {
		if (v == null) return '';
		const s = String(v).trim();
		if (!s) return '';
		if (s.includes('T')) return s.split('T')[0];
		if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
		if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
		return s.length >= 10 ? s.slice(0, 10) : s;
	};

	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
	const [serviceDates, setServiceDates] = useState<string[]>([]);
	const [loadingServiceDates, setLoadingServiceDates] = useState(false);
	const [serviceDatePage, setServiceDatePage] = useState(1);
	const serviceDateItemsPerPage = 10;
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string>('');
	const [formData, setFormData] = useState<CareFormData>(defaultCareForm());

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
				const list = (Array.isArray(result.data) ? result.data : []) as MemberData[];
				const merged = await attachLatestRoomNoByPnum(list);
				setMemberList(merged as MemberData[]);
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
			const year = parseInt(birthDate.substring(0, 4));
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
				if (String(member.P_GRD || '').trim() !== String(selectedGrade).trim()) return false;
			}
			if (selectedFloor) {
				if (!matchesSelectedFloorByRoomNo((member as any).ROOM_NO, selectedFloor)) return false;
			}
			if (searchTerm && searchTerm.trim() !== '') {
				if (!member.P_NM?.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
			}
			return true;
		})
		.sort((a, b) => (a.P_NM || '').trim().localeCompare((b.P_NM || '').trim(), 'ko'));

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

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

	const fetchServiceDates = async (ancd: string, pnum: string, keepDate?: string) => {
		if (!ancd || !pnum) {
			setServiceDates([]);
			return [] as string[];
		}

		setLoadingServiceDates(true);
		try {
			const today = new Date();
			const end = formatDateYmd(today.toISOString());
			const oneYearAgo = new Date(today);
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			const start = formatDateYmd(oneYearAgo.toISOString());

			const url = `/api/f14020?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(
				pnum
			)}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
			const response = await fetch(url, { method: 'GET' });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || '서비스제공일자 조회 실패');
			}

			const list = Array.isArray(result.data) ? result.data : [];
			const dates: string[] = Array.from(
				new Set(
					list
						.map((r: any) => formatDateYmd(r?.SVDT))
						.filter((d: string) => d && /^\d{4}-\d{2}-\d{2}$/.test(d))
				)
			) as string[];
			dates.sort((a: string, b: string) => (a > b ? -1 : a < b ? 1 : 0));

			setServiceDates(dates);
			if (keepDate) {
				const idx = dates.indexOf(keepDate);
				setSelectedDateIndex(idx >= 0 ? idx : null);
				setSelectedDate(keepDate);
			} else {
				setSelectedDateIndex(null);
				setSelectedDate('');
			}
			setIsEditMode(false);
			return dates;
		} catch (err) {
			console.error('서비스제공일자 조회 오류:', err);
			setServiceDates([]);
			setSelectedDateIndex(null);
			setSelectedDate('');
			setIsEditMode(false);
			return [] as string[];
		} finally {
			setLoadingServiceDates(false);
		}
	};

	const applyRowToForm = (row: any, svdt: string, member: MemberData | null) => {
		const bathMeth = resolveBathMethodFromRow(row) || strOr(row?.PH_BATH_METH, '');
		setFormData(
			defaultCareForm({
				beneficiary: member?.P_NM || '',
				provisionDate: formatDateYmd(row?.SVDT) || svdt,
				PH_HEAD_HELP: yn(row?.PH_HEAD_HELP, '1'),
				PH_BATH_HELP: yn(row?.PH_BATH_HELP, '0'),
				PH_BATH_TM: strOr(row?.PH_BATH_TM, '30'),
				PH_BATH_METH: bathMeth,
				PH_MEAL_KIND: strOr(row?.PH_MEAL_KIND, '1'),
				PH_MEAL_VAL: strOr(row?.PH_MEAL_VAL, '1'),
				PH_TOL_CNT: strOr(row?.PH_TOL_CNT, '1'),
				PH_MOVE_HELP: yn(row?.PH_MOVE_HELP, '1'),
				PH_CHANG_HELP: yn(row?.PH_CHANG_HELP, '1'),
				PH_WORK_HELP: yn(row?.PH_WORK_HELP, '1'),
				PH_OUT_HELP: yn(row?.PH_OUT_HELP, '1'),
				PH_PS: strOr(row?.PH_PS),
				PH_WRITE_NAME: strOr(row?.PH_WRITE_NAME || row?.INEMPNM),
				RG_AID_HELP: yn(row?.RG_AID_HELP, '1'),
				RG_TALK_HELP: yn(row?.RG_TALK_HELP, '1'),
				RG_PS: strOr(row?.RG_PS),
				RG_WRITE_NAME: strOr(row?.RG_WRITE_NAME),
				NS_SBDP: strOr(row?.NS_SBDP),
				NS_EBDP: strOr(row?.NS_EBDP),
				NS_TMPBD: strOr(row?.NS_TMPBD),
				NS_HLTH_TIME: strOr(row?.NS_HLTH_TIME, '10'),
				NS_HLTH_HELP: yn(row?.NS_HLTH_HELP, '1'),
				NS_NRSE_TIME: strOr(row?.NS_NRSE_TIME, '10'),
				NS_NRSE_HELP: yn(row?.NS_NRSE_HELP, '1'),
				NS_ETC: yn(row?.NS_ETC, '0'),
				NS_PS: strOr(row?.NS_PS),
				NS_WRITE_NAME: strOr(row?.NS_WRITE_NAME),
				FN_COGN_HELP: yn(row?.FN_COGN_HELP, '1'),
				FN_MOVE_HELP: yn(row?.FN_MOVE_HELP, '1'),
				FN_MIND_HELP: yn(row?.FN_MIND_HELP, '1'),
				FN_MIND_TRAIN: yn(row?.FN_MIND_TRAIN ?? row?.FN_MIND_HELP, '1'),
				FN_PHY_HELP: yn(row?.FN_PHY_HELP, '1'),
				FN_PS: strOr(row?.FN_PS),
				FN_WRITE_NAME: strOr(row?.FN_WRITE_NAME),
				IO_TM_INFO: strOr(row?.IO_TM_INFO),
				ROOM_NO: strOr(row?.ROOM_NO || normalizeRoomNo(member?.ROOM_NO))
			})
		);
	};

	const fetchDetail = async (ancd: string, pnum: string, svdt: string) => {
		if (!ancd || !pnum || !svdt) return;
		setLoadingDetail(true);
		try {
			const url = `/api/f14020?ancd=${encodeURIComponent(ancd)}&pnum=${encodeURIComponent(
				pnum
			)}&svdt=${encodeURIComponent(svdt)}`;
			const res = await fetch(url, { method: 'GET' });
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '상세 조회 실패');
			}

			const row = Array.isArray(json.data) ? json.data?.[0] : null;
			if (row) {
				applyRowToForm(row, svdt, selectedMember);
			} else {
				setFormData(
					defaultCareForm({
						beneficiary: selectedMember?.P_NM || '',
						provisionDate: svdt,
						ROOM_NO: normalizeRoomNo(selectedMember?.ROOM_NO)
					})
				);
			}
		} catch (e) {
			console.error('상세 조회 오류:', e);
			setFormData(
				defaultCareForm({
					beneficiary: selectedMember?.P_NM || '',
					provisionDate: svdt,
					ROOM_NO: normalizeRoomNo(selectedMember?.ROOM_NO)
				})
			);
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleSelectMember = (member: MemberData) => {
		setSelectedMember(member);
		setFormData(defaultCareForm({ beneficiary: member.P_NM || '', ROOM_NO: normalizeRoomNo(member.ROOM_NO) }));
		fetchServiceDates(member.ANCD, member.PNUM);
	};

	const handleSelectDate = (index: number) => {
		setSelectedDateIndex(index);
		const date = serviceDates[index];
		setSelectedDate(date || '');
		setIsEditMode(false);
		setFormData((prev) => ({ ...prev, provisionDate: date || '' }));

		if (selectedMember?.ANCD && selectedMember?.PNUM && date) {
			fetchDetail(selectedMember.ANCD, selectedMember.PNUM, date);
		}
	};

	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
		if (dateStr.includes('-') && dateStr.length >= 10) return dateStr.substring(0, 10);
		if (dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('년')) {
			return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		}
		return dateStr;
	};

	const updateField = <K extends keyof CareFormData>(field: K, value: CareFormData[K]) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const toggleYn = (field: keyof CareFormData) => {
		if (!isEditMode) return;
		setFormData((prev) => ({
			...prev,
			[field]: prev[field] === '1' ? '0' : '1'
		}));
	};

	const handleModify = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.provisionDate) {
			alert('서비스제공일자를 선택해주세요.');
			return;
		}
		setIsEditMode(true);
	};

	const handleNew = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		const today = formatDateYmd(new Date().toISOString());
		setSelectedDateIndex(null);
		setSelectedDate(today);
		setFormData(
			defaultCareForm({
				beneficiary: selectedMember.P_NM || '',
				provisionDate: today,
				ROOM_NO: normalizeRoomNo(selectedMember.ROOM_NO)
			})
		);
		setIsEditMode(true);
	};

	const buildSaveRow = () => ({
		pnum: selectedMember!.PNUM,
		PH_HEAD_HELP: formData.PH_HEAD_HELP,
		PH_BATH_HELP: formData.PH_BATH_HELP,
		PH_BATH_TM: formData.PH_BATH_TM,
		PH_BATH_METH: formData.PH_BATH_METH,
		PH_MEAL_KIND: formData.PH_MEAL_KIND,
		PH_MEAL_VAL: formData.PH_MEAL_VAL,
		PH_TOL_CNT: formData.PH_TOL_CNT,
		PH_MOVE_HELP: formData.PH_MOVE_HELP,
		PH_CHANG_HELP: formData.PH_CHANG_HELP,
		PH_WORK_HELP: formData.PH_WORK_HELP,
		PH_OUT_HELP: formData.PH_OUT_HELP,
		PH_PS: formData.PH_PS,
		PH_WRITE_NAME: formData.PH_WRITE_NAME,
		RG_AID_HELP: formData.RG_AID_HELP,
		RG_TALK_HELP: formData.RG_TALK_HELP,
		RG_PS: formData.RG_PS,
		RG_WRITE_NAME: formData.RG_WRITE_NAME,
		NS_SBDP: formData.NS_SBDP,
		NS_EBDP: formData.NS_EBDP,
		NS_TMPBD: formData.NS_TMPBD,
		NS_HLTH_TIME: formData.NS_HLTH_TIME,
		NS_HLTH_HELP: formData.NS_HLTH_HELP,
		NS_NRSE_TIME: formData.NS_NRSE_TIME,
		NS_NRSE_HELP: formData.NS_NRSE_HELP,
		NS_ETC: formData.NS_ETC,
		NS_PS: formData.NS_PS,
		NS_WRITE_NAME: formData.NS_WRITE_NAME,
		FN_COGN_HELP: formData.FN_COGN_HELP,
		FN_MOVE_HELP: formData.FN_MOVE_HELP,
		FN_MIND_HELP: formData.FN_MIND_TRAIN,
		FN_MIND_TRAIN: formData.FN_MIND_TRAIN,
		FN_PHY_HELP: formData.FN_PHY_HELP,
		FN_PS: formData.FN_PS,
		FN_WRITE_NAME: formData.FN_WRITE_NAME,
		IO_TM_INFO: formData.IO_TM_INFO,
		ROOM_NO: formData.ROOM_NO
	});

	const handleSaveDailyWriter = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.provisionDate) {
			alert('출석일자를 입력해주세요.');
			return;
		}

		setLoadingDetail(true);
		try {
			const payload = { svdt: formData.provisionDate, rows: [buildSaveRow()] };
			const res = await fetch(`/api/f14020?ancd=${encodeURIComponent(selectedMember.ANCD)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '저장 실패');
			}

			alert('저장되었습니다.');
			setIsEditMode(false);
			const savedDate = formData.provisionDate;
			await fetchServiceDates(selectedMember.ANCD, selectedMember.PNUM, savedDate);
			await fetchDetail(selectedMember.ANCD, selectedMember.PNUM, savedDate);
		} catch (e) {
			console.error('저장 오류:', e);
			alert('저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleSaveWriterBatch = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (serviceDates.length === 0) {
			alert('저장할 서비스제공일자가 없습니다.');
			return;
		}
		if (!confirm('현재 입력값을 조회된 서비스제공일자 전체에 일괄 저장하시겠습니까?')) {
			return;
		}

		setLoadingDetail(true);
		try {
			const row = buildSaveRow();
			for (const d of serviceDates) {
				const res = await fetch(`/api/f14020?ancd=${encodeURIComponent(selectedMember.ANCD)}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ svdt: d, rows: [row] })
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok || !json?.success) {
					throw new Error(json?.error || `일괄 저장 실패 (${d})`);
				}
			}

			alert('일괄 저장이 완료되었습니다.');
			setIsEditMode(false);
			const keep = formData.provisionDate;
			await fetchServiceDates(selectedMember.ANCD, selectedMember.PNUM, keep || undefined);
			if (keep) {
				await fetchDetail(selectedMember.ANCD, selectedMember.PNUM, keep);
			}
		} catch (e) {
			console.error('일괄 저장 오류:', e);
			alert('일괄 저장 중 오류가 발생했습니다.');
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (!formData.provisionDate) {
			alert('제공일자를 선택해주세요.');
			return;
		}
		if (!confirm('정말 삭제하시겠습니까?')) return;

		setLoadingDetail(true);
		try {
			const url = `/api/f14020?ancd=${encodeURIComponent(selectedMember.ANCD)}&pnum=${encodeURIComponent(
				selectedMember.PNUM
			)}&svdt=${encodeURIComponent(formData.provisionDate)}`;
			const res = await fetch(url, { method: 'DELETE' });
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || '삭제 실패');
			}

			alert('삭제되었습니다.');
			setIsEditMode(false);
			setSelectedDateIndex(null);
			setSelectedDate('');
			setFormData(
				defaultCareForm({
					beneficiary: selectedMember.P_NM || '',
					ROOM_NO: normalizeRoomNo(selectedMember.ROOM_NO)
				})
			);
			await fetchServiceDates(selectedMember.ANCD, selectedMember.PNUM);
		} catch (e) {
			console.error('삭제 오류:', e);
			alert('삭제 중 오류가 발생했습니다.');
		} finally {
			setLoadingDetail(false);
		}
	};

	const YnCell = ({ field, label = '실시' }: { field: keyof CareFormData; label?: string }) => (
		<div className={`${valueClass} justify-center`}>
			<input
				type="checkbox"
				checked={formData[field] === '1'}
				onChange={() => toggleYn(field)}
				disabled={!isEditMode}
				className="w-4 h-4 accent-blue-600"
			/>
			<span className="text-sm text-blue-900">{label}</span>
		</div>
	);

	const TextCell = ({
		field,
		type = 'text',
		className = ''
	}: {
		field: keyof CareFormData;
		type?: string;
		className?: string;
	}) => (
		<div className={`${valueClass} ${className}`}>
			<input
				type={type}
				value={String(formData[field] ?? '')}
				onChange={(e) => updateField(field, e.target.value as any)}
				disabled={!isEditMode}
				className={inputClass}
			/>
		</div>
	);

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="flex h-[calc(100vh-56px)]">
				{/* 좌측 패널: 수급자 목록 */}
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
									members={memberList as any}
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
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM
														? 'bg-blue-100'
														: ''
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

				{/* 우측 패널 */}
				<div className="flex flex-1 bg-white">
					{/* 서비스제공일자 목록 */}
					<div className="flex flex-col w-1/4 px-4 py-3 border-r border-blue-200 bg-blue-50">
						<div className="mb-2">
							<label className="text-sm font-medium text-blue-900">서비스제공일자</label>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							<div className="overflow-y-auto">
								{loadingServiceDates ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">로딩 중...</div>
								) : serviceDates.length === 0 ? (
									<div className="px-2 py-1 text-sm text-blue-900/60">
										{selectedMember ? '서비스제공일자가 없습니다' : '수급자를 선택해주세요'}
									</div>
								) : (
									(() => {
										const dateStartIndex = (serviceDatePage - 1) * serviceDateItemsPerPage;
										const dateEndIndex = dateStartIndex + serviceDateItemsPerPage;
										const currentDateItems = serviceDates.slice(dateStartIndex, dateEndIndex);

										return currentDateItems.map((date, localIndex) => {
											const globalIndex = dateStartIndex + localIndex;
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
										});
									})()
								)}
							</div>
							{serviceDates.length > serviceDateItemsPerPage && (
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
											onClick={() => setServiceDatePage((prev) => Math.max(1, prev - 1))}
											disabled={serviceDatePage === 1}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&lt;
										</button>
										{(() => {
											const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
											const pagesToShow = Math.min(5, totalDatePages);
											const startPage = Math.max(1, Math.min(totalDatePages - 4, serviceDatePage - 2));
											return Array.from({ length: pagesToShow }, (_, i) => {
												const pageNum = startPage + i;
												if (pageNum > totalDatePages) return null;
												return (
													<button
														key={pageNum}
														onClick={() => setServiceDatePage(pageNum)}
														className={`px-2 py-1 text-xs border rounded ${
															serviceDatePage === pageNum
																? 'bg-blue-500 text-white border-blue-500'
																: 'border-blue-300 hover:bg-blue-50'
														}`}
													>
														{pageNum}
													</button>
												);
											}).filter(Boolean);
										})()}
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
												setServiceDatePage((prev) => Math.min(totalDatePages, prev + 1));
											}}
											disabled={serviceDatePage >= Math.ceil(serviceDates.length / serviceDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;
										</button>
										<button
											onClick={() => {
												const totalDatePages = Math.ceil(serviceDates.length / serviceDateItemsPerPage);
												setServiceDatePage(totalDatePages);
											}}
											disabled={serviceDatePage >= Math.ceil(serviceDates.length / serviceDateItemsPerPage)}
											className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
										>
											&gt;&gt;
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* 상세 정보 (이미지 레이아웃) */}
					<div className="flex-1 p-3 overflow-y-auto">
						<div className="flex flex-wrap items-center gap-2 mb-2">
							<button
								onClick={handleNew}
								disabled={!selectedMember || loadingDetail}
								className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium disabled:opacity-50"
							>
								신규
							</button>
							{!isEditMode ? (
								<>
									<button
										onClick={handleModify}
										disabled={!selectedMember || !formData.provisionDate || loadingDetail}
										className="px-3 py-1.5 text-sm border border-green-400 rounded bg-green-200 hover:bg-green-300 text-green-900 font-medium disabled:opacity-50"
									>
										수정
									</button>
									<button
										onClick={handleDelete}
										disabled={!selectedMember || !formData.provisionDate || loadingDetail}
										className="px-3 py-1.5 text-sm border border-red-400 rounded bg-red-200 hover:bg-red-300 text-red-900 font-medium disabled:opacity-50"
									>
										삭제
									</button>
								</>
							) : (
								<>
									<button
										onClick={handleSaveDailyWriter}
										disabled={loadingDetail}
										className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
									>
										저장
									</button>
									{/* <button
										onClick={handleSaveWriterBatch}
										disabled={loadingDetail}
										className="px-3 py-1.5 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-medium"
									>
										기간일괄 저장
									</button> */}
									<button
										onClick={() => {
											setIsEditMode(false);
											if (selectedMember && formData.provisionDate) {
												fetchDetail(selectedMember.ANCD, selectedMember.PNUM, formData.provisionDate);
											}
										}}
										disabled={loadingDetail}
										className="px-3 py-1.5 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium"
									>
										취소
									</button>
								</>
							)}
							{loadingDetail && <span className="text-sm text-blue-900/60">처리 중...</span>}
						</div>

						<div className="border border-blue-400 overflow-hidden text-sm">
							{/* 헤더 */}
							<div className="grid grid-cols-12">
								<div className={`${labelClass} col-span-2 justify-center`}>출석일자</div>
								<div className={`${valueClass} col-span-4`}>
									<input
										type="date"
										value={formData.provisionDate || ''}
										onChange={(e) => updateField('provisionDate', e.target.value)}
										disabled={!isEditMode}
										className={inputClass}
									/>
								</div>
								<div className={`${labelClass} col-span-2 justify-center`}>수급자</div>
								<div className={`${valueClass} col-span-4`}>
									<span className="px-1">{formData.beneficiary || '-'}</span>
								</div>
							</div>

							{/* 1. 신체활동지원 */}
							<div className="border-t-2 border-blue-400">
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-4`}>세면, 구강, 머리감기, 몸단장, 옷 갈아입기</div>
									<div className="col-span-1">
										<YnCell field="PH_HEAD_HELP" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>목욕</div>
									<div className="col-span-1">
										<YnCell field="PH_BATH_HELP" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>식사 종류</div>
									<div className={`${valueClass} col-span-2`}>
										<select
											value={formData.PH_MEAL_KIND}
											onChange={(e) => updateField('PH_MEAL_KIND', e.target.value)}
											disabled={!isEditMode}
											className={selectClass}
										>
											<option value="1">일반식</option>
											<option value="2">죽</option>
											<option value="3">유동식(미음)</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-4`}>화장실이용하기(기저귀교환) - 회</div>
									<div className="col-span-1">
										<TextCell field="PH_TOL_CNT" type="number" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>목욕시간(분)</div>
									<div className="col-span-1">
										<TextCell field="PH_BATH_TM" type="number" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>섭취량</div>
									<div className={`${valueClass} col-span-2`}>
										<select
											value={formData.PH_MEAL_VAL}
											onChange={(e) => updateField('PH_MEAL_VAL', e.target.value)}
											disabled={!isEditMode}
											className={selectClass}
										>
											<option value="1">1(한그릇)</option>
											<option value="2">1/2이상</option>
											<option value="3">1/2미만</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-4`}>이동도움 및 신체기능 유지, 증진</div>
									<div className="col-span-1">
										<YnCell field="PH_MOVE_HELP" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>목욕방법</div>
									<div className={`${valueClass} col-span-5`}>
										<select
											value={formData.PH_BATH_METH}
											onChange={(e) => updateField('PH_BATH_METH', e.target.value)}
											disabled={!isEditMode}
											className={selectClass}
										>
											<option value="">선택</option>
											{Object.entries(BATH_METH_TO_LABEL).map(([code, name]) => (
												<option key={code} value={code}>
													{name}
												</option>
											))}
										</select>
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-4`}>체위변경(2시간마다)</div>
									<div className="col-span-1">
										<YnCell field="PH_CHANG_HELP" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>산책동행</div>
									<div className="col-span-1">
										<YnCell field="PH_WORK_HELP" />
									</div>
									<div className={`${labelClass} col-span-3 justify-center`}>외출동행</div>
									<div className="col-span-1">
										<YnCell field="PH_OUT_HELP" />
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>특이사항</div>
									<div className={`${valueClass} col-span-7`}>
										<input
											type="text"
											value={formData.PH_PS}
											onChange={(e) => updateField('PH_PS', e.target.value)}
											disabled={!isEditMode}
											className={inputClass}
										/>
									</div>
									<div className={`${labelClass} col-span-1 justify-center text-xs`}>작성자성명</div>
									<div className="col-span-2">
										<TextCell field="PH_WRITE_NAME" />
									</div>
								</div>
							</div>

							{/* 2. 인지관리 */}
							<div className="border-t-2 border-blue-400">
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-4`}>인지관리 지원</div>
									<div className="col-span-2">
										<YnCell field="RG_AID_HELP" />
									</div>
									<div className={`${labelClass} col-span-4`}>인지관리-의사소통도움</div>
									<div className="col-span-2">
										<YnCell field="RG_TALK_HELP" />
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>특이사항</div>
									<div className={`${valueClass} col-span-7`}>
										<input
											type="text"
											value={formData.RG_PS}
											onChange={(e) => updateField('RG_PS', e.target.value)}
											disabled={!isEditMode}
											className={inputClass}
										/>
									</div>
									<div className={`${labelClass} col-span-1 justify-center text-xs`}>작성자성명</div>
									<div className="col-span-2">
										<TextCell field="RG_WRITE_NAME" />
									</div>
								</div>
							</div>

							{/* 3. 건강 및 간호관리 */}
							<div className="border-t-2 border-blue-400">
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>혈압-(수축)</div>
									<div className="col-span-2">
										<TextCell field="NS_SBDP" type="number" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>{'(이완)'}</div>
									<div className="col-span-2">
										<TextCell field="NS_EBDP" type="number" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>체온</div>
									<div className="col-span-2">
										<TextCell field="NS_TMPBD" type="number" />
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>건강관리(분)</div>
									<div className="col-span-2">
										<TextCell field="NS_HLTH_TIME" type="number" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>건강관리</div>
									<div className="col-span-2">
										<YnCell field="NS_HLTH_HELP" />
									</div>
									<div className="col-span-4" />
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>간호관리(분)</div>
									<div className="col-span-2">
										<TextCell field="NS_NRSE_TIME" type="number" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center`}>간호관리</div>
									<div className="col-span-2">
										<YnCell field="NS_NRSE_HELP" />
									</div>
									<div className={`${labelClass} col-span-2 justify-center text-xs`}>기타(응급서비스)</div>
									<div className="col-span-2">
										<YnCell field="NS_ETC" />
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>특이사항</div>
									<div className={`${valueClass} col-span-7`}>
										<input
											type="text"
											value={formData.NS_PS}
											onChange={(e) => updateField('NS_PS', e.target.value)}
											disabled={!isEditMode}
											className={inputClass}
										/>
									</div>
									<div className={`${labelClass} col-span-1 justify-center text-xs`}>작성자성명</div>
									<div className="col-span-2">
										<TextCell field="NS_WRITE_NAME" />
									</div>
								</div>
							</div>

							{/* 4. 프로그램 / 입퇴소 */}
							<div className="border-t-2 border-blue-400">
								<div className="grid grid-cols-12">
									<div className="col-span-6 border-r border-blue-300">
										<div className="grid grid-cols-12">
											<div className={`${labelClass} col-span-9`}>신체.인지기능 향상 프로그램</div>
											<div className="col-span-3">
												<YnCell field="FN_COGN_HELP" />
											</div>
										</div>
										<div className="grid grid-cols-12">
											<div className={`${labelClass} col-span-9`}>신체기능, 기본동작 일상생활활동동작훈련</div>
											<div className="col-span-3">
												<YnCell field="FN_MOVE_HELP" />
											</div>
										</div>
										<div className="grid grid-cols-12">
											<div className={`${labelClass} col-span-9`}>인지기능향상훈련</div>
											<div className="col-span-3">
												<YnCell field="FN_MIND_TRAIN" />
											</div>
										</div>
										<div className="grid grid-cols-12">
											<div className={`${labelClass} col-span-9`}>물리치료작업</div>
											<div className="col-span-3">
												<YnCell field="FN_PHY_HELP" />
											</div>
										</div>
									</div>
									<div className="col-span-6">
										<div className="grid grid-cols-12 h-full">
											<div className={`${labelClass} col-span-5 text-xs leading-tight`}>
												수급자의 입,퇴소시간, 외박 및 복귀시간, 외출시간
											</div>
											<div className={`${valueClass} col-span-7 items-stretch`}>
												<textarea
													value={formData.IO_TM_INFO}
													onChange={(e) => updateField('IO_TM_INFO', e.target.value)}
													disabled={!isEditMode}
													rows={3}
													className="w-full px-1 py-0.5 text-sm bg-transparent outline-none resize-none disabled:text-blue-900"
												/>
											</div>
											<div className={`${labelClass} col-span-5 justify-center`}>침실호수</div>
											<div className="col-span-7">
												<TextCell field="ROOM_NO" />
											</div>
										</div>
									</div>
								</div>
								<div className="grid grid-cols-12">
									<div className={`${labelClass} col-span-2 justify-center`}>특이사항</div>
									<div className={`${valueClass} col-span-7`}>
										<input
											type="text"
											value={formData.FN_PS}
											onChange={(e) => updateField('FN_PS', e.target.value)}
											disabled={!isEditMode}
											className={inputClass}
										/>
									</div>
									<div className={`${labelClass} col-span-1 justify-center text-xs`}>작성자성명</div>
									<div className="col-span-2">
										<TextCell field="FN_WRITE_NAME" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
