// pages/RagPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interface utilisateur pour le système RAG :
//   • Sélection du dossier
//   • Upload de documents pour ingestion
//   • Chat Q&A avec citations
//   • Résumé automatique du dossier
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import api from '../axiosInstance';
import '../styles/RagPage.css';

export default function RagPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [cases, setCases]           = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [summary, setSummary]       = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Chat
  const [question, setQuestion]     = useState('');
  const [messages, setMessages]     = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);

  // Upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState('');

  // History
  const [history, setHistory]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const chatEndRef = useRef(null);

  // ── Charger les dossiers ───────────────────────────────────────────────────
  useEffect(() => {
    api.get('/cases-list')
      .then(res => {
        const data = res.data?.data || res.data || [];
        setCases(Array.isArray(data) ? data : []);
      })
      .catch(() => setCases([]));
  }, []);

  // ── Quand un dossier est sélectionné → charger le résumé ───────────────────
  useEffect(() => {
    if (!selectedCase) { setSummary(null); setHistory([]); return; }
    fetchSummary(selectedCase.id);
    fetchHistory(selectedCase.id);
  }, [selectedCase]);

  // ── Scroll auto du chat ────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── API Calls ──────────────────────────────────────────────────────────────

  async function fetchSummary(dossierId) {
    setLoadingSummary(true);
    setSummary(null);
    try {
      const res = await api.get(`/dossiers/${dossierId}/summary`);
      if (res.data?.success) setSummary(res.data.data);
      else setSummary(null);
    } catch {
      setSummary(null);
    }
    setLoadingSummary(false);
  }

  async function fetchHistory(dossierId) {
    try {
      const res = await api.get(`/rag/history/${dossierId}?limit=10`);
      if (res.data?.success) setHistory(res.data.data);
    } catch { /* silencieux */ }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !selectedCase) return;

    setUploading(true);
    setUploadMsg('');

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('dossier_id', selectedCase.id);

    try {
      const res = await api.post('/rag/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg(res.data?.success
        ? `✅ ${res.data.message}`
        : `❌ ${res.data.message}`
      );
      setUploadFile(null);
      // Re-fetch summary après un court délai (laisse le background processing finir)
      setTimeout(() => fetchSummary(selectedCase.id), 5000);
    } catch (err) {
      setUploadMsg(`❌ Erreur : ${err.response?.data?.message || err.message}`);
    }
    setUploading(false);
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim() || !selectedCase) return;

    const q = question.trim();
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setLoadingChat(true);

    try {
      const res = await api.post('/rag/query', {
        dossier_id: selectedCase.id,
        question: q,
      });

      if (res.data?.success) {
        const d = res.data.data;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: d.reponse,
          citations: d.citations,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ ${res.data.message}`,
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur : ${err.response?.data?.message || err.message}`,
      }]);
    }
    setLoadingChat(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rag-page">
      {/* ── Panneau gauche : sélection dossier + résumé ─────────────────────── */}
      <aside className="rag-sidebar">
        <h3 className="rag-sidebar-title">🧠 RAG — Assistant IA</h3>

        {/* Sélecteur de dossier */}
        <div className="rag-section">
          <label className="rag-label">Dossier :</label>
          <select
            className="rag-select"
            value={selectedCase?.id || ''}
            onChange={e => {
              const c = cases.find(c => c.id === parseInt(e.target.value));
              setSelectedCase(c || null);
              setMessages([]);
            }}
          >
            <option value="">— Choisir un dossier —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                #{c.id} — {c.titre || c.reference || c.nom || `Dossier ${c.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Upload */}
        {selectedCase && (
          <div className="rag-section">
            <label className="rag-label">📄 Ingérer un document :</label>
            <form onSubmit={handleUpload} className="rag-upload-form">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={e => setUploadFile(e.target.files[0])}
                className="rag-file-input"
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="rag-btn rag-btn-upload"
              >
                {uploading ? '⏳ En cours...' : '📤 Ingérer'}
              </button>
            </form>
            {uploadMsg && <div className="rag-upload-msg">{uploadMsg}</div>}
          </div>
        )}

        {/* Résumé du dossier */}
        {selectedCase && (
          <div className="rag-section rag-summary-section">
            <h4 className="rag-label">📋 Résumé du dossier</h4>
            {loadingSummary ? (
              <div className="rag-loading">Chargement du résumé...</div>
            ) : summary ? (
              <div className="rag-summary">
                <p className="rag-summary-text">{summary.resume_global}</p>
                <div className="rag-summary-meta">
                  <span>📁 {summary.documents_comptes} document(s)</span>
                  {summary.updated_at && (
                    <span>🕐 {new Date(summary.updated_at).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
                {summary.entites && Object.keys(summary.entites).length > 0 && (
                  <div className="rag-entities">
                    <strong>🏷️ Entités :</strong>
                    {summary.entites.parties_impliquees && (
                      <div><em>Parties :</em> {summary.entites.parties_impliquees.join(', ')}</div>
                    )}
                    {summary.entites.type_affaire && (
                      <div><em>Type :</em> {summary.entites.type_affaire}</div>
                    )}
                    {summary.entites.montants?.length > 0 && (
                      <div><em>Montants :</em> {summary.entites.montants.join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rag-no-summary">
                Aucun résumé disponible. Ingérez des documents pour commencer.
              </div>
            )}
          </div>
        )}

        {/* Historique */}
        {selectedCase && history.length > 0 && (
          <div className="rag-section">
            <button
              className="rag-btn rag-btn-history"
              onClick={() => setShowHistory(!showHistory)}
            >
              📜 {showHistory ? 'Masquer' : 'Voir'} l'historique ({history.length})
            </button>
            {showHistory && (
              <div className="rag-history-list">
                {history.map((h, i) => (
                  <div key={i} className="rag-history-item" onClick={() => {
                    setQuestion(h.question);
                  }}>
                    <div className="rag-history-q">Q: {h.question}</div>
                    <div className="rag-history-date">
                      {new Date(h.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Panneau droit : chat RAG ──────────────────────────────────────────── */}
      <main className="rag-chat-area">
        {!selectedCase ? (
          <div className="rag-empty-state">
            <div className="rag-empty-icon">🧠</div>
            <h2>Assistant Juridique IA</h2>
            <p>Sélectionnez un dossier dans le panneau gauche pour poser vos questions.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="rag-chat-header">
              <h3>
                💬 Chat — Dossier #{selectedCase.id}
                {selectedCase.titre && ` — ${selectedCase.titre}`}
              </h3>
            </div>

            {/* Messages */}
            <div className="rag-messages">
              {messages.length === 0 && (
                <div className="rag-welcome-msg">
                  <p>👋 Posez votre question sur ce dossier. L'IA répondra uniquement en se basant sur les documents ingérés.</p>
                  <div className="rag-example-questions">
                    <strong>Exemples :</strong>
                    {['Quel est le résumé de ce dossier ?',
                      'Quels sont les montants en jeu ?',
                      'Quelles sont les parties impliquées ?',
                      'Y a-t-il des dates limites importantes ?'
                    ].map((q, i) => (
                      <button key={i} className="rag-example-btn" onClick={() => setQuestion(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`rag-message rag-message-${msg.role}`}>
                  <div className="rag-message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="rag-message-body">
                    <div className="rag-message-content">{msg.content}</div>

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="rag-citations">
                        <details>
                          <summary className="rag-citations-title">
                            📌 {msg.citations.length} source(s) citée(s)
                          </summary>
                          {msg.citations.map((c, j) => (
                            <div key={j} className="rag-citation-card">
                              <div className="rag-citation-header">
                                <span className="rag-citation-badge">[{c.source_index}]</span>
                                <strong>{c.nom_document}</strong>
                                <span className="rag-citation-page">p. {c.page_numero}</span>
                                <span className="rag-citation-score">
                                  Score: {(c.score_pertinence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <p className="rag-citation-text">{c.extrait}</p>
                              <div className="rag-citation-type">
                                {c.type_recherche?.map(t => (
                                  <span key={t} className={`rag-tag rag-tag-${t}`}>{t}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loadingChat && (
                <div className="rag-message rag-message-assistant">
                  <div className="rag-message-avatar">🤖</div>
                  <div className="rag-message-body">
                    <div className="rag-typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form className="rag-input-area" onSubmit={handleAsk}>
              <input
                type="text"
                className="rag-input"
                placeholder="Posez votre question sur le dossier..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={loadingChat}
              />
              <button
                type="submit"
                className="rag-btn rag-btn-send"
                disabled={!question.trim() || loadingChat}
              >
                {loadingChat ? '⏳' : '🚀'} Envoyer
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
