import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
	test('page loads without console errors', async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') consoleErrors.push(msg.text());
		});

		await page.goto('/');
		await page.waitForTimeout(2000); // let app initialise

		expect(consoleErrors).toHaveLength(0);
	});

	test('#game-container canvas is visible within 10s', async ({ page }) => {
		await page.goto('/');
		const canvas = page.locator('#game-container canvas');
		await expect(canvas).toBeVisible({ timeout: 10000 });
	});

	test('canvas has non-zero dimensions', async ({ page }) => {
		await page.goto('/');
		const canvas = page.locator('#game-container canvas');
		await expect(canvas).toBeVisible({ timeout: 10000 });

		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeGreaterThan(0);
		expect(box!.height).toBeGreaterThan(0);
	});
});
