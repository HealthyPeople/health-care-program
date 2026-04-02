"use client";

import { useState } from 'react';
import { NursingHomeHeader } from '../../nursing-home/organisms/NursingHomeHeader'

export const MemberInfor = () => {
  const members = [
    { name: '길덕남', gender: '남', birth: '1925-11-20', status: '입소', level: '4등급', code: 'L1903184431', endDate: '2026-11-09' },
    { name: '김성숙', gender: '여', birth: '1925-11-20', status: '입소', level: '4등급', code: 'L1903184431', endDate: '2026-11-09' },
  ];

  const [selectedName, setSelectedName] = useState('길덕남');
  const [activeTab, setActiveTab] = useState('개인정보');

  return (
    <div className="p-4 space-y-6 text-sm text-black dark:text-white">
      <NursingHomeHeader />
      <h1 className="p-2 text-xl font-bold bg-gray-200 rounded dark:bg-gray-800">수급자기본정보</h1>

{/* 상단 검색 바 */}
<div className="relative flex items-center gap-2">
  <div className="relative">
    <input
      type="text"
      value={selectedName}
      onChange={(e) => setSelectedName(e.target.value)}
      placeholder="수급자 검색"
      className="p-1 bg-white border dark:bg-gray-800"
    />
    {/* 자동완성 드롭다운 */}
    {selectedName && (
      <ul className="absolute z-10 w-full overflow-y-auto bg-white border border-gray-300 text-black dark:bg-gray-800 dark:border-gray-600 dark:text-white max-h-40">
        {members
          .filter((m) => m.name.includes(selectedName) && m.name !== selectedName)
          .map((m, i) => (
            <li
              key={`${m.name}-${i}`}
              onClick={() => setSelectedName(m.name)}
              className="px-2 py-1 cursor-pointer text-black hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            >
              {m.name}
            </li>
          ))}
      </ul>
    )}
  </div>
  <button className="px-4 py-1 border">검색</button>
  <button className="px-4 py-1 border">수급지출력</button>
  {/* <button className="px-4 py-1 border">닫기</button> */}
</div>

      {/* 수급자 테이블 */}
      <div className="border max-h-[200px] overflow-y-auto overflow-x-hidden">
        <table className="w-full text-center min-w-[1024px]">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="border">수급자</th>
              <th className="border">성별</th>
              <th className="border">생일</th>
              <th className="border">상태</th>
              <th className="border">요양등급</th>
              <th className="border">장기요양인정번호</th>
              <th className="border">만료일자</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={`${m.name}-${i}`} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                <td className="px-2 border">{m.name}</td>
                <td className="px-2 border">{m.gender}</td>
                <td className="px-2 border">{m.birth}</td>
                <td className="px-2 border">{m.status}</td>
                <td className="px-2 border">{m.level}</td>
                <td className="px-2 border">{m.code}</td>
                <td className="px-2 border">{m.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 탭 */}
      <div className="flex space-x-4 border-b">
        {["개인정보", "보호자정보", "서비스계약정보"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 ${
              activeTab === tab
                ? "bg-white dark:bg-gray-900 border-t border-l border-r font-bold"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 개인정보 탭 */}
      {activeTab === "개인정보" && (
        <div className="p-4 space-y-4 bg-white border dark:bg-gray-900">
          <div className="flex gap-4">
            <input placeholder="집 전화번호" className="w-1/3 p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="핸드폰 번호" className="w-1/3 p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="집 주소" className="w-1/3 p-1 bg-white border dark:bg-gray-800" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>계약일자</span>
              <input type="date" value="2024-04-08" className="p-1 bg-white border dark:bg-gray-800" readOnly />
            </div>
            <div className="flex items-center gap-2">
              <span>입소일자</span>
              <input type="date" value="2024-04-08" className="p-1 bg-white border dark:bg-gray-800" readOnly />
            </div>
            <div className="flex items-center gap-2">
              <span>퇴소일자</span>
              <input type="date" className="p-1 bg-white border dark:bg-gray-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input placeholder="간호지시서번호" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="간호지시서정보" value="양수삼성병원재정간호사" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="이용병원" value="한울정신의학과의원" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="담당주치의" value="손정현" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="주치의연락처" value="010-3462-7033" className="col-span-2 p-1 bg-white border dark:bg-gray-800" />
          </div>

          <div className="flex justify-between mt-4">
            <button className="px-4 py-2 bg-gray-500">추가</button>
            <button className="px-4 py-2 bg-gray-500">수정</button>
            <button className="px-4 py-2 text-white bg-gray-500">수급자카드 출력</button>
          </div>
        </div>
      )}

      {/* 보호자정보 탭 */}
      {activeTab === "보호자정보" && (
        <div className="p-4 space-y-4 bg-white border dark:bg-gray-900">
          <div className="flex gap-4">
            <input placeholder="보호자성명" value="한옥" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="수급자와 관계" value="아들" className="p-1 bg-white border dark:bg-gray-800" />
            <label className="flex items-center gap-1">
              <span>계약자구분</span>
              <input type="checkbox" checked readOnly className="accent-gray-500 dark:accent-gray-300" />
            </label>
          </div>
          <input placeholder="보호자 우편번호" value="13587" className="w-full p-1 bg-white border dark:bg-gray-800" />
          <input placeholder="보호자 집주소" value="경기도 성남시 분당구 장미로 139 207동 202호." className="w-full p-1 bg-white border dark:bg-gray-800" />
          <div className="flex gap-4">
            <input placeholder="보호자 집전화번호" className="w-1/2 p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="보호자 핸드폰번호" value="010-9954-5678" className="w-1/2 p-1 bg-white border dark:bg-gray-800" />
          </div>
          <div className="flex justify-between mt-4">
            <button className="px-4 py-2 bg-gray-500">추가</button>
            <button className="px-4 py-2 bg-gray-500">수정</button>
            <button className="px-4 py-2 text-white bg-gray-500">삭제</button>
          </div>
        </div>
      )}

      {/* 서비스계약정보 탭 */}
      {activeTab === "서비스계약정보" && (
        <div className="p-4 space-y-4 bg-white border dark:bg-gray-900">
          <div className="flex gap-4">
            <input placeholder="계약일자" value="2024-04-08" className="p-1 bg-white border dark:bg-gray-800" readOnly />
            <input placeholder="계약종료일자" value="2026-03-28" className="p-1 bg-white border dark:bg-gray-800" readOnly />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="요양등급" value="3등급" className="p-1 bg-white border dark:bg-gray-800" readOnly />
            <input placeholder="보험자부담율(%)" value="80.0" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="수급자부담율(%)" value="20.0" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="수급자부담율구분" value="일반" className="p-1 bg-white border dark:bg-gray-800" readOnly />
            <input placeholder="비급여 식대 1회" value="4,000" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="비급여 간식비 1회" value="1,000" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="상급 병실료" value="10,000" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="등급외일일서비스비" className="p-1 bg-white border dark:bg-gray-800" />
            <input placeholder="기타 금액" className="col-span-2 p-1 bg-white border dark:bg-gray-800" />
          </div>
          <div className="flex justify-between mt-4">
            <button className="px-4 py-2 bg-gray-500">추가</button>
            <button className="px-4 py-2 bg-gray-500">수정</button>
            <button className="px-4 py-2 text-white bg-gray-500">삭제</button>
            <button className="px-4 py-2 text-white bg-gray-700">출력</button>
          </div>
        </div>
      )}
    </div>
  );
};