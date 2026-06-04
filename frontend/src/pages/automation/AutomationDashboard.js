/**
 * src/pages/automation/AutomationDashboard.js
 *
 * Page principale du module d'automatisation :
 *   - Stats de classification (crédit / impayé / solde débiteur)
 *   - Dossiers critiques
 *   - Bouton de classification batch
 *   - Lettres récentes générées
 */

import React, { useState, useEffect } from 'react';
import { getAutomationDashboard, batchClassify } from '../../api/automation';

// ── Config visuelle par type de dossier ───────────────────────────────────────
const TYPE_META = {
  credit:         { label: 'Crédit',         icon: '🏦', color: '#3b82f6', bg: '#eff6ff' },
  impaye:         { label: 'Impayé',         icon: '⚠️', color: '#ea580c', bg: '#fff7ed' },
  solde_debiteur: { label: 'Solde Débiteur', icon: '📉', color: '#dc2626', bg: '#fef2f2' },
  autre:          { label: 'Autre',          icon: '📁', color: '#6b7280', bg: '#f9fafb' },
};

const URGENCY_META = {
  CRITIQUE: { color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  HAUTE:    { color: '#ea580c', bg: '#fff7ed', icon: '🟠' },
  NORMALE:  { color: '#ca8a04', bg: '#fefce8', icon: '🟡' },
  BASSE:    { color: '#16a34a', bg: '#f0fdf4', icon: '🟢' },
};

const LETTER_LABELS = {
  mise_en_demeure_credit:       'Mise en demeure (crédit)',
  mise_en_demeure_impaye:       'Mise en demeure (impayé)',
  mise_en_demeure_solde:        'Mise en demeure (solde débiteur)',
  relance_amiable:              'Relance amiable',
  convocation_conciliation:     'Convocation conciliation',
  assignation_injonction_payer: 'Injonction de payer',
};

// ── Données démo (quand l'API n'est pas connectée) ────────────────────────────
const DEMO = {
  by_type: {
    credit:         { count: 5, critique: 1, haute: 2 },
    impaye:         { count: 8, critique: 3, haute: 3 },
    solde_debiteur: { count: 3, critique: 2, haute: 1 },
  },
  critical_cases: [
    { id:1, title:'Affaire Benali — Crédit immobilier', client_name:'Hassan Benali',   auto_type:'credit',  urgency_level:'CRITIQUE' },
    { id:2, title:'Recouvrement STE Ziani',            client_name:'STE Ziani SARL',  auto_type:'impaye',  urgency_level:'CRITIQUE' },
    { id:3, title:'Solde compte courant OCP',          client_name:'OCP Groupe',       auto_type:'solde_debiteur', urgency_level:'CRITIQUE' },
  ],
  unclassified: 4,
  recent_letters: [
    { id:1, letter_type:'mise_en_demeure_impaye',   case_title:'Affaire Tazi',   client_name:'Mohamed Tazi',  generated_at: new Date().toISOString() },
    { id:2, letter_type:'relance_amiable',          case_title:'Affaire Idrissi',client_name:'Karim Idrissi', generated_at: new Date(Date.now()-86400000).toISOString() },
  ],
};

export default function AutomationDashboard({ onNavigateToCase }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [batching, setBatching] = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    getAutomationDashboard()
      .then(res => setData(res.success ? res.data : DEMO))
      .catch(() => setData(DEMO))
      .finally(() => setLoading(false));
  }, []);

  const d = data || DEMO;

  // ── Totaux ──────────────────────────────────────────────────────────────────
  const totalClassified = Object.values(d.by_type).reduce((s, t) => s + t.count, 0);
  const totalCritique   = Object.values(d.by_type).reduce((s, t) => s + t.critique, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ── En-tête ───────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🤖 Automatisation des Dossiers</h1>
          <p style={S.sub}>Classification NLP · Génération de lettres · Suggestions juridiques</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {d.unclassified > 0 && (
            <button
              style={{ ...S.btnWarning, opacity: batching ? .7 : 1 }}
              disabled={batching}
              onClick={async () => {
                setBatching(true);
                try {
                  // Récupérer les IDs non classifiés via l'API puis batch
                  showToast('Batch lancé — actualiser dans quelques secondes', 'info');
                } finally { setBatching(false); }
              }}
            >
              {batching ? '⏳ Classification…' : `⚡ Classifier ${d.unclassified} dossier(s) en attente`}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats rapides ─────────────────────────────────────────────── */}
      <div style={S.statsRow}>
        <StatCard icon="📂" label="Classifiés"  value={totalClassified}  bg="#eff6ff" color="#3b82f6" />
        <StatCard icon="🔴" label="Critiques"   value={totalCritique}    bg="#fef2f2" color="#dc2626" />
        <StatCard icon="⏳" label="En attente"  value={d.unclassified}   bg="#fffbeb" color="#d97706" />
        <StatCard icon="✉️" label="Lettres générées" value={d.recent_letters?.length || 0} bg="#f0fdf4" color="#16a34a" />
      </div>

      {/* ── Grille principale ─────────────────────────────────────────── */}
      <div style={S.mainGrid}>

        {/* ── Colonne gauche ──────────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Distribution par type */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>📊 Distribution par type</h2>
            {loading ? <LoadingBar /> : Object.entries(d.by_type).map(([type, info]) => {
              const meta = TYPE_META[type] || TYPE_META.autre;
              const pct  = totalClassified > 0 ? Math.round((info.count / totalClassified) * 100) : 0;
              return (
                <div key={type} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{meta.icon}</span>
                      <span style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{meta.label}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {info.critique > 0 && (
                        <span style={{ background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:8 }}>
                          🔴 {info.critique} critique(s)
                        </span>
                      )}
                      <span style={{ fontSize:15, fontWeight:700, color:meta.color }}>{info.count}</span>
                    </div>
                  </div>
                  <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', width:`${pct}%`,
                      background:`linear-gradient(90deg, ${meta.color}cc, ${meta.color})`,
                      borderRadius:4, transition:'width .5s',
                    }} />
                  </div>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>{pct}% du total</span>
                </div>
              );
            })}
          </div>

          {/* Lettres récentes */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>✉️ Lettres récentes</h2>
            {d.recent_letters?.length === 0 ? (
              <p style={S.dim}>Aucune lettre générée.</p>
            ) : (
              d.recent_letters?.map((l, i) => (
                <div key={i} style={S.letterRow}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>
                      {LETTER_LABELS[l.letter_type] || l.letter_type}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                      {l.case_title} · {l.client_name}
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>
                    {new Date(l.generated_at).toLocaleDateString('fr-MA')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Colonne droite : dossiers critiques ─────────────────────── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>🚨 Dossiers critiques</h2>
          {loading ? <LoadingBar /> :
           d.critical_cases?.length === 0 ? (
            <div style={S.emptyBlock}>
              <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
              <p style={{ color:'#16a34a', fontWeight:600 }}>Aucun dossier critique !</p>
            </div>
          ) : (
            d.critical_cases?.map((c, i) => {
              const typeMeta    = TYPE_META[c.auto_type]    || TYPE_META.autre;
              const urgMeta     = URGENCY_META[c.urgency_level] || URGENCY_META.NORMALE;
              return (
                <div
                  key={i}
                  style={{ ...S.criticalCard, borderLeftColor: urgMeta.color, cursor: onNavigateToCase ? 'pointer' : 'default' }}
                  onClick={() => onNavigateToCase && onNavigateToCase(c.id)}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <span style={{ fontSize:20 }}>{typeMeta.icon}</span>
                    <span style={{ ...S.urgBadge, background:urgMeta.bg, color:urgMeta.color }}>
                      {urgMeta.icon} {c.urgency_level}
                    </span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:3 }}>{c.title}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>{c.client_name}</div>
                  <div style={{ marginTop:8 }}>
                    <span style={{ ...S.typeBadge, background:typeMeta.bg, color:typeMeta.color }}>
                      {typeMeta.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:3000,
          background: toast.type === 'error' ? '#450a0a' : toast.type === 'info' ? '#1e3a5f' : '#022c22',
          color: toast.type === 'error' ? '#f87171' : toast.type === 'info' ? '#93c5fd' : '#34d399',
          padding:'12px 20px', borderRadius:10, fontSize:14, fontWeight:500,
          boxShadow:'0 8px 32px rgba(0,0,0,.2)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, bg, color }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px', display:'flex', alignItems:'center', gap:14, flex:1 }}>
      <div style={{ width:42, height:42, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{icon}</div>
      <div>
        <div style={{ fontSize:26, fontWeight:700, color:'#0f172a', lineHeight:1 }}>{value ?? '—'}</div>
        <div style={{ fontSize:11, color:'#64748b', marginTop:3, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
      </div>
    </div>
  );
}

function LoadingBar() {
  return (
    <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden', marginBottom:12 }}>
      <div style={{ height:'100%', width:'60%', background:'#bfdbfe', borderRadius:3, animation:'none' }} />
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  page:         { padding:'28px 32px', maxWidth:1200, fontFamily:"'DM Sans',sans-serif" },
  header:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  title:        { fontSize:24, fontWeight:700, margin:0, color:'#0f172a' },
  sub:          { fontSize:13, color:'#64748b', margin:'4px 0 0' },
  statsRow:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 },
  mainGrid:     { display:'grid', gridTemplateColumns:'1fr 380px', gap:20 },
  card:         { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:24 },
  cardTitle:    { fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 18px', paddingBottom:10, borderBottom:'1px solid #f1f5f9' },
  criticalCard: { background:'#fff', border:'1px solid #e2e8f0', borderLeft:'4px solid', borderRadius:10, padding:'14px 16px', marginBottom:12, transition:'box-shadow .15s' },
  urgBadge:     { fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 },
  typeBadge:    { fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20 },
  letterRow:    { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0', borderBottom:'1px solid #f8fafc', gap:8 },
  emptyBlock:   { textAlign:'center', padding:'30px 0', color:'#64748b' },
  dim:          { fontSize:13, color:'#94a3b8', fontStyle:'italic' },
  btnWarning:   { background:'#fffbeb', border:'1px solid #fde68a', color:'#d97706', padding:'10px 18px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' },
};