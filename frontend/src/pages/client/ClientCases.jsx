// src/pages/client/ClientCases.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FolderOpen, ArrowLeft, Clock, User, Calendar,
  AlertCircle, ChevronRight, Scale,
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('mizan_token')}` });

function Badge({ status }) {
  const map = {
    ouvert:  { bg:'#e3f2fd', color:'#1565c0', label:'Ouvert' },
    fermé:   { bg:'#fce4ec', color:'#c62828', label:'Fermé' },
    pending: { bg:'#fff8e1', color:'#f57f17', label:'En cours' },
  };
  const cfg = map[status] || { bg:'#f5f5f5', color:'#555', label: status };
  return <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

function UrgencyDot({ level }) {
  const colors = { haute:'#ef5350', normale:'#66bb6a', basse:'#78909c' };
  return level
    ? <span style={{ ...s.dot, background: colors[level] || '#ccc' }} title={`Urgence : ${level}`} />
    : null;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Liste des dossiers ─────────────────────────────────────────────────────────
function CasesList() {
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    fetch(`${API}/client/cases`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => { if (d.success) setCases(d.data); else setError(d.message || 'Erreur.'); })
      .catch(() => setError('Erreur de connexion.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;
  if (error)   return <div style={s.errorBox}><AlertCircle size={16} />{error}</div>;

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Mes dossiers</h1>
          <p style={s.pageSub}>{cases.length} dossier(s) au total</p>
        </div>
      </div>

      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Rechercher un dossier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={s.empty}>
          <FolderOpen size={48} color="#ddd" />
          <p>Aucun dossier trouvé.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map((c) => (
            <Link key={c.id} to={`/client/cases/${c.id}`} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardIconWrap}>
                  <FolderOpen size={20} color="#1565c0" />
                </div>
                <div style={s.cardTopRight}>
                  <Badge status={c.status} />
                  <UrgencyDot level={c.urgency_level} />
                </div>
              </div>
              <h3 style={s.cardTitle}>{c.title}</h3>
              <p  style={s.cardType}>{c.type}</p>
              <div style={s.cardMeta}>
                <span style={s.metaItem}><User size={12} /> {c.lawyer_name || 'Avocat non assigné'}</span>
              </div>
              <div style={s.cardFooter}>
                <span style={s.cardDate}>Ouvert le {fmtDate(c.created_at)}</span>
                <ChevronRight size={16} color="#bbb" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Détail d'un dossier ────────────────────────────────────────────────────────
function CaseDetail() {
  const { id }                = useParams();
  const navigate              = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('info');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/client/cases/${id}`,          { headers: hdrs() }).then(r => r.json()),
      fetch(`${API}/client/cases/${id}/hearings`, { headers: hdrs() }).then(r => r.json()),
    ])
      .then(([caseRes, hearingsRes]) => {
        if (caseRes.success) {
          setData({
            case:     caseRes.data,
            hearings: hearingsRes.success ? hearingsRes.data : [],
            history:  [],
          });
        } else {
          setError('Dossier introuvable.');
        }
      })
      .catch(() => setError('Erreur de connexion.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;
  if (error)   return <div style={s.errorBox}><AlertCircle size={16} />{error}</div>;
  if (!data)   return null;

  const { case: c, history, hearings } = data;

  return (
    <div>
      <button style={s.backBtn} onClick={() => navigate('/client/cases')}>
        <ArrowLeft size={16} /> Mes dossiers
      </button>

      <div style={s.detailHeader}>
        <div style={s.detailIconWrap}>
          <Scale size={24} color="#1565c0" />
        </div>
        <div style={{ flex:1 }}>
          <div style={s.detailTopRow}>
            <h1 style={s.detailTitle}>{c.title}</h1>
            <Badge status={c.status} />
          </div>
          <p style={s.detailSub}>{c.type}</p>
        </div>
      </div>

      <div style={s.lawyerCard}>
        <div style={s.lawyerAvatar}>{(c.lawyer_name || 'A').charAt(0)}</div>
        <div>
          <div style={s.lawyerName}>{c.lawyer_name || 'Avocat non assigné'}</div>
          <div style={s.lawyerContact}>
            {c.lawyer_email && <span>{c.lawyer_email}</span>}
            {c.lawyer_phone && <span> · {c.lawyer_phone}</span>}
          </div>
        </div>
      </div>

      <div style={s.tabs}>
        {['info', 'history', 'hearings'].map(t => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {{ info:'Informations', history:`Historique (${history.length})`, hearings:`Audiences (${hearings.length})` }[t]}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div style={s.infoGrid}>
          {[
            ['Référence', `#${c.id}`],
            ['Type', c.type],
            ['Statut', c.status],
            ['Urgence', c.urgency_level || '—'],
            ['Créé le', fmtDate(c.created_at)],
            ['Mis à jour', fmtDate(c.updated_at)],
          ].map(([label, value]) => (
            <div key={label} style={s.infoItem}>
              <div style={s.infoLabel}>{label}</div>
              <div style={s.infoValue}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div style={s.timeline}>
          {history.length === 0
            ? <p style={s.emptyText}>Aucun historique disponible.</p>
            : history.map((h, i) => (
              <div key={i} style={s.timelineItem}>
                <div style={s.timelineDot} />
                <div style={s.timelineContent}>
                  <div style={s.timelineAction}>{h.action}</div>
                  {h.description && <div style={s.timelineDesc}>{h.description}</div>}
                  <div style={s.timelineDate}>{fmtDate(h.created_at)}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'hearings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {hearings.length === 0
            ? <p style={s.emptyText}>Aucune audience enregistrée.</p>
            : hearings.map((h) => (
              <div key={h.id} style={s.hearingCard}>
                <Calendar size={16} color="#1565c0" />
                <div style={{ flex:1 }}>
                  <div style={s.hearingDate}>{fmtDate(h.hearing_date)}</div>
                  {h.location    && <div style={s.hearingLoc}>{h.location}</div>}
                  {h.description && <div style={s.hearingNotes}>{h.description}</div>}
                </div>
                {h.status && <Badge status={h.status} />}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

export default function ClientCasesRouter() {
  const { id } = useParams();
  return id ? <CaseDetail /> : <CasesList />;
}

const s = {
  center:         { display:'flex', justifyContent:'center', alignItems:'center', height:300 },
  spinner:        { width:36, height:36, border:'3px solid #e0e0e0', borderTopColor:'#1565c0', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  errorBox:       { display:'flex', gap:8, alignItems:'center', padding:'14px 18px', background:'#fce4ec', color:'#c62828', borderRadius:8, fontSize:13 },
  pageHeader:     { marginBottom:20 },
  pageTitle:      { margin:0, fontSize:22, fontWeight:700, color:'#0f1923' },
  pageSub:        { margin:'4px 0 0', fontSize:13, color:'#888' },
  searchBar:      { marginBottom:20 },
  searchInput:    { width:'100%', maxWidth:400, padding:'10px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' },
  empty:          { textAlign:'center', padding:'60px 0', color:'#bbb', fontSize:14 },
  grid:           { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 },
  card:           { background:'#fff', borderRadius:10, padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', textDecoration:'none', display:'flex', flexDirection:'column', gap:10, cursor:'pointer' },
  cardTop:        { display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardIconWrap:   { width:38, height:38, borderRadius:8, background:'#e3f0ff', display:'flex', alignItems:'center', justifyContent:'center' },
  cardTopRight:   { display:'flex', alignItems:'center', gap:6 },
  dot:            { width:8, height:8, borderRadius:'50%', display:'inline-block' },
  cardTitle:      { margin:0, fontSize:15, fontWeight:700, color:'#0f1923' },
  cardType:       { margin:0, fontSize:12, color:'#888' },
  cardMeta:       { display:'flex', flexDirection:'column', gap:4 },
  metaItem:       { display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#666' },
  cardFooter:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:10, borderTop:'1px solid #f5f5f5' },
  cardDate:       { fontSize:11, color:'#aaa' },
  badge:          { fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20 },
  backBtn:        { display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#1565c0', cursor:'pointer', fontSize:13, padding:0, marginBottom:20, fontWeight:600 },
  detailHeader:   { display:'flex', gap:16, alignItems:'flex-start', background:'#fff', borderRadius:10, padding:'20px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  detailIconWrap: { width:48, height:48, borderRadius:10, background:'#e3f0ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  detailTopRow:   { display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' },
  detailTitle:    { margin:0, fontSize:20, fontWeight:700, color:'#0f1923' },
  detailSub:      { margin:'4px 0 0', fontSize:13, color:'#888' },
  lawyerCard:     { display:'flex', gap:12, alignItems:'center', background:'#f8f9fa', borderRadius:8, padding:'14px 16px', marginBottom:16 },
  lawyerAvatar:   { width:38, height:38, borderRadius:'50%', background:'#c9a84c', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15, flexShrink:0 },
  lawyerName:     { fontSize:14, fontWeight:600, color:'#0f1923' },
  lawyerContact:  { fontSize:12, color:'#888', marginTop:2 },
  tabs:           { display:'flex', gap:4, marginBottom:16, background:'#fff', borderRadius:8, padding:4, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  tab:            { flex:1, padding:'8px 12px', border:'none', background:'none', cursor:'pointer', borderRadius:6, fontSize:13, color:'#666', fontWeight:500 },
  tabActive:      { background:'#e3f0ff', color:'#1565c0', fontWeight:700 },
  infoGrid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12, background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  infoItem:       { display:'flex', flexDirection:'column', gap:4 },
  infoLabel:      { fontSize:11, color:'#aaa', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' },
  infoValue:      { fontSize:14, color:'#0f1923', fontWeight:600 },
  timeline:       { background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  timelineItem:   { display:'flex', gap:14, marginBottom:16 },
  timelineDot:    { width:10, height:10, borderRadius:'50%', background:'#1565c0', marginTop:4, flexShrink:0 },
  timelineContent:{ flex:1, borderBottom:'1px solid #f5f5f5', paddingBottom:12 },
  timelineAction: { fontSize:14, fontWeight:600, color:'#0f1923' },
  timelineDesc:   { fontSize:12, color:'#666', marginTop:4 },
  timelineDate:   { fontSize:11, color:'#aaa', marginTop:6 },
  hearingCard:    { display:'flex', gap:12, alignItems:'flex-start', background:'#fff', borderRadius:8, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  hearingDate:    { fontSize:14, fontWeight:700, color:'#0f1923' },
  hearingLoc:     { fontSize:12, color:'#666', marginTop:2 },
  hearingNotes:   { fontSize:12, color:'#888', marginTop:4, fontStyle:'italic' },
  emptyText:      { color:'#aaa', fontSize:13, textAlign:'center', padding:'30px 0' },
};