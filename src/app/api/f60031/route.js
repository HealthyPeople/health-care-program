import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F60031]';

function normalizeYmd(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (s.includes('T')) return s.split('T')[0].slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const seq = searchParams.get('seq');
    const dAncd = searchParams.get('dAncd');

    if (!seq) {
      return new Response(JSON.stringify({ success: false, error: 'seq 파라미터가 필요합니다' }), {
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
    request.input('SEQ', parseInt(String(seq), 10));

    let where = 'WHERE [SEQ] = @SEQ';
    if (dAncd) {
      request.input('D_ANCD', parseInt(String(dAncd), 10));
      where += ' AND [D_ANCD] = @D_ANCD';
    }

    const result = await request.query(`
      SELECT [SEQ], [D_ANCD], [CONF_FLAG], [CONF_DATE]
      FROM ${TABLE_NAME}
      ${where}
      ORDER BY [D_ANCD]
    `);

    const data = (result.recordset || []).map((r) => ({
      ...r,
      CONF_DATE: normalizeYmd(r.CONF_DATE),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60031 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const seq = body?.SEQ;
    const dAncd = body?.D_ANCD;

    if (seq == null || dAncd == null) {
      return new Response(JSON.stringify({ success: false, error: 'SEQ, D_ANCD는 필수입니다' }), {
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
    request.input('SEQ', parseInt(String(seq), 10));
    request.input('D_ANCD', parseInt(String(dAncd), 10));
    request.input('CONF_FLAG', body?.CONF_FLAG != null ? String(body.CONF_FLAG).slice(0, 1) : '0');
    request.input('CONF_DATE', body?.CONF_DATE ? normalizeYmd(body.CONF_DATE) : null);

    await request.query(`
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @SEQ AS SEQ, @D_ANCD AS D_ANCD) AS S
        ON (T.[SEQ] = S.[SEQ] AND T.[D_ANCD] = S.[D_ANCD])
      WHEN MATCHED THEN
        UPDATE SET
          [CONF_FLAG] = @CONF_FLAG,
          [CONF_DATE] = ${body?.CONF_DATE ? 'CONVERT(date, @CONF_DATE)' : 'NULL'}
      WHEN NOT MATCHED THEN
        INSERT ([SEQ], [D_ANCD], [CONF_FLAG], [CONF_DATE])
        VALUES (@SEQ, @D_ANCD, @CONF_FLAG, ${body?.CONF_DATE ? 'CONVERT(date, @CONF_DATE)' : 'NULL'});
    `);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60031 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const seq = searchParams.get('seq');
    const dAncd = searchParams.get('dAncd');

    if (!seq) {
      return new Response(JSON.stringify({ success: false, error: 'seq 파라미터가 필요합니다' }), {
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
    request.input('SEQ', parseInt(String(seq), 10));

    let query = `DELETE FROM ${TABLE_NAME} WHERE [SEQ] = @SEQ`;
    if (dAncd) {
      request.input('D_ANCD', parseInt(String(dAncd), 10));
      query += ' AND [D_ANCD] = @D_ANCD';
    }

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60031 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
