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

    // 최신 1건(있다면)을 PNUM별로 가져오기 위해 ROW_NUMBER 사용 (INDT 컬럼이 일반적으로 존재)
    const inParams = [];
    pnums.forEach((v, idx) => {
      const key = `p${idx}`;
      inParams.push(`@${key}`);
      request.input(key, v);
    });

    const query = `
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

    // 화면(장기요양-신체활동)에서 쓰는 필드 위주로 저장
    // F30112 스키마(이미지) 기준으로 존재하는 컬럼만 사용
    const inputs = {
      ANCD: gate.sessionAncd,
      PNUM: pnum,
      // 식사
      ST_KIND: cleanStr(body?.ST_KIND ?? body?.mealType ?? body?.PH_MEAL_KIND_NM),
      ST_PLAC: cleanStr(body?.ST_PLAC ?? body?.mealLocation),
      ST_CONF: cleanStr(body?.ST_CONF ?? body?.mealConfirmer),
      PH_MEAL_KIND_NM: cleanStr(body?.PH_MEAL_KIND_NM ?? body?.mealType),
      PH_MEAL_VAL_NM: cleanStr(body?.PH_MEAL_VAL_NM ?? body?.mealIntake),
      PH_MEAL_WT_NM: cleanStr(body?.PH_MEAL_WT_NM ?? body?.mealClassification),

      // 목욕
      PH_BATH_METH_NM: cleanStr(body?.PH_BATH_METH_NM ?? body?.bathMethod),
      PH_BATH_TM: cleanInt(body?.PH_BATH_TM ?? body?.bathTimeRequired),
      PH_BATH_WK1: cleanStr(body?.PH_BATH_WK1 ?? body?.bathDay1),
      PH_BATH_WK2: cleanStr(body?.PH_BATH_WK2 ?? body?.bathDay2),
      BATH_SPV_TM: cleanStr(body?.BATH_SPV_TM ?? body?.bathTime),
      BATH_EMPNM01: cleanStr(body?.BATH_EMPNM01 ?? body?.bathProvider1),
      BATH_EMPNM02: cleanStr(body?.BATH_EMPNM02 ?? body?.bathProvider2),

      // 신체활동
      PH_HEAD_HELP: normalizeBoolToDb(body?.PH_HEAD_HELP ?? body?.faceWashing ?? body?.grooming),
      PH_MOVE_HELP: normalizeBoolToDb(body?.PH_MOVE_HELP ?? body?.movementAssistance),
      PH_CHANG_HELP: normalizeBoolToDb(body?.PH_CHANG_HELP ?? body?.positionChange),
      PH_WORK_HELP: normalizeBoolToDb(body?.PH_WORK_HELP ?? body?.walkAccompany),
      PH_OUT_HELP: normalizeBoolToDb(body?.PH_OUT_HELP ?? body?.outingAccompany),
      PH_TOL_CNT: cleanInt(body?.PH_TOL_CNT ?? body?.toiletUsage),

      // 작성자
      INEMPNM: cleanStr(body?.INEMPNM ?? body?.preparerName),
    };

    const request = pool.request();
    Object.entries(inputs).forEach(([k, val]) => request.input(k, val));

    // 최신 1건이 있으면 갱신, 없으면 삽입
    // (INDT가 기준정보의 이력 컬럼인 경우가 많아 최신건 기준으로 업데이트)
    await request.query(`
      IF EXISTS (
        SELECT 1
        FROM [돌봄시설DB].[dbo].[F30112]
        WHERE [ANCD] = @ANCD AND CAST([PNUM] AS VARCHAR) = CAST(@PNUM AS VARCHAR)
      )
      BEGIN
        UPDATE t SET
          [ST_KIND] = @ST_KIND,
          [ST_PLAC] = @ST_PLAC,
          [ST_CONF] = @ST_CONF,
          [PH_MEAL_KIND_NM] = @PH_MEAL_KIND_NM,
          [PH_MEAL_VAL_NM] = @PH_MEAL_VAL_NM,
          [PH_MEAL_WT_NM] = @PH_MEAL_WT_NM,
          [PH_BATH_METH_NM] = @PH_BATH_METH_NM,
          [PH_BATH_TM] = @PH_BATH_TM,
          [PH_BATH_WK1] = @PH_BATH_WK1,
          [PH_BATH_WK2] = @PH_BATH_WK2,
          [BATH_SPV_TM] = @BATH_SPV_TM,
          [BATH_EMPNM01] = @BATH_EMPNM01,
          [BATH_EMPNM02] = @BATH_EMPNM02,
          [PH_HEAD_HELP] = @PH_HEAD_HELP,
          [PH_MOVE_HELP] = @PH_MOVE_HELP,
          [PH_CHANG_HELP] = @PH_CHANG_HELP,
          [PH_WORK_HELP] = @PH_WORK_HELP,
          [PH_OUT_HELP] = @PH_OUT_HELP,
          [PH_TOL_CNT] = @PH_TOL_CNT,
          [INEMPNM] = @INEMPNM,
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
        INSERT INTO [돌봄시설DB].[dbo].[F30112] (
          [ANCD],[PNUM],
          [ST_KIND],[ST_PLAC],[ST_CONF],
          [PH_MEAL_KIND_NM],[PH_MEAL_VAL_NM],[PH_MEAL_WT_NM],
          [PH_BATH_METH_NM],[PH_BATH_TM],[PH_BATH_WK1],[PH_BATH_WK2],
          [BATH_SPV_TM],[BATH_EMPNM01],[BATH_EMPNM02],
          [PH_HEAD_HELP],[PH_MOVE_HELP],[PH_CHANG_HELP],[PH_WORK_HELP],[PH_OUT_HELP],[PH_TOL_CNT],
          [INEMPNM],
          [INDT]
        ) VALUES (
          @ANCD,@PNUM,
          @ST_KIND,@ST_PLAC,@ST_CONF,
          @PH_MEAL_KIND_NM,@PH_MEAL_VAL_NM,@PH_MEAL_WT_NM,
          @PH_BATH_METH_NM,@PH_BATH_TM,@PH_BATH_WK1,@PH_BATH_WK2,
          @BATH_SPV_TM,@BATH_EMPNM01,@BATH_EMPNM02,
          @PH_HEAD_HELP,@PH_MOVE_HELP,@PH_CHANG_HELP,@PH_WORK_HELP,@PH_OUT_HELP,@PH_TOL_CNT,
          @INEMPNM,
          GETDATE()
        )
      END
    `);

    return json({ success: true });
  } catch (err) {
    console.error('F30112 POST 오류:', err);
    return json({ success: false, error: err?.message || '서버 오류', details: String(err) }, 500);
  }
}

