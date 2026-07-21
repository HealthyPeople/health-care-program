import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, getSessionFromRequest } from '../../../config/sessionServer';

const TABLE = '[돌봄시설DB].[dbo].[F11060]';

function truncStr(v, max) {
	if (v == null) return null;
	const s = String(v);
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
	const d = new Date(s);
	if (!Number.isNaN(d.getTime())) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}
	return s.slice(0, 10);
}

function toInt(v) {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? Math.trunc(n) : null;
}

function flag01(v) {
	const s = String(v ?? '').trim();
	if (s === '1' || s.toUpperCase() === 'Y') return '1';
	if (s === '0' || s.toUpperCase() === 'N' || s === '') return '0';
	return s.slice(0, 1) || '0';
}

function mapRow(r) {
	return {
		ANCD: r.ANCD,
		JODT: normalizeYmd(r.JODT),
		FCNT: r.FCNT ?? null,
		HCNT: r.HCNT ?? null,
		SCNT: r.SCNT ?? null,
		NCNT: r.NCNT ?? null,
		ECNT: r.ECNT ?? null,
		SVNM: r.SVNM ?? '',
		JDES: r.JDES ?? '',
		OTDES: r.OTDES ?? '',
		INDT: normalizeYmd(r.INDT),
		ETC: r.ETC ?? '',
		INEMPNO: r.INEMPNO ?? null,
		INEMPNM: r.INEMPNM ?? '',
		ORDES1: r.ORDES1 ?? '',
		ORDES1NM: r.ORDES1NM ?? '',
		ORDES2: r.ORDES2 ?? '',
		ORDES2NM: r.ORDES2NM ?? '',
		ORDES3: r.ORDES3 ?? '',
		ORDES3NM: r.ORDES3NM ?? '',
		ORDES4: r.ORDES4 ?? '',
		ORDES4NM: r.ORDES4NM ?? '',
		PRC_1: flag01(r.PRC_1),
		PRC_2: flag01(r.PRC_2),
		PRC_3: flag01(r.PRC_3),
		PRC_4: flag01(r.PRC_4),
	};
}

