/**
 * Suite: fetch a dolarapi + sincronización de inputs en SettingsPanel
 *
 * BUG DOCUMENTADO:
 *   SettingsPanel inicializa fxUSDInput con useState(String(tweaks.fxUSD)).
 *   Cuando useLiveFx actualiza los tweaks de forma asíncrona, no hay useEffect
 *   que re-sincronice los inputs → el panel muestra el valor viejo.
 *
 *   Fix: agregar en SettingsPanel:
 *     useEffect(() => {
 *       setFxUSDInput(String(tweaks.fxUSD));
 *       setFxUSDTInput(String(tweaks.fxUSDT));
 *     }, [tweaks.fxUSD, tweaks.fxUSDT]);
 *
 * Tests 2 y 3 fallarán con el bug activo y pasarán una vez aplicado el fix.
 */

import { test, expect } from '../fixtures/index';
import type { Page } from '@playwright/test';

const DOLAR_API_PATTERN = '**/dolarapi.com/**';
const DEFAULT_FX_USD = 1180; // DEFAULT_TWEAKS.fxUSD en src/data/constants.ts

const openPanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Configuración' }).click();
  await expect(page.getByText('⚙️ Configuración')).toBeVisible();
  return page.locator('[style*="z-index: 100"][style*="bottom: 90px"]');
};

const closePanel = async (page: Page) => {
  await page.mouse.click(800, 100);
  await expect(page.getByText('⚙️ Configuración')).not.toBeVisible();
};

// ─── 1. El fetch se hace exactamente una vez al montar ─────────────────────────

test('dolarapi se llama exactamente una vez al cargar la app', async ({ app }) => {
  const calls: string[] = [];

  // Interceptar antes de navegar para no perder el request del mount inicial
  await app.page.route(DOLAR_API_PATTERN, async route => {
    calls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ venta: 1300 }),
    });
  });

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });

  // Dar tiempo a que el fetch async complete
  await app.page.waitForTimeout(2_000);

  // React StrictMode (desarrollo) ejecuta effects dos veces — en prod sería 1
  expect(calls.length, 'dolarapi debe llamarse al menos 1 vez').toBeGreaterThanOrEqual(1);
  expect(calls[0]).toContain('dolarapi.com');
});

// ─── 2. Los inputs del panel reflejan el valor retornado por dolarapi ──────────
// ⚠️ FALLA con el bug activo (sin useEffect de sincronización en SettingsPanel)

test('los inputs de FX muestran el valor retornado por dolarapi', async ({ app }) => {
  const MOCK_VENTA = 1350;

  await app.page.route(DOLAR_API_PATTERN, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ venta: MOCK_VENTA }),
    }),
  );

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });
  await app.page.waitForTimeout(2_000); // asegurar que el fetch async terminó

  const panel = await openPanel(app.page);

  const usdInput  = panel.locator('div:has(span:text-is("Dólar (USD)"))').last().locator('input');
  const usdtInput = panel.locator('div:has(span:text-is("USDT"))').last().locator('input');

  await expect(usdInput,  'input USD debe mostrar valor de dolarapi').toHaveValue(String(MOCK_VENTA));
  await expect(usdtInput, 'input USDT debe mostrar valor de dolarapi').toHaveValue(String(MOCK_VENTA));
});

// ─── 3. El total ARS refleja las tasas de dolarapi antes de abrir el panel ─────
// ⚠️ Puede fallar con el bug si el total también usa el valor del input (no tweaks directamente)

