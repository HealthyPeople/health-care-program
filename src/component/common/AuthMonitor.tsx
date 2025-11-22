'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie } from '../../utils/auth';

export const AuthMonitor = () => {
  const router = useRouter();
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
  const [showMissingCookieAlert, setShowMissingCookieAlert] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3분 = 180초
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const extendApiCallRef = useRef(false);
  const expiryTimeRef = useRef<number | null>(null); // 만료 시간 저장

  // 쿠키 존재 여부 및 만료 시간 체크
  const checkAuthStatus = async () => {
    if (typeof document === 'undefined') return;

    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        // 인증 실패 또는 쿠키 없음
        if (!showMissingCookieAlert && !showExpiryAlert) {
          setShowMissingCookieAlert(true);
        }
        return;
      }

      const data = await response.json();
      
      if (!data.authenticated) {
        // 인증되지 않음
        if (!showMissingCookieAlert && !showExpiryAlert) {
          setShowMissingCookieAlert(true);
        }
        return;
      }

      // 만료 시간 정보가 있는 경우 체크
      if (data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        expiryTimeRef.current = expiresAt.getTime();
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();

        // 3분 이하 남은 경우 (180000ms = 3분)
        if (timeUntilExpiry <= 180000 && timeUntilExpiry > 0) {
          const secondsLeft = Math.max(0, Math.floor(timeUntilExpiry / 1000));
          setTimeLeft(secondsLeft);
          if (!showExpiryAlert) {
            setShowExpiryAlert(true);
          }
        } 
        // 이미 만료된 경우
        else if (timeUntilExpiry <= 0) {
          handleLogout();
        }
        // 3분 이상 남은 경우 알림 닫기
        else if (timeUntilExpiry > 180000) {
          setShowExpiryAlert(false);
          expiryTimeRef.current = null;
        }
      }
    } catch (error) {
      console.error('인증 체크 오류:', error);
      // 네트워크 오류 등으로 체크 실패한 경우
      if (!showMissingCookieAlert && !showExpiryAlert) {
        setShowMissingCookieAlert(true);
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('로그아웃 API 오류:', error);
    } finally {
      deleteCookie('auth_token');
      deleteCookie('user_info');
      setShowExpiryAlert(false);
      setShowMissingCookieAlert(false);
      router.push('/');
    }
  };

  // 쿠키 없음 알림 확인 버튼
  const handleMissingCookieConfirm = () => {
    setShowMissingCookieAlert(false);
    handleLogout();
  };

  // 로그인 연장
  const handleExtend = async () => {
    if (extendApiCallRef.current) return;
    extendApiCallRef.current = true;

    try {
      const response = await fetch('/api/auth/extend', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 연장 성공 시 알림 닫기
          setShowExpiryAlert(false);
          setTimeLeft(180);
          extendApiCallRef.current = false;
        } else {
          alert('로그인 연장에 실패했습니다. 다시 시도해주세요.');
          extendApiCallRef.current = false;
        }
      } else {
        alert('로그인 연장에 실패했습니다. 다시 시도해주세요.');
        extendApiCallRef.current = false;
      }
    } catch (error) {
      console.error('로그인 연장 오류:', error);
      alert('로그인 연장 중 오류가 발생했습니다.');
      extendApiCallRef.current = false;
    }
  };

  // 만료 임박 알림 카운트다운 (실제 시간 기준)
  useEffect(() => {
    if (showExpiryAlert && expiryTimeRef.current) {
      // 1초마다 실제 남은 시간 계산
      const countdownInterval = setInterval(() => {
        if (expiryTimeRef.current) {
          const now = new Date().getTime();
          const timeUntilExpiry = expiryTimeRef.current - now;
          
          if (timeUntilExpiry <= 0) {
            handleLogout();
            return;
          }
          
          const secondsLeft = Math.max(0, Math.floor(timeUntilExpiry / 1000));
          setTimeLeft(secondsLeft);
        }
      }, 1000);

      return () => {
        clearInterval(countdownInterval);
      };
    }
  }, [showExpiryAlert]);

  // 주기적으로 쿠키 체크
  useEffect(() => {
    // 초기 체크
    checkAuthStatus();

    // 만료 임박 알림이 표시된 경우 1초마다 체크, 그렇지 않은 경우 10초마다 체크
    const checkInterval = showExpiryAlert ? 1000 : 10000;
    
    checkIntervalRef.current = setInterval(() => {
      checkAuthStatus();
    }, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMissingCookieAlert, showExpiryAlert]);

  // 시간 포맷팅 (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 쿠키 없음 알림 */}
      {showMissingCookieAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">로그인 정보 없음</h2>
            <p className="mb-6">
              로그인 정보가 없습니다. 로그인 페이지로 이동합니다.
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleMissingCookieConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 만료 임박 알림 */}
      {showExpiryAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              로그인 만료 시간 임박
            </h2>
            <div className="mb-4">
              <p className="text-lg font-semibold text-center mb-2">
                {formatTime(timeLeft)}
              </p>
              <p className="text-gray-700">
                로그인 후 만료시간 임박으로 로그아웃됩니다. 로그아웃되면 현재 수정 후 저장하지 않은 정보는 남지 않습니다. 로그인 연장을 원할 경우 연장 버튼을 눌러주세요.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                로그아웃
              </button>
              <button
                onClick={handleExtend}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                연장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

