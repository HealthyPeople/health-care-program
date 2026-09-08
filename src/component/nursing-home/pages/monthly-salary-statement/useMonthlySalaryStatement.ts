"use client";

/**
 * @file 월 급여명세서 — 커스텀 훅 (useMonthlySalaryStatement.ts)
 *
 * @description
 * 요양원 월 급여명세서 기능의 커스텀 훅입니다. 폴더: component/nursing-home/pages/monthly-salary-statement
 *
 * @module component/nursing-home/pages/monthly-salary-statement/useMonthlySalaryStatement
 */
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
	openPrintPreviewWindow,
	buildSalaryOccurrencePrintHtml,
	buildStatementLedgerPrintHtml,
	wrapF24PrintHtml,
	buildBenefitStatement24Body,
	statementRowToV40100EFallback,
	buildPaymentConfirmation25PrintHtml,
	statementRowToV40100GFallback,
	lastDayOfPayYearMonth,
	normalizeSGu,
	LEDGER_DEFAULT_RECEIVE,
	type V40100PrintRow,
	type V40100DPrintRow,
	type V40100EPrintRow,
	type V40100GPrintRow,
	type LoginFacilityPrintInfo,
} from "./MonthlySalaryStatementPrint";
import {
	payYearMonthToSalmm,
	getPreviousYearMonthInput,
	f40100ToStatementRow,
	memberKey,
	mergeF40100WithF10010,
	mergeF40100FacilityFromF00110,
	TABS,
	TAB_TITLES,
	initialForm,
	loginFacilityDeliverer,
	type StatementRow,
	type StatementForm,
	type F10010Row,
} from "./MonthlySalaryStatementUtils";

export type { StatementRow, StatementForm } from "./MonthlySalaryStatementUtils";
export { TABS, TAB_TITLES } from "./MonthlySalaryStatementUtils";

