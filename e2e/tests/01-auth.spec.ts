import { test, expect } from '@playwright/test';

// Este spec NO usa storageState — testea el flujo de auth desde cero
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = process.env.TEST_EMAIL!;
const PASSWORD = process.env.TEST_PASSWORD!;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Espera la pantalla de login
  await expect(page.getByPlaceholder('vos@ejemplo.com')).toBeVisible();
});

test('muestra la pantalla de login al inicio', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'FinAngel' })).toBeVisible();
  await expect(page.getByPlaceholder('vos@ejemplo.com')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
});

test('muestra error con contraseña incorrecta', async ({ page }) => {
  await page.getByPlaceholder('vos@ejemplo.com').fill(EMAIL);
  await page.locator('input[type="password"]').fill('wrong_password_123');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  await expect(page.locator('p').filter({ hasText: /error|invalid|contraseña|credenciales/i }))
    .toBeVisible({ timeout: 10_000 });
});

test('alterna entre login y registro', async ({ page }) => {
  // Modo login inicial
  await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  await expect(page.locator('input[placeholder="Tu nombre"]')).not.toBeVisible();

  // Cambia a registro
  await page.getByRole('button', { name: /registrate/i }).click();
  await expect(page.locator('input[placeholder="Tu nombre"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /registrarse/i })).toBeVisible();

  // Vuelve a login
  await page.getByRole('button', { name: /iniciá sesión/i }).click();
  await expect(page.locator('input[placeholder="Tu nombre"]')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
});

test('login exitoso con credenciales válidas', async ({ page }) => {
  await page.getByPlaceholder('vos@ejemplo.com').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // La app carga: FAB visible
  await expect(page.locator('.fa-fab')).toBeVisible({ timeout: 20_000 });
  // AuthScreen ya no está
  await expect(page.getByPlaceholder('vos@ejemplo.com')).not.toBeVisible();
});

test('cierra sesión', async ({ page }) => {
  // Login
  await page.getByPlaceholder('vos@ejemplo.com').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page.locator('.fa-fab')).toBeVisible({ timeout: 20_000 });

  // Abre settings y cierra sesión
  await page.getByRole('button', { name: 'Configuración' }).click();
  await page.getByRole('button', { name: /cerrar sesión/i }).click();

  // Vuelve al login
  await expect(page.getByPlaceholder('vos@ejemplo.com')).toBeVisible({ timeout: 10_000 });
});
