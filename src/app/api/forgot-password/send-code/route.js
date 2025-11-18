import { connPool } from '../../../../config/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../../../utils/email';

// 인증번호 저장용 (실제로는 Redis나 DB에 저장하는 것이 좋습니다)
const verificationCodes = new Map();

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
    const { ancd, uid, email } = body;

    // 입력값 검증
    if (!ancd || !uid || !email) {
      return NextResponse.json(
        { success: false, message: '고객코드, 사용자ID, 이메일을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // F00120 테이블에서 사용자 정보 확인
    const userCheckQuery = `
      SELECT ANCD, UID
      FROM [돌봄시설DB].[dbo].[F00120]
      WHERE ANCD = @ancd AND UID = @uid
    `;

    const request = pool.request();
    request.input('ancd', ancd);
    request.input('uid', uid);

    const result = await request.query(userCheckQuery);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 계정입니다.' },
        { status: 401 }
      );
    }

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10분 후 만료

    // 인증번호 저장 (키: ancd_uid_email)
    const codeKey = `${ancd}_${uid}_${email}`;
    verificationCodes.set(codeKey, {
      code: verificationCode,
      expiresAt,
      ancd,
      uid,
      email,
    });

    // 이메일 발송
    const emailSent = await sendVerificationEmail(email, verificationCode);
    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: '이메일 발송에 실패했습니다. SMTP 설정을 확인해주세요.' },
        { status: 500 }
      );
    }

    // 개발 환경에서는 콘솔에 인증번호 출력 (디버깅용)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[개발 모드] 인증번호: ${verificationCode} (${email})`);
    }

    return NextResponse.json(
      {
        success: true,
        message: '인증번호가 이메일로 발송되었습니다.',
        // 개발 환경에서만 인증번호 반환 (실제 배포 시 제거)
        ...(process.env.NODE_ENV !== 'production' && { verificationCode }),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('인증번호 발송 오류:', err);
    return NextResponse.json(
      { success: false, message: '인증번호 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 인증번호 조회 함수 (다른 API에서 사용)
export function getVerificationCode(key) {
  const data = verificationCodes.get(key);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    verificationCodes.delete(key);
    return null;
  }
  return data;
}

// 인증번호 삭제 함수
export function deleteVerificationCode(key) {
  verificationCodes.delete(key);
}

