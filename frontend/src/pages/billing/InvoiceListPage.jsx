import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const STATUS_LABELS = {
  draft:     { label: 'Brouillon',  color: '#718096', bg: '#EDF2F7' },
  sent:      { label: 'Envoyée',    color: '#2B6CB0', bg: '#EBF8FF' },
  paid:      { label: 'Payée',      color: '#276749', bg: '#F0FFF4' },
  cancelled: { label: 'Annulée',    color: '#9B2C2C', bg: '#FFF5F5' },
};

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ status: '', client_id: '', date_from: '', date_to: '' });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const { data } = await api.get('/api/invoices', { params });
      setInvoices(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleExport = (type) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    );
    window.open(`http://localhost:4000/api/invoices/export/${type}?${params}`, '_blank');
  };

  const totalAmount = invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalPaid   = invoices.reduce((s, i) => s + parseFloat(i.total_paid || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Factures</h1>
          <p style={styles.subtitle}>{invoices.length} facture(s) trouvée(s)</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => navigate('/invoices/new')}>
          + Nouvelle facture
        </button>
      </div>

      <div style={styles.statsRow}>
        <StatCard label="Total facturé"   value={`${totalAmount.toLocaleString('fr-FR')} MAD`} color="#2B6CB0" />
        <StatCard label="Total encaissé"  value={`${totalPaid.toLocaleString('fr-FR')} MAD`}   color="#276749" />
        <StatCard label="Solde restant"   value={`${(totalAmount - totalPaid).toLocaleString('fr-FR')} MAD`} color="#C05621" />
        <StatCard label="Nombre factures" value={invoices.length} color="#553C9A" />
      </div>

      <div style={styles.filtersBar}>
        <select style={styles.select} value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <input style={styles.input} type="date" value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        <input style={styles.input} type="date" value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={styles.btnOutline} onClick={() => handleExport('excel')}>↓ Excel</button>
          <button style={styles.btnOutline} onClick={() => handleExport('pdf')}>↓ PDF</button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>Chargement…</div>
        ) : invoices.length === 0 ? (
          <div style={styles.empty}>Aucune facture trouvée.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['N° Facture', 'Client', 'Dossier', 'Montant', 'Payé', 'Statut', 'Échéance', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => {
                const st = STATUS_LABELS[inv.status] || STATUS_LABELS.draft;
                return (
                  <tr key={inv.id} style={{ background: idx % 2 === 0 ? '#fff' : '#F7FAFC' }}>
                    <td style={styles.td}>
                      <span style={styles.invNumber}>{inv.invoice_number}</span>
                    </td>
                    <td style={styles.td}>{inv.client_name || '—'}</td>
                    <td style={styles.td}>{inv.case_title || '—'}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>
                      {Number(inv.amount).toLocaleString('fr-FR')} MAD
                    </td>
                    <td style={{ ...styles.td, color: '#276749' }}>
                      {Number(inv.total_paid || 0).toLocaleString('fr-FR')} MAD
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.btnSm} onClick={() => navigate(`/invoices/${inv.id}`)}>
                        Voir
                      </button>
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

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const styles = {
  page:         { padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#2d3748' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#1a365d' },
  subtitle:     { margin: '4px 0 0', color: '#718096', fontSize: 14 },
  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  statCard:     { background: '#fff', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  filtersBar:   { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  select:       { padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, background: '#fff', cursor: 'pointer' },
  input:        { padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14 },
  tableWrapper: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4A5568', borderBottom: '2px solid #E2E8F0', background: '#F7FAFC', whiteSpace: 'nowrap' },
  td:           { padding: '12px 16px', fontSize: 14, borderBottom: '1px solid #EDF2F7' },
  badge:        { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  invNumber:    { fontWeight: 600, color: '#2B6CB0', fontFamily: 'monospace' },
  btnPrimary:   { padding: '10px 20px', background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnOutline:   { padding: '8px 14px', background: '#fff', color: '#2B6CB0', border: '1px solid #2B6CB0', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  btnSm:        { padding: '5px 12px', background: '#EBF8FF', color: '#2B6CB0', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  loading:      { padding: 40, textAlign: 'center', color: '#718096' },
  empty:        { padding: 40, textAlign: 'center', color: '#A0AEC0' },
};