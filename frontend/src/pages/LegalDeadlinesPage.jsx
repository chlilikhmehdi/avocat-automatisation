// pages/LegalDeadlinesPage.jsx
import { useState, useEffect } from 'react';
import { getDeadlines, createDeadline, updateDeadlineStatus } from '../api/hearings';
import api from '../services/api';

function UrgencyBadge({ daysRemaining, status }) {
  if (status === 'completed') return <span style={badge('#dcfce7','#16a34a')}>✅ Terminé</span>;
  if (status === 'expired' || daysRemaining < 0) return <span style={badge('#fee2e2','#dc2626')}>🔴 Expiré</span>;
  if (daysRemaining <= 2)  return <span style={badge('#fee2e2','#dc2626')}>🚨 Urgent</span>;
  if (daysRemaining <= 7)  return <span style={badge('#fef3c7','#d97706')}>⚠️ Proche</span>;
  return <span style={badge('#f1f5f9','#64748b')}>🟢 En cours</span>;
}

const badge = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 700, padding: '3px 9px',
  borderRadius: 20, background: bg, color,
});

function CreateDeadlineModal({ cases, onSave, onClose }) {
  const [form, setForm] = useState({ case_id: '', title: '', deadline_date: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.case_id || !form.title || !form.deadline_date) {
      alert('Tous les champs sont requis');
      return;
    }
    setSaving(true);
    try {
      await createDeadline({ ...form, case_id: parseInt(form.case_id) });
      onSave();
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          ➕ Nouveau délai légal
        </h3>

        <label style={M.label}>Dossier *</label>
        <select style={M.input} value={form.case_id} onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))}>
          <option value="">Sélectionner…</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.title || `#${c.id}`}</option>)}
        </select>

        <label style={M.label}>Titre *</label>
        <input style={M.input} placeholder="Ex : Dépôt mémoire en réponse" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

        <label style={M.label}>Date limite *</label>
        <input type="date" style={M.input} value={form.deadline_date}
          onChange={e => setForm(f => ({ ...f, deadline_date: e.target.value }))} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={M.btnCancel}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={M.btnSave}>
            {saving ? 'Enregistrement…' : '✅ Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

const M = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  box:       { background: '#fff', borderRadius: 14, padding: '28px 32px', width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.15)', fontFamily: "'DM Sans', sans-serif" },
  label:     { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, marginTop: 14 },
  input:     { width: '100%', padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' },
  btnCancel: { padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: '#64748b' },
  btnSave:   { padding: '9px 18px', border: 'none', borderRadius: 8, background: '#1e40af', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function LegalDeadlinesPage() {
  const [data,     setData]     = useState({ all: [], upcoming: [], overdue: [] });
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('all');  // 'all' | 'upcoming' | 'overdue'
  const [showForm, setShowForm] = useState(false);
  const [cases,    setCases]    = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDeadlines();
      setData(res.data || { all: [], upcoming: [], overdue: [] });
    } catch (e) {
      console.error('[LegalDeadlines]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.getCases?.()
      .then(r => setCases(Array.isArray(r?.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await updateDeadlineStatus(id, status);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur mise à jour');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const displayed = data[tab] || [];

  const TABS = [
    { key: 'all',      label: `Tous (${data.all?.length || 0})` },
    { key: 'upcoming', label: `⚠️ Proches (${data.upcoming?.length || 0})` },
    { key: 'overdue',  label: `🔴 Expirés (${data.overdue?.length || 0})` },
  ];

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerIcon}>⏰</div>
        <div style={{ flex: 1 }}>
          <h1 style={S.title}>Délais légaux</h1>
          <p style={S.sub}>{data.overdue?.length || 0} expiré{data.overdue?.length !== 1 ? 's' : ''} · {data.upcoming?.length || 0} proche{data.upcoming?.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={S.btnAdd}>+ Nouveau délai</button>
      </div>

      {/* Onglets */}
      <div style={S.tabsRow}>
        {TABS.map(t => (
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

      {/* Liste */}
      <div style={S.list}>
        {loading && (
          <div style={S.centeredMsg}><span style={S.spinner} /> Chargement…</div>
        )}

        {!loading && displayed.length === 0 && (
          <div style={S.centeredMsg}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            Aucun délai dans cette catégorie
          </div>
        )}

        {!loading && displayed.map(dl => {
          const daysRem = parseInt(dl.days_remaining);
          return (
            <div key={dl.id} style={{
              ...S.item,
              borderLeft: `4px solid ${dl.status === 'completed' ? '#16a34a' : daysRem < 0 ? '#ef4444' : daysRem <= 7 ? '#f59e0b' : '#e2e8f0'}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
                  {dl.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>📁 {dl.case_title || `#${dl.case_id}`}</span>
                  <span>📅 {fmtDate(dl.deadline_date)}</span>
                  {dl.status !== 'completed' && daysRem >= 0 && (
                    <span style={{ fontWeight: 600, color: daysRem <= 7 ? '#d97706' : '#64748b' }}>
                      J-{daysRem}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <UrgencyBadge daysRemaining={daysRem} status={dl.status} />
                {dl.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange(dl.id, 'completed')}
                    style={S.btnComplete}
                    title="Marquer comme terminé"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <CreateDeadlineModal
          cases={cases}
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

const S = {
  page:       { padding: '28px 32px', fontFamily: "'DM Sans', sans-serif" },
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  headerIcon: { width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  title:      { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub:        { fontSize: 13, color: '#64748b', margin: '3px 0 0' },
  btnAdd:     { padding: '10px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  tabsRow:    { display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 16 },
  tab:        { padding: '10px 18px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' },
  list:       { display: 'flex', flexDirection: 'column', gap: 10 },
  item:       { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 },
  centeredMsg:{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#94a3b8', fontSize: 14 },
  spinner:    { display: 'inline-block', width: 16, height: 16, border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  btnComplete:{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14, color: '#16a34a', fontWeight: 700 },
};