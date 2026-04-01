import { connPool } from '../../../../config/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionAncd } from '../../../../config/sessionServer';

export async function GET(req) {
  try {
    const sessionAncd = getSessionAncd(req);
    if (sessionAncd == null) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const pool = await connPool;
    if (!pool) {
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결 실패' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('q') || '';

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
      WHERE f10010.ANCD = @sessionAncd
    `;

    const request = pool.request();
    request.input('sessionAncd', sessionAncd);

    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`;
      query += ` AND (f10010.P_NM LIKE @searchPattern OR CAST(f10010.PNUM AS VARCHAR(20)) LIKE @searchPattern OR f10010.P_TEL LIKE @searchPattern OR f10010.P_HP LIKE @searchPattern)`;
      request.input('searchPattern', searchPattern);
    }

    query += ` ORDER BY f10010.P_NM`;

    const result = await request.query(query);

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
