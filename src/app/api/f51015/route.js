import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F51015]';

/** MERGE에 포함할 컬럼(키 ANCD,PNUM,RQDT 및 INDT 제외) */
const DATA_COLUMNS = ['RQEMP', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E16', 'E17', 'E18', 'E19', 'E20', 'E21', 'E22', 'E23', 'E24', 'E25', 'E26', 'E27', 'E28', 'E29', 'E30', 'E80', 'E81', 'E90', 'E91', 'E99'];

function normalizeYmd(v) {
	if (v == null || v === '') return null;
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return null;
}

function serializeRow(row) {
	if (!row || typeof row !== 'object') return null;
	const out = {};
	for (const [k, v] of Object.entries(row)) {
		if (v == null) {
			out[k] = null;
		} else if (v instanceof Date) {
			const y = v.getUTCFullYear();
			const m = String(v.getUTCMonth() + 1).padStart(2, '0');
			const d = String(v.getUTCDate()).padStart(2, '0');
			const key = String(k).toUpperCase();
			const dateOnlyMid =
				v.getUTCHours() === 0 &&
				v.getUTCMinutes() === 0 &&
				v.getUTCSeconds() === 0 &&
				v.getUTCMilliseconds() === 0;
			// RQDT 등 DATE 컬럼은 yyyy-mm-dd만 (toISOString 사용 시 TZ로 하루 밀림)
			if (key === 'RQDT' || dateOnlyMid) {
				out[k] = `${y}-${m}-${d}`;
			} else {
				out[k] = v.toISOString();
			}
		} else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
			out[k] = v.toString('utf8');
		} else if (typeof v === 'number') {
			out[k] = Number.isInteger(v) ? String(v) : String(v);
		} else {
			out[k] = v;
		}
	}
	return out;
}

function bindDataInputs(request, row) {
	for (const col of DATA_COLUMNS) {
		const v = row[col];
		if (col === 'RQEMP' || col === 'E80') {
			if (v == null || v === '') {
				request.input(col, sql.Int, null);
			} else {
				const n = parseInt(String(v), 10);
				request.input(col, sql.Int, Number.isFinite(n) ? n : null);
			}
			continue;
		}
		if (col === 'E81' || col === 'E90') {
			request.input(col, sql.NVarChar(sql.MAX), v == null || v === '' ? null : String(v));
			continue;
		}
		// E01~E30, E91, E99 : char(1)
		if (v == null || v === '') {
			request.input(col, sql.Char(1), null);
		} else {
			request.input(col, sql.Char(1), String(v).trim().slice(0, 1));
		}
	}
}

