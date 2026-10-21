# Recurrentes — funcionalidad eliminada (archivo para reincorporarla)

> **Eliminada de la app web el 2026-10-21.** No se usaba y su diseño tenía bugs que duplicaban movimientos. Este documento guarda cómo funcionaba, qué problemas tenía y cómo reincorporarla bien si algún día se quiere.
>
> **Código original:** el último commit que la tiene es `7145274`. Para ver un archivo tal como estaba: `git show 7145274:src/lib/finance/recurring.ts`. Para ubicar el commit que la eliminó: `git log --diff-filter=D --oneline -- src/lib/finance/recurring.ts`. Revertir ese commit la restaura tal cual, **con sus bugs**.

## Qué era

- Campo **Repetir** en el modal de movimientos (`AddTransactionModal`), con las opciones "No repetir", "Cada mes 📅" y "Cada semana 🔁".
- Estaba disponible para gastos e ingresos, al crear y al editar. No existía en transferencias, en el pago rápido de deudas ni en el pago de tarjetas.

## Cómo funcionaba

- **Plantilla:** el movimiento guardado con Repetir quedaba con `recurring = 'monthly' | 'weekly'` (columna `transactions.recurring`). Era el único movimiento con esa marca.
- **Generación:** al cargar los datos (`useFinanceData`, al montar o al cambiar de usuario), `autoGenerateRecurring(txs, new Date())` recorría las plantillas. Para cada una fuera del período actual (mes, o semana ISO), buscaba un movimiento sin `recurring` en el período actual con la **misma nota, cuenta y monto**. Si no lo encontraba, creaba una copia:
  - con la fecha del día en que se abría la app, no la de la plantilla;
  - sin `recurring` ni `debtId` (solo `id`, `date`, `accountId`, `categoryId`, `amount`, `note`);
  - aplicando el monto al saldo en pantalla e insertándola con `insertTransaction` (el RPC `register_transaction` ajusta el saldo en la DB).
- Solo generaba la copia del período actual: no recuperaba los períodos en los que no se abrió la app. Y solo al cargar: si la app quedaba abierta cuando empezaba el mes, no pasaba nada hasta recargar.
- **Dejar de repetir:** editar la plantilla y elegir "No repetir" (`updateTransaction` escribía `recurring = null`).
- La lista no marcaba cuál era la plantilla; solo se veía al abrirla para editar.

### Archivos involucrados (en `7145274`)

| Archivo | Qué tenía |
|---|---|
| `src/lib/finance/recurring.ts` | `autoGenerateRecurring` + `isoWeekKey` (era el único archivo de `src/lib/finance/`) |
| `src/hooks/useFinanceData.ts` | `useEffect` de carga: llamaba a `autoGenerateRecurring`, ajustaba saldos e insertaba las copias |
| `src/components/transactions/AddTransactionModal.tsx` | estado `recurring` + `<select>` "Repetir" |
| `src/types.ts` | `recurring?: 'monthly' \| 'weekly'` en `Transaction` |
| `src/lib/db/transactions.ts` | mapeo de la columna, `p_recurring` en el RPC y `recurring` en el update |
| `e2e/helpers/modals.ts`, `e2e/tests/03-transactions.spec.ts` | opción `recurring` de `fillTransactionForm` + test "transacción recurrente mensual se guarda" |

## Qué quedó después de eliminarla

- **Base de datos, sin cambios:** siguen la columna `transactions.recurring` y el parámetro `p_recurring TEXT DEFAULT NULL` de `register_transaction`. La web manda `p_recurring: null` y ya no lee ni escribe la columna, así que las plantillas guardadas siguen en la base.
- **App mobile:** mantiene la funcionalidad por decisión del 2026-10-21. Su estado y sus pendientes están anotados en el `CLAUDE.md` de FinAngel-Mobile.

Para ver las plantillas guardadas (SQL Editor de Supabase):

```sql
select id, date, note, amount, account_id, recurring
from transactions
where recurring is not null
order by date desc;
```

Los duplicados que el bug ya haya generado se buscan con la consulta del bug 1 en `data-bugs-plan.md`. Hay que borrarlos **desde la app**, no con SQL, para que se corrijan los saldos.

## Problemas conocidos (verificados el 2026-10-21)

### 1. Fechas en UTC → copias duplicadas

`new Date('YYYY-MM-DD')` y `toISOString()` trabajan en UTC. En Argentina (UTC-3) eso corre la fecha:

- `isoWeekKey(new Date(t.date))` calculaba la semana anterior para los movimientos de los lunes (medianoche UTC = domingo 21:00 local). La copia de la semana nunca se encontraba y se creaba otra en cada carga de los lunes y martes.
- `today = now.toISOString().slice(0, 10)`: después de las 21:00 la copia quedaba con la fecha de mañana, y el último día del mes, en el mes siguiente.

Fix probado (nunca se commiteó porque se eliminó la funcionalidad):

```ts
// src/lib/dates.ts
// Fechas de calendario en hora local. Evitan `toISOString()` y `new Date('YYYY-MM-DD')`,
// que trabajan en UTC y en Argentina (UTC-3) corren el día después de las 21:00.

/** `Date` → `'YYYY-MM-DD'` según el calendario local. */
export const toLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** `'YYYY-MM-DD'` → `Date` a medianoche local (no UTC). */
export const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
```

En `recurring.ts`: `const today = toLocalISODate(now);` y `isoWeekKey(parseLocalDate(t.date))` / `isoWeekKey(parseLocalDate(x.date))` en las dos comparaciones de semana.

### 2. Fallas de diseño (el fix de fechas no las resuelve)

Comprobadas ejecutando `autoGenerateRecurring` con cada escenario:

