/** Shared print helpers used by medication-time and medication-registration pages. */

export const calcAge = (birthYmd?: string) => {
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

export const ymdToYm = (ymd: string) => {
	const s = String(ymd || '').trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
	return '';
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

export const openPrintWindowNow = (title: string) => {
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

export const writeAndPrint = (w: Window, title: string, bodyHtml: string) => {
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

export function buildIndividualPrintHtml(data: any) {
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
}

export function buildMonthlyPrintHtml(data: any) {
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
}

export function buildDrugsPrintHtml(data: any) {
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
}
