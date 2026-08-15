# Plan — Módulo de subida de resumen de tarjeta (regex, sin LLM)

## Context

FinAngel hoy exige cargar a mano cada consumo de tarjeta de crédito. Es una fricción real: un resumen de Galicia puede tener 40-80 movimientos por mes, multiplicado por 3 tarjetas (Galicia, Naranja X, MercadoPago).

La solución es un módulo que:
1. Acepte el PDF del resumen mensual de la tarjeta.
2. Extraiga el texto localmente con `pdfjs-dist` (sin backend, sin costo).
3. Parsee las transacciones con **regex específico por banco** (decisión del usuario: descartamos Claude API porque el preview editable compensa errores de parseo).
4. Muestre una **tabla preview editable** para que el usuario corrija categorías, deseleccione duplicados y descarte líneas.
5. Al confirmar, inserte todas las transacciones en Supabase en una sola llamada, asociadas a la tarjeta (`creditCardId`) — actualizando también `currentBalance` de la tarjeta como ya hace `AddTransactionModal`.

**Aclaración de URL / router:** el usuario propuso `/subir-resumen` como page. FinAngel no usa router; toda la app es SPA con state en `App.tsx` (ver `CLAUDE.md`). Meter `react-router` solo para esto es overkill. La solución equivalente y consistente con el resto del código es un **modal full-screen** (`fa-modal-wide`, mismo patrón que `AddCreditCardModal`) con **wizard interno de 3 pasos**.

**Alcance MVP (esta iteración):** solo **Galicia** (banco principal del usuario), un parser funcional end-to-end, con arquitectura preparada para agregar Naranja X y MercadoPago en una fase 2 replicando el patrón.

---

## Arquitectura

```
[Usuario sube PDF]
        │
        ▼
[pdfjs-dist] ──► texto crudo
        │
        ▼
[parser del banco] (galicia.ts) ──► ParsedTransaction[]
        │
        ▼
[categorizer] (keyword + merchant_mappings aprendido) ──► con categoryId sugerido
        │
        ▼
[duplicateDetector] (contra tx existentes de esta tarjeta) ──► marca duplicados
        │
        ▼
[SummaryPreviewTable] editable ──► usuario ajusta y confirma
        │
        ▼
[bulk insert vía RPC] + partialPayCard(cardId, totalMonto) + guardar nuevos mappings
```

---

## Estructura de archivos nuevos

```
src/lib/parsers/
  types.ts                    ← ParsedTransaction, SummaryParseResult, Bank
  pdfExtractor.ts             ← wrapper de pdfjs-dist (común a los 3 bancos)
  categorizer.ts              ← keyword map + consulta a mappings aprendidos
  duplicateDetector.ts        ← match por fecha/monto/comercio contra tx existentes
  galicia.ts                  ← parseGaliciaSummary (MVP)
  naranjaX.ts                 ← STUB (implementar en Fase 2)
  mercadoPago.ts              ← STUB (implementar en Fase 2)
  index.ts                    ← dispatcher: elige parser según Bank

src/lib/db/
  merchantMappings.ts         ← CRUD para mapping aprendido

src/hooks/
  useMerchantMappings.ts      ← hook: fetch + upsert de mappings

src/components/credit-cards/
  UploadSummaryModal.tsx      ← modal principal (wizard 3 pasos)
  SummaryPreviewTable.tsx     ← tabla editable co-located
```

## Archivos existentes a modificar

