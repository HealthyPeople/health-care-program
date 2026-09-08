/**
 * @file 월 급여명세서 — 유틸/타입/매퍼 (MonthlySalaryStatementUtils.test.js)
 *
 * @description
 * 요양원 월 급여명세서 기능의 유틸/타입/매퍼입니다. 폴더: component/nursing-home/pages/monthly-salary-statement
 *
 * @module component/nursing-home/pages/monthly-salary-statement/MonthlySalaryStatementUtils.test
 */
/**
 * MonthlySalaryStatementUtils — 순수 유틸 export·동작 최소 검증
 */
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const DIR = __dirname;
const UTILS_TS = path.join(DIR, "MonthlySalaryStatementUtils.ts");
const HOOK_TS = path.join(DIR, "useMonthlySalaryStatement.ts");
const PRINT_TS = path.join(DIR, "MonthlySalaryStatementPrint.ts");
const CARE_JS = path.join(DIR, "../../utils/careGrade.js");
const CARE_TS = path.join(DIR, "../../utils/careGrade.ts");

function transpile(filePath) {
	const source = fs.readFileSync(filePath, "utf8");
	const { outputText } = ts.transpileModule(source, {
		fileName: path.basename(filePath),
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2019,
			esModuleInterop: true,
			allowSyntheticDefaultImports: true,
		},
	});
	return outputText;
}

