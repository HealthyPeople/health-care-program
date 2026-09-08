/**
 * @file 수급자정보 — 커스텀 훅 (useMemberInfo.test.js)
 *
 * @description
 * 요양원 수급자정보 기능의 커스텀 훅입니다. 폴더: component/nursing-home/pages/member-info
 *
 * @module component/nursing-home/pages/member-info/useMemberInfo.test
 */
/**
 * useMemberInfo — 훅 export·state/handler·API·부모 연결 최소 검증
 * (비즈니스 로직/fetch 실행 테스트 아님)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const HOOK_TS = path.join(DIR, 'useMemberInfo.ts');
const VIEW_TSX = path.join(DIR, 'MemberInfoView.tsx');

describe('useMemberInfo — wiring', () => {
	it('훅 export·핵심 state 존재', () => {
		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /export function useMemberInfo\(\)/);
		assert.match(hook, /const \[members, setMembers\] = useState<MemberData\[\]>\(\[\]\)/);
		assert.match(hook, /const \[selectedMember, setSelectedMember\]/);
		assert.match(hook, /const \[selectedStatus, setSelectedStatus\] = useState<string>\('입소'\)/);
		assert.match(hook, /const \[isCreating, setIsCreating\]/);
		assert.match(hook, /const \[institutions, setInstitutions\]/);
		assert.match(hook, /const hasUnsavedChanges = useRef\(false\)/);
	});

	it('CRUD·필터·출력 핸들러 존재', () => {
		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /const fetchMembers = async/);
		assert.match(hook, /const handleMemberSelect =/);
		assert.match(hook, /const handleEditClick =/);
		assert.match(hook, /const handleSave = async/);
		assert.match(hook, /const handleCancel =/);
		assert.match(hook, /const handleDelete = async/);
		assert.match(hook, /const handleCreateSave = async/);
		assert.match(hook, /const handleCreateCancel =/);
		assert.match(hook, /const getNextPNUM = async/);
		assert.match(hook, /const handleAddressSearch =/);
		assert.match(hook, /const handleAddressDetailSave =/);
		assert.match(hook, /const handleAddressDetailCancel =/);
		assert.match(hook, /setAddressSearchDraft/);
		assert.doesNotMatch(hook, /newMemberDetailAddr/);
		assert.doesNotMatch(hook, /editedMemberDetailAddr/);
		assert.match(hook, /const handlePrintRecipientCard = async/);
		assert.match(hook, /const handlePrintAllMembers = async/);
		assert.match(hook, /const handleStatusChange =/);
		assert.match(hook, /const handleGradeChange =/);
		assert.match(hook, /const handleFloorChange =/);
		assert.match(hook, /const handleSearch =/);
	});

	it('API URL 유지', () => {
		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /`\/api\/f10010\?name=\$\{encodeURIComponent\(nameSearch\.trim\(\)\)\}`/);
		assert.match(hook, /fetch\('\/api\/f10010'/);
		assert.match(hook, /fetch\('\/api\/f00110'\)/);
		assert.match(hook, /`\/api\/v10010c\?pnum=\$\{encodeURIComponent\(pnum\)\}`/);
		assert.match(hook, /`\/api\/v10010a\$\{statusParam\}`/);
		assert.match(hook, /\[돌봄시설DB\]\.\[dbo\]\.\[F10010\]/);
	});

	it('roomNoFloor 헬퍼로 층수 필터 유지', () => {
		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /from '\.\.\/\.\.\/utils\/roomNoFloor'/);
		assert.match(hook, /availableFloorsFromMembers\(members\)/);
		assert.match(hook, /ROOM_NO: normalizeRoomNo/);
		assert.doesNotMatch(hook, /attachLatestRoomNoByPnum/);
		assert.doesNotMatch(hook, /saveRoomNoByPnum/);
		assert.match(hook, /selectedFloor === NO_ROOM_VALUE/);
		assert.match(hook, /extractMemberFloor\(member\)/);
		assert.match(hook, /normalizeRoomNo\(member\?\.ROOM_NO\)/);
	});

	it('Utils/Print 모듈을 import하고 로컬 재정의를 두지 않음', () => {
		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /from '\.\/MemberInfoUtils'/);
		assert.match(hook, /from '\.\/MemberInfoPrint'/);
		assert.doesNotMatch(hook, /function escapeHtml\(/);
		assert.doesNotMatch(hook, /function buildMemberForEdit\(/);
		assert.doesNotMatch(hook, /function buildV10010AListPrintHtml\(/);
		assert.doesNotMatch(hook, /<!doctype html>/);
	});

	it('페이지네이션 파생값 반환', () => {
		const hook = fs.readFileSync(HOOK_TS, 'utf8');
		assert.match(hook, /const itemsPerPage = 10/);
		assert.match(hook, /const totalPages = Math\.ceil\(filteredMembers\.length \/ itemsPerPage\)/);
		assert.match(hook, /const currentMembers = filteredMembers\.slice\(startIndex, endIndex\)/);
		assert.match(hook, /currentMembers,/);
		assert.match(hook, /totalPages,/);
		assert.match(hook, /availableFloors,/);
		assert.match(hook, /noRoomValue: NO_ROOM_VALUE,/);
	});

	it('부모(View)는 훅만 사용하고 state를 직접 두지 않음', () => {
		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.match(view, /useMemberInfo\(\)/);
		assert.match(view, /from '\.\/useMemberInfo'/);
		assert.doesNotMatch(view, /useState/);
		assert.doesNotMatch(view, /useEffect/);
		assert.doesNotMatch(view, /useRef/);
		assert.doesNotMatch(view, /fetch\(/);
	});

	it('View 외곽 레이아웃 클래스 유지', () => {
		const view = fs.readFileSync(VIEW_TSX, 'utf8');
		assert.match(view, /className="min-h-screen text-black bg-white"/);
		assert.match(view, /className="mx-auto max-w-\[1200px\] p-4"/);
		assert.match(view, /className="flex gap-4"/);
		assert.match(view, /className="relative flex-1 space-y-4"/);
		assert.match(view, /blur-sm select-none pointer-events-none opacity-70/);
		assert.match(view, /수급자를 선택해주세요/);
	});
});
