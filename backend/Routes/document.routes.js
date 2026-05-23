// routes/document.routes.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { extractDocument } = require('../controllers/document.controller');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png|tiff|bmp|docx|doc|txt)$/i.test(path.extname(file.originalname));
    ok ? cb(null, true) : cb(new Error('Format non supporté (PDF, JPG, PNG, TIFF, DOCX, TXT)'));
  },
});

// POST /api/documents/extract
router.post('/extract', upload.single('file'), extractDocument);

// Gestion erreur multer
router.use((err, req, res, next) => {
  res.status(400).json({ success: false, message: err.message });
});

module.exports = router;