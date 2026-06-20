import { test as authTest, expect } from '@playwright/test';
import { test, expect as fixtureExpect } from '../fixtures/index';

// ─── FAB ───────────────────────────────────────────────────────────────────

test('FAB muestra ícono SVG en lugar de texto +', async ({ withSeed: app }) => {
  const fab = app.page.locator('.fa-fab');
  await expect(fab).toBeVisible();

  // El contenedor del plus debe contener un SVG
  const svg = fab.locator('.fa-fab-plus svg');
  await expect(svg).toBeVisible();

  // No debe haber texto "+" suelto en el botón
  const plusText = fab.locator('.fa-fab-plus').innerText();
  expect(await plusText).not.toBe('+');
});

// ─── Login spinner ─────────────────────────────────────────────────────────

authTest.use({ storageState: { cookies: [], origins: [] } });

authTest('botón de login muestra puntitos mientras carga', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('vos@ejemplo.com')).toBeVisible();

  // Intercepta la llamada a Supabase auth para simular latencia
  await page.route('**/auth/v1/**', async route => {
    await new Promise(r => setTimeout(r, 1500));
    await route.continue();
  });

  await page.getByPlaceholder('vos@ejemplo.com').fill('test@test.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Los puntitos deben aparecer dentro del botón durante la carga
  await expect(page.locator('.fa-btn-primary .fa-dots')).toBeVisible({ timeout: 2_000 });

  // El texto cambia a "Entrando…"
  await expect(page.locator('.fa-btn-primary span', { hasText: 'Entrando…' })).toBeVisible();

  // El botón queda deshabilitado mientras carga
  await expect(page.getByRole('button', { name: /entrando/i })).toBeDisabled();
});

// ─── Sign-out overlay ──────────────────────────────────────────────────────

authTest('overlay de cierre de sesión muestra puntitos', async ({ page }) => {
  const EMAIL = process.env.TEST_EMAIL!;
  const PASSWORD = process.env.TEST_PASSWORD!;

  await page.goto('/');
  await expect(page.getByPlaceholder('vos@ejemplo.com')).toBeVisible();

  // Login
  await page.getByPlaceholder('vos@ejemplo.com').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page.locator('.fa-fab')).toBeVisible({ timeout: 20_000 });

  // Intercepta sign-out para que el overlay sea visible el tiempo suficiente
  await page.route('**/auth/v1/logout**', async route => {
    await new Promise(r => setTimeout(r, 1200));
    await route.continue();
  });

  // Abre settings y cierra sesión
  await page.getByRole('button', { name: 'Configuración' }).click();
  await page.getByRole('button', { name: /cerrar sesión/i }).click();

  // Overlay aparece con chip + puntitos + texto
  const overlay = page.locator('.fa-signout');
  await expect(overlay).toBeVisible({ timeout: 3_000 });
  await expect(overlay.locator('.fa-dots')).toBeVisible();
  await expect(overlay.locator('.fa-signout-chip', { hasText: 'Cerrando sesión…' })).toBeVisible();

  // Tras completar el logout, vuelve al login
  await expect(page.getByPlaceholder('vos@ejemplo.com')).toBeVisible({ timeout: 10_000 });
});
