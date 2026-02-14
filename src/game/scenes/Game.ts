import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { TextureFactory } from '../TextureFactory';
import { DungeonGenerator } from '../dungeon/DungeonGenerator';
import type { DungeonResult } from '../dungeon/DungeonGenerator';
import type { RoomData } from '../dungeon/Room';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import type { EnemyVariant } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { ProjectileGroup } from '../entities/Projectile';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { HUD } from '../ui/HUD';

const NUM_ROOMS = 5;

export class Game extends Scene {
	private player: Player | null = null;
	private dungeon!: DungeonResult;
	private currentRoomId: number = 0;
	private currentEnemies: Enemy[] = [];
	private boss: Boss | null = null;
	private projectiles!: ProjectileGroup;
	private bossProjectiles!: ProjectileGroup;
	private combat!: CombatSystem;
	private loot!: LootSystem;
	private hud!: HUD;
	private gameEnded: boolean = false;
	private playerColliders: Phaser.Physics.Arcade.Collider[] = [];

	constructor() {
		super('Game');
	}

	create(): void {
		// Reset all session state — Phaser reuses the same instance on scene.start()
		// so instance fields from the previous run must be explicitly cleared.
		this.gameEnded = false;
		this.currentRoomId = 0;
		this.currentEnemies = [];
		this.boss = null;
		this.playerColliders = [];

		// Destroy old player to remove stale keyboard key registrations
		this.player?.destroy();
		this.player = null;

		// Ensure textures exist (idempotent)
		TextureFactory.generateAll(this);

		this.cameras.main.setBackgroundColor(0x1a1a2e);

		// Generate dungeon
		this.dungeon = DungeonGenerator.generate(this, NUM_ROOMS);

		// Set world bounds to entire dungeon width
		this.physics.world.setBounds(0, 0, this.dungeon.worldWidth, this.dungeon.worldHeight);

		// Spawn player at center of first room
		const r0 = this.dungeon.rooms[0];
		const px = r0.worldX + r0.widthPx / 2;
		const py = r0.worldY + r0.heightPx / 2;
		this.player = new Player(this, px, py);

		// Projectile groups
		this.projectiles = new ProjectileGroup(this);
		this.bossProjectiles = new ProjectileGroup(this);

		// Systems
		this.combat = new CombatSystem(this);
		this.loot = new LootSystem(this);
		this.hud = new HUD(this);

		// Boss shoot callback
		// (registered after boss is created in spawnBoss)

		// Input: click to shoot
		this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
			if (this.gameEnded || !this.player.isAlive) return;
			this.player.triggerShot(this.time.now, ptr);
		});

		EventBus.on('player-shot', (data: { x: number; y: number; angle: number }) => {
			this.projectiles.fire(data.x, data.y, data.angle);
		});

		EventBus.on('boss-died', () => {
			this.hud.showMessage('BOSS DEFEATED!', 2000);
			this.time.delayedCall(2500, () => this.endGame(true));
		});

		// Enter first room
		this.enterRoom(0);

		// Camera
		this.cameras.main.setBounds(0, 0, this.dungeon.worldWidth, this.dungeon.worldHeight);
		this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

		EventBus.emit('current-scene-ready', this);
	}

	private enterRoom(id: number): void {
		const room = this.dungeon.rooms[id];
		this.currentRoomId = id;

		// Remove old player-wall colliders
		for (const c of this.playerColliders) this.physics.world.removeCollider(c);
		this.playerColliders = [];

		// Add collider for this room's walls
		const wallGroup = this.dungeon.wallGroups.get(id)!;
		const col = this.physics.add.collider(this.player.sprite, wallGroup);
		this.playerColliders.push(col);

		// Also add colliders for adjacent rooms (corridors are open)
		const prevId = id - 1;
		const nextId = id + 1;
		if (prevId >= 0 && this.dungeon.wallGroups.has(prevId)) {
			const c2 = this.physics.add.collider(
				this.player.sprite,
				this.dungeon.wallGroups.get(prevId)!
			);
			this.playerColliders.push(c2);
		}
		if (nextId < NUM_ROOMS && this.dungeon.wallGroups.has(nextId)) {
			const c3 = this.physics.add.collider(
				this.player.sprite,
				this.dungeon.wallGroups.get(nextId)!
			);
			this.playerColliders.push(c3);
		}

		// Pan camera to room center
		const cx = room.worldX + room.widthPx / 2;
		const cy = room.worldY + room.heightPx / 2;
		this.cameras.main.pan(cx, cy, 500, 'Power2', false, (_cam, progress) => {
			if (progress === 1) {
				this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
			}
		});

		// Spawn enemies if not yet spawned
		if (!room.spawned) {
			room.spawned = true;
			if (room.isBossRoom) {
				this.spawnBoss(room);
			} else {
				this.spawnEnemies(room);
			}
		} else {
			// Restore existing enemy list for current room (enemies are tracked globally per room via IDs)
			// Re-register enemies for combat
			this.combat.setEnemies(this.currentEnemies.filter((e) => e.isAlive));
		}

		const label = room.isBossRoom ? 'BOSS ROOM!' : `Room ${id + 1}`;
		this.hud.showMessage(label, 1500);
	}

	private spawnEnemies(room: RoomData): void {
		// Clear old enemies list for fresh room entry tracking
		// (enemies from prior rooms stay in world but are not in this list)
		this.currentEnemies = this.currentEnemies.filter((e) => e.isAlive);

		const count = Phaser.Math.Between(3, 6);
		const newEnemies: Enemy[] = [];
		const MIN_SPAWN_DIST = 180;
		for (let i = 0; i < count; i++) {
			const margin = 80;
			let ex: number, ey: number;
			let attempts = 0;
			do {
				ex = room.worldX + margin + Math.random() * (room.widthPx - margin * 2);
				ey = room.worldY + margin + Math.random() * (room.heightPx - margin * 2);
				attempts++;
			} while (
				attempts < 20 &&
				Phaser.Math.Distance.Between(ex, ey, this.player.x, this.player.y) < MIN_SPAWN_DIST
			);
			const variant: EnemyVariant = Math.random() < 0.35 ? 1 : 0;
			const enemy = new Enemy(this, ex, ey, variant);
			newEnemies.push(enemy);
		}
		this.currentEnemies.push(...newEnemies);
		this.combat.setEnemies(this.currentEnemies);

		// Setup projectile overlaps for new enemies
		const sprites = newEnemies.map((e) => e.sprite);
		this.combat.setupProjectileOverlaps(this.projectiles, sprites, null);
	}

	private spawnBoss(room: RoomData): void {
		const bx = room.worldX + room.widthPx / 2;
		const by = room.worldY + room.heightPx / 2;
		this.boss = new Boss(this, bx, by);

		this.boss.setShootCallback((x, y, angle) => {
			this.bossProjectiles.fire(x, y, angle, 300, 12);
		});

		// Boss projectiles damage player
		const playerSprite = this.player.sprite;
		this.physics.add.overlap(this.bossProjectiles.group, playerSprite, (obj1, obj2) => {
			// Phaser may swap callback parameter order — identify the projectile explicitly
			const p = (obj1 === playerSprite ? obj2 : obj1) as Phaser.Physics.Arcade.Sprite;
			if (p.active && this.player.isAlive) {
				this.player.takeDamage(p.getData('damage') ?? 12);
				this.bossProjectiles.killProjectile(p);
			}
		});

		this.combat.setBoss(this.boss);
		this.combat.setupProjectileOverlaps(this.projectiles, [], this.boss.sprite);
	}

	update(time: number, delta: number): void {
		if (this.gameEnded) return;

		const ptr = this.input.activePointer;
		this.player.update(time, delta, ptr);

		// Update enemies in current room only
		const activeEnemies = this.currentEnemies.filter((e) => e.isAlive);
		for (const enemy of activeEnemies) {
			enemy.update(this.player.x, this.player.y, delta);
		}

		// Update boss if alive
		if (this.boss && this.boss.isAlive) {
			this.boss.update(this.player.x, this.player.y, delta);
		}

		// Combat contact checks
		this.combat.update(time, this.player);

		// Loot pickup
		this.loot.update(this.player);

		// HUD
		this.hud.update(
			this.player,
			this.currentRoomId,
			NUM_ROOMS,
			this.boss && !this.dungeon.rooms[this.currentRoomId].isBossRoom ? null : this.boss
		);

		// Check room transitions via doors
		this.checkDoorTransitions();

		// Player death
		if (!this.player.isAlive && !this.gameEnded) {
			this.time.delayedCall(800, () => this.endGame(false));
			this.gameEnded = true;
		}
	}

	private checkDoorTransitions(): void {
		const room = this.dungeon.rooms[this.currentRoomId];
		const DOOR_TRIGGER = 48;

		for (const door of room.doors) {
			const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y);
			if (dist < DOOR_TRIGGER) {
				// Reposition player just past the door in the new room
				const targetRoom = this.dungeon.rooms[door.targetRoomId];
				let newPx = this.player.x;
				let newPy = this.player.y;

				if (door.side === 'right') {
					newPx = targetRoom.worldX + 80;
					newPy = targetRoom.worldY + targetRoom.heightPx / 2;
				} else if (door.side === 'left') {
					newPx = targetRoom.worldX + targetRoom.widthPx - 80;
					newPy = targetRoom.worldY + targetRoom.heightPx / 2;
				}

				this.player.sprite.setPosition(newPx, newPy);
				this.enterRoom(door.targetRoomId);
				break;
			}
		}
	}

	private endGame(won: boolean): void {
		const msg = won ? 'YOU WIN!' : 'YOU DIED';
		this.hud.showMessage(msg, 3000);

		this.time.delayedCall(won ? 3000 : 2000, () => {
			this.cleanup();
			this.scene.start('GameOver', { score: this.player.score, won });
		});
	}

	private cleanup(): void {
		EventBus.removeAllListeners('player-shot');
		EventBus.removeAllListeners('boss-died');
		this.combat.destroy();
		this.loot.destroy();
	}

	changeScene(): void {
		this.cleanup();
		this.scene.start('GameOver', { score: this.player?.score ?? 0, won: false });
	}
}
