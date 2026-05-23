// components/layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { UserAvatar } from '../ui';

export default function Sidebar({ currentUser, onLogout }) {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const role = currentUser?.role || 'CLIENT';

  const isActive = (path) => {
    if (path === '/hearings') {
      return (
        location.pathname.startsWith('/hearings') ||
        location.pathname.startsWith('/calendar') ||
        location.pathname.startsWith('/legal-deadlines')
      );
    }
    if (path === '/invoices') {
      return (
        location.pathname.startsWith('/invoices') ||
        location.pathname.startsWith('/billing-notes') ||
        location.pathname.startsWith('/payments') ||
        location.pathname.startsWith('/billing')
      );
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    // ── Admin uniquement ────────────────────────────────────────────────────
    ...(role === 'ADMIN'
      ? [{ path: '/users', icon: '👥', label: t.users || 'Utilisateurs' }]
      : []),

    // ── Avocat / Admin / Assistant ──────────────────────────────────────────
    ...(['ADMIN', 'LAWYER', 'ASSISTANT'].includes(role)
      ? [
          { path: '/cases',           icon: '📁', label: t.cases           || 'Dossiers'             },
          { path: '/calendar',        icon: '🗓️', label: t.calendar        || 'Calendrier'           },
          { path: '/hearings',        icon: '⚖️', label: t.hearings        || 'Audiences'            },
          { path: '/legal-deadlines', icon: '⏳', label: t.legalDeadlines  || 'Délais légaux'        },
          { path: '/document-analyzer', icon: '🔍', label: lang === 'ar' ? 'تحليل المستندات NLP' : 'Document Analyser NLP' },
        ]
      : []),

    // ── Facturation ─────────────────────────────────────────────────────────
    ...(['ADMIN', 'LAWYER', 'ASSISTANT'].includes(role)
      ? [
          { path: '/invoices',       icon: '🧾', label: t.invoices      || 'Factures'           },
          { path: '/payments',       icon: '💳', label: t.payments      || 'Paiements'          },
          { path: '/billing-notes',  icon: '📝', label: t.billingNotes  || 'Notes honoraires'   },
          { path: '/billing/export', icon: '📊', label: t.billingExport || 'Export facturation' },
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
              item.disabled ? ' disabled' : '',
            ].join('')}
            onClick={() => !item.disabled && navigate(item.path)}
            title={item.disabled ? 'Bientôt disponible' : item.label}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.disabled && (
              <span style={{
                marginInlineStart: 'auto', fontSize: 9, fontWeight: 700,
                background: '#f1f5f9', color: '#94a3b8', padding: '2px 6px',
                borderRadius: 8, textTransform: 'uppercase', letterSpacing: '.5px',
              }}>
                Soon
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer utilisateur */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title={t.logout}>
          <UserAvatar name={currentUser?.nom || 'Admin'} role={role} />
          <div>
            <div className="sidebar-user-name">{currentUser?.nom || 'Administrateur'}</div>
            <div className="sidebar-user-role">{t.logout || 'Déconnexion'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}