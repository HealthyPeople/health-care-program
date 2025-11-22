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

    // URL에서 검색어 추출
    const searchParams = req.nextUrl.searchParams;
    const searchName = searchParams.get('name') || '';

    // F10010 테이블과 F10110 테이블을 조인해서 수급자 정보 및 계약정보 조회
    // F10110에서 각 (ANCD, PNUM) 조합에 대해 최신 1건만 가져오기 위해 서브쿼리 사용
    let query = `
      SELECT TOP 1000 
        f10010.[ANCD],
        f10010.[PNUM],
        f10010.[P_NM],
        f10010.[P_BRDT],
        f10010.[P_NO],
        f10010.[P_SEX],
        f10010.[P_ZIP],
        f10010.[P_ADDR],
        f10010.[P_TEL],
        f10010.[P_GRD],
        f10010.[P_YYNO],
        f10010.[P_YYDT],
        f10010.[P_ST],
        f10010.[P_CINFO],
        f10010.[P_CTDT],
        f10010.[P_SDT],
        f10010.[P_EDT],
        f10010.[HCANUM],
        f10010.[HCAINFO],
        f10010.[HSPT],
        f10010.[DTNM],
        f10010.[DTTEL],
        f10010.[INDT],
        f10010.[ETC],
        f10010.[INEMPNO],
        f10010.[INEMPNM],
        f10010.[P_HP],
        f10010.[P_YYSDT],
        f10010.[P_YYEDT],
        f10110.[SVSDT],
        f10110.[SVEDT],
        f10110.[INSPER],
        f10110.[USRPER],
        f10110.[USRGU],
        f10110.[USRINFO],
        f10110.[EAMT],
        f10110.[ETAMT],
        f10110.[ESAMT],
        f10020.[BHNM],
        f10020.[BHREL],
        f10020.[BHETC],
        f10020.[BHJB],
        f10020.[P_ZIP] as GUARDIAN_P_ZIP,
        f10020.[P_ADDR] as GUARDIAN_P_ADDR,
        f10020.[P_TEL] as GUARDIAN_P_TEL,
        f10020.[P_HP] as GUARDIAN_P_HP,
        f10020.[P_EMAIL],
        f10020.[CONGU]
      FROM [돌봄시설DB].[dbo].[F10010] f10010
      LEFT JOIN (
        SELECT 
          [ANCD],
          [PNUM],
          [SVSDT],
          [SVEDT],
          [INSPER],
          [USRPER],
          [USRGU],
          [USRINFO],
          [EAMT],
          [ETAMT],
          [ESAMT],
          ROW_NUMBER() OVER (PARTITION BY [ANCD], [PNUM] ORDER BY [INDT] DESC) as rn
        FROM [돌봄시설DB].[dbo].[F10110]
      ) f10110 ON f10010.[ANCD] = f10110.[ANCD] 
               AND f10010.[PNUM] = f10110.[PNUM]
               AND f10110.rn = 1
      LEFT JOIN [돌봄시설DB].[dbo].[F10020] f10020 ON f10010.[ANCD] = f10020.[ANCD] 
                                                    AND f10010.[PNUM] = f10020.[PNUM]
    `;

    const request = pool.request();

    // 이름 검색 조건 추가
    if (searchName && searchName.trim() !== '') {
      query += ` WHERE f10010.[P_NM] LIKE @searchName`;
      request.input('searchName', `%${searchName.trim()}%`);
    }

    query += ` ORDER BY f10010.[ANCD], f10010.[INDT] DESC`;

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
    console.error('F10010 테이블 조회 오류:', err);
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
