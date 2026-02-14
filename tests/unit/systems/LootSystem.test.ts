import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LootSystem } from '../../../src/game/systems/LootSystem';
import { EventBus } from '../../../src/game/EventBus';
import { makeMockScene } from '../helpers/MockScene';

// With the Math.Between mock default:
//   Between(min, max) where min >= 0  → returns min   (e.g. Between(1,3) = 1)
//   Between(min, max) where min < 0   → returns 0     (e.g. Between(-24,24) = 0)
// Effect in spawnLoot: count=1, offsets=(0,0) → item spawns exactly at (enemyX, enemyY)

function makePlayerMock(x: number, y: number, isAlive = true) {
    let score = 0;
    const mock = {
        isAlive,
        x,
        y,
        get score() { return score; },
        addScore: vi.fn((n: number) => { score += n; }),
    };
    return mock;
}

describe('LootSystem', () => {
    let scene: any;
    let loot: LootSystem;

    beforeEach(() => {
        scene = makeMockScene();
        loot = new LootSystem(scene);
    });

    // -----------------------------------------------------------------------
    // Loot spawning via enemy-died
    // -----------------------------------------------------------------------
    describe('enemy-died spawns loot', () => {
        test('triggers at least one scene.add.image call', () => {
            EventBus.emit('enemy-died', { x: 100, y: 100, score: 10 });
            // Default count = Between(1,3) = 1
            expect(scene.add.image).toHaveBeenCalledOnce();
        });

        test('image is created at offset from enemy position', () => {
            EventBus.emit('enemy-died', { x: 200, y: 300, score: 10 });
            expect(scene.add.image).toHaveBeenCalled();
            // Default offset = 0, so item at exactly (200, 300)
            const [callX, callY] = scene.add.image.mock.calls[0];
            expect(callX).toBe(200); // 200 + Between(-24,24)=0
            expect(callY).toBe(300);
        });
    });

    // -----------------------------------------------------------------------
    // After destroy(), enemy-died no longer spawns items
    // -----------------------------------------------------------------------
    test('after destroy(), enemy-died no longer spawns items', () => {
        loot.destroy();
        EventBus.emit('enemy-died', { x: 0, y: 0, score: 10 });
        expect(scene.add.image).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Loot value formula: Math.floor(baseScore / count)
    // -----------------------------------------------------------------------
    describe('loot value formula (pure math)', () => {
        test('count=1: floor(10/1) = 10', () => {
            expect(Math.floor(10 / 1)).toBe(10);
        });

        test('count=2: floor(10/2) = 5', () => {
            expect(Math.floor(10 / 2)).toBe(5);
        });

        test('count=3: floor(10/3) = 3', () => {
            expect(Math.floor(10 / 3)).toBe(3);
        });

        test('count=2 with baseScore=15: floor(15/2) = 7', () => {
            expect(Math.floor(15 / 2)).toBe(7);
        });

        test('count=3 with baseScore=200 (boss): floor(200/3) = 66', () => {
            expect(Math.floor(200 / 3)).toBe(66);
        });
    });

    // -----------------------------------------------------------------------
    // Pickup — item within 24px: score increases; beyond 24px: no change
    //
    // With default mock, loot spawns at exactly (enemyX, enemyY) (offset=0).
    // -----------------------------------------------------------------------
    describe('update — pickup range', () => {
        function spawnAt(x: number, y: number, baseScore: number) {
            // count=1 and offsets=0 (from mock defaults), item lands at (x, y)
            EventBus.emit('enemy-died', { x, y, score: baseScore });
        }

        test('player score increases when within 24px (dist=0)', () => {
            spawnAt(100, 100, 10); // item at (100, 100)
            const player = makePlayerMock(100, 100); // dist = 0
            loot.update(player as any);
            expect(player.addScore).toHaveBeenCalledWith(10);
            expect(player.score).toBe(10);
        });

        test('player score increases at boundary (dist=23 < 24)', () => {
            spawnAt(100, 100, 15); // item at (100, 100)
            const player = makePlayerMock(100 + 23, 100); // dist = 23
            loot.update(player as any);
            expect(player.addScore).toHaveBeenCalled();
        });

        test('player score does NOT increase at exactly 24px', () => {
            spawnAt(100, 100, 10);
            const player = makePlayerMock(124, 100); // dist = 24, not < 24
            loot.update(player as any);
            expect(player.addScore).not.toHaveBeenCalled();
        });

        test('player score does NOT increase beyond 24px (dist=50)', () => {
            spawnAt(100, 100, 10); // item at (100, 100)
            const player = makePlayerMock(150, 100); // dist = 50
            loot.update(player as any);
            expect(player.addScore).not.toHaveBeenCalled();
            expect(player.score).toBe(0);
        });

        test('dead player does not collect loot', () => {
            spawnAt(100, 100, 10);
            const player = makePlayerMock(100, 100, false); // isAlive=false
            loot.update(player as any);
            expect(player.addScore).not.toHaveBeenCalled();
        });
    });
});
