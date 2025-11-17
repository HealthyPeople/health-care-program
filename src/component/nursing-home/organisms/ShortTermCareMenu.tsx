"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Sections3 } from '../menuData';

// 단기보호 메뉴 데이터 (추후 확장 가능)
const shortTermCareMenuData: Sections3 = {
  '단기보호 관리': {
    '기본 관리': [
      { name: '회원 정보 관리', link: '/shortTermCare/member-info' },
      { name: '서비스 제공 내역', link: '/shortTermCare/service-record' },
    ],
  },
};

export default function ShortTermCareMenu() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return shortTermCareMenuData;
    const q = query.trim().toLowerCase();
    const result: Sections3 = {};
    Object.entries(shortTermCareMenuData).forEach(([sectionTitle, groupsObj]) => {
      const groupFiltered: Record<string, { name: string; link: string }[]> = {};
      Object.entries(groupsObj).forEach(([groupTitle, items]) => {
        const hits = items.filter((it) => it.name.toLowerCase().includes(q));
        if (hits.length) groupFiltered[groupTitle] = hits;
      });
      if (Object.keys(groupFiltered).length) result[sectionTitle] = groupFiltered;
    });
    return result;
  }, [query]);

  const hasQuery = query.trim().length > 0;

  const handleOpenTab = (href: string, title: string) => {
    window.dispatchEvent(new CustomEvent('NH_OPEN_TAB', { detail: { href, title } }));
  };

  const makeGroupKey = (section: string, group: string) => `${section}::${group}`;

  return (
    <nav className="w-64 min-h-screen bg-white border-r border-gray-200 p-4">
      {/* 메뉴 검색 */}
      <div className="mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="메뉴 검색"
          className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <ul>
        {Object.entries(filtered).map(([sectionTitle, groupsObj]) => (
          <li key={sectionTitle} className="mb-2">
            {/* 대분류 */}
            <button
              className="flex items-center w-full px-3 py-2 text-left font-semibold text-blue-700 hover:bg-blue-50 rounded transition"
              onClick={() => !hasQuery && setOpenSection(openSection === sectionTitle ? null : sectionTitle)}
              aria-expanded={hasQuery ? true : openSection === sectionTitle}
            >
              <span className="flex-1">{sectionTitle}</span>
              <svg
                className={`w-4 h-4 ml-2 transition-transform ${hasQuery || openSection === sectionTitle ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {(hasQuery || openSection === sectionTitle) && (
              <ul className="mt-1 ml-2">
                {Object.entries(groupsObj).map(([groupTitle, items]) => {
                  const gKey = makeGroupKey(sectionTitle, groupTitle);
                  return (
                    <li key={gKey} className="mb-1">
                      {/* 중분류 */}
                      <button
                        className="flex items-center w-full px-3 py-1.5 text-left text-blue-700 hover:bg-blue-50 rounded"
                        onClick={() => !hasQuery && setOpenGroupKey(openGroupKey === gKey ? null : gKey)}
                        aria-expanded={hasQuery ? true : openGroupKey === gKey}
                      >
                        <span className="flex-1 text-sm font-medium">{groupTitle}</span>
                        <svg
                          className={`w-3.5 h-3.5 ml-2 transition-transform ${hasQuery || openGroupKey === gKey ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {(hasQuery || openGroupKey === gKey) && (
                        <ul className="mt-1 ml-3 border-l border-blue-100 pl-2">
                          {items.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.link}
                                className="block px-2 py-1 text-gray-700 hover:text-blue-500 hover:bg-blue-50 rounded"
                                onClick={() => handleOpenTab(item.link, item.name)}
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
        {Object.keys(filtered).length === 0 && (
          <li className="text-sm text-gray-400 px-2 py-2">검색 결과가 없습니다</li>
        )}
      </ul>
    </nav>
  );
}

