import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const VIEW = '[돌봄시설DB].[dbo].[V10010C]';

function str(v) {
	if (v == null) return '';
	return String(v).trim();
}

function mapRow(r) {
	return {
		ANCD: r.ANCD,
		PNUM: r.PNUM != null ? String(r.PNUM).trim() : '',
		name: str(r['수급자명']),
		P_ST: str(r.P_ST),
		status: str(r['수급자상태']),
		birthday: str(r['생일']),
		sex: str(r['성별']),
		recognitionNo: str(r['장기요양인증번호']),
		grade: str(r['요양등급']),
		validPeriod: str(r['유효기간']),
		zip: str(r['우편번호']),
		address: str(r['집주소']),
		homePhone: str(r['집전화번호']),
		dischargeReason: str(r['퇴소사유']),
		contractDate: str(r['계약일자']),
		hospital: str(r['이용병원']),
		// DB 뷰 컬럼명 오타(당당주치의) 대응
		doctorName: str(r['당당주치의'] ?? r['담당주치의']),
		doctorTel: str(r['주치의연락처']),
		admitDate: str(r['입소일자']),
		dischargeDate: str(r['퇴소일자']),
	};
}

/**
 * V10010C 수급자카드 뷰
 * GET /api/v10010c?pnum=PNUM
 */
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const ancd = sp.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const pnum = sp.get('pnum');
		if (!pnum || String(pnum).trim() === '') {
			return new Response(JSON.stringify({ success: false, error: 'pnum 파라미터가 필요합니다.' }), {
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
		request.input('sessionAncd', gate.sessionAncd);
		request.input('pnum', sql.VarChar(30), String(pnum).trim());

		const result = await request.query(`
      SELECT TOP 1 *
      FROM ${VIEW}
      WHERE [ANCD] = @sessionAncd
        AND CAST([PNUM] AS VARCHAR(30)) = @pnum
    `);

		const row = result.recordset?.[0] ? mapRow(result.recordset[0]) : null;
		return new Response(JSON.stringify({ success: true, data: row }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('V10010C GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
