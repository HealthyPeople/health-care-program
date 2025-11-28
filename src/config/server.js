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
 * 빌드 타임인지 확인합니다
 * Next.js 빌드 중에는 DB 연결을 시도하지 않습니다
 * 보수적으로 접근: 확실하지 않으면 빌드가 아니라고 간주 (런타임)
 */
function isBuildTime() {
  // Azure 런타임이면 확실히 빌드가 아님
  // WEBSITE_INSTANCE_ID가 있으면 런타임
  if (process.env.WEBSITE_INSTANCE_ID) {
    return false;
  }
  
  // Next.js 빌드 중인지 확인 (가장 확실한 방법)
  // NEXT_PHASE 환경 변수는 Next.js 빌드 프로세스에서만 설정됨
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true;
  }
  
  // 그 외의 경우는 모두 런타임으로 간주
  // 빌드 타임 감지가 불확실하면 DB 연결을 시도하는 것이 안전함
  return false;
}

/**
 * 데이터베이스 연결 풀을 가져옵니다 (지연 로딩)
 * 첫 호출 시에만 연결을 시도하고, 이후에는 기존 연결을 재사용합니다.
 */
function getConnectionPool() {
  // 빌드 타임에는 DB 연결을 시도하지 않음
  if (isBuildTime()) {
    console.log('빌드 타임: DB 연결을 건너뜁니다.');
    return Promise.reject(new Error('빌드 타임에는 DB 연결을 시도하지 않습니다.'));
  }

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

// 기존 API와의 호환성을 위해 connPool export
// 실제 사용 시점에만 연결을 시도하도록 lazy evaluation
// 모듈 로드 시점에는 아무 작업도 하지 않음
let connPoolPromise = null;

// connPool을 thenable 객체로 만들어서 실제 사용 시점에만 연결 시도
const connPool = {
  then: function(onFulfilled, onRejected) {
    // 실제로 사용될 때만 연결 시도
    if (!connPoolPromise) {
      // 빌드 타임이면 null 반환 (연결 시도 안 함)
      if (isBuildTime()) {
        connPoolPromise = Promise.resolve(null);
      } else {
        // 런타임에는 실제 연결 시도
        connPoolPromise = getConnectionPool();
      }
    }
    return connPoolPromise.then(onFulfilled, onRejected);
  },
  catch: function(onRejected) {
    if (!connPoolPromise) {
      if (isBuildTime()) {
        connPoolPromise = Promise.resolve(null);
      } else {
        connPoolPromise = getConnectionPool();
      }
    }
    return connPoolPromise.catch(onRejected);
  }
};

module.exports = {
  sql,
  connPool,
  getConnectionPool
};