/**
 * components/SummaryModal.jsx
 *
 * Modal résumé IA :
 *  - État loading (animation)
 *  - État erreur (avec bouton réessayer)
 *  - État succès (résumé + copier + régénérer + badge cache)
 *
 * Props :
 *  doc       : { id, name, original_name, mimetype, case_title }
 *  onClose   : () => void
 *  onRetry   : () => void
 */

import React, { useState } from 'react';

// ── Icône MIME ─────────────────────────────────────────────────────────────────
const mimeIcon = (type = '') => {
  if (type.includes('pdf'))                               return '📕';
  if (type.includes('image'))                             return '🖼️';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel'))  return '📊';
  return '📄';
};

export default function SummaryModal({ doc, summary, loading, error, onClose, onRetry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={S.headerTitle}>Résumé intelligent</div>
              <div style={S.headerSub}>Généré par IA · gpt-4o-mini</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* ── Fichier concerné ───────────────────────────────────────── */}
        <div style={S.docBadge}>
          <span style={{ fontSize: 20 }}>{mimeIcon(doc?.mimetype)}</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={S.docName}>
              {doc?.name || doc?.original_name}
            </div>
            <div style={S.docSub}>{doc?.case_title}</div>
          </div>
          {summary?.cached && (
            <span style={S.cacheBadge}>⚡ Cache 24h</span>
          )}
        </div>

        {/* ── Corps ──────────────────────────────────────────────────── */}
        <div style={S.body}>

          {/* Chargement */}
          {loading && (
            <div style={S.centerBlock}>
              <div style={S.spinner} />
              <p style={S.loadingTitle}>Analyse en cours…</p>
              <p style={S.loadingDesc}>
                Extraction du texte · Génération du résumé par IA
              </p>
              <div style={S.steps}>
                <Step label="Lecture du fichier"   done />
                <Step label="Extraction du texte"  done />
                <Step label="Résumé IA"            active />
              </div>
            </div>
          )}

          {/* Erreur */}
          {!loading && error && (
            <div style={S.errorBlock}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
              <p style={S.errorMsg}>{error}</p>
              <button style={S.btnGhost} onClick={onRetry}>
                🔄 Réessayer
              </button>
            </div>
          )}

          {/* Résumé */}
          {!loading && !error && summary && (
            <div>
              {/* Méta */}
              <div style={S.metaRow}>
                <MetaBadge label="Modèle"   value={summary.model || 'gpt-4o-mini'} />
                {summary.tokens_used && (
                  <MetaBadge label="Tokens" value={summary.tokens_used} />
                )}
                <MetaBadge
                  label="Source"
                  value={summary.cached ? 'Cache' : 'Nouveau'}
                  color={summary.cached ? '#d97706' : '#16a34a'}
                />
              </div>

              {/* Texte du résumé */}
              <div style={S.summaryBox}>
                {summary.text}
              </div>

              {/* Actions */}
              <div style={S.actions}>
                <button style={S.btnGhost} onClick={onRetry}>
                  🔄 Régénérer
                </button>
                <button
                  style={{ ...S.btnCopy, background: copied ? '#16a34a' : '#1e40af' }}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copié !' : '📋 Copier le résumé'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function Step({ label, done, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: done ? '#16a34a' : active ? '#3b82f6' : '#e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#fff', flexShrink: 0,
      }}>
        {done ? '✓' : active ? '…' : ''}
      </div>
      <span style={{ fontSize: 13, color: done ? '#16a34a' : active ? '#3b82f6' : '#94a3b8' }}>
        {label}
      </span>
    </div>
  );
}

function MetaBadge({ label, value, color = '#334155' }) {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 8, padding: '4px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 18,
    width: '100%', maxWidth: 580,
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,.2)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn: {
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 22,
    color: '#64748b', lineHeight: 1,
    padding: '0 4px',
  },
  docBadge: {
    margin: '16px 24px 0',
    padding: '12px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', gap: 10,
  },
  docName:  { fontSize: 14, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  docSub:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  cacheBadge: {
    background: '#fffbeb', color: '#d97706',
    border: '1px solid #fde68a',
    fontSize: 11, fontWeight: 600,
    padding: '3px 8px', borderRadius: 8,
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  body: { padding: '20px 24px 24px' },
  centerBlock: { textAlign: 'center', padding: '24px 0' },
  spinner: {
    width: 44, height: 44,
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' },
  loadingDesc:  { fontSize: 13, color: '#64748b', margin: '0 0 16px' },
  steps:        { display: 'inline-block', textAlign: 'left' },
  errorBlock:   { textAlign: 'center', padding: '24px 0' },
  errorMsg:     { fontSize: 14, color: '#ef4444', margin: '0 0 16px', lineHeight: 1.5 },
  metaRow:      { display: 'flex', gap: 8, marginBottom: 14 },
  summaryBox: {
    background: 'linear-gradient(135deg, #f0fdf4, #f0f9ff)',
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: '16px 18px',
    fontSize: 14,
    lineHeight: 1.8,
    color: '#166534',
    whiteSpace: 'pre-wrap',
    maxHeight: 300,
    overflowY: 'auto',
    marginBottom: 16,
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  btnGhost: {
    background: 'transparent',
    border: '1px solid #e2e8f0',
    color: '#334155',
    padding: '9px 18px',
    borderRadius: 9, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnCopy: {
    color: '#fff', border: 'none',
    padding: '9px 20px',
    borderRadius: 9, fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .2s',
  },
};

// Inject spinner animation once
if (typeof document !== 'undefined' && !document.getElementById('summary-spin')) {
  const style = document.createElement('style');
  style.id = 'summary-spin';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}