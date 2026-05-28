import type { AccountSeed, Category, Currency, MascotMood, MascotPersonality, Transaction, Tweaks } from '../types';

export const ACCOUNTS_SEED: AccountSeed[] = [
  { id: 'ars',    name: 'Cuenta ARS',      kind: 'Banco',     currency: 'ARS',  symbol: '$',   color: '#7EC4F2', emoji: '🇦🇷' },
  { id: 'mp',     name: 'Mercado Pago',    kind: 'Billetera', currency: 'ARS',  symbol: '$',   color: '#B8E6C9', emoji: '💳' },
  { id: 'usd',    name: 'Cuenta USD',      kind: 'Banco',     currency: 'USD',  symbol: 'US$', color: '#FFD66B', emoji: '💵' },
  { id: 'tc',     name: 'Tarjeta crédito', kind: 'Crédito',   currency: 'ARS',  symbol: '$',   color: '#F4A8C0', emoji: '💳' },
  { id: 'crypto', name: 'Cripto wallet',   kind: 'Cripto',    currency: 'USDT', symbol: '',    color: '#D4C5F9', emoji: '🪙' },
];

export const CATEGORIES: Category[] = [
  { id: 'comida',           label: 'Comida',          color: '#F26B5E', icon: '🛒' },
  { id: 'vivienda',         label: 'Vivienda',        color: '#7EC4F2', icon: '🏠' },
  { id: 'servicios',        label: 'Servicios',       color: '#F2C94C', icon: '💡' },
  { id: 'salud',            label: 'Salud',           color: '#5BB890', icon: '🩺' },
  { id: 'entretenimiento',  label: 'Entretenimiento', color: '#D4C5F9', icon: '🎬' },
  { id: 'ahorro',           label: 'Ahorro',          color: '#F49B8A', icon: '🐷' },
  { id: 'ingreso',          label: 'Ingreso',         color: '#5BB890', icon: '💰' },
  { id: 'otros',            label: 'Otros',           color: '#B8B0A0', icon: '✨' },
  { id: 'transfer',         label: 'Transferencia',   color: '#A78BFA', icon: '↔️' },
];

export const catById = (id: string): Category =>
  CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const FX_TO_ARS: Record<Currency, number> = { ARS: 1, USD: 1180, USDT: 1190 };

export const ACCOUNT_BALANCES: Record<string, number> = {
  ars: 540320,
  mp: 86450,
  usd: 1820,
  tc: -78600,
  crypto: 1240,
};

export const TRANSACTIONS_SEED: Transaction[] = [
  { id: 't1',  date: '2026-05-20', accountId: 'mp',     categoryId: 'comida',          amount: -8450,   note: 'Súper de la semana' },
  { id: 't2',  date: '2026-05-19', accountId: 'ars',    categoryId: 'vivienda',        amount: -210000, note: 'Alquiler mayo' },
  { id: 't3',  date: '2026-05-18', accountId: 'ars',    categoryId: 'ingreso',         amount: 850000,  note: 'Sueldo' },
  { id: 't4',  date: '2026-05-17', accountId: 'mp',     categoryId: 'entretenimiento', amount: -4200,   note: 'Netflix + Spotify' },
  { id: 't5',  date: '2026-05-16', accountId: 'tc',     categoryId: 'comida',          amount: -12300,  note: 'Cena con amigos' },
  { id: 't6',  date: '2026-05-15', accountId: 'ars',    categoryId: 'servicios',       amount: -38500,  note: 'Luz + Internet' },
  { id: 't7',  date: '2026-05-14', accountId: 'usd',    categoryId: 'ahorro',          amount: 250,     note: 'Compra mensual USD' },
  { id: 't8',  date: '2026-05-12', accountId: 'mp',     categoryId: 'salud',           amount: -6800,   note: 'Farmacia' },
  { id: 't9',  date: '2026-05-10', accountId: 'crypto', categoryId: 'ahorro',          amount: 120,     note: 'DCA USDT' },
  { id: 't10', date: '2026-05-08', accountId: 'mp',     categoryId: 'comida',          amount: -3200,   note: 'Café ☕' },
];

export const MASCOT_COPY: Record<MascotPersonality, Record<MascotMood, string[]>> = {
  motivadora: {
    great: ['¡Vas genial este mes!', 'Tus ahorros están en racha 🚀', 'Que sigan los buenos hábitos'],
    ok:    ['Vas bien, sin sustos', 'El mes pinta estable', 'Equilibrio: el arte secreto'],
    warn:  ['Ojo con los gastos, pero todo se puede', '¡Vamos que llegamos!', 'Pequeños ajustes, gran impacto'],
  },
  sarcastica: {
    great: ['Wow, ¿te ganaste la lotería?', 'Mirá vos, todo un Warren Buffett', 'Genial, ahora no lo gastes en delivery'],
    ok:    ['Estable, como tu vida amorosa', 'Ni fu ni fa. Te llevo.', 'Bueno, podría ser peor'],
    warn:  ['Ehhh... ¿charlamos?', '¿Otra vez al delivery?', 'Tu billetera está pidiendo agua'],
  },
  chill: {
    great: ['Todo fluye ✨', 'Tranqui, vas bien', 'Vibes financieras: aprobadas'],
    ok:    ['Equilibrado, como debe ser', 'Sin novedad. Buenísimo.', 'Vas en ritmo'],
    warn:  ['Bajá un cambio con los gastos', 'Respiremos y reordenemos', 'Tranqui, ajustemos un poco'],
  },
};

export const DEFAULT_TWEAKS: Tweaks = {
  privacy: false,
  mascotPersonality: 'motivadora',
  layout: 'saludo',
  primaryAccent: '#FF5C4D',
};

export const LS_KEY = 'finangel:v1';
export const LS_TWEAKS_KEY = 'finangel:tweaks';
