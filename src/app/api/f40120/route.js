import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

/** 급여수금 F40120 — 동일 수급자·일자라도 DOC(출납번호)로 행 구분 */
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
	let y;
	let m;
	let d;
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
		y = Number(s.slice(0, 4));
		m = Number(s.slice(5, 7));
		d = Number(s.slice(8, 10));
	} else if (/^\d{8}$/.test(s)) {
		y = Number(s.slice(0, 4));
		m = Number(s.slice(4, 6));
		d = Number(s.slice(6, 8));
	} else {
		return null;
	}
	if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
	// UTC 자정으로 만들어 mssql Date 바인딩 시 전날로 밀리는 타임존 이슈 방지
	return new Date(Date.UTC(y, m - 1, d));
}

function parseDoc(v) {
	if (v == null || v === '') return null;
	const n = parseInt(String(v).replace(/,/g, ''), 10);
	return Number.isFinite(n) ? n : null;
}

async function nextDocNumber(pool, ancd) {
	const rq = pool.request();
	rq.input('ANCD', sql.VarChar(30), String(ancd));
	const result = await rq.query(`
    SELECT ISNULL(MAX([DOC]), 0) + 1 AS NextDoc
    FROM ${TABLE}
    WHERE CAST([ANCD] AS VARCHAR(30)) = @ANCD
  `);
	const n = result.recordset?.[0]?.NextDoc;
	return Number.isFinite(Number(n)) ? Number(n) : 1;
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
 *   SAL2 = 수급자부담금합 (SAL2 + BSAL1~4,6~9 + ESAL, MonthlySalaryData와 동일)
 * - details: 해당 월 F40120 일자별 수금 + F10010/F40100 조인 (수급자부담금합·이름)
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
        (
          ISNULL(h.[SAL2],0) + ISNULL(h.[BSAL1],0) + ISNULL(h.[BSAL2],0) + ISNULL(h.[BSAL3],0) + ISNULL(h.[BSAL4],0) +
          ISNULL(h.[BSAL6],0) + ISNULL(h.[BSAL7],0) + ISNULL(h.[BSAL8],0) + ISNULL(h.[BSAL9],0) + ISNULL(h.[ESAL],0)
        ) AS SAL2,
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
      GROUP BY
        h.[PNUM],
        h.[SAL2], h.[BSAL1], h.[BSAL2], h.[BSAL3], h.[BSAL4],
        h.[BSAL6], h.[BSAL7], h.[BSAL8], h.[BSAL9], h.[ESAL]
      ORDER BY MAX(COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N''))
    `;

		const detailsSql = `
      SELECT
        f.[ANCD], f.[SALMM], f.[PNUM], f.[INSDT], f.[HAMT], f.[CAMT], f.[YAMT], f.[ETC], f.[INDT], f.[DOC],
        COALESCE(NULLIF(LTRIM(RTRIM(f10.[P_NM])), N''), NULLIF(LTRIM(RTRIM(h.[P_NM])), N''), N'') AS P_NM,
        COALESCE(f10.[P_ST], h.[P_ST]) AS P_ST,
        (
          ISNULL(h.[SAL2],0) + ISNULL(h.[BSAL1],0) + ISNULL(h.[BSAL2],0) + ISNULL(h.[BSAL3],0) + ISNULL(h.[BSAL4],0) +
          ISNULL(h.[BSAL6],0) + ISNULL(h.[BSAL7],0) + ISNULL(h.[BSAL8],0) + ISNULL(h.[BSAL9],0) + ISNULL(h.[ESAL],0)
        ) AS SAL2
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

