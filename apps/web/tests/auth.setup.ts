import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '../playwright/.auth/admin.json');

setup('authenticate as admin', async ({ request }) => {
  const apiUrl = process.env['PLAYWRIGHT_API_URL'] ?? 'http://localhost:3001';

  const response = await request.post(`${apiUrl}/auth/login`, {
    data: {
      email: process.env['TEST_ADMIN_EMAIL'] ?? 'admin@medschedule.local',
      password: process.env['TEST_ADMIN_PASSWORD'] ?? 'Admin@12345',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('user');
  expect(body.user).toHaveProperty('email');

  await request.storageState({ path: authFile });
});
