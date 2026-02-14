# Doc Templates

Templates for each documentation file maintained by the codebase-docs skill.
Use these as the target format when creating or updating docs.

---

## docs/architecture.md

```markdown
# Architecture

## Tech Stack

- **Engine**: Phaser 3 (arcade physics, no gravity)
- **UI**: SvelteKit (SSR disabled)
- **Language**: TypeScript
- **Bundler**: Vite

## Scene Flow

Boot -> Preloader -> MainMenu -> Game -> GameOver
Each scene calls `changeScene()` to advance. Each scene emits `current-scene-ready` at end of `create()`.

## Svelte-Phaser Bridge

`src/PhaserGame.svelte` initializes the Phaser game instance and exposes `phaserRef` (containing
`game` and `scene`) to parent Svelte components via bind.

## EventBus

`src/game/EventBus.ts` — Phaser EventEmitter for bidirectional Svelte<->Phaser communication.

| Event                 | Payload        | Direction       |
| --------------------- | -------------- | --------------- |
| `current-scene-ready` | scene instance | Scene -> Svelte |
| ...                   | ...            | ...             |

## Physics

Arcade physics, no gravity. Config in `src/game/main.ts`.

## Dungeon Layout

[Describe room layout, dimensions, corridor structure]

## Combat System

[Describe melee/ranged/contact damage, cooldowns]
```

---

## docs/modules.md

```markdown
# Module Map

## Root

| File                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `src/game/main.ts`      | Phaser game config, scene registration       |
| `src/game/EventBus.ts`  | Shared Phaser EventEmitter                   |
| `src/PhaserGame.svelte` | Mounts Phaser into Svelte, exposes phaserRef |
| `src/App.svelte`        | Root Svelte component                        |

## src/game/scenes/

| File           | Purpose                                     |
| -------------- | ------------------------------------------- |
| `Boot.ts`      | Loads minimal assets, advances to Preloader |
| `Preloader.ts` | Loads all game assets, advances to MainMenu |
| `MainMenu.ts`  | Title screen                                |
| `Game.ts`      | Main game orchestrator                      |
| `GameOver.ts`  | End screen, emits `game-over` event         |

## src/game/entities/

| File            | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `Player.ts`     | Player movement, input, emits player-melee / player-shot |
| `Enemy.ts`      | Enemy AI, emits enemy-died                               |
| `Boss.ts`       | Boss logic, phase 2 at 50% HP, emits boss-died           |
| `Projectile.ts` | Bullet entity                                            |

## src/game/systems/

| File              | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `CombatSystem.ts` | Melee hit detection, subscribes to player-melee |
| `LootSystem.ts`   | Drop/score logic, subscribes to enemy-died      |

## src/game/dungeon/

| File                  | Purpose                             |
| --------------------- | ----------------------------------- |
| `DungeonGenerator.ts` | Generates 5-room horizontal dungeon |
| `Room.ts`             | Room data structure                 |

## src/game/ui/

| File     | Purpose                                    |
| -------- | ------------------------------------------ |
| `HUD.ts` | In-game heads-up display (HP, score, ammo) |

## src/game/

| File                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `TextureFactory.ts` | All programmatic texture generation (static `generated` flag) |
```

---

## docs/patterns.md

````markdown
# Patterns & Conventions

## EventBus Usage

Always import from `src/game/EventBus.ts`. Emit `current-scene-ready` at the END of every scene's `create()`:

```ts
EventBus.emit('current-scene-ready', this);
```
````

Subscribe in `create()`, clean up in `shutdown()` or `destroy()`.

## Texture Generation

All programmatic textures go in `TextureFactory.ts`. Use the static `generated` flag to avoid
regenerating on scene restart:

```ts
if (!TextureFactory.generated) {
	TextureFactory.generate(this);
	TextureFactory.generated = true;
}
```

## Scene Lifecycle

- `preload()` — asset loading only
- `create()` — setup, then emit `current-scene-ready`
- `update(time, delta)` — frame logic; always accept both params

## Entity Structure

Entities extend `Phaser.GameObjects.Container` or `Phaser.Physics.Arcade.Sprite`.
Constructor signature: `(scene: Phaser.Scene, x: number, y: number)`
Emit events via EventBus, not direct scene references.

## Physics

Use arcade physics. No gravity. Set `allowGravity: false` on bodies explicitly if needed.
Velocity-based movement only — do not use forces.

## Adding a New Scene

1. Create `src/game/scenes/MyScene.ts`
2. Register in `src/game/main.ts` scene array
3. Emit `current-scene-ready` at end of `create()`
4. Call `this.scene.start('NextScene')` to transition

## Static Assets

Place in `static/assets/`. Load in Preloader:

```ts
this.load.image('key', 'assets/filename.png');
```

```

```
