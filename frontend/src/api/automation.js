/**
 * src/api/automation.js
 * Appels API vers le module d'automatisation des dossiers
 */
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const client = axios.create({ baseURL: BASE });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('mizan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Classification ─────────────────────────────────────────────────────────────

/** Lance la classification d'un dossier (NLP + données SQL) */
export const classifyCase = (caseId) =>
  client.post(`/automation/classify/${caseId}`).then(r => r.data);

/** Récupère la classification sauvegardée en DB */
export const getClassification = (caseId) =>
  client.get(`/automation/classify/${caseId}`).then(r => r.data);

/** Classifie plusieurs dossiers en une seule requête */
export const batchClassify = (caseIds) =>
  client.post('/automation/classify/batch', { case_ids: caseIds }).then(r => r.data);

// ── Suggestions ────────────────────────────────────────────────────────────────

/** Récupère les suggestions juridiques d'un dossier */
export const getSuggestions = (caseId) =>
  client.get(`/automation/suggestions/${caseId}`).then(r => r.data);

// ── Lettres ────────────────────────────────────────────────────────────────────

/**
 * Génère une lettre juridique
 * @param {number} caseId
 * @param {string} letterType  ex: "mise_en_demeure_impaye"
 */
export const generateLetter = (caseId, letterType) =>
  client.post(`/automation/letter/${caseId}`, { letter_type: letterType }).then(r => r.data);

/** Liste les lettres générées pour un dossier */
export const getLetters = (caseId) =>
  client.get(`/automation/letters/${caseId}`).then(r => r.data);

// ── Dashboard ──────────────────────────────────────────────────────────────────

/** Vue globale : stats, dossiers critiques, lettres récentes */
export const getAutomationDashboard = () =>
  client.get('/automation/dashboard').then(r => r.data);