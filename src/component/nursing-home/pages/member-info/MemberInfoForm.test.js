/**
 * @file 수급자정보 — UI 부분 컴포넌트 (MemberInfoForm.test.js)
 *
 * @description
 * 요양원 수급자정보 기능의 UI 부분 컴포넌트입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoForm.test
 */
/**
 * MemberInfoForm — create/edit/view/placeholder 모드 렌더 최소 검증
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const DIR = __dirname;
const FORM_TSX = path.join(DIR, 'MemberInfoForm.tsx');
const UTILS_TS = path.join(DIR, 'MemberInfoUtils.ts');
const VIEW_TSX = path.join(DIR, 'MemberInfoView.tsx');
const CARE_TS = path.join(DIR, '../../utils/careGrade.ts');
const ROOM_TS = path.join(DIR, '../../utils/roomNoFloor.ts');

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

const INSTITUTIONS = [
	{ ANCD: '190000', ANNM: '우리요양원' },
	{ ANCD: '190001', ANNM: '햇살요양원' },
];

const SELECTED = {
	ANCD: '190000',
	PNUM: '7',
	P_NM: '홍길동',
	P_SEX: '1',
	P_BRDT: '1950-01-01T00:00:00.000Z',
	P_NO: '500101-1234567',
	P_GRD: '3',
	P_ST: '1',
	P_FLOOR: 2,
	HSPT: '서울병원',
	ETC: '비고내용',
};

describe('MemberInfoForm — presentational', () => {
	let Form;

	before(() => {
		const careOut = compile(CARE_TS);
		const roomOut = compile(ROOM_TS);
		const utilsOut = compile(UTILS_TS, { '../../utils/careGrade': careOut });
		const mod = require(
			compile(FORM_TSX, {
				'../../utils/careGrade': careOut,
				'../../utils/roomNoFloor': roomOut,
				'./MemberInfoUtils': utilsOut,
			})
		);
		Form = mod.default || mod;
		assert.equal(typeof Form, 'function');
	});

	after(cleanup);

	it('create 모드 — 기관 select·필수 입력·주소 검색', () => {
		const html = renderToStaticMarkup(
			React.createElement(Form, {
				mode: 'create',
				institutions: INSTITUTIONS,
				newMember: { P_NM: '신규자' },
			})
		);
		assert.match(html, /기관명 \*/);
		assert.match(html, /우리요양원/);
		assert.match(html, /햇살요양원/);
		assert.match(html, /수급자명 \*/);
		assert.match(html, /value="신규자"/);
		assert.match(html, /주소 검색/);
		assert.doesNotMatch(html, />상세주소</);
		assert.match(html, /간호지시서정보/);
		assert.match(html, /생활실/);
		assert.match(html, /placeholder="예: 101호"/);
		assert.match(html, /placeholder="층수 \(0 이상의 정수\)"/);
	});

	it('view 모드 — 값 표시(input 없음)', () => {
		const html = renderToStaticMarkup(
			React.createElement(Form, {
				mode: 'view',
				institutions: INSTITUTIONS,
				selectedMember: SELECTED,
			})
		);
		assert.match(html, /우리요양원/);
		assert.match(html, /홍길동/);
		assert.match(html, /No\.7/);
		assert.match(html, /남자/);
		assert.match(html, /1950-01-01/);
		assert.match(html, /3등급/);
		assert.match(html, /입소/);
		assert.match(html, /서울병원/);
		assert.match(html, /비고내용/);
		assert.doesNotMatch(html, /<input/);
		assert.doesNotMatch(html, /주소 검색/);
		assert.doesNotMatch(html, /주소 입력란을 클릭하거나/);
		assert.doesNotMatch(html, />상세주소</);
	});

	it('edit 모드 — input/select + 주소 검색 버튼', () => {
		const html = renderToStaticMarkup(
			React.createElement(Form, {
				mode: 'edit',
				institutions: INSTITUTIONS,
				selectedMember: SELECTED,
				editedMember: { ...SELECTED, P_BRDT: '1950-01-01', selectedANCD: '190001' },
				onFieldChange: () => {},
			})
		);
		assert.match(html, /<input/);
		assert.match(html, /<select/);
		assert.match(html, /주소 검색/);
		assert.match(html, /주소 입력란을 클릭하거나 주소 검색 버튼으로 주소를 수정할 수 있습니다\./);
		assert.match(html, /value="홍길동"/);
		assert.match(html, /value="1950-01-01"/);
		assert.match(html, /No\.7/);
		assert.doesNotMatch(html, />상세주소</);
	});

	it('placeholder 모드 — 개인정보 스켈레톤', () => {
		const html = renderToStaticMarkup(React.createElement(Form, { mode: 'placeholder' }));
		assert.match(html, /개인정보/);
		assert.match(html, /min-h-\[420px\]/);
		assert.match(html, /opacity-50/);
		assert.doesNotMatch(html, /수급자명/);
	});

	it('주소 검색은 props로 배선', () => {
		const src = fs.readFileSync(FORM_TSX, 'utf8');
		assert.match(src, /onClick=\{\(\) => onAddressSearch\?\.\(true\)\}/);
		assert.match(src, /onClick=\{\(\) => onAddressSearch\?\.\(false\)\}/);
		assert.match(src, /onChange=\{\(e\) => onNewMemberPhoneChange\?\.\(e\.target\.value\)\}/);
		assert.match(src, /onChange=\{\(e\) => onEditedMemberPhoneChange\?\.\(e\.target\.value\)\}/);
	});

	it('presentational — fetch/useState 없음', () => {
		const src = fs.readFileSync(FORM_TSX, 'utf8');
		assert.doesNotMatch(src, /useState/);
		assert.doesNotMatch(src, /fetch\(/);
	});

	it('View가 Form을 네 모드로 사용', () => {
		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.match(view, /import MemberInfoForm from '\.\/MemberInfoForm'/);
		assert.match(view, /mode="create"/);
		assert.match(view, /mode=\{isEditing && editedMember \? 'edit' : 'view'\}/);
		assert.match(view, /<MemberInfoForm mode="placeholder" \/>/);
	});
});
