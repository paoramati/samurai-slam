import { vi } from 'vitest';
import { EventEmitter } from 'events';

// Keep a reference to native Math before we shadow it with our export
const nativeMath = globalThis.Math;

// ---------------------------------------------------------------------------
// Events.EventEmitter → wraps Node.js EventEmitter so the API matches Phaser
// ---------------------------------------------------------------------------
class PhaserEventEmitter extends EventEmitter {
	constructor() {
		super();
		this.setMaxListeners(50);
	}
	// Phaser uses positional "on/off" with optional context; we ignore context
	on(event: string | symbol, listener: (...args: any[]) => void, _context?: any) {
		super.on(event, listener);
		return this;
	}
	off(event: string | symbol, listener?: (...args: any[]) => void, _context?: any) {
		if (listener) super.off(event, listener);
		else super.removeAllListeners(event);
		return this;
	}
	emit(event: string | symbol, ...args: any[]) {
		return super.emit(event, ...args);
	}
	removeAllListeners(event?: string | symbol) {
		super.removeAllListeners(event);
		return this;
	}
}

export const Events = {
	EventEmitter: PhaserEventEmitter
};

// ---------------------------------------------------------------------------
// Math — note: use nativeMath to avoid self-referential collision with the
// exported symbol named "Math" which shadows globalThis.Math in this file.
// ---------------------------------------------------------------------------
export const Math = {
	Distance: {
		Between: (x1: number, y1: number, x2: number, y2: number) =>
			nativeMath.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
	},
	Angle: {
		Between: (x1: number, y1: number, x2: number, y2: number) =>
			nativeMath.atan2(y2 - y1, x2 - x1)
	},
	// vi.fn with a deterministic default:
	//   positive-only ranges (e.g. Between(1,3) for count) → returns min
	//   ranges that include negatives (e.g. Between(-24,24) for offsets) → returns 0
	// This makes loot items spawn at exactly the enemy position in tests.
	Between: vi.fn((min: number, max: number) => (min < 0 ? 0 : min)),
	DegToRad: (deg: number) => (deg * nativeMath.PI) / 180
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
export const Input = {
	Keyboard: {
		JustDown: vi.fn((_key: any) => false),
		KeyCodes: {
			W: 87,
			A: 65,
			S: 83,
			D: 68,
			F: 70,
			LEFT: 37,
			RIGHT: 39,
			UP: 38,
			DOWN: 40,
			SHIFT: 16,
			SPACE: 32
		}
	}
};

// ---------------------------------------------------------------------------
// Stub classes
// ---------------------------------------------------------------------------
export class Scene {}
export class Game {}
export const AUTO = 0;

export default { Events, Math, Input, Scene, Game, AUTO };
