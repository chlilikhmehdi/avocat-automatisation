import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const STATUS_LABELS = {
  draft:     { label: 'Brouillon',  color: '#718096', bg: '#EDF2F7' },
  sent:      { label: 'Envoyée',    color: '#2B6CB0', bg: '#EBF8FF' },
  paid:      { label: 'Payée',      color: '#276749', bg: '#F0FFF4' },
  cancelled: { label: 'Annulée',    color: '#9B2C2C', bg: '#FFF5F5' },
};

const METHOD_LABELS = {
  cash:     'Espèces',
  bank:     'Virement bancaire',
  card:     'Carte bancaire',
  transfer: 'Virement',
};

export default function InvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm]         = useState({
    amount: '', payment_method: 'bank',
    payment_date: new Date().toISOString().split('T')[0], reference: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/invoices/${id}`);
      setInvoice(data?.data || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const handleStatusChange = async (status) => {
    try {
      await api.put(`/api/invoices/${id}`, { status });
      fetchInvoice();
    } catch (err) { console.error(err); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/payments', { ...payForm, invoice_id: id });
      setShowPayForm(false);
      setPayForm({ amount: '', payment_method: 'bank', payment_date: new Date().toISOString().split('T')[0], reference: '' });
      fetchInvoice();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={styles.loading}>Chargement…</div>;
  if (!invoice) return <div style={styles.loading}>Facture introuvable.</div>;

  const st = STATUS_LABELS[invoice.status] || STATUS_LABELS.draft;
  const totalPaid = (invoice.payments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
  const remaining = parseFloat(invoice.amount) - totalPaid;

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate('/invoices')}>← Retour aux factures</button>

      <div style={styles.invoiceHeader}>
        <div>
          <div style={styles.invNumber}>{invoice.invoice_number}</div>
          <h1 style={styles.title}>Facture</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ ...styles.badge, color: st.color, background: st.bg, fontSize: 14, padding: '6px 14px' }}>
            {st.label}
          </span>
          {invoice.status === 'draft' && (
            <button style={styles.btnSend} onClick={() => handleStatusChange('sent')}>Marquer Envoyée</button>
          )}
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button style={styles.btnCancel} onClick={() => handleStatusChange('cancelled')}>Annuler</button>
          )}
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Informations</h3>
          <InfoRow label="N° Facture"    value={invoice.invoice_number} mono />
          <InfoRow label="Date émission" value={invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('fr-FR') : '—'} />
          <InfoRow label="Échéance"      value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '—'} />
          <InfoRow label="Avocat"        value={invoice.lawyer_name} />
          {invoice.description && (
            <div style={{ marginTop: 12 }}>
              <div style={styles.infoLabel}>Description</div>
              <div style={{ fontSize: 14, color: '#4A5568', marginTop: 4, lineHeight: 1.6 }}>{invoice.description}</div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Client</h3>
          <InfoRow label="Nom"   value={invoice.client_name} />
          <InfoRow label="Email" value={invoice.client_email} />
          <InfoRow label="Tél."  value={invoice.client_phone} />
          {invoice.case_title && (
            <>
              <div style={{ borderTop: '1px solid #E2E8F0', margin: '12px 0' }} />
              <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>Dossier</h3>
              <InfoRow label="Titre" value={invoice.case_title} />
              <InfoRow label="Type"  value={invoice.case_type} />
            </>
          )}
        </div>
      </div>

      <div style={styles.amountsBar}>
        <AmountCell label="Montant facturé" amount={invoice.amount} color="#2B6CB0" />
        <AmountCell label="Total encaissé"  amount={totalPaid}      color="#276749" />
        <AmountCell label="Reste à payer"   amount={remaining}      color={remaining > 0 ? '#C05621' : '#276749'} />
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Paiements ({(invoice.payments || []).length})</h3>
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button style={styles.btnAdd} onClick={() => setShowPayForm(v => !v)}>
              {showPayForm ? '✕ Fermer' : '+ Ajouter un paiement'}
            </button>
          )}
        </div>

        {showPayForm && (
          <form onSubmit={handlePayment} style={styles.payForm}>
            <div style={styles.payGrid}>
              <Field label="Montant (MAD) *">
                <input type="number" min="0" step="0.01" style={styles.input} required
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </Field>
              <Field label="Méthode">
                <select style={styles.input} value={payForm.payment_method}
                  onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" style={styles.input} value={payForm.payment_date}
                  onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              </Field>
              <Field label="Référence">
                <input type="text" style={styles.input} value={payForm.reference}
                  placeholder="N° chèque, virement…"
                  onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
              </Field>
            </div>
            <button type="submit" style={styles.btnSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer le paiement'}
            </button>
          </form>
        )}

        {(invoice.payments || []).length === 0 ? (
          <div style={{ color: '#A0AEC0', fontSize: 14, padding: '12px 0' }}>Aucun paiement enregistré.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date', 'Montant', 'Méthode', 'Référence'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#F7FAFC' }}>
                  <td style={styles.td}>{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#276749' }}>
                    {Number(p.amount).toLocaleString('fr-FR')} MAD
                  </td>
                  <td style={styles.td}>{METHOD_LABELS[p.payment_method] || p.payment_method}</td>
                  <td style={styles.td}>{p.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #EDF2F7' }}>
      <span style={{ fontSize: 13, color: '#718096' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', color: '#2d3748' }}>
        {value || '—'}
      </span>
    </div>
  );
}

function AmountCell({ label, amount, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{Number(amount).toLocaleString('fr-FR')} MAD</div>
      <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#4A5568' }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page:          { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#2d3748', maxWidth: 900, margin: '0 auto' },
  loading:       { padding: 60, textAlign: 'center', color: '#718096' },
  backBtn:       { background: 'none', border: 'none', color: '#2B6CB0', cursor: 'pointer', fontSize: 14, padding: '0 0 16px', display: 'block' },
  invoiceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  invNumber:     { fontSize: 13, color: '#718096', fontFamily: 'monospace', marginBottom: 4 },
  title:         { margin: 0, fontSize: 26, fontWeight: 700, color: '#1a365d' },
  badge:         { display: 'inline-block', borderRadius: 14, fontWeight: 700 },
  card:          { background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,.08)', padding: '20px 24px', marginBottom: 16 },
  sectionTitle:  { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1a365d' },
  infoLabel:     { fontSize: 12, color: '#718096', fontWeight: 600 },
  grid2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  amountsBar:    { display: 'flex', background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,.08)', padding: '20px 24px', marginBottom: 16 },
  payForm:       { background: '#F7FAFC', borderRadius: 8, padding: 16, marginBottom: 16 },
  payGrid:       { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 },
  input:         { padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  table:         { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th:            { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4A5568', borderBottom: '2px solid #E2E8F0', background: '#F7FAFC' },
  td:            { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #EDF2F7' },
  btnAdd:        { padding: '7px 14px', background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSubmit:     { padding: '8px 20px', background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnSend:       { padding: '7px 14px', background: '#276749', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnCancel:     { padding: '7px 14px', background: '#FFF5F5', color: '#9B2C2C', border: '1px solid #FC8181', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};