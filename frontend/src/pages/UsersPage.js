import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import { useUsers } from '../hooks/useUsers';
import { useDebounce } from '../hooks/useDebounce';
import { RoleBadge, UserAvatar, StatCard } from '../components/ui';
import UserModal from '../components/modals/UserModal';
import DeleteModal from '../components/modals/DeleteModal';
import { ROLES_META } from '../constants/roles';
import api from '../services/api';

export default function UsersPage({ currentUser }) {
  const { lang, t } = useLang();
  const toast = useToast();

  const {
    users, pagination, loading,
    setSearch, roleFilter, setRoleFilter,
    page, setPage,
    fetchUsers, deleteLocalUser,
  } = useUsers();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);

  // Sync debounced search → hook
  // (on passe via setSearch à chaque changement)
  useState(() => { setSearch(debouncedSearch); setPage(1); }, [debouncedSearch]);

  const [modalUser, setModalUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);

  const handleDelete = async () => {
    try {
      const res = await api.deleteUser(deleteUser.id);
      if (res.success) { toast(t.success); fetchUsers(); }
      else throw new Error(res.message);
    } catch {
      deleteLocalUser(deleteUser.id);
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
      {/* Topbar */}
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

      {/* Content */}
      <div className="content">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon="👥" value={stats.total}   label={t.stats.total}   bg="#eff6ff" color="#3b82f6" />
          <StatCard icon="🛡️" value={stats.admins}  label={t.stats.admins}  bg="#fef2f2" color="#ef4444" />
          <StatCard icon="⚖️" value={stats.lawyers} label={t.stats.lawyers} bg="#eff6ff" color="#3b82f6" />
          <StatCard icon="👤" value={stats.clients} label={t.stats.clients} bg="#f9fafb" color="#6b7280" />
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-header">
            <div className="search-wrap">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="search"
                placeholder={t.search}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="filter"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            >
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
                  <th>{t.name}</th>
                  <th>{t.phone}</th>
                  <th>{t.role}</th>
                  <th>{t.org}</th>
                  <th>{t.createdAt}</th>
                  <th>{t.actions}</th>
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
                    <td><RoleBadge role={u.role} lang={lang} /></td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>
                      {u.organization_name || `Org #${u.organization_id}`}
                    </td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA')
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="action-btn btn-edit"
                          onClick={() => { setModalUser(u); setModalOpen(true); }}
                        >
                          ✏️ {t.edit}
                        </button>
                        <button
                          className="action-btn btn-delete"
                          onClick={() => setDeleteUser(u)}
                        >
                          🗑 {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <span className="page-info">
                {pagination.total} {t.total} · {t.page} {pagination.page} {t.of} {pagination.pages}
              </span>
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

      {/* Modals */}
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