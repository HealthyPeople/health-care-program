const sql = require('mssql');
const { config } = require('./config');

// 보안 옵션 명시적으로 추가
config.dbconfig.options = {
  encrypt: false,                // ✅ SSL 비활성화
  trustServerCertificate: true   // ✅ 자체 서명 인증서 허용
};

// 연결 풀을 지연 로딩으로 변경 (콜드 스타트 최적화)
let poolPromise = null;
let poolInstance = null;

/**
 * 데이터베이스 연결 풀을 가져옵니다 (지연 로딩)
 * 첫 호출 시에만 연결을 시도하고, 이후에는 기존 연결을 재사용합니다.
 */
function getConnectionPool() {
  // 이미 연결된 풀이 있으면 재사용
  if (poolInstance && poolInstance.connected) {
    return Promise.resolve(poolInstance);
  }

  // 연결 중인 Promise가 있으면 재사용
  if (poolPromise) {
    return poolPromise;
  }

  // 새로운 연결 시도
  console.log('DB 연결 시도 중...');
  poolPromise = new sql.ConnectionPool(config.dbconfig)
    .connect()
    .then((pool) => {
      console.log('DB연결 성공');
      poolInstance = pool;
      
      // 연결 종료 이벤트 처리
      pool.on('error', (err) => {
        console.error('DB 연결 풀 오류:', err);
        // 연결이 끊어지면 재연결을 위해 초기화
        poolInstance = null;
        poolPromise = null;
      });

      return pool;
    })
    .catch((err) => {
      console.error('DB 연결 실패! 에러 내용:', err);
      if (err.code) console.error('에러 코드:', err.code);
      if (err.message) console.error('에러 메시지:', err.message);
      if (err.stack) console.error('에러 스택:', err.stack);
      
      // 실패 시 재시도를 위해 초기화
      poolInstance = null;
      poolPromise = null;
      
      throw err;
    });

  return poolPromise;
}

// 기존 API와의 호환성을 위해 connPool export (지연 로딩)
const connPool = getConnectionPool();

module.exports = {
  sql,
  connPool,
  getConnectionPool
};