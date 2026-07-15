import { connPool } from "../../../config/server";
import { getSessionAncd, ancdEquals } from "../../../config/sessionServer";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireSession(req) {
  const sessionAncd = getSessionAncd(req);
  if (sessionAncd == null) return { error: json({ success: false, error: "로그인이 필요합니다." }, 401) };
  return { sessionAncd };
}

function normalizeDateString(v) {
  if (!v) return "";
  // Accept YYYY-MM-DD or ISO.
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const STATUS_MAP_TO_DB = {
  복용: "1",
  미복용: "2",
  약없음: "9",
};

const STATUS_MAP_FROM_DB = {
  "1": "복용",
  "2": "미복용",
  "9": "약없음",
};

function mapTimeFromDb(row, statusField, timeField, nameField) {
  const raw = String(row[statusField] || "").trim();
  const mapped = STATUS_MAP_FROM_DB[raw];
  if (mapped) {
    return {
      status: mapped,
      time: row[timeField] ?? "",
      helper: row[nameField] ?? "",
      rawStatus: "",
    };
  }
  if (!raw) {
    return {
      status: "약없음",
      time: row[timeField] ?? "",
      helper: row[nameField] ?? "",
      rawStatus: "",
    };
  }
  return {
    status: "",
    time: row[timeField] ?? "",
    helper: row[nameField] ?? "",
    rawStatus: raw,
  };
}

function mapStatusToDb(entry) {
  const { status, rawStatus } = entry || {};
  if (status && STATUS_MAP_TO_DB[status]) return STATUS_MAP_TO_DB[status];
  if (rawStatus) return String(rawStatus).trim();
  return "9";
}

export async function GET(req) {
  try {
    const { error, sessionAncd } = requireSession(req);
    if (error) return error;

    const pool = await connPool;
    if (!pool) return json({ success: false, error: "데이터베이스 연결 실패" }, 500);

    const sp = req.nextUrl.searchParams;
    const mode = (sp.get("mode") || "detail").trim();
    const pnum = (sp.get("pnum") || "").trim();
    const eadt = normalizeDateString(sp.get("eadt") || "");

    if (!pnum) return json({ success: false, error: "pnum이 필요합니다" }, 400);

    if (mode === "dates") {
      const result = await pool
        .request()
        .input("ANCD", sessionAncd)
        .input("PNUM", pnum)
        .query(`
          SELECT DISTINCT CONVERT(varchar(10), [EADT], 120) as EADT
          FROM [돌봄시설DB].[dbo].[F30111]
          WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
          ORDER BY EADT DESC
        `);
      return json({ success: true, data: result.recordset || [] });
    }

    if (!eadt) return json({ success: false, error: "eadt가 필요합니다" }, 400);

    const result = await pool
      .request()
      .input("ANCD", sessionAncd)
      .input("PNUM", pnum)
      .input("EADT", eadt)
      .query(`
        SELECT TOP 1 *
        FROM [돌봄시설DB].[dbo].[F30111]
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND CONVERT(varchar(10), [EADT], 120) = @EADT
        ORDER BY [INDT] DESC
      `);

    const row = (result.recordset || [])[0] || null;
    if (!row) return json({ success: true, data: null });

    const data = {
      ANCD: row.ANCD,
      PNUM: row.PNUM,
      EADT: normalizeDateString(row.EADT),
      EADES: row.EADES ?? "",
      ETC: row.ETC ?? "",
      CONF_DATE: normalizeDateString(row.INDT),
      CONF_NAME: row.CONF_NAME ?? "",
      times: {
        아침식전: mapTimeFromDb(row, "MOIN", "MOIN_TIME", "MOIN_NAME"),
        아침식후: mapTimeFromDb(row, "MOOUT", "MOOUT_TIME", "MOUT_NAME"),
        점심식전: mapTimeFromDb(row, "AFIN", "AFIN_TIME", "AFIN_NAME"),
        점심식후: mapTimeFromDb(row, "AFOUT", "AFOUT_TIME", "AFOUT_NAME"),
        저녁식전: mapTimeFromDb(row, "EVIN", "EVIN_TIME", "EVIN_NAME"),
        저녁식후: mapTimeFromDb(row, "EVOUT", "EVOUT_TIME", "EVOUT_NAME"),
        취침복용: mapTimeFromDb(row, "SLIN", "SLIN_TIME", "SLIN_NAME"),
      },
    };

    return json({ success: true, data });
  } catch (err) {
    console.error("F30111 GET 오류:", err);
    return json({ success: false, error: err?.message || "서버 오류", details: String(err) }, 500);
  }
}

export async function POST(req) {
  try {
    const { error, sessionAncd } = requireSession(req);
    if (error) return error;

    const pool = await connPool;
    if (!pool) return json({ success: false, error: "데이터베이스 연결 실패" }, 500);

    const body = await req.json();
    const { ANCD, PNUM, EADT, EADES, ETC, CONF_DATE, CONF_NAME, times } = body || {};

    if (ANCD != null && ANCD !== "" && !ancdEquals(ANCD, sessionAncd)) {
      return json({ success: false, error: "해당 기관에 대한 접근 권한이 없습니다." }, 403);
    }
    if (!PNUM) return json({ success: false, error: "PNUM이 필요합니다" }, 400);

    const eadtNorm = normalizeDateString(EADT);
    if (!eadtNorm) return json({ success: false, error: "EADT가 필요합니다" }, 400);

    const confDateNorm = normalizeDateString(CONF_DATE) || normalizeDateString(new Date().toISOString());

    const t = times || {};
    const v = (k) => t?.[k] || {};

    const inputs = {
      ANCD: sessionAncd,
      PNUM: String(PNUM).trim(),
      EADT: eadtNorm,
      MOIN: mapStatusToDb(v("아침식전")),
      MOOUT: mapStatusToDb(v("아침식후")),
      AFIN: mapStatusToDb(v("점심식전")),
      AFOUT: mapStatusToDb(v("점심식후")),
      EVIN: mapStatusToDb(v("저녁식전")),
      EVOUT: mapStatusToDb(v("저녁식후")),
      SLIN: mapStatusToDb(v("취침복용")),
      EADES: EADES ?? "",
      INDT: confDateNorm,
      ETC: ETC ?? "",
      CONF_NAME: CONF_NAME ?? "",
      MOIN_TIME: v("아침식전").time ?? "",
      MOIN_NAME: v("아침식전").helper ?? "",
      MOOUT_TIME: v("아침식후").time ?? "",
      MOUT_NAME: v("아침식후").helper ?? "",
      AFIN_TIME: v("점심식전").time ?? "",
      AFIN_NAME: v("점심식전").helper ?? "",
      AFOUT_TIME: v("점심식후").time ?? "",
      AFOUT_NAME: v("점심식후").helper ?? "",
      EVIN_TIME: v("저녁식전").time ?? "",
      EVIN_NAME: v("저녁식전").helper ?? "",
      EVOUT_TIME: v("저녁식후").time ?? "",
      EVOUT_NAME: v("저녁식후").helper ?? "",
      SLIN_TIME: v("취침복용").time ?? "",
      SLIN_NAME: v("취침복용").helper ?? "",
    };

    const request = pool.request();
    Object.entries(inputs).forEach(([k, val]) => request.input(k, val));

    await request.query(`
      IF EXISTS (
        SELECT 1 FROM [돌봄시설DB].[dbo].[F30111]
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND CONVERT(varchar(10), [EADT], 120) = @EADT
      )
      BEGIN
        UPDATE [돌봄시설DB].[dbo].[F30111]
        SET
          [MOIN] = @MOIN,
          [MOOUT] = @MOOUT,
          [AFIN] = @AFIN,
          [AFOUT] = @AFOUT,
          [EVIN] = @EVIN,
          [EVOUT] = @EVOUT,
          [SLIN] = @SLIN,
          [EADES] = @EADES,
          [INDT] = @INDT,
          [ETC] = @ETC,
          [CONF_NAME] = @CONF_NAME,
          [MOIN_TIME] = @MOIN_TIME,
          [MOIN_NAME] = @MOIN_NAME,
          [MOOUT_TIME] = @MOOUT_TIME,
          [MOUT_NAME] = @MOUT_NAME,
          [AFIN_TIME] = @AFIN_TIME,
          [AFIN_NAME] = @AFIN_NAME,
          [AFOUT_TIME] = @AFOUT_TIME,
          [AFOUT_NAME] = @AFOUT_NAME,
          [EVIN_TIME] = @EVIN_TIME,
          [EVIN_NAME] = @EVIN_NAME,
          [EVOUT_TIME] = @EVOUT_TIME,
          [EVOUT_NAME] = @EVOUT_NAME,
          [SLIN_TIME] = @SLIN_TIME,
          [SLIN_NAME] = @SLIN_NAME
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND CONVERT(varchar(10), [EADT], 120) = @EADT
      END
      ELSE
      BEGIN
        INSERT INTO [돌봄시설DB].[dbo].[F30111] (
          [ANCD],[PNUM],[EADT],
          [MOIN],[MOOUT],[AFIN],[AFOUT],[EVIN],[EVOUT],[SLIN],
          [EADES],[INDT],[ETC],[CONF_NAME],
          [MOIN_TIME],[MOIN_NAME],[MOOUT_TIME],[MOUT_NAME],
          [AFIN_TIME],[AFIN_NAME],[AFOUT_TIME],[AFOUT_NAME],
          [EVIN_TIME],[EVIN_NAME],[EVOUT_TIME],[EVOUT_NAME],
          [SLIN_TIME],[SLIN_NAME]
        ) VALUES (
          @ANCD,@PNUM,@EADT,
          @MOIN,@MOOUT,@AFIN,@AFOUT,@EVIN,@EVOUT,@SLIN,
          @EADES,@INDT,@ETC,@CONF_NAME,
          @MOIN_TIME,@MOIN_NAME,@MOOUT_TIME,@MOUT_NAME,
          @AFIN_TIME,@AFIN_NAME,@AFOUT_TIME,@AFOUT_NAME,
          @EVIN_TIME,@EVIN_NAME,@EVOUT_TIME,@EVOUT_NAME,
          @SLIN_TIME,@SLIN_NAME
        )
      END
    `);

    return json({ success: true });
  } catch (err) {
    console.error("F30111 POST 오류:", err);
    return json({ success: false, error: err?.message || "서버 오류", details: String(err) }, 500);
  }
}

export async function DELETE(req) {
  try {
    const { error, sessionAncd } = requireSession(req);
    if (error) return error;

    const pool = await connPool;
    if (!pool) return json({ success: false, error: "데이터베이스 연결 실패" }, 500);

    const sp = req.nextUrl.searchParams;
    const pnum = (sp.get("pnum") || "").trim();
    const eadt = normalizeDateString(sp.get("eadt") || "");

    if (!pnum || !eadt) return json({ success: false, error: "pnum, eadt가 필요합니다" }, 400);

    await pool
      .request()
      .input("ANCD", sessionAncd)
      .input("PNUM", pnum)
      .input("EADT", eadt)
      .query(`
        DELETE FROM [돌봄시설DB].[dbo].[F30111]
        WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND CONVERT(varchar(10), [EADT], 120) = @EADT
      `);

    return json({ success: true });
  } catch (err) {
    console.error("F30111 DELETE 오류:", err);
    return json({ success: false, error: err?.message || "서버 오류", details: String(err) }, 500);
  }
}