function loadUtils() {
	const pid = process.pid;
	const printOut = path.join(DIR, `.print.compiled.${pid}.cjs`);
	const utilsOut = path.join(DIR, `.utils.compiled.${pid}.cjs`);
	const careOut = path.join(DIR, `.care.compiled.${pid}.cjs`);

	// careGrade (js or ts)
	let careSrc;
	if (fs.existsSync(CARE_JS)) {
		careSrc = fs.readFileSync(CARE_JS, "utf8");
	} else if (fs.existsSync(CARE_TS)) {
		careSrc = transpile(CARE_TS);
	} else {
		careSrc =
			"module.exports = { formatCareGradeLabel: (g) => String(g == null ? '' : g) };\n";
	}
	if (!careSrc.includes("module.exports") && !careSrc.includes("exports.")) {
		careSrc = transpile(CARE_TS);
	}
	fs.writeFileSync(careOut, careSrc, "utf8");

	let printJs = transpile(PRINT_TS);
	// Print has no external imports of interest for normalizeSGu — ok as-is
	fs.writeFileSync(printOut, printJs, "utf8");

	let utilsJs = transpile(UTILS_TS);
	utilsJs = utilsJs
		.replace(
			/require\(["']\.\/MonthlySalaryStatementPrint["']\)/g,
			`require(${JSON.stringify(printOut)})`
		)
		.replace(
			/require\(["']\.\.\/\.\.\/utils\/careGrade["']\)/g,
			`require(${JSON.stringify(careOut)})`
		);
	fs.writeFileSync(utilsOut, utilsJs, "utf8");

	try {
		delete require.cache[require.resolve(utilsOut)];
		delete require.cache[require.resolve(printOut)];
		delete require.cache[require.resolve(careOut)];
		return require(utilsOut);
	} finally {
		for (const f of [utilsOut, printOut, careOut]) {
			try {
				fs.unlinkSync(f);
			} catch {
				/* ignore */
			}
		}
	}
}

describe("MonthlySalaryStatementUtils — pure helpers", () => {
	let U;

	before(() => {
		U = loadUtils();
	});

	it("공개 API export", () => {
		assert.equal(typeof U.num, "function");
		assert.equal(typeof U.fmtInt, "function");
		assert.equal(typeof U.payYearMonthToSalmm, "function");
		assert.equal(typeof U.getPreviousYearMonthInput, "function");
		assert.equal(typeof U.f40100ToStatementRow, "function");
		assert.equal(typeof U.mergeF40100WithF10010, "function");
		assert.equal(typeof U.mergeF40100FacilityFromF00110, "function");
		assert.ok(Array.isArray(U.TABS));
		assert.equal(U.TABS.length, 4);
		assert.equal(U.initialForm.deliveryMethod, "2");
		assert.equal(U.initialForm.deliverer, "");
		assert.equal(U.loginFacilityDeliverer("로아기관", "너싱홈 해원"), "로아기관");
		assert.equal(U.loginFacilityDeliverer("로아기관", "너싱홈해원"), "로아기관");
		assert.equal(U.loginFacilityDeliverer("로아기관", "해원기관"), "로아기관");
		assert.equal(U.loginFacilityDeliverer("", "담당자"), "담당자");
		assert.equal(U.loginFacilityDeliverer("", "너싱홈해원"), "");
		const replaced = U.mergeF40100FacilityFromF00110(
			{ ANNM: "너싱홈해원", ANGH: "14161000067" },
			{ ANNM: "너싱홈 로아", ANGH: "ROA-CODE" }
		);
		assert.equal(replaced.ANNM, "너싱홈 로아");
		assert.equal(replaced.ANGH, "ROA-CODE");
	});

	it("payYearMonthToSalmm / num / fmtInt", () => {
		assert.equal(U.payYearMonthToSalmm("2024-06"), "202406");
		assert.equal(U.payYearMonthToSalmm("202406"), "202406");
		assert.equal(U.payYearMonthToSalmm(""), null);
		assert.equal(U.num("1,234"), 1234);
		assert.equal(U.fmtInt(10.6), "11");
	});

	it("식대합계 / 기타합계", () => {
		const rows = [
			{
				nonBenefitMeal: "1000",
				nonBenefitSnack: "200",
				outpatientFee: "10",
				contractedMedical: "20",
				contractedPrescription: "30",
				otherCostsRecipient: "40",
			},
			{
				nonBenefitMeal: "100",
				nonBenefitSnack: "50",
				outpatientFee: "1",
				contractedMedical: "2",
				contractedPrescription: "3",
				otherCostsRecipient: "4",
			},
		];
		assert.equal(U.rowMealTotal(rows[0]), 1200);
		assert.equal(U.rowOtherTotal(rows[0]), 100);
		assert.equal(U.sumMealTotal(rows), 1350);
		assert.equal(U.sumOtherTotal(rows), 110);
		assert.match(U.formatWon(1350), /1,350원/);
	});

	it("f40100ToStatementRow 기본 매핑", () => {
		const row = U.f40100ToStatementRow({
			PNUM: " 100 ",
			P_NM: "홍길동",
			P_BRDT: "19500101",
			P_GRD: "3",
			P_YYNO: "YY1",
			SAL1: 1000,
			SAL2: 200,
			BSAL1: 0,
			BSAL2: 0,
			BSAL3: 0,
			BSAL4: 0,
			BSAL6: 0,
			BSAL7: 0,
			BSAL8: 0,
			BSAL9: 0,
			ESAL: 0,
			S_GU: "2",
			SNM: "전달자",
			ENM: "수령자",
			RDES: "내용",
		});
		assert.equal(row.pnum, "100");
		assert.equal(row.recipient, "홍길동");
		assert.equal(row.birthday, "1950-01-01");
		assert.equal(row.nhaContribution, "1000");
		assert.equal(row.recipientContribution, "200");
		assert.equal(row.sGu, "2");
	});

	it("훅은 Utils를 import하고 로컬 유틸 정의를 두지 않음", () => {
		const hook = fs.readFileSync(HOOK_TS, "utf8");
		assert.match(hook, /from "\.\/MonthlySalaryStatementUtils"/);
		assert.doesNotMatch(hook, /function num\(/);
		assert.doesNotMatch(hook, /function payYearMonthToSalmm\(/);
		assert.doesNotMatch(hook, /function f40100ToStatementRow\(/);
		assert.doesNotMatch(hook, /function getPreviousYearMonthInput\(/);
		assert.match(hook, /export \{ TABS, TAB_TITLES \}/);
	});
});
