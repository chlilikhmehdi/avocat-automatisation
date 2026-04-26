/**
 * routes/documentRoutes.js
 *
 * Monté dans index.js :  app.use('/api/documents', require('./routes/documentRoutes'))
 *
 * Toutes les routes sont protégées JWT + rôle LAWYER ou ADMIN.
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const router = express.Router();

const { authenticate }    = require('../middleware/Auth');
const { requireRole }     = require('../middleware/requireRole');
const documentController  = require('../controllers/documentController');
const { pool }            = require('../db/dbConfig');

// ── Guard réutilisable ────────────────────────────────────────────────────────
const guard = [authenticate, requireRole('LAWYER', 'ADMIN')];

// ── Multer : stockage des fichiers uploadés ───────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },  // 20 Mo
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|txt|md)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  },
});

// =============================================================================
// ROUTES
// =============================================================================

// ── Lecture ───────────────────────────────────────────────────────────────────

// GET /api/documents — liste paginée (filtres : case_id, search, category)
router.get('/',       ...guard, documentController.listDocuments);

// GET /api/documents/stats — stats agrégées
router.get('/stats',  ...guard, documentController.getStats);

// ── Upload ────────────────────────────────────────────────────────────────────

// POST /api/documents/upload?case_id=X
router.post('/upload', ...guard, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
  }

  const { case_id, category = 'autre' } = req.query;
  if (!case_id) {
    return res.status(400).json({ success: false, message: 'Paramètre case_id requis' });
  }

  const lawyerId = req.user.id;
  const orgId    = req.user.organization_id;

  try {
    // Vérifier que le dossier appartient bien à cet avocat
    const caseCheck = await pool.query(
      `SELECT id FROM cases
       WHERE id = $1 AND lawyer_id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [case_id, lawyerId, orgId]
    );

    if (!caseCheck.rows[0]) {
      return res.status(403).json({
        success: false,
        message: 'Dossier introuvable ou accès refusé',
      });
    }

    const validCategory = ['contrat','piece_justificative','jugement','pv','cin','courrier','autre']
      .includes(category) ? category : 'autre';

    const { rows } = await pool.query(
      `INSERT INTO case_files
         (case_id, filename, original_name, display_name, mimetype, size, category, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        case_id,
        req.file.filename,
        req.file.originalname,
        req.file.originalname,   // display_name initialisé = nom original
        req.file.mimetype,
        req.file.size,
        validCategory,
        lawyerId,
      ]
    );

    // Log dans l'historique du dossier
    await pool.query(
      `INSERT INTO case_history (case_id, action, created_by) VALUES ($1, $2, $3)`,
      [case_id, `Document ajouté : ${req.file.originalname}`, lawyerId]
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: 'Document uploadé',
    });
  } catch (err) {
    console.error('[documents/upload]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ── Actions sur un document ───────────────────────────────────────────────────

// DELETE /api/documents/:id
router.delete('/:id',            ...guard, documentController.deleteDocument);

// PATCH  /api/documents/:id/rename
router.patch ('/:id/rename',     ...guard, documentController.renameDocument);

// PATCH  /api/documents/:id/category
router.patch ('/:id/category',   ...guard, documentController.setCategoryDoc);

// POST   /api/documents/:id/summarize  ← RÉSUMÉ IA
router.post  ('/:id/summarize',  ...guard, documentController.summarizeDoc);

// ── Erreur multer (taille / type) ─────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Type de fichier non autorisé') {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;