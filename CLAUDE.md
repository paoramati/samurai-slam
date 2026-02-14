# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build to /build folder
npm run preview      # Preview production build
npm test             # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright, requires dev server on :8080)
npm run test:all     # Run both unit and E2E tests
```

Use `npm run dev-nolog` or `npm run build-nolog` to skip Phaser's anonymous analytics.

## Project Overview

Samurai Slam is a top-down roguelike game built with Phaser 3, SvelteKit, TypeScript, and Vite. The player fights through 5 dungeon rooms with melee and ranged combat, defeating a boss in the final room.

## Key Conventions

- **SSR is disabled** (`src/routes/+layout.js`). Phaser requires browser APIs — do not enable SSR.
- **Programmatic textures**: All sprites are generated in `src/game/TextureFactory.ts` (no image assets). Uses a static `generated` flag to avoid re-creation.
- **EventBus** (`src/game/EventBus.ts`): Phaser EventEmitter for all Svelte-Phaser and system-to-system communication. Scenes must emit `current-scene-ready` at the end of `create()`. All subscribers must call `removeAllListeners` in `destroy()`.
- **Scene flow**: Boot → Preloader → MainMenu → Game → GameOver.
- **Player input**: Uses native DOM keyboard events (`window.addEventListener`), not Phaser's keyboard plugin. Mouse clicks use Phaser's input system.

## Testing

- **Unit tests** (`tests/unit/`): Vitest with a comprehensive Phaser mock at `__mocks__/phaser.ts`. Test setup in `tests/unit/setup.ts` sets `globalThis.Phaser`.
- **E2E tests** (`tests/e2e/`): Playwright — smoke and navigation tests. Requires the dev server running on port 8080.
- Player tests use `vi.stubGlobal('window', ...)` because `Player.ts` uses native DOM events.

## Architecture Details

See `docs/` for detailed documentation:
- `docs/architecture.md` — tech stack, scene flow, EventBus events, dungeon layout, combat system, physics
- `docs/modules.md` — per-file module documentation
- `docs/patterns.md` — code patterns and conventions
