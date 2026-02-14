export const sections: Record<string, { name: string; link: string }[]> = {
  '수급자관리': [
    { name: '수급자기본정보관리', link: '/nursingHome/member-info' },
    { name: '질병별건강관리', link: '/nursingHome/disease-health' },
    { name: '약물관리', link: '/nursingHome/drug-management' },
    { name: '상담관리', link: '/nursingHome/counseling' },
    { name: '외박관리', link: '/nursingHome/outing' },
    { name: '건강수준평가', link: '/nursingHome/health-assessment' },
    { name: '질병별관리기록', link: '/nursingHome/disease-record' },
    { name: '배설관리기록', link: '/nursingHome/excretion-record' },
    { name: '욕창관리기록', link: '/nursingHome/bedsore-record' },
    { name: '서비스제공기록지', link: '/nursingHome/service-record' },
    { name: '체위변경기록', link: '/nursingHome/position-change' },
    { name: '하루보호상황사관리', link: '/nursingHome/daily-care-situation' },
    { name: '수급자재정관리기록', link: '/nursingHome/financial-record' },
    { name: '수급자현황', link: '/nursingHome/beneficiary-status' },
    { name: '수급자확인정보', link: '/nursingHome/beneficiary-info' },
    { name: '물리치료표준시간등록', link: '/nursingHome/physical-therapy-time' },
    { name: '보조메뉴', link: '/nursingHome/sub-menu' },
    { name: '사용자코드등록', link: '/nursingHome/user-code-registration' },
    { name: '일반코드관리(UDC)', link: '/nursingHome/UDC-page' },
  ],
  '수급자서비스관리': [
    { name: '서비스실적 등록', link: '/nursingHome/service-performance' },
    { name: '물리치료실적 등록', link: '/nursingHome/physical-therapy-performance' },
    { name: '물리치료기록지 등록', link: '/nursingHome/physical-therapy-record' },
    { name: '진료기록지', link: '/nursingHome/medical-record' },
    { name: '월 실적 조회', link: '/nursingHome/monthly-performance' },
    { name: '월 수급자서비스현황 조회', link: '/nursingHome/monthly-service-status' },
    { name: '월 수급자종합실적 조회', link: '/nursingHome/monthly-comprehensive-performance' },
  ],
};

export interface MenuItem { name: string; link: string }
export type Sections3 = Record<string, Record<string, MenuItem[]>>;

