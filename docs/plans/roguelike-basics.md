# Samurai Slam — Roguelike Basics Implementation Plan

## Context

This is a fresh Phaser 3 + SvelteKit template project. The `Game` scene is an empty placeholder. The goal is to implement a functional roguelike game loop: one player explores multiple connected dungeon rooms, fights enemies using melee (key) and ranged (click-to-shoot) attacks, and ultimately reaches a final boss room. All graphics are programmatically drawn — no image assets used.

**Player answers:**

- 1 player with keyboard (multi-player designed for but not wired up yet)
- Combat: melee attack key (F) + click to shoot projectile
- Dungeon: multiple connected rooms (3–5 rooms + boss room)
- Win condition: defeat the final boss

---

## Architecture: Files to Create / Modify

```
src/game/
  main.ts                          ← MODIFY: add arcade physics
  TextureFactory.ts                ← CREATE: all programmatic textures
  scenes/
    Boot.ts                        ← MODIFY: remove image load
    Preloader.ts                   ← MODIFY: call TextureFactory, no file loads
    MainMenu.ts                    ← MODIFY: Graphics-only, remove image refs
    Game.ts                        ← REWRITE: orchestrator
    GameOver.ts                    ← MODIFY: show score + won/lost
  entities/
    Player.ts                      ← CREATE
    Enemy.ts                       ← CREATE
    Projectile.ts                  ← CREATE
    Boss.ts                        ← CREATE
  dungeon/
    DungeonGenerator.ts            ← CREATE
    Room.ts                        ← CREATE
  systems/
    CombatSystem.ts                ← CREATE
    LootSystem.ts                  ← CREATE
  ui/
    HUD.ts                         ← CREATE
src/routes/+page.svelte            ← SIMPLIFY: full-screen canvas, remove template buttons
```

---

## Texture Generation Strategy

All textures are generated once in `Preloader.create()` via `TextureFactory.generateAll(scene)`.

**Pattern (RenderTexture approach):**

```ts
const rt = scene.add.renderTexture(0, 0, w, h);
const gfx = scene.add.graphics();
gfx.fillStyle(color);
gfx.fillRect(0, 0, w, h);
rt.draw(gfx);
rt.saveTexture('key');
gfx.destroy();
rt.destroy();
```

`saveTexture('key')` stores the texture game-wide (not scene-scoped), so it survives scene transitions. A static `TextureFactory.generated` flag prevents re-generation on scene restart.

**Textures needed:**
| Key | Shape | Color | Size |
|---|---|---|---|
| `player` | rounded rect | `0x4fc3f7` (blue) | 28×28 |
| `enemy` | rect | `0xef5350` (red) | 24×24 |
| `enemy-fast` | rect | `0xff8f00` (orange) | 18×18 |
| `boss` | rect | `0xce93d8` (purple) | 48×48 |
| `wall` | rect | `0x546e7a` (slate) | 32×32 |
| `floor` | rect | `0x263238` (dark) | 32×32 |
| `loot` | circle | `0xffeb3b` (yellow) | r=6 |
| `projectile` | circle | `0x80deea` (cyan) | r=5 |
| `melee-flash` | arc sector | `0x80cbc4` (teal) | 80×80 |

---

## Dungeon Generation

**`Room.ts`** — data class:

```ts
interface Room {
	id: number;
	x: number;
	y: number; // world position (top-left)
	width: number;
	height: number; // in pixels
	isBossRoom: boolean;
	enemies: Enemy[];
	doors: Door[]; // connections to adjacent rooms
	cleared: boolean;
}
```

**`DungeonGenerator.ts`** — generates 4–6 rooms placed on a grid:

- Rooms are 640×480 minimum, separated by 32px corridor tiles
- Corridors are simple horizontal or vertical tile-wide passages (3 tiles wide)
- Last room is always the boss room
- Each room rendered to a `RenderTexture` as floor + wall tiles (32px tiles, 1px grid gap for visible separation)
- Wall tiles added to a `StaticGroup` for arcade physics collision
- Doors are floor-colored gaps in the wall with a visual marker (brighter floor tile + text "→")

**Room transitions:** When player walks into a door gap, `Game` scene calls `enterRoom(nextRoomId)`. Camera pans to new room using `this.cameras.main.pan(cx, cy, 500, 'Power2')`. Player is repositioned at the entrance. Previous room's enemies stop updating (but remain in world).

**Enemy placement:** Enemies spawn when player _enters_ a room, not on dungeon generation. Boss room spawns the boss only.

---

## Entity Design

### `Player.ts`

```ts
class Player {
	sprite: Phaser.Physics.Arcade.Sprite; // texture: 'player'
	hp: number = 100;
	maxHp = 100;
	score: number = 0;
	lastMeleeTime: number = 0;
	lastShotTime: number = 0;
	isAlive: boolean = true;

	// Input
	cursors: CursorKeys; // arrow keys
	wasd: { W; A; S; D }; // WASD keys
	attackKey: Key; // F key
	// Pointer is passed from scene for ranged attack direction

	update(time, delta, pointer): void;
	// WASD / arrow movement (diagonal normalized)
	// setCollideWorldBounds(true)
	// F key → triggerMelee(time)
	// Pointer click → triggerShot(time, pointer)

	triggerMelee(time): void;
	// Cooldown: 600ms
	// Emit 'player-melee' event with position + facing angle
	// Show melee flash graphic (brief arc tween, 150ms)

	triggerShot(time, pointer): void;
	// Cooldown: 350ms
	// Emit 'player-shot' event with origin + target angle
}
```

