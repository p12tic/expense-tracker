import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/chained_accounts/add');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Create chained account request');
  await expect(page.locator('label')).toHaveText(['User', 'Account', 'Description']);
  await expect(page.locator('input[name="description"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Send request' })).toBeVisible();
});

test('user rows load', async ({ page }) => {
  const options = page.locator('select[name="slave"] option');
  await expect(options.first()).toHaveText('Select user');
  await expect(options.first()).toBeDisabled();
  await expect(page.locator('select[name="slave"] option[value="user2"]')).toHaveText('user2');
  await expect(page.locator('select[name="slave"] option[value="user1"]')).toHaveCount(0);
});

test('account rows load', async ({ page }) => {
  const options = page.locator('select[name="account"] option');
  await expect(options.first()).toHaveText('Select input account');
  await expect(options.first()).toBeDisabled();
  await expect(options.filter({ hasText: /^Account_[A-Za-z]{8}$/ }).first()).toBeAttached();
  await expect(options.filter({ hasText: 'Shared_with_user2' })).toHaveCount(1);
});
