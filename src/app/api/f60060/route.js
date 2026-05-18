import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F60060]';

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
  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return s.split('T')[0].slice(0, 10);
  }
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

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    request.input('ANCD', ancd ?? gate.sessionAncd);

    let where = 'WHERE [ANCD] = @ANCD';
    if (startDate) {
      request.input('START', String(startDate).slice(0, 10));
      where += ' AND CONVERT(date, [MDT]) >= CONVERT(date, @START)';
    }
    if (endDate) {
      request.input('END', String(endDate).slice(0, 10));
      where += ' AND CONVERT(date, [MDT]) <= CONVERT(date, @END)';
    }

    const query = `
      SELECT
        [ANCD],
        [MDT],
        [STM],
        [ETM],
        [MPL],
        [MDOC],
        [MDES],
        [MNM],
        [MIMG],
        [MODES],
        [ETC],
        [URDT],
        [INEMPNO],
        [INEMPNM],
        [TRAINER_NM]
      FROM ${TABLE_NAME}
      ${where}
      ORDER BY [MDT] DESC, [URDT] DESC
    `;

    const result = await request.query(query);
    const data = (result.recordset || []).map((r) => ({
      ...r,
      MDT: normalizeYmd(r.MDT),
      URDT: normalizeYmd(r.URDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60060 테이블 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
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
    const mdt = body?.MDT;

    if (!ancd || !mdt) {
      return new Response(JSON.stringify({ success: false, error: 'ANCD, MDT는 필수입니다' }), {
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
    request.input('ANCD', ancd);
    request.input('MDT', String(mdt).slice(0, 10));

    const pick = (k) => (Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : null);

    const editableKeys = [
      'STM',
      'ETM',
      'MPL',
      'MDOC',
      'MDES',
      'MNM',
      'MIMG',
      'MODES',
      'ETC',
      'INEMPNO',
      'INEMPNM',
      'TRAINER_NM',
    ];

    editableKeys.forEach((k) => request.input(k, pick(k) == null ? null : String(pick(k))));

    const setSql = editableKeys
      .map((k) => `T.[${k}] = @${k}`)
      .concat(['T.[URDT] = GETDATE()'])
      .join(',\n          ');

    const insertCols = editableKeys.map((k) => `[${k}]`).concat(['[URDT]']).join(',');
    const insertVals = editableKeys.map((k) => `@${k}`).concat(['GETDATE()']).join(',');

    const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, CONVERT(date, @MDT) AS MDT) AS S
        ON (T.[ANCD] = S.[ANCD] AND CONVERT(date, T.[MDT]) = S.[MDT])
      WHEN MATCHED THEN
        UPDATE SET
          ${setSql}
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[MDT],${insertCols})
        VALUES (@ANCD,CONVERT(date, @MDT),${insertVals});
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60060 저장 오류:', err);
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
    const mdt = searchParams.get('mdt');

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    if (!ancd || !mdt) {
      return new Response(JSON.stringify({ success: false, error: 'ancd, mdt 파라미터가 필요합니다' }), {
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
    request.input('ANCD', ancd);
    request.input('MDT', String(mdt).slice(0, 10));

    const query = `
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CONVERT(date, [MDT]) = CONVERT(date, @MDT)
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60060 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
