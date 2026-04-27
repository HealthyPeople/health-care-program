"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PrintData = {
  month: string;
  facility: any;
  member: any;
  diseases: string[];
  meds: Array<{ MEMNM: string; INQNT: string; INCNT: string; METM: string; CAPDES: string }>;
  calendar: Array<Record<string, string>>;
};

const A4Style = () => (
  <style>{`
    @page { size: A4; margin: 10mm; }
    html, body { background:#fff; color:#000; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 190mm; margin: 0 auto; }
    .title { text-align:center; font-weight:700; font-size:18px; margin: 4mm 0 2mm; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #333; padding: 3px 4px; font-size: 12px; vertical-align: middle; }
    .small { font-size: 11px; }
    .center { text-align:center; }
    .right { text-align:right; }
    .box { border:1px solid #333; }
    .no-border { border:none !important; }
    .section-gap { height: 2mm; }
    .muted { color:#222; }
    .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 2mm; }
    .header-row td { font-weight:600; }
    .pill { border:1px solid #333; padding:2px 6px; display:inline-block; min-width: 30px; text-align:center; }
  `}</style>
);

function calcAge(birthYmd?: string) {
  if (!birthYmd) return "";
  const s = String(birthYmd).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  const today = new Date();
  let age = today.getFullYear() - y;
  const md = (today.getMonth() + 1) * 100 + today.getDate();
  const bmd = m * 100 + d;
  if (md < bmd) age -= 1;
  return String(age);
}

export default function MedicationPrintIndividualPage() {
  const sp = useSearchParams();
  const pnum = sp.get("pnum") || "";
  const month = sp.get("month") || "";

  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/medication-print/individual?pnum=${encodeURIComponent(pnum)}&month=${encodeURIComponent(month)}`);
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || "조회 실패");
        if (!mounted) return;
        setData(json.data);
        setTimeout(() => window.print(), 200);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "오류");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pnum, month]);

  const member = data?.member || {};
  const facility = data?.facility || {};

  const ymLabel = useMemo(() => {
    const m = String(month || "");
    return /^\d{4}-\d{2}$/.test(m) ? m : "";
  }, [month]);

  if (error) {
    return (
      <div className="p-4 text-sm">
        <A4Style />
        출력 데이터를 불러오지 못했습니다. {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-sm">
        <A4Style />
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="sheet">
      <A4Style />

      <div className="title">약물관리기록지</div>

      {/* 상단 체크박스 영역(샘플과 동일한 3칸) */}
      <table>
        <tbody>
          <tr>
            <td className="no-border" style={{ width: "60%" }} />
            <td className="center" style={{ width: "40%", padding: 0 }}>
              <table>
                <tbody>
                  <tr>
                    <td className="center" style={{ fontWeight: 700 }}>합명</td>
                    <td className="center" style={{ fontWeight: 700 }}>검토</td>
                    <td className="center" style={{ fontWeight: 700 }}>결재</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="section-gap" />

      {/* 수급자 기본정보 */}
      <table>
        <tbody>
          <tr className="header-row">
            <td className="center" style={{ width: "16%" }}>장기요양기관기호</td>
            <td style={{ width: "18%" }}>{facility.ANGH || ""}</td>
            <td className="center" style={{ width: "20%" }}>장기요양기관명</td>
            <td style={{ width: "26%" }}>{facility.ANNM || ""}</td>
            <td className="center" style={{ width: "12%" }}>장기요양등급</td>
            <td style={{ width: "8%" }}>{member.P_GRD || ""}</td>
          </tr>
          <tr className="header-row">
            <td className="center">수급자성명</td>
            <td>{member.P_NM || ""}</td>
            <td className="center">생년</td>
            <td>{String(member.P_BRDT || "").slice(0, 10)}</td>
            <td className="center">장기요양인정번호</td>
            <td>{member.P_YYNO || ""}</td>
          </tr>
          <tr className="header-row">
            <td className="center">성별</td>
            <td>{String(member.P_SEX || "") === "1" ? "남" : String(member.P_SEX || "") === "2" ? "여" : ""}</td>
            <td className="center">연령</td>
            <td className="center">
              만 {calcAge(String(member.P_BRDT || "").slice(0, 10))}세
            </td>
            <td className="center">복용년월</td>
            <td>{ymLabel}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-gap" />

      {/* 질병내역/복용약 */}
      <table>
        <tbody>
          <tr className="header-row">
            <td className="center" style={{ width: "30%" }}>질병내역</td>
            <td className="center" style={{ width: "30%" }}>복용약</td>
            <td className="center" style={{ width: "10%" }}>1회투약량</td>
            <td className="center" style={{ width: "10%" }}>1일투약횟수</td>
            <td className="center" style={{ width: "20%" }}>복용상계</td>
          </tr>
          <tr>
            <td style={{ verticalAlign: "top" }}>
              <div className="small">
                {data.diseases.length === 0 ? "" : data.diseases.map((x, i) => <div key={`${x}-${i}`}>{x}</div>)}
              </div>
            </td>
            <td colSpan={4} style={{ padding: 0 }}>
              <table>
                <tbody>
                  {(data.meds.length ? data.meds : [{ MEMNM: "", INQNT: "", INCNT: "", METM: "", CAPDES: "" }]).map((m, i) => (
                    <tr key={i}>
                      <td style={{ width: "30%" }}>{m.MEMNM}</td>
                      <td className="center" style={{ width: "10%" }}>{m.INQNT}</td>
                      <td className="center" style={{ width: "10%" }}>{m.INCNT}</td>
                      <td style={{ width: "20%" }}>{m.CAPDES || m.METM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="section-gap" />

      {/* 월별 복용기록 */}
      <table>
        <thead>
          <tr className="header-row">
            <th className="center" style={{ width: "14%" }}>복용일자</th>
            <th className="center">아침식전</th>
            <th className="center">아침식후</th>
            <th className="center">점심식전</th>
            <th className="center">점심식후</th>
            <th className="center">저녁식전</th>
            <th className="center">저녁식후</th>
            <th className="center">취침복용</th>
            <th className="center" style={{ width: "12%" }}>확인자</th>
          </tr>
        </thead>
        <tbody>
          {data.calendar.map((r, idx) => (
            <tr key={`${r.EADT}-${idx}`}>
              <td className="center">{r.EADT}</td>
              <td className="center">{r["아침식전"]}</td>
              <td className="center">{r["아침식후"]}</td>
              <td className="center">{r["점심식전"]}</td>
              <td className="center">{r["점심식후"]}</td>
              <td className="center">{r["저녁식전"]}</td>
              <td className="center">{r["저녁식후"]}</td>
              <td className="center">{r["취침복용"]}</td>
              <td className="center">{r["확인자"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

