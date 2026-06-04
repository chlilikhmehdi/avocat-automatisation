// controllers/clientController.js
// Espace client sécurisé — toutes les données filtrées par client_id = req.user.id

const pool = require('../db/dbConfig'); // adaptez selon votre config PostgreSQL

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/dashboard
// Résumé : nombre de dossiers, factures en attente, total payé
// ════════════════════════════════════════════════════════════════════════════════
async function getDashboard(req, res) {
  const clientId = req.user.id;
  try {
    const [casesRes, invoicesRes, paymentsRes, messagesRes] = await Promise.all([
      // Nombre de dossiers actifs
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'ouvert') AS open,
                COUNT(*) FILTER (WHERE status = 'fermé') AS closed
         FROM cases
         WHERE client_id = $1 AND deleted_at IS NULL`,
        [clientId],
      ),
      // Factures résumé
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(amount), 0)      AS total_amount,
           COALESCE(SUM(amount_paid), 0) AS total_paid,
           COALESCE(SUM(amount_due), 0)  AS total_due,
           COUNT(*) FILTER (WHERE invoice_status = 'en_attente') AS pending,
           COUNT(*) FILTER (WHERE invoice_status = 'payée')      AS paid
         FROM invoices
         WHERE client_id = $1`,
        [clientId],
      ),
      // Dernier paiement
      pool.query(
        `SELECT p.amount, p.payment_date, p.payment_method
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
         WHERE i.client_id = $1
         ORDER BY p.created_at DESC
         LIMIT 1`,
        [clientId],
      ),
      // Messages non lus
      pool.query(
        `SELECT COUNT(*) AS unread
         FROM client_messages
         WHERE receiver_id = $1 AND is_read = false`,
        [clientId],
      ),
    ]);

    res.json({
      success: true,
      data: {
        cases: {
          total:  parseInt(casesRes.rows[0]?.total  || 0),
          open:   parseInt(casesRes.rows[0]?.open   || 0),
          closed: parseInt(casesRes.rows[0]?.closed || 0),
        },
        invoices: {
          total:        parseInt(invoicesRes.rows[0]?.total        || 0),
          totalAmount:  parseFloat(invoicesRes.rows[0]?.total_amount || 0),
          totalPaid:    parseFloat(invoicesRes.rows[0]?.total_paid   || 0),
          totalDue:     parseFloat(invoicesRes.rows[0]?.total_due    || 0),
          pending:      parseInt(invoicesRes.rows[0]?.pending || 0),
          paid:         parseInt(invoicesRes.rows[0]?.paid    || 0),
        },
        lastPayment:  paymentsRes.rows[0] || null,
        unreadMessages: parseInt(messagesRes.rows[0]?.unread || 0),
      },
    });
  } catch (err) {
    console.error('[Client Dashboard]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/cases
// Liste des dossiers du client connecté
// ════════════════════════════════════════════════════════════════════════════════
async function getCases(req, res) {
  const clientId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.title,
         c.type,
         c.status,
         c.urgency_level,
         c.created_at,
         c.updated_at,
         u.nom  AS lawyer_name,
         u.email AS lawyer_email,
         -- Nombre de fichiers partagés pour ce dossier
         (SELECT COUNT(*) FROM client_shared_files csf WHERE csf.case_id = c.id) AS shared_files_count,
         -- Prochaine audience
         (SELECT h.hearing_date
          FROM hearings h
          WHERE h.case_id = c.id AND h.hearing_date >= NOW()
          ORDER BY h.hearing_date ASC LIMIT 1) AS next_hearing
       FROM cases c
       LEFT JOIN users u ON u.id = c.lawyer_id
       WHERE c.client_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.updated_at DESC`,
      [clientId],
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Client Cases]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/cases/:id
// Détail d'un dossier — vérifie que le dossier appartient au client
// ════════════════════════════════════════════════════════════════════════════════
async function getCaseDetail(req, res) {
  const clientId = req.user.id;
  const caseId   = parseInt(req.params.id);

  if (isNaN(caseId)) return sendError(res, 400, 'ID invalide.');

  try {
    const caseRes = await pool.query(
      `SELECT
         c.*,
         u.nom   AS lawyer_name,
         u.email AS lawyer_email,
         u.telephone AS lawyer_phone
       FROM cases c
       LEFT JOIN users u ON u.id = c.lawyer_id
       WHERE c.id = $1 AND c.client_id = $2 AND c.deleted_at IS NULL`,
      [caseId, clientId],
    );

    if (caseRes.rows.length === 0)
      return sendError(res, 404, 'Dossier introuvable ou accès refusé.');

    // Historique du dossier
    const historyRes = await pool.query(
      `SELECT action, description, created_at
       FROM case_history
       WHERE case_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [caseId],
    );

    // Audiences
    const hearingsRes = await pool.query(
      `SELECT id, hearing_date, location, notes, status
       FROM hearings
       WHERE case_id = $1
       ORDER BY hearing_date DESC`,
      [caseId],
    );

    res.json({
      success: true,
      data: {
        case:     caseRes.rows[0],
        history:  historyRes.rows,
        hearings: hearingsRes.rows,
      },
    });
  } catch (err) {
    console.error('[Client Case Detail]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/documents
// Documents partagés avec le client (client_shared_files + case_files)
// ════════════════════════════════════════════════════════════════════════════════
async function getDocuments(req, res) {
  const clientId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT
         cf.id,
         cf.filename,
         cf.original_name,
         cf.display_name,
         cf.mimetype,
         cf.size,
         cf.category,
         cf.uploaded_at,
         cf.case_id,
         c.title  AS case_title,
         csf.note AS share_note,
         csf.shared_at,
         u.nom    AS shared_by_name
       FROM client_shared_files csf
       JOIN case_files cf ON cf.id = csf.case_file_id
       JOIN cases      c  ON c.id  = csf.case_id
       LEFT JOIN users u  ON u.id  = csf.shared_by
       WHERE c.client_id = $1
       ORDER BY csf.shared_at DESC`,
      [clientId],
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Client Documents]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/documents/:id/download
// Télécharger un document partagé — vérifie l'accès
// ════════════════════════════════════════════════════════════════════════════════
async function downloadDocument(req, res) {
  const clientId = req.user.id;
  const fileId   = parseInt(req.params.id);

  if (isNaN(fileId)) return sendError(res, 400, 'ID invalide.');

  try {
    const result = await pool.query(
      `SELECT cf.filename, cf.original_name, cf.mimetype
       FROM client_shared_files csf
       JOIN case_files cf ON cf.id = csf.case_file_id
       JOIN cases      c  ON c.id  = csf.case_id
       WHERE cf.id = $1 AND c.client_id = $2`,
      [fileId, clientId],
    );

    if (result.rows.length === 0)
      return sendError(res, 404, 'Fichier introuvable ou accès refusé.');

    const file = result.rows[0];
    const fs   = require('fs');
    const path = require('path');

    // Adaptez UPLOADS_DIR selon votre configuration
    const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
    const filePath    = path.join(UPLOADS_DIR, file.filename);

    if (!fs.existsSync(filePath))
      return sendError(res, 404, 'Fichier physique introuvable.');

    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[Client Download]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/invoices
// Factures du client avec paiements associés
// ════════════════════════════════════════════════════════════════════════════════
async function getInvoices(req, res) {
  const clientId = req.user.id;
  try {
    const invoicesRes = await pool.query(
      `SELECT
         i.id,
         i.invoice_number,
         i.amount,
         i.amount_paid,
         i.amount_due,
         i.status,
         i.invoice_status,
         i.issue_date,
         i.due_date,
         i.description,
         i.created_at,
         i.case_id,
         c.title AS case_title,
         u.nom   AS lawyer_name
       FROM invoices i
       LEFT JOIN cases c ON c.id = i.case_id
       LEFT JOIN users u ON u.id = i.lawyer_id
       WHERE i.client_id = $1
       ORDER BY i.created_at DESC`,
      [clientId],
    );

    // Pour chaque facture, récupérer ses paiements
    const invoiceIds = invoicesRes.rows.map((r) => r.id);
    let paymentsMap  = {};

    if (invoiceIds.length > 0) {
      const paymentsRes = await pool.query(
        `SELECT id, invoice_id, amount, payment_method, payment_date, reference, payment_type
         FROM payments
         WHERE invoice_id = ANY($1::int[])
         ORDER BY payment_date DESC`,
        [invoiceIds],
      );
      paymentsRes.rows.forEach((p) => {
        if (!paymentsMap[p.invoice_id]) paymentsMap[p.invoice_id] = [];
        paymentsMap[p.invoice_id].push(p);
      });
    }

    const data = invoicesRes.rows.map((inv) => ({
      ...inv,
      payments: paymentsMap[inv.id] || [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Client Invoices]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/client/messages
// Messages entre le client et son avocat
// ════════════════════════════════════════════════════════════════════════════════
async function getMessages(req, res) {
  const clientId = req.user.id;
  const caseId   = req.query.case_id ? parseInt(req.query.case_id) : null;

  try {
    let query = `
      SELECT
        m.id,
        m.case_id,
        m.content,
        m.is_read,
        m.created_at,
        s.nom  AS sender_name,
        s.role AS sender_role,
        r.nom  AS receiver_name
      FROM client_messages m
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.receiver_id
      WHERE (m.sender_id = $1 OR m.receiver_id = $1)
    `;
    const params = [clientId];

    if (caseId) {
      params.push(caseId);
      query += ` AND m.case_id = $${params.length}`;
    }

    query += ` ORDER BY m.created_at ASC`;

    const result = await pool.query(query, params);

    // Marquer les messages reçus comme lus
    await pool.query(
      `UPDATE client_messages SET is_read = true
       WHERE receiver_id = $1 AND is_read = false`,
      [clientId],
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Client Messages]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/client/messages
// Envoyer un message à l'avocat du dossier
// ════════════════════════════════════════════════════════════════════════════════
async function sendMessage(req, res) {
  const clientId = req.user.id;
  const { case_id, content } = req.body;

  if (!content || !content.trim())
    return sendError(res, 400, 'Le message ne peut pas être vide.');

  try {
    // Vérifier que le dossier appartient au client et récupérer l'avocat
    const caseRes = await pool.query(
      `SELECT lawyer_id FROM cases WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL`,
      [case_id, clientId],
    );

    if (caseRes.rows.length === 0)
      return sendError(res, 404, 'Dossier introuvable ou accès refusé.');

    const lawyerId = caseRes.rows[0].lawyer_id;
    if (!lawyerId)
      return sendError(res, 400, 'Aucun avocat assigné à ce dossier.');

    const result = await pool.query(
      `INSERT INTO client_messages (case_id, sender_id, receiver_id, content, is_read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING *`,
      [case_id, clientId, lawyerId, content.trim()],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Client Send Message]', err.message);
    sendError(res, 500, 'Erreur serveur.');
  }
}

module.exports = {
  getDashboard,
  getCases,
  getCaseDetail,
  getDocuments,
  downloadDocument,
  getInvoices,
  getMessages,
  sendMessage,
};