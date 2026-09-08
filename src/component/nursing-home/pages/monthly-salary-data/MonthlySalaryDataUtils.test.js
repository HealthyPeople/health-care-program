/**
 * @file 월 급여자료 — 유틸/타입/매퍼 (MonthlySalaryDataUtils.test.js)
 *
 * @description
 * 병실조정료 음수 할인·F40100 매핑을 검증합니다.
 *
 * @module component/nursing-home/pages/monthly-salary-data/MonthlySalaryDataUtils.test
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const DIR = __dirname;
const UTILS_TS = path.join(DIR, "MonthlySalaryDataUtils.ts");
const CARE_TS = path.join(DIR, "../../utils/careGrade.ts");
const VIEW_TSX = path.join(DIR, "MonthlySalaryData.tsx");

const tempFiles = [];

function transpile(filePath) {
	const source = fs.readFileSync(filePath, "utf8");
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
	fs.writeFileSync(out, js, "utf8");
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

describe("MonthlySalaryDataUtils — 병실조정료 할인", () => {
	let U;

	before(() => {
		const careOut = compile(CARE_TS);
		const utilsOut = compile(UTILS_TS, { "../../utils/careGrade": careOut });
		U = require(utilsOut);
	});

	after(cleanup);

	it("공개 API export", () => {
		assert.equal(typeof U.formatSignedAmountInput, "function");
		assert.equal(typeof U.mapDbToDetailForm, "function");
		assert.equal(typeof U.mapDbToSalaryRow, "function");
		assert.equal(typeof U.buildF40100Row, "function");
		assert.equal(typeof U.calcRecipientBurdenTotal, "function");
	});

	it("formatSignedAmountInput — 음수·중간입력 유지", () => {
		assert.equal(U.formatSignedAmountInput("-"), "-");
		assert.equal(U.formatSignedAmountInput("-5"), "-5");
		assert.equal(U.formatSignedAmountInput("-50000"), "-50,000");
		assert.equal(U.formatSignedAmountInput("-50,000"), "-50,000");
		assert.equal(U.formatSignedAmountInput("50000"), "50,000");
		assert.equal(U.formatSignedAmountInput(""), "");
		assert.equal(U.parseAmt("-50,000"), -50000);
		assert.equal(U.parseAmt("-"), 0);
	});

	it("mapDbToDetailForm — BSAL6 상급병실료 유지, BSAL7 병실조정료", () => {
		const form = U.mapDbToDetailForm({
			P_NM: "홍길동",
			P_BRDT: "19500101",
			INSPER: 80,
			USRPER: 20,
			USRGU: "1",
			SAL1: 1000000,
			SAL2: 200000,
			BSAL1: 0,
			BSAL2: 0,
			BSAL3: 0,
			BSAL4: 0,
			BSAL6: 310000,
			BSAL7: -50000,
			BSAL8: 3200,
			BSAL9: 38020,
			ESAL: 0,
			ESALDES: "",
		});
		assert.equal(form.premiumRoomFee, "310,000");
		assert.equal(form.roomAdjustFee, "-50,000");
		assert.equal(form.bathFee, "0");
		assert.equal(form.prescriptionFee, "38,020");
	});

	it("buildF40100Row — 병실조정료는 BSAL7, 처방비는 BSAL9, 상급병실료는 BSAL6", () => {
		const form = {
			...U.initialDetailForm,
			premiumRoomFee: "310,000",
			roomAdjustFee: "-50,000",
			prescriptionFee: "38,020",
			contractedMedicalFee: "0",
			dementiaFee: "3,200",
		};
		const row = U.buildF40100Row(
			{
				ANCD: "182020",
				PNUM: "22",
				P_NM: "홍길동",
				P_SEX: "1",
				P_GRD: "3",
				P_BRDT: "19500101",
				P_ST: "1",
			},
			"202608",
			form
		);
		assert.equal(row.BSAL6, 310000);
		assert.equal(row.BSAL7, -50000);
		assert.equal(row.BSAL9, 38020);
	});

	it("할인 적용 — 병실승급비·수급자부담금합이 상급병실료에서 조정료를 뺌", () => {
		const mapped = U.mapDbToSalaryRow({
			PNUM: "22",
			P_NM: "홍길동",
			P_BRDT: "19500101",
			P_GRD: "3",
			SAL1: 1000000,
			SAL2: 200000,
			BSAL1: 0,
			BSAL2: 0,
			BSAL3: 0,
			BSAL4: 0,
			BSAL6: 310000,
			BSAL7: -50000,
			BSAL8: 0,
			BSAL9: 0,
			ESAL: 0,
		});
		assert.equal(mapped.roomUpgradeFee, "260,000");
		assert.equal(mapped.recipientContributionTotal, "460,000");

		const form = U.mapDbToDetailForm({
			P_NM: "홍길동",
			P_BRDT: "19500101",
			SAL2: 200000,
			BSAL6: 310000,
			BSAL7: -50000,
		});
		assert.equal(U.calcRecipientBurdenTotal(form), 460000);
	});

	it("collectRoomAdjustsForCalc — 목록 BSAL7과 화면 미저장 값을 모은다", () => {
		const rows = U.collectRoomAdjustsForCalc(
			[
				{ PNUM: "22", BSAL7: -50000 },
				{ PNUM: "23", BSAL7: 0 },
			],
			"23",
			"-100,000"
		);
		const byPnum = Object.fromEntries(rows.map((r) => [r.pnum, r.bsal7]));
		assert.equal(byPnum["22"], -50000);
		assert.equal(byPnum["23"], -100000);
	});

	it("화면은 유틸을 import하고 로컬 매퍼를 두지 않음", () => {
		const view = fs.readFileSync(VIEW_TSX, "utf8");
		assert.match(view, /from "\.\/MonthlySalaryDataUtils"/);
		assert.match(view, /formatSignedAmountInput/);
		assert.doesNotMatch(view, /function mapDbToDetailForm\(/);
		assert.doesNotMatch(view, /function formatSignedAmountInput\(/);
	});
});
