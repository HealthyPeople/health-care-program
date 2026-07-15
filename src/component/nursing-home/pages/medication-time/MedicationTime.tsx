"use client";

import { useState, useEffect } from 'react';
import { MemberListPanel } from '../../components/MemberListPanel';

interface MemberData {
	[key: string]: any;
}

interface MedicationTimeData {
	status: '약없음' | '복용' | '미복용' | '';
	time: string;
	helper: string;
	rawStatus?: string;
}

type MedicationTypeKey =
	| '아침식전'
	| '아침식후'
	| '점심식전'
	| '점심식후'
	| '저녁식전'
	| '저녁식후'
	| '취침복용';

const DEFAULT_MEDICATION_DATA: Record<MedicationTypeKey, MedicationTimeData> = {
	아침식전: { status: '약없음', time: '', helper: '' },
	아침식후: { status: '약없음', time: '', helper: '' },
	점심식전: { status: '약없음', time: '', helper: '' },
	점심식후: { status: '약없음', time: '', helper: '' },
	저녁식전: { status: '약없음', time: '', helper: '' },
	저녁식후: { status: '약없음', time: '', helper: '' },
	취침복용: { status: '약없음', time: '', helper: '' }
};

const todayYmd = () => {
	const d = new Date();
	const yyyy = String(d.getFullYear()).padStart(4, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
};

const ymdToYm = (ymd: string) => {
	const s = String(ymd || '').trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
	return '';
};

const calcAge = (birthYmd?: string) => {
	if (!birthYmd) return '';
	const s = String(birthYmd).slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
	const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
	const today = new Date();
	let age = today.getFullYear() - y;
	const md = (today.getMonth() + 1) * 100 + today.getDate();
	const bmd = m * 100 + d;
	if (md < bmd) age -= 1;
	return String(age);
};

const MED_PRINT_STYLES = `
@page { size: A4; margin: 10mm; }
html, body { background:#fff; color:#000; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { width: 190mm; margin: 0 auto; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.title { text-align:center; font-weight:700; font-size:18px; margin: 4mm 0 2mm; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #333; padding: 3px 4px; font-size: 12px; vertical-align: middle; }
.small { font-size: 11px; }
.center { text-align:center; }
.header-row td, .header-row th { font-weight:600; }
.section-gap { height: 2mm; }
.no-border { border:none !important; }
.block-area { height: 170mm; }
`;

const openPrintWindowWithHtml = (title: string, bodyHtml: string) => {
	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		alert('팝업 차단을 해제해주세요.');
		return;
	}
	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${MED_PRINT_STYLES}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
	printWindow.document.write(html);
	printWindow.document.close();
	setTimeout(() => printWindow.print(), 250);
};

