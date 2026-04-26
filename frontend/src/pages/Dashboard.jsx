// src/pages/Dashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';

import UserModal from '../components/UserModal';
import DeleteModal from '../components/DeleteModal';
import RoleBadge from '../components/RoleBadge';
import UserAvatar from '../components/UserAvatar';
import StatCard from '../components/StatCard';

/**
 * Props attendues :
 * currentUser
 * api
 * useLang
 * useToast
 * MOCK_USERS
 * ROLES_META
 */
export default function Dashboard({
  currentUser,
  api,
  useLang,
  useToast,
  MOCK_USERS,
  ROLES_META,
}) {
  const { lang, t } = useLang();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalUser, setModalUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [deleteUser, setDeleteUser] = useState(null);

  const [mockUsers, setMockUsers] = useState(MOCK_USERS);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const params = { page, limit: 10 };

      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await api.getUsers(params);

      if (res.success) {
        setUsers(res.data || []);
        setPagination(
          res.pagination || {
            total: 0,
            page: 1,
            pages: 1,
          }
        );
      } else {
        throw new Error(res.message);
      }
    } catch {
      let filtered = [...mockUsers];

      if (search) {
        filtered = filtered.filter(
          (u) =>
            u.nom.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (roleFilter) {
        filtered = filtered.filter(
          (u) => u.role === roleFilter
        );
      }

      setUsers(filtered);

      setPagination({
        total: filtered.length,
        page: 1,
        pages: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [api, mockUsers, page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async () => {
    try {
      const res = await api.deleteUser(deleteUser.id);

      if (res.success) {
        toast(t.success);
        fetchUsers();
      } else {
        throw new Error();
      }
    } catch {
      setMockUsers((prev) =>
        prev.filter((u) => u.id !== deleteUser.id)
      );

      toast(t.success);
    } finally {
      setDeleteUser(null);
    }
  };

  const stats = {
    total: pagination.total || users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
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
          <button
            className="btn-primary"
            onClick={() => {
              setModalUser(null);
              setModalOpen(true);
            }}
          >
            + {t.addUser}
          </button>
        </div>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard
            icon="👥"
            value={stats.total}
            label={t.stats.total}
            bg="#eff6ff"
            color="#3b82f6"
          />

          <StatCard
            icon="🛡️"
            value={stats.admins}
            label={t.stats.admins}
            bg="#fef2f2"
            color="#ef4444"
          />

          <StatCard
            icon="⚖️"
            value={stats.lawyers}
            label={t.stats.lawyers}
            bg="#eff6ff"
            color="#3b82f6"
          />

          <StatCard
            icon="👤"
            value={stats.clients}
            label={t.stats.clients}
            bg="#f9fafb"
            color="#6b7280"
          />
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-header">
            <div className="search-wrap">
              <input
                className="search"
                placeholder={t.search}
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
              />
            </div>

            <select
              className="filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">
                {t.allRoles}
              </option>

              {Object.entries(ROLES_META).map(
                ([key, value]) => (
                  <option key={key} value={key}>
                    {lang === 'ar'
                      ? value.ar
                      : value.fr}
                  </option>
                )
              )}
            </select>
          </div>

          {loading ? (
            <div className="empty">
              ⏳ {t.loading}
            </div>
          ) : users.length === 0 ? (
            <div className="empty">
              📋 {t.noData}
            </div>
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
                        <UserAvatar
                          name={u.nom}
                          role={u.role}
                        />

                        <div>
                          <div className="user-name">
                            {u.nom}
                          </div>

                          <div className="user-email">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>{u.telephone || '—'}</td>

                    <td>
                      <RoleBadge
                        role={u.role}
                        lang={lang}
                      />
                    </td>

                    <td>
                      {u.organization_name}
                    </td>

                    <td>
                      {u.created_at
                        ? new Date(
                            u.created_at
                          ).toLocaleDateString()
                        : '—'}
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                        }}
                      >
                        <button
                          className="action-btn btn-edit"
                          onClick={() => {
                            setModalUser(u);
                            setModalOpen(true);
                          }}
                        >
                          ✏️ {t.edit}
                        </button>

                        <button
                          className="action-btn btn-delete"
                          onClick={() =>
                            setDeleteUser(u)
                          }
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

          {pagination.pages > 1 && (
            <div className="pagination">
              <span className="page-info">
                {pagination.total} {t.total}
              </span>

              <div className="page-btns">
                <button
                  className="page-btn"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((p) => p - 1)
                  }
                >
                  ‹
                </button>

                <button
                  className="page-btn"
                  disabled={
                    page === pagination.pages
                  }
                  onClick={() =>
                    setPage((p) => p + 1)
                  }
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <UserModal
          user={modalUser}
          orgId={
            currentUser?.organization_id || 1
          }
          onSave={() => {
            setModalOpen(false);
            fetchUsers();
          }}
          onClose={() =>
            setModalOpen(false)
          }
        />
      )}

      {deleteUser && (
        <DeleteModal
          user={deleteUser}
          onConfirm={handleDelete}
          onClose={() =>
            setDeleteUser(null)
          }
        />
      )}
    </div>
  );
}