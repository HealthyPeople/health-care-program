import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F33010]';

function toYmd(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (!s) return '';
  if (s.includes('T')) return s.split('T')[0].slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function ymdToDigits(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return s.includes('-') ? s.replace(/-/g, '') : s;
}

function normalizeSqlRow(row) {
  if (!row || typeof row !== 'object') return row;
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    const ku = String(k).toUpperCase();
    if (!(ku in o)) o[ku] = v;
  }
  return o;
}

function normalizePnumParam(p) {
  const s = String(p ?? '').trim();
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 단일 행을 API 응답 형태로 */
function mapRow(r) {
  const n = normalizeSqlRow(r);
  return {
    ...n,
    VDT: toYmd(n.VDT),
    DCUB_AREA: n.DCUB_AREA ?? '',
    DCUB_SIZE: n.DCUB_SIZE ?? '',
    DCUB_DEEP: n.DCUB_DEEP ?? '',
    DCUB_COLOR: n.DCUB_COLOR ?? '',
    DCUB_DISPO: n.DCUB_DISPO ?? '',
    MIMG: n.MIMG ?? '',
  };
}

export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const ancd = sp.get('ancd');
    const pnum = sp.get('pnum');
    const vdt = sp.get('vdt');
    const mode = (sp.get('mode') || '').trim();

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum) {
      return json({ success: false, error: 'pnum 파라미터가 필요합니다' }, 400);
    }

    const pool = await connPool;
    if (!pool) return json({ success: false, error: '데이터베이스 연결 실패' }, 500);

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', normalizePnumParam(pnum));

    if (mode === 'dates') {
      const q = `
        SELECT DISTINCT CONVERT(varchar(10), [VDT], 120) AS VDT
        FROM ${TABLE_NAME}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        ORDER BY VDT DESC
      `;
      const result = await request.query(q);
      const rows = (result.recordset || []).map((r) => ({ VDT: toYmd(r.VDT) }));
      return json({ success: true, data: rows });
    }

    if (vdt) {
      const d = ymdToDigits(vdt);
      if (!/^\d{8}$/.test(d)) {
        return json({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }, 400);
      }
      request.input('VDT', d);
      const q = `
        SELECT TOP (1)
          [ANCD],[PNUM],[VDT],
          [DCUB_AREA],[DCUB_SIZE],[DCUB_DEEP],[DCUB_COLOR],[DCUB_DISPO],[MIMG]
        FROM ${TABLE_NAME}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
          AND CONVERT(char(8), [VDT], 112) = @VDT
        ORDER BY [VDT] DESC
      `;
      const result = await request.query(q);
      const row = (result.recordset || [])[0];
      if (!row) return json({ success: true, data: null });
      return json({ success: true, data: mapRow(row) });
    }

    const q = `
      SELECT
        [ANCD],[PNUM],[VDT],
        [DCUB_AREA],[DCUB_SIZE],[DCUB_DEEP],[DCUB_COLOR],[DCUB_DISPO],[MIMG]
      FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
      ORDER BY [VDT] DESC
    `;
    const result = await request.query(q);
    const data = (result.recordset || []).map(mapRow);
    return json({ success: true, data, count: data.length });
  } catch (err) {
    console.error('F33010 조회 오류:', err);
    return json({ success: false, error: err.message, details: String(err) }, 500);
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

    if (!pnum || !vdt) {
      return json({ success: false, error: 'PNUM, VDT는 필수입니다' }, 400);
    }

    const vdtDigits = ymdToDigits(vdt);
    if (!/^\d{8}$/.test(vdtDigits)) {
      return json({ success: false, error: 'VDT 형식이 올바르지 않습니다 (yyyy-mm-dd)' }, 400);
    }

    const pool = await connPool;
    if (!pool) return json({ success: false, error: '데이터베이스 연결 실패' }, 500);

    const pick = (k, def = '') =>
      Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : def;

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', normalizePnumParam(pnum));
    request.input('VDT', vdtDigits);
    request.input('DCUB_AREA', pick('DCUB_AREA', pick('dcubArea', '')) ?? '');
    request.input('DCUB_SIZE', pick('DCUB_SIZE', pick('dcubSize', '')) ?? '');
    request.input('DCUB_DEEP', pick('DCUB_DEEP', pick('dcubDeep', '')) ?? '');
    request.input('DCUB_COLOR', pick('DCUB_COLOR', pick('dcubColor', '')) ?? '');
    request.input('DCUB_DISPO', pick('DCUB_DISPO', pick('dcubDispo', '')) ?? '');
    request.input('MIMG', pick('MIMG', pick('mimg', '')) ?? '');

    const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @VDT, 112) AS VDT) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[VDT]) = S.[VDT])
      WHEN MATCHED THEN
        UPDATE SET
          [DCUB_AREA] = @DCUB_AREA,
          [DCUB_SIZE] = @DCUB_SIZE,
          [DCUB_DEEP] = @DCUB_DEEP,
          [DCUB_COLOR] = @DCUB_COLOR,
          [DCUB_DISPO] = @DCUB_DISPO,
          [MIMG] = @MIMG
      WHEN NOT MATCHED THEN
        INSERT (
          [ANCD],[PNUM],[VDT],
          [DCUB_AREA],[DCUB_SIZE],[DCUB_DEEP],[DCUB_COLOR],[DCUB_DISPO],[MIMG]
        )
        VALUES (
          @ANCD,@PNUM,CONVERT(date, @VDT, 112),
          @DCUB_AREA,@DCUB_SIZE,@DCUB_DEEP,@DCUB_COLOR,@DCUB_DISPO,@MIMG
        );
    `;

    await request.query(query);

    return json({ success: true });
  } catch (err) {
    console.error('F33010 저장 오류:', err);
    return json({ success: false, error: err.message, details: String(err) }, 500);
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');
    const vdt = searchParams.get('vdt');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum || !vdt) {
      return json({ success: false, error: 'pnum, vdt 파라미터가 필요합니다' }, 400);
    }

    const vdtDigits = ymdToDigits(vdt);
    if (!/^\d{8}$/.test(vdtDigits)) {
      return json({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }, 400);
    }

    const pool = await connPool;
    if (!pool) return json({ success: false, error: '데이터베이스 연결 실패' }, 500);

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', normalizePnumParam(pnum));
    request.input('VDT', vdtDigits);

    const query = `
      DELETE FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
        AND CONVERT(char(8), [VDT], 112) = @VDT
    `;

    await request.query(query);

    return json({ success: true });
  } catch (err) {
    console.error('F33010 삭제 오류:', err);
    return json({ success: false, error: err.message, details: String(err) }, 500);
  }
}
