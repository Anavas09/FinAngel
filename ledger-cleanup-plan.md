# Plan — Ledger Cleanup + Fix de "Error al actualizar el movimiento"

**Fecha:** 2026-08-24
**Motivación:** El ledger upgrade quedó sobredimensionado para una app personal. Hay piezas dead weight (audit_log, vista `account_balances`, columna `reverses_tx_id`) y — lo más importante — **al editar el monto de una transacción aparece el toast "Error al actualizar el movimiento"**, síntoma casi seguro de un trigger o policy en Supabase que bloquea el UPDATE de `amount`.

## Contexto verificado (código local, 2026-08-24)

**No hay bloqueo en el código TypeScript:**
- `src/lib/db/transactions.ts:66-74` — `updateTransaction` hace `UPDATE transactions SET amount: tx.amount ...` sin validación.
- `src/hooks/useFinanceData.ts:141-158` — `upsertTx` calcula `delta` y actualiza `accounts.balance`; el catch revierte el estado local y muestra el toast de error.
- `AddTransactionModal` — input de monto no está `readOnly` ni `disabled` al editar.
- Plan del ledger (`ledger-upgrade-plan.md` línea 161-163) — Fase 3 (inmutabilidad de amount/date) fue **descartada explícitamente**.

**Uso real de las piezas del ledger** (verificado con `grep` en `src/`):

| Pieza | Se usa | Decisión |
|---|---|---|
| RPC `register_transaction` | ✅ sí | Mantener |
| RPC `register_transfer` | ✅ sí | Mantener |
| Columna `transfer_group` | Se lee al hydratar `Transaction`, no se usa después | Mantener (barato + útil para futuro "borrar transferencia completa") |
| Columna `created_at` | Se lee al hydratar, no se usa | Mantener (barato, DEFAULT now()) |
| Vista `account_balances` | ❌ Nadie la consulta | **Eliminar** |
| Tabla `audit_log` + trigger `audit_transactions` | ❌ No hay UI que la lea | **Eliminar** |
| Columna `reverses_tx_id` | ❌ Ni escribe ni lee | **Eliminar** |

---

## Fase 0 — Diagnóstico del bug de UPDATE

Correr en **Supabase → SQL Editor** y pegarme los resultados. Estos SELECTs son de solo lectura, no modifican nada.

### 0.1 Todos los triggers no-internos en `transactions`

```sql
SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'transactions'::regclass
  AND NOT tgisinternal;
```

**Esperado (baseline sano):** solo `audit_transactions`. Cualquier otro trigger (nombres tipo `prevent_amount_change`, `immutable_amount`, `enforce_ledger`, etc.) es el probable culpable.

### 0.2 Policies RLS en `transactions`

```sql
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'transactions';
```

**A revisar:** cualquier policy con `cmd = 'UPDATE'` cuyo `with_check` mencione `amount` o compare `OLD.amount = NEW.amount` — eso bloquea cambios de monto.

### 0.3 CHECK constraints en `transactions`

```sql
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND contype = 'c';
```

**A revisar:** cualquier constraint que compare con valores previos (raro pero posible).

### 0.4 Reproducir el error desde SQL Editor

Reemplazar `<UUID>` con el ID de una transacción real (agarrar uno con `SELECT id, amount, note FROM transactions LIMIT 5;`).

```sql
UPDATE transactions
SET amount = amount + 0.01
WHERE id = '<UUID>'
RETURNING id, amount, note;
```

**Si falla:** el mensaje exacto de Postgres nos dice qué regla lo bloquea (ej. `permission denied by policy`, `violates check constraint`, `RAISE EXCEPTION`, etc.). Copiarme el error íntegro.

**Si no falla:** el problema no es Supabase — es el cliente. En ese caso, abrir DevTools → Network → editar una tx en la app → mirar la request PATCH a `/rest/v1/transactions?id=eq...` → mirar la response.

---

## Fase 1 — Fix del bloqueo (SQL condicional)

**Ejecutar solo después de que Fase 0 identifique el ofensor.** Los snippets abajo son los tres casos posibles:

### 1.a Si el ofensor es un trigger extra

```sql
DROP TRIGGER IF EXISTS <nombre_del_trigger> ON transactions;
DROP FUNCTION IF EXISTS <nombre_de_la_funcion>();
```

### 1.b Si es una policy con `WITH CHECK` restrictivo

```sql
DROP POLICY IF EXISTS "<nombre_de_la_policy>" ON transactions;
-- Y recrear la policy sin la restricción de amount:
CREATE POLICY "update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 1.c Si es un CHECK constraint

```sql
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS <nombre_del_constraint>;
```

### 1.d Verificación post-fix

```sql
-- Repetir el UPDATE de 0.4 — ahora debe pasar
UPDATE transactions SET amount = amount + 0.01
WHERE id = '<UUID>' RETURNING id, amount;

