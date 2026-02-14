import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Player } from '../../../src/game/entities/Player';
import { EventBus } from '../../../src/game/EventBus';
import { makeMockScene, makePointer } from '../helpers/MockScene';

describe('Player', () => {
    let scene: any;
    let player: Player;
    const ptr = makePointer(100, 0); // pointer is to the right of player

    // Player.ts uses window.addEventListener — stub it for the node environment
    beforeAll(() => {
        vi.stubGlobal('window', {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    beforeEach(() => {
        scene = makeMockScene();
        player = new Player(scene, 0, 0);
    });

    // -----------------------------------------------------------------------
    // Initial state
    // -----------------------------------------------------------------------
    test('starts with hp=100, maxHp=100', () => {
        expect(player.hp).toBe(100);
        expect(player.maxHp).toBe(100);
    });

    test('starts with score=0', () => {
        expect(player.score).toBe(0);
    });

    test('starts alive', () => {
        expect(player.isAlive).toBe(true);
    });

    // -----------------------------------------------------------------------
    // triggerMelee (600ms cooldown)
    // -----------------------------------------------------------------------
    describe('triggerMelee', () => {
        test('emits player-melee when cooldown has elapsed', () => {
            const listener = vi.fn();
            EventBus.on('player-melee', listener);
            player.triggerMelee(1000, ptr); // 1000 - 0 = 1000 >= 600
            expect(listener).toHaveBeenCalledOnce();
        });

        test('does NOT emit within cooldown window', () => {
            const listener = vi.fn();
            EventBus.on('player-melee', listener);
            player.triggerMelee(1000, ptr); // fires
            player.triggerMelee(1400, ptr); // 400ms later — still in 600ms cooldown
            expect(listener).toHaveBeenCalledOnce();
        });

        test('emits again after cooldown expires (601ms later)', () => {
            const listener = vi.fn();
            EventBus.on('player-melee', listener);
            player.triggerMelee(1000, ptr); // fires at t=1000
            player.triggerMelee(1601, ptr); // 601ms later — cooldown expired
            expect(listener).toHaveBeenCalledTimes(2);
        });

        test('payload contains {x, y, angle}', () => {
            const listener = vi.fn();
            EventBus.on('player-melee', listener);
            player.triggerMelee(1000, ptr);
            const payload = listener.mock.calls[0][0];
            expect(payload).toHaveProperty('x');
            expect(payload).toHaveProperty('y');
            expect(payload).toHaveProperty('angle');
            expect(typeof payload.angle).toBe('number');
        });

        test('does NOT emit when player is dead', () => {
            const listener = vi.fn();
            EventBus.on('player-melee', listener);
            player.isAlive = false;
            player.triggerMelee(1000, ptr);
            expect(listener).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // triggerShot (350ms cooldown)
    // -----------------------------------------------------------------------
    describe('triggerShot', () => {
        test('emits player-shot when cooldown has elapsed', () => {
            const listener = vi.fn();
            EventBus.on('player-shot', listener);
            player.triggerShot(1000, ptr);
            expect(listener).toHaveBeenCalledOnce();
        });

        test('does NOT emit within cooldown window', () => {
            const listener = vi.fn();
            EventBus.on('player-shot', listener);
            player.triggerShot(1000, ptr);
            player.triggerShot(1200, ptr); // 200ms — still in 350ms cooldown
            expect(listener).toHaveBeenCalledOnce();
        });

        test('emits again after cooldown expires (351ms later)', () => {
            const listener = vi.fn();
            EventBus.on('player-shot', listener);
            player.triggerShot(1000, ptr);
            player.triggerShot(1351, ptr); // 351ms later
            expect(listener).toHaveBeenCalledTimes(2);
        });

        test('payload contains {x, y, angle}', () => {
            const listener = vi.fn();
            EventBus.on('player-shot', listener);
            player.triggerShot(1000, ptr);
            const payload = listener.mock.calls[0][0];
            expect(payload).toHaveProperty('x');
            expect(payload).toHaveProperty('y');
            expect(payload).toHaveProperty('angle');
        });
    });

    // -----------------------------------------------------------------------
    // takeDamage
    // -----------------------------------------------------------------------
    describe('takeDamage', () => {
        test('reduces HP', () => {
            player.takeDamage(30);
            expect(player.hp).toBe(70);
        });

        test('clamps HP to 0', () => {
            player.takeDamage(999);
            expect(player.hp).toBe(0);
        });

        test('sets isAlive=false when HP reaches 0', () => {
            player.takeDamage(100);
            expect(player.isAlive).toBe(false);
        });

        test('ignores damage when already dead', () => {
            player.takeDamage(100); // kills
            player.takeDamage(50); // should be ignored
            expect(player.hp).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // addScore
    // -----------------------------------------------------------------------
    describe('addScore', () => {
        test('accumulates score correctly', () => {
            player.addScore(10);
            player.addScore(25);
            expect(player.score).toBe(35);
        });

        test('starts at 0', () => {
            expect(player.score).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // Position getters
    // -----------------------------------------------------------------------
    test('x and y getters mirror sprite position', () => {
        const p = new Player(scene, 77, 88);
        expect(p.x).toBe(77);
        expect(p.y).toBe(88);
    });
});
