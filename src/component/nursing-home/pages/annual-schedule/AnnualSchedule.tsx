"use client";

import React, { useState, useEffect } from "react";

interface ScheduleItem {
	id?: number;
	date: string;
	title: string;
	content: string;
	type?: string; // 일정 유형 (행사, 휴무, 기타 등)
}

export default function AnnualSchedule() {
	const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
	const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [formData, setFormData] = useState<ScheduleItem>({
		date: "",
		title: "",
		content: "",
		type: "",
	});

	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const getDayOfWeek = (date: Date): string => {
		const days = ["일", "월", "화", "수", "목", "금", "토"];
		return days[date.getDay()];
	};

	// 선택한 년/월의 일정만 필터링
	const filteredSchedules = scheduleList.filter((schedule) => {
		const scheduleDate = new Date(schedule.date);
		return (
			scheduleDate.getFullYear() === selectedYear &&
			scheduleDate.getMonth() + 1 === selectedMonth
		);
	});

	// 선택한 월의 날짜들 생성
	const getMonthDates = (): Date[] => {
		const dates: Date[] = [];
		const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
		const lastDay = new Date(selectedYear, selectedMonth, 0);
		for (let i = 1; i <= lastDay.getDate(); i++) {
			dates.push(new Date(selectedYear, selectedMonth - 1, i));
		}
		return dates;
	};

	const monthDates = getMonthDates();

	// 일정 조회 (추후 API 연동)
	const fetchSchedules = async () => {
		setLoading(true);
		try {
			// TODO: API 연동
			// const response = await fetch(`/api/schedules?year=${selectedYear}`);
			// const result = await response.json();
			// if (result.success) {
			//   setScheduleList(result.data || []);
			// }
			setScheduleList([]);
		} catch (err) {
			// 일정 조회 오류
		} finally {
			setLoading(false);
		}
	};

	// 일정 저장
	const handleSave = async () => {
		if (!formData.date || !formData.title.trim()) {
			alert("날짜와 제목을 입력해주세요.");
			return;
		}

		try {
			// TODO: API 연동
			// const response = await fetch("/api/schedules", {
			//   method: isEditMode ? "PUT" : "POST",
			//   headers: { "Content-Type": "application/json" },
			//   body: JSON.stringify(formData),
			// });
			// const result = await response.json();
			// if (result.success) {
			//   alert(isEditMode ? "일정이 수정되었습니다." : "일정이 등록되었습니다.");
			//   fetchSchedules();
			//   handleCloseModal();
			// }

			// 임시: 로컬 상태에 추가
			if (isEditMode && selectedSchedule) {
				setScheduleList((prev) =>
					prev.map((item) => (item.id === selectedSchedule.id ? { ...formData, id: item.id } : item))
				);
			} else {
				const newSchedule: ScheduleItem = {
					...formData,
					id: Date.now(),
				};
				setScheduleList((prev) => [...prev, newSchedule]);
			}
			alert(isEditMode ? "일정이 수정되었습니다." : "일정이 등록되었습니다.");
			handleCloseModal();
		} catch (err) {
			alert("일정 저장 중 오류가 발생했습니다.");
		}
	};

	// 일정 삭제
	const handleDelete = async () => {
		if (!selectedSchedule) {
			alert("삭제할 일정을 선택해주세요.");
			return;
		}

		if (!confirm("정말 삭제하시겠습니까?")) {
			return;
		}

		try {
			// TODO: API 연동
			// const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
			//   method: "DELETE",
			// });
			// const result = await response.json();
			// if (result.success) {
			//   alert("일정이 삭제되었습니다.");
			//   fetchSchedules();
			//   setSelectedSchedule(null);
			// }

			// 임시: 로컬 상태에서 삭제
			setScheduleList((prev) => prev.filter((item) => item.id !== selectedSchedule.id));
			setSelectedSchedule(null);
			alert("일정이 삭제되었습니다.");
		} catch (err) {
			alert("일정 삭제 중 오류가 발생했습니다.");
		}
	};

	// 모달 열기 (등록)
	const handleOpenModal = () => {
		setIsEditMode(false);
		setFormData({
			date: formatDate(new Date(selectedYear, selectedMonth - 1, 1)),
			title: "",
			content: "",
			type: "",
		});
		setIsModalOpen(true);
	};

	// 모달 열기 (수정)
	const handleOpenEditModal = (schedule: ScheduleItem) => {
		setIsEditMode(true);
		setSelectedSchedule(schedule);
		setFormData({
			date: schedule.date,
			title: schedule.title,
			content: schedule.content,
			type: schedule.type || "",
		});
		setIsModalOpen(true);
	};

	// 모달 닫기
	const handleCloseModal = () => {
		setIsModalOpen(false);
		setIsEditMode(false);
		setSelectedSchedule(null);
		setFormData({
			date: "",
			title: "",
			content: "",
			type: "",
		});
	};

	// 일정 선택
	const handleSelectSchedule = (schedule: ScheduleItem) => {
		setSelectedSchedule(schedule);
	};

	// 날짜 클릭 시 해당 날짜로 일정 등록 모달 열기
	const handleDateClick = (date: Date) => {
		setIsEditMode(false);
		setFormData({
			date: formatDate(date),
			title: "",
			content: "",
			type: "",
		});
		setIsModalOpen(true);
	};

	// 해당 날짜의 일정 가져오기
	const getSchedulesForDate = (date: Date): ScheduleItem[] => {
		const dateStr = formatDate(date);
		return filteredSchedules.filter((schedule) => schedule.date === dateStr);
	};

	// 년도 변경
	const handleYearChange = (delta: number) => {
		setSelectedYear(selectedYear + delta);
	};

	// 월 변경
	const handleMonthChange = (delta: number) => {
		let newMonth = selectedMonth + delta;
		let newYear = selectedYear;
		if (newMonth > 12) {
			newMonth = 1;
			newYear += 1;
		} else if (newMonth < 1) {
			newMonth = 12;
			newYear -= 1;
		}
		setSelectedMonth(newMonth);
		setSelectedYear(newYear);
	};

	// 오늘로 이동
	const handleToday = () => {
		const today = new Date();
		setSelectedYear(today.getFullYear());
		setSelectedMonth(today.getMonth() + 1);
	};

	const handleClose = () => {
		if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
	};

	useEffect(() => {
		fetchSchedules();
	}, [selectedYear]);

	return (
		<div className="flex flex-col min-h-screen bg-white text-black">
			{/* 상단: 제목 + 년/월 선택 + 버튼 */}
			<div className="border-b border-blue-200 bg-blue-50/50 p-4">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<h1 className="rounded border border-blue-300 bg-blue-100 px-4 py-2 text-base font-semibold text-blue-900">
						연간 일정
					</h1>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => handleYearChange(-1)}
							className="rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
						>
							◀
						</button>
						<span className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 font-medium">
							{selectedYear}년
						</span>
						<button
							type="button"
							onClick={() => handleYearChange(1)}
							className="rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
						>
							▶
						</button>
						<button
							type="button"
							onClick={() => handleMonthChange(-1)}
							className="rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
						>
							◀
						</button>
						<span className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-900 font-medium">
							{selectedMonth}월
						</span>
						<button
							type="button"
							onClick={() => handleMonthChange(1)}
							className="rounded border border-blue-400 bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-300"
						>
							▶
						</button>
						<button
							type="button"
							onClick={handleToday}
							className="rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							오늘
						</button>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleOpenModal}
							className="rounded border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
						>
							일정 등록
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
						>
							닫기
						</button>
					</div>
				</div>
			</div>

			{/* 메인: 월별 캘린더 + 일정 목록 */}
			<div className="flex flex-1 gap-4 p-4 overflow-hidden">
				{/* 왼쪽: 월별 캘린더 */}
				<div className="flex-1 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="border-b border-blue-200 bg-blue-100 px-4 py-2 font-semibold text-blue-900 shrink-0">
						{selectedYear}년 {selectedMonth}월
					</div>
					<div className="flex-1 overflow-auto p-4">
						<div className="grid grid-cols-7 gap-2">
							{/* 요일 헤더 */}
							{["일", "월", "화", "수", "목", "금", "토"].map((day) => (
								<div
									key={day}
									className="text-center font-semibold text-blue-900 py-2 border-b border-blue-200"
								>
									{day}
								</div>
							))}
							{/* 날짜 셀 */}
							{monthDates.map((date, idx) => {
								const dateStr = formatDate(date);
								const daySchedules = getSchedulesForDate(date);
								const isToday = formatDate(new Date()) === dateStr;
								const isSelected =
									selectedSchedule && selectedSchedule.date === dateStr;
								return (
									<div
										key={idx}
										onClick={() => handleDateClick(date)}
										className={`min-h-[100px] border border-blue-200 rounded p-2 cursor-pointer hover:bg-blue-50 ${
											isToday ? "bg-blue-100 border-blue-400" : ""
										} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
									>
										<div
											className={`text-sm font-medium mb-1 ${
												isToday ? "text-blue-600" : "text-blue-900"
											}`}
										>
											{date.getDate()}
										</div>
										<div className="space-y-1">
											{daySchedules.slice(0, 2).map((schedule, sIdx) => (
												<div
													key={sIdx}
													onClick={(e) => {
														e.stopPropagation();
														handleSelectSchedule(schedule);
													}}
													className="text-xs bg-blue-200 text-blue-900 px-1 py-0.5 rounded truncate"
												>
													{schedule.title}
												</div>
											))}
											{daySchedules.length > 2 && (
												<div className="text-xs text-blue-600">
													+{daySchedules.length - 2}개
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* 오른쪽: 일정 목록 */}
				<div className="w-96 shrink-0 flex flex-col rounded-lg border border-blue-300 bg-white overflow-hidden">
					<div className="border-b border-blue-200 bg-blue-100 px-3 py-2 font-semibold text-blue-900 shrink-0">
						일정 목록 ({filteredSchedules.length}개)
					</div>
					<div className="flex-1 overflow-auto min-h-0">
						{loading ? (
							<div className="px-3 py-8 text-center text-blue-900/60">로딩 중...</div>
						) : filteredSchedules.length === 0 ? (
							<div className="px-3 py-8 text-center text-blue-900/60">일정이 없습니다</div>
						) : (
							<div className="p-2 space-y-2">
								{filteredSchedules.map((schedule) => (
									<div
										key={schedule.id || schedule.date + schedule.title}
										onClick={() => handleSelectSchedule(schedule)}
										className={`border border-blue-200 rounded p-3 cursor-pointer hover:bg-blue-50 ${
											selectedSchedule?.id === schedule.id ? "bg-blue-100 border-blue-400" : ""
										}`}
									>
										<div className="text-sm font-semibold text-blue-900 mb-1">
											{schedule.title}
										</div>
										<div className="text-xs text-blue-700 mb-1">{schedule.date}</div>
										{schedule.content && (
											<div className="text-xs text-blue-900/70 line-clamp-2">
												{schedule.content}
											</div>
										)}
										{schedule.type && (
											<div className="text-xs text-blue-600 mt-1">[{schedule.type}]</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
					{selectedSchedule && (
						<div className="border-t border-blue-200 bg-blue-50 p-3 space-y-2 shrink-0">
							<button
								type="button"
								onClick={() => handleOpenEditModal(selectedSchedule)}
								className="w-full rounded border border-blue-400 bg-blue-200 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								수정
							</button>
							<button
								type="button"
								onClick={handleDelete}
								className="w-full rounded border border-red-400 bg-red-200 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-300"
							>
								삭제
							</button>
						</div>
					)}
				</div>
			</div>

			{/* 일정 등록/수정 모달 */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="w-full max-w-2xl rounded-lg border border-blue-300 bg-white shadow-lg">
						<div className="border-b border-blue-200 bg-blue-100 px-6 py-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-blue-900">
								{isEditMode ? "일정 수정" : "일정 등록"}
							</h2>
							<button
								type="button"
								onClick={handleCloseModal}
								className="rounded border border-blue-400 bg-blue-200 px-4 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								닫기
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									날짜
								</label>
								<input
									type="date"
									value={formData.date}
									onChange={(e) => setFormData({ ...formData, date: e.target.value })}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									제목
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) => setFormData({ ...formData, title: e.target.value })}
									placeholder="일정 제목을 입력하세요"
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									유형
								</label>
								<select
									value={formData.type}
									onChange={(e) => setFormData({ ...formData, type: e.target.value })}
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none"
								>
									<option value="">선택</option>
									<option value="행사">행사</option>
									<option value="휴무">휴무</option>
									<option value="교육">교육</option>
									<option value="기타">기타</option>
								</select>
							</div>
							<div className="flex items-start gap-2">
								<label className="w-24 shrink-0 px-2 py-1.5 text-sm font-medium bg-blue-100 border border-blue-300 rounded text-blue-900">
									내용
								</label>
								<textarea
									value={formData.content}
									onChange={(e) => setFormData({ ...formData, content: e.target.value })}
									rows={4}
									placeholder="일정 내용을 입력하세요"
									className="flex-1 rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-blue-900 focus:border-blue-500 focus:outline-none resize-y"
								/>
							</div>
						</div>
						<div className="border-t border-blue-200 bg-blue-50 px-6 py-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={handleCloseModal}
								className="rounded border border-blue-400 bg-blue-200 px-6 py-2 text-sm font-medium text-blue-900 hover:bg-blue-300"
							>
								취소
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="rounded border border-blue-500 bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600"
							>
								저장
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
