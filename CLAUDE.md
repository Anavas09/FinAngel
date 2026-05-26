# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server (Vite HMR)
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint (typescript-eslint)
npm run preview   # serve the production build locally
```

No test framework is configured.

## Architecture

Single-page app with no router. All state lives in `App.tsx` and is passed down as props — no context, no global store.

**State persistence** — two localStorage keys managed via `loadState`/`saveState` (`src/data/utils.ts`):
- `finangel:v1` — accounts array + transactions array
- `finangel:tweaks` — user preferences (`Tweaks` type)

**Theme system** — three CSS-only themes in `public/themes/{sticker,warm,night}.css`. `useTheme` (`src/hooks/useTheme.ts`) swaps them at runtime by injecting/removing a `<link data-fa-theme>` element. The active theme key is persisted in localStorage (`finangel:theme`).

**Tweaks** — `useTweaks` (`src/hooks/useTweaks.ts`) manages the `Tweaks` object: `privacy`, `mascotPersonality`, `layout`, `primaryAccent`. Layout is applied as a CSS class (`fa-layout-{layout}`) on the root div; accent is applied as a CSS custom property (`--accent`) directly on `documentElement`.

**Currency** — accounts hold balances in their native currency (ARS / USD / USDT). All totals and charts convert to ARS using the hardcoded rates in `FX_TO_ARS` (`src/data/constants.ts`). There is no live FX feed.

**Mascot** — mood is derived from `monthNet` vs income in `App.tsx`, then mapped to a `MascotState` for the SVG and a random copy line from `MASCOT_COPY` (keyed by `MascotPersonality × MascotMood`).

**Supabase** — `@supabase/supabase-js` is installed but not yet wired up anywhere in the codebase. All data is currently localStorage-only.

## Key files

| Path | Purpose |
|------|---------|
| `src/types.ts` | All TypeScript types (single source of truth) |
| `src/data/constants.ts` | Seed data, FX rates, category map, mascot copy, default tweaks |
| `src/data/utils.ts` | `fmtMoney`, `fmtDate`, `loadState`, `saveState` |
| `public/themes/*.css` | Full theme stylesheets (sticker / warm / night) |

## Pending work (security hardening)

A security plan exists at `plan-seguridad-finangel.md`. Outstanding items: PIN + AES-256-GCM encryption for localStorage, LockScreen component, Content Security Policy headers, CSV injection fix in ExportModal, and input validation.
