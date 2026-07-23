import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const VIEW = '[돌봄시설DB].[dbo].[V10010A]';

function mapRow(r) {
	return {
		ANCD: r.ANCD,
		P_ST: r.P_ST != null ? String(r.P_ST).trim() : '',
		name: r['성명'] != null ? String(r['성명']).trim() : '',
		sex: r['성별'] != null ? String(r['성별']).trim() : '',
		birthday: r['생일'] != null ? String(r['생일']).trim() : '',
		age: r['나이'] != null && r['나이'] !== '' ? Number(r['나이']) : null,
		recognitionNo: r['장기요양인증번호'] != null ? String(r['장기요양인증번호']).trim() : '',
		grade: r['요양등급'] != null ? String(r['요양등급']).trim() : '',
		validPeriod: r['유효기간'] != null ? String(r['유효기간']).trim() : '',
		status: r['상태'] != null ? String(r['상태']).trim() : '',
		admitDate: r['입소일자'] != null ? String(r['입소일자']).trim() : '',
		dischargeDate: r['퇴소일자'] != null ? String(r['퇴소일자']).trim() : '',
		guardianPhone: r['보호자연락처'] != null ? String(r['보호자연락처']).trim() : '',
	};
}

/**
 * V10010A 수급자 전체 목록 뷰
 * GET /api/v10010a
 * GET /api/v10010a?status=입소|퇴소
 */
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const ancd = sp.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const status = String(sp.get('status') || '').trim();
		const request = pool.request();
		request.input('sessionAncd', gate.sessionAncd);

		let result;
		if (status === '입소' || status === '퇴소') {
			request.input('status', sql.VarChar(4), status);
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND LTRIM(RTRIM([상태])) = @status
        ORDER BY [성명] ASC
      `);
		} else {
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
        ORDER BY [성명] ASC
      `);
		}

		const data = (result.recordset || []).map(mapRow);
		return new Response(
			JSON.stringify({
				success: true,
				data,
				count: data.length,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('V10010A GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
