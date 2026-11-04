import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/transactions/add');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('transaction page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('New transaction');
  await expect(page.getByRole('button', { name: 'Import preset' })).toBeVisible();
  await expect(page.getByLabel('Description')).toHaveValue('');
  await expect(page.getByLabel('Date')).toHaveValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/);
  await expect(page.getByText('Using timezone:')).toBeVisible();
  await expect(page.locator('h4')).toHaveText(['Accounts', 'Tags', 'Images']);
  await expect(page.getByText('Drag and drop images here, or click to select images')).toBeVisible();
  await expect(page.getByText('No images attached to this transaction')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

  const tags = page.locator('#tmp-tags .tmp-tag-button');
  await expect(tags).toHaveText([/^Tag_[A-Za-z]{8}$/, /^Tag_[A-Za-z]{8}$/, /^Tag_[A-Za-z]{8}$/]);
  await expect(page.locator('#tmp-tags .tmp-tag-button.btn-info')).toHaveCount(0);
});