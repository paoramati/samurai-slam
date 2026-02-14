# Module Map

## Entry Points

| File                      | Purpose                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/routes/+page.svelte` | Root page — mounts `PhaserGame`, binds `phaserRef`                                                                                                                 |
| `src/routes/+layout.js`   | Sets `ssr = false` (Phaser requires browser APIs)                                                                                                                  |
| `src/PhaserGame.svelte`   | Creates Phaser `Game` instance on mount; exposes `phaserRef` and `currentActiveScene` callback; listens to `current-scene-ready` to keep `phaserRef.scene` current |
| `src/game/main.ts`        | Phaser `GameConfig` (1024×768, arcade physics, no gravity, bg `#1a1a2e`); exports `StartGame(parent)` factory                                                      |
| `src/game/EventBus.ts`    | Singleton `Phaser.Events.EventEmitter`; the sole communication channel between Phaser and Svelte, and between game systems                                         |

## src/game/scenes/

| File           | Key exports | Notes                                                                                                                                               |
| -------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Boot.ts`      | `Boot`      | Immediately starts `Preloader`; no assets, no EventBus emit                                                                                         |
| `Preloader.ts` | `Preloader` | Shows progress bar; calls `TextureFactory.generateAll()`; starts `MainMenu`                                                                         |
| `MainMenu.ts`  | `MainMenu`  | Title screen; START GAME button → `this.scene.start('Game')`; emits `current-scene-ready`                                                           |
| `Game.ts`      | `Game`      | Main orchestrator — creates dungeon, player, systems, HUD; runs game loop; owns `enterRoom()`, door transitions, enemy/boss spawning, win/lose flow |
| `GameOver.ts`  | `GameOver`  | Win/lose screen; emits `current-scene-ready` and `game-over { score, won }`                                                                         |

## src/game/entities/

All entities are **plain TypeScript classes** that wrap a `Phaser.Physics.Arcade.Sprite`.
Constructor signature: `(scene: Scene, x: number, y: number, ...)`

| File            | Key exports             | Notes                                                                                                                                                                                 |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Player.ts`     | `Player`                | Movement via `window` key events (`keysDown: Set<string>`); emits `player-melee` and `player-shot` via EventBus; owns `triggerMelee()`, `triggerShot()`, `takeDamage()`, `addScore()` |
| `Enemy.ts`      | `Enemy`, `EnemyVariant` | Two variants (0 = tank 40 HP/80 spd, 1 = fast 25 HP/140 spd); chases player; `getContactDamage(time)` with 1200 ms cooldown; emits `enemy-died` on death                              |
| `Boss.ts`       | `Boss`                  | 300 HP; phase 2 at ≤ 150 HP (purple tint, 4-way shots every 2 s); emits `enemy-died` then `boss-died` (in tween `onComplete`)                                                         |
| `Projectile.ts` | `ProjectileGroup`       | Object-pool of up to 40 arcade sprites; `fire(x, y, angle, speed?, damage?)` reuses dead sprites; auto-destroys after 1500 ms                                                         |

## src/game/systems/

| File              | Key exports    | Notes                                                                                                                                                                                                         |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CombatSystem.ts` | `CombatSystem` | Subscribes to `player-melee` (distance-based hit, 70 px, 25 dmg); `update()` checks contact ranges (enemy 28 px, boss 40 px); `setupProjectileOverlaps()` wires arcade overlaps; `destroy()` removes listener |
| `LootSystem.ts`   | `LootSystem`   | Subscribes to `enemy-died`; spawns 1–3 loot items near drop point; `update()` checks pickup (24 px radius); `destroy()` removes listener and clears items                                                     |

## src/game/dungeon/

| File                  | Key exports                         | Notes                                                                                                                      |
| --------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `DungeonGenerator.ts` | `DungeonGenerator`, `DungeonResult` | Static `generate(scene, numRooms)` builds tile walls + corridors; returns `{ rooms, wallGroups, worldWidth, worldHeight }` |
| `Room.ts`             | `RoomData`, `Door`                  | Pure data interfaces — no Phaser dependency                                                                                |

## src/game/ui/

| File     | Key exports | Notes                                                                                                                                                 |
| -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HUD.ts` | `HUD`       | Player HP bar (color-coded), score/HP label, room counter, boss HP bar (hidden until boss room); `showMessage(text, duration)` for room entry banners |

## src/game/

| File                | Key exports      | Notes                                                                                                                                                                                                     |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextureFactory.ts` | `TextureFactory` | Static `generateAll(scene)` guarded by `TextureFactory.generated` flag; creates all textures programmatically (player, enemy, boss, wall, floor, loot, projectile, melee-flash) — no external asset files |

## Test Infrastructure

| Path                              | Purpose                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vitest.config.ts`                | Vitest 4 config — node env, `tests/unit/**/*.test.ts`, v8 coverage                                                                               |
| `playwright.config.ts`            | Playwright config — Chromium only, auto-starts dev server on `:8080`                                                                             |
| `__mocks__/phaser.ts`             | Manual Phaser mock — `Events.EventEmitter` → Node.js `EventEmitter`; real `Math.Distance/Angle`; `Math.Between` vi.fn with deterministic default |
| `tests/unit/setup.ts`             | Global setup — `vi.mock('phaser')`, sets `globalThis.Phaser`, clears EventBus after each test                                                    |
| `tests/unit/helpers/MockScene.ts` | `makeMockScene()` factory for all entity/system tests; `tweens.add` calls `onComplete` synchronously                                             |
| `tests/unit/`                     | 141 unit tests across EventBus, dungeon, entities, systems, UI                                                                                   |
| `tests/e2e/`                      | Smoke + navigation E2E tests (canvas visibility, HTTP 200)                                                                                       |
