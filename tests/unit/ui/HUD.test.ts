import { describe, test, expect, beforeEach, vi } from 'vitest';
import { HUD } from '../../../src/game/ui/HUD';
import { makeMockScene } from '../helpers/MockScene';

// The HP color logic from HUD.update (mirrors the inline ternary):
//   pct > 0.5  → 0x4caf50 (green)
//   pct > 0.25 → 0xff9800 (orange)
//   else       → 0xf44336 (red)
function expectedHpColor(pct: number): number {
	return pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
}

function makePlayerMock(hp: number, maxHp = 100, score = 0) {
	return { hp, maxHp, score, isAlive: true } as any;
}

function makeBossMock(hp: number, maxHp = 300, isAlive = true) {
	return { hp, maxHp, isAlive } as any;
}

describe('HUD', () => {
	let scene: any;
	let hud: HUD;

	beforeEach(() => {
		scene = makeMockScene();
		hud = new HUD(scene);
	});

	// -----------------------------------------------------------------------
	// HP color helper — boundary tests with maxHp=100
	// -----------------------------------------------------------------------
	describe('HP color logic (maxHp=100)', () => {
		test('pct > 0.5 → green', () => {
			expect(expectedHpColor(51 / 100)).toBe(0x4caf50);
		});

		test('pct = 0.5 → orange (boundary: not > 0.5)', () => {
			expect(expectedHpColor(50 / 100)).toBe(0xff9800);
		});

		test('pct > 0.25 and < 0.5 → orange', () => {
			expect(expectedHpColor(26 / 100)).toBe(0xff9800);
		});

		test('pct = 0.25 → red (boundary: not > 0.25)', () => {
			expect(expectedHpColor(25 / 100)).toBe(0xf44336);
		});

		test('pct < 0.25 → red', () => {
			expect(expectedHpColor(10 / 100)).toBe(0xf44336);
		});
	});

	// -----------------------------------------------------------------------
	// HP color helper — boundary tests with maxHp=300 (Boss-scale)
	// -----------------------------------------------------------------------
	describe('HP color logic (maxHp=300)', () => {
		test('pct > 0.5 (hp=151): green', () => {
			expect(expectedHpColor(151 / 300)).toBe(0x4caf50);
		});

		test('pct = 0.5 (hp=150): orange', () => {
			expect(expectedHpColor(150 / 300)).toBe(0xff9800);
		});

		test('pct = 0.25 (hp=75): red', () => {
			expect(expectedHpColor(75 / 300)).toBe(0xf44336);
		});
	});

	// -----------------------------------------------------------------------
	// HUD.update actually applies the correct fill color via hpBar spy
	// -----------------------------------------------------------------------
	describe('HUD.update HP bar color', () => {
		function getHpFillColor(): number {
			const hpBar = (hud as any).hpBar;
			const calls = hpBar.fillStyle.mock.calls;
			// Second fillStyle call is the health fill color
			return calls[1][0];
		}

		test('full health → green fill color', () => {
			hud.update(makePlayerMock(100, 100), 0, 5, null);
			expect(getHpFillColor()).toBe(0x4caf50);
		});

		test('50% health → orange fill color', () => {
			hud.update(makePlayerMock(50, 100), 0, 5, null);
			expect(getHpFillColor()).toBe(0xff9800);
		});

		test('25% health → red fill color', () => {
			hud.update(makePlayerMock(25, 100), 0, 5, null);
			expect(getHpFillColor()).toBe(0xf44336);
		});
	});

	// -----------------------------------------------------------------------
	// Room text format: "Room ${id+1} / ${total}"
	// -----------------------------------------------------------------------
	describe('room text format', () => {
		function getRoomText(): string {
			const roomText = (hud as any).roomText;
			const calls = roomText.setText.mock.calls;
			return calls[calls.length - 1][0];
		}

		test('first room: "Room 1 / 5"', () => {
			hud.update(makePlayerMock(100), 0, 5, null);
			expect(getRoomText()).toBe('Room 1 / 5');
		});

		test('last room: "Room 5 / 5"', () => {
			hud.update(makePlayerMock(100), 4, 5, null);
			expect(getRoomText()).toBe('Room 5 / 5');
		});

		test('middle room: "Room 3 / 5"', () => {
			hud.update(makePlayerMock(100), 2, 5, null);
			expect(getRoomText()).toBe('Room 3 / 5');
		});

		test('single-room dungeon: "Room 1 / 1"', () => {
			hud.update(makePlayerMock(100), 0, 1, null);
			expect(getRoomText()).toBe('Room 1 / 1');
		});
	});

	// -----------------------------------------------------------------------
	// Boss bar visibility
	// -----------------------------------------------------------------------
	describe('boss bar', () => {
		test('boss bar hidden when no boss', () => {
			hud.update(makePlayerMock(100), 0, 5, null);
			const bossBarBg = (hud as any).bossBarBg;
			expect(bossBarBg.setVisible).toHaveBeenCalledWith(false);
		});

		test('boss bar visible when boss is alive', () => {
			hud.update(makePlayerMock(100), 0, 5, makeBossMock(200));
			const bossBarBg = (hud as any).bossBarBg;
			expect(bossBarBg.setVisible).toHaveBeenCalledWith(true);
		});

		test('boss bar hidden when boss is dead', () => {
			hud.update(makePlayerMock(100), 0, 5, makeBossMock(0, 300, false));
			const bossBarBg = (hud as any).bossBarBg;
			expect(bossBarBg.setVisible).toHaveBeenCalledWith(false);
		});
	});

	// -----------------------------------------------------------------------
	// Score / HP label
	// -----------------------------------------------------------------------
	test('score text shows HP and score', () => {
		hud.update(makePlayerMock(75, 100, 42), 0, 5, null);
		const scoreText = (hud as any).scoreText;
		const text = scoreText.setText.mock.calls[0][0];
		expect(text).toContain('75');
		expect(text).toContain('100');
		expect(text).toContain('42');
	});
});
