/**
 * src/api/documents.js
 * Service API pour Documents + IA Resume
 */

import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const client = axios.create({
  baseURL: BASE,
});

// ─────────────────────────────────────────────
// AUTH (JWT auto injecté)
// ─────────────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mizan_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// GET DOCUMENTS
// ─────────────────────────────────────────────
export const getDocuments = (params = {}) => {
  return client
    .get('/documents', { params })
    .then(res => res.data);
};

// ─────────────────────────────────────────────
// UPLOAD DOCUMENT
// ─────────────────────────────────────────────
export const uploadDocument = (caseId, file, category = 'autre', onProgress) => {
  const form = new FormData();
  form.append('file', file);

  return client.post(
    `/documents/upload?case_id=${caseId}&category=${category}`,
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress(percent);
        }
      },
    }
  ).then(res => res.data);
};

// ─────────────────────────────────────────────
// DELETE DOCUMENT
// ─────────────────────────────────────────────
export const deleteDocument = (id) => {
  return client
    .delete(`/documents/${id}`)
    .then(res => res.data);
};

// ─────────────────────────────────────────────
// RENAME DOCUMENT
// ─────────────────────────────────────────────
export const renameDocument = (id, display_name) => {
  return client
    .patch(`/documents/${id}/rename`, { display_name })
    .then(res => res.data);
};

// ─────────────────────────────────────────────
// CHANGE CATEGORY
// ─────────────────────────────────────────────
export const setCategoryDoc = (id, category) => {
  return client
    .patch(`/documents/${id}/category`, { category })
    .then(res => res.data);
};

// ─────────────────────────────────────────────
// 🤖 IA: SUMMARIZE DOCUMENT
// ─────────────────────────────────────────────
export const summarizeDocument = (id) => {
  return client
    .post(`/documents/${id}/summarize`)
    .then(res => res.data);
};
export const getDocumentStats = () => {
  return client
    .get('/documents/stats')
    .then(res => res.data);
};
export const resumeDocument = async (fileId) => {
  const res = await summarizeDocument(fileId);
  return res?.data?.summary || 'Aucun résumé disponible';
};