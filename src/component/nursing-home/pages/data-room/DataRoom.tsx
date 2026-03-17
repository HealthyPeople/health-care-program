"use client";

import React, { useMemo, useState } from "react";

type DataRoomCategory = "전체" | "공지" | "서식" | "교육" | "기타";

interface DataRoomFile {
	id: string;
	category: Exclude<DataRoomCategory, "전체">;
	title: string;
	description: string;
	uploader: string;
	createdAt: string; // YYYY-MM-DD
	originalFilename: string;
	sizeText: string; // "123 KB"
	downloadCount: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const demoFiles: DataRoomFile[] = [
	{
		id: "f1",
		category: "서식",
		title: "입소자 기본정보 서식",
		description: "입소자 기본정보 입력용 서식입니다.",
		uploader: "관리자",
		createdAt: "2025-12-18",
		originalFilename: "입소자_기본정보_서식.xlsx",
		sizeText: "84 KB",
		downloadCount: 12,
	},
	{
		id: "f2",
		category: "교육",
		title: "직원 안전교육 자료",
		description: "2026년 1분기 안전교육 자료(PDF)",
		uploader: "관리자",
		createdAt: formatDate(new Date()),
		originalFilename: "안전교육_1분기.pdf",
		sizeText: "1.2 MB",
		downloadCount: 3,
	},
	{
		id: "f3",
		category: "공지",
		title: "근태 입력 가이드",
		description: "근태 등록/수정 방법 가이드",
		uploader: "관리자",
		createdAt: "2026-02-01",
		originalFilename: "근태입력가이드.docx",
		sizeText: "210 KB",
		downloadCount: 27,
	},
];

function classNames(...xs: Array<string | false | null | undefined>) {
	return xs.filter(Boolean).join(" ");
}

export default function DataRoom() {
	const todayStr = useMemo(() => formatDate(new Date()), []);

	const [category, setCategory] = useState<DataRoomCategory>("전체");
	const [query, setQuery] = useState<string>("");

	const [files, setFiles] = useState<DataRoomFile[]>(demoFiles);
	const [selectedId, setSelectedId] = useState<string>(demoFiles[0]?.id || "");

	const [currentPage, setCurrentPage] = useState<number>(1);
	const pageSize = 10;

	const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
	const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

	const filteredFiles = useMemo(() => {
		const q = query.trim();
		return files
			.filter((f) => (category === "전체" ? true : f.category === category))
			.filter((f) => {
				if (!q) return true;
				return (
					f.title.includes(q) ||
					f.description.includes(q) ||
					f.originalFilename.includes(q) ||
					f.uploader.includes(q)
				);
			})
			.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
	}, [files, category, query]);

	const totalPages = Math.max(1, Math.ceil(filteredFiles.length / pageSize));
	const safePage = Math.min(Math.max(1, currentPage), totalPages);
	const pagedFiles = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filteredFiles.slice(start, start + pageSize);
	}, [filteredFiles, safePage]);

	React.useEffect(() => {
		setCurrentPage(1);
	}, [category, query]);

	React.useEffect(() => {
		if (!filteredFiles.length) {
			setSelectedId("");
			return;
		}
		if (!selectedId || !filteredFiles.some((f) => f.id === selectedId)) {
			setSelectedId(filteredFiles[0].id);
		}
	}, [filteredFiles, selectedId]);

	const selectedFile = useMemo(() => files.find((f) => f.id === selectedId) || null, [files, selectedId]);

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	const handleSearch = () => {
		// 퍼블: 로컬 필터링
	};

	const handleDownload = (id: string) => {
		setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, downloadCount: f.downloadCount + 1 } : f)));
	};

	const handleDelete = () => {
		if (!selectedId) return;
		setFiles((prev) => prev.filter((f) => f.id !== selectedId));
		setSelectedId("");
		setIsDetailOpen(false);
	};

	const [uploadCategory, setUploadCategory] = useState<Exclude<DataRoomCategory, "전체">>("서식");
	const [uploadTitle, setUploadTitle] = useState<string>("");
	const [uploadDesc, setUploadDesc] = useState<string>("");
	const [uploadUploader, setUploadUploader] = useState<string>("관리자");
	const [uploadFile, setUploadFile] = useState<File | null>(null);

	const resetUpload = () => {
		setUploadCategory("서식");
		setUploadTitle("");
		setUploadDesc("");
		setUploadUploader("관리자");
		setUploadFile(null);
	};

	const handleCreate = () => {
		if (!uploadTitle.trim() || !uploadFile) return;
		const id = `f${Date.now()}`;
		const sizeText =
			uploadFile.size >= 1024 * 1024
				? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`
				: `${Math.max(1, Math.round(uploadFile.size / 1024))} KB`;
		const row: DataRoomFile = {
			id,
			category: uploadCategory,
			title: uploadTitle.trim(),
			description: uploadDesc.trim(),
			uploader: uploadUploader.trim() || "사용자",
			createdAt: todayStr,
			originalFilename: uploadFile.name,
			sizeText,
			downloadCount: 0,
		};
		setFiles((prev) => [row, ...prev]);
		setSelectedId(id);
		setIsUploadOpen(false);
		resetUpload();
	};

	return (
		<div className="min-h-screen bg-white text-black">
			<div className="p-4 space-y-4">
				{/* 상단 */}
				<div className="flex items-stretch gap-3">
					<div className="flex-1 rounded border border-blue-300 bg-blue-100 px-6 py-4 text-center text-2xl font-semibold text-blue-900">
						자료실
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								분류
							</span>
							<select
								value={category}
								onChange={(e) => setCategory(e.target.value as DataRoomCategory)}
								className="rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							>
								<option value="전체">전체</option>
								<option value="공지">공지</option>
								<option value="서식">서식</option>
								<option value="교육">교육</option>
								<option value="기타">기타</option>
							</select>
						</div>

						<div className="flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-3">
							<span className="rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">
								검색
							</span>
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="제목/설명/파일명/등록자"
								className="w-80 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
							/>
						</div>

						<button
							type="button"
							onClick={handleSearch}
							className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							검색
						</button>
						<button
							type="button"
							onClick={() => setIsUploadOpen(true)}
							className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							등록
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="w-28 rounded border border-blue-400 bg-blue-200 px-6 py-3 text-base font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>

				{/* 본문: 목록 + 상세 */}
				<div className="grid grid-cols-12 gap-3">
					{/* 목록 */}
					<div className="col-span-12 xl:col-span-7 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900 flex items-center justify-between">
							<div>자료 목록</div>
							<div className="text-xs text-blue-900/60">
								총 {filteredFiles.length}건 · {safePage}/{totalPages}페이지
							</div>
						</div>
						<div className="max-h-[640px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10 border-b border-blue-200 bg-blue-50">
									<tr>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											분류
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											제목
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											파일명
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											등록일
										</th>
										<th className="border-r border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">
											등록자
										</th>
										<th className="px-3 py-2 text-left font-semibold text-blue-900">다운로드</th>
									</tr>
								</thead>
								<tbody>
									{pagedFiles.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-3 py-12 text-center text-blue-900/60">
												데이터가 없습니다.
											</td>
										</tr>
									) : (
										pagedFiles.map((f) => {
											const isSelected = f.id === selectedId;
											return (
												<tr
													key={f.id}
													onClick={() => setSelectedId(f.id)}
													onDoubleClick={() => setIsDetailOpen(true)}
													className={classNames(
														"cursor-pointer border-b border-blue-50 hover:bg-blue-50/60",
														isSelected && "bg-blue-100"
													)}
												>
													<td className="border-r border-blue-100 px-3 py-2">{f.category}</td>
													<td className="border-r border-blue-100 px-3 py-2">{f.title}</td>
													<td className="border-r border-blue-100 px-3 py-2">{f.originalFilename}</td>
													<td className="border-r border-blue-100 px-3 py-2">{f.createdAt}</td>
													<td className="border-r border-blue-100 px-3 py-2">{f.uploader}</td>
													<td className="px-3 py-2">{f.downloadCount}</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{/* 페이지네이션 */}
						<div className="border-t border-blue-200 bg-blue-50/40 px-3 py-2 flex items-center justify-between">
							<div className="text-xs text-blue-900/60">행을 더블클릭하면 상세보기</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setCurrentPage(1)}
									className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
									disabled={safePage === 1}
								>
									처음
								</button>
								<button
									type="button"
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
									disabled={safePage === 1}
								>
									이전
								</button>
								<div className="text-xs text-blue-900">
									{safePage} / {totalPages}
								</div>
								<button
									type="button"
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
									disabled={safePage === totalPages}
								>
									다음
								</button>
								<button
									type="button"
									onClick={() => setCurrentPage(totalPages)}
									className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
									disabled={safePage === totalPages}
								>
									마지막
								</button>
							</div>
						</div>
					</div>

					{/* 우측 상세 패널 */}
					<div className="col-span-12 xl:col-span-5 rounded-lg border border-blue-300 bg-white overflow-hidden">
						<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900 flex items-center justify-between">
							<div>상세 정보</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => selectedId && setIsDetailOpen(true)}
									disabled={!selectedId}
									className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									상세보기
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={!selectedId}
									className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
								>
									삭제
								</button>
							</div>
						</div>

						<div className="p-3 space-y-2">
							{!selectedFile ? (
								<div className="py-16 text-center text-blue-900/60">항목을 선택하세요.</div>
							) : (
								<>
									<div className="grid grid-cols-12 gap-2 items-center">
										<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											분류
										</span>
										<input
											readOnly
											value={selectedFile.category}
											className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
										/>
									</div>
									<div className="grid grid-cols-12 gap-2 items-center">
										<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											제목
										</span>
										<input
											readOnly
											value={selectedFile.title}
											className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
										/>
									</div>
									<div className="grid grid-cols-12 gap-2 items-center">
										<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											등록일
										</span>
										<input
											readOnly
											value={selectedFile.createdAt}
											className="col-span-4 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
										/>
										<span className="col-span-2 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											등록자
										</span>
										<input
											readOnly
											value={selectedFile.uploader}
											className="col-span-3 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
										/>
									</div>
									<div className="grid grid-cols-12 gap-2 items-center">
										<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
											파일
										</span>
										<input
											readOnly
											value={`${selectedFile.originalFilename} (${selectedFile.sizeText})`}
											className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
										/>
									</div>
									<div className="grid grid-cols-12 gap-2">
										<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
											설명
										</span>
										<textarea
											readOnly
											value={selectedFile.description}
											rows={8}
											className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 resize-none"
										/>
									</div>
									<div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
										<button
											type="button"
											onClick={() => handleDownload(selectedFile.id)}
											className="rounded border border-blue-400 bg-blue-200 px-5 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
										>
											다운로드
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* 상세 모달 */}
			{isDetailOpen && selectedFile && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-3xl rounded-lg border border-blue-300 bg-white shadow-xl overflow-hidden">
						<div className="flex items-center justify-between border-b border-blue-200 bg-blue-100 px-4 py-3">
							<div className="text-base font-semibold text-blue-900">자료 상세</div>
							<button
								type="button"
								onClick={() => setIsDetailOpen(false)}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									제목
								</span>
								<div className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900">
									{selectedFile.title}
								</div>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									파일명
								</span>
								<div className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900">
									{selectedFile.originalFilename} ({selectedFile.sizeText})
								</div>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									등록정보
								</span>
								<div className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900">
									{selectedFile.createdAt} · {selectedFile.uploader} · 다운로드 {selectedFile.downloadCount}회
								</div>
							</div>
							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									설명
								</span>
								<div className="col-span-9 rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 whitespace-pre-wrap min-h-[180px]">
									{selectedFile.description || "-"}
								</div>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 border-t border-blue-200 bg-blue-50/40 px-4 py-3">
							<button
								type="button"
								onClick={() => handleDownload(selectedFile.id)}
								className="rounded border border-blue-400 bg-blue-200 px-5 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								다운로드
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 등록 모달 */}
			{isUploadOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-2xl rounded-lg border border-blue-300 bg-white shadow-xl overflow-hidden">
						<div className="flex items-center justify-between border-b border-blue-200 bg-blue-100 px-4 py-3">
							<div className="text-base font-semibold text-blue-900">자료 등록</div>
							<button
								type="button"
								onClick={() => {
									setIsUploadOpen(false);
									resetUpload();
								}}
								className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									분류
								</span>
								<select
									value={uploadCategory}
									onChange={(e) => setUploadCategory(e.target.value as Exclude<DataRoomCategory, "전체">)}
									className="col-span-9 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								>
									<option value="공지">공지</option>
									<option value="서식">서식</option>
									<option value="교육">교육</option>
									<option value="기타">기타</option>
								</select>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									제목
								</span>
								<input
									value={uploadTitle}
									onChange={(e) => setUploadTitle(e.target.value)}
									className="col-span-9 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									등록자
								</span>
								<input
									value={uploadUploader}
									onChange={(e) => setUploadUploader(e.target.value)}
									className="col-span-9 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>
							<div className="grid grid-cols-12 gap-2">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center self-start">
									설명
								</span>
								<textarea
									value={uploadDesc}
									onChange={(e) => setUploadDesc(e.target.value)}
									rows={6}
									className="col-span-9 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 resize-none"
								/>
							</div>
							<div className="grid grid-cols-12 gap-2 items-center">
								<span className="col-span-3 rounded border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900 text-center">
									파일
								</span>
								<input
									type="file"
									onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
									className="col-span-9 rounded border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900"
								/>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 border-t border-blue-200 bg-blue-50/40 px-4 py-3">
							<button
								type="button"
								onClick={handleCreate}
								disabled={!uploadTitle.trim() || !uploadFile}
								className="rounded border border-blue-400 bg-blue-200 px-6 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300 disabled:opacity-50"
							>
								저장
							</button>
							<button
								type="button"
								onClick={() => {
									setIsUploadOpen(false);
									resetUpload();
								}}
								className="rounded border border-blue-400 bg-blue-200 px-6 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								취소
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

