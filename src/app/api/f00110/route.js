import { connPool } from '../../../config/server';
import { getSessionAncd } from '../../../config/sessionServer';

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

    // 가능한 테이블명들을 시도
    const possibleTableNames = [
      '[돌봄시설DB].[dbo].[F00110]',
      '돌봄시설DB.dbo.F00110'
    ];

    let lastError = null;
    let result = null;

    for (const tableName of possibleTableNames) {
      try {
        // 로그인한 기관(ANCD)만 조회
        const query = `SELECT TOP (1000) [ANCD]
      ,[ANNM]
      ,[ANGH]
      ,[ANSDT]
      ,[ANEDT]
      ,[ANZIP]
      ,[ANADD]
      ,[ANTEL]
      ,[ANFAX]
      ,[ANDOMAIN]
      ,[ANEMAIL]
      ,[ANHP]
      ,[MNM]
      ,[ANAMT]
      ,[TAXYN]
      ,[TAXNM]
      ,[TAXOWN]
      ,[TAXNUM]
      ,[TAXADD]
      ,[TAXJOB]
      ,[TAXJOB1]
      ,[TAXEMAIL1]
      ,[TAXEMAIL2]
      ,[TAXEMAIL3]
      ,[DEL]
      ,[ENYN]
      ,[PWDD]
      ,[INDT]
      ,[ETC]
      ,[SECYN]
      ,[MAXCNT]
      ,[D_LVL]
      ,[TRANS_GU]
      ,[TRANS_OBJ3]
      ,[SNM]
      ,[S_GU]
      ,[RDES]
      ,[B_EAMT]
      ,[B_ETAMT]
      ,[MH_ANCD]
      ,[WK_DT_DEL_FLAG]
      ,[DG_SRV_GU]
      ,[MED_GU]
      ,[MSG_DUE_DD]
      ,[SRV_DESC]
      ,[CMP_MM_FLAG]
      ,[OUT_COMP_FLAG]
      ,[CPY_CNTR_FLAG]
      ,[CPY_CNTR_ANCD]
  FROM ${tableName}
  WHERE [ANCD] = @sessionAncd`;
        
        result = await pool.request().input('sessionAncd', sessionAncd).query(query);
        console.log(`성공적으로 조회된 테이블: ${tableName}`);
        break;
      } catch (err) {
        lastError = err;
        console.log(`테이블 ${tableName} 조회 실패:`, err.message);
        continue;
      }
    }

    if (!result) {
      // 모든 테이블명이 실패한 경우, F00110과 비슷한 테이블 검색
      const searchResult = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%F00110%' 
        OR TABLE_NAME LIKE '%F001%'
        OR TABLE_NAME LIKE '%00110%'
        ORDER BY TABLE_NAME
      `);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'F00110 테이블을 찾을 수 없습니다',
        suggestions: searchResult.recordset,
        lastError: lastError?.message
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.recordset,
      count: result.recordset.length,
      tableFound: true
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('F00110 테이블 조회 오류:', err);
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
    const { query, params } = body;

    if (!query) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '쿼리가 필요합니다' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 동적 쿼리 실행
    const request = pool.request();
    
    // 파라미터가 있으면 추가
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });
    }

    const result = await request.query(query);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.recordset,
      count: result.recordset.length
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('쿼리 실행 오류:', err);
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
