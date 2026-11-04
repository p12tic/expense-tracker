import { expect, test } from '@playwright/test';
import { expectNavbar, loginAndGoto } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/tags/add');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('new tag page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Create new tag');
  await expect(page.locator('label')).toHaveText(['Name', 'Description']);
  await expect(page.locator('input[name="name"]')).toHaveValue('');
  await expect(page.locator('input[name="description"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});