-- Y revertir el cambio de prueba
UPDATE transactions SET amount = amount - 0.01
WHERE id = '<UUID>';
```

Luego probar en la app: editar una tx, cambiar monto, guardar → toast debe ser "Movimiento actualizado".

---

## Fase 2 — Limpieza del ledger overkill

**Ejecutar en una sola pasada en el SQL editor de Supabase.** Todo es idempotente (`IF EXISTS`).

```sql
-- 2.1 Eliminar trigger de audit + función
DROP TRIGGER IF EXISTS audit_transactions ON transactions;
DROP FUNCTION IF EXISTS log_transaction_change();

-- 2.2 Eliminar tabla de audit
DROP TABLE IF EXISTS audit_log;

-- 2.3 Eliminar vista calculada (nadie la consulta)
DROP VIEW IF EXISTS account_balances;

-- 2.4 Eliminar columna reverses_tx_id (dead weight)
ALTER TABLE transactions DROP COLUMN IF EXISTS reverses_tx_id;
```

**No tocar:**
- `transfer_group` (columna) — usada al hidratar `Transaction`, útil a futuro.
- `created_at` (columna) — usada al hidratar `Transaction`, cero costo.
- RPCs `register_transaction` y `register_transfer` — atomicidad real que sí aporta.

### 2.5 Verificación

```sql
-- Debe devolver 0 filas (ya no existe)
SELECT * FROM information_schema.tables WHERE table_name = 'audit_log';
SELECT * FROM information_schema.views  WHERE table_name = 'account_balances';

-- La columna reverses_tx_id no debe aparecer
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transactions' ORDER BY ordinal_position;

-- Los RPCs deben seguir existiendo
SELECT proname FROM pg_proc
WHERE proname IN ('register_transaction', 'register_transfer');
```

---

## Fase 3 — Sincronizar docs

Después de Fase 1 + 2 exitosas:

### 3.1 Actualizar `CLAUDE.md`

En la sección `## Ledger upgrade ✅ (en main desde 2026-07-01)`:
- Marcar `audit_log`, `account_balances` y `reverses_tx_id` como removidos con nota `(removidos 2026-08-24 en cleanup — no se usaban)`.
- Mantener la mención de los RPCs y `transfer_group`.

En `## Pending work`:
- Eliminar la mención de "Ledger Fase 4" **si ya la considerás fuera de scope permanente** (opcional — se puede dejar como "futuro que no se va a hacer" o borrar completamente).

### 3.2 Actualizar memoria

- `MEMORY.md` → la línea de `project_ledger_upgrade.md` pasa a decir "Ledger cleanup 2026-08-24: eliminados audit_log, vista y reverses_tx_id por unused; RPCs y transfer_group mantenidos".
- `project_ledger_upgrade.md` → agregar sección "Cleanup 2026-08-24" al final con el detalle.

---

## Checklist

### Fase 0 — Diagnóstico (2026-08-25)
- [x] 0.1 Listar triggers → identificados: `audit_transactions` (esperado) + `enforce_tx_immutability` (culpable)
- [x] 0.2 Listar policies → sana (`users_own_transactions` ALL con `auth.uid() = user_id`)
- [x] 0.3 Listar CHECK constraints → sin constraints
- [x] 0.4 UPDATE de prueba → `ERROR P0001: tx_immutable: amount and date cannot be changed` (RAISE en `prevent_tx_mutation()`)

### Fase 1 — Fix (2026-08-25)
- [x] Ofensor identificado: trigger `enforce_tx_immutability` + función `prevent_tx_mutation()`
- [x] Aplicado 1.a: `DROP TRIGGER` + `DROP FUNCTION`
- [x] 1.d Verificado — el UPDATE funciona

### Fase 2 — Limpieza (2026-08-25)
- [x] Ejecutado 2.1-2.4 en un solo pase
- [x] 2.5 Verificado: audit_log/account_balances/reverses_tx_id eliminados; RPCs conservados

### Fase 3 — Docs (2026-08-25)
- [x] Actualizada sección `## Ledger upgrade` en `CLAUDE.md` con nota de cleanup + Fase 4 descartada
- [x] Removido "Ledger Fase 4" de `## Pending work` en `CLAUDE.md`
- [x] Actualizado `MEMORY.md` (líneas de plan actual y ledger)
- [x] Reescrito `project_ledger_upgrade.md` en memoria con estado final + registro del bug + query de diagnóstico reutilizable

---

## Notas

- **Riesgo del fix (Fase 1):** cero si la Fase 0 identificó bien al ofensor. Si dropeás el trigger o policy equivocada, se puede recrear desde el `pg_get_triggerdef` / `pg_get_policies` output de Fase 0 (por eso pedimos el `definition` completo, no solo el nombre).
- **Riesgo del cleanup (Fase 2):** también cero si el grep en `src/` sigue sin encontrar referencias. Si mañana quisieras auditoría, se puede recrear `audit_log` con el mismo SQL del `ledger-upgrade-plan.md`.
- **Rollback:** todo lo que se dropea acá está documentado en `ledger-upgrade-plan.md`, sección "Fase 1". Copy-paste para recrear si algún día hace falta.
