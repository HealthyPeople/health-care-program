/**
 * httpOnly user_info 쿠키 파싱 및 로그인 세션의 ANCD 조회 (API 라우트용)
 */

function parseUserInfoCookieValue(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      try {
        return JSON.parse(decodeURIComponent(decodeURIComponent(raw)));
      } catch {
        return null;
      }
    }
  }
}

function getSessionFromRequest(req) {
  const raw = req.cookies.get('user_info')?.value;
  return parseUserInfoCookieValue(raw);
}

function getSessionAncd(req) {
  const u = getSessionFromRequest(req);
  if (!u || u.ancd == null || u.ancd === '') return null;
  const s = String(u.ancd).trim();
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? s : n;
}

function normalizeAncdForCompare(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? s : n;
}

function ancdEquals(a, b) {
  const x = normalizeAncdForCompare(a);
  const y = normalizeAncdForCompare(b);
  if (x == null || y == null) return false;
  return String(x) === String(y);
}

/**
 * URL/바디의 ANCD가 세션과 일치하는지 검사. param이 없으면 세션 ANCD만 반환.
 * @returns {{ ok: true, sessionAncd: number|string, paramAncd: number|string|null } | { ok: false, response: Response }}
 */
function assertAnCdMatchesSession(req, paramAncd) {
  const sessionAncd = getSessionAncd(req);
  if (sessionAncd == null) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ success: false, error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  if (paramAncd == null || paramAncd === '') {
    return { ok: true, sessionAncd, paramAncd: null };
  }
  if (!ancdEquals(paramAncd, sessionAncd)) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ success: false, error: '해당 기관에 대한 접근 권한이 없습니다.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { ok: true, sessionAncd, paramAncd: normalizeAncdForCompare(paramAncd) };
}

module.exports = {
  parseUserInfoCookieValue,
  getSessionFromRequest,
  getSessionAncd,
  normalizeAncdForCompare,
  ancdEquals,
  assertAnCdMatchesSession,
};
