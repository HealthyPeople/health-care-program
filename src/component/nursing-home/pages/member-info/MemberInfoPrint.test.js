/**
 * @file 수급자정보 — 인쇄 헬퍼 (MemberInfoPrint.test.js)
 *
 * @description
 * 요양원 수급자정보 기능의 인쇄 헬퍼입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoPrint.test
 */
/**
 * MemberInfoPrint — 출력 HTML 빌더·미리보기 창 열기 최소 검증
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const DIR = __dirname;
const PRINT_TS = path.join(DIR, 'MemberInfoPrint.ts');
const UTILS_TS = path.join(DIR, 'MemberInfoUtils.ts');
const HOOK_TS = path.join(DIR, 'useMemberInfo.ts');
const VIEW_TSX = path.join(DIR, 'MemberInfoView.tsx');
const CARE_TS = path.join(DIR, '../../utils/careGrade.ts');

const tempFiles = [];

function transpile(filePath) {
	const source = fs.readFileSync(filePath, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		fileName: path.basename(filePath),
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.React,
			target: ts.ScriptTarget.ES2019,
			esModuleInterop: true,
			allowSyntheticDefaultImports: true,
		},
	});
	return outputText;
}

function compile(filePath, replacements = {}) {
	let js = transpile(filePath);
	for (const [spec, target] of Object.entries(replacements)) {
		js = js.split(`require("${spec}")`).join(`require(${JSON.stringify(target)})`);
		js = js.split(`require('${spec}')`).join(`require(${JSON.stringify(target)})`);
	}
	const out = path.join(DIR, `.${path.basename(filePath)}.${process.pid}.cjs`);
	fs.writeFileSync(out, js, 'utf8');
	tempFiles.push(out);
	return out;
}

function cleanup() {
	for (const f of tempFiles) {
		try {
			delete require.cache[require.resolve(f)];
		} catch {
			/* ignore */
		}
		try {
			fs.unlinkSync(f);
		} catch {
			/* ignore */
		}
	}
	tempFiles.length = 0;
}

const SAMPLE_ROW = {
	name: '홍길동',
	sex: '남',
	birthday: '1950-01-01',
	age: 74,
	recognitionNo: 'L0000000001',
	grade: '3등급',
	validPeriod: '2024-01-01 ~ 2025-12-31',
	status: '입소',
	admitDate: '2024-02-01',
	dischargeDate: '',
	guardianPhone: '010-1234-5678',
};