export function useMonthlySalaryStatement() {
	const router = useRouter();
	const [payYearMonth, setPayYearMonth] = useState(() => getPreviousYearMonthInput());
	const [recipientFilter, setRecipientFilter] = useState("");
	const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"] | null>(null);
	const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
	const [formData, setFormData] = useState<StatementForm>(initialForm);
	const [formSnapshot, setFormSnapshot] = useState<StatementForm>(initialForm);
	const [formEditMode, setFormEditMode] = useState(false);
	const [selectedPnum, setSelectedPnum] = useState<string | null>(null);
	const [checkedPnums, setCheckedPnums] = useState<Set<string>>(() => new Set());
	const [loading, setLoading] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [facilityIssueDate, setFacilityIssueDate] = useState("");
	const [issueDateModalOpen, setIssueDateModalOpen] = useState(false);
	const [issueDateDraft, setIssueDateDraft] = useState("");
	const [facilityName, setFacilityName] = useState("");
	const [facilityInfo, setFacilityInfo] = useState<LoginFacilityPrintInfo | null>(null);

	const tabTitle = activeTab ? TAB_TITLES[activeTab] : TAB_TITLES.ledger;

	const filteredRows = useMemo(() => {
		const q = recipientFilter.trim().toLowerCase();
		if (!q) return statementRows;
		return statementRows.filter(
			(r) =>
				r.recipient.toLowerCase().includes(q) ||
				String(r.pnum ?? "")
					.toLowerCase()
					.includes(q)
		);
	}, [statementRows, recipientFilter]);

	const filteredPnums = useMemo(
		() => filteredRows.map((r) => r.pnum).filter((p) => p != null && String(p).trim() !== ""),
		[filteredRows]
	);

	const allFilteredChecked =
		filteredPnums.length > 0 && filteredPnums.every((p) => checkedPnums.has(p));
	const someFilteredChecked =
		filteredPnums.some((p) => checkedPnums.has(p)) && !allFilteredChecked;

	const toggleCheckedPnum = (pnum: string, next?: boolean) => {
		setCheckedPnums((prev) => {
			const n = new Set(prev);
			const shouldCheck = next ?? !n.has(pnum);
			if (shouldCheck) n.add(pnum);
			else n.delete(pnum);
			return n;
		});
	};

	const toggleSelectAllFiltered = () => {
		setCheckedPnums((prev) => {
			const n = new Set(prev);
			if (allFilteredChecked) {
				for (const p of filteredPnums) n.delete(p);
			} else {
				for (const p of filteredPnums) n.add(p);
			}
			return n;
		});
	};

	const printOccurrence = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch(`/api/v40100?salmm=${encodeURIComponent(salmm)}`);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100(발생내역서) 조회에 실패했습니다.");
				return;
			}
			let list: V40100PrintRow[] = Array.isArray(json.data) ? json.data : [];
			const q = recipientFilter.trim().toLowerCase();
			if (q) {
				list = list.filter(
					(r) =>
						r.recipient.toLowerCase().includes(q) ||
						String(r.PNUM ?? "")
							.toLowerCase()
							.includes(q)
				);
			}
			if (list.length === 0) {
				alert(
					q
						? "수급자 조건에 맞는 발생내역 데이터가 없습니다."
						: "해당 급여년월에 출력할 발생내역 데이터가 없습니다."
				);
				return;
			}
			const html = buildSalaryOccurrencePrintHtml(payYearMonth, list);
			openPrintPreviewWindow(html);
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "발생내역서 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, recipientFilter]);

	const printLedger = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch(`/api/v40100d?salmm=${encodeURIComponent(salmm)}`);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100D(발부대장) 조회에 실패했습니다.");
				return;
			}
			let list: V40100DPrintRow[] = Array.isArray(json.data) ? json.data : [];
			const q = recipientFilter.trim().toLowerCase();
			if (q) {
				list = list.filter(
					(r) =>
						r.recipient.toLowerCase().includes(q) ||
						String(r.PNUM ?? "")
							.toLowerCase()
							.includes(q)
				);
			}
			if (list.length === 0) {
				alert(
					q
						? "수급자 조건에 맞는 발부대장 데이터가 없습니다."
						: "해당 급여년월에 출력할 발부대장 데이터가 없습니다."
				);
				return;
			}
			const html = buildStatementLedgerPrintHtml(
				payYearMonth,
				list,
				{
					deliveryMethod: formData.deliveryMethod,
					deliverer: loginFacilityDeliverer(facilityName, formData.deliverer),
					recipientName: formData.recipientName,
					receiveContent: formData.receiveContent,
				},
				facilityIssueDate || undefined
			);
			openPrintPreviewWindow(html);
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "발부대장 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, recipientFilter, formData, facilityIssueDate, facilityName]);

	const printBenefitStatement = useCallback(async () => {
		const selectedRows = statementRows.filter((r) => checkedPnums.has(r.pnum));
		if (selectedRows.length === 0) {
			alert(
				"급여명세서는 목록에서 수급자를 한 명 이상 선택한 뒤 출력해 주세요. (체크박스 또는 전체선택)"
			);
			return;
		}
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const pnums = selectedRows.map((r) => r.pnum).join(",");
			const res = await fetch(
				`/api/v40100e?salmm=${encodeURIComponent(salmm)}&pnums=${encodeURIComponent(pnums)}`
			);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100E(급여명세서) 조회에 실패했습니다.");
				return;
			}
			const list: V40100EPrintRow[] = Array.isArray(json.data) ? json.data : [];
			const byPnum = new Map<string, V40100EPrintRow>();
			for (const d of list) {
				const k = String(d.PNUM ?? "").trim();
				if (k) byPnum.set(k, d);
			}
			const printRows = selectedRows.map((sr) => {
				const fromView = byPnum.get(String(sr.pnum).trim());
				if (fromView) {
					return { ...fromView, pSt: fromView.pSt || sr.pSt };
				}
				return statementRowToV40100EFallback(payYearMonth, sr);
			});
			const body = printRows
				.map(
					(row) =>
						`<div class="f24-page">${buildBenefitStatement24Body(payYearMonth, row, facilityInfo)}</div>`
				)
				.join("");
			openPrintPreviewWindow(wrapF24PrintHtml(body));
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "급여명세서 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, statementRows, checkedPnums, facilityInfo]);

	const printPaymentConfirmation = useCallback(async () => {
		const selectedRows = statementRows.filter((r) => checkedPnums.has(r.pnum));
		if (selectedRows.length === 0) {
			alert(
				"납부확인서는 목록에서 수급자를 한 명 이상 선택한 뒤 출력해 주세요. (체크박스 또는 전체선택)"
			);
			return;
		}
		const year = payYearMonth.length >= 4 ? payYearMonth.slice(0, 4) : "";
		if (!year) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const pnums = selectedRows.map((r) => r.pnum).join(",");
			const res = await fetch(
				`/api/v40100g?salyy=${encodeURIComponent(year)}&pnums=${encodeURIComponent(pnums)}`
			);
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "V40100G(납부확인) 조회에 실패했습니다.");
				return;
			}
			const list: V40100GPrintRow[] = Array.isArray(json.data) ? json.data : [];
			const byPnum = new Map<string, V40100GPrintRow>();
			for (const d of list) {
				const k = String(d.PNUM ?? "").trim();
				if (k) byPnum.set(k, d);
			}
			const printRows = selectedRows.map(
				(sr) => byPnum.get(String(sr.pnum).trim()) ?? statementRowToV40100GFallback(payYearMonth, sr)
			);
			const html = buildPaymentConfirmation25PrintHtml(payYearMonth, printRows, facilityInfo);
			openPrintPreviewWindow(html);
		} catch (e) {
			console.error(e);
			alert(e instanceof Error ? e.message : "납부확인서 출력 중 오류가 발생했습니다.");
		}
	}, [payYearMonth, statementRows, checkedPnums, facilityInfo]);

	const handleDocumentKindClick = useCallback(
		(id: (typeof TABS)[number]["id"]) => {
			if (id === "occurrence") {
				setActiveTab("occurrence");
				void printOccurrence();
				return;
			}
			if (id === "ledger") {
				setActiveTab("ledger");
				void printLedger();
				return;
			}
			if (id === "statement") {
				setActiveTab("statement");
				void printBenefitStatement();
				return;
			}
			if (id === "payment") {
				setActiveTab("payment");
				void printPaymentConfirmation();
				return;
			}
			setActiveTab(id);
		},
		[printOccurrence, printLedger, printBenefitStatement, printPaymentConfirmation]
	);

	const isOccurrenceView = activeTab === "occurrence";
	const handleSearch = useCallback(async () => {
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		setSearchError(null);
		setLoading(true);
		try {
			const [res401, res100, resFac] = await Promise.all([
				fetch(`/api/f40100?salmm=${encodeURIComponent(salmm)}`),
				fetch("/api/f10010"),
				fetch("/api/f00110"),
			]);

			const j401 = await res401.json();
			const j100 = await res100.json();
			const jFac = await resFac.json();

			if (!j401.success) {
				setSearchError(j401.error || "F40100 조회에 실패했습니다.");
				setStatementRows([]);
				return;
			}
			if (!j100.success) {
				setSearchError(j100.error || "F10010 조회에 실패했습니다. 급여만 표시합니다.");
			}

			const f401Rows: Record<string, unknown>[] = Array.isArray(j401.data) ? j401.data : [];
			const f100Rows: F10010Row[] = j100.success && Array.isArray(j100.data) ? j100.data : [];
			const facilityRow: Record<string, unknown> | null =
				jFac.success && Array.isArray(jFac.data) && jFac.data.length > 0
					? (jFac.data[0] as Record<string, unknown>)
					: jFac.success && jFac.data && !Array.isArray(jFac.data)
						? (jFac.data as Record<string, unknown>)
						: null;

			const byPnum = new Map<string, F10010Row>();
			for (const m of f100Rows) {
				const k = memberKey(m.PNUM);
				if (k) byPnum.set(k, m);
			}

			const facilityNameFromRow = String(facilityRow?.ANNM ?? "").trim();
			setFacilityName(facilityNameFromRow);
			setFacilityInfo(
				facilityRow
					? {
							name: facilityNameFromRow,
							code: String(facilityRow.ANGH ?? "").trim(),
							address: String(facilityRow.ANADD ?? "").trim(),
							businessNo: String(facilityRow.TAXNUM ?? "").trim(),
							representative: String(facilityRow.TAXOWN ?? "").trim(),
							tel: String(facilityRow.ANTEL ?? "").trim(),
							bankAccount: String(facilityRow.ETC ?? "").trim(),
						}
					: null
			);

			const merged = f401Rows.map((row) =>
				mergeF40100FacilityFromF00110(mergeF40100WithF10010(row, byPnum), facilityRow)
			);

			setStatementRows(merged.map((r) => f40100ToStatementRow(r)));
			setSelectedPnum(null);
			setCheckedPnums(new Set());
			const blank: StatementForm = {
				...initialForm,
				deliverer: loginFacilityDeliverer(facilityNameFromRow),
			};
			setFormData(blank);
			setFormSnapshot(blank);
			setFormEditMode(false);
		} catch (e) {
			console.error(e);
			setSearchError(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다.");
			setStatementRows([]);
		} finally {
			setLoading(false);
		}
	}, [payYearMonth]);

	useEffect(() => {
		void handleSearch();
	}, [handleSearch]);

	const confirmLeaveEditMode = useCallback((): boolean => {
		if (!formEditMode) return true;
		return window.confirm(
			"저장하지 않으면 수정된 내용이 저장되지 않습니다. 계속하시겠습니까?"
		);
	}, [formEditMode]);

	const discardEditAndLeave = useCallback(() => {
		setFormData(formSnapshot);
		setFormEditMode(false);
	}, [formSnapshot]);

	const handleClose = () => {
		router.back();
	};

	const handleEnterEdit = () => {
		if (!selectedPnum) {
			alert("수급자를 선택해주세요");
			return;
		}
		setFormSnapshot(formData);
		setFormEditMode(true);
	};

	const handleSave = async () => {
		if (!selectedPnum) {
			alert("수급자를 선택해주세요");
			return;
		}
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch("/api/f40100", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					salmm,
					pnum: selectedPnum,
					fields: {
						SNM: formData.deliverer.trim().slice(0, 20) || null,
						S_GU: normalizeSGu(formData.deliveryMethod),
						ENM: formData.recipientName.trim().slice(0, 20) || null,
						RDES: formData.receiveContent.trim().slice(0, 200) || null,
					},
				}),
			});
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "저장에 실패했습니다.");
				return;
			}
			setStatementRows((prev) =>
				prev.map((r) =>
					r.pnum === selectedPnum
						? {
								...r,
								snm: formData.deliverer.trim(),
								sGu: normalizeSGu(formData.deliveryMethod),
								enm: formData.recipientName.trim(),
								rdes: formData.receiveContent.trim(),
							}
						: r
				)
			);
			setFormSnapshot(formData);
			setFormEditMode(false);
			alert("저장되었습니다.");
		} catch (e) {
			console.error(e);
			alert("저장 중 오류가 발생했습니다.");
		}
	};

	const handleDelete = async () => {
		if (!selectedPnum) {
			alert("수급자를 선택해주세요");
			return;
		}
		if (!window.confirm("선택한 수급자의 발부 정보(전달방법·수령자·수령내용)를 삭제할까요?")) return;
		const salmm = payYearMonthToSalmm(payYearMonth);
		if (!salmm) {
			alert("급여년월을 선택해 주세요.");
			return;
		}
		try {
			const res = await fetch("/api/f40100", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					salmm,
					pnum: selectedPnum,
					fields: {
						SNM: null,
						S_GU: null,
						ENM: null,
						RDES: null,
					},
				}),
			});
			const json = await res.json();
			if (!json.success) {
				alert(json.error || "삭제에 실패했습니다.");
				return;
			}
			setStatementRows((prev) =>
				prev.map((r) =>
					r.pnum === selectedPnum
						? { ...r, snm: "", sGu: "", enm: "", rdes: "" }
						: r
				)
			);
			const blank: StatementForm = {
				...initialForm,
				deliverer: loginFacilityDeliverer(facilityName),
			};
			setFormData(blank);
			setFormSnapshot(blank);
			setFormEditMode(false);
			setSelectedPnum(null);
			alert("삭제되었습니다.");
		} catch (e) {
			console.error(e);
			alert("삭제 중 오류가 발생했습니다.");
		}
	};

	const handleRowClick = (row: StatementRow) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setSelectedPnum(row.pnum);
		toggleCheckedPnum(row.pnum, true);
		setFormEditMode(false);
		const next: StatementForm = {
			recipient: row.recipient,
			birthday: row.birthday,
			deliverer: loginFacilityDeliverer(facilityName, row.snm),
			deliveryMethod: row.sGu ? normalizeSGu(row.sGu) : "2",
			recipientName: row.enm,
			receiveContent: row.rdes || LEDGER_DEFAULT_RECEIVE,
		};
		setFormData(next);
		setFormSnapshot(next);
	};

	const handleCheckClick = (
		e: MouseEvent,
		row: StatementRow
	) => {
		e.stopPropagation();
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		const nextChecked = !checkedPnums.has(row.pnum);
		toggleCheckedPnum(row.pnum, nextChecked);
		if (nextChecked) {
			setSelectedPnum(row.pnum);
			setFormEditMode(false);
			const next: StatementForm = {
				recipient: row.recipient,
				birthday: row.birthday,
				deliverer: loginFacilityDeliverer(facilityName, row.snm),
				deliveryMethod: row.sGu ? normalizeSGu(row.sGu) : "2",
				recipientName: row.enm,
				receiveContent: row.rdes || LEDGER_DEFAULT_RECEIVE,
			};
			setFormData(next);
			setFormSnapshot(next);
		}
	};

	const handlePayYearMonthChange = (v: string) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setFacilityIssueDate("");
		setPayYearMonth(v);
	};

	const openIssueDateModal = () => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setIssueDateDraft(
			facilityIssueDate || lastDayOfPayYearMonth(payYearMonth) || ""
		);
		setIssueDateModalOpen(true);
	};

	const handleSaveFacilityIssueDate = () => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDateDraft)) {
			alert("발행일자를 YYYY-MM-DD 형식으로 선택해 주세요.");
			return;
		}
		setFacilityIssueDate(issueDateDraft);
		setIssueDateModalOpen(false);
		alert("발행일자가 일괄 저장되었습니다.");
	};

	const handleRecipientFilterChange = (v: string) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		setRecipientFilter(v);
	};

	const handleDocumentKindClickSafe = (id: (typeof TABS)[number]["id"]) => {
		if (formEditMode) {
			if (!confirmLeaveEditMode()) return;
			discardEditAndLeave();
		}
		handleDocumentKindClick(id);
	};


	return {
		TABS,
		activeTab,
		tabTitle,
		payYearMonth,
		recipientFilter,
		checkedPnums,
		facilityIssueDate,
		searchError,
		isOccurrenceView,
		loading,
		filteredRows,
		statementRows,
		filteredPnums,
		allFilteredChecked,
		someFilteredChecked,
		selectedPnum,
		formData,
		formEditMode,
		issueDateModalOpen,
		issueDateDraft,
		setIssueDateDraft,
		setIssueDateModalOpen,
		setFormData,
		handlePayYearMonthChange,
		handleRecipientFilterChange,
		openIssueDateModal,
		handleDocumentKindClickSafe,
		toggleSelectAllFiltered,
		handleRowClick,
		handleCheckClick,
		handleSave,
		discardEditAndLeave,
		handleEnterEdit,
		handleDelete,
		handleSaveFacilityIssueDate,
		facilityName,
	};
}
