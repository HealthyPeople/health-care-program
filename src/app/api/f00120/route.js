import { connPool } from '../../../config/server';
import { assertAnCdAccess } from '../../../config/sessionServer';

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
 * F00120 사용자 계정 목록 조회
 * GET /api/f00120?ancd=...&empnm=사원명부분검색(선택)
 * - UGR=1: ancd로 타 기관 조회 가능
 * - 그 외: 본인 기관만
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const empnmQ = (searchParams.get('empnm') || searchParams.get('name') || '').trim();

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const access = await assertAnCdAccess(req, pool, ancdParam || null);
		if (!access.ok) return access.response;

		const ancd = access.targetAncd;
		const request = pool.request();
		request.input('ancd', ancd);

		let whereExtra = '';
		if (empnmQ) {
			request.input('empnmPattern', `%${empnmQ}%`);
			whereExtra += 'AND ISNULL(f120.[EMPNM], \'\') LIKE @empnmPattern';
		}
		const empnoQ = (searchParams.get('empno') || searchParams.get('EMPNO') || '').trim();
		if (empnoQ) {
			const empnoNum = parseInt(empnoQ, 10);
			if (!Number.isNaN(empnoNum)) {
				request.input('empno', empnoNum);
				whereExtra += ' AND f120.[EMPNO] = @empno';
			}
		}

		const includeEmp = searchParams.get('includeEmp') === '1';

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
				${
					includeEmp
						? `,
				f010.[EMPHP],
				f010.[JOB],
				f010.[JOBST]`
						: ''
				}
			FROM ${TABLE_NAME} f120
			LEFT JOIN [돌봄시설DB].[dbo].[F01002] x1
				ON x1.[CODE] = 'X1'
				AND RTRIM(x1.[UCD]) = RTRIM(f120.[UGR])
			${
				includeEmp
					? `LEFT JOIN [돌봄시설DB].[dbo].[F01010] f010
				ON f120.[ANCD] = f010.[ANCD]
				AND f120.[EMPNO] = f010.[EMPNO]`
					: ''
			}
			WHERE f120.[ANCD] = @ancd
				${whereExtra}
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
			...(includeEmp
				? {
						EMPHP: row.EMPHP != null ? String(row.EMPHP).trim() : '',
						JOB: row.JOB != null ? String(row.JOB).trim() : '',
						JOBST: row.JOBST != null ? String(row.JOBST).trim() : '',
					}
				: {}),
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
 * - action: 'resetPassword' → UPW='0000', PWDT=오늘
 * - action: 'linkEmployee'|'update'|'create'
 *   · 신규 INSERT 시 UPW 초기값 + PWDT/INDT=오늘
 *   · 기존 계정에 암호가 없거나 UPW를 넘기면 암호 반영 + PWDT=오늘
 */
