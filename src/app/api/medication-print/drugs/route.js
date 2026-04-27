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

    const pnum = parseInt(String(pnumRaw).trim(), 10);
    if (!Number.isFinite(pnum)) return json({ success: false, error: "pnum이 필요합니다" }, 400);

    const request = pool.request();
    request.input("ANCD", gate.sessionAncd);
    request.input("PNUM", pnum);
    request.input("MONTH_START", monthRange.startYmd);
    request.input("MONTH_END", monthRange.endYmd);

    const facility = await request.query(`
      SELECT TOP 1
        [ANCD],[ANNM],[ANGH],[ANTEL],[ANADD]
      FROM [돌봄시설DB].[dbo].[F00110]
      WHERE [ANCD] = @ANCD
    `);

    const member = await request.query(`
      SELECT TOP 1
        [ANCD],[PNUM],[P_NM],[P_BRDT],[P_SEX],[P_GRD],[P_YYNO],[P_YYDT]
      FROM [돌봄시설DB].[dbo].[F10010]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
      ORDER BY [INDT] DESC
    `);

    const diseases = await request.query(`
      SELECT TOP 20
        [JDES]
      FROM [돌봄시설DB].[dbo].[F30030]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
        AND (ISNULL([DEL],'') <> 'D')
      ORDER BY [INDT] DESC
    `);

    // F30110: 해당 월에 유효한 복용약
    const meds = await request.query(`
      SELECT
        [MENM],[INQNT],[INCNT],[CAPDES],[METM],[EDT]
      FROM [돌봄시설DB].[dbo].[F30110]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
        AND (ISNULL([DEL],'') <> 'D')
        AND ( [SDT] IS NULL OR CONVERT(varchar(10), [SDT], 120) <= @MONTH_END )
        AND ( [EDT] IS NULL OR CONVERT(varchar(10), [EDT], 120) >= @MONTH_START )
      ORDER BY [INDT] DESC
    `);

    // F30111: 복용상계(해당 월 내 기록에 존재하는 복용타임들을 DISTINCT로 모아 문자열화)
    const logAgg = await request.query(`
      SELECT
        MAX(CASE WHEN [MOIN] = '1' THEN 1 ELSE 0 END) as HAS_MOIN,
        MAX(CASE WHEN [MOOUT] = '1' THEN 1 ELSE 0 END) as HAS_MOUT,
        MAX(CASE WHEN [AFIN] = '1' THEN 1 ELSE 0 END) as HAS_AFIN,
        MAX(CASE WHEN [AFOUT] = '1' THEN 1 ELSE 0 END) as HAS_AFOUT,
        MAX(CASE WHEN [EVIN] = '1' THEN 1 ELSE 0 END) as HAS_EVIN,
        MAX(CASE WHEN [EVOUT] = '1' THEN 1 ELSE 0 END) as HAS_EVOUT,
        MAX(CASE WHEN [SLIN] = '1' THEN 1 ELSE 0 END) as HAS_SLIN
      FROM [돌봄시설DB].[dbo].[F30111]
      WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
        AND CONVERT(varchar(10), [EADT], 120) >= @MONTH_START
        AND CONVERT(varchar(10), [EADT], 120) <= @MONTH_END
    `);

    const a = (logAgg.recordset || [])[0] || {};
    const intakeLabels = [
      a.HAS_MOIN ? "취침전" : null, // 이미지상 문구가 식전/식후로 보이지만, 데이터에서 유추 어려워 기본값으로 노출하지 않음
    ].filter(Boolean);
    // 실제 표에서는 아침식전/아침식후/점심식전/점심식후/저녁식전/저녁식후/취침복용처럼 보이므로,
    // F30111의 복용 타임 존재 여부를 사용해 고정 순서로 문자열 구성.
    const plan = [];
    if (a.HAS_MOIN) plan.push("아침식전");
    if (a.HAS_MOUT) plan.push("아침식후");
    if (a.HAS_AFIN) plan.push("점심식전");
    if (a.HAS_AFOUT) plan.push("점심식후");
    if (a.HAS_EVIN) plan.push("저녁식전");
    if (a.HAS_EVOUT) plan.push("저녁식후");
    if (a.HAS_SLIN) plan.push("취침");
    const intakePlan = plan.join(", ");

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
          CAPDES: String(x.CAPDES || "").trim(),
          METM: String(x.METM || "").trim(),
          EDT: x.EDT ? String(x.EDT).slice(0, 10) : "",
        })),
        intakePlan,
      },
    });
  } catch (err) {
    console.error("medication-print drugs 오류:", err);
    return json({ success: false, error: err?.message || "서버 오류", details: String(err) }, 500);
  }
}

