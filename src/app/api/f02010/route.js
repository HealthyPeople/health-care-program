/**
 * @file API /api/f02010 — 사용자코드 F02010
 *
 * @description
 * 사용자코드 F02010 Next.js Route Handler. 세션 ANCD 게이트·MSSQL 직접 접근 패턴을 따릅니다.
 *
 * @module app/api/f02010/route
 */
import { connPool } from '../../../config/server';
import { getSessionAncd, ancdEquals } from '../../../config/sessionServer';

import { jsonOk, jsonError } from '../../../utils/apiResponse';

const sql = require('mssql');

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function ymd(value) {
	return String(value ?? '').trim().slice(0, 10);
}

async function ensureF01010JobListColumn(pool) {
	await pool.request().query(`
		IF NOT EXISTS (
			SELECT 1
			FROM [돌봄시설DB].sys.columns c
			INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
			INNER JOIN [돌봄시설DB].sys.schemas s ON t.schema_id = s.schema_id
			WHERE s.name = N'dbo' AND t.name = N'F01010' AND c.name = N'JOBLIST'
		)
		BEGIN
			ALTER TABLE [돌봄시설DB].[dbo].[F01010]
			ADD [JOBLIST] INT NULL;
		END
	`);
}

export async function GET(req) {
  try {
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return jsonError({ success: false, error: '로그인이 필요합니다.' }, 401);
    }

    const pool = await connPool;
    if (!pool) {
      return jsonError({
        success: false,
        error: '데이터베이스 연결 실패'
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const workDate = searchParams.get('workDate') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const empnoParam = searchParams.get('empno');

    try {
      await ensureF01010JobListColumn(pool);
    } catch (colErr) {
      console.warn('F01010 JOBLIST 컬럼 확인 경고:', colErr?.message || colErr);
    }

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
        f01010.[EMPNM],
        f01010.[JOB],
        f01010.[JOBLIST]
      FROM [돌봄시설DB].[dbo].[F02010] f02010
      LEFT JOIN [돌봄시설DB].[dbo].[F01010] f01010
        ON f02010.[ANCD] = f01010.[ANCD]
        AND f02010.[EMPNO] = f01010.[EMPNO]
    `;

    const request = pool.request();
    request.input('sessionAncd', sessionAncd);

    let query = '';

    if (startDate && endDate) {
      request.input('startDate', sql.VarChar(10), ymd(startDate));
      request.input('endDate', sql.VarChar(10), ymd(endDate));
      query = `${baseSelect}
      WHERE f02010.[ANCD] = @sessionAncd
        AND CONVERT(date, f02010.[WDT]) >= CONVERT(date, @startDate)
        AND CONVERT(date, f02010.[WDT]) <= CONVERT(date, @endDate)`;
      if (empnoParam != null && String(empnoParam).trim() !== '') {
        request.input('empno', parseInt(String(empnoParam).trim(), 10));
        query += ` AND f02010.[EMPNO] = @empno`;
      }
      query += ` ORDER BY f01010.[EMPNM], f02010.[WDT]`;
    } else if (workDate) {
      request.input('workDate', sql.VarChar(10), ymd(workDate));
      query = `${baseSelect}
      WHERE CONVERT(date, f02010.[WDT]) = CONVERT(date, @workDate) AND f02010.[ANCD] = @sessionAncd
      ORDER BY f01010.[EMPNM]`;
    } else {
      return jsonError({
        success: false,
        error: '근무일자(workDate) 또는 기간(startDate, endDate) 파라미터가 필요합니다'
      }, 400);
    }

    const result = await request.query(query);

    return jsonOk({
      success: true,
      data: result.recordset || [],
      count: result.recordset ? result.recordset.length : 0
    }, 200, NO_STORE);

  } catch (err) {
    console.error('F02010 테이블 조회 오류:', err);
    return jsonError({
      success: false,
      error: err.message,
      details: err.toString()
    });
  }
}

export async function POST(req) {
  try {
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return jsonError({ success: false, error: '로그인이 필요합니다.' }, 401);
    }

    const pool = await connPool;
    if (!pool) {
      return jsonError({
        success: false,
        error: '데이터베이스 연결 실패'
      });
    }

    const body = await req.json();

    /** 근무상태(JOBST)=1(근무) 사원 전원 — 해당 일자 근태 일괄 생성 */
    if (body.action === 'bulkCreate') {
      const workDate = String(body.workDate || body.WDT || '').trim();
      if (!workDate) {
        return jsonError({
          success: false,
          error: '근무일자(workDate)가 필요합니다'
        }, 400);
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
        .input('workDate', sql.VarChar(10), ymd(workDate))
        .query(`
          SELECT [EMPNO]
          FROM [돌봄시설DB].[dbo].[F02010]
          WHERE [ANCD] = @sessionAncd AND CONVERT(date, [WDT]) = CONVERT(date, @workDate)
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
        ins.input('WDT', sql.VarChar(10), ymd(workDate));
        ins.input('JOBADD', sql.VarChar(50), emp.JOBADD || '');
        ins.input('JOBSH', sql.VarChar(10), String(emp.JOBSH ?? ''));
        ins.input('WGU', sql.VarChar(10), '');
        ins.input('HODES', sql.NVarChar(200), '');
        ins.input('STM', sql.VarChar(10), '');
        ins.input('ETM', sql.VarChar(10), '');

        await ins.query(`
          INSERT INTO [돌봄시설DB].[dbo].[F02010]
            ([ANCD], [EMPNO], [WDT], [JOBADD], [JOBSH], [WGU], [HODES], [STM], [ETM], [INDT])
          VALUES
            (@ANCD, @EMPNO, @WDT, @JOBADD, @JOBSH, @WGU, @HODES, @STM, @ETM, GETDATE())
        `);
        existingSet.add(empno);
        created += 1;
      }

      return jsonOk({
        success: true,
        action: 'bulkCreate',
        workDate,
        created,
        skipped,
        total: employees.length
      });
    }

    const { ANCD, EMPNO, WDT, JOBADD, JOBSH, WGU, HODES, STM, ETM } = body;

    if (!ancdEquals(ANCD, sessionAncd)) {
      return jsonError({
        success: false,
        error: '해당 기관에 대한 접근 권한이 없습니다.'
      }, 403);
    }

    if (!ANCD || !EMPNO || !WDT) {
      return jsonError({
        success: false,
        error: 'ANCD, EMPNO, WDT는 필수입니다'
      }, 400);
    }

    const wdt = ymd(WDT);
    const jobsh = String(JOBSH ?? '').trim();
    const wgu = String(WGU ?? '').trim();

    // 같은 배치에서 UPDATE → 없으면 INSERT. JS에서 @@ROWCOUNT를 잘못 읽으면
    // 2회째부터 INSERT만 시도하거나 중복 행이 생겨 목록이 옛값을 보여준다.
    const request = pool.request();
    request.input('ANCD', sql.Int, Number(ANCD));
    request.input('EMPNO', sql.Int, Number(EMPNO));
    request.input('WDT', sql.VarChar(10), wdt);
    request.input('JOBADD', sql.VarChar(50), JOBADD || '');
    request.input('JOBSH', sql.VarChar(10), jobsh);
    request.input('WGU', sql.VarChar(10), wgu);
    request.input('HODES', sql.NVarChar(500), HODES || '');
    request.input('STM', sql.VarChar(10), STM || '');
    request.input('ETM', sql.VarChar(10), ETM || '');

    const saved = await request.query(`
      SET NOCOUNT ON;

      UPDATE [돌봄시설DB].[dbo].[F02010]
      SET
        [JOBADD] = @JOBADD,
        [JOBSH] = @JOBSH,
        [WGU] = @WGU,
        [HODES] = @HODES,
        [STM] = @STM,
        [ETM] = @ETM,
        [INDT] = GETDATE()
      WHERE [ANCD] = @ANCD
        AND [EMPNO] = @EMPNO
        AND CONVERT(date, [WDT]) = CONVERT(date, @WDT);

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO [돌봄시설DB].[dbo].[F02010]
          ([ANCD], [EMPNO], [WDT], [JOBADD], [JOBSH], [WGU], [HODES], [STM], [ETM], [INDT])
        VALUES
          (@ANCD, @EMPNO, CONVERT(date, @WDT), @JOBADD, @JOBSH, @WGU, @HODES, @STM, @ETM, GETDATE());
      END
      ELSE
      BEGIN
        ;WITH dup AS (
          SELECT
            ROW_NUMBER() OVER (
              PARTITION BY [ANCD], [EMPNO], CONVERT(date, [WDT])
              ORDER BY [INDT] DESC
            ) AS rn
          FROM [돌봄시설DB].[dbo].[F02010]
          WHERE [ANCD] = @ANCD
            AND [EMPNO] = @EMPNO
            AND CONVERT(date, [WDT]) = CONVERT(date, @WDT)
        )
        DELETE FROM dup WHERE rn > 1;
      END

      SELECT TOP 1
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
        f01010.[EMPNM],
        f01010.[JOB],
        f01010.[JOBLIST]
      FROM [돌봄시설DB].[dbo].[F02010] f02010
      LEFT JOIN [돌봄시설DB].[dbo].[F01010] f01010
        ON f02010.[ANCD] = f01010.[ANCD]
        AND f02010.[EMPNO] = f01010.[EMPNO]
      WHERE f02010.[ANCD] = @ANCD
        AND f02010.[EMPNO] = @EMPNO
        AND CONVERT(date, f02010.[WDT]) = CONVERT(date, @WDT)
      ORDER BY f02010.[INDT] DESC;
    `);

    const savedRow =
      (Array.isArray(saved?.recordsets)
        ? saved.recordsets[saved.recordsets.length - 1]?.[0]
        : saved?.recordset?.[0]) || saved?.recordset?.[0] || null;

    return jsonOk({
      success: true,
      message: '근태 데이터가 저장되었습니다',
      data: savedRow
    }, 200, NO_STORE);

  } catch (err) {
    console.error('F02010 테이블 저장 오류:', err);
    return jsonError({
      success: false,
      error: err.message,
      details: err.toString()
    });
  }
}

