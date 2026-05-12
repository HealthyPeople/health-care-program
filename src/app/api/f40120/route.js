import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

/** 급여수금 F40120 — ANCD, SALMM, PNUM, INSDT 복합키 */
const TABLE = '[돌봄시설DB].[dbo].[F40120]';
const F10010 = '[돌봄시설DB].[dbo].[F10010]';
const F40100 = '[돌봄시설DB].[dbo].[F40100]';

const DATA_COLUMNS = ['HAMT', 'CAMT', 'YAMT', 'ETC', 'DOC'];

function normalizeSalmm(v) {
	if (v == null || v === '') return null;
	const s = String(v).replace(/\D/g, '');
	if (s.length === 6) return s;
	if (s.length === 7 && String(v).includes('-')) {
		const p = String(v).split('-');
		if (p[0].length === 4 && p[1].length === 2) return `${p[0]}${p[1].padStart(2, '0')}`;
	}
	return null;
}

function parseInsdT(v) {
	if (v == null || v === '') return null;
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
		return new Date(`${s.slice(0, 10)}T00:00:00`);
	}
	if (/^\d{8}$/.test(s)) {
		return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`);
	}
	return null;
}

function bindDataInputs(request, row) {
	for (const col of DATA_COLUMNS) {
		const v = row[col];
		if (['HAMT', 'CAMT', 'YAMT', 'DOC'].includes(col)) {
			if (v == null || v === '') {
				request.input(col, sql.Int, col === 'DOC' ? null : 0);
			} else {
				const n = parseInt(String(v).replace(/,/g, ''), 10);
				request.input(col, sql.Int, Number.isFinite(n) ? n : col === 'DOC' ? null : 0);
			}
			continue;
		}
		if (col === 'ETC') {
			request.input(col, sql.VarChar(100), v == null || v === '' ? null : String(v).slice(0, 100));
		}
	}
}

/**
 * GET ?salmm=YYYYMM[&name=]
 * - summary: F40100 급여HEAD 기준 수급자 목록 + F10010 이름/상태 + F40120 수금 합계
 * - details: 해당 월 F40120 일자별 수금 + F10010/F40100 조인 (SAL2·이름)
 * (F40100과 동일하게 ANCD는 @sessionAncd 직접 비교)
 */
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const salmmRaw = sp.get('salmm');
		const nameMask = sp.get('name') != null ? String(sp.get('name')).trim() : '';
		const ancd = sp.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const salmm = normalizeSalmm(salmmRaw);
		if (!salmm) {
			return new Response(JSON.stringify({ success: false, error: 'salmm(YYYYMM)이 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		/** 본인부담금수납대장 출력 — F40120 + F40100 + F10010 (행 = 수금 1건) */
		if (String(sp.get('print') || '').trim() === 'selfContribution') {
			const ledgerSql = `
      SELECT
        f.[INSDT],
        f.[PNUM],
        f.[HAMT], f.[CAMT], f.[YAMT],
        f.[ETC],
        COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N'') AS P_NM,
        h.[USRGU],
        h.[USRPER],
        h.[SAL2],
        (
          ISNULL(h.[BSAL1],0) + ISNULL(h.[BSAL2],0) + ISNULL(h.[BSAL3],0) + ISNULL(h.[BSAL4],0) +
          ISNULL(h.[BSAL6],0) + ISNULL(h.[BSAL7],0) + ISNULL(h.[BSAL8],0) + ISNULL(h.[BSAL9],0) + ISNULL(h.[ESAL],0)
        ) AS NonBenefitTotal
      FROM ${TABLE} f
      LEFT JOIN ${F40100} h
        ON f.[ANCD] = h.[ANCD]
       AND LTRIM(RTRIM(f.[SALMM])) = LTRIM(RTRIM(h.[SALMM]))
       AND f.[PNUM] = h.[PNUM]
      LEFT JOIN ${F10010} f10
        ON f.[ANCD] = f10.[ANCD] AND f.[PNUM] = f10.[PNUM]
      WHERE f.[ANCD] = @sessionAncd
        AND LTRIM(RTRIM(f.[SALMM])) = LTRIM(RTRIM(@salmm))
      ORDER BY f.[INSDT], P_NM, f.[PNUM]
    `;
			const rq = pool.request();
			rq.input('sessionAncd', gate.sessionAncd);
			rq.input('salmm', sql.Char(6), salmm);
			const ledgerResult = await rq.query(ledgerSql);
			const ledger = ledgerResult.recordset || [];
			return new Response(
				JSON.stringify({ success: true, salmm, ledger, count: ledger.length }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const summarySql = `
      SELECT
        h.[PNUM],
        h.[SAL2],
        MAX(COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N'')) AS P_NM,
        MAX(COALESCE(f10.[P_ST], h.[P_ST])) AS P_ST,
        ISNULL(SUM(f.[HAMT]), 0) AS SumHAMT,
        ISNULL(SUM(f.[CAMT]), 0) AS SumCAMT,
        ISNULL(SUM(f.[YAMT]), 0) AS SumYAMT
      FROM ${F40100} h
      LEFT JOIN ${F10010} f10
        ON h.[ANCD] = f10.[ANCD] AND h.[PNUM] = f10.[PNUM]
      LEFT JOIN ${TABLE} f
        ON h.[ANCD] = f.[ANCD]
       AND LTRIM(RTRIM(h.[SALMM])) = LTRIM(RTRIM(f.[SALMM]))
       AND h.[PNUM] = f.[PNUM]
      WHERE h.[ANCD] = @sessionAncd
        AND LTRIM(RTRIM(h.[SALMM])) = LTRIM(RTRIM(@salmm))
        AND (
          @nameMask = N''
          OR ISNULL(f10.[P_NM], N'') LIKE N'%' + @nameMask + N'%'
          OR ISNULL(h.[P_NM], N'') LIKE N'%' + @nameMask + N'%'
        )
      GROUP BY h.[PNUM], h.[SAL2]
      ORDER BY MAX(COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N''))
    `;

		const detailsSql = `
      SELECT
        f.[ANCD], f.[SALMM], f.[PNUM], f.[INSDT], f.[HAMT], f.[CAMT], f.[YAMT], f.[ETC], f.[INDT], f.[DOC],
        COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N'') AS P_NM,
        COALESCE(f10.[P_ST], h.[P_ST]) AS P_ST,
        h.[SAL2]
      FROM ${TABLE} f
      LEFT JOIN ${F40100} h
        ON f.[ANCD] = h.[ANCD]
       AND LTRIM(RTRIM(f.[SALMM])) = LTRIM(RTRIM(h.[SALMM]))
       AND f.[PNUM] = h.[PNUM]
      LEFT JOIN ${F10010} f10
        ON f.[ANCD] = f10.[ANCD] AND f.[PNUM] = f10.[PNUM]
      WHERE f.[ANCD] = @sessionAncd
        AND LTRIM(RTRIM(f.[SALMM])) = LTRIM(RTRIM(@salmm))
      ORDER BY COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N''), f.[INSDT] DESC
    `;

		const rq1 = pool.request();
		rq1.input('sessionAncd', gate.sessionAncd);
		rq1.input('salmm', sql.Char(6), salmm);
		rq1.input('nameMask', sql.NVarChar(100), nameMask);
		const summaryResult = await rq1.query(summarySql);

		const rq2 = pool.request();
		rq2.input('sessionAncd', gate.sessionAncd);
		rq2.input('salmm', sql.Char(6), salmm);
		const detailsResult = await rq2.query(detailsSql);

		const summary = summaryResult.recordset || [];
		const details = detailsResult.recordset || [];

		return new Response(
			JSON.stringify({
				success: true,
				salmm,
				summary,
				details,
				data: details,
				count: { summary: summary.length, details: details.length },
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F40120 GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/** POST { row } — MERGE (ANCD, SALMM, PNUM, INSDT) */
export async function POST(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const body = await req.json();
		const row = body?.row;
		if (!row || typeof row !== 'object') {
			return new Response(JSON.stringify({ success: false, error: 'row 객체가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const salmm = normalizeSalmm(row.SALMM);
		const insdt = parseInsdT(row.INSDT);
		if (!salmm || !row.PNUM || !insdt) {
			return new Response(JSON.stringify({ success: false, error: 'SALMM, PNUM, INSDT(수금일자)가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const merged = {
			...row,
			ANCD: gate.sessionAncd,
			SALMM: salmm,
			HAMT: row.HAMT ?? 0,
			CAMT: row.CAMT ?? 0,
			YAMT: row.YAMT ?? 0,
			ETC: row.ETC ?? null,
			DOC: row.DOC ?? null,
		};

		const request = pool.request();
		request.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
		request.input('SALMM', sql.Char(6), salmm);
		request.input('PNUM', sql.VarChar(30), String(row.PNUM).trim());
		request.input('INSDT', sql.Date, insdt);

		bindDataInputs(request, merged);

		const updateSet = DATA_COLUMNS.map((c) => `[${c}] = @${c}`).join(', ');
		const insertCols = ['[ANCD]', '[SALMM]', '[PNUM]', '[INSDT]', '[INDT]', ...DATA_COLUMNS.map((c) => `[${c}]`)];
		const insertParams = ['@ANCD', '@SALMM', '@PNUM', '@INSDT', 'GETDATE()', ...DATA_COLUMNS.map((c) => `@${c}`)];

		const mergeSql = `
      MERGE ${TABLE} AS t
      USING (SELECT @ANCD AS ANCD, @SALMM AS SALMM, @PNUM AS PNUM, @INSDT AS INSDT) AS s
      ON CAST(t.[ANCD] AS VARCHAR(30)) = CAST(s.ANCD AS VARCHAR(30))
         AND LTRIM(RTRIM(t.[SALMM])) = LTRIM(RTRIM(s.SALMM))
         AND CAST(t.[PNUM] AS VARCHAR(30)) = CAST(s.PNUM AS VARCHAR(30))
         AND CAST(t.[INSDT] AS DATE) = CAST(s.INSDT AS DATE)
      WHEN MATCHED THEN
        UPDATE SET ${updateSet}
      WHEN NOT MATCHED THEN
        INSERT (${insertCols.join(', ')})
        VALUES (${insertParams.join(', ')});
    `;

		await request.query(mergeSql);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F40120 POST 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/** DELETE ?salmm=&pnum=&insdt=YYYY-MM-DD */
export async function DELETE(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const sp = req.nextUrl.searchParams;
		const salmm = normalizeSalmm(sp.get('salmm'));
		const pnum = sp.get('pnum');
		const insdt = parseInsdT(sp.get('insdt'));

		if (!salmm || !pnum || !insdt) {
			return new Response(JSON.stringify({ success: false, error: 'salmm, pnum, insdt가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const request = pool.request();
		request.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
		request.input('SALMM', sql.Char(6), salmm);
		request.input('PNUM', sql.VarChar(30), String(pnum).trim());
		request.input('INSDT', sql.Date, insdt);

		const result = await request.query(`
      DELETE FROM ${TABLE}
      WHERE [ANCD] = @ANCD
        AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@SALMM))
        AND CAST([PNUM] AS VARCHAR(30)) = @PNUM
        AND CAST([INSDT] AS DATE) = CAST(@INSDT AS DATE)
    `);

		return new Response(
			JSON.stringify({ success: true, rowsAffected: result.rowsAffected?.[0] ?? 0 }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F40120 DELETE 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
