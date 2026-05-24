import { catById } from './constants';

export { catById };

export const fmtMoney = (n, ccy = 'ARS', hide = false) => {
  if (hide) return '••••••';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (ccy === 'ARS') {
    return `${sign}$ ${abs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
  }
  if (ccy === 'USD') {
    return `${sign}US$ ${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (ccy === 'USDT') {
    return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  }
  return `${sign}${abs}`;
};

export const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

export const loadState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const saveState = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};
