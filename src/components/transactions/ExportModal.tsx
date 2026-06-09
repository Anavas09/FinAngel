import { FinAngel, FinAngelMini } from '../mascot/Mascot';
import { catById, fmtMoney, fmtDate } from '../../data/utils';
import { FX_TO_ARS } from '../../data/constants';
import type { Account, Transaction } from '../../types';

interface ExportModalProps {
  accounts: Account[];
  transactions: Transaction[];
  totalARS: number;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ExportModal = ({ accounts, transactions, totalARS, onClose, onToast }: ExportModalProps) => {
  const totalIn = transactions
    .filter(t => t.amount > 0)
    .reduce((s, t) => {
      const a = accounts.find(x => x.id === t.accountId);
      return s + t.amount * (a ? FX_TO_ARS[a.currency] : 0);
    }, 0);

  const totalOut = transactions
    .filter(t => t.amount < 0)
    .reduce((s, t) => {
      const a = accounts.find(x => x.id === t.accountId);
      return s + Math.abs(t.amount) * (a ? FX_TO_ARS[a.currency] : 0);
    }, 0);

  const sanitizeCell = (val: string) =>
    /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;

  const downloadCSV = () => {
    const rows: (string | number)[][] = [
      ['Fecha', 'Cuenta', 'Moneda', 'Categoría', 'Nota', 'Monto'],
      ...transactions.map(t => {
        const a = accounts.find(x => x.id === t.accountId);
        return [
          t.date,
          sanitizeCell(a?.name ?? ''),
          a?.currency ?? '',
          sanitizeCell(catById(t.categoryId).label),
          sanitizeCell(t.note),
          t.amount,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finangel-resumen-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast('CSV descargado');
  };

  const downloadPDF = () => {
    window.print();
    onToast('Listo para imprimir o guardar como PDF');
  };

  return (
    <div className="fa-modal-wrap" onClick={onClose}>
      <div className="fa-modal fa-modal-wide" onClick={e => e.stopPropagation()}>
        <header className="fa-modal-head">
          <h3>Resumen para exportar</h3>
          <button className="fa-iconbtn fa-iconbtn-ghost" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <div className="fa-export-preview" id="fa-print-area">
          <div className="fa-export-header">
            <div>
              <span className="fa-export-eyebrow">Resumen FinAngel</span>
              <h2>Mayo 2026</h2>
              <span className="fa-export-sub">Generado el {new Date().toLocaleDateString('es-AR')}</span>
            </div>
            <FinAngel mood="happy" size={90} />
          </div>

          <div className="fa-export-stats">
            <div className="fa-export-stat">
              <span>Patrimonio (≈ ARS)</span>
              <strong>{fmtMoney(totalARS, 'ARS')}</strong>
            </div>
            <div className="fa-export-stat" style={{ background: '#E8F5EE' }}>
              <span>Ingresos</span>
              <strong style={{ color: '#3F8F69' }}>+{fmtMoney(totalIn, 'ARS')}</strong>
            </div>
            <div className="fa-export-stat" style={{ background: '#FDEDED' }}>
              <span>Egresos</span>
              <strong style={{ color: '#C13B3B' }}>-{fmtMoney(totalOut, 'ARS')}</strong>
            </div>
          </div>

          <h4 className="fa-export-h4">Movimientos</h4>
          <table className="fa-export-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cuenta</th>
                <th>Categoría</th>
                <th>Nota</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const a = accounts.find(x => x.id === t.accountId);
                const cat = catById(t.categoryId);
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{a?.name}</td>
                    <td>
                      <span style={{
                        background: `${cat.color}22`, color: cat.color,
                        padding: '2px 8px', borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {cat.icon} {cat.label}
                      </span>
                    </td>
                    <td>{t.note}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.amount >= 0 ? '#3F8F69' : '#C13B3B' }}>
                      {t.amount >= 0 ? '+' : ''}{fmtMoney(t.amount, a?.currency ?? 'ARS')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="fa-export-foot">
            <FinAngelMini size={24} mood="chill" />
            <span>Hecho con FinAngel · Tus finanzas, con onda</span>
          </div>
        </div>

        <div className="fa-modal-actions">
          <button type="button" className="fa-btn fa-btn-ghost" onClick={onClose}>Cerrar</button>
          <button type="button" className="fa-btn fa-btn-outline" onClick={downloadCSV}>↓ CSV</button>
          <button type="button" className="fa-btn fa-btn-primary" onClick={downloadPDF}>🖨 PDF</button>
        </div>
      </div>
    </div>
  );
};
