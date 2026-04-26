import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

// F14090 (월 집계) 조회
// GET /api/f14090?yyyymm=YYYYMM
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const yyyymmRaw = searchParams.get('yyyymm'); // 'YYYYMM' or 'YYYY-MM'
    const ancd = searchParams.get('ancd'); // optional, 세션 검증용

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const yyyymm = String(yyyymmRaw || '').replace(/\D/g, '');
    if (!yyyymm || !/^\d{6}$/.test(yyyymm)) {
      return new Response(JSON.stringify({ success: false, error: 'yyyymm(YYYYMM) 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('sessionAncd', gate.sessionAncd);
    request.input('yyyymm', yyyymm);

    // 화면 표시용으로 F10010(수급자 기본정보)와 LEFT JOIN.
    // 날짜 조회는 YYYYMM 컬럼 기준으로만 수행한다.
    const query = `
      SELECT
        f14090.*,
        f10010.[P_NM],
        f10010.[P_BRDT],
        f10010.[P_SEX],
        f10010.[P_GRD],
        f10010.[P_YYNO],
        f10010.[P_YYEDT]
      FROM [돌봄시설DB].[dbo].[F14090] f14090
      LEFT JOIN [돌봄시설DB].[dbo].[F10010] f10010
        ON f14090.[ANCD] = f10010.[ANCD]
       AND f14090.[PNUM] = f10010.[PNUM]
      WHERE f14090.[ANCD] = @sessionAncd
        AND CAST(f14090.[YYYYMM] AS VARCHAR) = CAST(@yyyymm AS VARCHAR)
      ORDER BY f10010.[P_NM] ASC
    `;
    const result = await request.query(query);

    return new Response(
      JSON.stringify({ success: true, data: result.recordset || [], count: result.recordset ? result.recordset.length : 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('F14090 테이블 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// F14090 저장(업서트 - 화면에서 수정 가능한 항목)
// POST /api/f14090?yyyymm=YYYYMM&pnum=PNUM
// body: 수정 가능한 컬럼 일부(체크/바이탈/목욕/식사 등)
export async function POST(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const yyyymmRaw = searchParams.get('yyyymm');
    const pnum = searchParams.get('pnum');
    const ancd = searchParams.get('ancd'); // optional

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const yyyymm = String(yyyymmRaw || '').replace(/\D/g, '');
    if (!yyyymm || !/^\d{6}$/.test(yyyymm) || !pnum) {
      return new Response(JSON.stringify({ success: false, error: 'yyyymm(YYYYMM)과 pnum 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const request = pool.request();
    request.input('ANCD', gate.sessionAncd);
    request.input('YYYYMM', String(yyyymm));
    request.input('PNUM', String(pnum));

    const pick = (k) => (body && Object.prototype.hasOwnProperty.call(body, k) ? body[k] : null);

    // === 수정 가능 컬럼들 ===
    const editableKeys = [
      // 신체활동
      'PH_HEAD_HELP','PH_MOVE_HELP','PH_CHANG_HELP','PH_WORK_HELP','PH_OUT_HELP',
      'PH_BATH_CNT','PH_BATH_METH','PH_BATH_METH_NM',
      'PH_MEAL_KIND','PH_MEAL_KIND_NM','PH_MEAL_VAL','PH_MEAL_VAL_NM','PH_MEAL_WT','PH_MEAL_WT_NM',
      // 간호/건강
      'NS_SBDP','NS_EBDP','NS_TMPBD',
      'NS_ETC','NS_SORE_CHK','NS_MEDI_CHK','NS_SORE_MNG_NM',
      'NS_HEALTH_HELP_NM','NS_NURSE_HELP_NM','NS_ETC_NM','NS_ETC_DESC',
      // 인지/기능
      'FN_COGN_HELP','FN_MOVE_HELP','FN_MIND_HELP','FN_MIND_TRAIN','FN_PHY_HELP',
      // 제공/외박/방번호 (개인정보 제외지만 화면상 값)
      'SV_CNT','AB_CNT','ROOM_NO'
    ];

    editableKeys.forEach((k) => request.input(k, pick(k) == null ? null : String(pick(k))));

    const setSql = editableKeys.map((k) => `T.[${k}] = @${k}`).join(',\n          ');
    const insertCols = editableKeys.map((k) => `[${k}]`).join(',');
    const insertVals = editableKeys.map((k) => `@${k}`).join(',');

    const query = `
      MERGE [돌봄시설DB].[dbo].[F14090] AS T
      USING (SELECT @ANCD AS ANCD, @YYYYMM AS YYYYMM, @PNUM AS PNUM) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[YYYYMM] AS VARCHAR) = CAST(S.[YYYYMM] AS VARCHAR)
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR))
      WHEN MATCHED THEN
        UPDATE SET
          ${setSql}
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[YYYYMM],[PNUM],${insertCols})
        VALUES (@ANCD,@YYYYMM,@PNUM,${insertVals});
    `;

    await request.query(query);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F14090 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

