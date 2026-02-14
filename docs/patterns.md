# Patterns & Conventions

## EventBus Usage

All cross-system communication goes through the singleton in `src/game/EventBus.ts`.

```ts
import { EventBus } from '../EventBus';

// Subscribe (typically in constructor or create())
EventBus.on('enemy-died', (data: { x: number; y: number; score: number }) => {
    this.handleEnemyDied(data);
});

// Emit
EventBus.emit('player-melee', { x: this.sprite.x, y: this.sprite.y, angle });

// Clean up — REQUIRED in destroy()
EventBus.removeAllListeners('enemy-died');
```

**Rules:**
- Every `EventBus.on()` call must have a matching `removeAllListeners()` in the owner's `destroy()`.
- Never emit `current-scene-ready` before `create()` is finished setting up the scene.
- `Game.ts` removes its own listeners (`player-shot`, `boss-died`) in `cleanup()`, which is called both on `changeScene()` and on game end.

## Texture Generation

All textures are created programmatically in `TextureFactory.generateAll()`. The static
`generated` flag prevents redundant regeneration on scene restart:

```ts
// In Preloader.create() — called once at startup
TextureFactory.generateAll(this);

// In Game.create() — idempotent guard
TextureFactory.generateAll(this); // no-op if already generated
```

**Rules:**
- Add new textures only in `TextureFactory.ts` — never call `scene.make.graphics` for texture generation elsewhere.
- Use `makeRect` for rectangular sprites, `makeCircle` for circular ones.
- Texture keys must be unique strings (e.g. `'player'`, `'enemy-fast'`, `'loot'`).

## Scene Lifecycle

```ts
class MyScene extends Scene {
    create(): void {
        // 1. Reset instance state (Scene is reused on scene.start())
        this.someState = initialValue;

        // 2. Build world / UI

        // 3. LAST LINE: expose scene to Svelte
        EventBus.emit('current-scene-ready', this);
    }

    update(time: number, delta: number): void {
        // Always accept both params even if delta is unused
    }

    changeScene(): void {
        // Called by PhaserGame.svelte's scene ref; clean up before transitioning
        this.cleanup();
        this.scene.start('NextScene');
    }
}
```

**Rules:**
- Reset ALL instance fields at the start of `create()` — Phaser reuses the same class instance when a scene restarts via `scene.start()`.
- `changeScene()` must call cleanup logic before transitioning so listeners and objects from the old run are removed.

## Entity Structure

Entities are **plain TypeScript classes** — they do NOT extend Phaser game objects.
Each entity wraps a `Phaser.Physics.Arcade.Sprite` stored in `this.sprite`.

```ts
export class MyEntity {
    scene: Scene;
    sprite: Phaser.Physics.Arcade.Sprite;
    hp: number;
    isAlive: boolean = true;

    constructor(scene: Scene, x: number, y: number) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'my-texture');
        this.sprite.setDepth(10);
        this.sprite.setData('myEntity', this); // back-reference for overlap callbacks
    }

    // Position convenience getters — CombatSystem and LootSystem use these
    get x(): number { return this.sprite.x; }
    get y(): number { return this.sprite.y; }

    destroy(): void {
        this.sprite.destroy();
        // Remove EventBus listeners if any
    }
}
```

**Rules:**
- Expose `x`/`y` getters that delegate to `sprite.x`/`sprite.y`.
- Store a back-reference via `sprite.setData('key', this)` when arcade overlap callbacks need to reach the entity from a raw sprite.
- Guard `takeDamage` and contact damage methods with `if (!this.isAlive) return`.
- Contact cooldown pattern: store `private lastContactTime = 0` and check `time - lastContactTime < COOLDOWN`.

## Input Handling

Player input uses **native DOM events**, not Phaser's keyboard plugin:

```ts
// In Player constructor
this.onKeyDown = (e: KeyboardEvent) => {
    this.keysDown.add(e.code);
    if (e.code === 'KeyF') this.meleeJustPressed = true;
};
window.addEventListener('keydown', this.onKeyDown);
window.addEventListener('keyup', this.onKeyUp);

// In Player.destroy()
window.removeEventListener('keydown', this.onKeyDown);
window.removeEventListener('keyup', this.onKeyUp);
```

Mouse input is handled by Phaser: `this.input.on('pointerdown', ptr => ...)` in `Game.ts`.

## Physics & Movement

- Use `sprite.setVelocity(vx, vy)` — never forces or position mutation during movement.
- Normalise diagonal velocity manually: `vx *= 0.707; vy *= 0.707`.
- Enemy AI: calculate angle with `Phaser.Math.Angle.Between` then set velocity from `cos`/`sin`.
- Collision detection for damage is **distance-based** (not arcade overlap): call
  `Phaser.Math.Distance.Between` in `CombatSystem.update()` each frame.
- Projectile hits use **arcade overlap** (set up in `CombatSystem.setupProjectileOverlaps()`).

## HUD Color Thresholds

The same HP-colour ternary is used in both `Enemy.drawHpBar()` and `HUD.update()`:

```ts
const fillColor = pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
//                             green              orange               red
```

Boundary behaviour: at exactly 50 % → orange; at exactly 25 % → red.

## Adding a New Scene

1. Create `src/game/scenes/MyScene.ts` extending `Scene`
2. Register in the `scene` array in `src/game/main.ts`
3. Emit `EventBus.emit('current-scene-ready', this)` as the last line of `create()`
4. Call `this.scene.start('NextScene')` to transition
5. Implement `changeScene()` if the scene needs to be externally controllable from Svelte

## Adding a New Enemy Variant

1. Add an entry to `VARIANT_CONFIG` in `Enemy.ts`
2. Extend `EnemyVariant` type to include the new index
3. Add a texture in `TextureFactory.generateAll()`
4. Adjust spawn probabilities in `Game.spawnEnemies()` if needed

## Testing Conventions

- Unit tests live in `tests/unit/` and are matched by `vitest.config.ts`.
- Use `makeMockScene()` from `tests/unit/helpers/MockScene.ts` for all entity/system tests.
- Player tests must stub `window` before instantiation:
  ```ts
  beforeAll(() => {
      vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  });
  ```
- The `Math.Between` mock returns `0` for ranges that include negatives (offset calls) and `min`
  for positive-only ranges (count calls). Tests depending on exact loot positions rely on this.
- `EventBus.removeAllListeners()` runs automatically in `afterEach` (defined in `tests/unit/setup.ts`).
- E2E tests in `tests/e2e/` auto-start the dev server via Playwright's `webServer` config.
