"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type DrugPrintData = {
  month: string;
  facility: any;
  member: any;
  diseases: string[];
  meds: Array<{ MEMNM: string; INQNT: string; INCNT: string; CAPDES: string; METM: string; EDT: string }>;
  intakePlan: string;
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
    .header-row td, .header-row th { font-weight:600; }
    .section-gap { height: 2mm; }
    .no-border { border:none !important; }
    .block-area { height: 170mm; } /* 큰 빈 영역 확보(이미지처럼) */
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

export default function MedicationPrintDrugsPage() {
  const sp = useSearchParams();
  const pnum = sp.get("pnum") || "";
  const month = sp.get("month") || "";

  const [data, setData] = useState<DrugPrintData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/medication-print/drugs?pnum=${encodeURIComponent(pnum)}&month=${encodeURIComponent(month)}`);
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

  const facility = data.facility || {};
  const member = data.member || {};

  return (
    <div className="sheet">
      <A4Style />

      <div className="title">질병 및 복용약물</div>

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
            <td className="center">만 {calcAge(String(member.P_BRDT || "").slice(0, 10))}세</td>
            <td className="center">입소일</td>
            <td />
          </tr>
        </tbody>
      </table>

      <div className="section-gap" />

      {/* 본문(질병내역 / 복용약물 리스트) */}
      <table>
        <thead>
          <tr className="header-row">
            <th className="center" style={{ width: "28%" }}>질병내역</th>
            <th className="center" style={{ width: "28%" }}>복용약물</th>
            <th className="center" style={{ width: "10%" }}>1회투약량</th>
            <th className="center" style={{ width: "10%" }}>1일투약횟수</th>
            <th className="center" style={{ width: "14%" }}>복용상계</th>
            <th className="center" style={{ width: "10%" }}>투여종료일</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top" }}>
              <div className="small">
                {data.diseases.map((x, i) => (
                  <div key={`${x}-${i}`}>{x}</div>
                ))}
              </div>
            </td>
            <td colSpan={5} style={{ padding: 0 }}>
              <table>
                <tbody>
                  {(data.meds.length ? data.meds : [{ MEMNM: "", INQNT: "", INCNT: "", CAPDES: "", METM: "", EDT: "" }]).map((m, i) => (
                    <tr key={i}>
                      <td style={{ width: "28%" }}>{m.MEMNM}</td>
                      <td className="center" style={{ width: "10%" }}>{m.INQNT}</td>
                      <td className="center" style={{ width: "10%" }}>{m.INCNT}</td>
                      <td style={{ width: "14%" }}>{data.intakePlan || ""}</td>
                      <td className="center" style={{ width: "10%" }}>{m.EDT ? String(m.EDT).slice(0, 10) : ""}</td>
                    </tr>
                  ))}
                  {/* 큰 빈 영역 확보(이미지처럼 하단 여백) */}
                  <tr>
                    <td colSpan={5} className="block-area" />
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

