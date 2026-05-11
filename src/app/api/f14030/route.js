import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F14030]';

function truncStr(v, max) {
  if (v == null) return '';
  const s = String(v);
  return s.length <= max ? s : s.slice(0, max);
}

function truncNullable(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length <= max ? s : s.slice(0, max);
}

function normalizeYmd(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

function normalizeTime5(v) {
  if (v == null || v === '') return '';
  let s = String(v).trim().replace(/\s/g, '');
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':');
    s = `${String(parseInt(h, 10)).padStart(2, '0')}:${m}`;
  }
  if (s.length > 5) s = s.slice(0, 5);
  return s;
}

function inputDate(request, name, ymd) {
  const n = normalizeYmd(ymd);
  if (n === null) {
    request.input(name, sql.Date, null);
  } else {
    request.input(name, sql.Date, new Date(`${n}T00:00:00`));
  }
}

const SELECT_COLS = `
  [ANCD], [DSEQ], [SVDT], [SVSTM], [SVETM], [SVGU], [SVDIC], [SVDES],
  [PGMAN0], [PGADD], [PGMAN1], [PGMAN2], [PGOJ], [PGJB], [PGDES],
  [INDT], [ETC], [INEMPNO], [INEMPNM], [PGSEQ], [MIMG], [PG_GU], [PG_GU_NM], [SVDIC_SUB]
`;

