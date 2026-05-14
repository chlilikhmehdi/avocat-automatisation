// services/api.js
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const api = {
  getToken() {
    return localStorage.getItem('mizan_token') || '';
  },

  setToken(t) {
    if (t) localStorage.setItem('mizan_token', t);
    else   localStorage.removeItem('mizan_token');
  },

  headers() {
    return {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${this.getToken()}`,
    };
  },

  async request(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body:    body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return api.request('GET', `/users?${q}`);
  },
  createUser(data)     { return api.request('POST',   '/users',       data); },
  updateUser(id, data) { return api.request('PUT',    `/users/${id}`, data); },
  deleteUser(id)       { return api.request('DELETE', `/users/${id}`);       },

  // ── Auth ───────────────────────────────────────────────────────────────────
  login(email, pwd) {
    return api.request('POST', '/auth/login', { email, password: pwd });
  },

  // ── Cases ──────────────────────────────────────────────────────────────────
  // Décode le JWT pour récupérer l'id du lawyer sans appel réseau
  _getLawyerIdFromToken() {
    try {
      const token   = this.getToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.sub || payload.userId || null;
    } catch {
      return null;
    }
  },

  getCases(params = {}) {
    const lawyerId = this._getLawyerIdFromToken();
    const q        = new URLSearchParams(params).toString();

    // Essaie d'abord /cases/:lawyer_id (route existante dans ton backend)
    // Si l'id n'est pas disponible, retombe sur /cases/ (route générique)
    const path = lawyerId
      ? `/cases/${lawyerId}?${q}`
      : `/cases/?${q}`;

    return api.request('GET', path);
  },

  getCase(id)             { return api.request('GET',    `/case/${id}`);          },
  createCase(data)        { return api.request('POST',   '/cases',       data);   },
  updateCase(id, data)    { return api.request('PUT',    `/case/${id}`,  data);   },
  deleteCase(id)          { return api.request('DELETE', `/case/${id}`);          },
  addHistory(id, action)  { return api.request('POST',   `/case/${id}/history`, { action }); },
};

export default api;