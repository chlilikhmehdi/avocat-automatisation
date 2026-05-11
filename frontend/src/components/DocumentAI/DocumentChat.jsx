import { useState, useRef, useEffect } from 'react';
import { askDocument, getConversation, processDocument } from '../../api/documentAI';

export default function DocumentChat({ document: doc }) {
  // ── Tous les hooks AVANT tout early return ──────────────────────────────
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [processing, setProcessing] = useState(false);
  const [indexed,    setIndexed]    = useState(!!doc?.processed_at);
  const bottomRef = useRef(null);

  useEffect(() => {
    setIndexed(!!doc?.processed_at);
    setMessages([]);
    setInput('');
  }, [doc?.id]);

  useEffect(() => {
    if (indexed && doc?.id) {
      getConversation(doc.id)
        .then(r => setMessages(r.data || []))
        .catch(() => {});
    }
  }, [doc?.id, indexed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Early return après les hooks ────────────────────────────────────────
  if (!doc) return null;

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await processDocument(doc.id);
      if (res.success) {
        setIndexed(true);
      } else {
        alert(res.message || "Erreur lors de l'indexation");
      }
    } catch (e) {
      alert(e.message || 'Erreur serveur');
    } finally {
      setProcessing(false);
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const { data } = await askDocument(doc.id, q);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources || [] },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ Erreur lors de la génération de la réponse.', sources: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Non indexé ─────────────────────────────────────────────────────────── */
  if (!indexed) {
    return (
      <div style={S.notIndexed}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
          Document non indexé
        </p>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
          Indexez ce document pour pouvoir lui poser des questions,<br />
          faire une recherche sémantique ou une comparaison.
        </p>
        <button onClick={handleProcess} disabled={processing} style={S.btnProcess}>
          {processing ? <><Spinner /> Analyse en cours…</> : '🔍 Analyser le document'}
        </button>
        {processing && (
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
            Extraction · Découpage · Embeddings — quelques secondes…
          </p>
        )}
      </div>
    );
  }

  /* ── Chat ───────────────────────────────────────────────────────────────── */
  return (
    <div style={S.wrap}>

      {/* Messages */}
      <div style={S.messages}>
        {messages.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Posez une question sur ce document
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
              Exemples :<br />
              "Quelles sont les parties contractantes ?"<br />
              "Quelles sont les obligations du prestataire ?"<br />
              "Y a-t-il une clause de résiliation ?"
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{ ...S.msgRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div>
              <div
                style={{
                  ...S.bubble,
                  background:   m.role === 'user' ? '#1e40af' : '#f1f5f9',
                  color:        m.role === 'user' ? '#fff'    : '#0f172a',
                  borderRadius: m.role === 'user'
                    ? '16px 16px 4px 16px'
                    : '16px 16px 16px 4px',
                }}
              >
                {m.content}
              </div>

              {m.sources?.length > 0 && (
                <div style={S.sources}>
                  📎&nbsp;
                  {m.sources.map((s, si) => (
                    <span key={si} style={S.sourceChip}>
                      {s.filename}&nbsp;({Math.round((s.score || 0) * 100)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...S.msgRow, justifyContent: 'flex-start' }}>
            <div
              style={{
                ...S.bubble,
                background: '#f1f5f9',
                color:      '#64748b',
                display:    'flex',
                alignItems: 'center',
                gap:        8,
              }}
            >
              <Spinner /> IA en cours de réflexion…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={S.inputRow}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
          placeholder="Votre question…"
          disabled={loading}
          style={S.input}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !input.trim()}
          style={{
            ...S.btnSend,
            opacity: loading || !input.trim() ? 0.5 : 1,
            cursor:  loading || !input.trim() ? 'default' : 'pointer',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <span
      style={{
        display:      'inline-block',
        width:        14,
        height:       14,
        border:       '2px solid #cbd5e1',
        borderTop:    '2px solid #3b82f6',
        borderRadius: '50%',
        animation:    'spin 0.7s linear infinite',
        flexShrink:   0,
      }}
    />
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const S = {
  wrap: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    fontFamily:    "'DM Sans', sans-serif",
  },
  notIndexed: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '40px 24px',
    textAlign:      'center',
    flex:           1,
  },
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '16px 14px',
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
  },
  empty: {
    textAlign: 'center',
    color:     '#64748b',
    padding:   '32px 16px',
    margin:    'auto',
  },
  msgRow: {
    display: 'flex',
  },
  bubble: {
    maxWidth:  '86%',
    padding:   '10px 14px',
    fontSize:  13,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  sources: {
    fontSize:   11,
    color:      '#64748b',
    marginTop:  5,
    display:    'flex',
    flexWrap:   'wrap',
    gap:        4,
    alignItems: 'center',
  },
  sourceChip: {
    background:   '#dbeafe',
    color:        '#1e40af',
    padding:      '2px 7px',
    borderRadius: 8,
    fontSize:     10,
    fontWeight:   600,
  },
  inputRow: {
    display:   'flex',
    gap:       8,
    padding:   '10px 12px',
    borderTop: '1px solid #e2e8f0',
  },
  input: {
    flex:         1,
    padding:      '9px 13px',
    border:       '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize:     13,
    outline:      'none',
    fontFamily:   'inherit',
    background:   '#f8fafc',
    color:        '#0f172a',
  },
  btnSend: {
    width:          36,
    height:         36,
    borderRadius:   10,
    border:         'none',
    background:     '#1e40af',
    color:          '#fff',
    fontSize:       16,
    fontWeight:     700,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  btnProcess: {
    display:      'flex',
    alignItems:   'center',
    gap:          8,
    padding:      '11px 22px',
    background:   'linear-gradient(135deg, #7c3aed, #1e40af)',
    color:        '#fff',
    border:       'none',
    borderRadius: 10,
    fontSize:     14,
    fontWeight:   600,
    cursor:       'pointer',
    fontFamily:   'inherit',
  },
};

/*
  Ajoute dans index.css si pas déjà présent :

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
*/