/**
 * routes/automationRoutes.js
 *
 * Monter dans server.js :
 *   app.use('/api/automation', require('./routes/automationRoutes'));
 *
 * Toutes les routes sont protégées JWT + rôle LAWYER ou ADMIN.
 */

const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireRole }  = require('../middleware/requireRole');
const ctrl             = require('../controllers/automationController');

const guard = [authenticate, requireRole('LAWYER', 'ADMIN')];

// ── Dashboard global ─────────────────────────────────────────────────────────
router.get('/dashboard',             ...guard, ctrl.getDashboard);

// ── Classification ────────────────────────────────────────────────────────────
router.post('/classify/batch',       ...guard, ctrl.batchClassify);   // AVANT /:caseId
router.post('/classify/:caseId',     ...guard, ctrl.classifyCase);
router.get ('/classify/:caseId',     ...guard, ctrl.getClassification);

// ── Suggestions ───────────────────────────────────────────────────────────────
router.get ('/suggestions/:caseId',  ...guard, ctrl.getSuggestions);

// ── Lettres ───────────────────────────────────────────────────────────────────
router.post('/letter/:caseId',       ...guard, ctrl.generateLetter);
router.get ('/letters/:caseId',      ...guard, ctrl.getLetters);

module.exports = router;