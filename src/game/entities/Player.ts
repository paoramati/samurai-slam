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

    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    private attackKey: Phaser.Input.Keyboard.Key;
    private lastMeleeTime: number = 0;
    private lastShotTime: number = 0;
    private meleeFlash: Phaser.GameObjects.Image | null = null;
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

        const kb = scene.input.keyboard!;
        this.cursors = kb.createCursorKeys();
        this.wasd = {
            W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
        this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    }

    update (time: number, _delta: number, pointer: Phaser.Input.Pointer): void
    {
        if (!this.isAlive) return;

        // Movement
        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        let vx = 0;
        let vy = 0;
        if (left) vx -= 1;
        if (right) vx += 1;
        if (up) vy -= 1;
        if (down) vy += 1;

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

        // Melee
        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            this.triggerMelee(time, pointer);
        }

        // Ranged — on pointer active press (handled by Game scene via pointer)
    }

    triggerMelee (time: number, pointer: Phaser.Input.Pointer): void
    {
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
        if (this.meleeFlash) this.meleeFlash.destroy();
        this.meleeFlash = this.scene.add.image(this.sprite.x, this.sprite.y, 'melee-flash');
        this.meleeFlash.setRotation(angle);
        this.meleeFlash.setDepth(20);
        this.meleeFlash.setAlpha(0.9);

        this.scene.tweens.add({
            targets: this.meleeFlash,
            alpha: 0,
            duration: 150,
            onComplete: () => {
                if (this.meleeFlash) {
                    this.meleeFlash.destroy();
                    this.meleeFlash = null;
                }
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
        if (this.meleeFlash) this.meleeFlash.destroy();
        this.sprite.destroy();
    }
}
