import { useState, useEffect, useCallback } from 'react';
import { useLang }      from '../context/LangContext';
import { useToast }     from '../context/ToastContext';
import { ROLES_META, MOCK_USERS } from '../config/constants';
import StatCard         from '../components/StatCard';
import RoleBadge        from '../components/RoleBadge';
import UserAvatar       from '../components/UserAvatar';
import UserModal        from '../components/UserModal';
import DeleteModal      from '../components/DeleteModal';
import api              from '../api';

export default function Dashboard({ currentUser }) {
  const { lang, t }   = useLang();
  const toast         = useToast();

  const [users,       setUsers]       = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, pages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [page,        setPage]        = useState(1);
  const [modalUser,   setModalUser]   = useState(null);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [deleteUser,  setDeleteUser]  = useState(null);
  const [mockUsers,   setMockUsers]   = useState(MOCK_USERS);

  // Debounce sur la recherche
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const res = await api.getUsers(params);
      if (res.success) {
        setUsers(res.data || []);
        setPagination(res.pagination || { total: 0, page: 1, pages: 1 });
      } else throw new Error(res.message);
    } catch {
      // Fallback mock
      let filtered = mockUsers;
      if (search)     filtered = filtered.filter((u) => u.nom.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
      if (roleFilter) filtered = filtered.filter((u) => u.role === roleFilter);
      setUsers(filtered);
      setPagination({ total: filtered.length, page: 1, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, mockUsers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    try {
      const res = await api.deleteUser(deleteUser.id);
      if (res.success) { toast(t.success); fetchUsers(); }
      else throw new Error(res.message);
    } catch {
      setMockUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast(t.success);
    } finally {
      setDeleteUser(null);
    }
  };

  const stats = {
    total:   pagination.total || users.length,
    admins:  users.filter((u) => u.role === 'ADMIN').length,
    lawyers: users.filter((u) => u.role === 'LAWYER').length,
    clients: users.filter((u) => u.role === 'CLIENT').length,
  };

  return (
    <div className="main" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="topbar">
        <div>
          <div className="topbar-title">{t.title}</div>
          <div className="topbar-sub">{t.subtitle}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => { setModalUser(null); setModalOpen(true); }}>
            <span>+</span> {t.addUser}
          </button>
        </div>
      </div>

      <div className="content">
        <div className="stats-grid">
          <StatCard icon="👥" value={stats.total}   label={t.stats.total}   bg="#eff6ff" color="#3b82f6" />
          <StatCard icon="🛡️" value={stats.admins}  label={t.stats.admins}  bg="#fef2f2" color="#ef4444" />
          <StatCard icon="⚖️" value={stats.lawyers} label={t.stats.lawyers} bg="#eff6ff" color="#3b82f6" />
          <StatCard icon="👤" value={stats.clients} label={t.stats.clients} bg="#f9fafb" color="#6b7280" />
        </div>

        <div className="table-card">
          <div className="table-header">
            <div className="search-wrap">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input className="search" placeholder={t.search} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <select className="filter" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">{t.allRoles}</option>
              {Object.entries(ROLES_META).map(([k, v]) => (
                <option key={k} value={k}>{lang === 'ar' ? v.ar : v.fr}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="empty"><div className="empty-icon">⏳</div><p>{t.loading}</p></div>
          ) : users.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><p>{t.noData}</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t.name}</th><th>{t.phone}</th><th>{t.role}</th>
                  <th>{t.org}</th><th>{t.createdAt}</th><th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <UserAvatar name={u.nom} role={u.role} />
                        <div>
                          <div className="user-name">{u.nom}</div>
                          <div className="user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{u.telephone || '—'}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{u.organization_name || `Org #${u.organization_id}`}</td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="action-btn btn-edit"   onClick={() => { setModalUser(u); setModalOpen(true); }}>✏️ {t.edit}</button>
                        <button className="action-btn btn-delete" onClick={() => setDeleteUser(u)}>🗑 {t.delete}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pagination.pages > 1 && (
            <div className="pagination">
              <span className="page-info">{pagination.total} {t.total} · {t.page} {pagination.page} {t.of} {pagination.pages}</span>
              <div className="page-btns">
                <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <UserModal
          user={modalUser}
          orgId={currentUser?.organization_id || 1}
          onSave={() => { setModalOpen(false); fetchUsers(); }}
          onClose={() => setModalOpen(false)}
        />
      )}
      {deleteUser && (
        <DeleteModal
          user={deleteUser}
          onConfirm={handleDelete}
          onClose={() => setDeleteUser(null)}
        />
      )}
    </div>
  );
}