| Archivo | Cambio |
|---|---|
| `src/types.ts` | agregar `ParsedTransaction`, `SummaryParseResult`, `Bank` (o exportar desde `lib/parsers/types.ts`) |
| `src/lib/db/transactions.ts` | agregar `insertTransactionsBulk(txs, userId)` que llame al nuevo RPC |
| `src/hooks/useModalState.ts` | agregar `uploadSummaryOpen`, `setUploadSummaryOpen`, `uploadTargetCard` (CreditCard \| null) |
| `src/hooks/useFinanceData.ts` | agregar `bulkInsertTxs(txs)` que actualiza state local y llama al RPC |
| `src/hooks/useCreditCardsData.ts` | reutilizar `partialPayCard` (ya existe) tras el bulk insert |
| `src/components/credit-cards/CreditCardList.tsx` | agregar botón "📄 Subir resumen" por tarjeta (junto al 💸 de pago) |
| `src/App.tsx` | lazy import de `UploadSummaryModal` + `<Suspense>` block + wiring |
| `public/themes/warm.css` / `night.css` / `sticker.css` | agregar clases `.fa-preview-table`, `.fa-wizard-steps` |

---

## Fases de implementación

### Fase 0 — Setup (Supabase + dependencia)

**0.1 — Instalar dependencia:**
```bash
npm install pdfjs-dist
```

> **Nota sobre el nombre:** `pdfjs-dist` es el paquete npm oficial del proyecto `pdf.js` de Mozilla. La "d" es "distribution" — son los archivos ya buildeados del proyecto pdf.js. No hay diferencia técnica, es solo la convención de naming de Mozilla al publicar en npm.

Tamaño del bundle: ~1.2 MB minificado, ~350 kB gzipped. Se carga solo cuando el modal se abre (viene con el lazy import del modal). No impacta el bundle principal.

**0.2 — Correr en Supabase (dashboard SQL editor):**

```sql
-- Tabla para categorización aprendida
CREATE TABLE merchant_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern text NOT NULL,
  category_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_pattern)
);
ALTER TABLE merchant_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mappings" ON merchant_mappings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC para bulk insert atómico (una sola roundtrip)
CREATE OR REPLACE FUNCTION register_transactions_bulk(
  p_user_id uuid,
  p_transactions jsonb
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  inserted int;
BEGIN
  INSERT INTO transactions (id, user_id, account_id, category_id, amount, date, note, credit_card_id, created_at)
  SELECT
    (t->>'id')::uuid,
    p_user_id,
    (t->>'account_id')::text,
    (t->>'category_id')::text,
    (t->>'amount')::numeric,
    (t->>'date')::date,
    (t->>'note')::text,
    NULLIF(t->>'credit_card_id', '')::text,
    now()
  FROM jsonb_array_elements(p_transactions) AS t;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;
```

---

### Fase 1 — Extractor de PDF (`pdfExtractor.ts`)

**Configuración crítica del worker de pdfjs-dist en Vite:**
```ts
// src/lib/parsers/pdfExtractor.ts
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const extractPdfText = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Ordenar por Y (líneas) y luego X (columnas) para preservar layout
    const items = content.items as Array<{ str: string; transform: number[] }>;
    pages.push(items.map(it => it.str).join(' '));
  }
  return pages.join('\n');
};
```

**Sin el `?url` import de Vite, pdfjs-dist tira error de worker en producción.** Es el issue conocido #1 al integrarlo.

---

### Fase 2 — Tipos compartidos (`parsers/types.ts`)

```ts
export type Bank = 'galicia' | 'naranjaX' | 'mercadoPago';

export interface ParsedTransaction {
  rawLine: string;         // línea original del PDF (debug)
  date: string;            // 'YYYY-MM-DD'
  merchant: string;        // string normalizada
  amount: number;          // en centavos NO — número float con 2 decimales (consistente con app)
  installment?: { current: number; total: number };
  currency: 'ARS' | 'USD';
  // Post-categorización:
  categoryId?: string;     // sugerida por categorizer
  isDuplicate?: boolean;   // marcada por duplicateDetector
  selected: boolean;       // default true; usuario deselecciona duplicados
}

export interface SummaryParseResult {
  transactions: ParsedTransaction[];
  unparsedLines: string[]; // líneas que la regex no matcheó — se muestran para revisión
  metadata: {
    bank: Bank;
    period?: string;       // ej "2026-07"
    cardLast4?: string;    // últimos 4 dígitos si el PDF los muestra
    totalARS?: number;     // total del resumen según el PDF (para reconciliación)
  };
}
```

