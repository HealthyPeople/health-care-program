"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { checkAuth } from '../../utils/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    ancd: '',
    uid: '',
    upw: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageType, setPageType] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [rememberId, setRememberId] = useState(false);

  const getLoginTitle = () => {
    switch (pageType) {
      case 'nursingHome':
        return '요양원 전산 시스템 로그인';
      case 'dayNightCare':
        return '주야간보호 전산 시스템 로그인';
      case 'shortTermCare':
        return '단기보호 전산 시스템 로그인';
      default:
        return '전산 시스템 로그인';
    }
  };

  const getRedirectPath = () => {
    switch (pageType) {
      case 'nursingHome':
        return '/nursingHome';
      case 'dayNightCare':
        return '/dayNightCare';
      case 'shortTermCare':
        return '/shortTermCare';
      default:
        return '/';
    }
  };

  useEffect(() => {
    const type = searchParams.get('type');
    setPageType(type || '');
    
    // 저장된 아이디 불러오기
    const loadSavedCredentials = () => {
      try {
        const savedAncd = localStorage.getItem('saved_ancd');
        const savedUid = localStorage.getItem('saved_uid');
        if (savedAncd && savedUid) {
          setFormData((prev) => ({
            ...prev,
            ancd: savedAncd,
            uid: savedUid,
          }));
          setRememberId(true);
        }
      } catch (error) {
        console.error('저장된 아이디 불러오기 오류:', error);
      }
    };
    
    loadSavedCredentials();
    
    // 이미 로그인된 경우 리다이렉트
    const checkIfLoggedIn = async () => {
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        const redirectPath = getRedirectPath();
        router.push(redirectPath);
      }
    };
    checkIfLoggedIn();
  }, [searchParams, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  // 로그인 API 요청 함수
  const loginRequest = async (ancd: string, uid: string, upw: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ancd, uid, upw }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || '로그인에 실패했습니다.' };
      }
    } catch (error) {
      console.error('로그인 요청 오류:', error);
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  };

  const showAlertMessage = (message: string, type: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const handleCloseAlert = () => {
    setShowAlert(false);
    if (alertType === 'success') {
      const redirectPath = getRedirectPath();
      router.push(redirectPath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 입력값 검증
    if (!formData.ancd || !formData.uid || !formData.upw) {
      setError('ANCD, 아이디, 비밀번호를 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      // 로그인 API 요청
      const result = await loginRequest(formData.ancd, formData.uid, formData.upw);

      if (result.success) {
        // 로그인 성공 시 아이디 저장 처리
        if (rememberId) {
          // 체크박스가 체크되어 있으면 저장
          localStorage.setItem('saved_ancd', formData.ancd);
          localStorage.setItem('saved_uid', formData.uid);
        } else {
          // 체크박스가 해제되어 있으면 저장된 정보 삭제
          localStorage.removeItem('saved_ancd');
          localStorage.removeItem('saved_uid');
        }
        // 로그인 성공
        showAlertMessage('로그인 성공했습니다', 'success');
      } else {
        // 로그인 실패
        showAlertMessage(result.message || '로그인 실패했습니다', 'error');
      }
    } catch (err) {
      // 예외 발생 시
      showAlertMessage('로그인 실패했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center px-4 py-8 overflow-auto">
      <div className="w-full max-w-md Tab:max-w-lg PC:max-w-2xl">
        {/* 로고 영역 */}
        <div className="text-center mb-6 Tab:mb-8 PC:mb-12">
          <h1 className="text-2xl Tab:text-3xl PC:text-5xl font-bold text-gray-900 mb-2 PC:mb-4">
            CareProgram_DEMO
          </h1>
          <p className="text-sm Tab:text-base PC:text-xl text-gray-600">{getLoginTitle()}</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-lg shadow-xl p-6 Tab:p-8 PC:p-12">
          <form onSubmit={handleSubmit} className="space-y-5 Tab:space-y-6 PC:space-y-8">
            {/* ANCD 입력 */}
            <div>
              <label htmlFor="ancd" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                고객코드
              </label>
              <input
                type="text"
                id="ancd"
                name="ancd"
                value={formData.ancd}
                onChange={handleChange}
                className="w-full text-black px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border border-gray-300 rounded-lg PC:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="ANCD를 입력하세요"
                required
              />
            </div>

            {/* 아이디 입력 */}
            <div>
              <label htmlFor="uid" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                사용자ID
              </label>
              <input
                type="text"
                id="uid"
                name="uid"
                value={formData.uid}
                onChange={handleChange}
                className="w-full text-black px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border border-gray-300 rounded-lg PC:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="아이디를 입력하세요"
                required
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="upw" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                비밀번호
              </label>
              <input
                type="password"
                id="upw"
                name="upw"
                value={formData.upw}
                onChange={handleChange}
                className="w-full text-black px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border border-gray-300 rounded-lg PC:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 rounded-lg PC:rounded-xl text-sm Tab:text-base PC:text-lg">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 Tab:py-3.5 PC:py-5 px-4 Tab:px-5 PC:px-6 text-sm Tab:text-base PC:text-xl font-medium PC:font-semibold rounded-lg PC:rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 PC:focus:ring-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 추가 옵션 */}
          <div className="mt-6 Tab:mt-8 PC:mt-10 pt-6 Tab:pt-8 PC:pt-10 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm Tab:text-base PC:text-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="w-4 h-4 Tab:w-5 Tab:h-5 PC:w-6 PC:h-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="ml-2 Tab:ml-3 PC:ml-4 text-gray-600 cursor-pointer">아이디 저장</span>
              </label>
              {/* <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700">
                비밀번호 찾기
              </Link> */}
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 Tab:mt-8 PC:mt-10 text-center text-sm Tab:text-base PC:text-lg text-gray-600">
          <p>지지그린 ASP 업무 전산 시스템</p>
          <p className="mt-1 PC:mt-2">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>

      {/* 알림 모달 */}
      {showAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 Tab:p-8 PC:p-10 max-w-md w-full mx-4">
            <div className="text-center">
              <div className={`mx-auto flex items-center justify-center h-12 Tab:h-14 PC:h-16 w-12 Tab:w-14 PC:w-16 rounded-full mb-4 PC:mb-6 ${
                alertType === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {alertType === 'success' ? (
                  <svg className="h-6 Tab:h-7 PC:h-8 w-6 Tab:w-7 PC:w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-6 Tab:h-7 PC:h-8 w-6 Tab:w-7 PC:w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className={`text-lg Tab:text-xl PC:text-2xl font-bold mb-4 PC:mb-6 ${
                alertType === 'success' ? 'text-green-900' : 'text-red-900'
              }`}>
                {alertType === 'success' ? '성공' : '실패'}
              </h3>
              <p className="text-sm Tab:text-base PC:text-lg text-gray-700 mb-6 Tab:mb-8 PC:mb-10">
                {alertMessage}
              </p>
              <button
                onClick={handleCloseAlert}
                className={`w-full px-6 Tab:px-8 PC:px-10 py-2 Tab:py-2.5 PC:py-3 rounded-lg PC:rounded-xl transition-colors text-sm Tab:text-base PC:text-lg font-medium ${
                  alertType === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

