const path    = require('path');
const { pool } = require('../db/dbConfig');
const { extractText, classifyDocument } = require('../services/documentParser');
const { chunkText }    = require('../services/chunker');
const { embedBatch }   = require('../services/embeddings');
const { similaritySearch } = require('../services/vectorSearch');
const { answerQuestion, compareDocuments } = require('../services/ragPipeline');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Helper ownership (réutilise logique existante)
async function getOwnedDoc(docId, lawyerId) {
  const { rows } = await pool.query(
    `SELECT cf.*, ca.lawyer_id FROM case_files cf
     JOIN cases ca ON ca.id = cf.case_id WHERE cf.id = $1`,
    [docId]
  );
  const doc = rows[0];
  if (!doc)                       return { doc: null, status: 404 };
  if (doc.lawyer_id !== lawyerId) return { doc: null, status: 403 };
  return { doc, status: 200 };
}

// POST /api/documents/:id/process
// Déclenche le pipeline complet : parse → chunk → embed → classify
exports.processDocument = async (req, res) => {
  const { doc, status } = await getOwnedDoc(req.params.id, req.user.id);
  if (status !== 200) return res.status(status).json({ success: false });

  const filePath = path.join(UPLOAD_DIR, doc.filename);

  try {
    // 1. Extraction texte
    const rawText = await extractText(filePath, doc.mimetype);
    if (rawText.length < 30) {
      return res.status(422).json({ success: false, message: 'Document vide ou illisible' });
    }

    // 2. Classification
    const docType = classifyDocument(rawText);

    // 3. Chunking
    const chunks = chunkText(rawText);

    // 4. Embeddings en batch
    const embeddings = await embedBatch(chunks);

    // 5. Suppression anciens chunks
    await pool.query('DELETE FROM document_chunks WHERE file_id = $1', [doc.id]);

    // 6. Insertion nouveaux chunks
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO document_chunks (file_id, case_id, chunk_index, content, token_count, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [
            doc.id, doc.case_id, i, chunks[i],
            Math.ceil(chunks[i].length / 4),
            `[${embeddings[i].join(',')}]`,
          ]
        );
      }

      // 7. Mise à jour case_files
      await client.query(
        `UPDATE case_files SET
           raw_text = $1, doc_type = $2, chunk_count = $3,
           processed_at = NOW()
         WHERE id = $4`,
        [rawText.slice(0, 50000), docType, chunks.length, doc.id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.json({
      success: true,
      data: { doc_type: docType, chunks: chunks.length, chars: rawText.length },
      message: 'Document traité et indexé',
    });
  } catch (err) {
    console.error('[doc/process]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/documents/:id/ask
exports.askDocument = async (req, res) => {
  const { question, conversation_id } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: 'Question requise' });
  }

  const { doc, status } = await getOwnedDoc(req.params.id, req.user.id);
  if (status !== 200) return res.status(status).json({ success: false });

  if (!doc.processed_at) {
    return res.status(422).json({
      success: false,
      message: 'Document non indexé. Lancez /process d\'abord.',
    });
  }

  try {
    // Historique de conversation
    let history = [];
    if (conversation_id) {
      const { rows } = await pool.query(
        `SELECT role, content FROM doc_conversations
         WHERE id <= $1 AND file_id = $2 ORDER BY id LIMIT 12`,
        [conversation_id, doc.id]
      );
      history = rows;
    }

    const result = await answerQuestion(question, {
      caseId: doc.case_id,
      fileId: doc.id,
      conversationHistory: history,
    });

    // Sauvegarder la Q&R
    const { rows: saved } = await pool.query(
      `INSERT INTO doc_conversations (file_id, case_id, lawyer_id, role, content, sources)
       VALUES ($1,$2,$3,'user',$4,NULL),
              ($1,$2,$3,'assistant',$5,$6)
       RETURNING id`,
      [doc.id, doc.case_id, req.user.id, question, result.answer, JSON.stringify(result.sources)]
    );

    return res.json({
      success: true,
      data: {
        answer:       result.answer,
        sources:      result.sources,
        chunks_used:  result.chunks_used,
        message_id:   saved[saved.length - 1]?.id,
      },
    });
  } catch (err) {
    console.error('[doc/ask]', err);
    return res.status(500).json({ success: false, message: 'Erreur IA' });
  }
};

// POST /api/documents/compare
exports.compareDocuments = async (req, res) => {
  const { file_ids, aspect } = req.body;
  if (!Array.isArray(file_ids) || file_ids.length < 2) {
    return res.status(400).json({ success: false, message: 'Au moins 2 documents requis' });
  }

  // Vérifier ownership de tous les docs
  for (const id of file_ids) {
    const { status } = await getOwnedDoc(id, req.user.id);
    if (status !== 200) return res.status(status).json({ success: false });
  }

  try {
    const result = await compareDocuments(file_ids, aspect);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[doc/compare]', err);
    return res.status(500).json({ success: false, message: 'Erreur comparaison' });
  }
};

// GET /api/documents/:id/conversation
exports.getConversation = async (req, res) => {
  const { doc, status } = await getOwnedDoc(req.params.id, req.user.id);
  if (status !== 200) return res.status(status).json({ success: false });

  const { rows } = await pool.query(
    `SELECT id, role, content, sources, created_at
     FROM doc_conversations WHERE file_id = $1 ORDER BY id`,
    [doc.id]
  );

  return res.json({ success: true, data: rows });
};

// POST /api/documents/search
exports.semanticSearch = async (req, res) => {
  const { query, case_id, file_id, limit = 5 } = req.body;
  if (!query?.trim() || !case_id) {
    return res.status(400).json({ success: false, message: 'query et case_id requis' });
  }

  try {
    const results = await similaritySearch(query, {
      caseId: parseInt(case_id),
      fileId: file_id ? parseInt(file_id) : null,
      limit:  Math.min(parseInt(limit), 20),
      threshold: 0.70,
    });

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[doc/search]', err);
    return res.status(500).json({ success: false, message: 'Erreur recherche' });
  }
};