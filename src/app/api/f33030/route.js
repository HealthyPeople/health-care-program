import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F33030]';

/** DB Date / locale 문자열 / ISO 모두 yyyy-mm-dd로 (프론트 표시·중복제거용) */
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

/** tedious/mssql가 컬럼명을 소문자로 줄 때 프론트가 대문자만 읽는 문제 방지 */
function normalizeSqlRow(row) {
  if (!row || typeof row !== 'object') return row;
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    const ku = String(k).toUpperCase();
    if (!(ku in o)) o[ku] = v;
  }
  return o;
}

/** DB의 PNUM과 수급자목록의 선행 0 표기(예: 05 vs 5) 불일치 방지 */
function normalizePnumParam(p) {
  const s = String(p ?? '').trim();
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional
    const pnum = searchParams.get('pnum');
    const vdt = searchParams.get('vdt'); // yyyy-mm-dd
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum) {
      return new Response(JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다' }), {
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
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', normalizePnumParam(pnum));

    let where = `
      WHERE [ANCD] = @ANCD
        AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
    `;

    if (startDate && endDate) {
      const s = ymdToDigits(startDate);
      const e = ymdToDigits(endDate);
      if (!/^\d{8}$/.test(s) || !/^\d{8}$/.test(e)) {
        return new Response(
          JSON.stringify({ success: false, error: 'startDate/endDate 형식이 올바르지 않습니다 (yyyy-mm-dd)' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      request.input('START', s);
      request.input('END', e);
      where += ` AND CONVERT(char(8), [VDT], 112) >= @START AND CONVERT(char(8), [VDT], 112) <= @END`;
    } else if (vdt) {
      const d = ymdToDigits(vdt);
      if (!/^\d{8}$/.test(d)) {
        return new Response(JSON.stringify({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      request.input('VDT', d);
      where += ` AND CONVERT(char(8), [VDT], 112) = @VDT`;
    } else {
      // 날짜 조건이 없으면 해당 수급자의 전체 제공일자 목록/상세 조회 용도로 최신순 제한 조회
      // (UI에서 VDT DISTINCT를 만들기 위해 사용)
    }

    const query = `
      SELECT
        [ANCD],
        [PNUM],
        [VDT],
        [SRV_TM],
        [AF_FACE],
        [AF_LIP],
        [AF_NAIL_COLOR],
        [AF_COG_STAT],
        [BF_FACE],
        [BF_LIP],
        [BF_NAIL_COLOR],
        [BF_COG_STAT],
        [SRV_WRNG_DESC],
        [BATH_METH],
        [INEMPNO],
        [INEMPNO1]
      FROM ${TABLE_NAME}
      ${where}
      ORDER BY [VDT] DESC
    `;

    const result = await request.query(query);
    const data = (result.recordset || []).map((r) => {
      const n = normalizeSqlRow(r);
      return {
        ...n,
        VDT: toYmd(n.VDT),
      };
    });

    return new Response(JSON.stringify({ success: true, data, count: data.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F33030 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const pnum = body?.PNUM ?? body?.pnum;
    const vdt = body?.VDT ?? body?.vdt;

    if (!pnum || !vdt) {
      return new Response(JSON.stringify({ success: false, error: 'PNUM, VDT는 필수입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vdtDigits = ymdToDigits(vdt);
    if (!/^\d{8}$/.test(vdtDigits)) {
      return new Response(JSON.stringify({ success: false, error: 'VDT 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
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

    const pick = (k, def = null) =>
      Object.prototype.hasOwnProperty.call(body || {}, k) ? body[k] : def;

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', normalizePnumParam(pnum));
    request.input('VDT', vdtDigits);

    request.input('SRV_TM', pick('SRV_TM', body?.srvTm ?? '') ?? '');
    request.input('AF_FACE', pick('AF_FACE', body?.afFace ?? 'X') ?? 'X');
    request.input('AF_LIP', pick('AF_LIP', body?.afLip ?? 'X') ?? 'X');
    request.input('AF_NAIL_COLOR', pick('AF_NAIL_COLOR', body?.afNailColor ?? body?.afNailColc ?? 'X') ?? 'X');
    request.input('AF_COG_STAT', pick('AF_COG_STAT', body?.afCogStat ?? 'X') ?? 'X');
    request.input('BF_FACE', pick('BF_FACE', body?.bfFace ?? 'X') ?? 'X');
    request.input('BF_LIP', pick('BF_LIP', body?.bfLip ?? 'X') ?? 'X');
    request.input('BF_NAIL_COLOR', pick('BF_NAIL_COLOR', body?.bfNailColor ?? body?.bfNailColc ?? 'X') ?? 'X');
    request.input('BF_COG_STAT', pick('BF_COG_STAT', body?.bfCogStat ?? 'X') ?? 'X');
    request.input('SRV_WRNG_DESC', pick('SRV_WRNG_DESC', body?.srvWrngDesc ?? body?.srvWrngD ?? '') ?? '');
    request.input('BATH_METH', pick('BATH_METH', body?.bathMeth ?? null));
    request.input('INEMPNO', pick('INEMPNO', body?.inempno ?? null));
    request.input('INEMPNO1', pick('INEMPNO1', body?.inempno1 ?? null));

    const query = `
      MERGE ${TABLE_NAME} AS T
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, CONVERT(date, @VDT, 112) AS VDT) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR)
            AND CONVERT(date, T.[VDT]) = S.[VDT])
      WHEN MATCHED THEN
        UPDATE SET
          [SRV_TM] = @SRV_TM,
          [AF_FACE] = @AF_FACE,
          [AF_LIP] = @AF_LIP,
          [AF_NAIL_COLOR] = @AF_NAIL_COLOR,
          [AF_COG_STAT] = @AF_COG_STAT,
          [BF_FACE] = @BF_FACE,
          [BF_LIP] = @BF_LIP,
          [BF_NAIL_COLOR] = @BF_NAIL_COLOR,
          [BF_COG_STAT] = @BF_COG_STAT,
          [SRV_WRNG_DESC] = @SRV_WRNG_DESC,
          [BATH_METH] = @BATH_METH,
          [INEMPNO] = @INEMPNO,
          [INEMPNO1] = @INEMPNO1
      WHEN NOT MATCHED THEN
        INSERT (
          [ANCD],[PNUM],[VDT],
          [SRV_TM],[AF_FACE],[AF_LIP],[AF_NAIL_COLOR],[AF_COG_STAT],
          [BF_FACE],[BF_LIP],[BF_NAIL_COLOR],[BF_COG_STAT],
          [SRV_WRNG_DESC],[BATH_METH],[INEMPNO],[INEMPNO1]
        )
        VALUES (
          @ANCD,@PNUM,CONVERT(date, @VDT, 112),
          @SRV_TM,@AF_FACE,@AF_LIP,@AF_NAIL_COLOR,@AF_COG_STAT,
          @BF_FACE,@BF_LIP,@BF_NAIL_COLOR,@BF_COG_STAT,
          @SRV_WRNG_DESC,@BATH_METH,@INEMPNO,@INEMPNO1
        );
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F33030 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional
    const pnum = searchParams.get('pnum');
    const vdt = searchParams.get('vdt');

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    if (!pnum || !vdt) {
      return new Response(JSON.stringify({ success: false, error: 'pnum, vdt 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vdtDigits = ymdToDigits(vdt);
    if (!/^\d{8}$/.test(vdtDigits)) {
      return new Response(JSON.stringify({ success: false, error: 'vdt 형식이 올바르지 않습니다 (yyyy-mm-dd)' }), {
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F33030 삭제 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