const openPrintWindowNow = (title: string) => {
	const w = window.open('', '_blank');
	if (!w) return null;
	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${MED_PRINT_STYLES}</style>
</head>
<body>
  <div class="sheet">
    <div class="title">${title}</div>
    <div style="font-size:12px; padding:12px;">불러오는 중...</div>
  </div>
</body>
</html>`;
	w.document.write(html);
	w.document.close();
	return w;
};

const writeAndPrint = (w: Window, title: string, bodyHtml: string) => {
	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${MED_PRINT_STYLES}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
	w.document.open();
	w.document.write(html);
	w.document.close();
	setTimeout(() => w.print(), 250);
};

export default function MedicationTime() {
	// 약물 복용 시간 관련 state
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [selectedEadt, setSelectedEadt] = useState<string>(todayYmd());
	const [eadtList, setEadtList] = useState<string[]>([]);
	const [eadtLoading, setEadtLoading] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);

	const [medicationData, setMedicationData] = useState<Record<MedicationTypeKey, MedicationTimeData>>(
		JSON.parse(JSON.stringify(DEFAULT_MEDICATION_DATA))
	);
	const [confirmer, setConfirmer] = useState('');
	const [confirmDate, setConfirmDate] = useState<string>(todayYmd());
	const [notes, setNotes] = useState(''); // F30111.EADES (복용상태/비고 성격)
	const [etc, setEtc] = useState(''); // F30111.ETC
	const [isEditMode, setIsEditMode] = useState(false);
	const [originalMedicationData, setOriginalMedicationData] = useState<Record<MedicationTypeKey, MedicationTimeData>>(
		JSON.parse(JSON.stringify(DEFAULT_MEDICATION_DATA))
	);
	const [originalConfirmer, setOriginalConfirmer] = useState('');
	const [originalConfirmDate, setOriginalConfirmDate] = useState(todayYmd());
	const [originalNotes, setOriginalNotes] = useState('');
	const [originalEtc, setOriginalEtc] = useState('');

	// 복용도우미 검색 관련 state (각 타입별로 관리)
	const [helperSearchTerms, setHelperSearchTerms] = useState<Record<string, string>>({});
	const [helperSuggestions, setHelperSuggestions] = useState<Record<string, Array<{EMPNO: string; EMPNM: string}>>>({});
	const [showHelperDropdowns, setShowHelperDropdowns] = useState<Record<string, boolean>>({});
	const [activeHelperType, setActiveHelperType] = useState<MedicationTypeKey | null>(null);

	// 복용 확인자 검색 관련 state
	const [confirmerSearchTerm, setConfirmerSearchTerm] = useState('');
	const [confirmerSuggestions, setConfirmerSuggestions] = useState<Array<{EMPNO: string; EMPNM: string}>>([]);
	const [showConfirmerDropdown, setShowConfirmerDropdown] = useState(false);

	const medicationTypes: MedicationTypeKey[] = ['아침식전', '아침식후', '점심식전', '점심식후', '저녁식전', '저녁식후', '취침복용'];

	const handleMedicationStatusChange = (type: MedicationTypeKey, status: '약없음' | '복용' | '미복용') => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				status,
				rawStatus: undefined
			}
		}));
	};

	const handleMedicationTimeChange = (type: MedicationTypeKey, time: string) => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				time
			}
		}));
	};

	const buildIndividualPrintHtml = (data: any) => {
		const facility = data?.facility || {};
		const member = data?.member || {};
		const month = String(data?.month || '');
		const diseases: string[] = Array.isArray(data?.diseases) ? data.diseases : [];
		const meds: any[] = Array.isArray(data?.meds) ? data.meds : [];
		const calendar: any[] = Array.isArray(data?.calendar) ? data.calendar : [];

		const sex = String(member.P_SEX || '') === '1' ? '남' : String(member.P_SEX || '') === '2' ? '여' : '';
		const birth = String(member.P_BRDT || '').slice(0, 10);

		const medsRows = (meds.length ? meds : [{ MENM: '', INQNT: '', INCNT: '', METM: '', CAPDES: '' }])
			.map(
				(m) => `
        <tr>
          <td style="width:30%">${m.MENM ?? ''}</td>
          <td class="center" style="width:10%">${m.INQNT ?? ''}</td>
          <td class="center" style="width:10%">${m.INCNT ?? ''}</td>
          <td style="width:20%">${m.CAPDES || m.METM || ''}</td>
        </tr>
      `
			)
			.join('');

		const calendarRows = calendar
			.map(
				(r) => `
        <tr>
          <td class="center">${r.EADT ?? ''}</td>
          <td class="center">${r['아침식전'] ?? ''}</td>
          <td class="center">${r['아침식후'] ?? ''}</td>
          <td class="center">${r['점심식전'] ?? ''}</td>
          <td class="center">${r['점심식후'] ?? ''}</td>
          <td class="center">${r['저녁식전'] ?? ''}</td>
          <td class="center">${r['저녁식후'] ?? ''}</td>
          <td class="center">${r['취침복용'] ?? ''}</td>
          <td class="center">${r['확인자'] ?? ''}</td>
        </tr>
      `
			)
			.join('');

		return `
      <div class="sheet">
        <div class="title">약물관리기록지</div>

        <table>
          <tbody>
            <tr>
              <td class="no-border" style="width:60%"></td>
              <td class="center" style="width:40%; padding:0">
                <table>
                  <tbody>
                    <tr>
                      <td class="center" style="font-weight:700">합명</td>
                      <td class="center" style="font-weight:700">검토</td>
                      <td class="center" style="font-weight:700">결재</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="section-gap"></div>

        <table>
          <tbody>
            <tr class="header-row">
              <td class="center" style="width:16%">장기요양기관기호</td>
              <td style="width:18%">${facility.ANGH ?? ''}</td>
              <td class="center" style="width:20%">장기요양기관명</td>
              <td style="width:26%">${facility.ANNM ?? ''}</td>
              <td class="center" style="width:12%">장기요양등급</td>
              <td style="width:8%">${member.P_GRD ?? ''}</td>
            </tr>
            <tr class="header-row">
              <td class="center">수급자성명</td>
              <td>${member.P_NM ?? ''}</td>
              <td class="center">생년</td>
              <td>${birth}</td>
              <td class="center">장기요양인정번호</td>
              <td>${member.P_YYNO ?? ''}</td>
            </tr>
            <tr class="header-row">
              <td class="center">성별</td>
              <td>${sex}</td>
              <td class="center">연령</td>
              <td class="center">만 ${calcAge(birth)}세</td>
              <td class="center">복용년월</td>
              <td>${month}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-gap"></div>

        <table>
          <tbody>
            <tr class="header-row">
              <td class="center" style="width:30%">질병내역</td>
              <td class="center" style="width:30%">복용약</td>
              <td class="center" style="width:10%">1회투약량</td>
              <td class="center" style="width:10%">1일투약횟수</td>
              <td class="center" style="width:20%">복용상계</td>
            </tr>
            <tr>
              <td style="vertical-align:top">
                <div class="small">
                  ${diseases.map((x) => `<div>${x}</div>`).join('')}
                </div>
              </td>
              <td colspan="4" style="padding:0">
                <table>
                  <tbody>
                    ${medsRows}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="section-gap"></div>

        <table>
          <thead>
            <tr class="header-row">
              <th class="center" style="width:14%">복용일자</th>
              <th class="center">아침식전</th>
              <th class="center">아침식후</th>
              <th class="center">점심식전</th>
              <th class="center">점심식후</th>
              <th class="center">저녁식전</th>
              <th class="center">저녁식후</th>
              <th class="center">취침복용</th>
              <th class="center" style="width:12%">확인자</th>
            </tr>
          </thead>
          <tbody>
            ${calendarRows}
          </tbody>
        </table>
      </div>
    `;
	};

	const buildMonthlyPrintHtml = (data: any) => {
		const facility = data?.facility || {};
		const month = String(data?.month || '');
		const members: any[] = Array.isArray(data?.members) ? data.members : [];

		return `
      <div class="sheet">
        ${members
					.map((sec) => {
						const member = sec?.member || {};
						const diseases: string[] = Array.isArray(sec?.diseases) ? sec.diseases : [];
						const meds: any[] = Array.isArray(sec?.meds) ? sec.meds : [];
						const calendar: any[] = Array.isArray(sec?.calendar) ? sec.calendar : [];
						const sex = String(member.P_SEX || '') === '1' ? '남' : String(member.P_SEX || '') === '2' ? '여' : '';
						const birth = String(member.P_BRDT || '').slice(0, 10);

						const medsRows = (meds.length ? meds : [{ MENM: '', INQNT: '', INCNT: '', METM: '', CAPDES: '' }])
							.map(
								(m) => `
              <tr>
                <td style="width:30%">${m.MENM ?? ''}</td>
                <td class="center" style="width:10%">${m.INQNT ?? ''}</td>
                <td class="center" style="width:10%">${m.INCNT ?? ''}</td>
                <td style="width:20%">${m.CAPDES || m.METM || ''}</td>
              </tr>
            `
							)
							.join('');

						const calendarRows = calendar
							.map(
								(r) => `
              <tr>
                <td class="center">${r.EADT ?? ''}</td>
                <td class="center">${r['아침식전'] ?? ''}</td>
                <td class="center">${r['아침식후'] ?? ''}</td>
                <td class="center">${r['점심식전'] ?? ''}</td>
                <td class="center">${r['점심식후'] ?? ''}</td>
                <td class="center">${r['저녁식전'] ?? ''}</td>
                <td class="center">${r['저녁식후'] ?? ''}</td>
                <td class="center">${r['취침복용'] ?? ''}</td>
                <td class="center">${r['확인자'] ?? ''}</td>
              </tr>
            `
							)
							.join('');

						return `
            <div class="page">
              <div class="title">약물관리기록지</div>

              <table>
                <tbody>
                  <tr>
                    <td class="no-border" style="width:60%"></td>
                    <td class="center" style="width:40%; padding:0">
                      <table><tbody>
                        <tr>
                          <td class="center" style="font-weight:700">합명</td>
                          <td class="center" style="font-weight:700">검토</td>
                          <td class="center" style="font-weight:700">결재</td>
                        </tr>
                      </tbody></table>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="section-gap"></div>

              <table>
                <tbody>
                  <tr class="header-row">
                    <td class="center" style="width:16%">장기요양기관기호</td>
                    <td style="width:18%">${facility.ANGH ?? ''}</td>
                    <td class="center" style="width:20%">장기요양기관명</td>
                    <td style="width:26%">${facility.ANNM ?? ''}</td>
                    <td class="center" style="width:12%">장기요양등급</td>
                    <td style="width:8%">${member.P_GRD ?? ''}</td>
                  </tr>
                  <tr class="header-row">
                    <td class="center">수급자성명</td>
                    <td>${member.P_NM ?? ''}</td>
                    <td class="center">생년</td>
                    <td>${birth}</td>
                    <td class="center">장기요양인정번호</td>
                    <td>${member.P_YYNO ?? ''}</td>
                  </tr>
                  <tr class="header-row">
                    <td class="center">성별</td>
                    <td>${sex}</td>
                    <td class="center">연령</td>
                    <td class="center">만 ${calcAge(birth)}세</td>
                    <td class="center">복용년월</td>
                    <td>${month}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-gap"></div>

              <table>
                <tbody>
                  <tr class="header-row">
                    <td class="center" style="width:30%">질병내역</td>
                    <td class="center" style="width:30%">복용약</td>
                    <td class="center" style="width:10%">1회투약량</td>
                    <td class="center" style="width:10%">1일투약횟수</td>
                    <td class="center" style="width:20%">복용상계</td>
                  </tr>
                  <tr>
                    <td style="vertical-align:top">
                      <div class="small">${diseases.map((x) => `<div>${x}</div>`).join('')}</div>
                    </td>
                    <td colspan="4" style="padding:0">
                      <table><tbody>${medsRows}</tbody></table>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="section-gap"></div>

              <table>
                <thead>
                  <tr class="header-row">
                    <th class="center" style="width:14%">복용일자</th>
                    <th class="center">아침식전</th>
                    <th class="center">아침식후</th>
                    <th class="center">점심식전</th>
                    <th class="center">점심식후</th>
                    <th class="center">저녁식전</th>
                    <th class="center">저녁식후</th>
                    <th class="center">취침복용</th>
                    <th class="center" style="width:12%">확인자</th>
                  </tr>
                </thead>
                <tbody>${calendarRows}</tbody>
              </table>
            </div>
          `;
					})
					.join('')}
      </div>
    `;
	};

	const buildDrugsPrintHtml = (data: any) => {
		const facility = data?.facility || {};
		const member = data?.member || {};
		const diseases: string[] = Array.isArray(data?.diseases) ? data.diseases : [];
		const meds: any[] = Array.isArray(data?.meds) ? data.meds : [];
		const intakePlan = String(data?.intakePlan || '');

		const sex = String(member.P_SEX || '') === '1' ? '남' : String(member.P_SEX || '') === '2' ? '여' : '';
		const birth = String(member.P_BRDT || '').slice(0, 10);

		const medsRows = (meds.length ? meds : [{ MENM: '', INQNT: '', INCNT: '', CAPDES: '', METM: '', EDT: '' }])
			.map(
				(m) => `
        <tr>
          <td style="width:28%">${m.MENM ?? ''}</td>
          <td class="center" style="width:10%">${m.INQNT ?? ''}</td>
          <td class="center" style="width:10%">${m.INCNT ?? ''}</td>
          <td style="width:14%">${intakePlan}</td>
          <td class="center" style="width:10%">${m.EDT ? String(m.EDT).slice(0, 10) : ''}</td>
        </tr>
      `
			)
			.join('');

		return `
      <div class="sheet">
        <div class="title">질병 및 복용약물</div>

        <table>
          <tbody>
            <tr>
              <td class="no-border" style="width:60%"></td>
              <td class="center" style="width:40%; padding:0">
                <table>
                  <tbody>
                    <tr>
                      <td class="center" style="font-weight:700">합명</td>
                      <td class="center" style="font-weight:700">검토</td>
                      <td class="center" style="font-weight:700">결재</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="section-gap"></div>

        <table>
          <tbody>
            <tr class="header-row">
              <td class="center" style="width:16%">장기요양기관기호</td>
              <td style="width:18%">${facility.ANGH ?? ''}</td>
              <td class="center" style="width:20%">장기요양기관명</td>
              <td style="width:26%">${facility.ANNM ?? ''}</td>
              <td class="center" style="width:12%">장기요양등급</td>
              <td style="width:8%">${member.P_GRD ?? ''}</td>
            </tr>
            <tr class="header-row">
              <td class="center">수급자성명</td>
              <td>${member.P_NM ?? ''}</td>
              <td class="center">생년</td>
              <td>${birth}</td>
              <td class="center">장기요양인정번호</td>
              <td>${member.P_YYNO ?? ''}</td>
            </tr>
            <tr class="header-row">
              <td class="center">성별</td>
              <td>${sex}</td>
              <td class="center">연령</td>
              <td class="center">만 ${calcAge(birth)}세</td>
              <td class="center">입소일</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="section-gap"></div>

        <table>
          <thead>
            <tr class="header-row">
              <th class="center" style="width:28%">질병내역</th>
              <th class="center" style="width:28%">복용약물</th>
              <th class="center" style="width:10%">1회투약량</th>
              <th class="center" style="width:10%">1일투약횟수</th>
              <th class="center" style="width:14%">복용상계</th>
              <th class="center" style="width:10%">투여종료일</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="vertical-align:top">
                <div class="small">${diseases.map((x) => `<div>${x}</div>`).join('')}</div>
              </td>
              <td colspan="5" style="padding:0">
                <table>
                  <tbody>
                    ${medsRows}
                    <tr><td colspan="5" class="block-area"></td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
	};

	// 복용도우미 검색 함수
	const searchHelpers = async (type: string, searchTerm: string) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setHelperSuggestions(prev => ({ ...prev, [type]: result.data }));
				setShowHelperDropdowns(prev => ({ ...prev, [type]: result.data.length > 0 }));
			} else {
				setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
				setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
			}
		} catch (err) {
			console.error('복용도우미 검색 오류:', err);
			setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
		}
	};

	// 복용 확인자 검색 함수
	const searchConfirmer = async (searchTerm: string) => {
		if (!searchTerm || searchTerm.trim() === '') {
			setConfirmerSuggestions([]);
			setShowConfirmerDropdown(false);
			return;
		}

		try {
			const url = `/api/f01010?name=${encodeURIComponent(searchTerm.trim())}`;
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success && Array.isArray(result.data)) {
				setConfirmerSuggestions(result.data);
				setShowConfirmerDropdown(result.data.length > 0);
			} else {
				setConfirmerSuggestions([]);
				setShowConfirmerDropdown(false);
			}
		} catch (err) {
			console.error('복용 확인자 검색 오류:', err);
			setConfirmerSuggestions([]);
			setShowConfirmerDropdown(false);
		}
	};

	// 복용 확인자 선택 함수
	const handleSelectConfirmer = (confirmer: {EMPNO: string; EMPNM: string}) => {
		setConfirmer(confirmer.EMPNM);
		setConfirmerSearchTerm(confirmer.EMPNM);
		setShowConfirmerDropdown(false);
	};

	// 복용도우미 선택 함수
	const handleSelectHelper = (type: MedicationTypeKey, helper: {EMPNO: string; EMPNM: string}) => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				helper: helper.EMPNM
			}
		}));
		setHelperSearchTerms(prev => ({ ...prev, [type]: helper.EMPNM }));
		setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
		setActiveHelperType(null);
	};

	const handleMedicationHelperChange = (type: MedicationTypeKey, helper: string) => {
		setMedicationData(prev => ({
			...prev,
			[type]: {
				...prev[type],
				helper
			}
		}));
		setHelperSearchTerms(prev => ({ ...prev, [type]: helper }));
		setActiveHelperType(type);
		
		// 검색어가 변경되면 검색 실행 (debounce는 useEffect에서 처리)
		if (!helper || helper.trim() === '') {
			setHelperSuggestions(prev => ({ ...prev, [type]: [] }));
			setShowHelperDropdowns(prev => ({ ...prev, [type]: false }));
		}
	};

	// 복용도우미 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (activeHelperType && helperSearchTerms[activeHelperType]) {
				const searchTerm = helperSearchTerms[activeHelperType];
				if (searchTerm && searchTerm.trim() !== '') {
					searchHelpers(activeHelperType, searchTerm);
				}
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [helperSearchTerms, activeHelperType]);

	const handleEdit = () => {
		// 원본 데이터 백업
		setOriginalMedicationData(JSON.parse(JSON.stringify(medicationData)));
		setOriginalConfirmer(confirmer);
		setOriginalConfirmDate(confirmDate);
		setOriginalNotes(notes);
		setOriginalEtc(etc);
		setIsEditMode(true);
	};

	const handleCancel = () => {
		// 원본 데이터로 복원
		setMedicationData(JSON.parse(JSON.stringify(originalMedicationData)));
		setConfirmer(originalConfirmer);
		setConfirmDate(originalConfirmDate);
		setNotes(originalNotes);
		setEtc(originalEtc);
		setIsEditMode(false);
	};

	const refreshEadtList = async (member: MemberData, keepSelected = true) => {
		setEadtLoading(true);
		try {
			const pnum = String(member?.PNUM ?? '').trim();
			if (!pnum) {
				setEadtList([]);
				return;
			}
			const res = await fetch(`/api/f30111?mode=dates&pnum=${encodeURIComponent(pnum)}`);
			const json = await res.json();
			const list = Array.isArray(json?.data) ? json.data.map((r: any) => String(r.EADT || '').trim()).filter(Boolean) : [];
			setEadtList(list);
			if (!keepSelected) {
				setSelectedEadt(list[0] || todayYmd());
			}
		} catch (e) {
			console.error('복용일자 목록 조회 오류:', e);
			setEadtList([]);
		} finally {
			setEadtLoading(false);
		}
	};

	const loadDetail = async (member: MemberData, eadt: string) => {
		setDetailLoading(true);
		try {
			const pnum = String(member?.PNUM ?? '').trim();
			if (!pnum || !eadt) return;
			const res = await fetch(`/api/f30111?mode=detail&pnum=${encodeURIComponent(pnum)}&eadt=${encodeURIComponent(eadt)}`);
			const json = await res.json();
			const data = json?.data;
			if (!data) {
				setMedicationData(JSON.parse(JSON.stringify(DEFAULT_MEDICATION_DATA)));
				setConfirmer('');
				setConfirmDate(todayYmd());
				setNotes('');
				setEtc('');
				setIsEditMode(true);
				return;
			}

			setMedicationData({
				아침식전: data.times?.아침식전 ?? DEFAULT_MEDICATION_DATA.아침식전,
				아침식후: data.times?.아침식후 ?? DEFAULT_MEDICATION_DATA.아침식후,
				점심식전: data.times?.점심식전 ?? DEFAULT_MEDICATION_DATA.점심식전,
				점심식후: data.times?.점심식후 ?? DEFAULT_MEDICATION_DATA.점심식후,
				저녁식전: data.times?.저녁식전 ?? DEFAULT_MEDICATION_DATA.저녁식전,
				저녁식후: data.times?.저녁식후 ?? DEFAULT_MEDICATION_DATA.저녁식후,
				취침복용: data.times?.취침복용 ?? DEFAULT_MEDICATION_DATA.취침복용
			});
			setConfirmer(String(data.CONF_NAME ?? ''));
			setConfirmerSearchTerm(String(data.CONF_NAME ?? ''));
			setConfirmDate(String(data.CONF_DATE ?? todayYmd()));
			setNotes(String(data.EADES ?? ''));
			setEtc(String(data.ETC ?? ''));
			setIsEditMode(false);
			setOriginalMedicationData(JSON.parse(JSON.stringify({
				아침식전: data.times?.아침식전 ?? DEFAULT_MEDICATION_DATA.아침식전,
				아침식후: data.times?.아침식후 ?? DEFAULT_MEDICATION_DATA.아침식후,
				점심식전: data.times?.점심식전 ?? DEFAULT_MEDICATION_DATA.점심식전,
				점심식후: data.times?.점심식후 ?? DEFAULT_MEDICATION_DATA.점심식후,
				저녁식전: data.times?.저녁식전 ?? DEFAULT_MEDICATION_DATA.저녁식전,
				저녁식후: data.times?.저녁식후 ?? DEFAULT_MEDICATION_DATA.저녁식후,
				취침복용: data.times?.취침복용 ?? DEFAULT_MEDICATION_DATA.취침복용
			})));
			setOriginalConfirmer(String(data.CONF_NAME ?? ''));
			setOriginalConfirmDate(String(data.CONF_DATE ?? todayYmd()));
			setOriginalNotes(String(data.EADES ?? ''));
			setOriginalEtc(String(data.ETC ?? ''));
		} catch (e) {
			console.error('복용 상세 조회 오류:', e);
		} finally {
			setDetailLoading(false);
		}
	};

	const handleSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		try {
			const payload = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				EADT: selectedEadt,
				EADES: notes,
				ETC: etc,
				CONF_DATE: confirmDate,
				CONF_NAME: confirmer,
				times: medicationData
			};
			const res = await fetch('/api/f30111', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const json = await res.json();
			if (!json?.success) {
				alert(json?.error || '저장 실패');
				return;
			}
			alert('약물 복용 시간이 저장되었습니다.');
			setIsEditMode(false);
			setOriginalMedicationData(JSON.parse(JSON.stringify(medicationData)));
			setOriginalConfirmer(confirmer);
			setOriginalConfirmDate(confirmDate);
			setOriginalNotes(notes);
			setOriginalEtc(etc);
			await refreshEadtList(selectedMember, true);
		} catch (e) {
			console.error('저장 오류:', e);
			alert('저장 중 오류가 발생했습니다.');
		}
	};

	const handleDelete = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		if (confirm('정말 삭제하시겠습니까?')) {
			try {
				const pnum = String(selectedMember.PNUM ?? '').trim();
				const res = await fetch(`/api/f30111?pnum=${encodeURIComponent(pnum)}&eadt=${encodeURIComponent(selectedEadt)}`, {
					method: 'DELETE'
				});
				const json = await res.json();
				if (!json?.success) {
					alert(json?.error || '삭제 실패');
					return;
				}
				alert('약물 복용 시간이 삭제되었습니다.');
				setMedicationData(JSON.parse(JSON.stringify(DEFAULT_MEDICATION_DATA)));
				setConfirmer('');
				setConfirmerSearchTerm('');
				setConfirmDate(todayYmd());
				setNotes('');
				setEtc('');
				setIsEditMode(false);
				await refreshEadtList(selectedMember, false);
			} catch (e) {
				console.error('삭제 오류:', e);
				alert('삭제 중 오류가 발생했습니다.');
			}
		}
	};

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.helper-dropdown-container') && !target.closest('.confirmer-dropdown-container')) {
				setShowHelperDropdowns({});
				setActiveHelperType(null);
				setShowConfirmerDropdown(false);
			}
		};

		if (Object.values(showHelperDropdowns).some(show => show) || showConfirmerDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showHelperDropdowns, showConfirmerDropdown]);

	// 복용 확인자 검색 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			if (confirmerSearchTerm && confirmerSearchTerm.trim() !== '') {
				searchConfirmer(confirmerSearchTerm);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [confirmerSearchTerm]);

	useEffect(() => {
		if (!selectedMember) return;
		refreshEadtList(selectedMember, false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMember?.PNUM]);

	useEffect(() => {
		if (!selectedMember || !selectedEadt) return;
		loadDetail(selectedMember, selectedEadt);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMember?.PNUM, selectedEadt]);

	return (
		<div className="min-h-screen text-black bg-white">
			<div className="mx-auto max-w-[1400px] p-4">
				<div className="flex gap-4">
					{/* 좌측: 수급자 목록 */}
					<aside className="w-[380px] shrink-0">
						<MemberListPanel
							onSelectMember={(m) => {
								setSelectedMember(m);
								setIsEditMode(false);
								setSelectedEadt(todayYmd());
								setEadtList([]);
								setMedicationData(JSON.parse(JSON.stringify(DEFAULT_MEDICATION_DATA)));
								setConfirmer('');
								setConfirmerSearchTerm('');
								setConfirmDate(todayYmd());
								setNotes('');
								setEtc('');
							}}
						/>
					</aside>

					{/* 우측: 약물 복용 시간 입력 */}
					<section className="flex-1">
						{!selectedMember ? (
							<div className="p-6 text-sm text-blue-900/70 bg-white border border-blue-300 rounded-lg">
								좌측에서 수급자를 선택하면, 우측에 복용일자 목록과 복용시간 상세가 표시됩니다.
							</div>
						) : (
							<div className="bg-white border border-blue-300 rounded-lg shadow-sm">
								{/* 상단: 수급자/복용일자/버튼 */}
								<div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
									<div className="flex items-center justify-between gap-3">
										<div className="flex flex-wrap items-center gap-3">
											<div className="flex items-center gap-2">
												<div className="px-2 py-1 text-sm font-semibold text-blue-900 bg-blue-200 border border-blue-300 rounded">
													수급자
												</div>
												<div className="px-3 py-1 text-sm bg-white border border-blue-300 rounded min-w-[140px]">
													{selectedMember.P_NM || selectedMember.PNUM}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<div className="px-2 py-1 text-sm font-semibold text-blue-900 bg-blue-200 border border-blue-300 rounded">
													복용일자
												</div>
												<input
													type="date"
													value={selectedEadt}
													onChange={(e) => setSelectedEadt(e.target.value)}
													className="px-2 py-1 text-sm bg-white border border-blue-300 rounded"
													disabled={!isEditMode && detailLoading}
												/>
											</div>
										</div>

										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => {
													setSelectedEadt(todayYmd());
													setMedicationData(JSON.parse(JSON.stringify(DEFAULT_MEDICATION_DATA)));
													setConfirmer('');
													setConfirmerSearchTerm('');
													setConfirmDate(todayYmd());
													setNotes('');
													setEtc('');
													setIsEditMode(true);
												}}
												className="px-3 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50"
											>
												추가
											</button>
											{isEditMode ? (
												<>
													<button
														type="button"
														onClick={handleCancel}
														className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300"
													>
														취소
													</button>
													<button
														type="button"
														onClick={handleDelete}
														className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded hover:bg-red-700"
													>
														삭제
													</button>
													<button
														type="button"
														onClick={handleSave}
														className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
													>
														저장
													</button>
												</>
											) : (
												<>
													<button
														type="button"
														onClick={handleEdit}
														className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700"
													>
														수정
													</button>
													<button
														type="button"
														onClick={handleDelete}
														className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded hover:bg-red-700"
													>
														삭제
													</button>
													<button
														type="button"
														onClick={() => {
															if (!selectedMember) return;
															const ym = ymdToYm(selectedEadt) || ymdToYm(todayYmd());
															const pnum = String(selectedMember?.PNUM ?? '').trim();
															const w = openPrintWindowNow('약물관리기록지(개별)');
															if (!w) {
																alert('팝업 차단을 해제해주세요.');
																return;
															}
															(async () => {
																const res = await fetch(
																	`/api/medication-print/individual?pnum=${encodeURIComponent(pnum)}&month=${encodeURIComponent(ym)}`
																);
																const json = await res.json();
																if (!json?.success) {
																	w.close();
																	alert(json?.error || '출력 데이터 조회 실패');
																	return;
																}
																writeAndPrint(w, '약물관리기록지(개별)', buildIndividualPrintHtml(json.data));
															})().catch((e) => {
																console.error(e);
																try { w.close(); } catch {}
																alert('출력 중 오류가 발생했습니다.');
															});
														}}
														className="px-3 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50"
													>
														개별복용출력
													</button>
													<button
														type="button"
														onClick={() => {
															const ym = ymdToYm(selectedEadt) || ymdToYm(todayYmd());
															const w = openPrintWindowNow('약물관리기록지(전체)');
															if (!w) {
																alert('팝업 차단을 해제해주세요.');
																return;
															}
															(async () => {
																const res = await fetch(`/api/medication-print/monthly?month=${encodeURIComponent(ym)}`);
																const json = await res.json();
																if (!json?.success) {
																	w.close();
																	alert(json?.error || '출력 데이터 조회 실패');
																	return;
																}
																writeAndPrint(w, '약물관리기록지(전체)', buildMonthlyPrintHtml(json.data));
															})().catch((e) => {
																console.error(e);
																try { w.close(); } catch {}
																alert('출력 중 오류가 발생했습니다.');
															});
														}}
														className="px-3 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50"
													>
														전체복용출력
													</button>
													<button
														type="button"
														onClick={() => {
															if (!selectedMember) return;
															const ym = ymdToYm(selectedEadt) || ymdToYm(todayYmd());
															const pnum = String(selectedMember?.PNUM ?? '').trim();
															const w = openPrintWindowNow('질병 및 복용약물');
															if (!w) {
																alert('팝업 차단을 해제해주세요.');
																return;
															}
															(async () => {
																const res = await fetch(
																	`/api/medication-print/drugs?pnum=${encodeURIComponent(pnum)}&month=${encodeURIComponent(ym)}`
																);
																const json = await res.json();
																if (!json?.success) {
																	w.close();
																	alert(json?.error || '출력 데이터 조회 실패');
																	return;
																}
																writeAndPrint(w, '질병 및 복용약물', buildDrugsPrintHtml(json.data));
															})().catch((e) => {
																console.error(e);
																try { w.close(); } catch {}
																alert('출력 중 오류가 발생했습니다.');
															});
														}}
														className="px-3 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-400 rounded hover:bg-blue-50"
													>
														복용약물출력
													</button>
												</>
											)}
										</div>
									</div>
								</div>

								<div className="flex gap-4 p-4">
									{/* 좌: 복용일자 목록 */}
									<aside className="w-[220px] shrink-0">
										<div className="overflow-hidden bg-white border border-blue-300 rounded">
											<div className="px-3 py-2 text-sm font-semibold text-blue-900 bg-blue-50 border-b border-blue-200">
												복용일자
											</div>
											<div className="max-h-[520px] overflow-auto">
												{eadtLoading ? (
													<div className="px-3 py-3 text-sm text-blue-900/60">조회 중...</div>
												) : eadtList.length === 0 ? (
													<div className="px-3 py-3 text-sm text-blue-900/60">데이터가 없습니다</div>
												) : (
													<ul className="divide-y divide-blue-50">
														{eadtList.map((d) => (
															<li key={d}>
																<button
																	type="button"
																	onClick={() => setSelectedEadt(d)}
																	className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
																		selectedEadt === d ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-blue-900'
																	}`}
																>
																	{d}
																</button>
															</li>
														))}
													</ul>
												)}
											</div>
										</div>
									</aside>

									{/* 우: 상세 */}
									<section className="flex-1">
										<div className="bg-white border border-blue-300 rounded-lg">
											<div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
												<div className="grid grid-cols-12 gap-2">
													<div className="col-span-2 px-2 py-1 text-sm font-semibold text-center text-blue-900 bg-blue-200 border border-blue-300 rounded whitespace-nowrap">
														구분
													</div>
													<div className="col-span-5 px-2 py-1 text-sm font-semibold text-center text-blue-900 bg-blue-200 border border-blue-300 rounded whitespace-nowrap">
														복용상태
													</div>
													<div className="col-span-2 px-2 py-1 text-sm font-semibold text-center text-blue-900 bg-blue-200 border border-blue-300 rounded whitespace-nowrap">
														복용시간
													</div>
													<div className="col-span-3 px-2 py-1 text-sm font-semibold text-center text-blue-900 bg-blue-200 border border-blue-300 rounded whitespace-nowrap">
														복용도우미
													</div>
												</div>
											</div>

											<div className="p-4 space-y-3">
												{detailLoading && (
													<div className="text-sm text-blue-900/60">상세 조회 중...</div>
												)}

												{/* 약물 복용 시간 행들 */}
												{medicationTypes.map((type) => (
													<div key={type} className="grid grid-cols-12 gap-2 items-center">
														<div className="col-span-2">
															<label className="inline-block px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
																{type}
															</label>
														</div>
														<div className="col-span-5">
															<div className="flex items-center flex-nowrap gap-2">
																{(['약없음', '복용', '미복용'] as const).map((status) => {
																	const isChecked = medicationData[type].status === status;
																	return (
																		<label
																			key={status}
																			className={`flex items-center gap-1 shrink-0 ${isEditMode ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
																		>
																			<input
																				type="radio"
																				name={type}
																				value={status}
																				checked={isChecked}
																				onChange={() => (isEditMode ? handleMedicationStatusChange(type, status) : undefined)}
																				className="w-4 h-4 border border-blue-300 shrink-0 accent-blue-700"
																				tabIndex={isEditMode ? 0 : -1}
																			/>
																			<span
																				className={`text-sm whitespace-nowrap ${
																					!isEditMode && isChecked ? 'font-semibold text-blue-800' : 'text-blue-900'
																				}`}
																			>
																				{status}
																			</span>
																		</label>
																	);
																})}
																{medicationData[type].rawStatus && medicationData[type].status === '' && (
																	<span className="text-xs text-orange-700 whitespace-nowrap shrink-0">
																		(값{medicationData[type].rawStatus}으로 선택없음)
																	</span>
																)}
															</div>
														</div>

														<div className="col-span-2">
															<input
																type="time"
																value={medicationData[type].time}
																onChange={(e) => (isEditMode ? handleMedicationTimeChange(type, e.target.value) : undefined)}
																className="w-full max-w-[7rem] px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
																disabled={!isEditMode}
															/>
														</div>

														<div className="col-span-3 relative min-w-0 helper-dropdown-container">
															<input
																type="text"
																value={helperSearchTerms[type] || medicationData[type].helper}
																onChange={(e) => (isEditMode ? handleMedicationHelperChange(type, e.target.value) : undefined)}
																onFocus={() => {
																	if (!isEditMode) return;
																	setActiveHelperType(type);
																	if (medicationData[type].helper) {
																		searchHelpers(type, medicationData[type].helper);
																	}
																}}
																className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
																placeholder="복용도우미 검색"
																disabled={!isEditMode}
															/>
															{isEditMode && showHelperDropdowns[type] && helperSuggestions[type] && helperSuggestions[type].length > 0 && (
																<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
																	{helperSuggestions[type].map((helper, index) => (
																		<div
																			key={`${helper.EMPNO}-${index}`}
																			onClick={() => handleSelectHelper(type, helper)}
																			className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
																		>
																			{helper.EMPNM}
																		</div>
																	))}
																</div>
															)}
														</div>
													</div>
												))}

												{/* 복용상태(메모) */}
												<div className="grid grid-cols-12 gap-2 items-start pt-2">
													<div className="col-span-2">
														<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
															복용상태
														</label>
													</div>
													<div className="col-span-10">
														<textarea
															value={notes}
															onChange={(e) => setNotes(e.target.value)}
															className="w-full min-h-[64px] px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
															disabled={!isEditMode}
														/>
													</div>
												</div>

												{/* 확인자/확인일자 */}
												<div className="grid grid-cols-12 gap-2 items-center pt-2">
													<div className="col-span-2">
														<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
															복용확인자
														</label>
													</div>
													<div className="col-span-4 relative confirmer-dropdown-container">
														<input
															type="text"
															value={confirmerSearchTerm || confirmer}
															onChange={(e) => {
																if (!isEditMode) return;
																const value = e.target.value;
																setConfirmer(value);
																setConfirmerSearchTerm(value);
																if (value) {
																	searchConfirmer(value);
																} else {
																	setConfirmerSuggestions([]);
																	setShowConfirmerDropdown(false);
																}
															}}
															onFocus={() => {
																if (!isEditMode) return;
																if (confirmer) {
																	searchConfirmer(confirmer);
																}
															}}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
															placeholder="복용 확인자 검색"
															disabled={!isEditMode}
														/>
														{isEditMode && showConfirmerDropdown && confirmerSuggestions.length > 0 && (
															<div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded shadow-lg max-h-40 overflow-y-auto">
																{confirmerSuggestions.map((confirmerItem, index) => (
																	<div
																		key={`${confirmerItem.EMPNO}-${index}`}
																		onClick={() => handleSelectConfirmer(confirmerItem)}
																		className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
																	>
																		{confirmerItem.EMPNM}
																	</div>
																))}
															</div>
														)}
													</div>
													<div className="col-span-2 flex justify-end">
														<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
															복용확인일자
														</label>
													</div>
													<div className="col-span-4">
														<input
															type="date"
															value={confirmDate}
															onChange={(e) => (isEditMode ? setConfirmDate(e.target.value) : undefined)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
															disabled={!isEditMode}
														/>
													</div>
												</div>

												<div className="grid grid-cols-12 gap-2 items-center pt-2">
													<div className="col-span-2">
														<label className="px-2 py-1 text-sm text-blue-900 bg-blue-100 border border-blue-300 rounded whitespace-nowrap">
															비고
														</label>
													</div>
													<div className="col-span-10">
														<input
															type="text"
															value={etc}
															onChange={(e) => setEtc(e.target.value)}
															className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded disabled:bg-blue-50"
															disabled={!isEditMode}
														/>
													</div>
												</div>
											</div>
										</div>
									</section>
								</div>
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}

