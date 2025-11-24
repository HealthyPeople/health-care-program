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
    const pnum = searchParams.get('pnum'); // 수급자번호 (선택)
    const ancd = searchParams.get('ancd'); // 시설코드 (선택, PNUM과 함께 사용)
    const startDate = searchParams.get('startDate'); // 시작일 (yyyy-mm-dd 형식, 선택)
    const endDate = searchParams.get('endDate'); // 종료일 (yyyy-mm-dd 형식, 선택)

    // 날짜 형식 변환 함수
    const formatDateForDB = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr.includes('-')) {
        return dateStr.replace(/-/g, '');
      }
      return dateStr;
    };

    // 날짜 형식 검증 함수
    const validateDate = (dateStr) => {
      if (!dateStr) return false;
      if (dateStr.includes('-')) {
        return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      }
      return dateStr.length === 8 && !isNaN(dateStr);
    };

    // 기본 쿼리 구조
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
        ROW_NUMBER() OVER (ORDER BY f14020.[SVDT] ASC, f14020.[INDT] DESC) as MENUM
      FROM [돌봄시설DB].[dbo].[F14020] f14020
      LEFT JOIN [돌봄시설DB].[dbo].[F10010] f10010 
        ON f14020.[ANCD] = f10010.[ANCD] 
        AND f14020.[PNUM] = f10010.[PNUM]
      WHERE 1=1
    `;

    const request = pool.request();

    // 날짜 범위 조회 (startDate, endDate가 있는 경우)
    if (startDate && endDate) {
      if (!validateDate(startDate) || !validateDate(endDate)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '날짜 형식이 올바르지 않습니다. yyyy-mm-dd 형식으로 입력해주세요.' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const startFormatted = formatDateForDB(startDate);
      const endFormatted = formatDateForDB(endDate);
      query += ` AND f14020.[SVDT] >= @startDate AND f14020.[SVDT] <= @endDate`;
      request.input('startDate', startFormatted);
      request.input('endDate', endFormatted);
    }
    // 단일 날짜 조회 (svdt만 있는 경우)
    else if (svdt) {
      if (!validateDate(svdt)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '날짜 형식이 올바르지 않습니다. yyyy-mm-dd 형식으로 입력해주세요.' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const svdtFormatted = formatDateForDB(svdt);
      query += ` AND f14020.[SVDT] = @svdt`;
      request.input('svdt', svdtFormatted);
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SVDT 또는 startDate/endDate 파라미터가 필요합니다' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PNUM 필터 (수급자별 조회)
    if (pnum) {
      query += ` AND CAST(f14020.[PNUM] AS VARCHAR) = CAST(@pnum AS VARCHAR)`;
      request.input('pnum', String(pnum));
      
      // ANCD도 함께 필터링 (정확한 수급자 식별)
      if (ancd) {
        query += ` AND f14020.[ANCD] = @ancd`;
        request.input('ancd', ancd);
      }
    }

    query += ` ORDER BY f14020.[SVDT] ASC, f14020.[INDT] DESC`;

    console.log('[F14020 API] 조회 요청:', {
      svdt,
      pnum,
      ancd,
      startDate,
      endDate
    });

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