export async function PUT(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const uid = String(body?.UID ?? body?.uid ?? '').trim();
		const action = String(body?.action ?? '').trim();

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

		const access = await assertAnCdAccess(req, pool, body?.ANCD ?? body?.ancd ?? null);
		if (!access.ok) return access.response;

		const ancd = access.targetAncd;

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

		if (action === 'linkEmployee' || action === 'update' || action === 'create') {
			const originalUid = String(body?.originalUID ?? body?.ORIGINAL_UID ?? '').trim();
			const newUid = String(body?.UID ?? body?.uid ?? '').trim().slice(0, 20);
			if (!newUid) {
				return new Response(JSON.stringify({ success: false, error: '사용자ID(UID)를 입력해주세요.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			// linkEmployee: originalUID 없이 신규/기존 UID upsert 허용
			if (!originalUid && action !== 'create' && action !== 'linkEmployee') {
				return new Response(JSON.stringify({ success: false, error: '원본 UID가 필요합니다.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const empnm = String(body?.EMPNM ?? body?.empnm ?? '').trim();
			const empnoRaw = body?.EMPNO ?? body?.empno;
			const empno =
				empnoRaw == null || empnoRaw === ''
					? null
					: Number.isFinite(Number(empnoRaw))
						? Number(empnoRaw)
						: null;
			const ugr = String(body?.UGR ?? body?.ugr ?? '').trim() || '2';
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

			const initUpw = String(body?.UPW ?? body?.upw ?? 'Abc54321').trim().slice(0, 20) || 'Abc54321';

			// 원본 계정 존재 여부 (없으면 입력 UID로 조회 — 공란 모달에서 기존 ID 연결)
			let targetUid = originalUid;
			let existing = null;
			if (originalUid) {
				const existOrig = await pool
					.request()
					.input('ancd', ancd)
					.input('originalUid', originalUid)
					.query(`
						SELECT TOP 1 [UID], [UPW], [PWDT]
						FROM ${TABLE_NAME}
						WHERE [ANCD] = @ancd AND [UID] = @originalUid
					`);
				existing = existOrig.recordset?.[0] || null;
			} else {
				const existByNew = await pool
					.request()
					.input('ancd', ancd)
					.input('newUid', newUid)
					.query(`
						SELECT TOP 1 [UID], [UPW], [PWDT]
						FROM ${TABLE_NAME}
						WHERE [ANCD] = @ancd AND [UID] = @newUid
					`);
				existing = existByNew.recordset?.[0] || null;
				if (existing) targetUid = String(existing.UID);
			}

			if (originalUid && newUid !== originalUid) {
				const dup = await pool
					.request()
					.input('ancd', ancd)
					.input('newUid', newUid)
					.query(`
						SELECT TOP 1 [UID] FROM ${TABLE_NAME}
						WHERE [ANCD] = @ancd AND [UID] = @newUid
					`);
				if (dup.recordset?.[0]) {
					return new Response(
						JSON.stringify({ success: false, error: `이미 존재하는 사용자ID입니다: ${newUid}` }),
						{ status: 409, headers: { 'Content-Type': 'application/json' } }
					);
				}
			}

			// 신규 INSERT (원본 없음)
			if (!existing) {
				await pool
					.request()
					.input('ancd', ancd)
					.input('uid', newUid)
					.input('upw', initUpw)
					.input('empno', empno)
					.input('empnm', empnm || null)
					.input('ugr', ugr)
					.input('decyn', decyn)
					.input('decpos', decpos)
					.query(`
						INSERT INTO ${TABLE_NAME} (
							[ANCD], [UID], [UPW], [EMPNO], [EMPNM], [UGR], [PWDT], [INDT], [DECYN], [DECPOS]
						) VALUES (
							@ancd, @uid, @upw, @empno, @empnm, @ugr,
							CONVERT(date, GETDATE()), CONVERT(date, GETDATE()),
							@decyn, @decpos
						)
					`);

				return new Response(
					JSON.stringify({
						success: true,
						message: '사용자정보가 신규 등록되었습니다.',
						uid: newUid,
						created: true,
						PWDT: true,
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// 기존 계정 UPDATE
			// - 암호가 비어 있으면 초기암호 부여 + PWDT 등록
			// - body.UPW가 명시되면 암호 변경 + PWDT 갱신
			const forcePassword = body?.UPW != null || body?.upw != null;
			const currentUpw = existing.UPW != null ? String(existing.UPW).trim() : '';
			const needInitPassword = !currentUpw;

			const result = await pool
				.request()
				.input('ancd', ancd)
				.input('originalUid', targetUid || originalUid || newUid)
				.input('newUid', newUid)
				.input('empno', empno)
				.input('empnm', empnm || null)
				.input('ugr', ugr)
				.input('decyn', decyn)
				.input('decpos', decpos)
				.input('initUpw', initUpw)
				.input('forceUpw', forcePassword ? initUpw : null)
				.input('needInit', needInitPassword ? 1 : 0)
				.input('forcePw', forcePassword ? 1 : 0)
				.query(`
					UPDATE ${TABLE_NAME}
					SET [UID] = @newUid,
						[EMPNO] = @empno,
						[EMPNM] = @empnm,
						[UGR] = @ugr,
						[DECYN] = @decyn,
						[DECPOS] = @decpos,
						[UPW] = CASE
							WHEN @forcePw = 1 THEN @forceUpw
							WHEN @needInit = 1 THEN @initUpw
							ELSE [UPW]
						END,
						[PWDT] = CASE
							WHEN @forcePw = 1 OR @needInit = 1 THEN CONVERT(date, GETDATE())
							ELSE [PWDT]
						END,
						[INDT] = CASE
							WHEN [INDT] IS NULL THEN CONVERT(date, GETDATE())
							ELSE [INDT]
						END
					WHERE [ANCD] = @ancd AND [UID] = @originalUid
				`);

			const affected = result?.rowsAffected?.[0] ?? 0;
			if (!affected) {
				return new Response(JSON.stringify({ success: false, error: '해당 사용자 계정을 찾을 수 없습니다.' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(
				JSON.stringify({ success: true, message: '사용자정보가 저장되었습니다.', uid: newUid }),
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

		const access = await assertAnCdAccess(req, pool, ancdParam || null);
		if (!access.ok) return access.response;

		const ancd = access.targetAncd;
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
