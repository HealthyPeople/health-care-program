import { NextResponse } from 'next/server';
import { getVerificationCode, deleteVerificationCode } from '../send-code/route';
import { connPool } from '../../../../config/server';

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
    const { ancd, uid, email, code } = body;

    // 입력값 검증
    if (!ancd || !uid || !email || !code) {
      return NextResponse.json(
        { success: false, message: '모든 정보를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 인증번호 확인
    const codeKey = `${ancd}_${uid}_${email}`;
    const storedCode = getVerificationCode(codeKey);

    if (!storedCode) {
      return NextResponse.json(
        { success: false, message: '인증번호가 만료되었거나 존재하지 않습니다.' },
        { status: 401 }
      );
    }

    if (storedCode.code !== code) {
      return NextResponse.json(
        { success: false, message: '인증번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 인증번호 확인 성공 - 비밀번호 조회
    const passwordQuery = `
      SELECT UPW
      FROM [돌봄시설DB].[dbo].[F00120]
      WHERE ANCD = @ancd AND UID = @uid
    `;

    const request = pool.request();
    request.input('ancd', ancd);
    request.input('uid', uid);

    const result = await request.query(passwordQuery);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 계정입니다.' },
        { status: 401 }
      );
    }

    const password = result.recordset[0].UPW;

    // 인증번호 삭제 (한 번만 사용 가능)
    deleteVerificationCode(codeKey);

    return NextResponse.json(
      {
        success: true,
        message: '인증번호가 확인되었습니다.',
        password: password,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('인증번호 확인 오류:', err);
    return NextResponse.json(
      { success: false, message: '인증번호 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

