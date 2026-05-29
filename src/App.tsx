import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import type { Session } from '@supabase/supabase-js';
import { TopBar } from './components/layout/TopBar';
import { GreetingCard } from './components/dashboard/GreetingCard';
import { TotalCard } from './components/dashboard/TotalCard';
import { AccountCard } from './components/dashboard/AccountCard';
import { ChartCard } from './components/charts/ChartCard';
import { TransactionList } from './components/transactions/TransactionList';
import { SettingsPanel } from './components/settings/SettingsPanel';

const AddTransactionModal = lazy(() => import('./components/transactions/AddTransactionModal').then(m => ({ default: m.AddTransactionModal })));
const TransferModal        = lazy(() => import('./components/transactions/TransferModal').then(m => ({ default: m.TransferModal })));
const AddAccountModal      = lazy(() => import('./components/accounts/AddAccountModal').then(m => ({ default: m.AddAccountModal })));
const ExportModal          = lazy(() => import('./components/transactions/ExportModal').then(m => ({ default: m.ExportModal })));
import { AuthScreen } from './components/auth/AuthScreen';
import { FinAngelMini } from './components/mascot/Mascot';
import { useTheme } from './hooks/useTheme';
import { useTweaks } from './hooks/useTweaks';
import { useFinanceData } from './hooks/useFinanceData';
import { useModalState } from './hooks/useModalState';
import { useMascot } from './hooks/useMascot';
import { supabase } from './lib/supabase';
import { fmtMoney } from './data/utils';

