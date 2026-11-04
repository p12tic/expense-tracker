import { expect, test } from '@playwright/test';
import { expectNavbar, headers, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/tags');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('tags page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Tags');
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveAttribute('href', /\/tags\/add$/);
  await expect(headers(page)).toHaveText(['Name', 'Description']);
});

test('tag rows load', async ({ page }) => {
  await expect(rows(page).nth(2)).toBeVisible(); // at least 3 seeded rows
  const row = rows(page).first();
  await expect(row.getByRole('link')).toHaveText(/^Tag_[A-Za-z]{8}$/);
  await expect(row.getByRole('link')).toHaveAttribute('href', /\/tags\/\d+$/);
  await expect(row).toContainText('Test description of this tag');
});
