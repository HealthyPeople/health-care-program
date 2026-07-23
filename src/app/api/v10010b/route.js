import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const VIEW = '[돌봄시설DB].[dbo].[V10010B]';

function str(v) {
	if (v == null) return '';
	return String(v).trim();
}

function normalizeYmd(v) {
	if (v == null || v === '') return '';
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	if (s.includes('T')) return s.split('T')[0].slice(0, 10);
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return s;
}

function mapRow(r) {
	return {
		seq: r['순번'] != null ? Number(r['순번']) : null,
		ANCD: r.ANCD,
		PNUM: r.PNUM != null ? String(r.PNUM).trim() : '',
		name: str(r['성명']),
		birthday: str(r['생일']),
		contractDate: normalizeYmd(r['계약일자']),
		recognitionNo: str(r['인정번호']),
		grade: str(r['인정등급']),
		validPeriod: str(r['인정유효기간']),
		benefitType: str(r['급여종류']),
		contractorName: str(r['계약자성명']),
		relation: str(r['수급자와관계']),
		homePhone: str(r['자택전화번호']),
		// DB 뷰 컬럼명 오타(헨드폰번호) 대응
		mobilePhone: str(r['헨드폰번호'] ?? r['핸드폰번호']),
		contractPeriod: str(r['계약기간']),
		serviceType: str(r['서비스구분1'] ?? r['서비스구분']),
	};
}

/**
 * V10010B 수급자 계약정보 뷰
 * GET /api/v10010b
 * GET /api/v10010b?pnum=PNUM
 * GET /api/v10010b?pnums=1,2,3
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

		const request = pool.request();
		request.input('sessionAncd', gate.sessionAncd);

		const pnum = sp.get('pnum');
		const pnumsRaw = sp.get('pnums');

		let result;
		if (pnum != null && String(pnum).trim() !== '') {
			request.input('pnum', sql.VarChar(30), String(pnum).trim());
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND CAST([PNUM] AS VARCHAR(30)) = @pnum
        ORDER BY [성명] ASC, [순번] ASC, [계약일자] DESC
      `);
		} else if (pnumsRaw != null && String(pnumsRaw).trim() !== '') {
			const list = String(pnumsRaw)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (list.length === 0) {
				return new Response(JSON.stringify({ success: true, data: [], count: 0 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const placeholders = list
				.map((_, i) => {
					request.input(`p${i}`, sql.VarChar(30), list[i]);
					return `@p${i}`;
				})
				.join(',');
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND CAST([PNUM] AS VARCHAR(30)) IN (${placeholders})
        ORDER BY [성명] ASC, [순번] ASC, [계약일자] DESC
      `);
		} else {
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
        ORDER BY [성명] ASC, [순번] ASC, [계약일자] DESC
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
		console.error('V10010B GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
