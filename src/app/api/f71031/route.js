import { connPool } from '../../../config/server';
import { assertAnCdMatchesSession } from '../../../config/sessionServer';

const TABLE_NAME = '[돌봄시설DB].[dbo].[F71031]';

function normalizeYmd(v) {
	if (v == null || v === '') return '';
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	const s = String(v).trim();
	if (!s) return '';
	if (s.includes('T')) return s.split('T')[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function trunc(v, max) {
	if (v == null) return null;
	const s = String(v).trim();
	if (!s) return null;
	return s.length <= max ? s : s.slice(0, max);
}

function flag01(v) {
	if (v === true || v === 1 || v === '1' || String(v).toUpperCase() === 'Y') return '1';
	return '0';
}

function isFlagOn(v) {
	const s = String(v ?? '').trim().toUpperCase();
	return s === '1' || s === 'Y';
}

function normalizeTime(v) {
	const s = String(v ?? '').trim();
	if (!s) return null;
	// HH:MM or HHMM
	if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
	if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
	return trunc(s, 5);
}

function mapRow(row) {
	return {
		ANCD: row.ANCD,
		G_SEQ: row.G_SEQ != null ? Number(row.G_SEQ) : null,
		G_SDT: normalizeYmd(row.G_SDT),
		G_STM: row.G_STM != null ? String(row.G_STM).trim().slice(0, 5) : '',
		G_ETM: row.G_ETM != null ? String(row.G_ETM).trim().slice(0, 5) : '',
		G_CNT: row.G_CNT != null && row.G_CNT !== '' ? Number(row.G_CNT) : null,
		G_TAKE_NM: row.G_TAKE_NM != null ? String(row.G_TAKE_NM).trim() : '',
		G_SRV01: isFlagOn(row.G_SRV01) ? '1' : '0',
		G_SRV02: isFlagOn(row.G_SRV02) ? '1' : '0',
		G_SRV03: isFlagOn(row.G_SRV03) ? '1' : '0',
		G_SRV04: isFlagOn(row.G_SRV04) ? '1' : '0',
		G_SRV09: isFlagOn(row.G_SRV09) ? '1' : '0',
		G_SRV09_NM: row.G_SRV09_NM != null ? String(row.G_SRV09_NM).trim() : '',
		ETC: row.ETC != null ? String(row.ETC).trim() : '',
		INDT: normalizeYmd(row.INDT),
	};
}

/**
 * GET /api/f71031?ancd=&gSeq=&startDate=&endDate=
 */
export async function GET(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const gSeqRaw = searchParams.get('gSeq') || searchParams.get('G_SEQ');
		const startDate = (searchParams.get('startDate') || searchParams.get('from') || '').trim();
		const endDate = (searchParams.get('endDate') || searchParams.get('to') || '').trim();

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		const gSeq = gSeqRaw != null && gSeqRaw !== '' ? Number(gSeqRaw) : null;
		if (gSeq == null || !Number.isFinite(gSeq)) {
			return new Response(JSON.stringify({ success: false, error: 'gSeq가 필요합니다.' }), {
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

		const ancd = gate.sessionAncd;
		const request = pool.request();
		request.input('ANCD', ancd);
		request.input('G_SEQ', gSeq);

		let where = 'WHERE [ANCD] = @ANCD AND [G_SEQ] = @G_SEQ';
		if (startDate) {
			request.input('START', startDate.slice(0, 10));
			where += ' AND CONVERT(date, [G_SDT]) >= CONVERT(date, @START)';
		}
		if (endDate) {
			request.input('END', endDate.slice(0, 10));
			where += ' AND CONVERT(date, [G_SDT]) <= CONVERT(date, @END)';
		}

		const result = await request.query(`
			SELECT
				[ANCD], [G_SEQ], [G_SDT], [G_STM], [G_ETM], [G_CNT], [G_TAKE_NM],
				[G_SRV01], [G_SRV02], [G_SRV03], [G_SRV04], [G_SRV09], [G_SRV09_NM],
				[ETC], [INDT]
			FROM ${TABLE_NAME}
			${where}
			ORDER BY [G_SDT] DESC
		`);

		const data = (result.recordset || []).map(mapRow);

		return new Response(JSON.stringify({ success: true, data, count: data.length }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71031 조회 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * POST /api/f71031 — 실적 저장 (ANCD+G_SEQ+G_SDT 기준 MERGE)
 * G_SEQ = F71030 단체 일련번호
 */
export async function POST(req) {
	try {
		const body = await req.json().catch(() => ({}));
		const gate = assertAnCdMatchesSession(req, body?.ANCD ?? body?.ancd ?? null);
		if (!gate.ok) return gate.response;

		const gSeq = Number(body?.G_SEQ ?? body?.gSeq);
		const gSdt = normalizeYmd(body?.G_SDT ?? body?.gSdt ?? body?.date);
		if (!Number.isFinite(gSeq)) {
			return new Response(JSON.stringify({ success: false, error: 'G_SEQ(단체)가 필요합니다.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!gSdt) {
			return new Response(JSON.stringify({ success: false, error: '봉사일자를 입력해주세요.' }), {
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

		const ancd = gate.sessionAncd;
		const gStm = normalizeTime(body?.G_STM ?? body?.gStm ?? body?.startTime);
		const gEtm = normalizeTime(body?.G_ETM ?? body?.gEtm ?? body?.endTime);
		const gCntRaw = body?.G_CNT ?? body?.gCnt ?? body?.volunteers;
		const gCnt =
			gCntRaw == null || gCntRaw === ''
				? null
				: Number.isFinite(Number(gCntRaw))
					? Number(gCntRaw)
					: null;
		const gTakeNm = trunc(body?.G_TAKE_NM ?? body?.gTakeNm ?? body?.roster, 500);
		const gSrv01 = flag01(body?.G_SRV01 ?? body?.bath ?? body?.list);
		const gSrv02 = flag01(body?.G_SRV02 ?? body?.beauty);
		const gSrv03 = flag01(body?.G_SRV03 ?? body?.programAssist);
		const gSrv04 = flag01(body?.G_SRV04 ?? body?.programOps);
		const gSrv09 = flag01(body?.G_SRV09 ?? body?.other);
		const gSrv09Nm = trunc(body?.G_SRV09_NM ?? body?.gSrv09Nm ?? body?.otherText, 200);
		const etc = trunc(body?.ETC ?? body?.etc, 100);

		// 단체 존재 확인
		const groupCheck = await pool
			.request()
			.input('ANCD', ancd)
			.input('G_SEQ', gSeq)
			.query(`
				SELECT TOP 1 [G_SEQ]
				FROM [돌봄시설DB].[dbo].[F71030]
				WHERE [ANCD] = @ANCD AND [G_SEQ] = @G_SEQ
			`);
		if (!groupCheck.recordset?.[0]) {
			return new Response(JSON.stringify({ success: false, error: '선택한 단체 정보를 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 동일 단체·일자 기존 건 조회 (복합키에 G_SDT가 없을 수 있어 날짜로 매칭)
		const exist = await pool
			.request()
			.input('ANCD', ancd)
			.input('G_SEQ', gSeq)
			.input('G_SDT', gSdt)
			.query(`
				SELECT TOP 1 [G_SEQ], [G_SDT]
				FROM ${TABLE_NAME}
				WHERE [ANCD] = @ANCD
					AND [G_SEQ] = @G_SEQ
					AND CONVERT(date, [G_SDT]) = CONVERT(date, @G_SDT)
			`);

		if (exist.recordset?.[0]) {
			await pool
				.request()
				.input('ANCD', ancd)
				.input('G_SEQ', gSeq)
				.input('G_SDT', gSdt)
				.input('G_STM', gStm)
				.input('G_ETM', gEtm)
				.input('G_CNT', gCnt)
				.input('G_TAKE_NM', gTakeNm)
				.input('G_SRV01', gSrv01)
				.input('G_SRV02', gSrv02)
				.input('G_SRV03', gSrv03)
				.input('G_SRV04', gSrv04)
				.input('G_SRV09', gSrv09)
				.input('G_SRV09_NM', gSrv09 === '1' ? gSrv09Nm : null)
				.input('ETC', etc)
				.query(`
					UPDATE ${TABLE_NAME}
					SET [G_STM] = @G_STM,
						[G_ETM] = @G_ETM,
						[G_CNT] = @G_CNT,
						[G_TAKE_NM] = @G_TAKE_NM,
						[G_SRV01] = @G_SRV01,
						[G_SRV02] = @G_SRV02,
						[G_SRV03] = @G_SRV03,
						[G_SRV04] = @G_SRV04,
						[G_SRV09] = @G_SRV09,
						[G_SRV09_NM] = @G_SRV09_NM,
						[ETC] = @ETC
					WHERE [ANCD] = @ANCD
						AND [G_SEQ] = @G_SEQ
						AND CONVERT(date, [G_SDT]) = CONVERT(date, @G_SDT)
				`);

			return new Response(
				JSON.stringify({ success: true, created: false, G_SEQ: gSeq, G_SDT: gSdt }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// 신규: PK가 (ANCD, G_SEQ)만이면 단체당 1건만 가능 → 동일 G_SEQ로 INSERT 시도
		// 실패 시(중복 PK) 새 실적 일련번호 채번 후 INSERT (G_SEQ를 실적키로 쓰는 스키마 호환)
		try {
			await pool
				.request()
				.input('ANCD', ancd)
				.input('G_SEQ', gSeq)
				.input('G_SDT', gSdt)
				.input('G_STM', gStm)
				.input('G_ETM', gEtm)
				.input('G_CNT', gCnt)
				.input('G_TAKE_NM', gTakeNm)
				.input('G_SRV01', gSrv01)
				.input('G_SRV02', gSrv02)
				.input('G_SRV03', gSrv03)
				.input('G_SRV04', gSrv04)
				.input('G_SRV09', gSrv09)
				.input('G_SRV09_NM', gSrv09 === '1' ? gSrv09Nm : null)
				.input('ETC', etc)
				.query(`
					INSERT INTO ${TABLE_NAME} (
						[ANCD], [G_SEQ], [G_SDT], [G_STM], [G_ETM], [G_CNT], [G_TAKE_NM],
						[G_SRV01], [G_SRV02], [G_SRV03], [G_SRV04], [G_SRV09], [G_SRV09_NM],
						[ETC], [INDT]
					) VALUES (
						@ANCD, @G_SEQ, @G_SDT, @G_STM, @G_ETM, @G_CNT, @G_TAKE_NM,
						@G_SRV01, @G_SRV02, @G_SRV03, @G_SRV04, @G_SRV09, @G_SRV09_NM,
						@ETC, CONVERT(date, GETDATE())
					)
				`);

			return new Response(
				JSON.stringify({ success: true, created: true, G_SEQ: gSeq, G_SDT: gSdt }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		} catch (insertErr) {
			// PK 충돌: 동일 G_SEQ에 이미 다른 일자 실적이 있는 경우 → 해당 행 UPDATE로 전환하지 않고
			// 단체 FK 유지가 불가하면 에러 메시지
			const msg = String(insertErr?.message || insertErr || '');
			if (/PRIMARY KEY|duplicate|UNIQUE|위반/i.test(msg)) {
				return new Response(
					JSON.stringify({
						success: false,
						error:
							'동일 단체(G_SEQ)로 추가 실적을 저장할 수 없습니다. DB 키가 (ANCD, G_SEQ)만인 경우 단체당 실적 1건만 가능합니다. (ANCD, G_SEQ, G_SDT) 복합키로 변경이 필요할 수 있습니다.',
						details: msg,
					}),
					{ status: 409, headers: { 'Content-Type': 'application/json' } }
				);
			}
			throw insertErr;
		}
	} catch (err) {
		console.error('F71031 저장 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * DELETE /api/f71031?ancd=&gSeq=&gSdt=
 */
export async function DELETE(req) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const ancdParam = searchParams.get('ancd');
		const gSeq = Number(searchParams.get('gSeq') || searchParams.get('G_SEQ') || '');
		const gSdt = normalizeYmd(searchParams.get('gSdt') || searchParams.get('G_SDT') || '');

		const gate = assertAnCdMatchesSession(req, ancdParam || null);
		if (!gate.ok) return gate.response;

		if (!Number.isFinite(gSeq) || !gSdt) {
			return new Response(JSON.stringify({ success: false, error: 'gSeq, gSdt가 필요합니다.' }), {
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

		const ancd = gate.sessionAncd;
		const result = await pool
			.request()
			.input('ANCD', ancd)
			.input('G_SEQ', gSeq)
			.input('G_SDT', gSdt)
			.query(`
				DELETE FROM ${TABLE_NAME}
				WHERE [ANCD] = @ANCD
					AND [G_SEQ] = @G_SEQ
					AND CONVERT(date, [G_SDT]) = CONVERT(date, @G_SDT)
			`);

		const affected = result?.rowsAffected?.[0] ?? 0;
		if (!affected) {
			return new Response(JSON.stringify({ success: false, error: '삭제할 봉사실적을 찾을 수 없습니다.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true, G_SEQ: gSeq, G_SDT: gSdt }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('F71031 삭제 오류:', err);
		return new Response(JSON.stringify({ success: false, error: err.message, details: err.toString() }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
