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

    if (!ancd || !pnum) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ANCD와 PNUM 파라미터가 필요합니다' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      SELECT 
        [ANCD],
        [PNUM],
        [CSDT],
        [EMPNO],
        [EMPNM],
        [BHREL],
        [STM],
        [ETM],
        [CSGU],
        [CSINFO],
        [CSM],
        [CSNUM],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM],
        [BHRELNM]
      FROM [돌봄시설DB].[dbo].[F11020]
      WHERE [ANCD] = @ancd AND [PNUM] = @pnum
      ORDER BY [CSDT] DESC, [INDT] DESC
    `;

    const request = pool.request();
    request.input('ancd', ancd);
    request.input('pnum', pnum);

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
    console.error('F11020 테이블 조회 오류:', err);
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

