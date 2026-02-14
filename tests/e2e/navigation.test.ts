import { test, expect } from '@playwright/test';

test.describe('Navigation tests', () => {
    test('root route returns HTTP 200', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.status()).toBe(200);
    });

    test('page has a non-empty title', async ({ page }) => {
        await page.goto('/');
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
    });

    test('#game-container div is visible', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#game-container')).toBeVisible({ timeout: 10000 });
    });
});
