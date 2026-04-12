const path = require('path');
const Joi  = require('joi');
const { pool } = require('../db/dbConfig');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

const CASE_TYPES    = ['civil', 'pénal', 'commercial', 'administratif', 'autre'];
const CASE_STATUSES = ['ouvert', 'en_cours', 'clôturé'];

// ─── Schémas Joi ──────────────────────────────────────────────────────────────

const createSchema = Joi.object({
  title:       Joi.string().min(3).max(200).required(),
  type:        Joi.string().valid(...CASE_TYPES).required(),
  client_name: Joi.string().min(2).max(150).required(),
  status:      Joi.string().valid(...CASE_STATUSES).default('ouvert'),
});

const updateSchema = Joi.object({
  title:       Joi.string().min(3).max(200).optional(),
  type:        Joi.string().valid(...CASE_TYPES).optional(),
  client_name: Joi.string().min(2).max(150).optional(),
  status:      Joi.string().valid(...CASE_STATUSES).optional(),
});

const historySchema = Joi.object({
  action: Joi.string().min(2).max(1000).required(),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/cases
 * Crée un nouveau dossier — LAWYER/ADMIN uniquement
 */
exports.createCase = async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) return ok(res, 400, {}, error.details[0].message);

  const lawyerId = req.user.id;
  const orgId    = req.user.organization_id;

  try {
    const { rows } = await pool.query(
      `INSERT INTO cases (title, type, status, client_name, lawyer_id, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [value.title, value.type, value.status || 'ouvert', value.client_name, lawyerId, orgId]
    );

    // Entrée automatique dans l'historique
    await pool.query(
      `INSERT INTO case_history (case_id, action, created_by) VALUES ($1, $2, $3)`,
      [rows[0].id, 'Dossier créé', lawyerId]
    );

    return ok(res, 201, { data: rows[0] }, 'Dossier créé');
  } catch (err) {
    console.error('[cases/create]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * GET /api/cases/:lawyer_id
 * Liste les dossiers d'un avocat (filtres + pagination)
 */
exports.getCasesByLawyer = async (req, res) => {
  const { lawyer_id } = req.params;
  const { status, search, page = 1, limit = 20 } = req.query;
  const orgId  = req.user.organization_id;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Un LAWYER ne peut voir que ses propres dossiers
  if (req.user.role === 'LAWYER' && parseInt(lawyer_id) !== req.user.id) {
    return ok(res, 403, {}, 'Accès refusé');
  }

  let conditions = ['c.lawyer_id = $1', 'c.organization_id = $2', 'c.deleted_at IS NULL'];
  let params     = [parseInt(lawyer_id), orgId];
  let idx        = 3;

  if (status && CASE_STATUSES.includes(status)) {
    conditions.push(`c.status = $${idx++}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`(c.title ILIKE $${idx} OR c.client_name ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM cases c WHERE ${where}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT c.*,
              u.nom AS lawyer_name,
              COUNT(cf.id)::int AS file_count,
              COUNT(ch.id)::int AS history_count
       FROM cases c
       LEFT JOIN users u ON u.id = c.lawyer_id
       LEFT JOIN case_files cf ON cf.case_id = c.id
       LEFT JOIN case_history ch ON ch.case_id = c.id
       WHERE ${where}
       GROUP BY c.id, u.nom
       ORDER BY c.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    return ok(res, 200, {
      data: rows,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[cases/list]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * GET /api/case/:id
 * Détail complet d'un dossier (avec historique + fichiers)
 */
exports.getCaseById = async (req, res) => {
  const { id } = req.params;
  const orgId  = req.user.organization_id;

  try {
    const caseRes = await pool.query(
      `SELECT c.*, u.nom AS lawyer_name
       FROM cases c
       LEFT JOIN users u ON u.id = c.lawyer_id
       WHERE c.id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL`,
      [id, orgId]
    );

    if (!caseRes.rows[0]) return ok(res, 404, {}, 'Dossier introuvable');

    // Contrôle d'accès LAWYER : ne voit que ses dossiers
    if (req.user.role === 'LAWYER' && caseRes.rows[0].lawyer_id !== req.user.id) {
      return ok(res, 403, {}, 'Accès refusé');
    }

    const historyRes = await pool.query(
      `SELECT ch.*, u.nom AS author
       FROM case_history ch
       LEFT JOIN users u ON u.id = ch.created_by
       WHERE ch.case_id = $1
       ORDER BY ch.created_at DESC`,
      [id]
    );

    const filesRes = await pool.query(
      `SELECT cf.*, u.nom AS uploader
       FROM case_files cf
       LEFT JOIN users u ON u.id = cf.uploaded_by
       WHERE cf.case_id = $1
       ORDER BY cf.uploaded_at DESC`,
      [id]
    );

    return ok(res, 200, {
      data: {
        ...caseRes.rows[0],
        history: historyRes.rows,
        files:   filesRes.rows,
      },
    });
  } catch (err) {
    console.error('[cases/get]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * PUT /api/case/:id
 * Met à jour un dossier (LAWYER propriétaire ou ADMIN)
 */
exports.updateCase = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) return ok(res, 400, {}, error.details[0].message);

  const { id } = req.params;
  const orgId  = req.user.organization_id;

  try {
    const existing = await pool.query(
      'SELECT * FROM cases WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );
    if (!existing.rows[0]) return ok(res, 404, {}, 'Dossier introuvable');

    if (req.user.role === 'LAWYER' && existing.rows[0].lawyer_id !== req.user.id) {
      return ok(res, 403, {}, 'Accès refusé');
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (value.title)       { fields.push(`title = $${idx++}`);       params.push(value.title); }
    if (value.type)        { fields.push(`type = $${idx++}`);        params.push(value.type); }
    if (value.client_name) { fields.push(`client_name = $${idx++}`); params.push(value.client_name); }
    if (value.status) {
      fields.push(`status = $${idx++}`);
      params.push(value.status);
    }

    if (!fields.length) return ok(res, 400, {}, 'Aucun champ à modifier');

    fields.push(`updated_at = NOW()`);
    params.push(id, orgId);

    const { rows } = await pool.query(
      `UPDATE cases SET ${fields.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
      params
    );

    // Log dans l'historique
    await pool.query(
      `INSERT INTO case_history (case_id, action, created_by) VALUES ($1, $2, $3)`,
      [id, `Dossier mis à jour : ${Object.keys(value).join(', ')}`, req.user.id]
    );

    return ok(res, 200, { data: rows[0] }, 'Dossier mis à jour');
  } catch (err) {
    console.error('[cases/update]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * DELETE /api/case/:id — soft delete
 */
exports.deleteCase = async (req, res) => {
  const { id } = req.params;
  const orgId  = req.user.organization_id;

  try {
    const existing = await pool.query(
      'SELECT * FROM cases WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );
    if (!existing.rows[0]) return ok(res, 404, {}, 'Dossier introuvable');

    if (req.user.role === 'LAWYER' && existing.rows[0].lawyer_id !== req.user.id) {
      return ok(res, 403, {}, 'Accès refusé');
    }

    await pool.query(
      'UPDATE cases SET deleted_at = NOW() WHERE id = $1', [id]
    );
    return ok(res, 200, {}, 'Dossier supprimé');
  } catch (err) {
    console.error('[cases/delete]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * POST /api/case/:id/history
 * Ajoute une entrée dans la timeline du dossier
 */
exports.addHistory = async (req, res) => {
  const { error, value } = historySchema.validate(req.body);
  if (error) return ok(res, 400, {}, error.details[0].message);

  const { id } = req.params;
  const orgId  = req.user.organization_id;

  try {
    const existing = await pool.query(
      'SELECT * FROM cases WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );
    if (!existing.rows[0]) return ok(res, 404, {}, 'Dossier introuvable');

    if (req.user.role === 'LAWYER' && existing.rows[0].lawyer_id !== req.user.id) {
      return ok(res, 403, {}, 'Accès refusé');
    }

    const { rows } = await pool.query(
      `INSERT INTO case_history (case_id, action, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, value.action, req.user.id]
    );
    return ok(res, 201, { data: rows[0] }, 'Entrée ajoutée');
  } catch (err) {
    console.error('[cases/history]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * POST /api/case/:id/upload
 * Upload d'un fichier (traité par multer en amont)
 */
exports.uploadFile = async (req, res) => {
  if (!req.file) return ok(res, 400, {}, 'Aucun fichier reçu');

  const { id } = req.params;
  const orgId  = req.user.organization_id;

  try {
    const existing = await pool.query(
      'SELECT * FROM cases WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );
    if (!existing.rows[0]) return ok(res, 404, {}, 'Dossier introuvable');

    if (req.user.role === 'LAWYER' && existing.rows[0].lawyer_id !== req.user.id) {
      return ok(res, 403, {}, 'Accès refusé');
    }

    const { rows } = await pool.query(
      `INSERT INTO case_files (case_id, filename, original_name, mimetype, size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id]
    );

    // Log historique
    await pool.query(
      `INSERT INTO case_history (case_id, action, created_by) VALUES ($1, $2, $3)`,
      [id, `Fichier ajouté : ${req.file.originalname}`, req.user.id]
    );

    return ok(res, 201, { data: rows[0] }, 'Fichier uploadé');
  } catch (err) {
    console.error('[cases/upload]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};