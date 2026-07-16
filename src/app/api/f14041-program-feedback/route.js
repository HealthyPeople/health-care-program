import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession, parseUserInfoCookieValue } from '../../../config/sessionServer';

const TABLE = '[돌봄시설DB].[dbo].[F14041_PROGRAM_FEEDBACK]';
const PROGRAM_TABLE = '[돌봄시설DB].[dbo].[F14040]';

/** 프로세스당 1회 — 테이블 없으면 자동 생성 (DB 계정에 CREATE TABLE 권한 필요) */
let ensureTablePromise = null;

async function ensureTable(pool) {
	if (!pool) return;
	if (!ensureTablePromise) {
		ensureTablePromise = pool.request().query(`
      IF NOT EXISTS (
        SELECT 1
        FROM [돌봄시설DB].sys.tables t
        INNER JOIN [돌봄시설DB].sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = N'dbo' AND t.name = N'F14041_PROGRAM_FEEDBACK'
      )
      BEGIN
        CREATE TABLE ${TABLE} (
          [OPINION_SEQ]     INT IDENTITY(1,1) NOT NULL,
          [PGSEQ]           INT NOT NULL,
          [YM]              CHAR(6) NOT NULL,
          [OPINION_CONTENT] NVARCHAR(MAX) NULL,
          [APPLY_CONTENT]   NVARCHAR(MAX) NULL,
          [REMARK]          NVARCHAR(500) NULL,
          [REG_ID]          NVARCHAR(50) NULL,
          [REG_DATE]        DATETIME NULL,
          [MOD_ID]          NVARCHAR(50) NULL,
          [MOD_DATE]        DATETIME NULL,
          CONSTRAINT [PK_F14041_PROGRAM_FEEDBACK] PRIMARY KEY CLUSTERED ([OPINION_SEQ]),
          CONSTRAINT [UQ_F14041_PROGRAM_FEEDBACK_PGSEQ_YM] UNIQUE ([PGSEQ], [YM])
        );
      END
    `).catch((err) => {
			ensureTablePromise = null;
			throw err;
		});
	}
	await ensureTablePromise;
	await pool.request().query(`
      IF EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.tables WHERE name = N'F14041_PROGRAM_FEEDBACK'
      )
      BEGIN
        IF EXISTS (
          SELECT 1 FROM [돌봄시설DB].sys.columns c
          INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
          INNER JOIN [돌봄시설DB].sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'F14041_PROGRAM_FEEDBACK'
            AND c.name = N'REG_ID' AND c.max_length > 0 AND c.max_length < 100
        )
          ALTER TABLE ${TABLE} ALTER COLUMN [REG_ID] NVARCHAR(50) NULL;
        IF EXISTS (
          SELECT 1 FROM [돌봄시설DB].sys.columns c
          INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
          INNER JOIN [돌봄시설DB].sys.schemas s ON t.schema_id = s.schema_id
          WHERE s.name = N'dbo' AND t.name = N'F14041_PROGRAM_FEEDBACK'
            AND c.name = N'MOD_ID' AND c.max_length > 0 AND c.max_length < 100
        )
          ALTER TABLE ${TABLE} ALTER COLUMN [MOD_ID] NVARCHAR(50) NULL;
      END
    `);
}

function ymToDigits(v) {
	const s = String(v ?? '').trim();
	if (!s) return '';
	return s.includes('-') ? s.replace(/-/g, '') : s;
}

function resolveUserId(req) {
	const session = parseUserInfoCookieValue(req.cookies.get('user_info')?.value);
	const id = String(session?.uid ?? session?.empno ?? '').trim();
	return id ? id.slice(0, 50) : '';
}

function resolveWriterName(req, body) {
	const fromBody = String(body?.REG_ID ?? body?.regId ?? body?.writerName ?? body?.writer ?? '').trim();
	if (fromBody) return truncStr(fromBody, 50);
	const session = parseUserInfoCookieValue(req.cookies.get('user_info')?.value);
	const nm = String(session?.empnm ?? '').trim();
	if (nm) return truncStr(nm, 50);
	return truncStr(resolveUserId(req), 50);
}

