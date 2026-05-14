import { useState, useEffect } from 'react';
import api from '../../api';

const STATUS_OPTIONS = [
  { value: '',          label: 'Tous les statuts' },
  { value: 'draft',     label: 'Brouillon' },
  { value: 'sent',      label: 'Envoyées' },
  { value: 'paid',      label: 'Payées' },
  { value: 'cancelled', label: 'Annulées' },
];

export default function BillingExportPage() {
  const [users, setUsers]     = useState([]);
  const [filters, setFilters] = useState({ status: '', client_id: '', date_from: '', date_to: '' });
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview]       = useState([]);

  useEffect(() => {
    api.get('/api/users').then(r => setUsers(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const buildParams = () => new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  );

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const { data } = await api.get(`/api/invoices?${buildParams()}`);
      setPreview(data.data || []);
    } catch (err) { console.error(err); }
    finally { setPreviewing(false); }
  };

  const handleExport = (type) => {
    const token = localStorage.getItem('mizan_token')
               || localStorage.getItem('accessToken')
               || localStorage.getItem('jwt')
               || '';
    // window.open ne peut pas envoyer de header, on passe le token en query param
    // assure-toi que ton backend accepte ?token= ou utilise une autre méthode
    window.open(`http://localhost:4000/api/invoices/export/${type}?${buildParams()}&token=${token}`, '_blank');
  };

  const total = preview.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const paid  = preview.reduce((s, i) => s + parseFloat(i.total_paid || 0), 0);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Export Facturation</h1>
      <p style={styles.subtitle}>Sélectionnez vos filtres puis exportez en Excel ou PDF.</p>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Filtres</h3>
        <div style={styles.grid}>
          <Field label="Statut">
            <select style={styles.select} value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Client (avocat / utilisateur)">
            <select style={styles.select} value={filters.client_id}
              onChange={e => setFilters(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Tous</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
          </Field>

          <Field label="Date début">
            <input type="date" style={styles.input} value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </Field>

          <Field label="Date fin">
            <input type="date" style={styles.input} value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </Field>
        </div>

        <div style={styles.actions}>
          <button style={styles.btnPreview} onClick={handlePreview} disabled={previewing}>
            {previewing ? '…' : '🔍 Prévisualiser'}
          </button>
          <button style={styles.btnExcelBtn} onClick={() => handleExport('excel')}>
            📊 Exporter Excel
          </button>
          <button style={styles.btnPdfBtn} onClick={() => handleExport('pdf')}>
            📄 Exporter PDF
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div style={styles.card}>
          <div style={styles.previewHeader}>
            <h3 style={{ margin: 0, color: '#1a365d', fontSize: 16 }}>
              Aperçu — {preview.length} facture(s)
            </h3>
            <div style={styles.previewStats}>
              <span>Total : <strong>{total.toLocaleString('fr-FR')} MAD</strong></span>
              <span>Encaissé : <strong style={{ color: '#276749' }}>{paid.toLocaleString('fr-FR')} MAD</strong></span>
              <span>Restant : <strong style={{ color: '#C05621' }}>{(total - paid).toLocaleString('fr-FR')} MAD</strong></span>
            </div>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                {['N° Facture', 'Client', 'Montant', 'Payé', 'Statut', 'Date'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((inv, i) => (
                <tr key={inv.id} style={{ background: i % 2 === 0 ? '#fff' : '#F7FAFC' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', color: '#2B6CB0' }}>{inv.invoice_number}</td>
                  <td style={styles.td}>{inv.client_name || '—'}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{Number(inv.amount).toLocaleString('fr-FR')} MAD</td>
                  <td style={{ ...styles.td, color: '#276749' }}>{Number(inv.total_paid || 0).toLocaleString('fr-FR')} MAD</td>
                  <td style={styles.td}><span style={styles.badge}>{inv.status}</span></td>
                  <td style={styles.td}>{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page:          { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#2d3748', maxWidth: 900, margin: '0 auto' },
  title:         { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#1a365d' },
  subtitle:      { margin: '0 0 24px', color: '#718096', fontSize: 14 },
  card:          { background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,.08)', padding: '24px', marginBottom: 20 },
  sectionTitle:  { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a365d' },
  grid:          { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  select:        { padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, background: '#fff', width: '100%' },
  input:         { padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  actions:       { display: 'flex', gap: 12 },
  btnPreview:    { padding: '9px 18px', background: '#EDF2F7', color: '#2d3748', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnExcelBtn:   { padding: '9px 18px', background: '#276749', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnPdfBtn:     { padding: '9px 18px', background: '#9B2C2C', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  previewStats:  { display: 'flex', gap: 20, fontSize: 13 },
  table:         { width: '100%', borderCollapse: 'collapse' },
  th:            { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4A5568', borderBottom: '2px solid #E2E8F0', background: '#F7FAFC' },
  td:            { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #EDF2F7' },
  badge:         { background: '#EDF2F7', color: '#4A5568', padding: '3px 10px', borderRadius: 12, fontSize: 12 },
};