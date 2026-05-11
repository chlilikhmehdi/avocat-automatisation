// pages/ClientDetailsPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API     = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const API_URL = API.replace('/api', '');

const client = axios.create({ baseURL: API });
client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mizan_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate  = d => d ? new Date(d).toLocaleDateString('fr-MA')               : '—';
const fmtDT    = d => d ? new Date(d).toLocaleString('fr-MA')                   : '—';
const fmtSize  = b => !b ? '—' : b < 1048576 ? `${(b/1024).toFixed(0)} Ko` : `${(b/1048576).toFixed(1)} Mo`;
const mimeIcon = t => {
  if (!t) return '📄';
  if (t.includes('pdf'))                           return '📕';
  if (t.includes('image'))                         return '🖼️';
  if (t.includes('word') || t.includes('document'))return '📝';
  return '📄';
};

const STATUS_STYLE = {
  active:   { bg: '#dcfce7', color: '#16a34a' },
  closed:   { bg: '#f1f5f9', color: '#64748b' },
  pending:  { bg: '#fef3c7', color: '#d97706' },
  archived: { bg: '#f1f5f9', color: '#94a3b8' },
};

const CAT_LABEL = {
  contrat:'Contrat', piece_justificative:'Pièce justif.', jugement:'Jugement',
  pv:'PV', cin:'CIN', courrier:'Courrier', autre:'Autre',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ClientDetailsPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data,     setData]    = useState(null);   // { client, cases, files, history }
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');
  const [tab,      setTab]     = useState('cases'); // 'cases' | 'files' | 'history'
  const [caseFilter, setCaseFilter] = useState('');
  const [fileFilter, setFileFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    client.get(`/clients/${id}/full-details`)
      .then(res => {
        if (res.data.success) setData(res.data.data);
        else setError(res.data.message || 'Erreur chargement.');
      })
      .catch(err => setError(err.response?.data?.message || 'Erreur serveur.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} onBack={() => navigate(-1)} />;
  if (!data)   return null;

  const { client: c, cases, files, history } = data;

  const filteredCases = cases.filter(cs =>
    !caseFilter || cs.title?.toLowerCase().includes(caseFilter.toLowerCase()) ||
    cs.type?.toLowerCase().includes(caseFilter.toLowerCase())
  );

  const filteredFiles = files.filter(f =>
    !fileFilter || f.name?.toLowerCase().includes(fileFilter.toLowerCase()) ||
    f.case_title?.toLowerCase().includes(fileFilter.toLowerCase())
  );

  const TABS = [
    { key: 'cases',   label: '📁 Dossiers',   count: cases.length   },
    { key: 'files',   label: '📄 Documents',  count: files.length   },
    { key: 'history', label: '🕐 Historique', count: history.length },
  ];

  return (
    <div style={S.page}>

      {/* ── Bouton retour ────────────────────────────────────────────────── */}
      <button onClick={() => navigate(-1)} style={S.backBtn}>
        ← Retour
      </button>

      {/* ── Header client ────────────────────────────────────────────────── */}
      <div style={S.profileCard}>
        <div style={S.avatar}>
          {(c.nom || 'C').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={S.clientName}>{c.nom}</h1>
          <div style={S.clientMeta}>
            {c.email    && <MetaItem icon="✉️"  value={c.email} />}
            {c.telephone&& <MetaItem icon="📞"  value={c.telephone} />}
            <MetaItem icon="📅" value={`Client depuis le ${fmtDate(c.created_at)}`} />
          </div>
        </div>
        {/* Stats rapides */}
        <div style={S.quickStats}>
          <QuickStat value={cases.length}   label="Dossiers"  color="#3b82f6" />
          <QuickStat value={files.length}   label="Documents" color="#7c3aed" />
          <QuickStat value={history.length} label="Actions"   color="#f59e0b" />
        </div>
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...S.tabBtn,
            borderBottom: tab === t.key ? '2px solid #1e40af' : '2px solid transparent',
            color:        tab === t.key ? '#1e40af' : '#64748b',
            fontWeight:   tab === t.key ? 700 : 400,
          }}>
            {t.label}
            <span style={{
              ...S.tabCount,
              background: tab === t.key ? '#dbeafe' : '#f1f5f9',
              color:      tab === t.key ? '#1e40af' : '#64748b',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Contenu ───────────────────────────────────────────────────────── */}

      {/* DOSSIERS */}
      {tab === 'cases' && (
        <Section>
          <div style={S.filterRow}>
            <input
              value={caseFilter}
              onChange={e => setCaseFilter(e.target.value)}
              placeholder="🔍 Filtrer les dossiers…"
              style={S.filterInput}
            />
          </div>

          {filteredCases.length === 0 ? (
            <Empty icon="📁" text="Aucun dossier trouvé" />
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Titre', 'Type', 'Statut', 'Documents', 'Créé le', 'Actions'].map(h => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map(cs => {
                    const st = STATUS_STYLE[cs.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={cs.id} style={S.tr}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{cs.title}</div>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{cs.type || '—'}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ ...S.badge, background: st.bg, color: st.color }}>
                            {cs.status || 'pending'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontSize: 13, color: '#334155' }}>
                            {cs.file_count} fichier{cs.file_count !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(cs.created_at)}</span>
                        </td>
                        <td style={S.td}>
                          <button
                            onClick={() => navigate(`/cases/${cs.id}`)}
                            style={S.btnOpen}
                          >
                            Ouvrir →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* DOCUMENTS */}
      {tab === 'files' && (
        <Section>
          <div style={S.filterRow}>
            <input
              value={fileFilter}
              onChange={e => setFileFilter(e.target.value)}
              placeholder="🔍 Filtrer les documents…"
              style={S.filterInput}
            />
          </div>

          {filteredFiles.length === 0 ? (
            <Empty icon="📄" text="Aucun document trouvé" />
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Document', 'Dossier', 'Catégorie', 'Taille', 'IA', 'Uploadé le', 'Action'].map(h => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(f => (
                    <tr key={f.id} style={S.tr}>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{mimeIcon(f.mimetype)}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                              {f.name || f.original_name}
                            </div>
                            {f.doc_type && (
                              <div style={{ fontSize: 10, color: '#94a3b8' }}>{f.doc_type}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{f.case_title}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 12, background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: 12 }}>
                          {CAT_LABEL[f.category] || f.category || '—'}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtSize(f.size)}</span>
                      </td>
                      <td style={S.td}>
                        {f.ai_summary
                          ? <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8 }}>IA ✓</span>
                          : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(f.uploaded_at)}</span>
                      </td>
                      <td style={S.td}>
                        {f.original_name && (
                          <a
                            href={`${API_URL}/uploads/${f.original_name}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...S.btnOpen, textDecoration: 'none' }}
                          >
                            Voir →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* HISTORIQUE */}
      {tab === 'history' && (
        <Section>
          {history.length === 0 ? (
            <Empty icon="🕐" text="Aucune activité enregistrée" />
          ) : (
            <div style={S.timeline}>
              {history.map((h, i) => (
                <div key={h.id} style={S.timelineItem}>
                  {/* Ligne verticale */}
                  <div style={S.timelineLine}>
                    <div style={S.timelineDot} />
                    {i < history.length - 1 && <div style={S.timelineConnector} />}
                  </div>

                  {/* Contenu */}
                  <div style={S.timelineContent}>
                    <div style={S.timelineAction}>{h.action}</div>
                    <div style={S.timelineMeta}>
                      <span style={{ color: '#1e40af', fontWeight: 600 }}>{h.case_title}</span>
                      {h.created_by_name && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span>{h.created_by_name}</span>
                        </>
                      )}
                      <span style={{ color: '#cbd5e1' }}>·</span>
                      <span>{fmtDT(h.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────
const Section  = ({ children }) => <div style={S.section}>{children}</div>;
const Th       = ({ children }) => <th style={S.th}>{children}</th>;
const MetaItem = ({ icon, value }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
    <span>{icon}</span>{value}
  </span>
);
const QuickStat = ({ value, label, color }) => (
  <div style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid #e2e8f0' }}>
    <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
  </div>
);
const Empty = ({ icon, text }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
    <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 14 }}>{text}</div>
  </div>
);
const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', gap: 12, fontSize: 15 }}>
    <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    Chargement du profil client…
  </div>
);
const ErrorScreen = ({ message, onBack }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
    <div style={{ fontSize: 15, color: '#b91c1c', marginBottom: 20 }}>{message}</div>
    <button onClick={onBack} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer', background: '#fff' }}>← Retour</button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page:        { padding: '24px 32px', maxWidth: 1100, fontFamily: "'DM Sans', sans-serif" },
  backBtn:     { background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginBottom: 18, padding: 0, display: 'flex', alignItems: 'center', gap: 4 },
  profileCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 },
  avatar:      { width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  clientName:  { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' },
  clientMeta:  { display: 'flex', flexWrap: 'wrap', gap: 16 },
  quickStats:  { display: 'flex', gap: 0, marginInlineStart: 'auto' },
  tabBar:      { display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '4px', marginBottom: 16, gap: 4 },
  tabBtn:      { flex: 1, padding: '10px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all .15s' },
  tabCount:    { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },
  section:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' },
  filterRow:   { padding: '14px 16px', borderBottom: '1px solid #f1f5f9' },
  filterInput: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f8fafc', width: 280, fontFamily: 'inherit', color: '#0f172a' },
  tableWrap:   { overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr:          { borderBottom: '1px solid #f8fafc' },
  td:          { padding: '12px 14px', verticalAlign: 'middle' },
  badge:       { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 },
  btnOpen:     { padding: '6px 12px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  timeline:    { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 },
  timelineItem:{ display: 'flex', gap: 16, position: 'relative' },
  timelineLine:{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 },
  timelineDot: { width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', border: '2px solid #bfdbfe', flexShrink: 0, marginTop: 4 },
  timelineConnector: { width: 2, flex: 1, background: '#e2e8f0', margin: '4px 0' },
  timelineContent:   { paddingBottom: 20, flex: 1, minWidth: 0 },
  timelineAction:    { fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 },
  timelineMeta:      { display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#94a3b8' },
};