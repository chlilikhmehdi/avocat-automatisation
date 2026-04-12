const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { pool } = require('../db/dbConfig');

const ROLES = ['ADMIN', 'LAWYER', 'ASSISTANT', 'CLIENT'];

// ─── Validation schemas ──────────────────────────────────────────────────────

const createSchema = Joi.object({
  nom: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  telephone: Joi.string().pattern(/^[\d\s\+\-\(\)]{8,20}$/).optional().allow('', null),
  role: Joi.string().valid(...ROLES).required(),
  password: Joi.string().min(8).required(),
  organization_id: Joi.number().integer().positive().required(),
});

const updateSchema = Joi.object({
  nom: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  telephone: Joi.string().pattern(/^[\d\s\+\-\(\)]{8,20}$/).optional().allow('', null),
  role: Joi.string().valid(...ROLES).optional(),
  password: Joi.string().min(8).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sanitizeUser = (u) => {
  const { password_hash, ...safe } = u;
  return safe;
};

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/users  — liste paginée + filtres
 */
exports.listUsers = async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const orgId = req.user.organization_id;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let conditions = ['u.organization_id = $1', 'u.deleted_at IS NULL'];
  let params = [orgId];
  let idx = 2;

  if (role && ROLES.includes(role.toUpperCase())) {
    conditions.push(`u.role = $${idx++}`);
    params.push(role.toUpperCase());
  }
  if (search) {
    conditions.push(`(u.nom ILIKE $${idx} OR u.email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM users u WHERE ${where}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT u.id, u.nom, u.email, u.telephone, u.role,
              u.organization_id, u.created_at, u.updated_at,
              o.name AS organization_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    return ok(res, 200, {
      data: rows.map(sanitizeUser),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[users/list]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * GET /api/users/me — profil du connecté
 */
exports.getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, o.name AS organization_name
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.user.id]
    );
    if (!rows[0]) return ok(res, 404, {}, 'Utilisateur introuvable');
    return ok(res, 200, { data: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error('[users/me]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * GET /api/users/:id
 */
exports.getUser = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organization_id;

  try {
    const { rows } = await pool.query(
      `SELECT u.*, o.name AS organization_name
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1 AND u.organization_id = $2 AND u.deleted_at IS NULL`,
      [id, orgId]
    );
    if (!rows[0]) return ok(res, 404, {}, 'Utilisateur introuvable');
    return ok(res, 200, { data: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error('[users/get]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * POST /api/users — créer (ADMIN)
 */
exports.createUser = async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) return ok(res, 400, {}, error.details[0].message);

  // Multi-tenant : forcer l'org de l'admin
  value.organization_id = req.user.organization_id;
  // Normaliser le rôle
  value.role = value.role.toUpperCase();

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [value.email.toLowerCase()]
    );
    if (exists.rows.length) return ok(res, 409, {}, 'Email déjà utilisé');

    const hash = await bcrypt.hash(value.password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (nom, email, telephone, role, organization_id, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        value.nom,
        value.email.toLowerCase(),
        value.telephone || null,
        value.role,
        value.organization_id,
        hash,
      ]
    );

    return ok(res, 201, { data: sanitizeUser(rows[0]) }, 'Utilisateur créé');
  } catch (err) {
    console.error('[users/create]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * PUT /api/users/:id — modifier (ADMIN)
 */
exports.updateUser = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) return ok(res, 400, {}, error.details[0].message);

  const { id } = req.params;
  const orgId = req.user.organization_id;

  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );
    if (!existing.rows[0]) return ok(res, 404, {}, 'Utilisateur introuvable');

    const fields = [];
    const params = [];
    let idx = 1;

    if (value.nom)                   { fields.push(`nom = $${idx++}`);           params.push(value.nom); }
    if (value.email)                  { fields.push(`email = $${idx++}`);         params.push(value.email.toLowerCase()); }
    if (value.telephone !== undefined){ fields.push(`telephone = $${idx++}`);     params.push(value.telephone || null); }
    if (value.role)                   { fields.push(`role = $${idx++}`);          params.push(value.role.toUpperCase()); }
    if (value.password) {
      const hash = await bcrypt.hash(value.password, 12);
      fields.push(`password_hash = $${idx++}`);
      params.push(hash);
    }

    if (!fields.length) return ok(res, 400, {}, 'Aucun champ à modifier');

    fields.push(`updated_at = NOW()`);
    params.push(id, orgId);

    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
      params
    );

    return ok(res, 200, { data: sanitizeUser(rows[0]) }, 'Utilisateur mis à jour');
  } catch (err) {
    console.error('[users/update]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * DELETE /api/users/:id — soft delete (ADMIN)
 */
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organization_id;

  if (parseInt(id) === req.user.id) {
    return ok(res, 400, {}, 'Impossible de supprimer votre propre compte');
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE users SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, orgId]
    );
    if (!rowCount) return ok(res, 404, {}, 'Utilisateur introuvable');
    return ok(res, 200, {}, 'Utilisateur supprimé');
  } catch (err) {
    console.error('[users/delete]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};