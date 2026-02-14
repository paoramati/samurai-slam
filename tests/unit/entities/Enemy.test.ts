import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Enemy } from '../../../src/game/entities/Enemy';
import { EventBus } from '../../../src/game/EventBus';
import { makeMockScene } from '../helpers/MockScene';

describe('Enemy', () => {
    let scene: any;

    beforeEach(() => {
        scene = makeMockScene();
    });

    // -----------------------------------------------------------------------
    // Variant stats
    // -----------------------------------------------------------------------
    describe('variant 0 (tank)', () => {
        test('hp=40, maxHp=40', () => {
            const e = new Enemy(scene, 0, 0, 0);
            expect(e.hp).toBe(40);
            expect(e.maxHp).toBe(40);
        });

        test('scoreValue=10', () => {
            const e = new Enemy(scene, 0, 0, 0);
            expect(e.scoreValue).toBe(10);
        });

        test('contact damage=10 (via getContactDamage)', () => {
            const e = new Enemy(scene, 0, 0, 0);
            // At time=1200, cooldown has elapsed from initial lastDamageTime=0
            expect(e.getContactDamage(1200)).toBe(10);
        });
    });

    describe('variant 1 (fast)', () => {
        test('hp=25, maxHp=25', () => {
            const e = new Enemy(scene, 0, 0, 1);
            expect(e.hp).toBe(25);
            expect(e.maxHp).toBe(25);
        });

        test('scoreValue=15', () => {
            const e = new Enemy(scene, 0, 0, 1);
            expect(e.scoreValue).toBe(15);
        });

        test('contact damage=8 (via getContactDamage)', () => {
            const e = new Enemy(scene, 0, 0, 1);
            expect(e.getContactDamage(1200)).toBe(8);
        });
    });

    // -----------------------------------------------------------------------
    // takeDamage
    // -----------------------------------------------------------------------
    describe('takeDamage', () => {
        test('reduces HP by the given amount', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.takeDamage(15);
            expect(e.hp).toBe(25);
        });

        test('clamps HP to 0 (no negative HP)', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.takeDamage(999);
            expect(e.hp).toBe(0);
        });

        test('sets isAlive=false when HP reaches 0', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.takeDamage(40);
            expect(e.isAlive).toBe(false);
        });

        test('ignores damage when already dead', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.takeDamage(40); // kills it
            e.takeDamage(10); // should be ignored
            expect(e.hp).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // getContactDamage (cooldown: 1200ms)
    // -----------------------------------------------------------------------
    describe('getContactDamage', () => {
        test('returns 0 before cooldown elapses (time < 1200)', () => {
            const e = new Enemy(scene, 0, 0, 0);
            expect(e.getContactDamage(0)).toBe(0);
            expect(e.getContactDamage(1000)).toBe(0);
        });

        test('returns damage when cooldown has elapsed (time >= 1200)', () => {
            const e = new Enemy(scene, 0, 0, 0);
            expect(e.getContactDamage(1200)).toBe(10);
        });

        test('returns 0 within cooldown after first hit', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.getContactDamage(1200); // first hit at t=1200
            expect(e.getContactDamage(2000)).toBe(0); // 800ms later — still in cooldown
        });

        test('returns damage again after full cooldown', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.getContactDamage(1200); // first hit
            expect(e.getContactDamage(2401)).toBe(10); // 1201ms later
        });
    });

    // -----------------------------------------------------------------------
    // die()
    // -----------------------------------------------------------------------
    describe('die()', () => {
        test('emits enemy-died with correct x, y, score', () => {
            const listener = vi.fn();
            EventBus.on('enemy-died', listener);
            const e = new Enemy(scene, 50, 75, 0);
            e.die();
            expect(listener).toHaveBeenCalledWith({ x: 50, y: 75, score: 10 });
        });

        test('is idempotent — calling die() twice only emits once', () => {
            const listener = vi.fn();
            EventBus.on('enemy-died', listener);
            const e = new Enemy(scene, 0, 0, 0);
            e.die();
            e.die();
            expect(listener).toHaveBeenCalledOnce();
        });

        test('sets isAlive=false', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.die();
            expect(e.isAlive).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // HP bar color thresholds (tested via drawHpBar → hpBar.fillStyle spy)
    // drawHpBar is called from update(); hpBar is scene.add.graphics() mock
    // fillStyle call[0] = background (0x333333), call[1] = health fill color
    // -----------------------------------------------------------------------
    describe('HP color thresholds', () => {
        function getHealthColor(enemy: Enemy): number {
            // Trigger drawHpBar by calling update
            enemy.update(0, 0, 16);
            const hpBar = (enemy as any).hpBar;
            // Second fillStyle call is the health bar fill color
            const calls = hpBar.fillStyle.mock.calls;
            return calls[calls.length - 1][0];
        }

        test('pct > 0.5: green (0x4caf50)', () => {
            const e = new Enemy(scene, 0, 0, 0); // hp=40
            e.hp = 21; // pct = 21/40 = 0.525
            expect(getHealthColor(e)).toBe(0x4caf50);
        });

        test('pct = 0.5: orange (0xff9800) — boundary: not > 0.5', () => {
            const e = new Enemy(scene, 0, 0, 0); // hp=40
            e.hp = 20; // pct = 0.5
            expect(getHealthColor(e)).toBe(0xff9800);
        });

        test('pct > 0.25 (and <= 0.5): orange (0xff9800)', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.hp = 11; // pct = 11/40 = 0.275
            expect(getHealthColor(e)).toBe(0xff9800);
        });

        test('pct = 0.25: red (0xf44336) — boundary: not > 0.25', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.hp = 10; // pct = 10/40 = 0.25
            expect(getHealthColor(e)).toBe(0xf44336);
        });

        test('pct < 0.25: red (0xf44336)', () => {
            const e = new Enemy(scene, 0, 0, 0);
            e.hp = 4; // pct = 0.1
            expect(getHealthColor(e)).toBe(0xf44336);
        });
    });

    // -----------------------------------------------------------------------
    // Position getters
    // -----------------------------------------------------------------------
    test('x and y getters mirror sprite position', () => {
        const e = new Enemy(scene, 123, 456, 0);
        expect(e.x).toBe(123);
        expect(e.y).toBe(456);
    });
});
