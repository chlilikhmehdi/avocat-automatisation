import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Pages du module Lawyer
import LawyerDashboard from './pages/Lawyerdashboard';
import CaseDetail      from './pages/Casedetail';
import CreateCase      from './pages/Createcase';

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const ROLES_META = {
  ADMIN:     { fr: 'Administrateur', ar: 'مدير',   color: '#ef4444', bg: '#fef2f2' },
  LAWYER:    { fr: 'Avocat',         ar: 'محامي',  color: '#3b82f6', bg: '#eff6ff' },
  ASSISTANT: { fr: 'Assistant',      ar: 'مساعد',  color: '#10b981', bg: '#ecfdf5' },
  CLIENT:    { fr: 'Client',         ar: 'موكل',   color: '#6b7280', bg: '#f9fafb' },
};

// ──────────────────────────────────────────────
// LANG CONTEXT
// ──────────────────────────────────────────────
const LangContext = createContext();
const useLang = () => useContext(LangContext);

const T = {
  fr: {
    title: 'Gestion des Utilisateurs',
    subtitle: 'Administration des accès et rôles',
    addUser: 'Ajouter un utilisateur',
    search: 'Rechercher...',
    allRoles: 'Tous les rôles',
    name: 'Nom complet',
    email: 'Adresse email',
    phone: 'Téléphone',
    role: 'Rôle',
    org: 'Organisation',
    createdAt: 'Créé le',
    actions: 'Actions',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    password: 'Mot de passe',
    confirmDelete: 'Confirmer la suppression',
    deleteMsg: 'Cette action est irréversible. Voulez-vous vraiment supprimer',
    yes: 'Oui, supprimer',
    noData: 'Aucun utilisateur trouvé',
    loading: 'Chargement...',
    editUser: "Modifier l'utilisateur",
    newUser: 'Nouvel utilisateur',
    total: 'utilisateur(s)',
    page: 'Page',
    of: 'sur',
    required: 'Champ obligatoire',
    emailInvalid: 'Email invalide',
    pwdMin: 'Minimum 8 caractères',
    success: 'Opération réussie',
    error: 'Une erreur est survenue',
    logout: 'Déconnexion',
    dashboard: 'Tableau de bord',
    login: 'Se connecter',
    loginSubtitle: 'Connexion à votre espace',
    stats: { total: 'Total', admins: 'Admins', lawyers: 'Avocats', clients: 'Clients' },
    // Nouvelles clés module Lawyer
    cases: 'Dossiers',
    audiences: 'Audiences',
    documents: 'Documents',
    users: 'Utilisateurs',
  },
  ar: {
    title: 'إدارة المستخدمين',
    subtitle: 'إدارة الصلاحيات والأدوار',
    addUser: 'إضافة مستخدم',
    search: 'بحث...',
    allRoles: 'جميع الأدوار',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    role: 'الدور',
    org: 'المنظمة',
    createdAt: 'تاريخ الإنشاء',
    actions: 'الإجراءات',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    password: 'كلمة المرور',
    confirmDelete: 'تأكيد الحذف',
    deleteMsg: 'هذا الإجراء لا يمكن التراجع عنه. هل تريد حقاً حذف',
    yes: 'نعم، احذف',
    noData: 'لا يوجد مستخدمون',
    loading: 'جار التحميل...',
    editUser: 'تعديل المستخدم',
    newUser: 'مستخدم جديد',
    total: 'مستخدم(ون)',
    page: 'صفحة',
    of: 'من',
    required: 'هذا الحقل مطلوب',
    emailInvalid: 'البريد الإلكتروني غير صالح',
    pwdMin: '٨ أحرف على الأقل',
    success: 'تمت العملية بنجاح',
    error: 'حدث خطأ ما',
    logout: 'تسجيل الخروج',
    dashboard: 'لوحة التحكم',
    login: 'تسجيل الدخول',
    loginSubtitle: 'الدخول إلى حسابك',
    stats: { total: 'الإجمالي', admins: 'المديرون', lawyers: 'المحامون', clients: 'الموكلون' },
    // Nouvelles clés module Lawyer
    cases: 'القضايا',
    audiences: 'الجلسات',
    documents: 'الوثائق',
    users: 'المستخدمون',
  },
};

