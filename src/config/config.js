require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  dbconfig: {
    server: process.env.DB_DEV_SERVER,
    port: parseInt(process.env.DB_DEV_PORT, 10),
    pool: {
      max: 10,                    // 최대 연결 수 증가
      min: 0,                    // 최소 연결 수를 0으로 설정 (시작 시 연결 생성 안 함)
      idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃
      acquireTimeoutMillis: 60000, // 연결 획득 타임아웃 (60초)
    },
    connectionTimeout: 30000,    // 연결 타임아웃 (30초)
    requestTimeout: 30000,       // 요청 타임아웃 (30초)
    options: {
      encrypt: true,
      database: process.env.DB_DEV_DATABASE, 
      trustServerCertificate: true,
    },
    authentication: {
      type: 'default',
      options: {
        userName: process.env.DB_DEV_USERNAME,
        password: process.env.DB_DEV_PASSWORD, 
      },
    },
  },
};

module.exports = { config };