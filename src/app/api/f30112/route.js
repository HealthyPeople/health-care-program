import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

// F30112_수급자입력기준정보: 수급자별 디폴트(예: 식사종류) 조회
// - pnum: 단일 PNUM
// - pnums: 콤마로 구분된 PNUM 목록
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pnum = searchParams.get('pnum');
    const pnumsRaw = searchParams.get('pnums');
    const from = searchParams.get('from'); // optional: yyyy-mm-dd
    const to = searchParams.get('to'); // optional: yyyy-mm-dd
    const ancd = searchParams.get('ancd'); // optional, 세션 검증용

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pnums = (pnumsRaw || '')
      .split(',')
      .map((x) => String(x).trim())
      .filter(Boolean);
    if (pnum) pnums.push(String(pnum).trim());

    if (pnums.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'pnum 또는 pnums 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('sessionAncd', gate.sessionAncd);

    // PNUM 조건 구성
    const inParams = [];
    pnums.forEach((v, idx) => {
      const key = `p${idx}`;
      inParams.push(`@${key}`);
      request.input(key, v);
    });

    // 기간 조회 지원: from/to가 주어지면 해당 범위 내 전체를 반환(INDT 기준)
    // - from/to가 없으면 기존과 동일하게 PNUM별 최신 1건 반환
    const hasRange = Boolean(from || to);
    if (hasRange) {
      // 문자열 날짜(yyyy-mm-dd)를 DATETIME 범위로 안전하게 처리
      // - from: 00:00:00
      // - to:   23:59:59.997 (SQL Server datetime)
      if (from) request.input('fromDate', `${String(from).trim()} 00:00:00`);
      if (to) request.input('toDate', `${String(to).trim()} 23:59:59.997`);
    }

    const dateWhere = hasRange
      ? `
          ${from ? 'AND t.[INDT] >= @fromDate' : ''}
          ${to ? 'AND t.[INDT] <= @toDate' : ''}
        `
      : '';

    const query = hasRange
      ? `
        SELECT t.*
        FROM [돌봄시설DB].[dbo].[F30112] t
        WHERE t.[ANCD] = @sessionAncd
          AND CAST(t.[PNUM] AS VARCHAR) IN (${inParams.join(',')})
          ${dateWhere}
        ORDER BY t.[PNUM] ASC, t.[INDT] DESC
      `
      : `
        SELECT *
        FROM (
          SELECT
            t.*,
            ROW_NUMBER() OVER (PARTITION BY t.[PNUM] ORDER BY t.[INDT] DESC) as rn
          FROM [돌봄시설DB].[dbo].[F30112] t
          WHERE t.[ANCD] = @sessionAncd
            AND CAST(t.[PNUM] AS VARCHAR) IN (${inParams.join(',')})
        ) x
        WHERE x.rn = 1
      `;

    const result = await request.query(query);

    return new Response(
      JSON.stringify({ success: true, data: result.recordset || [], count: result.recordset ? result.recordset.length : 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('F30112 테이블 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeBoolToDb(v) {
  if (v === true) return '1';
  if (v === false) return '0';
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '1' || s === 'y' || s === 'yes' || s === 'true') return '1';
  if (s === '0' || s === 'n' || s === 'no' || s === 'false') return '0';
  return '';
}

function cleanStr(v) {
  if (v == null) return '';
  return String(v).trim();
}

function cleanInt(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

async function getF30112Columns(pool) {
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'F30112'
  `);
  const cols = new Set();
  (result.recordset || []).forEach((r) => {
    const c = String(r.COLUMN_NAME || '').trim();
    if (c) cols.add(c.toUpperCase());
  });
  return cols;
}

// F30112 업서트(수급자별 기준정보 저장)
// body: { ancd?: string|number, pnum: string|number, ...fields }
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ancd = body?.ancd ?? body?.ANCD ?? null;
    const pnum = cleanStr(body?.pnum ?? body?.PNUM);

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    if (!pnum) return json({ success: false, error: 'pnum이 필요합니다' }, 400);

    const pool = await connPool;
    if (!pool) return json({ success: false, error: '데이터베이스 연결 실패' }, 500);

    const columns = await getF30112Columns(pool);

    const raw = { ...(body || {}) };
    delete raw.ancd;
    delete raw.ANCD;
    delete raw.pnum;
    delete raw.PNUM;

    // 자동 매핑(화면에서 보내는 alias 일부 대응)
    if (raw.mealType != null && raw.ST_KIND == null) raw.ST_KIND = raw.mealType;
    if (raw.mealLocation != null && raw.ST_PLAC == null) raw.ST_PLAC = raw.mealLocation;
    if (raw.mealConfirmer != null && raw.ST_CONF == null) raw.ST_CONF = raw.mealConfirmer;
    if (raw.confirmer != null && raw.ST_CONF == null) raw.ST_CONF = raw.confirmer;
    if (raw.mealType != null && raw.PH_MEAL_KIND_NM == null) raw.PH_MEAL_KIND_NM = raw.mealType;
    if (raw.mealIntake != null && raw.PH_MEAL_VAL_NM == null) raw.PH_MEAL_VAL_NM = raw.mealIntake;
    if (raw.mealClassification != null && raw.PH_MEAL_WT_NM == null) raw.PH_MEAL_WT_NM = raw.mealClassification;

    if (raw.bathMethod != null && raw.PH_BATH_METH_NM == null) raw.PH_BATH_METH_NM = raw.bathMethod;
    if (raw.bathTimeRequired != null && raw.PH_BATH_TM == null) raw.PH_BATH_TM = raw.bathTimeRequired;
    if (raw.bathDay1 != null && raw.PH_BATH_WK1 == null) raw.PH_BATH_WK1 = raw.bathDay1;
    if (raw.bathDay2 != null && raw.PH_BATH_WK2 == null) raw.PH_BATH_WK2 = raw.bathDay2;
    if (raw.bathTime != null && raw.BATH_SPV_TM == null) raw.BATH_SPV_TM = raw.bathTime;
    if (raw.bathProvider1 != null && raw.BATH_EMPNM01 == null) raw.BATH_EMPNM01 = raw.bathProvider1;
    if (raw.bathProvider2 != null && raw.BATH_EMPNM02 == null) raw.BATH_EMPNM02 = raw.bathProvider2;

    // 작성자: 신체활동은 PH_WRITE_NAME 사용
    if (raw.preparerName != null) {
      if (raw.PH_WRITE_NAME == null) raw.PH_WRITE_NAME = raw.preparerName;
      if (raw.INEMPNM == null) raw.INEMPNM = raw.preparerName;
    }

    // 컬럼 존재하는 것만 선별 (대소문자/스키마 변화에 안전)
    const toSave = {};
    Object.entries(raw).forEach(([k, v]) => {
      const kk = String(k || '').trim();
      if (!kk) return;
      const key = kk.toUpperCase();
      if (!columns.has(key)) return;
      if (key === 'ANCD' || key === 'PNUM') return;
      if (key === 'INDT') return;

      // 0/1 플래그로 쓰이는 컬럼은 boolean도 허용
      if (/(_CHK|_HELP|^NS_ETC$|^PH_)/i.test(key) && typeof v === 'boolean') {
        toSave[key] = normalizeBoolToDb(v);
        return;
      }
      toSave[key] = v;
    });

    if (Object.keys(toSave).length === 0) {
      return json({ success: false, error: '저장할 값이 없습니다(컬럼 매핑 확인 필요)' }, 400);
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('PNUM', pnum);
    Object.entries(toSave).forEach(([k, val]) => request.input(k, val == null ? null : String(val)));

    const keys = Object.keys(toSave);
    const setSql = keys.map((k) => `t.[${k}] = @${k}`).join(',\n          ');
    const insertCols = keys.map((k) => `[${k}]`).join(',');
    const insertVals = keys.map((k) => `@${k}`).join(',');

    await request.query(`
      IF EXISTS (
        SELECT 1
        FROM [돌봄시설DB].[dbo].[F30112]
        WHERE [ANCD] = @ANCD AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
      )
      BEGIN
        UPDATE t SET
          ${setSql},
          [INDT] = GETDATE()
        FROM [돌봄시설DB].[dbo].[F30112] t
        WHERE t.[ANCD] = @ANCD
          AND CAST(t.[PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
          AND t.[INDT] = (
            SELECT MAX(x.[INDT]) FROM [돌봄시설DB].[dbo].[F30112] x
            WHERE x.[ANCD] = @ANCD AND CAST(x.[PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
          )
      END
      ELSE
      BEGIN
        INSERT INTO [돌봄시설DB].[dbo].[F30112] ([ANCD],[PNUM],${insertCols},[INDT])
        VALUES (@ANCD,@PNUM,${insertVals},GETDATE())
      END
    `);

    return json({ success: true });
  } catch (err) {
    console.error('F30112 POST 오류:', err);
    return json({ success: false, error: err?.message || '서버 오류', details: String(err) }, 500);
  }
}