describe('MemberInfoPrint — HTML builders', () => {
	let P;

	before(() => {
		const careOut = compile(CARE_TS);
		const utilsOut = compile(UTILS_TS, { '../../utils/careGrade': careOut });
		const printOut = compile(PRINT_TS, { './MemberInfoUtils': utilsOut });
		P = require(printOut);
	});

	after(cleanup);

	it('공개 API export', () => {
		assert.equal(typeof P.buildV10010AListPrintHtml, 'function');
		assert.equal(typeof P.buildRecipientCardPrintHtml, 'function');
		assert.equal(typeof P.openPrintPreviewWindow, 'function');
		assert.equal(typeof P.formatValidPeriodHtml, 'function');
	});

	it('buildV10010AListPrintHtml — 헤더·행·합계', () => {
		const html = P.buildV10010AListPrintHtml([SAMPLE_ROW], '우리요양원');
		assert.match(html, /<title><\/title>/);
		assert.match(html, /cover-top/);
		assert.match(html, /수급자 전체 목록/);
		assert.match(html, /기관: 우리요양원/);
		assert.match(html, /인원: 1명/);
		assert.match(html, /홍길동/);
		assert.match(html, /장기요양인증번호/);
		assert.match(html, /<span>V10010A<\/span>/);
		assert.match(html, /총 1명/);
		assert.match(html, /2024-01-01 ~/);
		assert.match(html, /2025-12-31/);
		assert.match(html, /class="c-no"/);
		assert.match(html, /class="c-name"/);
	});

	it('formatValidPeriodHtml — 시작일 ~ / 종료일 두 줄', () => {
		const html = P.formatValidPeriodHtml('2013-12-14~2020-12-31');
		assert.match(html, /2013-12-14 ~/);
		assert.match(html, /2020-12-31/);
		assert.doesNotMatch(html, /2013-12-14~2020-12-31/);
		assert.equal(P.formatValidPeriodHtml(''), '-');
		assert.equal(P.formatValidPeriodHtml('-'), '-');
	});

	it('buildV10010AListPrintHtml — 데이터 없음', () => {
		const html = P.buildV10010AListPrintHtml([]);
		assert.match(html, /colspan="12">출력할 데이터가 없습니다\./);
		assert.match(html, /인원: 0명/);
	});

	it('buildRecipientCardPrintHtml — 제목·보호자·계약·질병내역 섹션', () => {
		const html = P.buildRecipientCardPrintHtml(
			{
				P_NM: '홍길동',
				P_SEX: '1',
				P_ST: '1',
				BHNM: '김보호',
				BHREL: '20',
				GUARDIAN_P_HP: '010-1234-5678',
				GUARDIAN_P_ADDR: '서울시 강남구',
			},
			{
				name: '홍길동',
				recognitionNo: 'L0000000001',
				birthday: '1950-01-01',
				grade: '3등급',
				validPeriod: '2024-01-01 ~ 2025-12-31',
				contractDate: '2024-01-15',
				admitDate: '2024-02-01',
			},
			'우리요양원',
			[
				{ JDES: '고혈압', JDT: '2023-05-01', ETC: '복약중' },
				{ JDES: '당뇨', JDT: '2024-01-10', ETC: '' },
			]
		);
		assert.match(html, /<title>홍길동 - 수급자카드<\/title>/);
		assert.match(html, /class="sectionTitle">보호자 정보</);
		assert.match(html, /class="sectionTitle">계약 정보</);
		assert.match(html, /class="sectionTitle">질병내역</);
		assert.match(html, /aria-label="질병내역"/);
		assert.match(html, /고혈압/);
		assert.match(html, /2023-05-01/);
		assert.match(html, /복약중/);
		assert.match(html, /당뇨/);
		assert.match(html, /김보호/);
		assert.match(html, /아들/);
		assert.match(html, /기관<\/b> <span class="muted">우리요양원/);
		// card 값이 없으면 selectedMember로 폴백
		assert.match(html, /<td>남<\/td>/);
		assert.match(html, /<td>입소<\/td>/);
	});

	it('buildRecipientCardPrintHtml — 질병내역 없으면 안내 문구', () => {
		const html = P.buildRecipientCardPrintHtml(
			{ P_NM: '홍길동' },
			{ name: '홍길동' },
			'우리요양원',
			[]
		);
		assert.match(html, /등록된 질병내역이 없습니다/);
	});

	it('openPrintPreviewWindow — 팝업 차단 시 false', () => {
		const originalWindow = global.window;
		const originalAlert = global.alert;
		const alerts = [];
		global.alert = (msg) => alerts.push(msg);
		global.window = { open: () => null };
		try {
			assert.equal(P.openPrintPreviewWindow('<html></html>'), false);
			assert.equal(alerts.length, 1);
			assert.match(alerts[0], /팝업이 차단/);
		} finally {
			global.window = originalWindow;
			global.alert = originalAlert;
		}
	});

	it('openPrintPreviewWindow — write/close 후 true', () => {
		const originalWindow = global.window;
		const calls = [];
		const fakeWin = {
			document: {
				open: () => calls.push('open'),
				write: (html) => calls.push(`write:${html}`),
				close: () => calls.push('close'),
			},
			focus: () => calls.push('focus'),
			print: () => calls.push('print'),
		};
		global.window = { open: () => fakeWin };
		try {
			assert.equal(P.openPrintPreviewWindow('<html>x</html>'), true);
			assert.deepEqual(calls, ['open', 'write:<html>x</html>', 'close']);
		} finally {
			global.window = originalWindow;
		}
	});

	it('Print는 Utils를 import하고 View는 HTML 문자열을 갖지 않음', () => {
		const print = fs.readFileSync(PRINT_TS, 'utf8');
		assert.match(print, /from '\.\/MemberInfoUtils'/);

		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.doesNotMatch(view, /<!DOCTYPE html>/);
		assert.doesNotMatch(view, /<!doctype html>/);
		assert.doesNotMatch(view, /window\.open\(/);

		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /buildRecipientCardPrintHtml\(selectedMember, card, instName, diseases\)/);
		assert.match(hook, /\/api\/f30030\?pnum=/);
		assert.match(hook, /buildV10010AListPrintHtml\(list, instName\)/);
		assert.match(hook, /openPrintPreviewWindow\(html\)/);
	});
});
