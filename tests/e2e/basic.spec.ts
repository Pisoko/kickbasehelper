import { test, expect } from '@playwright/test';

test('Startseite zeigt Spieler Hub', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Spieler Hub' })).toBeVisible();
  await expect(page.getByText('Entdecke und analysiere alle Bundesliga-Spieler')).toBeVisible();
});
