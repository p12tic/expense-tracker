import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/presets/1');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('preset page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText(/^Preset "Preset_[A-Za-z]{8}"$/);
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute('href', /\/presets\/1\/edit$/);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveAttribute('href', /\/presets\/1\/delete$/);
  await expect(page.locator('.tmp-static-field-label')).toHaveText(['Description']);
  await expect(page.locator('.tmp-static-field-content')).toHaveText(['Test description of this preset']);
  await expect(page.locator('h3')).toHaveText('Transaction template');
  await expect(page.locator('h4')).toHaveText('Tags');
  await expect(page.locator('table th')).toHaveText(['Affected account', 'Fraction']);
});

test('preset accounts and tags load', async ({ page }) => {
  const accountRows = page.locator('table tbody tr');
  await expect(accountRows).toHaveCount(2);
  const link = accountRows.first().getByRole('link');
  await expect(link).toHaveText(/^Account_[A-Za-z]{8}$/);
  await expect(link).toHaveAttribute('href', /\/accounts\/\d+$/);
  await expect(accountRows.locator('td:nth-child(2)')).toHaveText(['0.500', '0.500']);
  await expect(page.locator('button.btn-secondary')).toHaveText([/^Tag_[A-Za-z]{8}$/]);
});