function parseRegDateTime(v) {
	if (v == null || v === '') return null;
	const s = String(v).trim();
	if (!s) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
		const d = new Date(`${s}T00:00:00`);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

function truncStr(v, max) {
	if (v == null) return '';
	const s = String(v);
	return s.length <= max ? s : s.slice(0, max);
}

function mapRow(r) {
	return {
		OPINION_SEQ: r.OPINION_SEQ,
		PGSEQ: r.PGSEQ,
		YM: String(r.YM ?? '').trim(),
		OPINION_CONTENT: r.OPINION_CONTENT ?? '',
		APPLY_CONTENT: r.APPLY_CONTENT ?? '',
		REMARK: r.REMARK ?? '',
		REG_ID: r.REG_ID ?? '',
		REG_DATE: r.REG_DATE ?? null,
		MOD_ID: r.MOD_ID ?? '',
		MOD_DATE: r.MOD_DATE ?? null,
		PGNM: r.PGNM ?? '',
		PG_GU: r.PG_GU ?? '',
	};
}

async function assertProgramInSession(pool, sessionAncd, pgseq) {
	const r = await pool
		.request()
		.input('ANCD', sessionAncd)
		.input('PGSEQ', pgseq)
		.query(`
      SELECT TOP 1 [PGSEQ]
      FROM ${PROGRAM_TABLE}
      WHERE [ANCD] = @ANCD
        AND [PGSEQ] = @PGSEQ
        AND ISNULL([DEL], '') <> 'D'
    `);
	return Boolean(r.recordset?.[0]);
}

export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const ym = searchParams.get('ym');
		const pgseqRaw = searchParams.get('pgseq');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const ymDigits = ymToDigits(ym);
		if (!/^\d{6}$/.test(ymDigits)) {
			return new Response(JSON.stringify({ success: false, error: 'ym 파라미터가 필요합니다 (YYYYMM 또는 YYYY-MM)' }), {
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

		await ensureTable(pool);

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);
		request.input('YM', ymDigits);

		let where = `
      WHERE f.[YM] = @YM
        AND p.[ANCD] = @ANCD
        AND ISNULL(p.[DEL], '') <> 'D'
    `;

		if (pgseqRaw != null && String(pgseqRaw).trim() !== '') {
			const pgseq = parseInt(String(pgseqRaw).trim(), 10);
			if (!Number.isFinite(pgseq)) {
				return new Response(JSON.stringify({ success: false, error: 'pgseq 형식이 올바르지 않습니다' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('PGSEQ', pgseq);
			where += ' AND f.[PGSEQ] = @PGSEQ';
		}

		const query = `
      SELECT
        f.[OPINION_SEQ],
        f.[PGSEQ],
        f.[YM],
        f.[OPINION_CONTENT],
        f.[APPLY_CONTENT],
        f.[REMARK],
        f.[REG_ID],
        f.[REG_DATE],
        f.[MOD_ID],
        f.[MOD_DATE],
        p.[PGNM],
        p.[PG_GU]
      FROM ${TABLE} f
      INNER JOIN ${PROGRAM_TABLE} p
        ON f.[PGSEQ] = p.[PGSEQ]
        AND p.[ANCD] = @ANCD
      ${where}
      ORDER BY f.[MOD_DATE] DESC, f.[REG_DATE] DESC, f.[PGSEQ] ASC
    `;

		const result = await request.query(query);
		const data = (result.recordset || []).map(mapRow);

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F14041_PROGRAM_FEEDBACK 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function POST(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const body = await req.json().catch(() => ({}));
		const pgseq = parseInt(String(body?.PGSEQ ?? body?.pgseq ?? ''), 10);
		const ymDigits = ymToDigits(body?.YM ?? body?.ym);

		if (!Number.isFinite(pgseq)) {
			return new Response(JSON.stringify({ success: false, error: 'PGSEQ는 필수입니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!/^\d{6}$/.test(ymDigits)) {
			return new Response(JSON.stringify({ success: false, error: 'YM 형식이 올바르지 않습니다 (YYYYMM 또는 YYYY-MM)' }), {
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

		await ensureTable(pool);

		const exists = await assertProgramInSession(pool, gate.sessionAncd, pgseq);
		if (!exists) {
			return new Response(JSON.stringify({ success: false, error: '해당 프로그램을 찾을 수 없습니다' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const userId = resolveUserId(req);
		const writerName = resolveWriterName(req, body);
		const regDate = parseRegDateTime(body?.REG_DATE ?? body?.regDate ?? body?.writeDate);
		const opinionContent = body?.OPINION_CONTENT ?? body?.opinionContent ?? body?.opinion ?? '';
		const applyContent = body?.APPLY_CONTENT ?? body?.applyContent ?? body?.reflection ?? '';
		const remark = truncStr(body?.REMARK ?? body?.remark ?? body?.remarks ?? '', 500);

		const request = pool.request();
		request.input('PGSEQ', pgseq);
		request.input('YM', ymDigits);
		request.input('OPINION_CONTENT', opinionContent);
		request.input('APPLY_CONTENT', applyContent);
		request.input('REMARK', remark);
		request.input('USER_ID', userId);
		request.input('WRITER_NAME', writerName);
		request.input('REG_DATE', regDate);

		const query = `
      MERGE ${TABLE} AS T
      USING (SELECT @PGSEQ AS PGSEQ, @YM AS YM) AS S
        ON (T.[PGSEQ] = S.[PGSEQ] AND T.[YM] = S.[YM])
      WHEN MATCHED THEN
        UPDATE SET
          [OPINION_CONTENT] = @OPINION_CONTENT,
          [APPLY_CONTENT] = @APPLY_CONTENT,
          [REMARK] = @REMARK,
          [REG_ID] = @WRITER_NAME,
          [REG_DATE] = @REG_DATE,
          [MOD_ID] = @USER_ID,
          [MOD_DATE] = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (
          [PGSEQ], [YM], [OPINION_CONTENT], [APPLY_CONTENT], [REMARK],
          [REG_ID], [REG_DATE]
        )
        VALUES (
          @PGSEQ, @YM, @OPINION_CONTENT, @APPLY_CONTENT, @REMARK,
          @WRITER_NAME, COALESCE(@REG_DATE, GETDATE())
        )
      OUTPUT INSERTED.[OPINION_SEQ];
    `;

		const result = await request.query(query);
		const opinionSeq = result.recordset?.[0]?.OPINION_SEQ ?? null;

		return new Response(JSON.stringify({ success: true, opinionSeq }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F14041_PROGRAM_FEEDBACK 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancd = searchParams.get('ancd');
		const opinionSeqRaw = searchParams.get('opinionSeq');
		const pgseqRaw = searchParams.get('pgseq');
		const ym = searchParams.get('ym');

		const gate = assertAnCdMatchesSession(req, ancd || null);
		if (!gate.ok) return gate.response;

		const pool = await connPool;
		if (!pool) {
			return new Response(JSON.stringify({ success: false, error: '데이터베이스 연결 실패' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await ensureTable(pool);

		const request = pool.request();
		request.input('ANCD', gate.sessionAncd);

		let query;

		if (opinionSeqRaw != null && String(opinionSeqRaw).trim() !== '') {
			const opinionSeq = parseInt(String(opinionSeqRaw).trim(), 10);
			if (!Number.isFinite(opinionSeq)) {
				return new Response(JSON.stringify({ success: false, error: 'opinionSeq 형식이 올바르지 않습니다' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('OPINION_SEQ', opinionSeq);
			query = `
        DELETE f
        FROM ${TABLE} f
        INNER JOIN ${PROGRAM_TABLE} p
          ON f.[PGSEQ] = p.[PGSEQ]
          AND p.[ANCD] = @ANCD
        WHERE f.[OPINION_SEQ] = @OPINION_SEQ
      `;
		} else {
			const pgseq = parseInt(String(pgseqRaw ?? ''), 10);
			const ymDigits = ymToDigits(ym);
			if (!Number.isFinite(pgseq) || !/^\d{6}$/.test(ymDigits)) {
				return new Response(JSON.stringify({ success: false, error: 'opinionSeq 또는 pgseq+ym 파라미터가 필요합니다' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			request.input('PGSEQ', pgseq);
			request.input('YM', ymDigits);
			query = `
        DELETE f
        FROM ${TABLE} f
        INNER JOIN ${PROGRAM_TABLE} p
          ON f.[PGSEQ] = p.[PGSEQ]
          AND p.[ANCD] = @ANCD
        WHERE f.[PGSEQ] = @PGSEQ
          AND f.[YM] = @YM
      `;
		}

		const result = await request.query(query);
		if (result.rowsAffected[0] === 0) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 데이터가 없습니다' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F14041_PROGRAM_FEEDBACK 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
