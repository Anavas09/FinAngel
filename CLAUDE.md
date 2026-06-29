# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Import style

Three groups separated by a blank line:

```ts
// Group 1 — external packages (react, npm packages like @supabase/*, @dnd-kit/*)
import { useState } from 'react';

// Group 2 — internal (relative paths: ./components/..., ../lib/..., ../../data/..., etc.)
import { fmtMoney } from '../../data/utils';

// Group 3 — all `import type` (regardless of source: external or internal)
import type { Account } from '../../types';
```

- Omit a group entirely if the file has no imports for it (no extra blank lines).
- No automatic tooling enforces this — apply manually when adding imports.

## Commands

```bash
npm run dev       # dev server (Vite HMR)
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint (typescript-eslint)
npm run preview   # serve the production build locally
npx playwright test  # run E2E test suite
```

## Architecture

Single-page app with no router. All state lives in `App.tsx` and is passed down as props — no context, no global store.

**Authentication** — Supabase email/password auth. `App.tsx` listens to `onAuthStateChange`; renders `AuthScreen` if no session, a spinner while loading. All DB operations are scoped to the authenticated user via RLS.

**State persistence** — user preferences only in localStorage via `loadState`/`saveState` (`src/data/utils.ts`):
- `finangel:tweaks` — `Tweaks` object (privacy, mascotPersonality, layout, primaryAccent, fxUSD, fxUSDT)
- `finangel:theme` — active theme key

Financial data (accounts, transactions, budgets) lives in **Supabase**, fetched and mutated through `src/lib/db/`.

