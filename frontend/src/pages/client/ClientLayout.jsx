// src/pages/client/ClientLayout.jsx
// Layout principal de l'espace client — wraps toutes les pages /client/*

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, FileText, Receipt,
  MessageSquare, LogOut, Menu, X, Bell, ChevronRight,
} from 'lucide-react';

const NAV = [
  { to: '/client',           label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/client/cases',     label: 'Mes dossiers',    icon: FolderOpen },
  { to: '/client/documents', label: 'Documents',       icon: FileText },
  { to: '/client/invoices',  label: 'Factures',        icon: Receipt },
];

export default function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]               = useState(null);
  const navigate                      = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div style={styles.root}>
      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{ ...styles.sidebar, ...(sidebarOpen ? styles.sidebarOpen : {}) }}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoMark}>M</div>
          <span style={styles.logoText}>Mizan</span>
          <span style={styles.logoSub}>Client</span>
          <button
            style={styles.closeBtn}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {(user.nom || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.userName}>{user.nom}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} style={styles.chevron} />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={styles.main}>
        {/* Topbar */}
        <header style={styles.topbar}>
          <button style={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div style={styles.topbarRight}>
            <button style={styles.iconBtn}>
              <Bell size={20} />
            </button>
            <div style={styles.topbarAvatar}>
              {user ? (user.nom || 'C').charAt(0).toUpperCase() : 'C'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SIDEBAR_W = 260;

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f0f2f5',
    fontFamily: "'Lato', 'Helvetica Neue', sans-serif",
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 40,
  },
  sidebar: {
    width: SIDEBAR_W,
    minHeight: '100vh',
    background: '#0f1923',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    flexShrink: 0,
    position: 'relative',
    zIndex: 50,
    transition: 'transform 0.25s ease',
    '@media (max-width: 768px)': {
      position: 'fixed',
      transform: 'translateX(-100%)',
    },
  },
  sidebarOpen: {
    position: 'fixed',
    transform: 'translateX(0)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #c9a84c, #e8c96d)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 16, color: '#0f1923',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px',
  },
  logoSub: {
    fontSize: 10, fontWeight: 600, color: '#c9a84c',
    background: 'rgba(201,168,76,0.15)',
    padding: '2px 6px', borderRadius: 4, marginLeft: 2,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  closeBtn: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4,
    display: 'none', // hidden on desktop — shown via media query in real CSS
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    margin: '0',
  },
  userAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a84c, #e8c96d)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 15, color: '#0f1923', flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 },
  userEmail: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  nav: {
    flex: 1, padding: '12px 12px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  navLink: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
    transition: 'all 0.15s',
  },
  navLinkActive: {
    background: 'rgba(201,168,76,0.12)',
    color: '#c9a84c',
  },
  chevron: { marginLeft: 'auto', opacity: 0.3 },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '14px 24px',
    background: 'none', border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
    fontSize: 13, width: '100%', transition: 'color 0.15s',
  },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: 60,
    background: '#fff',
    borderBottom: '1px solid #e8eaed',
    position: 'sticky', top: 0, zIndex: 30,
  },
  menuBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#555', padding: 4, display: 'flex',
  },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#555', padding: 6, display: 'flex', borderRadius: 8,
  },
  topbarAvatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a84c, #e8c96d)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13, color: '#0f1923',
  },
  content: { padding: '28px 24px', flex: 1 },
};