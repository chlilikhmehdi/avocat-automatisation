const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/dbConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'Ddeim9090';

const sanitizeUser = (u) => {
  const { password_hash, ...safe } = u;
  return safe;
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    // ✅ Stocke le rôle en MAJUSCULES dans le token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role.toUpperCase(),   // ← normalisation ici
        organization_id: user.organization_id,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/**
 * POST /api/auth/logout — côté serveur symbolique (JWT est stateless)
 */
exports.logout = (req, res) => {
  return res.status(200).json({ success: true, message: 'Déconnexion enregistrée' });
};