// pages/billing/InvoiceFormPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// apiClient créé UNE SEULE FOIS en dehors du composant
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mizan_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [cases,   setCases]   = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({
    client_id:   '',
    case_id:     '',
    amount:      '',
    description: '',
    issue_date:  new Date().toISOString().split('T')[0],
    due_date:    '',
  });

  useEffect(() => {
    // ✅ BUG 1 CORRIGÉ : un seul appel par ressource, avec apiClient
    apiClient.get('/clients')
      .then(res => {
        console.log('clients reçus:', res.data);
        setClients(res.data.data || res.data || []);
      })
      .catch(err => console.error('Erreur clients:', err.response?.status, err.response?.data));

    apiClient.get('/cases-list')
      .then(res => {
        console.log('cases reçus:', res.data);
        setCases(res.data.data || res.data || []);
      })
      .catch(err => console.error('Erreur cases:', err.response?.status, err.response?.data));
  }, []);

  const filteredCases = form.client_id
    ? cases.filter(c => String(c.client_id) === String(form.client_id))
    : cases;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.client_id || !form.amount) {
      setError('Veuillez renseigner le client et le montant.');
      return;
    }
    setSaving(true);
    try {
      // ✅ BUG 2 CORRIGÉ : utilisait 'localhost:...' sans https → maintenant apiClient
      const { data } = await apiClient.post('/invoices', form);
      navigate(`/invoices/${data.data.id}`);
    } catch (err) {
      console.error('Erreur création facture:', err.response?.data);
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <button style={styles.backBtn} onClick={() => navigate('/invoices')}>← Retour</button>
          <h2 style={styles.title}>Nouvelle Facture</h2>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.grid2}>

            {/* Client */}
            <Field label="Client *">
              <select name="client_id" value={form.client_id} onChange={handleChange} style={styles.select} required>
                <option value="">Sélectionner un client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {/* ✅ BUG 3 CORRIGÉ : colonne s'appelle 'nom' pas 'first_name' */}
                    {c.nom}
                  </option>
                ))}
              </select>
            </Field>

            {/* Dossier */}
            <Field label="Dossier (optionnel)">
              <select name="case_id" value={form.case_id} onChange={handleChange} style={styles.select}>
                <option value="">Aucun dossier</option>
                {filteredCases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.titre || c.reference || c.nom}
                  </option>
                ))}
              </select>
            </Field>

            {/* Montant */}
            <Field label="Montant (MAD) *">
              <input
                name="amount" type="number" min="0" step="0.01"
                value={form.amount} onChange={handleChange}
                style={styles.input} placeholder="0.00" required
              />
            </Field>

            {/* Date émission */}
            <Field label="Date d'émission">
              <input
                name="issue_date" type="date"
                value={form.issue_date} onChange={handleChange}
                style={styles.input}
              />
            </Field>

            {/* Échéance */}
            <Field label="Date d'échéance">
              <input
                name="due_date" type="date"
                value={form.due_date} onChange={handleChange}
                style={styles.input}
              />
            </Field>
          </div>

          <Field label="Description / Objet" style={{ marginTop: 16 }}>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              style={{ ...styles.input, height: 100, resize: 'vertical' }}
              placeholder="Détail des prestations…"
            />
          </Field>

          {form.amount && (
            <div style={styles.amountPreview}>
              <span>Montant total :</span>
              <strong style={{ color: '#1a365d', fontSize: 20 }}>
                {Number(form.amount).toLocaleString('fr-FR')} MAD
              </strong>
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.btnCancel} onClick={() => navigate('/invoices')}>
              Annuler
            </button>
            <button type="submit" style={styles.btnSubmit} disabled={saving}>
              {saving ? 'Création…' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page:          { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#2d3748', maxWidth: 800, margin: '0 auto' },
  card:          { background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,.1)', padding: 32 },
  cardHeader:    { marginBottom: 24 },
  backBtn:       { background: 'none', border: 'none', color: '#2B6CB0', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 12 },
  title:         { margin: 0, fontSize: 22, fontWeight: 700, color: '#1a365d' },
  grid2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  select:        { padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, background: '#fff', width: '100%' },
  input:         { padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  errorBox:      { background: '#FFF5F5', border: '1px solid #FC8181', color: '#9B2C2C', padding: '10px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 },
  amountPreview: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EBF8FF', padding: '12px 20px', borderRadius: 8, marginTop: 20, fontSize: 15 },
  actions:       { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 },
  btnCancel:     { padding: '10px 20px', background: '#EDF2F7', color: '#4A5568', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnSubmit:     { padding: '10px 24px', background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
};