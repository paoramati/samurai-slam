# Architecture

## Tech Stack
- **Engine**: Phaser 3.90+ (arcade physics, no gravity)
- **UI**: SvelteKit 2 (SSR disabled — Phaser requires browser APIs)
- **Language**: TypeScript 5.7
- **Bundler**: Vite 6

## Scene Flow
```
Boot → Preloader → MainMenu → Game → GameOver
```
Each scene calls `this.scene.start('NextSceneName')` to advance (or `changeScene()` for the
Svelte-exposed method). Every scene emits `current-scene-ready` at the **end** of `create()`.

| Scene | Responsibility |
|-------|---------------|
| `Boot` | Immediately starts Preloader — no assets, no logic |
| `Preloader` | Shows loading bar, calls `TextureFactory.generateAll()`, starts MainMenu |
| `MainMenu` | Title screen + START GAME button, waits for click |
| `Game` | Full gameplay: dungeon, player, enemies, combat, loot, HUD |
| `GameOver` | Win/lose screen; emits `game-over` and `current-scene-ready` |

## Svelte-Phaser Bridge
`src/PhaserGame.svelte` creates the Phaser `Game` instance on `onMount` (targeting `#game-container`)
and exposes a `phaserRef` binding:

```ts
type TPhaserRef = { game: Game | null; scene: Scene | null };
```

`phaserRef.scene` is kept current by listening to `current-scene-ready` on the EventBus.
Parent components (e.g. `+page.svelte`) can bind to `phaserRef` and receive a `currentActiveScene`
callback to react to scene transitions from Svelte.

## EventBus
`src/game/EventBus.ts` — a single `Phaser.Events.EventEmitter` singleton used for all
Svelte↔Phaser and system↔system communication.

| Event | Payload | Direction |
|-------|---------|-----------|
| `current-scene-ready` | `scene: Scene` | Scene → Svelte |
| `player-melee` | `{ x, y, angle }` | Player → CombatSystem |
| `player-shot` | `{ x, y, angle }` | Player → Game (fires projectile) |
| `enemy-died` | `{ x, y, score }` | Enemy/Boss → LootSystem |
| `boss-died` | _(none)_ | Boss (tween onComplete) → Game |
| `game-over` | `{ score, won }` | GameOver scene → Svelte |

**Cleanup rule**: every subscriber must call `EventBus.removeAllListeners(eventName)` in its
`destroy()` method to prevent listener leaks across scene restarts.

## Physics
Arcade physics engine, zero gravity (`gravity: { x: 0, y: 0 }`). Canvas is 1024×768.
World bounds are set dynamically in `Game.create()` to cover the full dungeon width.
All movement is velocity-based (`setVelocity`); no forces or impulses are used.

## Dungeon Layout
The dungeon is generated at runtime by `DungeonGenerator.generate(scene, 5)`:

- **5 rooms** in a horizontal chain
- Each room: **640 × 480 px** (20 × 15 tiles at 32 px/tile)
- Corridors: **128 px long** (4 tiles), **96 px wide** (3 tiles), centred vertically
- Room `worldX` = `i × (640 + 128)` = `i × 768`
- Total world width: `5 × 640 + 4 × 128 = 3712 px`
- Room 4 (index 4) is the boss room — no regular enemies spawn there

Doors are represented as `Door` objects on each `RoomData`. Room transitions trigger when the
player walks within 48 px of a door marker. The camera pans to the new room centre.

## Combat System
All hit detection is distance-based (no physics overlap for melee).

| Attack | Damage | Cooldown | Range | Trigger |
|--------|--------|----------|-------|---------|
| Melee | 25 | 600 ms | 70 px radius | F key (`player-melee` event) |
| Ranged (player) | 15 | 350 ms | unlimited (1500 ms TTL) | Mouse click (`player-shot` event) |
| Enemy contact | 10 (var 0) / 8 (var 1) | 1200 ms per enemy | 28 px | `CombatSystem.update()` |
| Boss contact | 20 | 1200 ms | 40 px | `CombatSystem.update()` |
| Boss projectile | 12 | 2 s burst (4-way) | unlimited | Phase 2 timer |

Boss enters **phase 2** when HP ≤ 150 (50 % of 300): tint changes to purple, speed increases
from 50 → 80, and a looping timer fires 4 projectiles at 0°, 90°, 180°, 270° every 2 s.

## Input
Player uses **native DOM keyboard events** (`window.addEventListener`) — NOT Phaser's keyboard
plugin. The `keysDown: Set<string>` tracks currently held keys by `e.code`. Mouse clicks are
handled via Phaser's `this.input.on('pointerdown', ...)` in `Game.ts`.
