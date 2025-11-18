import { connPool } from '../../../config/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const pool = await connPool;
    if (!pool) {
      return NextResponse.json(
        { success: false, message: '데이터베이스 연결 실패' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { ancd, uid, upw } = body;

    // 입력값 검증
    if (!ancd || !uid || !upw) {
      return NextResponse.json(
        { success: false, message: 'ANCD, 아이디, 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1단계: 고객코드(ANCD)와 사용자ID(UID)로 사용자 존재 여부 확인
    const userCheckQuery = `
      SELECT ANCD, UID, UPW
      FROM [돌봄시설DB].[dbo].[F00120]
      WHERE ANCD = @ancd AND UID = @uid
    `;

    const userCheckRequest = pool.request();
    userCheckRequest.input('ancd', ancd);
    userCheckRequest.input('uid', uid);

    const userCheckResult = await userCheckRequest.query(userCheckQuery);

    // 고객코드 또는 사용자ID가 존재하지 않는 경우
    if (userCheckResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 계정입니다.' },
        { status: 401 }
      );
    }

    // 2단계: 비밀번호 확인
    const storedPassword = userCheckResult.recordset[0].UPW;
    if (storedPassword !== upw) {
      return NextResponse.json(
        { success: false, message: '비밀번호가 틀렸습니다.' },
        { status: 401 }
      );
    }

    // 인증 성공
    const result = userCheckResult;

    // 토큰 생성 (간단한 랜덤 토큰, 실제로는 JWT 등을 사용하는 것이 좋습니다)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresIn = 24 * 60 * 60 * 1000; // 24시간
    const expiresAt = new Date(Date.now() + expiresIn);

    // 사용자 정보 저장 (세션이나 DB에 저장할 수도 있음)
    const userInfo = {
      ancd: result.recordset[0].ANCD,
      uid: result.recordset[0].UID,
      token,
      expiresAt: expiresAt.toISOString(),
    };

    // 응답 생성
    const response = NextResponse.json(
      {
        success: true,
        message: '로그인 성공했습니다',
        user: {
          ancd: userInfo.ancd,
          uid: userInfo.uid,
        },
      },
      { status: 200 }
    );

    // 쿠키에 토큰 저장
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000, // 초 단위
      path: '/',
    });

    // 사용자 정보도 쿠키에 저장 (선택사항)
    response.cookies.set('user_info', JSON.stringify(userInfo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('로그인 오류:', err);
    return NextResponse.json(
      { success: false, message: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

