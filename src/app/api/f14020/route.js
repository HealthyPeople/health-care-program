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
    const svdt = searchParams.get('svdt'); // 서비스 날짜 (yyyy-mm-dd 형식)

    if (!svdt) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SVDT 파라미터가 필요합니다' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 날짜 형식 변환 (yyyy-mm-dd -> YYYYMMDD)
    // 입력 형식: 2025-11-23
    // DB 저장 형식: 20251123
    let svdtFormatted = svdt;
    if (svdt.includes('-')) {
      // yyyy-mm-dd 형식인 경우 하이픈 제거
      svdtFormatted = svdt.replace(/-/g, '');
    } else if (svdt.length === 8 && !svdt.includes('-')) {
      // 이미 YYYYMMDD 형식인 경우 그대로 사용
      svdtFormatted = svdt;
    } else {
      // 다른 형식인 경우 오류 반환
      return new Response(JSON.stringify({ 
        success: false, 
        error: '날짜 형식이 올바르지 않습니다. yyyy-mm-dd 형식으로 입력해주세요.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[F14020 API] 날짜 조회 요청:', {
      원본: svdt,
      변환: svdtFormatted
    });

    let query = `
      SELECT 
        f14020.[ANCD],
        f14020.[PNUM],
        f14020.[SVDT],
        f14020.[ST_PLAC],
        f14020.[ST_KIND],
        f14020.[GYN],
        f14020.[MOST],
        f14020.[LCST],
        f14020.[DNST],
        f14020.[MGST],
        f14020.[AGST],
        f14020.[ST_ETC],
        f14020.[INDT],
        f14020.[ETC],
        f14020.[INEMPNO],
        f14020.[INEMPNM],
        f10010.[P_NM],
        f10010.[P_BRDT],
        ROW_NUMBER() OVER (ORDER BY f14020.[INDT] DESC) as MENUM
      FROM [돌봄시설DB].[dbo].[F14020] f14020
      LEFT JOIN [돌봄시설DB].[dbo].[F10010] f10010 
        ON f14020.[ANCD] = f10010.[ANCD] 
        AND f14020.[PNUM] = f10010.[PNUM]
      WHERE f14020.[SVDT] = @svdt
      ORDER BY f14020.[INDT] DESC
    `;

    const request = pool.request();
    request.input('svdt', svdtFormatted);

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
    console.error('F14020 테이블 조회 오류:', err);
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

