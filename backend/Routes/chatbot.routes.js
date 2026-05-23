// routes/chatbot.routes.js
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/Auth');
const { requireRole }  = require('../middleware/requireRole');
const ctrl = require('../controllers/chatbot.controller');

const guard = [authenticate, requireRole('LAWYER', 'ADMIN', 'ASSISTANT')];

// Chat
router.post  ('/ask',           ...guard, ctrl.ask);

// Indexation
router.post  ('/index-all',     ...guard, ctrl.indexAll);
router.post  ('/index/:id',     ...guard, ctrl.indexDocument);
router.delete('/index/:id',     ...guard, ctrl.removeIndex);

// Info
router.get   ('/stats',         ...guard, ctrl.getStats);
router.get   ('/history',       ...guard, ctrl.getHistory);

module.exports = router;