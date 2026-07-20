"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type TabKey = "customer" | "tax" | "service";

interface F00110Row {
	ANCD?: string | number;
	ANNM?: string;
	ANGH?: string;
	ANSDT?: string;
	ANEDT?: string;
	ANZIP?: string;
	ANADD?: string;
	ANTEL?: string;
	ANFAX?: string;
	ANDOMAIN?: string;
	ANEMAIL?: string;
	ANHP?: string;
	MNM?: string;
	ANAMT?: number | string;
	TAXYN?: string;
	TAXNM?: string;
	TAXOWN?: string;
	TAXNUM?: string;
	TAXADD?: string;
	TAXJOB?: string;
	TAXJOB1?: string;
	TAXEMAIL1?: string;
	TAXEMAIL2?: string;
	TAXEMAIL3?: string;
	ETC?: string;
	SECYN?: string;
	MAXCNT?: number | string;
	D_LVL?: number | string;
	TRANS_GU?: string;
	TRANS_OBJ3?: string;
	RDES?: string;
	B_EAMT?: number | string;
	B_ETAMT?: number | string;
	MSG_DUE_DD?: number | string;
	PWDD?: number | string;
	SRV_DESC?: string;
	S_GU?: string;
	[key: string]: unknown;
}

interface F90030Row {
	OBJ3: string;
	OBJ3NM?: string;
	ICD?: string;
}

interface F01002Row {
	CODE: string;
	UCD: string;
	DSC1?: string;
	DSC2?: string;
}

interface CustomerBasicForm {
	facilityCode: string;
	centerCapacity: string;
	securityEnabled: boolean;
	approvalLevel: string;
	transferSlip: boolean;
	transferAccount: string;
	transferAccountName: string;
	mealFee: string;
	snackFee: string;
	useStartDate: string;
	useEndDate: string;
	managerName: string;
	managerMobile: string;
	phone: string;
	fax: string;
	zip: string;
	address: string;
	domain: string;
	email: string;
	paymentAmount: string;
	pwChangeDays: string;
	depositAccountDesc: string;
	depositAccountNo: string;
	depositCode: string;
	contractNoticeDays: string;
}

interface TaxInvoiceForm {
	issue: "Y" | "N";
	companyName: string;
	ceoName: string;
	bizNo: string;
	address: string;
	bizType: string;
	bizItem: string;
	email1: string;
	email2: string;
	email3: string;
}

interface ServiceGuideForm {
	content: string;
}

const DEPOSIT_CODE = "KM";

const labelClass =
	"shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-2 text-sm font-medium text-blue-900";
const inputClass =
	"rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none";

function toText(v: unknown): string {
	if (v == null) return "";
	return String(v).trim();
}

