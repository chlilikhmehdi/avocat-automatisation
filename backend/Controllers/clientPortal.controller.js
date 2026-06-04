// Controllers/clientPortal.controller.js
const { pool } = require('../db/dbConfig');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientOnly(req, res) {
  if (!req.user || req.user.role !== 'CLIENT') {
    res.status(403).json({ success: false, message: 'Accès réservé aux clients.' });
    return false;
  }
  return true;
}

async function assertClientOwnsCase(clientId, caseId) {
  const { rows } = await pool.query(
    'SELECT id FROM cases WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL',
    [caseId, clientId]
  );
  return rows.length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  try {
    const caseRow = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
        COUNT(*) FILTER (WHERE status != 'fermé' AND deleted_at IS NULL) AS open
       FROM cases WHERE client_id = $1`,
      [clientId]
    );
    const invRow = await pool.query(
      `SELECT 
        COALESCE(SUM(amount) FILTER (WHERE invoice_status NOT IN ('payée','paid','annulée','cancelled')), 0) AS total_due,
        COUNT(*) FILTER (WHERE invoice_status NOT IN ('payée','paid','annulée','cancelled')) AS pending,
        COUNT(*) FILTER (WHERE invoice_status IN ('payée','paid')) AS paid,
        COALESCE(SUM(amount) FILTER (WHERE invoice_status IN ('payée','paid')), 0) AS total_paid
       FROM invoices WHERE client_id = $1`,
      [clientId]
    );
    const lastPayment = await pool.query(
      `SELECT p.amount, p.payment_method, p.payment_date
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE i.client_id = $1
       ORDER BY p.payment_date DESC LIMIT 1`,
      [clientId]
    );
    const msgUnread = await pool.query(
      `SELECT COUNT(*) FROM client_messages WHERE receiver_id = $1 AND is_read = FALSE`,
      [clientId]
    );
    const nextHearing = await pool.query(
      `SELECT h.title, h.hearing_date, h.hearing_time, h.location, c.title as case_title
       FROM hearings h JOIN cases c ON h.case_id = c.id
       WHERE c.client_id = $1 AND h.hearing_date >= CURRENT_DATE AND h.status != 'annulée'
       ORDER BY h.hearing_date ASC LIMIT 1`,
      [clientId]
    );
    res.json({
      success: true,
      data: {
        cases:           { total: parseInt(caseRow.rows[0].total), open: parseInt(caseRow.rows[0].open) },
        invoices:        { totalDue: parseFloat(invRow.rows[0].total_due), pending: parseInt(invRow.rows[0].pending), paid: parseInt(invRow.rows[0].paid), totalPaid: parseFloat(invRow.rows[0].total_paid) },
        lastPayment:     lastPayment.rows[0] || null,
        unread_messages: parseInt(msgUnread.rows[0].count),
        next_hearing:    nextHearing.rows[0] || null,
      }
    });
  } catch (err) {
    console.error('[client/dashboard]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/cases
// ─────────────────────────────────────────────────────────────────────────────
exports.getClientCases = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.type, c.status, c.urgency_level, c.created_at, c.updated_at,
              u.nom as lawyer_name, u.email as lawyer_email, u.telephone as lawyer_phone
       FROM cases c
       LEFT JOIN users u ON c.lawyer_id = u.id
       WHERE c.client_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.updated_at DESC`,
      [clientId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[client/cases]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/cases/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getCaseDetail = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { id } = req.params;
  try {
    if (!await assertClientOwnsCase(clientId, id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à ce dossier.' });
    }
    const caseData = await pool.query(
      `SELECT c.*, u.nom as lawyer_name, u.email as lawyer_email, u.telephone as lawyer_phone
       FROM cases c
       LEFT JOIN users u ON c.lawyer_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    res.json({ success: true, data: caseData.rows[0] });
  } catch (err) {
    console.error('[client/case-detail]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/cases/:id/hearings
// ─────────────────────────────────────────────────────────────────────────────
exports.getCaseHearings = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { id } = req.params;
  try {
    if (!await assertClientOwnsCase(clientId, id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const result = await pool.query(
      `SELECT id, title, hearing_date, hearing_time, location, status, description
       FROM hearings WHERE case_id = $1 ORDER BY hearing_date ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[client/hearings]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/cases/:id/documents
// ─────────────────────────────────────────────────────────────────────────────
exports.getCaseDocuments = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { id } = req.params;
  try {
    if (!await assertClientOwnsCase(clientId, id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const result = await pool.query(
      `SELECT cf.id, cf.original_name, cf.mimetype, cf.size, cf.uploaded_at,
              cf.category, cf.doc_type, csf.note, csf.shared_at
       FROM client_shared_files csf
       JOIN case_files cf ON csf.case_file_id = cf.id
       WHERE csf.case_id = $1
       ORDER BY csf.shared_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[client/documents]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/cases/:id/invoices
// ─────────────────────────────────────────────────────────────────────────────
exports.getCaseInvoices = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { id } = req.params;
  try {
    if (!await assertClientOwnsCase(clientId, id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const result = await pool.query(
      `SELECT id, invoice_number, amount, invoice_status, issue_date, due_date, description
       FROM invoices WHERE case_id = $1 AND client_id = $2 ORDER BY issue_date DESC`,
      [id, clientId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[client/invoices]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/documents
// ─────────────────────────────────────────────────────────────────────────────
exports.getClientDocuments = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT cf.id, cf.original_name, cf.mimetype, cf.size, cf.uploaded_at,
              cf.category, cf.doc_type, csf.note, csf.shared_at,
              c.title as case_title, u.nom as shared_by_name
       FROM client_shared_files csf
       JOIN case_files cf ON csf.case_file_id = cf.id
       LEFT JOIN cases c ON csf.case_id = c.id
       LEFT JOIN users u ON csf.shared_by = u.id
       WHERE c.client_id = $1
       ORDER BY csf.shared_at DESC`,
      [clientId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[client/documents]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/documents/:fileId/download
// ─────────────────────────────────────────────────────────────────────────────
exports.downloadDocument = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { fileId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT cf.stored_name, cf.original_name, cf.mimetype
       FROM client_shared_files csf
       JOIN case_files cf ON csf.case_file_id = cf.id
       LEFT JOIN cases c ON csf.case_id = c.id
       WHERE cf.id = $1 AND c.client_id = $2`,
      [fileId, clientId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable.' });
    }
    const filePath = path.join(__dirname, '../uploads', rows[0].stored_name);
    res.setHeader('Content-Disposition', `attachment; filename="${rows[0].original_name}"`);
    res.setHeader('Content-Type', rows[0].mimetype || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) {
    console.error('[download-doc]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/invoices
// ─────────────────────────────────────────────────────────────────────────────
exports.getClientInvoices = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT 
         i.id, i.invoice_number, i.amount, i.invoice_status, i.issue_date, i.due_date, i.description, i.case_id,
         c.title as case_title,
         COALESCE(SUM(p.amount), 0) as amount_paid,
         (i.amount - COALESCE(SUM(p.amount), 0)) as amount_due,
         COALESCE(
           json_agg(
             json_build_object(
               'id', p.id, 'amount', p.amount,
               'payment_date', p.payment_date,
               'payment_method', p.payment_method,
               'reference', p.reference
             ) ORDER BY p.payment_date DESC
           ) FILTER (WHERE p.id IS NOT NULL), '[]'
         ) as payments
       FROM invoices i
       LEFT JOIN cases c ON i.case_id = c.id
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.client_id = $1
       GROUP BY i.id, c.title
       ORDER BY i.issue_date DESC`,
      [clientId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[client/invoices]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/messages
// ─────────────────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { case_id } = req.query;
  try {
    if (case_id && !await assertClientOwnsCase(clientId, case_id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (case_id) {
      await pool.query(
        `UPDATE client_messages SET is_read = TRUE WHERE case_id = $1 AND receiver_id = $2`,
        [case_id, clientId]
      );
    }
    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, m.is_read, m.case_id,
              s.nom as sender_name, s.role as sender_role
       FROM client_messages m
       JOIN users s ON m.sender_id = s.id
       WHERE m.case_id = $1
       ORDER BY m.created_at ASC`,
      [case_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[client/messages GET]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/client/messages
// ─────────────────────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  const { case_id, content } = req.body;
  if (!case_id || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'Dossier et message requis.' });
  }
  try {
    if (!await assertClientOwnsCase(clientId, case_id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const caseRes = await pool.query('SELECT lawyer_id FROM cases WHERE id = $1', [case_id]);
    const receiverId = caseRes.rows[0]?.lawyer_id;
    const result = await pool.query(
      `INSERT INTO client_messages (case_id, sender_id, receiver_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [case_id, clientId, receiverId, content.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[client/messages POST]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/notifications
// ─────────────────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  if (!clientOnly(req, res)) return;
  const clientId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT id, title, message, is_read, created_at, type
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [clientId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[client/notifications]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/client/share-file  (AVOCAT only)
// ─────────────────────────────────────────────────────────────────────────────
exports.shareFileWithClient = async (req, res) => {
  if (!['ADMIN', 'LAWYER', 'ASSISTANT'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Accès refusé.' });
  }
  const { case_file_id, case_id, note } = req.body;
  const lawyerId = req.user.id;
  try {
    const exists = await pool.query(
      'SELECT id FROM client_shared_files WHERE case_file_id = $1 AND case_id = $2',
      [case_file_id, case_id]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Fichier déjà partagé.' });
    }
    const result = await pool.query(
      `INSERT INTO client_shared_files (case_file_id, case_id, shared_by, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [case_file_id, case_id, lawyerId, note || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[share-file]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/client/lawyer-messages  (LAWYER view)
// ─────────────────────────────────────────────────────────────────────────────
exports.getLawyerMessages = async (req, res) => {
  if (!['ADMIN', 'LAWYER', 'ASSISTANT'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Accès refusé.' });
  }
  const { case_id } = req.query;
  if (!case_id) return res.status(400).json({ success: false, message: 'case_id requis.' });
  try {
    await pool.query(
      `UPDATE client_messages SET is_read = TRUE WHERE case_id = $1 AND receiver_id = $2`,
      [case_id, req.user.id]
    );
    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, m.is_read,
              s.nom as sender_name, s.role as sender_role
       FROM client_messages m JOIN users s ON m.sender_id = s.id
       WHERE m.case_id = $1 ORDER BY m.created_at ASC`,
      [case_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[lawyer-messages]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/client/lawyer-reply
// ─────────────────────────────────────────────────────────────────────────────
exports.lawyerReply = async (req, res) => {
  if (!['ADMIN', 'LAWYER', 'ASSISTANT'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Accès refusé.' });
  }
  const { case_id, content } = req.body;
  if (!case_id || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'Données manquantes.' });
  }
  try {
    const caseRes = await pool.query('SELECT client_id FROM cases WHERE id = $1', [case_id]);
    const clientId = caseRes.rows[0]?.client_id;
    const result = await pool.query(
      `INSERT INTO client_messages (case_id, sender_id, receiver_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [case_id, req.user.id, clientId, content.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[lawyer-reply]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};