import { connPool } from "../../../../config/server";
import { assertAnCdMatchesSession } from "../../../../config/sessionServer";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function monthStartEnd(month) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const [y, mm] = m.split("-").map((x) => parseInt(x, 10));
  const start = new Date(y, mm - 1, 1);
  const end = new Date(y, mm, 0);
  const toYmd = (d) => {
    const yyyy = String(d.getFullYear()).padStart(4, "0");
    const m2 = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${m2}-${dd}`;
  };
  return { startYmd: toYmd(start), endYmd: toYmd(end) };
}

function markTime(status, time) {
  const t = String(time || "").trim();
  if (status === "1") return `○ ${t}`.trim();
  if (status === "2") return `× ${t}`.trim();
  return "";
}

export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") || "";
    const ancd = sp.get("ancd") || null;

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    const pool = await connPool;
    if (!pool) return json({ success: false, error: "데이터베이스 연결 실패" }, 500);

    const monthRange = monthStartEnd(month);
    if (!monthRange) return json({ success: false, error: "month(YYYY-MM)가 필요합니다" }, 400);

    const baseReq = pool.request();
    baseReq.input("ANCD", gate.sessionAncd);
    baseReq.input("MONTH_START", monthRange.startYmd);
    baseReq.input("MONTH_END", monthRange.endYmd);

    const facility = await baseReq.query(`
      SELECT TOP 1
        [ANCD],[ANNM],[ANGH],[ANTEL],[ANADD]
      FROM [돌봄시설DB].[dbo].[F00110]
      WHERE [ANCD] = @ANCD
    `);

    // 해당 월에 복용약(F30110)이 존재하는 수급자 목록 (삭제 제외, 기간 겹침)
    const memberList = await baseReq.query(`
      SELECT DISTINCT
        f10010.[PNUM],
        f10010.[P_NM],
        f10010.[P_BRDT],
        f10010.[P_SEX],
        f10010.[P_GRD],
        f10010.[P_YYNO],
        f10010.[P_YYDT]
      FROM [돌봄시설DB].[dbo].[F30110] t
      INNER JOIN [돌봄시설DB].[dbo].[F10010] f10010
        ON t.[ANCD] = f10010.[ANCD] AND t.[PNUM] = f10010.[PNUM]
      WHERE t.[ANCD] = @ANCD
        AND (ISNULL(t.[DEL],'') <> 'D')
        AND ( t.[SDT] IS NULL OR CONVERT(varchar(10), t.[SDT], 120) <= @MONTH_END )
        AND ( t.[EDT] IS NULL OR CONVERT(varchar(10), t.[EDT], 120) >= @MONTH_START )
      ORDER BY f10010.[P_NM] ASC
    `);

    const members = Array.isArray(memberList.recordset) ? memberList.recordset : [];

    const results = [];
    for (const m of members) {
      const pnum = m.PNUM;
      const request = pool.request();
      request.input("ANCD", gate.sessionAncd);
      request.input("PNUM", pnum);
      request.input("MONTH_START", monthRange.startYmd);
      request.input("MONTH_END", monthRange.endYmd);

      const diseases = await request.query(`
        SELECT TOP 5 [JDES]
        FROM [돌봄시설DB].[dbo].[F30030]
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
          AND (ISNULL([DEL],'') <> 'D')
        ORDER BY [INDT] DESC
      `);

      const meds = await request.query(`
        SELECT [MENM],[INQNT],[INCNT],[METM],[CAPDES]
        FROM [돌봄시설DB].[dbo].[F30110]
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
          AND (ISNULL([DEL],'') <> 'D')
          AND ( [SDT] IS NULL OR CONVERT(varchar(10), [SDT], 120) <= @MONTH_END )
          AND ( [EDT] IS NULL OR CONVERT(varchar(10), [EDT], 120) >= @MONTH_START )
        ORDER BY [INDT] DESC
      `);

      const logs = await request.query(`
        SELECT
          CONVERT(varchar(10), [EADT], 120) as EADT,
          [MOIN],[MOOUT],[AFIN],[AFOUT],[EVIN],[EVOUT],[SLIN],
          [MOIN_TIME],[MOOUT_TIME],[AFIN_TIME],[AFOUT_TIME],[EVIN_TIME],[EVOUT_TIME],[SLIN_TIME],
          [CONF_NAME]
        FROM [돌봄시설DB].[dbo].[F30111]
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
          AND CONVERT(varchar(10), [EADT], 120) >= @MONTH_START
          AND CONVERT(varchar(10), [EADT], 120) <= @MONTH_END
        ORDER BY [EADT] ASC
      `);

      const rows = Array.isArray(logs.recordset) ? logs.recordset : [];
      const byDate = new Map();
      rows.forEach((r) => {
        const e = String(r.EADT || "").trim();
        if (!e) return;
        byDate.set(e, r);
      });

      // 달력 생성
      const [yy, mm] = month.split("-").map((x) => parseInt(x, 10));
      const start = new Date(yy, mm - 1, 1);
      const end = new Date(yy, mm, 0);
      const calendar = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const yyyy = String(d.getFullYear()).padStart(4, "0");
        const m2 = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const ymd = `${yyyy}-${m2}-${dd}`;
        const r = byDate.get(ymd);
        calendar.push({
          EADT: ymd,
          아침식전: r ? markTime(String(r.MOIN || "").trim(), r.MOIN_TIME) : "",
          아침식후: r ? markTime(String(r.MOOUT || "").trim(), r.MOOUT_TIME) : "",
          점심식전: r ? markTime(String(r.AFIN || "").trim(), r.AFIN_TIME) : "",
          점심식후: r ? markTime(String(r.AFOUT || "").trim(), r.AFOUT_TIME) : "",
          저녁식전: r ? markTime(String(r.EVIN || "").trim(), r.EVIN_TIME) : "",
          저녁식후: r ? markTime(String(r.EVOUT || "").trim(), r.EVOUT_TIME) : "",
          취침복용: r ? markTime(String(r.SLIN || "").trim(), r.SLIN_TIME) : "",
          확인자: r ? String(r.CONF_NAME || "").trim() : "",
        });
      }

      results.push({
        member: {
          PNUM: m.PNUM,
          P_NM: m.P_NM,
          P_BRDT: m.P_BRDT,
          P_SEX: m.P_SEX,
          P_GRD: m.P_GRD,
          P_YYNO: m.P_YYNO,
          P_YYDT: m.P_YYDT,
        },
        diseases: (diseases.recordset || []).map((x) => String(x.JDES || "").trim()).filter(Boolean),
        meds: (meds.recordset || []).map((x) => ({
          MENM: String(x.MENM || "").trim(),
          INQNT: String(x.INQNT || "").trim(),
          INCNT: String(x.INCNT || "").trim(),
          METM: String(x.METM || "").trim(),
          CAPDES: String(x.CAPDES || "").trim(),
        })),
        calendar,
      });
    }

    return json({
      success: true,
      data: {
        month,
        facility: (facility.recordset || [])[0] || null,
        members: results,
      },
    });
  } catch (err) {
    console.error("medication-print monthly 오류:", err);
    return json({ success: false, error: err?.message || "서버 오류", details: String(err) }, 500);
  }
}

