import { expect, Page } from '@playwright/test';

export const USERS = {
  user1: { username: 'user1', password: 'pass' },
  user2: { username: 'user2', password: 'pass' },
};

export async function login(page: Page, username: string, password: string) {
  await page.goto('/');
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/transactions/);
}

export async function loginAndGoto(page: Page, path: string, user = USERS.user1) {
  await login(page, user.username, user.password);
  await page.goto(path);
}

export async function expectNavbar(page: Page, username = USERS.user1.username) {
  const links = page.locator('.navbar-nav .nav-link');
  await expect(page.locator('.navbar-brand')).toContainText('Expense tracker');
  await expect(links.nth(0)).toContainText('Transactions');
  await expect(links.nth(1)).toContainText('Accounts');
  await expect(links.nth(2)).toContainText('Expenses');
  await expect(links.nth(3)).toContainText('Graphs');
  await expect(links.nth(4)).toContainText('Misc');
  await expect(links.nth(5)).toContainText(`Logged in as ${username}`);
}

export function headers(page: Page, table = 0) {
  return page.locator('.ReactVirtualized__Table').nth(table).locator('.ReactVirtualized__Table__headerColumn');
}

/** Data rows of a virtualized table (the last, empty filler row is skipped by requiring text). */
export function rows(page: Page, table = 0) {
  return page
    .locator('.ReactVirtualized__Table')
    .nth(table)
    .locator('.ReactVirtualized__Table__row')
    .filter({ hasText: /\S/ });
}
