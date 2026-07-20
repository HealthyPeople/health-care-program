import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, getSessionFromRequest } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F00132]';
const BENEFICIARY_TABLE = '[돌봄시설DB].[dbo].[F10010]';

function normalizeYmd(v) {
	if (v == null || v === '') return '';
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (!s) return '';
	if (s.includes('T')) return s.split('T')[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function sexLabel(v) {
	const s = String(v ?? '').trim().toUpperCase();
	if (s === 'M' || s === '1' || s === '남' || s === '남자') return '남';
	if (s === 'F' || s === '2' || s === '여' || s === '여자') return '여';
	return String(v ?? '').trim();
}

function parseEmpno(v) {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function parsePnums(body, searchParams) {
	if (Array.isArray(body?.PNUMS)) {
		return body.PNUMS.map((x) => Number(x)).filter((n) => Number.isFinite(n));
	}
	const single = body?.PNUM ?? body?.pnum ?? searchParams?.get?.('pnum');
	if (single == null || single === '') return [];
	const n = Number(single);
	return Number.isFinite(n) ? [n] : [];
}

async function resolveRegistrar(req, pool, ancd) {
	const session = getSessionFromRequest(req);
	let inempnm = session?.empnm ? String(session.empnm).trim().slice(0, 20) : null;
	let inempno = parseEmpno(session?.empno ?? session?.EMPNO);
	if ((inempno == null || !inempnm) && session?.uid) {
		try {
			const r = await pool
				.request()
				.input('ANCD', ancd)
				.input('UID', String(session.uid).trim())
				.query(`
					SELECT TOP 1 [EMPNO], [EMPNM]
					FROM [돌봄시설DB].[dbo].[F00120]
					WHERE [ANCD] = @ANCD AND [UID] = @UID
				`);
			const row = r.recordset?.[0];
			if (row) {
				if (inempno == null) inempno = parseEmpno(row.EMPNO);
				if (!inempnm && row.EMPNM) inempnm = String(row.EMPNM).trim().slice(0, 20);
			}
		} catch (e) {
			console.error('F00132 등록자 조회 실패:', e);
		}
	}
	return { inempno, inempnm };
}

/**
 * GET /api/f00132?empno=
 * 해당 사원에 매핑된 수급자 목록 (F10010 조인)
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const empno = parseEmpno(searchParams.get('empno'));

		const gate = assertAnCdMatchesSession(req, ancd);
		if (!gate.ok) return gate.response;

		if (empno == null) {
			return new Response(JSON.stringify({ success: false, error: 'empno 파라미터가 필요합니다.' }), {
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

		const sessionAncd = ancd ?? gate.sessionAncd;
		const result = await pool
			.request()
			.input('ANCD', sessionAncd)
			.input('EMPNO', empno)
			.query(`
				SELECT
					m.[ANCD],
					m.[EMPNO],
					m.[PNUM],
					b.[P_NM],
					b.[P_SEX],
					b.[P_BRDT],
					m.[INEMPNO],
					m.[INEMPNM],
					m.[INDT],
					m.[ETC]
				FROM ${TABLE_NAME} m
				LEFT JOIN ${BENEFICIARY_TABLE} b
					ON m.[ANCD] = b.[ANCD] AND m.[PNUM] = b.[PNUM]
				WHERE m.[ANCD] = @ANCD
					AND m.[EMPNO] = @EMPNO
				ORDER BY b.[P_NM], m.[PNUM]
			`);

		const data = (result.recordset || []).map((row) => ({
			ANCD: row.ANCD,
			EMPNO: row.EMPNO,
			PNUM: row.PNUM,
			P_NM: row.P_NM != null ? String(row.P_NM).trim() : '',
			P_SEX: sexLabel(row.P_SEX),
			P_BRDT: normalizeYmd(row.P_BRDT),
			INEMPNO: row.INEMPNO,
			INEMPNM: row.INEMPNM != null ? String(row.INEMPNM).trim() : '',
			INDT: normalizeYmd(row.INDT),
			ETC: row.ETC != null ? String(row.ETC).trim() : '',
		}));

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F00132 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f00132 — 매핑 추가 { EMPNO, PNUM } 또는 { EMPNO, PNUMS: number[] }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const empno = parseEmpno(body?.EMPNO ?? body?.empno);
		const pnums = parsePnums(body, null);

		if (empno == null || !pnums.length) {
			return new Response(JSON.stringify({ success: false, error: 'EMPNO, PNUM(또는 PNUMS)가 필요합니다.' }), {
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

		const ancd = gate.sessionAncd;
		const { inempno, inempnm } = await resolveRegistrar(req, pool, ancd);
		let inserted = 0;

		for (const pnum of pnums) {
			const result = await pool
				.request()
				.input('ANCD', ancd)
				.input('EMPNO', empno)
				.input('PNUM', pnum)
				.input('INEMPNO', inempno)
				.input('INEMPNM', inempnm)
				.query(`
					IF NOT EXISTS (
						SELECT 1 FROM ${TABLE_NAME}
						WHERE [ANCD] = @ANCD AND [EMPNO] = @EMPNO AND [PNUM] = @PNUM
					)
					BEGIN
						INSERT INTO ${TABLE_NAME} ([ANCD], [EMPNO], [PNUM], [INEMPNO], [INEMPNM], [INDT])
						VALUES (@ANCD, @EMPNO, @PNUM, @INEMPNO, @INEMPNM, CONVERT(date, GETDATE()));
						SELECT 1 AS inserted;
					END
					ELSE
						SELECT 0 AS inserted;
				`);
			if (result.recordset?.[0]?.inserted === 1) inserted += 1;
		}

		return new Response(
			JSON.stringify({ success: true, inserted, count: pnums.length }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F00132 추가 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f00132 — body { EMPNO, PNUMS } 또는 query empno&pnum
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		let body = {};
		try {
			body = await req.json();
		} catch {
			body = {};
		}

		const ancdParam = body?.ANCD ?? body?.ancd ?? searchParams.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		const empno = parseEmpno(body?.EMPNO ?? body?.empno ?? searchParams.get('empno'));
		const pnums = parsePnums(body, searchParams);

		if (empno == null || !pnums.length) {
			return new Response(JSON.stringify({ success: false, error: 'EMPNO, PNUM(또는 PNUMS)가 필요합니다.' }), {
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

		const ancd = gate.sessionAncd;
		let deleted = 0;
		for (const pnum of pnums) {
			const result = await pool
				.request()
				.input('ANCD', ancd)
				.input('EMPNO', empno)
				.input('PNUM', pnum)
				.query(`
					DELETE FROM ${TABLE_NAME}
					WHERE [ANCD] = @ANCD AND [EMPNO] = @EMPNO AND [PNUM] = @PNUM
				`);
			deleted += result?.rowsAffected?.[0] ?? 0;
		}

		return new Response(JSON.stringify({ success: true, deleted }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F00132 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
