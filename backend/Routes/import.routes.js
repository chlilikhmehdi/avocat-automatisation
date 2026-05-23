// routes/import.routes.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();

const { authenticate } = require('../middleware/Auth');
const { requireRole }  = require('../middleware/requireRole');
const ctrl             = require('../controllers/import.controller');

const guard = [authenticate, requireRole('LAWYER', 'ADMIN')];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => cb(null, `import_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(path.extname(file.originalname));
    ok ? cb(null, true) : cb(new Error('Format non supporté. Utilisez .xlsx, .xls ou .csv'));
  },
});

// ── Import ────────────────────────────────────────────────────────────────────
router.post('/lmd',      ...guard, upload.single('file'), ctrl.importLMD);
router.post('/creances', ...guard, upload.single('file'), ctrl.importCreances);

// ── Export ────────────────────────────────────────────────────────────────────
router.get('/export/lmd',      ...guard, ctrl.exportLMD);
router.get('/export/creances', ...guard, ctrl.exportCreances);

// Erreur multer
router.use((err, req, res, next) => {
  res.status(400).json({ success: false, message: err.message });
});

module.exports = router;