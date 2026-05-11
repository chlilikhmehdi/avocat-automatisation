import { useState, useEffect } from 'react';
import DocumentChat            from '../components/DocumentAI/DocumentChat';
import { getDocuments }        from '../api/Documents';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — TOUS définis hors du composant (évite l'erreur React Refresh "_s")
// ─────────────────────────────────────────────────────────────────────────────

function mimeIcon(mime = '') {
  if (mime.includes('pdf'))                               return '📄';
  if (mime.includes('image'))                             return '🖼️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  return '📎';
}

function fmtSize(bytes = 0) {
  if (bytes < 1024)        return bytes + ' o';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

const STATUS_MAP = {
  ready:      { label: 'Indexé',     bg: '#dcfce7', color: '#166534' },
  processing: { label: 'En cours',   bg: '#fef9c3', color: '#854d0e' },
  error:      { label: 'Erreur',     bg: '#fee2e2', color: '#991b1b' },
  pending:    { label: 'Non indexé', bg: '#f1f5f9', color: '#64748b' },
};

function StatusBadge({ doc }) {
  const key = doc.processing_status || (doc.processed_at ? 'ready' : 'pending');
  const s   = STATUS_MAP[key] || STATUS_MAP.pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 6px',
      borderRadius: 6, background: s.bg, color: s.color, flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 20, height: 20,
      border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentsPage — route /documents
// ─────────────────────────────────────────────────────────────────────────────
export default function DocumentsPage({ currentUser }) {
  const [documents,   setDocuments]   = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDocuments({ limit: 50 })
      .then(res => {
        const docs = res?.data ?? [];
        setDocuments(docs);
        if (docs.length > 0) setSelectedDoc(docs[0]);
      })
      .catch(err => {
        console.error('[DocumentsPage]', err);
        setError('Impossible de charger les documents.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = documents.filter(d =>
    (d.display_name || d.original_name || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div style={S.page}>

      {/* ── Sidebar gauche ─────────────────────────────────────────────── */}
      <aside style={S.sidebar}>

        <div style={S.sideHeader}>
          <span style={S.sideTitle}>Documents</span>
          {!loading && <span style={S.count}>{filtered.length}</span>}
        </div>

        <div style={S.searchWrap}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <input
            style={S.searchInput}
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={S.list}>
          {loading && (
            <div style={S.centeredMsg}>
              <Spinner />
              <span>Chargement…</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ ...S.centeredMsg, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={S.centeredMsg}>
              <span style={{ fontSize: 32 }}>📂</span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                {search ? 'Aucun résultat' : 'Aucun document'}
              </span>
            </div>
          )}

          {!loading && filtered.map(doc => {
            const name     = doc.display_name || doc.original_name || 'Sans nom';
            const isActive = selectedDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                style={{
                  ...S.docItem,
                  background:  isActive ? '#eff6ff' : 'transparent',
                  borderColor: isActive ? '#bfdbfe' : 'transparent',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>
                  {mimeIcon(doc.mimetype)}
                </span>
                <div style={S.docMeta}>
                  <span style={{ ...S.docName, color: isActive ? '#1e40af' : '#0f172a' }}>
                    {name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtSize(doc.size)}</span>
                    <StatusBadge doc={doc} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Zone chat ──────────────────────────────────────────────────── */}
      <main style={S.main}>
        {!selectedDoc && !loading ? (
          <div style={S.noDoc}>
            <span style={{ fontSize: 48, marginBottom: 16 }}>💬</span>
            <p style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', margin: '0 0 6px' }}>
              Sélectionnez un document
            </p>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Choisissez un document dans la liste<br />
              pour commencer à lui poser des questions.
            </p>
          </div>
        ) : (
          <DocumentChat
            key={selectedDoc?.id}
            document={selectedDoc}
          />
        )}
      </main>

    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    display: 'flex', height: '100vh',
    fontFamily: "'DM Sans', sans-serif", overflow: 'hidden',
  },
  sidebar: {
    width: 300, flexShrink: 0,
    borderRight: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column',
    background: '#fff',
  },
  sideHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '18px 16px 10px',
    borderBottom: '1px solid #f1f5f9',
  },
  sideTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', flex: 1 },
  count: {
    fontSize: 11, fontWeight: 600,
    background: '#e0e7ff', color: '#3730a3',
    padding: '2px 7px', borderRadius: 10,
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none',
    fontSize: 13, color: '#0f172a',
    background: 'transparent', fontFamily: 'inherit',
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  centeredMsg: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '40px 16px', color: '#94a3b8', fontSize: 13,
  },
  docItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    width: 'calc(100% - 12px)', padding: '10px 14px',
    margin: '2px 6px', border: '1px solid transparent',
    borderRadius: 8, cursor: 'pointer', textAlign: 'left',
    background: 'transparent', transition: 'background 0.15s',
  },
  docMeta: {
    display: 'flex', flexDirection: 'column',
    gap: 4, minWidth: 0, flex: 1,
  },
  docName: {
    fontSize: 13, fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  main: { flex: 1, display: 'flex', overflow: 'hidden' },
  noDoc: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, textAlign: 'center', padding: 32,
  },
};

/*
  Ajoute dans index.css si pas déjà présent :
  @keyframes spin { to { transform: rotate(360deg); } }
*/