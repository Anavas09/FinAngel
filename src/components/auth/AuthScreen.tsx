import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FinAngel } from '../mascot/Mascot';

export const AuthScreen = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Revisá tu email para confirmar el registro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg, #FFF8F0)', padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-elev, #fff)',
        border: '2px solid var(--line, #1D1A18)',
        borderRadius: 28,
        boxShadow: 'var(--shadow-stk-lg, 6px 6px 0 #1D1A18)',
        padding: '36px 32px',
        width: '100%', maxWidth: 380,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <FinAngel mood="happy" size={80} />
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink, #1D1A18)', margin: '8px 0 0' }}>
          FinAngel
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-muted, #8A7E72)', margin: '0 0 16px' }}>
          Tus finanzas, con onda
        </p>

        <form onSubmit={submit} className="fa-form" style={{ width: '100%' }}>
          <label className="fa-field">
            <span className="fa-field-label">Email</span>
            <input
              className="fa-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="fa-field">
            <span className="fa-field-label">Contraseña</span>
            <input
              className="fa-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && (
            <p style={{ fontSize: 13, color: '#C44A3D', fontWeight: 600, margin: 0 }}>{error}</p>
          )}
          {message && (
            <p style={{ fontSize: 13, color: '#3F8F69', fontWeight: 600, margin: 0 }}>{message}</p>
          )}

          <button
            type="submit"
            className="fa-btn fa-btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </form>

        <button
          className="fa-link"
          style={{ marginTop: 8, fontSize: 13 }}
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }}
        >
          {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>
      </div>
    </div>
  );
};
