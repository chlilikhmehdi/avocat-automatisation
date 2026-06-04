/**
 * controllers/automationController.js
 *
 * Endpoints :
 *   POST /api/automation/classify/:caseId        → classifier un dossier
 *   GET  /api/automation/classify/:caseId        → récupérer la classification existante
 *   POST /api/automation/classify/batch          → classifier plusieurs dossiers
 *   POST /api/automation/letter/:caseId          → générer une lettre juridique
 *   GET  /api/automation/letters/:caseId         → lister les lettres générées
 *   GET  /api/automation/suggestions/:caseId     → suggestions uniquement
 *   GET  /api/automation/dashboard               → vue globale automatisation
 */

const { pool }            = require('../db/dbConfig');
const { classify }        = require('../services/caseClassifier');
const { generateLetter, getAvailableLetters } = require('../services/letterGenerator');

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

// ── Helper : vérifier que le dossier appartient à l'avocat ────────────────────
async function ownedCase(caseId, lawyerId) {
  const { rows } = await pool.query(
    'SELECT * FROM cases WHERE id = $1 AND lawyer_id = $2 AND deleted_at IS NULL',
    [caseId, lawyerId]
  );
  return rows[0] || null;
}

// =============================================================================
// POST /api/automation/classify/:caseId
// Lance la classification automatique d'un dossier et sauvegarde en DB
// =============================================================================
exports.classifyCase = async (req, res) => {
  const { caseId } = req.params;
  const lawyerId   = req.user.id;

  const c = await ownedCase(caseId, lawyerId);
  if (!c) return ok(res, 404, {}, 'Dossier introuvable ou accès refusé');

  try {
    const result = await classify(parseInt(caseId));

    // Sauvegarder le résultat dans la table cases
    await pool.query(
      `UPDATE cases SET
         auto_type           = $1,
         auto_type_score     = $2,
         auto_classified_at  = NOW(),
         auto_suggestions    = $3,
         urgency_level       = $4
       WHERE id = $5`,
      [
        result.classification.type,
        result.classification.score,
        JSON.stringify(result.suggestions),
        result.urgency.level,
        caseId,
      ]
    );

    // Log dans l'historique du dossier
    await pool.query(
      `INSERT INTO case_history (case_id, action, created_by)
       VALUES ($1, $2, $3)`,
      [caseId, `Classification automatique : ${result.classification.label} (confiance ${result.classification.confidence}%)`, lawyerId]
    );

    return ok(res, 200, { data: result }, 'Classification terminée');
  } catch (err) {
    console.error('[automation/classify]', err);
    if (err.message === 'DOSSIER_INTROUVABLE') return ok(res, 404, {}, 'Dossier introuvable');
    return ok(res, 500, {}, 'Erreur lors de la classification');
  }
};

// =============================================================================
// GET /api/automation/classify/:caseId
// Récupère la classification sauvegardée en DB
// =============================================================================
exports.getClassification = async (req, res) => {
  const { caseId } = req.params;
  const lawyerId   = req.user.id;

  const c = await ownedCase(caseId, lawyerId);
  if (!c) return ok(res, 404, {}, 'Dossier introuvable');

  if (!c.auto_type) {
    return ok(res, 200, {
      data: null,
      message: 'Dossier non encore classifié — lancez POST /classify/:caseId',
    });
  }

  return ok(res, 200, {
    data: {
      type:            c.auto_type,
      score:           c.auto_type_score,
      urgency_level:   c.urgency_level,
      suggestions:     c.auto_suggestions,
      classified_at:   c.auto_classified_at,
      available_letters: getAvailableLetters(c.auto_type),
    },
  });
};

