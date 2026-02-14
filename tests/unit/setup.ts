import { vi, afterEach } from 'vitest';

// Hoist the mock so every file that imports 'phaser' gets __mocks__/phaser.ts
vi.mock('phaser');

// After vi.mock is hoisted, import the mocked module and expose it as the
// global Phaser namespace that source files reference without importing.
import * as PhaserMock from 'phaser';
(globalThis as any).Phaser = PhaserMock;

// Import EventBus so we can clear listeners after each test
import { EventBus } from '../../src/game/EventBus';

afterEach(() => {
    // Prevent listener bleed between tests
    EventBus.removeAllListeners();
    // Clear mock call history (preserves implementations)
    vi.clearAllMocks();
});
