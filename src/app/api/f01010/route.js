import { connPool } from '../../../config/server';
import { NextRequest } from 'next/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

export async function GET(req) {
  try {
    const urlAncd = req.nextUrl.searchParams.get('ancd') || '';
    const gate = assertAnCdMatchesSession(req, urlAncd || null);
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

    const searchParams = req.nextUrl.searchParams;
    const searchName = searchParams.get('name') || '';
    const uid = searchParams.get('uid') || '';
    const empno = searchParams.get('empno') || '';

    // F01010 테이블에서 사원 정보 조회
    let query = `
      SELECT
        [ANCD],
        [EMPNO],
        [EMPNM],
        [JMNO],
        [YRNT],
        [JOB],
        [JOBST],
        [JOBADD],
        [JOBSH],
        [BK],
        [BKNO],
        [SDT],
        [EDT],
        [HSDT],
        [HEDT],
        [EMPHP],
        [EMPTEL],
        [EMPZIP],
        [EMPADD],
        [INDT],
        [ETC],
        [INEMPNO],
        [INEMPNM],
        [SGN_IMG],
        [MNG_GU],
        [BASE_DT]
      FROM [돌봄시설DB].[dbo].[F01010]
      WHERE 1=1
    `;

    const request = pool.request();

    query += ` AND [ANCD] = @ancd`;
    const sa = gate.sessionAncd;
    request.input('ancd', typeof sa === 'number' ? sa : parseInt(String(sa), 10));

    // uid로 조회 (사원명 또는 사원번호로 매칭)
    if (uid && uid.trim() !== '') {
      const uidTrimmed = uid.trim();
      const empnoFromUid = parseInt(uidTrimmed);
      const isNumericUid = !isNaN(empnoFromUid);

      request.input('uid', uidTrimmed);
      
      if (isNumericUid) {
        // 숫자인 경우 사원명 또는 사원번호로 검색
        query += ` AND ([EMPNM] = @uid OR [EMPNO] = @empnoFromUid)`;
        request.input('empnoFromUid', empnoFromUid);
      } else {
        // 숫자가 아닌 경우 사원명으로만 검색
        query += ` AND [EMPNM] = @uid`;
      }
    } else if (empno && empno.trim() !== '') {
      // 사원번호로 직접 조회 (ancd는 이미 위에서 처리됨)
      query += ` AND [EMPNO] = @empno`;
      request.input('empno', parseInt(empno.trim()));
    } else if (searchName && searchName.trim() !== '') {
      // 사원명으로 검색
      query += ` AND [EMPNM] LIKE @searchName`;
      request.input('searchName', `%${searchName.trim()}%`);
    }

    query += ` ORDER BY [EMPNM]`;

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
    console.error('F01010 테이블 조회 오류:', err);
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

