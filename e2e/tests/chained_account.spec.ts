import { expect, test } from '@playwright/test';
import { expectNavbar, headers, loginAndGoto, rows } from './helpers';

test.beforeEach(async ({ page }) => {
  await loginAndGoto(page, '/chained_accounts');
});

test('Navbar works', async ({ page }) => {
  await expectNavbar(page);
});

test('chained accounts page loads', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText(['Pending requests', 'Chained accounts']);
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveAttribute(
    'href',
    /\/chained_accounts\/add$/,
  );
  await expect(headers(page, 0)).toHaveText(['From', 'To', 'Description', '']);
  await expect(headers(page, 1)).toHaveText(['Master account', 'Slave account', '']);
});

test('cancel button exists', async ({ page }) => {
  const row = rows(page, 0).filter({ hasText: 'Chain request from user1' }).first();
  await expect(row).toContainText('user1');
  await expect(row).toContainText('user2');
  await expect(row.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('select account', async ({ page }) => {
  const row = rows(page, 0).filter({ hasText: 'Chain request from user2' }).first();
  const accept = row.getByRole('button', { name: 'Accept' });
  await expect(row.getByRole('button', { name: 'Decline' })).toBeVisible();
  await expect(accept).toBeDisabled();

  const select = row.locator('select');
  await expect(select.locator('option[value=""]')).toHaveText('Select account');

});

test('chained accounts rows load', async ({ page }) => {
  await expect(rows(page, 1).nth(1)).toBeVisible();
  for (const [master, slave] of [
    ['Shared_with_user2', 'Shared_from_user1'],
    ['Shared_with_user1', 'Shared_from_user2'],
  ]) {
    const row = rows(page, 1).filter({ hasText: master }).first();
    await expect(row).toContainText(slave);
    await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();
  }
});
