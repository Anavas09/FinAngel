import { useEffect, useMemo, useState } from 'react';

import { fetchCreditCards, insertCreditCard, updateCreditCard, deleteCreditCardById } from '../lib/db';
import { loadOrder, saveOrder, applyOrder } from '../data/utils';

import type { Session } from '@supabase/supabase-js';
import type { CreditCard, CreditCardInput, Currency } from '../types';

const CARD_ORDER_KEY = 'finangel:credit-card-order';

export const useCreditCardsData = (
  session: Session | null,
  showToast: (msg: string, onUndo?: () => void) => void,
  fxRates: Record<Currency, number>,
) => {
  const [cards, setCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    if (!session) return;
    fetchCreditCards()
      .then(cs => setCards(applyOrder(cs, loadOrder(CARD_ORDER_KEY))))
      .catch(() => showToast('Error al cargar tarjetas'));
  }, [session?.user.id]);

  const addCard = (fields: Omit<CreditCardInput, 'id'>) => {
    const newCard: CreditCard = {
      ...fields,
      id: 'cc-' + crypto.randomUUID(),
      createdAt: new Date().toISOString().slice(0, 10),
    } as CreditCard;
    setCards(prev => [newCard, ...prev]);
    insertCreditCard(newCard, session!.user.id).catch(() => {
      setCards(prev => prev.filter(c => c.id !== newCard.id));
      showToast('Error al guardar la tarjeta');
    });
    showToast('Tarjeta agregada');
  };

  const editCard = (id: string, fields: Partial<Omit<CreditCard, 'id' | 'createdAt'>>) => {
    const prev = cards.find(c => c.id === id);
    if (!prev) return;
    const updated = { ...prev, ...fields };
    setCards(cs => cs.map(c => c.id === id ? updated : c));
    updateCreditCard(id, fields).catch(() => {
      setCards(cs => cs.map(c => c.id === id ? prev : c));
      showToast('Error al actualizar la tarjeta');
    });
    showToast('Tarjeta actualizada');
  };

  const removeCard = (id: string) => {
    const prev = cards.find(c => c.id === id);
    if (!prev) return;
    setCards(cs => cs.filter(c => c.id !== id));
    deleteCreditCardById(id).catch(() => {
      setCards(cs => [prev, ...cs]);
      showToast('Error al eliminar la tarjeta');
    });
    showToast('Tarjeta eliminada', () => {
      setCards(cs => [prev, ...cs]);
      insertCreditCard(prev, session!.user.id).catch(() => {
        setCards(cs => cs.filter(c => c.id !== id));
        showToast('Error al restaurar la tarjeta');
      });
    });
  };

  const markCardClosed = (id: string) => editCard(id, { status: 'closed' });
  const reopenCard     = (id: string) => editCard(id, { status: 'active' });

  const partialPayCard = (id: string, amount: number) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    editCard(id, { currentBalance: Math.max(0, card.currentBalance - Math.abs(amount)) });
  };

  // delta > 0: more paid (reduce balance), delta < 0: less paid (restore balance)
  const adjustCardPayment = (id: string, delta: number) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    editCard(id, { currentBalance: Math.max(0, card.currentBalance - delta) });
  };

  const totalCardBalanceARS = useMemo(
    () => cards
      .filter(c => c.status === 'active')
      .reduce((s, c) => s + c.currentBalance * (fxRates[c.currency] ?? 1), 0),
    [cards, fxRates],
  );

  const reorderCards = (ids: string[]) => {
    saveOrder(CARD_ORDER_KEY, ids);
    setCards(prev => applyOrder(prev, ids));
  };

  const clearCards = () => setCards([]);

  return { cards, addCard, editCard, removeCard, markCardClosed, reopenCard, partialPayCard, adjustCardPayment, totalCardBalanceARS, reorderCards, clearCards };
};
