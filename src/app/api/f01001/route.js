import { connPool } from '../../../config/server';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F01001]';

function normalizeYmd(v) {
	if (v == null || v === '') return null;
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (!s) return null;
	if (s.includes('T')) return s.split('T')[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.slice(0, 10);
}

function truncStr(v, max) {
	if (v == null) return null;
	const s = String(v);
	if (!s.trim()) return null;
	return s.length <= max ? s : s.slice(0, max);
}

/**
 * GET /api/f01001?code=&q=&includeDeleted=1
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const code = searchParams.get('code');
		const q = searchParams.get('q') || searchParams.get('CODE');
		const includeDeleted = searchParams.get('includeDeleted') === '1';

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const request = pool.request();
		let where = 'WHERE 1=1';

		if (code) {
			request.input('CODE', String(code).trim().slice(0, 2).toUpperCase());
			where += ' AND [CODE] = @CODE';
		} else if (q) {
			request.input('Q', `%${String(q).trim()}%`);
			where += ' AND ([CODE] LIKE @Q OR [DSC] LIKE @Q OR ISNULL([ETC], \'\') LIKE @Q)';
		}

		if (!includeDeleted) {
			where += " AND ISNULL([DEL], '') <> 'D'";
		}

		const result = await request.query(`
			SELECT [CODE], [DSC], [DEL], [ETC], [INDT], [URDT]
			FROM ${TABLE_NAME}
			${where}
			ORDER BY [CODE]
		`);

		const data = (result.recordset || []).map((r) => ({
			CODE: r.CODE != null ? String(r.CODE).trim() : '',
			DSC: r.DSC != null ? String(r.DSC).trim() : '',
			DEL: r.DEL != null ? String(r.DEL).trim() : '',
			ETC: r.ETC != null ? String(r.ETC).trim() : '',
			INDT: normalizeYmd(r.INDT),
			URDT: normalizeYmd(r.URDT),
		}));

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F01001 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f01001 — 신규/수정 (MERGE)
 * body: { CODE, DSC, ETC, DEL? }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const code = truncStr(body?.CODE ?? body?.code, 2);
		if (!code) {
			return new Response(JSON.stringify({ success: false, error: 'CODE(코드구분)는 필수입니다.' }), {
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

		const dsc = truncStr(body?.DSC ?? body?.dsc, 100);
		const etc = truncStr(body?.ETC ?? body?.etc, 100);
		const delRaw = body?.DEL ?? body?.del;
		const del =
			delRaw == null || String(delRaw).trim() === ''
				? null
				: String(delRaw).trim().toUpperCase().slice(0, 1);

		const request = pool.request();
		request.input('CODE', code.toUpperCase());
		request.input('DSC', dsc);
		request.input('ETC', etc);
		request.input('DEL', del);

		await request.query(`
			MERGE ${TABLE_NAME} AS T
			USING (SELECT @CODE AS CODE) AS S
				ON (T.[CODE] = S.[CODE])
			WHEN MATCHED THEN
				UPDATE SET
					[DSC] = @DSC,
					[ETC] = @ETC,
					[DEL] = ISNULL(@DEL, T.[DEL]),
					[URDT] = CONVERT(date, GETDATE())
			WHEN NOT MATCHED THEN
				INSERT ([CODE], [DSC], [ETC], [DEL], [INDT], [URDT])
				VALUES (
					@CODE, @DSC, @ETC,
					ISNULL(@DEL, ' '),
					CONVERT(date, GETDATE()),
					CONVERT(date, GETDATE())
				);
		`);

		return new Response(JSON.stringify({ success: true, CODE: code.toUpperCase() }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F01001 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f01001?code=
 * - 기본: soft delete (DEL='D')
 * - hard=1: F01002 연관 사용자코드 + F01001 코드구분 물리 삭제
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const code = String(searchParams.get('code') || searchParams.get('CODE') || '')
			.trim()
			.slice(0, 2)
			.toUpperCase();
		const hard = ['1', 'true', 'yes'].includes(
			String(searchParams.get('hard') || searchParams.get('HARD') || '')
				.trim()
				.toLowerCase()
		);

		if (!code) {
			return new Response(JSON.stringify({ success: false, error: 'code 파라미터가 필요합니다.' }), {
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

		if (hard) {
			const detailRes = await pool
				.request()
				.input('CODE', code)
				.query(`
					DELETE FROM [돌봄시설DB].[dbo].[F01002]
					WHERE [CODE] = @CODE
				`);
			const groupRes = await pool
				.request()
				.input('CODE', code)
				.query(`
					DELETE FROM ${TABLE_NAME}
					WHERE [CODE] = @CODE
				`);

			const groupAffected = groupRes?.rowsAffected?.[0] ?? 0;
			if (!groupAffected) {
				return new Response(JSON.stringify({ success: false, error: '삭제할 코드구분을 찾을 수 없습니다.' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(
				JSON.stringify({
					success: true,
					hard: true,
					CODE: code,
					deletedDetails: detailRes?.rowsAffected?.[0] ?? 0,
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await pool
			.request()
			.input('CODE', code)
			.query(`
				UPDATE ${TABLE_NAME}
				SET [DEL] = 'D', [URDT] = CONVERT(date, GETDATE())
				WHERE [CODE] = @CODE
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 코드구분을 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true, CODE: code }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F01001 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
