import { connPool } from '../../../config/server';
import { NextRequest } from 'next/server';

export async function GET(req) {
  try {
    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({
        success: false,
        error: '데이터베이스 연결 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const workDate = searchParams.get('workDate') || '';

    if (!workDate) {
      return new Response(JSON.stringify({
        success: false,
        error: '근무일자(workDate) 파라미터가 필요합니다'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // F02010 테이블에서 근무일자에 맞는 근태 데이터 조회
    // F01010과 조인하여 사원명 가져오기
    let query = `
      SELECT 
        f02010.[ANCD],
        f02010.[EMPNO],
        f02010.[WDT],
        f02010.[JOBADD],
        f02010.[JOBSH],
        f02010.[WGU],
        f02010.[HODES],
        f02010.[STM],
        f02010.[ETM],
        f02010.[INDT],
        f01010.[EMPNM]
      FROM [돌봄시설DB].[dbo].[F02010] f02010
      LEFT JOIN [돌봄시설DB].[dbo].[F01010] f01010
        ON f02010.[ANCD] = f01010.[ANCD]
        AND f02010.[EMPNO] = f01010.[EMPNO]
      WHERE f02010.[WDT] = @workDate
      ORDER BY f01010.[EMPNM]
    `;

    const request = pool.request();
    request.input('workDate', workDate);

    const result = await request.query(query);

    return new Response(JSON.stringify({
      success: true,
      data: result.recordset || [],
      count: result.recordset ? result.recordset.length : 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('F02010 테이블 조회 오류:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      details: err.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req) {
  try {
    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({
        success: false,
        error: '데이터베이스 연결 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { ANCD, EMPNO, WDT, JOBADD, JOBSH, WGU, HODES, STM, ETM } = body;

    if (!ANCD || !EMPNO || !WDT) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ANCD, EMPNO, WDT는 필수입니다'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // INSERT 또는 UPDATE (MERGE 사용)
    let query = `
      MERGE [돌봄시설DB].[dbo].[F02010] AS target
      USING (SELECT @ANCD AS ANCD, @EMPNO AS EMPNO, @WDT AS WDT) AS source
      ON target.[ANCD] = source.[ANCD] 
        AND target.[EMPNO] = source.[EMPNO]
        AND target.[WDT] = source.[WDT]
      WHEN MATCHED THEN
        UPDATE SET
          [JOBADD] = @JOBADD,
          [JOBSH] = @JOBSH,
          [WGU] = @WGU,
          [HODES] = @HODES,
          [STM] = @STM,
          [ETM] = @ETM,
          [INDT] = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT ([ANCD], [EMPNO], [WDT], [JOBADD], [JOBSH], [WGU], [HODES], [STM], [ETM], [INDT])
        VALUES (@ANCD, @EMPNO, @WDT, @JOBADD, @JOBSH, @WGU, @HODES, @STM, @ETM, GETDATE());
    `;

    const request = pool.request();
    request.input('ANCD', ANCD);
    request.input('EMPNO', EMPNO);
    request.input('WDT', WDT);
    request.input('JOBADD', JOBADD || '');
    request.input('JOBSH', JOBSH || '');
    request.input('WGU', WGU || '');
    request.input('HODES', HODES || '');
    request.input('STM', STM || '');
    request.input('ETM', ETM || '');

    await request.query(query);

    return new Response(JSON.stringify({
      success: true,
      message: '근태 데이터가 저장되었습니다'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('F02010 테이블 저장 오류:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      details: err.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(req) {
  try {
    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({
        success: false,
        error: '데이터베이스 연결 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const empno = searchParams.get('empno');
    const wdt = searchParams.get('wdt');

    if (!ancd || !empno || !wdt) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ANCD, EMPNO, WDT 파라미터가 필요합니다'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      DELETE FROM [돌봄시설DB].[dbo].[F02010]
      WHERE [ANCD] = @ancd AND [EMPNO] = @empno AND [WDT] = @wdt
    `;

    const request = pool.request();
    request.input('ancd', ancd);
    request.input('empno', empno);
    request.input('wdt', wdt);

    await request.query(query);

    return new Response(JSON.stringify({
      success: true,
      message: '근태 데이터가 삭제되었습니다'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('F02010 테이블 삭제 오류:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      details: err.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