// =============================================================================
// POST /api/automation/classify/batch
// Body : { case_ids: [1, 2, 3] } — classifie plusieurs dossiers d'un coup
// =============================================================================
exports.batchClassify = async (req, res) => {
  const { case_ids } = req.body;
  const lawyerId     = req.user.id;

  if (!Array.isArray(case_ids) || case_ids.length === 0) {
    return ok(res, 400, {}, 'Fournir un tableau case_ids non vide');
  }
  if (case_ids.length > 20) {
    return ok(res, 400, {}, 'Maximum 20 dossiers par batch');
  }

  const results  = [];
  const errors   = [];

  for (const id of case_ids) {
    try {
      const c = await ownedCase(id, lawyerId);
      if (!c) { errors.push({ id, error: 'Accès refusé' }); continue; }

      const result = await classify(parseInt(id));

      await pool.query(
        `UPDATE cases SET
           auto_type = $1, auto_type_score = $2,
           auto_classified_at = NOW(), auto_suggestions = $3, urgency_level = $4
         WHERE id = $5`,
        [result.classification.type, result.classification.score,
         JSON.stringify(result.suggestions), result.urgency.level, id]
      );

      results.push({ id, type: result.classification.type, label: result.classification.label,
                     confidence: result.classification.confidence, urgency: result.urgency.level });
    } catch (err) {
      errors.push({ id, error: err.message });
    }
  }

  return ok(res, 200, { data: { results, errors, total: case_ids.length } },
    `${results.length}/${case_ids.length} dossier(s) classifié(s)`);
};

