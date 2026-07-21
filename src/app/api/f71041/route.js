import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F71041]';

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

function flag01(v) {
	if (v === true || v === 1 || v === '1' || String(v).toUpperCase() === 'Y') return '1';
	return '0';
}

function isFlagOn(v) {
	const s = String(v ?? '').trim().toUpperCase();
	return s === '1' || s === 'Y';
}

function normalizeTime(v) {
	const s = String(v ?? '').trim();
	if (!s) return null;
	if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
	if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
	return trunc(s, 5);
}

function mapRow(row) {
	return {
		ANCD: row.ANCD,
		P_PHONE: row.P_PHONE != null ? String(row.P_PHONE).trim() : '',
		P_SDT: normalizeYmd(row.P_SDT),
		P_STM: row.P_STM != null ? String(row.P_STM).trim().slice(0, 5) : '',
		P_ETM: row.P_ETM != null ? String(row.P_ETM).trim().slice(0, 5) : '',
		P_SRV01: isFlagOn(row.P_SRV01) ? '1' : '0',
		P_SRV02: isFlagOn(row.P_SRV02) ? '1' : '0',
		P_SRV03: isFlagOn(row.P_SRV03) ? '1' : '0',
		P_SRV04: isFlagOn(row.P_SRV04) ? '1' : '0',
		P_SRV09: isFlagOn(row.P_SRV09) ? '1' : '0',
		P_SRV09_NM: row.P_SRV09_NM != null ? String(row.P_SRV09_NM).trim() : '',
		ETC: row.ETC != null ? String(row.ETC).trim() : '',
		INDT: normalizeYmd(row.INDT),
	};
}

