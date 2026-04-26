import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MOCK_USERS } from '../constants/mockData';

/**
 * Encapsule le chargement, le filtrage et la pagination des utilisateurs.
 * Retombe sur les données mock si l'API est indisponible.
 */
export function useUsers() {
  const [users,      setUsers]      = useState([]);
  const [mockUsers,  setMockUsers]  = useState(MOCK_USERS);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page,       setPage]       = useState(1);

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
      } else {
        throw new Error(res.message);
      }
    } catch {
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

  const deleteLocalUser = (id) => setMockUsers((p) => p.filter((u) => u.id !== id));

  return {
    users, pagination, loading,
    search, setSearch,
    roleFilter, setRoleFilter,
    page, setPage,
    fetchUsers,
    deleteLocalUser,
  };
}