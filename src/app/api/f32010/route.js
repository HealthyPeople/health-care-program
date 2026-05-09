import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F32010]';

function normalizeYmd(v) {
  if (!v) return '';
  const s = String(v);
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s.slice(0, 10);
}

function pickBody(body, k, fallback = null) {
  if (!body || typeof body !== 'object') return fallback;
  if (Object.prototype.hasOwnProperty.call(body, k)) return body[k];
  const alt = k.toLowerCase();
  if (alt !== k && Object.prototype.hasOwnProperty.call(body, alt)) return body[alt];
  return fallback;
}

// F32010 조회
// GET /api/f32010?pnum=PNUM&sdt=YYYY-MM-DD&edt=YYYY-MM-DD (optional) &ancd=ANCD(optional)
// - sdt/edt 없으면 해당 수급자의 계획 목록(최신순)
// - sdt/edt 있으면 해당 기간 1건 상세
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const sdtRaw = searchParams.get('sdt');
    const edtRaw = searchParams.get('edt');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum) {
      return new Response(JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', String(pnum));

    const sdt = normalizeYmd(sdtRaw);
    const edt = normalizeYmd(edtRaw);
    if (sdt && edt) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sdt) || !/^\d{4}-\d{2}-\d{2}$/.test(edt)) {
        return new Response(JSON.stringify({ success: false, error: 'sdt/edt는 YYYY-MM-DD 형식이어야 합니다' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      request.input('SDT', sdt);
      request.input('EDT', edt);

      const result = await request.query(`
        SELECT *
        FROM ${TABLE_NAME}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
          AND CONVERT(date, [SDT]) = CONVERT(date, @SDT)
          AND CONVERT(date, [EDT]) = CONVERT(date, @EDT)
      `);

      const row = result?.recordset?.[0] || null;
      const data = row
        ? { ...row, SDT: normalizeYmd(row.SDT), EDT: normalizeYmd(row.EDT), INDT: normalizeYmd(row.INDT) }
        : null;
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await request.query(`
      SELECT *
      FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
      ORDER BY [SDT] DESC, [EDT] DESC, [INDT] DESC
    `);

    const data = (result.recordset || []).map((r) => ({
      ...r,
      SDT: normalizeYmd(r.SDT),
      EDT: normalizeYmd(r.EDT),
      INDT: normalizeYmd(r.INDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F32010 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// F32010 저장(업서트)
// POST /api/f32010
// body: { PNUM, SDT, EDT, JHEMP?, P_DIAG?, P_PROBLEM?, P_WAY?, P_PLAN?, P_JUDGE?, P_TEXT_CNT?, PSTD01~20, PCHK01~37, PETC_1~5, ETC }
export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd'); // optional

    const gate = assertAnCdMatchesSession(req, ancdParam || null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const pnum = pickBody(body, 'PNUM', null);
    const sdtRaw = pickBody(body, 'SDT', null);
    const edtRaw = pickBody(body, 'EDT', null);

    if (!pnum || !sdtRaw || !edtRaw) {
      return new Response(JSON.stringify({ success: false, error: 'PNUM, SDT, EDT는 필수입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sdt = normalizeYmd(sdtRaw);
    const edt = normalizeYmd(edtRaw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sdt) || !/^\d{4}-\d{2}-\d{2}$/.test(edt)) {
      return new Response(JSON.stringify({ success: false, error: 'SDT/EDT는 YYYY-MM-DD 형식이어야 합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', String(pnum));
    request.input('SDT', sdt);
    request.input('EDT', edt);

    const editableKeys = [
      'JHEMP',
      'P_DIAG',
      'P_PROBLEM',
      'P_WAY',
      'P_PLAN',
      'P_JUDGE',
      'P_TEXT_CNT',
      ...Array.from({ length: 20 }, (_, i) => `PSTD${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 37 }, (_, i) => `PCHK${String(i + 1).padStart(2, '0')}`),
      'PETC_1',
      'PETC_2',
      'PETC_3',
      'PETC_4',
      'PETC_5',
      'ETC',
    ];

    editableKeys.forEach((k) => {
      const v = pickBody(body, k, null);
      if (k === 'JHEMP') {
        const n = v == null || v === '' ? null : parseInt(String(v), 10);
        request.input(k, Number.isNaN(n) ? null : n);
        return;
      }
      request.input(k, v == null ? null : String(v));
    });

    const setSql = editableKeys
      .map((k) => `T.[${k}] = @${k}`)
      .concat(['T.[INDT] = GETDATE()'])
      .join(',\n          ');

    const insertCols = editableKeys.map((k) => `[${k}]`).concat(['[INDT]']).join(',');
    const insertVals = editableKeys.map((k) => `@${k}`).concat(['GETDATE()']).join(',');

    const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @SDT) AS SDT, CONVERT(date, @EDT) AS EDT) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[SDT]) = S.[SDT]
            AND CONVERT(date, T.[EDT]) = S.[EDT])
      WHEN MATCHED THEN
        UPDATE SET
          ${setSql}
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[PNUM],[SDT],[EDT],${insertCols})
        VALUES (@ANCD,@PNUM,CONVERT(date, @SDT),CONVERT(date, @EDT),${insertVals});
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F32010 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// F32010 삭제
// DELETE /api/f32010?pnum=PNUM&sdt=YYYY-MM-DD&edt=YYYY-MM-DD&ancd=ANCD(optional)
export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const sdtRaw = searchParams.get('sdt');
    const edtRaw = searchParams.get('edt');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum || !sdtRaw || !edtRaw) {
      return new Response(JSON.stringify({ success: false, error: 'pnum, sdt, edt 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sdt = normalizeYmd(sdtRaw);
    const edt = normalizeYmd(edtRaw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sdt) || !/^\d{4}-\d{2}-\d{2}$/.test(edt)) {
      return new Response(JSON.stringify({ success: false, error: 'sdt/edt는 YYYY-MM-DD 형식이어야 합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', String(pnum));
    request.input('SDT', sdt);
    request.input('EDT', edt);

    await request.query(`
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(date, [SDT]) = CONVERT(date, @SDT)
        AND CONVERT(date, [EDT]) = CONVERT(date, @EDT)
    `);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F32010 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