// =============================================================================
// POST /api/automation/letter/:caseId
// Body : { letter_type: "mise_en_demeure_impaye" }
// Génère une lettre et la sauvegarde dans generated_letters
// =============================================================================
exports.generateLetter = async (req, res) => {
  const { caseId }    = req.params;
  const { letter_type } = req.body;
  const lawyerId      = req.user.id;

  if (!letter_type) return ok(res, 400, {}, 'Paramètre letter_type requis');

  const c = await ownedCase(caseId, lawyerId);
  if (!c) return ok(res, 404, {}, 'Dossier introuvable');

  try {
    // Récupérer ou lancer la classification
    let classificationResult;
    if (c.auto_type) {
      // Classification déjà faite
      const fs_rows = await pool.query(
        `SELECT
           COALESCE(SUM(i.amount_due), 0)  AS total_due,
           COALESCE(SUM(p.amount), 0)      AS total_paid
         FROM invoices i
         LEFT JOIN payments p ON p.invoice_id = i.id
         WHERE i.case_id = $1`,
        [caseId]
      ).catch(() => ({ rows: [{ total_due: 0, total_paid: 0 }] }));

      const fs = fs_rows.rows[0];
      classificationResult = {
        case_id:     parseInt(caseId),
        client_name: c.client_name,
        classification: { type: c.auto_type, label: c.auto_type },
        financial_summary: {
          total_due:  parseFloat(fs.total_due),
          total_paid: parseFloat(fs.total_paid),
          balance:    parseFloat(fs.total_due) - parseFloat(fs.total_paid),
        },
      };
    } else {
      // Classifier d'abord
      classificationResult = await classify(parseInt(caseId));
    }

    // Récupérer les infos de l'avocat
    const lawyerRow = await pool.query(
      'SELECT u.*, o.name AS organization FROM users u LEFT JOIN organizations o ON o.id = u.organization_id WHERE u.id = $1',
      [lawyerId]
    );
    const lawyer = lawyerRow.rows[0] || {};

    // Générer la lettre
    const letter = generateLetter(letter_type, classificationResult, lawyer);

    // Sauvegarder en DB
    const { rows } = await pool.query(
      `INSERT INTO generated_letters (case_id, letter_type, content, generated_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [caseId, letter_type, letter.content, lawyerId]
    );

    return ok(res, 201, {
      data: {
        id:           rows[0].id,
        letter_type:  rows[0].letter_type,
        content:      letter.content,
        generated_at: rows[0].generated_at,
      },
    }, 'Lettre générée');

  } catch (err) {
    console.error('[automation/letter]', err);
    if (err.message?.startsWith('Type de lettre inconnu')) return ok(res, 400, {}, err.message);
    return ok(res, 500, {}, 'Erreur lors de la génération de la lettre');
  }
};

// =============================================================================
// GET /api/automation/letters/:caseId
// Liste les lettres déjà générées pour un dossier
// =============================================================================
exports.getLetters = async (req, res) => {
  const { caseId } = req.params;
  const lawyerId   = req.user.id;

  const c = await ownedCase(caseId, lawyerId);
  if (!c) return ok(res, 404, {}, 'Dossier introuvable');

  try {
    const { rows } = await pool.query(
      `SELECT id, letter_type, LEFT(content, 200) AS preview,
              generated_at, is_used
       FROM generated_letters
       WHERE case_id = $1
       ORDER BY generated_at DESC`,
      [caseId]
    );

    return ok(res, 200, {
      data: rows,
      available: getAvailableLetters(c.auto_type || 'autre'),
    });
  } catch (err) {
    console.error('[automation/letters]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// GET /api/automation/suggestions/:caseId
// Retourne uniquement les suggestions (sans relancer la classification)
// =============================================================================
exports.getSuggestions = async (req, res) => {
  const { caseId } = req.params;
  const lawyerId   = req.user.id;

  const c = await ownedCase(caseId, lawyerId);
  if (!c) return ok(res, 404, {}, 'Dossier introuvable');

  const suggestions = c.auto_suggestions || [];
  return ok(res, 200, {
    data: {
      suggestions,
      auto_type:      c.auto_type     || null,
      urgency_level:  c.urgency_level || 'NORMALE',
      classified_at:  c.auto_classified_at || null,
    },
  });
};

// =============================================================================
// GET /api/automation/dashboard
// Vue globale : stats de classification de tous les dossiers de l'avocat
// =============================================================================
exports.getDashboard = async (req, res) => {
  const lawyerId = req.user.id;
  const orgId    = req.user.organization_id;

  try {
    const [statsRow, urgentRow, unclassifiedRow, recentRow] = await Promise.all([

      // Stats par type
      pool.query(
        `SELECT
           auto_type,
           COUNT(*)::int   AS count,
           urgency_level
         FROM cases
         WHERE lawyer_id = $1 AND organization_id = $2
           AND deleted_at IS NULL AND auto_type IS NOT NULL
         GROUP BY auto_type, urgency_level`,
        [lawyerId, orgId]
      ),

      // Dossiers critiques
      pool.query(
        `SELECT id, title, client_name, auto_type, urgency_level, auto_classified_at
         FROM cases
         WHERE lawyer_id = $1 AND organization_id = $2
           AND deleted_at IS NULL AND urgency_level = 'CRITIQUE'
         ORDER BY auto_classified_at DESC LIMIT 5`,
        [lawyerId, orgId]
      ),

      // Dossiers non classifiés
      pool.query(
        `SELECT COUNT(*)::int AS count FROM cases
         WHERE lawyer_id = $1 AND organization_id = $2
           AND deleted_at IS NULL AND auto_type IS NULL`,
        [lawyerId, orgId]
      ),

      // Dernières lettres générées
      pool.query(
        `SELECT gl.id, gl.letter_type, gl.generated_at, c.title AS case_title, c.client_name
         FROM generated_letters gl
         JOIN cases c ON c.id = gl.case_id
         WHERE c.lawyer_id = $1
         ORDER BY gl.generated_at DESC LIMIT 5`,
        [lawyerId]
      ),
    ]);

    // Agréger les stats par type
    const byType = {};
    for (const row of statsRow.rows) {
      if (!byType[row.auto_type]) byType[row.auto_type] = { count: 0, critique: 0, haute: 0 };
      byType[row.auto_type].count += row.count;
      if (row.urgency_level === 'CRITIQUE') byType[row.auto_type].critique += row.count;
      if (row.urgency_level === 'HAUTE')    byType[row.auto_type].haute    += row.count;
    }

    return ok(res, 200, {
      data: {
        by_type:          byType,
        critical_cases:   urgentRow.rows,
        unclassified:     unclassifiedRow.rows[0]?.count || 0,
        recent_letters:   recentRow.rows,
      },
    });
  } catch (err) {
    console.error('[automation/dashboard]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};