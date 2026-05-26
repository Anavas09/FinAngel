import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { TopBar } from './components/layout/TopBar';
import { GreetingCard } from './components/dashboard/GreetingCard';
import { TotalCard } from './components/dashboard/TotalCard';
import { AccountCard } from './components/dashboard/AccountCard';
import { ChartCard } from './components/charts/ChartCard';
import { TransactionList } from './components/transactions/TransactionList';
import { AddTransactionModal } from './components/transactions/AddTransactionModal';
import { AddAccountModal } from './components/accounts/AddAccountModal';
import { ExportModal } from './components/transactions/ExportModal';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { AuthScreen } from './components/auth/AuthScreen';
import { FinAngelMini } from './components/mascot/Mascot';
import { useTheme } from './hooks/useTheme';
import { useTweaks } from './hooks/useTweaks';
import { useFinanceData } from './hooks/useFinanceData';
import { supabase } from './lib/supabase';
import { MASCOT_COPY } from './data/constants';
import { fmtMoney } from './data/utils';
import type { MascotMood, MascotState, TransactionInput } from './types';

const App = () => {
  const { theme, setTheme } = useTheme();
  const [tweaks, setTweak] = useTweaks();
  const { privacy, mascotPersonality: personality, layout, primaryAccent: accent } = tweaks;

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  // UI state
  const [addOpen, setAddOpen]               = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editingTx, setEditingTx]           = useState<TransactionInput | null>(null);
  const [exportOpen, setExportOpen]         = useState(false);
  const [hoverCatIdx, setHoverCatIdx]       = useState<number | null>(null);
  const [hoverFlowIdx, setHoverFlowIdx]     = useState<number | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  const finance = useFinanceData(session ?? null, showToast);

  // Mascot
  const mood: MascotMood = finance.monthNet > finance.flowData[0].value * 0.2 ? 'great' : finance.monthNet > 0 ? 'ok' : 'warn';
  const mascotMood: MascotState = ({ great: 'celebrating', ok: 'happy', warn: 'worried' } as const)[mood];
  const mascotLine = useMemo(() => {
    const lines = MASCOT_COPY[personality]?.[mood] ?? MASCOT_COPY.motivadora[mood];
    return lines[Math.floor(Math.random() * lines.length)];
  }, [personality, mood]);

  // --- Render guards ---
  if (session === undefined) return <Spinner />;
  if (!session) return <AuthScreen />;
  if (finance.loading) return <Spinner />;

  const { accounts, transactions, visibleAccounts, totalsByCcy, totalInARS, categoryData, flowData, monthNet } = finance;

  return (
    <div className={`fa-app fa-layout-${layout}`}>
      <TopBar onExport={() => setExportOpen(true)} theme={theme} setTheme={setTheme} />

      <main className="fa-main">
        <GreetingCard mood={mascotMood} line={mascotLine} layout={layout} />

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
                <AccountCard key={a.id} account={a} onToggle={() => finance.toggleAccount(a.id)} privacy={privacy} />
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
          <TransactionList
            transactions={transactions.slice(0, 12)}
            accounts={accounts}
            privacy={privacy}
            onEdit={tx => { setEditingTx(tx); setAddOpen(true); }}
          />
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

      {addAccountOpen && (
        <AddAccountModal
          onClose={() => setAddAccountOpen(false)}
          onSave={fields => { finance.addAccount(fields); setAddAccountOpen(false); }}
        />
      )}

      {addOpen && (
        <AddTransactionModal
          accounts={accounts}
          editing={editingTx}
          onClose={() => { setAddOpen(false); setEditingTx(null); }}
          onSave={tx => { finance.upsertTx(tx); setAddOpen(false); setEditingTx(null); }}
          onDelete={editingTx?.id ? () => { finance.deleteTx(editingTx.id!); setAddOpen(false); setEditingTx(null); } : null}
        />
      )}

      {exportOpen && (
        <ExportModal
          accounts={accounts}
          transactions={transactions}
          totalARS={totalInARS}
          onClose={() => setExportOpen(false)}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className="fa-toast">
          <FinAngelMini size={28} mood="happy" />
          <span>{toast}</span>
        </div>
      )}

      <SettingsPanel
        tweaks={tweaks}
        setTweak={setTweak}
        onLoadSeed={finance.handleLoadSeed}
        onClearAll={finance.handleClearAll}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={session.user.email ?? ''}
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
