const express = require('express');
const router  = express.Router();
const { authenticate }  = require('../middleware/Auth');
const { requireRole }   = require('../middleware/requireRole');
const ctrl = require('../controllers/documentAIController');

const guard = [authenticate, requireRole('LAWYER', 'ADMIN')];

// Indexation d'un document (pipeline complet)
router.post('/:id/process',      ...guard, ctrl.processDocument);

// Q&A conversationnel sur un document
router.post('/:id/ask',          ...guard, ctrl.askDocument);

// Historique de conversation
router.get ('/:id/conversation', ...guard, ctrl.getConversation);

// Comparaison multi-documents
router.post('/compare',          ...guard, ctrl.compareDocuments);

// Recherche sémantique
router.post('/search',           ...guard, ctrl.semanticSearch);

module.exports = router;