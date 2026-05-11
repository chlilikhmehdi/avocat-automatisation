// controllers/client.controller.js
const { pool } = require('../db/dbConfig');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients
// Liste tous les clients de l'organisation de l'avocat
// ─────────────────────────────────────────────────────────────────────────────
exports.listClients = async (req, res) => {
  const { id: lawyerId, organization_id: orgId } = req.user;

  try {
    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.nom,
         u.email,
         u.telephone,
         u.created_at,
         COUNT(DISTINCT c.id)::int  AS total_cases,
         COUNT(DISTINCT cf.id)::int AS total_files
       FROM users u
       LEFT JOIN cases c  ON c.client_id = u.id
                         AND c.lawyer_id = $1
                         AND c.organization_id = $2
                         AND c.deleted_at IS NULL
       LEFT JOIN case_files cf ON cf.case_id = c.id
       WHERE u.role = 'CLIENT'
         AND u.organization_id = $2
       GROUP BY u.id
       ORDER BY u.nom`,
      [lawyerId, orgId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[clients/list]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/full-details
// Profil complet : client + dossiers + fichiers + historique
// ─────────────────────────────────────────────────────────────────────────────
exports.getClientFullDetails = async (req, res) => {
  const { id: lawyerId, organization_id: orgId } = req.user;
  const clientId = parseInt(req.params.id);

  if (isNaN(clientId)) {
    return res.status(400).json({ success: false, message: 'ID client invalide.' });
  }

  try {
    // ── 1. Client ────────────────────────────────────────────────────────────
    const clientRes = await pool.query(
      `SELECT id, nom, email, telephone, created_at
       FROM users
       WHERE id = $1 AND role = 'CLIENT' AND organization_id = $2`,
      [clientId, orgId]
    );

    if (!clientRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    const client = clientRes.rows[0];

    // ── 2. Dossiers ──────────────────────────────────────────────────────────
    const casesRes = await pool.query(
      `SELECT
         c.id,
         c.title,
         c.type,
         c.status,
         c.client_name,
         c.created_at,
         c.updated_at,
         COUNT(DISTINCT cf.id)::int  AS file_count,
         COUNT(DISTINCT ch.id)::int  AS history_count
       FROM cases c
       LEFT JOIN case_files   cf ON cf.case_id = c.id
       LEFT JOIN case_history ch ON ch.case_id = c.id
       WHERE c.client_id = $1
         AND c.lawyer_id = $2
         AND c.organization_id = $3
         AND c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [clientId, lawyerId, orgId]
    );

    const cases    = casesRes.rows;
    const caseIds  = cases.map(c => c.id);

    // Si aucun dossier → retourner tôt avec tableaux vides
    if (caseIds.length === 0) {
      return res.json({
        success: true,
        data: { client, cases: [], files: [], history: [] },
      });
    }

    // ── 3. Fichiers (tous les dossiers du client) ─────────────────────────
    const filesRes = await pool.query(
      `SELECT
         cf.id,
         cf.case_id,
         c.title                                          AS case_title,
         COALESCE(cf.display_name, cf.original_name)     AS name,
         cf.original_name,
         cf.category,
         cf.mimetype,
         cf.size,
         cf.uploaded_at,
         cf.ai_summary,
         cf.doc_type,
         cf.processed_at,
         u.nom                                           AS uploaded_by_name
       FROM case_files cf
       JOIN cases c ON c.id = cf.case_id
       LEFT JOIN users u ON u.id = cf.uploaded_by
       WHERE cf.case_id = ANY($1::int[])
       ORDER BY cf.uploaded_at DESC`,
      [caseIds]
    );

    // ── 4. Historique ─────────────────────────────────────────────────────
    const historyRes = await pool.query(
      `SELECT
         ch.id,
         ch.case_id,
         c.title  AS case_title,
         ch.action,
         ch.created_at,
         u.nom    AS created_by_name
       FROM case_history ch
       JOIN cases c ON c.id = ch.case_id
       LEFT JOIN users u ON u.id = ch.created_by
       WHERE ch.case_id = ANY($1::int[])
       ORDER BY ch.created_at DESC
       LIMIT 100`,
      [caseIds]
    );

    return res.json({
      success: true,
      data: {
        client,
        cases:   cases,
        files:   filesRes.rows,
        history: historyRes.rows,
      },
    });

  } catch (err) {
    console.error('[clients/full-details]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/clients/:id/link-case
// Lier un dossier existant à un client
// ─────────────────────────────────────────────────────────────────────────────
exports.linkCaseToClient = async (req, res) => {
  const { id: lawyerId, organization_id: orgId } = req.user;
  const clientId = parseInt(req.params.id);
  const { case_id } = req.body;

  if (!case_id) {
    return res.status(400).json({ success: false, message: 'case_id requis.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE cases SET client_id = $1
       WHERE id = $2 AND lawyer_id = $3 AND organization_id = $4
       RETURNING id, title`,
      [clientId, case_id, lawyerId, orgId]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    return res.json({ success: true, data: rows[0], message: 'Dossier lié au client.' });
  } catch (err) {
    console.error('[clients/link-case]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};