"use client";

import { useEffect, useMemo, useState } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';
import { formatCareGradeLabel } from '../../utils/careGrade';

interface MemberData {
	[key: string]: any;
}

function toYmd(d: Date) {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekSunday(base: Date) {
	const d = new Date(base);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - d.getDay());
	return d;
}

const empty7 = () => ['', '', '', '', '', '', ''];

export default function LongtermRecordFormat() {
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const selectedPnum = useMemo(() => String(selectedMember?.PNUM ?? '').trim(), [selectedMember]);

	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [weekDates, setWeekDates] = useState<string[]>([]);
	const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekSunday(new Date()));
	const [loading, setLoading] = useState(false);

	const [status, setStatus] = useState<'와상' | '준와상' | '자립'>('준와상');
	const [dementia, setDementia] = useState(false);
	const [stroke, setStroke] = useState(false);
	const [hypertension, setHypertension] = useState(false);
	const [diabetes, setDiabetes] = useState(false);
	const [arthritis, setArthritis] = useState(false);
	const [otherDisease, setOtherDisease] = useState(false);
	const [otherDiseaseText, setOtherDiseaseText] = useState('');
	const [tracheostomy, setTracheostomy] = useState(false);
	const [dentures, setDentures] = useState(false);
	const [nasogastricTube, setNasogastricTube] = useState(false);
	const [urinaryCatheter, setUrinaryCatheter] = useState(false);
	const [cystostomy, setCystostomy] = useState(false);
	const [urostomy, setUrostomy] = useState(false);
	const [colostomy, setColostomy] = useState(false);
	const [diaper, setDiaper] = useState(false);
	const [pressureSore, setPressureSore] = useState(false);
	const [pressureSoreArea, setPressureSoreArea] = useState('');
	const [pressureSorePrevention, setPressureSorePrevention] = useState(false);
	const [pressureSorePreventionTool, setPressureSorePreventionTool] = useState('');

	const [dailyRecords] = useState({
		grooming: [false, false, false, false, false, false, false],
		bathTime: empty7(),
		bathMethod: empty7(),
		mealType: empty7(),
		mealIntake: empty7(),
		positionChange: [false, false, false, false, false, false, false],
		toiletUsage: empty7(),
		movementAssistance: [false, false, false, false, false, false, false],
		walk: [false, false, false, false, false, false, false],
		outing: [false, false, false, false, false, false, false],
		physicalActivityNotes: empty7(),
		physicalActivityPreparer: empty7(),

		cognitiveSupport: [false, false, false, false, false, false, false],
		communicationSupport: [false, false, false, false, false, false, false],
		cognitiveNotes: empty7(),
		cognitivePreparer: empty7(),

		vitalSigns: empty7(),
		healthManagement: [false, false, false, false, false, false, false],
		nursingManagement: [false, false, false, false, false, false, false],
		emergencyService: [false, false, false, false, false, false, false],
		healthNotes: empty7(),
		healthPreparer: empty7(),

		trainingProgram: empty7(),
		physicalFunctionTraining: [false, false, false, false, false, false, false],
		cognitiveTraining: [false, false, false, false, false, false, false],
		physicalTherapy: [false, false, false, false, false, false, false],
		trainingNotes: empty7(),
		trainingPreparer: empty7(),

		admissionDischargeTime: empty7(),
	});

	const calculateWeekDates = (start: Date) => {
		const dates: string[] = [];
		const startOfWeek = new Date(start);
		startOfWeek.setHours(0, 0, 0, 0);

		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			dates.push(`${month}/${day}`);
		}
		setWeekDates(dates);
		setYear(String(startOfWeek.getFullYear()));
	};

	const applyRgJson = (raw: unknown) => {
		if (!raw) return;
		try {
			const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
			if (!j || typeof j !== 'object') return;

			const m = j as Record<string, any>;
			if (m.status === '와상' || m.status === '준와상' || m.status === '자립') setStatus(m.status);
			if (typeof m.dementia === 'boolean') setDementia(m.dementia);
			if (typeof m.stroke === 'boolean') setStroke(m.stroke);
			if (typeof m.hypertension === 'boolean') setHypertension(m.hypertension);
			if (typeof m.diabetes === 'boolean') setDiabetes(m.diabetes);
			if (typeof m.arthritis === 'boolean') setArthritis(m.arthritis);
			if (typeof m.otherDisease === 'boolean') setOtherDisease(m.otherDisease);
			if (typeof m.otherDiseaseText === 'string') setOtherDiseaseText(m.otherDiseaseText);
			if (typeof m.tracheostomy === 'boolean') setTracheostomy(m.tracheostomy);
			if (typeof m.dentures === 'boolean') setDentures(m.dentures);
			if (typeof m.nasogastricTube === 'boolean') setNasogastricTube(m.nasogastricTube);
			if (typeof m.urinaryCatheter === 'boolean') setUrinaryCatheter(m.urinaryCatheter);
			if (typeof m.cystostomy === 'boolean') setCystostomy(m.cystostomy);
			if (typeof m.urostomy === 'boolean') setUrostomy(m.urostomy);
			if (typeof m.colostomy === 'boolean') setColostomy(m.colostomy);
			if (typeof m.diaper === 'boolean') setDiaper(m.diaper);
			if (typeof m.pressureSore === 'boolean') setPressureSore(m.pressureSore);
			if (typeof m.pressureSoreArea === 'string') setPressureSoreArea(m.pressureSoreArea);
			if (typeof m.pressureSorePrevention === 'boolean') setPressureSorePrevention(m.pressureSorePrevention);
			if (typeof m.pressureSorePreventionTool === 'string') setPressureSorePreventionTool(m.pressureSorePreventionTool);
		} catch {
			// ignore parse errors
		}
	};

	const fetchF30112ForRange = async () => {
		if (!selectedPnum) return;
		setLoading(true);
		try {
			const from = toYmd(weekStart);
			const toD = new Date(weekStart);
			toD.setDate(toD.getDate() + 6);
			const to = toYmd(toD);

			const res = await fetch(`/api/f30112?pnum=${encodeURIComponent(selectedPnum)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
			const json = await res.json().catch(() => ({}));
			const rows = json?.success && Array.isArray(json.data) ? json.data : [];

			const row = rows[0] ?? null;
			if (row?.RG_JSON) applyRgJson(row.RG_JSON);
		} catch (e) {
			console.error('F30112 기간 조회 오류:', e);
			alert('기록양식 정보를 불러오는 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const ltFormCss = `
		.lt-sheet.lt-form table { width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; }
		.lt-sheet.lt-form td, .lt-sheet.lt-form th {
			border: 1px solid #000;
			padding: 2px 4px;
			vertical-align: middle;
			font-weight: normal;
			color: #000;
			box-sizing: border-box;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.lt-sheet.lt-form .lt-right { text-align: right; }
		.lt-sheet.lt-form .lt-center { text-align: center; }
		.lt-sheet.lt-form .lt-left { text-align: left; }
		.lt-sheet.lt-form .lt-bold { font-weight: 700; }
		.lt-sheet.lt-form .lt-title {
			font-size: 15pt;
			font-weight: 800;
			text-align: center;
			margin: 4px 0 8px 0;
		}
		.lt-sheet.lt-form .lt-law {
			font-size: 8.5pt;
			margin-bottom: 2px;
		}
		.lt-sheet.lt-form .lt-front {
			font-size: 8.5pt;
			text-align: right;
			margin-bottom: 4px;
		}
		.lt-sheet.lt-form .lbl { font-weight: 700; text-align: center; }
		.lt-sheet.lt-form .tight { padding: 3px 4px; }
		.lt-sheet.lt-form .val-bold { font-weight: 700; }
		.lt-sheet.lt-form .cb {
			display: inline-block;
			width: 10px;
			height: 10px;
			border: 1px solid #000;
			vertical-align: middle;
			margin-right: 3px;
			box-sizing: border-box;
		}
		.lt-sheet.lt-form .cb.checked { background: #000; }
		.lt-sheet.lt-form .cb-group { display: inline-block; margin-right: 10px; white-space: nowrap; }
		.lt-sheet.lt-form .split-top { display: flex; align-items: center; min-height: 26px; }
		.lt-sheet.lt-form .split-left { flex: 1; padding-right: 6px; border-right: 1px solid #000; margin-right: 6px; }
		.lt-sheet.lt-form .split-right { flex: 1; }
		.lt-sheet.lt-form .rec .cat {
			width: 22px;
			writing-mode: vertical-rl;
			text-orientation: mixed;
			transform: rotate(180deg);
			text-align: center;
			font-weight: 700;
			font-size: 8.5pt;
			line-height: 1.1;
		}
		.lt-sheet.lt-form .rec .grp { width: 34px; text-align: center; font-weight: 700; font-size: 8pt; vertical-align: middle; }
		.lt-sheet.lt-form .rec .sub { font-size: 8pt; text-align: left; line-height: 1.15; }
		.lt-sheet.lt-form .rec .day { font-size: 8pt; text-align: center; }
		.lt-sheet.lt-form .rec .tiny { font-size: 7.5pt; line-height: 1.1; }
		.lt-sheet.lt-form .rec .optcol { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
		.lt-sheet.lt-form .rec .sig { font-size: 8pt; text-align: center; }
		.lt-sheet.lt-form .rec .sig-r { font-size: 8pt; text-align: right; }
		.lt-sheet.lt-form .lt-footer { margin-top: 4px; font-size: 8pt; text-align: right; }
	`;

	/** 화면과 동일하게 보이도록 같은 문서에서 인쇄 (별도 창은 Tailwind 미적용·스타일 불일치 발생) */
	const ltPrintLayoutCss = `
		@media print {
			@page {
				size: A4 portrait;
				margin: 10mm;
			}
			html, body {
				background: #fff !important;
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
			.lt-no-print {
				display: none !important;
			}
			.lt-longterm-root {
				min-height: 0 !important;
			}
			.lt-longterm-page {
				max-width: none !important;
				padding: 0 !important;
				margin: 0 !important;
			}
			.lt-longterm-card {
				border: none !important;
				box-shadow: none !important;
				border-radius: 0 !important;
				background: #fff !important;
			}
			.lt-longterm-sheet-wrap {
				padding: 0 !important;
				overflow: visible !important;
			}
			.lt-sheet.lt-form {
				max-width: 210mm !important;
				margin-left: auto !important;
				margin-right: auto !important;
			}
			.lt-sheet.lt-form .cb,
			.lt-sheet.lt-form .cb.checked {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
		}
	`;

	const handlePrint = () => {
		if (typeof window === 'undefined') return;
		requestAnimationFrame(() => {
			window.print();
		});
	};

	useEffect(() => {
		calculateWeekDates(weekStart);
	}, []);

	useEffect(() => {
		calculateWeekDates(weekStart);
		if (selectedPnum) void fetchF30112ForRange();
	}, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

	const vitalDisplay = (i: number) => {
		const v = dailyRecords.vitalSigns[i]?.trim();
		return v || <span className="tiny lt-center">/</span>;
	};

	return (
		<div className="lt-longterm-root min-h-screen text-black bg-white">
			<style dangerouslySetInnerHTML={{ __html: ltFormCss }} />
			<style dangerouslySetInnerHTML={{ __html: ltPrintLayoutCss }} />

			<div className="lt-longterm-page mx-auto max-w-[1800px] p-4">
				<div className="flex gap-4">
					<aside className="lt-no-print w-1/3 shrink-0">
						<MemberListPanel
							onSelectMember={async (m) => {
								setSelectedMember(m);
								setTimeout(() => void fetchF30112ForRange(), 0);
							}}
						/>
					</aside>

					<section className="flex-1">
						<div className="lt-longterm-card bg-white border border-blue-300 rounded-lg shadow-sm">
							<div className="lt-no-print flex justify-end px-4 py-3 bg-blue-100 border-b border-blue-200">
								<div className="mr-auto flex items-center gap-2 text-sm text-blue-900">
									<span className="font-semibold">기준일(주 시작)</span>
									<input
										type="date"
										value={toYmd(weekStart)}
										onChange={(e) => {
											const v = e.target.value;
											if (!v) return;
											const d = new Date(`${v}T00:00:00`);
											setWeekStart(startOfWeekSunday(d));
										}}
										className="rounded border border-blue-300 bg-white px-2 py-1"
									/>
									<button
										type="button"
										onClick={() => void fetchF30112ForRange()}
										disabled={!selectedPnum || loading}
										className="px-3 py-1 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										조회
									</button>
									{loading && <span className="text-blue-900/70">불러오는 중...</span>}
								</div>
								<button
									type="button"
									onClick={handlePrint}
									className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
								>
									출력
								</button>
							</div>

							<div className="lt-longterm-sheet-wrap p-4 overflow-x-auto">
								<div className="lt-sheet lt-form max-w-[210mm] mx-auto bg-white">
									<div className="lt-law">■ 노인장기요양보험법 시행규칙 [별지 제16호서식] &lt;개정 2019. 9. 27.&gt;</div>
									<div className="lt-front">(앞쪽)</div>
									<div className="lt-title">장기요양급여 제공기록지(시설급여/단기보호)</div>

									<table className="lt-info">
										<tbody>
											<tr>
												<td className="lbl tight" style={{ width: '11%' }}>수급자 성명</td>
												<td className="lt-left val-bold" style={{ width: '14%' }}>{String(selectedMember?.P_NM ?? '').trim()}</td>
												<td className="lbl tight" style={{ width: '11%' }}>생년월일</td>
												<td className="lt-center val-bold" style={{ width: '14%' }}>
													{selectedMember?.P_BRDT ? String(selectedMember.P_BRDT).substring(0, 10) : ''}
												</td>
												<td className="lbl tight" style={{ width: '11%' }}>장기요양등급</td>
												<td className="lt-center val-bold" style={{ width: '10%' }}>
													{formatCareGradeLabel(selectedMember?.P_GRD, '')}
												</td>
												<td className="lbl tight" style={{ width: '13%' }}>장기요양인정번호</td>
												<td className="lt-center val-bold" style={{ width: '16%' }}>
													{String(selectedMember?.P_CERTNO ?? '').trim()}
												</td>
											</tr>
											<tr>
												<td className="lbl tight">장기요양기관명</td>
												<td className="lt-left val-bold" colSpan={3}>
													너싱홈 해원
												</td>
												<td className="lbl tight">장기요양기관기호</td>
												<td className="lt-center val-bold">14161000067</td>
												<td className="lbl tight">침실</td>
												<td className="lt-center val-bold">{String(selectedMember?.P_ROOM ?? '').trim()}</td>
											</tr>
										</tbody>
									</table>

									<table style={{ marginTop: '6px' }}>
										<tbody>
											<tr>
												<td className="lbl lt-center" rowSpan={4} style={{ width: '28px' }}>
													수급자
													<br />
													상태
												</td>
												<td colSpan={2} style={{ padding: 0 }}>
													<div className="split-top">
														<div className="split-left lt-left">
															<span className="cb-group">
																<span className={`cb ${status === '와상' ? 'checked' : ''}`} />
																와상
															</span>
															<span className="cb-group">
																<span className={`cb ${status === '준와상' ? 'checked' : ''}`} />
																준와상
															</span>
															<span className="cb-group">
																<span className={`cb ${status === '자립' ? 'checked' : ''}`} />
																자립
															</span>
														</div>
														<div className="split-right lt-left">
															<span className="cb-group">
																<span className={`cb ${dementia ? 'checked' : ''}`} />
																치매
															</span>
															<span className="cb-group">
																<span className={`cb ${stroke ? 'checked' : ''}`} />
																중풍
															</span>
															<span className="cb-group">
																<span className={`cb ${hypertension ? 'checked' : ''}`} />
																고혈압
															</span>
															<span className="cb-group">
																<span className={`cb ${diabetes ? 'checked' : ''}`} />
																당뇨
															</span>
															<span className="cb-group">
																<span className={`cb ${arthritis ? 'checked' : ''}`} />
																관절염
															</span>
															<span className="cb-group">
																<span className={`cb ${otherDisease ? 'checked' : ''}`} />
																기타({String(otherDiseaseText ?? '').trim()})
															</span>
														</div>
													</div>
												</td>
											</tr>
											<tr>
												<td className="lt-left" colSpan={2}>
													<span className="cb-group">
														<span className={`cb ${tracheostomy ? 'checked' : ''}`} />
														기관지절개관
													</span>
													<span className="cb-group">
														<span className={`cb ${dentures ? 'checked' : ''}`} />
														틀니(부분/전체)
													</span>
													<span className="cb-group">
														<span className={`cb ${nasogastricTube ? 'checked' : ''}`} />
														비위관(鼻胃管, L-tube)
													</span>
													<span className="cb-group">
														<span className={`cb ${urinaryCatheter ? 'checked' : ''}`} />
														고정소변배출관(유치도뇨관)
													</span>
												</td>
											</tr>
											<tr>
												<td className="lt-left" colSpan={2}>
													<span className="cb-group">
														<span className={`cb ${cystostomy ? 'checked' : ''}`} />
														방광루
													</span>
													<span className="cb-group">
														<span className={`cb ${urostomy ? 'checked' : ''}`} />
														요루(요도샛길)
													</span>
													<span className="cb-group">
														<span className={`cb ${colostomy ? 'checked' : ''}`} />
														장루(창자샛길)
													</span>
													<span className="cb-group">
														<span className={`cb ${diaper ? 'checked' : ''}`} />
														기저귀
													</span>
												</td>
											</tr>
											<tr>
												<td className="lt-left" colSpan={2}>
													<span className="cb-group">
														<span className={`cb ${pressureSore ? 'checked' : ''}`} />
														욕창(부위: {String(pressureSoreArea ?? '').trim()})
													</span>
													<span className="cb-group">
														<span className={`cb ${pressureSorePrevention ? 'checked' : ''}`} />
														욕창방지 보조도구({String(pressureSorePreventionTool ?? '').trim()})
													</span>
												</td>
											</tr>
										</tbody>
									</table>

									<table className="rec" style={{ marginTop: '6px' }}>
										<thead>
											<tr>
												<th className="lt-center" style={{ width: '22px' }} rowSpan={2} />
												<th className="lt-center lbl" colSpan={2} rowSpan={2} style={{ width: 'auto' }}>
													구분
												</th>
												<th className="lt-center lbl" colSpan={7}>
													({year})년&nbsp;&nbsp;월/일
												</th>
											</tr>
											<tr>
												{weekDates.map((d, i) => (
													<th key={i} className="day hdr">
														{d}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											<tr>
												<td className="cat" rowSpan={11}>
													신체활동지원
												</td>
												<td className="sub" colSpan={2}>
													세면, 구강, 머리감기, 몸단장, 옷 갈아입히기
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.grooming[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="grp" rowSpan={2}>
													목욕
												</td>
												<td className="sub">소요시간</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{dailyRecords.bathTime[i] ? `${dailyRecords.bathTime[i]} 분` : '분'}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub">방법</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.bathMethod[i] === '전신입욕' ? 'checked' : ''}`} />
																전신입욕
															</div>
															<div>
																<span className={`cb ${dailyRecords.bathMethod[i] === '샤워식' ? 'checked' : ''}`} />
																샤워식
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="grp" rowSpan={2}>
													식사
												</td>
												<td className="sub">종류</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.mealType[i] === '일반식' ? 'checked' : ''}`} />
																일반식
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealType[i] === '죽' ? 'checked' : ''}`} />
																죽
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealType[i] === '유동식' ? 'checked' : ''}`} />
																유동식(미음)
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="sub">섭취량</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.mealIntake[i] === '1' ? 'checked' : ''}`} />
																1
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealIntake[i] === '1/2이상' ? 'checked' : ''}`} />
																1/2이상
															</div>
															<div>
																<span className={`cb ${dailyRecords.mealIntake[i] === '1/2미만' ? 'checked' : ''}`} />
																1/2미만
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													체위변경 (2시간마다)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.positionChange[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													화장실이용하기 (기저귀 교환)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{dailyRecords.toiletUsage[i] ? `${dailyRecords.toiletUsage[i]} 회` : '회'}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													이동도움 및 신체 기능유지 · 증진
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.movementAssistance[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													산책(외출)동행
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														<div className="optcol">
															<div>
																<span className={`cb ${dailyRecords.walk[i] ? 'checked' : ''}`} />
																산책
															</div>
															<div>
																<span className={`cb ${dailyRecords.outing[i] ? 'checked' : ''}`} />
																외출
															</div>
														</div>
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left" style={{ minHeight: '22px' }}>
														{dailyRecords.physicalActivityNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig">
														<span className="tiny">{dailyRecords.physicalActivityPreparer[i] || '\u00a0'}</span>
														<br />
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="cat" rowSpan={4}>
													인지 관리 및 의사 소통
												</td>
												<td className="sub" colSpan={2}>
													인지관리지원
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.cognitiveSupport[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													의사소통도움 등 말벗, 격려
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.communicationSupport[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.cognitiveNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig">
														<span className="tiny">{dailyRecords.cognitivePreparer[i] || '\u00a0'}</span>
														<br />
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="cat" rowSpan={6}>
													건강 및 간호 관리
												</td>
												<td className="sub" colSpan={2}>
													혈압/체온
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{vitalDisplay(i)}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													건강관리( 분)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.healthManagement[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													간호관리( 분)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.nursingManagement[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													기타(응급서비스)
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.emergencyService[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.healthNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig-r">
														<span className="tiny">{dailyRecords.healthPreparer[i] || '\u00a0'}</span>{' '}
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="cat" rowSpan={6}>
													기능회복훈련
												</td>
												<td className="sub" colSpan={2}>
													신체 · 인지기능 향상 프로그램
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.trainingProgram[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													신체기능 · 기본동작, 일상생활동작훈련
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.physicalFunctionTraining[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													인지기능 향상훈련
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.cognitiveTraining[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													물리(작업)치료
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center">
														<span className={`cb ${dailyRecords.physicalTherapy[i] ? 'checked' : ''}`} />
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													특이사항
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="tiny lt-left">
														{dailyRecords.trainingNotes[i] || ''}
													</td>
												))}
											</tr>
											<tr>
												<td className="sub" colSpan={2}>
													작성자 성명
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="sig">
														<span className="tiny">{dailyRecords.trainingPreparer[i] || '\u00a0'}</span>
														<br />
														<span className="tiny">(서명)</span>
													</td>
												))}
											</tr>

											<tr>
												<td className="lbl lt-center" colSpan={3} style={{ lineHeight: 1.25 }}>
													수급자의 입·퇴소시간,
													<br />
													외박 및 복귀시간, 외출시간
												</td>
												{weekDates.map((_, i) => (
													<td key={i} className="lt-center tiny">
														{dailyRecords.admissionDischargeTime[i] || ''}
													</td>
												))}
											</tr>
										</tbody>
									</table>

									<div className="lt-footer">210mm X 297mm [백상지 80g/㎡]</div>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
