import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		include: ['tests/unit/**/*.test.ts'],
		setupFiles: ['tests/unit/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: [
				'src/game/dungeon/**',
				'src/game/entities/**',
				'src/game/systems/**',
				'src/game/ui/**',
				'src/game/EventBus.ts'
			],
			exclude: ['src/game/scenes/**', 'src/game/TextureFactory.ts', 'src/game/main.ts']
		}
	}
});
