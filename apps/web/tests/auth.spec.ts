import { test, expect } from '@playwright/test';

test.describe('unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('protected route /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /bem-vindo/i })).toBeVisible();
  });
});

test('authenticated user can access /dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).not.toHaveURL(/\/login/);
});

test('sidebar shows logged-in user email', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('admin@medschedule.local')).toBeVisible();
});

test('logout clears session and redirects to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('login form shows validation errors on empty submit', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByText(/email inválido/i)).toBeVisible();
});
