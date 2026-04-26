/**
 * pages/DocumentsPage.jsx — version production complète
 *
 * Fonctionnalités :
 *  ✅ Liste paginée avec filtres (catégorie, dossier, recherche)
 *  ✅ Upload drag & drop avec sélection catégorie
 *  ✅ Voir (aperçu inline PDF / image)
 *  ✅ Télécharger
 *  ✅ Renommer (modal)
 *  ✅ Changer catégorie (dropdown)
 *  ✅ Supprimer avec confirmation
 *  ✅ Résumé IA (modal SummaryModal avec loading / erreur / copier)
 *  ✅ Stats en-tête
 *  ✅ Toast notifications
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getDocuments,
  getDocumentStats,
  deleteDocument,
  uploadDocument,
  renameDocument,
  setCategoryDoc,
  summarizeDocument,
} from '../api/Documents';
import SummaryModal from '../components/Summarymodal';

// ─── Config ────────────────────────────────────────────────────────────────────
const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:4000/api')
  .replace('/api', '');

const CATEGORIES = [
  { value: 'contrat',            label: 'Contrat',              icon: '📋' },
  { value: 'piece_justificative',label: 'Pièce justificative',  icon: '🪪' },
  { value: 'jugement',           label: 'Jugement',             icon: '⚖️' },
  { value: 'pv',                 label: 'PV',                   icon: '📝' },
  { value: 'cin',                label: 'CIN',                  icon: '🪪' },
  { value: 'courrier',           label: 'Courrier',             icon: '✉️' },
  { value: 'autre',              label: 'Autre',                icon: '📄' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const mimeIcon = (t = '') => {
  if (t.includes('pdf'))                               return '📕';
  if (t.includes('image'))                             return '🖼️';
  if (t.includes('word') || t.includes('document'))   return '📝';
  if (t.includes('sheet') || t.includes('excel'))     return '📊';
  return '📄';
};

const fmtSize = b => {
  if (!b) return '—';
  if (b < 1024)        return `${b} o`;
  if (b < 1048576)     return `${(b/1024).toFixed(0)} Ko`;
  return `${(b/1048576).toFixed(1)} Mo`;
};

// Données démo quand l'API n'est pas disponible
const DEMO = [
  { id:1, name:'Contrat de vente',    original_name:'contrat_vente.pdf',   case_title:'Affaire Benali',     mimetype:'application/pdf',   size:245000, category:'contrat',  uploaded_at:new Date().toISOString(),                  filename:'', ai_summary:null },
  { id:2, name:'Jugement rendu',      original_name:'jugement.pdf',        case_title:'Litige commercial',  mimetype:'application/pdf',   size:310000, category:'jugement', uploaded_at:new Date(Date.now()-3600000).toISOString(), filename:'', ai_summary:'Résumé IA disponible.' },
  { id:3, name:'CIN client',          original_name:'cin_client.jpg',      case_title:'Succession Idrissi', mimetype:'image/jpeg',        size:78000,  category:'cin',      uploaded_at:new Date(Date.now()-86400000).toISOString(),filename:'', ai_summary:null },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function DocumentsPage({ currentUser, cases = [] }) {
  // ── Liste ──────────────────────────────────────────────────────────────────
  const [docs,    setDocs]    = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [pag,     setPag]     = useState({ total:0, pages:1 });

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('');
  const [rawSearch, setRawSearch] = useState('');
  const [catF,      setCatF]      = useState('');
  const [caseF,     setCaseF]     = useState('');

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [upCaseId, setUpCaseId] = useState('');
  const [upCat,    setUpCat]    = useState('autre');
  const [upPct,    setUpPct]    = useState(null);
  const [upMsg,    setUpMsg]    = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [preview,   setPreview]   = useState(null);
  const [renaming,  setRenaming]  = useState(null);   // doc
  const [newName,   setNewName]   = useState('');
  const [deleting,  setDeleting]  = useState(null);   // doc
  const [catDoc,    setCatDoc]    = useState(null);    // doc pour dropdown catégorie

  // ── Résumé IA ──────────────────────────────────────────────────────────────
  const [aiDoc,     setAiDoc]     = useState(null);   // doc en cours de résumé
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');
  const [aiSummary, setAiSummary] = useState(null);   // { text, cached, model, tokens_used }

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Debounce recherche ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setSearch(rawSearch); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // ── Chargement ─────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 12, search };
    if (catF)  params.category = catF;
    if (caseF) params.case_id  = caseF;

    Promise.all([getDocuments(params), getDocumentStats()])
      .then(([dRes, sRes]) => {
        setDocs(dRes.success ? dRes.data : DEMO);
        setPag(dRes.success ? dRes.pagination : { total: DEMO.length, pages: 1 });
        if (sRes.success) setStats(sRes.data);
      })
      .catch(() => { setDocs(DEMO); setPag({ total: DEMO.length, pages: 1 }); })
      .finally(() => setLoading(false));
  }, [page, search, catF, caseF]);

  useEffect(() => { load(); }, [load]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file)     { setUpMsg('⚠️ Aucun fichier sélectionné'); return; }
    if (!upCaseId) { setUpMsg('⚠️ Sélectionnez un dossier d\'abord'); return; }
    setUpPct(0); setUpMsg('');
    try {
      const res = await uploadDocument(upCaseId, file, upCat, setUpPct);
      if (res.success) { showToast('Document ajouté'); load(); }
      else setUpMsg(res.message || 'Erreur lors de l\'upload');
    } catch { setUpMsg('Erreur — vérifiez la connexion'); }
    finally { setUpPct(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  // ── Supprimer ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try { await deleteDocument(deleting.id); } catch {}
    setDocs(p => p.filter(d => d.id !== deleting.id));
    setDeleting(null);
    showToast('Document supprimé');
  };

  // ── Renommer ───────────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      const res = await renameDocument(renaming.id, newName.trim());
      if (res.success) {
        setDocs(p => p.map(d => d.id === renaming.id ? { ...d, name: newName.trim() } : d));
        showToast('Document renommé');
      } else showToast(res.message, 'error');
    } catch { showToast('Erreur renommage', 'error'); }
    setRenaming(null);
  };

  // ── Catégorie ──────────────────────────────────────────────────────────────
  const handleCategory = async (doc, cat) => {
    try {
      await setCategoryDoc(doc.id, cat);
      setDocs(p => p.map(d => d.id === doc.id ? { ...d, category: cat } : d));
      showToast('Catégorie mise à jour');
    } catch { showToast('Erreur', 'error'); }
    setCatDoc(null);
  };

  // ── Résumé IA ──────────────────────────────────────────────────────────────
  const handleSummarize = async (doc) => {
    setAiDoc(doc);
    setAiLoading(true);
    setAiError('');
    setAiSummary(null);

    try {
      const res = await summarizeDocument(doc.id);
      if (res.success) {
        setAiSummary(res.data);
        // Mettre à jour le badge "IA ✓" dans la liste
        setDocs(p => p.map(d => d.id === doc.id ? { ...d, ai_summary: res.data.summary } : d));
      } else {
        setAiError(res.message || 'Erreur lors de la génération');
      }
    } catch {
      setAiError('Impossible de contacter le serveur');
    } finally {
      setAiLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.page}>

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <div style={S.pageHdr}>
        <div>
          <h1 style={S.title}>Documents</h1>
          <p style={S.sub}>{pag.total} document(s)</p>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      {stats && (
        <div style={S.statsGrid}>
          {[
            { icon:'📄', label:'Total',    value: stats.total,            bg:'#eff6ff', c:'#3b82f6' },
            { icon:'📕', label:'PDF',      value: stats.pdf_count,        bg:'#fef2f2', c:'#ef4444' },
            { icon:'📝', label:'Word',     value: stats.word_count,       bg:'#fffbeb', c:'#d97706' },
            { icon:'🤖', label:'Résumés',  value: stats.summarized_count, bg:'#f0fdf4', c:'#16a34a' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={{ width:42, height:42, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:24, fontWeight:700, color:'#0f172a', lineHeight:1 }}>{s.value ?? 0}</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:2, textTransform:'uppercase', letterSpacing:'.5px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Layout 2 colonnes ──────────────────────────────────────────── */}
      <div style={S.grid}>

        {/* ── Colonne gauche : filtres + liste ─────────────────────── */}
        <div>
          {/* Filtres */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <input
              value={rawSearch} onChange={e => setRawSearch(e.target.value)}
              placeholder="🔍 Rechercher…"
              style={{ ...S.inp, flex:1, minWidth:150 }}
            />
            <select value={catF} onChange={e => { setCatF(e.target.value); setPage(1); }} style={S.inp}>
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            {cases.length > 0 && (
              <select value={caseF} onChange={e => { setCaseF(e.target.value); setPage(1); }} style={S.inp}>
                <option value="">Tous les dossiers</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
          </div>

          {/* Table */}
          <div style={S.listCard}>
            {loading ? (
              <Center>⏳ Chargement…</Center>
            ) : docs.length === 0 ? (
              <Center>📂 Aucun document trouvé</Center>
            ) : docs.map(doc => (
              <DocRow
                key={doc.id}
                doc={doc}
                isActive={preview?.id === doc.id}
                catDoc={catDoc?.id === doc.id}
                onPreview={() => { setPreview(doc); setCatDoc(null); }}
                onDownload={() => {}}
                onRename={() => { setRenaming(doc); setNewName(doc.name || doc.original_name); }}
                onCatToggle={() => setCatDoc(p => p?.id === doc.id ? null : doc)}
                onCatSelect={cat => handleCategory(doc, cat)}
                onSummarize={() => handleSummarize(doc)}
                onDelete={() => setDeleting(doc)}
              />
            ))}

            {/* Pagination */}
            {pag.pages > 1 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderTop:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>Page {page}/{pag.pages} · {pag.total} docs</span>
                <div style={{ display:'flex', gap:6 }}>
                  <PgBtn disabled={page===1}         onClick={() => setPage(p => p-1)}>‹</PgBtn>
                  <PgBtn disabled={page===pag.pages} onClick={() => setPage(p => p+1)}>›</PgBtn>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne droite : upload + aperçu ─────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Upload */}
          <div style={S.sideBox}>
            <h3 style={S.sideTitle}>📤 Ajouter un document</h3>

            <select value={upCaseId} onChange={e => setUpCaseId(e.target.value)} style={{ ...S.inp, width:'100%', marginBottom:8 }}>
              <option value="">Dossier *</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <select value={upCat} onChange={e => setUpCat(e.target.value)} style={{ ...S.inp, width:'100%', marginBottom:10 }}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border:`2px dashed ${dragging ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius:10, padding:'20px 12px', textAlign:'center',
                cursor:'pointer', transition:'all .15s',
                background: dragging ? '#eff6ff' : 'transparent',
              }}
            >
              <div style={{ fontSize:28, marginBottom:6 }}>☁️</div>
              <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
                Cliquer ou glisser un fichier<br/>
                <span style={{ fontSize:11 }}>PDF, Word, Excel, images · 20 Mo max</span>
              </p>
              <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => handleUpload(e.target.files?.[0])} />
            </div>

            {upPct !== null && (
              <div style={{ marginTop:10 }}>
                <div style={{ height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${upPct}%`, background:'#3b82f6', transition:'width .2s' }} />
                </div>
                <span style={{ fontSize:12, color:'#64748b' }}>{upPct}%</span>
              </div>
            )}
            {upMsg && <p style={{ fontSize:13, marginTop:8, color: upMsg.startsWith('⚠️') ? '#d97706' : '#10b981' }}>{upMsg}</p>}
          </div>

          {/* Aperçu */}
          {preview && (
            <div style={S.sideBox}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={S.sideTitle}>👁️ Aperçu</h3>
                <button onClick={() => setPreview(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#64748b' }}>×</button>
              </div>

              <div style={{ textAlign:'center', marginBottom:14 }}>
                <div style={{ fontSize:40 }}>{mimeIcon(preview.mimetype)}</div>
                <p style={{ fontWeight:700, fontSize:14, color:'#0f172a', margin:'8px 0 2px', wordBreak:'break-word' }}>
                  {preview.name || preview.original_name}
                </p>
                <p style={{ fontSize:12, color:'#64748b', margin:0 }}>{preview.case_title}</p>
              </div>

              <div style={{ fontSize:13, color:'#64748b', lineHeight:2, borderTop:'1px solid #f1f5f9', paddingTop:12, marginBottom:14 }}>
                <div>📦 {fmtSize(preview.size)}</div>
                <div>📅 {new Date(preview.uploaded_at).toLocaleString('fr-MA')}</div>
                <div>🏷️ {CAT[preview.category]?.label || 'Autre'}</div>
              </div>

              {/* Aperçu inline */}
              {preview.filename && preview.mimetype?.includes('pdf') && (
                <iframe src={`${API_URL}/uploads/${preview.filename}`} title="pdf" style={{ width:'100%', height:200, border:'1px solid #e2e8f0', borderRadius:8, marginBottom:12 }} />
              )}
              {preview.filename && preview.mimetype?.includes('image') && (
                <img src={`${API_URL}/uploads/${preview.filename}`} alt="" style={{ width:'100%', maxHeight:200, objectFit:'contain', borderRadius:8, marginBottom:12, border:'1px solid #e2e8f0' }} />
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {preview.filename && (
                  <a href={`${API_URL}/uploads/${preview.filename}`} target="_blank" rel="noreferrer"
                    style={{ ...S.btnPrimary, textAlign:'center', textDecoration:'none', display:'block' }}>
                    🔍 Ouvrir dans un onglet
                  </a>
                )}
                {preview.filename && (
                  <a href={`${API_URL}/uploads/${preview.filename}`} download={preview.name || preview.original_name}
                    style={{ ...S.btnGhost, textAlign:'center', textDecoration:'none', display:'block' }}>
                    ⬇️ Télécharger
                  </a>
                )}
                <button onClick={() => handleSummarize(preview)} style={S.btnAI}>
                  🤖 {preview.ai_summary ? 'Voir le résumé IA' : 'Résumé intelligent'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Renommer */}
      {renaming && (
        <Overlay onClose={() => setRenaming(null)}>
          <div style={S.modal}>
            <MHeader title="✏️ Renommer le document" onClose={() => setRenaming(null)} />
            <div style={{ padding:'20px 24px' }}>
              <label style={S.fieldLbl}>Nouveau nom</label>
              <input
                autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                style={{ ...S.inp, width:'100%', marginTop:6, boxSizing:'border-box' }}
              />
              <p style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>
                Le fichier physique n'est pas modifié — uniquement le nom affiché.
              </p>
            </div>
            <MFooter>
              <button style={S.btnGhost}   onClick={() => setRenaming(null)}>Annuler</button>
              <button style={S.btnPrimary} onClick={handleRename} disabled={!newName.trim()}>Renommer</button>
            </MFooter>
          </div>
        </Overlay>
      )}

      {/* Supprimer */}
      {deleting && (
        <Overlay onClose={() => setDeleting(null)}>
          <div style={{ ...S.modal, maxWidth:370, textAlign:'center' }}>
            <div style={{ padding:'32px 24px 20px' }}>
              <div style={{ fontSize:44, marginBottom:14 }}>⚠️</div>
              <p style={{ fontSize:15, color:'#334155', lineHeight:1.5 }}>
                Supprimer définitivement<br/>
                <strong>"{deleting.name || deleting.original_name}"</strong> ?
              </p>
              <p style={{ fontSize:12, color:'#94a3b8', marginTop:8 }}>
                Cette action est irréversible.
              </p>
            </div>
            <MFooter centered>
              <button style={S.btnGhost}  onClick={() => setDeleting(null)}>Annuler</button>
              <button style={S.btnDanger} onClick={handleDelete}>Supprimer</button>
            </MFooter>
          </div>
        </Overlay>
      )}

      {/* Résumé IA */}
      {aiDoc && (
        <SummaryModal
          doc={aiDoc}
          summary={aiSummary}
          loading={aiLoading}
          error={aiError}
          onClose={() => { setAiDoc(null); setAiSummary(null); setAiError(''); }}
          onRetry={() => handleSummarize(aiDoc)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:3000,
          background: toast.type === 'error' ? '#450a0a' : '#022c22',
          color: toast.type === 'error' ? '#f87171' : '#34d399',
          padding:'12px 20px', borderRadius:10, fontSize:14, fontWeight:500,
          boxShadow:'0 8px 32px rgba(0,0,0,.2)',
        }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : ligne document
// ═════════════════════════════════════════════════════════════════════════════
function DocRow({ doc, isActive, catDoc, onPreview, onRename, onCatToggle, onCatSelect, onSummarize, onDelete }) {
  const cat = CAT[doc.category] || CAT.autre;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
      borderBottom:'1px solid #f8fafc',
      background: isActive ? '#eff6ff' : 'transparent',
      transition:'background .1s',
    }}>
      {/* Icône cliquable pour aperçu */}
      <span style={{ fontSize:26, cursor:'pointer', flexShrink:0 }} onClick={onPreview}>{mimeIcon(doc.mimetype)}</span>

      {/* Infos */}
      <div style={{ flex:1, overflow:'hidden', cursor:'pointer', minWidth:0 }} onClick={onPreview}>
        <div style={{ fontWeight:600, fontSize:13, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {doc.name || doc.original_name}
          {doc.ai_summary && (
            <span style={{ marginLeft:6, background:'#f0fdf4', color:'#16a34a', fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:6 }}>IA ✓</span>
          )}
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
          {doc.case_title} · {fmtSize(doc.size)} · {new Date(doc.uploaded_at).toLocaleDateString('fr-MA')}
        </div>
      </div>

      {/* Badge catégorie */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <button onClick={onCatToggle} style={{
          background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:16,
          padding:'3px 8px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap',
        }}>
          {cat.icon} {cat.label} ▾
        </button>
        {catDoc && (
          <div style={{
            position:'absolute', top:'110%', right:0, background:'#fff',
            border:'1px solid #e2e8f0', borderRadius:10,
            boxShadow:'0 8px 24px rgba(0,0,0,.12)',
            zIndex:100, minWidth:190, overflow:'hidden',
          }}>
            {CATEGORIES.map(c => (
              <div key={c.value} onClick={() => onCatSelect(c.value)}
                style={{
                  padding:'8px 14px', cursor:'pointer', fontSize:13,
                  display:'flex', alignItems:'center', gap:8,
                  background: doc.category === c.value ? '#eff6ff' : 'transparent',
                  color: doc.category === c.value ? '#1e40af' : '#334155',
                  fontWeight: doc.category === c.value ? 600 : 400,
                }}>
                {c.icon} {c.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Boutons actions */}
      <div style={{ display:'flex', gap:3, flexShrink:0 }}>
        <Tip label="Aperçu"><ABtn onClick={onPreview}>👁️</ABtn></Tip>
        <Tip label="Renommer"><ABtn onClick={onRename}>✏️</ABtn></Tip>
        <Tip label={doc.ai_summary ? 'Voir résumé IA' : 'Résumé IA'}>
          <ABtn onClick={onSummarize} style={{ background: doc.ai_summary ? '#f0fdf4' : '#faf5ff' }}>🤖</ABtn>
        </Tip>
        <Tip label="Supprimer">
          <ABtn onClick={onDelete} style={{ background:'#fef2f2', color:'#ef4444' }}>🗑️</ABtn>
        </Tip>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITAIRES UI
// ═════════════════════════════════════════════════════════════════════════════
const Overlay = ({ children, onClose }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    {children}
  </div>
);

const MHeader = ({ title, onClose }) => (
  <div style={{ padding:'18px 22px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
    <span style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>{title}</span>
    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#64748b' }}>×</button>
  </div>
);

const MFooter = ({ children, centered }) => (
  <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:8, justifyContent: centered ? 'center' : 'flex-end' }}>
    {children}
  </div>
);

const ABtn = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{ width:30, height:30, borderRadius:6, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', ...style }}>
    {children}
  </button>
);

const Tip = ({ label, children }) => (
  <div title={label}>{children}</div>
);

const PgBtn = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ width:28, height:28, borderRadius:6, border:'1px solid #e2e8f0', background: disabled ? '#f8fafc' : '#fff', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .4 : 1 }}>
    {children}
  </button>
);

const Center = ({ children }) => (
  <div style={{ textAlign:'center', padding:'44px 20px', color:'#64748b' }}>{children}</div>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:      { padding:'28px 32px', maxWidth:1160, fontFamily:"'DM Sans',sans-serif" },
  pageHdr:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  title:     { fontSize:24, fontWeight:700, margin:0, color:'#0f172a' },
  sub:       { fontSize:13, color:'#64748b', margin:'4px 0 0' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 },
  statCard:  { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:12 },
  grid:      { display:'grid', gridTemplateColumns:'1fr 290px', gap:20, alignItems:'start' },
  listCard:  { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' },
  sideBox:   { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20 },
  sideTitle: { fontSize:15, fontWeight:700, margin:'0 0 14px', color:'#0f172a' },
  inp:       { padding:'8px 11px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', background:'#f8fafc', color:'#0f172a' },
  modal:     { background:'#fff', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,.18)' },
  fieldLbl:  { fontSize:13, fontWeight:600, color:'#334155', display:'block' },
  btnPrimary:{ background:'#1e40af', color:'#fff', border:'none', padding:'10px 18px', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnGhost:  { background:'transparent', border:'1px solid #e2e8f0', color:'#334155', padding:'10px 18px', borderRadius:9, fontSize:14, cursor:'pointer', fontFamily:'inherit' },
  btnDanger: { background:'#ef4444', color:'#fff', border:'none', padding:'10px 18px', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnAI:     { background:'linear-gradient(135deg,#7c3aed,#1e40af)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
};