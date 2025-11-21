"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import MemberInfoView from '@/component/nursing-home/pages/member-info/MemberInfoView';
import DiseaseHistoryView from '@/component/nursing-home/pages/disease-history/DiseaseHistoryView';
import MemberContractInfo from '@/component/nursing-home/pages/member-contract-info/MemberContractInfo';
import GuardianInfo from '@/component/nursing-home/pages/guardian-info/GuardianInfo';
import DailyBeneficiaryPerformance from '@/component/nursing-home/pages/daily-beneficiary-performance/DailyBeneficiaryPerformance';
import OutingProcessing from '@/component/nursing-home/pages/outing-processing/OutingProcessing';
import EmployeeBasicInfo from '@/component/nursing-home/pages/employee-basic-info/EmployeeBasicInfo';
import ProgramPlanRegistration from '@/component/nursing-home/pages/program-plan-registration/ProgramPlanRegistration';
import CounselingRecord from '@/component/nursing-home/pages/counseling-record/CounselingRecord';
import ConnectionRecord from '@/component/nursing-home/pages/connection-record/ConnectionRecord';
import VitalSigns from '@/component/nursing-home/pages/vital-signs/VitalSigns';
import VitalSignsPeriodic from '@/component/nursing-home/pages/vital-signs-periodic/VitalSignsPeriodic';
import OutpatientRecord from '@/component/nursing-home/pages/outpatient-record/OutpatientRecord';

interface TabItem {
  id: string; // href 기반 고유키
  title: string;
  href: string;
}

const STORAGE_KEY = 'tabHost_state';

interface StoredState {
  tabs: TabItem[];
  activeId: string | null;
}

function renderInternal(href: string) {
  switch (href) {
    case '/nursingHome/member-info':
      return <MemberInfoView />;
    case '/nursingHome/member-contract-info':
      return <MemberContractInfo />;
    case '/nursingHome/guardian-info':
      return <GuardianInfo />;

    case '/nursingHome/daily-beneficiary-performance':
      return <DailyBeneficiaryPerformance />;
    case '/nursingHome/daily-longterm-care':
      return <DailyBeneficiaryPerformance />;
    case '/nursingHome/snack-bulk-registration':
      return <DailyBeneficiaryPerformance />;
    case '/nursingHome/outing-processing':
      return <OutingProcessing />;

    case '/nursingHome/medication-time':
      return <MemberInfoView />;
    case '/nursingHome/longterm-physical-activity':
      return <MemberInfoView />;
    case '/nursingHome/longterm-nursing-instruction':
      return <MemberInfoView />;
    case '/nursingHome/longterm-functional-cognitive':
      return <MemberInfoView />;
    case '/nursingHome/longterm-beneficiary-status':
      return <MemberInfoView />;
    case '/nursingHome/longterm-record-format':
      return <MemberInfoView />;

    case '/nursingHome/counseling-record':
      return <CounselingRecord />;
    case '/nursingHome/vital-signs':
      return <VitalSigns />;
    case '/nursingHome/vital-signs-periodic':
      return <VitalSignsPeriodic />;
    case '/nursingHome/outpatient-record':
      return <OutpatientRecord />;
    case '/nursingHome/fact-verification':
      return <MemberInfoView />;
    case '/nursingHome/connection-record':
      return <ConnectionRecord />;
    case '/nursingHome/status-change-observation':
      return <MemberInfoView />;
    case '/nursingHome/fact-verification-record-detail-detail':
      return <MemberInfoView />;

    case '/nursingHome/disease-history':
      return <DiseaseHistoryView />;

    case '/nursingHome/employee-basic-info':
      return <EmployeeBasicInfo />;
    case '/nursingHome/program-plan-registration':
      return <ProgramPlanRegistration />;
    default:
      return null;
  }
}

