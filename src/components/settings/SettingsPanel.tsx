import { useState, useEffect } from 'react';
import { CATEGORIES } from '../../data/constants';
import type { Budget, Tweaks } from '../../types';

interface SettingsPanelProps {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  onLoadSeed: () => void;
  onClearAll: () => void;
  onSignOut: () => void;
  userEmail: string;
  userName: string;
  onUpdateName: (name: string) => Promise<void>;
  budgets: Budget[];
  onSetBudget: (categoryId: string, amount: number) => void;
  onRemoveBudget: (categoryId: string) => void;
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

interface ToggleBtnProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ACCENT_COLORS = ['#FF5C4D', '#5BB890', '#7EC4F2', '#D4C5F9', '#F2C94C'];

export const SettingsPanel = ({ tweaks, setTweak, onLoadSeed, onClearAll, onSignOut, userEmail, userName, onUpdateName, budgets, onSetBudget, onRemoveBudget }: SettingsPanelProps) => {
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>(() =>
    budgets.reduce<Record<string, string>>((acc, b) => ({ ...acc, [b.categoryId]: String(b.amount) }), {})
  );

  useEffect(() => {
    setBudgetInputs(budgets.reduce<Record<string, string>>((acc, b) => ({ ...acc, [b.categoryId]: String(b.amount) }), {}));
  }, [budgets]);

  const expenseCats = CATEGORIES.filter(c => c.id !== 'ingreso' && c.id !== 'transfer');

  return (
    <>
      <button
        className="fa-settings-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Configuración"
        style={{
          position: 'fixed', bottom: 32, left: 32,
          width: 48, height: 48,
          border: '2px solid var(--line, #1D1A18)',
          borderRadius: '50%',
          background: 'var(--bg-elev, #fff)',
          boxShadow: 'var(--shadow-stk, 4px 4px 0 #1D1A18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, cursor: 'pointer', zIndex: 50,
          transition: 'transform 120ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translate(0,0)')}
      >
        ⚙️
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'fixed', bottom: 90, left: 32, zIndex: 100,
            background: 'var(--bg-elev, #fff)',
            border: '2px solid var(--line, #1D1A18)',
            borderRadius: 24,
            boxShadow: 'var(--shadow-stk-lg, 6px 6px 0 #1D1A18)',
            padding: '20px 22px',
            width: 280,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ borderBottom: '2px dashed var(--line-soft, #DBCFB4)', paddingBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink, #1D1A18)', marginBottom: 8 }}>⚙️ Configuración</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="fa-input"
                  style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                />
                <button
                  onClick={async () => {
                    setSavingName(true);
                    await onUpdateName(editName.trim());
                    setSavingName(false);
                  }}
                  disabled={savingName || editName.trim() === userName}
                  style={{
                    padding: '6px 12px',
                    border: '2px solid var(--line, #1D1A18)',
                    borderRadius: 10,
                    background: 'white',
                    fontWeight: 700, fontSize: 12,
                    cursor: 'pointer',
                    color: 'var(--ink, #1D1A18)',
                    opacity: (savingName || editName.trim() === userName) ? 0.4 : 1,
                  }}
                >
                  {savingName ? '...' : 'OK'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted, #8A7E72)', marginTop: 4, wordBreak: 'break-all' }}>{userEmail}</div>
            </div>

            <Row label="Privacidad">
              <ToggleBtn
                checked={tweaks.privacy}
                onChange={v => setTweak('privacy', v)}
              />
            </Row>

            <Row label="Personalidad">
              <select
                value={tweaks.mascotPersonality}
                onChange={e => setTweak('mascotPersonality', e.target.value as Tweaks['mascotPersonality'])}
                style={selectStyle}
              >
                <option value="motivadora">Motivadora 🚀</option>
                <option value="sarcastica">Sarcástica 😏</option>
                <option value="chill">Chill ✨</option>
              </select>
            </Row>

            <Row label="Layout">
              <select
                value={tweaks.layout}
                onChange={e => setTweak('layout', e.target.value as Tweaks['layout'])}
                style={selectStyle}
              >
                <option value="saludo">Saludo</option>
                <option value="compact">Compacto</option>
                <option value="stacked">Apilado</option>
              </select>
            </Row>

            <Row label="Color principal">
              <div style={{ display: 'flex', gap: 8 }}>
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setTweak('primaryAccent', c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: c,
                      border: tweaks.primaryAccent === c
                        ? '3px solid var(--ink, #1D1A18)'
                        : '2px solid var(--line-soft, #DBCFB4)',
                      cursor: 'pointer',
                      transform: tweaks.primaryAccent === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 120ms',
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </Row>

            <div style={{ borderTop: '2px dashed var(--line-soft, #DBCFB4)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink, #1D1A18)' }}>Presupuestos mensuales (ARS)</div>
              {expenseCats.map(c => {
                const saved = budgets.find(b => b.categoryId === c.id);
                const val = budgetInputs[c.id] ?? '';
                const isDirty = val !== (saved ? String(saved.amount) : '');
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, width: 20 }}>{c.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, flex: 1, color: 'var(--ink, #1D1A18)' }}>{c.label}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val}
                      placeholder="—"
                      onChange={e => setBudgetInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                      style={{ width: 72, padding: '4px 8px', border: '2px solid var(--line, #1D1A18)', borderRadius: 8, fontWeight: 700, fontSize: 12, outline: 'none' }}
                    />
                    {isDirty && val && (
                      <button
                        onClick={() => { const n = parseFloat(val); if (n > 0) onSetBudget(c.id, n); }}
                        style={{ padding: '4px 8px', border: '2px solid var(--line, #1D1A18)', borderRadius: 8, background: 'var(--mint, #B8E6C9)', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
                      >
                        ✓
                      </button>
                    )}
                    {saved && !isDirty && (
                      <button
                        onClick={() => { onRemoveBudget(c.id); setBudgetInputs(prev => ({ ...prev, [c.id]: '' })); }}
                        style={{ padding: '4px 8px', border: '2px solid #C44A3D', borderRadius: 8, background: 'white', fontWeight: 800, fontSize: 11, cursor: 'pointer', color: '#C44A3D' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { onLoadSeed(); setOpen(false); }}
              style={{
                padding: '10px 16px',
                border: '2px solid var(--line, #1D1A18)',
                borderRadius: 999,
                background: 'white',
                fontWeight: 700, fontSize: 13,
                cursor: 'pointer',
                color: 'var(--ink, #1D1A18)',
                boxShadow: '2px 2px 0 var(--line, #1D1A18)',
                marginTop: 4,
              }}
            >
              Cargar datos de ejemplo
            </button>

            {confirmClear ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C44A3D', textAlign: 'center' }}>
                  ¿Borrar todo? Esta acción no se puede deshacer.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirmClear(false)}
                    style={{ flex: 1, padding: '8px', border: '2px solid var(--line, #1D1A18)', borderRadius: 999, background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { onClearAll(); setConfirmClear(false); setOpen(false); }}
                    style={{ flex: 1, padding: '8px', border: '2px solid #C44A3D', borderRadius: 999, background: '#C44A3D', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: 'white' }}
                  >
                    Sí, borrar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #C44A3D',
                  borderRadius: 999,
                  background: 'white',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                  color: '#C44A3D',
                  boxShadow: '2px 2px 0 #C44A3D',
                }}
              >
                Borrar todos los datos
              </button>
            )}

            <button
              onClick={onSignOut}
              style={{
                padding: '10px 16px',
                border: '2px solid #C44A3D',
                borderRadius: 999,
                background: 'white',
                fontWeight: 700, fontSize: 13,
                cursor: 'pointer',
                color: '#C44A3D',
                boxShadow: '2px 2px 0 #C44A3D',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </>
  );
};

const Row = ({ label, children }: RowProps) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #1D1A18)' }}>{label}</span>
    {children}
  </div>
);

const ToggleBtn = ({ checked, onChange }: ToggleBtnProps) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="fa-toggle"
    data-on={checked}
  >
    <span className="fa-toggle-dot" />
  </button>
);

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '2px solid var(--line, #1D1A18)',
  borderRadius: 10,
  background: 'white',
  fontWeight: 700, fontSize: 13,
  cursor: 'pointer',
  color: 'var(--ink, #1D1A18)',
  outline: 'none',
};
