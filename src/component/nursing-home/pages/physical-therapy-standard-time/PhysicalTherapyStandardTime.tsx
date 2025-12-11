"use client";
import React, { useState, useEffect } from 'react';

export default function PhysicalTherapyStandardTime() {
	const [centerName, setCenterName] = useState('너싱홈 해원');
	const [loading, setLoading] = useState(false);

	// 운동치료 - 기구이용
	const [equipmentTherapy, setEquipmentTherapy] = useState({
		bicycle: '', // 자전거
		resistanceBand: '', // 탄력밴드운동
		fullBodyMassager: '', // 전신안마기
		pully: '', // Pully
		shoulderJointExerciser: '', // 견관절운동기
		parallelBarWalking: '', // 평행봉걷기
		treadmill: '', // 런닝머신
		footMassager: '', // 발맛사지기
		tiltingTable: '', // 틸팅테이블
		ballExercise: '', // 공운동
		beadThreading: '', // 구술꿰기
		pegboardInsertion: '' // 패그보드끼우기
	});

	// 운동치료 - 단순운동
	const [simpleExercise, setSimpleExercise] = useState({
		manualExercise: '', // 도수운동
		rom: '50', // ROM
		strengthExercise: '50', // 근력운동
		functionalImprovement: '', // 기능향상운동
		weightShiftSupport: '', // 체중이동/지지훈련
		gaitTraining: '10' // 보행훈련
	});

	// Modalities
	const [modalities, setModalities] = useState({
		hotColdPack: '30', // Hot&Cold Pack
		infraredTherapy: '20', // 적외선치료
		ultrasoundTherapy: '', // 초음파치료
		tens: '', // 경피신경전기자극치료
		interferentialCurrent: '', // 간접전류치료
		electricalStimulation: '', // 전기자극치료
		paraffinTherapy: '' // 파라핀치료
	});

	// 센터명 조회
	useEffect(() => {
		const fetchCenterName = async () => {
			try {
				// TODO: 실제 API 엔드포인트로 변경 필요
				// const response = await fetch('/api/f00110');
				// const result = await response.json();
				// if (result.success && result.data && result.data.length > 0) {
				// 	setCenterName(result.data[0].ANNM || '너싱홈 해원');
				// }
			} catch (err) {
				console.error('센터명 조회 오류:', err);
			}
		};
		fetchCenterName();
	}, []);

	// 등록 함수
	const handleRegister = async () => {
		setLoading(true);
		try {
			// TODO: 실제 API 엔드포인트로 변경 필요
			// const response = await fetch('/api/physical-therapy-standard-time', {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({
			// 		centerName,
			// 		equipmentTherapy,
			// 		simpleExercise,
			// 		modalities
			// 	})
			// });

			alert('물리치료표준시간이 등록되었습니다.');
		} catch (err) {
			console.error('물리치료표준시간 등록 오류:', err);
			alert('물리치료표준시간 등록 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	// 닫기 함수
	const handleClose = () => {
		window.history.back();
	};

	// 운동치료 - 기구이용 항목 렌더링
	const renderEquipmentItem = (key: string, label: string) => {
		const value = equipmentTherapy[key as keyof typeof equipmentTherapy];
		return (
			<div key={key} className="flex items-center gap-2 py-2 border-b border-blue-100">
				<label className="text-sm text-blue-900 min-w-[180px]">{label}</label>
				<input
					type="number"
					value={value}
					onChange={(e) => setEquipmentTherapy(prev => ({ ...prev, [key]: e.target.value }))}
					className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
					placeholder="분"
				/>
			</div>
		);
	};

	// 운동치료 - 단순운동 항목 렌더링
	const renderSimpleExerciseItem = (key: string, label: string) => {
		const value = simpleExercise[key as keyof typeof simpleExercise];
		return (
			<div key={key} className="flex items-center gap-2 py-2 border-b border-blue-100">
				<label className="text-sm text-blue-900 min-w-[180px]">{label}</label>
				<input
					type="number"
					value={value}
					onChange={(e) => setSimpleExercise(prev => ({ ...prev, [key]: e.target.value }))}
					className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
					placeholder="분"
				/>
			</div>
		);
	};

	// Modalities 항목 렌더링
	const renderModalityItem = (key: string, label: string) => {
		const value = modalities[key as keyof typeof modalities];
		return (
			<div key={key} className="flex items-center gap-2 py-2 border-b border-blue-100">
				<label className="text-sm text-blue-900 min-w-[180px]">{label}</label>
				<input
					type="number"
					value={value}
					onChange={(e) => setModalities(prev => ({ ...prev, [key]: e.target.value }))}
					className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500"
					placeholder="분"
				/>
			</div>
		);
	};

	return (
		<div className="flex flex-col min-h-screen text-black bg-white">
			<div className="p-6">
				{/* 상단: 센터명 */}
				<div className="mb-6">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-blue-900 whitespace-nowrap bg-blue-100 px-3 py-1.5 border border-blue-300 rounded">센터명</label>
						<input
							type="text"
							value={centerName}
							onChange={(e) => setCenterName(e.target.value)}
							className="px-3 py-1.5 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:border-blue-500 min-w-[200px]"
						/>
					</div>
				</div>

				{/* 메인 컨텐츠: 3개 컬럼 */}
				<div className="flex gap-6 mb-6">
					{/* Column 1: 운동치료 - 기구이용 */}
					<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
						<div className="pb-2 mb-4 border-b border-blue-200">
							<h3 className="text-base font-semibold text-blue-900">운동치료 - 기구이용</h3>
						</div>
						<div className="space-y-1">
							{renderEquipmentItem('bicycle', '자전거')}
							{renderEquipmentItem('resistanceBand', '탄력밴드운동')}
							{renderEquipmentItem('fullBodyMassager', '전신안마기')}
							{renderEquipmentItem('pully', 'Pully')}
							{renderEquipmentItem('shoulderJointExerciser', '견관절운동기')}
							{renderEquipmentItem('parallelBarWalking', '평행봉걷기')}
							{renderEquipmentItem('treadmill', '런닝머신')}
							{renderEquipmentItem('footMassager', '발맛사지기')}
							{renderEquipmentItem('tiltingTable', '틸팅테이블')}
							{renderEquipmentItem('ballExercise', '공운동')}
							{renderEquipmentItem('beadThreading', '구술꿰기')}
							{renderEquipmentItem('pegboardInsertion', '패그보드끼우기')}
						</div>
					</div>

					{/* Column 2: 운동치료 - 단순운동 */}
					<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
						<div className="pb-2 mb-4 border-b border-blue-200">
							<h3 className="text-base font-semibold text-blue-900">운동치료 - 단순운동</h3>
						</div>
						<div className="space-y-1">
							{renderSimpleExerciseItem('manualExercise', '도수운동')}
							{renderSimpleExerciseItem('rom', 'ROM')}
							{renderSimpleExerciseItem('strengthExercise', '근력운동')}
							{renderSimpleExerciseItem('functionalImprovement', '기능향상운동')}
							{renderSimpleExerciseItem('weightShiftSupport', '체중이동/지지훈련')}
							{renderSimpleExerciseItem('gaitTraining', '보행훈련')}
						</div>
					</div>

					{/* Column 3: Modalities */}
					<div className="flex-1 p-4 bg-white border border-blue-300 rounded-lg">
						<div className="pb-2 mb-4 border-b border-blue-200">
							<h3 className="text-base font-semibold text-blue-900">Modalities</h3>
						</div>
						<div className="space-y-1">
							{renderModalityItem('hotColdPack', 'Hot&Cold Pack')}
							{renderModalityItem('infraredTherapy', '적외선치료')}
							{renderModalityItem('ultrasoundTherapy', '초음파치료')}
							{renderModalityItem('tens', '경피신경전기자극치료')}
							{renderModalityItem('interferentialCurrent', '간접전류치료')}
							{renderModalityItem('electricalStimulation', '전기자극치료')}
							{renderModalityItem('paraffinTherapy', '파라핀치료')}
						</div>
					</div>
				</div>

				{/* 하단 버튼 영역 */}
				<div className="flex justify-end gap-2">
					<button
						onClick={handleRegister}
						disabled={loading}
						className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						등록
					</button>
					<button
						onClick={handleClose}
						className="px-6 py-2 text-sm font-medium text-blue-900 bg-blue-200 border border-blue-400 rounded hover:bg-blue-300"
					>
						닫기
					</button>
				</div>
			</div>
		</div>
	);
}
