import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const VIEW = '[돌봄시설DB].[dbo].[V40100]';

function normalizeSalmm(v) {
	if (v == null || v === '') return null;
	const s = String(v).replace(/\D/g, '');
	if (s.length === 6) return s;
	return null;
}

function num(v) {
	if (v == null || v === '') return 0;
	const n = parseInt(String(v).replace(/,/g, ''), 10);
	return Number.isFinite(n) ? n : 0;
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
	const roomUpgrade = num(r['병실승급비']);
	const premiumRoom = num(r['상급병실료']);
	const roomAdjust = num(r['병실조정료']);
	const otherCost = num(r['기타비용']);
	const otherFee = num(r['기타비']);

	return {
		ANCD: r.ANCD,
		SALMM: r.SALMM != null ? String(r.SALMM).trim() : '',
		PNUM: r.PNUM != null ? String(r.PNUM).trim() : '',
		yearMonthLabel: r['년월'] != null ? String(r['년월']).trim() : '',
		status: r['상태'] != null ? String(r['상태']).trim() : '',
		recipient: r['수급자'] != null ? String(r['수급자']).trim() : '',
		birthday: normalizeYmd(r['생일']),
		grade: r['등급'] != null ? String(r['등급']).trim() : '',
		recognitionNo: r['인정번호'] != null ? String(r['인정번호']).trim() : '',
		nhaContribution: num(r['공단부담금']),
		recipientContribution: num(r['수급자부담금']),
		benefitTotal: num(r['급여합계']),
		nonBenefitMeal: num(r['비급여식대']),
		mealFee: num(r['식대']),
		nonBenefitSnack: num(r['비급여간식']),
		nonBenefitMedical: num(r['비급여의료비']),
		otherCost: otherCost || otherFee,
		beautyCost: num(r['이미용']),
		premiumRoomFee: premiumRoom,
		roomAdjustFee: roomAdjust,
		roomUpgradeFee: roomUpgrade || premiumRoom + roomAdjust,
		contractedMedical: num(r['촉탁의료비']),
		contractedPrescription: num(r['촉탁처방비']),
		otherFee,
		total: num(r['합계']),
		recipientBurdenTotal: num(r['수급자부담금합계']),
		otherDesc: r['기타내용'] != null ? String(r['기타내용']).trim() : '',
	};
}

/**
 * V40100 수급자급여 발생내역 뷰
 * GET /api/v40100?salmm=YYYYMM
 * GET /api/v40100?salmm=YYYYMM&pnum=PNUM
 * GET /api/v40100?salmm=YYYYMM&pnums=1,2,3
 */
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const ancd = sp.get('ancd');
		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const salmm = normalizeSalmm(sp.get('salmm'));
		if (!salmm) {
			return new Response(
				JSON.stringify({ success: false, error: 'salmm(YYYYMM) 파라미터가 필요합니다.' }),
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
		request.input('salmm', sql.Char(6), salmm);

		const pnum = sp.get('pnum');
		const pnumsRaw = sp.get('pnums');

		let result;
		if (pnum != null && String(pnum).trim() !== '') {
			request.input('pnum', sql.VarChar(30), String(pnum).trim());
			result = await request.query(`
        SELECT TOP 1 *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@salmm))
          AND CAST([PNUM] AS VARCHAR(30)) = @pnum
      `);
			const row = result.recordset?.[0] ? mapRow(result.recordset[0]) : null;
			return new Response(JSON.stringify({ success: true, data: row, salmm }), {
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
				return new Response(JSON.stringify({ success: true, data: [], count: 0, salmm }), {
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
          AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@salmm))
          AND CAST([PNUM] AS VARCHAR(30)) IN (${placeholders})
        ORDER BY [수급자] ASC, CAST([PNUM] AS VARCHAR(30)) ASC
      `);
		} else {
			result = await request.query(`
        SELECT *
        FROM ${VIEW}
        WHERE [ANCD] = @sessionAncd
          AND LTRIM(RTRIM([SALMM])) = LTRIM(RTRIM(@salmm))
        ORDER BY [수급자] ASC, CAST([PNUM] AS VARCHAR(30)) ASC
      `);
		}

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
				salmm,
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('V40100 GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
