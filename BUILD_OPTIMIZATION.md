# 빌드 시간 최적화 가이드

## 적용된 최적화 사항

### 1. Next.js 설정 최적화 (`next.config.js`)

#### SWC 최적화
- `swcMinify: true` - SWC 컴파일러를 사용한 빠른 최소화
- 프로덕션 빌드에서 불필요한 `console.log` 자동 제거

#### 불필요한 파일 제외
- 테스트 파일 (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`) 제외
- 사용하지 않는 MDX 블로그 파일 제외 (`data/blog/**`)
- Windows CSC 캐시 디렉토리 제외

#### 웹팩 최적화
- `moduleIds: 'deterministic'` - 빌드 간 일관성 유지 및 캐시 효율성 향상

### 2. 빌드 스크립트 최적화 (`package.json`)

#### 변경 사항
- **기본 `build` 스크립트**: 캐시를 유지하여 증분 빌드 활용
- **`build:clean` 스크립트**: 완전히 깨끗한 빌드가 필요한 경우에만 사용

```bash
# 일반 빌드 (캐시 활용 - 빠름)
npm run build

# 완전히 깨끗한 빌드 (캐시 삭제 후 빌드 - 느림)
npm run build:clean
```

### 3. TypeScript 설정 최적화 (`tsconfig.json`)

- 테스트 파일 제외로 컴파일 시간 단축
- `incremental: true` - 증분 컴파일 활성화 (이미 설정됨)

### 4. 빌드 캐시 관리

- `.turbo` 디렉토리를 `.gitignore`에 추가하여 캐시 유지
- `.next` 캐시 유지로 증분 빌드 활용

## 예상 빌드 시간 개선

### 최적화 전
- **18분** (캐시 삭제 후 빌드)

### 최적화 후 예상
- **첫 빌드**: 15-18분 (최적화 설정 적용)
- **증분 빌드**: 3-8분 (변경된 파일만 재빌드)

## 추가 최적화 팁

### 1. 빌드 캐시 활용
```bash
# 캐시를 유지한 채로 빌드 (권장)
npm run build

# 캐시 삭제가 필요한 경우에만
npm run build:clean
```

### 2. 병렬 빌드 (CI/CD 환경)
CI/CD 환경에서는 다음 환경 변수를 설정하여 병렬 빌드 활용:
```bash
NEXT_TELEMETRY_DISABLED=1
```

### 3. 불필요한 의존성 제거
- 사용하지 않는 패키지 제거
- `package.json`의 `dependencies`와 `devDependencies` 정리

### 4. 이미지 최적화
- `next/image` 컴포넌트 사용
- 이미지 파일 크기 최적화

### 5. 코드 스플리팅
- 동적 임포트 사용 (`next/dynamic`)
- 큰 라이브러리는 필요할 때만 로드

## 모니터링

빌드 시간을 모니터링하려면:
```bash
# 빌드 시간 측정
time npm run build
```

또는 Windows PowerShell:
```powershell
Measure-Command { npm run build }
```

## 문제 해결

### 빌드가 여전히 느린 경우

1. **캐시 확인**
   ```bash
   # .next 디렉토리 확인
   ls -la .next
   ```

2. **의존성 재설치**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **불필요한 파일 확인**
   - `data/blog` 폴더가 실제로 사용되는지 확인
   - 사용하지 않으면 `next.config.js`에서 제외 규칙 유지

4. **하드웨어 확인**
   - SSD 사용 권장
   - RAM 8GB 이상 권장
   - Node.js 버전 확인 (>=22.0.0)

## 참고 사항

- Azure App Service 배포 시 `.postbuild.sh` 스크립트가 자동 실행됩니다
- `standalone` 출력 모드로 최소한의 파일만 배포됩니다
- 프로덕션 빌드에서는 `console.log`가 자동으로 제거됩니다 (에러/경고 제외)

