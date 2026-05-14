// src/api/hearings.js
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const client = axios.create({ baseURL: BASE });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('mizan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Audiences ─────────────────────────────────────────────────────────────────
export const getHearings       = (params = {}) => client.get('/hearings', { params }).then(r => r.data);
export const getHearing        = (id)           => client.get(`/hearings/${id}`).then(r => r.data);
export const createHearing     = (body)         => client.post('/hearings', body).then(r => r.data);
export const updateHearing     = (id, body)     => client.put(`/hearings/${id}`, body).then(r => r.data);
export const deleteHearing     = (id)           => client.delete(`/hearings/${id}`).then(r => r.data);

// ── Calendrier ────────────────────────────────────────────────────────────────
export const getCalendarEvents = (month)        => client.get('/hearings/calendar', { params: { month } }).then(r => r.data);

// ── Rappels ───────────────────────────────────────────────────────────────────
export const getReminders      = ()             => client.get('/hearings/reminders').then(r => r.data);

// ── Délais légaux ─────────────────────────────────────────────────────────────
export const getDeadlines      = (params = {})  => client.get('/hearings/deadlines', { params }).then(r => r.data);
export const createDeadline    = (body)         => client.post('/hearings/deadlines', body).then(r => r.data);
export const updateDeadlineStatus = (id, status) =>
  client.patch(`/hearings/deadlines/${id}/status`, { status }).then(r => r.data);