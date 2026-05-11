import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const client = axios.create({ baseURL: BASE });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('mizan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const processDocument = (id) =>
  client.post(`/documents/${id}/process`).then(r => r.data);

export const askDocument = (id, question, conversationId = null) =>
  client.post(`/documents/${id}/ask`, { question, conversation_id: conversationId })
    .then(r => r.data);

export const getConversation = (id) =>
  client.get(`/documents/${id}/conversation`).then(r => r.data);

export const compareDocuments = (fileIds, aspect = '') =>
  client.post('/documents/compare', { file_ids: fileIds, aspect }).then(r => r.data);

export const semanticSearch = (query, caseId, fileId = null, limit = 5) =>
  client.post('/documents/search', { query, case_id: caseId, file_id: fileId, limit })
    .then(r => r.data);