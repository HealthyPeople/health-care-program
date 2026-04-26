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

