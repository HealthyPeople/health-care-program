import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const sql = require('mssql');

const TABLE = '[돌봄시설DB].[dbo].[F51012]';

/** MERGE에 포함할 컬럼(키 ANCD,PNUM,RQDT 및 INDT 제외) */
const DATA_COLUMNS = [
	'RQEMP',
	'HEIGHT',
	'WEIGHT',
	'C01',
	'C02',
	'C03',
	'C04',
	'C05',
	'C06',
	'C07',
	'C08',
	'C09',
	'C10',
	'C11',
	'C12',
	'C90',
	'D01_01',
	'D01_02',
	'D01_03',
	'D01_04',
	'D01_05',
	'D01_06',
	'D01_07',
	'D01_08',
	'D02_01',
	'D02_02',
	'D02_03',
	'D02_04',
	'D02_05',
	'D02_06',
	'D03_01',
	'D03_02',
	'D03_03',
	'D03_04',
	'D03_05',
	'D03_06',
	'D04_01',
	'D04_02',
	'D04_03',
	'D04_04',
	'D04_05',
	'D05_01',
	'D05_02',
	'D05_03',
	'D05_04',
	'D05_05',
	'D05_06',
	'D06_01',
	'D06_02',
	'D06_03',
	'D06_04',
	'D07_01',
	'D07_02',
	'D07_03',
	'D07_04',
	'D08_01',
	'D08_02',
	'D08_03',
	'D09_01',
	'D09_02',
	'D09_03',
	'D09_04',
	'D10_01',
	'D10_02',
	'D10_02_01',
	'D20',
	'D21',
	'D90',
	'E01',
	'E02',
	'E03',
	'E04',
	'E05_01',
	'E05_02',
	'E06_01',
	'E06_02',
	'E07_01',
	'E07_02',
	'E08_01',
	'E08_02',
	'E09_01',
	'E09_02',
	'E10_01',
	'E10_02',
	'E90',
	'F01',
	'F02',
	'F03',
	'F04',
	'F05',
	'F06',
	'F07',
	'F08',
	'F09',
	'F10',
	'F11',
	'F90',
	'G01',
	'G02',
	'G03',
	'G04',
	'G05',
	'G06',
	'G07',
	'G08',
	'G09',
	'G10',
	'G11',
	'G12',
	'G13',
	'G14',
	'G15',
	'G90',
	'H01',
	'H02',
	'H03',
	'H90',
	'I01',
	'I02',
	'I03',
	'I04',
	'I05',
	'I90',
	'J01',
	'J01_01',
	'J01_02',
	'J02',
	'J02_01',
	'J02_02',
	'J02_03',
	'J02_04',
	'J03',
	'J90',
	'K01',
	'K01_01',
	'K02',
	'K02_01',
	'K03_01',
	'K03_02',
	'K03_03',
	'K03_04',
	'K90',
	'L01',
	'L01_01',
	'L01_02',
	'L01_03',
	'L02',
];

function normalizeYmd(v) {
	if (v == null || v === '') return null;
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
	return null;
}

function bindDataInputs(request, row) {
	for (const col of DATA_COLUMNS) {
		const v = row[col];
		if (col === 'RQEMP' || col === 'J01_02' || col === 'J02_01') {
			if (v == null || v === '') {
				request.input(col, sql.Int, null);
			} else {
				const n = parseInt(String(v), 10);
				request.input(col, sql.Int, Number.isFinite(n) ? n : null);
			}
			continue;
		}
		if (col === 'HEIGHT' || col === 'WEIGHT') {
			if (v == null || v === '') {
				request.input(col, sql.Decimal(10, 2), null);
			} else {
				const n = Number(String(v).replace(',', '.'));
				request.input(col, sql.Decimal(10, 2), Number.isFinite(n) ? n : null);
			}
			continue;
		}
		if (
			[
				'C90',
				'D20',
				'D21',
				'D90',
				'E90',
				'F90',
				'G90',
				'H90',
				'I90',
				'J90',
				'K90',
				'L01',
				'L02',
				'J02_03',
				'K01_01',
				'K02',
				'K02_01',
				'K03_04',
				'D10_02_01',
			].includes(col)
		) {
			request.input(col, sql.NVarChar(sql.MAX), v == null || v === '' ? null : String(v));
			continue;
		}
		// 신체 활동 C01..C12 : 1=X, 2=△, 3=○
		if (/^C\d{2}$/.test(col)) {
			const ch = v == null || v === '' ? '1' : String(v).trim().slice(0, 1);
			request.input(col, sql.Char(1), ch);
			continue;
		}
		// 의사소통 H01~H03 : 코드 1,2,3
		if (['H01', 'H02', 'H03'].includes(col)) {
			const ch = v == null || v === '' ? '1' : String(v).trim().slice(0, 1);
			request.input(col, sql.Char(1), ch);
			continue;
		}
		// 영양·가족·자원이용 일부 : 코드 1~9
		if (['I01', 'I02', 'I03', 'I04', 'I05', 'J01', 'J01_01', 'J02', 'J02_02', 'J02_04', 'J03', 'K01'].includes(col)) {
			const ch = v == null || v === '' ? '1' : String(v).trim().slice(0, 1);
			request.input(col, sql.Char(1), ch);
			continue;
		}
		// 그 외 질병·재활·간호·인지·지역사회 : Y/N
		const yn = v == null || v === '' ? 'N' : String(v).trim().toUpperCase().slice(0, 1);
		request.input(col, sql.Char(1), yn === 'Y' ? 'Y' : 'N');
	}
}

