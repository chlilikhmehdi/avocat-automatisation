/**
 * middleware/requireRole.js
 * Guard additionnel à brancher APRÈS authenticate.
 * Accepte 'AVOCAT' comme alias de 'LAWYER' (robustesse i18n).
 */
const requireRole = (...roles) => (req, res, next) => {
    const allowed  = roles.map(r => r.toUpperCase());
    const userRole = (req.user?.role || '').toUpperCase();
  
    // Alias : AVOCAT === LAWYER
    const normalized = userRole === 'AVOCAT' ? 'LAWYER' : userRole;
  
    if (!allowed.includes(normalized)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé — rôle requis : ${roles.join(' ou ')} (actuel : ${req.user?.role})`,
      });
    }
    next();
  };
  
  module.exports = { requireRole };
  