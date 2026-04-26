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

