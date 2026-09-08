/**
 * @file 수급자정보 — 유틸/타입/매퍼 (MemberInfoUtils.test.js)
 *
 * @description
 * 요양원 수급자정보 기능의 유틸/타입/매퍼입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoUtils.test
 */
/**
 * MemberInfoUtils — 순수 유틸 export·동작 최소 검증
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const DIR = __dirname;
const UTILS_TS = path.join(DIR, 'MemberInfoUtils.ts');
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

describe('MemberInfoUtils — pure helpers', () => {
	let U;

	before(() => {
		const careOut = compile(CARE_TS);
		const utilsOut = compile(UTILS_TS, { '../../utils/careGrade': careOut });
		U = require(utilsOut);
	});

	after(cleanup);

	it('공개 API export', () => {
		assert.equal(typeof U.escapeHtml, 'function');
		assert.equal(typeof U.fmtDate10, 'function');
		assert.equal(typeof U.fmtStatus, 'function');
		assert.equal(typeof U.fmtSex, 'function');
		assert.equal(typeof U.todayYYYYMMDD, 'function');
		assert.equal(typeof U.toDateInputString, 'function');
		assert.equal(typeof U.buildMemberForEdit, 'function');
		assert.equal(typeof U.formatGuardianRelation, 'function');
		assert.equal(typeof U.composeMemberAddress, 'function');
	});

	it('composeMemberAddress — 주소와 상세주소를 한 줄로', () => {
		assert.equal(U.composeMemberAddress('서울시 강남구 테헤란로 1', '101동 101호'), '서울시 강남구 테헤란로 1 101동 101호');
		assert.equal(U.composeMemberAddress('서울시 강남구', ''), '서울시 강남구');
		assert.equal(U.composeMemberAddress('', '101호'), '101호');
		assert.equal(U.composeMemberAddress(null, null), '');
	});

	it('escapeHtml / fmtStatus / fmtSex', () => {
		assert.equal(U.escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#039;&amp;&#039;&lt;/a&gt;');
		assert.equal(U.escapeHtml(null), '');
		assert.equal(U.fmtStatus('1'), '입소');
		assert.equal(U.fmtStatus('9'), '퇴소');
		assert.equal(U.fmtStatus(''), '');
		assert.equal(U.fmtSex('1'), '남');
		assert.equal(U.fmtSex('2'), '여');
		assert.equal(U.fmtSex('3'), '3');
	});

	it('toDateInputString / fmtDate10 / todayYYYYMMDD', () => {
		assert.equal(U.toDateInputString('2024-06-01T00:00:00.000Z'), '2024-06-01');
		assert.equal(U.toDateInputString('2024-06'), '2024-06');
		assert.equal(U.toDateInputString(null), '');
		assert.equal(U.toDateInputString(new Date(Date.UTC(2024, 5, 1))), '2024-06-01');
		assert.equal(U.fmtDate10('2024-06-01 00:00:00'), '2024-06-01');
		assert.match(U.todayYYYYMMDD(), /^\d{4}-\d{2}-\d{2}$/);
	});

	it('입·퇴소 시간 / PAY_COM_GU(12시간 이하)', () => {
		assert.equal(U.toTimeInputString('09:30:00'), '09:30');
		assert.equal(U.toTimeInputString('930'), '');
		assert.equal(U.toTimeInputString('0930'), '09:30');
		assert.equal(U.formatDateTimeDisplay('2024-06-01', '14:00'), '2024-06-01 14:00');
		// 입소 12:00 → 체류 12h → 1 / 입소 11:00 → 13h → 0
		assert.equal(U.calcAdmitPayComGu('12:00'), '1');
		assert.equal(U.calcAdmitPayComGu('11:00'), '0');
		// 퇴소 11:00 → 체류 11h → 1 / 퇴소 13:00 → 13h → 0
		assert.equal(U.calcDischargePayComGu('11:00'), '1');
		assert.equal(U.calcDischargePayComGu('12:00'), '1');
		assert.equal(U.calcDischargePayComGu('13:00'), '0');
	});

	it('buildMemberForEdit 스칼라 정규화', () => {
		const m = U.buildMemberForEdit({
			ANCD: 190000,
			P_GRD: '3등급',
			P_FLOOR: 0,
			ROOM_NO: '101호',
			P_BRDT: '1950-01-01T00:00:00.000Z',
			P_YYDT: null,
			INSPER: 80,
			USRPER: null,
		});
		assert.equal(m.selectedANCD, '190000');
		assert.equal(m.P_GRD, '3');
		assert.equal(m.P_FLOOR, '0');
		assert.equal(m.ROOM_NO, '101호');
		assert.equal(m.P_BRDT, '1950-01-01');
		assert.equal(m.P_YYDT, '');
		assert.equal(m.INSPER, '80');
		assert.equal(m.USRPER, '');
	});

	it('formatGuardianRelation — BHREL 코드 매핑', () => {
		assert.equal(U.formatGuardianRelation({ BHREL: '10' }), '남편');
		assert.equal(U.formatGuardianRelation({ BHREL: '11' }), '부인');
		assert.equal(U.formatGuardianRelation({ BHREL: '20' }), '아들');
		assert.equal(U.formatGuardianRelation({ BHREL: '21' }), '딸');
		assert.equal(U.formatGuardianRelation({ BHREL: '22' }), '며느리');
		assert.equal(U.formatGuardianRelation({ BHREL: '23' }), '사위');
		assert.equal(U.formatGuardianRelation({ BHREL: '31' }), '손주');
	});

	it('formatGuardianRelation — BHREL 없으면 GUARDIAN_P_TEL 폴백', () => {
		assert.equal(U.formatGuardianRelation({ BHREL: '', GUARDIAN_P_TEL: '010-1111-2222' }), '010-1111-2222');
		assert.equal(U.formatGuardianRelation({ BHREL: null, GUARDIAN_P_TEL: '02-000-0000' }), '02-000-0000');
		assert.equal(U.formatGuardianRelation({}), '-');
		assert.equal(U.formatGuardianRelation(null), '-');
		assert.equal(U.formatGuardianRelation({ BHREL: '99', BHETC: '지인' }), '99');
	});

	it('View는 유틸을 재정의하지 않음', () => {
		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.doesNotMatch(view, /function escapeHtml\(/);
		assert.doesNotMatch(view, /function fmtStatus\(/);
		assert.doesNotMatch(view, /function fmtSex\(/);
		assert.doesNotMatch(view, /function todayYYYYMMDD\(/);
		assert.doesNotMatch(view, /function toDateInputString\(/);
		assert.doesNotMatch(view, /function buildMemberForEdit\(/);
	});

	it('Utils는 careGrade의 normalizePGrdForSelect를 사용', () => {
		const utils = fs.readFileSync(UTILS_TS, 'utf8');
		assert.match(utils, /import \{ normalizePGrdForSelect \} from '\.\.\/\.\.\/utils\/careGrade'/);
	});
});