---

### Fase 3 — Parser de Galicia (`galicia.ts`)

Estrategia:
1. **Aislar sección** de consumos con marcadores tipo `"DETALLE DE MOVIMIENTOS"` y `"TOTAL A PAGAR"`.
2. **Unir líneas partidas** (comercios largos que se cortan en 2 líneas): pre-procesar juntando líneas que no empiezan con fecha a la anterior.
3. **Regex principal** por línea:
   ```
   /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(?:C\.(\d{2})\/(\d{2})\s+)?\$?\s*([\d.]+,\d{2})$/
   ```
   Grupos: `[1]` fecha, `[2]` comercio, `[3][4]` cuota (opcional), `[5]` monto.
4. **Normalización:**
   - Fecha: `"15/07/26"` → `"2026-07-15"` (asumir siglo 20xx).
   - Monto: `"12.450,00"` → `12450.00` (float; consistente con `Transaction.amount`).
   - Cuota: capturar `{current: 3, total: 12}` o `undefined`.
5. **Detección de sección en dólares** (Galicia tiene tabla separada para USD): parsear ambas y marcar `currency`.
6. **Líneas no matcheadas** → van a `unparsedLines[]` para review manual en el preview.

**Nota importante:** las regex exactas se van a ajustar iterativamente contra un PDF real del usuario. La primera versión será una aproximación educada; probablemente requiera 2-3 iteraciones sobre un resumen concreto.

---

### Fase 4 — Categorizador (`categorizer.ts`)

```ts
const KEYWORD_MAP: Array<[RegExp, string]> = [
  [/COTO|DISCO|JUMBO|CARREFOUR|DIA|LA ANONIMA/i, 'comida'],
  [/NETFLIX|SPOTIFY|DISNEY|HBO|YOUTUBE|PARAMOUNT/i, 'suscripciones'],
  [/UBER|CABIFY|DIDI|SUBE/i, 'transporte'],
  [/EDESUR|EDENOR|METROGAS|AYSA|NATURGY/i, 'luz_gas'],
  [/CLARO|MOVISTAR|PERSONAL|FIBERTEL|TELECENTRO/i, 'internet'],
  [/MERPAGO\s*\*\s*RAPPI|PEDIDOSYA|GLOVO|MCDONALD|BURGER/i, 'comida'],
  [/FARMA|SANTA MONICA|DR AHORRO/i, 'salud'],
  [/CINE|TEATRO|STEAM|PLAYSTATION|XBOX/i, 'entretenimiento'],
  [/AFIP|ARBA|MONOTRIBUTO/i, 'monotributo'],
];

export const categorize = (
  merchant: string,
  learnedMappings: Record<string, string>
): string => {
  // 1) mapping aprendido tiene prioridad (usuario ya lo corrigió antes)
  for (const [pattern, cat] of Object.entries(learnedMappings)) {
    if (merchant.toUpperCase().includes(pattern.toUpperCase())) return cat;
  }
  // 2) keyword base
  for (const [rx, cat] of KEYWORD_MAP) {
    if (rx.test(merchant)) return cat;
  }
  return 'otros';
};
```

---

### Fase 5 — Detector de duplicados (`duplicateDetector.ts`)

```ts
export const detectDuplicates = (
  parsed: ParsedTransaction[],
  existing: Transaction[],
  creditCardId: string
): void => {
  const existingForCard = existing.filter(t => t.creditCardId === creditCardId);
  for (const p of parsed) {
    const match = existingForCard.find(e => {
      const sameAmount = Math.abs(Math.abs(e.amount) - p.amount) < 0.01;
      const daysDiff = Math.abs(new Date(e.date).getTime() - new Date(p.date).getTime()) / 86400000;
      const closeDate = daysDiff <= 3;
      const merchantMatch = e.note.toUpperCase().includes(p.merchant.toUpperCase().slice(0, 8));
      return sameAmount && closeDate && merchantMatch;
    });
    if (match) {
      p.isDuplicate = true;
      p.selected = false;  // desmarcar por default
    }
  }
};
```

