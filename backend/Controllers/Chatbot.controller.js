// controllers/chatbot.controller.js
const axios = require('axios');
const path  = require('path');
const { pool } = require('../db/dbConfig');

const PYTHON_URL = process.env.CHATBOT_URL || 'http://localhost:5001';
const UPLOAD_DIR  = path.join(__dirname, '..', 'uploads');

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

// Helper appel Python
async function pyCall(method, endpoint, body = null, timeout = 120000) {
  try {
    const config = { timeout };
    const fn     = method === 'GET' ? axios.get : method === 'DELETE' ? axios.delete : axios.post;
    const args   = body ? [body, config] : [config];
    const { data } = await fn(`${PYTHON_URL}${endpoint}`, ...args);
    return data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw { status: 503, message: 'Service IA indisponible. Lancez : python chatbot_service.py' };
    }
    throw { status: err.response?.status || 500, message: err.response?.data?.detail || err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chatbot/ask
// ─────────────────────────────────────────────────────────────────────────────
exports.ask = async (req, res) => {
  const lawyerId = req.user.id;
  const { question, history = [], case_id } = req.body;

  if (!question?.trim()) return ok(res, 400, {}, 'Question vide');

  try {
    const result = await pyCall('POST', '/chat', {
      question: question.trim(),
      history,
      case_id: case_id || null,
    });

    // Sauvegarder dans l'historique chat si table existe
    try {
      await pool.query(
        `INSERT INTO chatbot_history (lawyer_id, question, answer, sources_count, case_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [lawyerId, question.trim(), result.answer, result.sources?.length || 0, case_id || null]
      );
    } catch { /* table peut ne pas encore exister */ }

    return ok(res, 200, { data: result });
  } catch (err) {
    return ok(res, err.status || 500, {}, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chatbot/index/:id  — Indexer un document existant
// ─────────────────────────────────────────────────────────────────────────────
exports.indexDocument = async (req, res) => {
  const lawyerId = req.user.id;
  const docId    = parseInt(req.params.id);

  try {
    const { rows } = await pool.query(
      `SELECT cf.*, ca.lawyer_id FROM case_files cf
       JOIN cases ca ON ca.id = cf.case_id WHERE cf.id = $1`,
      [docId]
    );
    const doc = rows[0];
    if (!doc) return ok(res, 404, {}, 'Document introuvable');
    if (doc.lawyer_id !== lawyerId) return ok(res, 403, {}, 'Accès refusé');

    const filePath = path.join(UPLOAD_DIR, doc.filename);
    const result   = await pyCall('POST', '/index', {
      file_path: filePath,
      doc_id:    docId,
      filename:  doc.display_name || doc.original_name,
    });

    return ok(res, 200, { data: result }, 'Document indexé pour le chatbot');
  } catch (err) {
    return ok(res, err.status || 500, {}, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chatbot/index-all  — Indexer tous les fichiers uploads
// ─────────────────────────────────────────────────────────────────────────────
exports.indexAll = async (req, res) => {
  try {
    const result = await pyCall('POST', '/index-all', {}, 180000);
    return ok(res, 200, { data: result }, `${result.indexed} documents indexés`);
  } catch (err) {
    return ok(res, err.status || 500, {}, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chatbot/stats
// ─────────────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const result = await pyCall('GET', '/stats');
    return ok(res, 200, { data: result.data });
  } catch (err) {
    return ok(res, err.status || 500, {}, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chatbot/history  — Historique des questions de l'avocat
// ─────────────────────────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  const lawyerId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT id, question, answer, sources_count, case_id, created_at
       FROM chatbot_history WHERE lawyer_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [lawyerId]
    );
    return ok(res, 200, { data: rows });
  } catch {
    return ok(res, 200, { data: [] }); // table pas encore créée
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/chatbot/index/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.removeIndex = async (req, res) => {
  try {
    const result = await pyCall('DELETE', `/index/${req.params.id}`);
    return ok(res, 200, { data: result }, 'Document retiré de l\'index');
  } catch (err) {
    return ok(res, err.status || 500, {}, err.message);
  }
};