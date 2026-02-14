import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { Boss } from '../entities/Boss';
import type { ProjectileGroup } from '../entities/Projectile';

export class CombatSystem
{
    private scene: Scene;

    constructor (scene: Scene)
    {
        this.scene = scene;

        EventBus.on('player-melee', (data: { x: number; y: number; angle: number }) => {
            this.handleMeleeEvent(data);
        });
    }

    private currentEnemies: Enemy[] = [];
    private currentBoss: Boss | null = null;

    setEnemies (enemies: Enemy[]): void { this.currentEnemies = enemies; }
    setBoss (boss: Boss | null): void { this.currentBoss = boss; }

    private handleMeleeEvent (data: { x: number; y: number; angle: number }): void
    {
        const MELEE_RANGE = 70;
        for (const enemy of this.currentEnemies) {
            if (!enemy.isAlive) continue;
            const dist = Phaser.Math.Distance.Between(data.x, data.y, enemy.x, enemy.y);
            if (dist <= MELEE_RANGE) {
                enemy.takeDamage(25);
            }
        }
        if (this.currentBoss && this.currentBoss.isAlive) {
            const dist = Phaser.Math.Distance.Between(data.x, data.y, this.currentBoss.x, this.currentBoss.y);
            if (dist <= MELEE_RANGE) {
                this.currentBoss.takeDamage(25);
            }
        }
    }

    setupProjectileOverlaps (
        projGroup: ProjectileGroup,
        enemySprites: Phaser.Physics.Arcade.Sprite[],
        bossSprite: Phaser.Physics.Arcade.Sprite | null
    ): void
    {
        // Set up arcade overlap between projectile group and each enemy sprite
        for (const eSprite of enemySprites) {
            this.scene.physics.add.overlap(
                projGroup.group,
                eSprite,
                (obj1, obj2) => {
                    // Phaser may swap callback parameter order — identify the projectile explicitly
                    const p = (obj1 === eSprite ? obj2 : obj1) as Phaser.Physics.Arcade.Sprite;
                    const e = eSprite.getData('enemy') as Enemy | undefined;
                    if (p.active && e && e.isAlive) {
                        e.takeDamage(p.getData('damage') ?? 15);
                        projGroup.killProjectile(p);
                    }
                }
            );
        }

        if (bossSprite) {
            this.scene.physics.add.overlap(
                projGroup.group,
                bossSprite,
                (obj1, obj2) => {
                    // Phaser may swap callback parameter order — identify the projectile explicitly
                    const p = (obj1 === bossSprite ? obj2 : obj1) as Phaser.Physics.Arcade.Sprite;
                    const b = bossSprite.getData('boss') as Boss | undefined;
                    if (p.active && b && b.isAlive) {
                        b.takeDamage(p.getData('damage') ?? 15);
                        projGroup.killProjectile(p);
                    }
                }
            );
        }
    }

    update (time: number, player: Player): void
    {
        if (!player.isAlive) return;

        // Enemy contact damage
        for (const enemy of this.currentEnemies) {
            if (!enemy.isAlive) continue;
            const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
            if (dist < 28) {
                const dmg = enemy.getContactDamage(time);
                if (dmg > 0) player.takeDamage(dmg);
            }
        }

        // Boss contact damage
        if (this.currentBoss && this.currentBoss.isAlive) {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, this.currentBoss.x, this.currentBoss.y);
            if (dist < 40) {
                const dmg = this.currentBoss.getContactDamage(time);
                if (dmg > 0) player.takeDamage(dmg);
            }
        }
    }

    destroy (): void
    {
        EventBus.removeAllListeners('player-melee');
    }
}
