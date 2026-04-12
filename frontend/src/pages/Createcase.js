import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../Cases';

const TYPES    = ['civil', 'pénal', 'commercial', 'administratif', 'autre'];
const STATUSES = [
  { value: 'ouvert',   label: 'Ouvert' },
  { value: 'en_cours', label: 'En cours' },
];

export default function CreateCase() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title:       '',
    type:        'civil',
    client_name: '',
    status:      'ouvert',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState('');

  const validate = () => {
    const e = {};
    if (!form.title.trim())       e.title       = 'Champ obligatoire';
    if (!form.client_name.trim()) e.client_name = 'Champ obligatoire';
    if (!form.type)               e.type        = 'Champ obligatoire';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handle = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerErr('');
    try {
      const res = await createCase(form);
      if (res.success) {
        navigate(`/cases/${res.data.id}`);
      } else {
        setServerErr(res.message || 'Erreur lors de la création');
      }
    } catch {
      setServerErr('Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Nouveau dossier</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
          Remplissez les informations du dossier
        </p>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: 28,
      }}>
        {serverErr && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px', color: '#ef4444',
            fontSize: 13, marginBottom: 20,
          }}>
            ⚠️ {serverErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Titre */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field
              label="Titre du dossier *"
              error={errors.title}
              input={
                <input
                  value={form.title}
                  onChange={handle('title')}
                  placeholder="Ex: Affaire Dupont c/ Société XY"
                  style={inputStyle(!!errors.title)}
                />
              }
            />
          </div>

          {/* Client */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field
              label="Nom du client *"
              error={errors.client_name}
              input={
                <input
                  value={form.client_name}
                  onChange={handle('client_name')}
                  placeholder="Ex: Mohamed Alaoui"
                  style={inputStyle(!!errors.client_name)}
                />
              }
            />
          </div>

          {/* Type */}
          <Field
            label="Type de dossier *"
            error={errors.type}
            input={
              <select value={form.type} onChange={handle('type')} style={inputStyle(!!errors.type)}>
                {TYPES.map((t) => (
                  <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>
                ))}
              </select>
            }
          />

          {/* Statut */}
          <Field
            label="Statut initial"
            input={
              <select value={form.status} onChange={handle('status')} style={inputStyle(false)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            }
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent', border: '1px solid #e2e8f0', color: '#334155',
              padding: '10px 20px', borderRadius: 9, fontSize: 14, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={loading}
            style={{
              background: loading ? '#93c5fd' : '#1e40af', color: '#fff', border: 'none',
              padding: '10px 24px', borderRadius: 9, fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Création...' : '✓ Créer le dossier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant Field ──────────────────────────────────────────────────────────

function Field({ label, error, input }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</label>
      {input}
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

const inputStyle = (hasError) => ({
  padding: '10px 13px',
  border: `1px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
  borderRadius: 9, fontSize: 14, outline: 'none',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
});