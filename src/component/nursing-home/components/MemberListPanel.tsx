"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatCareGradeLabel } from "../utils/careGrade";
import {
  NO_ROOM_VALUE,
  attachLatestRoomNoByPnum,
  availableFloorsFromMembers,
  extractFloorFromRoomNo,
  normalizeRoomNo,
} from "../utils/roomNoFloor";

type MemberData = { [key: string]: any };

export function MemberListPanel({
  title = "수급자 목록",
  className = "",
  onSelectMember,
  initialSelectedStatus = "입소",
  itemsPerPage = 10,
}: {
  title?: string;
  className?: string;
  onSelectMember?: (member: MemberData) => void;
  initialSelectedStatus?: string;
  itemsPerPage?: number;
}) {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>(initialSelectedStatus);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMembers = async (nameSearch?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url =
        nameSearch && nameSearch.trim() !== ""
          ? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
          : "/api/f10010";
      const response = await fetch(url);
      const result = await response.json();
      if (result?.success) {
        const list = (Array.isArray(result.data) ? result.data : []) as MemberData[];
        const merged = await attachLatestRoomNoByPnum(list);
        setMembers(merged as MemberData[]);
      } else {
        setMembers([]);
        setError(result?.error || "수급자 데이터 조회 실패");
      }
    } catch (err) {
      setMembers([]);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedGrade, selectedFloor]);

  const availableFloors = useMemo(() => availableFloorsFromMembers(members as any), [members]);

  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        if (selectedStatus) {
          const memberStatus = String(member.P_ST || "").trim();
          if (selectedStatus === "입소" && memberStatus !== "1") return false;
          if (selectedStatus === "퇴소" && memberStatus !== "9") return false;
        }

        if (selectedGrade) {
          const memberGrade = String(member.P_GRD || "").trim();
          const selectedGradeTrimmed = String(selectedGrade).trim();
          if (memberGrade !== selectedGradeTrimmed) return false;
        }

        if (selectedFloor) {
          if (selectedFloor === NO_ROOM_VALUE) {
            if (normalizeRoomNo((member as any).ROOM_NO) !== "") return false;
          } else {
            const memberFloor = extractFloorFromRoomNo((member as any).ROOM_NO);
            const selectedFloorNum = Number(String(selectedFloor).trim());
            if (!Number.isFinite(selectedFloorNum) || memberFloor !== selectedFloorNum) return false;
          }
        }

        if (searchTerm && searchTerm.trim() !== "") {
          const searchLower = searchTerm.toLowerCase().trim();
          const matchesSearch =
            member.P_NM?.toLowerCase().includes(searchLower) ||
            member.P_TEL?.includes(searchTerm) ||
            member.P_HP?.includes(searchTerm) ||
            String(member.ANCD || "").includes(searchTerm) ||
            String(member.PNUM || "").includes(searchTerm);
          if (!matchesSearch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = (a.P_NM || "").trim();
        const nameB = (b.P_NM || "").trim();
        return nameA.localeCompare(nameB, "ko");
      });
  }, [members, searchTerm, selectedStatus, selectedGrade, selectedFloor]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => setCurrentPage(page);

  return (
    <div className={className}>
      <div className="overflow-hidden bg-white border border-blue-300 rounded-lg shadow-sm">
        <div className="px-3 py-2 font-semibold text-blue-900 bg-blue-100 border-b border-blue-300">
          {title}
        </div>
        <div className="px-3 py-2 space-y-2 border-b border-blue-100">
          <div className="space-y-1">
            <div className="text-xs text-blue-900/80">현황</div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
            >
              <option value="">현황 전체</option>
              <option value="입소">입소</option>
              <option value="퇴소">퇴소</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-blue-900/80">등급</div>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
            >
              <option value="">등급 전체</option>
              <option value="1">1등급</option>
              <option value="2">2등급</option>
              <option value="3">3등급</option>
              <option value="4">4등급</option>
              <option value="5">5등급</option>
              <option value="9">인지지원</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-blue-900/80">층수</div>
            <select
              value={selectedFloor}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1 text-sm text-blue-900 bg-white border border-blue-300 rounded"
            >
              <option value="">층수 전체</option>
              <option value={NO_ROOM_VALUE}>방번호 없음</option>
              {availableFloors.map((floor) => (
                <option key={floor} value={String(floor)}>
                  {floor}층
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-blue-900/80">이름 검색</div>
            <input
              className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded"
              placeholder="예) 홍길동"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCurrentPage(1);
                  fetchMembers(searchTerm);
                }
              }}
            />
          </div>

          <button
            className="w-full py-1 text-sm text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
            onClick={() => {
              setCurrentPage(1);
              fetchMembers(searchTerm);
            }}
          >
            {loading ? "검색 중..." : "검색"}
          </button>
        </div>

        <div className="max-h-[540px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-blue-200 bg-blue-50">
              <tr>
                <th className="px-2 py-2 font-semibold text-left text-blue-900">이름</th>
                <th className="px-2 py-2 font-semibold text-left text-blue-900">등급</th>
                <th className="px-2 py-2 font-semibold text-left text-blue-900">상태</th>
                <th className="px-2 py-2 font-semibold text-left text-blue-900">방번호</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-center text-blue-900/60">
                    로딩 중...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-center text-blue-900/60">
                    수급자 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                currentMembers.map((member, idx) => (
                  <tr
                    key={`${member.ANCD}-${member.PNUM}-${idx}`}
                    className={`border-b border-blue-50 hover:bg-blue-50 ${
                      onSelectMember ? "cursor-pointer" : ""
                    }`}
                    onClick={() => (onSelectMember ? onSelectMember(member) : undefined)}
                  >
                    <td className="px-2 py-2">{member.P_NM || member.ANCD || "이름 없음"}</td>
                    <td className="px-2 py-2">{formatCareGradeLabel(member.P_GRD, "등급 없음")}</td>
                    <td className="px-2 py-2">
                      {member.P_ST === "1" ? "입소" : member.P_ST === "9" ? "퇴소" : "-"}
                    </td>
                    <td className="px-2 py-2">
                      {normalizeRoomNo((member as any).ROOM_NO) !== ""
                        ? String((member as any).ROOM_NO)
                        : "방번호없음"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 border-t border-blue-100">
            <div className="flex items-center justify-center">
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  &lt;
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-2 py-1 text-xs border rounded ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white border-blue-500"
                          : "border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  &gt;
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

