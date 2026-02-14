import { defineConfig, devices } from '@playwright/test';

const CI = process.env.CI;

export default defineConfig({
	testDir: './tests/e2e',
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!CI,
	retries: CI ? 2 : 0,
	reporter: 'html',

	use: {
		baseURL: 'http://localhost:8080',
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],

	webServer: {
		command: 'npm run dev-nolog',
		url: 'http://localhost:8080',
		reuseExistingServer: !CI,
		timeout: 120000
	}
});
