import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F14050]';

function truncText(v, max) {
  if (v == null) return '';
  const s = String(v);
  return s.length <= max ? s : s.slice(0, max);
}

function truncName(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length <= max ? s : s.slice(0, max);
}

/** yyyy-mm-dd 또는 yyyymmdd → yyyy-mm-dd, 불가 시 null */
function normalizeYmd(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

function inputDate(request, name, ymd) {
  const n = normalizeYmd(ymd);
  if (n === null) {
    request.input(name, sql.Date, null);
  } else {
    request.input(name, sql.Date, new Date(`${n}T00:00:00`));
  }
}

// GET /api/f14050?pnum= — 세션 ANCD + PNUM별 전체 행 (JHSEQ 순)
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pnum = searchParams.get('pnum');
    const ancd = searchParams.get('ancd');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum || String(pnum).trim() === '') {
      return new Response(JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다.' }), {
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
    request.input('pnum', String(pnum).trim());

    const result = await request.query(`
      SELECT
        [ANCD],
        [PNUM],
        [JHSEQ],
        [JHDT],
        [JHDES],
        [GUDES],
        [STDT],
        [STDES],
        [INEMPNO],
        [INEMPNM]
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND CAST([PNUM] AS VARCHAR(32)) = CAST(@pnum AS VARCHAR(32))
      ORDER BY [JHSEQ] ASC
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
    console.error('F14050 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST body: { action: 'create' | 'save', pnum, jhseq?, JHDT, JHDES, GUDES, STDT, STDES, INEMPNO?, INEMPNM? }
export async function POST(req) {
  try {
    const gate = assertAnCdMatchesSession(req, null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'create' ? 'create' : 'save';
    const pnum = body.pnum ?? body.PNUM;
    const jhseqRaw = body.jhseq ?? body.JHSEQ;

    if (!pnum || String(pnum).trim() === '') {
      return new Response(JSON.stringify({ success: false, error: 'pnum이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'save') {
      const jhseq = parseInt(String(jhseqRaw), 10);
      if (Number.isNaN(jhseq)) {
        return new Response(JSON.stringify({ success: false, error: '저장 시 jhseq가 필요합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const JHDES = truncText(body.JHDES ?? body.jhdes ?? '', 2000);
    const GUDES = truncText(body.GUDES ?? body.gudes ?? '', 2000);
    const STDES = truncText(body.STDES ?? body.stdes ?? '', 2000);

    let INEMPNO = body.INEMPNO ?? body.inempno;
    if (INEMPNO !== null && INEMPNO !== undefined && INEMPNO !== '') {
      const n = parseInt(String(INEMPNO), 10);
      INEMPNO = Number.isNaN(n) ? null : n;
    } else {
      INEMPNO = null;
    }
    const INEMPNM = truncName(body.INEMPNM ?? body.inempnm ?? '', 20);

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      const rq = pool.request();
      rq.input('ANCD', gate.sessionAncd);
      rq.input('PNUM', String(pnum).trim());
      const maxR = await rq.query(`
        SELECT ISNULL(MAX([JHSEQ]), 0) + 1 AS NEXTSEQ
        FROM ${TABLE}
        WHERE [ANCD] = @ANCD
          AND CAST([PNUM] AS VARCHAR(32)) = CAST(@PNUM AS VARCHAR(32))
      `);
      const nextSeq = maxR.recordset?.[0]?.NEXTSEQ;
      const jhseqNew = parseInt(String(nextSeq ?? '1'), 10);

      const ins = pool.request();
      ins.input('ANCD', gate.sessionAncd);
      ins.input('PNUM', String(pnum).trim());
      ins.input('JHSEQ', jhseqNew);
      inputDate(ins, 'JHDT', body.JHDT ?? body.jhdt);
      ins.input('JHDES', JHDES);
      ins.input('GUDES', GUDES);
      inputDate(ins, 'STDT', body.STDT ?? body.stdt);
      ins.input('STDES', STDES);
      ins.input('INEMPNO', sql.Int, INEMPNO);
      ins.input('INEMPNM', sql.NVarChar(20), INEMPNM);

      await ins.query(`
        INSERT INTO ${TABLE} (
          [ANCD], [PNUM], [JHSEQ], [JHDT], [JHDES], [GUDES], [STDT], [STDES], [INEMPNO], [INEMPNM]
        )
        VALUES (
          @ANCD, @PNUM, @JHSEQ, @JHDT, @JHDES, @GUDES, @STDT, @STDES, @INEMPNO, @INEMPNM
        )
      `);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'create',
          jhseq: jhseqNew,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const jhseq = parseInt(String(jhseqRaw), 10);
    const up = pool.request();
    up.input('ANCD', gate.sessionAncd);
    up.input('PNUM', String(pnum).trim());
    up.input('JHSEQ', jhseq);
    inputDate(up, 'JHDT', body.JHDT ?? body.jhdt);
    up.input('JHDES', JHDES);
    up.input('GUDES', GUDES);
    inputDate(up, 'STDT', body.STDT ?? body.stdt);
    up.input('STDES', STDES);
    up.input('INEMPNO', sql.Int, INEMPNO);
    up.input('INEMPNM', sql.NVarChar(20), INEMPNM);

    const upd = await up.query(`
      UPDATE ${TABLE}
      SET
        [JHDT] = @JHDT,
        [JHDES] = @JHDES,
        [GUDES] = @GUDES,
        [STDT] = @STDT,
        [STDES] = @STDES,
        [INEMPNO] = @INEMPNO,
        [INEMPNM] = @INEMPNM
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR(32)) = CAST(@PNUM AS VARCHAR(32))
        AND [JHSEQ] = @JHSEQ
    `);

    if (!upd.rowsAffected?.[0]) {
      return new Response(JSON.stringify({ success: false, error: '해당 일련번호의 데이터가 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, action: 'save', jhseq }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('F14050 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
