import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F00120]';

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

/**
 * 로그인 세션 ANCD와 동일한 F00120 사용자 계정 목록 조회
 * GET /api/f00120?empnm=사원명부분검색(선택)
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const empnmQ = (searchParams.get('empnm') || searchParams.get('name') || '').trim();

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
		request.input('ancd', ancd);

		let whereEmpnm = '';
		if (empnmQ) {
			request.input('empnmPattern', `%${empnmQ}%`);
			whereEmpnm = 'AND ISNULL(f120.[EMPNM], \'\') LIKE @empnmPattern';
		}

		const result = await request.query(`
			SELECT
				f120.[ANCD],
				f120.[UID],
				f120.[EMPNO],
				f120.[EMPNM],
				RTRIM(f120.[UGR]) AS [UGR],
				f120.[PWDT],
				RTRIM(f120.[DECYN]) AS [DECYN],
				f120.[DECPOS],
				x1.[DSC1] AS [UGR_NM]
			FROM ${TABLE_NAME} f120
			LEFT JOIN [돌봄시설DB].[dbo].[F01002] x1
				ON x1.[CODE] = 'X1'
				AND RTRIM(x1.[UCD]) = RTRIM(f120.[UGR])
			WHERE f120.[ANCD] = @ancd
				${whereEmpnm}
			ORDER BY
				CASE
					WHEN NULLIF(LTRIM(RTRIM(ISNULL(f120.[EMPNM], ''))), '') IS NULL THEN 1
					ELSE 0
				END,
				f120.[EMPNM],
				f120.[UID]
		`);

		const data = (result.recordset || []).map((row) => ({
			...row,
			PWDT: normalizeYmd(row.PWDT),
			UGR: row.UGR != null ? String(row.UGR).trim() : '',
			EMPNM: row.EMPNM != null ? String(row.EMPNM).trim() : '',
			UID: row.UID != null ? String(row.UID).trim() : '',
			UGR_NM: row.UGR_NM != null ? String(row.UGR_NM).replace(/\s+/g, ' ').trim() : '',
			DECYN: row.DECYN != null ? String(row.DECYN).trim().toUpperCase() : 'N',
			DECPOS: row.DECPOS != null && row.DECPOS !== '' ? Number(row.DECPOS) : null,
			EMPNO: row.EMPNO != null && row.EMPNO !== '' ? Number(row.EMPNO) : null,
		}));

		return new Response(JSON.stringify({ success: true, data, count: data.length, ancd }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F00120 목록 조회 오류:', err);
		return new Response(
			JSON.stringify({ success: false, error: err.message, details: err.toString() }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

/**
 * PUT /api/f00120
 * - action: 'resetPassword' → UPW='0000'
 * - action: 'linkEmployee' → EMPNO/EMPNM/UGR/DECYN/DECPOS 갱신
 */
export async function PUT(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const uid = String(body?.UID ?? body?.uid ?? '').trim();
		const action = String(body?.action ?? '').trim();

		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		if (!uid) {
			return new Response(JSON.stringify({ success: false, error: 'UID가 필요합니다.' }), {
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

		if (action === 'resetPassword') {
			const result = await pool
				.request()
				.input('ancd', ancd)
				.input('uid', uid)
				.input('upw', '0000')
				.query(`
					UPDATE ${TABLE_NAME}
					SET [UPW] = @upw,
						[PWDT] = CONVERT(date, GETDATE())
					WHERE [ANCD] = @ancd AND [UID] = @uid
				`);

			const affected = result?.rowsAffected?.[0] ?? 0;
			if (!affected) {
				return new Response(JSON.stringify({ success: false, error: '해당 사용자 계정을 찾을 수 없습니다.' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(
				JSON.stringify({ success: true, message: '암호가 0000으로 초기화되었습니다.', uid }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		if (action === 'linkEmployee' || action === 'update') {
			const empnm = String(body?.EMPNM ?? body?.empnm ?? '').trim();
			const empnoRaw = body?.EMPNO ?? body?.empno;
			const empno =
				empnoRaw == null || empnoRaw === ''
					? null
					: Number.isFinite(Number(empnoRaw))
						? Number(empnoRaw)
						: null;
			const ugr = String(body?.UGR ?? body?.ugr ?? '').trim();
			const decynRaw = String(body?.DECYN ?? body?.decyn ?? 'N').trim().toUpperCase();
			const decyn = decynRaw === 'Y' ? 'Y' : 'N';
			let decpos = body?.DECPOS ?? body?.decpos;
			if (decpos == null || decpos === '') {
				decpos = null;
			} else {
				decpos = parseInt(String(decpos), 10);
				if (!Number.isFinite(decpos) || decpos < 1 || decpos > 4) {
					return new Response(
						JSON.stringify({ success: false, error: '결재위치는 1~4 사이여야 합니다.' }),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					);
				}
			}
			if (!['1', '2', '3', '9'].includes(ugr)) {
				return new Response(
					JSON.stringify({ success: false, error: '관리등급(UGR)이 올바르지 않습니다.' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			const result = await pool
				.request()
				.input('ancd', ancd)
				.input('uid', uid)
				.input('empno', empno)
				.input('empnm', empnm || null)
				.input('ugr', ugr)
				.input('decyn', decyn)
				.input('decpos', decpos)
				.query(`
					UPDATE ${TABLE_NAME}
					SET [EMPNO] = @empno,
						[EMPNM] = @empnm,
						[UGR] = @ugr,
						[DECYN] = @decyn,
						[DECPOS] = @decpos
					WHERE [ANCD] = @ancd AND [UID] = @uid
				`);

			const affected = result?.rowsAffected?.[0] ?? 0;
			if (!affected) {
				return new Response(JSON.stringify({ success: false, error: '해당 사용자 계정을 찾을 수 없습니다.' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(
				JSON.stringify({ success: true, message: '사용자정보가 저장되었습니다.', uid }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		return new Response(JSON.stringify({ success: false, error: '지원하지 않는 작업입니다.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F00120 수정 오류:', err);
		return new Response(
			JSON.stringify({ success: false, error: err.message, details: err.toString() }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

/**
 * 사용자 계정 삭제
 * DELETE /api/f00120?uid=...
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const uid = String(searchParams.get('uid') || '').trim();
		const ancdParam = searchParams.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		if (!uid) {
			return new Response(JSON.stringify({ success: false, error: 'uid 파라미터가 필요합니다.' }), {
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
		const result = await pool
			.request()
			.input('ancd', ancd)
			.input('uid', uid)
			.query(`
				DELETE FROM ${TABLE_NAME}
				WHERE [ANCD] = @ancd AND [UID] = @uid
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '해당 사용자 계정을 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(
			JSON.stringify({ success: true, message: '사용자 계정이 삭제되었습니다.', uid }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F00120 삭제 오류:', err);
		return new Response(
			JSON.stringify({ success: false, error: err.message, details: err.toString() }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
