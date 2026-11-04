import { expect, test } from '@playwright/test';

import { login, USERS } from './helpers';

test('frontend loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Expense Tracker');
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

for (const user of Object.values(USERS)) {
  test(`${user.username} can log in`, async ({ page }) => {
    await login(page, user.username, user.password);
  });
}

test('wrong password', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[name="username"]').fill(USERS.user1.username);
  await page.locator('input[name="password"]').fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('seeded users can get an API token', async ({ request }) => {
  for (const user of Object.values(USERS)) {
    const response = await request.post('/api/api-token-auth/', { data: user });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).token).toBeTruthy();
  }
});
