import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const client = axios.create({ baseURL: BASE });

// Injecte automatiquement le JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mizan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Cases API ────────────────────────────────────────────────────────────────

/**
 * Récupère les dossiers d'un avocat
 * @param {number} lawyerId
 * @param {{ status?: string, search?: string, page?: number, limit?: number }} params
 */
export const getCases = (lawyerId, params = {}) =>
  client.get(`/cases/${lawyerId}`, { params }).then((r) => r.data);

/**
 * Récupère le détail complet d'un dossier (avec historique + fichiers)
 * @param {number} id
 */
export const getCaseById = (id) =>
  client.get(`/case/${id}`).then((r) => r.data);

/**
 * Crée un nouveau dossier
 * @param {{ title: string, type: string, client_name: string, status?: string }} data
 */
export const createCase = (data) =>
  client.post('/cases', data).then((r) => r.data);

/**
 * Met à jour un dossier
 * @param {number} id
 * @param {object} data
 */
export const updateCase = (id, data) =>
  client.put(`/case/${id}`, data).then((r) => r.data);

/**
 * Supprime un dossier (soft delete)
 * @param {number} id
 */
export const deleteCase = (id) =>
  client.delete(`/case/${id}`).then((r) => r.data);

/**
 * Ajoute une entrée dans l'historique (timeline)
 * @param {number} caseId
 * @param {string} action
 */
export const addHistory = (caseId, action) =>
  client.post(`/case/${caseId}/history`, { action }).then((r) => r.data);

/**
 * Upload d'un fichier
 * @param {number} caseId
 * @param {File} file
 * @param {(pct: number) => void} onProgress
 */
export const uploadFile = (caseId, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post(`/case/${caseId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    })
    .then((r) => r.data);
};