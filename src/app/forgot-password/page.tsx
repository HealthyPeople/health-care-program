"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'verify' | 'show'>('email');
  const [formData, setFormData] = useState({
    ancd: '',
    uid: '',
    email: '',
    verificationCode: '',
  });
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setMessage('');
  };

  // 1단계: 이메일로 인증번호 발송
  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!formData.ancd || !formData.uid || !formData.email) {
      setError('고객코드, 사용자ID, 이메일을 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ancd: formData.ancd,
          uid: formData.uid,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('인증번호가 이메일로 발송되었습니다.');
        setStep('verify');
      } else {
        setError(data.message || '인증번호 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('인증번호 발송 오류:', error);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2단계: 인증번호 확인 및 비밀번호 조회
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!formData.verificationCode) {
      setError('인증번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ancd: formData.ancd,
          uid: formData.uid,
          email: formData.email,
          code: formData.verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPassword(data.password);
        setStep('show');
      } else {
        setError(data.message || '인증번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('인증번호 확인 오류:', error);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md Tab:max-w-lg PC:max-w-2xl">
        {/* 로고 영역 */}
        <div className="text-center mb-6 Tab:mb-8 PC:mb-12">
          <h1 className="text-2xl Tab:text-3xl PC:text-5xl font-bold text-gray-900 mb-2 PC:mb-4">
            CareProgram_DEMO
          </h1>
          <p className="text-sm Tab:text-base PC:text-xl text-gray-600">비밀번호 찾기</p>
        </div>

        {/* 비밀번호 찾기 폼 */}
        <div className="bg-white rounded-lg shadow-xl p-6 Tab:p-8 PC:p-12">
          {/* 1단계: 이메일 입력 및 인증번호 발송 */}
          {step === 'email' && (
            <form onSubmit={handleSendVerificationCode} className="space-y-5 Tab:space-y-6 PC:space-y-8">
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
                  placeholder="고객코드를 입력하세요"
                  required
                />
              </div>

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
                  placeholder="사용자ID를 입력하세요"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full text-black px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border border-gray-300 rounded-lg PC:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 rounded-lg PC:rounded-xl text-sm Tab:text-base PC:text-lg">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 rounded-lg PC:rounded-xl text-sm Tab:text-base PC:text-lg">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 Tab:py-3.5 PC:py-5 px-4 Tab:px-5 PC:px-6 text-sm Tab:text-base PC:text-xl font-medium PC:font-semibold rounded-lg PC:rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 PC:focus:ring-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '발송 중...' : '인증번호 발송'}
              </button>
            </form>
          )}

          {/* 2단계: 인증번호 확인 */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-5 Tab:space-y-6 PC:space-y-8">
              <div>
                <p className="text-sm Tab:text-base PC:text-lg text-gray-600 mb-4 PC:mb-6">
                  {formData.email}로 발송된 인증번호를 입력해주세요.
                </p>
                <label htmlFor="verificationCode" className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                  인증번호
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  className="w-full text-black px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border border-gray-300 rounded-lg PC:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-center text-2xl Tab:text-3xl PC:text-4xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 rounded-lg PC:rounded-xl text-sm Tab:text-base PC:text-lg">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 rounded-lg PC:rounded-xl text-sm Tab:text-base PC:text-lg">
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 Tab:py-3.5 PC:py-5 px-4 Tab:px-5 PC:px-6 text-sm Tab:text-base PC:text-xl font-medium PC:font-semibold rounded-lg PC:rounded-xl hover:bg-gray-300 transition-colors"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-3 Tab:py-3.5 PC:py-5 px-4 Tab:px-5 PC:px-6 text-sm Tab:text-base PC:text-xl font-medium PC:font-semibold rounded-lg PC:rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 PC:focus:ring-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '확인 중...' : '인증번호 확인'}
                </button>
              </div>
            </form>
          )}

          {/* 3단계: 비밀번호 표시 */}
          {step === 'show' && (
            <div className="space-y-5 Tab:space-y-6 PC:space-y-8">
              <div>
                <p className="text-sm Tab:text-base PC:text-lg text-gray-600 mb-4 PC:mb-6 text-center">
                  인증이 완료되었습니다.<br />
                  아래 비밀번호를 확인해주세요.
                </p>
                <label className="block text-sm Tab:text-base PC:text-lg font-medium text-gray-700 mb-2 PC:mb-3">
                  비밀번호
                </label>
                <div className="w-full px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 text-sm Tab:text-base PC:text-lg border-2 border-blue-500 rounded-lg PC:rounded-xl bg-blue-50">
                  <div className="text-center text-xl Tab:text-2xl PC:text-3xl font-bold text-blue-700 tracking-wider">
                    {password}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 Tab:px-5 Tab:py-3.5 PC:px-6 PC:py-4 rounded-lg PC:rounded-xl text-sm Tab:text-base PC:text-lg">
                <p className="font-semibold mb-1">⚠️ 보안 안내</p>
                <p>비밀번호를 안전한 곳에 기록하시고, 다른 사람과 공유하지 마세요.</p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 text-white py-3 Tab:py-3.5 PC:py-5 px-4 Tab:px-5 PC:px-6 text-sm Tab:text-base PC:text-xl font-medium PC:font-semibold rounded-lg PC:rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 PC:focus:ring-offset-4 transition-colors"
              >
                로그인 페이지로 이동
              </button>
            </div>
          )}

          {/* 로그인 링크 */}
          <div className="mt-6 Tab:mt-8 PC:mt-10 text-center">
            <Link
              href="/login"
              className="text-sm Tab:text-base PC:text-lg text-blue-600 hover:text-blue-700"
            >
              로그인 페이지로 돌아가기
            </Link>
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

