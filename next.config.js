/** @type {import('next').NextConfig} */
const isWin = process.platform === 'win32';

const nextConfig = {
  // ✅ Azure 호환 빌드 (standalone 출력)
  output: 'standalone',

  // ✅ 빌드 중 ESLint 검사 비활성화
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ TypeScript 빌드 오류 무시 (배포 시)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ SWC 최적화 활성화 (기본값이지만 명시적으로 설정)
  swcMinify: true,

  // ✅ 컴파일러 최적화
  compiler: {
    // 프로덕션 빌드에서 console.log 제거
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ✅ 불필요한 파일 제외로 빌드 시간 단축
  experimental: {
    outputFileTracingExcludes: {
      '*': isWin 
        ? [
            'C:\\\\Windows\\\\CSC\\\\**', 
            'C:/Windows/CSC/**',
            // 개발 관련 파일 제외
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            // MDX 파일 제외 (사용하지 않는 경우)
            '**/data/blog/**',
          ]
        : [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/data/blog/**',
          ],
    },
    // 빌드 캐시 최적화
    optimizeCss: true,
  },

  // ✅ 웹팩 최적화
  webpack: (config, { isServer }) => {
    // 프로덕션 빌드 최적화
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      };
    }
    return config;
  },
};

module.exports = nextConfig;