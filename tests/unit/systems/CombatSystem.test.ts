import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CombatSystem } from '../../../src/game/systems/CombatSystem';
import { Enemy } from '../../../src/game/entities/Enemy';
import { Boss } from '../../../src/game/entities/Boss';
import { EventBus } from '../../../src/game/EventBus';
import { makeMockScene } from '../helpers/MockScene';

function makePlayerMock(x = 0, y = 0, isAlive = true) {
	return {
		isAlive,
		x,
		y,
		hp: 100,
		takeDamage: vi.fn()
	} as any;
}

describe('CombatSystem', () => {
	let scene: any;
	let combat: CombatSystem;

	beforeEach(() => {
		scene = makeMockScene();
		combat = new CombatSystem(scene);
	});

	// -----------------------------------------------------------------------
	// Melee hits (via player-melee EventBus event)
	// -----------------------------------------------------------------------
	describe('melee (player-melee event)', () => {
		test('deals 25 damage to an enemy within 70px', () => {
			const enemy = new Enemy(scene, 50, 0, 0); // dist from (0,0) = 50
			combat.setEnemies([enemy]);
			EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
			expect(enemy.hp).toBe(40 - 25); // 15
		});

		test('does NOT damage an enemy beyond 70px', () => {
			const enemy = new Enemy(scene, 80, 0, 0); // dist = 80
			combat.setEnemies([enemy]);
			EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
			expect(enemy.hp).toBe(40);
		});

		test('does NOT damage a dead enemy', () => {
			const enemy = new Enemy(scene, 10, 0, 0);
			enemy.isAlive = false;
			combat.setEnemies([enemy]);
			EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
			expect(enemy.hp).toBe(40); // unchanged
		});

		test('hits multiple in-range enemies simultaneously', () => {
			const e1 = new Enemy(scene, 30, 0, 0); // dist 30
			const e2 = new Enemy(scene, 60, 0, 0); // dist 60
			const e3 = new Enemy(scene, 90, 0, 0); // dist 90 — out of range
			combat.setEnemies([e1, e2, e3]);
			EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
			expect(e1.hp).toBe(40 - 25);
			expect(e2.hp).toBe(40 - 25);
			expect(e3.hp).toBe(40); // untouched
		});

		test('hits boss within 70px', () => {
			const boss = new Boss(scene, 50, 0);
			combat.setBoss(boss);
			EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
			expect(boss.hp).toBe(300 - 25);
		});

		test('does NOT hit boss beyond 70px', () => {
			const boss = new Boss(scene, 80, 0);
			combat.setBoss(boss);
			EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
			expect(boss.hp).toBe(300);
		});
	});

	// -----------------------------------------------------------------------
	// Contact damage (via update)
	// Enemy contact range: dist < 28
	// Boss contact range:  dist < 40
	// -----------------------------------------------------------------------
	describe('contact damage (update)', () => {
		test('deals enemy contact damage when within 28px (dist=20)', () => {
			const player = makePlayerMock(0, 0);
			const enemy = new Enemy(scene, 20, 0, 0); // dist 20 < 28
			combat.setEnemies([enemy]);
			combat.update(2000, player); // time=2000 → getContactDamage(2000)=10
			expect(player.takeDamage).toHaveBeenCalledWith(10);
		});

		test('does NOT deal damage when enemy is beyond 28px (dist=50)', () => {
			const player = makePlayerMock(0, 0);
			const enemy = new Enemy(scene, 50, 0, 0); // dist 50 >= 28
			combat.setEnemies([enemy]);
			combat.update(2000, player);
			expect(player.takeDamage).not.toHaveBeenCalled();
		});

		test('deals boss contact damage when within 40px (dist=30)', () => {
			const player = makePlayerMock(0, 0);
			const boss = new Boss(scene, 30, 0);
			combat.setBoss(boss);
			combat.update(2000, player); // getContactDamage(2000)=20
			expect(player.takeDamage).toHaveBeenCalledWith(20);
		});

		test('does NOT deal damage when boss is beyond 40px (dist=50)', () => {
			const player = makePlayerMock(0, 0);
			const boss = new Boss(scene, 50, 0);
			combat.setBoss(boss);
			combat.update(2000, player);
			expect(player.takeDamage).not.toHaveBeenCalled();
		});

		test('skips all damage when player.isAlive=false', () => {
			const player = makePlayerMock(0, 0, false);
			const enemy = new Enemy(scene, 10, 0, 0);
			combat.setEnemies([enemy]);
			combat.update(2000, player);
			expect(player.takeDamage).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// destroy (unregisters listener)
	// -----------------------------------------------------------------------
	test('after destroy(), player-melee no longer hits enemies', () => {
		const enemy = new Enemy(scene, 10, 0, 0);
		combat.setEnemies([enemy]);
		combat.destroy();
		EventBus.emit('player-melee', { x: 0, y: 0, angle: 0 });
		expect(enemy.hp).toBe(40); // no damage
	});
});
