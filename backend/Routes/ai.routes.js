// routes/ai.routes.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { analyzeDocument } = require('../controllers/ai.controller');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|jpg|jpeg|png|tiff|bmp)$/i;
    allowed.test(path.extname(file.originalname))
      ? cb(null, true)
      : cb(new Error('Type non supporté. Utilisez PDF ou image.'));
  },
});

// POST /api/ai/analyze
router.post('/analyze', upload.single('file'), analyzeDocument);

// Gestion erreur multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;