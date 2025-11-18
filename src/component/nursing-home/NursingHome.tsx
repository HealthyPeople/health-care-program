"use client";

import NursingHomeMenu from './organisms/NursingHomeMenu';
import DayNightCareMenu from './organisms/DayNightCareMenu';
import ShortTermCareMenu from './organisms/ShortTermCareMenu';
import TabHost from './TabHost';
import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logout, checkAuth } from '../../utils/auth';

const HEADER_HEIGHT = 56; // 14 * 4(px)
const SIDEBAR_WIDTH = 256; // 64 * 4(px)

interface NursingHomeProps {
  children?: ReactNode;
}

export const NursingHome = ({ children }: NursingHomeProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 인증 체크 및 강제 로그아웃
  useEffect(() => {
    const verifyAuth = async () => {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        await logout();
        router.push('/login');
      }
    };
    verifyAuth();
    
    // 주기적으로 인증 상태 확인 (5분마다)
    const interval = setInterval(verifyAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [router]);
  
  const handleLogoClick = () => {
    if (pathname?.includes('nursingHome')) {
      router.push('/nursingHome');
    } else if (pathname?.includes('dayNightCare')) {
      router.push('/dayNightCare');
    } else if (pathname?.includes('shortTermCare')) {
      router.push('/shortTermCare');
    } else {
      router.push('/');
    }
  };
  
  const handleMainMoveClick = async () => {
    setShowConfirmModal(true);
  };
  
  const handleConfirmMove = async () => {
    setShowConfirmModal(false);
    await logout();
    router.push('/');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };
  
  const handleCancelMove = () => {
    setShowConfirmModal(false);
  };
  
  const getDisplayText = () => {
    if (pathname?.includes('nursingHome')) {
      return 'CareProgram_DEMO 요양원';
    } else if (pathname?.includes('dayNightCare')) {
      return 'CareProgram_DEMO 주야간보호';
    } else if (pathname?.includes('shortTermCare')) {
      return 'CareProgram_DEMO 단기보호';
    }
    return 'CareProgram_DEMO';
  };
  
  const displayText = getDisplayText();

  const renderMenu = () => {
    if (pathname?.includes('dayNightCare')) {
      return <DayNightCareMenu />;
    } else if (pathname?.includes('shortTermCare')) {
      return <ShortTermCareMenu />;
    }
    return <NursingHomeMenu />;
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 상단 헤더 고정 */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-blue-600 h-14 px-6 text-white shadow w-full"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleMainMoveClick}
            className="px-3 py-1.5 bg-blue-700 rounded text-sm hover:bg-blue-800 transition-colors"
          >
            메인으로 이동
          </button>
          <span 
            className="text-2xl font-bold tracking-wide cursor-pointer transition-opacity"
            // onClick={handleLogoClick}
          >
            {displayText}
          </span>
          {/* <button className="ml-2 px-2 py-1 bg-blue-700 rounded text-xs">최근내역</button>
          <button className="ml-1 px-2 py-1 bg-blue-700 rounded text-xs">즐겨찾기</button> */}
        </div>
        <div className="flex items-center gap-4">
          {/* <span className="text-sm">사용메뉴</span> */}
          {/* <span className="text-sm">20250711-1550</span> */}
          {/* <span className="text-sm">KR</span> */}
          {/* <span className="text-sm">dhmaster ▼</span> */}
          {/* <button className="px-2 py-1 bg-blue-700 rounded text-xs">회사변경</button> */}
          {/* <button className="px-2 py-1 bg-blue-700 rounded text-xs">비밀번호 변경</button> */}
          <button 
            onClick={handleLogout}
            className="px-2 py-1 bg-blue-700 rounded text-xs hover:bg-blue-800 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>
      {/* 왼쪽 메뉴 고정 */}
      <aside
        className="fixed z-40 top-14 left-0 h-[calc(100vh-56px)] bg-white border-r border-gray-200"
        style={{ width: SIDEBAR_WIDTH, top: HEADER_HEIGHT }}
      >
        {renderMenu()}
      </aside>
      {/* 본문 컨텐츠: TabHost를 항상 표시 */}
      <main
        className="min-h-screen p-0"
        style={{ marginLeft: SIDEBAR_WIDTH, marginTop: HEADER_HEIGHT }}
      >
        <TabHost />
      </main>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 Tab:p-8 PC:p-10 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg Tab:text-xl PC:text-2xl font-bold text-gray-900 mb-4 PC:mb-6">
                확인
              </h3>
              <p className="text-sm Tab:text-base PC:text-lg text-gray-700 mb-6 Tab:mb-8 PC:mb-10">
                로그아웃 후 이동합니다.<br />
                정말로 이동하시겠습니까?
              </p>
              <div className="flex gap-3 Tab:gap-4 justify-center">
                <button
                  onClick={handleCancelMove}
                  className="px-6 Tab:px-8 PC:px-10 py-2 Tab:py-2.5 PC:py-3 bg-gray-200 text-gray-700 rounded-lg PC:rounded-xl hover:bg-gray-300 transition-colors text-sm Tab:text-base PC:text-lg font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmMove}
                  className="px-6 Tab:px-8 PC:px-10 py-2 Tab:py-2.5 PC:py-3 bg-blue-600 text-white rounded-lg PC:rounded-xl hover:bg-blue-700 transition-colors text-sm Tab:text-base PC:text-lg font-medium"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};