const App = () => {
  const { theme, setTheme } = useTheme();
  const [tweaks, setTweak] = useTweaks();
  const { privacy, mascotPersonality: personality, layout, primaryAccent: accent } = tweaks;

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const userName = (session?.user.user_metadata?.full_name as string | undefined) ?? '';

  const modals = useModalState();
  const { addOpen, setAddOpen, addAccountOpen, setAddAccountOpen, editingTx, setEditingTx,
          exportOpen, setExportOpen, transferOpen, setTransferOpen, toast, showToast, clearToast } = modals;

  const [hoverCatIdx, setHoverCatIdx]       = useState<number | null>(null);
  const [hoverFlowIdx, setHoverFlowIdx]     = useState<number | null>(null);
  const [txSearch, setTxSearch]             = useState('');
  const [txPeriod, setTxPeriod]             = useState('');
  const [visibleTxCount, setVisibleTxCount] = useState(12);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  const fxRates = useMemo(
    () => ({ ARS: 1, USD: tweaks.fxUSD, USDT: tweaks.fxUSDT } as const),
    [tweaks.fxUSD, tweaks.fxUSDT],
  );

  const finance = useFinanceData(session ?? null, showToast, fxRates);

  const { mascotMood, mascotLine } = useMascot(finance.monthNet, finance.flowData[0].value, personality);

  const txMonths = useMemo(() => {
    const months = new Set(finance.transactions.map(t => t.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [finance.transactions]);

  const filteredTx = useMemo(() => {
    return finance.transactions.filter(t => {
      if (txPeriod && !t.date.startsWith(txPeriod)) return false;
      if (txSearch) {
        const q = txSearch.toLowerCase();
        const acc = finance.accounts.find(a => a.id === t.accountId);
        if (!t.note.toLowerCase().includes(q) && !acc?.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [finance.transactions, finance.accounts, txPeriod, txSearch]);

  // --- Render guards ---
  if (session === undefined) return <Spinner />;
  if (!session) return <AuthScreen />;
  if (finance.loading) return <Spinner />;

  const { accounts, transactions, visibleAccounts, totalsByCcy, totalInARS, categoryData, flowData, monthNet } = finance;

  return (
    <div className={`fa-app fa-layout-${layout}`}>
      <TopBar onExport={() => setExportOpen(true)} theme={theme} setTheme={setTheme} />

      <main className="fa-main">
        <GreetingCard mood={mascotMood} line={mascotLine} layout={layout} userName={userName} />

        <TotalCard
          totalARS={totalInARS}
          totals={totalsByCcy}
          privacy={privacy}
          setPrivacy={v => setTweak('privacy', v)}
          monthNet={monthNet}
        />

        <section className="fa-section">
          <header className="fa-section-head">
            <h2>Tus cuentas</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {accounts.length > 0 && (
                <span className="fa-section-sub">{visibleAccounts.length} de {accounts.length} visibles</span>
              )}
              <button className="fa-link" onClick={() => setTransferOpen(true)}>↔ Transferir</button>
              <button className="fa-link" onClick={() => setAddAccountOpen(true)}>+ Agregar</button>
            </div>
          </header>
          {accounts.length === 0 ? (
            <div className="fa-empty">
              <p>No hay cuentas todavía.</p>
              <button className="fa-btn fa-btn-primary" onClick={finance.handleLoadSeed}>
                Cargar datos de ejemplo
              </button>
            </div>
          ) : (
            <div className="fa-accounts">
              {accounts.map(a => (
                <AccountCard key={a.id} account={a} onToggle={() => finance.toggleAccount(a.id)} privacy={privacy} onDelete={() => finance.deleteAccount(a.id)} />
              ))}
            </div>
          )}
        </section>

        <section className="fa-section fa-charts">
          <ChartCard
            title="¿En qué se va la plata?"
            sub="Gastos por categoría este mes"
            data={categoryData}
            centerLabel="Total gastado"
            centerValue={fmtMoney(categoryData.reduce((s, d) => s + d.value, 0), 'ARS', privacy)}
            hoverIdx={hoverCatIdx}
            onHover={setHoverCatIdx}
            privacy={privacy}
            budgets={finance.budgets}
          />
          <ChartCard
            title="Ingresos vs Egresos"
            sub="Movimiento del mes en curso"
            data={flowData}
            centerLabel="Balance"
            centerValue={fmtMoney(monthNet, 'ARS', privacy)}
            hoverIdx={hoverFlowIdx}
            onHover={setHoverFlowIdx}
            privacy={privacy}
            mode="flow"
          />
        </section>

        <section className="fa-section">
          <header className="fa-section-head">
            <h2>Últimos movimientos</h2>
            <button className="fa-link" onClick={() => setExportOpen(true)}>Exportar resumen ↗</button>
          </header>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className="fa-input"
              type="text"
              placeholder="Buscar nota o cuenta…"
              value={txSearch}
              onChange={e => { setTxSearch(e.target.value); setVisibleTxCount(12); }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <select
              className="fa-input"
              value={txPeriod}
              onChange={e => { setTxPeriod(e.target.value); setVisibleTxCount(12); }}
              style={{ fontSize: 13, minWidth: 110 }}
            >
              <option value="">Todos</option>
              {txMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <TransactionList
            transactions={filteredTx.slice(0, visibleTxCount)}
            accounts={accounts}
            privacy={privacy}
            onEdit={tx => { setEditingTx(tx); setAddOpen(true); }}
          />
          {filteredTx.length > visibleTxCount && (
            <button
              className="fa-link"
              onClick={() => setVisibleTxCount(c => c + 12)}
              style={{ display: 'block', margin: '12px auto 0', fontSize: 13 }}
            >
              Ver más ({filteredTx.length - visibleTxCount} restantes)
            </button>
          )}
        </section>

        <div className="fa-footer">
          <span>FinAngel · v1 · hecho con cariño y matemática básica</span>
        </div>
      </main>

      <button
        className="fa-fab"
        onClick={() => { setEditingTx(null); setAddOpen(true); }}
        aria-label="Agregar movimiento"
      >
        <span className="fa-fab-plus">+</span>
        <span className="fa-fab-label">Agregar</span>
      </button>

      <Suspense fallback={null}>
        {transferOpen && (
          <TransferModal
            accounts={accounts}
            onClose={() => setTransferOpen(false)}
            onSave={(fromId, toId, amount, date, note) => {
              finance.insertTransfer(fromId, toId, amount, date, note);
              setTransferOpen(false);
            }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {addAccountOpen && (
          <AddAccountModal
            onClose={() => setAddAccountOpen(false)}
            onSave={fields => { finance.addAccount(fields); setAddAccountOpen(false); }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {addOpen && (
          <AddTransactionModal
            accounts={accounts}
            editing={editingTx}
            onClose={() => { setAddOpen(false); setEditingTx(null); }}
            onSave={tx => { finance.upsertTx(tx); setAddOpen(false); setEditingTx(null); }}
            onDelete={editingTx?.id ? () => {
              const undo = finance.deleteTx(editingTx.id!);
              setAddOpen(false);
              setEditingTx(null);
              showToast('Movimiento eliminado', undo);
            } : null}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {exportOpen && (
          <ExportModal
            accounts={accounts}
            transactions={transactions}
            totalARS={totalInARS}
            onClose={() => setExportOpen(false)}
            onToast={showToast}
          />
        )}
      </Suspense>

      {toast && (
        <div className="fa-toast">
          <FinAngelMini size={28} mood="happy" />
          <span>{toast.msg}</span>
          {toast.onUndo && (
            <button
              onClick={() => { toast.onUndo!(); clearToast(); }}
              style={{ marginLeft: 8, fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}
            >
              Deshacer
            </button>
          )}
        </div>
      )}

      <SettingsPanel
        tweaks={tweaks}
        setTweak={setTweak}
        onLoadSeed={finance.handleLoadSeed}
        onClearAll={finance.handleClearAll}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={session.user.email ?? ''}
        userName={userName}
        onUpdateName={async (name) => {
          await supabase.auth.updateUser({ data: { full_name: name } });
        }}
        budgets={finance.budgets}
        onSetBudget={finance.setBudget}
        onRemoveBudget={finance.removeBudget}
      />
    </div>
  );
};

const Spinner = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #FFF8F0)' }}>
    <FinAngelMini size={40} mood="chill" />
  </div>
);

export default App;