---

### Fase 6 — DB layer

**`src/lib/db/merchantMappings.ts` (nuevo)** — patrón espejo a `budgets.ts`:
```ts
export const fetchMerchantMappings = async (): Promise<Record<string, string>> => { ... };
export const upsertMerchantMapping = async (pattern: string, categoryId: string): Promise<void> => { ... };
```

**`src/lib/db/transactions.ts` (agregar función)**:
```ts
export const insertTransactionsBulk = async (
  txs: Transaction[],
  userId: string
): Promise<number> => {
  const payload = txs.map(t => ({
    id: t.id,
    account_id: t.accountId,
    category_id: t.categoryId,
    amount: t.amount,
    date: t.date,
    note: t.note,
    credit_card_id: t.creditCardId ?? '',
  }));
  const { data, error } = await supabase.rpc('register_transactions_bulk', {
    p_user_id: userId,
    p_transactions: payload,
  });
  if (error) throw error;
  return data as number;
};
```

---

### Fase 7 — Hooks

**`src/hooks/useMerchantMappings.ts` (nuevo)**:
```ts
export const useMerchantMappings = (session: Session | null) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  useEffect(() => { if (session) fetchMerchantMappings().then(setMappings); }, [session?.user.id]);
  const learn = async (pattern: string, cat: string) => {
    setMappings(m => ({ ...m, [pattern]: cat }));
    await upsertMerchantMapping(pattern, cat);
  };
  return { mappings, learn };
};
```

**`src/hooks/useFinanceData.ts` (agregar handler)**:
```ts
const bulkInsertTxs = async (txs: Transaction[]) => {
  setTransactions(prev => [...txs, ...prev]);  // optimista
  try {
    await insertTransactionsBulk(txs, session!.user.id);
    showToast(`✓ ${txs.length} movimientos importados`);
  } catch (e) {
    setTransactions(prev => prev.filter(t => !txs.find(nt => nt.id === t.id)));
    showToast('Error al importar');
    throw e;
  }
};
```

---

### Fase 8 — UI: `UploadSummaryModal.tsx` (wizard 3 pasos)

Estructura:
```tsx
<div className="fa-modal-wrap" onClick={onClose}>
  <div className="fa-modal fa-modal-wide" onClick={e => e.stopPropagation()}>
    <header className="fa-modal-head">
      <h3>Subir resumen — {card.name}</h3>
      <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose}>✕</button>
    </header>

    <div className="fa-wizard-steps">
      <span className={step === 1 ? 'active' : ''}>1. Cargar</span>
      <span className={step === 2 ? 'active' : ''}>2. Revisar</span>
      <span className={step === 3 ? 'active' : ''}>3. Confirmar</span>
    </div>

    {step === 1 && <StepUpload bank={bank} setBank={setBank} onFile={handleFile} />}
    {step === 2 && <SummaryPreviewTable
                     rows={parsed} onEdit={editRow} onToggle={toggleRow}
                     unparsed={unparsedLines} categories={CATEGORIES} />}
    {step === 3 && <StepConfirm rows={parsed.filter(r => r.selected)}
                                 budgetAlerts={budgetAlerts} onConfirm={handleConfirm} />}
  </div>
</div>
```

**Paso 1:** selector de banco (chips Galicia / Naranja X / MP), input file (`accept="application/pdf"`), botón "Analizar".

**Paso 2 (`SummaryPreviewTable`):** tabla con columnas fecha / comercio / cuota / **categoría** (`<select>` con las 15 categorías) / **monto** (editable) / **✓** (checkbox seleccionar/deseleccionar) / badge "posible duplicado" si aplica. Debajo, sección colapsable "N líneas no reconocidas" con los strings raw (usuario puede copiar y agregar manualmente después).

**Paso 3:** total a importar, alerta si el gasto proyectado supera algún budget del mes ("Comida: vas a sumar $X, superarías el presupuesto de $Y en $Z"), botón "Confirmar importación".

