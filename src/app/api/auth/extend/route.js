import { NextRequest, NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    const userInfo = req.cookies.get('user_info')?.value;

    if (!token || !userInfo) {
      return NextResponse.json(
        { success: false, message: '로그인 정보가 없습니다.' },
        { status: 401 }
      );
    }

    // 사용자 정보 파싱
    let user;
    try {
      user = JSON.parse(userInfo);
    } catch (parseError) {
      return NextResponse.json(
        { success: false, message: '사용자 정보 파싱 오류' },
        { status: 400 }
      );
    }

    // 새로운 만료 시간 설정 (24시간)
    const expiresIn = 24 * 60 * 60 * 1000; // 24시간
    const expiresAt = new Date(Date.now() + expiresIn);

    // 업데이트된 사용자 정보
    const updatedUserInfo = {
      ...user,
      expiresAt: expiresAt.toISOString(),
    };

    // 응답 생성
    const response = NextResponse.json(
      {
        success: true,
        message: '로그인이 연장되었습니다.',
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );

    // 쿠키 업데이트
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000, // 초 단위
      path: '/',
    });

    response.cookies.set('user_info', JSON.stringify(updatedUserInfo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('로그인 연장 오류:', err);
    return NextResponse.json(
      { success: false, message: '로그인 연장 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

