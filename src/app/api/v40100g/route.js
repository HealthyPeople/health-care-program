import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const VIEW = '[돌봄시설DB].[dbo].[V40100G]';

function normalizeSalyy(v) {
	if (v == null || v === '') return null;
	const s = String(v).replace(/\D/g, '');
	if (s.length >= 4) return s.slice(0, 4);
	return null;
}

function num(v) {
	const n = parseInt(String(v ?? '0').replace(/,/g, ''), 10);
	return Number.isFinite(n) ? n : 0;
}

function pad2(m) {
	return String(m).padStart(2, '0');
}

function normalizeBirthday(v) {
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
	const months = [];
	for (let m = 1; m <= 12; m++) {
		const mm = pad2(m);
		const nha = num(r[`공단부담금${mm}월`]);
		const recipientBurden = num(r[`수급자부담금${mm}월`]);
		const nonBenefit = num(r[`비급여${mm}월`]);
		months.push({
			month: m,
			nhaContribution: nha,
			recipientContribution: recipientBurden,
			nonBenefit,
			total: nha + recipientBurden + nonBenefit,
			recipientBurdenTotal: recipientBurden + nonBenefit,
		});
	}

	return {
		ANCD: r.ANCD,
		SALYY: r.SALYY != null ? String(r.SALYY).trim() : '',
		PNUM: r.PNUM != null ? String(r.PNUM).trim() : '',
		ANGH: r.ANGH != null ? String(r.ANGH).trim() : '',
		recipient: r['수급자'] != null ? String(r['수급자']).trim() : '',
		recognitionNo: r['인정번호'] != null ? String(r['인정번호']).trim() : '',
		birthday: normalizeBirthday(r['수급자생일']),
		rrn: r['수급자주민번호'] != null ? String(r['수급자주민번호']).trim() : '',
		sex: r['성별'] != null ? String(r['성별']).trim() : '',
		orgCode: r['기관기호'] != null ? String(r['기관기호']).trim() : '',
		orgName: r['기관명'] != null ? String(r['기관명']).trim() : '',
		orgAddr: r['주소'] != null ? String(r['주소']).trim() : '',
		orgBizNo: r['사업번호'] != null ? String(r['사업번호']).trim() : '',
		orgOwner: r['대표자명'] != null ? String(r['대표자명']).trim() : '',
		orgTel: r['센터전화번호'] != null ? String(r['센터전화번호']).trim() : '',
		months,
	};
}

/**
 * V40100G 연간 납부확인 집계 뷰
 * GET /api/v40100g?salyy=YYYY
 * GET /api/v40100g?salyy=YYYY&pnum=PNUM
 * GET /api/v40100g?salyy=YYYY&pnums=1,2,3
 */
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const ancd = sp.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const salyy = normalizeSalyy(sp.get('salyy') || sp.get('year') || sp.get('salmm'));
		if (!salyy) {
			return new Response(
				JSON.stringify({ success: false, error: 'salyy(YYYY) 파라미터가 필요합니다.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
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
		request.input('salyy', sql.VarChar(6), salyy);

		const pnum = sp.get('pnum');
		const pnumsRaw = sp.get('pnums');

		let result;
		if (pnum != null && String(pnum).trim() !== '') {
			request.input('pnum', sql.VarChar(30), String(pnum).trim());
			result = await request.query(`
        SELECT TOP 1 *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND LEFT(LTRIM(RTRIM(ISNULL([SALYY], ''))), 4) = @salyy
          AND CAST([PNUM] AS VARCHAR(30)) = @pnum
        ORDER BY [PNUM]
      `);
			const row = result.recordset?.[0] ? mapRow(result.recordset[0]) : null;
			return new Response(JSON.stringify({ success: true, data: row, salyy }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (pnumsRaw != null && String(pnumsRaw).trim() !== '') {
			const list = String(pnumsRaw)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (list.length === 0) {
				return new Response(JSON.stringify({ success: true, data: [], count: 0, salyy }), {
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
          AND LEFT(LTRIM(RTRIM(ISNULL([SALYY], ''))), 4) = @salyy
          AND CAST([PNUM] AS VARCHAR(30)) IN (${placeholders})
        ORDER BY [수급자] ASC, CAST([PNUM] AS VARCHAR(30)) ASC
      `);
		} else {
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND LEFT(LTRIM(RTRIM(ISNULL([SALYY], ''))), 4) = @salyy
        ORDER BY [수급자] ASC, CAST([PNUM] AS VARCHAR(30)) ASC
      `);
		}

		// 동일 PNUM 중복 행이 있으면 첫 행만 사용
		const seen = new Set();
		const mapped = [];
		for (const raw of result.recordset || []) {
			const key = String(raw.PNUM ?? '').trim();
			if (!key || seen.has(key)) continue;
			seen.add(key);
			mapped.push(mapRow(raw));
		}

		return new Response(
			JSON.stringify({
				success: true,
				data: mapped,
				count: mapped.length,
				salyy,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('V40100G GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
