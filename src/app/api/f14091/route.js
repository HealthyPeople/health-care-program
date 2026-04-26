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

// F14091 저장(업서트)
// POST /api/f14091?yyyymm=YYYYMM&pnum=PNUM
// body: { PH_VIEW?, NS_VIEW?, FN_VIEW?, RG_VIEW? }
export async function POST(req) {
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

    const body = await req.json().catch(() => ({}));
    const PH_VIEW = body?.PH_VIEW ?? body?.ph_view ?? '';
    const NS_VIEW = body?.NS_VIEW ?? body?.ns_view ?? '';
    const FN_VIEW = body?.FN_VIEW ?? body?.fn_view ?? '';
    const RG_VIEW = body?.RG_VIEW ?? body?.rg_view ?? '';

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
    request.input('PH_VIEW', String(PH_VIEW ?? ''));
    request.input('NS_VIEW', String(NS_VIEW ?? ''));
    request.input('FN_VIEW', String(FN_VIEW ?? ''));
    request.input('RG_VIEW', String(RG_VIEW ?? ''));

    const query = `
      MERGE [돌봄시설DB].[dbo].[F14091] AS T
      USING (SELECT @ANCD AS ANCD, @YYYYMM AS YYYYMM, @PNUM AS PNUM) AS S
        ON (T.[ANCD] = S.[ANCD]
            AND CAST(T.[YYYYMM] AS VARCHAR) = CAST(S.[YYYYMM] AS VARCHAR)
            AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR))
      WHEN MATCHED THEN
        UPDATE SET
          [PH_VIEW] = @PH_VIEW,
          [NS_VIEW] = @NS_VIEW,
          [FN_VIEW] = @FN_VIEW,
          [RG_VIEW] = @RG_VIEW
      WHEN NOT MATCHED THEN
        INSERT ([ANCD],[YYYYMM],[PNUM],[PH_VIEW],[NS_VIEW],[FN_VIEW],[RG_VIEW])
        VALUES (@ANCD,@YYYYMM,@PNUM,@PH_VIEW,@NS_VIEW,@FN_VIEW,@RG_VIEW);
    `;

    await request.query(query);

    return new Response(JSON.stringify({
      success: true,
      data: { ANCD: gate.sessionAncd, YYYYMM: String(yyyymm), PNUM: String(pnum), PH_VIEW, NS_VIEW, FN_VIEW, RG_VIEW }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('F14091 저장 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

