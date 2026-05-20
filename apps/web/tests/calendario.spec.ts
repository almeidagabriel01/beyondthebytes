import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Calendário golden path ────────────────────────────────────────────────────

test.describe('Calendário golden path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendario');
  });

  test('month grid loads with weekday headers', async ({ page }) => {
    // Month label (e.g. "Maio 2026") should appear
    await expect(page.locator('h2').first()).toBeVisible();

    // All 7 weekday headers should be visible
    for (const header of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']) {
      await expect(page.getByText(header, { exact: true })).toBeVisible();
    }
  });

  test('clicking a day cell reveals DayPanel with "Novo agendamento" button', async ({ page }) => {
    // Click today's cell in the month grid (role=button, aria-label includes today's date)
    const today = new Date();
    const todayLabel = today.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const dayCell = page.getByRole('button', { name: todayLabel });
    await dayCell.click();

    // DayPanel is always visible on the right; "Novo agendamento" button should be present
    await expect(page.getByRole('button', { name: /novo agendamento/i })).toBeVisible();
  });

  test('clicking "Novo agendamento" in DayPanel opens NewAppointmentModal', async ({ page }) => {
    await page.getByRole('button', { name: /novo agendamento/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Novo Agendamento')).toBeVisible();
  });

  test('pressing Escape closes NewAppointmentModal', async ({ page }) => {
    await page.getByRole('button', { name: /novo agendamento/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('"Semana" view toggle is disabled (not clickable)', async ({ page }) => {
    // "Semana" is rendered as a <span> with cursor-not-allowed — not a button
    const semanaToggle = page
      .locator('span', { hasText: 'Semana' })
      .filter({ has: page.locator('[class*="cursor-not-allowed"]') })
      .or(page.locator('[class*="cursor-not-allowed"]', { hasText: 'Semana' }));
    await expect(semanaToggle).toBeVisible();
    // It must not be a button (not interactive)
    await expect(page.getByRole('button', { name: 'Semana' })).toHaveCount(0);
  });
});

// ── Agenda Diária ─────────────────────────────────────────────────────────────

test.describe('Agenda Diária', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agenda');
  });

  test('shows 3 period sections: Manhã, Tarde, Noite', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Manhã' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tarde' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Noite' })).toBeVisible();
  });

  test('clicking next day button advances the date', async ({ page }) => {
    // Capture the current date header text
    const header = page.locator('h2').filter({ hasText: /,/ }).first();
    const before = await header.textContent();

    await page.getByRole('button', { name: 'Próximo dia' }).click();

    const after = await header.textContent();
    expect(after).not.toBe(before);
  });

  test('"Hoje" button returns to today after advancing', async ({ page }) => {
    const today = new Date();
    const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
    const todayLabelCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

    // Advance one day
    await page.getByRole('button', { name: 'Próximo dia' }).click();

    // Return to today
    await page.getByRole('button', { name: 'Hoje' }).click();

    const header = page.locator('h2').filter({ hasText: /,/ }).first();
    await expect(header).toHaveText(todayLabelCapitalized);
  });

  test('"Novo agendamento" button opens NewAppointmentModal', async ({ page }) => {
    await page.getByRole('button', { name: /novo agendamento/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Novo Agendamento')).toBeVisible();
  });
});
