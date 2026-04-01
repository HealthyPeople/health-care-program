import { NextRequest, NextResponse } from 'next/server';
import { connPool } from '../../../../config/server';
import { parseUserInfoCookieValue } from '../../../../config/sessionServer';

export async function GET(req) {
  try {
    // 쿠키에서 user_info 읽기
    const userInfo = req.cookies.get('user_info')?.value;

    if (!userInfo) {
      return NextResponse.json({
        success: false,
        error: '쿠키가 없습니다'
      }, {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let parsedUserInfo = parseUserInfoCookieValue(userInfo);
    if (!parsedUserInfo) {
      return NextResponse.json({
        success: false,
        error: '쿠키 파싱 오류'
      }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 기관명(F00110)이 쿠키에 없거나 비어 있으면 DB에서 보강 (모의 로그인 등)
    if (parsedUserInfo.ancd != null && parsedUserInfo.ancd !== '' && !parsedUserInfo.annm) {
      try {
        const pool = await connPool;
        if (pool) {
          const n = parseInt(String(parsedUserInfo.ancd), 10);
          if (!Number.isNaN(n)) {
            const r = await pool
              .request()
              .input('ancd', n)
              .query(
                `SELECT TOP 1 [ANNM] FROM [돌봄시설DB].[dbo].[F00110] WHERE [ANCD] = @ancd`
              );
            const annm = r.recordset?.[0]?.ANNM;
            if (annm) {
              parsedUserInfo = { ...parsedUserInfo, annm };
            }
          }
        }
      } catch (e) {
        console.error('user-info ANNM 보강 실패:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedUserInfo
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('user_info 쿠키 읽기 오류:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
