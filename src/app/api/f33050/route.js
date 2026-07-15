import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, parseUserInfoCookieValue } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F33050]';

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

function normalizeVtmGu(v) {
	return String(v ?? '').trim().padStart(2, '0').slice(-2);
}

function mapRow(r) {
	return {
		...r,
		VDT: toYmd(r.VDT),
		VTM_GU: normalizeVtmGu(r.VTM_GU),
		PSS_VAL: r.PSS_VAL ?? null,
		INEMPNM: r.INEMPNM ?? r.EMPNM ?? '',
	};
}

async function resolveInEmpno(pool, sessionAncd, req, body) {
	const fromBody = body?.INEMPNO ?? body?.inempno;
	if (fromBody != null && String(fromBody).trim() !== '') {
		const n = parseInt(String(fromBody).trim(), 10);
		return Number.isNaN(n) ? null : n;
	}

	const name = String(body?.INEMPNM ?? body?.inempnm ?? '').trim();
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
			where += ` AND CONVERT(char(8), t.[VDT], 112) >= @START AND CONVERT(char(8), t.[VDT], 112) <= @END`;
		} else if (vdt) {
			const d = ymdToDigits(vdt);
			if (!/^\d{8}$/.test(d)) {
				return new Response(JSON.stringify({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('VDT', d);
			where += ` AND CONVERT(char(8), t.[VDT], 112) = @VDT`;
		}

		const query = `
      SELECT
        t.[ANCD],
        t.[PNUM],
        t.[VDT],
        t.[VTM_GU],
        t.[PSS_VAL],
        t.[CH_01],
        t.[CH_02],
        t.[CH_03],
        t.[ETC],
        t.[INEMPNO],
        e.[EMPNM] AS INEMPNM
      FROM ${TABLE_NAME} t
      LEFT JOIN [돌봄시설DB].[dbo].[F00120] e
        ON t.[ANCD] = e.[ANCD]
        AND t.[INEMPNO] = e.[EMPNO]
      ${where}
      ORDER BY t.[VDT] DESC, t.[VTM_GU] ASC
    `;

		const result = await request.query(query);
		const data = (result.recordset || []).map(mapRow);

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33050 조회 오류:', err);
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
		const vdt = body?.VDT ?? body?.vdt;
		const vtmGu = body?.VTM_GU ?? body?.vtmGu;

		if (!pnum || !vdt || !vtmGu) {
			return new Response(JSON.stringify({ success: false, error: 'PNUM, VDT, VTM_GU는 필수입니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const vdtDigits = ymdToDigits(vdt);
		if (!/^\d{8}$/.test(vdtDigits)) {
			return new Response(JSON.stringify({ success: false, error: 'VDT 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const vtm = normalizeVtmGu(vtmGu);
		if (!vtm) {
			return new Response(JSON.stringify({ success: false, error: 'VTM_GU 형식이 올바르지 않습니다' }), {
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

		const inEmpno = await resolveInEmpno(pool, gate.sessionAncd, req, body);
		const pssRaw = body?.PSS_VAL ?? body?.pssVal;
		let pssVal = null;
		if (pssRaw != null && String(pssRaw).trim() !== '') {
			const n = parseInt(String(pssRaw).trim(), 10);
			pssVal = Number.isNaN(n) ? null : n;
		}

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);
		request.input('PNUM', String(pnum));
		request.input('VDT', vdtDigits);
		request.input('VTM_GU', vtm);
		request.input('PSS_VAL', pssVal);
		request.input('CH_01', body?.CH_01 ?? body?.ch01 ?? '0');
		request.input('CH_02', body?.CH_02 ?? body?.ch02 ?? '0');
		request.input('CH_03', body?.CH_03 ?? body?.ch03 ?? '0');
		request.input('ETC', body?.ETC ?? body?.etc ?? '');
		request.input('INEMPNO', inEmpno);

		const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @VDT, 112) AS VDT, @VTM_GU AS VTM_GU) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[VDT]) = S.[VDT]
            AND T.[VTM_GU] = S.[VTM_GU])
      WHEN MATCHED THEN
        UPDATE SET
          [PSS_VAL] = @PSS_VAL,
          [CH_01] = @CH_01,
          [CH_02] = @CH_02,
          [CH_03] = @CH_03,
          [ETC] = @ETC,
          [INEMPNO] = @INEMPNO
      WHEN NOT MATCHED THEN
        INSERT (
          [ANCD],[PNUM],[VDT],[VTM_GU],
          [PSS_VAL],[CH_01],[CH_02],[CH_03],[ETC],[INEMPNO]
        )
        VALUES (
          @ANCD,@PNUM,CONVERT(date, @VDT, 112),@VTM_GU,
          @PSS_VAL,@CH_01,@CH_02,@CH_03,@ETC,@INEMPNO
        );
    `;

		await request.query(query);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33050 저장 오류:', err);
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
		const vtmGu = searchParams.get('vtmGu');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		if (!pnum || !vdt || !vtmGu) {
			return new Response(JSON.stringify({ success: false, error: 'pnum, vdt, vtmGu 파라미터가 필요합니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const vdtDigits = ymdToDigits(vdt);
		const vtm = normalizeVtmGu(vtmGu);
		if (!/^\d{8}$/.test(vdtDigits) || !vtm) {
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
		request.input('VDT', vdtDigits);
		request.input('VTM_GU', vtm);

		const query = `
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(char(8), [VDT], 112) = @VDT
        AND [VTM_GU] = @VTM_GU
    `;

		await request.query(query);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33050 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
