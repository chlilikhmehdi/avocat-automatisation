// components/layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { UserAvatar } from '../ui';

export default function Sidebar({ currentUser, onLogout }) {
  const { lang, t } = useLang();
  const navigate    = useNavigate();
  const location    = useLocation();

  const role     = currentUser?.role || 'CLIENT';
  const isActive = (path) => location.pathname.startsWith(path);

  const navItems = [
    // ── Admin uniquement ────────────────────────────────────────────────────
    ...(role === 'ADMIN'
      ? [{ path: '/users', icon: '👥', label: t.users || 'Utilisateurs' }]
      : []),

    // ── Avocat / Admin / Assistant ──────────────────────────────────────────
    ...(['ADMIN', 'LAWYER', 'ASSISTANT'].includes(role)
      ? [
          { path: '/cases',     icon: '📁', label: t.cases     || 'Dossiers'   },
          { path: '/audiences', icon: '📅', label: t.audiences || 'Audiences', disabled: true },
          { path: '/documents', icon: '📄', label: t.documents || 'Documents'  },
        ]
      : []),

    // ── Module IA ───────────────────────────────────────────────────────────
    ...(['ADMIN', 'LAWYER', 'ASSISTANT'].includes(role)
      ? [
          {
            path:  '/ai-documents',
            icon:  '🤖',
            label: t.aiDocuments || 'Analyse IA',
          },
          {
            path:  '/document-analyzer',
            icon:  '⚖️',
            label: t.documentAnalyzer || 'Extraction juridique',
          },
        ]
      : []),
  ];

  return (
    <div className="sidebar" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-dot" />
        MiZan
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.path}
            className={[
              'sidebar-item',
              isActive(item.path) ? ' active' : '',
              item.disabled      ? ' disabled' : '',
            ].join('')}
            onClick={() => !item.disabled && navigate(item.path)}
            title={item.disabled ? 'Bientôt disponible' : item.label}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.disabled && (
              <span style={{
                marginInlineStart: 'auto',
                fontSize:          9,
                fontWeight:        700,
                background:        '#f1f5f9',
                color:             '#94a3b8',
                padding:           '2px 6px',
                borderRadius:      8,
                textTransform:     'uppercase',
                letterSpacing:     '.5px',
              }}>
                Soon
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer utilisateur */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={onLogout}
          title={t.logout}
        >
          <UserAvatar name={currentUser?.nom || 'Admin'} role={role} />
          <div>
            <div className="sidebar-user-name">
              {currentUser?.nom || 'Administrateur'}
            </div>
            <div className="sidebar-user-role">{t.logout}</div>
          </div>
        </div>
      </div>
    </div>
  );
}