export async function DELETE(req) {
  try {
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return jsonError({ success: false, error: '로그인이 필요합니다.' }, 401);
    }

    const pool = await connPool;
    if (!pool) {
      return jsonError({
        success: false,
        error: '데이터베이스 연결 실패'
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const empno = searchParams.get('empno');
    const wdt = searchParams.get('wdt');

    if (!ancdEquals(ancd, sessionAncd)) {
      return jsonError({
        success: false,
        error: '해당 기관에 대한 접근 권한이 없습니다.'
      }, 403);
    }

    if (!ancd || !empno || !wdt) {
      return jsonError({
        success: false,
        error: 'ANCD, EMPNO, WDT 파라미터가 필요합니다'
      }, 400);
    }

    const request = pool.request();
    request.input('ancd', sql.Int, Number(ancd));
    request.input('empno', sql.Int, Number(empno));
    request.input('wdt', sql.VarChar(10), ymd(wdt));

    await request.query(`
      DELETE FROM [돌봄시설DB].[dbo].[F02010]
      WHERE [ANCD] = @ancd AND [EMPNO] = @empno
        AND CONVERT(date, [WDT]) = CONVERT(date, @wdt)
    `);

    return jsonOk({
      success: true,
      message: '근태 데이터가 삭제되었습니다'
    }, 200, NO_STORE);

  } catch (err) {
    console.error('F02010 테이블 삭제 오류:', err);
    return jsonError({
      success: false,
      error: err.message,
      details: err.toString()
    });
  }
}
