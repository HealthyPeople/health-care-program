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
    const searchName = searchParams.get('name') || '';

    // F01010 테이블에서 사원 정보 조회 (사원명으로 검색)
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

    if (searchName && searchName.trim() !== '') {
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

