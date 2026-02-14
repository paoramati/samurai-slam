import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export type EnemyVariant = 0 | 1;

const VARIANT_CONFIG = [
    { texture: 'enemy',      hp: 40,  speed: 80,  damage: 10, scoreValue: 10 },
    { texture: 'enemy-fast', hp: 25,  speed: 140, damage: 8,  scoreValue: 15 },
];

export class Enemy
{
    scene: Scene;
    sprite: Phaser.Physics.Arcade.Sprite;
    hp: number;
    maxHp: number;
    isAlive: boolean = true;
    private speed: number;
    private damage: number;
    scoreValue: number;
    private hpBar: Phaser.GameObjects.Graphics;
    private lastDamageTime: number = 0;

    constructor (scene: Scene, x: number, y: number, variant: EnemyVariant = 0)
    {
        this.scene = scene;
        const cfg = VARIANT_CONFIG[variant];
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.speed = cfg.speed;
        this.damage = cfg.damage;
        this.scoreValue = cfg.scoreValue;

        this.sprite = scene.physics.add.sprite(x, y, cfg.texture);
        this.sprite.setDepth(10);
        this.sprite.setData('enemy', this);

        this.hpBar = scene.add.graphics();
        this.hpBar.setDepth(12);
    }

    update (playerX: number, playerY: number, _delta: number): void
    {
        if (!this.isAlive) return;

        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
        this.sprite.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

        this.drawHpBar();
    }

    private drawHpBar (): void
    {
        const bw = 28;
        const bh = 4;
        const bx = this.sprite.x - bw / 2;
        const by = this.sprite.y - this.sprite.height / 2 - 8;
        const pct = this.hp / this.maxHp;

        this.hpBar.clear();
        this.hpBar.fillStyle(0x333333);
        this.hpBar.fillRect(bx, by, bw, bh);
        const fillColor = pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
        this.hpBar.fillStyle(fillColor);
        this.hpBar.fillRect(bx, by, bw * pct, bh);
    }

    takeDamage (amount: number): void
    {
        if (!this.isAlive) return;
        this.hp = Math.max(0, this.hp - amount);
        // Flash white
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.isAlive) this.sprite.clearTint();
        });
        if (this.hp <= 0) this.die();
    }

    getContactDamage (time: number): number
    {
        if (time - this.lastDamageTime < 1200) return 0;
        this.lastDamageTime = time;
        return this.damage;
    }

    die (): void
    {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.sprite.setVelocity(0, 0);
        this.hpBar.destroy();

        EventBus.emit('enemy-died', { x: this.sprite.x, y: this.sprite.y, score: this.scoreValue });

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 250,
            onComplete: () => {
                this.sprite.setActive(false).setVisible(false);
            }
        });
    }

    destroy (): void
    {
        this.hpBar.destroy();
        this.sprite.destroy();
    }

    get x (): number { return this.sprite.x; }
    get y (): number { return this.sprite.y; }
}
