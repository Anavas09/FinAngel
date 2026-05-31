import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(process.cwd(), 'e2e/.auth/user.json');
// Buffer de 10 minutos antes de que expire el token
const EXPIRY_BUFFER_S = 10 * 60;

function isStorageStateValid(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    for (const origin of (data.origins ?? [])) {
      for (const item of (origin.localStorage ?? [])) {
        if (typeof item.name === 'string' && item.name.includes('auth-token')) {
          const session = JSON.parse(item.value);
          const expiresAt: number = session.expires_at ?? 0;
          return expiresAt > Date.now() / 1000 + EXPIRY_BUFFER_S;
        }
      }
    }
  } catch { /* file corrupt, regenerate */ }
  return false;
}

export default async function globalSetup() {
  if (isStorageStateValid()) {
    console.log('[auth.setup] storageState válido — reutilizando.');
    return;
  }

  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('Faltan TEST_EMAIL o TEST_PASSWORD en .env.test');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');

  // Espera la pantalla de login
  await page.getByPlaceholder('vos@ejemplo.com').waitFor({ timeout: 15_000 });
  await page.getByPlaceholder('vos@ejemplo.com').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Espera a que la app cargue (FAB visible)
  try {
    await page.locator('.fa-fab').waitFor({ timeout: 20_000 });
  } catch {
    await page.screenshot({ path: 'e2e/.auth/debug-login.png', fullPage: true });
    const body = await page.locator('body').innerText();
    throw new Error(`FAB no apareció. Contenido de pantalla:\n${body.slice(0, 500)}`);
  }

  // Guardar storageState
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
  console.log('[auth.setup] storageState guardado en', AUTH_FILE);

  await browser.close();
}
