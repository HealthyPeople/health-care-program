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
  const end = new Date(y, mm, 0); // last day
  const toYmd = (d) => {
    const yyyy = String(d.getFullYear()).padStart(4, "0");
    const m2 = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${m2}-${dd}`;
  };
  return { startYmd: toYmd(start), endYmd: toYmd(end) };
}

function markTime(status, time) {
  const s = String(status || "").trim();
  const t = String(time || "").trim();
  if (s === "1") return `○ ${t}`.trim();
  if (s === "2") return `× ${t}`.trim();
  if (s === "9") return "-";
  if (s) return `(${s})`;
  return "";
}

function buildCalendarRow(r) {
  return {
    EADT: String(r.EADT || "").trim(),
    아침식전: markTime(r.MOIN, r.MOIN_TIME),
    아침식후: markTime(r.MOOUT, r.MOOUT_TIME),
    점심식전: markTime(r.AFIN, r.AFIN_TIME),
    점심식후: markTime(r.AFOUT, r.AFOUT_TIME),
    저녁식전: markTime(r.EVIN, r.EVIN_TIME),
    저녁식후: markTime(r.EVOUT, r.EVOUT_TIME),
    취침복용: markTime(r.SLIN, r.SLIN_TIME),
    확인자: String(r.CONF_NAME || "").trim(),
  };
}

export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const pnumRaw = sp.get("pnum") || "";
    const month = sp.get("month") || "";
    const ancd = sp.get("ancd") || null;

    const gate = assertAnCdMatchesSession(req, ancd);
    if (!gate.ok) return gate.response;

    const pool = await connPool;
    if (!pool) return json({ success: false, error: "데이터베이스 연결 실패" }, 500);

    const monthRange = monthStartEnd(month);
    if (!monthRange) return json({ success: false, error: "month(YYYY-MM)가 필요합니다" }, 400);

    const pnum = String(pnumRaw || "").trim();
    if (!pnum) return json({ success: false, error: "pnum이 필요합니다" }, 400);

    const bindCommon = (req) => {
      req.input("ANCD", gate.sessionAncd);
      req.input("PNUM", pnum);
      req.input("MONTH_START", monthRange.startYmd);
      req.input("MONTH_END", monthRange.endYmd);
      return req;
    };

    const facilityReq = bindCommon(pool.request());
    const memberReq = bindCommon(pool.request());
    const diseasesReq = bindCommon(pool.request());
    const medsReq = bindCommon(pool.request());
    const logsReq = bindCommon(pool.request());

    const facility = await facilityReq.query(`
      SELECT TOP 1
        [ANCD],[ANNM],[ANGH],[ANTEL],[ANADD]
      FROM [돌봄시설DB].[dbo].[F00110]
      WHERE [ANCD] = @ANCD
    `);

    const member = await memberReq.query(`
      SELECT TOP 1
        [ANCD],[PNUM],[P_NM],[P_BRDT],[P_SEX],[P_GRD],[P_YYNO],[P_YYDT]
      FROM [돌봄시설DB].[dbo].[F10010]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
      ORDER BY [INDT] DESC
    `);

    const diseases = await diseasesReq.query(`
      SELECT TOP 5
        [JDES]
      FROM [돌봄시설DB].[dbo].[F30030]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
        AND (ISNULL([DEL],'') <> 'D')
      ORDER BY [INDT] DESC
    `);

    const meds = await medsReq.query(`
      SELECT
        [MENM],[INQNT],[INCNT],[METM],[CAPDES]
      FROM [돌봄시설DB].[dbo].[F30110]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
        AND (ISNULL([DEL],'') <> 'D')
        AND ( [SDT] IS NULL OR CONVERT(varchar(10), [SDT], 120) <= @MONTH_END )
        AND ( [EDT] IS NULL OR CONVERT(varchar(10), [EDT], 120) >= @MONTH_START )
      ORDER BY [INDT] DESC
    `);

    const logs = await logsReq.query(`
      SELECT
        CONVERT(varchar(10), [EADT], 120) as EADT,
        [MOIN],[MOOUT],[AFIN],[AFOUT],[EVIN],[EVOUT],[SLIN],
        [MOIN_TIME],[MOOUT_TIME],[AFIN_TIME],[AFOUT_TIME],[EVIN_TIME],[EVOUT_TIME],[SLIN_TIME],
        [CONF_NAME],
        [INDT]
      FROM [돌봄시설DB].[dbo].[F30111]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
        AND CONVERT(varchar(10), [EADT], 120) >= @MONTH_START
        AND CONVERT(varchar(10), [EADT], 120) <= @MONTH_END
      ORDER BY [EADT] ASC, [INDT] DESC
    `);

    const rows = Array.isArray(logs.recordset) ? logs.recordset : [];
    const byDate = new Map();
    rows.forEach((r) => {
      const e = String(r.EADT || "").trim();
      if (!e || byDate.has(e)) return;
      byDate.set(e, r);
    });

    const calendar = Array.from(byDate.values())
      .sort((a, b) => String(a.EADT).localeCompare(String(b.EADT)))
      .map(buildCalendarRow);

    return json({
      success: true,
      data: {
        month,
        facility: (facility.recordset || [])[0] || null,
        member: (member.recordset || [])[0] || null,
        diseases: (diseases.recordset || []).map((x) => String(x.JDES || "").trim()).filter(Boolean),
        meds: (meds.recordset || []).map((x) => ({
          MENM: String(x.MENM || "").trim(),
          INQNT: String(x.INQNT || "").trim(),
          INCNT: String(x.INCNT || "").trim(),
          METM: String(x.METM || "").trim(),
          CAPDES: String(x.CAPDES || "").trim(),
        })),
        calendar,
      },
    });
  } catch (err) {
    console.error("medication-print individual 오류:", err);
    return json({ success: false, error: err?.message || "서버 오류", details: String(err) }, 500);
  }
}

