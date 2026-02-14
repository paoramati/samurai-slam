import { describe, test, expect, vi } from 'vitest';
import { EventBus } from '../../src/game/EventBus';

describe('EventBus', () => {
	test('delivers events to registered listeners', () => {
		const listener = vi.fn();
		EventBus.on('test-event', listener);
		EventBus.emit('test-event', { data: 42 });
		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith({ data: 42 });
	});

	test('does not cross-deliver between different event names', () => {
		const listenerA = vi.fn();
		const listenerB = vi.fn();
		EventBus.on('event-a', listenerA);
		EventBus.on('event-b', listenerB);
		EventBus.emit('event-a', 'hello');
		expect(listenerA).toHaveBeenCalledOnce();
		expect(listenerB).not.toHaveBeenCalled();
	});

	test('listeners removed via removeAllListeners stop receiving', () => {
		const listener = vi.fn();
		EventBus.on('vanishing', listener);
		EventBus.removeAllListeners('vanishing');
		EventBus.emit('vanishing');
		expect(listener).not.toHaveBeenCalled();
	});

	test('player-melee contract: {x, y, angle} payload', () => {
		const listener = vi.fn();
		EventBus.on('player-melee', listener);
		EventBus.emit('player-melee', { x: 10, y: 20, angle: 1.5 });
		expect(listener).toHaveBeenCalledWith({ x: 10, y: 20, angle: 1.5 });
	});

	test('player-shot contract: {x, y, angle} payload', () => {
		const listener = vi.fn();
		EventBus.on('player-shot', listener);
		EventBus.emit('player-shot', { x: 5, y: 6, angle: 0 });
		expect(listener).toHaveBeenCalledWith({ x: 5, y: 6, angle: 0 });
	});

	test('enemy-died contract: {x, y, score} payload', () => {
		const listener = vi.fn();
		EventBus.on('enemy-died', listener);
		EventBus.emit('enemy-died', { x: 100, y: 200, score: 10 });
		expect(listener).toHaveBeenCalledWith({ x: 100, y: 200, score: 10 });
	});

	test('boss-died contract: no payload required', () => {
		const listener = vi.fn();
		EventBus.on('boss-died', listener);
		EventBus.emit('boss-died');
		expect(listener).toHaveBeenCalledOnce();
	});

	test('game-over contract: {score, won} payload', () => {
		const listener = vi.fn();
		EventBus.on('game-over', listener);
		EventBus.emit('game-over', { score: 99, won: true });
		expect(listener).toHaveBeenCalledWith({ score: 99, won: true });
	});

	test('multiple listeners on same event all receive it', () => {
		const a = vi.fn();
		const b = vi.fn();
		EventBus.on('multi', a);
		EventBus.on('multi', b);
		EventBus.emit('multi', 1);
		expect(a).toHaveBeenCalledWith(1);
		expect(b).toHaveBeenCalledWith(1);
	});
});
