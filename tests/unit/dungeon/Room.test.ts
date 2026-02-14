import { describe, test, expect } from 'vitest';
import type { RoomData, Door } from '../../../src/game/dungeon/Room';

describe('RoomData interface shape', () => {
	test('has all required fields', () => {
		const room: RoomData = {
			id: 0,
			worldX: 0,
			worldY: 0,
			widthPx: 640,
			heightPx: 480,
			isBossRoom: false,
			doors: [],
			cleared: false,
			spawned: false
		};
		expect(room.id).toBe(0);
		expect(room.worldX).toBe(0);
		expect(room.worldY).toBe(0);
		expect(room.widthPx).toBe(640);
		expect(room.heightPx).toBe(480);
		expect(room.isBossRoom).toBe(false);
		expect(room.doors).toEqual([]);
		expect(room.cleared).toBe(false);
		expect(room.spawned).toBe(false);
	});
});

describe('Door interface shape', () => {
	const sides: Door['side'][] = ['top', 'bottom', 'left', 'right'];

	for (const side of sides) {
		test(`Door with side='${side}' is valid`, () => {
			const door: Door = { x: 10, y: 20, targetRoomId: 1, side };
			expect(door.x).toBe(10);
			expect(door.y).toBe(20);
			expect(door.targetRoomId).toBe(1);
			expect(door.side).toBe(side);
		});
	}
});
