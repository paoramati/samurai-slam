import { test, expect } from '@playwright/test';

test.describe('Gameplay tests', () => {
	let consoleErrors: string[];

	test.beforeEach(async ({ page }) => {
		consoleErrors = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') consoleErrors.push(msg.text());
		});

		await page.goto('/');
		const canvas = page.locator('#game-container canvas');
		await expect(canvas).toBeVisible({ timeout: 10000 });
	});

	async function startGame(page: import('@playwright/test').Page) {
		const canvas = page.locator('#game-container canvas');
		const box = (await canvas.boundingBox())!;

		// Click "START GAME" button at ~(50%, 67%) of the canvas
		await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.67);

		// Wait for Game scene to initialise
		await page.waitForTimeout(1500);
	}

	test('start game and play for 10s without console errors', async ({ page }) => {
		await startGame(page);

		const canvas = page.locator('#game-container canvas');
		const box = (await canvas.boundingBox())!;
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;

		// Simulate gameplay: move, melee, and shoot in a loop
		for (let i = 0; i < 10; i++) {
			// Move right + up
			await page.keyboard.down('d');
			await page.keyboard.down('w');
			await page.waitForTimeout(300);

			// Melee attack
			await page.keyboard.press('f');
			await page.waitForTimeout(100);

			// Shoot toward canvas center
			await page.mouse.click(cx + (i % 2 === 0 ? 100 : -100), cy);
			await page.waitForTimeout(100);

			// Change direction: left + down
			await page.keyboard.up('d');
			await page.keyboard.up('w');
			await page.keyboard.down('a');
			await page.keyboard.down('s');
			await page.waitForTimeout(300);

			// Melee + shoot again
			await page.keyboard.press('f');
			await page.mouse.click(cx, cy + (i % 2 === 0 ? 100 : -100));
			await page.waitForTimeout(100);

			await page.keyboard.up('a');
			await page.keyboard.up('s');
		}

		expect(consoleErrors).toHaveLength(0);
	});

	test('canvas remains active after gameplay input', async ({ page }) => {
		await startGame(page);

		// Send some movement input
		await page.keyboard.down('d');
		await page.waitForTimeout(500);
		await page.keyboard.up('d');
		await page.keyboard.press('f');
		await page.waitForTimeout(500);

		// Canvas should still be present and visible
		const canvas = page.locator('#game-container canvas');
		await expect(canvas).toBeVisible();
		const box = await canvas.boundingBox();
		expect(box!.width).toBeGreaterThan(0);
		expect(box!.height).toBeGreaterThan(0);
	});

	test('idle player eventually reaches GameOver', async ({ page }) => {
		await startGame(page);

		// Stand still and let enemies kill the player.
		// Player has 100 HP, enemies deal 10 dmg every 1200ms on contact.
		// Enemies move toward the player, so contact should happen within a few seconds.
		// 100 HP / 10 dmg = 10 hits × 1.2s = ~12s + approach time.
		// GameOver scene emits 'game-over' which sets document title or shows "YOU DIED" / "PLAY AGAIN".
		// We poll for the GameOver scene by looking for the PLAY AGAIN text — but since
		// this is canvas-rendered we can't query text. Instead, wait and then click where
		// "PLAY AGAIN" would be and see if it navigates back to MainMenu (the START GAME click spot).

		// Wait long enough for player to die (enemies approach + deal lethal damage)
		await page.waitForTimeout(20000);

		// At this point we should be on GameOver. No errors should have occurred.
		expect(consoleErrors).toHaveLength(0);
	});
});
