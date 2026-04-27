import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F33020]';

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

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional
    const pnum = searchParams.get('pnum');
    const vdt = searchParams.get('vdt'); // yyyy-mm-dd
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
        [PSS_GU],
        [DNG_GU],
        [NPPY_CNG_GU],
        [ETC],
        [INEMPNO],
        [INEMPNM]
      FROM ${TABLE_NAME}
      ${where}
      ORDER BY [VDT] DESC, [VTM_GU] ASC
    `;

    const result = await request.query(query);
    const data = (result.recordset || []).map((r) => ({
      ...r,
      VDT: toYmd(r.VDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F33020 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional

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

    const vtm = String(vtmGu).trim().slice(0, 2);
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
    request.input('PSS_GU', body?.PSS_GU ?? body?.pssGu ?? '0');
    request.input('DNG_GU', body?.DNG_GU ?? body?.dngGu ?? '0');
    request.input('NPPY_CNG_GU', body?.NPPY_CNG_GU ?? body?.nppyCngGu ?? '0');
    request.input('ETC', body?.ETC ?? body?.etc ?? '');
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
          [PSS_GU] = @PSS_GU,
          [DNG_GU] = @DNG_GU,
          [NPPY_CNG_GU] = @NPPY_CNG_GU,
          [ETC] = @ETC,
          [INEMPNO] = @INEMPNO,
          [INEMPNM] = @INEMPNM
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[PNUM],[VDT],[VTM_GU],[PSS_GU],[DNG_GU],[NPPY_CNG_GU],[ETC],[INEMPNO],[INEMPNM])
        VALUES (@ANCD,@PNUM,CONVERT(date, @VDT, 112),@VTM_GU,@PSS_GU,@DNG_GU,@NPPY_CNG_GU,@ETC,@INEMPNO,@INEMPNM);
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F33020 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional
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
    const vtm = String(vtmGu).trim().slice(0, 2);
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
    console.error('F33020 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

