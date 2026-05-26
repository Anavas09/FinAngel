import { useState } from 'react';
import type { Tweaks } from '../../types';

interface SettingsPanelProps {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  onLoadSeed: () => void;
  onClearAll: () => void;
  onSignOut: () => void;
  userEmail: string;
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

export const SettingsPanel = ({ tweaks, setTweak, onLoadSeed, onClearAll, onSignOut, userEmail }: SettingsPanelProps) => {
  const [open, setOpen] = useState(false);

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
            <div style={{ borderBottom: '2px dashed var(--line-soft, #DBCFB4)', paddingBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink, #1D1A18)' }}>⚙️ Configuración</div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted, #8A7E72)', marginTop: 2, wordBreak: 'break-all' }}>{userEmail}</div>
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

            <button
              onClick={() => { onClearAll(); setOpen(false); }}
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
