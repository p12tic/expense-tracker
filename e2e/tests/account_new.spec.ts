import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/accounts/add');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('new account page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Create new account');
  await expect(page.locator('label')).toHaveText(['Name', 'Description']);
  await expect(page.locator('input[name="name"]')).toHaveValue('');
  await expect(page.locator('input[name="description"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});
