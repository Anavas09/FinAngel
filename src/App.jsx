import { useState, useEffect, useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { GreetingCard } from './components/GreetingCard';
import { TotalCard } from './components/TotalCard';
import { AccountCard } from './components/AccountCard';
import { ChartCard } from './components/ChartCard';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { ExportModal } from './components/ExportModal';
import { SettingsPanel } from './components/SettingsPanel';
import { FinAngelMini } from './components/Mascot';
import { useTheme } from './hooks/useTheme';
import { useTweaks } from './hooks/useTweaks';
import {
  ACCOUNTS_SEED, ACCOUNT_BALANCES, TRANSACTIONS_SEED,
  MASCOT_COPY, FX_TO_ARS, LS_KEY,
} from './data/constants';
import { fmtMoney, loadState, saveState } from './data/utils';

const App = () => {
  const { theme, setTheme } = useTheme();

  const persisted = loadState(LS_KEY);
  const [accounts, setAccounts] = useState(
    persisted?.accounts || ACCOUNTS_SEED.map(a => ({ ...a, visible: true, balance: ACCOUNT_BALANCES[a.id] }))
  );
  const [transactions, setTransactions] = useState(persisted?.transactions || TRANSACTIONS_SEED);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [hoverCatIdx, setHoverCatIdx] = useState(null);
  const [hoverFlowIdx, setHoverFlowIdx] = useState(null);
  const [toast, setToast] = useState(null);

  const [tweaks, setTweak] = useTweaks();
  const { privacy, mascotPersonality: personality, layout, primaryAccent: accent } = tweaks;

  useEffect(() => { saveState(LS_KEY, { accounts, transactions }); }, [accounts, transactions]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  const toggleAccount = (id) =>
    setAccounts(accounts.map(a => a.id === id ? { ...a, visible: !a.visible } : a));

  const visibleAccounts = accounts.filter(a => a.visible);

  const totalsByCcy = useMemo(() => {
    const out = { ARS: 0, USD: 0, USDT: 0 };
    visibleAccounts.forEach(a => { out[a.currency] = (out[a.currency] || 0) + a.balance; });
    return out;
  }, [visibleAccounts]);

  const totalInARS = useMemo(
    () => visibleAccounts.reduce((s, a) => s + a.balance * (FX_TO_ARS[a.currency] || 0), 0),
    [visibleAccounts]
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter(
      t => t.date.startsWith(ym) && accounts.find(a => a.id === t.accountId)?.visible
    );
  }, [transactions, accounts]);

  const categoryData = useMemo(() => {
    const byCat = {};
    thisMonth.forEach(t => {
      if (t.amount >= 0) return;
      const a = accounts.find(x => x.id === t.accountId);
      const ars = Math.abs(t.amount) * (FX_TO_ARS[a?.currency] || 0);
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + ars;
    });
    return Object.entries(byCat)
      .map(([id, value]) => {
        const cat = { comida: { label: 'Comida', color: '#F26B5E', icon: '🛒' }, vivienda: { label: 'Vivienda', color: '#7EC4F2', icon: '🏠' }, servicios: { label: 'Servicios', color: '#F2C94C', icon: '💡' }, salud: { label: 'Salud', color: '#5BB890', icon: '🩺' }, entretenimiento: { label: 'Entretenimiento', color: '#D4C5F9', icon: '🎬' }, ahorro: { label: 'Ahorro', color: '#F49B8A', icon: '🐷' }, ingreso: { label: 'Ingreso', color: '#5BB890', icon: '💰' }, otros: { label: 'Otros', color: '#B8B0A0', icon: '✨' } }[id] || { label: id, color: '#B8B0A0', icon: '✨' };
        return { id, value, ...cat };
      })
      .sort((a, b) => b.value - a.value);
  }, [thisMonth, accounts]);

  const flowData = useMemo(() => {
    let inc = 0, exp = 0;
    thisMonth.forEach(t => {
      const a = accounts.find(x => x.id === t.accountId);
      const ars = t.amount * (FX_TO_ARS[a?.currency] || 0);
      if (ars >= 0) inc += ars; else exp += Math.abs(ars);
    });
    return [
      { id: 'inc', label: 'Ingresos', value: inc, color: '#5BB890', icon: '⬆' },
      { id: 'exp', label: 'Egresos',  value: exp, color: '#F26B5E', icon: '⬇' },
    ];
  }, [thisMonth, accounts]);

  const monthNet = flowData[0].value - flowData[1].value;
  const mood = monthNet > flowData[0].value * 0.2 ? 'great' : monthNet > 0 ? 'ok' : 'warn';
  const mascotMood = { great: 'celebrating', ok: 'happy', warn: 'worried' }[mood];
  const mascotLine = useMemo(() => {
    const lines = MASCOT_COPY[personality]?.[mood] || MASCOT_COPY.motivadora[mood];
    return lines[Math.floor(Math.random() * lines.length)];
  }, [personality, mood]);

  const upsertTx = (tx) => {
    if (tx.id && transactions.find(t => t.id === tx.id)) {
      setTransactions(transactions.map(t => t.id === tx.id ? tx : t));
      showToast('Movimiento actualizado');
    } else {
      const newTx = { ...tx, id: 't' + Date.now() };
      setTransactions([newTx, ...transactions]);
      setAccounts(accounts.map(a => a.id === newTx.accountId ? { ...a, balance: a.balance + newTx.amount } : a));
      showToast('Movimiento agregado');
    }
  };

  const deleteTx = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setTransactions(transactions.filter(t => t.id !== id));
    setAccounts(accounts.map(a => a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a));
    showToast('Movimiento eliminado');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleReset = () => {
    localStorage.removeItem(LS_KEY);
    setAccounts(ACCOUNTS_SEED.map(a => ({ ...a, visible: true, balance: ACCOUNT_BALANCES[a.id] })));
    setTransactions(TRANSACTIONS_SEED);
    showToast('Datos reseteados');
  };

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
            <span className="fa-section-sub">{visibleAccounts.length} de {accounts.length} visibles</span>
          </header>
          <div className="fa-accounts">
            {accounts.map(a => (
              <AccountCard
                key={a.id}
                account={a}
                onToggle={() => toggleAccount(a.id)}
                privacy={privacy}
              />
            ))}
          </div>
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
            onDelete={deleteTx}
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

      {addOpen && (
        <AddTransactionModal
          accounts={accounts}
          editing={editingTx}
          onClose={() => { setAddOpen(false); setEditingTx(null); }}
          onSave={tx => { upsertTx(tx); setAddOpen(false); setEditingTx(null); }}
          onDelete={editingTx ? () => { deleteTx(editingTx.id); setAddOpen(false); setEditingTx(null); } : null}
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

      <SettingsPanel tweaks={tweaks} setTweak={setTweak} onReset={handleReset} />
    </div>
  );
};

export default App;