/**
 * GET /api/f11060?ancd=&startDate=&endDate=&jodt=&datesOnly=true&stats=true
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const jodt = searchParams.get('jodt') || searchParams.get('JODT');
		const datesOnly = searchParams.get('datesOnly') === 'true';
		const stats = searchParams.get('stats') === 'true';

		const gate = assertAnCdMatchesSession(req, ancd);
		if (!gate.ok) return gate.response;

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const sessionAncd = gate.sessionAncd;

		if (stats) {
			const date = normalizeYmd(jodt) || normalizeYmd(new Date());
			const svdtDigits = date.replace(/-/g, '');

			const [capRes, cntRes, useRes] = await Promise.all([
				pool
					.request()
					.input('ANCD', sessionAncd)
					.query(`
						SELECT TOP 1 [MAXCNT]
						FROM [돌봄시설DB].[dbo].[F00110]
						WHERE [ANCD] = @ANCD
					`),
				pool
					.request()
					.input('ANCD', sessionAncd)
					.input('JODT', date)
					.query(`
						SELECT
							SUM(CASE WHEN RTRIM(ISNULL([P_ST], '')) = '1' THEN 1 ELSE 0 END) AS HCNT,
							SUM(CASE WHEN [P_SDT] IS NOT NULL AND CONVERT(date, [P_SDT]) = CONVERT(date, @JODT) THEN 1 ELSE 0 END) AS NCNT,
							SUM(CASE WHEN [P_EDT] IS NOT NULL AND CONVERT(date, [P_EDT]) = CONVERT(date, @JODT) THEN 1 ELSE 0 END) AS ECNT
						FROM [돌봄시설DB].[dbo].[F10010]
						WHERE [ANCD] = @ANCD
					`),
				pool
					.request()
					.input('ANCD', sessionAncd)
					.input('SVDT', svdtDigits)
					.query(`
						SELECT COUNT(*) AS SCNT
						FROM [돌봄시설DB].[dbo].[F14020]
						WHERE [ANCD] = @ANCD
						  AND REPLACE(CONVERT(varchar(20), [SVDT]), '-', '') = @SVDT
					`),
			]);

			const fcnt = toInt(capRes.recordset?.[0]?.MAXCNT) ?? 0;
			const hcnt = toInt(cntRes.recordset?.[0]?.HCNT) ?? 0;
			const ncnt = toInt(cntRes.recordset?.[0]?.NCNT) ?? 0;
			const ecnt = toInt(cntRes.recordset?.[0]?.ECNT) ?? 0;
			const scnt = toInt(useRes.recordset?.[0]?.SCNT) ?? 0;

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						JODT: date,
						FCNT: fcnt,
						HCNT: hcnt,
						SCNT: scnt,
						NCNT: ncnt,
						ECNT: ecnt,
					},
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const request = pool.request();
		request.input('ANCD', sessionAncd);

		let where = 'WHERE [ANCD] = @ANCD';
		if (startDate) {
			request.input('START', normalizeYmd(startDate));
			where += ' AND CONVERT(date, [JODT]) >= CONVERT(date, @START)';
		}
		if (endDate) {
			request.input('END', normalizeYmd(endDate));
			where += ' AND CONVERT(date, [JODT]) <= CONVERT(date, @END)';
		}
		if (jodt) {
			request.input('JODT', normalizeYmd(jodt));
			where += ' AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)';
		}

		if (datesOnly) {
			const dateResult = await request.query(`
				SELECT DISTINCT CONVERT(varchar(10), [JODT], 23) AS JODT
				FROM ${TABLE}
				${where}
				ORDER BY JODT DESC
			`);
			const dates = (dateResult.recordset || []).map((r) => normalizeYmd(r.JODT)).filter(Boolean);
			return new Response(JSON.stringify({ success: true, data: dates, count: dates.length }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const result = await request.query(`
			SELECT
				[ANCD], [JODT], [FCNT], [HCNT], [SCNT], [NCNT], [ECNT],
				[SVNM], [JDES], [OTDES], [INDT], [ETC], [INEMPNO], [INEMPNM],
				[ORDES1], [ORDES1NM], [ORDES2], [ORDES2NM], [ORDES3], [ORDES3NM], [ORDES4], [ORDES4NM],
				[PRC_1], [PRC_2], [PRC_3], [PRC_4]
			FROM ${TABLE}
			${where}
			ORDER BY [JODT] DESC
		`);

		const data = (result.recordset || []).map(mapRow);
		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F11060 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f11060  create | update
 * body: { action?, JODT, FCNT, HCNT, ... }
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const jodt = normalizeYmd(body?.JODT ?? body?.jodt);
		if (!jodt) {
			return new Response(JSON.stringify({ success: false, error: '업무일자가 필요합니다.' }), {
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
		const action = String(body?.action ?? '').trim().toLowerCase();

		const existsRes = await pool
			.request()
			.input('ANCD', ancd)
			.input('JODT', jodt)
			.query(`
				SELECT TOP 1 [JODT]
				FROM ${TABLE}
				WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
			`);
		const exists = Boolean(existsRes.recordset?.[0]);
		const isUpdate = action === 'update' || (action !== 'create' && exists);

		if (action === 'create' && exists) {
			return new Response(JSON.stringify({ success: false, error: '해당 업무일자 일지가 이미 존재합니다.' }), {
				status: 409,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (action === 'update' && !exists) {
			return new Response(JSON.stringify({ success: false, error: '수정할 업무일지를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const fcnt = toInt(body?.FCNT ?? body?.fcnt);
		const hcnt = toInt(body?.HCNT ?? body?.hcnt);
		const scnt = toInt(body?.SCNT ?? body?.scnt);
		const ncnt = toInt(body?.NCNT ?? body?.ncnt);
		const ecnt = toInt(body?.ECNT ?? body?.ecnt);
		const svnm = truncStr(body?.SVNM ?? body?.svnm, 2000);
		const jdes = truncStr(body?.JDES ?? body?.jdes, 2000);
		const otdes = truncStr(body?.OTDES ?? body?.otdes, 2000);
		const etc = truncStr(body?.ETC ?? body?.etc, 100);
		const ordes1 = truncStr(body?.ORDES1 ?? body?.ordes1, 200);
		const ordes1nm = truncStr(body?.ORDES1NM ?? body?.ordes1nm, 20);
		const ordes2 = truncStr(body?.ORDES2 ?? body?.ordes2, 200);
		const ordes2nm = truncStr(body?.ORDES2NM ?? body?.ordes2nm, 20);
		const ordes3 = truncStr(body?.ORDES3 ?? body?.ordes3, 200);
		const ordes3nm = truncStr(body?.ORDES3NM ?? body?.ordes3nm, 20);
		const ordes4 = truncStr(body?.ORDES4 ?? body?.ordes4, 200);
		const ordes4nm = truncStr(body?.ORDES4NM ?? body?.ordes4nm, 20);
		const prc1 = flag01(body?.PRC_1 ?? body?.prc1 ?? '0');
		const prc2 = flag01(body?.PRC_2 ?? body?.prc2 ?? '0');
		const prc3 = flag01(body?.PRC_3 ?? body?.prc3 ?? '0');
		const prc4 = flag01(body?.PRC_4 ?? body?.prc4 ?? '0');

		let inempno = toInt(body?.INEMPNO ?? body?.inempno ?? session.empno);
		let inempnm = truncStr(body?.INEMPNM ?? body?.inempnm ?? session.empnm, 100);

		if (!inempnm && session.uid) {
			try {
				const empRes = await pool
					.request()
					.input('ANCD', ancd)
					.input('UID', String(session.uid).trim())
					.query(`
						SELECT TOP 1 [EMPNO], [EMPNM]
						FROM [돌봄시설DB].[dbo].[F00120]
						WHERE [ANCD] = @ANCD AND [UID] = @UID
					`);
				const row = empRes.recordset?.[0];
				if (row) {
					if (inempno == null) inempno = toInt(row.EMPNO);
					if (!inempnm) inempnm = truncStr(row.EMPNM, 100);
				}
			} catch {
				/* ignore */
			}
		}

		if (isUpdate) {
			await pool
				.request()
				.input('ANCD', ancd)
				.input('JODT', jodt)
				.input('FCNT', fcnt)
				.input('HCNT', hcnt)
				.input('SCNT', scnt)
				.input('NCNT', ncnt)
				.input('ECNT', ecnt)
				.input('SVNM', svnm)
				.input('JDES', jdes)
				.input('OTDES', otdes)
				.input('ETC', etc)
				.input('ORDES1', ordes1)
				.input('ORDES1NM', ordes1nm)
				.input('ORDES2', ordes2)
				.input('ORDES2NM', ordes2nm)
				.input('ORDES3', ordes3)
				.input('ORDES3NM', ordes3nm)
				.input('ORDES4', ordes4)
				.input('ORDES4NM', ordes4nm)
				.input('PRC_1', prc1)
				.input('PRC_2', prc2)
				.input('PRC_3', prc3)
				.input('PRC_4', prc4)
				.query(`
					UPDATE ${TABLE}
					SET [FCNT]=@FCNT, [HCNT]=@HCNT, [SCNT]=@SCNT, [NCNT]=@NCNT, [ECNT]=@ECNT,
						[SVNM]=@SVNM, [JDES]=@JDES, [OTDES]=@OTDES, [ETC]=@ETC,
						[ORDES1]=@ORDES1, [ORDES1NM]=@ORDES1NM,
						[ORDES2]=@ORDES2, [ORDES2NM]=@ORDES2NM,
						[ORDES3]=@ORDES3, [ORDES3NM]=@ORDES3NM,
						[ORDES4]=@ORDES4, [ORDES4NM]=@ORDES4NM,
						[PRC_1]=@PRC_1, [PRC_2]=@PRC_2, [PRC_3]=@PRC_3, [PRC_4]=@PRC_4
					WHERE [ANCD]=@ANCD AND CONVERT(date, [JODT])=CONVERT(date, @JODT)
				`);

			return new Response(JSON.stringify({ success: true, updated: true, JODT: jodt }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await pool
			.request()
			.input('ANCD', ancd)
			.input('JODT', jodt)
			.input('FCNT', fcnt)
			.input('HCNT', hcnt)
			.input('SCNT', scnt)
			.input('NCNT', ncnt)
			.input('ECNT', ecnt)
			.input('SVNM', svnm)
			.input('JDES', jdes)
			.input('OTDES', otdes)
			.input('ETC', etc)
			.input('INEMPNO', inempno)
			.input('INEMPNM', inempnm)
			.input('ORDES1', ordes1)
			.input('ORDES1NM', ordes1nm)
			.input('ORDES2', ordes2)
			.input('ORDES2NM', ordes2nm)
			.input('ORDES3', ordes3)
			.input('ORDES3NM', ordes3nm)
			.input('ORDES4', ordes4)
			.input('ORDES4NM', ordes4nm)
			.input('PRC_1', prc1)
			.input('PRC_2', prc2)
			.input('PRC_3', prc3)
			.input('PRC_4', prc4)
			.query(`
				INSERT INTO ${TABLE} (
					[ANCD], [JODT], [FCNT], [HCNT], [SCNT], [NCNT], [ECNT],
					[SVNM], [JDES], [OTDES], [INDT], [ETC], [INEMPNO], [INEMPNM],
					[ORDES1], [ORDES1NM], [ORDES2], [ORDES2NM], [ORDES3], [ORDES3NM], [ORDES4], [ORDES4NM],
					[PRC_1], [PRC_2], [PRC_3], [PRC_4]
				) VALUES (
					@ANCD, CONVERT(date, @JODT), @FCNT, @HCNT, @SCNT, @NCNT, @ECNT,
					@SVNM, @JDES, @OTDES, CONVERT(date, GETDATE()), @ETC, @INEMPNO, @INEMPNM,
					@ORDES1, @ORDES1NM, @ORDES2, @ORDES2NM, @ORDES3, @ORDES3NM, @ORDES4, @ORDES4NM,
					@PRC_1, @PRC_2, @PRC_3, @PRC_4
				)
			`);

		return new Response(JSON.stringify({ success: true, created: true, JODT: jodt }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F11060 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f11060?ancd=&jodt=
 */
export async function DELETE(req) {
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
				DELETE FROM ${TABLE}
				WHERE [ANCD] = @ANCD AND CONVERT(date, [JODT]) = CONVERT(date, @JODT)
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 업무일지를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true, JODT: jodt }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F11060 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
