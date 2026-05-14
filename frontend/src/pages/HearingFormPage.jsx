// pages/HearingFormPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createHearing, updateHearing, getHearing } from '../api/hearings';
import axios from 'axios';

const EMPTY = {
  case_id:      '',
  title:        '',
  description:  '',
  hearing_date: '',
  hearing_time: '',
  location:     '',
  status:       'scheduled',
};

function Field({ label, required, children, hint }) {
  return (
    <div style={S.field}>
      <label style={S.label}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={S.hint}>{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HearingFormPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id && id !== 'new');

  const [form,         setForm]         = useState(EMPTY);
  const [cases,        setCases]        = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError,   setCasesError]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [errors,       setErrors]       = useState({});

  // ── Charger les dossiers via /api/cases-list ───────────────────────────────
  const loadCases = () => {
    setCasesLoading(true);
    setCasesError(null);

    const token = localStorage.getItem('mizan_token')
               || localStorage.getItem('accessToken')
               || localStorage.getItem('jwt')
               || '';

    axios.get('http://localhost:4000/api/cases-list', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        console.log('[HearingFormPage] dossiers chargés :', list.length);
        setCases(list);
      })
      .catch(err => {
        console.error('[HearingFormPage] erreur dossiers :', err.response?.status, err.message);
        setCasesError('Impossible de charger les dossiers');
      })
      .finally(() => setCasesLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  // ── Charger l'audience en mode édition ────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getHearing(id)
      .then(res => {
        const h = res.data;
        setForm({
          case_id:      h.case_id     || '',
          title:        h.title       || '',
          description:  h.description || '',
          hearing_date: h.hearing_date?.split('T')[0] || '',
          hearing_time: h.hearing_time?.slice(0, 5)   || '',
          location:     h.location    || '',
          status:       h.status      || 'scheduled',
        });
      })
      .catch(() => navigate('/hearings'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.case_id)      errs.case_id      = 'Sélectionnez un dossier';
    if (!form.title.trim()) errs.title        = 'Le titre est requis';
    if (!form.hearing_date) errs.hearing_date = 'La date est requise';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        case_id:      parseInt(form.case_id),
        hearing_time: form.hearing_time || null,
      };
      if (isEdit) {
        await updateHearing(id, payload);
      } else {
        await createHearing(payload);
      }
      navigate('/hearings');
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <span style={S.spinnerDark} />
      </div>
    );
  }

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <button onClick={() => navigate('/hearings')} style={S.btnBack}>← Retour</button>
        <div style={S.headerIcon}>{isEdit ? '✏️' : '➕'}</div>
        <div>
          <h1 style={S.title}>{isEdit ? "Modifier l'audience" : 'Nouvelle audience'}</h1>
          <p style={S.sub}>{isEdit ? 'Mettez à jour les informations' : 'Planifier une nouvelle audience'}</p>
        </div>
      </div>

      <div style={S.card}>

        {/* ── Dossier ── */}
        <Field label="Dossier" required>
          {casesLoading ? (
            <div style={S.loadingRow}>
              <span style={S.spinnerBlue} />
              <span style={{ fontSize: 13, color: '#64748b' }}>Chargement des dossiers…</span>
            </div>
          ) : casesError ? (
            <div style={S.errorBox}>
              ⚠️ {casesError}
              <button style={S.retryBtn} onClick={loadCases}>Réessayer</button>
            </div>
          ) : (
            <>
              <select
                style={{ ...S.input, ...(errors.case_id ? S.inputErr : {}) }}
                value={form.case_id}
                onChange={e => {
                  setErrors(prev => ({ ...prev, case_id: undefined }));
                  set('case_id')(e);
                }}
              >
                <option value="">
                  {cases.length === 0 ? '— Aucun dossier disponible —' : 'Sélectionner un dossier…'}
                </option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || `Dossier #${c.id}`}
                    {c.client_name ? ` — ${c.client_name}` : ''}
                  </option>
                ))}
              </select>
              {errors.case_id && <p style={S.err}>{errors.case_id}</p>}
              {cases.length === 0 && (
                <p style={S.hint}>
                  Aucun dossier trouvé. Créez d'abord un dossier dans la section Dossiers.
                </p>
              )}
            </>
          )}
        </Field>

        {/* ── Titre ── */}
        <Field label="Titre de l'audience" required>
          <input
            style={{ ...S.input, ...(errors.title ? S.inputErr : {}) }}
            placeholder="Ex : Audience de plaidoirie"
            value={form.title}
            onChange={e => {
              setErrors(prev => ({ ...prev, title: undefined }));
              set('title')(e);
            }}
          />
          {errors.title && <p style={S.err}>{errors.title}</p>}
        </Field>

        {/* ── Description ── */}
        <Field label="Description / Notes">
          <textarea
            style={{ ...S.input, minHeight: 90, resize: 'vertical' }}
            placeholder="Informations complémentaires…"
            value={form.description}
            onChange={set('description')}
          />
        </Field>

        {/* ── Date + Heure ── */}
        <div style={S.row}>
          <Field label="Date" required>
            <input
              type="date"
              style={{ ...S.input, ...(errors.hearing_date ? S.inputErr : {}) }}
              value={form.hearing_date}
              onChange={e => {
                setErrors(prev => ({ ...prev, hearing_date: undefined }));
                set('hearing_date')(e);
              }}
            />
            {errors.hearing_date && <p style={S.err}>{errors.hearing_date}</p>}
          </Field>
          <Field label="Heure">
            <input type="time" style={S.input} value={form.hearing_time} onChange={set('hearing_time')} />
          </Field>
        </div>

        {/* ── Lieu ── */}
        <Field label="Lieu" hint="Ex : Tribunal de première instance de Casablanca, Salle 3">
          <input
            style={S.input}
            placeholder="Tribunal, salle…"
            value={form.location}
            onChange={set('location')}
          />
        </Field>

        {/* ── Statut ── */}
        <Field label="Statut">
          <div style={S.statusGrid}>
            {Object.entries({
              scheduled: { label: 'Planifiée', icon: '📅' },
              completed: { label: 'Terminée',  icon: '✅' },
              postponed: { label: 'Reportée',  icon: '⏳' },
              cancelled: { label: 'Annulée',   icon: '❌' },
            }).map(([val, { label, icon }]) => (
              <button
                key={val}
                type="button"
                onClick={() => setForm(f => ({ ...f, status: val }))}
                style={{
                  ...S.statusBtn,
                  background:  form.status === val ? '#eff6ff' : '#f8fafc',
                  borderColor: form.status === val ? '#1e40af' : '#e2e8f0',
                  color:       form.status === val ? '#1e40af' : '#64748b',
                  fontWeight:  form.status === val ? 700 : 400,
                }}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </Field>

        {/* ── Actions ── */}
        <div style={S.actions}>
          <button onClick={() => navigate('/hearings')} style={S.btnCancel} disabled={saving}>
            Annuler
          </button>
          <button onClick={handleSubmit} style={S.btnSave} disabled={saving || casesLoading}>
            {saving
              ? <><span style={S.spinner} /> Enregistrement…</>
              : isEdit ? '💾 Enregistrer les modifications' : "✅ Créer l'audience"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  page:        { padding: '28px 32px', fontFamily: "'DM Sans', sans-serif", maxWidth: 720 },
  header:      { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  headerIcon:  { width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  title:       { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub:         { fontSize: 13, color: '#64748b', margin: '2px 0 0' },
  btnBack:     { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  field:       { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 13, fontWeight: 600, color: '#374151' },
  hint:        { fontSize: 11, color: '#94a3b8', margin: 0 },
  input:       { padding: '10px 13px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', width: '100%', boxSizing: 'border-box' },
  inputErr:    { borderColor: '#fca5a5', background: '#fef2f2' },
  err:         { fontSize: 12, color: '#ef4444', margin: '2px 0 0' },
  row:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  statusGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  statusBtn:   { padding: '10px 14px', border: '1px solid', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s' },
  actions:     { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, paddingTop: 20, borderTop: '1px solid #f1f5f9' },
  btnCancel:   { padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: '#64748b' },
  btnSave:     { padding: '10px 24px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 },
  spinner:     { display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  spinnerBlue: { display: 'inline-block', width: 14, height: 14, border: '2px solid #dbeafe', borderTop: '2px solid #1e40af', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  spinnerDark: { display: 'inline-block', width: 24, height: 24, border: '3px solid #dbeafe', borderTop: '3px solid #1e40af', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  loadingRow:  { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9 },
  errorBox:    { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' },
  retryBtn:    { marginLeft: 'auto', padding: '4px 12px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontFamily: 'inherit' },
};