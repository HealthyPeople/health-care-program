import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const DB_NAME = '돌봄시설DB';
const TABLE_NAME = 'F51010';
const TABLE_FULL = `[${DB_NAME}].[dbo].[${TABLE_NAME}]`;

function normalizeYmd(v) {
  if (!v) return '';
  const s = String(v);
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s.slice(0, 10);
}

function ymdOrThrow(v, fieldName) {
  const ymd = normalizeYmd(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`${fieldName}는 YYYY-MM-DD 형식이어야 합니다`);
  }
  return ymd;
}

async function getColumnNameSet(pool) {
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM [${DB_NAME}].INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = '${TABLE_NAME}'
  `);
  const set = new Set();
  (result.recordset || []).forEach((r) => set.add(String(r.COLUMN_NAME)));
  return set;
}

function pickBody(body, k, fallback = null) {
  if (!body || typeof body !== 'object') return fallback;
  if (Object.prototype.hasOwnProperty.call(body, k)) return body[k];
  const alt = k.toLowerCase();
  if (alt !== k && Object.prototype.hasOwnProperty.call(body, alt)) return body[alt];
  return fallback;
}

// GET /api/f51010?pnum=PNUM&evaldt=YYYY-MM-DD(optional)
// - evaldt 없으면 목록
// - evaldt 있으면 상세 1건
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const evaldtRaw = searchParams.get('evaldt');

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

    const evaldt = normalizeYmd(evaldtRaw);
    if (evaldt) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(evaldt)) {
        return new Response(JSON.stringify({ success: false, error: 'evaldt는 YYYY-MM-DD 형식이어야 합니다' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      request.input('EVALDT', evaldt);
      const result = await request.query(`
        SELECT *
        FROM ${TABLE_FULL}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
          AND CONVERT(date, [EVALDT]) = CONVERT(date, @EVALDT)
      `);
      const row = result?.recordset?.[0] || null;
      const data = row ? { ...row, EVALDT: normalizeYmd(row.EVALDT), INDT: normalizeYmd(row.INDT) } : null;
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await request.query(`
      SELECT *
      FROM ${TABLE_FULL}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
      ORDER BY [EVALDT] DESC, [INDT] DESC
    `);
    const data = (result.recordset || []).map((r) => ({
      ...r,
      EVALDT: normalizeYmd(r.EVALDT),
      INDT: normalizeYmd(r.INDT),
    }));
    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F51010 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/f51010  (업서트)
// body: { PNUM, EVALDT, ...컬럼들 }
export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd'); // optional

    const gate = assertAnCdMatchesSession(req, ancdParam || null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const pnum = pickBody(body, 'PNUM', null);
    const evaldtRaw = pickBody(body, 'EVALDT', null);

    if (!pnum || !evaldtRaw) {
      return new Response(JSON.stringify({ success: false, error: 'PNUM, EVALDT는 필수입니다' }), {
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

    const columnSet = await getColumnNameSet(pool);

    // 키 컬럼(테이블에 존재한다고 가정)
    const keyCols = ['ANCD', 'PNUM', 'EVALDT'].filter((c) => columnSet.has(c));
    if (keyCols.length < 2) {
      return new Response(JSON.stringify({ success: false, error: 'F51010 키 컬럼(ANCD/PNUM/EVALDT)을 확인할 수 없습니다' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', String(pnum));
    if (columnSet.has('EVALDT')) {
      request.input('EVALDT', ymdOrThrow(evaldtRaw, 'EVALDT'));
    }

    const bodyKeys = Object.keys(body || {});
    const editableKeys = bodyKeys
      .map((k) => String(k))
      .filter((k) => columnSet.has(k))
      .filter((k) => !['ANCD', 'PNUM', 'EVALDT', 'INDT'].includes(k));

    // INDT는 가능하면 서버에서 갱신
    const hasIndt = columnSet.has('INDT');

    editableKeys.forEach((k) => {
      const v = pickBody(body, k, null);
      // 모든 값은 문자열로 저장(필요시 DB에서 암묵 변환)
      request.input(k, v == null ? null : String(v));
    });

    const setSqlParts = editableKeys.map((k) => `T.[${k}] = @${k}`);
    if (hasIndt) setSqlParts.push('T.[INDT] = GETDATE()');
    const setSql = setSqlParts.join(',\n          ');

    const insertCols = editableKeys.map((k) => `[${k}]`).concat(hasIndt ? ['[INDT]'] : []).join(',');
    const insertVals = editableKeys.map((k) => `@${k}`).concat(hasIndt ? ['GETDATE()'] : []).join(',');

    const usingSelect = [
      columnSet.has('ANCD') ? '@ANCD AS ANCD' : null,
      columnSet.has('PNUM') ? '@PNUM AS PNUM' : null,
      columnSet.has('EVALDT') ? 'CONVERT(date, @EVALDT) AS EVALDT' : null,
    ].filter(Boolean).join(', ');

    const onParts = [];
    if (columnSet.has('ANCD')) onParts.push('T.[ANCD] = S.[ANCD]');
    if (columnSet.has('PNUM')) onParts.push('CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)');
    if (columnSet.has('EVALDT')) onParts.push('CONVERT(date, T.[EVALDT]) = S.[EVALDT]');

    const insertKeyCols = keyCols.map((k) => `[${k}]`).join(',');
    const insertKeyVals = keyCols.map((k) => (k === 'EVALDT' ? 'CONVERT(date, @EVALDT)' : `@${k}`)).join(',');

    const query = `
      MERGE ${TABLE_FULL} AS T
      USING (SELECT ${usingSelect}) AS S
        ON (${onParts.join(' AND ')})
      WHEN MATCHED THEN
        UPDATE SET
          ${setSql || (hasIndt ? 'T.[INDT] = GETDATE()' : 'T.[PNUM] = T.[PNUM]')}
      WHEN NOT MATCHED THEN
        INSERT (${insertKeyCols}${insertCols ? `,${insertCols}` : ''})
        VALUES (${insertKeyVals}${insertVals ? `,${insertVals}` : ''});
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F51010 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/f51010?pnum=PNUM&evaldt=YYYY-MM-DD
export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const evaldtRaw = searchParams.get('evaldt');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum || !evaldtRaw) {
      return new Response(JSON.stringify({ success: false, error: 'pnum, evaldt 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const evaldt = ymdOrThrow(evaldtRaw, 'evaldt');

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
    request.input('EVALDT', evaldt);

    await request.query(`
      DELETE FROM ${TABLE_FULL}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(date, [EVALDT]) = CONVERT(date, @EVALDT)
    `);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F51010 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

