// pages/HearingListPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHearings, deleteHearing } from '../api/hearings';

const STATUS_CONFIG = {
  scheduled: { label: 'Planifiée',  bg: '#dbeafe', color: '#1e40af' },
  completed: { label: 'Terminée',   bg: '#dcfce7', color: '#16a34a' },
  postponed: { label: 'Reportée',   bg: '#fef3c7', color: '#d97706' },
  cancelled: { label: 'Annulée',    bg: '#f1f5f9', color: '#64748b' },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function ConfirmModal({ hearing, onConfirm, onCancel }) {
  if (!hearing) return null;
  return (
    <div style={M.overlay}>
      <div style={M.box}>
        <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 8px' }}>Supprimer l'audience ?</p>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
          «&nbsp;{hearing.title}&nbsp;» sera définitivement supprimée.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={M.btnCancel}>Annuler</button>
          <button onClick={onConfirm} style={M.btnDelete}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

const M = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  box:     { background: '#fff', borderRadius: 14, padding: '24px 28px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.15)', fontFamily: "'DM Sans', sans-serif" },
  btnCancel: { padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: '#64748b' },
  btnDelete: { padding: '8px 18px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function HearingListPage() {
  const navigate = useNavigate();
  const [hearings,  setHearings]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [toDelete,  setToDelete]  = useState(null);
  const [filters,   setFilters]   = useState({ search: '', status: '', date: '', page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.date)   params.date   = filters.date;
      const res = await getHearings(params);
      setHearings(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      console.error('[HearingListPage]', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteHearing(toDelete.id);
      setToDelete(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur suppression');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtTime = (t) => t ? t.slice(0, 5) : '';

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerIcon}>⚖️</div>
        <div style={{ flex: 1 }}>
          <h1 style={S.title}>Audiences</h1>
          <p style={S.sub}>{total} audience{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => navigate('/hearings/new')} style={S.btnAdd}>
          + Nouvelle audience
        </button>
      </div>

      {/* Filtres */}
      <div style={S.filtersRow}>
        <input
          style={S.input}
          placeholder="🔍 Rechercher…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
        />
        <select
          style={S.select}
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
        >
          <option value="">Tous les statuts</option>
          <option value="scheduled">Planifiée</option>
          <option value="completed">Terminée</option>
          <option value="postponed">Reportée</option>
          <option value="cancelled">Annulée</option>
        </select>
        <input
          type="date"
          style={S.input}
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value, page: 1 }))}
        />
        {(filters.search || filters.status || filters.date) && (
          <button
            style={S.btnClear}
            onClick={() => setFilters({ search: '', status: '', date: '', page: 1 })}
          >
            ✕ Effacer
          </button>
        )}
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {['Titre', 'Dossier', 'Date', 'Heure', 'Lieu', 'Statut', 'Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={S.emptyCell}><span style={S.spinner} /> Chargement…</td></tr>
            )}
            {!loading && hearings.length === 0 && (
              <tr><td colSpan={7} style={S.emptyCell}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                Aucune audience trouvée
              </td></tr>
            )}
            {!loading && hearings.map(h => (
              <tr key={h.id} style={S.tr}>
                <td style={S.td}>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{h.title}</span>
                </td>
                <td style={S.td}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{h.case_title || '—'}</span>
                </td>
                <td style={S.td}>
                  <span style={{ fontSize: 13 }}>{fmtDate(h.hearing_date)}</span>
                </td>
                <td style={S.td}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{fmtTime(h.hearing_time) || '—'}</span>
                </td>
                <td style={S.td}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{h.location || '—'}</span>
                </td>
                <td style={S.td}><StatusBadge status={h.status} /></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={S.btnIcon} onClick={() => navigate(`/hearings/${h.id}`)} title="Détail">👁️</button>
                    <button style={S.btnIcon} onClick={() => navigate(`/hearings/${h.id}/edit`)} title="Modifier">✏️</button>
                    <button style={{ ...S.btnIcon, ...S.btnIconRed }} onClick={() => setToDelete(h)} title="Supprimer">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div style={S.pagination}>
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            style={S.pageBtn}
          >← Précédent</button>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Page {filters.page} / {Math.ceil(total / 15)}
          </span>
          <button
            disabled={filters.page >= Math.ceil(total / 15)}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            style={S.pageBtn}
          >Suivant →</button>
        </div>
      )}

      <ConfirmModal
        hearing={toDelete}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

const S = {
  page:       { padding: '28px 32px', fontFamily: "'DM Sans', sans-serif" },
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  headerIcon: { width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  title:      { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub:        { fontSize: 13, color: '#64748b', margin: '3px 0 0' },
  btnAdd:     { padding: '10px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  filtersRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input:      { padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', minWidth: 160 },
  select:     { padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', cursor: 'pointer' },
  btnClear:   { padding: '9px 14px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', borderRadius: 9, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  tableWrap:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '12px 16px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #e2e8f0' },
  tr:         { borderBottom: '1px solid #f1f5f9' },
  td:         { padding: '12px 16px', verticalAlign: 'middle' },
  emptyCell:  { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  spinner:    { display: 'inline-block', width: 14, height: 14, border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' },
  btnIcon:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 14 },
  btnIconRed: { background: '#fef2f2', borderColor: '#fecaca' },
  pagination: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  pageBtn:    { padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: '#1e40af' },
};