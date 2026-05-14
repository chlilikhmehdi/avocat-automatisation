// pages/billing/BillingNotesPage.jsx
import { useState, useEffect } from 'react';
import api from '../../api';

export default function BillingNotesPage() {
  const [notes,    setNotes]    = useState([]);
  const [cases,    setCases]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const [form, setForm] = useState({
    case_id:      '',
    description:  '',
    hours_worked: '',
    hourly_rate:  '',
  });

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/billing-notes');
      setNotes(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotes();
    api.get('/api/cases').then(r => setCases(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const total = form.hours_worked && form.hourly_rate
    ? (parseFloat(form.hours_worked) * parseFloat(form.hourly_rate)).toLocaleString('fr-FR')
    : '—';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.description || !form.hours_worked || !form.hourly_rate) {
      setError('Tous les champs obligatoires doivent être remplis.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/billing-notes', form);
      setForm({ case_id: '', description: '', hours_worked: '', hourly_rate: '' });
      setShowForm(false);
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally { setSaving(false); }
  };

  const totalHours  = notes.reduce((s, n) => s + parseFloat(n.hours_worked || 0), 0);
  const totalAmount = notes.reduce((s, n) => s + parseFloat(n.total_amount  || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Notes d'Honoraires</h1>
          <p style={styles.subtitle}>{notes.length} note(s)</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Fermer' : '+ Nouvelle note'}
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard label="Total heures"     value={`${totalHours.toFixed(1)} h`} color="#553C9A" />
        <StatCard label="Total honoraires" value={`${totalAmount.toLocaleString('fr-FR')} MAD`} color="#2B6CB0" />
        <StatCard
          label="Taux moy / heure"
          value={totalHours > 0 ? `${(totalAmount / totalHours).toFixed(0)} MAD` : '—'}
          color="#C05621"
        />
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.sectionTitle}>Nouvelle note d'honoraires</h3>
          {error && <div style={styles.errorBox}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={styles.grid2}>
              <Field label="Dossier (optionnel)">
                <select name="case_id" value={form.case_id} onChange={handleChange} style={styles.select}>
                  <option value="">Aucun dossier</option>
                  {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>

              <Field label="Heures travaillées *">
                <input name="hours_worked" type="number" min="0" step="0.25"
                  value={form.hours_worked} onChange={handleChange}
                  style={styles.input} placeholder="Ex : 2.5" required />
              </Field>

              <Field label="Taux horaire (MAD) *">
                <input name="hourly_rate" type="number" min="0" step="0.01"
                  value={form.hourly_rate} onChange={handleChange}
                  style={styles.input} placeholder="Ex : 1500" required />
              </Field>

              <div style={styles.calcBox}>
                <div style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Montant calculé</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a365d' }}>{total} MAD</div>
                {form.hours_worked && form.hourly_rate && (
                  <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                    {form.hours_worked}h × {form.hourly_rate} MAD/h
                  </div>
                )}
              </div>
            </div>

            <Field label="Description *" style={{ marginTop: 12 }}>
              <textarea name="description" value={form.description} onChange={handleChange}
                style={{ ...styles.input, height: 80, resize: 'vertical' }}
                placeholder="Nature des travaux effectués…" required />
            </Field>

            <div style={styles.formActions}>
              <button type="button" style={styles.btnGray} onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" style={styles.btnPrimary} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>Chargement…</div>
        ) : notes.length === 0 ? (
          <div style={styles.empty}>Aucune note d'honoraires.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date', 'Avocat', 'Dossier', 'Description', 'Heures', 'Taux', 'Montant'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notes.map((n, i) => (
                <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#F7FAFC' }}>
                  <td style={styles.td}>{new Date(n.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={styles.td}>{n.lawyer_name || '—'}</td>
                  <td style={styles.td}>{n.case_title  || '—'}</td>
                  <td style={{ ...styles.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.description}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{n.hours_worked} h</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{Number(n.hourly_rate).toLocaleString('fr-FR')} MAD</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#276749', textAlign: 'right' }}>
                    {Number(n.total_amount || 0).toLocaleString('fr-FR')} MAD
                  </td>
                </tr>
              ))}
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

function Field({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page:         { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#2d3748' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#1a365d' },
  subtitle:     { margin: '4px 0 0', color: '#718096', fontSize: 14 },
  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  statCard:     { background: '#fff', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  formCard:     { background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,.08)', padding: '20px 24px', marginBottom: 20 },
  sectionTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1a365d' },
  grid2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  calcBox:      { background: '#EBF8FF', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  select:       { padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, background: '#fff', width: '100%' },
  input:        { padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E0', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  errorBox:     { background: '#FFF5F5', border: '1px solid #FC8181', color: '#9B2C2C', padding: '10px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 },
  formActions:  { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  tableWrapper: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4A5568', borderBottom: '2px solid #E2E8F0', background: '#F7FAFC', whiteSpace: 'nowrap' },
  td:           { padding: '11px 16px', fontSize: 13, borderBottom: '1px solid #EDF2F7' },
  btnPrimary:   { padding: '9px 20px', background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnGray:      { padding: '9px 16px', background: '#EDF2F7', color: '#4A5568', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  loading:      { padding: 40, textAlign: 'center', color: '#718096' },
  empty:        { padding: 40, textAlign: 'center', color: '#A0AEC0' },
};