'use client';

// 클라이언트에서 쿠키 읽기
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// 클라이언트에서 쿠키 삭제
export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// 인증 상태 확인
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    return data.authenticated === true;
  } catch (error) {
    console.error('인증 확인 오류:', error);
    return false;
  }
}

// 로그아웃 처리
export async function logout(): Promise<void> {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    // 클라이언트에서도 쿠키 삭제
    deleteCookie('auth_token');
    deleteCookie('user_info');
  } catch (error) {
    console.error('로그아웃 오류:', error);
    // 오류가 발생해도 클라이언트 쿠키는 삭제
    deleteCookie('auth_token');
    deleteCookie('user_info');
  }
}

