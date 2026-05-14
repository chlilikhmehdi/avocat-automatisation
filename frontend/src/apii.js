// services/api.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('mizan_token') || '';
}

function setToken(t) {
  if (t) localStorage.setItem('mizan_token', t);
  else   localStorage.removeItem('mizan_token');
}

function getHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getLawyerIdFromToken() {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id ?? payload.sub ?? payload.userId ?? payload.user_id ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Instance axios centralisée — utilisée partout dans l'app
// ─────────────────────────────────────────────────────────────────────────────
export const authAxios = axios.create({ baseURL: API_BASE });

authAxios.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

authAxios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      console.warn('[authAxios] 401 — token invalide ou expiré');
    }
    return Promise.reject(err);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Requête générique fetch (rétro-compatibilité)
// ─────────────────────────────────────────────────────────────────────────────
async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: getHeaders(),
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    console.warn('[api] 401 — token invalide ou expiré');
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// API object
// ─────────────────────────────────────────────────────────────────────────────
const api = {
  getToken,
  setToken,
  getLawyerIdFromToken,

  // ── Auth ───────────────────────────────────────────────────────────────────
  login(email, pwd) {
    return request('POST', '/auth/login', { email, password: pwd });
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/users${q ? `?${q}` : ''}`);
  },
  createUser(data)     { return request('POST',   '/users',       data); },
  updateUser(id, data) { return request('PUT',    `/users/${id}`, data); },
  deleteUser(id)       { return request('DELETE', `/users/${id}`);       },

  // ── Cases ──────────────────────────────────────────────────────────────────
  getCases(params = {}) {
    const lawyerId = getLawyerIdFromToken();
    const q        = new URLSearchParams(params).toString();
    if (!lawyerId) {
      console.warn('[api.getCases] lawyerId introuvable dans le token');
      return request('GET', `/cases${q ? `?${q}` : ''}`);
    }
    return request('GET', `/cases/${lawyerId}${q ? `?${q}` : ''}`);
  },
  getCase(id)            { return request('GET',    `/case/${id}`);                    },
  createCase(data)       { return request('POST',   '/cases',      data);              },
  updateCase(id, data)   { return request('PUT',    `/case/${id}`, data);              },
  deleteCase(id)         { return request('DELETE', `/case/${id}`);                    },
  addHistory(id, action) { return request('POST', `/case/${id}/history`, { action }); },
};

export default api;