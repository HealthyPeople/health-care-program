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

    // F10020 테이블에서 보호자 정보 조회하고 F10110과 조인하여 계약기간 정보 가져오기
    let query = `
      SELECT 
        f10020.[ANCD],
        f10020.[PNUM],
        f10020.[BHNUM],
        f10020.[BHNM],
        f10020.[BHREL],
        f10020.[BHETC],
        f10020.[BHJB],
        f10020.[P_ZIP],
        f10020.[P_ADDR],
        f10020.[P_TEL],
        f10020.[P_HP],
        f10020.[P_EMAIL],
        f10020.[CONGU],
        f10020.[INDT],
        f10020.[ETC],
        f10020.[INEMPNO],
        f10020.[INEMPNM],
        f10110.[SVSDT],
        f10110.[SVEDT]
      FROM [돌봄시설DB].[dbo].[F10020] f10020
      LEFT JOIN (
        SELECT 
          [ANCD],
          [PNUM],
          [SVSDT],
          [SVEDT],
          ROW_NUMBER() OVER (PARTITION BY [ANCD], [PNUM] ORDER BY [INDT] DESC) as rn
        FROM [돌봄시설DB].[dbo].[F10110]
      ) f10110 ON f10020.[ANCD] = f10110.[ANCD] 
               AND f10020.[PNUM] = f10110.[PNUM]
               AND f10110.rn = 1
    `;

    const request = pool.request();

    // ANCD와 PNUM으로 필터링
    if (ancd && pnum) {
      query += ` WHERE f10020.[ANCD] = @ancd AND f10020.[PNUM] = @pnum`;
      request.input('ancd', ancd);
      request.input('pnum', pnum);
    } else if (ancd) {
      query += ` WHERE f10020.[ANCD] = @ancd`;
      request.input('ancd', ancd);
    } else if (pnum) {
      query += ` WHERE f10020.[PNUM] = @pnum`;
      request.input('pnum', pnum);
    }

    query += ` ORDER BY f10020.[INDT] DESC`;

    const result = await request.query(query);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.recordset || [],
      count: result.recordset?.length || 0
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

