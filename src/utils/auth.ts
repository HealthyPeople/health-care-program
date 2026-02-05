'use client';

// 클라이언트에서 쿠키 읽기
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  // document.cookie 전체 확인
  const allCookies = document.cookie;
  
  // 방법 1: 세미콜론으로 분리
  const value = `; ${allCookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift() || null;
    return cookieValue;
  }
  
  // 방법 2: 직접 검색
  const regex = new RegExp(`(^|; )${name}=([^;]*)`);
  const match = allCookies.match(regex);
  if (match && match[2]) {
    return match[2];
  }
  
  // 방법 3: 공백으로도 분리 시도
  const parts2 = allCookies.split(`${name}=`);
  if (parts2.length === 2) {
    const cookieValue = parts2[1].split(';')[0].trim();
    return cookieValue;
  }
  
  return null;
}

// 클라이언트에서 쿠키 삭제
export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// 클라이언트에서 쿠키 설정
export function setCookie(name: string, value: string, days: number = 1) {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
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
    // 탭 상태 초기화
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tabHost_state');
    }
  } catch (error) {
    // 오류가 발생해도 클라이언트 쿠키는 삭제
    deleteCookie('auth_token');
    deleteCookie('user_info');
    // 탭 상태 초기화
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tabHost_state');
    }
  }
}

