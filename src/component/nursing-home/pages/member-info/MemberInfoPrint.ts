/**
 * @file 수급자정보 — 인쇄 헬퍼 (MemberInfoPrint.ts)
 *
 * @description
 * 요양원 수급자정보 기능의 인쇄 헬퍼입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoPrint
 */
import {
	escapeHtml,
	fmtSex,
	fmtStatus,
	todayYYYYMMDD,
	type MemberData,
} from './MemberInfoUtils';

export interface V10010APrintRow {
	name: string;
	sex: string;
	birthday: string;
	age: number | null;
	recognitionNo: string;
	grade: string;
	validPeriod: string;
	status: string;
	admitDate: string;
	dischargeDate: string;
	guardianPhone: string;
}

/** 유효기간: '2013-12-14 ~' / '2020-12-31' 두 줄. 날짜 중간에서 줄바꿈되지 않게 한다. */
export function formatValidPeriodHtml(raw: string | null | undefined): string {
	const s = String(raw ?? '').trim();
	if (!s || s === '-') return '-';
	const parts = s.split(/\s*~\s*/).map((p) => p.trim()).filter(Boolean);
	if (parts.length >= 2) {
		return `<div class="period"><span>${escapeHtml(parts[0])} ~</span><span>${escapeHtml(parts[1])}</span></div>`;
	}
	return escapeHtml(s);
}

