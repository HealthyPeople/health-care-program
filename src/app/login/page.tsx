"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageType, setPageType] = useState<string>('');

  useEffect(() => {
    const type = searchParams.get('type');
    setPageType(type || '');
  }, [searchParams]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 로그인 로직 (추후 API 연동)
    try {
      // 임시 로그인 처리
      if (formData.username && formData.password) {
        // 로그인 성공 시 해당 페이지로 이동
        const redirectPath = getRedirectPath();
        router.push(redirectPath);
      } else {
        setError('아이디와 비밀번호를 입력해주세요.');
      }
    } catch (err) {
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
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
            {/* 아이디 입력 */}
            <div>
              <label htmlFor="username" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                아이디
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full text-black px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border border-gray-300 rounded-lg PC:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="아이디를 입력하세요"
                required
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
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
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 Tab:w-5 Tab:h-5 PC:w-6 PC:h-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 Tab:ml-3 PC:ml-4 text-gray-600">아이디 저장</span>
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700">
                비밀번호 찾기
              </a>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 Tab:mt-8 PC:mt-10 text-center text-sm Tab:text-base PC:text-lg text-gray-600">
          <p>지지그린 ASP 업무 전산 시스템</p>
          <p className="mt-1 PC:mt-2">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </div>
  );
}

