// routes/casesList.routes.js
const express    = require('express');
const router     = express.Router();
const { authenticate }  = require('../middleware/Auth');
const { requireRole }   = require('../middleware/requireRole');
const ctrl       = require('../controllers/casesList.controller');

// GET /api/cases-list
router.get('/', authenticate, requireRole('LAWYER', 'ADMIN'), ctrl.getCasesList);

module.exports = router;