// src/pages/client/ClientDocuments.jsx
// Route : /client/documents

import { useState, useEffect } from 'react';
import {
  FileText, Download, Search, AlertCircle,
  File, FileImage, FileArchive, FolderOpen,
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('mizan_token')}` });

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ mimetype }) {
  if (!mimetype) return <File size={20} color="#888" />;
  if (mimetype.includes('pdf'))   return <FileText  size={20} color="#e53935" />;
  if (mimetype.includes('image')) return <FileImage size={20} color="#1565c0" />;
  if (mimetype.includes('zip') || mimetype.includes('archive'))
    return <FileArchive size={20} color="#6a1b9a" />;
  return <File size={20} color="#555" />;
}

function CategoryBadge({ cat }) {
  const map = {
    contrat:    { bg: '#e3f2fd', color: '#1565c0' },
    jugement:   { bg: '#fce4ec', color: '#c62828' },
    courrier:   { bg: '#f3e5f5', color: '#6a1b9a' },
    facture:    { bg: '#fff8e1', color: '#f57f17' },
    autre:      { bg: '#f5f5f5', color: '#555'    },
  };
  const cfg = map[cat?.toLowerCase()] || map.autre;
  return (
    <span style={{ ...s.catBadge, background: cfg.bg, color: cfg.color }}>
      {cat || 'Autre'}
    </span>
  );
}

async function downloadFile(fileId, fileName) {
  try {
    const res = await fetch(`${API}/client/documents/${fileId}/download`, { headers: hdrs() });
    if (!res.ok) { alert('Fichier introuvable ou accès refusé.'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName || 'document';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Erreur lors du téléchargement.');
  }
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function ClientDocuments() {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [catFilter, setCat]   = useState('all');

  useEffect(() => {
    fetch(`${API}/client/documents`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => { if (d.success) setDocs(d.data); else setError(d.error); })
      .catch(() => setError('Erreur de connexion.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...new Set(docs.map(d => d.category || 'autre'))];

  const filtered = docs.filter(d => {
    const matchSearch = (d.display_name || d.original_name || '')
      .toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || (d.category || 'autre') === catFilter;
    return matchSearch && matchCat;
  });

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;
  if (error)   return <div style={s.errorBox}><AlertCircle size={16} />{error}</div>;

  return (
    <div>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Mes documents</h1>
          <p  style={s.pageSub}>{docs.length} document(s) partagé(s) avec vous</p>
        </div>
      </div>

      {/* Filtres */}
      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} color="#aaa" style={s.searchIcon} />
          <input
            style={s.searchInput}
            placeholder="Rechercher un document…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={s.catButtons}>
          {categories.map(cat => (
            <button
              key={cat}
              style={{ ...s.catBtn, ...(catFilter === cat ? s.catBtnActive : {}) }}
              onClick={() => setCat(cat)}
            >
              {cat === 'all' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={s.empty}>
          <FolderOpen size={48} color="#ddd" />
          <p>Aucun document partagé pour le moment.</p>
          <p style={s.emptySub}>Votre avocat partagera des documents ici.</p>
        </div>
      ) : (
        <div style={s.docList}>
          {filtered.map((doc) => (
            <div key={doc.id} style={s.docCard}>
              {/* Icône */}
              <div style={s.docIconWrap}>
                <FileIcon mimetype={doc.mimetype} />
              </div>

              {/* Infos */}
              <div style={s.docInfo}>
                <div style={s.docName}>
                  {doc.display_name || doc.original_name}
                </div>
                <div style={s.docMeta}>
                  <span>{fmtSize(doc.size)}</span>
                  <span style={s.dot}>·</span>
                  <span>Dossier : {doc.case_title || '—'}</span>
                  <span style={s.dot}>·</span>
                  <span>Partagé le {fmtDate(doc.shared_at || doc.uploaded_at)}</span>
                </div>
                {doc.share_note && (
                  <div style={s.docNote}>💬 {doc.share_note}</div>
                )}
                {doc.shared_by_name && (
                  <div style={s.sharedBy}>Partagé par {doc.shared_by_name}</div>
                )}
              </div>

              {/* Badges + action */}
              <div style={s.docRight}>
                <CategoryBadge cat={doc.category} />
                <button
                  style={s.downloadBtn}
                  onClick={() => downloadFile(doc.id, doc.original_name)}
                  title="Télécharger"
                >
                  <Download size={16} />
                  <span>Télécharger</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  center:      { display:'flex', justifyContent:'center', alignItems:'center', height:300 },
  spinner:     { width:36, height:36, border:'3px solid #e0e0e0', borderTopColor:'#6a1b9a', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  errorBox:    { display:'flex', gap:8, alignItems:'center', padding:'14px 18px', background:'#fce4ec', color:'#c62828', borderRadius:8, fontSize:13 },
  pageHeader:  { marginBottom:20 },
  pageTitle:   { margin:0, fontSize:22, fontWeight:700, color:'#0f1923' },
  pageSub:     { margin:'4px 0 0', fontSize:13, color:'#888' },
  filterBar:   { display:'flex', gap:12, flexWrap:'wrap', marginBottom:20, alignItems:'center' },
  searchWrap:  { position:'relative', flex:1, minWidth:200 },
  searchIcon:  { position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' },
  searchInput: { width:'100%', padding:'10px 14px 10px 36px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' },
  catButtons:  { display:'flex', gap:6, flexWrap:'wrap' },
  catBtn:      { padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:20, background:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, color:'#555', transition:'all 0.15s' },
  catBtnActive:{ background:'#6a1b9a', color:'#fff', borderColor:'#6a1b9a' },
  empty:       { textAlign:'center', padding:'60px 0', color:'#bbb' },
  emptySub:    { fontSize:12, color:'#ccc', marginTop:4 },
  docList:     { display:'flex', flexDirection:'column', gap:10 },
  docCard:     { display:'flex', gap:14, alignItems:'center', background:'#fff', borderRadius:10, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', flexWrap:'wrap' },
  docIconWrap: { width:44, height:44, borderRadius:8, background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  docInfo:     { flex:1, minWidth:200 },
  docName:     { fontSize:14, fontWeight:700, color:'#0f1923', marginBottom:4 },
  docMeta:     { fontSize:12, color:'#888', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' },
  dot:         { color:'#ccc' },
  docNote:     { fontSize:12, color:'#555', marginTop:6, fontStyle:'italic', background:'#fffde7', padding:'4px 8px', borderRadius:4 },
  sharedBy:    { fontSize:11, color:'#aaa', marginTop:4 },
  docRight:    { display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end', flexShrink:0 },
  catBadge:    { fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20 },
  downloadBtn: { display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#0f1923', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, transition:'background 0.15s', whiteSpace:'nowrap' },
};