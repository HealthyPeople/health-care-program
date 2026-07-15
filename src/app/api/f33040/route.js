import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, parseUserInfoCookieValue } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F33040]';
const DATE_COL = 'CHNG_DT';

function toYmd(v) {
	if (!v) return '';
	const s = String(v);
	if (s.includes('T')) return s.split('T')[0];
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s.slice(0, 10);
}

function ymdToDigits(v) {
	const s = String(v ?? '').trim();
	if (!s) return '';
	return s.includes('-') ? s.replace(/-/g, '') : s;
}

function normalizeChngGu(v) {
	return String(v ?? '').trim().padStart(2, '0').slice(-2);
}

function mapRow(r) {
	const dt = toYmd(r[DATE_COL]);
	return {
		...r,
		[DATE_COL]: dt,
		VDT: dt,
		CHNG_GU: normalizeChngGu(r.CHNG_GU),
		CHNG_EMPNM: r.CHNG_EMPNM ?? r.EMPNM ?? '',
	};
}

async function resolveChngEmpno(pool, sessionAncd, req, body) {
	const fromBody = body?.CHNG_EMPNO ?? body?.chngEmpno;
	if (fromBody != null && String(fromBody).trim() !== '') {
		const n = parseInt(String(fromBody).trim(), 10);
		return Number.isNaN(n) ? null : n;
	}

	const name = String(body?.CHNG_EMPNM ?? body?.chngEmpnm ?? '').trim();
	if (name && pool) {
		const r = await pool
			.request()
			.input('ANCD', sessionAncd)
			.input('EMPNM', name)
			.query(
				`SELECT TOP 1 [EMPNO] FROM [돌봄시설DB].[dbo].[F00120]
         WHERE [ANCD] = @ANCD AND [EMPNM] = @EMPNM`
			);
		const empno = r.recordset?.[0]?.EMPNO;
		if (empno != null) return empno;
	}

	const session = parseUserInfoCookieValue(req.cookies.get('user_info')?.value);
	const uid = String(session?.uid ?? '').trim();
	if (uid && pool) {
		const r = await pool
			.request()
			.input('ANCD', sessionAncd)
			.input('UID', uid)
			.query(
				`SELECT TOP 1 [EMPNO] FROM [돌봄시설DB].[dbo].[F00120]
         WHERE [ANCD] = @ANCD AND [UID] = @UID`
			);
		const empno = r.recordset?.[0]?.EMPNO;
		if (empno != null) return empno;
	}

	return null;
}

