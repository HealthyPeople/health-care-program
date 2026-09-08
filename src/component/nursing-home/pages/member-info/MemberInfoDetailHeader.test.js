/**
 * @file 수급자정보 — 화면 컴포넌트 (MemberInfoDetailHeader.test.js)
 *
 * @description
 * 요양원 수급자정보 기능의 화면 컴포넌트입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/MemberInfoDetailHeader.test
 */
/**
 * MemberInfoDetailHeader — create/detail 모드 버튼 렌더 최소 검증
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const DIR = __dirname;
const HEADER_TSX = path.join(DIR, 'MemberInfoDetailHeader.tsx');
const VIEW_TSX = path.join(DIR, 'MemberInfoView.tsx');

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

function compile(filePath) {
	const out = path.join(DIR, `.${path.basename(filePath)}.${process.pid}.cjs`);
	fs.writeFileSync(out, transpile(filePath), 'utf8');
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

describe('MemberInfoDetailHeader — presentational', () => {
	let Header;

	before(() => {
		const mod = require(compile(HEADER_TSX));
		Header = mod.default || mod;
		assert.equal(typeof Header, 'function');
	});

	after(cleanup);

	it('create 모드 — 수급자 생성 + 저장/취소', () => {
		const html = renderToStaticMarkup(
			React.createElement(Header, {
				mode: 'create',
				loading: false,
				onSave: () => {},
				onCancel: () => {},
			})
		);
		assert.match(html, /수급자 생성/);
		assert.match(html, />저장</);
		assert.match(html, />취소</);
		assert.doesNotMatch(html, /수급자카드출력/);
		assert.doesNotMatch(html, /삭제/);
	});

	it('create 모드 — loading 시 저장 중', () => {
		const html = renderToStaticMarkup(
			React.createElement(Header, {
				mode: 'create',
				loading: true,
				onSave: () => {},
				onCancel: () => {},
			})
		);
		assert.match(html, /저장 중\.\.\./);
		assert.match(html, /disabled=""/);
	});

	it('detail 모드 — 조회 시 수급자카드출력 + 수정 및 삭제', () => {
		const html = renderToStaticMarkup(
			React.createElement(Header, {
				mode: 'detail',
				loading: false,
				isEditing: false,
				onSave: () => {},
				onCancel: () => {},
			})
		);
		assert.match(html, /개인정보/);
		assert.match(html, /수급자카드출력/);
		assert.match(html, /수정 및 삭제/);
		assert.doesNotMatch(html, />저장</);
	});

	it('detail 모드 — 수정 시 저장/취소/삭제', () => {
		const html = renderToStaticMarkup(
			React.createElement(Header, {
				mode: 'detail',
				loading: false,
				isEditing: true,
				onSave: () => {},
				onCancel: () => {},
			})
		);
		assert.match(html, />저장</);
		assert.match(html, />취소</);
		assert.match(html, />삭제</);
		assert.doesNotMatch(html, /수정 및 삭제/);
		assert.match(html, /수급자카드출력/);
		assert.match(html, /disabled=""/);
	});

	it('canPrintCard=false 이면 출력 버튼 disabled', () => {
		const html = renderToStaticMarkup(
			React.createElement(Header, {
				mode: 'detail',
				loading: false,
				canPrintCard: false,
				onSave: () => {},
				onCancel: () => {},
			})
		);
		assert.match(html, /disabled=""/);
	});

	it('View와 동일한 헤더 클래스 유지', () => {
		const src = fs.readFileSync(HEADER_TSX, 'utf8');
		assert.match(
			src,
			/className="flex items-center justify-between px-4 py-3 bg-blue-100 border-b border-blue-200"/
		);
		assert.match(src, /className="text-xl font-semibold text-blue-900"/);
		assert.doesNotMatch(src, /useState/);
		assert.doesNotMatch(src, /fetch\(/);
	});

	it('View가 Header를 create/detail 두 모드로 사용', () => {
		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.match(view, /import MemberInfoDetailHeader from '\.\/MemberInfoDetailHeader'/);
		assert.match(view, /mode="create"/);
		assert.match(view, /mode="detail"/);
	});
});
