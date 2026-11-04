import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/accounts/1/edit');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('account edit page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Edit');
  await expect(page.locator('label')).toHaveText(['Name', 'Description']);
  await expect(page.locator('input[name="name"]')).toHaveValue(/^Account_[A-Za-z]{8}$/);
  await expect(page.locator('input[name="description"]')).toHaveValue('Test description of this account');
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});