export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const pnum = searchParams.get('pnum');
		const vdt = searchParams.get('vdt');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const mode = (searchParams.get('mode') || '').trim();

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		if (!pnum) {
			return new Response(JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다' }), {
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

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);
		request.input('PNUM', String(pnum));

		if (mode === 'dates') {
			const q = `
        SELECT DISTINCT CONVERT(varchar(10), t.[${DATE_COL}], 120) AS ${DATE_COL}
        FROM ${TABLE_NAME} t
        WHERE t.[ANCD] = @ANCD
          AND CAST(t.[PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        ORDER BY ${DATE_COL} DESC
      `;
			const result = await request.query(q);
			const data = (result.recordset || []).map((r) => ({
				CHNG_DT: toYmd(r[DATE_COL]),
				VDT: toYmd(r[DATE_COL]),
			}));
			return new Response(JSON.stringify({ success: true, data, count: data.length }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let where = `
      WHERE t.[ANCD] = @ANCD
        AND CAST(t.[PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
    `;

		if (startDate && endDate) {
			const s = ymdToDigits(startDate);
			const e = ymdToDigits(endDate);
			if (!/^\d{8}$/.test(s) || !/^\d{8}$/.test(e)) {
				return new Response(JSON.stringify({ success: false, error: 'startDate/endDate 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('START', s);
			request.input('END', e);
			where += ` AND CONVERT(char(8), t.[${DATE_COL}], 112) >= @START AND CONVERT(char(8), t.[${DATE_COL}], 112) <= @END`;
		} else if (vdt) {
			const d = ymdToDigits(vdt);
			if (!/^\d{8}$/.test(d)) {
				return new Response(JSON.stringify({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('CHNG_DT', d);
			where += ` AND CONVERT(char(8), t.[${DATE_COL}], 112) = @CHNG_DT`;
		} else {
			return new Response(JSON.stringify({ success: false, error: 'vdt 또는 startDate/endDate 파라미터가 필요합니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const query = `
      SELECT
        t.[ANCD],
        t.[PNUM],
        t.[${DATE_COL}],
        t.[CHNG_GU],
        t.[CHNG_POSI],
        t.[CHNG_ETC],
        t.[CHNG_EMPNO],
        e.[EMPNM] AS CHNG_EMPNM
      FROM ${TABLE_NAME} t
      LEFT JOIN [돌봄시설DB].[dbo].[F00120] e
        ON t.[ANCD] = e.[ANCD]
        AND t.[CHNG_EMPNO] = e.[EMPNO]
      ${where}
      ORDER BY t.[${DATE_COL}] DESC, t.[CHNG_GU] ASC
    `;

		const result = await request.query(query);
		const data = (result.recordset || []).map(mapRow);

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33040 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function POST(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const body = await req.json().catch(() => ({}));
		const pnum = body?.PNUM ?? body?.pnum;
		const vdt = body?.CHNG_DT ?? body?.chngDt ?? body?.VDT ?? body?.vdt;
		const chngGu = body?.CHNG_GU ?? body?.chngGu;

		if (!pnum || !vdt || !chngGu) {
			return new Response(JSON.stringify({ success: false, error: 'PNUM, CHNG_DT, CHNG_GU는 필수입니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const vdtDigits = ymdToDigits(vdt);
		if (!/^\d{8}$/.test(vdtDigits)) {
			return new Response(JSON.stringify({ success: false, error: 'CHNG_DT 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const chng = normalizeChngGu(chngGu);
		if (!chng) {
			return new Response(JSON.stringify({ success: false, error: 'CHNG_GU 형식이 올바르지 않습니다' }), {
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

		const chngEmpno = await resolveChngEmpno(pool, gate.sessionAncd, req, body);

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);
		request.input('PNUM', String(pnum));
		request.input('CHNG_DT', vdtDigits);
		request.input('CHNG_GU', chng);
		request.input('CHNG_POSI', body?.CHNG_POSI ?? body?.chngPosi ?? '1');
		request.input('CHNG_ETC', body?.CHNG_ETC ?? body?.chngEtc ?? '');
		request.input('CHNG_EMPNO', chngEmpno);

		const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @CHNG_DT, 112) AS ${DATE_COL}, @CHNG_GU AS CHNG_GU) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[${DATE_COL}]) = S.[${DATE_COL}]
            AND T.[CHNG_GU] = S.[CHNG_GU])
      WHEN MATCHED THEN
        UPDATE SET
          [CHNG_POSI] = @CHNG_POSI,
          [CHNG_ETC] = @CHNG_ETC,
          [CHNG_EMPNO] = @CHNG_EMPNO
      WHEN NOT MATCHED THEN
        INSERT (
          [ANCD],[PNUM],[${DATE_COL}],[CHNG_GU],
          [CHNG_POSI],[CHNG_ETC],[CHNG_EMPNO]
        )
        VALUES (
          @ANCD,@PNUM,CONVERT(date, @CHNG_DT, 112),@CHNG_GU,
          @CHNG_POSI,@CHNG_ETC,@CHNG_EMPNO
        );
    `;

		await request.query(query);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33040 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const pnum = searchParams.get('pnum');
		const vdt = searchParams.get('vdt');
		const chngGu = searchParams.get('chngGu');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		if (!pnum || !vdt || !chngGu) {
			return new Response(JSON.stringify({ success: false, error: 'pnum, vdt, chngGu 파라미터가 필요합니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const vdtDigits = ymdToDigits(vdt);
		const chng = normalizeChngGu(chngGu);
		if (!/^\d{8}$/.test(vdtDigits) || !chng) {
			return new Response(JSON.stringify({ success: false, error: '파라미터 형식이 올바르지 않습니다' }), {
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

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);
		request.input('PNUM', String(pnum));
		request.input('CHNG_DT', vdtDigits);
		request.input('CHNG_GU', chng);

		const query = `
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(char(8), [${DATE_COL}], 112) = @CHNG_DT
        AND [CHNG_GU] = @CHNG_GU
    `;

		await request.query(query);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33040 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