// GET /api/f14030?startDate=yyyy-mm-dd&endDate=yyyy-mm-dd
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ancd = searchParams.get('ancd');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const s = normalizeYmd(startDate);
    const e = normalizeYmd(endDate);
    if (!s || !e) {
      return new Response(JSON.stringify({ success: false, error: 'startDate, endDate(yyyy-mm-dd)가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (s > e) {
      return new Response(JSON.stringify({ success: false, error: '시작일이 종료일보다 클 수 없습니다.' }), {
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
    request.input('sessionAncd', gate.sessionAncd);
    inputDate(request, 'startDate', s);
    inputDate(request, 'endDate', e);

    /**
     * SVDT는 `2025-09-10` 형태(varchar) 또는 date/datetime 컬럼으로 저장됨 → DATE로 통일해 기간 비교.
     * 행 수 제한(TOP/OFFSET) 없음 — 기간 내 전체 행 반환. 타임아웃은 DB 풀 requestTimeout을 따름.
     */
    const result = await request.query(`
      SELECT ${SELECT_COLS}
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND TRY_CONVERT(DATE, LTRIM(RTRIM([SVDT]))) IS NOT NULL
        AND TRY_CONVERT(DATE, LTRIM(RTRIM([SVDT]))) >= CAST(@startDate AS DATE)
        AND TRY_CONVERT(DATE, LTRIM(RTRIM([SVDT]))) <= CAST(@endDate AS DATE)
      ORDER BY TRY_CONVERT(DATE, LTRIM(RTRIM([SVDT]))) DESC, [SVSTM] ASC, [DSEQ] ASC
    `);

    return new Response(
      JSON.stringify({
        success: true,
        data: result.recordset || [],
        count: result.recordset ? result.recordset.length : 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('F14030 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST { action: 'create'|'save'|'delete', ...fields }
export async function POST(req) {
  try {
    const gate = assertAnCdMatchesSession(req, null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const action =
      body.action === 'delete' ? 'delete' : body.action === 'create' ? 'create' : 'save';

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const dseq = parseInt(String(body.dseq ?? body.DSEQ ?? ''), 10);
      if (Number.isNaN(dseq)) {
        return new Response(JSON.stringify({ success: false, error: '삭제할 DSEQ가 필요합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const rq = pool.request();
      rq.input('ANCD', gate.sessionAncd);
      rq.input('DSEQ', dseq);
      const del = await rq.query(`DELETE FROM ${TABLE} WHERE [ANCD] = @ANCD AND [DSEQ] = @DSEQ`);
      if (!del.rowsAffected?.[0]) {
        return new Response(JSON.stringify({ success: false, error: '삭제할 데이터가 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, action: 'delete' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SVDT = normalizeYmd(body.SVDT ?? body.svdT);
    if (!SVDT) {
      return new Response(JSON.stringify({ success: false, error: '서비스일자(SVDT)가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SVSTM = truncStr(normalizeTime5(body.SVSTM ?? body.svstm), 5);
    const SVETM = truncStr(normalizeTime5(body.SVETM ?? body.svetm), 5);
    const SVGU = truncStr(body.SVGU ?? body.svgu ?? '', 2);
    const SVDIC = truncStr(body.SVDIC ?? body.svdic ?? '', 200);
    const SVDES = truncStr(body.SVDES ?? body.svdes ?? '', 2000);
    const PGMAN0 = truncStr(body.PGMAN0 ?? body.pgman0 ?? '', 200);
    const PGADD = truncStr(body.PGADD ?? body.pgadd ?? '', 50);
    const PGMAN1 = truncStr(body.PGMAN1 ?? body.pgman1 ?? '', 20);
    const PGMAN2 = truncStr(body.PGMAN2 ?? body.pgman2 ?? '', 20);
    const PGOJ = truncStr(body.PGOJ ?? body.pgoj ?? '', 500);
    const PGJB = truncStr(body.PGJB ?? body.pgjb ?? '', 200);
    const PGDES = truncStr(body.PGDES ?? body.pgdes ?? '', 1000);
    const ETC = truncStr(body.ETC ?? body.etc ?? '', 1000);
    let INEMPNO = body.INEMPNO ?? body.inempno;
    if (INEMPNO !== null && INEMPNO !== undefined && INEMPNO !== '') {
      const n = parseInt(String(INEMPNO), 10);
      INEMPNO = Number.isNaN(n) ? null : n;
    } else {
      INEMPNO = null;
    }
    const INEMPNM = truncNullable(body.INEMPNM ?? body.inempnm, 100);
    let PGSEQ = body.PGSEQ ?? body.pgseq;
    if (PGSEQ !== null && PGSEQ !== undefined && PGSEQ !== '') {
      const n = parseInt(String(PGSEQ), 10);
      PGSEQ = Number.isNaN(n) ? null : n;
    } else {
      PGSEQ = null;
    }
    const MIMG = truncNullable(body.MIMG ?? body.mimg, 100);
    const PG_GU = truncNullable(body.PG_GU ?? body.pg_gu, 10);
    const PG_GU_NM = truncNullable(body.PG_GU_NM ?? body.pg_gu_nm, 50);
    const SVDIC_SUB = truncNullable(body.SVDIC_SUB ?? body.svdic_sub, 50);

    const today = new Date();
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (action === 'create') {
      const maxR = await pool
        .request()
        .input('ANCD', gate.sessionAncd)
        .query(`SELECT ISNULL(MAX([DSEQ]), 0) + 1 AS NEXTSEQ FROM ${TABLE} WHERE [ANCD] = @ANCD`);
      const nextSeq = parseInt(String(maxR.recordset?.[0]?.NEXTSEQ ?? '1'), 10);

      const ins = pool.request();
      ins.input('ANCD', gate.sessionAncd);
      ins.input('DSEQ', nextSeq);
      inputDate(ins, 'SVDT', SVDT);
      ins.input('SVSTM', SVSTM || '');
      ins.input('SVETM', SVETM || '');
      ins.input('SVGU', SVGU || '');
      ins.input('SVDIC', SVDIC);
      ins.input('SVDES', SVDES);
      ins.input('PGMAN0', PGMAN0);
      ins.input('PGADD', PGADD);
      ins.input('PGMAN1', PGMAN1);
      ins.input('PGMAN2', PGMAN2);
      ins.input('PGOJ', PGOJ);
      ins.input('PGJB', PGJB);
      ins.input('PGDES', PGDES);
      inputDate(ins, 'INDT', body.INDT ?? body.indt ?? todayYmd);
      ins.input('ETC', ETC);
      ins.input('INEMPNO', sql.Int, INEMPNO);
      ins.input('INEMPNM', sql.NVarChar(100), INEMPNM);
      ins.input('PGSEQ', sql.Int, PGSEQ);
      ins.input('MIMG', sql.NVarChar(100), MIMG);
      ins.input('PG_GU', sql.NVarChar(10), PG_GU);
      ins.input('PG_GU_NM', sql.NVarChar(50), PG_GU_NM);
      ins.input('SVDIC_SUB', sql.NVarChar(50), SVDIC_SUB);

      await ins.query(`
        INSERT INTO ${TABLE} (
          [ANCD],[DSEQ],[SVDT],[SVSTM],[SVETM],[SVGU],[SVDIC],[SVDES],
          [PGMAN0],[PGADD],[PGMAN1],[PGMAN2],[PGOJ],[PGJB],[PGDES],
          [INDT],[ETC],[INEMPNO],[INEMPNM],[PGSEQ],[MIMG],[PG_GU],[PG_GU_NM],[SVDIC_SUB]
        ) VALUES (
          @ANCD,@DSEQ,@SVDT,@SVSTM,@SVETM,@SVGU,@SVDIC,@SVDES,
          @PGMAN0,@PGADD,@PGMAN1,@PGMAN2,@PGOJ,@PGJB,@PGDES,
          @INDT,@ETC,@INEMPNO,@INEMPNM,@PGSEQ,@MIMG,@PG_GU,@PG_GU_NM,@SVDIC_SUB
        )
      `);

      return new Response(JSON.stringify({ success: true, action: 'create', dseq: nextSeq }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dseq = parseInt(String(body.dseq ?? body.DSEQ ?? ''), 10);
    if (Number.isNaN(dseq)) {
      return new Response(JSON.stringify({ success: false, error: '저장 시 dseq가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const up = pool.request();
    up.input('ANCD', gate.sessionAncd);
    up.input('DSEQ', dseq);
    inputDate(up, 'SVDT', SVDT);
    up.input('SVSTM', SVSTM || '');
    up.input('SVETM', SVETM || '');
    up.input('SVGU', SVGU || '');
    up.input('SVDIC', SVDIC);
    up.input('SVDES', SVDES);
    up.input('PGMAN0', PGMAN0);
    up.input('PGADD', PGADD);
    up.input('PGMAN1', PGMAN1);
    up.input('PGMAN2', PGMAN2);
    up.input('PGOJ', PGOJ);
    up.input('PGJB', PGJB);
    up.input('PGDES', PGDES);
    inputDate(up, 'INDT', body.INDT ?? body.indt ?? todayYmd);
    up.input('ETC', ETC);
    up.input('INEMPNO', sql.Int, INEMPNO);
    up.input('INEMPNM', sql.NVarChar(100), INEMPNM);
    up.input('PGSEQ', sql.Int, PGSEQ);
    up.input('MIMG', sql.NVarChar(100), MIMG);
    up.input('PG_GU', sql.NVarChar(10), PG_GU);
    up.input('PG_GU_NM', sql.NVarChar(50), PG_GU_NM);
    up.input('SVDIC_SUB', sql.NVarChar(50), SVDIC_SUB);

    const upd = await up.query(`
      UPDATE ${TABLE}
      SET
        [SVDT] = @SVDT,
        [SVSTM] = @SVSTM,
        [SVETM] = @SVETM,
        [SVGU] = @SVGU,
        [SVDIC] = @SVDIC,
        [SVDES] = @SVDES,
        [PGMAN0] = @PGMAN0,
        [PGADD] = @PGADD,
        [PGMAN1] = @PGMAN1,
        [PGMAN2] = @PGMAN2,
        [PGOJ] = @PGOJ,
        [PGJB] = @PGJB,
        [PGDES] = @PGDES,
        [INDT] = @INDT,
        [ETC] = @ETC,
        [INEMPNO] = @INEMPNO,
        [INEMPNM] = @INEMPNM,
        [PGSEQ] = @PGSEQ,
        [MIMG] = @MIMG,
        [PG_GU] = @PG_GU,
        [PG_GU_NM] = @PG_GU_NM,
        [SVDIC_SUB] = @SVDIC_SUB
      WHERE [ANCD] = @ANCD AND [DSEQ] = @DSEQ
    `);

    if (!upd.rowsAffected?.[0]) {
      return new Response(JSON.stringify({ success: false, error: '해당 일련번호의 데이터가 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, action: 'save', dseq }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F14030 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
