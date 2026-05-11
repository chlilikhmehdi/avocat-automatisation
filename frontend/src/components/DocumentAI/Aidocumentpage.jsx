// pages/AiDocumentPage.jsx
import { useState, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.tiff,.bmp';

export default function AiDocumentPage() {
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null); // { text, summary, chars, model }
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState('summary'); // 'summary' | 'text'
  const fileRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) { setError('Sélectionnez un fichier.'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await axios.post(`${API}/ai/analyze`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        setResult(data.data);
        setTab('summary');
      } else {
        setError(data.message || 'Erreur lors de l\'analyse.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={S.page}>

      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerIcon}>🧠</div>
        <div>
          <h1 style={S.title}>Analyse IA de document</h1>
          <p style={S.sub}>OCR + résumé automatique avec Llama3 (local)</p>
        </div>
      </div>

      {/* ── Zone upload ───────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
          onClick={() => !file && fileRef.current?.click()}
          style={{
            ...S.dropZone,
            borderColor: dragging ? '#3b82f6' : file ? '#22c55e' : '#cbd5e1',
            background:  dragging ? '#eff6ff' : file ? '#f0fdf4' : '#f8fafc',
            cursor:      file ? 'default' : 'pointer',
          }}
        >
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 36 }}>{file.type.includes('pdf') ? '📕' : '🖼️'}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {(file.size / 1024).toFixed(0)} Ko · prêt à analyser
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); reset(); }} style={S.btnRemove}>×</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>☁️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Glissez un fichier ou cliquez pour choisir
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>PDF, JPG, PNG, TIFF · 20 Mo max</div>
            </>
          )}
        </div>

        <input
          ref={fileRef} type="file" accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={e => pickFile(e.target.files?.[0])}
        />

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          style={{
            ...S.btnAnalyze,
            opacity: !file || loading ? 0.55 : 1,
            cursor:  !file || loading ? 'default' : 'pointer',
          }}
        >
          {loading
            ? <><Spinner /> Analyse en cours…</>
            : '🔍 Analyser le document'}
        </button>

        {loading && (
          <div style={S.steps}>
            <Step done>📄 Fichier reçu</Step>
            <Step active>🔡 Extraction OCR (Tesseract)…</Step>
            <Step>🧠 Génération résumé (Llama3)…</Step>
          </div>
        )}

        {error && (
          <div style={S.errorBox}>
            <span style={{ fontSize: 18 }}>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* ── Résultats ─────────────────────────────────────────────────────── */}
      {result && (
        <div style={S.card}>

          {/* Méta */}
          <div style={S.meta}>
            <MetaBadge icon="🤖" label="Modèle"    value={result.model} />
            <MetaBadge icon="📝" label="Caractères" value={result.chars?.toLocaleString('fr')} />
            <MetaBadge icon="✅" label="Statut"     value="Analyse terminée" color="#16a34a" />
          </div>

          {/* Onglets */}
          <div style={S.tabs}>
            {[
              { key: 'summary', label: '📋 Résumé IA' },
              { key: 'text',    label: '🔡 Texte extrait' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                ...S.tab,
                borderBottom: tab === t.key ? '2px solid #1e40af' : '2px solid transparent',
                color:        tab === t.key ? '#1e40af' : '#64748b',
                fontWeight:   tab === t.key ? 700 : 400,
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenu onglet */}
          <div style={S.tabContent}>
            {tab === 'summary' && (
              <div style={S.summaryBox}>
                <div style={S.summaryText}>{result.summary}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.summary)}
                  style={S.btnCopy}
                >
                  📋 Copier le résumé
                </button>
              </div>
            )}

            {tab === 'text' && (
              <div style={S.textBox}>
                <pre style={S.pre}>{result.text}</pre>
                <button
                  onClick={() => navigator.clipboard.writeText(result.text)}
                  style={S.btnCopy}
                >
                  📋 Copier le texte
                </button>
              </div>
            )}
          </div>

          <button onClick={reset} style={S.btnReset}>
            ↺ Analyser un autre document
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Sous-composants ─────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

function Step({ children, done, active }) {
  return (
    <div style={{
      display:    'flex', alignItems: 'center', gap: 8,
      fontSize:   12,
      color:      done ? '#16a34a' : active ? '#1e40af' : '#94a3b8',
      fontWeight: active ? 600 : 400,
    }}>
      <span>{done ? '✓' : active ? '⏳' : '○'}</span>
      {children}
    </div>
  );
}

function MetaBadge({ icon, label, value, color = '#1e40af' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: '6px 12px' }}>
      <span>{icon}</span>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label} :</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const S = {
  page: {
    padding:    '28px 32px',
    maxWidth:   820,
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    display:       'flex',
    alignItems:    'center',
    gap:           16,
    marginBottom:  24,
  },
  headerIcon: {
    width:          52,
    height:         52,
    borderRadius:   14,
    background:     'linear-gradient(135deg,#7c3aed,#1e40af)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       26,
    flexShrink:     0,
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' },
  sub:   { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  card: {
    background:   '#fff',
    border:       '1px solid #e2e8f0',
    borderRadius: 14,
    padding:      '24px',
    marginBottom: 20,
  },
  dropZone: {
    border:        '2px dashed',
    borderRadius:  12,
    padding:       '32px 20px',
    textAlign:     'center',
    transition:    'all .15s',
    marginBottom:  16,
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
  },
  btnRemove: {
    marginLeft:   'auto',
    background:   '#fef2f2',
    color:        '#ef4444',
    border:       '1px solid #fecaca',
    borderRadius: 8,
    width:        30,
    height:       30,
    fontSize:     18,
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    flexShrink:   0,
  },
  btnAnalyze: {
    width:         '100%',
    padding:       '12px',
    background:    'linear-gradient(135deg,#7c3aed,#1e40af)',
    color:         '#fff',
    border:        'none',
    borderRadius:  10,
    fontSize:      15,
    fontWeight:    700,
    cursor:        'pointer',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    gap:           8,
    fontFamily:    'inherit',
  },
  steps: {
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
    marginTop:     14,
    padding:       '14px 16px',
    background:    '#f8fafc',
    borderRadius:  10,
    border:        '1px solid #e2e8f0',
  },
  errorBox: {
    marginTop:    14,
    padding:      '12px 16px',
    background:   '#fef2f2',
    border:       '1px solid #fecaca',
    borderRadius: 10,
    color:        '#b91c1c',
    fontSize:     13,
    display:      'flex',
    alignItems:   'center',
    gap:          8,
  },
  meta: {
    display:      'flex',
    gap:          8,
    flexWrap:     'wrap',
    marginBottom: 18,
  },
  tabs: {
    display:      'flex',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: 16,
  },
  tab: {
    padding:    '9px 16px',
    border:     'none',
    background: 'none',
    fontSize:   13,
    cursor:     'pointer',
    fontFamily: 'inherit',
    transition: 'all .15s',
  },
  tabContent: {},
  summaryBox: {},
  summaryText: {
    fontSize:     14,
    lineHeight:   1.75,
    color:        '#1e293b',
    whiteSpace:   'pre-wrap',
    padding:      '16px',
    background:   '#f8fafc',
    borderRadius: 10,
    border:       '1px solid #e2e8f0',
    marginBottom: 12,
  },
  textBox: {},
  pre: {
    fontSize:     12,
    lineHeight:   1.7,
    color:        '#334155',
    whiteSpace:   'pre-wrap',
    wordBreak:    'break-word',
    background:   '#0f172a',
    color:        '#e2e8f0',
    padding:      '16px',
    borderRadius: 10,
    maxHeight:    340,
    overflowY:    'auto',
    marginBottom: 12,
    fontFamily:   'monospace',
  },
  btnCopy: {
    background:   '#f1f5f9',
    border:       '1px solid #e2e8f0',
    borderRadius: 8,
    padding:      '7px 14px',
    fontSize:     12,
    cursor:       'pointer',
    fontFamily:   'inherit',
    color:        '#334155',
  },
  btnReset: {
    marginTop:    16,
    background:   'transparent',
    border:       '1px solid #e2e8f0',
    borderRadius: 9,
    padding:      '9px 18px',
    fontSize:     13,
    cursor:       'pointer',
    color:        '#64748b',
    fontFamily:   'inherit',
  },
};