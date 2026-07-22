import { connPool } from '../../../config/server';
import { getSessionAncd, parseUserInfoCookieValue } from '../../../config/sessionServer';

const TABLE = '[돌봄시설DB].[dbo].[ANNUAL_SCHEDULE]';

/** 프로세스당 1회 — 테이블 없으면 자동 생성 + 종료일 컬럼 마이그레이션 */
let ensureTablePromise = null;

async function ensureTable(pool) {
	if (!pool) return;
	if (!ensureTablePromise) {
		ensureTablePromise = pool
			.request()
			.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM [돌봄시설DB].sys.tables t
        INNER JOIN [돌봄시설DB].sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE'
      )
      BEGIN
        CREATE TABLE ${TABLE} (
          [AS_SEQ]        INT IDENTITY(1,1) NOT NULL,
          [ANCD]          INT NOT NULL,
          [SCH_DATE]      DATE NOT NULL,
          [SCH_END_DATE]  DATE NOT NULL,
          [TITLE]         NVARCHAR(200) NOT NULL,
          [CONTENT]       NVARCHAR(MAX) NULL,
          [SCH_TYPE]      NVARCHAR(50) NULL,
          [REG_ID]        NVARCHAR(50) NULL,
          [REG_DATE]      DATETIME NULL,
          [MOD_ID]        NVARCHAR(50) NULL,
          [MOD_DATE]      DATETIME NULL,
          CONSTRAINT [PK_ANNUAL_SCHEDULE] PRIMARY KEY CLUSTERED ([AS_SEQ])
        );
        CREATE NONCLUSTERED INDEX [IX_ANNUAL_SCHEDULE_ANCD_SCH_DATE]
          ON ${TABLE} ([ANCD], [SCH_DATE], [SCH_END_DATE]);
      END

      -- SCH_START_DATE만 있는 경우 → SCH_DATE로 복구
      IF EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.columns c
        INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
        WHERE t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_START_DATE'
      )
      AND NOT EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.columns c
        INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
        WHERE t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_DATE'
      )
      BEGIN
        EXEC sp_rename N'[돌봄시설DB].[dbo].[ANNUAL_SCHEDULE].[SCH_START_DATE]', N'SCH_DATE', N'COLUMN';
      END

      -- SCH_END_DATE 없으면 추가
      IF EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.tables WHERE name = N'ANNUAL_SCHEDULE'
      )
      AND NOT EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.columns c
        INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
        WHERE t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_END_DATE'
      )
      BEGIN
        ALTER TABLE ${TABLE} ADD [SCH_END_DATE] DATE NULL;
      END

      -- NULL 종료일 → 시작일로 채운 뒤 NOT NULL
      IF EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.columns c
        INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
        WHERE t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_END_DATE'
      )
      AND EXISTS (
        SELECT 1 FROM [돌봄시설DB].sys.columns c
        INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
        WHERE t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_DATE'
      )
      BEGIN
        UPDATE ${TABLE}
        SET [SCH_END_DATE] = [SCH_DATE]
        WHERE [SCH_END_DATE] IS NULL;

        IF EXISTS (
          SELECT 1 FROM [돌봄시설DB].sys.columns c
          INNER JOIN [돌봄시설DB].sys.tables t ON c.object_id = t.object_id
          WHERE t.name = N'ANNUAL_SCHEDULE'
            AND c.name = N'SCH_END_DATE' AND c.is_nullable = 1
        )
        BEGIN
          ALTER TABLE ${TABLE} ALTER COLUMN [SCH_END_DATE] DATE NOT NULL;
        END
      END
    `)
			.catch((err) => {
				ensureTablePromise = null;
				throw err;
			});
	}
	await ensureTablePromise;
}

function truncStr(v, max) {
	if (v == null) return '';
	const s = String(v);
	return s.length <= max ? s : s.slice(0, max);
}

/** 등록자/수정자: ID가 아니라 사원명(EMPNM) 저장 */
async function resolveUserName(req, pool, ancd) {
	const session = parseUserInfoCookieValue(req.cookies.get('user_info')?.value);
	const fromCookie = String(session?.empnm ?? session?.EMPNM ?? '').trim();
	if (fromCookie) return fromCookie.slice(0, 50);

	const uid = String(session?.uid ?? '').trim();
	if (pool && ancd != null && uid) {
		try {
			const r = await pool
				.request()
				.input('ANCD', ancd)
				.input('UID', uid)
				.query(`
          SELECT TOP 1 [EMPNM]
          FROM [돌봄시설DB].[dbo].[F00120]
          WHERE [ANCD] = @ANCD AND [UID] = @UID
        `);
			const name = String(r.recordset?.[0]?.EMPNM ?? '').trim();
			if (name) return name.slice(0, 50);
		} catch {
			/* ignore */
		}
	}

	// 이름 조회 실패 시에만 최소 식별값
	const fallback = String(session?.uid ?? session?.empno ?? '').trim();
	return fallback ? fallback.slice(0, 50) : '';
}

function toDateStr(v) {
	if (v == null || v === '') return '';
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return '';
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function mapRow(r) {
	const start = toDateStr(r.SCH_DATE ?? r.SCH_START_DATE);
	const end = toDateStr(r.SCH_END_DATE) || start;
	return {
		AS_SEQ: r.AS_SEQ,
		ANCD: r.ANCD,
		SCH_DATE: start,
		SCH_END_DATE: end,
		TITLE: String(r.TITLE ?? '').trim(),
		CONTENT: r.CONTENT ?? '',
		SCH_TYPE: String(r.SCH_TYPE ?? '').trim(),
		REG_ID: r.REG_ID ?? '',
		REG_DATE: r.REG_DATE ?? null,
		MOD_ID: r.MOD_ID ?? '',
		MOD_DATE: r.MOD_DATE ?? null,
	};
}

/** 기간 겹침: 일정시작 <= 조회끝 AND 일정종료 >= 조회시작 */
function overlapWhere() {
	return ` AND [SCH_DATE] <= @endDate
          AND COALESCE([SCH_END_DATE], [SCH_DATE]) >= @startDate`;
}

export async function GET(req) {
	try {
		const sessionAncd = getSessionAncd(req);
		if (sessionAncd == null) {
			return new Response(JSON.stringify({ success: false, error: '로그인이 필요합니다.' }), {
				status: 401,
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

		const searchParams = req.nextUrl.searchParams;
		const year = searchParams.get('year');
		const month = searchParams.get('month');
		const startDate = toDateStr(searchParams.get('startDate') || '');
		const endDate = toDateStr(searchParams.get('endDate') || '');

		const request = pool.request();
		request.input('ANCD', sessionAncd);

		let where = 'WHERE [ANCD] = @ANCD';

		if (startDate && endDate) {
			request.input('startDate', startDate);
			request.input('endDate', endDate);
			where += overlapWhere();
		} else if (year && /^\d{4}$/.test(String(year).trim())) {
			const y = String(year).trim();
			if (month && /^\d{1,2}$/.test(String(month).trim())) {
				const m = String(month).trim().padStart(2, '0');
				const start = `${y}-${m}-01`;
				const lastDay = new Date(Number(y), Number(m), 0).getDate();
				const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
				request.input('startDate', start);
				request.input('endDate', end);
				where += overlapWhere();
			} else {
				request.input('startDate', `${y}-01-01`);
				request.input('endDate', `${y}-12-31`);
				where += overlapWhere();
			}
		} else {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'year 또는 startDate+endDate 파라미터가 필요합니다',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await request.query(`
      SELECT
        [AS_SEQ], [ANCD],
        CONVERT(varchar(10), [SCH_DATE], 23) AS [SCH_DATE],
        CONVERT(varchar(10), [SCH_END_DATE], 23) AS [SCH_END_DATE],
        [TITLE], [CONTENT], [SCH_TYPE],
        [REG_ID], [REG_DATE], [MOD_ID], [MOD_DATE]
      FROM ${TABLE}
      ${where}
      ORDER BY [SCH_DATE] ASC, [AS_SEQ] ASC
    `);

		const data = (result.recordset || []).map(mapRow);
		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('ANNUAL_SCHEDULE 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function POST(req) {
	try {
		const sessionAncd = getSessionAncd(req);
		if (sessionAncd == null) {
			return new Response(JSON.stringify({ success: false, error: '로그인이 필요합니다.' }), {
				status: 401,
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

		const body = await req.json().catch(() => ({}));
		const asSeqRaw = body?.AS_SEQ ?? body?.asSeq ?? body?.id;
		const asSeq =
			asSeqRaw != null && String(asSeqRaw).trim() !== ''
				? parseInt(String(asSeqRaw).trim(), 10)
				: null;
		let schDate = toDateStr(
			body?.SCH_DATE ??
				body?.schDate ??
				body?.SCH_START_DATE ??
				body?.schStartDate ??
				body?.date ??
				body?.startDate ??
				''
		);
		let schEndDate = toDateStr(
			body?.SCH_END_DATE ?? body?.schEndDate ?? body?.endDate ?? body?.dateEnd ?? ''
		);
		const title = truncStr(body?.TITLE ?? body?.title ?? '', 200);
		const content = body?.CONTENT ?? body?.content ?? '';
		const schType = truncStr(body?.SCH_TYPE ?? body?.schType ?? body?.type ?? '', 50);
		const userName = await resolveUserName(req, pool, sessionAncd);

		if (!schDate) {
			return new Response(JSON.stringify({ success: false, error: '시작일(SCH_DATE)은 필수입니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!schEndDate) schEndDate = schDate;
		if (schEndDate < schDate) {
			return new Response(
				JSON.stringify({ success: false, error: '종료일은 시작일보다 빠를 수 없습니다' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}
		if (!title.trim()) {
			return new Response(JSON.stringify({ success: false, error: '제목(TITLE)은 필수입니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const request = pool.request();
		request.input('ANCD', sessionAncd);
		request.input('SCH_DATE', schDate);
		request.input('SCH_END_DATE', schEndDate);
		request.input('TITLE', title);
		request.input('CONTENT', content);
		request.input('SCH_TYPE', schType || null);
		request.input('USER_ID', userName);

		let asSeqOut = null;

		if (Number.isFinite(asSeq)) {
			request.input('AS_SEQ', asSeq);
			const upd = await request.query(`
        UPDATE ${TABLE}
        SET
          [SCH_DATE] = @SCH_DATE,
          [SCH_END_DATE] = @SCH_END_DATE,
          [TITLE] = @TITLE,
          [CONTENT] = @CONTENT,
          [SCH_TYPE] = @SCH_TYPE,
          [MOD_ID] = @USER_ID,
          [MOD_DATE] = GETDATE()
        WHERE [ANCD] = @ANCD AND [AS_SEQ] = @AS_SEQ;

        SELECT @AS_SEQ AS [AS_SEQ];
      `);
			if (!upd.rowsAffected?.[0]) {
				return new Response(JSON.stringify({ success: false, error: '수정할 일정을 찾을 수 없습니다' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			asSeqOut = asSeq;
		} else {
			const ins = await request.query(`
        INSERT INTO ${TABLE} (
          [ANCD], [SCH_DATE], [SCH_END_DATE], [TITLE], [CONTENT], [SCH_TYPE], [REG_ID], [REG_DATE]
        )
        OUTPUT INSERTED.[AS_SEQ]
        VALUES (
          @ANCD, @SCH_DATE, @SCH_END_DATE, @TITLE, @CONTENT, @SCH_TYPE, @USER_ID, GETDATE()
        );
      `);
			asSeqOut = ins.recordset?.[0]?.AS_SEQ ?? null;
		}

		return new Response(JSON.stringify({ success: true, asSeq: asSeqOut }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('ANNUAL_SCHEDULE 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

export async function DELETE(req) {
	try {
		const sessionAncd = getSessionAncd(req);
		if (sessionAncd == null) {
			return new Response(JSON.stringify({ success: false, error: '로그인이 필요합니다.' }), {
				status: 401,
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

		const searchParams = req.nextUrl.searchParams;
		const asSeqRaw = searchParams.get('asSeq') || searchParams.get('AS_SEQ') || searchParams.get('id');
		const asSeq = parseInt(String(asSeqRaw ?? ''), 10);

		if (!Number.isFinite(asSeq)) {
			return new Response(JSON.stringify({ success: false, error: 'asSeq 파라미터가 필요합니다' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const result = await pool
			.request()
			.input('ANCD', sessionAncd)
			.input('AS_SEQ', asSeq)
			.query(`
        DELETE FROM ${TABLE}
        WHERE [ANCD] = @ANCD AND [AS_SEQ] = @AS_SEQ
      `);

		if (result.rowsAffected[0] === 0) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 일정이 없습니다' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('ANNUAL_SCHEDULE 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
