import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/transactions');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('transactions page loads', async ({ page }) => {
  await expect(page.locator('h1').nth(0)).toContainText('Incoming batches');
  await expect(page.getByRole('button', { name: 'New Batch' })).toBeVisible();
  await expect(page.locator('h1').nth(1)).toContainText('Transactions');
  await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible();
});

test('transaction row loads', async ({ page }) => {
  const row = page.locator('.ReactVirtualized__Table__row').filter({ hasText: /^Transaction / }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  await expect(row).toContainText('Account');
  await expect(row).toContainText('Tag');
});
