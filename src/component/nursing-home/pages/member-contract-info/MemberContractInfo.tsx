"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatCareGradeLabel } from '../../utils/careGrade';

interface MemberData {
  [key: string]: any;
}

type F00120EmpRow = { ANCD?: number; UID?: string; EMPNO?: number; EMPNM?: string };

/** F00120 사원명 검색(전체 고객코드) — 타이핑 시 드롭다운, 선택 시 사원번호·이름 반영 */
function EmployeeNameSearchField({
	empName,
	onPatch,
	disabled,
}: {
	empName: string;
	onPatch: (p: { INEMPNO?: string; INEMPNM?: string }) => void;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [hits, setHits] = useState<F00120EmpRow[]>([]);
	const [loading, setLoading] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const onDoc = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, []);

	const runSearch = useCallback(async (q: string) => {
		if (!q.trim()) {
			setHits([]);
			return;
		}
		setLoading(true);
		try {
			const url = `/api/f00120/search?q=${encodeURIComponent(q.trim())}&activeOnly=0`;
			const res = await fetch(url);
			const json = await res.json();
			if (json.success && Array.isArray(json.data)) setHits(json.data);
			else setHits([]);
		} catch {
			setHits([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const onNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value;
		if (!v.trim()) {
			onPatch({ INEMPNM: '', INEMPNO: '' });
		} else {
			onPatch({ INEMPNM: v });
		}
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			if (v.trim().length >= 1) {
				runSearch(v);
				setOpen(true);
			} else {
				setHits([]);
				setOpen(false);
			}
		}, 280);
	};

	const pick = (row: F00120EmpRow) => {
		const no = row.EMPNO != null ? String(row.EMPNO) : '';
		const nm = row.EMPNM != null ? String(row.EMPNM) : '';
		onPatch({ INEMPNO: no, INEMPNM: nm });
		setOpen(false);
		setHits([]);
	};

	const canSearch = !disabled;
	const showDropdown = open && canSearch && (loading || hits.length > 0);

	return (
		<div ref={wrapRef} className="relative w-full">
			<input
				type="text"
				className="w-full border border-blue-300 rounded px-2 py-1 bg-white disabled:bg-slate-100"
				value={empName}
				onChange={onNameInput}
				onFocus={() => {
					if (!canSearch) return;
					if (empName.trim().length >= 1) {
						runSearch(empName);
						setOpen(true);
					}
				}}
				placeholder="이름 입력 시 전체 직원 검색 (F00120)"
				disabled={disabled}
				autoComplete="off"
			/>
			{showDropdown && (
				<ul className="absolute z-[100] left-0 right-0 mt-1 max-h-48 overflow-auto rounded border border-blue-300 bg-white shadow-lg">
					{loading && (
						<li className="px-3 py-2 text-sm text-blue-900/60">검색 중...</li>
					)}
					{!loading &&
						hits.map((row, i) => (
							<li
								key={`${row.EMPNO}-${row.UID ?? ''}-${i}`}
								className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-blue-50 last:border-0"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => pick(row)}
							>
								<span className="font-medium text-blue-900">{row.EMPNM}</span>
								<span className="ml-2 text-blue-900/70">사원번호 {row.EMPNO ?? '-'}</span>
							</li>
						))}
				</ul>
			)}
		</div>
	);
}

function escapeHtml(s: unknown): string {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function formatYmd(d: string | null | undefined): string {
	if (!d) return '';
	const s = String(d);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function usrguLabel(v: string | number | null | undefined): string {
	if (v == null || v === '') return '-';
	const x = String(v);
	if (x === '1') return '일반';
	if (x === '2') return '50%경감대상자';
	if (x === '3') return '국민기초생활수급권자';
	return x;
}

function buildContractPrintHtml(
	basisDate: string,
	printDate: string,
	groups: Array<{ member: MemberData; contracts: MemberData[]; contractor: string; rel: string }>
): string {
	const title = '수급자 계약정보';
	const rowsHtml = groups
		.map((g) => {
			const m = g.member;
			const birth = formatYmd(m.P_BRDT);
			const yyno = escapeHtml(m.P_YYNO || '');
			const grade = escapeHtml(formatCareGradeLabel(m.P_GRD, '-'));
			const vs = formatYmd(m.P_YYSDT);
			const ve = formatYmd(m.P_YYEDT);
			const valid = vs || ve ? `${vs || '-'}~${ve || '-'}` : '-';
			const tel = escapeHtml(m.P_TEL || '');
			const hp = escapeHtml(m.P_HP || '');
			const list = g.contracts.length > 0 ? g.contracts : [null];
			const n = list.length;
			return list
				.map((ct, i) => {
					const period =
						ct && (ct as MemberData).SVSDT
							? `${formatYmd((ct as MemberData).SVSDT)}~${formatYmd((ct as MemberData).SVEDT)}`
							: '-';
					const benefit = ct ? usrguLabel((ct as MemberData).USRGU) : '-';
					return `
						<tr>
							${i === 0 ? `<td rowspan="${n}" class="c">${escapeHtml(m.P_NM || '')}</td>` : ''}
							${i === 0 ? `<td rowspan="${n}" class="c">${escapeHtml(birth)}</td>` : ''}
							<td class="dual"><div>${yyno}</div><div>${escapeHtml(g.contractor)}</div></td>
							<td class="dual"><div>${grade}</div><div>${escapeHtml(g.rel)}</div></td>
							<td class="dual"><div>${escapeHtml(valid)}</div><div>${tel}</div></td>
							<td class="dual"><div>${escapeHtml(benefit)}</div><div>${hp}</div></td>
							<td class="c">${escapeHtml(period)}</td>
						</tr>`;
				})
				.join('');
		})
		.join('');

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
	body { font-family: 'Malgun Gothic', sans-serif; font-size: 11px; color: #000; margin: 16px; }
	h1 { text-align: center; font-size: 18px; text-decoration: underline; margin: 0 0 12px; }
	.meta { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
	.sign { border-collapse: collapse; }
	.sign th, .sign td { border: 1px solid #333; width: 72px; height: 28px; text-align: center; font-size: 10px; }
	.basis { font-size: 11px; }
	table.data { width: 100%; border-collapse: collapse; margin-top: 8px; }
	table.data th, table.data td { border: 1px solid #333; padding: 4px 6px; vertical-align: middle; }
	table.data th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 10px; }
	td.dual div { line-height: 1.35; }
	td.dual div:first-child { border-bottom: 1px dashed #ccc; padding-bottom: 2px; margin-bottom: 2px; }
	td.c { text-align: center; }
	.footer { margin-top: 12px; display: flex; justify-content: space-between; font-size: 10px; }
	.hdr2 { line-height: 1.2; }
</style>
</head>
<body>
	<div class="meta">
		<div class="basis">기준일자: ${escapeHtml(basisDate)}</div>
		<table class="sign">
			<tr><th>담당</th><th>검토</th><th>결재</th></tr>
			<tr><td></td><td></td><td></td></tr>
		</table>
	</div>
	<h1>${title}</h1>
	<table class="data">
		<thead>
			<tr>
				<th class="hdr2">수급자</th>
				<th class="hdr2">생일</th>
				<th class="hdr2">인정번호<br/>계약자성명</th>
				<th class="hdr2">인정등급<br/>수급자와관계</th>
				<th class="hdr2">인정유효기간<br/>자택전화번호</th>
				<th class="hdr2">급여종류<br/>핸드폰번호</th>
				<th class="hdr2">계약기간</th>
			</tr>
		</thead>
		<tbody>${rowsHtml}</tbody>
	</table>
	<div class="footer">
		<span>R10010B</span>
		<span>출력일자: ${escapeHtml(printDate)} &nbsp; 페이지: 1</span>
	</div>
</body>
</html>`;
}

export default function MemberContractInfo() {
	const [members, setMembers] = useState<MemberData[]>([]);
	const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string>('입소');
	const [selectedGrade, setSelectedGrade] = useState<string>('');
	const [selectedFloor, setSelectedFloor] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const [contractList, setContractList] = useState<MemberData[]>([]);
	const [selectedContract, setSelectedContract] = useState<MemberData | null>(null);
	const [contractLoading, setContractLoading] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [newContractInfo, setNewContractInfo] = useState<MemberData>({});
	const [editedContractInfo, setEditedContractInfo] = useState<MemberData | null>(null);
	const [printLoading, setPrintLoading] = useState(false);

	const fetchMembers = async (
		nameSearch?: string,
		resync?: { ancd: string | number; pnum: string | number } | null
	): Promise<MemberData[] | null> => {
		setLoading(true);
		setError(null);
		
		try {
			// 이름 검색 파라미터 추가
			const url = nameSearch && nameSearch.trim() !== '' 
				? `/api/f10010?name=${encodeURIComponent(nameSearch.trim())}`
				: '/api/f10010';
			
			const response = await fetch(url);
			const result = await response.json();
			
			if (result.success) {
				setMembers(result.data);
				if (resync) {
					const updated = result.data.find(
						(m: MemberData) =>
							String(m.ANCD) === String(resync.ancd) && String(m.PNUM) === String(resync.pnum)
					);
					if (updated) setSelectedMember(updated);
				} else if (result.data.length > 0 && !selectedMember) {
					setSelectedMember(result.data[0]);
				} else if (result.data.length === 0) {
					setSelectedMember(null);
				}
				return result.data;
			} else {
				setError(result.error || '수급자 데이터 조회 실패');
				return null;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '알 수 없는 오류');
			return null;
		} finally {
			setLoading(false);
		}
	};

	const contractInfo = selectedContract;

	const formatDateSql = (dateStr: string | undefined): string | null => {
		if (!dateStr || dateStr.trim() === '') return null;
		try {
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) return null;
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day} 00:00:00`;
		} catch {
			return null;
		}
	};

	const calculateAge = (birthDate: string | null | undefined): string => {
		if (!birthDate) return '-';
		try {
			const y = parseInt(String(birthDate).substring(0, 4), 10);
			if (isNaN(y)) return '-';
			return String(new Date().getFullYear() - y);
		} catch {
			return '-';
		}
	};

	const handleMemberSelect = (member: MemberData) => {
		setSelectedMember(member);
		setSelectedContract(null);
		setIsCreating(false);
		setIsEditing(false);
		setEditedContractInfo(null);
		setNewContractInfo({});
	};

	const handleSelectContract = (row: MemberData) => {
		setSelectedContract(row);
		setIsCreating(false);
		setIsEditing(false);
		setEditedContractInfo(null);
	};

	// USRGU 값 변환 함수
	const getUSRGULabel = (value: string | number | null | undefined): string => {
		if (!value) return '-';
		const val = String(value);
		if (val === '1') return '일반';
		if (val === '2') return '50%경감대상자';
		if (val === '3') return '국민기초생활수급권자';
		return val;
	};

	// CHGU 값 변환 함수
	const getCHGULabel = (value: string | number | null | undefined): string => {
		if (!value) return '-';
		const val = String(value);
		if (val === '1') return '카드';
		if (val === '2') return '현금';
		return val;
	};

	// P_ST: 1=입소, 9=퇴소 (F10010 수급자-상태)
	const getPSTLabel = (value: string | number | null | undefined): string => {
		const val = value != null && value !== '' ? String(value).trim() : '';
		if (val === '1') return '입소';
		if (val === '9') return '퇴소';
		return val || '-';
	};

	const formatMemberDate = (d: string | null | undefined): string => {
		if (!d) return '';
		const s = String(d);
		return s.length >= 10 ? s.substring(0, 10) : s;
	};

	// F10110 계약 전체 목록 (PK: ANCD, PNUM, CDT)
	const fetchContractList = async (
		ancd: string,
		pnum: string,
		autoSelectFirst: boolean = true
	) => {
		if (!ancd || !pnum) {
			setContractList([]);
			setSelectedContract(null);
			return;
		}

		setContractLoading(true);
		try {
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						SELECT
							[ANCD], [PNUM], [CDT], [SVSDT], [SVEDT],
							[INSPER], [USRPER], [USRGU], [USRINFO],
							[EAMT], [ETAMT], [ESAMT],
							[CHGU], [INDT], [ETC], [INEMPNO], [INEMPNM]
						FROM [돌봄시설DB].[dbo].[F10110]
						WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
						ORDER BY [CDT] DESC
					`,
					params: { ANCD: String(ancd), PNUM: String(pnum) }
				})
			});

			const result = await response.json();
			const rows = result.success && Array.isArray(result.data) ? result.data : [];
			setContractList(rows);
			if (autoSelectFirst && rows.length > 0) {
				setSelectedContract(rows[0]);
			} else if (!autoSelectFirst) {
				// 유지: 목록만 갱신
			} else {
				setSelectedContract(null);
			}
		} catch (err) {
			console.error('계약 목록 조회 오류:', err);
			setContractList([]);
			setSelectedContract(null);
		} finally {
			setContractLoading(false);
		}
	};

	// 클라이언트 측 추가 필터링 (서버에서 이미 이름으로 필터링됨)
	// 모든 필터 조건을 AND로 결합하여 적용
	const filteredMembers = members.filter(member => {
		// 상태 필터링
		if (selectedStatus) {
			const memberStatus = String(member.P_ST || '').trim();
			if (selectedStatus === '입소' && memberStatus !== '1') {
				return false;
			}
			if (selectedStatus === '퇴소' && memberStatus !== '9') {
				return false;
			}
		}
		
		// 등급 필터링
		if (selectedGrade) {
			const memberGrade = String(member.P_GRD || '').trim();
			const selectedGradeTrimmed = String(selectedGrade).trim();
			if (memberGrade !== selectedGradeTrimmed) {
				return false;
			}
		}
		
		// 층수 필터링
		if (selectedFloor) {
			const memberFloor = String(member.P_FLOOR || '').trim();
			const selectedFloorTrimmed = String(selectedFloor).trim();
			if (memberFloor !== selectedFloorTrimmed) {
				return false;
			}
		}
		
		// 검색어 필터링 (검색어가 있을 때만 적용)
		if (searchTerm && searchTerm.trim() !== '') {
			const searchLower = searchTerm.toLowerCase().trim();
			const matchesSearch = (
				member.P_NM?.toLowerCase().includes(searchLower) ||
				member.P_TEL?.includes(searchTerm) ||
				member.P_HP?.includes(searchTerm) ||
				String(member.ANCD || '').includes(searchTerm) ||
				String(member.PNUM || '').includes(searchTerm)
			);
			if (!matchesSearch) {
				return false;
			}
		}
		
		// 모든 필터 조건을 통과한 경우만 true 반환
		return true;
	}).sort((a, b) => {
		// 이름 가나다순 정렬
		const nameA = (a.P_NM || '').trim();
		const nameB = (b.P_NM || '').trim();
		return nameA.localeCompare(nameB, 'ko');
	});

	// 페이지네이션 계산
	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = filteredMembers.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePrintContractReport = async () => {
		if (filteredMembers.length === 0) {
			alert('출력할 수급자가 없습니다. 목록 필터를 확인해 주세요.');
			return;
		}
		setPrintLoading(true);
		try {
			const basis = new Date().toISOString().slice(0, 10);
			const printDate = basis;
			const groups = await Promise.all(
				filteredMembers.map(async (m) => {
					const [cRes, gRes] = await Promise.all([
						fetch('/api/f10010', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								query: `
									SELECT [ANCD],[PNUM],[CDT],[SVSDT],[SVEDT],[USRGU]
									FROM [돌봄시설DB].[dbo].[F10110]
									WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
									ORDER BY [CDT] DESC
								`,
								params: { ANCD: String(m.ANCD), PNUM: String(m.PNUM) }
							})
						}),
						fetch(
							`/api/f10020?ancd=${encodeURIComponent(String(m.ANCD))}&pnum=${encodeURIComponent(String(m.PNUM))}`
						)
					]);
					const cj = await cRes.json();
					const gj = await gRes.json();
					const contracts = cj.success && Array.isArray(cj.data) ? cj.data : [];
					const guardians = gj.success && Array.isArray(gj.data) ? gj.data : [];
					const g0 =
						guardians.find((g: MemberData) => String(g.CONGU) === '1') ?? guardians[0];
					const contractor = g0?.BHNM != null ? String(g0.BHNM) : '';
					const rel =
						g0?.BHREL === '10'
							? '남편'
							: g0?.BHREL === '11'
								? '부인'
								: g0?.BHREL === '20'
									? '아들'
									: g0?.BHREL === '21'
										? '딸'
										: g0?.BHREL === '22'
											? '며느리'
											: g0?.BHREL === '23'
												? '사위'
												: g0?.BHREL === '31'
													? '손주'
													: g0?.BHETC && String(g0.BHETC).trim() !== ''
														? String(g0.BHETC)
														: g0?.BHREL != null && String(g0.BHREL) !== ''
															? String(g0.BHREL)
															: '';
					return { member: m, contracts, contractor, rel };
				})
			);
			const html = buildContractPrintHtml(basis, printDate, groups);
			const w = window.open('', '_blank');
			if (!w) {
				alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
				return;
			}
			w.document.write(html);
			w.document.close();
			setTimeout(() => {
				w.focus();
				w.print();
			}, 300);
		} catch (e) {
			console.error(e);
			alert('출력 준비 중 오류가 발생했습니다.');
		} finally {
			setPrintLoading(false);
		}
	};

	const contractRowKey = (row: MemberData) => String(row.CDT ?? '');
	const isSameContractRow = (a: MemberData | null, b: MemberData | null) => {
		if (!a || !b) return false;
		return (
			String(a.ANCD) === String(b.ANCD) &&
			String(a.PNUM) === String(b.PNUM) &&
			contractRowKey(a) === contractRowKey(b)
		);
	};
	const contractPeriodLabel = (row: MemberData) => {
		const s = formatMemberDate(row.SVSDT);
		const e = formatMemberDate(row.SVEDT);
		if (!s && !e) return '-';
		return `${s || '-'} ~ ${e || '-'}`;
	};

	useEffect(() => {
		fetchMembers();
	}, []);

	// 검색어가 변경될 때 페이지를 1로 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	// 필터 변경 시 페이지 초기화
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedStatus, selectedGrade, selectedFloor]);

	// 선택된 수급자가 변경될 때 계약 목록 조회 (handleMemberSelect에서도 호출 — 초기 로드·동기화용)
	useEffect(() => {
		if (selectedMember && selectedMember.ANCD != null && selectedMember.PNUM != null) {
			fetchContractList(String(selectedMember.ANCD), String(selectedMember.PNUM), true);
		} else {
			setContractList([]);
			setSelectedContract(null);
		}
		setIsCreating(false);
		setIsEditing(false);
		setNewContractInfo({});
		setEditedContractInfo(null);
	}, [selectedMember]);

	// 계약정보 생성 버튼 클릭
	const handleCreateClick = () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}
		setSelectedContract(null);
		setIsCreating(true);
		// F10010의 P_CTDT를 초기 계약일자로 설정
		const initialContractDate = selectedMember.P_CTDT 
			? selectedMember.P_CTDT.substring(0, 10)
			: '';
		setNewContractInfo({
			ANCD: selectedMember.ANCD,
			PNUM: selectedMember.PNUM,
			CDT: initialContractDate
		});
		setIsEditing(false);
		setEditedContractInfo(null);
	};

	// 계약정보 생성 취소
	const handleCreateCancel = () => {
		setIsCreating(false);
		setNewContractInfo({});
	};

	// 계약정보 생성 저장
	const handleCreateSave = async () => {
		if (!selectedMember) {
			alert('수급자를 선택해주세요.');
			return;
		}

		setContractLoading(true);
		try {
			// 현재 날짜/시간
			const now = new Date();
			const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

			// 날짜 형식 변환 함수
			const formatDate = (dateStr: string | undefined): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					const date = new Date(dateStr);
					if (isNaN(date.getTime())) return null;
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day} 00:00:00`;
				} catch (err) {
					return null;
				}
			};

			const contractDate = formatDate(newContractInfo.CDT);

			// F10110 INSERT 쿼리
			const insertQuery = `
				INSERT INTO [돌봄시설DB].[dbo].[F10110] (
					[ANCD], [PNUM], [CDT], [SVSDT], [SVEDT],
					[INSPER], [USRPER], [USRGU], [USRINFO],
					[EAMT], [ETAMT], [ESAMT],
					[CHGU], [INDT], [ETC], [INEMPNO], [INEMPNM]
				) VALUES (
					@ANCD, @PNUM, @CDT, @SVSDT, @SVEDT,
					@INSPER, @USRPER, @USRGU, @USRINFO,
					@EAMT, @ETAMT, @ESAMT,
					@CHGU, @INDT, @ETC, @INEMPNO, @INEMPNM
				)
			`;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				CDT: contractDate,
				SVSDT: formatDate(newContractInfo.SVSDT),
				SVEDT: formatDate(newContractInfo.SVEDT),
				INSPER: newContractInfo.INSPER ? parseFloat(newContractInfo.INSPER) : null,
				USRPER: newContractInfo.USRPER ? parseFloat(newContractInfo.USRPER) : null,
				USRGU: newContractInfo.USRGU || null,
				USRINFO: newContractInfo.USRINFO?.trim() || null,
				EAMT: newContractInfo.EAMT ? parseFloat(newContractInfo.EAMT) : null,
				ETAMT: newContractInfo.ETAMT ? parseFloat(newContractInfo.ETAMT) : null,
				ESAMT: newContractInfo.ESAMT ? parseFloat(newContractInfo.ESAMT) : null,
				CHGU: newContractInfo.CHGU || null,
				INDT: nowStr,
				ETC: newContractInfo.ETC?.trim() || null,
				INEMPNO: newContractInfo.INEMPNO?.trim() || null,
				INEMPNM: newContractInfo.INEMPNM?.trim() || null
			};

			// F10110 저장
			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: insertQuery, params })
			});

			const result = await response.json();

			if (result && result.success) {
				// F10010의 P_CTDT 업데이트
				if (contractDate) {
					const updateF10010Query = `
						UPDATE [돌봄시설DB].[dbo].[F10010]
						SET [P_CTDT] = @P_CTDT
						WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
					`;

					const updateParams = {
						ANCD: selectedMember.ANCD,
						PNUM: selectedMember.PNUM,
						P_CTDT: contractDate
					};

					await fetch('/api/f10010', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ query: updateF10010Query, params: updateParams })
					});
				}

				alert('계약정보가 생성되었습니다.');
				setIsCreating(false);
				setNewContractInfo({});
				// 수급자 목록과 계약정보 다시 조회
				await fetchMembers(undefined, { ancd: selectedMember.ANCD, pnum: selectedMember.PNUM });
				if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
					await fetchContractList(String(selectedMember.ANCD), String(selectedMember.PNUM), true);
				}
			} else {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('계약정보 생성 실패:', result);
				alert(`계약정보 생성 실패: ${errorMessage}`);
			}
		} catch (err) {
			console.error('계약정보 생성 오류:', err);
			alert('계약정보 생성 중 오류가 발생했습니다.');
		} finally {
			setContractLoading(false);
		}
	};

	// 계약정보 수정 버튼 클릭
	const handleEditClick = () => {
		if (!selectedContract || !selectedMember) return;
		setIsEditing(true);
		const cdtRaw = selectedContract.CDT != null ? String(selectedContract.CDT) : '';
		const cdtDay = cdtRaw.length >= 10 ? cdtRaw.substring(0, 10) : '';
		const contractDate = selectedMember?.P_CTDT
			? selectedMember.P_CTDT.substring(0, 10)
			: cdtDay;
		setEditedContractInfo({
			...selectedContract,
			_originalCdtSql: formatDateSql(cdtDay),
			CDT: contractDate,
			P_NM: selectedMember.P_NM != null ? String(selectedMember.P_NM) : '',
			P_ST:
				selectedMember.P_ST != null && String(selectedMember.P_ST).trim() !== ''
					? String(selectedMember.P_ST).trim()
					: '',
			P_SDT: formatMemberDate(selectedMember.P_SDT) || '',
			P_EDT: formatMemberDate(selectedMember.P_EDT) || '',
			P_CINFO: selectedMember.P_CINFO != null ? String(selectedMember.P_CINFO) : ''
		});
		setIsCreating(false);
		setNewContractInfo({});
	};

	// 계약정보 수정 취소
	const handleEditCancel = () => {
		setIsEditing(false);
		setEditedContractInfo(null);
	};

	// 계약정보 수정 저장
	const handleEditSave = async () => {
		if (!editedContractInfo || !selectedMember) return;

		setContractLoading(true);
		try {
			// 날짜 형식 변환 함수
			const formatDate = (dateStr: string | undefined): string | null => {
				if (!dateStr || dateStr.trim() === '') return null;
				try {
					const date = new Date(dateStr);
					if (isNaN(date.getTime())) return null;
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day} 00:00:00`;
				} catch (err) {
					return null;
				}
			};

			// UPDATE 쿼리 (PK: ANCD, PNUM, CDT)
			const updateQuery = `
				UPDATE [돌봄시설DB].[dbo].[F10110]
				SET 
					[CDT] = @CDT,
					[SVSDT] = @SVSDT,
					[SVEDT] = @SVEDT,
					[INSPER] = @INSPER,
					[USRPER] = @USRPER,
					[USRGU] = @USRGU,
					[USRINFO] = @USRINFO,
					[EAMT] = @EAMT,
					[ETAMT] = @ETAMT,
					[ESAMT] = @ESAMT,
					[CHGU] = @CHGU,
					[ETC] = @ETC,
					[INEMPNO] = @INEMPNO,
					[INEMPNM] = @INEMPNM
				WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [CDT] = @OLD_CDT
			`;

			const params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				OLD_CDT: editedContractInfo._originalCdtSql,
				CDT: formatDate(editedContractInfo.CDT),
				SVSDT: formatDate(editedContractInfo.SVSDT),
				SVEDT: formatDate(editedContractInfo.SVEDT),
				INSPER: editedContractInfo.INSPER ? parseFloat(editedContractInfo.INSPER) : null,
				USRPER: editedContractInfo.USRPER ? parseFloat(editedContractInfo.USRPER) : null,
				USRGU: editedContractInfo.USRGU || null,
				USRINFO: editedContractInfo.USRINFO?.trim() || null,
				EAMT: editedContractInfo.EAMT ? parseFloat(editedContractInfo.EAMT) : null,
				ETAMT: editedContractInfo.ETAMT ? parseFloat(editedContractInfo.ETAMT) : null,
				ESAMT: editedContractInfo.ESAMT ? parseFloat(editedContractInfo.ESAMT) : null,
				CHGU: editedContractInfo.CHGU || null,
				ETC: editedContractInfo.ETC?.trim() || null,
				INEMPNO: editedContractInfo.INEMPNO?.trim() || null,
				INEMPNM: editedContractInfo.INEMPNM?.trim() || null
			};

			const response = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: updateQuery, params })
			});

			const result = await response.json();

			if (!result || !result.success) {
				const errorMessage = result?.error || result?.details || '알 수 없는 오류';
				console.error('계약정보 수정 실패:', result);
				alert(`계약정보(F10110) 수정 실패: ${errorMessage}`);
				return;
			}

			const updateF10010Query = `
				UPDATE [돌봄시설DB].[dbo].[F10010]
				SET 
					[P_NM] = @P_NM,
					[P_ST] = @P_ST,
					[P_CINFO] = @P_CINFO,
					[P_CTDT] = @P_CTDT,
					[P_SDT] = @P_SDT,
					[P_EDT] = @P_EDT
				WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM
			`;

			const f10010Params = {
				ANCD: selectedMember.ANCD,
				PNUM: selectedMember.PNUM,
				P_NM: editedContractInfo.P_NM?.trim() || null,
				P_ST: editedContractInfo.P_ST ? String(editedContractInfo.P_ST).trim() : null,
				P_CINFO: editedContractInfo.P_CINFO?.trim() || null,
				P_CTDT: formatDate(editedContractInfo.CDT),
				P_SDT: formatDate(editedContractInfo.P_SDT),
				P_EDT: formatDate(editedContractInfo.P_EDT)
			};

			const f10010Res = await fetch('/api/f10010', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: updateF10010Query, params: f10010Params })
			});

			const f10010Result = await f10010Res.json();

			if (!f10010Result || !f10010Result.success) {
				const errorMessage = f10010Result?.error || f10010Result?.details || '알 수 없는 오류';
				console.error('수급자 기본정보(F10010) 수정 실패:', f10010Result);
				alert(`수급자 기본정보(F10010) 수정 실패: ${errorMessage}\n계약 상세(F10110)는 이미 저장되었습니다.`);
				return;
			}

			alert('계약정보가 수정되었습니다.');
			setIsEditing(false);
			setEditedContractInfo(null);
			await fetchMembers(undefined, { ancd: selectedMember.ANCD, pnum: selectedMember.PNUM });
			if (selectedMember && selectedMember.ANCD && selectedMember.PNUM) {
				await fetchContractList(String(selectedMember.ANCD), String(selectedMember.PNUM), true);
			}
		} catch (err) {
			console.error('계약정보 수정 오류:', err);
			alert('계약정보 수정 중 오류가 발생했습니다.');
		} finally {
			setContractLoading(false);
		}
	};

	// 계약정보 삭제
	const handleDelete = async () => {
		if (!selectedContract || !selectedMember) return;

		if (confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			setContractLoading(true);
			try {
				const cdtKey = selectedContract.CDT != null ? String(selectedContract.CDT) : '';
				const cdtDay = cdtKey.length >= 10 ? cdtKey.substring(0, 10) : '';
				const deleteQuery = `
					DELETE FROM [돌봄시설DB].[dbo].[F10110]
					WHERE [ANCD] = @ANCD AND [PNUM] = @PNUM AND [CDT] = @CDT
				`;

				const params = {
					ANCD: selectedMember.ANCD,
					PNUM: selectedMember.PNUM,
					CDT: formatDateSql(cdtDay)
				};

				const response = await fetch('/api/f10010', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: deleteQuery, params })
				});

				const result = await response.json();

				if (result && result.success) {
					alert('계약정보가 삭제되었습니다.');
					setSelectedContract(null);
					setIsEditing(false);
					setEditedContractInfo(null);
					if (selectedMember.ANCD != null && selectedMember.PNUM != null) {
						await fetchContractList(String(selectedMember.ANCD), String(selectedMember.PNUM), true);
					}
				} else {
					const errorMessage = result?.error || result?.details || '알 수 없는 오류';
					console.error('계약정보 삭제 실패:', result);
					alert(`계약정보 삭제 실패: ${errorMessage}`);
				}
			} catch (err) {
				console.error('계약정보 삭제 오류:', err);
				alert('계약정보 삭제 중 오류가 발생했습니다.');
			} finally {
				setContractLoading(false);
			}
		}
	};

	const handleNewContractFieldChange = (field: string, value: any) => {
		setNewContractInfo({ ...newContractInfo, [field]: value });
	};

	const handleEditedContractFieldChange = (field: string, value: any) => {
		if (editedContractInfo) {
			setEditedContractInfo({ ...editedContractInfo, [field]: value });
		}
	};

	return (
		<div className="min-h-screen bg-white text-black flex flex-col">
			<div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-blue-200 bg-white">
				<h1 className="text-sm font-semibold text-blue-900">수급자 계약정보</h1>
				<button
					type="button"
					onClick={handlePrintContractReport}
					disabled={printLoading || filteredMembers.length === 0}
					className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{printLoading ? '출력 준비 중...' : '계약서 출력'}
				</button>
			</div>
			<div className="flex h-[calc(80vh-56px)] min-h-0 flex-1">
				{/* 좌측: 수급자 목록 (보호자정보등록과 동일 패턴) */}
				<div className="w-1/4 min-w-0 border-r border-blue-200 bg-white flex flex-col p-4">
					<div className="mb-3">
						<h3 className="text-sm font-semibold text-blue-900 mb-2">수급자 목록</h3>
						<div className="space-y-2">
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">이름 검색</div>
								<input
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded"
									placeholder="예) 홍길동"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											setCurrentPage(1);
											fetchMembers(searchTerm);
										}
									}}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-blue-900/80">현황</div>
								<select
									value={selectedStatus}
									onChange={(e) => {
										setSelectedStatus(e.target.value);
										setCurrentPage(1);
									}}
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-900"
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
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-900"
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
									className="w-full px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-900"
								>
									<option value="">층수 전체</option>
									{Array.from(
										new Set(
											members.map(m => m.P_FLOOR).filter(f => f !== null && f !== undefined && f !== '')
										)
									)
										.sort((a, b) => Number(a) - Number(b))
										.map(floor => (
											<option key={floor} value={String(floor)}>
												{floor}층
											</option>
										))}
								</select>
							</div>
						</div>
						<button
							type="button"
							className="w-full mt-2 py-1 text-xs text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
							onClick={() => {
								setCurrentPage(1);
								fetchMembers(searchTerm);
							}}
						>
							{loading ? '검색 중...' : '검색'}
						</button>
					</div>
					<div className="border border-blue-300 rounded-lg overflow-hidden bg-white flex flex-col flex-1 min-h-0">
						<div className="overflow-y-auto flex-1 min-h-0">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">현황</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">수급자명</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">성별</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">등급</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold">나이</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-blue-900/60">
												로딩 중...
											</td>
										</tr>
									) : error ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-red-600">
												{error}
											</td>
										</tr>
									) : filteredMembers.length === 0 ? (
										<tr>
											<td colSpan={6} className="text-center px-2 py-4 text-blue-900/60">
												수급자 데이터가 없습니다
											</td>
										</tr>
									) : (
										currentMembers.map((member, index) => (
											<tr
												key={`${member.ANCD}-${member.PNUM}-${index}`}
												onClick={() => handleMemberSelect(member)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													selectedMember?.ANCD === member.ANCD && selectedMember?.PNUM === member.PNUM
														? 'bg-blue-100'
														: ''
												}`}
											>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">
													{startIndex + index + 1}
												</td>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">
													{member.P_ST === '1' ? '입소' : member.P_ST === '9' ? '퇴소' : '-'}
												</td>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">
													{member.P_NM || '-'}
												</td>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">
													{member.P_SEX === '1' ? '남' : member.P_SEX === '2' ? '여' : '-'}
												</td>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">
													{formatCareGradeLabel(member.P_GRD)}
												</td>
												<td className="text-center px-1 py-1.5">{calculateAge(member.P_BRDT)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{totalPages > 1 && (
							<div className="p-2 border-t border-blue-200 bg-white flex-shrink-0">
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										onClick={() => handlePageChange(1)}
										disabled={currentPage === 1}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&lt;&lt;
									</button>
									<button
										type="button"
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
												type="button"
												key={pageNum}
												onClick={() => handlePageChange(pageNum)}
												className={`px-2 py-1 text-xs border rounded ${
													currentPage === pageNum
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-blue-300 hover:bg-blue-50'
												}`}
											>
												{pageNum}
											</button>
										);
									})}
									<button
										type="button"
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;
									</button>
									<button
										type="button"
										onClick={() => handlePageChange(totalPages)}
										disabled={currentPage === totalPages}
										className="px-2 py-1 text-xs border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
									>
										&gt;&gt;
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 중간: 계약 목록 */}
				<div className="w-1/4 min-w-0 border-r border-blue-200 bg-white flex flex-col p-4">
					<div className="mb-3 flex items-center justify-between gap-2">
						<h3 className="text-sm font-semibold text-blue-900">계약 목록</h3>
						{selectedMember && (
							<button
								type="button"
								onClick={handleCreateClick}
								className="px-2 py-1 text-xs text-white bg-blue-500 border border-blue-600 rounded hover:bg-blue-600 shrink-0"
							>
								계약정보 생성
							</button>
						)}
					</div>
					<div className="border border-blue-300 rounded-lg overflow-hidden bg-white flex-1 flex flex-col min-h-0">
						<div className="overflow-y-auto flex-1 min-h-0">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 border-b border-blue-200 sticky top-0">
									<tr>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">연번</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">계약일자</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold border-r border-blue-200">계약기간</th>
										<th className="text-center px-1 py-1.5 text-blue-900 font-semibold">급여구분</th>
									</tr>
								</thead>
								<tbody>
									{!selectedMember ? (
										<tr>
											<td colSpan={4} className="text-center px-2 py-6 text-blue-900/60">
												수급자를 선택하세요
											</td>
										</tr>
									) : contractLoading ? (
										<tr>
											<td colSpan={4} className="text-center px-2 py-6 text-blue-900/60">
												계약 목록 로딩 중...
											</td>
										</tr>
									) : contractList.length === 0 ? (
										<tr>
											<td colSpan={4} className="text-center px-2 py-6 text-blue-900/60">
												등록된 계약이 없습니다
											</td>
										</tr>
									) : (
										contractList.map((row, i) => (
											<tr
												key={`${row.ANCD}-${row.PNUM}-${contractRowKey(row)}-${i}`}
												onClick={() => handleSelectContract(row)}
												className={`border-b border-blue-50 hover:bg-blue-50 cursor-pointer ${
													isSameContractRow(selectedContract, row) ? 'bg-blue-100' : ''
												}`}
											>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">{i + 1}</td>
												<td className="text-center px-1 py-1.5 border-r border-blue-100">
													{formatMemberDate(row.CDT) || '-'}
												</td>
												<td className="text-center px-1 py-1.5 border-r border-blue-100 whitespace-nowrap">
													{contractPeriodLabel(row)}
												</td>
												<td className="text-center px-1 py-1.5">{getUSRGULabel(row.USRGU)}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* 우측: 계약정보 상세 */}
				<section className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4 bg-white">
						{/* 계약정보 카드 */}
						<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
							<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
								<h2 className="text-xl font-semibold text-blue-900">계약정보</h2>
								<div className="flex items-center gap-2">
									{contractInfo && !isEditing ? (
										<button 
											onClick={handleEditClick}
											className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900"
										>
											수정 및 삭제
										</button>
									) : null}
									{isCreating && (
										<>
											<button 
												onClick={handleCreateSave}
												disabled={contractLoading}
												className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 disabled:opacity-50"
											>
												{contractLoading ? '저장 중...' : '저장'}
											</button>
											<button 
												onClick={handleCreateCancel}
												className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
											>
												취소
											</button>
										</>
									)}
									{isEditing && editedContractInfo && (
										<>
											<button 
												onClick={handleEditSave}
												disabled={contractLoading}
												className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 disabled:opacity-50"
											>
												{contractLoading ? '저장 중...' : '저장'}
											</button>
											<button 
												onClick={handleEditCancel}
												className="px-3 py-1 text-sm border border-gray-400 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
											>
												취소
											</button>
											<button 
												onClick={handleDelete}
												disabled={contractLoading}
												className="px-3 py-1 text-sm border border-red-400 rounded bg-red-200 hover:bg-red-300 text-red-900 disabled:opacity-50"
											>
												삭제
											</button>
										</>
									)}
								</div>
							</div>

							<div className="p-4">
								<div className="grid grid-cols-12 gap-4">
									{/* 입력 필드 영역 */}
									<div className="col-span-12 grid grid-cols-12 gap-3">
										{contractLoading ? (
											<div className="col-span-12 text-center py-4 text-blue-900/60">계약 정보 로딩 중...</div>
										) : isCreating ? (
											<>
												{/* 계약정보 생성 폼 */}
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자명</label>
													<input className="w-full border border-blue-300 rounded px-2 py-1 bg-white" value={selectedMember?.P_NM || ''} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">입·퇴소 상태</label>
													<div className="flex items-center min-h-[34px] px-2 border border-blue-300 rounded bg-slate-50">
														<span
															className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
																selectedMember?.P_ST === '1'
																	? 'bg-green-100 text-green-800'
																	: selectedMember?.P_ST === '9'
																		? 'bg-slate-200 text-slate-800'
																		: 'bg-gray-100 text-gray-600'
															}`}
														>
															{getPSTLabel(selectedMember?.P_ST)}
														</span>
													</div>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">입소일자</label>
													<input className="w-full border border-blue-300 rounded px-2 py-1 bg-slate-50" value={formatMemberDate(selectedMember?.P_SDT) || '-'} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">퇴소일자</label>
													<input className="w-full border border-blue-300 rounded px-2 py-1 bg-slate-50" value={formatMemberDate(selectedMember?.P_EDT) || '-'} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약일자</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.CDT || ''}
														onChange={(e) => handleNewContractFieldChange('CDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 시작일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.SVSDT || ''}
														onChange={(e) => handleNewContractFieldChange('SVSDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 종료일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.SVEDT || ''}
														onChange={(e) => handleNewContractFieldChange('SVEDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">보험자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.INSPER || ''}
														onChange={(e) => handleNewContractFieldChange('INSPER', e.target.value)}
														placeholder="예: 80"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.USRPER || ''}
														onChange={(e) => handleNewContractFieldChange('USRPER', e.target.value)}
														placeholder="예: 20"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 구분</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={newContractInfo.USRGU || ''}
														onChange={(e) => handleNewContractFieldChange('USRGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">일반</option>
														<option value="2">50%경감대상자</option>
														<option value="3">국민기초생활수급권자</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 내용</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.USRINFO || ''}
														onChange={(e) => handleNewContractFieldChange('USRINFO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">기본급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.EAMT || ''}
														onChange={(e) => handleNewContractFieldChange('EAMT', e.target.value)}
														placeholder="원"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">추가급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.ETAMT || ''}
														onChange={(e) => handleNewContractFieldChange('ETAMT', e.target.value)}
														placeholder="원"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">특별급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.ESAMT || ''}
														onChange={(e) => handleNewContractFieldChange('ESAMT', e.target.value)}
														placeholder="원"
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">결제방법</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={newContractInfo.CHGU || ''}
														onChange={(e) => handleNewContractFieldChange('CHGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">카드</option>
														<option value="2">현금</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원명</label>
													<EmployeeNameSearchField
														empName={newContractInfo.INEMPNM || ''}
														onPatch={(p) => setNewContractInfo((prev) => ({ ...prev, ...p }))}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원번호</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.INEMPNO || ''}
														onChange={(e) => handleNewContractFieldChange('INEMPNO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">비고</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={newContractInfo.ETC || ''}
														onChange={(e) => handleNewContractFieldChange('ETC', e.target.value)}
													/>
												</div>
											</>
										) : isEditing && editedContractInfo ? (
											<>
												{/* 계약정보 수정 폼 */}
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자명</label>
													<input
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={editedContractInfo.P_NM ?? ''}
														onChange={(e) => handleEditedContractFieldChange('P_NM', e.target.value)}
														maxLength={100}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">입·퇴소 상태</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={editedContractInfo.P_ST || ''}
														onChange={(e) => handleEditedContractFieldChange('P_ST', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">입소</option>
														<option value="9">퇴소</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">입소일자</label>
													<input 
														type="date"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.P_SDT ? editedContractInfo.P_SDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('P_SDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">퇴소일자</label>
													<input 
														type="date"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.P_EDT ? editedContractInfo.P_EDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('P_EDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">퇴소 사유</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.P_CINFO || ''}
														onChange={(e) => handleEditedContractFieldChange('P_CINFO', e.target.value)}
														placeholder="퇴소 시 사유"
														maxLength={100}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약일자</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.CDT ? editedContractInfo.CDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('CDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 시작일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.SVSDT ? editedContractInfo.SVSDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('SVSDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">서비스 종료일</label>
													<input 
														type="date" 
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.SVEDT ? editedContractInfo.SVEDT.substring(0, 10) : ''}
														onChange={(e) => handleEditedContractFieldChange('SVEDT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">보험자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.INSPER || ''}
														onChange={(e) => handleEditedContractFieldChange('INSPER', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 (%)</label>
													<input 
														type="number"
														step="0.01"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.USRPER || ''}
														onChange={(e) => handleEditedContractFieldChange('USRPER', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 구분</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={editedContractInfo.USRGU || ''}
														onChange={(e) => handleEditedContractFieldChange('USRGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">일반</option>
														<option value="2">50%경감대상자</option>
														<option value="3">국민기초생활수급권자</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 내용</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.USRINFO || ''}
														onChange={(e) => handleEditedContractFieldChange('USRINFO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">기본급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.EAMT || ''}
														onChange={(e) => handleEditedContractFieldChange('EAMT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">추가급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.ETAMT || ''}
														onChange={(e) => handleEditedContractFieldChange('ETAMT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">특별급여</label>
													<input 
														type="number"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.ESAMT || ''}
														onChange={(e) => handleEditedContractFieldChange('ESAMT', e.target.value)}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">결제방법</label>
													<select
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white"
														value={editedContractInfo.CHGU || ''}
														onChange={(e) => handleEditedContractFieldChange('CHGU', e.target.value)}
													>
														<option value="">선택</option>
														<option value="1">카드</option>
														<option value="2">현금</option>
													</select>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원명</label>
													<EmployeeNameSearchField
														empName={editedContractInfo.INEMPNM || ''}
														onPatch={(p) =>
															setEditedContractInfo((prev) => (prev ? { ...prev, ...p } : null))
														}
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원번호</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.INEMPNO || ''}
														onChange={(e) => handleEditedContractFieldChange('INEMPNO', e.target.value)}
													/>
												</div>
												<div className="col-span-12 flex flex-col gap-1">
													<label className="px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">비고</label>
													<input 
														type="text"
														className="w-full border border-blue-300 rounded px-2 py-1 bg-white" 
														value={editedContractInfo.ETC || ''}
														onChange={(e) => handleEditedContractFieldChange('ETC', e.target.value)}
													/>
												</div>
											</>
										) : !contractInfo ? (
											<div className="col-span-12 text-center py-4 text-blue-900/60">계약 정보가 없습니다</div>
										) : (
											<>
												{/* 계약정보 조회 모드 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자명</label>
													<input className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" value={selectedMember?.P_NM || ''} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">입·퇴소 상태</label>
													<div className="flex flex-1 items-center min-h-[34px] px-2 border border-blue-300 rounded bg-slate-50">
														<span
															className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
																selectedMember?.P_ST === '1'
																	? 'bg-green-100 text-green-800'
																	: selectedMember?.P_ST === '9'
																		? 'bg-slate-200 text-slate-800'
																		: 'bg-gray-100 text-gray-600'
															}`}
														>
															{getPSTLabel(selectedMember?.P_ST)}
														</span>
													</div>
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">입소일자</label>
													<input className="flex-1 border border-blue-300 rounded px-2 py-1 bg-slate-50" value={formatMemberDate(selectedMember?.P_SDT) || '-'} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">퇴소일자</label>
													<input className="flex-1 border border-blue-300 rounded px-2 py-1 bg-slate-50" value={formatMemberDate(selectedMember?.P_EDT) || '-'} readOnly />
												</div>
												<div className="col-span-12 flex items-center gap-2">
													<label className="w-24 shrink-0 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">퇴소 사유</label>
													<input className="flex-1 border border-blue-300 rounded px-2 py-1 bg-slate-50" value={selectedMember?.P_CINFO?.trim() ? String(selectedMember.P_CINFO) : '-'} readOnly />
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약일자</label>
													<input 
														type="date" 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={
															selectedMember?.P_CTDT 
																? selectedMember.P_CTDT.substring(0, 10)
																: (contractInfo.CDT ? contractInfo.CDT.substring(0, 10) : '')
														}
														readOnly
													/>
												</div>

												{/* 2행 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">보험자 부담율</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.INSPER ? `${contractInfo.INSPER}%` : ''}
														readOnly
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.USRPER ? `${contractInfo.USRPER}%` : ''}
														readOnly
													/>
												</div>

												{/* 3행 */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">수급자 부담율 구분</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={getUSRGULabel(contractInfo.USRGU)}
														readOnly
													/>
												</div>
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">계약기간</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={
															contractInfo.SVSDT && contractInfo.SVEDT
																? `${contractInfo.SVSDT.substring(0, 10)} ~ ${contractInfo.SVEDT.substring(0, 10)}`
																: contractInfo.SVSDT
																	? `${contractInfo.SVSDT.substring(0, 10)} ~`
																	: ''
														}
														readOnly
													/>
												</div>

												{/* 4행 */}
												{/* <div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">등록 사원</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.INEMPNM || ''}
														readOnly
													/>
												</div> */}
												<div className="col-span-12 md:col-span-6 flex items-center gap-2">
													<label className="w-24 px-2 py-1 text-sm bg-blue-100 border border-blue-300 rounded text-blue-900">비고</label>
													<input 
														className="flex-1 border border-blue-300 rounded px-2 py-1 bg-white" 
														value={contractInfo.ETC || ''}
														readOnly
													/>
												</div>
											</>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* 하단 2컬럼 카드: 요양급여 상세 / 부담금 정보 */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* 요양급여 상세 */}
							<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
								<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
									<h3 className="text-lg font-semibold text-blue-900">요양급여 상세</h3>
									{/* <button className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900">상세보기</button> */}
								</div>
								<div className="p-4 space-y-2 text-sm">
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">기본급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.EAMT ? `${Number(contractInfo.EAMT).toLocaleString()}원` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">추가급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.ETAMT ? `${Number(contractInfo.ETAMT).toLocaleString()}원` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">특별급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.ESAMT ? `${Number(contractInfo.ESAMT).toLocaleString()}원` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">총급여</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo ? 
												`${(Number(contractInfo.EAMT || 0) + Number(contractInfo.ETAMT || 0) + Number(contractInfo.ESAMT || 0)).toLocaleString()}원`
												: '-'
											}
										</span>
									</div>
								</div>
							</div>

							{/* 부담금 정보 */}
							<div className="border border-blue-300 rounded-lg bg-white shadow-sm">
								<div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-100">
									<h3 className="text-lg font-semibold text-blue-900">부담금 정보</h3>
									{/* <button className="px-3 py-1 text-sm border border-blue-400 rounded bg-blue-200 hover:bg-blue-300 text-blue-900">부담금 관리</button> */}
								</div>
								<div className="p-4 space-y-2 text-sm">
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">본인부담률</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.USRPER ? `${contractInfo.USRPER}%` : '-'}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">부담금액</span>
										<span className="flex-1 border-b border-blue-200">-</span>
									</div>
									{/* <div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">수급자 내용</span>
										<span className="flex-1 border-b border-blue-200">
											{contractInfo?.USRINFO || '-'}
										</span>
									</div> */}
									<div className="flex items-center gap-2">
										<span className="w-24 text-blue-900/80">결제방법</span>
										<span className="flex-1 border-b border-blue-200">
											{getCHGULabel(contractInfo?.CHGU)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</section>
			</div>
		</div>
    );
}
