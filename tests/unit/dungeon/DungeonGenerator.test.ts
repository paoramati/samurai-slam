import { describe, test, expect, beforeEach } from 'vitest';
import { DungeonGenerator } from '../../../src/game/dungeon/DungeonGenerator';
import { makeMockScene } from '../helpers/MockScene';

const ROOM_W = 640;
const ROOM_H = 480;
const CORRIDOR_LEN = 4 * 32; // GAP_TILES * TILE = 128

describe('DungeonGenerator.generate', () => {
	let scene: any;

	beforeEach(() => {
		scene = makeMockScene();
	});

	test('generates exactly N rooms (default 5)', () => {
		const result = DungeonGenerator.generate(scene, 5);
		expect(result.rooms).toHaveLength(5);
	});

	test('generates exactly N rooms for various counts', () => {
		for (const n of [1, 3, 7]) {
			const s = makeMockScene();
			const result = DungeonGenerator.generate(s, n);
			expect(result.rooms).toHaveLength(n);
		}
	});

	test('rooms have sequential IDs starting at 0', () => {
		const { rooms } = DungeonGenerator.generate(scene, 4);
		rooms.forEach((room, i) => expect(room.id).toBe(i));
	});

	test('only the last room is isBossRoom', () => {
		const { rooms } = DungeonGenerator.generate(scene, 5);
		rooms.slice(0, -1).forEach((r) => expect(r.isBossRoom).toBe(false));
		expect(rooms[4].isBossRoom).toBe(true);
	});

	test('all rooms start cleared=false, spawned=false', () => {
		const { rooms } = DungeonGenerator.generate(scene, 4);
		for (const room of rooms) {
			expect(room.cleared).toBe(false);
			expect(room.spawned).toBe(false);
		}
	});

	test('rooms are 640×480 px', () => {
		const { rooms } = DungeonGenerator.generate(scene, 3);
		for (const room of rooms) {
			expect(room.widthPx).toBe(ROOM_W);
			expect(room.heightPx).toBe(ROOM_H);
		}
	});

	test('worldX positions: i * (ROOM_W + CORRIDOR_LEN)', () => {
		const { rooms } = DungeonGenerator.generate(scene, 5);
		rooms.forEach((room, i) => {
			expect(room.worldX).toBe(i * (ROOM_W + CORRIDOR_LEN));
		});
	});

	test('all rooms have worldY = 0', () => {
		const { rooms } = DungeonGenerator.generate(scene, 4);
		for (const room of rooms) {
			expect(room.worldY).toBe(0);
		}
	});

	test('worldWidth = N * ROOM_W + (N-1) * CORRIDOR_LEN', () => {
		for (const n of [1, 3, 5]) {
			const s = makeMockScene();
			const { worldWidth } = DungeonGenerator.generate(s, n);
			expect(worldWidth).toBe(n * ROOM_W + (n - 1) * CORRIDOR_LEN);
		}
	});

	test('worldHeight = room height (480)', () => {
		const { worldHeight } = DungeonGenerator.generate(scene, 3);
		expect(worldHeight).toBe(ROOM_H);
	});

	describe('door layout', () => {
		test('first room has only a right door', () => {
			const { rooms } = DungeonGenerator.generate(scene, 5);
			const first = rooms[0];
			expect(first.doors).toHaveLength(1);
			expect(first.doors[0].side).toBe('right');
		});

		test('last room has only a left door', () => {
			const { rooms } = DungeonGenerator.generate(scene, 5);
			const last = rooms[4];
			expect(last.doors).toHaveLength(1);
			expect(last.doors[0].side).toBe('left');
		});

		test('middle rooms have both left and right doors', () => {
			const { rooms } = DungeonGenerator.generate(scene, 5);
			for (const room of rooms.slice(1, -1)) {
				const sides = room.doors.map((d) => d.side);
				expect(sides).toContain('left');
				expect(sides).toContain('right');
				expect(room.doors).toHaveLength(2);
			}
		});

		test('door targetRoomId points to adjacent room', () => {
			const { rooms } = DungeonGenerator.generate(scene, 5);
			for (const room of rooms) {
				for (const door of room.doors) {
					if (door.side === 'right') {
						expect(door.targetRoomId).toBe(room.id + 1);
					} else if (door.side === 'left') {
						expect(door.targetRoomId).toBe(room.id - 1);
					}
				}
			}
		});
	});

	describe('edge case: numRooms=1', () => {
		test('single room has no doors', () => {
			const s = makeMockScene();
			const { rooms } = DungeonGenerator.generate(s, 1);
			expect(rooms[0].doors).toHaveLength(0);
		});

		test('single room is the boss room', () => {
			const s = makeMockScene();
			const { rooms } = DungeonGenerator.generate(s, 1);
			expect(rooms[0].isBossRoom).toBe(true);
		});

		test('worldWidth = ROOM_W when numRooms=1', () => {
			const s = makeMockScene();
			const { worldWidth } = DungeonGenerator.generate(s, 1);
			expect(worldWidth).toBe(ROOM_W);
		});
	});

	test('wallGroups map has an entry for each room', () => {
		const n = 4;
		const { wallGroups, rooms } = DungeonGenerator.generate(scene, n);
		for (const room of rooms) {
			expect(wallGroups.has(room.id)).toBe(true);
		}
	});
});
