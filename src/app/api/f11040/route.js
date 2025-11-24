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
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');

    console.log('[F11040 API] 요청 파라미터 - ANCD:', ancd, 'PNUM:', pnum, 'PNUM 타입:', typeof pnum);

    if (!ancd || !pnum) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ANCD와 PNUM 파라미터가 필요합니다' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PNUM이 숫자 문자열인 경우 숫자로 변환 시도
    const pnumValue = isNaN(Number(pnum)) ? pnum : Number(pnum);
    
    let query = `
      SELECT 
        [ANCD],
        [PNUM],
        [MEDT],
        [MDIC],
        [MINFO],
        [MENUM],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM]
      FROM [돌봄시설DB].[dbo].[F11040]
      WHERE [ANCD] = @ancd AND CAST([PNUM] AS VARCHAR) = CAST(@pnum AS VARCHAR)
      ORDER BY [MEDT] DESC, [INDT] DESC
    `;

    const request = pool.request();
    request.input('ancd', ancd);
    request.input('pnum', String(pnum)); // 항상 문자열로 전달하여 타입 불일치 방지
    
    console.log('[F11040 API] 쿼리 실행 - ANCD:', ancd, 'PNUM:', pnum, 'PNUM 타입:', typeof pnum);

    const result = await request.query(query);
    
    console.log('[F11040 API] 조회 결과 수:', result.recordset ? result.recordset.length : 0);
    if (result.recordset && result.recordset.length > 0) {
      console.log('[F11040 API] 첫 번째 레코드:', result.recordset[0]);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.recordset || [],
      count: result.recordset ? result.recordset.length : 0
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('F11040 테이블 조회 오류:', err);
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

