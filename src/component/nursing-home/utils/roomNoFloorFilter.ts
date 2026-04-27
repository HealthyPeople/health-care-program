import { NO_ROOM_VALUE, extractFloorFromRoomNo, normalizeRoomNo } from './roomNoFloor';

export function matchesSelectedFloorByRoomNo(roomNo: unknown, selectedFloor: string): boolean {
	if (!selectedFloor) return true;

	if (selectedFloor === NO_ROOM_VALUE) {
		return normalizeRoomNo(roomNo) === '';
	}

	const memberFloor = extractFloorFromRoomNo(roomNo);
	const selectedFloorNum = Number(String(selectedFloor).trim());
	if (!Number.isFinite(selectedFloorNum)) return false;
	return memberFloor === selectedFloorNum;
}

