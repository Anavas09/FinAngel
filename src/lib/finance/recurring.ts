import type { Transaction } from '../../types';

const isoWeekKey = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const autoGenerateRecurring = (txs: Transaction[], now: Date): Transaction[] => {
  const generated: Transaction[] = [];
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentWeek = isoWeekKey(now);
  const today = now.toISOString().slice(0, 10);

  txs.filter(t => t.recurring).forEach((t, i) => {
    const period   = t.recurring === 'monthly' ? currentMonth : currentWeek;
    const txPeriod = t.recurring === 'monthly' ? t.date.slice(0, 7) : isoWeekKey(new Date(t.date));
    if (txPeriod === period) return;

    const alreadyExists = txs.some(
      x => !x.recurring &&
           (t.recurring === 'monthly'
             ? x.date.startsWith(currentMonth)
             : isoWeekKey(new Date(x.date)) === currentWeek) &&
           x.note === t.note && x.accountId === t.accountId && x.amount === t.amount
    );
    if (alreadyExists) return;

    generated.push({
      id: crypto.randomUUID(),
      date: today,
      accountId: t.accountId,
      categoryId: t.categoryId,
      amount: t.amount,
      note: t.note,
    });
  });
  return generated;
};
