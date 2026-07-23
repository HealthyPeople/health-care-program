import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

/** 급여 HEAD — 스키마: ANCD, SALMM(YYYYMM), PNUM 복합키 */
const TABLE = '[돌봄시설DB].[dbo].[F40100]';

const DATA_COLUMNS = [
	'INSPER',
	'USRPER',
	'USRGU',
	'SAL1',
	'SAL2',
	'BSAL1',
	'BSAL2',
	'BSAL3',
	'BSAL4',
	'BSAL6',
	'BSAL7',
	'BSAL8',
	'BSAL9',
	'ESAL',
	'ESALDES',
	'SNM',
	'S_GU',
	'ENM',
	'RDES',
	'P_GRD',
	'P_YYNO',
	'P_YYDT',
	'P_YYSDT',
	'P_YYEDT',
	'ETC',
	'P_NM',
	'P_BRDT',
	'P_SEX',
	'P_ST',
	'ANGH',
	'ANNM',
	'ANADD',
	'TAXNUM',
	'TAXOWN',
	'ANTEL',
];

function normalizeSalmm(v) {
	if (v == null || v === '') return null;
	const s = String(v).replace(/\D/g, '');
	if (s.length === 6) return s;
	if (s.length === 7 && s.includes('-')) {
		const p = String(v).split('-');
		if (p[0].length === 4 && p[1].length === 2) return `${p[0]}${p[1].padStart(2, '0')}`;
	}
	return null;
}

function bindDataInputs(request, row) {
	for (const col of DATA_COLUMNS) {
		const v = row[col];
		if (col === 'INSPER' || col === 'USRPER') {
			if (v == null || v === '') {
				request.input(col, sql.Decimal(4, 1), null);
			} else {
				const n = Number(String(v).replace(',', '.'));
				request.input(col, sql.Decimal(4, 1), Number.isFinite(n) ? n : null);
			}
			continue;
		}
		if (
			[
				'SAL1',
				'SAL2',
				'BSAL1',
				'BSAL2',
				'BSAL3',
				'BSAL4',
				'BSAL6',
				'BSAL7',
				'BSAL8',
				'BSAL9',
				'ESAL',
			].includes(col)
		) {
			if (v == null || v === '') {
				request.input(col, sql.Int, 0);
			} else {
				const n = parseInt(String(v).replace(/,/g, ''), 10);
				request.input(col, sql.Int, Number.isFinite(n) ? n : 0);
			}
			continue;
		}
		if (['P_BRDT'].includes(col)) {
			const s = v == null ? '' : String(v).trim();
			if (!s) {
				request.input(col, sql.DateTime, null);
			} else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
				request.input(col, sql.DateTime, new Date(`${s.slice(0, 10)}T00:00:00`));
			} else if (/^\d{8}$/.test(s)) {
				request.input(
					col,
					sql.DateTime,
					new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`)
				);
			} else {
				request.input(col, sql.DateTime, null);
			}
			continue;
		}
		if (['P_YYDT', 'P_YYSDT', 'P_YYEDT'].includes(col)) {
			const s = v == null ? '' : String(v).trim();
			if (!s || s.length < 8) {
				request.input(col, sql.Date, null);
			} else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
				request.input(col, sql.Date, new Date(`${s.slice(0, 10)}T00:00:00`));
			} else if (/^\d{8}$/.test(s)) {
				request.input(
					col,
					sql.Date,
					new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`)
				);
			} else {
				request.input(col, sql.Date, null);
			}
			continue;
		}
		if (['USRGU', 'S_GU', 'P_SEX', 'P_ST'].includes(col)) {
			const s = v == null || v === '' ? null : String(v).trim().slice(0, 1);
			request.input(col, sql.Char(1), s);
			continue;
		}
		if (col === 'P_GRD') {
			const s = v == null || v === '' ? null : String(v).trim().slice(0, 2);
			request.input(col, sql.Char(2), s);
			continue;
		}
		if (['ESALDES', 'RDES'].includes(col)) {
			request.input(col, sql.NVarChar(500), v == null || v === '' ? null : String(v));
			continue;
		}
		if (['P_NM', 'ANNM', 'ANADD', 'TAXOWN'].includes(col)) {
			request.input(col, sql.NVarChar(200), v == null || v === '' ? null : String(v).slice(0, 200));
			continue;
		}
		if (['SNM', 'ENM', 'ANGH'].includes(col)) {
			request.input(col, sql.VarChar(20), v == null || v === '' ? null : String(v).slice(0, 20));
			continue;
		}
		if (['P_YYNO', 'TAXNUM', 'ANTEL'].includes(col)) {
			request.input(col, sql.VarChar(30), v == null || v === '' ? null : String(v).slice(0, 30));
			continue;
		}
		if (col === 'ETC') {
			request.input(col, sql.VarChar(100), v == null || v === '' ? null : String(v).slice(0, 100));
			continue;
		}
		request.input(col, sql.VarChar(100), v == null || v === '' ? null : String(v).slice(0, 100));
	}
}

