import { connPool } from '../../../../config/server';
import { assertAnCdMatchesSession } from '../../../../config/sessionServer';

/**
 * F00120 사용자정보에서 사원명(EMPNM) 부분 검색.
 * 로그인 세션의 ANCD로만 조회합니다. URL의 ancd는 세션과 일치할 때만 허용됩니다.
 * activeOnly=1: F01010 근무상태 JOBST='1'만 (기본 아님, 명시 시).
 * activeOnly=0(기본): F00120만 조회.
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		const pool = await connPool;
		if (!pool) {
			return new Response(
				JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const q = (searchParams.get('q') || '').trim();
		const activeOnly = searchParams.get('activeOnly') === '1';

		if (!q) {
			return new Response(JSON.stringify({ success: true, data: [], count: 0 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const sa = gate.sessionAncd;
		const ancdNum = typeof sa === 'number' ? sa : parseInt(String(sa), 10);
		if (Number.isNaN(ancdNum)) {
			return new Response(
				JSON.stringify({ success: false, error: 'ancd가 올바르지 않습니다' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		let query;
		const ancdClause = 'AND f120.[ANCD] = @ancd';
		const ancdClauseSimple = 'AND [ANCD] = @ancd';

		if (activeOnly) {
			query = `
				SELECT
					f120.[ANCD],
					f120.[UID],
					f120.[EMPNO],
					f120.[EMPNM]
				FROM [돌봄시설DB].[dbo].[F00120] f120
				INNER JOIN [돌봄시설DB].[dbo].[F01010] f010
					ON f120.[ANCD] = f010.[ANCD]
					AND f120.[EMPNO] = f010.[EMPNO]
				WHERE f120.[EMPNM] LIKE @pattern
					${ancdClause}
					AND f010.[JOBST] = '1'
				ORDER BY f120.[EMPNM]
			`;
		} else {
			query = `
				SELECT
					[ANCD],
					[UID],
					[EMPNO],
					[EMPNM]
				FROM [돌봄시설DB].[dbo].[F00120]
				WHERE [EMPNM] LIKE @pattern
					${ancdClauseSimple}
				ORDER BY [EMPNM]
			`;
		}

		const request = pool.request();
		request.input('ancd', ancdNum);
		request.input('pattern', `%${q}%`);

		const result = await request.query(query);
		const recordset = result.recordset || [];

		return new Response(
			JSON.stringify({ success: true, data: recordset, count: recordset.length }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('F00120 검색 오류:', err);
		return new Response(
			JSON.stringify({ success: false, error: err.message, details: err.toString() }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
