const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0f172a; --ink2: #334155; --muted: #64748b; --border: #e2e8f0;
    --surface: #ffffff; --bg: #f8fafc; --accent: #1e40af; --accent-light: #dbeafe;
    --radius: 12px;
    --shadow: 0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06);
    --shadow-lg: 0 8px 32px rgba(0,0,0,.12);
    --font-en: 'DM Sans', sans-serif;
    --font-ar: 'Noto Naskh Arabic', serif;
    --font-display: 'Playfair Display', serif;
  }

  body { font-family: var(--font-en); background: var(--bg); color: var(--ink); }
  [dir="rtl"] * { font-family: var(--font-ar); }

  .app { display: flex; min-height: 100vh; }

  /* ── Login ── */
  .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e8f0fe 100%); }
  .login-card { background: white; padding: 44px 40px; border-radius: 20px; box-shadow: var(--shadow-lg); width: 100%; max-width: 400px; border: 1px solid var(--border); }
  .login-logo { font-family: var(--font-display); font-size: 32px; color: var(--ink); margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
  .login-logo-dot { width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; }
  .login-subtitle { font-size: 14px; color: var(--muted); margin-bottom: 32px; }
  .login-demo { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #1e40af; }
  .login-demo strong { display: block; margin-bottom: 3px; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }

  /* ── Sidebar ── */
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
  .sidebar-user-name { font-size: 13px; font-weight: 500; color: white; }
  .sidebar-user-role { font-size: 11px; color: rgba(255,255,255,.45); }

  /* ── Common ── */
  .avatar { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; flex-shrink: 0; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .topbar-title { font-family: var(--font-display); font-size: 22px; color: var(--ink); }
  .topbar-sub { font-size: 13px; color: var(--muted); margin-top: 1px; }
  .topbar-actions { display: flex; align-items: center; gap: 10px; }
  .content { flex: 1; overflow-y: auto; padding: 28px 32px; }

  /* ── Stats ── */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; display: flex; align-items: center; gap: 16px; }
  .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .stat-value { font-size: 28px; font-weight: 700; color: var(--ink); line-height: 1; }
  .stat-label { font-size: 12px; color: var(--muted); margin-top: 3px; font-weight: 500; text-transform: uppercase; letter-spacing: .5px; }

  /* ── Table ── */
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

  /* ── Badge ── */
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; }

  /* ── Buttons ── */
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

  /* ── Lang toggle ── */
  .lang-toggle { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .lang-btn { padding: 6px 13px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--muted); transition: all .15s; font-family: inherit; }
  .lang-btn.active { background: var(--accent); color: white; }

  /* ── Pagination ── */
  .pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid var(--border); }
  .page-info { font-size: 13px; color: var(--muted); }
  .page-btns { display: flex; gap: 6px; }
  .page-btn { width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border); background: white; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all .15s; font-family: inherit; }
  .page-btn:hover { border-color: var(--accent); color: var(--accent); }
  .page-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
  .page-btn:disabled { opacity: .4; cursor: default; }

  /* ── Modal ── */
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

  /* ── Form ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-full { grid-column: 1 / -1; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 13px; font-weight: 600; color: var(--ink2); }
  .field input, .field select { padding: 10px 13px; border: 1px solid var(--border); border-radius: 9px; font-size: 14px; outline: none; transition: border .15s; background: var(--bg); font-family: inherit; color: var(--ink); }
  .field input:focus, .field select:focus { border-color: var(--accent); background: white; }
  .field-error { font-size: 12px; color: #ef4444; }
  .field input.error, .field select.error { border-color: #ef4444; }

  /* ── Toast ── */
  .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
  [dir="rtl"] .toast-container { right: auto; left: 24px; }
  .toast { padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 500; box-shadow: var(--shadow-lg); animation: slideUp .2s; display: flex; align-items: center; gap: 8px; min-width: 220px; }
  .toast-success { background: #022c22; color: #34d399; }
  .toast-error { background: #450a0a; color: #f87171; }

  /* ── Empty state ── */
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .sidebar { display: none; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .content { padding: 20px 16px; }
    .topbar { padding: 0 16px; }
  }
  @media (max-width: 600px) {
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .form-full { grid-column: auto; }
    .table-header { flex-direction: column; }
    .login-card { padding: 32px 24px; margin: 16px; }
  }
`;

export function injectGlobalStyles() {
  if (document.getElementById('mizan-styles')) return;
  const style = document.createElement('style');
  style.id = 'mizan-styles';
  style.textContent = globalStyles;
  document.head.appendChild(style);
}