import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE = '[돌봄시설DB].[dbo].[F14110]';

const SH_GU_LABELS = {
  '1': '인지기능강화',
  '2': '신체기능강화',
  '3': '사회적응프로그램',
  '4': '영양관리(CE)',
  '5': '위생관리(CF)',
  '9': '기타관리(CG)',
};

function truncStr(v, max) {
  if (v == null) return null;
  const s = String(v);
  return s.length <= max ? s : s.slice(0, max);
}

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
  if (s.includes('T')) return s.split('T')[0].slice(0, 10);
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

function normalizeTime(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s.slice(0, 10);
}

function resolveShGu(body) {
  const guRaw = String(body.SH_GU ?? body.shGu ?? '').trim();
  if (guRaw && SH_GU_LABELS[guRaw]) {
    return { code: guRaw, name: truncStr(body.SH_GU_NM ?? body.shGuNm ?? SH_GU_LABELS[guRaw], 50) };
  }
  const name = String(body.SH_GU_NM ?? body.shGuNm ?? body.category ?? '').trim();
  const found = Object.entries(SH_GU_LABELS).find(([, label]) => label === name);
  if (found) return { code: found[0], name: truncStr(name || found[1], 50) };
  if (guRaw) return { code: truncStr(guRaw.charAt(0), 1), name: truncStr(name, 50) };
  return { code: '1', name: SH_GU_LABELS['1'] };
}

