// pages/HearingDetailsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getHearing, deleteHearing } from '../api/hearings';

const STATUS_CONFIG = {
  scheduled: { label: 'Planifiée', bg: '#dbeafe', color: '#1e40af', icon: '📅' },
  completed: { label: 'Terminée',  bg: '#dcfce7', color: '#16a34a', icon: '✅' },
  postponed: { label: 'Reportée',  bg: '#fef3c7', color: '#d97706', icon: '⏳' },
  cancelled: { label: 'Annulée',   bg: '#f1f5f9', color: '#64748b', icon: '❌' },
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

export default function HearingDetailsPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [hearing,  setHearing]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getHearing(id)
      .then(res => setHearing(res.data))
      .catch(() => navigate('/hearings'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette audience ?')) return;
    setDeleting(true);
    try {
      await deleteHearing(id);
      navigate('/hearings');
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur suppression');
      setDeleting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const fmtTime = (t) => t ? t.slice(0, 5) : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <span style={S.spinnerBlue} />
    </div>
  );

  if (!hearing) return null;

  const sc = STATUS_CONFIG[hearing.status] || STATUS_CONFIG.scheduled;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={() => navigate('/hearings')} style={S.btnBack}>← Retour</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate(`/hearings/${id}/edit`)} style={S.btnEdit}>✏️ Modifier</button>
        <button onClick={handleDelete} disabled={deleting} style={S.btnDel}>
          {deleting ? '…' : '🗑️ Supprimer'}
        </button>
      </div>

      <div style={S.titleRow}>
        <div>
          <h1 style={S.title}>{hearing.title}</h1>
          <p style={S.caseLabel}>📁 {hearing.case_title || `Dossier #${hearing.case_id}`}</p>
        </div>
        <span style={{ ...S.badge, background: sc.bg, color: sc.color }}>
          {sc.icon} {sc.label}
        </span>
      </div>

      <div style={S.card}>
        <InfoRow icon="📅" label="Date"        value={fmtDate(hearing.hearing_date)} />
        <InfoRow icon="🕐" label="Heure"       value={fmtTime(hearing.hearing_time)} />
        <InfoRow icon="📍" label="Lieu"        value={hearing.location} />
        <InfoRow icon="📝" label="Description" value={hearing.description} />
        <InfoRow icon="🗓️" label="Créée le"   value={new Date(hearing.created_at).toLocaleDateString('fr-FR')} />
        <InfoRow icon="🔄" label="Mise à jour" value={new Date(hearing.updated_at).toLocaleDateString('fr-FR')} />
      </div>
    </div>
  );
}

const S = {
  page:       { padding: '28px 32px', fontFamily: "'DM Sans', sans-serif", maxWidth: 680 },
  header:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  btnBack:    { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit' },
  btnEdit:    { padding: '8px 16px', border: '1px solid #bfdbfe', borderRadius: 8, background: '#eff6ff', cursor: 'pointer', fontSize: 13, color: '#1e40af', fontFamily: 'inherit', fontWeight: 600 },
  btnDel:     { padding: '8px 16px', border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', cursor: 'pointer', fontSize: 13, color: '#ef4444', fontFamily: 'inherit', fontWeight: 600 },
  titleRow:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
  title:      { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' },
  caseLabel:  { fontSize: 13, color: '#64748b', margin: 0 },
  badge:      { padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 },
  card:       { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '8px 24px' },
  spinnerBlue:{ display: 'inline-block', width: 24, height: 24, border: '3px solid #dbeafe', borderTop: '3px solid #1e40af', borderRadius: '50%', animation: 'spin .7s linear infinite' },
};