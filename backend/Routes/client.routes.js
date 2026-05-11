// routes/client.routes.js
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/Auth');
const { requireRole }  = require('../middleware/requireRole');
const ctrl = require('../controllers/client.controller');

const guard = [authenticate, requireRole('LAWYER', 'ADMIN')];

// GET  /api/clients                   → liste clients
router.get ('/',               ...guard, ctrl.listClients);

// GET  /api/clients/:id/full-details  → profil complet
router.get ('/:id/full-details', ...guard, ctrl.getClientFullDetails);

// PATCH /api/clients/:id/link-case   → lier dossier à client
router.patch('/:id/link-case', ...guard, ctrl.linkCaseToClient);

module.exports = router;