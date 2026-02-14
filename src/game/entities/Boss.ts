import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Boss {
	scene: Scene;
	sprite: Phaser.Physics.Arcade.Sprite;
	hp: number = 300;
	maxHp: number = 300;
	isAlive: boolean = true;
	isPhase2: boolean = false;
	scoreValue: number = 200;

	private speed: number = 63;
	private lastContactTime: number = 0;
	private shootEvent: Phaser.Time.TimerEvent | null = null;
	private onShoot: ((x: number, y: number, angle: number) => void) | null = null;

	constructor(scene: Scene, x: number, y: number) {
		this.scene = scene;
		this.sprite = scene.physics.add.sprite(x, y, 'boss');
		this.sprite.setDepth(10);
		this.sprite.setData('boss', this);
	}

	setShootCallback(cb: (x: number, y: number, angle: number) => void): void {
		this.onShoot = cb;
	}

	update(playerX: number, playerY: number, _delta: number): void {
		if (!this.isAlive) return;

		const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
		this.sprite.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

		// Phase 2 trigger
		if (!this.isPhase2 && this.hp <= this.maxHp * 0.5) {
			this.enterPhase2();
		}
	}

	private enterPhase2(): void {
		this.isPhase2 = true;
		this.sprite.setTint(0x7b1fa2);
		this.speed = 80;

		// Shoot 4-directional projectiles every 2s
		this.shootEvent = this.scene.time.addEvent({
			delay: 2000,
			loop: true,
			callback: () => {
				if (!this.isAlive || !this.onShoot) return;
				const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
				for (const a of angles) {
					this.onShoot(this.sprite.x, this.sprite.y, a);
				}
			}
		});
	}

	takeDamage(amount: number): void {
		if (!this.isAlive) return;
		this.hp = Math.max(0, this.hp - amount);
		this.sprite.setTint(0xffffff);
		this.scene.time.delayedCall(100, () => {
			if (this.isAlive) {
				this.sprite.setTint(this.isPhase2 ? 0x7b1fa2 : 0xffffff);
				if (!this.isPhase2) this.sprite.clearTint();
			}
		});
		if (this.hp <= 0) this.die();
	}

	getContactDamage(time: number): number {
		if (time - this.lastContactTime < 1200) return 0;
		this.lastContactTime = time;
		return 20;
	}

	die(): void {
		if (!this.isAlive) return;
		this.isAlive = false;
		this.sprite.setVelocity(0, 0);
		if (this.shootEvent) this.shootEvent.destroy();

		EventBus.emit('enemy-died', { x: this.sprite.x, y: this.sprite.y, score: this.scoreValue });

		this.scene.tweens.add({
			targets: this.sprite,
			alpha: 0,
			scaleX: 2,
			scaleY: 2,
			duration: 600,
			onComplete: () => {
				this.sprite.setActive(false).setVisible(false);
				EventBus.emit('boss-died');
			}
		});
	}

	destroy(): void {
		if (this.shootEvent) this.shootEvent.destroy();
		this.sprite.destroy();
	}

	get x(): number { return this.sprite.x; }
	get y(): number { return this.sprite.y; }
}
