import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, getSessionAncd } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F00110]';

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

const SELECT_COLUMNS = `
  [ANCD],[ANNM],[ANGH],[ANSDT],[ANEDT],[ANZIP],[ANADD],[ANTEL],[ANFAX],[ANDOMAIN],[ANEMAIL],[ANHP],
  [MNM],[ANAMT],[TAXYN],[TAXNM],[TAXOWN],[TAXNUM],[TAXADD],[TAXJOB],[TAXJOB1],
  [TAXEMAIL1],[TAXEMAIL2],[TAXEMAIL3],[DEL],[ENYN],[PWDD],[INDT],[ETC],[SECYN],[MAXCNT],[D_LVL],
  [TRANS_GU],[TRANS_OBJ3],[SNM],[S_GU],[RDES],[B_EAMT],[B_ETAMT],
  [MSG_DUE_DD],[SRV_DESC]
`;

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd');

    const gate = assertAnCdMatchesSession(req, ancdParam);
    if (!gate.ok) return gate.response;

    const targetAncd = ancdParam ?? gate.sessionAncd;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const query = `
      SELECT TOP 1 ${SELECT_COLUMNS}
      FROM ${TABLE_NAME}
      WHERE [ANCD] = @sessionAncd
        AND (ISNULL([DEL], '') <> 'D')
    `;

    const result = await pool.request().input('sessionAncd', targetAncd).query(query);
    const row = result.recordset?.[0] ?? null;

    if (!row) {
      return new Response(JSON.stringify({ success: true, data: [], count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalized = {
      ...row,
      ANSDT: normalizeYmd(row.ANSDT),
      ANEDT: normalizeYmd(row.ANEDT),
      INDT: normalizeYmd(row.INDT),
    };

    return new Response(JSON.stringify({ success: true, data: [normalized], count: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F00110 테이블 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(req) {
  try {
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return new Response(JSON.stringify({ success: false, error: '로그인이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const gate = assertAnCdMatchesSession(req, body?.ANCD ?? sessionAncd);
    if (!gate.ok) return gate.response;

    const ancd = body?.ANCD ?? gate.sessionAncd;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pick = (k) => (Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : undefined);

    const stringFields = [
      'ANNM', 'ANGH', 'ANZIP', 'ANADD', 'ANTEL', 'ANFAX', 'ANDOMAIN', 'ANEMAIL', 'ANHP', 'MNM',
      'TAXYN', 'TAXNM', 'TAXOWN', 'TAXNUM', 'TAXADD', 'TAXJOB', 'TAXJOB1',
      'TAXEMAIL1', 'TAXEMAIL2', 'TAXEMAIL3', 'ETC', 'SECYN', 'TRANS_GU', 'TRANS_OBJ3',
      'SNM', 'S_GU', 'RDES', 'SRV_DESC',
    ];
    const intFields = ['ANAMT', 'MAXCNT', 'D_LVL', 'PWDD', 'MSG_DUE_DD', 'B_EAMT', 'B_ETAMT'];
    const dateFields = ['ANSDT', 'ANEDT'];

    const request = pool.request();
    request.input('ANCD', ancd);

    const setParts = [];

    stringFields.forEach((k) => {
      const v = pick(k);
      if (v !== undefined) {
        request.input(k, v == null || v === '' ? null : String(v));
        setParts.push(`[${k}] = @${k}`);
      }
    });

    intFields.forEach((k) => {
      const v = pick(k);
      if (v !== undefined) {
        const n = v === '' || v == null ? null : parseInt(String(v), 10);
        request.input(k, Number.isNaN(n) ? null : n);
        setParts.push(`[${k}] = @${k}`);
      }
    });

    dateFields.forEach((k) => {
      const v = pick(k);
      if (v !== undefined) {
        const ymd = normalizeYmd(v);
        request.input(k, ymd);
        setParts.push(`[${k}] = ${ymd ? `CONVERT(date, @${k})` : 'NULL'}`);
      }
    });

    if (setParts.length === 0) {
      return new Response(JSON.stringify({ success: false, error: '수정할 항목이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const query = `
      UPDATE ${TABLE_NAME}
      SET ${setParts.join(',\n          ')}
      WHERE [ANCD] = @ANCD
    `;

    const result = await request.query(query);
    const affected = result.rowsAffected?.[0] ?? 0;

    if (affected === 0) {
      return new Response(JSON.stringify({ success: false, error: '해당 고객(ANCD) 정보를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F00110 수정 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** 레거시: 동적 쿼리 POST */
export async function POST(req) {
  try {
    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { query, params } = body;

    if (!query) {
      return new Response(JSON.stringify({ success: false, error: '쿼리가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    if (params && typeof params === 'object') {
      Object.keys(params).forEach((key) => {
        request.input(key, params[key]);
      });
    }

    const result = await request.query(query);
    return new Response(
      JSON.stringify({ success: true, data: result.recordset, count: result.recordset.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('F00110 쿼리 실행 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
