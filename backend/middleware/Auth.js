const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Ddeim9090';

const authenticate = (req, res, next) => {
  // ✅ Cherche le token dans le header OU dans ?token= (pour les exports window.open)
  let token = null;

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      ...decoded,
      role: (decoded.role || '').toUpperCase(),
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
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