import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, getSessionFromRequest } from '../../../config/sessionServer';

const TABLE = '[돌봄시설DB].[dbo].[F11061]';
const LOG_TABLE = '[돌봄시설DB].[dbo].[F11060]';

function truncStr(v, max) {
	if (v == null) return null;
	const s = String(v).trim();
	if (!s) return null;
	return s.length <= max ? s : s.slice(0, max);
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
	if (!s) return '';
	if (s.includes('T')) return s.split('T')[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s.slice(0, 10);
}

function toInt(v) {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? Math.trunc(n) : null;
}

function mapRow(r) {
	return {
		ANCD: r.ANCD,
		JODT: normalizeYmd(r.JODT),
		EMPNO: r.EMPNO != null ? Number(r.EMPNO) : null,
		DECPOS: r.DECPOS != null ? Number(r.DECPOS) : null,
		ORDES_NM: r.ORDES_NM != null ? String(r.ORDES_NM).trim() : '',
		ORDES: r.ORDES != null ? String(r.ORDES).trim() : '',
		INDT: normalizeYmd(r.INDT),
	};
}

/** F11061 결재 목록을 '먼저 결재한 순'으로 ORDES1~4 / PRC_1~4 에 반영 */
async function syncOrdesToF11060(pool, ancd, jodt) {
	const listRes = await pool
		.request()
		.input('ANCD', ancd)
		.input('JODT', jodt)
		.query(`
			SELECT [ANCD], [JODT], [EMPNO], [DECPOS], [ORDES_NM], [ORDES]
			FROM ${TABLE}
			WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
			ORDER BY ISNULL([DECPOS], 99) ASC, [EMPNO] ASC
		`);

	let rows = listRes.recordset || [];
	try {
		const timed = await pool
			.request()
			.input('ANCD', ancd)
			.input('JODT', jodt)
			.query(`
				SELECT [ANCD], [JODT], [EMPNO], [DECPOS], [ORDES_NM], [ORDES], [INDT]
				FROM ${TABLE}
				WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
				ORDER BY
					CASE WHEN [INDT] IS NULL THEN 1 ELSE 0 END,
					[INDT] ASC,
					ISNULL([DECPOS], 99) ASC,
					[EMPNO] ASC
			`);
		if (Array.isArray(timed.recordset)) rows = timed.recordset;
	} catch {
		/* INDT 없으면 아래 F11060 기존 슬롯 순으로 보정 */
	}

	// INDT가 없거나 동일일 때: 이미 일지에 들어간 순서를 유지하고, 신규 결재만 뒤에 붙임
	const hasIndt = rows.some((r) => r.INDT != null && r.INDT !== '');
	if (!hasIndt && rows.length > 0) {
		const curRes = await pool
			.request()
			.input('ANCD', ancd)
			.input('JODT', jodt)
			.query(`
				SELECT [ORDES1], [ORDES1NM], [ORDES2], [ORDES2NM],
					[ORDES3], [ORDES3NM], [ORDES4], [ORDES4NM]
				FROM ${LOG_TABLE}
				WHERE [ANCD]=@ANCD AND CONVERT(date, [JODT])=CONVERT(date, @JODT)
			`);
		const cur = curRes.recordset?.[0];
		if (cur) {
			const pending = [...rows];
			const ordered = [];
			const takeMatch = (nm, content) => {
				const name = nm != null ? String(nm).trim() : '';
				const text = content != null ? String(content).trim() : '';
				if (!name && !text) return;
				const idx = pending.findIndex((r) => {
					const rnm = r.ORDES_NM != null ? String(r.ORDES_NM).trim() : '';
					const rtx = r.ORDES != null ? String(r.ORDES).trim() : '';
					if (name && text) return rnm === name && rtx === text;
					if (name) return rnm === name;
					return rtx === text;
				});
				if (idx >= 0) ordered.push(pending.splice(idx, 1)[0]);
			};
			takeMatch(cur.ORDES1NM, cur.ORDES1);
			takeMatch(cur.ORDES2NM, cur.ORDES2);
			takeMatch(cur.ORDES3NM, cur.ORDES3);
			takeMatch(cur.ORDES4NM, cur.ORDES4);
			rows = [...ordered, ...pending];
		}
	}

	const slots = [null, null, null, null];
	for (let i = 0; i < Math.min(rows.length, 4); i++) {
		slots[i] = rows[i];
	}

	const req = pool.request();
	req.input('ANCD', ancd);
	req.input('JODT', jodt);
	for (let i = 0; i < 4; i++) {
		const r = slots[i];
		req.input(`ORDES${i + 1}`, truncStr(r?.ORDES, 200));
		req.input(`ORDES${i + 1}NM`, truncStr(r?.ORDES_NM, 20));
		req.input(`PRC_${i + 1}`, r ? '1' : '0');
	}

	await req.query(`
		UPDATE ${LOG_TABLE}
		SET [ORDES1]=@ORDES1, [ORDES1NM]=@ORDES1NM, [PRC_1]=@PRC_1,
			[ORDES2]=@ORDES2, [ORDES2NM]=@ORDES2NM, [PRC_2]=@PRC_2,
			[ORDES3]=@ORDES3, [ORDES3NM]=@ORDES3NM, [PRC_3]=@PRC_3,
			[ORDES4]=@ORDES4, [ORDES4NM]=@ORDES4NM, [PRC_4]=@PRC_4
		WHERE [ANCD]=@ANCD AND CONVERT(date, [JODT])=CONVERT(date, @JODT)
	`);

	return rows.map(mapRow);
}

/**
 * GET /api/f11061?ancd=&jodt=
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const jodt = normalizeYmd(searchParams.get('jodt') || searchParams.get('JODT'));

		const gate = assertAnCdMatchesSession(req, ancd);
		if (!gate.ok) return gate.response;

		if (!jodt) {
			return new Response(JSON.stringify({ success: false, error: 'jodt가 필요합니다.' }), {
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

		const result = await pool
			.request()
			.input('ANCD', gate.sessionAncd)
			.input('JODT', jodt)
			.query(`
				SELECT [ANCD], [JODT], [EMPNO], [DECPOS], [ORDES_NM], [ORDES]
				FROM ${TABLE}
				WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
				ORDER BY ISNULL([DECPOS], 99) ASC, [EMPNO] ASC
			`);

		let data = (result.recordset || []).map(mapRow);
		try {
			const timed = await pool
				.request()
				.input('ANCD', gate.sessionAncd)
				.input('JODT', jodt)
				.query(`
					SELECT [ANCD], [JODT], [EMPNO], [DECPOS], [ORDES_NM], [ORDES], [INDT]
					FROM ${TABLE}
					WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
					ORDER BY
						CASE WHEN [INDT] IS NULL THEN 1 ELSE 0 END,
						[INDT] ASC,
						ISNULL([DECPOS], 99) ASC,
						[EMPNO] ASC
				`);
			if (Array.isArray(timed.recordset)) data = timed.recordset.map(mapRow);
		} catch {
			/* INDT 없으면 DECPOS 순 */
		}
		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F11061 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f11061 — 결재 등록/수정 후 F11060 ORDES 동기화
 * body: { JODT, EMPNO?, DECPOS, ORDES_NM, ORDES }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const jodt = normalizeYmd(body?.JODT ?? body?.jodt);
		if (!jodt) {
			return new Response(JSON.stringify({ success: false, error: '업무일자(JODT)가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const ordes = truncStr(body?.ORDES ?? body?.ordes, 200);
		if (!ordes) {
			return new Response(JSON.stringify({ success: false, error: '지시사항 내용을 입력한 뒤 결재해 주세요.' }), {
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
		const session = getSessionFromRequest(req) || {};
		let empno = toInt(body?.EMPNO ?? body?.empno ?? session.empno);

		if (empno == null && session.uid) {
			try {
				const empRes = await pool
					.request()
					.input('ANCD', ancd)
					.input('UID', String(session.uid).trim())
					.query(`
						SELECT TOP 1 [EMPNO], [EMPNM], [DECPOS], RTRIM([DECYN]) AS [DECYN]
						FROM [돌봄시설DB].[dbo].[F00120]
						WHERE [ANCD] = @ANCD AND [UID] = @UID
					`);
				const row = empRes.recordset?.[0];
				if (row) {
					empno = toInt(row.EMPNO);
					if (body?.ORDES_NM == null && body?.ordesNm == null && row.EMPNM) {
						body.ORDES_NM = row.EMPNM;
					}
					if (body?.DECPOS == null && body?.decpos == null && row.DECPOS != null) {
						body.DECPOS = row.DECPOS;
					}
				}
			} catch {
				/* ignore */
			}
		}

		if (empno == null) {
			return new Response(JSON.stringify({ success: false, error: '사원번호(EMPNO)를 확인할 수 없습니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let decpos = toInt(body?.DECPOS ?? body?.decpos);
		if (decpos != null && (decpos < 1 || decpos > 4)) {
			return new Response(JSON.stringify({ success: false, error: '결재위치는 1~4 사이여야 합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const ordesNm = truncStr(body?.ORDES_NM ?? body?.ordesNm ?? session.empnm, 20);

		const logExists = await pool
			.request()
			.input('ANCD', ancd)
			.input('JODT', jodt)
			.query(`
				SELECT TOP 1 [JODT]
				FROM ${LOG_TABLE}
				WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
			`);
		if (!logExists.recordset?.[0]) {
			return new Response(JSON.stringify({ success: false, error: '해당 업무일지가 없어 결재할 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const existing = await pool
			.request()
			.input('ANCD', ancd)
			.input('JODT', jodt)
			.input('EMPNO', empno)
			.query(`
				SELECT TOP 1 [EMPNO]
				FROM ${TABLE}
				WHERE [ANCD] = @ANCD
				  AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
				  AND [EMPNO] = @EMPNO
			`);

		const isUpdate = Boolean(existing.recordset?.[0]);

		if (!isUpdate) {
			const cntRes = await pool
				.request()
				.input('ANCD', ancd)
				.input('JODT', jodt)
				.query(`
					SELECT COUNT(*) AS CNT
					FROM ${TABLE}
					WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
				`);
			const cnt = Number(cntRes.recordset?.[0]?.CNT ?? 0);
			if (cnt >= 4) {
				return new Response(JSON.stringify({ success: false, error: '결재는 최대 4건까지 등록할 수 있습니다.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		if (isUpdate) {
			await pool
				.request()
				.input('ANCD', ancd)
				.input('JODT', jodt)
				.input('EMPNO', empno)
				.input('DECPOS', decpos)
				.input('ORDES_NM', ordesNm)
				.input('ORDES', ordes)
				.query(`
					UPDATE ${TABLE}
					SET [DECPOS] = @DECPOS,
						[ORDES_NM] = @ORDES_NM,
						[ORDES] = @ORDES
					WHERE [ANCD] = @ANCD
					  AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
					  AND [EMPNO] = @EMPNO
				`);
		} else {
			try {
				await pool
					.request()
					.input('ANCD', ancd)
					.input('JODT', jodt)
					.input('EMPNO', empno)
					.input('DECPOS', decpos)
					.input('ORDES_NM', ordesNm)
					.input('ORDES', ordes)
					.query(`
						INSERT INTO ${TABLE} (
							[ANCD], [JODT], [EMPNO], [DECPOS], [ORDES_NM], [ORDES], [INDT]
						) VALUES (
							@ANCD, CONVERT(date, @JODT), @EMPNO, @DECPOS, @ORDES_NM, @ORDES,
							CONVERT(date, GETDATE())
						)
					`);
			} catch {
				await pool
					.request()
					.input('ANCD', ancd)
					.input('JODT', jodt)
					.input('EMPNO', empno)
					.input('DECPOS', decpos)
					.input('ORDES_NM', ordesNm)
					.input('ORDES', ordes)
					.query(`
						INSERT INTO ${TABLE} (
							[ANCD], [JODT], [EMPNO], [DECPOS], [ORDES_NM], [ORDES]
						) VALUES (
							@ANCD, CONVERT(date, @JODT), @EMPNO, @DECPOS, @ORDES_NM, @ORDES
						)
					`);
			}
		}

		const synced = await syncOrdesToF11060(pool, ancd, jodt);

		return new Response(
			JSON.stringify({
				success: true,
				updated: isUpdate,
				created: !isUpdate,
				JODT: jodt,
				EMPNO: empno,
				approvals: synced,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F11061 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f11061?ancd=&jodt=&empno=
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const jodt = normalizeYmd(searchParams.get('jodt') || searchParams.get('JODT'));
		const empno = toInt(searchParams.get('empno') || searchParams.get('EMPNO'));

		const gate = assertAnCdMatchesSession(req, ancd);
		if (!gate.ok) return gate.response;

		if (!jodt || empno == null) {
			return new Response(JSON.stringify({ success: false, error: 'jodt, empno가 필요합니다.' }), {
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

		const result = await pool
			.request()
			.input('ANCD', gate.sessionAncd)
			.input('JODT', jodt)
			.input('EMPNO', empno)
			.query(`
				DELETE FROM ${TABLE}
				WHERE [ANCD] = @ANCD
				  AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
				  AND [EMPNO] = @EMPNO
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 결재 내역을 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const synced = await syncOrdesToF11060(pool, gate.sessionAncd, jodt);

		return new Response(
			JSON.stringify({ success: true, JODT: jodt, EMPNO: empno, approvals: synced }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F11061 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