**Multi-player note:** `Player` is designed to accept a config object with key bindings, so players 2–4 can be created with different key sets later. The pointer (mouse) remains shared for player 1.

### `Enemy.ts`

- Moves toward player using `Phaser.Math.Angle.Between` + velocity
- Has per-enemy HP bar (Graphics redrawn each frame above sprite)
- `takeDamage(amount)` — flash white, reduce HP, die if 0
- `die()` — deactivate sprite, emit `enemy-died` event at position
- Variant 0 (red): 40 HP, speed 80 — standard
- Variant 1 (orange): 25 HP, speed 140 — fast/fragile

### `Boss.ts`

- Larger sprite (48×48, purple)
- 300 HP, speed 50
- Has its own HP bar drawn as a wide bar at top of screen (via HUD)
- **Phase 2 at 50% HP**: tints darker, shoots 4-directional projectiles every 2s (using `time.addEvent`)
- Death triggers win condition

### `Projectile.ts`

```ts
class Projectile {
	sprite: Phaser.Physics.Arcade.Sprite; // texture: 'projectile'
	damage: number;
	// Moves at fixed velocity set at spawn
	// Destroyed on hitting enemy or wall (or after 1500ms timeout)
}
```

Managed as a `Phaser.Physics.Arcade.Group` in `Game.ts`. `physics.add.overlap(projectileGroup, enemySprites)` handles hit detection.

---

## Systems

### `CombatSystem.ts`

- Listens for `player-melee` event → finds enemies within 70px radius, deals 25 damage to all in range
- `physics.add.overlap(projectileGroup, enemyGroup)` → on overlap, deal 15 damage to enemy, destroy projectile
- `physics.add.overlap(projectileGroup, bossSprite)` → on overlap, deal 15 damage to boss, destroy projectile
- Enemies deal contact damage: distance check < 28px, cooldown 1200ms, 10 damage to player
- Boss contact damage: 20 per hit

### `LootSystem.ts`

- On `enemy-died` event: spawn 1–3 loot drops with scatter offset + pop-in tween
- `update()`: proximity check (< 24px), collect loot (add score), fly-to-player tween then destroy

---

## Room & Game Flow

```
Game.create()
  → DungeonGenerator.generate(scene) → rooms[], wallGroups map
  → TextureFactory.generateAll(scene) (idempotent)
  → Spawn player at room[0] center
  → enterRoom(0) → spawn enemies, setup camera bounds for this room
  → physics.add.collider(player.sprite, wallGroups[0])
  → EventBus.emit('current-scene-ready', this)

Game.update(time, delta)
  → player.update(time, delta, pointer)
  → currentRoom.enemies.forEach(e => e.update(player.x, player.y, delta))
  → combat.update(time, player, currentRoom.enemies, boss)
  → loot.update()
  → hud.update(player, currentRoom, totalRooms, boss?)
  → Check: player walked into door gap → enterRoom(nextId)
  → Check: player.hp <= 0 → endGame(false)

enterRoom(id)
  → Set currentRoom
  → camera.pan(cx, cy, 500)
  → If not cleared: spawnEnemies(room) or spawnBoss(room)
  → physics.add.collider(player.sprite, wallGroups[id])
```

---

## HUD (`HUD.ts`)

All elements use `setScrollFactor(0)` to stay camera-fixed:

- **HP bar**: top-left, 160px wide, color shifts green→orange→red
- **Score**: below HP bar
- **Room counter**: top-center ("Room 2/5")
- **Boss HP bar**: full-width bar at top of screen, only visible in boss room (red fill, labeled "BOSS")
- `showMessage(text, duration)`: centered floating text with fade-out tween

---

## Scene Modifications

### `main.ts`

Add physics config:

```ts
physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } }
```

Change `backgroundColor` to `'#1a1a2e'`.

### `Boot.ts`

Remove `this.load.image(...)` — nothing to load.

### `Preloader.ts`

Replace file loads with `TextureFactory.generateAll(this)`. Keep progress bar graphics cosmetically.

### `MainMenu.ts`

Replace image-based background and logo with Graphics. Keep `changeScene()`. Draw title text + start button using `Graphics.fillRoundedRect` + interactive `Text`.

### `GameOver.ts`

Read `data: { score, won }` from `scene.start('GameOver', data)`. Display win/loss screen with score. "Play Again" button → `scene.start('MainMenu')`.

### `+page.svelte`

Strip template buttons. Full-screen canvas div. Listen on `EventBus` for `'game-over'` to optionally show final score overlay.

---

## Verification

1. `npm run dev` — game loads at `localhost:8080`, no image 404 errors
2. MainMenu renders with title text and clickable Start button
3. Game scene: player (blue square) spawns in first room, can move with WASD/arrows
4. F key triggers melee flash arc; click fires a cyan projectile toward cursor
5. Enemies (red/orange squares) chase player, flash white when hit, die and drop loot
6. Walking into a door transitions camera to next room, new enemies spawn
7. Final room: boss (large purple square) appears, shows wide HP bar at top
8. Boss enters phase 2 at 50% HP (fires projectiles)
9. Defeating boss → "YOU WIN" message → GameOver scene with score
10. Player death → "YOU DIED" → GameOver scene
11. "Play Again" returns to MainMenu
