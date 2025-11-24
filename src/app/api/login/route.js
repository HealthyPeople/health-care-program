import { connPool } from '../../../config/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req) {
  try {
    // 도메인 확인 (vercel 포함 여부 체크)
    const host = req.headers.get('host') || '';
    const url = req.url || '';
    const isVercelDomain = host.toLowerCase().includes('vercel') || url.toLowerCase().includes('vercel');
    
    console.log(`[LOGIN API] Host: ${host}, URL: ${url}, Is Vercel: ${isVercelDomain}`);
    
    // vercel 도메인인 경우 IP 접근 제한 처리
    if (isVercelDomain) {
      const body = await req.json();
      const { ancd, uid } = body;
      
      // 입력값 검증
      if (!ancd || !uid) {
        return NextResponse.json(
          { success: false, message: 'ANCD, 아이디를 모두 입력해주세요.' },
          { status: 400 }
        );
      }
      
      // 임의의 토큰 생성
      const token = crypto.randomBytes(32).toString('hex');
      const expiresIn = 24 * 60 * 60 * 1000; // 24시간
      const expiresAt = new Date(Date.now() + expiresIn);
      
      // 사용자 정보 객체 생성
      const userInfo = {
        ancd: ancd,
        uid: uid,
        token: token,
        expiresAt: expiresAt.toISOString(),
      };
      
      // 응답 생성 (IP 제한 알림과 함께)
      const response = NextResponse.json(
        {
          success: true,
          message: 'IP접근제한으로 데이터 확인불가',
          ipRestricted: true,
          allowMockLogin: true,
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
      
      // 사용자 정보도 쿠키에 저장
      response.cookies.set('user_info', JSON.stringify(userInfo), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresIn / 1000,
        path: '/',
      });
      
      return response;
    }
    
    // TESTMODE 환경변수 확인 (대소문자 무시, 공백 및 따옴표 제거)
    const testModeEnv = process.env.TESTMODE 
      ? String(process.env.TESTMODE).toLowerCase().trim().replace(/['"]/g, '')
      : '';
    const testMode = testModeEnv === 'true';
    
    // 디버깅: 환경변수 값 확인
    console.log(`[LOGIN API] TESTMODE env value: "${process.env.TESTMODE}", parsed: ${testMode}`);
    
    // TESTMODE가 활성화된 경우 IP 확인 (DB 접근 전에 먼저 체크)
    if (testMode) {
      // 다양한 헤더에서 IP 확인
      const forwardedFor = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
      
      let clientIp = 'unknown';
      // IP 우선순위: x-forwarded-for > x-real-ip > cf-connecting-ip
      if (forwardedFor) {
        clientIp = forwardedFor.split(',')[0].trim();
      } else if (realIp) {
        clientIp = realIp.trim();
      } else if (cfConnectingIp) {
        clientIp = cfConnectingIp.trim();
      }
      
      // 허용된 IP
      const allowedIp = '14.37.170.65';
      const isAllowedIp = clientIp === allowedIp;
      
      console.log(`[TESTMODE] Client IP: ${clientIp}, Allowed IP: ${allowedIp}, Is Allowed: ${isAllowedIp}`);
      
      // 허용된 IP가 아닌 경우 특별한 응답 반환 (클라이언트에서 쿠키 설정하도록)
      if (!isAllowedIp) {
        return NextResponse.json(
          { 
            success: true, 
            message: 'IP접근제한으로 데이터 확인불가',
            ipRestricted: true,
            allowMockLogin: true // 클라이언트에서 쿠키 설정하도록 플래그
          },
          { status: 200 }
        );
      }
    }

    // TESTMODE가 비활성화되었거나 허용된 IP인 경우에만 DB 접근
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

    // 정상 로그인 처리 (TESTMODE가 비활성화되었거나 허용된 IP인 경우)
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

    // 응답 생성 (정상 로그인)
    const response = NextResponse.json(
      {
        success: true,
        message: '로그인 성공했습니다',
        ipRestricted: false,
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
    console.error('에러 상세:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name
    });
    return NextResponse.json(
      { 
        success: false, 
        message: '로그인 처리 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? err?.message : undefined
      },
      { status: 500 }
    );
  }
}

