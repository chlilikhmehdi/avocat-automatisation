// controllers/casesList.controller.js
const { pool } = require('../db/dbConfig');

/**
 * GET /api/cases-list
 * Retourne la liste des dossiers du lawyer connecté (pour les selects/formulaires)
 */
exports.getCasesList = async (req, res) => {
  const lawyerId = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, title, status, type, client_name
       FROM cases
       WHERE lawyer_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [lawyerId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('[casesList]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};