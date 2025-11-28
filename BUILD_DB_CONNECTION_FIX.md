# 빌드 타임 DB 연결 문제 해결

## 문제 상황

Next.js 빌드 중 "Collecting page data..." 단계에서 DB 연결을 시도하여 타임아웃 오류가 발생했습니다.

```
DB 연결 시도 중...
DB 연결 실패! 에러 내용: ConnectionError: Failed to connect to 61.100.12.61:1433 in 30000ms
```

## 원인

`src/config/server.js` 파일에서 모듈이 import될 때 즉시 DB 연결을 시도하는 코드가 있었습니다:

```javascript
const connPool = getConnectionPool(); // 모듈 로드 시 즉시 실행
```

Next.js 빌드 중에는 모든 페이지와 API 라우트를 분석하면서 모듈들이 import되므로, 이 시점에 DB 연결이 시도되었습니다.

## 해결 방법

### 1. 빌드 타임 감지 추가

`isBuildTime()` 함수를 추가하여 다음 조건들을 확인합니다:

- `NEXT_PHASE === 'phase-production-build'` (Next.js 빌드 단계)
- `process.argv`에 'build' 포함 (빌드 스크립트 실행 중)
- Azure 빌드 환경: `SCM_DO_BUILD_DURING_DEPLOYMENT === 'true'`이고 `WEBSITE_INSTANCE_ID`가 없는 경우

### 2. 빌드 타임에 DB 연결 건너뛰기

빌드 타임에는 `Promise.resolve(null)`을 반환하여 DB 연결을 시도하지 않습니다:

```javascript
if (isBuildTime()) {
  connPoolPromise = Promise.resolve(null); // 빌드 타임에는 null 반환
} else {
  connPoolPromise = getConnectionPool(); // 런타임에는 실제 연결 시도
}
```

### 3. `getConnectionPool()` 함수에서도 빌드 타임 체크

실제 연결 시도 전에 빌드 타임인지 확인하여 이중으로 보호합니다.

## 적용된 변경 사항

### `src/config/server.js`

1. `isBuildTime()` 함수 추가 - 빌드 타임 감지
2. `getConnectionPool()` 함수 수정 - 빌드 타임 체크 추가
3. `connPool` 초기화 로직 수정 - 빌드 타임에는 null 반환

## 테스트

빌드를 실행하여 DB 연결 오류가 발생하지 않는지 확인:

```bash
npm run build
```

예상 결과:
- 빌드가 성공적으로 완료됨
- "DB 연결 시도 중..." 메시지가 나타나지 않음
- 타임아웃 오류가 발생하지 않음

## 추가 참고 사항

### 왜 빌드 타임에 DB 연결이 필요 없는가?

- Next.js 빌드 중에는 API 라우트가 실행되지 않습니다
- 빌드는 정적 페이지 생성과 번들링만 수행합니다
- DB 연결은 런타임에 실제 API 요청이 들어올 때만 필요합니다

### Azure 배포 환경

Azure App Service에서 빌드가 실행될 때:
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` 환경 변수가 설정됨
- 빌드 중에는 `WEBSITE_INSTANCE_ID`가 없음
- 이러한 조건을 활용하여 빌드 타임을 감지합니다

### 런타임 동작

실제 애플리케이션이 실행될 때:
- `WEBSITE_INSTANCE_ID`가 설정됨
- `isBuildTime()`이 `false`를 반환
- 정상적으로 DB 연결이 시도됨

## 문제가 계속되는 경우

만약 빌드 타임 감지가 제대로 작동하지 않는다면:

1. **환경 변수 확인**
   ```bash
   echo $NEXT_PHASE
   echo $SCM_DO_BUILD_DURING_DEPLOYMENT
   echo $WEBSITE_INSTANCE_ID
   ```

2. **수동으로 빌드 타임 표시**
   Azure 환경 변수에 `SKIP_DB_CONNECTION=true`를 추가하고, `isBuildTime()` 함수에서 이를 확인하도록 수정할 수 있습니다.

3. **에러 핸들링 개선**
   빌드 타임에 DB 연결 실패를 조용히 무시하도록 추가 처리할 수 있습니다.