function mapRow(r) {
  const shDt = normalizeYmd(r.SH_DT);
  const gu = String(r.SH_GU ?? '').trim();
  return {
    ANCD: r.ANCD,
    SH_DT: shDt,
    SH_SEQ: r.SH_SEQ,
    SH_STM: normalizeTime(r.SH_STM),
    SH_ETM: normalizeTime(r.SH_ETM),
    SH_GU: gu,
    SH_GU_NM: String(r.SH_GU_NM ?? '').trim() || SH_GU_LABELS[gu] || '',
    SH_TIT_CD: r.SH_TIT_CD ?? '',
    SH_TIT_CD_4: r.SH_TIT_CD_4 ?? '',
    SH_TIT_NM: r.SH_TIT_NM ?? '',
    SH_TIT_DSC: r.SH_TIT_DSC ?? '',
    SH_ADD: r.SH_ADD ?? '',
    SH_MAN0: r.SH_MAN0 ?? '',
    SH_MAN1: r.SH_MAN1 ?? '',
    SH_PNUM_DSC: r.SH_PNUM_DSC ?? '',
  };
}

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shDt = searchParams.get('shDt');
    const datesOnly = searchParams.get('datesOnly') === 'true';

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
    request.input('ANCD', gate.sessionAncd);

    let where = 'WHERE [ANCD] = @ANCD';
    if (startDate) {
      request.input('START', normalizeYmd(startDate));
      where += ' AND CONVERT(date, [SH_DT]) >= CONVERT(date, @START)';
    }
    if (endDate) {
      request.input('END', normalizeYmd(endDate));
      where += ' AND CONVERT(date, [SH_DT]) <= CONVERT(date, @END)';
    }
    if (shDt) {
      request.input('SH_DT', normalizeYmd(shDt));
      where += ' AND CONVERT(date, [SH_DT]) = CONVERT(date, @SH_DT)';
    }

    if (datesOnly) {
      const dateResult = await request.query(`
        SELECT DISTINCT CONVERT(varchar(10), [SH_DT], 23) AS SH_DT
        FROM ${TABLE}
        ${where}
        ORDER BY SH_DT DESC
      `);
      const dates = (dateResult.recordset || [])
        .map((r) => normalizeYmd(r.SH_DT))
        .filter(Boolean);
      return new Response(JSON.stringify({ success: true, data: dates, count: dates.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await request.query(`
      SELECT
        [ANCD],[SH_DT],[SH_SEQ],[SH_STM],[SH_ETM],[SH_GU],[SH_GU_NM],
        [SH_TIT_CD],[SH_TIT_CD_4],[SH_TIT_NM],[SH_TIT_DSC],
        [SH_ADD],[SH_MAN0],[SH_MAN1],[SH_PNUM_DSC]
      FROM ${TABLE}
      ${where}
      ORDER BY [SH_DT] DESC, [SH_STM] ASC, [SH_SEQ] ASC
    `);

    const data = (result.recordset || []).map(mapRow);

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F14110 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function nextSeq(pool, ancd, shDt) {
  const req = pool.request();
  req.input('ANCD', ancd);
  req.input('SH_DT', shDt);
  const result = await req.query(
    `SELECT ISNULL(MAX([SH_SEQ]), 0) + 1 AS nx FROM ${TABLE} WHERE [ANCD] = @ANCD AND CONVERT(date, [SH_DT]) = CONVERT(date, @SH_DT)`
  );
  const nx = result.recordset?.[0]?.nx;
  if (nx == null || !Number.isFinite(Number(nx))) {
    throw new Error('일련번호를 생성할 수 없습니다.');
  }
  return Number(nx);
}

function bindScheduleInputs(request, ancd, shDt, shSeq, body, guInfo) {
  request.input('ANCD', ancd);
  request.input('SH_DT', shDt);
  request.input('SH_SEQ', shSeq);
  request.input('SH_STM', truncStr(normalizeTime(body.SH_STM ?? body.startTime ?? ''), 10));
  request.input('SH_ETM', truncStr(normalizeTime(body.SH_ETM ?? body.endTime ?? ''), 10));
  request.input('SH_GU', guInfo.code);
  request.input('SH_GU_NM', guInfo.name);
  request.input('SH_TIT_CD', truncStr(body.SH_TIT_CD ?? body.shTitCd ?? '', 10));
  request.input('SH_TIT_CD_4', truncStr(body.SH_TIT_CD_4 ?? body.shTitCd4 ?? '', 10));
  request.input('SH_TIT_NM', truncStr(body.SH_TIT_NM ?? body.planTitle ?? body.shTitNm ?? '', 50));
  request.input('SH_TIT_DSC', truncStr(body.SH_TIT_DSC ?? body.detail ?? body.shTitDsc ?? '', 200));
  request.input('SH_ADD', truncStr(body.SH_ADD ?? body.place ?? body.shAdd ?? '', 50));
  request.input('SH_MAN0', truncStr(body.SH_MAN0 ?? body.leader ?? body.shMan0 ?? '', 20));
  request.input('SH_MAN1', truncStr(body.SH_MAN1 ?? body.assistant ?? body.shMan1 ?? '', 20));
  request.input('SH_PNUM_DSC', body.SH_PNUM_DSC ?? body.attendees ?? body.shPnumDsc ?? null);
}

export async function POST(req) {
  try {
    const gate = assertAnCdMatchesSession(req, null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'create').toLowerCase();

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const shDt = normalizeYmd(body.SH_DT ?? body.shDt ?? body.planDate);
      const shSeq = parseInt(String(body.SH_SEQ ?? body.shSeq ?? ''), 10);
      if (!shDt || !Number.isFinite(shSeq)) {
        return new Response(JSON.stringify({ success: false, error: 'SH_DT, SH_SEQ가 필요합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const del = pool.request();
      del.input('ANCD', gate.sessionAncd);
      del.input('SH_DT', shDt);
      del.input('SH_SEQ', shSeq);
      await del.query(`
        DELETE FROM ${TABLE}
        WHERE [ANCD] = @ANCD
          AND CONVERT(date, [SH_DT]) = CONVERT(date, @SH_DT)
          AND [SH_SEQ] = @SH_SEQ
      `);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'copy') {
      const srcDt = normalizeYmd(body.SH_DT ?? body.shDt ?? body.planDate);
      const srcSeq = parseInt(String(body.SH_SEQ ?? body.shSeq ?? ''), 10);
      const targetDt = normalizeYmd(body.copyDate ?? body.targetDate ?? body.SH_DT_COPY);
      if (!srcDt || !Number.isFinite(srcSeq) || !targetDt) {
        return new Response(JSON.stringify({ success: false, error: '원본 일자·일련번호와 복사일자가 필요합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const sel = pool.request();
      sel.input('ANCD', gate.sessionAncd);
      sel.input('SH_DT', srcDt);
      sel.input('SH_SEQ', srcSeq);
      const srcResult = await sel.query(`
        SELECT TOP 1 *
        FROM ${TABLE}
        WHERE [ANCD] = @ANCD
          AND CONVERT(date, [SH_DT]) = CONVERT(date, @SH_DT)
          AND [SH_SEQ] = @SH_SEQ
      `);
      const src = srcResult.recordset?.[0];
      if (!src) {
        return new Response(JSON.stringify({ success: false, error: '복사할 일정을 찾을 수 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const newSeq = await nextSeq(pool, gate.sessionAncd, targetDt);
      const ins = pool.request();
      bindScheduleInputs(ins, gate.sessionAncd, targetDt, newSeq, src, resolveShGu(src));
      await ins.query(`
        INSERT INTO ${TABLE} (
          [ANCD],[SH_DT],[SH_SEQ],[SH_STM],[SH_ETM],[SH_GU],[SH_GU_NM],
          [SH_TIT_CD],[SH_TIT_CD_4],[SH_TIT_NM],[SH_TIT_DSC],
          [SH_ADD],[SH_MAN0],[SH_MAN1],[SH_PNUM_DSC]
        ) VALUES (
          @ANCD, CONVERT(date, @SH_DT), @SH_SEQ, @SH_STM, @SH_ETM, @SH_GU, @SH_GU_NM,
          @SH_TIT_CD, @SH_TIT_CD_4, @SH_TIT_NM, @SH_TIT_DSC,
          @SH_ADD, @SH_MAN0, @SH_MAN1, @SH_PNUM_DSC
        )
      `);

      return new Response(
        JSON.stringify({ success: true, SH_DT: targetDt, SH_SEQ: newSeq }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const shDt = normalizeYmd(body.SH_DT ?? body.shDt ?? body.planDate);
    if (!shDt) {
      return new Response(JSON.stringify({ success: false, error: '계획일자(SH_DT)가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const guInfo = resolveShGu(body);

    if (action === 'update') {
      const shSeq = parseInt(String(body.SH_SEQ ?? body.shSeq ?? ''), 10);
      if (!Number.isFinite(shSeq)) {
        return new Response(JSON.stringify({ success: false, error: 'SH_SEQ가 필요합니다.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const upd = pool.request();
      bindScheduleInputs(upd, gate.sessionAncd, shDt, shSeq, body, guInfo);
      const result = await upd.query(`
        UPDATE ${TABLE} SET
          [SH_STM] = @SH_STM,
          [SH_ETM] = @SH_ETM,
          [SH_GU] = @SH_GU,
          [SH_GU_NM] = @SH_GU_NM,
          [SH_TIT_CD] = @SH_TIT_CD,
          [SH_TIT_CD_4] = @SH_TIT_CD_4,
          [SH_TIT_NM] = @SH_TIT_NM,
          [SH_TIT_DSC] = @SH_TIT_DSC,
          [SH_ADD] = @SH_ADD,
          [SH_MAN0] = @SH_MAN0,
          [SH_MAN1] = @SH_MAN1,
          [SH_PNUM_DSC] = @SH_PNUM_DSC
        WHERE [ANCD] = @ANCD
          AND CONVERT(date, [SH_DT]) = CONVERT(date, @SH_DT)
          AND [SH_SEQ] = @SH_SEQ
      `);

      if (!result.rowsAffected?.[0]) {
        return new Response(JSON.stringify({ success: false, error: '수정할 일정을 찾을 수 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, SH_DT: shDt, SH_SEQ: shSeq }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // create
    const newSeq = await nextSeq(pool, gate.sessionAncd, shDt);
    const ins = pool.request();
    bindScheduleInputs(ins, gate.sessionAncd, shDt, newSeq, body, guInfo);
    await ins.query(`
      INSERT INTO ${TABLE} (
        [ANCD],[SH_DT],[SH_SEQ],[SH_STM],[SH_ETM],[SH_GU],[SH_GU_NM],
        [SH_TIT_CD],[SH_TIT_CD_4],[SH_TIT_NM],[SH_TIT_DSC],
        [SH_ADD],[SH_MAN0],[SH_MAN1],[SH_PNUM_DSC]
      ) VALUES (
        @ANCD, CONVERT(date, @SH_DT), @SH_SEQ, @SH_STM, @SH_ETM, @SH_GU, @SH_GU_NM,
        @SH_TIT_CD, @SH_TIT_CD_4, @SH_TIT_NM, @SH_TIT_DSC,
        @SH_ADD, @SH_MAN0, @SH_MAN1, @SH_PNUM_DSC
      )
    `);

    return new Response(
      JSON.stringify({ success: true, SH_DT: shDt, SH_SEQ: newSeq }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('F14110 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