export function buildV10010AListPrintHtml(rows: V10010APrintRow[], institutionName?: string): string {
	const bodyRows =
		rows.length === 0
			? `<tr><td class="c" colspan="12">출력할 데이터가 없습니다.</td></tr>`
			: rows
					.map(
						(r, i) => `<tr>
			<td class="c fit">${i + 1}</td>
			<td class="c fit">${escapeHtml(r.name || '-')}</td>
			<td class="c fit">${escapeHtml(r.sex || '-')}</td>
			<td class="c">${escapeHtml(r.birthday || '-')}</td>
			<td class="c fit">${r.age != null && Number.isFinite(r.age) ? r.age : '-'}</td>
			<td class="c">${escapeHtml(r.recognitionNo || '-')}</td>
			<td class="c">${escapeHtml(r.grade || '-')}</td>
			<td class="c period-cell">${formatValidPeriodHtml(r.validPeriod)}</td>
			<td class="c">${escapeHtml(r.status || '-')}</td>
			<td class="c">${escapeHtml(r.admitDate || '-')}</td>
			<td class="c">${escapeHtml(r.dischargeDate || '-')}</td>
			<td class="c">${escapeHtml(r.guardianPhone || '-')}</td>
		</tr>`
					)
					.join('');

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title></title>
<style>
@page { size: A4 landscape; margin: 0 8mm 12mm 8mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 9pt; color: #000; background: #fff; }
.cover-top {
	position: fixed; left: -8mm; right: -8mm; top: 0; height: 8mm;
	background: #fff; z-index: 99999;
	-webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.head {
	text-align: center;
	padding-top: 10mm;
	padding-bottom: 10mm;
	page-break-after: avoid;
}
.title { font-size: 16pt; font-weight: 700; letter-spacing: 0.02em; }
.meta { margin-top: 4px; margin-bottom: 8px; font-size: 9.5pt; display: flex; justify-content: space-between; gap: 12px; }
.tbl { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000; margin-top: -10mm; }
.tbl col.c-no { width: 6.5mm; }
.tbl col.c-name { width: 14mm; }
.tbl col.c-sex { width: 8mm; }
.tbl col.c-age { width: 8mm; }
.tbl thead { display: table-header-group; }
.tbl tr { page-break-inside: avoid; break-inside: avoid; }
.tbl th, .tbl td { border: 1px solid #000; padding: 3px 2px; vertical-align: middle; word-break: break-word; }
.tbl th { background: #e8e8e8; font-weight: 700; text-align: center; font-size: 8.5pt; }
.tbl td.c { text-align: center; }
.tbl th.fit, .tbl td.fit { white-space: nowrap; padding: 3px 1px; }
.tbl td.period-cell { word-break: keep-all; }
.tbl td.period-cell .period {
	display: flex;
	flex-direction: column;
	align-items: center;
	line-height: 1.25;
}
.tbl td.period-cell .period span { white-space: nowrap; }
.tbl thead tr.gap td {
	height: 10mm; border: none; padding: 0; background: #fff;
	-webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.foot { margin-top: 8px; display: flex; justify-content: space-between; font-size: 9pt; }
@media print {
	body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
	<div class="cover-top"></div>
	<div class="head">
		<div class="title">수급자 전체 목록</div>
		<div class="meta">
			<span>기준일: ${escapeHtml(todayYYYYMMDD())}</span>
			<span>기관: ${escapeHtml(institutionName || '')}</span>
			<span>인원: ${rows.length}명</span>
		</div>
	</div>
	<table class="tbl">
		<colgroup>
			<col class="c-no" />
			<col class="c-name" />
			<col class="c-sex" />
			<col />
			<col class="c-age" />
			<col />
			<col />
			<col />
			<col />
			<col />
			<col />
			<col />
		</colgroup>
		<thead>
			<tr class="gap">
				<td></td><td></td><td></td><td></td><td></td><td></td>
				<td></td><td></td><td></td><td></td><td></td><td></td>
			</tr>
			<tr>
				<th class="fit">No</th>
				<th class="fit">성명</th>
				<th class="fit">성별</th>
				<th>생일</th>
				<th class="fit">나이</th>
				<th>장기요양인증번호</th>
				<th>요양등급</th>
				<th>유효기간</th>
				<th>상태</th>
				<th>입소일자</th>
				<th>퇴소일자</th>
				<th>보호자연락처</th>
			</tr>
		</thead>
		<tbody>${bodyRows}</tbody>
	</table>
	<div class="foot">
		<span>V10010A</span>
		<span>총 ${rows.length}명</span>
	</div>
</body>
</html>`;
}

/** 수급자카드 출력용 질병내역(F30030) 행 */
export interface RecipientCardDiseaseRow {
	JDES?: string;
	JDT?: string;
	ETC?: string;
	SEQ?: number | string;
}

/** V10010C(수급자카드) 출력 HTML */
export function buildRecipientCardPrintHtml(
	selectedMember: MemberData,
	card: MemberData,
	instName: string,
	diseases: RecipientCardDiseaseRow[] = []
): string {
	const memberName = String(card.name || selectedMember.P_NM || '').trim();
	const title = `${memberName} - 수급자카드`;
	const baseFont = `"Malgun Gothic", "맑은 고딕", Arial, sans-serif`;

	const guardianName = selectedMember.BHNM || '';
	const guardianRelRaw = selectedMember.BHREL || selectedMember.BHETC || '';
	const guardianRel = (() => {
		const r = String(guardianRelRaw ?? '').trim();
		if (r === '10') return '남편';
		if (r === '11') return '부인';
		if (r === '20') return '아들';
		if (r === '21') return '딸';
		if (r === '22') return '며느리';
		if (r === '23') return '사위';
		if (r === '31') return '손주';
		return r;
	})();

	const guardianPhone = selectedMember.GUARDIAN_P_HP || selectedMember.GUARDIAN_P_TEL || '';
	const guardianAddr = selectedMember.GUARDIAN_P_ADDR || '';

	const memberNo = card.recognitionNo || '';
	const birth = card.birthday || '';
	const grade = card.grade || '';
	const validPeriod = card.validPeriod || '';
	const contractDate = card.contractDate || '';
	const admitDate = card.admitDate || '';
	const dischargeDate = card.dischargeDate || '';
	const status = card.status || fmtStatus(card.P_ST || selectedMember.P_ST);
	const sex = card.sex || fmtSex(selectedMember.P_SEX);
	const hospital = card.hospital || '';
	const doctorName = card.doctorName || '';
	const doctorTel = card.doctorTel || '';
	const dischargeReason = card.dischargeReason || '';
	const zip = card.zip || '';
	const address = card.address || '';
	const homePhone = card.homePhone || '';
	const addrDisp = [zip, address].filter(Boolean).join(' ');

	const diseaseRowsHtml =
		diseases.length === 0
			? `<tr><td class="center" colspan="3">등록된 질병내역이 없습니다</td></tr>`
			: diseases
					.map(
						(d) => `<tr>
          <td>${escapeHtml(String(d.JDES || '').trim() || '-')}</td>
          <td class="center nowrap">${escapeHtml(String(d.JDT || '').trim() || '-')}</td>
          <td>${escapeHtml(String(d.ETC || '').trim() || '-')}</td>
        </tr>`
					)
					.join('');

	return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    html, body { height: auto; }
    body { font-family: ${baseFont}; color: #000; margin: 0; padding: 0; }
    * { box-sizing: border-box; }

    .page {
      width: 100%;
      min-height: auto;
    }

    .topRow {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8mm;
    }

    .title {
      flex: 1;
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      padding-top: 1mm;
    }

    .approval {
      width: 58mm;
      border: 1px solid #000;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }
    .approval th, .approval td {
      border: 1px solid #000;
      padding: 4px 0;
      text-align: center;
      height: 9mm;
    }

    .sectionTitle {
      font-size: 18px;
      font-weight: 700;
      margin: 6mm 0 2mm;
    }

    .metaLine {
      display: flex;
      justify-content: flex-start;
      gap: 6mm;
      font-size: 12px;
      margin: 4mm 0 2mm;
    }

    .gridTable {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
    }
    .gridTable th, .gridTable td {
      border: 1px solid #000;
      padding: 3px 2px;
      vertical-align: middle;
      overflow: hidden;
    }
    .gridTable th {
      width: 24mm;
      background: #fff;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      font-size: 11px;
    }
    .gridTable td {
      height: 7.5mm;
    }

    .guardTable, .contractTable, .diseaseTable {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
    }
    .guardTable th, .guardTable td,
    .contractTable th, .contractTable td,
    .diseaseTable th, .diseaseTable td {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 3px 5px;
      vertical-align: middle;
    }

    .guardTable thead th,
    .contractTable thead th,
    .diseaseTable thead th {
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      font-weight: 700;
      text-align: left;
      white-space: nowrap;
    }

    .guardTable tbody td,
    .contractTable tbody td,
    .diseaseTable tbody td {
      border-top: 0;
      border-bottom: 1px solid #000;
    }

    .diseaseTable thead th {
      text-align: center;
    }
    .diseaseTable tbody td {
      word-break: break-word;
    }

    .contractTable thead th.amt,
    .contractTable tbody td.amt {
      text-align: center;
    }

    .muted { color: #000; }
    .right { text-align: right; }
    .center { text-align: center; }
    .nowrap { white-space: nowrap; }

    table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    .sectionTitle { break-after: avoid; page-break-after: avoid; }

    @media print {
      .noPrint { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { height: auto !important; }
      .page { min-height: auto !important; height: auto !important; overflow: visible !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="topRow">
      <div style="width: 58mm;"></div>
      <div class="title">${escapeHtml(title)}</div>
      <table class="approval" aria-label="결재">
        <thead>
          <tr>
            <th>담당</th>
            <th>검토</th>
            <th>결재</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="metaLine">
      <div class="nowrap"><b>기준일</b> <span class="muted">${escapeHtml(todayYYYYMMDD())}</span></div>
      <div class="nowrap"><b>기관</b> <span class="muted">${escapeHtml(instName)}</span></div>
    </div>

    <table class="gridTable" aria-label="수급자카드">
      <colgroup>
        <col style="width:24mm" />
        <col style="width:46mm" />
        <col style="width:24mm" />
        <col style="width:24mm" />
        <col style="width:24mm" />
        <col style="width:28mm" />
        <col style="width:24mm" />
        <col style="width:auto" />
      </colgroup>
      <tbody>
        <tr>
          <th>인정번호</th>
          <td>${escapeHtml(memberNo)}</td>
          <th>생일</th>
          <td>${escapeHtml(birth)}</td>
          <th>수급자상태</th>
          <td>${escapeHtml(status)}</td>
          <th>퇴소사유</th>
          <td>${escapeHtml(dischargeReason)}</td>
        </tr>
        <tr>
          <th>요양등급</th>
          <td>${escapeHtml(grade)}</td>
          <th>성별</th>
          <td>${escapeHtml(sex)}</td>
          <th>계약일자</th>
          <td>${escapeHtml(contractDate)}</td>
          <th>입소일자</th>
          <td>${escapeHtml(admitDate)}</td>
        </tr>
        <tr>
          <th>유효기간</th>
          <td>${escapeHtml(validPeriod)}</td>
          <th>집전화번호</th>
          <td>${escapeHtml(homePhone)}</td>
          <th>퇴소일자</th>
          <td>${escapeHtml(dischargeDate)}</td>
          <th>이용병원</th>
          <td>${escapeHtml(hospital)}</td>
        </tr>
        <tr>
          <th>담당주치의</th>
          <td>${escapeHtml(doctorName)}</td>
          <th>주치의연락처</th>
          <td>${escapeHtml(doctorTel)}</td>
          <th>우편번호</th>
          <td>${escapeHtml(zip)}</td>
          <th>집주소</th>
          <td>${escapeHtml(addrDisp || address)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sectionTitle">보호자 정보</div>
    <table class="guardTable" aria-label="보호자 정보">
      <thead>
        <tr>
          <th style="width:24mm;">보호자명</th>
          <th style="width:20mm;">관계</th>
          <th style="width:24mm;">관계기타</th>
          <th style="width:24mm;">계약자구분</th>
          <th style="width:30mm;">핸드폰</th>
          <th style="width:30mm;">질적평가번호</th>
          <th>주소</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(guardianName)}</td>
          <td>${escapeHtml(guardianRel)}</td>
          <td>${escapeHtml(selectedMember.BHETC || '')}</td>
          <td>${escapeHtml(selectedMember.GUARDIAN_TYPE || '')}</td>
          <td>${escapeHtml(guardianPhone)}</td>
          <td>${escapeHtml(selectedMember.GUARDIAN_QA_NO || '')}</td>
          <td>${escapeHtml(guardianAddr)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sectionTitle">계약 정보</div>
    <table class="contractTable" aria-label="계약 정보">
      <thead>
        <tr>
          <th style="width:24mm;">계약일자</th>
          <th style="width:54mm;">계약기간</th>
          <th class="amt" style="width:24mm;">공단부담금</th>
          <th class="amt" style="width:24mm;">수급자부담금</th>
          <th style="width:24mm;">급여종류</th>
          <th class="amt" style="width:24mm;">비급여식대</th>
          <th class="amt" style="width:24mm;">비급여간식</th>
          <th class="amt" style="width:26mm;">상급병실료</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(contractDate)}</td>
          <td>${escapeHtml(validPeriod)}</td>
          <td class="amt">${escapeHtml(selectedMember.INSPER_AMT || '')}</td>
          <td class="amt">${escapeHtml(selectedMember.USRPER_AMT || '')}</td>
          <td>${escapeHtml(selectedMember.BEN_TYPE || '')}</td>
          <td class="amt">${escapeHtml(selectedMember.EAMT || '')}</td>
          <td class="amt">${escapeHtml(selectedMember.ETAMT || '')}</td>
          <td class="amt">${escapeHtml(selectedMember.ESAMT || '')}</td>
        </tr>
      </tbody>
    </table>

    <div class="sectionTitle">질병내역</div>
    <table class="diseaseTable" aria-label="질병내역">
      <thead>
        <tr>
          <th style="width:45%;">진단명</th>
          <th style="width:20%;">진단일자</th>
          <th style="width:35%;">비고</th>
        </tr>
      </thead>
      <tbody>
        ${diseaseRowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/** 출력 미리보기 창 열기 + 인쇄 (팝업 차단 시 false) */
export function openPrintPreviewWindow(html: string): boolean {
	const w = window.open('', '_blank');
	if (!w) {
		alert('팝업이 차단되어 출력창을 열 수 없습니다. 팝업 허용 후 다시 시도해주세요.');
		return false;
	}
	w.document.open();
	w.document.write(html);
	w.document.close();
	w.document.title = "";

	setTimeout(() => {
		try {
			w.focus();
			w.print();
		} catch {
			// ignore
		}
	}, 250);
	return true;
}
