import { Scene } from 'phaser';
import { TextureFactory } from '../TextureFactory';

export class Preloader extends Scene {
	constructor() {
		super('Preloader');
	}

	init() {
		// Background for loading screen
		this.add.rectangle(512, 384, 1024, 768, 0x1a1a2e);

		// Progress bar outline
		this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0x4fc3f7);

		// Progress bar fill
		const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0x4fc3f7);

		this.load.on('progress', (progress: number) => {
			bar.width = 4 + 460 * progress;
		});

		this.add
			.text(512, 340, 'SAMURAI SLAM', {
				fontFamily: 'Arial Black',
				fontSize: 32,
				color: '#4fc3f7',
				stroke: '#000000',
				strokeThickness: 6,
				align: 'center'
			})
			.setOrigin(0.5);
	}

	create() {
		TextureFactory.generateAll(this);
		this.scene.start('MainMenu');
	}
}
