import { Scene } from 'phaser';

export class ProjectileGroup
{
    group: Phaser.Physics.Arcade.Group;
    private scene: Scene;

    constructor (scene: Scene)
    {
        this.scene = scene;
        this.group = scene.physics.add.group({
            defaultKey: 'projectile',
            maxSize: 40,
            runChildUpdate: false
        });
    }

    fire (x: number, y: number, angle: number, speed: number = 500, damage: number = 15): void
    {
        const proj = this.group.get(x, y, 'projectile') as Phaser.Physics.Arcade.Sprite | null;
        if (!proj) return;

        proj.setActive(true).setVisible(true).setDepth(15);
        proj.setData('damage', damage);

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        proj.setVelocity(vx, vy);

        // Auto-destroy after 1500ms
        this.scene.time.delayedCall(1500, () => {
            if (proj.active) {
                proj.setActive(false).setVisible(false);
                proj.setVelocity(0, 0);
                this.group.killAndHide(proj);
            }
        });
    }

    getActive (): Phaser.Physics.Arcade.Sprite[]
    {
        return this.group.getMatching('active', true) as Phaser.Physics.Arcade.Sprite[];
    }

    killProjectile (proj: Phaser.Physics.Arcade.Sprite): void
    {
        proj.setActive(false).setVisible(false);
        proj.setVelocity(0, 0);
        this.group.killAndHide(proj);
    }
}
