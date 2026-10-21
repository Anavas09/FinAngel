# Plan — Bugs de datos pendientes (detectados el 2026-10-20)

> Encontrados durante el análisis que dio origen a `claude-code-agents-guide.md` (§8). **El 1 quedó resuelto el 2026-10-21 al eliminar la funcionalidad de recurrentes; el 2 y el 3 siguen pendientes.**
> Verificación: el bug 1 se reprodujo ejecutando una copia literal de la función con la zona horaria de esta máquina (UTC-3). Los bugs 2 y 3 surgen de leer el código (revisado de nuevo el 2026-10-21): confírmalos primero con un test.
> Orden sugerido: **3 → 2** (el 3 es el más simple).

## Resumen

| # | Bug | Impacto | Dónde | ¿Mobile? |
|---|---|---|---|---|
| 1 | ✅ ~~Recurrentes duplicadas por fechas en UTC~~ | Resuelto el 2026-10-21: se eliminó la funcionalidad de la web | ver `recurring-transactions-archive.md` | Se mantiene en mobile (anotado en su repo) |
| 2 | Editar un movimiento cambiándole la cuenta | Saldos incorrectos en las dos cuentas | `src/hooks/useFinanceData.ts:128-146` | Revisar el equivalente |
| 3 | "Borrar todos los datos" no borra las tarjetas | Las tarjetas reaparecen al recargar | `src/lib/db/seed.ts:23-29`, `src/App.tsx:487` | Revisar el equivalente |

---

## 1. Recurrentes duplicadas por fechas en UTC ✅ (resuelto eliminando la funcionalidad)

El 2026-10-21 se quitó la funcionalidad de recurrentes de la app web en lugar de arreglarla. La causa, el fix de fechas (probado), los tests y las fallas de diseño que se encontraron quedaron en `recurring-transactions-archive.md`.

En la app mobile la funcionalidad se mantiene (decisión del 2026-10-21); lo pendiente de ese lado está anotado en su propio repo.

Pendiente igual:

- **Duplicados ya generados:** pueden seguir en Supabase. Las copias se guardaban con `recurring = null`. En el SQL Editor de Supabase:

```sql
select account_id, date, note, amount, count(*) as copias
from transactions
where recurring is null
group by account_id, date, note, amount
having count(*) > 1
order by date desc;
```

- Revisa cada fila: dos gastos idénticos el mismo día pueden ser legítimos.
- Borra los duplicados reales **desde la app**: al eliminar un movimiento, la app corrige el saldo de la cuenta. Un `delete` directo en SQL no corrige los saldos.

---

## 2. Editar un movimiento cambiándole la cuenta 🔴

### Qué pasa

Al editar, el ajuste de saldo se calcula como `delta = monto nuevo − monto viejo` y se aplica **solo a la cuenta nueva**. La cuenta original nunca se revierte.

Ejemplo: un gasto de $1.000 en "Cuenta ARS" se edita y se pasa a "Mercado Pago" sin cambiar el monto → delta = 0 → no cambia ningún saldo: "Cuenta ARS" sigue descontada y "Mercado Pago" nunca se descuenta.

El caso es alcanzable desde la UI: el modal de edición deja elegir otra cuenta (la validación de saldo de `AddTransactionModal.tsx` ya contempla `isSameAccount`).

### Causa

`src/hooks/useFinanceData.ts`, rama de edición de `upsertTx`:

- Líneas 132-135: el delta se suma solo a `updated.accountId`.
- Líneas 138-141: solo se persiste el saldo de esa cuenta.

### Fix propuesto

- Si `existing.accountId === updated.accountId`: igual que hoy.
- Si cambió: cuenta vieja `balance − existing.amount`, cuenta nueva `balance + updated.amount`, y persistir **las dos**.
- Mejor, cuando haya migraciones versionadas: una RPC `update_transaction` que haga ese ajuste por delta dentro de una transacción en la DB, como ya hace `register_transaction` al insertar. Así también se evita pisar saldos si la app mobile está abierta al mismo tiempo (guía §8, bug 5).
- Revisar si pasa lo mismo al editar pagos de deuda o tarjeta y cambiarles la cuenta.

