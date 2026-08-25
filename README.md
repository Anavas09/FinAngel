# FinAngel

App de finanzas personales. SPA sin router, cuentas multi-moneda (ARS / USD / USDT), transacciones con categorías, presupuestos, deudas, tarjetas de crédito, gráficos y una mascota con estados de ánimo según cómo vas del mes.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Supabase** — Auth (email/password) + Postgres con RLS
- **Playwright** — E2E tests
- Sin router, sin librería de estado global (todo el state vive en `App.tsx` y baja por props)
- Persistencia local solo para preferencias (tema, tweaks) vía localStorage

## Setup

### Prerequisitos

- Node.js ≥ 20
- npm
- Cuenta en [supabase.com](https://supabase.com) — el free tier alcanza

### 1. Clonar e instalar

```bash
git clone <URL_DEL_REPO>
cd FinAngel
npm install
```

### 2. Crear proyecto en Supabase

1. Dashboard de Supabase → **New project** (elegí región cercana; anotá la contraseña de la DB por si acaso).
2. Copiar de **Settings → API**:
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon / publishable key** (empieza con `sb_publishable_...`)
3. En **Authentication → Providers**, verificar que **Email** esté habilitado. Si vas a usar en local sin verificación de correo, desactivá "Confirm email".

### 3. Configurar env vars

Crear `.env.development` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxx
```

Vite carga `.env.development` automáticamente en modo dev y `.env.production` en build. Los tres archivos (`.env`, `.env.development`, `.env.production`) están en `.gitignore` — no se suben al repo.

### 4. Aplicar schema a la base de datos

> **⚠️ TODO — schema SQL pendiente de versionar.** Actualmente el schema (tablas `accounts`, `transactions`, `budgets`, `debts`, `credit_cards`, vista `account_balances`, tabla `audit_log`, RPCs `register_transaction` / `register_transfer`) vive solo en la instancia de Supabase del mantenedor. Está planeado migrar a `supabase/migrations/*.sql` (Supabase CLI) para que este paso sea `supabase db push`. Mientras tanto, pedir el dump al mantenedor o inferir el schema leyendo `src/lib/db/*.ts` y `src/types.ts`.

Referencias parciales del schema que sí están documentadas:
- `CLAUDE.md` sección "Ledger upgrade" — detalla las columnas añadidas y los RPCs `register_transaction` / `register_transfer`.
- `ledger-upgrade-plan.md` — plan completo del refactor SQL.
- `credit-card-summary-upload-plan.md` — Fase 0.2 tiene el SQL de la próxima feature (`merchant_mappings` + `register_transactions_bulk`).

### 5. Correr en dev

```bash
npm run dev
```

Abrir <http://localhost:5173>, registrar un usuario en la pantalla de auth y empezar a cargar cuentas.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server con Vite HMR |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run lint` | ESLint (typescript-eslint) |
| `npm run preview` | Servir el build de producción local |
| `npx playwright test` | Suite E2E (requiere `.env.test`, ver sección Testing) |

## Estructura

```
src/
  App.tsx              root; todo el state vive acá
  components/
    auth/              login + signup
    dashboard/         greeting, total, account cards
    transactions/      list, add/edit modal, transfer, export
    debts/             list, add, quick-pay modals
    credit-cards/      list, add, pay modals
    charts/            donuts (categorías, ingresos/egresos)
    settings/          panel de config
    layout/            topbar
    mascot/            SVG mascot con 6 estados
    ui/                primitivos reutilizables
  hooks/
    useFinanceData     fetch + derived + CRUD de accounts/transactions/budgets
    useDebtsData       fetch + CRUD de debts
    useCreditCardsData fetch + CRUD de credit cards
    useModalState      flags de modales + toast con undo
    useTheme           theme swapping (sticker/warm/night/auto)
    useTweaks          preferencias UI
    useMascot          derivación de mood
    useLiveFx          fetch de dólar desde dolarapi.com
  lib/
    supabase.ts        cliente
    db/                CRUD por dominio (accounts, transactions, budgets, debts, creditCards, seed)
    finance/           lógica pura (recurring txs)
  data/
    constants.ts       categorías, FX rates, seed, mascot copy
    utils.ts           fmtMoney, fmtDate, loadState/saveState
  types.ts             todos los tipos
public/themes/         CSS de los 4 temas (sticker, warm, night, pastel)
e2e/                   Playwright specs + helpers
```

Para más detalle arquitectónico (patrones, decisiones, notas de implementación), ver `CLAUDE.md`.

## Testing (E2E)

Suite Playwright con 140 tests aprox. Requiere un usuario de prueba **ya registrado en tu Supabase** y credenciales en `.env.test` (gitignored):

```bash
TEST_EMAIL=test@example.com
TEST_PASSWORD=tu_password
```

Correr:

```bash
npx playwright test              # headless
npx playwright test --headed     # con browser visible
npx playwright test --ui         # modo UI interactivo
npx playwright show-report       # reporte HTML del último run
```

Config en `playwright.config.ts` (workers: 1, `fullyParallel: false`, global setup con auth compartida).

## Companion mobile

App **React Native + Expo** en desarrollo activo, comparte ~70% de la lógica de negocio con esta web app. Repo separado.

## Roadmap corto

- **Módulo de subida de resumen de tarjeta** (PDF → regex → preview → bulk insert). Plan en `credit-card-summary-upload-plan.md`.
- **Migrations versionadas** — mover el schema SQL a `supabase/migrations/*.sql` con Supabase CLI.

## Licencia

Uso personal / entre amigos. Sin licencia formal por ahora.
