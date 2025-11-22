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

    // URL에서 파라미터 추출
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const pnum = searchParams.get('pnum');

    // F10020 테이블에서 보호자 정보 조회
    let query = `
      SELECT 
        [ANCD],
        [PNUM],
        [BHNUM],
        [BHNM],
        [BHREL],
        [BHETC],
        [BHJB],
        [P_ZIP],
        [P_ADDR],
        [P_TEL],
        [P_HP],
        [P_EMAIL],
        [CONGU],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM]
      FROM [돌봄시설DB].[dbo].[F10020]
    `;

    const request = pool.request();

    // ANCD와 PNUM으로 필터링
    if (ancd && pnum) {
      query += ` WHERE [ANCD] = @ancd AND [PNUM] = @pnum`;
      request.input('ancd', ancd);
      request.input('pnum', pnum);
    } else if (ancd) {
      query += ` WHERE [ANCD] = @ancd`;
      request.input('ancd', ancd);
    } else if (pnum) {
      query += ` WHERE [PNUM] = @pnum`;
      request.input('pnum', pnum);
    }

    query += ` ORDER BY [INDT] DESC`;

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
    console.error('F10020 테이블 조회 오류:', err);
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

