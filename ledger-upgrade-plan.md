# Plan: Migración a Ledger Real

**Rama de trabajo:** `feat/ledger-upgrade`  
**Fecha de creación:** 2026-06-30  
**Estado:** Pendiente de ejecución

---

## Contexto

Auditoría realizada el 2026-06-30 determinó que FinAngel es un **CRUD con balance mutable**, no un ledger real. Los tres problemas estructurales son:

1. `accounts.balance` es una columna mutable separada — puede divergir del historial de txs
2. Las transacciones se pueden editar/eliminar directamente (rompe inmutabilidad)
3. Las operaciones no son atómicas — `insertTransaction` + `updateAccountBalance` van en `Promise.all` sin transacción PostgreSQL

---

## Fases

### FASE 1 — Base de datos (Supabase SQL Editor)
**Prerequisito:** hacer todo en rama `feat/ledger-upgrade` antes de tocar código

#### 1a. Nuevas columnas en `transactions`
```sql
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transfer_group  UUID,
  ADD COLUMN IF NOT EXISTS reverses_tx_id  UUID REFERENCES transactions(id),
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();
```

#### 1b. Vista de saldos calculados
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
> Nota: mantener `amount` como `float` por ahora para no romper datos existentes.
> La migración a `BIGINT` (centavos) es una fase futura separada.

#### 1c. Tabla audit_log
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

#### 1d. Trigger de audit en transactions
```sql
CREATE OR REPLACE FUNCTION log_transaction_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (user_id, table_name, row_id, operation, old_data, new_data)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'transactions',
    COALESCE(NEW.id, OLD.id),
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

#### 1e. RPC `register_transaction` (atómica)
```sql
CREATE OR REPLACE FUNCTION register_transaction(
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
DECLARE
  v_id TEXT := 't' || floor(extract(epoch from now()) * 1000)::text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, recurring, debt_id)
  VALUES (v_id, p_user_id, p_account_id, p_category_id, p_amount, p_date, p_note, p_recurring, p_debt_id);

  UPDATE accounts
  SET balance = balance + p_amount
  WHERE id = p_account_id;

  RETURN v_id;
END;
$$;
```

#### 1f. RPC `register_transfer` (atómica)
```sql
CREATE OR REPLACE FUNCTION register_transfer(
  p_user_id       UUID,
  p_from_account  TEXT,
  p_to_account    TEXT,
  p_amount        FLOAT,
  p_to_amount     FLOAT,
  p_date          DATE,
  p_note          TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_group UUID := gen_random_uuid();
  v_id1   TEXT := 't' || floor(extract(epoch from now()) * 1000)::text;
  v_id2   TEXT := 't' || (floor(extract(epoch from now()) * 1000) + 1)::text;
BEGIN
  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, transfer_group)
  VALUES (v_id1, p_user_id, p_from_account, 'transfer', -p_amount, p_date, p_note, v_group);

  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, transfer_group)
  VALUES (v_id2, p_user_id, p_to_account, 'transfer', p_to_amount, p_date, p_note, v_group);

  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account;
  UPDATE accounts SET balance = balance + p_to_amount WHERE id = p_to_account;

  RETURN v_group;
END;
$$;
```

> **Nota:** Por ahora las RPCs SÍ actualizan `accounts.balance` para mantener compatibilidad.
> Una vez validado, la siguiente fase elimina la columna y usa la vista.

---

### FASE 2 — Capa de datos TypeScript

**Archivos a modificar:**
- `src/lib/db/transactions.ts` — reemplazar `insertTransaction` por llamada a RPC `register_transaction`
- `src/lib/db/accounts.ts` — eliminar `updateAccountBalance` (la RPC lo hace internamente)
- `src/hooks/useFinanceData.ts` — eliminar todas las llamadas a `updateAccountBalance` (ya no necesarias)

#### Cambios en `transactions.ts`
```ts
// Reemplazar insertTransaction:
export const insertTransaction = async (tx: Transaction, userId: string): Promise<void> => {
  const { error } = await supabase.rpc('register_transaction', {
    p_user_id:     userId,
    p_account_id:  tx.accountId,
    p_category_id: tx.categoryId,
    p_amount:      tx.amount,
    p_date:        tx.date,
    p_note:        tx.note,
    p_recurring:   tx.recurring ?? null,
    p_debt_id:     tx.debtId ?? null,
  });
  if (error) throw error;
};

