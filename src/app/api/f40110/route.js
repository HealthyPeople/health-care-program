import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F40110]';

function normalizeSalmm(v) {
	if (v == null || v === '') return null;
	const s = String(v).replace(/\D/g, '');
	if (s.length === 6) return s;
	return null;
}

function normalizeYmd(v) {
	if (v == null || v === '') return null;
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (s.includes('T')) return s.split('T')[0];
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return null;
}

function mapRow(r) {
	return {
		...r,
		SVDT: normalizeYmd(r.SVDT),
		INDT: normalizeYmd(r.INDT),
		SALMM: r.SALMM != null ? String(r.SALMM).trim() : '',
		P_GRD: r.P_GRD != null ? String(r.P_GRD).trim() : '',
		USRGU: r.USRGU != null ? String(r.USRGU).trim() : '',
		P_YYNO: r.P_YYNO != null ? String(r.P_YYNO).trim() : '',
	};
}

/**
 * F40110 일별 급여상세 조회
 * GET /api/f40110?salmm=YYYYMM&pnum=PNUM
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const salmmRaw = searchParams.get('salmm');
		const pnum = searchParams.get('pnum');
		const ancd = searchParams.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const salmm = normalizeSalmm(salmmRaw);
		if (!salmm) {
			return new Response(JSON.stringify({ success: false, error: 'salmm(YYYYMM) 파라미터가 필요합니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!pnum || String(pnum).trim() === '') {
			return new Response(JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다' }), {
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
		request.input('pnum', sql.VarChar(30), String(pnum).trim());

		const result = await request.query(`
      SELECT
        [ANCD], [SALMM], [PNUM],
        CASE
          WHEN TRY_CONVERT(date, [SVDT]) IS NOT NULL
          THEN CONVERT(varchar(10), TRY_CONVERT(date, [SVDT]), 23)
          ELSE LEFT(LTRIM(RTRIM(CAST([SVDT] AS varchar(30)))), 10)
        END AS [SVDT],
        [SALTM], [SALAMT], [BSABAMT],
        [MOAMT], [AFAMT], [EVAMT], [AMAMT], [PMAMT], [EMAMT],
        [MEGAMT], [DOCAMT], [PREAMT], [ETC], [INDT], [ESAMT],
        [P_GRD], [USRGU], [INSPER], [USRPER], [P_YYNO], [SAL1], [SAL2]
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@salmm))
        AND CAST([PNUM] AS VARCHAR(30)) = @pnum
      ORDER BY TRY_CONVERT(date, [SVDT]) ASC
    `);

		const data = (result.recordset || []).map(mapRow);
		return new Response(
			JSON.stringify({ success: true, data, count: data.length, salmm, pnum: String(pnum).trim() }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F40110 GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
