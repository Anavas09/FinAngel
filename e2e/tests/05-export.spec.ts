import { test, expect } from '../fixtures/index';
import { fillTransactionForm, submitTransactionForm } from '../helpers/modals';
import fs from 'fs';

test('abre modal desde botón Exportar del TopBar', async ({ withSeed: app }) => {
  await app.page.getByRole('banner').getByRole('button', { name: 'Exportar' }).click();

  const modal = app.page.locator('.fa-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Resumen para exportar' })).toBeVisible();
});

test('abre modal desde "Exportar resumen" en la sección de movimientos', async ({ withSeed: app }) => {
  await app.page.getByRole('button', { name: 'Exportar resumen ↗' }).click();

  await expect(app.page.locator('.fa-modal')).toBeVisible();
  await expect(app.page.locator('.fa-modal').getByRole('heading', { name: 'Resumen para exportar' })).toBeVisible();
});

test('muestra los tres bloques de estadísticas', async ({ withSeed: app }) => {
  await app.openExport();
  const modal = app.page.locator('.fa-modal');

  await expect(modal.locator('.fa-export-stat').filter({ hasText: 'Patrimonio' })).toBeVisible();
  await expect(modal.locator('.fa-export-stat').filter({ hasText: 'Ingresos' })).toBeVisible();
  await expect(modal.locator('.fa-export-stat').filter({ hasText: 'Egresos' })).toBeVisible();
});

test('tabla de movimientos lista las transacciones semilla', async ({ withSeed: app }) => {
  await app.openExport();
  const rows = app.page.locator('.fa-export-table tbody tr');
  // Espera que al menos una fila aparezca (modal es lazy)
  await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  // Cabeceras correctas
  const headers = app.page.locator('.fa-export-table thead th');
  await expect(headers.filter({ hasText: 'Fecha' })).toBeVisible();
  await expect(headers.filter({ hasText: 'Cuenta' })).toBeVisible();
  await expect(headers.filter({ hasText: 'Nota' })).toBeVisible();
  await expect(headers.filter({ hasText: 'Monto' })).toBeVisible();
});

test('descarga CSV con nombre correcto', async ({ withSeed: app }) => {
  await app.openExport();

  const [download] = await Promise.all([
    app.page.waitForEvent('download'),
    app.page.locator('.fa-modal').getByRole('button', { name: '↓ CSV' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^finangel-resumen-\d{4}-\d{2}-\d{2}\.csv$/);
});

test('CSV contiene cabeceras correctas', async ({ withSeed: app }) => {
  await app.openExport();

  const [download] = await Promise.all([
    app.page.waitForEvent('download'),
    app.page.locator('.fa-modal').getByRole('button', { name: '↓ CSV' }).click(),
  ]);

  const path = await download.path();
  const content = fs.readFileSync(path!, 'utf-8').replace(/^﻿/, ''); // strip BOM
  const firstLine = content.split('\n')[0];

  expect(firstLine).toContain('Fecha');
  expect(firstLine).toContain('Cuenta');
  expect(firstLine).toContain('Nota');
  expect(firstLine).toContain('Monto');
});

test('CSV sanitiza fórmulas (inyección CSV)', async ({ withSeed: app }) => {
  // Agrega una transacción con nota que empieza por "="
  await app.openAddTransaction();
  await fillTransactionForm(app.page, {
    amount: '1',
    note: '=SUM(1+1)',
  });
  await submitTransactionForm(app.page);

  await app.openExport();

  const [download] = await Promise.all([
    app.page.waitForEvent('download'),
    app.page.locator('.fa-modal').getByRole('button', { name: '↓ CSV' }).click(),
  ]);

  const path = await download.path();
  const content = fs.readFileSync(path!, 'utf-8');

  // La fórmula debe estar prefijada con ' para neutralizarla
  expect(content).toContain("'=SUM(1+1)");
  expect(content).not.toMatch(/"=SUM\(1\+1\)"/); // sin el prefijo sería inyectable
});

test('botón PDF llama a window.print y usa nombre con fecha', async ({ withSeed: app }) => {
  await app.openExport();

  await app.page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__printCalled = false;
    (window as unknown as Record<string, unknown>).__printTitle = '';
    window.print = () => {
      (window as unknown as Record<string, unknown>).__printCalled = true;
      (window as unknown as Record<string, unknown>).__printTitle = document.title;
    };
  });

  await app.page.locator('.fa-modal').getByRole('button', { name: /PDF/i }).click();

  const called = await app.page.evaluate(
    () => (window as unknown as Record<string, unknown>).__printCalled
  );
  expect(called).toBe(true);

  const title = await app.page.evaluate(
    () => (window as unknown as Record<string, unknown>).__printTitle as string
  );
  expect(title).toMatch(/^FinAngel — Resumen \d{4}-\d{2}-\d{2}$/);
});

test('PDF exportado tiene 1 sola página', async ({ withSeed: app }) => {
  await app.openExport();

  // page.pdf() aplica @media print y genera el PDF real
  const pdf = await app.page.pdf({ format: 'A4' });

  // En PDFs de Chrome, el objeto /Pages contiene /Count N con el total de páginas
  const text = pdf.toString('latin1');
  const match = text.match(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/);
  const pageCount = match ? parseInt(match[1]) : -1;

  expect(pageCount).toBe(1);
});