// GET ?salmm=YYYYMM — 목록
// GET ?salmm=&pnum= — 단건
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const salmmRaw = sp.get('salmm');
		const pnum = sp.get('pnum');
		const ancd = sp.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const salmm = normalizeSalmm(salmmRaw);
		if (!salmm) {
			return new Response(JSON.stringify({ success: false, error: 'salmm(YYYYMM 또는 급여년월)이 필요합니다.' }), {
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
		request.input('salmm', sql.Char(6), salmm);

		if (pnum != null && String(pnum).trim() !== '') {
			request.input('pnum', sql.VarChar(30), String(pnum).trim());
			const result = await request.query(`
        SELECT TOP 1 *
        FROM ${TABLE}
        WHERE [ANCD] = @sessionAncd
          AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@salmm))
          AND CAST([PNUM] AS VARCHAR(30)) = @pnum
      `);
			return new Response(JSON.stringify({ success: true, data: result.recordset?.[0] || null }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const result = await request.query(`
      SELECT *
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@salmm))
      ORDER BY [P_NM] ASC, CAST([PNUM] AS VARCHAR(30)) ASC
    `);

		return new Response(
			JSON.stringify({
				success: true,
				data: result.recordset || [],
				count: result.recordset ? result.recordset.length : 0,
				salmm,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F40100 GET 오류:', err);
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

		const salmm = normalizeSalmm(row.SALMM);
		if (!salmm || !row.PNUM) {
			return new Response(JSON.stringify({ success: false, error: 'SALMM, PNUM이 필요합니다.' }), {
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
		};

		const request = pool.request();
		request.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
		request.input('SALMM', sql.Char(6), salmm);
		request.input('PNUM', sql.VarChar(30), String(row.PNUM).trim());

		bindDataInputs(request, merged);

		const updateSet = DATA_COLUMNS.map((c) => `[${c}] = @${c}`).join(', ');
		const insertCols = ['[ANCD]', '[SALMM]', '[PNUM]', '[INDT]', ...DATA_COLUMNS.map((c) => `[${c}]`)];
		const insertParams = ['@ANCD', '@SALMM', '@PNUM', 'GETDATE()', ...DATA_COLUMNS.map((c) => `@${c}`)];

		const mergeSql = `
      MERGE ${TABLE} AS t
      USING (SELECT @ANCD AS ANCD, @SALMM AS SALMM, @PNUM AS PNUM) AS s
      ON CAST(t.[ANCD] AS VARCHAR(30)) = CAST(s.ANCD AS VARCHAR(30))
         AND LTRIM(RTRIM(t.[SALMM])) = LTRIM(RTRIM(s.SALMM))
         AND CAST(t.[PNUM] AS VARCHAR(30)) = CAST(s.PNUM AS VARCHAR(30))
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
		console.error('F40100 POST 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/** PATCH { salmm, pnum, fields: { SNM?, S_GU?, ENM?, RDES? } } — 발부정보 부분 수정 */
const LEDGER_PATCH_COLUMNS = ['SNM', 'S_GU', 'ENM', 'RDES'];

export async function PATCH(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const body = await req.json();
		const salmm = normalizeSalmm(body?.salmm ?? body?.SALMM);
		const pnum = body?.pnum ?? body?.PNUM;
		const fields = body?.fields && typeof body.fields === 'object' ? body.fields : body?.row;

		if (!salmm || pnum == null || String(pnum).trim() === '') {
			return new Response(JSON.stringify({ success: false, error: 'salmm, pnum이 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!fields || typeof fields !== 'object') {
			return new Response(JSON.stringify({ success: false, error: 'fields 객체가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const provided = LEDGER_PATCH_COLUMNS.filter((c) => Object.prototype.hasOwnProperty.call(fields, c));
		if (provided.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: '수정할 필드(SNM, S_GU, ENM, RDES)가 없습니다.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
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

		const patchRow = {};
		for (const c of provided) patchRow[c] = fields[c];
		// bindDataInputs는 DATA_COLUMNS 전체를 순회하므로 부분 row만 바인딩
		for (const col of provided) {
			const v = patchRow[col];
			if (col === 'S_GU') {
				const s = v == null || v === '' ? null : String(v).trim().slice(0, 1);
				request.input(col, sql.Char(1), s);
			} else if (col === 'RDES') {
				request.input(col, sql.NVarChar(200), v == null || v === '' ? null : String(v).slice(0, 200));
			} else if (col === 'SNM' || col === 'ENM') {
				request.input(col, sql.VarChar(20), v == null || v === '' ? null : String(v).slice(0, 20));
			}
		}

		const setSql = provided.map((c) => `[${c}] = @${c}`).join(', ');
		const result = await request.query(`
      UPDATE ${TABLE}
      SET ${setSql}
      WHERE CAST([ANCD] AS VARCHAR(30)) = @ANCD
        AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@SALMM))
        AND CAST([PNUM] AS VARCHAR(30)) = @PNUM
    `);

		return new Response(
			JSON.stringify({
				success: true,
				rowsAffected: result.rowsAffected?.[0] ?? 0,
				updated: provided,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F40100 PATCH 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

function monthRangeFromSalmm(salmm) {
	const y = parseInt(salmm.slice(0, 4), 10);
	const m = parseInt(salmm.slice(4, 6), 10);
	const lastDay = new Date(y, m, 0).getDate();
	const pad = (n) => String(n).padStart(2, '0');
	return {
		frdt: `${y}-${pad(m)}-01`,
		todt: `${y}-${pad(m)}-${pad(lastDay)}`,
	};
}

/**
 * 급여계산 — Usp_P40100 실행
 * PUT /api/f40100
 * body: { salmm: 'YYYYMM'|'YYYY-MM', pnum: number|string, wonflag?: 0|1|boolean }
 * - 전체계산: pnum = 9999999
 * - 개별계산: pnum = 선택한 수급자 PNUM
 * ANCD는 로그인 세션 값만 사용
 */
export async function PUT(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const body = await req.json().catch(() => ({}));
		const salmmRaw = body?.salmm ?? body?.SALMM ?? searchParams.get('salmm') ?? '';
		const ancdParam = body?.ancd ?? searchParams.get('ancd') ?? null;
		const pnumRaw = body?.pnum ?? body?.PNUM ?? searchParams.get('pnum');
		const wonflagRaw = body?.wonflag ?? body?.WONFLAG ?? body?.pv_wonflag;

		const gate = assertAnCdMatchesSession(req, ancdParam);
		if (!gate.ok) return gate.response;

		const salmm = normalizeSalmm(salmmRaw);
		if (!salmm) {
			return new Response(
				JSON.stringify({ success: false, error: 'salmm(YYYYMM) 파라미터가 필요합니다' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		if (pnumRaw == null || String(pnumRaw).trim() === '') {
			return new Response(
				JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const pnum = Number(String(pnumRaw).trim());
		if (!Number.isFinite(pnum)) {
			return new Response(
				JSON.stringify({ success: false, error: 'pnum 형식이 올바르지 않습니다' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		let wonflag = 0;
		if (wonflagRaw === true || wonflagRaw === 1 || wonflagRaw === '1' || wonflagRaw === 'Y' || wonflagRaw === 'y') {
			wonflag = 1;
		}

		const { frdt, todt } = monthRangeFromSalmm(salmm);
		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const ancd = Number(gate.sessionAncd);
		if (!Number.isFinite(ancd)) {
			return new Response(
				JSON.stringify({ success: false, error: '세션 기관코드(ANCD)가 올바르지 않습니다' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		await pool
			.request()
			.input('pv_ancd', sql.Int, ancd)
			.input('pv_salmm', sql.Char(6), salmm)
			.input('pv_frdt', sql.Date, frdt)
			.input('pv_todt', sql.Date, todt)
			.input('pv_wonflag', sql.Int, wonflag)
			.input('pv_pnum', sql.Int, pnum)
			.execute('[돌봄시설DB].[dbo].[Usp_P40100]');

		return new Response(
			JSON.stringify({
				success: true,
				ancd,
				salmm,
				frdt,
				todt,
				wonflag,
				pnum,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Usp_P40100 급여계산 오류:', err);
		return new Response(
			JSON.stringify({ success: false, error: err.message, details: String(err) }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
