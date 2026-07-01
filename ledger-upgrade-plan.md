# Plan: Migración a Ledger Real

**Rama de trabajo:** `feat/ledger-upgrade` → mergeada a `main` el 2026-07-01  
**Fecha de creación:** 2026-06-30  
**Estado:** Fases 1 y 2 completadas ✅ — en producción

---

## Contexto

Auditoría realizada el 2026-06-30 determinó que FinAngel era un **CRUD con balance mutable**, no un ledger real. Los tres problemas estructurales eran:

1. `accounts.balance` era una columna mutable separada — podía divergir del historial de txs
2. Las transacciones se podían editar/eliminar directamente (rompe inmutabilidad)
3. Las operaciones no eran atómicas — `insertTransaction` + `updateAccountBalance` iban en `Promise.all` sin transacción PostgreSQL

---

## Fases

### FASE 1 — Base de datos (Supabase SQL Editor) ✅

#### 1a. Nuevas columnas en `transactions` ✅
```sql
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transfer_group  UUID,
  ADD COLUMN IF NOT EXISTS reverses_tx_id  UUID REFERENCES transactions(id),
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();
```

#### 1b. Vista de saldos calculados ✅
```sql
CREATE OR REPLACE VIEW account_balances AS
  SELECT
    a.id,
    a.user_id,
    a.name,
    a.currency,
    COALESCE(SUM(t.amount), 0) AS balance
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
  GROUP BY a.id, a.user_id, a.name, a.currency;
```

#### 1c. Tabla audit_log ✅
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  table_name  TEXT NOT NULL,
  row_id      TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit own rows" ON audit_log FOR SELECT USING (auth.uid() = user_id);
```

#### 1d. Trigger de audit en transactions ✅
```sql
CREATE OR REPLACE FUNCTION log_transaction_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (user_id, table_name, row_id, operation, old_data, new_data)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'transactions',
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_change();
```

#### 1e. RPC `register_transaction` (atómica) ✅
> Nota: se añadió `p_id` para que el cliente controle el ID con `crypto.randomUUID()`.

```sql
CREATE OR REPLACE FUNCTION register_transaction(
  p_id          TEXT,
  p_user_id     UUID,
  p_account_id  TEXT,
  p_category_id TEXT,
  p_amount      FLOAT,
  p_date        DATE,
  p_note        TEXT,
  p_recurring   TEXT DEFAULT NULL,
  p_debt_id     TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, recurring, debt_id)
  VALUES (p_id, p_user_id, p_account_id, p_category_id, p_amount, p_date, p_note, p_recurring, p_debt_id);

  UPDATE accounts
  SET balance = balance + p_amount
  WHERE id = p_account_id;

  RETURN p_id;
END;
$$;
```

#### 1f. RPC `register_transfer` (atómica) ✅
> Nota: se añadieron `p_id1`/`p_id2` para que el cliente controle los IDs.

```sql
CREATE OR REPLACE FUNCTION register_transfer(
  p_user_id       UUID,
  p_from_account  TEXT,
  p_to_account    TEXT,
  p_amount        FLOAT,
  p_to_amount     FLOAT,
  p_date          DATE,
  p_note          TEXT,
  p_id1           TEXT,
  p_id2           TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, transfer_group)
  VALUES (p_id1, p_user_id, p_from_account, 'transfer', -p_amount, p_date, p_note, gen_random_uuid());

  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, transfer_group)
  VALUES (p_id2, p_user_id, p_to_account, 'transfer', p_to_amount, p_date, p_note,
    (SELECT transfer_group FROM transactions WHERE id = p_id1));

  UPDATE accounts SET balance = balance - p_amount  WHERE id = p_from_account;
  UPDATE accounts SET balance = balance + p_to_amount WHERE id = p_to_account;
END;
$$;
```

---

### FASE 2 — Capa de datos TypeScript ✅

**Archivos modificados:**
- `src/lib/db/transactions.ts` — `insertTransaction` → RPC `register_transaction`; añadido `insertTransferRpc`; `TransactionRow` mapea `transfer_group` y `created_at`
- `src/hooks/useFinanceData.ts` — eliminadas todas las llamadas a `updateAccountBalance` en insert, transfer, recurring y undo-delete; IDs migrados a `crypto.randomUUID()`
- `src/lib/db/seed.ts` — semilla sin `id` hardcodeado (la DB genera el id)
- `src/types.ts` — `Transaction` añade `transferGroup?` y `createdAt?`

---

### FASE 3 — ❌ Descartada

Inmutabilidad estricta de `amount`/`date` tiene demasiada fricción para una app de finanzas personales. Corregir un monto mal ingresado es un caso común y válido. Las Fases 1+2 cubren el beneficio real de atomicidad y trazabilidad.

---

### FASE 4 — Migración a BIGINT (futuro, scope grande)

- Convertir todos los `amount` de `FLOAT` a `BIGINT` (centavos × 100)
- Requiere migración de datos existentes: `UPDATE transactions SET amount_cents = round(amount * 100)`
- Requiere cambios en toda la UI (`fmtMoney`, inputs, FX conversions)
- Requiere ajuste de prácticamente todos los tests E2E
- **No encarar hasta que las Fases 1+2 estén estables en producción por un tiempo**

---

## Checklist de ejecución

### Pre-trabajo
- [x] `git checkout -b feat/ledger-upgrade`

### Fase 1 — Supabase SQL Editor
- [x] 1a: Nuevas columnas en `transactions` (`transfer_group`, `reverses_tx_id`, `created_at`)
- [x] 1b: Vista `account_balances`
- [x] 1c: Tabla `audit_log` + RLS
- [x] 1d: Trigger `audit_transactions`
- [x] 1e: RPC `register_transaction` (con `p_id`)
- [x] 1f: RPC `register_transfer` (con `p_id1`/`p_id2`)

### Fase 2 — TypeScript
- [x] `src/lib/db/transactions.ts`: `insertTransaction` → RPC; agregar `insertTransferRpc`
- [x] `src/hooks/useFinanceData.ts`: quitar todas las llamadas a `updateAccountBalance` en insert/transfer/recurring/undo
- [x] `src/types.ts`: agregar `transferGroup?` y `createdAt?` a `Transaction`
- [x] `src/lib/db/seed.ts`: eliminar `id` hardcodeado en inserts de transactions
- [x] `npm run build` — sin errores TypeScript
- [x] Merge a `main` y push a `origin/main`

### Fase 3
- [x] ❌ Descartada

### Fase 4
- [ ] Pendiente — scope grande, encarar en rama separada cuando Fases 1+2 lleven tiempo en producción
