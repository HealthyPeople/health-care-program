/**
 * @file 월 급여명세서 — 인쇄 헬퍼 (MonthlySalaryStatementPrint.test.js)
 *
 * @description
 * 요양원 월 급여명세서 기능의 인쇄 헬퍼입니다. 폴더: component/nursing-home/pages/monthly-salary-statement
 *
 * @module component/nursing-home/pages/monthly-salary-statement/MonthlySalaryStatementPrint.test
 */
/**
 * MonthlySalaryStatementPrint — 인쇄 HTML 빌더 export·배선 최소 검증
 * (비즈니스 로직/금액 계산 테스트 아님)
 */
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const DIR = __dirname;
const PRINT_TS = path.join(DIR, "MonthlySalaryStatementPrint.ts");
const PARENT_TSX = path.join(DIR, "MonthlySalaryStatement.tsx");

function loadPrint() {
	const source = fs.readFileSync(PRINT_TS, "utf8");
	const { outputText } = ts.transpileModule(source, {
		fileName: "MonthlySalaryStatementPrint.ts",
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2019,
			esModuleInterop: true,
		},
	});
	const outFile = path.join(DIR, `.MonthlySalaryStatementPrint.compiled.${process.pid}.cjs`);
	fs.writeFileSync(outFile, outputText, "utf8");
	try {
		delete require.cache[require.resolve(outFile)];
		return require(outFile);
	} finally {
		try {
			fs.unlinkSync(outFile);
		} catch {
			/* ignore */
		}
	}
}

describe("MonthlySalaryStatementPrint — builders", () => {
	let Print;

	before(() => {
		Print = loadPrint();
	});

	it("공개 API export", () => {
		assert.equal(typeof Print.openPrintPreviewWindow, "function");
		assert.equal(typeof Print.buildSalaryOccurrencePrintHtml, "function");
		assert.equal(typeof Print.buildStatementLedgerPrintHtml, "function");
		assert.equal(typeof Print.wrapF24PrintHtml, "function");
		assert.equal(typeof Print.buildBenefitStatement24Body, "function");
		assert.equal(typeof Print.statementRowToV40100EFallback, "function");
		assert.equal(typeof Print.buildPaymentConfirmation25PrintHtml, "function");
		assert.equal(typeof Print.statementRowToV40100GFallback, "function");
		assert.equal(typeof Print.lastDayOfPayYearMonth, "function");
		assert.equal(typeof Print.normalizeSGu, "function");
	});

	it("발생내역서 HTML에 기간·테이블 포함", () => {
		const html = Print.buildSalaryOccurrencePrintHtml("2024-06", []);
		assert.match(html, /수급자급여 발생내역서/);
		assert.match(html, /\(2024-06월분\)/);
		assert.match(html, /<!DOCTYPE html>/i);
	});

	it("발부대장 HTML에 폼 반영", () => {
		const html = Print.buildStatementLedgerPrintHtml(
			"2024-06",
			[],
			{
				deliveryMethod: "2",
				deliverer: "너싱홈 해원",
				recipientName: "보호자",
				receiveContent: "급여비용명세서",
			},
			"2024-06-30"
		);
		assert.match(html, /명세서 발부대장/);
		assert.match(html, /발행일자/);
	});

	it("훅: Print import + fetch 핸들러 유지", () => {
		const hook = fs.readFileSync(path.join(DIR, "useMonthlySalaryStatement.ts"), "utf8");
		assert.match(hook, /from "\.\/MonthlySalaryStatementPrint"/);
		assert.match(hook, /const printOccurrence = useCallback/);
		assert.match(hook, /const printLedger = useCallback/);
		assert.match(hook, /const printBenefitStatement = useCallback/);
		assert.match(hook, /const printPaymentConfirmation = useCallback/);
		assert.match(hook, /\/api\/v40100\?/);
		assert.match(hook, /\/api\/v40100d\?/);
		assert.match(hook, /\/api\/v40100e\?/);
		assert.match(hook, /\/api\/v40100g\?/);
		assert.match(hook, /buildBenefitStatement24Body\(payYearMonth, row, facilityInfo\)/);
		assert.match(hook, /facilityRow\.ETC/);
		assert.doesNotMatch(hook, /function openPrintPreviewWindow/);
		assert.doesNotMatch(hook, /function buildSalaryOccurrencePrintHtml/);
		assert.doesNotMatch(hook, /function wrapF24PrintHtml/);
	});

	it("급여명세서 하단 기관명은 로그인 기관을 쓰고 해원 하드코딩을 쓰지 않는다", () => {
		const html = Print.buildBenefitStatement24Body(
			"2026-08",
			{
				PNUM: "47",
				SALMM: "202608",
				recipient: "김도순",
				recognitionNo: "L000",
				periodFrom: "2026-08-01",
				periodTo: "2026-08-31",
				orgCode: "14161000067",
				orgName: "너싱홈해원",
				orgAddr: "경기도 광주시",
				orgBizNo: "126-90-05254",
				orgOwner: "권영기",
				orgTel: "",
				bankAccount: "기업은행:210-105122-01-015 예금주:너싱홈 해원",
				otherCostDesc: "",
				daysUsed: 31,
				nhaContribution: 0,
				recipientContribution: 0,
				mealFee: 0,
				nonBenefitSnack: 0,
				nonBenefitMedical: 0,
				beautyCost: 0,
				roomUpgradeFee: 0,
				contractedMedical: 0,
				contractedPrescription: 0,
				otherCost: 0,
			},
			{ name: "너싱홈 로아", code: "182020CODE", representative: "로아대표", bankAccount: "기업은행:110-123-456 예금주:너싱홈 로아" }
		);
		assert.match(html, /장기요양기관명 : 너싱홈 로아/);
		assert.match(html, /대표자명 : 로아대표/);
		assert.match(html, /입금통장정보 : 기업은행:110-123-456 예금주:너싱홈 로아/);
		assert.doesNotMatch(html, /너싱홈\s*해원/);
	});
});
