import { test, expect } from '@playwright/test';

test('Startseite zeigt Dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ArenaHelper' })).toBeVisible();
  await expect(page.getByText('Konfiguration')).toBeVisible();
});
