---
name: codebase-docs
description: >
    Maintain up-to-date codebase documentation in the /docs folder for navigating the project.
    Use when the user asks to "update the docs", "document this module", or after significant
    code changes to architecture, file structure, or important patterns. Produces and updates
    three files: docs/architecture.md, docs/modules.md, and docs/patterns.md.
---

# Codebase Docs

Maintain three documentation files in `/docs/`. Always read existing docs before updating them.
See `references/doc-templates.md` for the exact format and structure of each file.

## Workflow

1. **Determine scope** — Is this a full refresh or a targeted update (one file changed, one section)?
2. **Read existing docs** — Read any `/docs/*.md` files that will be updated.
3. **Scan the codebase** — Use Glob and Read to inspect relevant source files.
4. **Write updated docs** — Use the templates in `references/doc-templates.md`.

## What each doc covers

| File                   | Purpose                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| `docs/architecture.md` | High-level system overview, tech stack, key integration points, data/event flow   |
| `docs/modules.md`      | Map of every significant file and directory — what it does, exports, dependencies |
| `docs/patterns.md`     | Conventions and rules to follow when writing new code in this project             |

## Scanning guidance

- **Architecture**: Read `src/game/main.ts`, `src/PhaserGame.svelte`, `src/game/EventBus.ts`, scene files
- **Modules**: Glob `src/**/*.ts` and `src/**/*.svelte`; read each file's top ~30 lines for exports/purpose
- **Patterns**: Grep for recurring idioms (EventBus usage, texture creation, entity structure, scene lifecycle)

## When to update each file

- `architecture.md` — new scenes, changed physics config, new Svelte-Phaser integration points
- `modules.md` — any file added, removed, or significantly refactored
- `patterns.md` — new conventions established, old ones changed or removed

## Scope discipline

Only update the sections that are actually affected by the change. Do not rewrite unrelated sections.
