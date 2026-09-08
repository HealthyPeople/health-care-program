/**
 * @file API /api/v10010b — 수급자 조회 뷰 V10010B
 *
 * @description
 * 수급자 조회 뷰 V10010B Next.js Route Handler. 세션 ANCD 게이트·MSSQL 직접 접근 패턴을 따릅니다.
 *
 * @module app/api/v10010b/route
 */
import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

import { jsonOk, jsonError } from '../../../utils/apiResponse';
const sql = require('mssql');

const { normalizeYmdEmptyRaw: normalizeYmd } = require('../../../utils/normalizeYmd');
const VIEW = '[돌봄시설DB].[dbo].[V10010B]';
const F10110 = '[돌봄시설DB].[dbo].[F10110]';

function str(v) {
	if (v == null) return '';
	return String(v).trim();
}

/** 화면 계약목록과 동일: F10110.SVSDT ~ SVEDT */
function periodFromDates(start, end) {
	const s = normalizeYmd(start);
	const e = normalizeYmd(end);
	if (!s && !e) return '';
	return `${s || '-'} ~ ${e || '-'}`;
}

const SELECT_PRINT = `
  SELECT
    v.[순번],
    v.[ANCD],
    v.[PNUM],
    v.[성명],
    v.[생일],
    v.[계약일자],
    v.[인정번호],
    v.[인정등급],
    v.[인정유효기간],
    v.[급여종류],
    v.[계약자성명],
    v.[수급자와관계],
    v.[자택전화번호],
    v.[헨드폰번호],
    v.[계약기간],
    v.[서비스구분1],
    f.[SVSDT],
    f.[SVEDT]
  FROM ${VIEW} v
  LEFT JOIN ${F10110} f
    ON v.[ANCD] = f.[ANCD]
   AND CAST(v.[PNUM] AS VARCHAR(30)) = CAST(f.[PNUM] AS VARCHAR(30))
   AND CONVERT(date, v.[계약일자]) = CONVERT(date, f.[CDT])
`;

function mapRow(r) {
	const fromContract = periodFromDates(r.SVSDT, r.SVEDT);
	const fromView = str(r['계약기간']);
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
		contractPeriod: fromContract || fromView,
		serviceType: str(r['서비스구분1'] ?? r['서비스구분']),
	};
}

function rowKey(row) {
	return `${String(row.ANCD ?? '')}|${String(row.PNUM ?? '').trim()}|${normalizeYmd(row.contractDate) || ''}`;
}

function dedupePrintRows(rows) {
	const map = new Map();
	for (const row of rows) {
		const key = rowKey(row);
		const prev = map.get(key);
		if (!prev || (!prev.contractPeriod && row.contractPeriod)) {
			map.set(key, row);
		}
	}
	return Array.from(map.values());
}

/** 뷰에 빠진 계약 건은 F10110(화면 계약목록) 기준으로 보강 */
async function mergeMissingContracts(pool, sessionAncd, rows) {
	const deduped = dedupePrintRows(rows);
	const pnums = [...new Set(deduped.map((r) => String(r.PNUM ?? '').trim()).filter(Boolean))];
	if (pnums.length === 0) return deduped;

	const request = pool.request();
	request.input('sessionAncd', sessionAncd);
	const placeholders = pnums
		.map((p, i) => {
			request.input(`mp${i}`, sql.VarChar(30), p);
			return `@mp${i}`;
		})
		.join(',');

	const result = await request.query(`
    SELECT [ANCD], [PNUM], [CDT], [SVSDT], [SVEDT]
    FROM ${F10110}
    WHERE [ANCD] = @sessionAncd
      AND CAST([PNUM] AS VARCHAR(30)) IN (${placeholders})
    ORDER BY [PNUM], [CDT] DESC
  `);

	const existing = new Set(deduped.map(rowKey));
	const byPnum = new Map();
	for (const row of deduped) {
		const p = String(row.PNUM ?? '').trim();
		if (!byPnum.has(p)) byPnum.set(p, row);
	}

	const extra = [];
	for (const c of result.recordset || []) {
		const pnum = String(c.PNUM ?? '').trim();
		const cdt = normalizeYmd(c.CDT);
		const key = `${String(c.ANCD ?? '')}|${pnum}|${cdt || ''}`;
		if (existing.has(key)) continue;
		const tmpl = byPnum.get(pnum) || {};
		extra.push({
			...tmpl,
			ANCD: c.ANCD,
			PNUM: pnum,
			seq: null,
			contractDate: cdt,
			contractPeriod: periodFromDates(c.SVSDT, c.SVEDT),
		});
		existing.add(key);
	}

	return [...deduped, ...extra].sort((a, b) => {
		const nameCmp = String(a.name || '').localeCompare(String(b.name || ''), 'ko');
		if (nameCmp !== 0) return nameCmp;
		return String(b.contractDate || '').localeCompare(String(a.contractDate || ''));
	});
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
			return jsonError({ success: false, error: '데이터베이스 연결 실패' });
		}

		const request = pool.request();
		request.input('sessionAncd', gate.sessionAncd);

		const pnum = sp.get('pnum');
		const pnumsRaw = sp.get('pnums');

		let result;
		if (pnum != null && String(pnum).trim() !== '') {
			request.input('pnum', sql.VarChar(30), String(pnum).trim());
			result = await request.query(`
        ${SELECT_PRINT}
        WHERE v.[ANCD] = @sessionAncd
          AND CAST(v.[PNUM] AS VARCHAR(30)) = @pnum
        ORDER BY v.[성명] ASC, v.[순번] ASC, v.[계약일자] DESC
      `);
		} else if (pnumsRaw != null && String(pnumsRaw).trim() !== '') {
			const list = String(pnumsRaw)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (list.length === 0) {
				return jsonOk({ success: true, data: [], count: 0 });
			}
			const placeholders = list
				.map((_, i) => {
					request.input(`p${i}`, sql.VarChar(30), list[i]);
					return `@p${i}`;
				})
				.join(',');
			result = await request.query(`
        ${SELECT_PRINT}
        WHERE v.[ANCD] = @sessionAncd
          AND CAST(v.[PNUM] AS VARCHAR(30)) IN (${placeholders})
        ORDER BY v.[성명] ASC, v.[순번] ASC, v.[계약일자] DESC
      `);
		} else {
			result = await request.query(`
        ${SELECT_PRINT}
        WHERE v.[ANCD] = @sessionAncd
        ORDER BY v.[성명] ASC, v.[순번] ASC, v.[계약일자] DESC
      `);
		}

		let data = (result.recordset || []).map(mapRow);
		data = await mergeMissingContracts(pool, gate.sessionAncd, data);
		return jsonOk({
				success: true,
				data,
				count: data.length,
			});
	} catch (err) {
		console.error('V10010B GET 오류:', err);
		return jsonError({ success: false, error: err.message, details: String(err) });
	}
}
