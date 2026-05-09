import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE = '[돌봄시설DB].[dbo].[F14040]';

// F14040 치료프로그램 목록 (로그인 기관 ANCD만)
// GET /api/f14040?ancd= (ancd는 선택, 세션과 일치 검증용)
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    request.input('sessionAncd', gate.sessionAncd);

    const result = await request.query(`
      SELECT
        [ANCD],
        [PGSEQ],
        [PGNM],
        [PGOJ],
        [PGJB],
        [PGDES],
        [PG_GU],
        [DEL],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM],
        [SCH_FDATE],
        [SCH_TDATE],
        [ACT_CYCLE],
        [ACT_NUM],
        [PGMAN1],
        [PGMAN2],
        [PGADD],
        [PGMAN0],
        [CPY_FLAG],
        [CYP_CNTR_ANCD],
        [CYP_CNTR_PGSEQ]
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
      ORDER BY [PGSEQ] ASC, [PGNM] ASC
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
    console.error('F14040 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function truncStr(v, max) {
  if (v == null) return null;
  const s = String(v);
  return s.length <= max ? s : s.slice(0, max);
}

function normalizeYmd(d) {
  if (d == null || d === '') return null;
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

function parseSchedule(scheduleText) {
  const t = String(scheduleText || '').trim();
  if (!t) return { start: null, end: null };
  const parts = t.split(/[~∼～]/).map((x) => x.trim()).filter(Boolean);
  const start = normalizeYmd(parts[0] || '');
  const end = parts.length >= 2 ? normalizeYmd(parts[1] || '') : null;
  return { start, end };
}

// POST body: { action: 'save' | 'delete' | 'create', pgseq?, ...필드 }
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

    if (action === 'create') {
      const name = truncStr(body.PGNM ?? '', 100);
      if (!name || String(name).trim() === '') {
        return new Response(JSON.stringify({ success: false, error: '프로그램 명을 입력해 주세요.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const seqReq = pool.request();
      seqReq.input('ANCD', gate.sessionAncd);
      const seqResult = await seqReq.query(
        `SELECT ISNULL(MAX([PGSEQ]), 0) + 1 AS nx FROM ${TABLE} WHERE [ANCD] = @ANCD`
      );
      const nextPgseq = seqResult.recordset?.[0]?.nx;
      if (nextPgseq == null || !Number.isFinite(Number(nextPgseq))) {
        return new Response(JSON.stringify({ success: false, error: '일련번호를 생성할 수 없습니다.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { start: schF, end: schT } = parseSchedule(body.programSchedule);
      const exec = String(body.executionCycle || '').trim();
      const actCycle = exec === '월' || exec === 'M' || exec === 'm' ? 'M' : 'W';
      const freqRaw = String(body.ACT_NUM ?? body.frequency ?? '').trim();
      const parsedActNum = freqRaw === '' ? NaN : parseInt(freqRaw, 10);
      const actNumValue = Number.isFinite(parsedActNum) ? parsedActNum : null;
      const guRaw = String(body.PG_GU ?? '').trim();
      const pgGu = guRaw.length ? truncStr(guRaw.charAt(0), 1) : null;

      const ins = pool.request();
      ins.input('ANCD', gate.sessionAncd);
      ins.input('PGSEQ', Number(nextPgseq));
      ins.input('PGNM', name);
      ins.input('PGOJ', truncStr(body.PGOJ ?? '', 500));
      ins.input('PGJB', truncStr(body.PGJB ?? '', 200));
      ins.input('PGDES', truncStr(body.PGDES ?? '', 1000));
      ins.input('PG_GU', pgGu);
      ins.input('PGMAN0', truncStr(body.PGMAN0 ?? '', 2000));
      ins.input('PGADD', truncStr(body.PGADD ?? '', 100));
      ins.input('PGMAN1', truncStr(body.PGMAN1 ?? '', 20));
      ins.input('PGMAN2', truncStr(body.PGMAN2 ?? '', 20));
      ins.input('ACT_CYCLE', actCycle);
      ins.input('SCH_FDATE', schF);
      ins.input('SCH_TDATE', schT);
      ins.input('ACT_NUM2', actNumValue);

      await ins.query(`
        INSERT INTO ${TABLE} (
          [ANCD], [PGSEQ], [PGNM], [PGOJ], [PGJB], [PGDES], [PG_GU], [DEL],
          [SCH_FDATE], [SCH_TDATE], [ACT_CYCLE], [ACT_NUM],
          [PGMAN1], [PGMAN2], [PGADD], [PGMAN0],
          [INDT], [CPY_FLAG]
        )
        VALUES (
          @ANCD, @PGSEQ, @PGNM, @PGOJ, @PGJB, @PGDES, @PG_GU, 'I',
          @SCH_FDATE, @SCH_TDATE, @ACT_CYCLE, @ACT_NUM2,
          @PGMAN1, @PGMAN2, @PGADD, @PGMAN0,
          GETDATE(), 'N'
        )
      `);

      return new Response(
        JSON.stringify({
          success: true,
          pgseq: Number(nextPgseq),
          ancd: gate.sessionAncd,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pgseq = parseInt(String(body.pgseq ?? ''), 10);
    if (!Number.isFinite(pgseq)) {
      return new Response(JSON.stringify({ success: false, error: 'pgseq가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PGSEQ', pgseq);

    if (action === 'delete') {
      const r = await request.query(`
        UPDATE ${TABLE}
        SET [DEL] = 'D'
        WHERE [ANCD] = @ANCD AND [PGSEQ] = @PGSEQ
      `);
      if (r.rowsAffected[0] === 0) {
        return new Response(JSON.stringify({ success: false, error: '대상 행을 찾을 수 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { start: schF, end: schT } = parseSchedule(body.programSchedule);
    const exec = String(body.executionCycle || '').trim();
    const actCycle = exec === '월' || exec === 'M' || exec === 'm' ? 'M' : 'W';

    const freqRaw = String(body.ACT_NUM ?? body.frequency ?? '').trim();
    const parsedActNum = freqRaw === '' ? NaN : parseInt(freqRaw, 10);
    const actNumValue = Number.isFinite(parsedActNum) ? parsedActNum : null;

    const guRaw = String(body.PG_GU ?? '').trim();
    const pgGu = guRaw.length ? truncStr(guRaw.charAt(0), 1) : null;

    request.input('PGNM', truncStr(body.PGNM ?? '', 100));
    request.input('PGOJ', truncStr(body.PGOJ ?? '', 500));
    request.input('PGJB', truncStr(body.PGJB ?? '', 200));
    request.input('PGDES', truncStr(body.PGDES ?? '', 1000));
    request.input('PG_GU', pgGu);
    request.input('PGMAN0', truncStr(body.PGMAN0 ?? '', 2000));
    request.input('PGADD', truncStr(body.PGADD ?? '', 100));
    request.input('PGMAN1', truncStr(body.PGMAN1 ?? '', 20));
    request.input('PGMAN2', truncStr(body.PGMAN2 ?? '', 20));
    request.input('ACT_CYCLE', actCycle);
    request.input('SCH_FDATE', schF);
    request.input('SCH_TDATE', schT);
    request.input('ACT_NUM2', actNumValue);

    const upd = await request.query(`
      UPDATE ${TABLE}
      SET
        [PGNM] = @PGNM,
        [PGOJ] = @PGOJ,
        [PGJB] = @PGJB,
        [PGDES] = @PGDES,
        [PG_GU] = @PG_GU,
        [PGMAN0] = @PGMAN0,
        [PGADD] = @PGADD,
        [PGMAN1] = @PGMAN1,
        [PGMAN2] = @PGMAN2,
        [ACT_CYCLE] = @ACT_CYCLE,
        [ACT_NUM] = @ACT_NUM2,
        [SCH_FDATE] = @SCH_FDATE,
        [SCH_TDATE] = @SCH_TDATE,
        [DEL] = 'I',
        [INDT] = GETDATE()
      WHERE [ANCD] = @ANCD AND [PGSEQ] = @PGSEQ
    `);

    if (upd.rowsAffected[0] === 0) {
      return new Response(JSON.stringify({ success: false, error: '대상 행을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F14040 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
