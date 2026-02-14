# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build to /build folder
npm run preview      # Preview production build
```

Use `npm run dev-nolog` or `npm run build-nolog` to skip Phaser's anonymous analytics.

## Architecture

This is a Phaser 3 game using SvelteKit as the UI framework, TypeScript, and Vite for bundling.

### Key Integration Points

**Svelte-Phaser Bridge**: `src/PhaserGame.svelte` initializes the Phaser game and exposes `phaserRef` (containing `game` and `scene` instances) to parent Svelte components.

**EventBus** (`src/game/EventBus.ts`): Phaser EventEmitter for bidirectional communication between Svelte and Phaser scenes. Scenes must emit `current-scene-ready` at the end of `create()` to expose themselves to Svelte:
```ts
EventBus.emit('current-scene-ready', this);
```

### Scene Flow

Scenes are registered in `src/game/main.ts` and execute in order: Boot → Preloader → MainMenu → Game → GameOver. Each scene calls `changeScene()` to transition to the next.

### SSR Disabled

`src/routes/+layout.js` sets `export const ssr = false` because Phaser requires browser APIs. Do not enable SSR.

### Static Assets

Place game assets in `static/assets/`. Load in Phaser scenes via:
```ts
this.load.image('key', 'assets/filename.png');
```