// Agregar insertTransfer:
export const insertTransferRpc = async (
  userId: string, fromId: string, toId: string,
  amount: number, toAmount: number, date: string, note: string
): Promise<void> => {
  const { error } = await supabase.rpc('register_transfer', {
    p_user_id:      userId,
    p_from_account: fromId,
    p_to_account:   toId,
    p_amount:       amount,
    p_to_amount:    toAmount,
    p_date:         date,
    p_note:         note,
  });
  if (error) throw error;
};
```

#### Cambios en `useFinanceData.ts`
- En `upsertTx` (nuevo): usar `insertTransaction` (RPC) — ya no llamar `updateAccountBalance`
- En `insertTransfer`: usar `insertTransferRpc` — ya no llamar `updateAccountBalance` x2
- En `deleteTx` undo: usar `insertTransaction` (RPC) — ya no llamar `updateAccountBalance`
- En recurring auto-generation: usar `insertTransaction` (RPC) — ya no llamar `updateAccountBalance`

#### Tipo `Transaction` — agregar `created_at`
```ts
// src/types.ts
export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  categoryId: string;
  amount: number;
  note: string;
  recurring?: 'monthly' | 'weekly';
  debtId?: string;
  transferGroup?: string;   // nuevo: UUID que agrupa par de transferencia
  createdAt?: string;       // nuevo: timestamp de inserción
}
```

---

### FASE 3 — ❌ Descartada

Inmutabilidad estricta de `amount`/`date` tiene demasiada fricción para una app de finanzas personales. Corregir un monto mal ingresado es un caso común y válido. Las Fases 1+2 cubren el beneficio real de atomicidad y trazabilidad.

---

### FASE 4 — Migración a BIGINT (futuro, scope grande)

- Convertir todos los `amount` de `FLOAT` a `BIGINT` (centavos × 100)
- Requiere migración de datos existentes: `UPDATE transactions SET amount_cents = round(amount * 100)`
- Requiere cambios en toda la UI (fmtMoney, inputs, FX conversions)
- **No hacer hasta que Fases 1-3 estén estables en producción**

---

## Checklist de ejecución

### Pre-trabajo
- [ ] `git checkout -b feat/ledger-upgrade`

### Fase 1 — Supabase SQL Editor
- [ ] 1a: Nuevas columnas en `transactions` (`transfer_group`, `reverses_tx_id`, `created_at`)
- [ ] 1b: Vista `account_balances`
- [ ] 1c: Tabla `audit_log` + RLS
- [ ] 1d: Trigger `audit_transactions`
- [ ] 1e: RPC `register_transaction`
- [ ] 1f: RPC `register_transfer`
- [ ] Verificar con `SELECT * FROM audit_log LIMIT 5` tras insertar una tx de prueba

### Fase 2 — TypeScript
- [ ] `src/lib/db/transactions.ts`: `insertTransaction` → RPC; agregar `insertTransferRpc`
- [ ] `src/lib/db/accounts.ts`: eliminar `updateAccountBalance` export
- [ ] `src/lib/db/index.ts`: actualizar re-exports
- [ ] `src/hooks/useFinanceData.ts`: quitar todas las llamadas a `updateAccountBalance`
- [ ] `src/hooks/useDebtsData.ts`: quitar llamadas a `updateAccountBalance` (QuickPay)
- [ ] `src/types.ts`: agregar `transferGroup?` y `createdAt?` a `Transaction`
- [ ] `npm run build` — sin errores TypeScript
- [ ] `npx playwright test` — todos los tests pasan

### Fase 3 (opcional)
- [ ] Trigger soft-immutability en Supabase
- [ ] Adaptar `updateTransaction` para permitir solo `note`/`category_id`

---

## Impacto en tests existentes

Los tests E2E no deberían romperse porque:
- La UI no cambia
- Los balances siguen funcionando (la RPC los actualiza internamente)
- La única diferencia observable es que `insertTransaction` ya no llama `updateAccountBalance` por separado

Tests que podrían necesitar ajuste si se implementa soft-immutability (Fase 3):
- `03-transactions.spec.ts` — "editar" transacción cambia amount → podría bloquearse