Al confirmar:
```ts
const finalTxs: Transaction[] = selectedRows.map(r => ({
  id: crypto.randomUUID(),
  date: r.date,
  accountId: '',           // sin cuenta origen (es tarjeta)
  categoryId: r.categoryId!,
  amount: -Math.abs(r.amount),
  note: r.merchant,
  creditCardId: card.id,
}));

await finance.bulkInsertTxs(finalTxs);

const total = finalTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
creditCards.partialPayCard(card.id, -total);  // AUMENTA currentBalance

// Guardar aprendizajes: mappings donde el usuario cambió la categoría sugerida
for (const r of editedRows) await mappings.learn(r.merchant, r.categoryId!);
```

**Nota crítica sobre `partialPayCard`:** ese método ya existe y **descuenta** balance (uso normal: pagar tarjeta). Para el import de consumos necesitamos el efecto opuesto (aumentar `currentBalance`). Dos opciones:
- **Opción A (limpia):** agregar `chargeCard(id, amount)` que sume al balance.
- **Opción B (reuso):** pasarle un `delta` negativo a `adjustCardPayment` que ya existe.

Recomiendo A por legibilidad.

---

### Fase 9 — Wiring en `App.tsx` y `CreditCardList.tsx`

**`CreditCardList.tsx`** — agregar prop `onUploadSummary: (card: CreditCard) => void` y botón `📄` junto al `💸` existente.

**`App.tsx`**:
```tsx
const UploadSummaryModal = lazy(() => import('./components/credit-cards/UploadSummaryModal')
  .then(m => ({ default: m.UploadSummaryModal })));

const [uploadingCard, setUploadingCard] = useState<CreditCard | null>(null);
const mappings = useMerchantMappings(session);

// En CreditCardList:
<CreditCardList ... onUploadSummary={c => setUploadingCard(c)} />

// Nuevo Suspense block:
<Suspense fallback={null}>
  {uploadingCard && (
    <UploadSummaryModal
      card={uploadingCard}
      accounts={accounts}
      existingTransactions={transactions}
      budgets={finance.budgets}
      categoryData={categoryData}
      learnedMappings={mappings.mappings}
      onLearn={mappings.learn}
      onConfirm={async (txs) => {
        await finance.bulkInsertTxs(txs);
        const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
        creditCards.chargeCard(uploadingCard.id, total);
        setUploadingCard(null);
      }}
      onClose={() => setUploadingCard(null)}
    />
  )}
</Suspense>
```

---

### Fase 10 — CSS

En los 3 temas (`warm.css`, `night.css`, `sticker.css`):
```css
.fa-modal-wide { max-width: 880px; }  /* ya existe implícito, confirmar */

.fa-wizard-steps {
  display: flex; gap: 24px; padding: 12px 0 20px;
  border-bottom: 1.5px solid var(--line); margin-bottom: 20px;
}
.fa-wizard-steps span {
  font-size: 13px; font-weight: 600; color: var(--ink-soft);
}
.fa-wizard-steps span.active { color: var(--accent); }

.fa-preview-table {
  display: grid;
  grid-template-columns: 90px 1fr 70px 130px 100px 40px;
  gap: 8px; font-size: 13px;
}
.fa-preview-table-header { font-weight: 700; padding-bottom: 8px; border-bottom: 1.5px solid var(--line); }
.fa-preview-row { padding: 8px 0; border-bottom: 1px solid var(--line); align-items: center; }
.fa-preview-row.duplicate { opacity: 0.55; background: var(--warn-bg, #FFF3E0); }
.fa-preview-badge-dup {
  font-size: 10px; padding: 2px 6px; border-radius: 6px;
  background: #FFE0B2; color: #A15A00;
}
```

---

## Features bonus (post-MVP, no bloquean)

