import { catById } from './constants';
import type { Currency } from '../types';

export { catById };

export const fmtMoney = (n: number, ccy: Currency | string = 'ARS', hide = false): string => {
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

export const fmtDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

export const loadState = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
};

export const saveState = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const loadOrder = (key: string): string[] => {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as string[]; } catch (_e) { return []; }
};

export const saveOrder = (key: string, ids: string[]): void => {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch (_e) { /* storage unavailable */ }
};

export const applyOrder = <T extends { id: string }>(items: T[], savedOrder: string[]): T[] => {
  if (!savedOrder.length) return items;
  const map = new Map(items.map(i => [i.id, i]));
  const ordered = savedOrder.flatMap(id => (map.has(id) ? [map.get(id)!] : []));
  const rest = items.filter(i => !savedOrder.includes(i.id));
  return [...ordered, ...rest];
};
