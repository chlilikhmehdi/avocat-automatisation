/**
 * src/components/automation/CaseAutomationPanel.js
 *
 * Panneau d'automatisation à intégrer dans le détail d'un dossier (CaseDetail).
 * Affiche en un seul endroit :
 *   - Bouton "Classifier ce dossier"
 *   - Résultat de classification (type + confiance + scores)
 *   - Niveau d'urgence avec raisons
 *   - Résumé financier
 *   - Suggestions juridiques priorisées
 *   - Génération de lettres (sélection + aperçu + copie)
 *
 * Usage dans CaseDetail.jsx :
 *   import CaseAutomationPanel from '../../components/automation/CaseAutomationPanel';
 *   <CaseAutomationPanel caseId={id} currentUser={currentUser} />
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  classifyCase, getClassification,
  generateLetter, getLetters,
} from '../../api/automation';

// ── Métadonnées visuelles ──────────────────────────────────────────────────────
const TYPE_META = {
  credit:         { label:'Crédit',         icon:'🏦', color:'#3b82f6', bg:'#eff6ff' },
  impaye:         { label:'Impayé',         icon:'⚠️', color:'#ea580c', bg:'#fff7ed' },
  solde_debiteur: { label:'Solde Débiteur', icon:'📉', color:'#dc2626', bg:'#fef2f2' },
  autre:          { label:'Non classifié',  icon:'📁', color:'#6b7280', bg:'#f9fafb' },
};

const URGENCY_META = {
  CRITIQUE: { color:'#dc2626', bg:'#fef2f2', icon:'🔴', label:'Critique' },
  HAUTE:    { color:'#ea580c', bg:'#fff7ed', icon:'🟠', label:'Haute'    },
  NORMALE:  { color:'#ca8a04', bg:'#fefce8', icon:'🟡', label:'Normale'  },
  BASSE:    { color:'#16a34a', bg:'#f0fdf4', icon:'🟢', label:'Basse'    },
};

const PRIORITY_META = {
  CRITIQUE: { color:'#dc2626', bg:'#fef2f2' },
  HAUTE:    { color:'#ea580c', bg:'#fff7ed' },
  NORMALE:  { color:'#ca8a04', bg:'#fefce8' },
  BASSE:    { color:'#16a34a', bg:'#f0fdf4' },
};

const LETTER_OPTIONS = [
  { type:'mise_en_demeure_credit',       label:'Mise en demeure — Crédit',          icon:'⚠️', for:['credit'] },
  { type:'mise_en_demeure_impaye',       label:'Mise en demeure — Impayé',          icon:'⚠️', for:['impaye'] },
  { type:'mise_en_demeure_solde',        label:'Mise en demeure — Solde débiteur',  icon:'⚠️', for:['solde_debiteur'] },
  { type:'relance_amiable',             label:'Relance amiable',                   icon:'✉️', for:['credit','impaye','solde_debiteur','autre'] },
  { type:'convocation_conciliation',    label:'Convocation conciliation',           icon:'🤝', for:['credit','impaye','solde_debiteur','autre'] },
  { type:'assignation_injonction_payer',label:'Injonction de payer',               icon:'⚖️', for:['credit','impaye','solde_debiteur'] },
];

const fmtMoney = (n) =>
  n != null ? `${parseFloat(n).toLocaleString('fr-MA', { minimumFractionDigits:2 })} MAD` : '—';

// ═══════════════════════════════════════════════════════════════════════════════
export default function CaseAutomationPanel({ caseId, currentUser }) {
  // ── États ──────────────────────────────────────────────────────────────────
  const [result,      setResult]      = useState(null);   // résultat classify()
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [tab,         setTab]         = useState('classification'); // classification | suggestions | letters
  const [letters,     setLetters]     = useState([]);
  const [selLetter,   setSelLetter]   = useState('');
  const [genLoading,  setGenLoading]  = useState(false);
  const [genResult,   setGenResult]   = useState(null);   // lettre générée
  const [copied,      setCopied]      = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  // ── Chargement initial : classification existante + lettres ─────────────────
  useEffect(() => {
    if (!caseId) return;

    getClassification(caseId)
      .then(res => {
        if (res.success && res.data) {
          // Reconstruit un objet compatible avec le résultat classify()
          setResult({
            classification: {
              type:       res.data.type,
              label:      TYPE_META[res.data.type]?.label || res.data.type,
              score:      res.data.score,
              confidence: 0,
              reasons:    [],
            },
            urgency: {
              level:   res.data.urgency_level,
              reasons: [],
              color:   URGENCY_META[res.data.urgency_level]?.color || '#ca8a04',
            },
            suggestions:       res.data.suggestions || [],
            financial_summary: null,
            _fromCache:        true,
          });
        }
      })
      .catch(() => {});

    getLetters(caseId)
      .then(res => { if (res.success) setLetters(res.data || []); })
      .catch(() => {});
  }, [caseId]);

  // ── Lancer la classification ─────────────────────────────────────────────────
  const handleClassify = async () => {
    setLoading(true); setError('');
    try {
      const res = await classifyCase(caseId);
      if (res.success) { setResult(res.data); showToast('Classification terminée'); }
      else setError(res.message || 'Erreur de classification');
    } catch (e) {
      setError(e?.response?.data?.message || 'Impossible de contacter le serveur');
    } finally { setLoading(false); }
  };

  // ── Générer une lettre ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selLetter) { showToast('Sélectionnez un type de lettre', 'error'); return; }
    setGenLoading(true); setGenResult(null);
    try {
      const res = await generateLetter(caseId, selLetter);
      if (res.success) {
        setGenResult(res.data);
        // Rafraîchir la liste
        getLetters(caseId).then(r => { if (r.success) setLetters(r.data || []); }).catch(() => {});
        showToast('Lettre générée avec succès');
      } else {
        setError(res.message || 'Erreur de génération');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Erreur serveur');
    } finally { setGenLoading(false); }
  };

  // ── Copier la lettre ──────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!genResult?.content) return;
    navigator.clipboard.writeText(genResult.content).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Types de lettres disponibles selon la classification ────────────────────
  const currentType = result?.classification?.type || 'autre';
  const availableLetters = LETTER_OPTIONS.filter(l => l.for.includes(currentType));

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.wrap}>

      {/* ── En-tête du panneau ───────────────────────────────────────── */}
      <div style={S.panelHeader}>
        <span style={{ fontSize:22 }}>🤖</span>
        <div style={{ flex:1 }}>
          <div style={S.panelTitle}>Automatisation du dossier</div>
          <div style={S.panelSub}>Classification NLP · Suggestions · Génération de lettres</div>
        </div>
        <button
          style={{ ...S.btnClassify, opacity: loading ? .7 : 1 }}
          onClick={handleClassify}
          disabled={loading}
        >
          {loading ? '⏳ Analyse…' : result?._fromCache ? '🔄 Reclassifier' : '🔍 Classifier'}
        </button>
      </div>

      {/* ── Erreur ───────────────────────────────────────────────────── */}
      {error && (
        <div style={S.errorBar}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={S.errClose}>×</button>
        </div>
      )}

      {/* ── Pas encore classifié ─────────────────────────────────────── */}
      {!result && !loading && (
        <div style={S.emptyState}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <p style={{ color:'#64748b', fontSize:14, marginBottom:16 }}>
            Ce dossier n'a pas encore été analysé automatiquement.
          </p>
          <p style={{ color:'#94a3b8', fontSize:12 }}>
            La classification analyse le titre du dossier, l'historique des actions,
            les factures et les paiements pour détecter automatiquement le type de dossier.
          </p>
        </div>
      )}

      {/* ── Résultat disponible ───────────────────────────────────────── */}
      {result && (
        <>
          {/* Badges type + urgence */}
          <div style={S.badgesRow}>
            <TypeBadge type={result.classification.type} />
            <UrgencyBadge level={result.urgency?.level} />
            {result.classification.confidence > 0 && (
              <span style={S.confBadge}>
                Confiance : {result.classification.confidence}%
              </span>
            )}
            {result._fromCache && (
              <span style={{ fontSize:11, color:'#94a3b8', marginLeft:4 }}>
                (depuis la DB)
              </span>
            )}
          </div>

          {/* Résumé financier */}
          {result.financial_summary && (
            <div style={S.finRow}>
              <FinBox label="Total dû"   value={fmtMoney(result.financial_summary.total_due)}   color="#ea580c" />
              <FinBox label="Payé"       value={fmtMoney(result.financial_summary.total_paid)}  color="#16a34a" />
              <FinBox label="Solde"      value={fmtMoney(result.financial_summary.balance)}      color={result.financial_summary.balance > 0 ? '#dc2626' : '#16a34a'} />
              <FinBox label="Factures"   value={result.financial_summary.total_invoices}         color="#3b82f6" />
            </div>
          )}

          {/* Onglets */}
          <div style={S.tabs}>
            {[
              { id:'classification', label:`📊 Classification` },
              { id:'suggestions',    label:`💡 Suggestions (${result.suggestions?.length || 0})` },
              { id:'letters',        label:`✉️ Lettres (${letters.length})` },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ ...S.tab, ...(tab === t.id ? S.tabActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={S.tabBody}>

            {/* ── Onglet Classification ─────────────────────────────── */}
            {tab === 'classification' && (
              <div>
                {/* Scores détaillés */}
                {result.classification.all_scores?.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <div style={S.sectionLabel}>Scores par type</div>
                    {result.classification.all_scores.map((s, i) => {
                      const meta = TYPE_META[s.type] || TYPE_META.autre;
                      const max  = Math.max(...result.classification.all_scores.map(x => x.score), 1);
                      const pct  = Math.round((s.score / max) * 100);
                      return (
                        <div key={i} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                            <span style={{ fontWeight:600, color:'#0f172a' }}>{meta.icon} {meta.label}</span>
                            <span style={{ color:meta.color, fontWeight:700 }}>{s.score} pts</span>
                          </div>
                          <div style={{ height:7, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:meta.color, borderRadius:4, transition:'width .4s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Raisons de classification */}
                {result.classification.reasons?.length > 0 && (
                  <div>
                    <div style={S.sectionLabel}>Éléments détectés</div>
                    {result.classification.reasons.map((r, i) => (
                      <div key={i} style={S.reasonRow}>
                        <span style={{ color:'#10b981', fontSize:14 }}>✓</span>
                        <span style={{ fontSize:13, color:'#334155' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Raisons urgence */}
                {result.urgency?.reasons?.length > 0 && (
                  <div style={{ marginTop:16 }}>
                    <div style={S.sectionLabel}>Raisons du niveau d'urgence</div>
                    {result.urgency.reasons.map((r, i) => (
                      <div key={i} style={S.reasonRow}>
                        <span style={{ color:'#f59e0b', fontSize:14 }}>⚡</span>
                        <span style={{ fontSize:13, color:'#334155' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Onglet Suggestions ───────────────────────────────── */}
            {tab === 'suggestions' && (
              <div>
                {!result.suggestions?.length ? (
                  <p style={S.dim}>Aucune suggestion disponible — reclassifier le dossier.</p>
                ) : (
                  result.suggestions.map((s, i) => {
                    const pm = PRIORITY_META[s.priority] || PRIORITY_META.NORMALE;
                    return (
                      <div key={i} style={{ ...S.suggCard, borderLeftColor: pm.color }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'#0f172a', flex:1, marginRight:8 }}>
                            {s.action}
                          </span>
                          <span style={{ background:pm.bg, color:pm.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:8, whiteSpace:'nowrap', flexShrink:0 }}>
                            {s.priority}
                          </span>
                        </div>
                        <p style={{ fontSize:13, color:'#64748b', margin:0, lineHeight:1.6 }}>
                          {s.detail}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Onglet Lettres ──────────────────────────────────── */}
            {tab === 'letters' && (
              <div>
                {/* Sélecteur de lettre */}
                <div style={{ marginBottom:16 }}>
                  <div style={S.sectionLabel}>Générer une nouvelle lettre</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <select
                      value={selLetter}
                      onChange={e => { setSelLetter(e.target.value); setGenResult(null); }}
                      style={{ ...S.select, flex:1 }}
                    >
                      <option value="">— Choisir un type de lettre —</option>
                      {availableLetters.map(l => (
                        <option key={l.type} value={l.type}>{l.icon} {l.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerate}
                      disabled={genLoading || !selLetter}
                      style={{ ...S.btnGenerate, opacity: genLoading || !selLetter ? .6 : 1 }}
                    >
                      {genLoading ? '⏳' : '✍️ Générer'}
                    </button>
                  </div>
                </div>

                {/* Aperçu de la lettre générée */}
                {genResult && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <div style={S.sectionLabel}>Aperçu</div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button
                          onClick={handleCopy}
                          style={{ ...S.btnCopy, background: copied ? '#16a34a' : '#1e40af' }}
                        >
                          {copied ? '✓ Copié !' : '📋 Copier'}
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([genResult.content], { type:'text/plain;charset=utf-8' });
                            const url  = URL.createObjectURL(blob);
                            const a    = document.createElement('a');
                            a.href     = url;
                            a.download = `${selLetter}_dossier_${caseId}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          style={S.btnDownload}
                        >
                          ⬇️ Télécharger
                        </button>
                      </div>
                    </div>
                    <pre style={S.letterPreview}>{genResult.content}</pre>
                  </div>
                )}

                {/* Historique des lettres */}
                {letters.length > 0 && (
                  <div>
                    <div style={S.sectionLabel}>Lettres précédemment générées</div>
                    {letters.map((l, i) => (
                      <div key={i} style={S.letterHistRow}>
                        <span style={{ fontSize:16 }}>✉️</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>
                            {LETTER_OPTIONS.find(x => x.type === l.letter_type)?.label || l.letter_type}
                          </div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                            {new Date(l.generated_at).toLocaleString('fr-MA')}
                          </div>
                          {l.preview && (
                            <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0', fontStyle:'italic' }}>
                              {l.preview}…
                            </p>
                          )}
                        </div>
                        {l.is_used && (
                          <span style={{ fontSize:11, color:'#16a34a', fontWeight:600 }}>✓ Utilisée</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {letters.length === 0 && !genResult && (
                  <p style={S.dim}>Aucune lettre générée pour ce dossier.</p>
                )}
              </div>
            )}

          </div>
        </>
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

// ── Sous-composants ────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.autre;
  return (
    <span style={{ background:m.bg, color:m.color, border:`1px solid ${m.color}40`, padding:'5px 12px', borderRadius:20, fontSize:13, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5 }}>
      {m.icon} {m.label}
    </span>
  );
}

function UrgencyBadge({ level }) {
  const m = URGENCY_META[level] || URGENCY_META.NORMALE;
  return (
    <span style={{ background:m.bg, color:m.color, border:`1px solid ${m.color}40`, padding:'5px 12px', borderRadius:20, fontSize:13, fontWeight:700 }}>
      {m.icon} {m.label}
    </span>
  );
}

function FinBox({ label, value, color }) {
  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 14px', textAlign:'center', flex:1 }}>
      <div style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color }}>{value}</div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  wrap:          { background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', fontFamily:"'DM Sans',sans-serif" },
  panelHeader:   { display:'flex', alignItems:'center', gap:12, padding:'18px 22px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' },
  panelTitle:    { fontSize:15, fontWeight:700, color:'#0f172a', margin:0 },
  panelSub:      { fontSize:12, color:'#64748b', marginTop:2 },
  errorBar:      { padding:'10px 18px', background:'#fef2f2', borderBottom:'1px solid #fecaca', color:'#dc2626', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center' },
  errClose:      { background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:18, lineHeight:1 },
  emptyState:    { padding:'36px 24px', textAlign:'center' },
  badgesRow:     { display:'flex', flexWrap:'wrap', gap:8, padding:'14px 22px', borderBottom:'1px solid #f1f5f9', alignItems:'center' },
  confBadge:     { fontSize:12, color:'#64748b', padding:'4px 10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:16 },
  finRow:        { display:'flex', gap:8, padding:'12px 22px', borderBottom:'1px solid #f1f5f9' },
  tabs:          { display:'flex', borderBottom:'1px solid #e2e8f0', padding:'0 22px', background:'#fafafa', gap:2 },
  tab:           { padding:'11px 16px', fontSize:13, fontWeight:500, background:'none', border:'none', cursor:'pointer', color:'#64748b', borderBottom:'2px solid transparent', whiteSpace:'nowrap' },
  tabActive:     { color:'#1e40af', borderBottomColor:'#1e40af', fontWeight:700 },
  tabBody:       { padding:'20px 22px', maxHeight:420, overflowY:'auto' },
  sectionLabel:  { fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10 },
  reasonRow:     { display:'flex', gap:8, alignItems:'flex-start', marginBottom:7, padding:'6px 10px', background:'#f8fafc', borderRadius:7 },
  suggCard:      { background:'#fff', border:'1px solid #e2e8f0', borderLeft:'4px solid', borderRadius:9, padding:'12px 16px', marginBottom:10 },
  select:        { padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', background:'#f8fafc' },
  letterPreview: { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'16px', fontSize:12, lineHeight:1.8, color:'#334155', whiteSpace:'pre-wrap', maxHeight:300, overflowY:'auto', fontFamily:'monospace' },
  letterHistRow: { display:'flex', gap:10, alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid #f8fafc' },
  dim:           { fontSize:13, color:'#94a3b8', fontStyle:'italic' },
  btnClassify:   { background:'#1e40af', color:'#fff', border:'none', padding:'9px 18px', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' },
  btnGenerate:   { background:'#7c3aed', color:'#fff', border:'none', padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' },
  btnCopy:       { color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' },
  btnDownload:   { background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#334155', padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer' },
};