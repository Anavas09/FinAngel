import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { fmtMoney } from '../../data/utils';

import type { DragEndEvent } from '@dnd-kit/core';
import type { CreditCard, CreditCardInput } from '../../types';

interface CreditCardListProps {
  cards: CreditCard[];
  totalCardBalanceARS: number;
  privacy: boolean;
  onAdd: () => void;
  onEdit: (card: CreditCardInput) => void;
  onDelete: (id: string) => void;
  onMarkClosed: (id: string) => void;
  onReopenCard: (id: string) => void;
  onPayCard: (card: CreditCard) => void;
  onReorder: (ids: string[]) => void;
}

const utilizationColor = (pct: number) =>
  pct >= 80 ? '#C13B3B' : pct >= 50 ? '#E8A838' : '#5BB890';

interface CardProps {
  card: CreditCard;
  privacy: boolean;
  onEdit: (card: CreditCardInput) => void;
  onDelete: (id: string) => void;
  onMarkClosed: (id: string) => void;
  onReopenCard: (id: string) => void;
  onPayCard: (card: CreditCard) => void;
  sortable: boolean;
}

const CreditCardCard = ({ card, privacy, onEdit, onDelete, onMarkClosed, onReopenCard, onPayCard, sortable }: CardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, disabled: !sortable });

  const available   = Math.max(0, card.creditLimit - card.currentBalance);
  const overlimit   = card.currentBalance > card.creditLimit;
  const utilizPct   = card.creditLimit > 0 ? Math.min(card.currentBalance / card.creditLimit * 100, 100) : 0;
  const barColor    = utilizationColor(utilizPct);

  const showInterest = (card.interestRate ?? 0) > 0 && card.currentBalance > 0;
  const minPayment   = card.currentBalance * ((card.minPaymentPct ?? 5) / 100);
  const interestEst  = showInterest ? (card.currentBalance - minPayment) * (card.interestRate! / 12 / 100) : 0;

  return (
    <div
      ref={setNodeRef}
      className="fa-credit-card"
      style={{
        background: 'var(--bg-elev, #fff)',
        border: '2px solid var(--line-soft, #DBCFB4)',
        borderRadius: 14,
        padding: '14px 16px',
        opacity: isDragging ? 0.5 : card.status === 'closed' ? 0.6 : 1,
        ...(transform ? { transform: CSS.Transform.toString(transform) } : {}),
        transition,
        position: 'relative',
      }}
    >
      {sortable && (
        <button
          className="fa-drag-handle"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
          tabIndex={-1}
        >
          ⠿
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              💳 {card.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 20,
              background: card.status === 'active' ? 'var(--accent, #FF5C4D)' : '#888',
              color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {card.status === 'active' ? 'Activa' : 'Cerrada'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>
              {fmtMoney(card.currentBalance, card.currency, privacy)}
            </span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>saldo actual</span>
          </div>

          {overlimit ? (
            <span style={{ fontSize: 12, color: '#C13B3B', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              ⚠ Límite excedido
            </span>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 6 }}>
              Disponible: {fmtMoney(available, card.currency, privacy)}
            </span>
          )}

          <div style={{ height: 6, borderRadius: 999, background: 'var(--line-soft, #DBCFB4)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: barColor,
              width: `${utilizPct}%`,
              transition: 'width 400ms ease',
            }} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, opacity: 0.65, marginBottom: showInterest ? 8 : 0 }}>
            <span>Límite: {fmtMoney(card.creditLimit, card.currency, privacy)}</span>
            <span>{Math.round(utilizPct)}% utilizado</span>
            {card.closingDay != null && <span>Cierra día {card.closingDay}</span>}
            {card.dueDay != null && <span>Vence día {card.dueDay}</span>}
            {card.interestRate != null && <span>TNA: {card.interestRate}%</span>}
            {card.note && <span>{card.note}</span>}
          </div>

          {showInterest && card.currentBalance > 0 && (
            <div style={{
              fontSize: 12, color: '#C13B3B',
              background: 'rgba(193,59,59,0.07)',
              borderRadius: 8, padding: '6px 10px',
            }}>
              ⚠ Mínimo: {fmtMoney(minPayment, card.currency, privacy)} · Si no pagás el total, generarás ~{fmtMoney(interestEst, card.currency, false)} de interés
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {card.status === 'active' && card.currentBalance > 0 && (
            <button
              className="fa-iconbtn fa-iconbtn-ghost"
              onClick={() => onPayCard(card)}
              title="Registrar pago"
              style={{ fontSize: 14 }}
            >💸</button>
          )}
          {card.status === 'active' ? (
            <button
              className="fa-iconbtn fa-iconbtn-ghost"
              onClick={() => onMarkClosed(card.id)}
              title="Cerrar tarjeta"
              style={{ fontSize: 14, opacity: 0.6 }}
            >✕</button>
          ) : (
            <button
              className="fa-iconbtn fa-iconbtn-ghost"
              onClick={() => onReopenCard(card.id)}
              title="Reactivar tarjeta"
              style={{ fontSize: 14 }}
            >↺</button>
          )}
          <button
            className="fa-iconbtn fa-iconbtn-ghost"
            onClick={() => onEdit({ ...card })}
            title="Editar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="fa-iconbtn fa-iconbtn-ghost"
            onClick={() => onDelete(card.id)}
            title="Eliminar"
            style={{ color: '#F26B5E' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreditCardList = ({
  cards, totalCardBalanceARS, privacy, onAdd, onEdit, onDelete,
  onMarkClosed, onReopenCard, onPayCard, onReorder,
}: CreditCardListProps) => {
  const activeCards = cards.filter(c => c.status === 'active');
  const closedCards = cards.filter(c => c.status === 'closed');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const allIds = cards.map(c => c.id);
    const from   = allIds.indexOf(active.id as string);
    const to     = allIds.indexOf(over.id as string);
    onReorder(arrayMove(allIds, from, to));
  };

  return (
    <section className="fa-section fa-credit-cards">
      <header className="fa-section-head">
        <h2>Tarjetas de crédito</h2>
        <button className="fa-link" onClick={onAdd}>+ Agregar</button>
      </header>

      {cards.length === 0 ? (
        <div className="fa-empty">
          <p style={{ marginBottom: 8 }}>Sin tarjetas registradas.</p>
          <button className="fa-btn fa-btn-primary" onClick={onAdd}>Agregar tarjeta</button>
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={activeCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeCards.map(card => (
                  <CreditCardCard
                    key={card.id}
                    card={card}
                    privacy={privacy}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMarkClosed={onMarkClosed}
                    onReopenCard={onReopenCard}
                    onPayCard={onPayCard}
                    sortable
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {closedCards.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: activeCards.length > 0 ? 10 : 0 }}>
              {closedCards.map(card => (
                <CreditCardCard
                  key={card.id}
                  card={card}
                  privacy={privacy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMarkClosed={onMarkClosed}
                  onReopenCard={onReopenCard}
                  onPayCard={onPayCard}
                  sortable={false}
                />
              ))}
            </div>
          )}

          {activeCards.length > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'var(--bg-elev, #fff)',
              border: '2px solid var(--line-soft, #DBCFB4)',
              borderRadius: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, opacity: 0.7 }}>Total saldo tarjetas en ARS</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#C13B3B' }}>
                {fmtMoney(totalCardBalanceARS, 'ARS', privacy)}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
};
