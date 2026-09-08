"use client";

/**
 * @file 수급자·서비스제공일자 미선택 시 본문 블러 안내
 */

type SelectionRequiredOverlayProps = {
	selectedMember?: boolean;
	selectedDate?: boolean;
	/** 지정하면 수급자/일자 기본 문구 대신 이 메시지를 표시합니다. */
	message?: string;
};

export function selectionBlockedClass(blocked: boolean) {
	return blocked ? 'blur-sm select-none pointer-events-none opacity-70' : '';
}

export function SelectionRequiredOverlay({
	selectedMember = true,
	selectedDate = true,
	message,
}: SelectionRequiredOverlayProps) {
	if (selectedMember && selectedDate) return null;

	return (
		<div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/30 backdrop-blur-[1px]">
			<p className="text-center text-lg font-semibold text-blue-900 bg-white/95 px-8 py-5 rounded-lg border border-blue-300 shadow-md max-w-sm">
				{message ||
					(!selectedMember ? '수급자를 선택해주세요' : '서비스제공일자를 선택해주세요')}
			</p>
		</div>
	);
}
