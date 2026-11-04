import { expect, test } from '@playwright/test';
import { expectNavbar, headers, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/accounts/1');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('account page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText(/^Account "Account_[A-Za-z]{8}"$/);
  await expect(page.getByRole('button', { name: 'Sync' })).toHaveAttribute('href', /\/accounts\/1\/sync$/);
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute('href', /\/accounts\/1\/edit$/);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveAttribute('href', /\/accounts\/1\/delete$/);
  await expect(page.locator('.tmp-static-field-label')).toHaveText(['Description']);
  await expect(page.locator('.tmp-static-field-content')).toHaveText(['Test description of this account']);
  await expect(page.locator('h3')).toHaveText('Transactions');
  await expect(headers(page)).toHaveText(['Description', 'Date/Time', 'Amount', 'Balance', '']);
});

test('transaction rows load', async ({ page }) => {
  await expect(rows(page).nth(2)).toBeVisible();
  const row = rows(page).first();
  await expect(row.getByRole('link')).toHaveText(/^Transaction [A-Za-z]{5}$/);
  await expect(row.getByRole('link')).toHaveAttribute('href', /\/transactions\/\d+$/);
  await expect(row.locator('[aria-colindex="2"]')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  await expect(row.locator('[aria-colindex="3"]')).toHaveText(/^-?\d+\.\d{2}$/);
  await expect(row.locator('[aria-colindex="4"]')).toHaveText(/^-?\d+\.\d{2}$/);
});