import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F14070]';

function str(v) {
	if (v == null) return '';
	return String(v).trim();
}

function normalizeYmd(v) {
	if (v == null || v === '') return '';
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (s.includes('T')) return s.split('T')[0].slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s;
}

function parseFrDt(raw) {
	const s = String(raw ?? '').trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
	const d = new Date(`${s}T00:00:00`);
	if (Number.isNaN(d.getTime())) return null;
	return s;
}

/**
 * F14070 조회
 * GET /api/f14070?pnum=
 * GET /api/f14070?pnums=1,2,3
 */
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const ancd = sp.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const request = pool.request();
		request.input('sessionAncd', gate.sessionAncd);

		const pnum = sp.get('pnum');
		const pnumsRaw = sp.get('pnums');

		let result;
		if (pnum != null && String(pnum).trim() !== '') {
			request.input('pnum', sql.VarChar(30), String(pnum).trim());
			result = await request.query(`
        SELECT *
        FROM ${TABLE}
        WHERE [ANCD] = @sessionAncd
          AND CAST([PNUM] AS VARCHAR(30)) = @pnum
      `);
		} else if (pnumsRaw != null && String(pnumsRaw).trim() !== '') {
			const list = String(pnumsRaw)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (list.length === 0) {
				return new Response(JSON.stringify({ success: true, data: [], count: 0 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const placeholders = list
				.map((_, i) => {
					request.input(`p${i}`, sql.VarChar(30), list[i]);
					return `@p${i}`;
				})
				.join(',');
			result = await request.query(`
        SELECT *
        FROM ${TABLE}
        WHERE [ANCD] = @sessionAncd
          AND CAST([PNUM] AS VARCHAR(30)) IN (${placeholders})
        ORDER BY [P_NM] ASC
      `);
		} else {
			result = await request.query(`
        SELECT *
        FROM ${TABLE}
        WHERE [ANCD] = @sessionAncd
        ORDER BY [P_NM] ASC
      `);
		}

		const data = (result.recordset || []).map((r) => ({
			...r,
			PNUM: r.PNUM != null ? String(r.PNUM).trim() : '',
			P_NM: str(r.P_NM),
			P_BRDT: normalizeYmd(r.P_BRDT),
			P_GRD_NM: str(r.P_GRD_NM),
			P_YYNO: str(r.P_YYNO),
			ANNM: str(r.ANNM),
			ANGH: str(r.ANGH),
			ROOM_NO: str(r.ROOM_NO),
		}));

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F14070 GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * Usp_P14070 실행 — F14070 생성/갱신
 * PUT /api/f14070  body: { frDt: 'YYYY-MM-DD' }
 * @pv_fr_dt: 주 시작일(월요일 권장). 프로시저가 해당 주 일요일까지 집계.
 */
export async function PUT(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const body = await req.json().catch(() => ({}));
		const frDtRaw = body?.frDt ?? body?.fr_dt ?? body?.FRDT ?? searchParams.get('frDt') ?? '';
		const ancdParam = body?.ancd ?? searchParams.get('ancd') ?? null;

		const gate = assertAnCdMatchesSession(req, ancdParam);
		if (!gate.ok) return gate.response;

		const frDt = parseFrDt(frDtRaw);
		if (!frDt) {
			return new Response(
				JSON.stringify({ success: false, error: 'frDt(YYYY-MM-DD) 파라미터가 필요합니다' }),
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

		const ancd = Number(gate.sessionAncd);
		if (!Number.isFinite(ancd)) {
			return new Response(
				JSON.stringify({ success: false, error: '세션 기관코드(ANCD)가 올바르지 않습니다' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		/**
		 * Usp_P14070는 DATENAME(DW, …) 결과를 '월요일'~'일요일'로 비교한다.
		 * 연결 기본 언어가 us_english이면 Monday 등으로 나와 모든 일자 데이터가 _07에만 쌓이므로,
		 * 프로시저 코드는 수정하지 않고 실행 직전에 한국어로 맞춘다.
		 */
		await pool
			.request()
			.input('pv_ancd', sql.Int, ancd)
			.input('pv_fr_dt', sql.Date, frDt)
			.query(`
        SET LANGUAGE Korean;
        EXEC [돌봄시설DB].[dbo].[Usp_P14070] @pv_ancd = @pv_ancd, @pv_fr_dt = @pv_fr_dt;
      `);

		return new Response(
			JSON.stringify({
				success: true,
				ancd,
				frDt,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Usp_P14070 실행 오류:', err);
		return new Response(
			JSON.stringify({ success: false, error: err.message, details: err.toString() }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
