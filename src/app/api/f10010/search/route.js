import { connPool } from '../../../../config/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const pool = await connPool;
    if (!pool) {
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결 실패' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('q') || '';

    // 허용된 ANCD 목록
    const allowedANCDs = ['180011', '181008', '181009', '185020', '190000', '190001'];
    const ancdList = allowedANCDs.map(ancd => `'${ancd}'`).join(',');

    let query = `
      SELECT TOP 50
        f10010.ANCD,
        f10010.PNUM,
        f10010.P_NM,
        f10010.P_BRDT,
        f10010.P_TEL,
        f10010.P_HP,
        f10010.P_SEX
      FROM [돌봄시설DB].[dbo].[F10010] f10010
      WHERE f10010.ANCD IN (${ancdList})
    `;

    // 검색어가 있으면 추가 조건
    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`;
      query += ` AND (f10010.P_NM LIKE '${searchPattern.replace(/'/g, "''")}' OR f10010.PNUM LIKE '${searchPattern.replace(/'/g, "''")}' OR f10010.P_TEL LIKE '${searchPattern.replace(/'/g, "''")}' OR f10010.P_HP LIKE '${searchPattern.replace(/'/g, "''")}')`;
    }

    query += ` ORDER BY f10010.P_NM`;

    const result = await pool.request().query(query);

    return NextResponse.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (err) {
    console.error('F10010 검색 오류:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