/** POST { row, mode?: 'create'|'update' }
 * - create: INSERT + DOC 자동채번 (동일 수급자·일자는 불가)
 * - update: ANCD+PNUM+DOC 기준 UPDATE
 */
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

		const pnum = String(row.PNUM).trim();
		const modeRaw = String(body?.mode || '').trim().toLowerCase();
		let doc = parseDoc(row.DOC);
		// DOC 없으면 create, DOC 있으면 update (명시 mode가 우선)
		const mode =
			modeRaw === 'create' || modeRaw === 'update'
				? modeRaw
				: doc == null
					? 'create'
					: 'update';

		if (mode === 'create') {
			const dupRq = pool.request();
			dupRq.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
			dupRq.input('SALMM', sql.Char(6), salmm);
			dupRq.input('PNUM', sql.VarChar(30), pnum);
			dupRq.input('INSDT', sql.Date, insdt);
			const dupResult = await dupRq.query(`
        SELECT TOP 1 1 AS ExistsRow
        FROM ${TABLE}
        WHERE CAST([ANCD] AS VARCHAR(30)) = @ANCD
          AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@SALMM))
          AND CAST([PNUM] AS VARCHAR(30)) = @PNUM
          AND CAST([INSDT] AS DATE) = CAST(@INSDT AS DATE)
      `);
			if ((dupResult.recordset?.length ?? 0) > 0) {
				return new Response(
					JSON.stringify({
						success: false,
						error:
							'하루에 두 개의 수금 내역을 등록하는 것은 불가능 합니다. 기존 수금 내역을 수정해주세요',
					}),
					{ status: 409, headers: { 'Content-Type': 'application/json' } }
				);
			}

			doc = await nextDocNumber(pool, gate.sessionAncd);

			const request = pool.request();
			request.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
			request.input('SALMM', sql.Char(6), salmm);
			request.input('PNUM', sql.VarChar(30), pnum);
			request.input('INSDT', sql.Date, insdt);
			bindDataInputs(request, {
				HAMT: row.HAMT ?? 0,
				CAMT: row.CAMT ?? 0,
				YAMT: row.YAMT ?? 0,
				ETC: row.ETC ?? null,
				DOC: doc,
			});

			await request.query(`
        INSERT INTO ${TABLE}
          ([ANCD], [SALMM], [PNUM], [INSDT], [INDT], [HAMT], [CAMT], [YAMT], [ETC], [DOC])
        VALUES
          (@ANCD, @SALMM, @PNUM, @INSDT, GETDATE(), @HAMT, @CAMT, @YAMT, @ETC, @DOC)
      `);

			return new Response(JSON.stringify({ success: true, mode: 'create', DOC: doc }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (doc == null) {
			return new Response(
				JSON.stringify({ success: false, error: '수정 시 출납번호(DOC)가 필요합니다.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const request = pool.request();
		request.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
		request.input('SALMM', sql.Char(6), salmm);
		request.input('PNUM', sql.VarChar(30), pnum);
		request.input('INSDT', sql.Date, insdt);
		bindDataInputs(request, {
			HAMT: row.HAMT ?? 0,
			CAMT: row.CAMT ?? 0,
			YAMT: row.YAMT ?? 0,
			ETC: row.ETC ?? null,
			DOC: doc,
		});

		const result = await request.query(`
      UPDATE ${TABLE}
      SET
        [HAMT] = @HAMT,
        [CAMT] = @CAMT,
        [YAMT] = @YAMT,
        [ETC] = @ETC,
        [INSDT] = @INSDT,
        [SALMM] = @SALMM
      WHERE CAST([ANCD] AS VARCHAR(30)) = @ANCD
        AND CAST([PNUM] AS VARCHAR(30)) = @PNUM
        AND [DOC] = @DOC
    `);

		const affected = result.rowsAffected?.[0] ?? 0;
		if (affected === 0) {
			return new Response(
				JSON.stringify({ success: false, error: '수정할 수금 데이터를 찾지 못했습니다. (출납번호 확인)' }),
				{ status: 404, headers: { 'Content-Type': 'application/json' } }
			);
		}

		return new Response(JSON.stringify({ success: true, mode: 'update', DOC: doc }), {
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

/** DELETE ?salmm=&pnum=&insdt=YYYY-MM-DD&doc= */
export async function DELETE(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const sp = req.nextUrl.searchParams;
		const salmm = normalizeSalmm(sp.get('salmm'));
		const pnum = sp.get('pnum');
		const insdt = parseInsdT(sp.get('insdt'));
		const doc = parseDoc(sp.get('doc'));

		if (!salmm || !pnum || !insdt) {
			return new Response(JSON.stringify({ success: false, error: 'salmm, pnum, insdt가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (doc == null) {
			return new Response(JSON.stringify({ success: false, error: 'doc(출납번호)가 필요합니다.' }), {
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
		request.input('DOC', sql.Int, doc);

		const result = await request.query(`
      DELETE FROM ${TABLE}
      WHERE CAST([ANCD] AS VARCHAR(30)) = @ANCD
        AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@SALMM))
        AND CAST([PNUM] AS VARCHAR(30)) = @PNUM
        AND CAST([INSDT] AS DATE) = CAST(@INSDT AS DATE)
        AND [DOC] = @DOC
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
