// hooks/usePermissions.js
// ──────────────────────────────────────────────────────
// Hook réutilisable pour la vérification des permissions RBAC.
// Se base sur la configuration du sidebar et les rôles définis.
// Le rôle peut être injecté en param ou lu depuis le currentUser du contexte.
// ──────────────────────────────────────────────────────

import { useMemo } from 'react';

/**
 * Hook : usePermissions
 * 
 * @param {string} userRole - Le rôle de l'utilisateur courant, ex 'ADMIN'.
 * @returns {Object} - { hasAccess, filterByRole, isAdmin, isLawyer, isAssistant, isClient }
 */
function usePermissions(userRole) {
  const role = (userRole || '').toUpperCase();

  const hasAccess = useMemo(() => {
    return (allowedRoles = []) => {
      if (!role) return false;
      if (!Array.isArray(allowedRoles)) return false;
      return allowedRoles.includes(role);
    };
  }, [role]);

  // Raccourcis de confort
  const isAdmin = role === 'ADMIN';
  const isLawyer = role === 'LAWYER';
  const isAssistant = role === 'ASSISTANT';
  const isClient = role === 'CLIENT';

  return {
    hasAccess,
    isAdmin,
    isLawyer,
    isAssistant,
    isClient,

    /**
     * @param {Array} items - Liste de { roles: [...] }
     * @returns {Array} - Items filtrés selon le rôle
     */
    filterByRole: (items = []) =>
      items.filter((item) => {
        if (!item.roles) return true; // Pas de restriction = visible par tous
        return hasAccess(item.roles);
      }),
  };
}

export default usePermissions;
