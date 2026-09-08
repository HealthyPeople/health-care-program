/**
 * @file 수급자정보 — UI 부분 컴포넌트 (MemberInfoAddressDetailModal.test.js)
 *
 * @description
 * 요양원 수급자정보 기능의 UI 부분 컴포넌트입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoAddressDetailModal.test
 */
/**
 * MemberInfoAddressDetailModal — 상세주소 입력 모달 최소 검증
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const DIR = __dirname;
const MODAL_TSX = path.join(DIR, 'MemberInfoAddressDetailModal.tsx');
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

describe('MemberInfoAddressDetailModal — presentational', () => {
	let Modal;

	before(() => {
		const careOut = compile(CARE_TS);
		const utilsOut = compile(UTILS_TS, { '../../utils/careGrade': careOut });
		const modalOut = compile(MODAL_TSX, { './MemberInfoUtils': utilsOut });
		Modal = require(modalOut).default || require(modalOut);
	});

	after(cleanup);

	it('선택한 주소와 저장 버튼을 보여준다', () => {
		const html = renderToStaticMarkup(
			React.createElement(Modal, {
				zip: '06236',
				baseAddress: '서울시 강남구 테헤란로 1',
				onCancel: () => {},
				onSave: () => {},
			})
		);
		assert.match(html, /상세주소 입력/);
		assert.match(html, /06236/);
		assert.match(html, /서울시 강남구 테헤란로 1/);
		assert.match(html, /저장될 주소/);
		assert.match(html, />저장</);
		assert.match(html, />취소</);
	});

	it('View가 모달을 훅 draft로 연다', () => {
		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.match(view, /import MemberInfoAddressDetailModal from '\.\/MemberInfoAddressDetailModal'/);
		assert.match(view, /addressSearchDraft &&/);
		assert.match(view, /onSave=\{handleAddressDetailSave\}/);
	});
});
