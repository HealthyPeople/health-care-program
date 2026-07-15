import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F33021]';

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
	};
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
        SELECT DISTINCT CONVERT(varchar(10), [VDT], 120) AS VDT
        FROM ${TABLE_NAME}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        ORDER BY VDT DESC
      `;
			const result = await request.query(q);
			const data = (result.recordset || []).map((r) => ({ VDT: toYmd(r.VDT) }));
			return new Response(JSON.stringify({ success: true, data, count: data.length }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let where = `
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
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
			where += ` AND CONVERT(char(8), [VDT], 112) >= @START AND CONVERT(char(8), [VDT], 112) <= @END`;
		} else if (vdt) {
			const d = ymdToDigits(vdt);
			if (!/^\d{8}$/.test(d)) {
				return new Response(JSON.stringify({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('VDT', d);
			where += ` AND CONVERT(char(8), [VDT], 112) = @VDT`;
		} else {
			return new Response(JSON.stringify({ success: false, error: 'vdt 또는 startDate/endDate 파라미터가 필요합니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const query = `
      SELECT
        [ANCD],
        [PNUM],
        [VDT],
        [VTM_GU],
        [ANNT_STAT_GU],
        [ANNT_STAT_DESC],
        [PSS_NPPY_VAL_GU],
        [PSS_CTHT_VAL],
        [INTK_VAL],
        [PSS_GU],
        [DNG_GU],
        [NPPY_CNG_GU],
        [INEMPNO],
        [INEMPNM]
      FROM ${TABLE_NAME}
      ${where}
      ORDER BY [VDT] DESC, [VTM_GU] ASC
    `;

		const result = await request.query(query);
		const data = (result.recordset || []).map(mapRow);

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33021 조회 오류:', err);
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

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);
		request.input('PNUM', String(pnum));
		request.input('VDT', vdtDigits);
		request.input('VTM_GU', vtm);
		request.input('ANNT_STAT_GU', body?.ANNT_STAT_GU ?? body?.anntStatGu ?? '1');
		request.input('ANNT_STAT_DESC', body?.ANNT_STAT_DESC ?? body?.anntStatDesc ?? '');
		request.input('PSS_NPPY_VAL_GU', body?.PSS_NPPY_VAL_GU ?? body?.pssNppyValGu ?? '0');
		request.input('PSS_CTHT_VAL', body?.PSS_CTHT_VAL ?? body?.pssCthtVal ?? '');
		request.input('INTK_VAL', body?.INTK_VAL ?? body?.intkVal ?? '');
		request.input('PSS_GU', body?.PSS_GU ?? body?.pssGu ?? '0');
		request.input('DNG_GU', body?.DNG_GU ?? body?.dngGu ?? '0');
		request.input('NPPY_CNG_GU', body?.NPPY_CNG_GU ?? body?.nppyCngGu ?? '0');
		request.input('INEMPNO', body?.INEMPNO ?? body?.inempno ?? null);
		request.input('INEMPNM', body?.INEMPNM ?? body?.inempnm ?? null);

		const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @VDT, 112) AS VDT, @VTM_GU AS VTM_GU) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[VDT]) = S.[VDT]
            AND T.[VTM_GU] = S.[VTM_GU])
      WHEN MATCHED THEN
        UPDATE SET
          [ANNT_STAT_GU] = @ANNT_STAT_GU,
          [ANNT_STAT_DESC] = @ANNT_STAT_DESC,
          [PSS_NPPY_VAL_GU] = @PSS_NPPY_VAL_GU,
          [PSS_CTHT_VAL] = @PSS_CTHT_VAL,
          [INTK_VAL] = @INTK_VAL,
          [PSS_GU] = @PSS_GU,
          [DNG_GU] = @DNG_GU,
          [NPPY_CNG_GU] = @NPPY_CNG_GU,
          [INEMPNO] = @INEMPNO,
          [INEMPNM] = @INEMPNM
      WHEN NOT MATCHED THEN
        INSERT (
          [ANCD],[PNUM],[VDT],[VTM_GU],
          [ANNT_STAT_GU],[ANNT_STAT_DESC],
          [PSS_NPPY_VAL_GU],[PSS_CTHT_VAL],[INTK_VAL],
          [PSS_GU],[DNG_GU],[NPPY_CNG_GU],
          [INEMPNO],[INEMPNM]
        )
        VALUES (
          @ANCD,@PNUM,CONVERT(date, @VDT, 112),@VTM_GU,
          @ANNT_STAT_GU,@ANNT_STAT_DESC,
          @PSS_NPPY_VAL_GU,@PSS_CTHT_VAL,@INTK_VAL,
          @PSS_GU,@DNG_GU,@NPPY_CNG_GU,
          @INEMPNO,@INEMPNM
        );
    `;

		await request.query(query);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F33021 저장 오류:', err);
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
		console.error('F33021 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
