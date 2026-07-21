import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F71040]';

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
 * GET /api/f71040?ancd=&name=
 * 개인봉사자 목록
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const nameQ = (searchParams.get('name') || '').trim();

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
			where += ' AND ISNULL([P_NM], \'\') LIKE @NAME';
		}

		const result = await request.query(`
			SELECT [ANCD], [P_PHONE], [P_NM], [P_ADD], [ETC], [INDT]
			FROM ${TABLE_NAME}
			${where}
			ORDER BY [P_NM], [P_PHONE]
		`);

		const data = (result.recordset || []).map((row) => ({
			ANCD: row.ANCD,
			P_PHONE: row.P_PHONE != null ? String(row.P_PHONE).trim() : '',
			P_NM: row.P_NM != null ? String(row.P_NM).trim() : '',
			P_ADD: row.P_ADD != null ? String(row.P_ADD).trim() : '',
			ETC: row.ETC != null ? String(row.ETC).trim() : '',
			INDT: normalizeYmd(row.INDT),
		}));

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71040 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f71040 — 추가/수정
 * body: { P_PHONE, P_NM, P_ADD, ETC, INDT, originalPhone? }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const phone = trunc(body?.P_PHONE ?? body?.pPhone ?? body?.phone, 20);
		const name = trunc(body?.P_NM ?? body?.pNm ?? body?.name, 20);
		if (!phone) {
			return new Response(JSON.stringify({ success: false, error: '핸드폰번호를 입력해주세요.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!name) {
			return new Response(JSON.stringify({ success: false, error: '이름을 입력해주세요.' }), {
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
		const addr = trunc(body?.P_ADD ?? body?.pAdd ?? body?.address, 100);
		const etc = trunc(body?.ETC ?? body?.etc, 100);
		const indtRaw = body?.INDT ?? body?.indt;
		let indt = null;
		if (indtRaw != null && String(indtRaw).trim()) {
			const s = String(indtRaw).trim();
			indt = s.includes('T') ? s.split('T')[0].slice(0, 10) : s.slice(0, 10);
		}

		const originalPhone = trunc(body?.originalPhone ?? body?.ORIGINAL_PHONE, 20) || phone;
		const isEdit = !!(body?.originalPhone ?? body?.ORIGINAL_PHONE);

		if (!isEdit) {
			const dup = await pool
				.request()
				.input('ANCD', ancd)
				.input('P_PHONE', phone)
				.query(`
					SELECT TOP 1 [P_PHONE] FROM ${TABLE_NAME}
					WHERE [ANCD] = @ANCD AND [P_PHONE] = @P_PHONE
				`);
			if (dup.recordset?.[0]) {
				return new Response(
					JSON.stringify({ success: false, error: `이미 등록된 핸드폰번호입니다: ${phone}` }),
					{ status: 409, headers: { 'Content-Type': 'application/json' } }
				);
			}

			await pool
				.request()
				.input('ANCD', ancd)
				.input('P_PHONE', phone)
				.input('P_NM', name)
				.input('P_ADD', addr)
				.input('ETC', etc)
				.input('INDT', indt)
				.query(`
					INSERT INTO ${TABLE_NAME} ([ANCD], [P_PHONE], [P_NM], [P_ADD], [ETC], [INDT])
					VALUES (
						@ANCD, @P_PHONE, @P_NM, @P_ADD, @ETC,
						COALESCE(CONVERT(date, @INDT), CONVERT(date, GETDATE()))
					)
				`);

			return new Response(
				JSON.stringify({ success: true, created: true, P_PHONE: phone }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// 전화 변경 시 중복 체크
		if (phone !== originalPhone) {
			const dup = await pool
				.request()
				.input('ANCD', ancd)
				.input('P_PHONE', phone)
				.query(`
					SELECT TOP 1 [P_PHONE] FROM ${TABLE_NAME}
					WHERE [ANCD] = @ANCD AND [P_PHONE] = @P_PHONE
				`);
			if (dup.recordset?.[0]) {
				return new Response(
					JSON.stringify({ success: false, error: `이미 등록된 핸드폰번호입니다: ${phone}` }),
					{ status: 409, headers: { 'Content-Type': 'application/json' } }
				);
			}
		}

		const result = await pool
			.request()
			.input('ANCD', ancd)
			.input('ORIGINAL_PHONE', originalPhone)
			.input('P_PHONE', phone)
			.input('P_NM', name)
			.input('P_ADD', addr)
			.input('ETC', etc)
			.input('INDT', indt)
			.query(`
				UPDATE ${TABLE_NAME}
				SET [P_PHONE] = @P_PHONE,
					[P_NM] = @P_NM,
					[P_ADD] = @P_ADD,
					[ETC] = @ETC,
					[INDT] = COALESCE(CONVERT(date, @INDT), [INDT])
				WHERE [ANCD] = @ANCD AND [P_PHONE] = @ORIGINAL_PHONE
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '수정할 봉사자 정보를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 전화 변경 시 실적 테이블 키도 갱신
		if (phone !== originalPhone) {
			await pool
				.request()
				.input('ANCD', ancd)
				.input('ORIGINAL_PHONE', originalPhone)
				.input('P_PHONE', phone)
				.query(`
					UPDATE [돌봄시설DB].[dbo].[F71041]
					SET [P_PHONE] = @P_PHONE
					WHERE [ANCD] = @ANCD AND [P_PHONE] = @ORIGINAL_PHONE
				`);
		}

		return new Response(
			JSON.stringify({ success: true, created: false, P_PHONE: phone }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F71040 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f71040?ancd=&phone=
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const phone = String(searchParams.get('phone') || searchParams.get('P_PHONE') || '').trim();

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		if (!phone) {
			return new Response(JSON.stringify({ success: false, error: 'phone이 필요합니다.' }), {
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
		const child = await pool
			.request()
			.input('ANCD', ancd)
			.input('P_PHONE', phone)
			.query(`
				SELECT TOP 1 [P_PHONE]
				FROM [돌봄시설DB].[dbo].[F71041]
				WHERE [ANCD] = @ANCD AND [P_PHONE] = @P_PHONE
			`);
		if (child.recordset?.[0]) {
			return new Response(
				JSON.stringify({
					success: false,
					error: '해당 봉사자에 봉사실적이 있어 삭제할 수 없습니다. 실적을 먼저 삭제해주세요.',
				}),
				{ status: 409, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await pool
			.request()
			.input('ANCD', ancd)
			.input('P_PHONE', phone)
			.query(`
				DELETE FROM ${TABLE_NAME}
				WHERE [ANCD] = @ANCD AND [P_PHONE] = @P_PHONE
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 봉사자 정보를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true, P_PHONE: phone }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71040 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