// GET ?pnum= — RQDT 목록
// GET ?pnum=&rqdt=yyyy-mm-dd — 단건
export async function GET(req) {
	try {
		const sp = req.nextUrl.searchParams;
		const pnum = sp.get('pnum');
		const rqdt = sp.get('rqdt');
		const ancd = sp.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		if (!pnum || String(pnum).trim() === '') {
			return new Response(JSON.stringify({ success: false, error: 'pnum이 필요합니다.' }), {
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

		if (rqdt) {
			const ymd = normalizeYmd(rqdt);
			if (!ymd) {
				return new Response(JSON.stringify({ success: false, error: 'rqdt(yyyy-mm-dd) 형식이 올바르지 않습니다.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('rqdt', sql.Date, new Date(`${ymd}T00:00:00`));
			const result = await request.query(`
        SELECT TOP 1 *
        FROM ${TABLE}
        WHERE [ANCD] = @sessionAncd
          AND CAST([PNUM] AS VARCHAR(30)) = @pnum
          AND CAST([RQDT] AS DATE) = CAST(@rqdt AS DATE)
      `);
			const row = result.recordset?.[0] || null;
			return new Response(JSON.stringify({ success: true, data: row }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const result = await request.query(`
      SELECT DISTINCT CONVERT(varchar(10), CAST([RQDT] AS DATE), 23) AS rqdt
      FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND CAST([PNUM] AS VARCHAR(30)) = @pnum
      ORDER BY rqdt DESC
    `);
		const dates = (result.recordset || []).map((r) => r.rqdt || r.RQDT).filter(Boolean);
		return new Response(JSON.stringify({ success: true, data: dates, count: dates.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F51012 GET 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function POST(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const body = await req.json();
		const row = body?.row;
		if (!row || typeof row !== 'object') {
			return new Response(JSON.stringify({ success: false, error: 'row 객체가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const ymd = normalizeYmd(row.RQDT);
		if (!ymd) {
			return new Response(JSON.stringify({ success: false, error: 'RQDT(작성일자)가 필요합니다.' }), {
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
		request.input('ANCD', sql.VarChar(30), String(gate.sessionAncd));
		request.input('PNUM', sql.VarChar(30), String(row.PNUM ?? '').trim());
		request.input('RQDT', sql.Date, new Date(`${ymd}T00:00:00`));

		const merged = { ...row, ANCD: gate.sessionAncd, RQDT: ymd };
		bindDataInputs(request, merged);

		const updateSet = DATA_COLUMNS.map((c) => `[${c}] = @${c}`).join(', ');
		const insertCols = ['[ANCD]', '[PNUM]', '[RQDT]', '[INDT]', ...DATA_COLUMNS.map((c) => `[${c}]`)];
		const insertParams = ['@ANCD', '@PNUM', '@RQDT', 'GETDATE()', ...DATA_COLUMNS.map((c) => `@${c}`)];

		const mergeSql = `
      MERGE ${TABLE} AS t
      USING (SELECT @ANCD AS ANCD, @PNUM AS PNUM, @RQDT AS RQDT) AS s
      ON CAST(t.[ANCD] AS VARCHAR(30)) = CAST(s.ANCD AS VARCHAR(30))
         AND CAST(t.[PNUM] AS VARCHAR(30)) = CAST(s.PNUM AS VARCHAR(30))
         AND CAST(t.[RQDT] AS DATE) = CAST(s.RQDT AS DATE)
      WHEN MATCHED THEN
        UPDATE SET ${updateSet}
      WHEN NOT MATCHED THEN
        INSERT (${insertCols.join(', ')})
        VALUES (${insertParams.join(', ')});
    `;

		await request.query(mergeSql);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F51012 POST 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function DELETE(req) {
	try {
		const gate = assertAnCdMatchesSession(req, null);
		if (!gate.ok) return gate.response;

		const sp = req.nextUrl.searchParams;
		const pnum = sp.get('pnum');
		const rqdt = sp.get('rqdt');
		const ymd = normalizeYmd(rqdt);

		if (!pnum || !ymd) {
			return new Response(JSON.stringify({ success: false, error: 'pnum, rqdt가 필요합니다.' }), {
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
		request.input('rqdt', sql.Date, new Date(`${ymd}T00:00:00`));

		await request.query(`
      DELETE FROM ${TABLE}
      WHERE [ANCD] = @sessionAncd
        AND CAST([PNUM] AS VARCHAR(30)) = @pnum
        AND CAST([RQDT] AS DATE) = CAST(@rqdt AS DATE)
    `);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F51012 DELETE 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
