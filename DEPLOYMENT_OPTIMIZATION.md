# Azure App Service 배포 최적화 가이드

## 콜드 스타트 문제 해결

### 1. Always On 설정 활성화 (중요!)

Azure Portal에서 다음 설정을 확인하세요:

1. **Azure Portal** → **App Service** → **Configuration** → **General settings**
2. **Always On** 설정을 **On**으로 변경
3. **Save** 클릭

**효과**: 애플리케이션이 비활성 상태로 전환되지 않아 콜드 스타트가 발생하지 않습니다.

### 2. 애플리케이션 워밍업 (선택사항)

정기적으로 애플리케이션에 요청을 보내 워밍업할 수 있습니다:

- Azure Functions 또는 Logic Apps를 사용하여 주기적으로 헬스체크 엔드포인트 호출
- 예: `/api/dbtest` 엔드포인트를 5분마다 호출

### 3. 데이터베이스 연결 최적화

이미 적용된 최적화:
- ✅ 지연 로딩: DB 연결을 필요할 때만 생성
- ✅ 연결 풀 최소값 0: 시작 시 연결 생성 안 함
- ✅ 연결 재사용: 기존 연결 풀 재사용

### 4. 추가 최적화 옵션

#### App Service Plan 업그레이드
- **Basic** 이상의 플랜 사용 시 Always On 지원
- **Standard** 이상 권장 (더 나은 성능)

#### 환경 변수 최적화
- `NODE_ENV=production` 설정 확인
- 불필요한 로깅 비활성화

#### 모니터링
- Application Insights 활성화하여 성능 모니터링
- 콜드 스타트 발생 빈도 추적

## 현재 적용된 최적화

1. ✅ DB 연결 지연 로딩
2. ✅ 연결 풀 최적화 (min: 0)
3. ✅ 연결 재사용 및 에러 처리

## 확인 사항

배포 후 다음을 확인하세요:

1. Azure Portal에서 Always On이 활성화되어 있는지 확인
2. 첫 요청 후 로그에서 "DB 연결 시도 중..." 메시지가 첫 API 호출 시에만 나타나는지 확인
3. Application Insights에서 응답 시간 모니터링

