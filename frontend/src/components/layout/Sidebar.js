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
    ...(role === 'ADMIN'
      ? [{ path: '/users', icon: '👥', label: t.users || 'Utilisateurs' }]
      : []),
    ...(['ADMIN', 'LAWYER', 'ASSISTANT'].includes(role)
      ? [{ path: '/cases', icon: '📁', label: t.cases || 'Dossiers' }]
      : []),
    { path: '/audiences', icon: '📅', label: t.audiences || 'Audiences', disabled: true },
    ...(['ADMIN', 'LAWYER', 'ASSISTANT'].includes(role)
      ? [{ path: '/documents', icon: '📄', label: t.documents || 'Documents' }]
      : []),
  ];

  return (
    <div className="sidebar" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-dot" />
        MiZan
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
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