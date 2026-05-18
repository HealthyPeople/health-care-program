import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F40010]';

/** DB/응답 값을 YYYY-MM-DD 문자열로 통일 (예: 2024-01-01) */
function normalizeYmd(v) {
	if (v == null || v === '') return null;
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	if (s.includes('T')) return s.split('T')[0];
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	const head = s.slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
	return null;
}

function normalizePGrd(v) {
	if (v == null || v === '') return null;
	let s = String(v).trim();
	s = s.replace(/\s*등급\s*$/u, '').trim();
	if (s === '인지지원') return '9';
	if (s === '등급외') return '0';
	const n = parseInt(s, 10);
	if (!Number.isNaN(n)) {
		if (n === 6) return '9';
		if (n >= 0 && n <= 9) return String(n);
	}
	if (/^[0-9]$/.test(s)) return s === '6' ? '9' : s;
	return s.length <= 2 ? s : null;
}

function parseAmount(v) {
	if (v == null || v === '') return 0;
	const n = parseInt(String(v).replace(/,/g, ''), 10);
	return Number.isFinite(n) ? n : 0;
}

function inputDate(request, name, ymd) {
	const n = normalizeYmd(ymd);
	if (n === null) {
		request.input(name, sql.Date, null);
	} else {
		request.input(name, sql.Date, new Date(`${n}T00:00:00`));
	}
}

function mapRow(r) {
	return {
		...r,
		SDT: normalizeYmd(r.SDT),
		INDT: normalizeYmd(r.INDT),
		P_GRD: r.P_GRD != null ? String(r.P_GRD).trim() : '',
	};
}

/** GET — 세션 ANCD 기준 급여단가 목록 */
export async function GET(req) {
	try {
		const ancd = req.nextUrl.searchParams.get('ancd');
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

		const result = await request.query(`
      SELECT
        [ANCD],
        CASE
          WHEN TRY_CONVERT(date, LTRIM(RTRIM([SDT]))) IS NOT NULL
          THEN CONVERT(varchar(10), TRY_CONVERT(date, LTRIM(RTRIM([SDT]))), 23)
          ELSE LEFT(LTRIM(RTRIM(CAST([SDT] AS varchar(30)))), 10)
        END AS [SDT],
        [P_GRD], [BAAMT], [OUTAMT],
        CASE
          WHEN TRY_CONVERT(date, LTRIM(RTRIM([INDT]))) IS NOT NULL
          THEN CONVERT(varchar(10), TRY_CONVERT(date, LTRIM(RTRIM([INDT]))), 23)
          ELSE LEFT(LTRIM(RTRIM(CAST([INDT] AS varchar(30)))), 10)
        END AS [INDT],
        [ETC], [INEMPNO], [INEMPNM]
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
      ORDER BY TRY_CONVERT(date, LTRIM(RTRIM([SDT]))) DESC, LTRIM(RTRIM([P_GRD])) ASC
    `);

		const data = (result.recordset || []).map(mapRow);
		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F40010 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/** POST { action?: 'delete', SDT, P_GRD, BAAMT?, OUTAMT?, ... } */
export async function POST(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const body = await req.json().catch(() => ({}));
		const action = body.action === 'delete' ? 'delete' : 'save';

		const sdt = normalizeYmd(body.SDT ?? body.sdt);
		const pGrd = normalizePGrd(body.P_GRD ?? body.p_grd ?? body.grade);
		if (!sdt || !pGrd) {
			return new Response(JSON.stringify({ success: false, error: '적용일자(SDT)와 등급(P_GRD)이 필요합니다.' }), {
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

		if (action === 'delete') {
			const rq = pool.request();
			rq.input('ANCD', gate.sessionAncd);
			inputDate(rq, 'SDT', sdt);
			rq.input('P_GRD', sql.VarChar(2), pGrd);
			const del = await rq.query(`
        DELETE FROM ${TABLE}
        WHERE [ANCD] = @ANCD
          AND CONVERT(date, [SDT]) = CONVERT(date, @SDT)
          AND LTRIM(RTRIM([P_GRD])) = LTRIM(RTRIM(@P_GRD))
      `);
			if (!del.rowsAffected?.[0]) {
				return new Response(JSON.stringify({ success: false, error: '삭제할 데이터가 없습니다.' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ success: true, action: 'delete' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const baamt = parseAmount(body.BAAMT ?? body.baamt ?? body.inpatientPrice);
		const outamt = parseAmount(body.OUTAMT ?? body.outamt ?? body.outpatientPrice);
		const etc = body.ETC ?? body.etc;
		let inempno = body.INEMPNO ?? body.inempno;
		if (inempno !== null && inempno !== undefined && inempno !== '') {
			const n = parseInt(String(inempno), 10);
			inempno = Number.isNaN(n) ? null : n;
		} else {
			inempno = null;
		}
		const rawNm = body.INEMPNM ?? body.inempnm;
		const inempnm =
			rawNm != null && String(rawNm).trim() !== '' ? String(rawNm).trim().slice(0, 100) : null;

		const rq = pool.request();
		rq.input('ANCD', gate.sessionAncd);
		inputDate(rq, 'SDT', sdt);
		rq.input('P_GRD', sql.VarChar(2), pGrd);
		rq.input('BAAMT', sql.Int, baamt);
		rq.input('OUTAMT', sql.Int, outamt);
		rq.input('ETC', sql.VarChar(100), etc == null || etc === '' ? null : String(etc).slice(0, 100));
		rq.input('INEMPNO', sql.Int, inempno);
		rq.input('INEMPNM', sql.VarChar(100), inempnm);

		await rq.query(`
      MERGE ${TABLE} AS T
      USING (
        SELECT @ANCD AS ANCD, @SDT AS SDT, @P_GRD AS P_GRD
      ) AS S
        ON T.[ANCD] = S.[ANCD]
       AND CONVERT(date, T.[SDT]) = CONVERT(date, S.[SDT])
       AND LTRIM(RTRIM(T.[P_GRD])) = LTRIM(RTRIM(S.[P_GRD]))
      WHEN MATCHED THEN
        UPDATE SET
          [BAAMT] = @BAAMT,
          [OUTAMT] = @OUTAMT,
          [ETC] = @ETC,
          [INEMPNO] = @INEMPNO,
          [INEMPNM] = @INEMPNM
      WHEN NOT MATCHED THEN
        INSERT ([ANCD], [SDT], [P_GRD], [BAAMT], [OUTAMT], [INDT], [ETC], [INEMPNO], [INEMPNM])
        VALUES (@ANCD, @SDT, @P_GRD, @BAAMT, @OUTAMT, GETDATE(), @ETC, @INEMPNO, @INEMPNM);
    `);

		return new Response(JSON.stringify({ success: true, action: 'save' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F40010 저장/삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
