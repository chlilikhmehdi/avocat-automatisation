// pages/billing/PaymentsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const METHOD_LABELS = {
  cash:     { label: 'Espèces',         icon: '💵' },
  bank:     { label: 'Virement bancaire', icon: '🏦' },
  card:     { label: 'Carte bancaire',   icon: '💳' },
  transfer: { label: 'Virement',         icon: '↗️'  },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ date_from: '', date_to: '' });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const { data } = await axios.get('/api/payments', { params });
      setPayments(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const totalAmount = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  // Répartition par méthode
  const byMethod = payments.reduce((acc, p) => {
    acc[p.payment_method] = (acc[p.payment_method] || 0) + parseFloat(p.amount || 0);
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Historique des Paiements</h1>
          <p style={styles.subtitle}>{payments.length} paiement(s)</p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard label="Total encaissé" value={`${totalAmount.toLocaleString('fr-FR')} MAD`} color="#276749" />
        {Object.entries(byMethod).map(([method, amount]) => {
          const m = METHOD_LABELS[method] || { label: method, icon: '💰' };
          return (
            <StatCard
              key={method}
              label={m.label}
              value={`${amount.toLocaleString('fr-FR')} MAD`}
              icon={m.icon}
              color="#2B6CB0"
            />
          );
        })}
      </div>

      {/* Filtres */}
      <div style={styles.filtersBar}>
        <label style={styles.filterLabel}>Du</label>
        <input type="date" style={styles.input} value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        <label style={styles.filterLabel}>Au</label>
        <input type="date" style={styles.input} value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        {(filters.date_from || filters.date_to) && (
          <button style={styles.btnReset} onClick={() => setFilters({ date_from: '', date_to: '' })}>
            Effacer filtres
          </button>
        )}
      </div>

      {/* Tableau */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>Chargement…</div>
        ) : payments.length === 0 ? (
          <div style={styles.empty}>Aucun paiement trouvé.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date', 'N° Facture', 'Client', 'Montant', 'Méthode', 'Référence'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const m = METHOD_LABELS[p.payment_method] || { label: p.payment_method, icon: '💰' };
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#F7FAFC' }}>
                    <td style={styles.td}>{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                    <td style={styles.td}>
                      <span style={styles.invNum}>{p.invoice_number}</span>
                    </td>
                    <td style={styles.td}>{p.client_name || '—'}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#276749' }}>
                      {Number(p.amount).toLocaleString('fr-FR')} MAD
                    </td>
                    <td style={styles.td}>
                      <span style={styles.methodBadge}>
                        {m.icon} {m.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', color: '#4A5568' }}>
                      {p.reference || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{icon ? `${icon} ` : ''}{value}</div>
      <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const styles = {
  page:        { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#2d3748' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#1a365d' },
  subtitle:    { margin: '4px 0 0', color: '#718096', fontSize: 14 },
  statsRow:    { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  statCard:    { background: '#fff', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', minWidth: 160 },
  filtersBar:  { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 },
  filterLabel: { fontSize: 13, color: '#4A5568', fontWeight: 500 },
  input:       { padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14 },
  btnReset:    { padding: '7px 14px', background: '#FFF5F5', color: '#9B2C2C', border: '1px solid #FC8181', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tableWrapper:{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4A5568', borderBottom: '2px solid #E2E8F0', background: '#F7FAFC' },
  td:          { padding: '11px 16px', fontSize: 13, borderBottom: '1px solid #EDF2F7' },
  invNum:      { fontFamily: 'monospace', color: '#2B6CB0', fontWeight: 600 },
  methodBadge: { background: '#EDF2F7', color: '#4A5568', padding: '3px 10px', borderRadius: 12, fontSize: 12 },
  loading:     { padding: 40, textAlign: 'center', color: '#718096' },
  empty:       { padding: 40, textAlign: 'center', color: '#A0AEC0' },
};