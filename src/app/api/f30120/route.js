import { connPool } from '../../../config/server';
import { NextRequest } from 'next/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rsdt = searchParams.get('rsdt'); // 조사일자 (yyyy-mm-dd 형식, 단일 날짜)
    const pnum = searchParams.get('pnum'); // 수급자번호 (선택)
    const ancd = searchParams.get('ancd'); // 시설코드 (선택, PNUM과 함께 사용)

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

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

    let query = `
      SELECT 
        f30120.[ANCD],
        f30120.[PNUM],
        f30120.[RSDT],
        f30120.[SBDS],
        f30120.[EBDS],
        f30120.[SBDP],
        f30120.[EBDP],
        f30120.[TMPBD],
        f30120.[PUCNT],
        f30120.[BRCNT],
        f30120.[WEIGHT],
        f30120.[HEIGHT],
        f30120.[BJYN],
        f30120.[BJDG],
        f30120.[BJPA],
        f30120.[NUDES],
        f30120.[INDT],
        f30120.[ETC],
        f30120.[INEMPNO],
        f30120.[INEMPNM],
        f10010.[P_NM],
        f10010.[P_ST],
        f10010.[P_BRDT]
      FROM [돌봄시설DB].[dbo].[F30120] f30120
      LEFT JOIN [돌봄시설DB].[dbo].[F10010] f10010 
        ON f30120.[ANCD] = f10010.[ANCD] 
        AND f30120.[PNUM] = f10010.[PNUM]
      WHERE 1=1
    `;

    const request = pool.request();
    request.input('sessionAncd', gate.sessionAncd);
    query += ` AND f30120.[ANCD] = @sessionAncd`;

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
      query += ` AND f30120.[RSDT] >= @startDate AND f30120.[RSDT] <= @endDate`;
      request.input('startDate', startFormatted);
      request.input('endDate', endFormatted);
    }
    // 단일 날짜 조회 (rsdt만 있는 경우)
    else if (rsdt) {
      if (!validateDate(rsdt)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '날짜 형식이 올바르지 않습니다. yyyy-mm-dd 형식으로 입력해주세요.' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const rsdtFormatted = formatDateForDB(rsdt);
      query += ` AND f30120.[RSDT] = @rsdt`;
      request.input('rsdt', rsdtFormatted);
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'RSDT 또는 startDate/endDate 파라미터가 필요합니다' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PNUM 필터 (수급자별 조회)
    if (pnum) {
      query += ` AND CAST(f30120.[PNUM] AS VARCHAR) = CAST(@pnum AS VARCHAR)`;
      request.input('pnum', String(pnum));
    }

    query += ` ORDER BY f30120.[RSDT] ASC, f30120.[INDT] DESC`;

    console.log('[F30120 API] 조회 요청:', {
      rsdt,
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
    console.error('F30120 테이블 조회 오류:', err);
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
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd'); // optional, 세션 검증용

    const gate = assertAnCdMatchesSession(req, ancd || null);
    if (!gate.ok) return gate.response;

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { rsdt, pnums } = body || {};

    if (!rsdt || !Array.isArray(pnums)) {
      return new Response(JSON.stringify({ success: false, error: 'rsdt와 pnums 배열이 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const rsdtDigits = String(rsdt).includes('-') ? String(rsdt).replace(/-/g, '') : String(rsdt);
    if (!/^\d{8}$/.test(rsdtDigits)) {
      return new Response(JSON.stringify({ success: false, error: 'rsdt 형식이 올바르지 않습니다 (yyyy-mm-dd 또는 yyyymmdd)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

    const results = [];
    for (let i = 0; i < pnums.length; i++) {
      const pnum = pnums[i];
      if (pnum == null || String(pnum).trim() === '') continue;

      const request = pool.request();
      request.input('ANCD', gate.sessionAncd);
      request.input('PNUM', String(pnum).trim());
      request.input('RSDT', rsdtDigits);
      request.input('INDT', nowStr);

      // 공란(빈값)으로 생성. MATCHED는 유지(스킵)하여 기존 입력값을 덮어쓰지 않음.
      const query = `
        MERGE [돌봄시설DB].[dbo].[F30120] AS T
        USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, @RSDT AS RSDT) AS S
          ON (T.[ANCD] = S.[ANCD] AND CAST(T.[PNUM] AS VARCHAR) = CAST(S.[PNUM] AS VARCHAR) AND T.[RSDT] = S.[RSDT])
        WHEN NOT MATCHED THEN
          INSERT (
            [ANCD],[PNUM],[RSDT],
            [SBDS],[EBDS],[SBDP],[EBDP],[TMPBD],[PUCNT],[BRCNT],[WEIGHT],[HEIGHT],
            [BJYN],[BJDG],[BJPA],[NUDES],
            [INDT]
          )
          VALUES (
            @ANCD,@PNUM,@RSDT,
            NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
            NULL,NULL,NULL,'',
            @INDT
          );
      `;

      const result = await request.query(query);
      results.push({ index: i, pnum: String(pnum).trim(), ok: true, rowsAffected: result.rowsAffected || [] });
    }

    return new Response(JSON.stringify({ success: true, data: results, count: results.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('F30120 저장(공란 생성) 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

