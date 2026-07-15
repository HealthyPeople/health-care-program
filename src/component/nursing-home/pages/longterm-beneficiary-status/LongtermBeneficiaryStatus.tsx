"use client";

import { useState, type ReactNode } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

type Flag = '1' | '0';
type StatusCode = '1' | '2' | '3';
type DentureCode = '1' | '2' | '3';

const STATUS_TO_LABEL: Record<StatusCode, '와상' | '준와상' | '자립'> = {
	'1': '와상',
	'2': '준와상',
	'3': '자립'
};
const STATUS_LABEL_TO_CODE: Record<string, StatusCode> = {
	와상: '1',
	준와상: '2',
	자립: '3'
};
const DENTURE_TO_LABEL: Record<DentureCode, string> = {
	'1': '부분',
	'2': '전체',
	'3': '틀니안함'
};
const DENTURE_LABEL_TO_CODE: Record<string, DentureCode> = {
	부분: '1',
	전체: '2',
	틀니안함: '3'
};

export default function LongtermBeneficiaryStatus() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loadingDefaults, setLoadingDefaults] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [originalDraft, setOriginalDraft] = useState<Record<string, any> | null>(null);

	const [status, setStatus] = useState<StatusCode>('2'); // ST_SP_ST

	const [dementia, setDementia] = useState<Flag>('0'); // ST_SCK_ALZ
	const [stroke, setStroke] = useState<Flag>('0'); // ST_SCK_APO
	const [hypertension, setHypertension] = useState<Flag>('0'); // ST_SCK_HBL
	const [diabetes, setDiabetes] = useState<Flag>('0'); // ST_SCK_GLY
	const [arthritis, setArthritis] = useState<Flag>('0'); // ST_SCK_ARTH
	const [otherDisease, setOtherDisease] = useState<Flag>('0'); // ST_SCK_GITA
	const [otherDiseaseText, setOtherDiseaseText] = useState(''); // ST_SCK_GITA_DSC

	const [tracheostomy, setTracheostomy] = useState<Flag>('0'); // ST_MNG_BRN
	const [dentures, setDentures] = useState<Flag>('0'); // ST_MNG_DNT
	const [denturesType, setDenturesType] = useState<DentureCode>('1'); // ST_MNG_DNT_DSC
	const [nasogastricTube, setNasogastricTube] = useState<Flag>('0'); // ST_MNG_LTUB
	const [urinaryCatheter, setUrinaryCatheter] = useState<Flag>('0'); // ST_MNG_FIX_TUB
	const [cystostomy, setCystostomy] = useState<Flag>('0'); // ST_MNG_CYS
	const [urostomy, setUrostomy] = useState<Flag>('0'); // ST_MNG_URB
	const [colostomy, setColostomy] = useState<Flag>('0'); // ST_MNG_TOP
	const [diaper, setDiaper] = useState<Flag>('0'); // ST_MNG_DAP
	const [pressureSore, setPressureSore] = useState<Flag>('0'); // ST_MNG_BAD
	const [pressureSoreArea, setPressureSoreArea] = useState(''); // ST_MNG_BAD_DSC
	const [pressureSorePrevention, setPressureSorePrevention] = useState<Flag>('0'); // ST_MNG_BCHK
	const [pressureSorePreventionTool, setPressureSorePreventionTool] = useState(''); // ST_MNG_BCHK_DSC

	const selectedPnum = String(selectedMember?.PNUM ?? '').trim();

	const ynToFlag = (v: unknown): Flag => {
		const s = String(v ?? '').trim().toLowerCase();
		if (s === '1' || s === 'y' || s === 'true') return '1';
		return '0';
	};

	const boolToFlag = (v: unknown): Flag => (v === true ? '1' : '0');

	const toStatusCode = (v: unknown): StatusCode => {
		const s = String(v ?? '').trim();
		if (s === '1' || s === '2' || s === '3') return s as StatusCode;
		if (STATUS_LABEL_TO_CODE[s]) return STATUS_LABEL_TO_CODE[s];
		return '2';
	};

	const toDentureCode = (v: unknown): DentureCode => {
		const s = String(v ?? '').trim();
		if (s === '1' || s === '2' || s === '3') return s as DentureCode;
		if (DENTURE_LABEL_TO_CODE[s]) return DENTURE_LABEL_TO_CODE[s];
		return '1';
	};

	const resolveDentures = (dnt: unknown, dntDsc: unknown): { checked: Flag; type: DentureCode } => {
		const type = toDentureCode(dntDsc);
		const checked: Flag = ynToFlag(dnt) === '1' || type === '1' || type === '2' ? '1' : '0';
		return { checked, type };
	};

	const buildDraftFromValues = (d: any) => {
		const sore = ynToFlag(d?.ST_SCK_GITA);
		const bad = ynToFlag(d?.ST_MNG_BAD);
		const bchk = ynToFlag(d?.ST_MNG_BCHK);
		const { checked: dnt, type: dntDsc } = resolveDentures(d?.ST_MNG_DNT, d?.ST_MNG_DNT_DSC);
		return {
			ST_SP_ST: toStatusCode(d?.ST_SP_ST),
			ST_SCK_ALZ: ynToFlag(d?.ST_SCK_ALZ),
			ST_SCK_APO: ynToFlag(d?.ST_SCK_APO),
			ST_SCK_HBL: ynToFlag(d?.ST_SCK_HBL),
			ST_SCK_GLY: ynToFlag(d?.ST_SCK_GLY),
			ST_SCK_ARTH: ynToFlag(d?.ST_SCK_ARTH),
			ST_SCK_GITA: sore,
			ST_SCK_GITA_DSC: sore === '1' ? String(d?.ST_SCK_GITA_DSC ?? '') : '',
			ST_MNG_BRN: ynToFlag(d?.ST_MNG_BRN),
			ST_MNG_DNT: dnt,
			ST_MNG_DNT_DSC: dnt === '1' ? dntDsc : dntDsc === '3' ? '3' : '',
			ST_MNG_LTUB: ynToFlag(d?.ST_MNG_LTUB),
			ST_MNG_FIX_TUB: ynToFlag(d?.ST_MNG_FIX_TUB),
			ST_MNG_CYS: ynToFlag(d?.ST_MNG_CYS),
			ST_MNG_URB: ynToFlag(d?.ST_MNG_URB),
			ST_MNG_TOP: ynToFlag(d?.ST_MNG_TOP),
			ST_MNG_DAP: ynToFlag(d?.ST_MNG_DAP),
			ST_MNG_BAD: bad,
			ST_MNG_BAD_DSC: bad === '1' ? String(d?.ST_MNG_BAD_DSC ?? '') : '',
			ST_MNG_BCHK: bchk,
			ST_MNG_BCHK_DSC: bchk === '1' ? String(d?.ST_MNG_BCHK_DSC ?? '') : ''
		};
	};

	const buildDraft = () => buildDraftFromValues({
		ST_SP_ST: status,
		ST_SCK_ALZ: dementia,
		ST_SCK_APO: stroke,
		ST_SCK_HBL: hypertension,
		ST_SCK_GLY: diabetes,
		ST_SCK_ARTH: arthritis,
		ST_SCK_GITA: otherDisease,
		ST_SCK_GITA_DSC: otherDiseaseText,
		ST_MNG_BRN: tracheostomy,
		ST_MNG_DNT: dentures,
		ST_MNG_DNT_DSC: denturesType,
		ST_MNG_LTUB: nasogastricTube,
		ST_MNG_FIX_TUB: urinaryCatheter,
		ST_MNG_CYS: cystostomy,
		ST_MNG_URB: urostomy,
		ST_MNG_TOP: colostomy,
		ST_MNG_DAP: diaper,
		ST_MNG_BAD: pressureSore,
		ST_MNG_BAD_DSC: pressureSoreArea,
		ST_MNG_BCHK: pressureSorePrevention,
		ST_MNG_BCHK_DSC: pressureSorePreventionTool
	});

	const applyLegacyJson = (d: any) => {
		const raw = d?.RG_JSON ?? d?.RG_ETC_DESC ?? d?.NS_ETC_DESC ?? '';
		if (!raw) return;
		try {
			const obj = JSON.parse(String(raw));
			const j = obj?.beneficiaryStatus ?? obj;
			if (!j || typeof j !== 'object') return;

			if (d?.ST_SP_ST == null && j.status) setStatus(toStatusCode(STATUS_LABEL_TO_CODE[j.status] ?? j.status));
			if (d?.ST_SCK_ALZ == null && typeof j.dementia === 'boolean') setDementia(boolToFlag(j.dementia));
			if (d?.ST_SCK_APO == null && typeof j.stroke === 'boolean') setStroke(boolToFlag(j.stroke));
			if (d?.ST_SCK_HBL == null && typeof j.hypertension === 'boolean') setHypertension(boolToFlag(j.hypertension));
			if (d?.ST_SCK_GLY == null && typeof j.diabetes === 'boolean') setDiabetes(boolToFlag(j.diabetes));
			if (d?.ST_SCK_ARTH == null && typeof j.arthritis === 'boolean') setArthritis(boolToFlag(j.arthritis));
			if (d?.ST_SCK_GITA == null && typeof j.otherDisease === 'boolean') setOtherDisease(boolToFlag(j.otherDisease));
			if (d?.ST_SCK_GITA_DSC == null && typeof j.otherDiseaseText === 'string') setOtherDiseaseText(j.otherDiseaseText);
			if (d?.ST_MNG_BRN == null && typeof j.tracheostomy === 'boolean') setTracheostomy(boolToFlag(j.tracheostomy));
			if (d?.ST_MNG_DNT == null && typeof j.dentures === 'boolean') setDentures(boolToFlag(j.dentures));
			if (d?.ST_MNG_DNT_DSC == null && j.denturesType) setDenturesType(toDentureCode(DENTURE_LABEL_TO_CODE[j.denturesType] ?? j.denturesType));
			if (d?.ST_MNG_LTUB == null && typeof j.nasogastricTube === 'boolean') setNasogastricTube(boolToFlag(j.nasogastricTube));
			if (d?.ST_MNG_FIX_TUB == null && typeof j.urinaryCatheter === 'boolean') setUrinaryCatheter(boolToFlag(j.urinaryCatheter));
			if (d?.ST_MNG_CYS == null && typeof j.cystostomy === 'boolean') setCystostomy(boolToFlag(j.cystostomy));
			if (d?.ST_MNG_URB == null && typeof j.urostomy === 'boolean') setUrostomy(boolToFlag(j.urostomy));
			if (d?.ST_MNG_TOP == null && typeof j.colostomy === 'boolean') setColostomy(boolToFlag(j.colostomy));
			if (d?.ST_MNG_DAP == null && typeof j.diaper === 'boolean') setDiaper(boolToFlag(j.diaper));
			if (d?.ST_MNG_BAD == null && typeof j.pressureSore === 'boolean') setPressureSore(boolToFlag(j.pressureSore));
			if (d?.ST_MNG_BAD_DSC == null && typeof j.pressureSoreArea === 'string') setPressureSoreArea(j.pressureSoreArea);
			if (d?.ST_MNG_BCHK == null && typeof j.pressureSorePrevention === 'boolean') setPressureSorePrevention(boolToFlag(j.pressureSorePrevention));
			if (d?.ST_MNG_BCHK_DSC == null && typeof j.pressureSorePreventionTool === 'string') setPressureSorePreventionTool(j.pressureSorePreventionTool);
		} catch {}
	};

	const applyDraft = (d: any) => {
		setStatus(toStatusCode(d?.ST_SP_ST));
		setDementia(ynToFlag(d?.ST_SCK_ALZ));
		setStroke(ynToFlag(d?.ST_SCK_APO));
		setHypertension(ynToFlag(d?.ST_SCK_HBL));
		setDiabetes(ynToFlag(d?.ST_SCK_GLY));
		setArthritis(ynToFlag(d?.ST_SCK_ARTH));
		setOtherDisease(ynToFlag(d?.ST_SCK_GITA));
		setOtherDiseaseText(String(d?.ST_SCK_GITA_DSC ?? ''));
		setTracheostomy(ynToFlag(d?.ST_MNG_BRN));
		const { checked: dnt, type: dntDsc } = resolveDentures(d?.ST_MNG_DNT, d?.ST_MNG_DNT_DSC);
		setDentures(dnt);
		setDenturesType(dntDsc);
		setNasogastricTube(ynToFlag(d?.ST_MNG_LTUB));
		setUrinaryCatheter(ynToFlag(d?.ST_MNG_FIX_TUB));
		setCystostomy(ynToFlag(d?.ST_MNG_CYS));
		setUrostomy(ynToFlag(d?.ST_MNG_URB));
		setColostomy(ynToFlag(d?.ST_MNG_TOP));
		setDiaper(ynToFlag(d?.ST_MNG_DAP));
		setPressureSore(ynToFlag(d?.ST_MNG_BAD));
		setPressureSoreArea(String(d?.ST_MNG_BAD_DSC ?? ''));
		setPressureSorePrevention(ynToFlag(d?.ST_MNG_BCHK));
		setPressureSorePreventionTool(String(d?.ST_MNG_BCHK_DSC ?? ''));

		const hasDirectColumn =
			d?.ST_SP_ST != null ||
			d?.ST_SCK_ALZ != null ||
			d?.ST_MNG_BRN != null;
		if (!hasDirectColumn) applyLegacyJson(d);
	};

	const isDirty = () => {
		if (!originalDraft) return false;
		const cur = buildDraft() as Record<string, any>;
		for (const k of Object.keys(cur)) {
			if (String(cur[k] ?? '') !== String(originalDraft[k] ?? '')) return true;
		}
		return false;
	};

	const fetchDefaults = async (pnum: string) => {
		if (!pnum) return;
		setLoadingDefaults(true);
		try {
			const res = await fetch(`/api/f30112?pnum=${encodeURIComponent(pnum)}`);
			const json = await res.json();
			const row = json?.success && Array.isArray(json.data) ? json.data[0] : null;
			const draft = row
				? {
						ST_SP_ST: row.ST_SP_ST,
						ST_SCK_ALZ: row.ST_SCK_ALZ,
						ST_SCK_APO: row.ST_SCK_APO,
						ST_SCK_HBL: row.ST_SCK_HBL,
						ST_SCK_GLY: row.ST_SCK_GLY,
						ST_SCK_ARTH: row.ST_SCK_ARTH,
						ST_SCK_GITA: row.ST_SCK_GITA,
						ST_SCK_GITA_DSC: row.ST_SCK_GITA_DSC ?? '',
						ST_MNG_BRN: row.ST_MNG_BRN,
						ST_MNG_DNT: row.ST_MNG_DNT,
						ST_MNG_DNT_DSC: row.ST_MNG_DNT_DSC,
						ST_MNG_LTUB: row.ST_MNG_LTUB,
						ST_MNG_FIX_TUB: row.ST_MNG_FIX_TUB,
						ST_MNG_CYS: row.ST_MNG_CYS,
						ST_MNG_URB: row.ST_MNG_URB,
						ST_MNG_TOP: row.ST_MNG_TOP,
						ST_MNG_DAP: row.ST_MNG_DAP,
						ST_MNG_BAD: row.ST_MNG_BAD,
						ST_MNG_BAD_DSC: row.ST_MNG_BAD_DSC ?? '',
						ST_MNG_BCHK: row.ST_MNG_BCHK,
						ST_MNG_BCHK_DSC: row.ST_MNG_BCHK_DSC ?? '',
						RG_JSON: row.RG_JSON,
						RG_ETC_DESC: row.RG_ETC_DESC,
						NS_ETC_DESC: row.NS_ETC_DESC
					}
				: buildDraft();
			applyDraft(draft);
			const savedDraft = buildDraftFromValues(draft);
			setOriginalDraft({ ...savedDraft });
			setIsEditing(false);
		} catch (e) {
			console.error('F30112 조회 오류:', e);
			alert('기준정보를 조회하는 중 오류가 발생했습니다.');
		} finally {
			setLoadingDefaults(false);
		}
	};

	const handleSelectMember = async (member: MemberData) => {
		if (isEditing && isDirty()) {
			const ok = confirm('수정한 내용을 저장하지 않으면 적용되지 않습니다. 수급자를 변경하시겠습니까?');
			if (!ok) return;
		}
		setSelectedMember(member);
		await fetchDefaults(String(member?.PNUM ?? '').trim());
	};

	const handleEnterEdit = () => {
		if (!selectedPnum) return alert('수급자를 선택해주세요.');
		setOriginalDraft({ ...buildDraft() });
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		if (isDirty()) {
			const ok = confirm('수정한 내용은 저장되지 않습니다. 취소하시겠습니까?');
			if (!ok) return;
		}
		if (originalDraft) applyDraft(originalDraft);
		setIsEditing(false);
	};

	const handleSaveEdit = async () => {
		if (!selectedPnum) return alert('수급자를 선택해주세요.');
		try {
			const payload = { pnum: selectedPnum, ...buildDraft() };
			const res = await fetch('/api/f30112', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const json = await res.json().catch(() => ({}));
			if (!json?.success) {
				alert(json?.error || '저장 중 오류가 발생했습니다.');
				return;
			}
			setOriginalDraft({ ...buildDraft() });
			setIsEditing(false);
			alert('성공적으로 수정되었습니다.');
		} catch (e) {
			console.error('F30112 저장 오류:', e);
			alert('저장 중 오류가 발생했습니다.');
		}
	};

	const readLabelClass = (active: boolean) =>
		`text-sm ${!isEditing && active ? 'font-semibold text-blue-800' : 'text-blue-900'}`;

	const radioInputClass = 'w-4 h-4 border border-blue-300 shrink-0 accent-blue-700';
	const checkboxInputClass = 'w-4 h-4 border border-blue-300 rounded shrink-0 accent-blue-700';

	const textInputClass = isEditing
		? 'px-2 py-1 text-sm bg-white border border-blue-300 rounded'
		: 'px-2 py-1 text-sm border border-blue-300 rounded pointer-events-none text-blue-800 font-semibold bg-blue-50';

	const sectionTitleClass = 'px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded';

	const renderStatusRadios = () => (
		<div className={`flex items-center gap-4 ${!isEditing ? 'pointer-events-none' : ''}`}>
			{(Object.entries(STATUS_TO_LABEL) as [StatusCode, string][]).map(([code, label]) => {
				const isChecked = status === code;
				return (
					<label key={code} className={`flex items-center gap-1 shrink-0 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
						<input
							type="radio"
							name="status"
							value={code}
							checked={isChecked}
							onChange={() => isEditing && setStatus(code)}
							className={radioInputClass}
							tabIndex={isEditing ? 0 : -1}
						/>
						<span className={readLabelClass(isChecked)}>{label}</span>
					</label>
				);
			})}
		</div>
	);

	const renderCheckbox = (name: string, checked: Flag, onChange: (next: Flag) => void, label: string) => (
		<label className={`flex items-center gap-1 shrink-0 ${isEditing ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}>
			<input
				type="checkbox"
				checked={checked === '1'}
				onChange={(e) => isEditing && onChange(e.target.checked ? '1' : '0')}
				className={checkboxInputClass}
				tabIndex={isEditing ? 0 : -1}
			/>
			<span className={readLabelClass(checked === '1')}>{label}</span>
		</label>
	);

	const renderDentureTypeRadios = () => (
		<div className={`flex items-center gap-3 ml-4 ${!isEditing ? 'pointer-events-none' : ''}`}>
			{(Object.entries(DENTURE_TO_LABEL) as [DentureCode, string][]).map(([code, label]) => {
				const isChecked = denturesType === code;
				return (
					<label key={code} className={`flex items-center gap-1 shrink-0 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
						<input
							type="radio"
							name="denturesType"
							value={code}
							checked={isChecked}
							onChange={() => isEditing && setDenturesType(code)}
							className={radioInputClass}
							tabIndex={isEditing ? 0 : -1}
						/>
						<span className={readLabelClass(isChecked)}>{label}</span>
					</label>
				);
			})}
		</div>
	);

	const renderTextField = (value: string, onChange: (v: string) => void, placeholder: string, enabled: boolean) =>
		isEditing ? (
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={!enabled}
				className={`${textInputClass} disabled:bg-gray-100 disabled:text-gray-500 disabled:font-normal`}
				placeholder={placeholder}
			/>
		) : (
			<span className={`text-sm ${value ? 'font-semibold text-blue-800' : 'text-blue-900'}`}>{value}</span>
		);

	const renderSupportRow = (checkbox: ReactNode, extra?: ReactNode) => (
		<div className="flex flex-wrap items-center gap-2">{checkbox}{extra}</div>
	);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					<aside className="w-1/3 shrink-0">
						<MemberListPanel onSelectMember={handleSelectMember} />
					</aside>

					<section className="flex-1">
						<div className="mb-3 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2">
							<div className="text-sm text-blue-900">
								{selectedMember ? (
									<>
										<span className="font-semibold">{String(selectedMember.P_NM ?? '').trim() || '선택됨'}</span>
										<span className="ml-2 text-blue-900/70">PNUM: {selectedPnum || '-'}</span>
										{loadingDefaults && <span className="ml-2 text-blue-900/70">불러오는 중...</span>}
									</>
								) : (
									<span className="text-blue-900/70">왼쪽에서 수급자를 선택해주세요.</span>
								)}
							</div>
							<div className="flex gap-2">
								{isEditing ? (
									<>
										<button
											type="button"
											onClick={handleSaveEdit}
											disabled={!selectedPnum || loadingDefaults}
											className="px-4 py-1.5 text-sm font-medium text-green-900 bg-green-200 border border-green-400 rounded hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											저장
										</button>
										<button
											type="button"
											onClick={handleCancelEdit}
											className="px-4 py-1.5 text-sm font-medium text-red-900 bg-red-200 border border-red-400 rounded hover:bg-red-300"
										>
											취소
										</button>
									</>
								) : (
									<button
										type="button"
										onClick={handleEnterEdit}
										disabled={!selectedPnum || loadingDefaults}
										className="px-4 py-1.5 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										수정
									</button>
								)}
							</div>
						</div>

						<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
								<h2 className="text-xl font-semibold text-blue-900">수급자 현황</h2>
							</div>

							<div className="p-4 space-y-4">
								<div className="space-y-2">
									<div className={sectionTitleClass}>상태</div>
									{renderStatusRadios()}
								</div>

								<div className="space-y-2">
									<div className={sectionTitleClass}>질병</div>
									<div className="flex flex-wrap items-center gap-4">
										{renderCheckbox('dementia', dementia, setDementia, '치매')}
										{renderCheckbox('stroke', stroke, setStroke, '중풍')}
										{renderCheckbox('hypertension', hypertension, setHypertension, '고혈압')}
										{renderCheckbox('diabetes', diabetes, setDiabetes, '당뇨')}
										{renderCheckbox('arthritis', arthritis, setArthritis, '관절염')}
										<div className="flex flex-wrap items-center gap-2">
											{renderCheckbox('otherDisease', otherDisease, (next) => {
												setOtherDisease(next);
												if (next === '0') setOtherDiseaseText('');
											}, '기타')}
											{renderTextField(otherDiseaseText, setOtherDiseaseText, '기타 질병 입력', otherDisease === '1')}
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<div className={sectionTitleClass}>보조</div>
									<div className="space-y-2">
										{renderSupportRow(renderCheckbox('tracheostomy', tracheostomy, setTracheostomy, '기관지절개관'))}

										{renderSupportRow(
											renderCheckbox('dentures', dentures, (next) => {
												setDentures(next);
												if (next === '0') setDenturesType('1');
											}, '틀니'),
											dentures === '1' ? renderDentureTypeRadios() : null
										)}

										{renderSupportRow(renderCheckbox('nasogastricTube', nasogastricTube, setNasogastricTube, '비위관(L-Tube)'))}
										{renderSupportRow(renderCheckbox('urinaryCatheter', urinaryCatheter, setUrinaryCatheter, '고정소변배출관(유치도뇨관)'))}
										{renderSupportRow(renderCheckbox('cystostomy', cystostomy, setCystostomy, '방광루'))}
										{renderSupportRow(renderCheckbox('urostomy', urostomy, setUrostomy, '요루(요도샛길)'))}
										{renderSupportRow(renderCheckbox('colostomy', colostomy, setColostomy, '장루(창자샛길)'))}
										{renderSupportRow(renderCheckbox('diaper', diaper, setDiaper, '기저귀'))}

										{renderSupportRow(
											renderCheckbox('pressureSore', pressureSore, (next) => {
												setPressureSore(next);
												if (next === '0') setPressureSoreArea('');
											}, '욕창(부위:'),
											<>
												{renderTextField(pressureSoreArea, setPressureSoreArea, '욕창 부위 입력', pressureSore === '1')}
												<span className="text-sm text-blue-900">)</span>
											</>
										)}

										{renderSupportRow(
											renderCheckbox('pressureSorePrevention', pressureSorePrevention, (next) => {
												setPressureSorePrevention(next);
												if (next === '0') setPressureSorePreventionTool('');
											}, '욕창방지 보조도구('),
											<>
												{renderTextField(
													pressureSorePreventionTool,
													setPressureSorePreventionTool,
													'보조도구 입력',
													pressureSorePrevention === '1'
												)}
												<span className="text-sm text-blue-900">)</span>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
