import { useState } from 'react';
import { FinAngelMini } from '../mascot/Mascot';
import { THEMES } from '../../hooks/useTheme';
import type { ThemeKey } from '../../types';

interface TopBarProps {
  onExport: () => void;
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
}

export const TopBar = ({ onExport, theme, setTheme }: TopBarProps) => {
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <header className="fa-topbar">
      <div className="fa-brand">
        <FinAngelMini size={36} mood="happy" />
        <div className="fa-brand-text">
          <span className="fa-brand-name">FinAngel</span>
          <span className="fa-brand-tag">Tus finanzas, con onda</span>
        </div>
      </div>

      <div className="fa-topbar-actions">
        <div style={{ position: 'relative' }}>
          <button
            className="fa-topbtn"
            onClick={() => setThemeOpen(o => !o)}
            title="Cambiar tema"
            aria-label="Cambiar tema"
          >
            <span>{THEMES[theme].emoji}</span>
            <span>{THEMES[theme].label}</span>
          </button>

          {themeOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                onClick={() => setThemeOpen(false)}
              />
              <div className="fa-theme-dropdown" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                zIndex: 100, display: 'flex', flexDirection: 'column', gap: 4,
                background: 'var(--bg-elev, #fff)', border: '2px solid var(--line, #1D1A18)',
                borderRadius: 18, padding: 8,
                boxShadow: 'var(--shadow-stk, 4px 4px 0 #1D1A18)',
                minWidth: 160,
              }}>
                {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, { label, emoji }]) => (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setThemeOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 12,
                      border: key === theme ? '2px solid var(--line, #1D1A18)' : '2px solid transparent',
                      background: key === theme ? 'var(--bg-warm, #FFE0B5)' : 'transparent',
                      fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      color: 'var(--ink, #1D1A18)',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span>{label}</span>
                    {key === theme && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="fa-topbtn fa-topbtn-primary" onClick={onExport}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
