"use client";

/**
 * @file 수급자정보 — UI 부분 컴포넌트 (MemberInfoAddressDetailModal.tsx)
 *
 * @description
 * 주소 검색 후 상세주소를 받아 전체 주소 문자열을 확정하는 모달입니다.
 *
 * @module component/nursing-home/pages/member-info/MemberInfoAddressDetailModal
 */
import React, { useEffect, useRef, useState } from 'react';
import { composeMemberAddress } from './MemberInfoUtils';

export type MemberInfoAddressDetailModalProps = {
	zip: string;
	baseAddress: string;
	onCancel: () => void;
	onSave: (detailAddress: string) => void;
};

export default function MemberInfoAddressDetailModal({
	zip,
	baseAddress,
	onCancel,
	onSave,
}: MemberInfoAddressDetailModalProps) {
	const [detailAddress, setDetailAddress] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const fullAddress = composeMemberAddress(baseAddress, detailAddress);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(detailAddress.trim());
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="member-address-detail-title"
				className="w-full max-w-md overflow-hidden rounded-lg border border-blue-300 bg-white shadow-lg"
			>
				<div className="border-b border-blue-200 bg-blue-100 px-4 py-3">
					<h3 id="member-address-detail-title" className="text-lg font-semibold text-blue-900">
						상세주소 입력
					</h3>
				</div>
				<form onSubmit={handleSubmit}>
					<div className="space-y-3 p-4">
						<div className="flex flex-col gap-1">
							<span className="text-sm text-blue-900">우편번호</span>
							<div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-sm text-blue-900">
								{zip || '-'}
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-sm text-blue-900">주소</span>
							<div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-sm text-blue-900">
								{baseAddress || '-'}
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<label htmlFor="member-address-detail" className="text-sm text-blue-900">
								상세주소
							</label>
							<input
								id="member-address-detail"
								ref={inputRef}
								type="text"
								value={detailAddress}
								onChange={(e) => setDetailAddress(e.target.value)}
								className="w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								placeholder="상세주소를 입력하세요 (예: 101동 101호)"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-sm text-blue-900">저장될 주소</span>
							<div className="rounded border border-blue-300 bg-white px-2 py-1.5 text-sm font-medium text-blue-900">
								{fullAddress || '-'}
							</div>
						</div>
					</div>
					<div className="flex justify-end gap-2 border-t border-blue-200 bg-blue-50 px-4 py-3">
						<button
							type="button"
							onClick={onCancel}
							className="rounded border border-blue-400 bg-white px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100"
						>
							취소
						</button>
						<button
							type="submit"
							className="rounded border border-blue-600 bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600"
						>
							저장
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