1. **Detección de cuotas → recurrentes.** Si `installment.total > 1`, ofrecer checkbox "crear compromiso futuro de N cuotas restantes" que genere N transacciones futuras con `recurring: undefined` (fechas explícitas) o agregarlas a un panel "compromisos futuros" que descuente del presupuesto proyectado.
2. **Reconciliación con `currentBalance`.** Después del import, comparar `sum(imports)` con `card.currentBalance` actual. Si difiere >5%, alerta "el resumen suma $X pero el saldo actual de la tarjeta en la app es $Y; ¿faltan movimientos manuales?".
3. **Aprendizaje incremental.** Ya está en el plan (`useMerchantMappings`) — con 2-3 resúmenes el mapeo cubre 90% de los comercios habituales.

---

## Testing

**Tests E2E — nuevo spec `e2e/tests/16-upload-summary.spec.ts`:**
- Preparar fixture: PDF de resumen de Galicia con datos ficticios en `e2e/fixtures/galicia-sample.pdf`.
- Tests:
  1. Botón "📄" abre el modal
  2. Subir PDF avanza a paso 2 con filas parseadas
  3. Editar categoría en dropdown se refleja
  4. Deseleccionar fila la excluye del total
  5. Duplicado se marca desactivado por default
  6. Confirmar inserta transacciones y actualiza balance de tarjeta
  7. Toast confirma "✓ N movimientos importados"
- Helper nuevo en `e2e/helpers/modals.ts`: `uploadSummary(page, pdfPath, bank)`.
- Helper nuevo en `app.page.ts`: `openUploadSummary(cardName)`.

**Test unitario informal del parser:** durante desarrollo del regex de Galicia, copiar el texto extraído de un PDF real a `e2e/fixtures/galicia-sample.txt` y armar un script `npm run test:parser` (opcional) que corra `parseGaliciaSummary` sobre ese texto y muestre resultados.

---

## Verificación end-to-end (checklist manual)

1. Correr los SQL de Fase 0 en Supabase dashboard.
2. `npm install pdfjs-dist` y `npm run dev`.
3. En la app, ir a la sección de tarjetas → clickear "📄" en la tarjeta Galicia.
4. Subir un resumen PDF real (con datos tacheados si se prefiere).
5. Verificar que el paso 2 muestra las filas parseadas — si hay muchas en "no reconocidas", iterar sobre el regex de `galicia.ts` con líneas concretas del texto extraído.
6. Editar 2-3 categorías incorrectas, deseleccionar los duplicados, confirmar.
7. Verificar en el dashboard: transacciones aparecen con `creditCardId` correcto, `currentBalance` de la tarjeta subió por el total, toast confirmó.
8. Cerrar sesión y volver a entrar → los mappings aprendidos siguen y las próximas transacciones del mismo comercio ya vienen categorizadas.
9. Subir el **mismo** PDF de nuevo → todas las filas deben marcarse como duplicados por default.

---

## Riesgos y fallbacks

| Riesgo | Mitigación |
|---|---|
| El regex de Galicia falla en formatos edge | Líneas no matcheadas se muestran en la sección "no reconocidas"; usuario las carga a mano. Nunca se pierde información. |
| Galicia cambia el layout del PDF | Detectable rápido (regex deja de matchear); parser aislado en un archivo, fix acotado. |
| pdfjs-dist worker no carga en producción | Configuración `?url` de Vite (documentada en Fase 1); testear con `npm run build && npm run preview` antes de deploy. |
| Bulk insert falla a mitad de camino | RPC es transaccional por default (una sola INSERT dentro de plpgsql); si falla, rollback total y toast de error. |
| Usuario sube PDF que no es de la tarjeta seleccionada | Metadata del PDF (últimos 4 dígitos si está) se compara con `card.name`; warning suave en el paso 2. Fase 2 mejorada. |

---

## Fase 2 (futura, no en este scope)

- Implementar `parseNaranjaXSummary` y `parseMercadoPagoSummary` replicando el patrón de `galicia.ts` con regex específicos.
- Feature de detección de cuotas → compromisos futuros.
- Feature de reconciliación con `currentBalance`.
- Panel de gestión de `merchant_mappings` en `SettingsPanel` para editar/borrar mappings aprendidos.
