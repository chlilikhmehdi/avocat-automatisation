/**
 * ragRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes RAG — toutes protégées par authenticate
 *
 *   POST /api/rag/ingest            → Upload + ingestion d'un document
 *   POST /api/rag/query             → Question RAG sur un dossier
 *   GET  /api/rag/history/:id       → Historique des questions d'un dossier
 *   GET  /api/dossiers/:id/summary  → Résumé IA du dossier (monté séparément)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../middleware/Auth');
const ragCtrl    = require('../Controllers/ragController');

// Tous les endpoints RAG nécessitent une authentification
router.use(authenticate);

// ── Ingestion d'un document (STAFF seulement) ─────────────────────────────────
// POST /api/rag/ingest
// Form-data : file (PDF/DOCX/TXT), dossier_id (number)
router.post(
  '/ingest',
  authorize('ADMIN', 'LAWYER', 'ASSISTANT'),
  ragCtrl.ingestDocument
);

// ── Question RAG ──────────────────────────────────────────────────────────────
// POST /api/rag/query
// Body JSON : { dossier_id: number, question: string }
router.post(
  '/query',
  authorize('ADMIN', 'LAWYER', 'ASSISTANT'),
  ragCtrl.queryRag
);

// ── Historique des conversations ──────────────────────────────────────────────
// GET /api/rag/history/:dossier_id?limit=20
router.get(
  '/history/:dossier_id',
  authorize('ADMIN', 'LAWYER', 'ASSISTANT'),
  ragCtrl.getConversationHistory
);

module.exports = router;
