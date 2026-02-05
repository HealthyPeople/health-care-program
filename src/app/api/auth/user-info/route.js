import { NextRequest, NextResponse } from 'next/server';

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

    // JSON 파싱
    let parsedUserInfo;
    try {
      parsedUserInfo = JSON.parse(userInfo);
    } catch (err) {
      // URL 디코딩 시도
      try {
        const decoded = decodeURIComponent(userInfo);
        parsedUserInfo = JSON.parse(decoded);
      } catch (e) {
        return NextResponse.json({
          success: false,
          error: '쿠키 파싱 오류'
        }, {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
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
