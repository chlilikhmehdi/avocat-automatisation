import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getCases }            from '../Cases';
import { STATUS_META }         from '../config/constants';
import UrgentDossiers          from './Dashboard/UrgentDossiers';

export default function LawyerDashboard({ currentUser }) {
  const navigate = useNavigate();

  const [cases,       setCases]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const res = await getCases(currentUser.id, { search, status: statusFilter, page, limit: 10 });
        if (res.success) {
          setCases(res.data || []);
          setPagination(res.pagination || { total: 0, pages: 1 });
        } else {
          setError(res.message || 'Erreur lors du chargement');
        }
      } catch {
        setError('Impossible de joindre le serveur');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.id, search, statusFilter, page]);

  const stats = {
    total:    pagination.total,
    ouvert:   cases.filter((c) => c.status === 'ouvert').length,
    en_cours: cases.filter((c) => c.status === 'en_cours').length,
    clôturé:  cases.filter((c) => c.status === 'clôturé').length,
  };

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Mes dossiers</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Cabinet · {currentUser?.organization_name || 'Organisation'}
          </p>
        </div>
        <button onClick={() => navigate('/cases/new')} style={btnPrimary}>
          + Nouveau dossier
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total',    value: stats.total,    icon: '📁', bg: '#eff6ff', color: '#3b82f6' },
          { label: 'Ouverts',  value: stats.ouvert,   icon: '🟢', bg: '#ecfdf5', color: '#10b981' },
          { label: 'En cours', value: stats.en_cours, icon: '🔵', bg: '#eff6ff', color: '#3b82f6' },
          { label: 'Clôturés', value: stats.clôturé,  icon: '⚫', bg: '#f3f4f6', color: '#6b7280' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <UrgentDossiers />

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginTop: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
          <input
            placeholder="Rechercher par titre ou client..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{ padding: '12px 20px', background: '#fef2f2', color: '#ef4444', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>⏳ Chargement...</div>
        ) : cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <p>Aucun dossier trouvé</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Titre', 'Client', 'Type', 'Statut', 'Fichiers', 'Créé le', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.6px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const sm = STATUS_META[c.status] || STATUS_META.ouvert;
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                    <td style={{ padding: '14px 20px', fontWeight: 500 }}>{c.title}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{c.client_name}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b', textTransform: 'capitalize' }}>{c.type}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{sm.label}</span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{c.file_count ?? 0}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString('fr-MA')}</td>
                    <td style={{ padding: '14px 20px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/cases/${c.id}`)}
                        style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 12px', fontSize: 13, cursor: 'pointer' }}
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{pagination.total} dossier(s) · Page {page} sur {pagination.pages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={paginBtn}>‹</button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} style={paginBtn}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnPrimary = { background: '#1e40af', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const paginBtn   = { width: 32, height: 32, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14 };