/**
 * GET /api/f71041?ancd=&phone=&startDate=&endDate=
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const phone = String(searchParams.get('phone') || searchParams.get('P_PHONE') || '').trim();
		const startDate = (searchParams.get('startDate') || searchParams.get('from') || '').trim();
		const endDate = (searchParams.get('endDate') || searchParams.get('to') || '').trim();

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
		const request = pool.request();
		request.input('ANCD', ancd);
		request.input('P_PHONE', phone);

		let where = 'WHERE [ANCD] = @ANCD AND [P_PHONE] = @P_PHONE';
		if (startDate) {
			request.input('START', startDate.slice(0, 10));
			where += ' AND CONVERT(date, [P_SDT]) >= CONVERT(date, @START)';
		}
		if (endDate) {
			request.input('END', endDate.slice(0, 10));
			where += ' AND CONVERT(date, [P_SDT]) <= CONVERT(date, @END)';
		}

		const result = await request.query(`
			SELECT
				[ANCD], [P_PHONE], [P_SDT], [P_STM], [P_ETM],
				[P_SRV01], [P_SRV02], [P_SRV03], [P_SRV04], [P_SRV09], [P_SRV09_NM],
				[ETC], [INDT]
			FROM ${TABLE_NAME}
			${where}
			ORDER BY [P_SDT] DESC
		`);

		const data = (result.recordset || []).map(mapRow);

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71041 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f71041 — MERGE on (ANCD, P_PHONE, P_SDT)
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const phone = trunc(body?.P_PHONE ?? body?.pPhone ?? body?.phone, 20);
		const pSdt = normalizeYmd(body?.P_SDT ?? body?.pSdt ?? body?.date);
		if (!phone) {
			return new Response(JSON.stringify({ success: false, error: 'P_PHONE이 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!pSdt) {
			return new Response(JSON.stringify({ success: false, error: '봉사일자를 입력해주세요.' }), {
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
		const pStm = normalizeTime(body?.P_STM ?? body?.pStm ?? body?.startTime);
		const pEtm = normalizeTime(body?.P_ETM ?? body?.pEtm ?? body?.endTime);
		const pSrv01 = flag01(body?.P_SRV01 ?? body?.bath);
		const pSrv02 = flag01(body?.P_SRV02 ?? body?.beauty);
		const pSrv03 = flag01(body?.P_SRV03 ?? body?.programAssist);
		const pSrv04 = flag01(body?.P_SRV04 ?? body?.programOps);
		const pSrv09 = flag01(body?.P_SRV09 ?? body?.other);
		const pSrv09Nm = trunc(body?.P_SRV09_NM ?? body?.pSrv09Nm ?? body?.otherText, 200);
		const etc = trunc(body?.ETC ?? body?.etc, 100);

		const master = await pool
			.request()
			.input('ANCD', ancd)
			.input('P_PHONE', phone)
			.query(`
				SELECT TOP 1 [P_PHONE]
				FROM [돌봄시설DB].[dbo].[F71040]
				WHERE [ANCD] = @ANCD AND [P_PHONE] = @P_PHONE
			`);
		if (!master.recordset?.[0]) {
			return new Response(JSON.stringify({ success: false, error: '선택한 봉사자 정보를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await pool
			.request()
			.input('ANCD', ancd)
			.input('P_PHONE', phone)
			.input('P_SDT', pSdt)
			.input('P_STM', pStm)
			.input('P_ETM', pEtm)
			.input('P_SRV01', pSrv01)
			.input('P_SRV02', pSrv02)
			.input('P_SRV03', pSrv03)
			.input('P_SRV04', pSrv04)
			.input('P_SRV09', pSrv09)
			.input('P_SRV09_NM', pSrv09 === '1' ? pSrv09Nm : null)
			.input('ETC', etc)
			.query(`
				MERGE ${TABLE_NAME} AS t
				USING (SELECT @ANCD AS ANCD, @P_PHONE AS P_PHONE, CONVERT(date, @P_SDT) AS P_SDT) AS s
				ON t.[ANCD] = s.ANCD AND t.[P_PHONE] = s.P_PHONE AND CONVERT(date, t.[P_SDT]) = s.P_SDT
				WHEN MATCHED THEN
					UPDATE SET
						[P_STM] = @P_STM,
						[P_ETM] = @P_ETM,
						[P_SRV01] = @P_SRV01,
						[P_SRV02] = @P_SRV02,
						[P_SRV03] = @P_SRV03,
						[P_SRV04] = @P_SRV04,
						[P_SRV09] = @P_SRV09,
						[P_SRV09_NM] = @P_SRV09_NM,
						[ETC] = @ETC
				WHEN NOT MATCHED THEN
					INSERT (
						[ANCD], [P_PHONE], [P_SDT], [P_STM], [P_ETM],
						[P_SRV01], [P_SRV02], [P_SRV03], [P_SRV04], [P_SRV09], [P_SRV09_NM],
						[ETC], [INDT]
					) VALUES (
						@ANCD, @P_PHONE, @P_SDT, @P_STM, @P_ETM,
						@P_SRV01, @P_SRV02, @P_SRV03, @P_SRV04, @P_SRV09, @P_SRV09_NM,
						@ETC, CONVERT(date, GETDATE())
					);
			`);

		return new Response(
			JSON.stringify({ success: true, P_PHONE: phone, P_SDT: pSdt }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F71041 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f71041?ancd=&phone=&pSdt=
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const phone = String(searchParams.get('phone') || searchParams.get('P_PHONE') || '').trim();
		const pSdt = normalizeYmd(searchParams.get('pSdt') || searchParams.get('P_SDT') || '');

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		if (!phone || !pSdt) {
			return new Response(JSON.stringify({ success: false, error: 'phone, pSdt가 필요합니다.' }), {
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
			.input('ANCD', ancd)
			.input('P_PHONE', phone)
			.input('P_SDT', pSdt)
			.query(`
				DELETE FROM ${TABLE_NAME}
				WHERE [ANCD] = @ANCD
					AND [P_PHONE] = @P_PHONE
					AND CONVERT(date, [P_SDT]) = CONVERT(date, @P_SDT)
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 봉사실적을 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true, P_PHONE: phone, P_SDT: pSdt }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71041 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
