const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Ddeim9090';

/**
 * authenticate — vérifie le token JWT et attache req.user
 * CORRECTION : normalise le rôle en MAJUSCULES pour éviter
 * le bug "admin" (DB) vs "ADMIN" (authorize)
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ FIX : normalisation du rôle — protège contre les données
    //    en DB stockées en minuscules (admin, lawyer…)
    req.user = {
      ...decoded,
      role: (decoded.role || '').toUpperCase(),
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

/**
 * authorize(...roles) — vérifie que req.user.role est dans la liste
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  // Normalise aussi les rôles attendus (sécurité défensive)
  const normalized = allowedRoles.map(r => r.toUpperCase());
  if (!normalized.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé – rôle insuffisant (${req.user.role})`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };