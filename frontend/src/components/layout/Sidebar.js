// components/layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import { UserAvatar } from '../ui';

const NAV_SECTIONS = {
  ADMIN: [
    {
      label: 'Administration',
      items: [
        { path: '/users', icon: '👥', key: 'users', fallback: 'Utilisateurs' },
      ],
    },
    {
      label: 'Gestion',
      items: [
        { path: '/cases',           icon: '📁', key: 'cases',          fallback: 'Dossiers'         },
        { path: '/calendar',        icon: '🗓️', key: 'calendar',       fallback: 'Calendrier'       },
        { path: '/hearings',        icon: '⚖️', key: 'hearings',       fallback: 'Audiences'        },
        { path: '/legal-deadlines', icon: '⏳', key: 'legalDeadlines', fallback: 'Délais légaux'    },
        { path: '/generator',       icon: '✍️', key: 'generator',      fallback: 'Générateur actes' },
        { path: '/ocr',             icon: '🔍', key: 'ocr',            fallback: 'OCR & Analyse'    },
        { path: '/documents',       icon: '🧠', key: 'documents',      fallback: 'Document IA'      },
        { path: '/statistics',      icon: '📈', key: 'statistics',     fallback: 'Statistiques'     },
      ],
    },
    {
      label: 'Facturation',
      items: [
        { path: '/invoices',              icon: '🧾', key: 'invoices',      fallback: 'Factures'           },
        { path: '/payments',              icon: '💳', key: 'payments',      fallback: 'Paiements'          },
        { path: '/billing-notes',         icon: '📝', key: 'billingNotes',  fallback: 'Notes honoraires'   },
        { path: '/billing/export',        icon: '📊', key: 'billingExport', fallback: 'Export facturation' },
        { path: '/import',                icon: '📥', key: 'import',        fallback: 'Import données'     },
        { path: '/export',                icon: '📤', key: 'export',        fallback: 'Export données'     },
        { path: '/avocat/automatisation', icon: '🤖', key: 'automation',    fallback: 'Automatisation'     },
        { path: '/lmd-rm',                icon: '🧾', key: 'lmdRm',         fallback: 'LMD'                },
      ],
    },
  ],

  LAWYER: [
    {
      label: 'Gestion',
      items: [
        { path: '/cases',           icon: '📁', key: 'cases',          fallback: 'Dossiers'         },
        { path: '/calendar',        icon: '🗓️', key: 'calendar',       fallback: 'Calendrier'       },
        { path: '/hearings',        icon: '⚖️', key: 'hearings',       fallback: 'Audiences'        },
        { path: '/legal-deadlines', icon: '⏳', key: 'legalDeadlines', fallback: 'Délais légaux'    },
        { path: '/generator',       icon: '✍️', key: 'generator',      fallback: 'Générateur actes' },
        { path: '/ocr',             icon: '🔍', key: 'ocr',            fallback: 'OCR & Analyse'    },
        { path: '/documents',       icon: '🧠', key: 'documents',      fallback: 'Document IA'      },
        { path: '/lmd-rm',          icon: '🧾', key: 'lmdRm',          fallback: 'LMD'              },
        { path: '/statistics',      icon: '📈', key: 'statistics',     fallback: 'Statistiques'     },
      ],
    },
    {
      label: 'Facturation',
      items: [
        { path: '/invoices',              icon: '🧾', key: 'invoices',      fallback: 'Factures'           },
        { path: '/payments',              icon: '💳', key: 'payments',      fallback: 'Paiements'          },
        { path: '/billing-notes',         icon: '📝', key: 'billingNotes',  fallback: 'Notes honoraires'   },
        { path: '/billing/export',        icon: '📊', key: 'billingExport', fallback: 'Export facturation' },
        { path: '/import',                icon: '📥', key: 'import',        fallback: 'Import données'     },
        { path: '/export',                icon: '📤', key: 'export',        fallback: 'Export données'     },
        { path: '/avocat/automatisation', icon: '🤖', key: 'automation',    fallback: 'Automatisation'     },
      ],
    },
  ],

  ASSISTANT: [
    {
      label: 'Gestion',
      items: [
        { path: '/cases',           icon: '📁', key: 'cases',          fallback: 'Dossiers'         },
        { path: '/calendar',        icon: '🗓️', key: 'calendar',       fallback: 'Calendrier'       },
        { path: '/hearings',        icon: '⚖️', key: 'hearings',       fallback: 'Audiences'        },
        { path: '/legal-deadlines', icon: '⏳', key: 'legalDeadlines', fallback: 'Délais légaux'    },
        { path: '/generator',       icon: '✍️', key: 'generator',      fallback: 'Générateur actes' },
        { path: '/ocr',             icon: '🔍', key: 'ocr',            fallback: 'OCR & Analyse'    },
        { path: '/documents',       icon: '🧠', key: 'documents',      fallback: 'Document IA'      },
        { path: '/lmd-rm',          icon: '🧾', key: 'lmdRm',          fallback: 'LMD'              },
      ],
    },
    {
      label: 'Facturation',
      items: [
        { path: '/invoices',      icon: '🧾', key: 'invoices',     fallback: 'Factures'         },
        { path: '/payments',      icon: '💳', key: 'payments',     fallback: 'Paiements'        },
        { path: '/billing-notes', icon: '📝', key: 'billingNotes', fallback: 'Notes honoraires' },
      ],
    },
  ],

  CLIENT: [
    {
      label: 'Mon Espace',
      items: [
        { path: '/client',           icon: '🏠', key: 'clientHome',      fallback: 'Tableau de bord' },
        { path: '/client/cases',     icon: '📁', key: 'clientCases',     fallback: 'Mes dossiers'    },
        { path: '/client/documents', icon: '📄', key: 'clientDocuments', fallback: 'Mes documents'   },
        { path: '/client/invoices',  icon: '🧾', key: 'clientInvoices',  fallback: 'Mes factures'    },
        { path: '/client/messages',  icon: '💬', key: 'clientMessages',  fallback: 'Mes messages'    },
      ],
    },
  ],
};

const ACTIVE_ALIASES = {
  '/hearings': ['/hearings', '/calendar', '/legal-deadlines'],
  '/invoices': ['/invoices', '/billing-notes', '/payments', '/billing'],
};

const AR_LABELS = {
  generator:       'منشئ الوثائق',
  ocr:             'استخراج النصوص (OCR)',
  documents:       'تحليل المستندات IA',
  import:          'استيراد البيانات',
  export:          'تصدير البيانات',
  lmdRm:           'إشعار الإنذار',
  statistics:      'الإحصائيات',
  clientHome:      'لوحة القيادة',
  clientCases:     'ملفاتي',
  clientDocuments: 'وثائقي',
  clientInvoices:  'فواتيري',
  clientMessages:  'رسائلي',
};

export default function Sidebar({ onLogout }) {
  const { lang, t } = useLang();
  const navigate    = useNavigate();
  const location    = useLocation();

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('mizan_user') || '{}'); }
    catch { return {}; }
  })();

  const role     = storedUser.role || 'CLIENT';
  const sections = NAV_SECTIONS[role] ?? NAV_SECTIONS.CLIENT;

  const isActive = (path) => {
    const aliases = ACTIVE_ALIASES[path];
    if (aliases) return aliases.some((a) => location.pathname.startsWith(a));
    if (path === '/client') return location.pathname === '/client';
    return location.pathname.startsWith(path);
  };

  const getLabel = (item) => {
    if (t[item.key]) return t[item.key];
    if (lang === 'ar' && AR_LABELS[item.key]) return AR_LABELS[item.key];
    return item.fallback;
  };

  return (
    <div className="sidebar" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-dot" />
        MiZan
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <div
                key={item.path}
                className={`sidebar-item${isActive(item.path) ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span>{item.icon}</span>
                <span>{getLabel(item)}</span>
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title={t.logout || 'Déconnexion'}>
          <UserAvatar name={storedUser.nom || 'Utilisateur'} role={role} />
          <div>
            <div className="sidebar-user-name">{storedUser.nom || 'Utilisateur'}</div>
            <div className="sidebar-user-role">{t.logout || 'Déconnexion'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}