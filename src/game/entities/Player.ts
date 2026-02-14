import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Player
{
    scene: Scene;
    sprite: Phaser.Physics.Arcade.Sprite;
    hp: number = 100;
    maxHp: number = 100;
    score: number = 0;
    isAlive: boolean = true;

    // Use native DOM keyboard events instead of Phaser's keyboard plugin.
    // Phaser's plugin can return null on scene restart in some builds (3.90+),
    // whereas window events are always available.
    private keysDown = new Set<string>();
    private meleeJustPressed = false;
    private onKeyDown!: (e: KeyboardEvent) => void;
    private onKeyUp!: (e: KeyboardEvent) => void;

    private lastMeleeTime: number = 0;
    private lastShotTime: number = 0;
    private meleeGfx: Phaser.GameObjects.Graphics | null = null;
    private meleeAngle: number = 0;
    private facingAngle: number = 0;  // radians, updated from movement each frame

    private readonly SPEED = 200;
    private readonly MELEE_COOLDOWN = 600;
    private readonly SHOT_COOLDOWN = 350;

    constructor (scene: Scene, x: number, y: number)
    {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setCollideWorldBounds(false);
        this.sprite.setDepth(10);

        this.onKeyDown = (e: KeyboardEvent) => {
            this.keysDown.add(e.code);
            if (e.code === 'KeyF') this.meleeJustPressed = true;
        };
        this.onKeyUp = (e: KeyboardEvent) => {
            this.keysDown.delete(e.code);
        };
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    update (time: number, _delta: number, pointer: Phaser.Input.Pointer): void
    {
        if (!this.isAlive) return;

        // Movement — read from native key set
        const left  = this.keysDown.has('ArrowLeft')  || this.keysDown.has('KeyA');
        const right = this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD');
        const up    = this.keysDown.has('ArrowUp')    || this.keysDown.has('KeyW');
        const down  = this.keysDown.has('ArrowDown')  || this.keysDown.has('KeyS');

        let vx = 0;
        let vy = 0;
        if (left)  vx -= 1;
        if (right) vx += 1;
        if (up)    vy -= 1;
        if (down)  vy += 1;

        // Normalize diagonal
        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        this.sprite.setVelocity(vx * this.SPEED, vy * this.SPEED);

        // Update facing direction from movement; keep last known if idle
        if (vx !== 0 || vy !== 0) {
            this.facingAngle = Math.atan2(vy, vx);
        }

        // Keep melee arc anchored to player as they move
        if (this.meleeGfx) {
            this.meleeGfx.setPosition(this.sprite.x, this.sprite.y);
        }

        // Melee — consume the edge-triggered flag set in keydown handler
        if (this.meleeJustPressed) {
            this.meleeJustPressed = false;
            this.triggerMelee(time, pointer);
        }
    }

    triggerMelee (time: number, pointer: Phaser.Input.Pointer): void
    {
        if (!this.isAlive) return;
        if (time - this.lastMeleeTime < this.MELEE_COOLDOWN) return;
        this.lastMeleeTime = time;

        // Use movement direction; fall back to pointer direction when idle
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        const moving = Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5;
        const angle = moving
            ? this.facingAngle
            : Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY);

        EventBus.emit('player-melee', {
            x: this.sprite.x,
            y: this.sprite.y,
            angle
        });

        this.showMeleeFlash(angle);
    }

    triggerShot (time: number, pointer: Phaser.Input.Pointer): void
    {
        if (time - this.lastShotTime < this.SHOT_COOLDOWN) return;
        this.lastShotTime = time;

        const angle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            pointer.worldX, pointer.worldY
        );

        EventBus.emit('player-shot', {
            x: this.sprite.x,
            y: this.sprite.y,
            angle
        });
    }

    private showMeleeFlash (angle: number): void
    {
        if (this.meleeGfx) this.meleeGfx.destroy();
        this.meleeAngle = angle;

        // Draw arc in LOCAL space (relative to Graphics object origin).
        // The Graphics x,y is updated every frame in update() to follow the player.
        const gfx = this.scene.add.graphics({ x: this.sprite.x, y: this.sprite.y });
        gfx.setDepth(20);

        const RADIUS = 44;
        const SPREAD = Phaser.Math.DegToRad(70); // ±70° fan

        gfx.fillStyle(0x80cbc4, 0.85);
        gfx.lineStyle(1, 0xb2dfdb, 0.6);
        gfx.beginPath();
        gfx.moveTo(0, 0);
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
            const a = angle - SPREAD + (SPREAD * 2) * (i / steps);
            gfx.lineTo(Math.cos(a) * RADIUS, Math.sin(a) * RADIUS);
        }
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        this.meleeGfx = gfx;

        this.scene.tweens.add({
            targets: gfx,
            alpha: 0,
            duration: 130,
            onComplete: () => {
                gfx.destroy();
                if (this.meleeGfx === gfx) this.meleeGfx = null;
            }
        });
    }

    takeDamage (amount: number): void
    {
        if (!this.isAlive) return;
        this.hp = Math.max(0, this.hp - amount);
        // Flash red
        this.scene.tweens.add({
            targets: this.sprite,
            tint: { from: 0xff4444, to: 0xffffff },
            duration: 200
        });
        if (this.hp <= 0) {
            this.die();
        }
    }

    private die (): void
    {
        this.isAlive = false;
        this.sprite.setVelocity(0, 0);
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 500
        });
    }

    addScore (amount: number): void
    {
        this.score += amount;
    }

    get x (): number { return this.sprite.x; }
    get y (): number { return this.sprite.y; }

    destroy (): void
    {
        if (this.meleeGfx) this.meleeGfx.destroy();
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        this.keysDown.clear();
        this.sprite.destroy();
    }
}
