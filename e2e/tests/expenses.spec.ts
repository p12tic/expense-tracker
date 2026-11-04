import { expect, test } from '@playwright/test';
import { expectNavbar, headers, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/expenses');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('expenses page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText(['Incoming expenses', 'Reviewed expenses']);
  await expect(headers(page, 0)).toHaveText(['Description', 'Date/Time', 'From', 'To account', 'Amount', '']);
  await expect(headers(page, 1)).toHaveText(['Description', 'Date/Time', 'From', 'To account', 'Amount']);
});

test(`reviewed expense rows load`, async ({ page }) => {
  await expect(rows(page, 1).nth(2)).toBeVisible();
  const row = rows(page, 1).first();
  await expect(row.locator('[aria-colindex="1"]')).toHaveText(/^Shared expense [A-Za-z]{5}$/);
  await expect(row.locator('[aria-colindex="2"]')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  await expect(row.locator('[aria-colindex="3"]')).toHaveText('user2');
  await expect(row.getByRole('link', { name: 'Shared_from_user2' })).toHaveAttribute('href', /\/accounts\/\d+$/);
  await expect(row.locator('[aria-colindex="5"]')).toHaveText(/^-?\d+\.\d{2}$/);
});

test(`incoming expense rows load`, async ({ page }) => {
  await expect(rows(page, 0).nth(2)).toBeVisible();
  const row = rows(page, 0).first();
  await expect(row.locator('[aria-colindex="1"]')).toHaveText(/^Shared expense [A-Za-z]{5}$/);
  await expect(row.locator('[aria-colindex="2"]')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  await expect(row.locator('[aria-colindex="3"]')).toHaveText('user2');
  await expect(row.getByRole('link', { name: 'Shared_from_user2' })).toHaveAttribute('href', /\/accounts\/\d+$/);
  await expect(row.locator('[aria-colindex="5"]')).toHaveText(/^-?\d+\.\d{2}$/);
});

test('buttons load', async ({ page }) => {
  const row = rows(page, 0).first();
  await expect(row.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Decline' })).toBeVisible();
  await expect(rows(page, 1).first().getByRole('button')).toHaveCount(0);
});