// GET ?pnum= — RQDT 목록
// GET ?pnum=&rqdt=yyyy-mm-dd — 단건
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const pnum = sp.get('pnum');
		const rqdt = sp.get('rqdt');
		const ancd = sp.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		if (!pnum || String(pnum).trim() === '') {
			return new Response(JSON.stringify({ success: false, error: 'pnum이 필요합니다.' }), {
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
		request.input('sessionAncd', gate.sessionAncd);
		request.input('pnum', sql.VarChar(30), String(pnum).trim());

		if (rqdt) {
			const ymd = normalizeYmd(rqdt);
			if (!ymd) {
				return new Response(JSON.stringify({ success: false, error: 'rqdt(yyyy-mm-dd) 형식이 올바르지 않습니다.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('rqdt', sql.VarChar(10), ymd);
			const result = await request.query(`
        SELECT TOP 1
          CONVERT(varchar(10), CAST(t.[RQDT] AS DATE), 23) AS RQDT,
          t.[ANCD], t.[PNUM], t.[RQEMP], t.[INDT],
          t.[E01], t.[E02], t.[E03], t.[E04], t.[E05], t.[E06], t.[E07], t.[E08], t.[E09], t.[E10], t.[E11], t.[E12], t.[E13], t.[E14], t.[E15], t.[E16], t.[E17], t.[E18], t.[E19], t.[E20], t.[E21], t.[E22], t.[E23], t.[E24], t.[E25], t.[E26], t.[E27], t.[E28], t.[E29], t.[E30],
          t.[E80], t.[E81], t.[E90], t.[E91], t.[E99],
          e.[EMPNM] AS RQEMP_NM
        FROM ${TABLE} t
        LEFT JOIN [돌봄시설DB].[dbo].[F01010] e
          ON t.[ANCD] = e.[ANCD]
          AND t.[RQEMP] = e.[EMPNO]
        WHERE t.[ANCD] = @sessionAncd
          AND CAST(t.[PNUM] AS VARCHAR(30)) = @pnum
          AND CONVERT(varchar(10), CAST(t.[RQDT] AS DATE), 23) = @rqdt
      `);
			const row = serializeRow(result.recordset?.[0] || null);
			return new Response(JSON.stringify({ success: true, data: row }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const result = await request.query(`
      SELECT DISTINCT CONVERT(varchar(10), CAST([RQDT] AS DATE), 23) AS rqdt
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND CAST([PNUM] AS VARCHAR(30)) = @pnum
      ORDER BY rqdt DESC
    `);
		const dates = (result.recordset || []).map((r) => r.rqdt || r.RQDT).filter(Boolean);
		return new Response(JSON.stringify({ success: true, data: dates, count: dates.length }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store, no-cache, must-revalidate',
			},
		});
	} catch (err) {
		console.error('F51015 GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

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

		const ymd = normalizeYmd(row.RQDT);
		if (!ymd) {
			return new Response(JSON.stringify({ success: false, error: 'RQDT(검사일자)가 필요합니다.' }), {
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
		request.input('PNUM', sql.VarChar(30), String(row.PNUM ?? '').trim());
		// Date 객체 바인딩 시 TZ로 하루 밀림 → yyyy-mm-dd 문자열 + CAST 사용
		request.input('RQDT', sql.VarChar(10), ymd);

		const merged = { ...row, ANCD: gate.sessionAncd, RQDT: ymd };
		bindDataInputs(request, merged);

		const updateSet = DATA_COLUMNS.map((c) => `[${c}] = @${c}`).join(', ');
		const insertCols = ['[ANCD]', '[PNUM]', '[RQDT]', '[INDT]', ...DATA_COLUMNS.map((c) => `[${c}]`)];
		const insertParams = ['@ANCD', '@PNUM', 'CAST(@RQDT AS DATE)', 'GETDATE()', ...DATA_COLUMNS.map((c) => `@${c}`)];

		const mergeSql = `
      MERGE ${TABLE} AS t
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CAST(@RQDT AS DATE) AS RQDT) AS s
      ON CAST(t.[ANCD] AS VARCHAR(30)) = CAST(s.ANCD AS VARCHAR(30))
         AND CAST(t.[PNUM] AS VARCHAR(30)) = CAST(s.PNUM AS VARCHAR(30))
         AND CAST(t.[RQDT] AS DATE) = s.RQDT
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
		console.error('F51015 POST 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function DELETE(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const sp = req.nextUrl.searchParams;
		const pnum = sp.get('pnum');
		const rqdt = sp.get('rqdt');
		const ymd = normalizeYmd(rqdt);

		if (!pnum || !ymd) {
			return new Response(JSON.stringify({ success: false, error: 'pnum, rqdt가 필요합니다.' }), {
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
		request.input('sessionAncd', gate.sessionAncd);
		request.input('pnum', sql.VarChar(30), String(pnum).trim());
		request.input('rqdt', sql.VarChar(10), ymd);

		await request.query(`
      DELETE FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND CAST([PNUM] AS VARCHAR(30)) = @pnum
        AND CONVERT(varchar(10), CAST([RQDT] AS DATE), 23) = @rqdt
    `);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F51015 DELETE 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
