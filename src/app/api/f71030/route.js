import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F71030]';

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

function trunc(v, max) {
	if (v == null) return null;
	const s = String(v).trim();
	if (!s) return null;
	return s.length <= max ? s : s.slice(0, max);
}

/**
 * GET /api/f71030?ancd=&name=
 * 단체(봉사회) 목록
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const nameQ = (searchParams.get('name') || searchParams.get('circle') || '').trim();

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const ancd = gate.sessionAncd;
		const request = pool.request();
		request.input('ANCD', ancd);

		let where = 'WHERE [ANCD] = @ANCD';
		if (nameQ) {
			request.input('NAME', `%${nameQ}%`);
			where += ' AND ISNULL([G_CIRCLE], \'\') LIKE @NAME';
		}

		const result = await request.query(`
			SELECT
				[ANCD],
				[G_SEQ],
				[G_CIRCLE],
				[G_ASSI_NM],
				[G_PHONE1],
				[G_PHONE2],
				[ETC],
				[INDT]
			FROM ${TABLE_NAME}
			${where}
			ORDER BY [G_CIRCLE], [G_SEQ]
		`);

		const data = (result.recordset || []).map((row) => ({
			ANCD: row.ANCD,
			G_SEQ: row.G_SEQ != null ? Number(row.G_SEQ) : null,
			G_CIRCLE: row.G_CIRCLE != null ? String(row.G_CIRCLE).trim() : '',
			G_ASSI_NM: row.G_ASSI_NM != null ? String(row.G_ASSI_NM).trim() : '',
			G_PHONE1: row.G_PHONE1 != null ? String(row.G_PHONE1).trim() : '',
			G_PHONE2: row.G_PHONE2 != null ? String(row.G_PHONE2).trim() : '',
			ETC: row.ETC != null ? String(row.ETC).trim() : '',
			INDT: normalizeYmd(row.INDT),
		}));

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71030 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f71030 — 단체 추가/수정
 * body: { G_SEQ?, G_CIRCLE, G_ASSI_NM, G_PHONE1, G_PHONE2, ETC }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const circle = trunc(body?.G_CIRCLE ?? body?.gCircle ?? body?.name, 100);
		if (!circle) {
			return new Response(JSON.stringify({ success: false, error: '봉사회명(단체명)을 입력해주세요.' }), {
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
		const assiNm = trunc(body?.G_ASSI_NM ?? body?.gAssiNm ?? body?.contact, 20);
		const phone1 = trunc(body?.G_PHONE1 ?? body?.gPhone1 ?? body?.phone1, 20);
		const phone2 = trunc(body?.G_PHONE2 ?? body?.gPhone2 ?? body?.phone2, 20);
		const etc = trunc(body?.ETC ?? body?.etc, 100);
		const indtRaw = body?.INDT ?? body?.indt;
		let indt = null;
		if (indtRaw != null && String(indtRaw).trim()) {
			const s = String(indtRaw).trim();
			indt = s.includes('T') ? s.split('T')[0].slice(0, 10) : s.slice(0, 10);
		}

		let gSeq =
			body?.G_SEQ != null && body?.G_SEQ !== ''
				? Number(body.G_SEQ)
				: body?.gSeq != null && body?.gSeq !== ''
					? Number(body.gSeq)
					: null;
		if (gSeq != null && !Number.isFinite(gSeq)) gSeq = null;

		if (gSeq == null) {
			const maxRes = await pool
				.request()
				.input('ANCD', ancd)
				.query(`
					SELECT ISNULL(MAX([G_SEQ]), 0) + 1 AS NEXT_SEQ
					FROM ${TABLE_NAME}
					WHERE [ANCD] = @ANCD
				`);
			gSeq = Number(maxRes.recordset?.[0]?.NEXT_SEQ || 1);

			await pool
				.request()
				.input('ANCD', ancd)
				.input('G_SEQ', gSeq)
				.input('G_CIRCLE', circle)
				.input('G_ASSI_NM', assiNm)
				.input('G_PHONE1', phone1)
				.input('G_PHONE2', phone2)
				.input('ETC', etc)
				.input('INDT', indt)
				.query(`
					INSERT INTO ${TABLE_NAME} (
						[ANCD], [G_SEQ], [G_CIRCLE], [G_ASSI_NM], [G_PHONE1], [G_PHONE2], [ETC], [INDT]
					) VALUES (
						@ANCD, @G_SEQ, @G_CIRCLE, @G_ASSI_NM, @G_PHONE1, @G_PHONE2, @ETC,
						COALESCE(CONVERT(date, @INDT), CONVERT(date, GETDATE()))
					)
				`);

			return new Response(
				JSON.stringify({ success: true, created: true, G_SEQ: gSeq }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await pool
			.request()
			.input('ANCD', ancd)
			.input('G_SEQ', gSeq)
			.input('G_CIRCLE', circle)
			.input('G_ASSI_NM', assiNm)
			.input('G_PHONE1', phone1)
			.input('G_PHONE2', phone2)
			.input('ETC', etc)
			.input('INDT', indt)
			.query(`
				UPDATE ${TABLE_NAME}
				SET [G_CIRCLE] = @G_CIRCLE,
					[G_ASSI_NM] = @G_ASSI_NM,
					[G_PHONE1] = @G_PHONE1,
					[G_PHONE2] = @G_PHONE2,
					[ETC] = @ETC,
					[INDT] = COALESCE(CONVERT(date, @INDT), [INDT])
				WHERE [ANCD] = @ANCD AND [G_SEQ] = @G_SEQ
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '수정할 단체 정보를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(
			JSON.stringify({ success: true, created: false, G_SEQ: gSeq }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F71030 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f71030?ancd=&gSeq=
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const gSeq = Number(searchParams.get('gSeq') || searchParams.get('G_SEQ') || '');

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		if (!Number.isFinite(gSeq)) {
			return new Response(JSON.stringify({ success: false, error: 'gSeq가 필요합니다.' }), {
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

		// 실적 존재 시 삭제 차단
		const child = await pool
			.request()
			.input('ANCD', ancd)
			.input('G_SEQ', gSeq)
			.query(`
				SELECT TOP 1 [G_SEQ]
				FROM [돌봄시설DB].[dbo].[F71031]
				WHERE [ANCD] = @ANCD AND [G_SEQ] = @G_SEQ
			`);
		if (child.recordset?.[0]) {
			return new Response(
				JSON.stringify({
					success: false,
					error: '해당 단체에 봉사실적이 있어 삭제할 수 없습니다. 실적을 먼저 삭제해주세요.',
				}),
				{ status: 409, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await pool
			.request()
			.input('ANCD', ancd)
			.input('G_SEQ', gSeq)
			.query(`
				DELETE FROM ${TABLE_NAME}
				WHERE [ANCD] = @ANCD AND [G_SEQ] = @G_SEQ
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 단체 정보를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true, G_SEQ: gSeq }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71030 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
