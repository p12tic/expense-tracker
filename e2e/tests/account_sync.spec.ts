import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/accounts/1/sync');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('account sync page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Create new');
  await expect(page.locator('label')).toHaveText(['Balance', 'Date time']);
  await expect(page.locator('input[name="balance"]')).toHaveValue('0');
  await expect(page.locator('input[name="date"]')).toHaveAttribute('type', 'datetime-local');
  await expect(page.getByText('Using timezone:')).toBeVisible();
  const timezone = page.locator('.input-group select');
  await expect(timezone.locator('option')).toHaveCount(26);
  await expect(timezone.locator('option').first()).toHaveText('-11:00');
  await expect(timezone.locator('option').last()).toHaveText('+14:00');
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});
