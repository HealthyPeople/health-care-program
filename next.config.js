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

  // ✅ (선택) experimental 제외 규칙 유지 — 윈도우 전용 예외 처리
  experimental: {
    outputFileTracingExcludes: {
      '*': isWin ? ['C:\\\\Windows\\\\CSC\\\\**', 'C:/Windows/CSC/**'] : [],
    },
  },
};

module.exports = nextConfig;
