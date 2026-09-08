/**
 * @file 병실조정료 — 급여계산 후에도 해당 월 저장값 유지
 *
 * @description
 * Usp_P40100이 F40100.BSAL7(V40100 병실조정료)을 0으로 덮습니다.
 * 계산 전 DB·화면 값을 합쳐 두고, 계산·식대보정 후 같은 ANCD+SALMM+PNUM에 되돌립니다.
 */

const sql = require('mssql');

/** Usp_P40100 전체계산 시 넘기는 수급자번호 */
const ALL_PNUM = 9999999;

/** CASE 배치 파라미터 한도(mssql 2100)를 피하기 위한 크기 */
const RESTORE_BATCH_SIZE = 100;

function isAllPnum(pnum) {
	return pnum == null || Number(pnum) === ALL_PNUM;
}

function parseIntOrNull(v) {
	const n = parseInt(String(v ?? '').replace(/,/g, '').trim(), 10);
	return Number.isFinite(n) ? n : null;
}

function normalizeSnapshotRow(r) {
	const pnum = String(r?.PNUM ?? r?.pnum ?? '').trim();
	const n = parseIntOrNull(r?.BSAL7 ?? r?.bsal7 ?? 0);
	return {
		pnum,
		bsal7: n == null ? 0 : n,
	};
}

function normalizeSnapshot(rows) {
	return (Array.isArray(rows) ? rows : [])
		.map(normalizeSnapshotRow)
		.filter((r) => r.pnum !== '');
}

/** DB 스냅샷을 기본으로 하고, 화면에서 보낸 값으로 덮습니다. */
function mergeRoomAdjustSnapshots(dbRows, clientRows) {
	const map = new Map();
	for (const r of normalizeSnapshot(dbRows)) map.set(r.pnum, r.bsal7);
	for (const r of normalizeSnapshot(clientRows)) map.set(r.pnum, r.bsal7);
	return Array.from(map.entries()).map(([pnum, bsal7]) => ({ pnum, bsal7 }));
}

function bindAncdSalmm(req, ancd, salmm) {
	const ancdNum = parseIntOrNull(ancd);
	if (ancdNum != null) {
		req.input('ANCD', sql.Int, ancdNum);
	} else {
		req.input('ANCD', sql.VarChar(30), String(ancd ?? '').trim());
	}
	req.input('SALMM', sql.Char(6), String(salmm));
}

/**
 * 급여계산 전 해당 월 병실조정료(BSAL7) 스냅샷
 * GET /api/f40100 과 동일한 ANCD·SALMM 조건
 * @returns {Promise<Array<{pnum: string, bsal7: number}>>}
 */
async function snapshotRoomAdjustFees(pool, ancd, salmm, pnum) {
	if (!pool || ancd == null || !salmm) return [];

	const all = isAllPnum(pnum);
	const req = pool.request();
	bindAncdSalmm(req, ancd, salmm);
	let pnumFilter = '';
	if (!all) {
		const pnumNum = parseIntOrNull(pnum);
		if (pnumNum == null) return [];
		req.input('PNUM', sql.Int, pnumNum);
		pnumFilter = 'AND [PNUM] = @PNUM';
	}

	const result = await req.query(`
		SELECT CAST([PNUM] AS VARCHAR(30)) AS PNUM, ISNULL([BSAL7], 0) AS BSAL7
		FROM [돌봄시설DB].[dbo].[F40100]
		WHERE [ANCD] = @ANCD
		  AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@SALMM))
		  ${pnumFilter}
	`);

	return normalizeSnapshot(result.recordset);
}

async function restoreRoomAdjustBatch(pool, ancd, salmm, batch) {
	const req = pool.request();
	bindAncdSalmm(req, ancd, salmm);
	const whenClauses = [];
	const inParams = [];
	batch.forEach((row, i) => {
		const pnumNum = parseIntOrNull(row.pnum);
		if (pnumNum == null) return;
		req.input(`p${i}`, sql.Int, pnumNum);
		req.input(`b${i}`, sql.Int, row.bsal7);
		whenClauses.push(`WHEN @p${i} THEN @b${i}`);
		inParams.push(`@p${i}`);
	});
	if (whenClauses.length === 0) return 0;

	const result = await req.query(`
		UPDATE [돌봄시설DB].[dbo].[F40100]
		SET [BSAL7] = CASE [PNUM]
			${whenClauses.join('\n\t\t\t')}
			ELSE [BSAL7]
		END
		WHERE [ANCD] = @ANCD
		  AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@SALMM))
		  AND [PNUM] IN (${inParams.join(', ')})
	`);
	return result.rowsAffected?.[0] ?? 0;
}

/**
 * 급여계산 후 스냅샷한 병실조정료를 해당 월 행에 복원
 */
async function restoreRoomAdjustFees(pool, ancd, salmm, snapshot) {
	const rows = normalizeSnapshot(snapshot);
	if (!pool || ancd == null || !salmm || rows.length === 0) {
		return { ok: true, restored: 0 };
	}

	let restored = 0;
	for (let i = 0; i < rows.length; i += RESTORE_BATCH_SIZE) {
		restored += await restoreRoomAdjustBatch(
			pool,
			ancd,
			salmm,
			rows.slice(i, i + RESTORE_BATCH_SIZE)
		);
	}

	return { ok: true, restored };
}

module.exports = {
	ALL_PNUM,
	RESTORE_BATCH_SIZE,
	isAllPnum,
	normalizeSnapshot,
	normalizeSnapshotRow,
	mergeRoomAdjustSnapshots,
	snapshotRoomAdjustFees,
	restoreRoomAdjustFees,
};
