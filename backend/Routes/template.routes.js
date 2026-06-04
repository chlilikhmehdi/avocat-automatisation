const express = require('express');
const multer = require('multer');
const path = require('path');
const templateController = require('../Controllers/template.controller');
const { authenticate } = require('../middleware/Auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    cb(null, `template_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .docx sont acceptés comme modèles.'));
    }
  },
});

router.use(authenticate);

// Routes
router.post('/upload', upload.single('file'), templateController.uploadTemplate);
router.get('/', templateController.getTemplates);
router.delete('/:id', templateController.deleteTemplate);
router.post('/generate', templateController.generateDocument);

// Gestion erreur multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: "Erreur d'upload." });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