**Database layer** — `src/lib/db/` exports CRUD functions grouped by domain: `accounts.ts`, `transactions.ts`, `budgets.ts`, `seed.ts`. All calls use the Supabase client from `src/lib/supabase.ts` (env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`).

**Finance hook** — `useFinanceData` (`src/hooks/useFinanceData.ts`) fetches all data on mount, auto-generates recurring transactions, and exposes derived values (`totalsByCcy`, `totalInARS`, `monthNet`, `categoryData[]`, `flowData[]`) plus CRUD handlers passed down from `App.tsx`.

**Theme system** — three CSS themes + an `auto` mode: `public/themes/{sticker,warm,night}.css` (plus `pastel.css` kept but not selectable). `useTheme` (`src/hooks/useTheme.ts`) swaps them at runtime by injecting/removing a `<link data-fa-theme>` element. Active theme persisted in localStorage. `ThemeKey = 'sticker' | 'warm' | 'night' | 'auto'`. Auto mode switches between `night` (18h–6h) and `warm` (6h–18h); stored as `'auto'` in localStorage. TopBar shows current effective theme label in auto mode.

**Tweaks** — `useTweaks` (`src/hooks/useTweaks.ts`) manages the `Tweaks` object. `layout` is applied as `fa-layout-{layout}` on the root div. `fxUSD`/`fxUSDT` override the hardcoded rates in `FX_TO_ARS` at runtime.

**Currency** — accounts hold balances in their native currency (ARS / USD / USDT). All totals and charts convert to ARS using rates from `FX_TO_ARS` (`src/data/constants.ts`), overridable via Tweaks. No live FX feed.

**Recurring transactions** — `src/lib/finance/recurring.ts` auto-generates monthly/weekly transactions on load, guarded by duplicate checks.

**Mascot** — `useMascot` (`src/hooks/useMascot.ts`) derives mood from `monthNet` vs income and returns a `MascotState` + random copy line from `MASCOT_COPY` (keyed by `MascotPersonality × MascotMood`).

**Modal state** — `useModalState` (`src/hooks/useModalState.ts`) centralizes all modal open/close flags plus toast notifications with undo support.

## Key files

| Path | Purpose |
|------|---------|
| `src/types.ts` | All TypeScript types (single source of truth) |
| `src/data/constants.ts` | Seed data, FX rates, category map, mascot copy, default tweaks |
| `src/data/utils.ts` | `fmtMoney`, `fmtDate`, `loadState`, `saveState` |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/lib/db/accounts.ts` | Account CRUD (fetch, insert, update balance/visibility, delete) |
| `src/lib/db/transactions.ts` | Transaction CRUD (fetch, insert, update, delete) |
| `src/lib/db/budgets.ts` | Budget CRUD (fetch, upsert, delete) |
| `src/lib/db/seed.ts` | `seedUserData` / `clearUserData` helpers |
| `src/lib/finance/recurring.ts` | Auto-generate recurring transactions on load |
| `src/hooks/useFinanceData.ts` | Core data hook: fetches + derived values + CRUD handlers |
| `src/hooks/useModalState.ts` | Modal open/close flags + toast with undo |
| `src/hooks/useMascot.ts` | Mascot mood + copy line derivation |
| `public/themes/*.css` | Full theme stylesheets (sticker / warm / night / pastel) |

## Components

```
src/components/
  auth/         AuthScreen          — email/password login & signup
  dashboard/    GreetingCard        — mascot + mood copy
                TotalCard           — ARS total, month net, currency breakdown; chips de presupuesto cumplido (BudgetChips co-located)
                AccountCard         — single account: balance, visibility toggle, delete
  charts/       ChartCard           — donut chart wrapper (categories or flow)
                Donut               — SVG donut renderer
  transactions/ TransactionList     — paginated list with search (nota/cuenta/categoría), period filter, kind filter (Todos/Ingresos/Gastos), edit/delete; co-located TransactionCard
                AddTransactionModal — add/edit form with recurring field
                TransferModal       — inter-account transfer (creates two linked txs)
                ExportModal         — CSV export with sanitization
  debts/        DebtList            — debt cards with quick-pay, edit, mark-paid, delete
                AddDebtModal        — create/edit debt form
                QuickPayDebtModal   — quick payment: account+amount+date; auto-updates balance & remainingAmount
  accounts/     AddAccountModal     — new account: kind, currency, color, emoji, balance
  mascot/       Mascot / MascotMini — SVG mascot, 6 mood states
  settings/     SettingsPanel       — theme, personality, layout, FX rates, budgets, sign out
                                    (maxHeight: calc(100dvh-120px) + overflowY: auto para viewport 720px)
  layout/       TopBar              — logo, theme switcher, export button
  ui/           Toggle / EyeToggle  — reusable toggle primitives
                BudgetAlert         — alerta reutilizable (critical/warning) para presupuesto vs ingresos/patrimonio
                Dots / FaDots       — spinner de puntitos animados (3 colores, tone brand/white)
```

## Testing

E2E suite with Playwright (`@playwright/test`). Run with `npx playwright test`. No unit/integration test framework is configured.

### E2E suite structure

```
playwright.config.ts            — workers: 1, fullyParallel: false, globalSetup, webServer Vite
.env.test                       — TEST_EMAIL, TEST_PASSWORD (gitignored)
e2e/
  fixtures/auth.setup.ts        — login único, guarda storageState; verifica expiración real del JWT
  fixtures/index.ts             — fixtures: app, withSeed (clearAllData + loadSeedData), withClear
  helpers/app.page.ts           — Page Object Model: accountsSection, getAccounts, getTransactionItems,
                                  loadSeedData, clearAllData, getToast, getTotalAmount, openExport, etc.
  helpers/modals.ts             — fillTransactionForm, submitTransactionForm, fillTransferForm, fillAccountForm
  tests/
    01-auth.spec.ts             — 5 tests: pantalla login, error contraseña, toggle modo, login, logout
    02-accounts.spec.ts         — 8 tests: estado vacío, crear ARS/USD, max chars, toggle visibilidad, delete
    03-transactions.spec.ts     — 13 tests: gasto, ingreso, validaciones, saldo insuficiente (error en input de monto), editar, eliminar+undo, recurrente, balance
    04-transfers.spec.ts        — 7 tests: crea 2 txs, balances, destino excluye origen, auto-switch, error monto, saldo insuficiente (error en input de monto), nota default
    05-export.spec.ts           — 8 tests: abrir desde TopBar/sección, stats, tabla, CSV descarga/cabeceras/inyección, PDF
    06-settings.spec.ts         — 11 tests: abrir/cerrar, nombre→saludo, privacidad, layout, color, FX, presupuestos, borrar todo
    07-ui-tweaks.spec.ts        — 7 tests: dropdown tema, warm/night CSS, persiste al recargar, checkmark activo, toast auto/undo
    08-search-filter.spec.ts    — 7 tests: buscar texto/vacío/limpiar, filtro período, "Todos", combinado, buscar por cuenta
    09-charts.spec.ts           — 8 tests: 2 cards, títulos, leyenda % y valores, Ingresos/Egresos, hover, SVG paths, privacidad
    10-debts.spec.ts            — 14 tests: estado vacío, crear mínima/completa, max chars, pendiente default, editar, pagar, eliminar+undo, vencida, total ARS
    11-render-stability.spec.ts — 8 tests: diagnóstico de parpadeos al cambiar de pestaña (baseline requests, spinner re-aparece, re-fetch post-carga, FX mount-only, total estable, MutationObserver, timing)
    12-fx-dolarapi.spec.ts      — 7 tests: fetch exactamente 1 vez, inputs reflejan valor de API, total ARS sin abrir panel, error HTTP/red/sin campo venta → default, sobreescritura manual
    13-quickpay-categories.spec.ts — 14 tests: QuickPayDebtModal (encabezado, fallback sin cuentas, pre-relleno con cuota mensual, pre-relleno con saldo pendiente, saldo insuficiente en input de monto, validación, registro, pago completo, balance), categorías (Luz/Agua/Gas, Monotributo, select+guardar), eliminar restaura balance, eliminar pago restaura remainingAmount de la deuda
    14-ux-dots-fab.spec.ts         — tests de FaDots spinner y comportamiento del FAB
```

**121 tests en total — ~115 pasan**. Fallos conocidos: `06-settings "editar nombre actualiza el saludo"` falla intermitentemente por rate-limit de `supabase.auth.updateUser` después de ~40 tests; `04-transfers "cambiar origen auto-actualiza el destino"` falla intermitentemente por orden no determinista de cuentas al retornar de Supabase. Tests de `09-charts` y el test de presupuesto en `06-settings` fallan cuando el seed data es de un mes anterior al actual (el filtro `thisMonth` no encuentra transacciones). Todos pasan en aislamiento o con seed data del mes corriente.

### Notas de arquitectura de búsqueda/filtros

El estado `txSearch`, `txPeriod`, `txKind` y `visibleTxCount` vive en `App.tsx` para que `ExportModal` pueda recibir `kind` directamente sin callbacks extra. Una alternativa válida sería moverlos dentro de `TransactionList` y exponer un prop `onFilterChange` para subir el estado de vuelta a `App.tsx` cuando sea necesario para la exportación.

### Key selectors
- Accounts: `.fa-accounts .fa-account`, name: `.fa-account-name`
- Transactions: `.fa-tx-list .fa-tx`, note: `.fa-tx-note`
- Debts: `.fa-debts .fa-debt`, edit: `getByTitle('Editar')`, pay: `getByTitle('Marcar como pagada')`, quick-pay: `getByTitle('Registrar pago')`, delete: `getByTitle('Eliminar')`
- Toast: `.fa-toast` · FAB (app loaded): `.fa-fab`
- Settings panel: `[style*="z-index: 100"][style*="bottom: 90px"]`
- Panel rows: `div:has(span:text-is("Label"))` · Search: `getByPlaceholder('Buscar nota o cuenta…')`

## Companion mobile app

React Native + Expo app with shared business logic. Repo: `C:\Users\angel\OneDrive\Documentos\React Native\FinAngel-Mobile` (has its own CLAUDE.md).

## Pending work (security hardening)

Outstanding items: PIN + AES-256-GCM encryption for localStorage, LockScreen component.

Already done: centrado de emojis en `AddAccountModal` picker (display:flex + alignItems + justifyContent + lineHeight:1 en cada botón), `.fa-kind-chips { gap: 8px }` añadido a `night.css` y `sticker.css` (solo existía en `warm.css`), `.fa-form .fa-chip` override con `padding: 9px 16px; font-size: 13px` añadido a `night.css` y `sticker.css` para igualar espaciado con `warm`/`pastel`, estado activo de chips en `sticker.css` usa estilo invertido (`background: var(--ink); color: white; box-shadow: none; transform: translate(2px,2px)`) para diferenciar visualmente el chip seleccionado, neutralización de `background: var(--lavender)` en `.fa-form .fa-chip:nth-child(2)` en `sticker.css` (evitaba que Billetera/USD parecieran preseleccionados), `GreetingCard` reemplaza fecha hardcodeada "Mayo 2026" por `currentMonthYear()` dinámico con locale `es-AR`, CSV injection fix in `ExportModal` (`sanitizeCell`), privacy masking in `fmtMoney`, Supabase RLS for data isolation, Content Security Policy headers in `index.html` (including `https://dolarapi.com` in `connect-src`), comprehensive input validation (monto ≤ 12 dígitos, nota ≤ 200 chars), re-fetch on tab-switch fix (`[session?.user.id]` in `useFinanceData`/`useDebtsData`), FX inputs sync fix (`useEffect` in `SettingsPanel`), budget progress bars inline in `SettingsPanel` (mini 4px bar + `$spent/$budget`, color-coded green/yellow/red, `categoryData` prop from `App.tsx`), expense/egreso colors shifted to red (`--coral`/`--rose` en los 4 temas), Gasto/Ingreso tabs diferenciados por `data-kind` attribute + CSS (rojo/verde) en `AddTransactionModal`, colores hardcoded en `ExportModal` y `SettingsPanel` actualizados a `#C13B3B`, `pastel` theme reemplazado por opción `auto` en `ThemeKey`, categoría `servicios` reemplazada por `luz_gas` (Luz / Gas 💡), `internet` (Internet / Tel. 🌐) y `suscripciones` (Suscripciones 📱) en `constants.ts`, `flowData` y `categoryData` excluyen `categoryId === 'transfer'` (transferencias entre cuentas propias no inflan Ingresos/Egresos del gráfico), nueva categoría `envio_pago` (Envío / Pago 💸, color `#C13B3B`) para pagos a terceros, pago parcial de deudas: `partialPayDebt` en `useDebtsData` (descuenta `remainingAmount`, marca como pagada si llega a 0), botón 💸 en `DebtCard` abre `QuickPayDebtModal` (cuenta+monto+fecha; descuenta balance de cuenta y `remainingAmount` de la deuda en un paso; si no hay cuentas en la moneda de la deuda muestra mensaje de fallback), selector "Aplicar a deuda" en `AddTransactionModal` (visible en gastos nuevos, filtra por moneda de la cuenta seleccionada, auto-rellena categoría `envio_pago` y nota `Pago de {nombre}`, pre-rellena monto con cuota mensual si existe), `luz_gas` renombrado a "Luz / Agua / Gas" (id sin cambios), nueva categoría `monotributo` (Monotributo 🧾, `#E8A838`), nueva categoría `impuestos` (Impuestos 🏛️, `#8B7355`), prop `privacy` añadida a `AddTransactionModal`/`TransferModal`/`QuickPayDebtModal` (muestra saldo en account chips cuando privacidad desactivada), validación de saldo insuficiente en gastos (`AddTransactionModal`) y transferencias (`TransferModal`): error se mueve al input de monto con focus automático y mensaje contextual, `QuickPayDebtModal` valida también saldo disponible de cuenta (no solo `remainingAmount`), `SettingsPanel` botones/selects usan `var(--bg-soft, white)` en lugar de `white` hardcodeado (fix para tema night), transferencias cross-currency: `insertTransfer` convierte el monto destino usando `fxRates` (USD→ARS multiplica, ARS→USD divide, USD↔USDT vía ARS como pivote); `TransferModal` muestra hint "≈ X ARS en destino" al tipear cuando las monedas difieren, `BudgetAlert` component reutilizable: `TotalCard` muestra alerta si suma de presupuestos supera el patrimonio total (`critical`) o los ingresos del mes (`warning`); `SettingsPanel` reutiliza `BudgetAlert` con detalle numérico en la sección de presupuestos, `FaDots` spinner de puntitos animados usado en el overlay de cierre de sesión, nueva categoría `transporte` (Transporte 🚌, `#60A5FA`) para Cabify/DiDi/SUBE, `TransactionCard` extraído como componente co-located en `TransactionList.tsx`, `BudgetChips` co-located en `TotalCard.tsx`: chips visuales (verde ✓ / rojo ⚠ si >10% excedido) que aparecen solo cuando el gasto del mes alcanza el presupuesto de la categoría; `upsertTx` en `useFinanceData` muestra toast "✓ Presupuesto de [Categoría] completado" al cruzar el umbral en lugar del toast genérico, búsqueda de transacciones extendida a categoría (label): `catById(t.categoryId).label` incluido en el filtro `filteredTx` de `App.tsx`; nuevo filtro `txKind` (`'' | 'income' | 'expense'`) con `<select>` Todos/Ingresos/Gastos junto a los filtros de texto y período; `ExportModal` recibe prop `kind` y filtra `effectiveTxs` internamente — CSV lleva sufijo `-ingresos`/`-egresos` en el nombre de archivo, PDF lleva el label delante de la fecha en `document.title` (`FinAngel — Resumen Ingresos/Egresos YYYY-MM-DD`).
