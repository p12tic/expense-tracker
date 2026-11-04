import { expect, test } from '@playwright/test';
import { expectNavbar, headers, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/presets');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('presets page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Presets');
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveAttribute('href', /\/presets\/add$/);
  await expect(headers(page)).toHaveText(['Name', 'Description', 'Accounts', 'Tags']);
});

test('preset rows load', async ({ page }) => {
  await expect(rows(page).nth(2)).toBeVisible();
  const row = rows(page).first();
  await expect(row.getByRole('link')).toHaveText(/^Preset_[A-Za-z]{8}$/);
  await expect(row.getByRole('link')).toHaveAttribute('href', /\/presets\/\d+$/);
  await expect(row).toContainText('Test description of this preset');
  
  const accounts = row.locator('[aria-colindex="3"]').getByRole('button');
  await expect(accounts).toHaveCount(2);
  await expect(accounts.first()).toHaveText(/^Account_[A-Za-z]{8}\s0\.5$/);
  await expect(row.locator('[aria-colindex="4"]').getByRole('button')).toHaveText([/^Tag_[A-Za-z]{8}$/]);
});
