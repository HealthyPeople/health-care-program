import { NextRequest, NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    const userInfo = req.cookies.get('user_info')?.value;

    if (!token || !userInfo) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // 토큰 유효성 검사 (만료 시간 확인)
    try {
      const user = JSON.parse(userInfo);
      const expiresAt = new Date(user.expiresAt);
      
      if (expiresAt < new Date()) {
        // 토큰 만료
        const response = NextResponse.json(
          { authenticated: false, message: '세션이 만료되었습니다.' },
          { status: 401 }
        );
        response.cookies.delete('auth_token');
        response.cookies.delete('user_info');
        return response;
      }

      return NextResponse.json(
        { authenticated: true, user: { ancd: user.ancd, uid: user.uid } },
        { status: 200 }
      );
    } catch (parseError) {
      return NextResponse.json(
        { authenticated: false, message: '인증 정보가 올바르지 않습니다.' },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error('인증 체크 오류:', err);
    return NextResponse.json(
      { authenticated: false, message: '인증 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

