import { expect, test } from '@playwright/test';
import { expectNavbar, headers, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/accounts');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('accounts page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Accounts');
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveAttribute('href', /\/accounts\/add$/);
  await expect(headers(page)).toHaveText(['Name', 'Description', 'Balance', '']);
});

test('account rows load', async ({ page }) => {
  const row = rows(page).filter({ hasText: /Account_/ }).first();
  await expect(row).toBeVisible();
  await expect(row.getByRole('link').first()).toHaveAttribute('href', /\/accounts\/\d+$/);
  await expect(row).toContainText('Test description of this account');
  await expect(row.locator('[aria-colindex="3"]')).toHaveText(/^-?\d+\.\d{2}$/);
  await expect(row.getByRole('button', { name: 'Sync' })).toHaveAttribute('href', /\/accounts\/\d+\/sync$/);
});

test('chained accounts are listed', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Shared_with_user2' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Shared_from_user2' }).first()).toBeVisible();
});
