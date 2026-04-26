import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

// F14091 조회
// GET /api/f14091?yyyymm=YYYYMM&pnum=PNUM
export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const yyyymmRaw = searchParams.get('yyyymm'); // 'YYYYMM' or 'YYYY-MM'
    const pnum = searchParams.get('pnum');
    const ancd = searchParams.get('ancd'); // optional

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const yyyymm = String(yyyymmRaw || '').replace(/\D/g, '');
    if (!yyyymm || !/^\d{6}$/.test(String(yyyymm)) || !pnum) {
      return new Response(JSON.stringify({ success: false, error: 'yyyymm(YYYYMM)과 pnum 파라미터가 필요합니다' }), {
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
    request.input('yyyymm', String(yyyymm));
    request.input('pnum', String(pnum));

    // 날짜 조회는 YYYYMM 컬럼 기준으로만 수행한다.
    const query = `
      SELECT
        f14091.[ANCD],
        f14091.[YYYYMM],
        f14091.[PNUM],
        f14091.[PH_VIEW],
        f14091.[NS_VIEW],
        f14091.[FN_VIEW],
        f14091.[RG_VIEW]
      FROM [돌봄시설DB].[dbo].[F14091] f14091
      WHERE f14091.[ANCD] = @sessionAncd
        AND CAST(f14091.[YYYYMM] AS VARCHAR) = CAST(@yyyymm AS VARCHAR)
        AND CAST(f14091.[PNUM] AS VARCHAR) = CAST(@pnum AS VARCHAR)
    `;
    const result = await request.query(query);
    const row = (result.recordset && result.recordset[0]) ? result.recordset[0] : null;

    return new Response(JSON.stringify({ success: true, data: row }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F14091 테이블 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

