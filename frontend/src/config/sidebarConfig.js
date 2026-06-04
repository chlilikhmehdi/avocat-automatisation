// constants/sidebarConfig.js
// ───────────────────────────────────────────────
// Configuration centralisée et scalable du Sidebar.
// Chaque item contient un champ `roles` qui détermine quels utilisateurs
// ont le droit de voir cet item dans le menu.
// ───────────────────────────────────────────────

/**
 * @typedef {Object} SidebarType
 * @property {'group'|'item'|'separator'} type - Type d'affichage
 * @property {string} [label] - Label de l'item (utilise t[key] ou fallback)
 * @property {string} [labelKey] - Clé de traduction dans le contexte LangContext
 * @property {string} [icon] - Emoji ou icône affichée
 * @property {string} [path] - Route correspondante (ex: '/cases')
 * @property {string[]} [roles] - Rôles autorisés : ['ADMIN', 'LAWYER', 'ASSISTANT', 'CLIENT']
 * @property {boolean} [disabled] - Item grisé (bientôt disponible)
 * @property {string[]} [activePaths] - Routes à matcher pour l'état actif (isActive)
 * @property {number} [order] - Ordre d'affichage
 */

export const SIDEBAR_CONFIG = {
  // ── Apps dispos
  apps: [
    // ── Client ──
    {
      type: 'item',
      labelKey: 'cases',
      fallback: 'Mon Espace',
      icon: '🏠',
      path: '/client',
      roles: ['CLIENT'],
      order: 1,
    },

    // ── Admin ──
    {
      type: 'item',
      labelKey: 'users',
      fallback: 'Utilisateurs',
      icon: '👥',
      path: '/users',
      roles: ['ADMIN'],
      order: 10,
    },

    // ── Core (Admin, Avocat, Assistant) ──
    {
      type: 'item',
      labelKey: 'cases',
      fallback: 'Mes dossiers',
      icon: '🗂️',
      path: '/cases',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      order: 20,
    },
    {
      type: 'item',
      labelKey: 'calendar',
      fallback: 'Calendrier',
      icon: '📅',
      path: '/calendar',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      order: 21,
    },
    {
      type: 'item',
      labelKey: 'hearings',
      fallback: 'Déliberations',
      icon: '⚖️',
      path: '/hearings',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      activePaths: ['/hearings', '/calendar', '/legal-deadlines'],
      order: 22,
    },
    {
      type: 'item',
      labelKey: 'legalDeadlines',
      fallback: 'Échéances légales',
      icon: '⏳',
      path: '/legal-deadlines',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      order: 23,
    },
    {
      type: 'item',
      labelKey: 'generator',
      fallback: 'Générateur',
      icon: '🤖',
      path: '/generator',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      disabled: true,
      order: 24,
    },
    {
      type: 'item',
      labelKey: 'ocr',
      fallback: 'OCR & Analyse',
      icon: '📄',
      path: '/ocr',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      disabled: true,
      order: 25,
    },
    {
      type: 'item',
      labelKey: 'documentAI',
      fallback: 'IA Documentaire',
      icon: '🤖',
      path: '/documents',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      order: 26,
    },

    // ── Facturation ──
    {
      type: 'group',
      labelKey: 'billing',
      fallback: 'Paiements',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      children: [
        {
          type: 'item',
          labelKey: 'invoices',
          fallback: 'Factures',
          icon: '📇',
          path: '/invoices',
          roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
          activePaths: ['/invoices', '/billing', '/billing-notes', '/payments', '/billing/export'],
          order: 30,
        },
        {
          type: 'item',
          labelKey: 'payments',
          fallback: 'Encaissements',
          icon: '💳',
          path: '/payments',
          roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
          order: 31,
        },
        {
          type: 'item',
          labelKey: 'billingNotes',
          fallback: 'Notes de frais',
          icon: '📝',
          path: '/billing-notes',
          roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
          order: 32,
        },
        {
          type: 'item',
          labelKey: 'billingExport',
          fallback: 'Export',
          icon: '📊',
          path: '/billing/export',
          roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
          order: 33,
        },
      ],
      order: 29,
    },

    // ── Données ──
    {
      type: 'item',
      labelKey: 'import',
      fallback: 'Import',
      icon: '📥',
      path: '/import',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      order: 40,
    },
    {
      type: 'item',
      labelKey: 'export',
      fallback: 'Export',
      icon: '📤',
      path: '/export',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      order: 41,
    },

    // ── Automation ──
    {
      type: 'item',
      labelKey: 'automation',
      fallback: 'Automatisation des dossiers',
      icon: '⚙️',
      path: '/avocat/automatisation',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      disabled: true,
      order: 50,
    },

    // ── LMD ──
    {
      type: 'item',
      labelKey: 'lmd',
      fallback: 'LMD - Mise en demeure',
      icon: '📜',
      path: '/lmd',
      roles: ['ADMIN', 'LAWYER', 'ASSISTANT'],
      disabled: true,
      order: 60,
    },
  ],
};
