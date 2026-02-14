# Samurai Slam

A top-down roguelike dungeon crawler built with Phaser 3, SvelteKit, TypeScript, and Vite. Fight through procedurally connected rooms using melee and ranged combat, collect loot, and defeat the boss in the final room.

## Features

- 5-room dungeon with horizontal corridor connections
- Melee combat (F key) and ranged attacks (mouse click)
- Enemy AI with room-based spawning
- Boss fight with two phases (projectile attacks in phase 2)
- Score tracking, health/XP HUD, and loot drops
- All textures generated programmatically (no external image assets)

### Built With

- [Phaser 3.90](https://github.com/phaserjs/phaser) — game engine (arcade physics)
- [SvelteKit 2](https://github.com/sveltejs/kit) — UI framework
- [Vite 6](https://github.com/vitejs/vite) — bundler
- [TypeScript 5.7](https://github.com/microsoft/TypeScript)

## Getting Started

[Node.js](https://nodejs.org) is required.

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:8080
```

Once the server is running, open `http://localhost:8080` in your browser.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Launch dev server |
| `npm run build` | Production build to `build/` folder |
| `npm run preview` | Preview production build |
| `npm run dev-nolog` | Dev server without Phaser analytics |
| `npm run build-nolog` | Production build without Phaser analytics |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:all` | Run unit + E2E tests |

## Project Structure

```
src/
  routes/              Svelte pages (+layout.js disables SSR)
  PhaserGame.svelte    Svelte-Phaser bridge component
  game/
    main.ts            Phaser config and game entry point
    EventBus.ts        Event emitter for Svelte-Phaser communication
    TextureFactory.ts  Programmatic texture generation (all sprites)
    scenes/            Boot, Preloader, MainMenu, Game, GameOver
    dungeon/           DungeonGenerator, Room
    entities/          Player, Enemy, Boss, Projectile
    systems/           CombatSystem, LootSystem
    ui/                HUD
tests/
  unit/                Vitest unit tests (with Phaser mock)
  e2e/                 Playwright E2E tests
docs/                  Architecture and module documentation
```

## How It Works

**Scene Flow**: Boot → Preloader → MainMenu → Game → GameOver

The game generates a dungeon of 5 rooms (640x480px each) connected by corridors. Enemies spawn in rooms 0-3, and a boss awaits in room 4. The player navigates using WASD, attacks with F (melee) or mouse click (ranged), and progresses by clearing rooms.

The Svelte-Phaser bridge (`PhaserGame.svelte`) initializes the Phaser game and exposes the active scene to Svelte components via the `EventBus`.

## Testing

**Unit tests** use Vitest with a comprehensive Phaser mock (`__mocks__/phaser.ts`) that stubs the full Phaser API surface needed by game code. Run with `npm test`.

**E2E tests** use Playwright to verify the game loads and basic navigation works. These require the dev server running on port 8080. Run with `npm run test:e2e`.

## License

MIT

---

Based on the [Phaser SvelteKit Template](https://github.com/phaserjs/template-svelte) by [Phaser Studio](https://phaser.io/).
