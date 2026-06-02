import { test, expect } from '../fixtures/index';
import type { Page } from '@playwright/test';

const simulateTabSwitch = async (page: Page) => {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

test.describe('diagnóstico de parpadeos al cambiar de pestaña', () => {

  test('baseline: requests a Supabase en la carga inicial', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/rest/v1/')) requests.push(req.url());
    });

    await page.goto('/');
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(2_000);

    const tables = requests.map(url => url.match(/\/rest\/v1\/(\w+)/)?.[1] ?? url);
    console.log(`\n[baseline] ${requests.length} requests a Supabase:`, tables);

    // Se esperan exactamente 4 tablas en la primera carga
    const unique = [...new Set(tables)];
    expect(unique).toEqual(expect.arrayContaining(['accounts', 'transactions', 'budgets', 'debts']));
    expect(requests.length).toBe(4);
  });

  test('volver a la pestaña dispara requests adicionales a Supabase', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/rest/v1/')) requests.push(req.url());
    });

    await page.goto('/');
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(2_000);

    // Reset: solo medir lo que ocurre DESPUÉS del regreso
    requests.length = 0;

    await simulateTabSwitch(page);
    await page.waitForTimeout(3_000);

    const tables = requests.map(url => url.match(/\/rest\/v1\/(\w+)/)?.[1] ?? url);
    console.log(`\n[tab-switch] ${requests.length} requests extra:`, tables);

    // BUG esperado: si esto falla con 0, el bug ya está resuelto
    // Si pasa con > 0, confirma el re-fetch innecesario
    if (requests.length > 0) {
      console.warn('  ⚠ Se confirma el bug: onAuthStateChange re-dispara fetchs');
    } else {
      console.log('  ✓ Sin requests extra — bug resuelto o no reproducible en E2E');
    }
  });

  test('el spinner no reaparece al volver a la pestaña', async ({ page }) => {
    await page.goto('/');
    const fab = page.locator('.fa-fab');
    await fab.waitFor({ timeout: 20_000 });

    await simulateTabSwitch(page);

    // El FAB no debe desaparecer en los 4 s siguientes
    await expect(fab).toBeVisible({ timeout: 4_000 });

    // Verificar que sigue visible después de esperar
    await page.waitForTimeout(3_000);
    await expect(fab).toBeVisible();
  });

  test('onAuthStateChange al volver no causa re-fetch de datos', async ({ page }) => {
    await page.goto('/');
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });

    // Escuchar SOLO desde que el dashboard está visible
    const postLoadRequests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/rest/v1/')) postLoadRequests.push(req.url());
    });

    await simulateTabSwitch(page);
    await page.waitForTimeout(5_000); // Suficiente para que Supabase refresque token

    const tables = postLoadRequests.map(url => url.match(/\/rest\/v1\/(\w+)/)?.[1] ?? url);
    console.log(`\n[post-load] ${postLoadRequests.length} requests tras visibilitychange:`, tables);

    // Este assert FALLA si el bug está presente (confirma la causa raíz)
    expect(postLoadRequests.length, 'Requests a Supabase después de cambio de pestaña').toBe(0);
  });

  test('la API de FX (dolarapi) solo se llama en el mount inicial', async ({ page }) => {
    const fxRequests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('dolarapi.com')) fxRequests.push(req.url());
    });

    await page.goto('/');
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });

    await simulateTabSwitch(page);
    await page.waitForTimeout(3_000);

    console.log(`\n[fx] ${fxRequests.length} calls a dolarapi.com`);

    // Debe llamarse solo 1 vez (al montar), no al volver a la pestaña
    expect(fxRequests.length).toBeLessThanOrEqual(1);
  });

  test('el total en ARS no cambia al volver a la pestaña', async ({ page }) => {
    await page.goto('/');
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });
    // Esperar a que useLiveFx resuelva antes de tomar el baseline
    await page.waitForTimeout(3_000);

    const totalBefore = await page.locator('.fa-total-amount').textContent();
    console.log(`\n[total] antes: "${totalBefore}"`);

    await simulateTabSwitch(page);
    await page.waitForTimeout(3_000);

    const totalAfter = await page.locator('.fa-total-amount').textContent();
    console.log(`[total] después: "${totalAfter}"`);

    expect(totalAfter).toBe(totalBefore);
  });

  test('cuantifica mutaciones del DOM al volver a la pestaña (MutationObserver)', async ({ page }) => {
    await page.goto('/');
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });

    // Inyectar MutationObserver y contar mutaciones durante el tab switch
    const mutationCount = await page.evaluate(async () => {
      return new Promise<number>(resolve => {
        let count = 0;
        const observer = new MutationObserver(muts => { count += muts.length; });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        // Simular visibilitychange desde dentro del contexto del browser
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        setTimeout(() => {
          Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
          document.dispatchEvent(new Event('visibilitychange'));
        }, 300);

        setTimeout(() => {
          observer.disconnect();
          resolve(count);
        }, 3_500);
      });
    });

    console.log(`\n[mutations] ${mutationCount} mutaciones del DOM tras visibilitychange`);
    // Sin umbral estricto — valor diagnóstico puro
    // Un re-render completo produce cientos de mutaciones; sin bug deberían ser ~0
  });

  test('mide el tiempo de recarga al volver a la pestaña', async ({ page }) => {
    await page.goto('/');
    const fab = page.locator('.fa-fab');
    await fab.waitFor({ timeout: 20_000 });

    const t0 = Date.now();
    await simulateTabSwitch(page);

    // Si el FAB desaparece (spinner aparece), esperamos que vuelva
    // Si no desaparece, el tiempo es 0 (comportamiento correcto)
    let disappeared = false;
    try {
      await fab.waitFor({ state: 'hidden', timeout: 2_000 });
      disappeared = true;
    } catch {
      // FAB nunca desapareció — sin parpadeo
    }

    if (disappeared) {
      await fab.waitFor({ state: 'visible', timeout: 15_000 });
      const elapsed = Date.now() - t0;
      console.log(`\n[timing] FAB desapareció y tardó ${elapsed}ms en volver (PARPADEO CONFIRMADO)`);
    } else {
      console.log(`\n[timing] FAB nunca desapareció — sin parpadeo visible`);
    }

    // El FAB debe estar visible al terminar el test
    await expect(fab).toBeVisible();
  });

});
