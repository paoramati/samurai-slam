import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
    }

    create (data: { score?: number; won?: boolean })
    {
        const { width, height } = this.scale;
        const score = data?.score ?? 0;
        const won = data?.won ?? false;

        this.cameras.main.setBackgroundColor(won ? 0x0a1a2e : 0x1a0000);

        // Title
        const titleText = won ? 'YOU WIN!' : 'YOU DIED';
        const titleColor = won ? '#4fc3f7' : '#ef5350';
        this.add.text(width / 2, height * 0.3, titleText, {
            fontFamily: 'Arial Black', fontSize: 72, color: titleColor,
            stroke: '#000000', strokeThickness: 10, align: 'center'
        }).setOrigin(0.5);

        // Score
        this.add.text(width / 2, height * 0.48, `Score: ${score}`, {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        // Play Again button
        const btnBg = this.add.graphics();
        const btnX = width / 2 - 110;
        const btnY = height * 0.65 - 25;
        btnBg.fillStyle(0x1a1a2e, 1);
        btnBg.fillRoundedRect(btnX, btnY, 220, 50, 8);
        btnBg.lineStyle(2, 0x4fc3f7);
        btnBg.strokeRoundedRect(btnX, btnY, 220, 50, 8);

        const playAgain = this.add.text(width / 2, height * 0.65, 'PLAY AGAIN', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playAgain.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x0d47a1, 1);
            btnBg.fillRoundedRect(btnX, btnY, 220, 50, 8);
            btnBg.lineStyle(2, 0x80deea);
            btnBg.strokeRoundedRect(btnX, btnY, 220, 50, 8);
        });
        playAgain.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x1a1a2e, 1);
            btnBg.fillRoundedRect(btnX, btnY, 220, 50, 8);
            btnBg.lineStyle(2, 0x4fc3f7);
            btnBg.strokeRoundedRect(btnX, btnY, 220, 50, 8);
        });
        playAgain.on('pointerdown', () => this.scene.start('MainMenu'));

        EventBus.emit('current-scene-ready', this);
        EventBus.emit('game-over', { score, won });
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
