import { expect, test } from '@playwright/test';

test('home page mounts the React app', async ({ page }) => {
  await page.goto('/');

  const root = page.locator('#root');
  await expect(root).toBeAttached();
  await expect(root.locator(':scope > *').first()).toBeAttached();
});
