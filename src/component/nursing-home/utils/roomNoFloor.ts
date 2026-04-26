export const NO_ROOM_VALUE = '__NO_ROOM__';

export function normalizeRoomNo(roomNo: unknown): string {
  const s = String(roomNo ?? '').trim();
  return s;
}

export function extractFloorFromRoomNo(roomNo: unknown): number | null {
  const s = normalizeRoomNo(roomNo);
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  // 104 => 1층, 1203 => 12층
  return Math.floor(n / 100);
}

export function countNoRoom<T extends { ROOM_NO?: unknown }>(members: T[]): number {
  return members.filter((m) => normalizeRoomNo(m?.ROOM_NO) === '').length;
}

export function availableFloorsFromMembers<T extends { ROOM_NO?: unknown }>(members: T[]): number[] {
  return Array.from(
    new Set(members.map((m) => extractFloorFromRoomNo(m?.ROOM_NO)).filter((f): f is number => f !== null))
  ).sort((a, b) => a - b);
}

/**
 * 최신 YYYYMM 기준 F14090에서 ROOM_NO를 가져와 members(주로 F10010) 데이터에 병합.
 * - key: PNUM (F14090는 세션 ANCD로 이미 제한됨)
 */
export async function attachLatestRoomNoByPnum<T extends { PNUM?: unknown; ROOM_NO?: unknown }>(
  members: T[]
): Promise<T[]> {
  if (!Array.isArray(members) || members.length === 0) return members;
  try {
    const res = await fetch('/api/f14090');
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.data)) return members;

    const roomByPnum = new Map<string, unknown>();
    json.data.forEach((row: any) => {
      const pnumKey = String(row?.PNUM ?? '').trim();
      if (!pnumKey) return;
      roomByPnum.set(pnumKey, row?.ROOM_NO ?? null);
    });

    return members.map((m) => {
      const pnumKey = String((m as any)?.PNUM ?? '').trim();
      const roomNo = roomByPnum.get(pnumKey);
      return { ...(m as any), ROOM_NO: roomNo ?? (m as any).ROOM_NO ?? null };
    }) as T[];
  } catch {
    return members;
  }
}