export default function TabHost() {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // localStorage에서 상태 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        if (parsed.tabs && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          // 현재 pathname과 일치하는 탭이 있으면 활성화
          const matchingTab = parsed.tabs.find(t => t.href === pathname);
          if (matchingTab) {
            setActiveId(matchingTab.id);
          } else if (parsed.activeId) {
            // 저장된 활성 탭이 있으면 사용
            const activeTab = parsed.tabs.find(t => t.id === parsed.activeId);
            if (activeTab) {
              setActiveId(activeTab.id);
              router.push(activeTab.href);
            } else {
              // 없으면 첫 번째 탭
              setActiveId(parsed.tabs[0].id);
              router.push(parsed.tabs[0].href);
            }
          } else {
            // 모두 없으면 첫 번째 탭
            setActiveId(parsed.tabs[0].id);
            router.push(parsed.tabs[0].href);
          }
        }
      }
    } catch (error) {
      console.error('탭 상태 복원 실패:', error);
    }
  }, []); // 마운트 시 한 번만 실행

  // pathname 변경 시 현재 URL과 일치하는 탭 활성화
  useEffect(() => {
    if (pathname && tabs.length > 0) {
      const matchingTab = tabs.find(t => t.href === pathname);
      if (matchingTab && matchingTab.id !== activeId) {
        setActiveId(matchingTab.id);
      }
    }
  }, [pathname, tabs, activeId]);

  // 탭 상태 변경 시 localStorage에 저장
  useEffect(() => {
    if (tabs.length > 0) {
      const state: StoredState = {
        tabs,
        activeId,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('탭 상태 저장 실패:', error);
      }
    } else {
      // 탭이 없으면 저장된 상태도 삭제
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('탭 상태 삭제 실패:', error);
      }
    }
  }, [tabs, activeId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { href: string; title: string };
      const id = detail.href;
      setTabs((prev) => {
        const exists = prev.some((t) => t.id === id);
        const next = exists ? prev : [...prev, { id, title: detail.title, href: detail.href }];
        return next;
      });
      setActiveId(id);
      // 새 탭이 열릴 때 URL 업데이트
      router.push(detail.href);
    };
    window.addEventListener('NH_OPEN_TAB', handler as EventListener);
    return () => window.removeEventListener('NH_OPEN_TAB', handler as EventListener);
  }, [router]);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeId) || null, [tabs, activeId]);

  const handleTabClick = (tab: TabItem) => {
    setActiveId(tab.id);
    // 탭 클릭 시 해당 페이지의 URL로 이동
    router.push(tab.href);
  };

  const closeTab = (id: string) => {
    const updatedTabs = tabs.filter((t) => t.id !== id);
    setTabs(updatedTabs);
    
    if (activeId === id) {
      if (updatedTabs.length > 0) {
        const newActiveTab = updatedTabs[updatedTabs.length - 1];
        // 탭이 닫힐 때 남은 탭의 URL로 이동
        router.push(newActiveTab.href);
        setActiveId(newActiveTab.id);
      } else {
        // 모든 탭이 닫힐 때 기본 페이지로 이동
        const basePath = pathname?.includes('dayNightCare') ? '/dayNightCare' 
          : pathname?.includes('shortTermCare') ? '/shortTermCare' 
          : '/nursingHome';
        router.push(basePath);
        setActiveId(null);
      }
    }
  };

  if (tabs.length === 0) {
    return <div className="text-gray-400 text-center mt-20">좌측 메뉴를 클릭해 탭을 여세요</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* 탭 바 */}
      <div className="flex items-center gap-1 border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`group flex items-center gap-2 px-3 py-2 text-sm border-r border-gray-200 ${
              tab.id === activeId ? 'bg-blue-100 text-blue-900 font-semibold' : 'bg-white text-blue-900 hover:bg-gray-50'
            }`}
            onClick={() => handleTabClick(tab)}
          >
            <span>{tab.title}</span>
            <span
              className="ml-1 text-gray-400 group-hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >×</span>
          </button>
        ))}
      </div>
      {/* 컨텐츠 */}
      <div className="flex-1 bg-white">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const content = renderInternal(tab.href);
          return (
            <div
              key={tab.id}
              className={`h-full ${isActive ? 'block' : 'hidden'}`}
            >
              {content || (
                <iframe src={tab.href} className="w-full h-[70vh]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
