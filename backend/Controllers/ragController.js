/**
 * ragController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Contrôleur Express pour les endpoints RAG :
 *   POST /api/rag/ingest  → ingestion d'un document
 *   POST /api/rag/query   → question sur un dossier
 *   GET  /api/dossiers/:id/summary  → résumé du dossier
 *   GET  /api/rag/history/:dossier_id → historique des questions
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path          = require('path');
const multer        = require('multer');
const ragService    = require('../services/ragService');
const memoryService = require('../services/memoryService');

// ── Configuration de l'upload (répertoire uploads existant du projet) ─────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `rag-${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext     = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Type de fichier non supporté. Utilisez PDF, DOCX ou TXT.'));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rag/ingest
// Body (form-data) : file, dossier_id
// ─────────────────────────────────────────────────────────────────────────────
const ingestDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { dossier_id } = req.body;

      if (!dossier_id) {
        return res.status(400).json({ success: false, message: 'dossier_id est requis.' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier manquant.' });
      }

      const dossierId  = parseInt(dossier_id);
      const filePath   = req.file.path;
      const nomDocument = req.file.originalname;

      // Ingestion asynchrone (non bloquante pour le client)
      res.status(202).json({
        success: true,
        message: 'Ingestion lancée en arrière-plan.',
        fichier: nomDocument,
        dossier_id: dossierId,
      });

      // Traitement en background
      try {
        const result = await ragService.ingestDocument({ filePath, dossierId, nomDocument });
        console.log(`[RAG] ✅ Ingestion terminée: ${result.chunksCount} chunks pour "${nomDocument}"`);

        // Mettre à jour la mémoire du dossier après ingestion
        await memoryService.updateDossierMemory(dossierId);
        console.log(`[Memory] ✅ Résumé mis à jour pour dossier #${dossierId}`);
      } catch (bgErr) {
        console.error('[RAG] ❌ Erreur ingestion background:', bgErr.message);
      }

    } catch (err) {
      console.error('[RAG] Erreur ingest:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rag/query
// Body JSON : { dossier_id, question }
// ─────────────────────────────────────────────────────────────────────────────
async function queryRag(req, res) {
  try {
    const { dossier_id, question } = req.body;

    if (!dossier_id || !question) {
      return res.status(400).json({
        success: false,
        message: 'dossier_id et question sont requis.',
      });
    }

    if (question.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'La question est trop courte (minimum 5 caractères).',
      });
    }

    const dossierId = parseInt(dossier_id);

    // Exécuter le RAG
    const { answer, citations } = await ragService.queryRag({ dossierId, question });

    // Sauvegarder dans l'historique
    const conversationId = await memoryService.saveConversation({
      dossierId,
      userId:   req.user?.id || null,
      question,
      reponse:  answer,
      citations,
    });

    res.json({
      success: true,
      data: {
        conversation_id: conversationId,
        dossier_id:      dossierId,
        question,
        reponse:         answer,
        citations,        // [{source_index, nom_document, page_numero, extrait, score_pertinence, type_recherche}]
        metadata: {
          chunks_analyses: citations.length,
          timestamp:       new Date().toISOString(),
        },
      },
    });

  } catch (err) {
    console.error('[RAG] Erreur query:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dossiers/:id/summary
// ─────────────────────────────────────────────────────────────────────────────
async function getDossierSummary(req, res) {
  try {
    const dossierId = parseInt(req.params.id);

    if (isNaN(dossierId)) {
      return res.status(400).json({ success: false, message: 'ID dossier invalide.' });
    }

    const summary = await memoryService.getDossierSummary(dossierId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Aucun résumé disponible. Veuillez ingérer des documents dans ce dossier.',
      });
    }

    res.json({
      success: true,
      data: {
        dossier_id:       dossierId,
        resume_global:    summary.resume_global,
        entites:          summary.entites,
        documents_comptes: summary.documents_comptes,
        updated_at:       summary.updated_at,
      },
    });

  } catch (err) {
    console.error('[Memory] Erreur summary:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rag/history/:dossier_id
// ─────────────────────────────────────────────────────────────────────────────
async function getConversationHistory(req, res) {
  try {
    const dossierId = parseInt(req.params.dossier_id);
    const limit     = parseInt(req.query.limit) || 20;

    const history = await memoryService.getConversationHistory(dossierId, limit);

    res.json({ success: true, data: history });

  } catch (err) {
    console.error('[Memory] Erreur history:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  ingestDocument,
  queryRag,
  getDossierSummary,
  getConversationHistory,
};
