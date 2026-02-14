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
        const rt = scene.add.renderTexture(0, 0, w, h);
        const gfx = scene.add.graphics();
        gfx.fillStyle(color, 1);
        if (radius > 0) {
            gfx.fillRoundedRect(0, 0, w, h, radius);
        } else {
            gfx.fillRect(0, 0, w, h);
        }
        rt.draw(gfx, 0, 0);
        rt.saveTexture(key);
        gfx.destroy();
        rt.destroy();
    }

    private static makeCircle (scene: Scene, key: string, radius: number, color: number): void
    {
        const size = radius * 2 + 2;
        const rt = scene.add.renderTexture(0, 0, size, size);
        const gfx = scene.add.graphics();
        gfx.fillStyle(color, 1);
        gfx.fillCircle(radius + 1, radius + 1, radius);
        rt.draw(gfx, 0, 0);
        rt.saveTexture(key);
        gfx.destroy();
        rt.destroy();
    }

    private static makeMeleeFlash (scene: Scene): void
    {
        const size = 80;
        const rt = scene.add.renderTexture(0, 0, size, size);
        const gfx = scene.add.graphics();
        gfx.fillStyle(0x80cbc4, 0.7);
        // Draw a sector arc (fan shape)
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
        rt.draw(gfx, 0, 0);
        rt.saveTexture('melee-flash');
        gfx.destroy();
        rt.destroy();
    }
}
