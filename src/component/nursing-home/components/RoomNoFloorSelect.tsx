"use client";

import React, { useMemo } from 'react';
import { NO_ROOM_VALUE, availableFloorsFromMembers } from '../utils/roomNoFloor';

type MemberLike = { ROOM_NO?: unknown };

type Props = {
	members: MemberLike[];
	value: string;
	onChange: (value: string) => void;
	className?: string;
};

export function RoomNoFloorSelect({ members, value, onChange, className }: Props) {
	const floors = useMemo(() => availableFloorsFromMembers(members || []), [members]);

	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className={className}
		>
			<option value="">층수 전체</option>
			<option value={NO_ROOM_VALUE}>방번호 없음</option>
			{floors.map((floor) => (
				<option key={floor} value={String(floor)}>
					{floor}층
				</option>
			))}
		</select>
	);
}