| Si se hace esto | Pasa esto |
|---|---|
| Borrar una copia para saltear un mes | Al recargar se vuelve a crear |
| Editar el monto, la nota o la cuenta de una copia | Al recargar se crea otra con los datos de la plantilla → doble descuento |
| Editar el monto de la plantilla cuando la copia del período ya existe | Se crea otra copia en el mismo período |
| Marcar una copia también como recurrente | Dos plantillas → dos copias por período (cada plantilla se compara contra la lista original, sin ver lo generado en la misma carga) |
| Cargar una recurrente con fecha de un período futuro | Se crea además una copia en el período actual → doble descuento |
| Usar "Aplicar a deuda" + Repetir | La copia no hereda `debtId` y nadie llama a `partialPayDebt` → baja el saldo de la cuenta pero no lo pendiente de la deuda |

Las primeras cuatro tienen la misma causa: la app no registra qué período ya generó, sino que lo deduce buscando un movimiento con la misma nota, cuenta y monto. Además, como la generación ocurre en el cliente, si la web y la mobile cargan casi al mismo tiempo pueden crear la misma copia las dos (por diseño; no se simuló).

## Si se reincorpora: diseño recomendado

1. **Generar en la base, no en el cliente:** una RPC (por ejemplo `generate_recurring(p_today date)`) que, en una sola transacción, cree las copias que falten y registre el período generado. Con un unique constraint por (plantilla, período), ni las recargas ni dos dispositivos pueden duplicar.
2. **Registrar el período generado** en vez de deducirlo: una columna `last_generated_period` en la plantilla o una tabla `recurring_runs (template_id, period)`. Así, borrar o editar una copia no dispara otra, y borrar una copia equivale a saltear ese período.
3. **Vincular cada copia a su plantilla** (`recurring_template_id`) para identificarla sin depender de nota y monto, y heredar `debt_id` (con su ajuste de deuda) si la plantilla lo tiene.
4. **Fechas en hora local** (`toLocalISODate` / `parseLocalDate`).
5. **Decidir el comportamiento antes de implementar:** ¿la copia lleva la fecha de apertura o el mismo día del mes que la plantilla (ajustado a fin de mes)? ¿Se recuperan los períodos en los que no se abrió la app?
6. **UI:** marca 🔁 en la lista para las plantillas, no ofrecer Repetir al editar una copia y definir qué pasa con las fechas futuras.
7. **Mobile:** aplicar el mismo diseño o, si la generación queda en la RPC, sacarla del cliente en las dos apps.

## Tests de la sesión del 2026-10-21 (Vitest, nunca commiteados)

Requerían `npm i -D vitest`, el script `"test": "vitest run"` y este `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

// Los bugs de fechas dependen de la zona horaria: fijarla hace los tests reproducibles en cualquier máquina/CI.
process.env.TZ = 'America/Argentina/Buenos_Aires';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

`src/lib/finance/recurring.test.ts`. Los 4 fallaban con el código original y pasaban con el fix de fechas:

```ts
import { describe, expect, it } from 'vitest';

import { autoGenerateRecurring } from './recurring';

import type { Transaction } from '../../types';

// Simula abrir la app varias veces con la misma hora: cada carga agrega lo generado.
const cargar = (txs: Transaction[], ...momentos: Date[]): Transaction[] =>
  momentos.reduce((acc, now) => [...autoGenerateRecurring(acc, now), ...acc], txs);

const copias = (txs: Transaction[]) => txs.filter(t => !t.recurring);

describe('autoGenerateRecurring', () => {
  it('semanal: genera una sola copia por semana aunque se recargue lunes, martes y jueves', () => {
    const txs = cargar(
      [{ id: 'w', date: '2026-10-05', accountId: 'ars', categoryId: 'comida', amount: -5000, note: 'Verdulería', recurring: 'weekly' }],
      new Date(2026, 9, 19, 10), new Date(2026, 9, 19, 15), new Date(2026, 9, 19, 23),
      new Date(2026, 9, 20, 9), new Date(2026, 9, 20, 22),
      new Date(2026, 9, 22, 12),
    );
    expect(copias(txs)).toHaveLength(1);
    expect(copias(txs)[0].date).toBe('2026-10-19');
  });

  it('semanal creada un lunes: no genera copia esa misma semana', () => {
    const txs = cargar(
      [{ id: 'w', date: '2026-10-19', accountId: 'ars', categoryId: 'comida', amount: -5000, note: 'Verdulería', recurring: 'weekly' }],
      new Date(2026, 9, 19, 12), new Date(2026, 9, 19, 20), new Date(2026, 9, 20, 10),
    );
    expect(copias(txs)).toHaveLength(0);
  });

  it('mensual: primera carga del mes el último día a la noche → una copia fechada ese día', () => {
    const noche = new Date(2026, 9, 31, 22, 0);
    const txs = cargar(
      [{ id: 'm', date: '2026-09-05', accountId: 'ars', categoryId: 'vivienda', amount: -210000, note: 'Alquiler', recurring: 'monthly' }],
      noche, noche, noche,
    );
    expect(copias(txs)).toHaveLength(1);
    expect(copias(txs)[0].date).toBe('2026-10-31');
  });

  it('después de las 21:00 la copia lleva la fecha local de hoy, no la de mañana', () => {
    const txs = cargar(
      [{ id: 'm', date: '2026-09-05', accountId: 'ars', categoryId: 'vivienda', amount: -210000, note: 'Alquiler', recurring: 'monthly' }],
      new Date(2026, 9, 20, 23, 30),
    );
    expect(copias(txs)[0].date).toBe('2026-10-20');
  });
});
```

Si se rediseña, agregar casos para cada fila de la tabla de fallas de diseño.
