import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/transactions/1');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('transaction page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText(/^Transaction "Transaction [A-Za-z]{5}"$/);
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute('href', /\/transactions\/1\/edit$/);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveAttribute('href', /\/transactions\/1\/delete$/);
  await expect(page.locator('.tmp-static-field-label')).toHaveText(['Date and time', 'Timezone']);
  await expect(page.locator('.tmp-static-field-content').nth(0)).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  await expect(page.locator('.tmp-static-field-content').nth(1)).toHaveText(/^UTC [+-]\d{1,2}:\d{2}$/);
  await expect(page.locator('h3')).toHaveText(['Tags', 'Affected accounts', 'Images']);
  await expect(page.locator('table th')).toHaveText(['Account', 'Amount']);
});

test('transaction elements load', async ({ page }) => {
  await expect(page.locator('button.btn-secondary')).toHaveText([/^Tag_[A-Za-z]{8}$/]);

  const accountRows = page.locator('table tbody tr');
  await expect(accountRows).toHaveCount(1);
  await expect(accountRows.getByRole('link')).toHaveText(/^Account_[A-Za-z]{8}$/);
  await expect(accountRows.getByRole('link')).toHaveAttribute('href', /\/accounts\/\d+$/);
  await expect(accountRows.locator('td').nth(1)).toHaveText(/^-?\d+\.\d{2}$/);
  await expect(page.getByText('No images attached to this transaction')).toBeVisible();
});
