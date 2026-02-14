import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import type { Player } from '../entities/Player';

interface LootItem {
	sprite: Phaser.GameObjects.Image;
	value: number;
}

export class LootSystem {
	private scene: Scene;
	private items: LootItem[] = [];

	constructor(scene: Scene) {
		this.scene = scene;

		EventBus.on('enemy-died', (data: { x: number; y: number; score: number }) => {
			this.spawnLoot(data.x, data.y, data.score);
		});
	}

	private spawnLoot(x: number, y: number, baseScore: number): void {
		const count = Phaser.Math.Between(1, 3);
		for (let i = 0; i < count; i++) {
			const ox = x + Phaser.Math.Between(-24, 24);
			const oy = y + Phaser.Math.Between(-24, 24);
			const value = Math.floor(baseScore / count);

			const sprite = this.scene.add.image(ox, oy, 'loot');
			sprite.setDepth(5);
			sprite.setScale(0);

			// Pop-in tween
			this.scene.tweens.add({
				targets: sprite,
				scaleX: 1,
				scaleY: 1,
				duration: 200,
				ease: 'Back.easeOut'
			});

			// Gentle float
			this.scene.tweens.add({
				targets: sprite,
				y: oy - 6,
				duration: 800,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut'
			});

			this.items.push({ sprite, value });
		}
	}

	update(player: Player): void {
		if (!player.isAlive) return;

		const toRemove: LootItem[] = [];
		for (const item of this.items) {
			const dist = Phaser.Math.Distance.Between(
				player.x,
				player.y,
				item.sprite.x,
				item.sprite.y
			);
			if (dist < 24) {
				player.addScore(item.value);
				// Fly-to-player tween then destroy
				this.scene.tweens.add({
					targets: item.sprite,
					x: player.x,
					y: player.y,
					alpha: 0,
					duration: 150,
					onComplete: () => item.sprite.destroy()
				});
				toRemove.push(item);
			}
		}
		for (const item of toRemove) {
			this.items.splice(this.items.indexOf(item), 1);
		}
	}

	clearAll(): void {
		for (const item of this.items) item.sprite.destroy();
		this.items = [];
	}

	destroy(): void {
		EventBus.removeAllListeners('enemy-died');
		this.clearAll();
	}
}
