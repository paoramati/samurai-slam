import { Scene } from 'phaser';
import type { RoomData, Door } from './Room';

const TILE = 32;
const ROOM_COLS = 20; // room width in tiles
const ROOM_ROWS = 15; // room height in tiles
const CORRIDOR_TILES = 3; // corridor width in tiles
const GAP_TILES = 4; // gap between rooms (corridor length)

export interface DungeonResult {
	rooms: RoomData[];
	wallGroups: Map<number, Phaser.Physics.Arcade.StaticGroup>;
	worldWidth: number;
	worldHeight: number;
}

export class DungeonGenerator {
	static generate(scene: Scene, numRooms: number = 5): DungeonResult {
		const rooms: RoomData[] = [];
		const wallGroups = new Map<number, Phaser.Physics.Arcade.StaticGroup>();

		// Layout rooms in a horizontal chain for simplicity
		// Room layout: [room0] -- corridor -- [room1] -- corridor -- ... -- [bossRoom]
		const roomW = ROOM_COLS * TILE;
		const roomH = ROOM_ROWS * TILE;
		const corridorLen = GAP_TILES * TILE;
		const corridorW = CORRIDOR_TILES * TILE;

		// Total world dimensions
		const totalWidth = numRooms * roomW + (numRooms - 1) * corridorLen;
		const totalHeight = roomH + corridorW * 2; // extra vertical space

		// Place rooms horizontally
		for (let i = 0; i < numRooms; i++) {
			const roomX = i * (roomW + corridorLen);
			const roomY = 0;
			const isBossRoom = i === numRooms - 1;

			const doors: Door[] = [];
			if (i > 0) {
				doors.push({
					x: roomX,
					y: roomY + roomH / 2,
					targetRoomId: i - 1,
					side: 'left'
				});
			}
			if (i < numRooms - 1) {
				doors.push({
					x: roomX + roomW,
					y: roomY + roomH / 2,
					targetRoomId: i + 1,
					side: 'right'
				});
			}

			rooms.push({
				id: i,
				worldX: roomX,
				worldY: roomY,
				widthPx: roomW,
				heightPx: roomH,
				isBossRoom,
				doors,
				cleared: false,
				spawned: false
			});
		}

		// Build tile walls for each room
		for (const room of rooms) {
			const wallGroup = scene.physics.add.staticGroup();
			DungeonGenerator.buildRoom(scene, room, rooms, wallGroup, corridorW);
			wallGroups.set(room.id, wallGroup);
		}

		// Build corridors (floor tiles only, no walls for corridors)
		for (let i = 0; i < numRooms - 1; i++) {
			DungeonGenerator.buildCorridor(scene, rooms[i], rooms[i + 1], corridorLen, corridorW);
		}

		return { rooms, wallGroups, worldWidth: totalWidth, worldHeight: roomH };
	}

	private static buildRoom(
		scene: Scene,
		room: RoomData,
		allRooms: RoomData[],
		wallGroup: Phaser.Physics.Arcade.StaticGroup,
		corridorW: number
	): void {
		const { worldX: rx, worldY: ry, widthPx: rw, heightPx: rh } = room;
		const cols = rw / TILE;
		const rows = rh / TILE;

		// Determine door columns (which top/bottom wall tiles are door gaps)
		// Doors on left/right sides: gap is centered vertically (rows/2 ± 1 tile)
		const doorGapHalfTiles = Math.floor(corridorW / TILE / 2);
		const midRow = Math.floor(rows / 2);
		const midCol = Math.floor(cols / 2);

		const leftDoor = room.doors.find((d) => d.side === 'left');
		const rightDoor = room.doors.find((d) => d.side === 'right');

		for (let col = 0; col < cols; col++) {
			for (let row = 0; row < rows; row++) {
				const wx = rx + col * TILE;
				const wy = ry + row * TILE;
				const isTopWall = row === 0;
				const isBottomWall = row === rows - 1;
				const isLeftWall = col === 0;
				const isRightWall = col === cols - 1;
				const isBorderTile = isTopWall || isBottomWall || isLeftWall || isRightWall;

				if (!isBorderTile) {
					// Floor tile
					scene.add.image(wx + TILE / 2, wy + TILE / 2, 'floor').setDepth(-2);
					continue;
				}

				// Check if this border tile is in a door gap
				let isDoorGap = false;
				if (isLeftWall && leftDoor) {
					if (Math.abs(row - midRow) <= doorGapHalfTiles) isDoorGap = true;
				}
				if (isRightWall && rightDoor) {
					if (Math.abs(row - midRow) <= doorGapHalfTiles) isDoorGap = true;
				}

				if (isDoorGap) {
					// Floor tile in door gap
					scene.add.image(wx + TILE / 2, wy + TILE / 2, 'floor').setDepth(-2);
					// Door marker text
					if (
						(isLeftWall && leftDoor && row === midRow) ||
						(isRightWall && rightDoor && row === midRow)
					) {
						const arrow = isLeftWall ? '←' : '→';
						scene.add
							.text(wx + TILE / 2, wy + TILE / 2, arrow, {
								fontSize: '18px',
								color: '#4fc3f7'
							})
							.setOrigin(0.5)
							.setDepth(1);
					}
				} else {
					// Wall tile
					scene.add.image(wx + TILE / 2, wy + TILE / 2, 'wall').setDepth(-1);
					const wallSprite = wallGroup.create(
						wx + TILE / 2,
						wy + TILE / 2,
						'wall'
					) as Phaser.Physics.Arcade.Sprite;
					wallSprite.setVisible(false);
					wallSprite.refreshBody();
				}
			}
		}

		// Room label
		const labelText = room.isBossRoom ? 'BOSS' : `Room ${room.id + 1}`;
		scene.add
			.text(rx + rw / 2, ry + 20, labelText, {
				fontSize: '14px',
				color: '#546e7a'
			})
			.setOrigin(0.5)
			.setDepth(1);

		// Floor tiles for the full interior are already drawn above
	}

	private static buildCorridor(
		scene: Scene,
		roomA: RoomData,
		roomB: RoomData,
		corridorLen: number,
		corridorW: number
	): void {
		// Corridor runs horizontally between right edge of roomA and left edge of roomB
		const startX = roomA.worldX + roomA.widthPx;
		const midY = roomA.worldY + roomA.heightPx / 2;
		const halfW = corridorW / 2;

		const numCols = corridorLen / TILE;
		const numRows = corridorW / TILE;

		for (let col = 0; col < numCols; col++) {
			for (let row = 0; row < numRows; row++) {
				const wx = startX + col * TILE + TILE / 2;
				const wy = midY - halfW + row * TILE + TILE / 2;
				scene.add.image(wx, wy, 'floor').setDepth(-2);
			}
		}
	}
}
