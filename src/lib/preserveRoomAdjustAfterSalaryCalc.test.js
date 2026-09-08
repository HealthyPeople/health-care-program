/**
 * @file 병실조정료 유지 — 스냅샷 정규화 검증
 *
 * @module lib/preserveRoomAdjustAfterSalaryCalc.test
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
	ALL_PNUM,
	isAllPnum,
	normalizeSnapshot,
	normalizeSnapshotRow,
	mergeRoomAdjustSnapshots,
} = require('./preserveRoomAdjustAfterSalaryCalc');

describe('preserveRoomAdjustAfterSalaryCalc', () => {
	it('전체계산 pnum은 스냅샷 범위를 월 전체로 본다', () => {
		assert.equal(isAllPnum(ALL_PNUM), true);
		assert.equal(isAllPnum(9999999), true);
		assert.equal(isAllPnum(null), true);
		assert.equal(isAllPnum(22), false);
		assert.equal(isAllPnum('22'), false);
	});

	it('스냅샷 행 — PNUM 정리, BSAL7 음수 유지', () => {
		assert.deepEqual(normalizeSnapshotRow({ PNUM: ' 22 ', BSAL7: -50000 }), {
			pnum: '22',
			bsal7: -50000,
		});
		assert.deepEqual(normalizeSnapshotRow({ PNUM: 61, BSAL7: '-100,000' }), {
			pnum: '61',
			bsal7: -100000,
		});
		assert.equal(normalizeSnapshotRow({ PNUM: '  ', BSAL7: -1 }).pnum, '');
	});

	it('빈 PNUM은 복원 대상에서 제외', () => {
		const rows = normalizeSnapshot([
			{ PNUM: '22', BSAL7: -50000 },
			{ PNUM: '', BSAL7: -1 },
			{ PNUM: '61', BSAL7: 0 },
		]);
		assert.equal(rows.length, 2);
		assert.equal(rows[0].bsal7, -50000);
		assert.equal(rows[1].bsal7, 0);
	});

	it('화면 payload pnum/bsal7 별칭을 인식한다', () => {
		const rows = normalizeSnapshot([{ pnum: '22', bsal7: -50000 }]);
		assert.deepEqual(rows, [{ pnum: '22', bsal7: -50000 }]);
	});

	it('mergeRoomAdjustSnapshots — 화면 값이 DB를 덮는다', () => {
		const merged = mergeRoomAdjustSnapshots(
			[
				{ PNUM: '22', BSAL7: -50000 },
				{ PNUM: '23', BSAL7: -10000 },
			],
			[{ pnum: '22', bsal7: -80000 }]
		);
		const byPnum = Object.fromEntries(merged.map((r) => [r.pnum, r.bsal7]));
		assert.equal(byPnum['22'], -80000);
		assert.equal(byPnum['23'], -10000);
	});
});
