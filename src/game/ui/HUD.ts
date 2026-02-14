import { Scene } from 'phaser';
import type { Player } from '../entities/Player';
import type { Boss } from '../entities/Boss';

export class HUD
{
    private scene: Scene;
    private hpBar: Phaser.GameObjects.Graphics;
    private scoreText: Phaser.GameObjects.Text;
    private roomText: Phaser.GameObjects.Text;
    private bossBarBg: Phaser.GameObjects.Graphics;
    private bossBarFill: Phaser.GameObjects.Graphics;
    private bossLabel: Phaser.GameObjects.Text;
    private messageText: Phaser.GameObjects.Text;

    constructor (scene: Scene)
    {
        this.scene = scene;

        // HP bar background
        this.hpBar = scene.add.graphics();
        this.hpBar.setScrollFactor(0).setDepth(100);

        // Score
        this.scoreText = scene.add.text(12, 36, 'Score: 0', {
            fontFamily: 'Arial', fontSize: '14px', color: '#ffffff'
        }).setScrollFactor(0).setDepth(100);

        // Room counter
        this.roomText = scene.add.text(512, 8, 'Room 1/5', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

        // Boss HP bar (hidden by default)
        this.bossBarBg = scene.add.graphics();
        this.bossBarBg.setScrollFactor(0).setDepth(100).setVisible(false);

        this.bossBarFill = scene.add.graphics();
        this.bossBarFill.setScrollFactor(0).setDepth(101).setVisible(false);

        this.bossLabel = scene.add.text(512, 4, 'BOSS', {
            fontFamily: 'Arial Black', fontSize: '12px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102).setVisible(false);

        // Message text
        this.messageText = scene.add.text(512, 300, '', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setAlpha(0);
    }

    update (player: Player, currentRoomId: number, totalRooms: number, boss: Boss | null): void
    {
        // HP bar
        this.hpBar.clear();
        const pct = player.hp / player.maxHp;
        const bw = 160;
        const bh = 16;
        this.hpBar.fillStyle(0x333333);
        this.hpBar.fillRect(10, 10, bw, bh);
        const fillColor = pct > 0.5 ? 0x4caf50 : pct > 0.25 ? 0xff9800 : 0xf44336;
        this.hpBar.fillStyle(fillColor);
        this.hpBar.fillRect(10, 10, bw * pct, bh);
        this.hpBar.lineStyle(1, 0xffffff, 0.5);
        this.hpBar.strokeRect(10, 10, bw, bh);

        // HP label
        this.scoreText.setText(`HP: ${player.hp}/${player.maxHp}\nScore: ${player.score}`);

        // Room counter
        this.roomText.setText(`Room ${currentRoomId + 1} / ${totalRooms}`);

        // Boss bar
        if (boss) {
            const visible = boss.isAlive;
            this.bossBarBg.setVisible(visible);
            this.bossBarFill.setVisible(visible);
            this.bossLabel.setVisible(visible);

            if (visible) {
                const bpct = boss.hp / boss.maxHp;
                const bbw = 400;
                const bbh = 14;
                const bbx = 512 - bbw / 2;
                const bby = 30;

                this.bossBarBg.clear();
                this.bossBarBg.fillStyle(0x333333);
                this.bossBarBg.fillRect(bbx, bby, bbw, bbh);
                this.bossBarBg.lineStyle(1, 0xffffff, 0.5);
                this.bossBarBg.strokeRect(bbx, bby, bbw, bbh);

                this.bossBarFill.clear();
                this.bossBarFill.fillStyle(0xef5350);
                this.bossBarFill.fillRect(bbx, bby, bbw * bpct, bbh);

                this.bossLabel.setPosition(512, bby - 16);
            }
        } else {
            this.bossBarBg.setVisible(false);
            this.bossBarFill.setVisible(false);
            this.bossLabel.setVisible(false);
        }
    }

    showMessage (text: string, duration: number = 2000): void
    {
        this.messageText.setText(text).setAlpha(1);
        this.scene.tweens.add({
            targets: this.messageText,
            alpha: 0,
            delay: duration - 400,
            duration: 400
        });
    }

    destroy (): void
    {
        this.hpBar.destroy();
        this.scoreText.destroy();
        this.roomText.destroy();
        this.bossBarBg.destroy();
        this.bossBarFill.destroy();
        this.bossLabel.destroy();
        this.messageText.destroy();
    }
}
