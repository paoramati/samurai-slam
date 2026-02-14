import { Scene } from 'phaser';

export class TextureFactory
{
    static generated = false;

    static generateAll (scene: Scene): void
    {
        if (TextureFactory.generated) return;
        TextureFactory.generated = true;

        TextureFactory.makeRect(scene, 'player', 28, 28, 0x4fc3f7, 4);
        TextureFactory.makeRect(scene, 'enemy', 24, 24, 0xef5350, 0);
        TextureFactory.makeRect(scene, 'enemy-fast', 18, 18, 0xff8f00, 0);
        TextureFactory.makeRect(scene, 'boss', 48, 48, 0xce93d8, 0);
        TextureFactory.makeRect(scene, 'wall', 32, 32, 0x546e7a, 0);
        TextureFactory.makeRect(scene, 'floor', 32, 32, 0x263238, 0);
        TextureFactory.makeCircle(scene, 'loot', 6, 0xffeb3b);
        TextureFactory.makeCircle(scene, 'projectile', 5, 0x80deea);
        TextureFactory.makeMeleeFlash(scene);
    }

    private static makeRect (scene: Scene, key: string, w: number, h: number, color: number, radius: number): void
    {
        const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(color, 1);
        if (radius > 0) {
            gfx.fillRoundedRect(0, 0, w, h, radius);
        } else {
            gfx.fillRect(0, 0, w, h);
        }
        gfx.generateTexture(key, w, h);
        gfx.destroy();
    }

    private static makeCircle (scene: Scene, key: string, radius: number, color: number): void
    {
        const size = radius * 2 + 2;
        const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(color, 1);
        gfx.fillCircle(radius + 1, radius + 1, radius);
        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    private static makeMeleeFlash (scene: Scene): void
    {
        const size = 80;
        const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0x80cbc4, 0.7);
        gfx.beginPath();
        gfx.moveTo(size / 2, size / 2);
        const startAngle = -Phaser.Math.DegToRad(60);
        const endAngle = Phaser.Math.DegToRad(60);
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / steps);
            gfx.lineTo(size / 2 + Math.cos(angle) * 36, size / 2 + Math.sin(angle) * 36);
        }
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('melee-flash', size, size);
        gfx.destroy();
    }
}
