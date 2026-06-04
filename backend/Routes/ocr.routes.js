const express = require('express');
const multer = require('multer');
const path = require('path');
const ocrController = require('../Controllers/ocr.controller');
const { authenticate } = require('../middleware/Auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png|tiff|bmp|docx)$/i.test(path.extname(file.originalname));
    ok ? cb(null, true) : cb(new Error('Format non supporté (PDF, JPG, PNG, TIFF, DOCX)'));
  },
});

router.use(authenticate);

router.post('/analyze', upload.single('file'), ocrController.uploadAndAnalyze);
router.get('/history', ocrController.getHistory);
router.get('/cases-select', ocrController.getCasesForSelect);
router.get('/:id', ocrController.getOne);
router.delete('/:id', ocrController.deleteOne);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: "Erreur d'upload (fichier trop grand ?)" });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
