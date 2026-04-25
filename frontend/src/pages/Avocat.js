import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const client = axios.create({ baseURL: BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mizan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = () =>
  client.get('/avocat/dashboard').then(r => r.data);

// ─── Clients ──────────────────────────────────────────────────────────────────
export const getClients    = (params = {}) => client.get('/avocat/clients', { params }).then(r => r.data);
export const getClient     = (id)          => client.get(`/avocat/clients/${id}`).then(r => r.data);
export const createClient  = (data)        => client.post('/avocat/clients', data).then(r => r.data);
export const updateClient  = (id, data)    => client.put(`/avocat/clients/${id}`, data).then(r => r.data);
export const deleteClient  = (id)          => client.delete(`/avocat/clients/${id}`).then(r => r.data);

// ─── Documents ────────────────────────────────────────────────────────────────
export const getDocuments     = (params = {}) => client.get('/avocat/documents', { params }).then(r => r.data);
export const getDocumentStats = ()            => client.get('/avocat/documents/stats').then(r => r.data);
export const deleteDocument   = (id)          => client.delete(`/avocat/documents/${id}`).then(r => r.data);

/**
 * Upload d'un document lié à un dossier
 * @param {number} caseId
 * @param {File} file
 * @param {(pct:number)=>void} onProgress
 */
export const uploadDocument = (caseId, file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return client.post(`/avocat/documents/upload?case_id=${caseId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && e.total && onProgress(Math.round(e.loaded * 100 / e.total)),
  }).then(r => r.data);
};

// ─── Documents v2 ─────────────────────────────────────────────────────────────
export const renameDocument   = (id, display_name) =>
  client.patch(`/avocat/documents/${id}/rename`, { display_name }).then(r => r.data);

export const setCategoryDoc   = (id, category) =>
  client.patch(`/avocat/documents/${id}/category`, { category }).then(r => r.data);

export const summarizeDocument = (id) =>
  client.post(`/avocat/documents/${id}/summarize`).then(r => r.data);