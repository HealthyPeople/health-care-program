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

    // F10010 테이블에서 수급자 정보 조회
    let query = `
      SELECT TOP 1000 
        [ANCD],
        [PNUM],
        [P_NM],
        [P_BRDT],
        [P_NO],
        [P_SEX],
        [P_ZIP],
        [P_ADDR],
        [P_TEL],
        [P_GRD],
        [P_YYNO],
        [P_YYDT],
        [P_ST],
        [P_CINFO],
        [P_CTDT],
        [P_SDT],
        [P_EDT],
        [HCANUM],
        [HCAINFO],
        [HSPT],
        [DTNM],
        [DTTEL],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM],
        [P_HP],
        [P_YYSDT],
        [P_YYEDT]
      FROM [돌봄시설DB].[dbo].[F10010]
    `;

    const request = pool.request();

    // 이름 검색 조건 추가
    if (searchName && searchName.trim() !== '') {
      query += ` WHERE [P_NM] LIKE @searchName`;
      request.input('searchName', `%${searchName.trim()}%`);
    }

    query += ` ORDER BY [ANCD], [INDT] DESC`;

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
