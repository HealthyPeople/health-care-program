import { connPool } from '../../../config/server';
import { NextRequest } from 'next/server';
import { getSessionAncd, ancdEquals } from '../../../config/sessionServer';

export async function GET(req) {
  try {
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return new Response(
        JSON.stringify({ success: false, error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const empnoParam = searchParams.get('empno');

    const baseSelect = `
      SELECT 
        f02010.[ANCD],
        f02010.[EMPNO],
        CONVERT(varchar(10), f02010.[WDT], 23) AS [WDT],
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
    `;

    const request = pool.request();
    request.input('sessionAncd', sessionAncd);

    let query = '';

    if (startDate && endDate) {
      request.input('startDate', startDate);
      request.input('endDate', endDate);
      query = `${baseSelect}
      WHERE f02010.[ANCD] = @sessionAncd
        AND f02010.[WDT] >= @startDate
        AND f02010.[WDT] <= @endDate`;
      if (empnoParam != null && String(empnoParam).trim() !== '') {
        request.input('empno', parseInt(String(empnoParam).trim(), 10));
        query += ` AND f02010.[EMPNO] = @empno`;
      }
      query += ` ORDER BY f01010.[EMPNM], f02010.[WDT]`;
    } else if (workDate) {
      request.input('workDate', workDate);
      query = `${baseSelect}
      WHERE f02010.[WDT] = @workDate AND f02010.[ANCD] = @sessionAncd
      ORDER BY f01010.[EMPNM]`;
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: '근무일자(workDate) 또는 기간(startDate, endDate) 파라미터가 필요합니다'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return new Response(
        JSON.stringify({ success: false, error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    /** 근무상태(JOBST)=1(근무) 사원 전원 — 해당 일자 근태 일괄 생성 */
    if (body.action === 'bulkCreate') {
      const workDate = String(body.workDate || body.WDT || '').trim();
      if (!workDate) {
        return new Response(JSON.stringify({
          success: false,
          error: '근무일자(workDate)가 필요합니다'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const empResult = await pool.request()
        .input('sessionAncd', sessionAncd)
        .query(`
          SELECT [ANCD], [EMPNO], [EMPNM], [JOBADD], [JOBSH]
          FROM [돌봄시설DB].[dbo].[F01010]
          WHERE [ANCD] = @sessionAncd
            AND LTRIM(RTRIM(CAST([JOBST] AS VARCHAR(10)))) = '1'
            AND LTRIM(RTRIM([EMPNM])) <> ''
          ORDER BY [EMPNM]
        `);

      const existingResult = await pool.request()
        .input('sessionAncd', sessionAncd)
        .input('workDate', workDate)
        .query(`
          SELECT [EMPNO]
          FROM [돌봄시설DB].[dbo].[F02010]
          WHERE [ANCD] = @sessionAncd AND [WDT] = @workDate
        `);

      const existingSet = new Set(
        (existingResult.recordset || []).map((r) => Number(r.EMPNO))
      );

      const employees = empResult.recordset || [];
      let created = 0;
      let skipped = 0;

      for (const emp of employees) {
        const empno = Number(emp.EMPNO);
        if (existingSet.has(empno)) {
          skipped += 1;
          continue;
        }

        const ins = pool.request();
        ins.input('ANCD', sessionAncd);
        ins.input('EMPNO', empno);
        ins.input('WDT', workDate);
        ins.input('JOBADD', emp.JOBADD || '');
        ins.input('JOBSH', emp.JOBSH || '');
        ins.input('WGU', '');
        ins.input('HODES', '');
        ins.input('STM', '');
        ins.input('ETM', '');

        await ins.query(`
          INSERT INTO [돌봄시설DB].[dbo].[F02010]
            ([ANCD], [EMPNO], [WDT], [JOBADD], [JOBSH], [WGU], [HODES], [STM], [ETM], [INDT])
          VALUES
            (@ANCD, @EMPNO, @WDT, @JOBADD, @JOBSH, @WGU, @HODES, @STM, @ETM, GETDATE())
        `);
        existingSet.add(empno);
        created += 1;
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'bulkCreate',
        workDate,
        created,
        skipped,
        total: employees.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { ANCD, EMPNO, WDT, JOBADD, JOBSH, WGU, HODES, STM, ETM } = body;

    if (!ancdEquals(ANCD, sessionAncd)) {
      return new Response(JSON.stringify({
        success: false,
        error: '해당 기관에 대한 접근 권한이 없습니다.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return new Response(
        JSON.stringify({ success: false, error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    if (!ancdEquals(ancd, sessionAncd)) {
      return new Response(JSON.stringify({
        success: false,
        error: '해당 기관에 대한 접근 권한이 없습니다.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
