import { test, expect } from '@playwright/test';

const VALID_CPF = '529.982.247-25';
const VALID_PHONE = '(11) 91234-5678';

test.describe('Pacientes CRUD', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clean up any leftover test patient with this CPF via API
    const apiUrl = process.env['PLAYWRIGHT_API_URL'] ?? 'http://localhost:3001';
    const list = await request.get(`${apiUrl}/patients?search=Playwright`);
    if (list.ok()) {
      const body = (await list.json()) as { items: { id: string; fullName: string }[] };
      for (const p of body.items) {
        if (p.fullName.includes('Playwright')) {
          await request.delete(`${apiUrl}/patients/${p.id}`);
        }
      }
    }
    await page.goto('/pacientes');
  });

  test('shows the patients page with "Novo Paciente" button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
    await expect(page.getByRole('button', { name: /novo paciente/i })).toBeVisible();
  });

  test('opens the create modal when clicking "Novo Paciente"', async ({ page }) => {
    await page.getByRole('button', { name: /novo paciente/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Novo Paciente')).toBeVisible();
  });

  test('closes the modal on Escape key', async ({ page }) => {
    await page.getByRole('button', { name: /novo paciente/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('shows validation errors on empty form submit', async ({ page }) => {
    await page.getByRole('button', { name: /novo paciente/i }).click();
    await page.getByRole('button', { name: /criar paciente/i }).click();
    await expect(page.getByText(/nome deve ter ao menos/i)).toBeVisible();
  });

  test('creates a patient and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: /novo paciente/i }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByLabel(/nome completo/i).fill('Playwright Teste');
    await dialog.getByLabel(/cpf/i).fill(VALID_CPF);
    await dialog.getByLabel(/telefone/i).fill(VALID_PHONE);
    await dialog.getByLabel(/data de nascimento/i).fill('1990-05-15');

    await dialog.getByRole('button', { name: /criar paciente/i }).click();

    // Modal closes and list shows the new patient
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Playwright Teste')).toBeVisible();
  });

  test('edits a patient from the list', async ({ page }) => {
    // Create first
    await page.getByRole('button', { name: /novo paciente/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nome completo/i).fill('Playwright Teste');
    await dialog.getByLabel(/cpf/i).fill(VALID_CPF);
    await dialog.getByLabel(/telefone/i).fill(VALID_PHONE);
    await dialog.getByLabel(/data de nascimento/i).fill('1990-05-15');
    await dialog.getByRole('button', { name: /criar paciente/i }).click();
    await expect(dialog).not.toBeVisible();

    // Hover over the row to reveal edit button
    const row = page.locator('[class*="group"]').filter({ hasText: 'Playwright Teste' });
    await row.hover();
    await row.getByLabel(/editar/i).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByText('Editar Paciente')).toBeVisible();
    await editDialog.getByLabel(/nome completo/i).fill('Playwright Editado');
    await editDialog.getByRole('button', { name: /salvar/i }).click();

    await expect(editDialog).not.toBeVisible();
    await expect(page.getByText('Playwright Editado')).toBeVisible();
  });

  test('deletes a patient from the list', async ({ page }) => {
    // Create first
    await page.getByRole('button', { name: /novo paciente/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nome completo/i).fill('Playwright Teste');
    await dialog.getByLabel(/cpf/i).fill(VALID_CPF);
    await dialog.getByLabel(/telefone/i).fill(VALID_PHONE);
    await dialog.getByLabel(/data de nascimento/i).fill('1990-05-15');
    await dialog.getByRole('button', { name: /criar paciente/i }).click();
    await expect(dialog).not.toBeVisible();

    // Delete
    const row = page.locator('[class*="group"]').filter({ hasText: 'Playwright Teste' });
    await row.hover();
    await row.getByLabel(/excluir/i).click();

    const confirmDialog = page.getByRole('dialog');
    await confirmDialog.getByRole('button', { name: /^excluir$/i }).click();

    await expect(confirmDialog).not.toBeVisible();
    await expect(page.getByText('Playwright Teste')).not.toBeVisible();
  });

  test('navigates to patient detail page on name click', async ({ page }) => {
    // Create first
    await page.getByRole('button', { name: /novo paciente/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nome completo/i).fill('Playwright Teste');
    await dialog.getByLabel(/cpf/i).fill(VALID_CPF);
    await dialog.getByLabel(/telefone/i).fill(VALID_PHONE);
    await dialog.getByLabel(/data de nascimento/i).fill('1990-05-15');
    await dialog.getByRole('button', { name: /criar paciente/i }).click();
    await expect(dialog).not.toBeVisible();

    // Click patient name link to open detail
    await page.getByText('Playwright Teste').click();
    await expect(page).toHaveURL(/\/pacientes\/.+/);
    await expect(page.getByRole('heading', { name: 'Playwright Teste' })).toBeVisible();
  });

  test('debounced search filters patients', async ({ page }) => {
    // Create a patient first
    await page.getByRole('button', { name: /novo paciente/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nome completo/i).fill('Playwright Teste');
    await dialog.getByLabel(/cpf/i).fill(VALID_CPF);
    await dialog.getByLabel(/telefone/i).fill(VALID_PHONE);
    await dialog.getByLabel(/data de nascimento/i).fill('1990-05-15');
    await dialog.getByRole('button', { name: /criar paciente/i }).click();
    await expect(dialog).not.toBeVisible();

    // Search for patient
    await page.getByPlaceholder(/buscar por nome/i).fill('Playwright');
    await expect(page.getByText('Playwright Teste')).toBeVisible();

    // Search for something that doesn't exist
    await page.getByPlaceholder(/buscar por nome/i).fill('XYZ_NAO_EXISTE_ABC');
    await expect(page.getByText(/nenhum paciente encontrado/i)).toBeVisible();
  });
});
