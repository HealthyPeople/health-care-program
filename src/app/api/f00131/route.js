import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, getSessionFromRequest } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F00131]';

const UGR_LABEL = {
	'1': '전체권한',
	'2': '등록(프로그램별)',
	'3': '등록(환자별)',
	'9': '조회',
};

/**
 * GET /api/f00131
 * - uid + pgmid: 단건 권한 여부
 * - uid only: 해당 사용자 매핑 프로그램 목록 (F00130 조인)
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const uid = searchParams.get('uid');
		const pgmid = searchParams.get('pgmid');

		const gate = assertAnCdMatchesSession(req, ancd);
		if (!gate.ok) return gate.response;

		if (!uid) {
			return new Response(JSON.stringify({ success: false, error: 'uid 파라미터가 필요합니다' }), {
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

		// 단건 조회 (기존 호환)
		if (pgmid) {
			const request = pool.request();
			request.input('ANCD', sessionAncd);
			request.input('UID', String(uid).trim());
			request.input('PGMID', String(pgmid).trim());

			const result = await request.query(`
				SELECT TOP 1
					[ANCD],
					[UID],
					[PGMID],
					[INEMPNO],
					[INEMPNM],
					[INDT],
					[ETC]
				FROM ${TABLE_NAME}
				WHERE [ANCD] = @ANCD
					AND [UID] = @UID
					AND [PGMID] = @PGMID
				ORDER BY [INDT] DESC
			`);

			const row = result.recordset?.[0] ?? null;
			return new Response(JSON.stringify({ success: true, data: row, allowed: !!row }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 목록 조회
		const result = await pool
			.request()
			.input('ANCD', sessionAncd)
			.input('UID', String(uid).trim())
			.query(`
				SELECT
					m.[ANCD],
					m.[UID],
					m.[PGMID],
					p.[PGMNM],
					RTRIM(p.[UGR]) AS [UGR],
					m.[INDT],
					m.[ETC]
				FROM ${TABLE_NAME} m
				LEFT JOIN [돌봄시설DB].[dbo].[F00130] p
					ON m.[PGMID] = p.[PGMID]
				WHERE m.[ANCD] = @ANCD
					AND m.[UID] = @UID
				ORDER BY p.[PGMNM], m.[PGMID]
			`);

		const data = (result.recordset || []).map((row) => {
			const ugr = row.UGR != null ? String(row.UGR).trim() : '';
			return {
				ANCD: row.ANCD,
				UID: row.UID != null ? String(row.UID).trim() : '',
				PGMID: row.PGMID != null ? String(row.PGMID).trim() : '',
				PGMNM: row.PGMNM != null ? String(row.PGMNM).trim() : '',
				UGR: ugr,
				UGR_NM: UGR_LABEL[ugr] || (ugr ? `등급 ${ugr}` : ''),
			};
		});

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F00131 권한 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f00131 — 매핑 추가 { UID, PGMID } 또는 { UID, PGMIDS: string[] }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const uid = String(body?.UID ?? body?.uid ?? '').trim();
		const pgmids = Array.isArray(body?.PGMIDS)
			? body.PGMIDS.map((x) => String(x ?? '').trim()).filter(Boolean)
			: [String(body?.PGMID ?? body?.pgmid ?? '').trim()].filter(Boolean);

		if (!uid || !pgmids.length) {
			return new Response(JSON.stringify({ success: false, error: 'UID, PGMID(또는 PGMIDS)가 필요합니다.' }), {
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

		const session = getSessionFromRequest(req);
		const inempnm = session?.empnm ? String(session.empnm).trim().slice(0, 20) : null;
		const ancd = gate.sessionAncd;
		let inserted = 0;

		for (const pgmid of pgmids) {
			const result = await pool
				.request()
				.input('ANCD', ancd)
				.input('UID', uid)
				.input('PGMID', pgmid)
				.input('INEMPNM', inempnm)
				.query(`
					IF NOT EXISTS (
						SELECT 1 FROM ${TABLE_NAME}
						WHERE [ANCD] = @ANCD AND [UID] = @UID AND [PGMID] = @PGMID
					)
					BEGIN
						INSERT INTO ${TABLE_NAME} ([ANCD], [UID], [PGMID], [INEMPNM], [INDT])
						VALUES (@ANCD, @UID, @PGMID, @INEMPNM, CONVERT(date, GETDATE()));
						SELECT 1 AS inserted;
					END
					ELSE
						SELECT 0 AS inserted;
				`);
			if (result.recordset?.[0]?.inserted === 1) inserted += 1;
		}

		return new Response(
			JSON.stringify({ success: true, inserted, count: pgmids.length }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F00131 추가 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f00131?uid=&pgmid= 또는 body { UID, PGMIDS }
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

		const uid = String(body?.UID ?? body?.uid ?? searchParams.get('uid') ?? '').trim();
		const pgmids = Array.isArray(body?.PGMIDS)
			? body.PGMIDS.map((x) => String(x ?? '').trim()).filter(Boolean)
			: [String(body?.PGMID ?? body?.pgmid ?? searchParams.get('pgmid') ?? '').trim()].filter(
					Boolean
				);

		if (!uid || !pgmids.length) {
			return new Response(JSON.stringify({ success: false, error: 'UID, PGMID(또는 PGMIDS)가 필요합니다.' }), {
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
		for (const pgmid of pgmids) {
			const result = await pool
				.request()
				.input('ANCD', ancd)
				.input('UID', uid)
				.input('PGMID', pgmid)
				.query(`
					DELETE FROM ${TABLE_NAME}
					WHERE [ANCD] = @ANCD AND [UID] = @UID AND [PGMID] = @PGMID
				`);
			deleted += result?.rowsAffected?.[0] ?? 0;
		}

		return new Response(JSON.stringify({ success: true, deleted }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F00131 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
