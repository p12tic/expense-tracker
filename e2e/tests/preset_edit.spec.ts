import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/presets/1/edit');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('preset edit page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('New preset');
  await expect(page.locator('input[name="name"]')).toHaveValue(/^Preset_[A-Za-z]{8}$/);
  await expect(page.locator('input[name="description"]')).toHaveValue('Test description of this preset');
  await expect(page.locator('h3')).toHaveText('Transaction template');
  await expect(page.locator('input[name="transaction_desc"]')).toHaveValue(/^Preset transaction [A-Za-z]{5}$/);
  await expect(page.locator('h4')).toHaveText(['Accounts', 'Tags']);
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('preset accounts load', async ({ page }) => {
  const accounts = page.locator('#tmp-accounts');
  await expect(accounts.locator('.tmp-account-name').filter({ hasText: /^Account_[A-Za-z]{8}$/ }).nth(2)).toBeVisible();

  // seeded presets use 2 accounts with a 0.5 multiplier each
  await expect(accounts.locator('.tmp-account-amount')).toHaveCount(2);
  await expect(accounts.locator('.tmp-account-amount').first()).toHaveValue('0.5');
  await expect(accounts.locator('.tmp-account-amount-label').first()).toHaveText('Multiplier');
  await expect(accounts.locator('.bootstrap-touchspin-down').first()).toHaveText('-');
  await expect(accounts.locator('.bootstrap-touchspin-up').first()).toHaveText('+');
  await expect(accounts.getByRole('button', { name: "Don't use" })).toHaveCount(2);
  await expect(accounts.getByRole('button', { name: 'Use', exact: true }).first()).toBeVisible();
});

test('preset tags load', async ({ page }) => {
  const tags = page.locator('#tmp-tags .tmp-tag-button');
  await expect(tags.nth(2)).toBeVisible(); // at least 3 seeded tags
  await expect(tags.first()).toHaveText(/^Tag_[A-Za-z]{8}$/);
  await expect(page.locator('#tmp-tags .tmp-tag-button.btn-info')).toHaveCount(1); // 1 selected tag
});
