"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type FacilityUserLinkDraft = {
	uid: string;
	empno: number | null;
	empnm: string;
	ugr: string;
	decyn: "Y" | "N";
	decpos: number | null;
};

type EmpSuggest = {
	EMPNO: number | string;
	EMPNM: string;
};

type Props = {
	customerName: string;
	uid: string;
	initial: FacilityUserLinkDraft;
	onCancel: () => void;
	onSaved: () => void;
	ancd: string | number;
};

export const UGR_OPTIONS = [
	{ code: "1", label: "1. 관리자-전체권한" },
	{ code: "2", label: "2. Program 사용권한" },
	{ code: "3", label: "3. 사원/수급자 사용권한" },
	{ code: "9", label: "9. 단순 자료 조회권한" },
] as const;

const DECPOS_OPTIONS = [1, 2, 3, 4];

const labelClass =
	"w-28 shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900 text-center";
const inputClass =
	"flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";
const readOnlyClass =
	"flex-1 rounded border border-blue-300 bg-gray-50 px-3 py-2 text-sm text-blue-900 focus:outline-none";

export default function FacilityUserLinkModal({
	customerName,
	uid,
	initial,
	onCancel,
	onSaved,
	ancd,
}: Props) {
	const [empnm, setEmpnm] = useState(initial.empnm || "");
	const [empno, setEmpno] = useState<number | null>(initial.empno);
	const [ugr, setUgr] = useState(initial.ugr || "1");
	const [decyn, setDecyn] = useState(initial.decyn === "Y");
	const [decpos, setDecpos] = useState<number | "">(
		initial.decpos != null && initial.decpos >= 1 && initial.decpos <= 4
			? initial.decpos
			: ""
	);
	const [saving, setSaving] = useState(false);

	const [empQuery, setEmpQuery] = useState(initial.empnm || "");
	const [suggestions, setSuggestions] = useState<EmpSuggest[]>([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const selectedEmpnoRef = useRef<number | null>(initial.empno);

	const searchEmployees = useCallback(async (name: string) => {
		setSearchLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set("ancd", String(ancd));
			const q = name.trim();
			if (q) qs.set("name", q);
			const res = await fetch(`/api/f01010?${qs.toString()}`, {
				credentials: "include",
				cache: "no-store",
			});
			const json = await res.json().catch(() => ({}));
			const list = Array.isArray(json?.data) ? json.data : [];
			const mapped: EmpSuggest[] = list
				.map((e: any) => ({
					EMPNO: e.EMPNO,
					EMPNM: String(e.EMPNM ?? "").trim(),
				}))
				.filter((e: EmpSuggest) => e.EMPNM)
				.sort((a: EmpSuggest, b: EmpSuggest) =>
					String(a.EMPNM).localeCompare(String(b.EMPNM), "ko")
				);
			setSuggestions(mapped);
		} catch {
			setSuggestions([]);
		} finally {
			setSearchLoading(false);
		}
	}, [ancd]);

	useEffect(() => {
		void searchEmployees(empQuery);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps — 최초 기관 소속 직원 로드

	useEffect(() => {
		if (selectedEmpnoRef.current != null && empQuery === empnm) return;
		const t = window.setTimeout(() => {
			void searchEmployees(empQuery);
		}, 250);
		return () => window.clearTimeout(t);
	}, [empQuery, empnm, searchEmployees]);

	useEffect(() => {
		const onDoc = (e: MouseEvent) => {
			if (!wrapRef.current?.contains(e.target as Node)) setShowDropdown(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);

	const filteredSuggestions = useMemo(() => {
		const q = empQuery.trim().toLowerCase();
		if (!q) return suggestions;
		return suggestions.filter((s) => s.EMPNM.toLowerCase().includes(q));
	}, [suggestions, empQuery]);

	const pickEmployee = (row: EmpSuggest) => {
		const no = row.EMPNO != null && row.EMPNO !== "" ? Number(row.EMPNO) : null;
		selectedEmpnoRef.current = Number.isFinite(no as number) ? (no as number) : null;
		setEmpno(selectedEmpnoRef.current);
		setEmpnm(row.EMPNM);
		setEmpQuery(row.EMPNM);
		setShowDropdown(false);
	};

	const handleSave = async () => {
		if (!ugr) {
			alert("관리등급을 선택해주세요.");
			return;
		}
		if (decyn && (decpos === "" || decpos == null)) {
			alert("결재권자인 경우 결재위치(1~4)를 선택해주세요.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/f00120", {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ANCD: ancd,
					UID: uid,
					action: "linkEmployee",
					EMPNO: empno,
					EMPNM: empnm.trim() || null,
					UGR: ugr,
					DECYN: decyn ? "Y" : "N",
					DECPOS: decpos === "" ? null : decpos,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || "저장에 실패했습니다.");
			}
			alert("사용자정보가 저장되었습니다.");
			onSaved();
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-3xl overflow-hidden rounded-lg border border-blue-400 bg-white shadow-xl">
				<div className="border-b border-blue-300 bg-blue-100 px-4 py-3 text-center text-lg font-semibold text-blue-900">
					사용자정보(ID) 등록
				</div>

				<div className="grid gap-4 p-4 md:grid-cols-[1.15fr_0.85fr]">
					{/* 좌측 폼 */}
					<div className="space-y-2.5">
						<div className="flex items-center gap-2">
							<span className={labelClass}>고객명</span>
							<input type="text" value={customerName} readOnly className={readOnlyClass} />
						</div>
						<div className="flex items-center gap-2">
							<span className={labelClass}>사용자ID</span>
							<input type="text" value={uid} readOnly className={readOnlyClass} />
						</div>
						<div className="flex items-start gap-2">
							<span className={`${labelClass} mt-0`}>사원명</span>
							<div className="relative flex-1" ref={wrapRef}>
								<input
									type="text"
									value={empQuery}
									onChange={(e) => {
										selectedEmpnoRef.current = null;
										setEmpno(null);
										setEmpnm("");
										setEmpQuery(e.target.value);
										setShowDropdown(true);
									}}
									onFocus={() => {
										setShowDropdown(true);
										void searchEmployees(empQuery);
									}}
									placeholder="사원명 검색 후 선택"
									className={inputClass}
									autoComplete="off"
								/>
								{showDropdown ? (
									<ul className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-auto rounded border border-blue-300 bg-white shadow-lg">
										{searchLoading ? (
											<li className="px-3 py-2 text-sm text-blue-900/60">검색 중…</li>
										) : filteredSuggestions.length === 0 ? (
											<li className="px-3 py-2 text-sm text-blue-900/60">검색 결과 없음</li>
										) : (
											filteredSuggestions.map((emp, i) => (
												<li
													key={`${emp.EMPNO}-${i}`}
													className="cursor-pointer px-3 py-2 text-sm text-blue-900 hover:bg-blue-50"
													onMouseDown={(e) => {
														e.preventDefault();
														pickEmployee(emp);
													}}
												>
													{emp.EMPNM}
													<span className="ml-2 text-xs text-blue-900/50">({emp.EMPNO})</span>
												</li>
											))
										)}
									</ul>
								) : null}
								{empnm ? (
									<p className="mt-1 text-xs text-blue-800/70">
										선택됨: {empnm}
										{empno != null ? ` · 사원번호 ${empno}` : ""}
									</p>
								) : (
									<p className="mt-1 text-xs text-blue-800/60">해당 기관 소속 직원만 표시됩니다.</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span className={labelClass}>관리등급</span>
							<select
								value={ugr}
								onChange={(e) => setUgr(e.target.value)}
								className={inputClass}
							>
								{UGR_OPTIONS.map((o) => (
									<option key={o.code} value={o.code}>
										{o.label}
									</option>
								))}
							</select>
						</div>
						<div className="flex items-center gap-2">
							<span className={labelClass}>결재권자</span>
							<label className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
								<input
									type="checkbox"
									checked={decyn}
									onChange={(e) => setDecyn(e.target.checked)}
									className="h-4 w-4 accent-blue-600"
								/>
								결재권자 (DECYN={decyn ? "Y" : "N"})
							</label>
						</div>
						<div className="flex items-center gap-2">
							<span className={labelClass}>결재위치</span>
							<select
								value={decpos === "" ? "" : String(decpos)}
								onChange={(e) => {
									const v = e.target.value;
									setDecpos(v === "" ? "" : Number(v));
								}}
								className={`${inputClass} max-w-[8rem]`}
							>
								<option value="">선택</option>
								{DECPOS_OPTIONS.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
							<span className="text-xs text-blue-900/70">범위 1 ~ 4</span>
						</div>
					</div>

					{/* 우측 안내 */}
					<div className="rounded border border-blue-200 bg-blue-50/60 p-3 text-sm leading-relaxed text-blue-900">
						<p className="mb-2 font-semibold">사용자 ID 작성 규칙</p>
						<ol className="mb-3 list-decimal space-y-1 pl-5">
							<li>
								관리자 : admin + 일련번호 2자리
								<br />
								<span className="text-blue-800/80">예) admin01</span>
							</li>
							<li>
								프로그램사용자 : usprg + 일련번호 2자리
								<br />
								<span className="text-blue-800/80">예) usprg01</span>
							</li>
							<li>
								사원/환자사용자 : usvst + 일련번호 2자리
								<br />
								<span className="text-blue-800/80">예) usvst01</span>
							</li>
						</ol>
						<p className="mb-1">
							<span className="font-semibold">초기암호</span> : Abc54321
						</p>
						<p>
							<span className="font-semibold">결재위치</span> : 1 ~ 4
						</p>
					</div>
				</div>

				<div className="flex items-center justify-center gap-3 border-t border-blue-200 bg-blue-50/40 px-4 py-3">
					<button
						type="button"
						onClick={() => void handleSave()}
						disabled={saving}
						className="min-w-[12rem] rounded border border-blue-500 bg-blue-500 px-8 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
					>
						{saving ? "저장 중…" : "저장"}
					</button>
					<button
						type="button"
						onClick={onCancel}
						disabled={saving}
						className="min-w-[6rem] rounded border border-blue-400 bg-blue-100 px-6 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-200 disabled:opacity-50"
					>
						닫기
					</button>
				</div>
			</div>
		</div>
	);
}
