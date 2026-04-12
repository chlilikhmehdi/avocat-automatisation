const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const router         = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const caseController = require('../controllers/caseController');

// ─── Multer config ─────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },          // 20 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|docx?|xlsx?|jpeg|jpg|png|txt/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  },
});

// ─── Routes ────────────────────────────────────────────────────────────────

// POST /api/cases — créer un dossier
router.post(
  '/',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  caseController.createCase
);

// GET /api/cases/:lawyer_id — liste des dossiers d'un avocat
router.get(
  '/:lawyer_id',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  caseController.getCasesByLawyer
);

module.exports = router;

// ─── Routes sur /api/case (dossier individuel) ─────────────────────────────
// Exporté séparément pour montage dans server.js
const singleRouter = express.Router();

// GET /api/case/:id — détail
singleRouter.get(
  '/:id',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  caseController.getCaseById
);

// PUT /api/case/:id — modifier
singleRouter.put(
  '/:id',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  caseController.updateCase
);

// DELETE /api/case/:id — soft delete
singleRouter.delete(
  '/:id',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  caseController.deleteCase
);

// POST /api/case/:id/history — ajouter une action
singleRouter.post(
  '/:id/history',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  caseController.addHistory
);

// POST /api/case/:id/upload — upload fichier
singleRouter.post(
  '/:id/upload',
  authenticate,
  authorize('LAWYER', 'ADMIN'),
  upload.single('file'),
  caseController.uploadFile
);

module.exports.singleRouter = singleRouter;