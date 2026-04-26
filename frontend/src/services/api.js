const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const api = {
  getToken() {
    return localStorage.getItem('mizan_token') || '';
  },

  setToken(t) {
    if (t) localStorage.setItem('mizan_token', t);
    else localStorage.removeItem('mizan_token');
  },

  headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getToken()}`,
    };
  },

  async request(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },

  getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return api.request('GET', `/users?${q}`);
  },

  createUser(data) {
    return api.request('POST', '/users', data);
  },

  updateUser(id, data) {
    return api.request('PUT', `/users/${id}`, data);
  },

  deleteUser(id) {
    return api.request('DELETE', `/users/${id}`);
  },

  login(email, pwd) {
    return api.request('POST', '/auth/login', { email, password: pwd });
  },

  getCases() {
    return api.request('GET', '/cases');
  },
};

export default api;