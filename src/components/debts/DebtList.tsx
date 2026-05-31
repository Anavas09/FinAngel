import type { Debt, DebtInput } from '../../types';
import { fmtMoney, fmtDate } from '../../data/utils';

interface DebtListProps {
  debts: Debt[];
  totalDebtARS: number;
  privacy: boolean;
  onAdd: () => void;
  onEdit: (debt: DebtInput) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

const getDebtStatus = (debt: Debt): 'paid' | 'overdue' | 'active' => {
  if (debt.status === 'paid') return 'paid';
  if (debt.dueDate && debt.dueDate < new Date().toISOString().slice(0, 10)) return 'overdue';
  return 'active';
};

const STATUS_LABELS: Record<string, string> = {
  active:  'Activa',
  paid:    'Pagada',
  overdue: 'Vencida',
};

const STATUS_COLORS: Record<string, string> = {
  active:  'var(--accent, #FF5C4D)',
  paid:    '#5BB890',
  overdue: '#F26B5E',
};

export const DebtList = ({ debts, totalDebtARS, privacy, onAdd, onEdit, onDelete, onMarkPaid }: DebtListProps) => {
  const activeDebts = debts.filter(d => d.status === 'active');
  const paidDebts   = debts.filter(d => d.status === 'paid');

  return (
    <section className="fa-section fa-debts">
      <header className="fa-section-head">
        <h2>Deudas</h2>
        <button className="fa-link" onClick={onAdd}>+ Agregar</button>
      </header>

      {debts.length === 0 ? (
        <div className="fa-empty">
          <p style={{ marginBottom: 8 }}>Sin deudas registradas. 🎉</p>
          <button className="fa-btn fa-btn-primary" onClick={onAdd}>Registrar deuda</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...activeDebts, ...paidDebts].map(debt => {
              const status   = getDebtStatus(debt);
              const paid     = debt.totalAmount > 0 ? Math.min((debt.totalAmount - debt.remainingAmount) / debt.totalAmount, 1) : 1;
              const paidPct  = Math.round(paid * 100);

              return (
                <div
                  key={debt.id}
                  className="fa-debt"
                  style={{
                    background: 'var(--bg-elev, #fff)',
                    border: '2px solid var(--line-soft, #DBCFB4)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    opacity: debt.status === 'paid' ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {debt.name}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px',
                          borderRadius: 20, background: STATUS_COLORS[status],
                          color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {STATUS_LABELS[status]}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: status === 'paid' ? '#5BB890' : 'var(--ink, #1D1A18)' }}>
                          {fmtMoney(debt.remainingAmount, debt.currency, privacy)}
                        </span>
                        {debt.totalAmount !== debt.remainingAmount && (
                          <span style={{ fontSize: 12, opacity: 0.55 }}>
                            de {fmtMoney(debt.totalAmount, debt.currency, privacy)}
                          </span>
                        )}
                      </div>

                      {/* Barra de progreso */}
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--line-soft, #DBCFB4)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          background: status === 'paid' ? '#5BB890' : STATUS_COLORS[status],
                          width: `${paidPct}%`,
                          transition: 'width 400ms ease',
                        }} />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, opacity: 0.65 }}>
                        <span>{paidPct}% pagado</span>
                        {debt.monthlyPayment != null && (
                          <span>Cuota: {fmtMoney(debt.monthlyPayment, debt.currency, privacy)}</span>
                        )}
                        {debt.dueDate && (
                          <span style={{ color: status === 'overdue' ? '#F26B5E' : 'inherit' }}>
                            Vence: {fmtDate(debt.dueDate)}
                          </span>
                        )}
                        {debt.interestRate != null && (
                          <span>TNA: {debt.interestRate}%</span>
                        )}
                        {debt.note && <span>{debt.note}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      {debt.status === 'active' && (
                        <button
                          className="fa-iconbtn fa-iconbtn-ghost"
                          onClick={() => onMarkPaid(debt.id)}
                          title="Marcar como pagada"
                          style={{ fontSize: 16 }}
                        >✓</button>
                      )}
                      <button
                        className="fa-iconbtn fa-iconbtn-ghost"
                        onClick={() => onEdit({ ...debt })}
                        title="Editar"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="fa-iconbtn fa-iconbtn-ghost"
                        onClick={() => onDelete(debt.id)}
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
            })}
          </div>

          {activeDebts.length > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'var(--bg-elev, #fff)',
              border: '2px solid var(--line-soft, #DBCFB4)',
              borderRadius: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, opacity: 0.7 }}>Total deuda pendiente en ARS</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#F26B5E' }}>
                {fmtMoney(totalDebtARS, 'ARS', privacy)}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
};