// ──────────────────────────────────────────────
// API CLIENT (inchangé)
// ──────────────────────────────────────────────
const api = {
  getToken() { return localStorage.getItem('mizan_token') || ''; },
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
  getUsers:   (params = {}) => { const q = new URLSearchParams(params).toString(); return api.request('GET', `/users?${q}`); },
  createUser: (data)        => api.request('POST', '/users', data),
  updateUser: (id, data)    => api.request('PUT', `/users/${id}`, data),
  deleteUser: (id)          => api.request('DELETE', `/users/${id}`),
  login:      (email, pwd)  => api.request('POST', '/auth/login', { email, password: pwd }),
};

// ──────────────────────────────────────────────
// STYLES (inchangés)
// ──────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('mizan-styles')) return;
  const style = document.createElement('style');
  style.id = 'mizan-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink: #0f172a; --ink2: #334155; --muted: #64748b; --border: #e2e8f0;
      --surface: #ffffff; --bg: #f8fafc; --accent: #1e40af; --accent-light: #dbeafe;
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06);
      --shadow-lg: 0 8px 32px rgba(0,0,0,.12);
      --font-en: 'DM Sans', sans-serif; --font-ar: 'Noto Naskh Arabic', serif;
      --font-display: 'Playfair Display', serif;
    }
    body { font-family: var(--font-en); background: var(--bg); color: var(--ink); }
    [dir="rtl"] * { font-family: var(--font-ar); }
    .app { display: flex; min-height: 100vh; }
    .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e8f0fe 100%); }
    .login-card { background: white; padding: 44px 40px; border-radius: 20px; box-shadow: var(--shadow-lg); width: 100%; max-width: 400px; border: 1px solid var(--border); }
    .login-logo { font-family: var(--font-display); font-size: 32px; color: var(--ink); margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .login-logo-dot { width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; }
    .login-subtitle { font-size: 14px; color: var(--muted); margin-bottom: 32px; }
    .login-demo { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #1e40af; }
    .login-demo strong { display: block; margin-bottom: 3px; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
    .sidebar { width: 240px; background: var(--ink); color: white; display: flex; flex-direction: column; flex-shrink: 0; }
    .sidebar-logo { padding: 28px 24px; border-bottom: 1px solid rgba(255,255,255,.08); font-family: var(--font-display); font-size: 26px; letter-spacing: -.5px; display: flex; align-items: center; gap: 10px; }
    .sidebar-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #60a5fa; }
    .sidebar-nav { padding: 16px 12px; flex: 1; }
    .sidebar-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 8px; cursor: pointer; color: rgba(255,255,255,.65); font-size: 14px; font-weight: 500; transition: all .15s; user-select: none; }
    .sidebar-item:hover { background: rgba(255,255,255,.07); color: white; }
    .sidebar-item.active { background: rgba(96,165,250,.15); color: #60a5fa; }
    .sidebar-item.disabled { opacity: .4; cursor: not-allowed; }
    .sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,.08); }
    .sidebar-user { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: background .15s; }
    .sidebar-user:hover { background: rgba(255,255,255,.07); }
    .avatar { border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; flex-shrink: 0; }
    .sidebar-user-name { font-size: 13px; font-weight: 500; color: white; }
    .sidebar-user-role { font-size: 11px; color: rgba(255,255,255,.45); }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .topbar-title { font-family: var(--font-display); font-size: 22px; color: var(--ink); }
    .topbar-sub { font-size: 13px; color: var(--muted); margin-top: 1px; }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .content { flex: 1; overflow-y: auto; padding: 28px 32px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; display: flex; align-items: center; gap: 16px; }
    .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .stat-value { font-size: 28px; font-weight: 700; color: var(--ink); line-height: 1; }
    .stat-label { font-size: 12px; color: var(--muted); margin-top: 3px; font-weight: 500; text-transform: uppercase; letter-spacing: .5px; }
    .table-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .table-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .search-wrap { position: relative; flex: 1; min-width: 200px; }
    .search-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
    [dir="rtl"] .search-wrap svg { left: auto; right: 12px; }
    input.search { width: 100%; padding: 9px 12px 9px 36px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; transition: border .15s; background: var(--bg); font-family: inherit; }
    [dir="rtl"] input.search { padding: 9px 36px 9px 12px; }
    input.search:focus { border-color: var(--accent); background: white; }
    select.filter { padding: 9px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; background: var(--bg); cursor: pointer; font-family: inherit; color: var(--ink2); }
    select.filter:focus { border-color: var(--accent); }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px 20px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; background: var(--bg); border-bottom: 1px solid var(--border); }
    [dir="rtl"] th { text-align: right; }
    td { padding: 14px 20px; font-size: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .user-cell { display: flex; align-items: center; gap: 11px; }
    .user-name { font-weight: 500; color: var(--ink); }
    .user-email { font-size: 12px; color: var(--muted); margin-top: 1px; }
    .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-dot { width: 5px; height: 5px; border-radius: 50%; }
    .action-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all .15s; font-family: inherit; }
    .btn-edit { background: #eff6ff; color: #3b82f6; border-color: #bfdbfe; }
    .btn-edit:hover { background: #dbeafe; }
    .btn-delete { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
    .btn-delete:hover { background: #fee2e2; }
    .btn-primary { background: var(--accent); color: white; border: none; padding: 9px 18px; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: background .15s; font-family: inherit; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--ink2); padding: 9px 18px; border-radius: 9px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
    .btn-ghost:hover { background: var(--bg); }
    .btn-danger { background: #ef4444; color: white; border: none; padding: 9px 18px; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; }
    .btn-danger:hover { background: #dc2626; }
    .lang-toggle { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .lang-btn { padding: 6px 13px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--muted); transition: all .15s; font-family: inherit; }
    .lang-btn.active { background: var(--accent); color: white; }
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid var(--border); }
    .page-info { font-size: 13px; color: var(--muted); }
    .page-btns { display: flex; gap: 6px; }
    .page-btn { width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border); background: white; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all .15s; font-family: inherit; }
    .page-btn:hover { border-color: var(--accent); color: var(--accent); }
    .page-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
    .page-btn:disabled { opacity: .4; cursor: default; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn .15s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal { background: white; border-radius: 16px; box-shadow: var(--shadow-lg); width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; animation: slideUp .2s; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-header { padding: 22px 26px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 18px; font-weight: 700; color: var(--ink); font-family: var(--font-display); }
    .modal-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--muted); transition: all .15s; }
    .modal-close:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
    .modal-body { padding: 26px; }
    .modal-footer { padding: 18px 26px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
    [dir="rtl"] .modal-footer { justify-content: flex-start; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-full { grid-column: 1 / -1; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--ink2); }
    .field input, .field select { padding: 10px 13px; border: 1px solid var(--border); border-radius: 9px; font-size: 14px; outline: none; transition: border .15s; background: var(--bg); font-family: inherit; color: var(--ink); }
    .field input:focus, .field select:focus { border-color: var(--accent); background: white; }
    .field-error { font-size: 12px; color: #ef4444; }
    .field input.error, .field select.error { border-color: #ef4444; }
    .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
    [dir="rtl"] .toast-container { right: auto; left: 24px; }
    .toast { padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 500; box-shadow: var(--shadow-lg); animation: slideUp .2s; display: flex; align-items: center; gap: 8px; min-width: 220px; }
    .toast-success { background: #022c22; color: #34d399; }
    .toast-error { background: #450a0a; color: #f87171; }
    .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    @media (max-width: 900px) { .sidebar { display: none; } .stats-grid { grid-template-columns: repeat(2, 1fr); } .content { padding: 20px 16px; } .topbar { padding: 0 16px; } }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr 1fr; } .form-grid { grid-template-columns: 1fr; } .form-full { grid-column: auto; } .table-header { flex-direction: column; } .login-card { padding: 32px 24px; margin: 16px; } }
  `;
  document.head.appendChild(style);
};

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
let toastId = 0;
const ToastContext = createContext();

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = ++toastId;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? '✓' : '✕'} {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => useContext(ToastContext);

// ──────────────────────────────────────────────
// COMPOSANTS PARTAGÉS (inchangés)
// ──────────────────────────────────────────────
function RoleBadge({ role, lang }) {
  const meta = ROLES_META[role] || ROLES_META.CLIENT;
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.color }}>
      <span className="badge-dot" style={{ background: meta.color }} />
      {lang === 'ar' ? meta.ar : meta.fr}
    </span>
  );
}

function UserAvatar({ name, size = 34, role }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  const colors = { ADMIN: '#ef4444', LAWYER: '#3b82f6', ASSISTANT: '#10b981', CLIENT: '#6b7280' };
  return (
    <div className="avatar" style={{ width: size, height: size, background: colors[role] || '#6b7280', fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function StatCard({ icon, value, label, bg, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// MOCK DATA
// ──────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, nom: 'Karim Benali',       email: 'admin@benali.ma',   telephone: '0522-123456', role: 'ADMIN',     organization_id: 1, organization_name: 'Cabinet Benali & Associés', created_at: '2024-01-15' },
  { id: 2, nom: 'Leila Amrani',       email: 'lawyer@benali.ma',  telephone: '0522-234567', role: 'LAWYER',    organization_id: 1, organization_name: 'Cabinet Benali & Associés', created_at: '2024-02-01' },
  { id: 3, nom: 'Omar Chaoui',        email: 'assist@benali.ma',  telephone: '0522-345678', role: 'ASSISTANT', organization_id: 1, organization_name: 'Cabinet Benali & Associés', created_at: '2024-02-10' },
  { id: 4, nom: 'Hassan Idrissi',     email: 'client@benali.ma',  telephone: null,           role: 'CLIENT',    organization_id: 1, organization_name: 'Cabinet Benali & Associés', created_at: '2024-03-05' },
  { id: 5, nom: 'Nadia Tazi',         email: 'nadia@benali.ma',   telephone: '0661-445566', role: 'LAWYER',    organization_id: 1, organization_name: 'Cabinet Benali & Associés', created_at: '2024-03-12' },
  { id: 6, nom: 'Youssef Benjelloun', email: 'youssef@benali.ma', telephone: '0700-112233', role: 'CLIENT',    organization_id: 1, organization_name: 'Cabinet Benali & Associés', created_at: '2024-04-01' },
];

// ──────────────────────────────────────────────
// LOGIN SCREEN (inchangé)
// ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const { lang, t } = useLang();
  const toast = useToast();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = t.required;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t.emailInvalid;
    if (!password) e.password = t.required;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.token) {
        api.setToken(res.token);
        localStorage.setItem('mizan_user', JSON.stringify(res.user));
        onLogin(res.user);
      } else {
        toast(res.message || t.error, 'error');
      }
    } catch {
      const demoUser = MOCK_USERS.find(u => u.email === email);
      if (demoUser && password.length >= 8) {
        api.setToken('demo_token_' + Date.now());
        localStorage.setItem('mizan_user', JSON.stringify(demoUser));
        onLogin(demoUser);
        toast(t.success);
      } else {
        toast(lang === 'ar' ? 'بريد أو كلمة مرور غير صحيحة' : 'Email ou mot de passe incorrect', 'error');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="login-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="login-card">
        <div className="login-logo"><div className="login-logo-dot" />MiZan</div>
        <p className="login-subtitle">{t.loginSubtitle}</p>
        <div className="login-demo">
          <strong>🔑 Démo / تجريبي</strong>
          admin@benali.ma · motdepasse123
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>{t.email} *</label>
          <input
            type="email" className={errors.email ? 'error' : ''} value={email}
            onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
            onKeyDown={e => e.key === 'Enter' && submit()} placeholder="email@cabinet.ma"
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field" style={{ marginBottom: 28 }}>
          <label>{t.password} *</label>
          <input
            type="password" className={errors.password ? 'error' : ''} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
            onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••"
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <button
          className="btn-primary" onClick={submit} disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15 }}
        >
          {loading ? '...' : t.login}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// USER FORM MODAL (inchangé)
// ──────────────────────────────────────────────
function UserModal({ user, orgId, onSave, onClose }) {
  const { lang, t } = useLang();
  const toast = useToast();
  const isEdit = !!user;

  const [form, setForm] = useState({
    nom: user?.nom || '', email: user?.email || '',
    telephone: user?.telephone || '', role: user?.role || 'CLIENT', password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.nom.trim()) e.nom = t.required;
    if (!form.email.trim()) e.email = t.required;
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t.emailInvalid;
    if (!form.role) e.role = t.required;
    if (!isEdit && !form.password) e.password = t.required;
    if (form.password && form.password.length < 8) e.password = t.pwdMin;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handle = k => e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrors(p => ({ ...p, [k]: '' })); };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, organization_id: orgId };
      if (isEdit && !form.password) delete payload.password;
      const res = isEdit ? await api.updateUser(user.id, payload) : await api.createUser(payload);
      if (res.success) { toast(t.success); onSave(); }
      else toast(res.message || t.error, 'error');
    } catch { toast(t.success); onSave(); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? t.editUser : t.newUser}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field form-full">
              <label>{t.name} *</label>
              <input className={errors.nom ? 'error' : ''} value={form.nom} onChange={handle('nom')} placeholder="Ex: Mohamed El Fassi" />
              {errors.nom && <span className="field-error">{errors.nom}</span>}
            </div>
            <div className="field">
              <label>{t.email} *</label>
              <input type="email" className={errors.email ? 'error' : ''} value={form.email} onChange={handle('email')} placeholder="email@cabinet.ma" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="field">
              <label>{t.phone}</label>
              <input value={form.telephone} onChange={handle('telephone')} placeholder="+212 6XX XXX XXX" />
            </div>
            <div className="field">
              <label>{t.role} *</label>
              <select className={errors.role ? 'error' : ''} value={form.role} onChange={handle('role')}>
                {Object.entries(ROLES_META).map(([k, v]) => (
                  <option key={k} value={k}>{lang === 'ar' ? v.ar : v.fr}</option>
                ))}
              </select>
              {errors.role && <span className="field-error">{errors.role}</span>}
            </div>
            <div className="field form-full">
              <label>{t.password}{!isEdit && ' *'}</label>
              <input
                type="password" className={errors.password ? 'error' : ''} value={form.password}
                onChange={handle('password')}
                placeholder={isEdit ? (lang === 'ar' ? '(اتركه فارغاً = بدون تغيير)' : '(laisser vide = inchangé)') : '••••••••'}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : t.save}</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// DELETE MODAL (inchangé)
// ──────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onClose }) {
  const { t } = useLang();
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">{t.confirmDelete}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '30px 26px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
          <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.5 }}>
            {t.deleteMsg} <strong>{user?.nom}</strong> ?
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn-danger" onClick={onConfirm}>{t.yes}</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// DASHBOARD USERS (logique originale inchangée)
// ──────────────────────────────────────────────
function Dashboard({ currentUser }) {
  const { lang, t } = useLang();
  const toast = useToast();

  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [modalUser, setModalUser]   = useState(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [mockUsers, setMockUsers]   = useState(MOCK_USERS);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.getUsers(params);
      if (res.success) { setUsers(res.data || []); setPagination(res.pagination || { total: 0, page: 1, pages: 1 }); }
      else throw new Error(res.message);
    } catch {
      let filtered = mockUsers;
      if (search) filtered = filtered.filter(u => u.nom.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
      if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);
      setUsers(filtered);
      setPagination({ total: filtered.length, page: 1, pages: 1 });
    } finally { setLoading(false); }
  }, [page, search, roleFilter, mockUsers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async () => {
    try {
      const res = await api.deleteUser(deleteUser.id);
      if (res.success) { toast(t.success); fetchUsers(); }
      else throw new Error(res.message);
    } catch {
      setMockUsers(p => p.filter(u => u.id !== deleteUser.id));
      toast(t.success);
    } finally { setDeleteUser(null); }
  };

  const stats = {
    total: pagination.total || users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    lawyers: users.filter(u => u.role === 'LAWYER').length,
    clients: users.filter(u => u.role === 'CLIENT').length,
  };

  return (
    <div className="main" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="topbar">
        <div>
          <div className="topbar-title">{t.title}</div>
          <div className="topbar-sub">{t.subtitle}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => { setModalUser(null); setModalOpen(true); }}>
            <span>+</span> {t.addUser}
          </button>
        </div>
      </div>
      <div className="content">
        <div className="stats-grid">
          <StatCard icon="👥" value={stats.total}   label={t.stats.total}   bg="#eff6ff" color="#3b82f6" />
          <StatCard icon="🛡️" value={stats.admins}  label={t.stats.admins}  bg="#fef2f2" color="#ef4444" />
          <StatCard icon="⚖️" value={stats.lawyers} label={t.stats.lawyers} bg="#eff6ff" color="#3b82f6" />
          <StatCard icon="👤" value={stats.clients} label={t.stats.clients} bg="#f9fafb" color="#6b7280" />
        </div>
        <div className="table-card">
          <div className="table-header">
            <div className="search-wrap">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input className="search" placeholder={t.search} value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <select className="filter" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">{t.allRoles}</option>
              {Object.entries(ROLES_META).map(([k, v]) => (
                <option key={k} value={k}>{lang === 'ar' ? v.ar : v.fr}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="empty"><div className="empty-icon">⏳</div><p>{t.loading}</p></div>
          ) : users.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><p>{t.noData}</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t.name}</th><th>{t.phone}</th><th>{t.role}</th>
                  <th>{t.org}</th><th>{t.createdAt}</th><th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <UserAvatar name={u.nom} role={u.role} />
                        <div>
                          <div className="user-name">{u.nom}</div>
                          <div className="user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{u.telephone || '—'}</td>
                    <td><RoleBadge role={u.role} lang={lang} /></td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{u.organization_name || `Org #${u.organization_id}`}</td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="action-btn btn-edit" onClick={() => { setModalUser(u); setModalOpen(true); }}>✏️ {t.edit}</button>
                        <button className="action-btn btn-delete" onClick={() => setDeleteUser(u)}>🗑 {t.delete}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pagination.pages > 1 && (
            <div className="pagination">
              <span className="page-info">{pagination.total} {t.total} · {t.page} {pagination.page} {t.of} {pagination.pages}</span>
              <div className="page-btns">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {modalOpen && <UserModal user={modalUser} orgId={currentUser?.organization_id || 1} onSave={() => { setModalOpen(false); fetchUsers(); }} onClose={() => setModalOpen(false)} />}
      {deleteUser && <DeleteModal user={deleteUser} onConfirm={handleDelete} onClose={() => setDeleteUser(null)} />}
    </div>
  );
}

// ──────────────────────────────────────────────
// SIDEBAR — désormais router-aware
// Remplace l'ancienne Sidebar à état statique.
// useNavigate + useLocation doivent être appelés
// DANS BrowserRouter → on met Sidebar dans AppLayout.
// ──────────────────────────────────────────────
function Sidebar({ currentUser, onLogout }) {
  const { lang, t } = useLang();
  const navigate    = useNavigate();
  const location    = useLocation();

  const role    = currentUser?.role || 'CLIENT';
  const isActive = (path) => location.pathname.startsWith(path);

  // Items visibles selon le rôle
  const navItems = [
    // Utilisateurs : ADMIN uniquement
    ...(role === 'ADMIN' ? [{ path: '/users', icon: '👥', label: t.users || 'Utilisateurs' }] : []),
    // Dossiers : ADMIN + LAWYER
    ...(['ADMIN', 'LAWYER'].includes(role) ? [{ path: '/cases', icon: '📁', label: t.cases || 'Dossiers' }] : []),
    // Futurs modules (disabled)
    { path: '/audiences', icon: '📅', label: t.audiences || 'Audiences', disabled: true },
    { path: '/documents', icon: '📄', label: t.documents || 'Documents',  disabled: true },
  ];

  return (
    <div className="sidebar" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="sidebar-logo"><div className="sidebar-logo-dot" />MiZan</div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.path}
            className={`sidebar-item${isActive(item.path) ? ' active' : ''}${item.disabled ? ' disabled' : ''}`}
            onClick={() => !item.disabled && navigate(item.path)}
          >
            <span>{item.icon}</span> {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title={t.logout}>
          <UserAvatar name={currentUser?.nom || 'Admin'} role={role} />
          <div>
            <div className="sidebar-user-name">{currentUser?.nom || 'Administrateur'}</div>
            <div className="sidebar-user-role">{t.logout}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// APP LAYOUT  ← NOUVEAU
// Encapsule sidebar + routes dans un seul composant.
// Sidebar peut utiliser useNavigate car il est
// déjà fils de <BrowserRouter> dans App.
// ──────────────────────────────────────────────
function AppLayout({ currentUser, onLogout, lang, toggleLang }) {
  return (
    <div className="app" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sélecteur de langue */}
      <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 999 }}>
        <div className="lang-toggle">
          <button className={`lang-btn${lang === 'fr' ? ' active' : ''}`} onClick={() => toggleLang('fr')}>FR</button>
          <button className={`lang-btn${lang === 'ar' ? ' active' : ''}`} onClick={() => toggleLang('ar')}>AR</button>
        </div>
      </div>

      {/* Sidebar commune à toutes les routes */}
      <Sidebar currentUser={currentUser} onLogout={onLogout} />

      {/*
        Zone de contenu : les pages s'affichent ici
        selon la route active, sans re-monter la sidebar.
      */}
      <Routes>
        {/* ── Module Utilisateurs (ancienne logique) ── */}
        <Route path="/users" element={<Dashboard currentUser={currentUser} />} />

        {/* ── Module Lawyer : dossiers (nouvelle logique) ── */}
        <Route path="/cases"     element={<LawyerDashboard currentUser={currentUser} />} />
        <Route path="/cases/new" element={<CreateCase />} />
        <Route path="/cases/:id" element={<CaseDetail currentUser={currentUser} />} />

        {/* ── Redirect par défaut selon le rôle ── */}
        <Route
          path="*"
          element={<Navigate to={currentUser?.role === 'ADMIN' ? '/users' : '/cases'} replace />}
        />
      </Routes>
    </div>
  );
}

// ──────────────────────────────────────────────
// ROOT APP
// ──────────────────────────────────────────────
export default function App() {
  injectStyles();

  const [lang, setLang] = useState('fr');
  const t = T[lang];

  // Session persistante (inchangé)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mizan_user');
      const token  = localStorage.getItem('mizan_token');
      if (stored && token) return JSON.parse(stored);
    } catch { /* ignore */ }
    return null;
  });

  const handleLogin  = (user) => setCurrentUser(user);
  const handleLogout = () => {
    api.setToken(null);
    localStorage.removeItem('mizan_user');
    setCurrentUser(null);
  };

  const toggleLang = (l) => {
    setLang(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <LangContext.Provider value={{ lang, t }}>
      <ToastProvider>
        {/*
          BrowserRouter est monté ici (à la racine) pour que
          Sidebar (useNavigate/useLocation) fonctionne partout.
          LoginScreen n'a pas besoin du router.
        */}
        <BrowserRouter>
          {!currentUser ? (
            <LoginScreen onLogin={handleLogin} />
          ) : (
            <AppLayout
              currentUser={currentUser}
              onLogout={handleLogout}
              lang={lang}
              toggleLang={toggleLang}
            />
          )}
        </BrowserRouter>
      </ToastProvider>
    </LangContext.Provider>
  );
}