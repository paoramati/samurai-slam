import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene {
	constructor() {
		super('MainMenu');
	}

	create() {
		const { width, height } = this.scale;

		// Background
		this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

		// Decorative border
		const border = this.add.graphics();
		border.lineStyle(2, 0x4fc3f7, 0.5);
		border.strokeRect(40, 40, width - 80, height - 80);

		// Corner accents
		const corners = this.add.graphics();
		corners.lineStyle(3, 0x4fc3f7, 1);
		const cs = 20;
		[
			[40, 40],
			[width - 40, 40],
			[40, height - 40],
			[width - 40, height - 40]
		].forEach(([cx, cy]) => {
			corners.strokeRect(cx - cs / 2, cy - cs / 2, cs, cs);
		});

		// Title
		this.add
			.text(width / 2, height * 0.28, 'SAMURAI', {
				fontFamily: 'Arial Black',
				fontSize: 72,
				color: '#4fc3f7',
				stroke: '#000033',
				strokeThickness: 8
			})
			.setOrigin(0.5);

		this.add
			.text(width / 2, height * 0.42, 'SLAM', {
				fontFamily: 'Arial Black',
				fontSize: 72,
				color: '#80deea',
				stroke: '#000033',
				strokeThickness: 8
			})
			.setOrigin(0.5);

		// Subtitle
		this.add
			.text(width / 2, height * 0.56, 'A ROGUELIKE ADVENTURE', {
				fontFamily: 'Arial',
				fontSize: 18,
				color: '#546e7a'
			})
			.setOrigin(0.5);

		// Start button
		const btnBg = this.add.graphics();
		btnBg.fillStyle(0x0d47a1, 1);
		btnBg.fillRoundedRect(width / 2 - 110, height * 0.67 - 25, 220, 50, 8);
		btnBg.lineStyle(2, 0x4fc3f7);
		btnBg.strokeRoundedRect(width / 2 - 110, height * 0.67 - 25, 220, 50, 8);

		const startBtn = this.add
			.text(width / 2, height * 0.67, 'START GAME', {
				fontFamily: 'Arial Black',
				fontSize: 22,
				color: '#ffffff'
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		startBtn.on('pointerover', () => {
			btnBg.clear();
			btnBg.fillStyle(0x1565c0, 1);
			btnBg.fillRoundedRect(width / 2 - 110, height * 0.67 - 25, 220, 50, 8);
			btnBg.lineStyle(2, 0x80deea);
			btnBg.strokeRoundedRect(width / 2 - 110, height * 0.67 - 25, 220, 50, 8);
		});
		startBtn.on('pointerout', () => {
			btnBg.clear();
			btnBg.fillStyle(0x0d47a1, 1);
			btnBg.fillRoundedRect(width / 2 - 110, height * 0.67 - 25, 220, 50, 8);
			btnBg.lineStyle(2, 0x4fc3f7);
			btnBg.strokeRoundedRect(width / 2 - 110, height * 0.67 - 25, 220, 50, 8);
		});
		startBtn.on('pointerdown', () => this.changeScene());

		// Controls hint
		this.add
			.text(width / 2, height * 0.82, 'WASD / Arrows: Move    F: Melee    Click: Shoot', {
				fontFamily: 'Arial',
				fontSize: 14,
				color: '#546e7a'
			})
			.setOrigin(0.5);

		EventBus.emit('current-scene-ready', this);
	}

	changeScene() {
		this.scene.start('Game');
	}
}
