import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F32020]';

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
  // lower-case fallback (프론트에서 camelCase로 올 수도 있음)
  const alt = k.toLowerCase();
  if (alt !== k && Object.prototype.hasOwnProperty.call(body, alt)) return body[alt];
  return fallback;
}

// F32020 조회
// GET /api/f32020?pnum=PNUM&tdt=YYYY-MM-DD (optional)&ancd=ANCD(optional, 세션검증용)
// - tdt 없으면 해당 수급자의 전체 기록 목록(일자 내림차순)
// - tdt 있으면 해당 일자 1건 상세
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const tdtRaw = searchParams.get('tdt'); // 'YYYY-MM-DD' or 'YYYYMMDD'

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

    const tdt = String(tdtRaw || '').replace(/\D/g, '');
    if (tdt) {
      // detail
      if (!/^\d{8}$/.test(tdt)) {
        return new Response(JSON.stringify({ success: false, error: 'tdt는 YYYY-MM-DD 또는 YYYYMMDD 형식이어야 합니다' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      request.input('TDT', `${tdt.slice(0, 4)}-${tdt.slice(4, 6)}-${tdt.slice(6, 8)}`);

      const result = await request.query(`
        SELECT *
        FROM ${TABLE_NAME}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
          AND CONVERT(date, [TDT]) = CONVERT(date, @TDT)
      `);

      const row = result?.recordset?.[0] ? { ...result.recordset[0], TDT: normalizeYmd(result.recordset[0].TDT) } : null;
      return new Response(JSON.stringify({ success: true, data: row }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // list
    const result = await request.query(`
      SELECT *
      FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
      ORDER BY [TDT] DESC, [INDT] DESC
    `);

    const data = (result.recordset || []).map((r) => ({
      ...r,
      TDT: normalizeYmd(r.TDT),
      INDT: normalizeYmd(r.INDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F32020 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// F32020 저장(업서트)
// POST /api/f32020
// body: { PNUM, TDT, JHEMP?, TCHKxx/TVALxx/TTEXT_x/TETC_x/TETCVAL_x/ETC ... }
export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd'); // optional

    const gate = assertAnCdMatchesSession(req, ancdParam || null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const pnum = pickBody(body, 'PNUM', null);
    const tdtRaw = pickBody(body, 'TDT', null);

    if (!pnum || !tdtRaw) {
      return new Response(JSON.stringify({ success: false, error: 'PNUM, TDT는 필수입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tdtNorm = normalizeYmd(tdtRaw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tdtNorm)) {
      return new Response(JSON.stringify({ success: false, error: 'TDT는 YYYY-MM-DD 형식이어야 합니다' }), {
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
    request.input('TDT', tdtNorm);

    // 스키마 기반(이미지 참고): TCHK01~12, TCHK21~26, TCHK31~37 / TVAL 동일, TTEXT_1~4, TETC_1~5, TETCVAL_1~5, ETC, JHEMP
    const editableKeys = [
      'JHEMP',
      ...Array.from({ length: 12 }, (_, i) => `TCHK${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 12 }, (_, i) => `TVAL${String(i + 1).padStart(2, '0')}`),
      'TTEXT_1',
      ...Array.from({ length: 6 }, (_, i) => `TCHK${String(i + 21)}`),
      ...Array.from({ length: 6 }, (_, i) => `TVAL${String(i + 21)}`),
      'TTEXT_2',
      ...Array.from({ length: 7 }, (_, i) => `TCHK${String(i + 31)}`),
      ...Array.from({ length: 7 }, (_, i) => `TVAL${String(i + 31)}`),
      'TTEXT_3',
      'TETC_1','TETC_2','TETC_3','TETC_4','TETC_5',
      'TETCVAL_1','TETCVAL_2','TETCVAL_3','TETCVAL_4','TETCVAL_5',
      'TTEXT_4',
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
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @TDT) AS TDT) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[TDT]) = S.[TDT])
      WHEN MATCHED THEN
        UPDATE SET
          ${setSql}
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[PNUM],[TDT],${insertCols})
        VALUES (@ANCD,@PNUM,CONVERT(date, @TDT),${insertVals});
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F32020 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// F32020 삭제
// DELETE /api/f32020?pnum=PNUM&tdt=YYYY-MM-DD&ancd=ANCD(optional)
export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const tdtRaw = searchParams.get('tdt');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum || !tdtRaw) {
      return new Response(JSON.stringify({ success: false, error: 'pnum, tdt 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tdtNorm = normalizeYmd(tdtRaw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tdtNorm)) {
      return new Response(JSON.stringify({ success: false, error: 'tdt는 YYYY-MM-DD 형식이어야 합니다' }), {
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
    request.input('TDT', tdtNorm);

    await request.query(`
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(date, [TDT]) = CONVERT(date, @TDT)
    `);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F32020 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