### Test (Playwright, en `e2e/tests/03-transactions.spec.ts`)

1. Con seed: anotar los saldos de dos cuentas ARS.
2. Editar un gasto de la cuenta A, pasarlo a la cuenta B sin cambiar el monto y guardar.
3. Esperado: el saldo de A sube el monto del gasto y el de B baja lo mismo. Recargar (`page.reload()`) y verificar que se mantiene.

---

## 3. "Borrar todos los datos" no borra las tarjetas de crédito 🔴

### Qué pasa

"Borrar todos los datos" vacía las tarjetas solo en pantalla: en Supabase siguen ahí y **reaparecen al recargar**. Los presupuestos tampoco se borran (ni en pantalla ni en la DB); confirma si eso es intencional.

El test "estado vacío muestra botón agregar tarjeta" (`e2e/tests/15-credit-cards.spec.ts:8`) pasa igual porque no recarga la página después de borrar. De paso, cada corrida de la suite acumula tarjetas en el usuario de prueba.

### Causa

- `src/lib/db/seed.ts:23-29`: `clearUserData` solo borra `accounts` y `debts`.
- `src/App.tsx:487`: `onClearAll` llama a `creditCards.clearCards()`, que solo vacía el estado local.

### Fix propuesto

- En `clearUserData`, borrar también `credit_cards` (y `budgets`, si la intención es dejar todo vacío). Revisar las FK (por ejemplo `transactions.credit_card_id`) para elegir el orden de borrado.
- Para que no quede nada a medias, mejor una RPC `clear_user_data` que borre todo en una sola transacción.
- Si se borran los presupuestos, limpiar también su estado local en `handleClearAll`.

### Test (Playwright, en `e2e/tests/15-credit-cards.spec.ts`)

Crear una tarjeta → "Borrar todos los datos" → `page.reload()` → la sección de tarjetas muestra el estado vacío.

---

## Hallazgos menores (2026-10-21, sin plan detallado)

- **Fecha "de hoy" en UTC:** `new Date().toISOString().slice(0, 10)` devuelve la fecha de mañana después de las 21:00 (UTC-3). Aparece en la fecha por defecto de `AddTransactionModal.tsx:37`, `TransferModal.tsx:19`, `QuickPayDebtModal.tsx:19` y `PayCreditCardModal.tsx:19`; en el `createdAt` de `useDebtsData.ts:29` y `useCreditCardsData.ts:29`; en `DebtList.tsx:24` (marca la deuda como vencida desde las 21:00 del día de vencimiento); en el mes del toast de presupuesto (`useFinanceData.ts:157`); y en el nombre y título de la exportación (`ExportModal.tsx:62,73`). Fix: helper `toLocalISODate` (código en `recurring-transactions-archive.md`).
- **Editar un pago de tarjeta desde la lista pierde el vínculo con la tarjeta:** `AddTransactionModal` no envía `creditCardId`, así que `updateTransaction` guarda `credit_card_id = null` y el ajuste `creditCards.adjustCardPayment` de `src/App.tsx:369` nunca se ejecuta: si cambias el monto, el saldo de la tarjeta no se ajusta. Sale de leer el código: confírmalo primero con un test.

---

## Checklist

- [x] Bug 1: resuelto eliminando la funcionalidad de la web (2026-10-21)
- [ ] Bug 1: correr la query de duplicados y limpiar desde la app lo que corresponda
- [ ] Bug 3: test con `page.reload()` (en rojo) → fix → verde
- [ ] Bug 2: test E2E (en rojo) → fix → verde
- [ ] Actualizar CLAUDE.md y la memoria al cerrar

## Cómo retomarlo

En una sesión nueva: *"Arreglemos los bugs de `data-bugs-plan.md`, empezando por el 3: primero el test en rojo."*
