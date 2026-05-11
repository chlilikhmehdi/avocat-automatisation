// pages/CreateCase.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../Cases';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mizan_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const TYPES    = ['civil', 'pénal', 'commercial', 'administratif', 'autre'];
const STATUSES = [
  { value: 'ouvert',   label: 'Ouvert'   },
  { value: 'en_cours', label: 'En cours' },
];

export default function CreateCase() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:       '',
    type:        'civil',
    client_id:   '',   // ← remplace client_name
    client_name: '',   // conservé pour rétro-compatibilité API si besoin
    status:      'ouvert',
  });
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [serverErr, setServerErr] = useState('');

  // ── Clients disponibles ────────────────────────────────────────────────────
  const [clients,        setClients]        = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientSearch,   setClientSearch]   = useState('');

  useEffect(() => {
    setClientsLoading(true);
    apiClient.get('/clients')
      .then(res => {
        if (res.data.success) setClients(res.data.data || []);
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  const filteredClients = clients.filter(c =>
    !clientSearch ||
    c.nom?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handle = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const selectClient = (client) => {
    setForm(p => ({
      ...p,
      client_id:   client.id,
      client_name: client.nom,  // fallback pour l'API existante
    }));
    setErrors(p => ({ ...p, client_id: '' }));
    setClientSearch('');
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title     = 'Champ obligatoire';
    if (!form.client_id)    e.client_id = 'Sélectionnez un client';
    if (!form.type)         e.type      = 'Champ obligatoire';
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ── Soumission ─────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerErr('');
    try {
      const res = await createCase({
        title:       form.title,
        type:        form.type,
        status:      form.status,
        client_id:   form.client_id,
        client_name: form.client_name,  // pour compatibilité avec l'API existante
      });
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

  // ── Client sélectionné ─────────────────────────────────────────────────────
  const selectedClient = clients.find(c => c.id === form.client_id);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Nouveau dossier</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
          Remplissez les informations du dossier
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 28 }}>

        {serverErr && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
            ⚠️ {serverErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Titre */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Titre du dossier *" error={errors.title}>
              <input
                value={form.title}
                onChange={handle('title')}
                placeholder="Ex: Affaire Dupont c/ Société XY"
                style={inputStyle(!!errors.title)}
              />
            </Field>
          </div>

          {/* ── Sélecteur client ────────────────────────────────────────── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Client associé *" error={errors.client_id}>

              {/* Client sélectionné */}
              {selectedClient ? (
                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  padding:      '10px 14px',
                  border:       '1px solid #bbf7d0',
                  borderRadius: 9,
                  background:   '#f0fdf4',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#1e40af,#7c3aed)',
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {selectedClient.nom.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      {selectedClient.nom}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {selectedClient.email}
                      {selectedClient.total_cases !== undefined && (
                        <> · {selectedClient.total_cases} dossier{selectedClient.total_cases !== 1 ? 's' : ''}</>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, client_id: '', client_name: '' }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                /* Recherche client */
                <div style={{ position: 'relative' }}>
                  <input
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder={clientsLoading ? 'Chargement des clients…' : '🔍 Rechercher un client…'}
                    disabled={clientsLoading}
                    style={{
                      ...inputStyle(!!errors.client_id),
                      paddingLeft: 12,
                    }}
                  />

                  {/* Dropdown résultats */}
                  {clientSearch && filteredClients.length > 0 && (
                    <div style={{
                      position:    'absolute',
                      top:         '110%',
                      left:        0,
                      right:       0,
                      background:  '#fff',
                      border:      '1px solid #e2e8f0',
                      borderRadius:10,
                      boxShadow:   '0 8px 24px rgba(0,0,0,.12)',
                      zIndex:      200,
                      maxHeight:   220,
                      overflowY:   'auto',
                    }}>
                      {filteredClients.map(client => (
                        <div
                          key={client.id}
                          onClick={() => selectClient(client)}
                          style={{
                            display:     'flex',
                            alignItems:  'center',
                            gap:         10,
                            padding:     '10px 14px',
                            cursor:      'pointer',
                            borderBottom:'1px solid #f8fafc',
                            transition:  'background .1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#1e40af,#7c3aed)',
                            color: '#fff', fontSize: 13, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {client.nom.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                              {client.nom}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              {client.email}
                              {client.total_cases !== undefined && (
                                <> · {client.total_cases} dossier{client.total_cases !== 1 ? 's' : ''}</>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Aucun résultat */}
                  {clientSearch && filteredClients.length === 0 && !clientsLoading && (
                    <div style={{
                      position: 'absolute', top: '110%', left: 0, right: 0,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                      padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: 13,
                      zIndex: 200,
                    }}>
                      Aucun client trouvé pour "{clientSearch}"
                    </div>
                  )}
                </div>
              )}
            </Field>
          </div>

          {/* Type */}
          <Field label="Type de dossier *" error={errors.type}>
            <select value={form.type} onChange={handle('type')} style={inputStyle(!!errors.type)}>
              {TYPES.map(tp => (
                <option key={tp} value={tp} style={{ textTransform: 'capitalize' }}>{tp}</option>
              ))}
            </select>
          </Field>

          {/* Statut */}
          <Field label="Statut initial">
            <select value={form.status} onChange={handle('status')} style={inputStyle(false)}>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#334155', padding: '10px 20px', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={loading}
            style={{ background: loading ? '#93c5fd' : '#1e40af', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Création...' : '✓ Créer le dossier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composants utilitaires ────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

const inputStyle = (hasError) => ({
  padding:     '10px 13px',
  border:      `1px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
  borderRadius: 9,
  fontSize:    14,
  outline:     'none',
  fontFamily:  'inherit',
  width:       '100%',
  boxSizing:   'border-box',
  background:  '#f8fafc',
  color:       '#0f172a',
});