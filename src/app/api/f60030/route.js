import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F60030]';
const VIEWER_TABLE = '[돌봄시설DB].[dbo].[F60031]';

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

async function syncF60031(pool, seq, mgu, ancd, viewers) {
  const delReq = pool.request();
  delReq.input('SEQ', seq);
  await delReq.query(`DELETE FROM ${VIEWER_TABLE} WHERE [SEQ] = @SEQ`);

  const flag = String(mgu ?? '1').trim().slice(0, 1);
  if (flag === '1') {
    const req = pool.request();
    req.input('SEQ', seq);
    req.input('D_ANCD', ancd);
    await req.query(`
      INSERT INTO ${VIEWER_TABLE} ([SEQ], [D_ANCD], [CONF_FLAG], [CONF_DATE])
      VALUES (@SEQ, @D_ANCD, '0', NULL)
    `);
    return;
  }

  if (flag === '2' && Array.isArray(viewers) && viewers.length > 0) {
    for (const dAncd of viewers) {
      if (dAncd == null || dAncd === '') continue;
      const req = pool.request();
      req.input('SEQ', seq);
      req.input('D_ANCD', dAncd);
      await req.query(`
        INSERT INTO ${VIEWER_TABLE} ([SEQ], [D_ANCD], [CONF_FLAG], [CONF_DATE])
        VALUES (@SEQ, @D_ANCD, '0', NULL)
      `);
    }
  }
}

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd');
    const seqParam = searchParams.get('seq');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const baseDate = searchParams.get('baseDate');

    const gate = assertAnCdMatchesSession(req, ancdParam);
    if (!gate.ok) return gate.response;

    const ancd = ancdParam ?? gate.sessionAncd;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    request.input('ANCD', ancd);

    if (seqParam) {
      request.input('SEQ', parseInt(String(seqParam), 10));
      const detail = await request.query(`
        SELECT
          N.[SEQ],
          N.[MDOC],
          N.[MDES],
          N.[SDT],
          N.[EDT],
          N.[ANCD],
          N.[MNM],
          N.[MGU],
          N.[ETC],
          N.[INEMPNO],
          N.[INEMPNM],
          C.[ANNM]
        FROM ${TABLE_NAME} N
        LEFT JOIN [돌봄시설DB].[dbo].[F00110] C ON N.[ANCD] = C.[ANCD]
        WHERE N.[SEQ] = @SEQ AND N.[ANCD] = @ANCD
      `);
      const row = detail.recordset?.[0];
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: '공지를 찾을 수 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const viewersRes = await pool
        .request()
        .input('SEQ', parseInt(String(seqParam), 10))
        .query(`
          SELECT [SEQ], [D_ANCD], [CONF_FLAG], [CONF_DATE]
          FROM ${VIEWER_TABLE}
          WHERE [SEQ] = @SEQ
          ORDER BY [D_ANCD]
        `);

      const data = {
        ...row,
        SDT: normalizeYmd(row.SDT),
        EDT: normalizeYmd(row.EDT),
        viewers: viewersRes.recordset || [],
      };

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let where = 'WHERE N.[ANCD] = @ANCD';

    const periodStart = startDate ? String(startDate).slice(0, 10) : null;
    const periodEnd = endDate ? String(endDate).slice(0, 10) : null;

    if (periodStart && periodEnd) {
      request.input('START', periodStart);
      request.input('END', periodEnd);
      where += `
        AND CONVERT(date, N.[SDT]) >= CONVERT(date, @START)
        AND CONVERT(date, N.[SDT]) <= CONVERT(date, @END)
      `;
    } else if (periodStart) {
      request.input('START', periodStart);
      where += ' AND CONVERT(date, N.[SDT]) >= CONVERT(date, @START)';
    } else if (periodEnd) {
      request.input('END', periodEnd);
      where += ' AND CONVERT(date, N.[SDT]) <= CONVERT(date, @END)';
    } else if (baseDate) {
      request.input('BASE', String(baseDate).slice(0, 10));
      where += `
        AND CONVERT(date, @BASE) >= CONVERT(date, N.[SDT])
        AND CONVERT(date, @BASE) <= CONVERT(date, N.[EDT])
      `;
    }

    const query = `
      SELECT
        N.[SEQ],
        N.[MDOC],
        N.[SDT],
        N.[EDT],
        N.[ANCD],
        N.[MNM],
        N.[MGU],
        N.[ETC],
        N.[INEMPNO],
        N.[INEMPNM],
        C.[ANNM]
      FROM ${TABLE_NAME} N
      LEFT JOIN [돌봄시설DB].[dbo].[F00110] C ON N.[ANCD] = C.[ANCD]
      ${where}
      ORDER BY N.[SDT] DESC, N.[SEQ] DESC
    `;

    const result = await request.query(query);
    const data = (result.recordset || []).map((r) => ({
      ...r,
      SDT: normalizeYmd(r.SDT),
      EDT: normalizeYmd(r.EDT),
    }));

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60030 조회 오류:', err);
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
    const sdt = body?.SDT;
    const edt = body?.EDT;

    if (!sdt || !edt) {
      return new Response(JSON.stringify({ success: false, error: 'SDT, EDT는 필수입니다' }), {
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

    const pick = (k) => (Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : null);
    const mgu = pick('MGU') != null ? String(pick('MGU')).slice(0, 1) : '1';

    const request = pool.request();
    request.input('MDOC', pick('MDOC') == null ? null : String(pick('MDOC')));
    request.input('MDES', pick('MDES') == null ? null : String(pick('MDES')));
    request.input('SDT', String(sdt).slice(0, 10));
    request.input('EDT', String(edt).slice(0, 10));
    request.input('ANCD', ancd);
    request.input('MNM', pick('MNM') == null ? null : String(pick('MNM')));
    request.input('MGU', mgu);
    request.input('ETC', pick('ETC') == null ? null : String(pick('ETC')));
    request.input(
      'INEMPNO',
      pick('INEMPNO') == null || pick('INEMPNO') === '' ? null : parseInt(String(pick('INEMPNO')), 10)
    );
    request.input('INEMPNM', pick('INEMPNM') == null ? null : String(pick('INEMPNM')));

    const insertResult = await request.query(`
      DECLARE @NewSeq int;
      SELECT @NewSeq = ISNULL(MAX([SEQ]), 0) + 1 FROM ${TABLE_NAME};

      INSERT INTO ${TABLE_NAME} (
        [SEQ], [MDOC], [MDES], [SDT], [EDT], [ANCD], [MNM], [MGU], [ETC], [INEMPNO], [INEMPNM]
      )
      VALUES (
        @NewSeq, @MDOC, @MDES, CONVERT(date, @SDT), CONVERT(date, @EDT),
        @ANCD, @MNM, @MGU, @ETC, @INEMPNO, @INEMPNM
      );

      SELECT @NewSeq AS SEQ;
    `);

    const newSeq = insertResult.recordset?.[0]?.SEQ;
    if (newSeq == null) {
      throw new Error('공지 일련번호(SEQ) 생성에 실패했습니다.');
    }

    const viewers = Array.isArray(body?.viewers) ? body.viewers : [];
    await syncF60031(pool, newSeq, mgu, ancd, viewers);

    return new Response(JSON.stringify({ success: true, seq: newSeq }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60030 등록 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd');
    const seqParam = searchParams.get('seq');

    const gate = assertAnCdMatchesSession(req, ancdParam);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const ancd = body?.ANCD ?? ancdParam ?? gate.sessionAncd;
    const seq = body?.SEQ ?? seqParam;

    if (seq == null || seq === '') {
      return new Response(JSON.stringify({ success: false, error: 'SEQ는 필수입니다' }), {
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

    const pick = (k) => (Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : undefined);
    const mgu =
      pick('MGU') !== undefined ? String(pick('MGU')).slice(0, 1) : undefined;

    const request = pool.request();
    request.input('SEQ', parseInt(String(seq), 10));
    request.input('ANCD', ancd);

    const setParts = [];
    const stringFields = ['MDOC', 'MDES', 'MNM', 'MGU', 'ETC', 'INEMPNM'];
    stringFields.forEach((k) => {
      const v = pick(k);
      if (v !== undefined) {
        request.input(k, v == null || v === '' ? null : String(v));
        setParts.push(`[${k}] = @${k}`);
      }
    });

    if (pick('SDT') !== undefined) {
      request.input('SDT', normalizeYmd(pick('SDT')));
      setParts.push('[SDT] = CONVERT(date, @SDT)');
    }
    if (pick('EDT') !== undefined) {
      request.input('EDT', normalizeYmd(pick('EDT')));
      setParts.push('[EDT] = CONVERT(date, @EDT)');
    }
    if (pick('INEMPNO') !== undefined) {
      const n =
        pick('INEMPNO') == null || pick('INEMPNO') === ''
          ? null
          : parseInt(String(pick('INEMPNO')), 10);
      request.input('INEMPNO', Number.isNaN(n) ? null : n);
      setParts.push('[INEMPNO] = @INEMPNO');
    }

    if (setParts.length === 0 && !Array.isArray(body?.viewers) && mgu === undefined) {
      return new Response(JSON.stringify({ success: false, error: '수정할 항목이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (setParts.length > 0) {
      const updateResult = await request.query(`
        UPDATE ${TABLE_NAME}
        SET ${setParts.join(',\n          ')}
        WHERE [SEQ] = @SEQ AND [ANCD] = @ANCD
      `);
      const affected = updateResult.rowsAffected?.[0] ?? 0;
      if (affected === 0) {
        return new Response(JSON.stringify({ success: false, error: '수정할 공지를 찾을 수 없습니다.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const finalMgu =
      mgu ??
      (
        await pool
          .request()
          .input('SEQ', parseInt(String(seq), 10))
          .query(`SELECT [MGU] FROM ${TABLE_NAME} WHERE [SEQ] = @SEQ`)
      ).recordset?.[0]?.MGU ??
      '1';

    if (Array.isArray(body?.viewers) || mgu !== undefined) {
      const viewers = Array.isArray(body?.viewers) ? body.viewers : [];
      await syncF60031(pool, parseInt(String(seq), 10), finalMgu, ancd, viewers);
    }

    return new Response(JSON.stringify({ success: true, seq: parseInt(String(seq), 10) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60030 수정 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancdParam = searchParams.get('ancd');
    const seq = searchParams.get('seq');

    const gate = assertAnCdMatchesSession(req, ancdParam);
    if (!gate.ok) return gate.response;

    const ancd = ancdParam ?? gate.sessionAncd;

    if (seq == null || seq === '') {
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

    const seqNum = parseInt(String(seq), 10);
    const request = pool.request();
    request.input('SEQ', seqNum);
    request.input('ANCD', ancd);

    await request.query(`DELETE FROM ${VIEWER_TABLE} WHERE [SEQ] = @SEQ`);

    await request.query(`
      DELETE FROM ${TABLE_NAME}
      WHERE [SEQ] = @SEQ AND [ANCD] = @ANCD
    `);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F60030 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
