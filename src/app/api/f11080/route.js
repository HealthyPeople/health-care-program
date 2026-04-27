import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F11080]';

function normalizeYmd(v) {
  if (!v) return '';
  const s = String(v);
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s.slice(0, 10);
}

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    if (!ancd || !pnum) {
      return new Response(
        JSON.stringify({ success: false, error: 'ANCD와 PNUM 파라미터가 필요합니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('ancd', ancd);
    request.input('pnum', String(pnum));

    const query = `
      SELECT
        [ANCD],
        [PNUM],
        [EMDT],
        [EMPL],
        [EMTM],
        [EMDES1],
        [EMDES2],
        [EMDES3],
        [EMHOS],
        [EMETC],
        [EMRES],
        [EMEMP],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM]
      FROM ${TABLE_NAME}
      WHERE [ANCD] = @ancd
        AND CAST([PNUM] AS VARCHAR) = CAST(@pnum AS VARCHAR)
      ORDER BY [EMDT] DESC, [INDT] DESC
    `;

    const result = await request.query(query);
    const data = (result.recordset || []).map((r) => ({
      ...r,
      EMDT: normalizeYmd(r.EMDT),
      INDT: normalizeYmd(r.INDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F11080 테이블 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd');

    const gate = assertAnCdMatchesSession(req, ancdParam);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const ancd = body?.ANCD ?? ancdParam ?? gate.sessionAncd;
    const pnum = body?.PNUM;
    const emdt = body?.EMDT;

    if (!ancd || !pnum || !emdt) {
      return new Response(JSON.stringify({ success: false, error: 'ANCD, PNUM, EMDT는 필수입니다' }), {
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
    request.input('ANCD', ancd);
    request.input('PNUM', String(pnum));
    request.input('EMDT', String(emdt).slice(0, 10)); // 'YYYY-MM-DD'

    const pick = (k) => (Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : null);

    const editableKeys = [
      'EMPL',
      'EMTM',
      'EMDES1',
      'EMDES2',
      'EMDES3',
      'EMHOS',
      'EMETC',
      'EMRES',
      'EMEMP',
      'ETC',
      'INEMPNO',
      'INEMPNM',
    ];

    editableKeys.forEach((k) => request.input(k, pick(k) == null ? null : String(pick(k))));

    const setSql = editableKeys
      .map((k) => `T.[${k}] = @${k}`)
      .concat(['T.[INDT] = GETDATE()'])
      .join(',\n          ');

    const insertCols = editableKeys.map((k) => `[${k}]`).concat(['[INDT]']).join(',');
    const insertVals = editableKeys.map((k) => `@${k}`).concat(['GETDATE()']).join(',');

    const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @EMDT) AS EMDT) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[EMDT]) = S.[EMDT])
      WHEN MATCHED THEN
        UPDATE SET
          ${setSql}
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[PNUM],[EMDT],${insertCols})
        VALUES (@ANCD,@PNUM,CONVERT(date, @EMDT),${insertVals});
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F11080 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const emdt = searchParams.get('emdt');

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    if (!ancd || !pnum || !emdt) {
      return new Response(JSON.stringify({ success: false, error: 'ancd, pnum, emdt 파라미터가 필요합니다' }), {
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
    request.input('ANCD', ancd);
    request.input('PNUM', String(pnum));
    request.input('EMDT', String(emdt).slice(0, 10));

    const query = `
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(date, [EMDT]) = CONVERT(date, @EMDT)
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F11080 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