function formatDateYmd(v: unknown): string {
	if (v == null || v === "") return "";
	const s = String(v).trim();
	if (!s) return "";
	if (s.includes("T")) return s.split("T")[0].slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function ynToBool(v: unknown): boolean {
	const s = String(v ?? "").trim().toUpperCase();
	return s === "Y" || s === "1" || s === "T";
}

function boolToYn(v: boolean): string {
	return v ? "Y" : "N";
}

function ancdEquals(a: unknown, b: unknown): boolean {
	if (a == null || b == null) return false;
	return String(a).trim() === String(b).trim();
}

type UserInfo = {
	ancd?: string | number;
	annm?: string;
	uid?: string;
	empnm?: string;
	[key: string]: unknown;
};

const emptyCustomerForm = (): CustomerBasicForm => ({
	facilityCode: "",
	centerCapacity: "",
	securityEnabled: false,
	approvalLevel: "1",
	transferSlip: false,
	transferAccount: "",
	transferAccountName: "",
	mealFee: "",
	snackFee: "",
	useStartDate: "",
	useEndDate: "",
	managerName: "",
	managerMobile: "",
	phone: "",
	fax: "",
	zip: "",
	address: "",
	domain: "",
	email: "",
	paymentAmount: "",
	pwChangeDays: "90",
	depositAccountDesc: "",
	depositAccountNo: "",
	depositCode: "",
	contractNoticeDays: "",
});

const emptyTaxForm = (): TaxInvoiceForm => ({
	issue: "N",
	companyName: "",
	ceoName: "",
	bizNo: "",
	address: "",
	bizType: "",
	bizItem: "",
	email1: "",
	email2: "",
	email3: "",
});

type FormSnapshot = {
	facilityName: string;
	customerForm: CustomerBasicForm;
	taxForm: TaxInvoiceForm;
	serviceForm: ServiceGuideForm;
};

export default function FacilityBasicInfo() {
	const [activeTab, setActiveTab] = useState<TabKey>("customer");
	const [facilityName, setFacilityName] = useState("");
	const [sessionAncd, setSessionAncd] = useState<string | number | null>(null);
	const [ancd, setAncd] = useState<string | number | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editSnapshot, setEditSnapshot] = useState<FormSnapshot | null>(null);

	const [customerForm, setCustomerForm] = useState<CustomerBasicForm>(emptyCustomerForm);
	const [taxForm, setTaxForm] = useState<TaxInvoiceForm>(emptyTaxForm);
	const [serviceForm, setServiceForm] = useState<ServiceGuideForm>({ content: "" });

	const [accountList, setAccountList] = useState<F90030Row[]>([]);
	const [depositCodes, setDepositCodes] = useState<F01002Row[]>([]);

	const fieldsDisabled = !isEditing || loading || !sessionAncd;

	const mapRowToForms = useCallback((row: F00110Row, codes: F01002Row[] = depositCodes) => {
		setFacilityName(toText(row.ANNM));
		setAncd(row.ANCD ?? null);

		const etc = toText(row.ETC);
		let depositCode = "";
		const matchedDeposit = codes.find(
			(c) => c.UCD === etc || `${c.CODE}${c.UCD}` === etc || toText(c.DSC1) === etc
		);
		if (matchedDeposit) depositCode = matchedDeposit.UCD;
		else if (etc.length <= 2) depositCode = etc;

		setCustomerForm({
			facilityCode: toText(row.ANGH),
			centerCapacity: toText(row.MAXCNT),
			securityEnabled: ynToBool(row.SECYN),
			approvalLevel: toText(row.D_LVL) || "1",
			transferSlip: ynToBool(row.TRANS_GU),
			transferAccount: toText(row.TRANS_OBJ3),
			transferAccountName: "",
			mealFee: toText(row.B_EAMT),
			snackFee: toText(row.B_ETAMT),
			useStartDate: formatDateYmd(row.ANSDT),
			useEndDate: formatDateYmd(row.ANEDT),
			managerName: toText(row.MNM),
			managerMobile: toText(row.ANHP),
			phone: toText(row.ANTEL),
			fax: toText(row.ANFAX),
			zip: toText(row.ANZIP),
			address: toText(row.ANADD),
			domain: toText(row.ANDOMAIN),
			email: toText(row.ANEMAIL),
			paymentAmount: toText(row.ANAMT),
			pwChangeDays: toText(row.PWDD) || "90",
			depositAccountDesc: toText(row.RDES),
			depositAccountNo: depositCode ? "" : etc,
			depositCode,
			contractNoticeDays: toText(row.MSG_DUE_DD),
		});

		const taxYn = String(row.TAXYN ?? "N").trim().toUpperCase();
		setTaxForm({
			issue: taxYn === "Y" ? "Y" : "N",
			companyName: toText(row.TAXNM),
			ceoName: toText(row.TAXOWN),
			bizNo: toText(row.TAXNUM),
			address: toText(row.TAXADD),
			bizType: toText(row.TAXJOB),
			bizItem: toText(row.TAXJOB1),
			email1: toText(row.TAXEMAIL1),
			email2: toText(row.TAXEMAIL2),
			email3: toText(row.TAXEMAIL3),
		});

		setServiceForm({ content: toText(row.SRV_DESC) });
	}, [depositCodes]);

	const resolveTransferAccountName = useCallback(
		(obj3: string) => {
			if (!obj3) return "";
			const found = accountList.find((a) => a.OBJ3 === obj3);
			return found?.OBJ3NM ?? "";
		},
		[accountList]
	);

	const loadReferenceData = async (): Promise<{
		accounts: F90030Row[];
		codes: F01002Row[];
	}> => {
		const [accRes, codeRes] = await Promise.all([
			fetch("/api/f90030?icd=CA"),
			fetch(`/api/f01002?code=${encodeURIComponent(DEPOSIT_CODE)}`),
		]);
		const accJson = await accRes.json().catch(() => ({}));
		const codeJson = await codeRes.json().catch(() => ({}));

		let accounts: F90030Row[] = [];
		let codes: F01002Row[] = [];

		if (accRes.ok && accJson?.success && Array.isArray(accJson.data)) {
			accounts = accJson.data as F90030Row[];
		} else {
			const allRes = await fetch("/api/f90030");
			const allJson = await allRes.json().catch(() => ({}));
			if (allRes.ok && allJson?.success) {
				accounts = (allJson.data || []) as F90030Row[];
			}
		}

		if (codeRes.ok && codeJson?.success && Array.isArray(codeJson.data)) {
			codes = codeJson.data as F01002Row[];
		} else {
			const allCodeRes = await fetch("/api/f01002");
			const allCodeJson = await allCodeRes.json().catch(() => ({}));
			if (allCodeRes.ok && allCodeJson?.success) {
				codes = (allCodeJson.data || []) as F01002Row[];
			}
		}

		setAccountList(accounts);
		setDepositCodes(codes);
		return { accounts, codes };
	};

	const loadFacility = async (
		loginAncd: string | number,
		ref?: { accounts?: F90030Row[]; codes?: F01002Row[] }
	) => {
		const res = await fetch(
			`/api/f00110?ancd=${encodeURIComponent(String(loginAncd))}`,
			{ method: "GET", credentials: "include" }
		);
		const result = await res.json().catch(() => ({}));
		if (res.status === 401) {
			throw new Error("로그인이 필요합니다.");
		}
		if (!res.ok || !result?.success) {
			throw new Error(result?.error || "고객정보 조회 실패");
		}
		const list = Array.isArray(result.data) ? result.data : [];
		const row = (list[0] || null) as F00110Row | null;
		if (!row) {
			setLoadError(`고객코드(${loginAncd})에 해당하는 센터 정보가 없습니다.`);
			return;
		}
		if (!ancdEquals(row.ANCD, loginAncd)) {
			throw new Error("로그인 센터와 조회된 데이터가 일치하지 않습니다.");
		}
		setLoadError(null);
		mapRowToForms(row, ref?.codes ?? []);
		const transObj3 = toText(row.TRANS_OBJ3);
		const accounts = ref?.accounts ?? accountList;
		if (transObj3) {
			const found = accounts.find((a) => a.OBJ3 === transObj3);
			if (found?.OBJ3NM) {
				setCustomerForm((p) => ({
					...p,
					transferAccount: transObj3,
					transferAccountName: String(found.OBJ3NM),
				}));
			} else {
				const nmRes = await fetch(`/api/f90030?obj3=${encodeURIComponent(transObj3)}`);
				const nmJson = await nmRes.json().catch(() => ({}));
				const nm = nmRes.ok && nmJson?.data?.[0]?.OBJ3NM;
				setCustomerForm((p) => ({
					...p,
					transferAccount: transObj3,
					transferAccountName: nm ? String(nm) : resolveTransferAccountName(transObj3),
				}));
			}
		}
	};

	const initializePage = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const userRes = await fetch("/api/auth/user-info", {
				method: "GET",
				credentials: "include",
			});
			const userJson = await userRes.json().catch(() => ({}));
			if (!userRes.ok || !userJson?.success) {
				throw new Error(userJson?.error || "로그인 정보를 확인할 수 없습니다.");
			}
			const user = (userJson.data || {}) as UserInfo;
			const loginAncd = user.ancd;
			if (loginAncd == null || loginAncd === "") {
				throw new Error("로그인 계정의 센터(고객코드)를 확인할 수 없습니다.");
			}

			setSessionAncd(loginAncd);
			setAncd(loginAncd);
			if (user.annm) setFacilityName(String(user.annm));

			const ref = await loadReferenceData();
			await loadFacility(loginAncd, ref);
		} catch (err) {
			console.error("센터 정보 초기화 오류:", err);
			const msg =
				err instanceof Error ? err.message : "센터 정보를 불러오는 중 오류가 발생했습니다.";
			setLoadError(msg);
			alert(msg);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		void initializePage();
	}, [initializePage]);

	useEffect(() => {
		const nm = resolveTransferAccountName(customerForm.transferAccount);
		if (nm && nm !== customerForm.transferAccountName) {
			setCustomerForm((p) => ({ ...p, transferAccountName: nm }));
		}
	}, [customerForm.transferAccount, accountList, resolveTransferAccountName, customerForm.transferAccountName]);

	const depositDescFromCode = useMemo(() => {
		if (!customerForm.depositCode) return customerForm.depositAccountDesc;
		const row = depositCodes.find((c) => c.UCD === customerForm.depositCode);
		if (!row) return customerForm.depositAccountDesc;
		return [row.DSC1, row.DSC2].filter(Boolean).join("\n") || customerForm.depositAccountDesc;
	}, [customerForm.depositCode, customerForm.depositAccountDesc, depositCodes]);

	const buildCustomerPayload = () => {
		const depositEtc = customerForm.depositCode || customerForm.depositAccountNo || null;
		return {
			ANCD: ancd,
			ANNM: facilityName || null,
			ANGH: customerForm.facilityCode || null,
			MAXCNT: customerForm.centerCapacity || null,
			SECYN: boolToYn(customerForm.securityEnabled),
			D_LVL: customerForm.approvalLevel || null,
			TRANS_GU: boolToYn(customerForm.transferSlip),
			TRANS_OBJ3: customerForm.transferAccount || null,
			B_EAMT: customerForm.mealFee || null,
			B_ETAMT: customerForm.snackFee || null,
			ANSDT: customerForm.useStartDate || null,
			ANEDT: customerForm.useEndDate || null,
			MNM: customerForm.managerName || null,
			ANHP: customerForm.managerMobile || null,
			ANTEL: customerForm.phone || null,
			ANFAX: customerForm.fax || null,
			ANZIP: customerForm.zip || null,
			ANADD: customerForm.address || null,
			ANDOMAIN: customerForm.domain || null,
			ANEMAIL: customerForm.email || null,
			ANAMT: customerForm.paymentAmount || null,
			PWDD: customerForm.pwChangeDays || null,
			RDES: customerForm.depositAccountDesc || depositDescFromCode || null,
			ETC: depositEtc,
			MSG_DUE_DD: customerForm.contractNoticeDays || null,
		};
	};

	const buildTaxPayload = () => ({
		TAXYN: taxForm.issue,
		TAXNM: taxForm.companyName || null,
		TAXOWN: taxForm.ceoName || null,
		TAXNUM: taxForm.bizNo || null,
		TAXADD: taxForm.address || null,
		TAXJOB: taxForm.bizType || null,
		TAXJOB1: taxForm.bizItem || null,
		TAXEMAIL1: taxForm.email1 || null,
		TAXEMAIL2: taxForm.email2 || null,
		TAXEMAIL3: taxForm.email3 || null,
	});

	const buildServicePayload = () => ({
		SRV_DESC: serviceForm.content || null,
	});

	const saveF00110 = async (payload: Record<string, unknown>) => {
		const saveAncd = sessionAncd ?? ancd;
		if (!saveAncd) throw new Error("저장할 센터(고객코드)를 확인할 수 없습니다.");

		const res = await fetch(
			`/api/f00110?ancd=${encodeURIComponent(String(saveAncd))}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ ANCD: saveAncd, ANNM: facilityName, ...payload }),
			}
		);
		const result = await res.json().catch(() => ({}));
		if (!res.ok || !result?.success) {
			throw new Error(result?.error || "저장에 실패했습니다.");
		}
	};

	const captureSnapshot = (): FormSnapshot => ({
		facilityName,
		customerForm: { ...customerForm },
		taxForm: { ...taxForm },
		serviceForm: { ...serviceForm },
	});

	const applySnapshot = (snap: FormSnapshot) => {
		setFacilityName(snap.facilityName);
		setCustomerForm({ ...snap.customerForm });
		setTaxForm({ ...snap.taxForm });
		setServiceForm({ ...snap.serviceForm });
	};

	const handleEnterEdit = () => {
		if (!sessionAncd) {
			alert("로그인 센터 정보를 확인할 수 없습니다.");
			return;
		}
		setEditSnapshot(captureSnapshot());
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		const ok = window.confirm(
			"저장하지 않으면 수정한 내용은 저장되지 않습니다. 취소하시겠습니까?"
		);
		if (!ok) return;
		if (editSnapshot) applySnapshot(editSnapshot);
		setEditSnapshot(null);
		setIsEditing(false);
	};

	const finishSaveSuccess = async (message: string) => {
		alert(message);
		if (sessionAncd) await loadFacility(sessionAncd, { accounts: accountList, codes: depositCodes });
		setEditSnapshot(null);
		setIsEditing(false);
	};

	const handleSaveCustomer = async () => {
		if (!isEditing) return;
		if (!ancd) {
			alert("고객코드(ANCD)를 확인할 수 없습니다.");
			return;
		}
		setSaving(true);
		try {
			await saveF00110(buildCustomerPayload());
			await finishSaveSuccess("고객기본 정보가 저장되었습니다.");
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleSaveTax = async () => {
		if (!isEditing) return;
		if (!ancd) {
			alert("고객코드(ANCD)를 확인할 수 없습니다.");
			return;
		}
		setSaving(true);
		try {
			await saveF00110(buildTaxPayload());
			await finishSaveSuccess("세금계산서 정보가 저장되었습니다.");
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleSaveService = async () => {
		if (!isEditing) return;
		if (!ancd) {
			alert("고객코드(ANCD)를 확인할 수 없습니다.");
			return;
		}
		setSaving(true);
		try {
			await saveF00110(buildServicePayload());
			await finishSaveSuccess("서비스안내가 저장되었습니다.");
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setSaving(false);
		}
	};

	const handleTransferAccountChange = (obj3: string) => {
		setCustomerForm((p) => ({
			...p,
			transferAccount: obj3,
			transferAccountName: resolveTransferAccountName(obj3),
		}));
	};

	const handleDepositCodeChange = (ucd: string) => {
		const row = depositCodes.find((c) => c.UCD === ucd);
		const desc = row ? [row.DSC1, row.DSC2].filter(Boolean).join("\n") : "";
		setCustomerForm((p) => ({
			...p,
			depositCode: ucd,
			depositAccountNo: "",
			depositAccountDesc: desc || p.depositAccountDesc,
		}));
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const tabs = useMemo(
		() => [
			{ key: "customer" as const, label: "고객기본" },
			{ key: "tax" as const, label: "세금계산서" },
			{ key: "service" as const, label: "서비스안내" },
		],
		[]
	);

	const accountOptions = useMemo(
		() =>
			accountList.map((a) => ({
				value: a.OBJ3,
				label: `${a.OBJ3} ${a.OBJ3NM ?? ""}`.trim(),
			})),
		[accountList]
	);

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50/50 p-4">
				<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-lg font-semibold text-blue-900">
					센터 조회
				</h1>

				{sessionAncd != null && (
					<span className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900">
						로그인 센터 · 고객코드 <strong>{String(sessionAncd)}</strong>
					</span>
				)}

				<div className="flex items-center gap-2 flex-1 min-w-[280px]">
					<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 shrink-0">
						장기요양기관명
					</span>
					<input
						type="text"
						value={facilityName}
						onChange={(e) => setFacilityName(e.target.value)}
						disabled={fieldsDisabled}
						readOnly={!isEditing}
						className={`${inputClass} flex-1 ${!isEditing ? "bg-gray-50" : ""}`}
					/>
				</div>

				<div className="ml-auto flex flex-wrap items-center gap-2">
					{!isEditing ? (
						<p className="text-xs text-blue-800/70 mr-1">읽기모드 · 「수정」을 눌러 편집할 수 있습니다.</p>
					) : (
						<p className="text-xs text-green-800 mr-1">수정모드 · 변경 후 「저장」으로 반영합니다.</p>
					)}
					{isEditing ? (
						<button
							type="button"
							onClick={handleCancelEdit}
							disabled={loading || saving}
							className="rounded border border-red-400 bg-red-200 px-5 py-2 text-sm font-medium text-red-900 hover:bg-red-300 disabled:opacity-50"
						>
							취소
						</button>
					) : (
						<button
							type="button"
							onClick={handleEnterEdit}
							disabled={loading || saving || !sessionAncd}
							className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						>
							수정
						</button>
					)}
					{/* <button
						type="button"
						className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
						disabled
						title="별도 화면 연동 예정"
					>
						사용자(ID)계정
					</button> */}
					{/* <button
						type="button"
						onClick={handleClose}
						className="rounded border border-blue-400 bg-blue-200 px-5 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
					>
						닫기
					</button> */}
				</div>
			</div>

			{loading && (
				<p className="px-4 py-2 text-sm text-blue-800/70">로그인 센터 정보를 불러오는 중…</p>
			)}
			{!loading && loadError && (
				<p className="px-4 py-2 text-sm text-red-700">{loadError}</p>
			)}

			<div className="px-4 pt-3">
				<div className="flex gap-2">
					{tabs.map((t) => {
						const isActive = t.key === activeTab;
						return (
							<button
								key={t.key}
								type="button"
								onClick={() => setActiveTab(t.key)}
								className={`rounded-t border px-4 py-2 text-sm font-medium ${
									isActive
										? "border-blue-300 bg-white text-blue-900"
										: "border-blue-200 bg-blue-50 text-blue-900/70 hover:bg-blue-100"
								}`}
							>
								{t.label}
							</button>
						);
					})}
				</div>
				<div className="rounded-b rounded-tr border border-blue-300 bg-white p-4">
					<fieldset
						disabled={fieldsDisabled}
						className="min-w-0 border-0 p-0 m-0 disabled:opacity-100 [&_input]:disabled:bg-gray-50 [&_select]:disabled:bg-gray-50 [&_textarea]:disabled:bg-gray-50"
					>
					{activeTab === "customer" && (
						<div className="space-y-3">
							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>장기요양기관기호</label>
									<input
										value={customerForm.facilityCode}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, facilityCode: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>센터 정원</label>
									<input
										value={customerForm.centerCapacity}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, centerCapacity: e.target.value }))
										}
										className={`${inputClass} w-36 text-right`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>보안적용</label>
									<input
										type="checkbox"
										checked={customerForm.securityEnabled}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, securityEnabled: e.target.checked }))
										}
										className="h-5 w-5 accent-blue-600"
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>결재 레벨</label>
									<input
										value={customerForm.approvalLevel}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, approvalLevel: e.target.value }))
										}
										className={`${inputClass} w-20 text-right`}
									/>
									<span className="text-sm text-blue-900/70">범위 : 1 ~ 4</span>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>수급전표이관</label>
									<input
										type="checkbox"
										checked={customerForm.transferSlip}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, transferSlip: e.target.checked }))
										}
										className="h-5 w-5 accent-blue-600"
									/>
									<label className={`${labelClass} w-28`}>수급이관계정</label>
									<select
										value={customerForm.transferAccount}
										onChange={(e) => handleTransferAccountChange(e.target.value)}
										className={`${inputClass} w-44`}
									>
										<option value="">선택</option>
										{accountOptions.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
									<input
										value={customerForm.transferAccount}
										onChange={(e) => handleTransferAccountChange(e.target.value)}
										placeholder="계정코드"
										className={`${inputClass} w-32`}
									/>
									<input
										value={customerForm.transferAccountName}
										readOnly
										placeholder="계정명"
										className={`${inputClass} flex-1 min-w-[160px] bg-gray-50`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>식대</label>
									<input
										value={customerForm.mealFee}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, mealFee: e.target.value }))
										}
										className={`${inputClass} w-28 text-right`}
									/>
									<label className={`${labelClass} w-28`}>간식비</label>
									<input
										value={customerForm.snackFee}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, snackFee: e.target.value }))
										}
										className={`${inputClass} w-28 text-right`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>사용기간</label>
									<input
										type="date"
										value={customerForm.useStartDate}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, useStartDate: e.target.value }))
										}
										className={`${inputClass} w-44`}
									/>
									<span className="text-sm text-blue-900">~</span>
									<input
										type="date"
										value={customerForm.useEndDate}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, useEndDate: e.target.value }))
										}
										className={`${inputClass} w-44`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>관리자명</label>
									<input
										value={customerForm.managerName}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, managerName: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>핸드폰번호</label>
									<input
										value={customerForm.managerMobile}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, managerMobile: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3 border-t border-blue-200 pt-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>전화번호</label>
									<input
										value={customerForm.phone}
										onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>FAX번호</label>
									<input
										value={customerForm.fax}
										onChange={(e) => setCustomerForm((p) => ({ ...p, fax: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>우편번호</label>
									<input
										value={customerForm.zip}
										onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>주소</label>
									<input
										value={customerForm.address}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, address: e.target.value }))
										}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>도메인</label>
									<input
										value={customerForm.domain}
										onChange={(e) => setCustomerForm((p) => ({ ...p, domain: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>이메일</label>
									<input
										value={customerForm.email}
										onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>결제금액</label>
									<input
										value={customerForm.paymentAmount}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, paymentAmount: e.target.value }))
										}
										className={`${inputClass} flex-1 text-right`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9">
									<textarea
										value={customerForm.depositAccountDesc}
										onChange={(e) =>
											setCustomerForm((p) => ({
												...p,
												depositAccountDesc: e.target.value,
											}))
										}
										rows={3}
										placeholder="입금통장 안내 (RDES)"
										className={`${inputClass} w-full resize-y min-h-[72px]`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-28`}>PW변경일수</label>
									<input
										value={customerForm.pwChangeDays}
										onChange={(e) =>
											setCustomerForm((p) => ({ ...p, pwChangeDays: e.target.value }))
										}
										className={`${inputClass} flex-1 text-right`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 flex flex-wrap items-center gap-2">
									<label className={`${labelClass} w-32`}>입금통장번호</label>
									{depositCodes.length > 0 ? (
										<select
											value={customerForm.depositCode}
											onChange={(e) => handleDepositCodeChange(e.target.value)}
											className={`${inputClass} w-48`}
										>
											<option value="">직접입력</option>
											{depositCodes.map((c) => (
												<option key={`${c.CODE}-${c.UCD}`} value={c.UCD}>
													{c.UCD} {c.DSC1}
												</option>
											))}
										</select>
									) : null}
									<input
										value={
											customerForm.depositCode
												? customerForm.depositCode
												: customerForm.depositAccountNo
										}
										onChange={(e) =>
											setCustomerForm((p) => ({
												...p,
												depositCode: "",
												depositAccountNo: e.target.value,
											}))
										}
										placeholder="F00110.ETC / F01002 코드"
										className={`${inputClass} flex-1 min-w-[200px]`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-3 flex items-center gap-2">
									<label className={`${labelClass} w-32`}>계약만기일수</label>
									<input
										value={customerForm.contractNoticeDays}
										onChange={(e) =>
											setCustomerForm((p) => ({
												...p,
												contractNoticeDays: e.target.value,
											}))
										}
										className={`${inputClass} w-24 text-right`}
									/>
								</div>
								<div className="col-span-12 md:col-span-9 text-sm text-blue-900/70 flex items-center">
									&lt;= 로그인시 수급자 계약만기일 메시지 처리 기준일수 (MSG_DUE_DD)
								</div>
							</div>

							<div className="flex justify-end pt-2">
								<button
									type="button"
									onClick={() => void handleSaveCustomer()}
									disabled={saving || !ancd || !isEditing}
									className="min-w-28 rounded border border-blue-500 bg-blue-500 px-8 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
								>
									{saving ? "저장 중…" : "저장"}
								</button>
							</div>
						</div>
					)}

					{activeTab === "tax" && (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<label className={`${labelClass} w-24`}>발행유무</label>
								<div className="flex items-center gap-6 rounded border border-blue-200 bg-blue-50 px-4 py-2">
									<label className="flex items-center gap-2 text-sm text-blue-900">
										<input
											type="radio"
											name="taxIssue"
											checked={taxForm.issue === "Y"}
											onChange={() => setTaxForm((p) => ({ ...p, issue: "Y" }))}
											className="h-4 w-4 accent-blue-600"
										/>
										예
									</label>
									<label className="flex items-center gap-2 text-sm text-blue-900">
										<input
											type="radio"
											name="taxIssue"
											checked={taxForm.issue === "N"}
											onChange={() => setTaxForm((p) => ({ ...p, issue: "N" }))}
											className="h-4 w-4 accent-blue-600"
										/>
										아니요
									</label>
								</div>
							</div>

							<div className="grid grid-cols-12 gap-3">
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>상 호</label>
									<input
										value={taxForm.companyName}
										onChange={(e) => setTaxForm((p) => ({ ...p, companyName: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>대표자명</label>
									<input
										value={taxForm.ceoName}
										onChange={(e) => setTaxForm((p) => ({ ...p, ceoName: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 md:col-span-6 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>사업자번호</label>
									<input
										value={taxForm.bizNo}
										onChange={(e) => setTaxForm((p) => ({ ...p, bizNo: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>주 소</label>
									<input
										value={taxForm.address}
										onChange={(e) => setTaxForm((p) => ({ ...p, address: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>업 태</label>
									<input
										value={taxForm.bizType}
										onChange={(e) => setTaxForm((p) => ({ ...p, bizType: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>종 목</label>
									<input
										value={taxForm.bizItem}
										onChange={(e) => setTaxForm((p) => ({ ...p, bizItem: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>EMAIL1</label>
									<input
										value={taxForm.email1}
										onChange={(e) => setTaxForm((p) => ({ ...p, email1: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>EMAIL2</label>
									<input
										value={taxForm.email2}
										onChange={(e) => setTaxForm((p) => ({ ...p, email2: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
								<div className="col-span-12 flex items-center gap-2">
									<label className={`${labelClass} w-24`}>EMAIL3</label>
									<input
										value={taxForm.email3}
										onChange={(e) => setTaxForm((p) => ({ ...p, email3: e.target.value }))}
										className={`${inputClass} flex-1`}
									/>
								</div>
							</div>

							<div className="flex justify-end pt-2">
								<button
									type="button"
									onClick={() => void handleSaveTax()}
									disabled={saving || !ancd || !isEditing}
									className="min-w-28 rounded border border-blue-500 bg-blue-500 px-8 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
								>
									{saving ? "저장 중…" : "저장"}
								</button>
							</div>
						</div>
					)}

					{activeTab === "service" && (
						<div className="flex gap-4">
							<div className="w-28 shrink-0">
								<div className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
									서비스 안내
								</div>
							</div>
							<div className="flex-1 min-w-0 flex items-center gap-4">
								<textarea
									value={serviceForm.content}
									onChange={(e) => setServiceForm((p) => ({ ...p, content: e.target.value }))}
									rows={10}
									className="flex-1 min-h-[360px] rounded border border-blue-300 bg-white p-3 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-none"
								/>
								<button
									type="button"
									onClick={() => void handleSaveService()}
									disabled={saving || !ancd || !isEditing}
									className="h-12 w-32 rounded border border-blue-400 bg-blue-200 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									{saving ? "저장 중…" : "저장"}
								</button>
							</div>
						</div>
					)}
					</fieldset>
				</div>
			</div>
		</div>
	);
}
