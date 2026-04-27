import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F00131]';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ancd = searchParams.get('ancd');
    const uid = searchParams.get('uid');
    const pgmid = searchParams.get('pgmid');

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    if (!uid || !pgmid) {
      return new Response(JSON.stringify({ success: false, error: 'uid, pgmid 파라미터가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pool = await connPool;
    if (!pool) {
      return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const request = pool.request();
    request.input('ANCD', ancd ?? gate.sessionAncd);
    request.input('UID', String(uid).trim());
    request.input('PGMID', String(pgmid).trim());

    const result = await request.query(`
      SELECT TOP 1
        [ANCD],
        [UID],
        [PGMID],
        [INEMPNO],
        [INEMPNM],
        [INDT],
        [ETC]
      FROM ${TABLE_NAME}
      WHERE [ANCD] = @ANCD
        AND [UID] = @UID
        AND [PGMID] = @PGMID
      ORDER BY [INDT] DESC
    `);

    const row = result.recordset?.[0] ?? null;
    return new Response(JSON.stringify({ success: true, data: row, allowed: !!row }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('F00131 권한 조회 오류:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

