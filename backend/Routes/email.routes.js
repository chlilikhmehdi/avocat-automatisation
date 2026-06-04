const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/Auth');
const { requireRole } = require('../middleware/requireRole');
const ctrl = require('../Controllers/email.controller');

// Seulement les avocats et les admins peuvent envoyer des emails manuels ou voir l'historique
router.use(authenticate);
router.use(requireRole('LAWYER', 'ADMIN', 'ASSISTANT'));

router.post('/send', ctrl.sendEmail);
router.get('/history/:caseId', ctrl.getCaseHistory);

module.exports = router;
