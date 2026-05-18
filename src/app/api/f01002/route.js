import { connPool } from '../../../config/server';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F01002]';

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
    const code = searchParams.get('code');
    const ucd = searchParams.get('ucd');
    const includeDeleted = searchParams.get('includeDeleted') === '1';

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    let where = 'WHERE 1=1';

    if (code) {
      request.input('CODE', String(code).trim().slice(0, 2));
      where += ' AND [CODE] = @CODE';
    }
    if (ucd) {
      request.input('UCD', String(ucd).trim().slice(0, 2));
      where += ' AND [UCD] = @UCD';
    }
    if (!includeDeleted) {
      where += " AND ISNULL([DEL], '') <> 'D'";
    }

    const query = `
      SELECT [CODE],[UCD],[DSC1],[DSC2],[SEQ],[DEL],[INDT],[URDT],[ETC]
      FROM ${TABLE_NAME}
      ${where}
      ORDER BY [CODE], ISNULL([SEQ], 9999), [UCD]
    `;

    const result = await request.query(query);
    const data = (result.recordset || []).map((r) => ({
      ...r,
      INDT: normalizeYmd(r.INDT),
      URDT: normalizeYmd(r.URDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F01002 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = body?.CODE;
    const ucd = body?.UCD;

    if (!code || !ucd) {
      return new Response(JSON.stringify({ success: false, error: 'CODE, UCD는 필수입니다' }), {
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
    request.input('CODE', String(code).trim().slice(0, 2));
    request.input('UCD', String(ucd).trim().slice(0, 2));

    const pick = (k) => (Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : null);
    ['DSC1', 'DSC2', 'ETC', 'DEL'].forEach((k) => {
      request.input(k, pick(k) == null ? null : String(pick(k)));
    });
    const seq = pick('SEQ');
    request.input('SEQ', seq == null || seq === '' ? null : parseInt(String(seq), 10));

    const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @CODE AS CODE, @UCD AS UCD) AS S
        ON (T.[CODE] = S.[CODE] AND T.[UCD] = S.[UCD])
      WHEN MATCHED THEN
        UPDATE SET
          [DSC1] = @DSC1,
          [DSC2] = @DSC2,
          [SEQ] = @SEQ,
          [ETC] = @ETC,
          [DEL] = ISNULL(@DEL, T.[DEL]),
          [URDT] = CONVERT(date, GETDATE())
      WHEN NOT MATCHED THEN
        INSERT ([CODE],[UCD],[DSC1],[DSC2],[SEQ],[ETC],[DEL],[INDT],[URDT])
        VALUES (@CODE, @UCD, @DSC1, @DSC2, @SEQ, @ETC, ISNULL(@DEL, ' '), CONVERT(date, GETDATE()), CONVERT(date, GETDATE()));
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F01002 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const ucd = searchParams.get('ucd');

    if (!code || !ucd) {
      return new Response(JSON.stringify({ success: false, error: 'code, ucd 파라미터가 필요합니다' }), {
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
    request.input('CODE', String(code).trim().slice(0, 2));
    request.input('UCD', String(ucd).trim().slice(0, 2));

    await request.query(`
      UPDATE ${TABLE_NAME}
      SET [DEL] = 'D', [URDT] = CONVERT(date, GETDATE())
      WHERE [CODE] = @CODE AND [UCD] = @UCD
    `);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F01002 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