export const sections3: Sections3 = {
  '수급자관리': {
    '수급자 기본정보 관리': [
      { name: '수급자 기본정보 등록', link: '/nursingHome/member-info' },
      { name: '수급자 계약정보 등록', link: '/nursingHome/member-contract-info' },
      { name: '보호자정보 등록', link: '/nursingHome/guardian-info' },
    ],
    '서비스실적등록': [
      { name: '일 수급자급여실적 등록', link: '/nursingHome/daily-beneficiary-performance' },
      { name: '일 장기요양제공내역 등록', link: '/nursingHome/daily-longterm-care' },
      { name: '간식내역 일괄 등록', link: '/nursingHome/snack-bulk-registration' },
      { name: '외출/외박 처리', link: '/nursingHome/outing-processing' },
    ],
    '수급자서비스 입력기준 정보 등록': [
      { name: '약물복용시간', link: '/nursingHome/medication-time' },
      { name: '장기요양-신체활동', link: '/nursingHome/longterm-physical-activity' },
      { name: '장기요양-간호및지시', link: '/nursingHome/longterm-nursing-instruction' },
      { name: '장기요양-기능및인지관리', link: '/nursingHome/longterm-functional-cognitive' },
      { name: '장기요양-수급자상태', link: '/nursingHome/longterm-beneficiary-status' },
      { name: '장기요양기록양식 출력', link: '/nursingHome/longterm-record-format' },
    ],
    '상담관리': [
      { name: '보호자(수급자)상담내역 등록', link: '/nursingHome/counseling-record' },
      { name: '사실확인서 출력', link: '/nursingHome/fact-verification' },
      { name: '연계기록지 출력', link: '/nursingHome/connection-record' },
      { name: '수급자 상태변화(관찰)내역 등록', link: '/nursingHome/status-change-observation' },
      { name: '응급상황기록', link: '/nursingHome/emergency-record' },
    ],
    '사례회의 관리': [
      { name: '사례관리 등록', link: '/nursingHome/case-management' },
    ],
    '월 장기요양 제공내역 관리': [
      { name: '월 장기요양제공내역 집계 및 출력', link: '/nursingHome/monthly-longterm-summary' },
    ],
    '보호자 간담회': [
      { name: '보호자 간담회내역 등록', link: '/nursingHome/guardian-meeting' },
    ],
    '수급자 현황': [
      { name: '수급자 현황 조회 및 출력', link: '/nursingHome/beneficiary-status-inquiry' },
    ],
  },
  '요양 서비스': {
    '장기요양제공 관리': [
      { name: '장기요양제공내역 등록', link: '/nursingHome/longterm-care-registration' },
    ],
    '배설관찰 관리': [
      { name: '배설관찰 등록', link: '/nursingHome/intensive-excretion-observation' },
      { name: '집중배설관찰 등록', link: '/nursingHome/excretion-observation' },
    ],
    '목욕서비스 관리': [
      { name: '목욕서비스제공내역 등록', link: '/nursingHome/bath-service' },
    ],
    '체위변경 관리': [
      { name: '체위변경내역 등록', link: '/nursingHome/position-change-record' },
    ],
  },
  '간호 서비스': {
    '질병 및 건강관리': [
      { name: '활력증상 등록(일상)', link: '/nursingHome/vital-signs' },
      { name: '활력증상 등록(주기)', link: '/nursingHome/vital-signs-periodic' },
      { name: '수급자건강검진내역 등록', link: '/nursingHome/health-examination' },
      { name: '수급자질병내역 등록', link: '/nursingHome/disease-history' },
    ],
    '약물관리': [
      { name: '수급자 복용약물 등록', link: '/nursingHome/medication-registration' },
      { name: '약물복용실적 등록', link: '/nursingHome/medication-performance' },
    ],
    '진료기록관리': [
      { name: '외래진료실적 등록', link: '/nursingHome/outpatient-record' },
      { name: '촉탁의진료내역 등록', link: '/nursingHome/entrusted-medical' },
      { name: '간호서비스내역', link: '/nursingHome/nursing-service' },
    ],
    '욕창 관리': [
      { name: '욕창관리내역 등록', link: '/nursingHome/bedsore-management' },
    ],
    '유치도뇨관 관리': [
      { name: '유치도뇨괸리내역 등록', link: '/nursingHome/indwelling-catheter' },
    ],
  },
  '물리(작업)치료 서비스': {
    '물리치료관리': [
      { name: '물리치료표준시간 등록', link: '/nursingHome/physical-therapy-standard-time' },
      { name: '물리치료실적 등록', link: '/nursingHome/physical-therapy-performance' },
      { name: '물리치료 계획 및 평가 등록', link: '/nursingHome/physical-therapy-plan-evaluation' },
      { name: '물리치료실적 평가 등록', link: '/nursingHome/physical-therapy-performance-evaluation' },
    ],
  },
  '프로그램 서비스': {
    '사원프로그램 계획 관리정보': [
      { name: '프로그램계획서 등록', link: '/nursingHome/program-plan-registration' },
      { name: '프로그램 총평 및 수급자평가 등록', link: '/nursingHome/program-evaluation' },
    ],
    '프로그램 일지': [
      { name: '프로그램 일지 등록', link: '/nursingHome/program-daily-log' },
    ],
    '월 프로그램 수행계획': [
      { name: '월 프로그램 수행계획 등록', link: '/nursingHome/monthly-program-plan' },
    ],
    '프로그램 의견수렴 및 반영': [
      { name: '프로그램 의견수렴 및 반영', link: '/nursingHome/program-feedback' },
    ],
  },
  '요구도관리': {
    '욕구 사정 기록지': [
      { name: '욕구 사정 기록지 등록', link: '/nursingHome/needs-assessment-record' },
    ],
    '욕창 위험도 측정': [
      { name: '욕창 위험도 측정내역 등록', link: '/nursingHome/bedsore-risk-measurement' },
    ],
    '낙상 위험측정(Hnhn)': [
      { name: '낙상 위험측정(Hnhn) 내역 등록', link: '/nursingHome/fall-risk-measurement' },
    ],
    '인지상태 평가': [
      { name: '인지상태 평가내역 등록', link: '/nursingHome/cognitive-assessment-record' },
    ],
  },
  '수급자 부담금 관리': {
    '부담금 발생자료 관리': [
      { name: '월급여자료 생성', link: '/nursingHome/monthly-salary-data' },
    ],
    '부담금 수금내역 관리': [
      { name: '월급여 수금내역 등록', link: '/nursingHome/monthly-salary-collection' },
    ],
    '부담금 명세서 발부대장': [
      { name: '월급여명세서및 발부 대장', link: '/nursingHome/monthly-salary-statement' },
    ],
    '수급자 급여 기초설정': [
      { name: '등급별급여Table 등록', link: '/nursingHome/grade-salary-table' },
    ],
  },
  '직원(사원)관리': {
    '사원 기본정보관리': [
      { name: '사원 기본(인적)정보 등록', link: '/nursingHome/employee-basic-info' },
    ],
    '사원근태관리': [
      { name: '사원 근태 등록', link: '/nursingHome/employee-attendance' },
      { name: '사원 근태현황(월) 조회', link: '/nursingHome/employee-attendance-monthly' },
    ],
    '사원년차관리': [
      { name: '년차 생성 및 조회', link: '/nursingHome/employee-annual-leave' },
    ],
    '근무시간표(신규)': [
      { name: '근무시간표', link: '/nursingHome/work-schedule' },
    ],
    '연간일정표(신규)': [
      { name: '연간 일정 등록 및 조회', link: '/nursingHome/annual-schedule' },
    ],
    '직원 회의록': [
      { name: '직원 회의록 등록', link: '/nursingHome/employee-meeting-minutes' },
    ],
    '직무교육': [
      { name: '직원직무교육내역 등록', link: '/nursingHome/employee-job-training' },
    ],
  },
  '시설 관리 및 기타': {
    '시설정보등록': [
      { name: '시설기본정보 등록', link: '/nursingHome/facility-basic-info' },
      { name: '시설 사용자(ID) 관리', link: '/nursingHome/facility-user-management' },
    ],
    '업무프로그램관리': [
      { name: '사원/업무프로그램 매핑', link: '/nursingHome/employee-program-mapping' },
      { name: '사원/수급자 매핑', link: '/nursingHome/employee-beneficiary-mapping' },
    ],
    '시설 일과표': [
      { name: '시설(직원)일과표 관리', link: '/nursingHome/facility-daily-schedule' },
    ],
    '센터 업무현황': [
      { name: '시설업무일지 등록', link: '/nursingHome/facility-work-log' },
      { name: '시설업무일지 결재', link: '/nursingHome/facility-work-log-approval' },
    ],
    '자원봉사자 관리': [
      { name: '단체봉사 실적 등록', link: '/nursingHome/group-volunteer-performance' },
      { name: '개인봉사 실적 등록', link: '/nursingHome/individual-volunteer-performance' },
    ],
    '공지사항관리': [
      { name: '공지사항 등록', link: '/nursingHome/notice-registration' },
      { name: '공지사항 조회', link: '/nursingHome/notice-inquiry' },
    ],
    '자료실': [
      { name: '자료실', link: '/nursingHome/data-room' },
    ],
    '평가체크리스트': [
      { name: '평가체크리스트', link: '/nursingHome/evaluation-checklist' },
    ],
  },
  '요양원 관리시스템': {
    'UDC 관리': [
      { name: 'UDC 관리 페이지', link: '/nursingHome/UDC-page' },
      { name: '사용자 코드 등록', link: '/nursingHome/user-code-registration' },
    ],
  },
};

export const pathToTitleMap: Record<string, string> = (() => {
  const acc: Record<string, string> = {};
  Object.values(sections3).forEach((groups) => {
    Object.values(groups).forEach((items) => {
      items.forEach((it) => (acc[it.link] = it.name));
    });
  });
  return acc;
})();
