# Plan — Bugs de datos pendientes (detectados el 2026-10-20)

> Encontrados durante el análisis que dio origen a `claude-code-agents-guide.md` (§8). **Al 2026-10-21 los tres están resueltos: el 1 al eliminar la funcionalidad de recurrentes; el 2 y el 3 con fix y test E2E.**
> Verificación: el bug 1 se reprodujo ejecutando una copia literal de la función con la zona horaria de esta máquina (UTC-3). El 2 y el 3 se confirmaron con un test E2E en rojo antes de corregirlos.
> Quedan solo los hallazgos menores (al final del documento).

## Resumen

| # | Bug | Impacto | Dónde | ¿Mobile? |
|---|---|---|---|---|
| 1 | ✅ ~~Recurrentes duplicadas por fechas en UTC~~ | Resuelto el 2026-10-21: se eliminó la funcionalidad de la web | ver `recurring-transactions-archive.md` | Se mantiene en mobile (anotado en su repo) |
| 2 | ✅ ~~Editar un movimiento cambiándole la cuenta~~ | Corregido el 2026-10-21 | `src/hooks/useFinanceData.ts` (`upsertTx`) | Mismo bug en mobile (anotado en su repo) |
| 3 | ✅ ~~"Borrar todos los datos" no borra las tarjetas~~ | Corregido el 2026-10-21 (la opción solo existe en dev) | `src/lib/db/seed.ts` | Mismo bug en mobile (anotado en su repo) |

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

## 2. Editar un movimiento cambiándole la cuenta ✅ (corregido el 2026-10-21)

### Qué pasaba

Al editar, el ajuste de saldo se calculaba como `delta = monto nuevo − monto viejo` y se aplicaba **solo a la cuenta nueva**. La cuenta original nunca se revertía.

Ejemplo: un gasto de $1.000 en "Cuenta ARS" se editaba y se pasaba a "Mercado Pago" sin cambiar el monto → delta = 0 → no cambiaba ningún saldo: "Cuenta ARS" seguía descontada y "Mercado Pago" nunca se descontaba. El caso es alcanzable desde la UI: el modal de edición deja elegir otra cuenta.

### Causa

`src/hooks/useFinanceData.ts`, rama de edición de `upsertTx`: el delta se sumaba solo a `updated.accountId` y solo se persistía el saldo de esa cuenta.

### Resolución

- `upsertTx` revierte el monto viejo en la cuenta original (`balance − existing.amount`), aplica el nuevo en la cuenta nueva (`balance + updated.amount`) y persiste el saldo de **las dos**. Si la cuenta es la misma, equivale al delta de antes.
- Los pagos de deuda pasan por el mismo `upsertTx`, así que quedan cubiertos (el ajuste de la deuda depende solo del monto). Los pagos de tarjeta tienen aparte el hallazgo menor de `credit_card_id`.
- Mejora futura, cuando haya migraciones versionadas: una RPC `update_transaction` que haga el ajuste dentro de una transacción en la DB, como ya hace `register_transaction` al insertar. Así también se evita pisar saldos si la app mobile está abierta al mismo tiempo (guía §8, bug 5).

### Test (Playwright, en `e2e/tests/03-transactions.spec.ts`)

"editar un gasto cambiándole la cuenta mueve el monto entre las dos cuentas": crea un gasto de $1.000 en Cuenta ARS (con fecha de hoy, para que aparezca en la lista del mes; el seed es de mayo), lo pasa a Mercado Pago (ARS +1.000, MP −1.000), después le cambia el monto a $1.500 sin cambiar la cuenta (MP −500 más) y verifica los saldos tras recargar. Falló antes del fix (Cuenta ARS quedaba en $539.320 en vez de $540.320) y pasa después.

---

## 3. "Borrar todos los datos" no borra las tarjetas de crédito ✅ (corregido el 2026-10-21)

### Qué pasaba

"Borrar todos los datos" (opción que solo existe en dev: está dentro de `import.meta.env.DEV` en `SettingsPanel`) vaciaba las tarjetas solo en pantalla: en Supabase seguían ahí y **reaparecían al recargar**. El test "estado vacío muestra botón agregar tarjeta" no lo detectaba porque no recarga la página, y cada corrida de la suite acumulaba tarjetas en el usuario de prueba (había 41 al corregirlo).

### Causa

- `src/lib/db/seed.ts`: `clearUserData` solo borraba `accounts` y `debts`.
- `src/App.tsx:487`: `onClearAll` llama a `creditCards.clearCards()`, que solo vacía el estado local.

### Resolución

- `clearUserData` borra también `credit_cards`, después de `accounts` y `debts`. El test incluye una tarjeta con un pago registrado (transacción con `credit_card_id`) y no hubo problemas de claves foráneas.
- **Los presupuestos se conservan a propósito** (decisión del usuario, 2026-10-21); quedó comentado en `clearUserData`.
- Test E2E en `e2e/tests/15-credit-cards.spec.ts` ("borrar todos los datos elimina las tarjetas en la base y no vuelven al recargar"): crea una tarjeta, registra un pago, borra todo, recarga y verifica que la respuesta de `credit_cards` venga vacía. Espera la respuesta real porque `useCreditCardsData` arranca con la lista vacía mientras carga, y mirar solo la pantalla podía dar un falso positivo. Falló antes del fix (41 tarjetas) y pasa después.
- No se hizo la RPC `clear_user_data` para que el borrado sea atómico: para una opción solo de dev no hace falta.

---

## Hallazgos menores (2026-10-21, sin plan detallado)

- **Fecha "de hoy" en UTC:** `new Date().toISOString().slice(0, 10)` devuelve la fecha de mañana después de las 21:00 (UTC-3). Aparece en la fecha por defecto de `AddTransactionModal.tsx:37`, `TransferModal.tsx:19`, `QuickPayDebtModal.tsx:19` y `PayCreditCardModal.tsx:19`; en el `createdAt` de `useDebtsData.ts:29` y `useCreditCardsData.ts:29`; en `DebtList.tsx:24` (marca la deuda como vencida desde las 21:00 del día de vencimiento); en el mes del toast de presupuesto (`useFinanceData.ts:157`); y en el nombre y título de la exportación (`ExportModal.tsx:62,73`). Fix: helper `toLocalISODate` (código en `recurring-transactions-archive.md`).
- **Editar un pago de tarjeta desde la lista pierde el vínculo con la tarjeta:** `AddTransactionModal` no envía `creditCardId`, así que `updateTransaction` guarda `credit_card_id = null` y el ajuste `creditCards.adjustCardPayment` de `src/App.tsx:369` nunca se ejecuta: si cambias el monto, el saldo de la tarjeta no se ajusta. Sale de leer el código: confírmalo primero con un test.

---

## Checklist

- [x] Bug 1: resuelto eliminando la funcionalidad de la web (2026-10-21)
- [ ] Bug 1: correr la query de duplicados y limpiar desde la app lo que corresponda
- [x] Bug 3: test con recarga (en rojo: 41 tarjetas) → fix → verde (2026-10-21)
- [x] Bug 2: test E2E (en rojo) → fix → verde (2026-10-21)
- [x] Actualizar CLAUDE.md y la memoria al cerrar

## Cómo retomarlo

Los tres bugs están resueltos. Si se retoma algo, son los hallazgos menores: *"Arreglemos los hallazgos menores de `data-bugs-plan.md`: primero el test en rojo."*
