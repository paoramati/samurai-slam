import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Boss } from '../../../src/game/entities/Boss';
import { EventBus } from '../../../src/game/EventBus';
import { makeMockScene } from '../helpers/MockScene';

describe('Boss', () => {
    let scene: any;

    beforeEach(() => {
        scene = makeMockScene();
    });

    // -----------------------------------------------------------------------
    // Initial state
    // -----------------------------------------------------------------------
    test('starts with hp=300, maxHp=300', () => {
        const boss = new Boss(scene, 0, 0);
        expect(boss.hp).toBe(300);
        expect(boss.maxHp).toBe(300);
    });

    test('starts with isPhase2=false', () => {
        const boss = new Boss(scene, 0, 0);
        expect(boss.isPhase2).toBe(false);
    });

    test('scoreValue=200', () => {
        const boss = new Boss(scene, 0, 0);
        expect(boss.scoreValue).toBe(200);
    });

    // -----------------------------------------------------------------------
    // takeDamage
    // -----------------------------------------------------------------------
    describe('takeDamage', () => {
        test('reduces HP by the given amount', () => {
            const boss = new Boss(scene, 0, 0);
            boss.takeDamage(50);
            expect(boss.hp).toBe(250);
        });

        test('clamps HP to 0', () => {
            const boss = new Boss(scene, 0, 0);
            boss.takeDamage(9999);
            expect(boss.hp).toBe(0);
        });

        test('sets isAlive=false when HP reaches 0', () => {
            const boss = new Boss(scene, 0, 0);
            boss.takeDamage(300);
            expect(boss.isAlive).toBe(false);
        });

        test('ignores damage when already dead', () => {
            const boss = new Boss(scene, 0, 0);
            boss.takeDamage(300);
            boss.takeDamage(50);
            expect(boss.hp).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // Phase 2 trigger
    // -----------------------------------------------------------------------
    describe('phase 2', () => {
        test('NOT triggered when HP is 151/300 (just above 50%)', () => {
            const boss = new Boss(scene, 0, 0);
            boss.hp = 151;
            boss.update(0, 0, 16);
            expect(boss.isPhase2).toBe(false);
            expect(scene.time.addEvent).not.toHaveBeenCalled();
        });

        test('triggered at exactly 150/300 HP (50%)', () => {
            const boss = new Boss(scene, 0, 0);
            boss.hp = 150;
            boss.update(0, 0, 16);
            expect(boss.isPhase2).toBe(true);
        });

        test('triggered below 50% HP (e.g. 100)', () => {
            const boss = new Boss(scene, 0, 0);
            boss.hp = 100;
            boss.update(0, 0, 16);
            expect(boss.isPhase2).toBe(true);
        });

        test('scene.time.addEvent called exactly once when phase 2 triggers', () => {
            const boss = new Boss(scene, 0, 0);
            boss.hp = 150;
            boss.update(0, 0, 16);
            expect(scene.time.addEvent).toHaveBeenCalledOnce();
        });

        test('scene.time.addEvent NOT called again on subsequent updates in phase 2', () => {
            const boss = new Boss(scene, 0, 0);
            boss.hp = 150;
            boss.update(0, 0, 16); // triggers phase 2
            boss.update(0, 0, 16); // should be a no-op for phase 2 logic
            boss.update(0, 0, 16);
            expect(scene.time.addEvent).toHaveBeenCalledOnce();
        });

        test('phase 2 shoot callback fires 4 times with angles 0, π/2, π, -π/2', () => {
            const shootCb = vi.fn();
            const boss = new Boss(scene, 10, 20);
            boss.setShootCallback(shootCb);
            boss.hp = 150;
            boss.update(0, 0, 16); // enter phase 2, addEvent called

            // Retrieve the callback from the addEvent call and invoke it manually
            const timerConfig = scene.time.addEvent.mock.calls[0][0];
            timerConfig.callback();

            expect(shootCb).toHaveBeenCalledTimes(4);
            const angles = shootCb.mock.calls.map((c: any[]) => c[2]);
            expect(angles).toContain(0);
            expect(angles).toContain(Math.PI / 2);
            expect(angles).toContain(Math.PI);
            expect(angles).toContain(-Math.PI / 2);
        });

        test('shoot callback passes boss sprite x, y', () => {
            const shootCb = vi.fn();
            const boss = new Boss(scene, 10, 20);
            boss.setShootCallback(shootCb);
            boss.hp = 150;
            boss.update(0, 0, 16);

            const timerConfig = scene.time.addEvent.mock.calls[0][0];
            timerConfig.callback();

            // All 4 calls should use the sprite's x,y
            for (const call of shootCb.mock.calls) {
                expect(call[0]).toBe(boss.x);
                expect(call[1]).toBe(boss.y);
            }
        });
    });

    // -----------------------------------------------------------------------
    // getContactDamage (20 dmg, 1200ms cooldown)
    // -----------------------------------------------------------------------
    describe('getContactDamage', () => {
        test('returns 0 before cooldown elapses', () => {
            const boss = new Boss(scene, 0, 0);
            expect(boss.getContactDamage(0)).toBe(0);
        });

        test('returns 20 when cooldown has elapsed', () => {
            const boss = new Boss(scene, 0, 0);
            expect(boss.getContactDamage(1200)).toBe(20);
        });

        test('returns 0 within cooldown after first hit', () => {
            const boss = new Boss(scene, 0, 0);
            boss.getContactDamage(1200);
            expect(boss.getContactDamage(2000)).toBe(0);
        });

        test('returns 20 again after full cooldown', () => {
            const boss = new Boss(scene, 0, 0);
            boss.getContactDamage(1200);
            expect(boss.getContactDamage(2401)).toBe(20);
        });
    });

    // -----------------------------------------------------------------------
    // die()
    // -----------------------------------------------------------------------
    describe('die()', () => {
        test('emits enemy-died with score=200', () => {
            const listener = vi.fn();
            EventBus.on('enemy-died', listener);
            const boss = new Boss(scene, 5, 10);
            boss.die();
            expect(listener).toHaveBeenCalledWith({ x: 5, y: 10, score: 200 });
        });

        test('emits boss-died (via tween onComplete)', () => {
            const listener = vi.fn();
            EventBus.on('boss-died', listener);
            const boss = new Boss(scene, 0, 0);
            boss.die();
            // tweens.add calls onComplete synchronously in the mock
            expect(listener).toHaveBeenCalledOnce();
        });

        test('is idempotent — die() twice only emits events once each', () => {
            const enemyListener = vi.fn();
            const bossListener = vi.fn();
            EventBus.on('enemy-died', enemyListener);
            EventBus.on('boss-died', bossListener);
            const boss = new Boss(scene, 0, 0);
            boss.die();
            boss.die();
            expect(enemyListener).toHaveBeenCalledOnce();
            expect(bossListener).toHaveBeenCalledOnce();
        });

        test('sets isAlive=false', () => {
            const boss = new Boss(scene, 0, 0);
            boss.die();
            expect(boss.isAlive).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Position getters
    // -----------------------------------------------------------------------
    test('x and y getters mirror sprite position', () => {
        const boss = new Boss(scene, 200, 300);
        expect(boss.x).toBe(200);
        expect(boss.y).toBe(300);
    });
});