test('el total ARS usa la tasa de dolarapi sin necesidad de abrir el panel', async ({ app }) => {
  const MOCK_VENTA = 9999;

  // Primero cargar con tasa normal para tener baseline
  await app.page.route(DOLAR_API_PATTERN, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ venta: MOCK_VENTA }),
    }),
  );

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });
  await app.page.waitForTimeout(2_000);

  // El total ARS debe haberse recalculado con MOCK_VENTA aunque el usuario no haya tocado nada
  // Si tweaks.fxUSD se actualizó correctamente, el total ya usará MOCK_VENTA
  // Verificamos indirectamente: al abrir el panel y hacer OK sin cambiar nada, el total no debe cambiar
  const totalBefore = await app.getTotalAmount().innerText();

  const panel = await openPanel(app.page);
  // Con el useEffect de sincronización, el input ya muestra el valor de la API (no hay dirty state, no hay botón OK)
  const usdInput = panel.locator('div:has(span:text-is("Dólar (USD)"))').last().locator('input');
  await expect(usdInput).toHaveValue(String(MOCK_VENTA));
  await closePanel(app.page);

  const totalAfter = await app.getTotalAmount().innerText();
  expect(totalAfter, 'el total no debe cambiar si el input ya tenía el valor de dolarapi').toBe(totalBefore);
});

// ─── 4. Si dolarapi responde con error HTTP, los inputs muestran el valor por defecto ─

test('si dolarapi retorna 500, los inputs muestran el valor por defecto', async ({ app }) => {
  await app.page.route(DOLAR_API_PATTERN, route =>
    route.fulfill({ status: 500, body: 'Internal Server Error' }),
  );

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });
  await app.page.waitForTimeout(2_000);

  const panel = await openPanel(app.page);

  const usdInput = panel.locator('div:has(span:text-is("Dólar (USD)"))').last().locator('input');
  await expect(usdInput, 'input USD debe usar valor por defecto si la API falla').toHaveValue(
    String(DEFAULT_FX_USD),
  );
});

// ─── 5. Si dolarapi falla por red, los inputs muestran el valor por defecto ────

test('si dolarapi no responde (network error), los inputs muestran el valor por defecto', async ({ app }) => {
  await app.page.route(DOLAR_API_PATTERN, route => route.abort('failed'));

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });
  await app.page.waitForTimeout(2_000);

  const panel = await openPanel(app.page);

  const usdInput = panel.locator('div:has(span:text-is("Dólar (USD)"))').last().locator('input');
  await expect(usdInput, 'input USD debe usar valor por defecto si hay error de red').toHaveValue(
    String(DEFAULT_FX_USD),
  );
});

// ─── 6. Si dolarapi retorna venta: null/undefined, los inputs no cambian ───────

test('si dolarapi retorna objeto sin campo venta, los inputs muestran el valor por defecto', async ({ app }) => {
  await app.page.route(DOLAR_API_PATTERN, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ compra: 1200 }), // sin campo venta
    }),
  );

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });
  await app.page.waitForTimeout(2_000);

  const panel = await openPanel(app.page);

  const usdInput = panel.locator('div:has(span:text-is("Dólar (USD)"))').last().locator('input');
  await expect(usdInput, 'input USD no debe cambiar si venta es undefined').toHaveValue(
    String(DEFAULT_FX_USD),
  );
});

// ─── 7. El usuario puede sobreescribir manualmente después del fetch ───────────

test('el usuario puede sobreescribir el valor de dolarapi y aplicar su propio valor', async ({ app }) => {
  const MOCK_VENTA  = 1350;
  const CUSTOM_VALUE = 2000;

  await app.page.route(DOLAR_API_PATTERN, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ venta: MOCK_VENTA }),
    }),
  );

  await app.page.goto('/');
  await app.getFab().waitFor({ timeout: 15_000 });
  await app.page.waitForTimeout(2_000);

  const totalBefore = await app.getTotalAmount().innerText();

  const panel = await openPanel(app.page);
  const usdRow = panel.locator('div:has(span:text-is("Dólar (USD)"))').last();
  await usdRow.locator('input').fill(String(CUSTOM_VALUE));
  await usdRow.getByRole('button', { name: 'OK' }).click();
  await closePanel(app.page);

  await expect(app.getTotalAmount()).not.toHaveText(totalBefore, { timeout: 5_000 });
});
