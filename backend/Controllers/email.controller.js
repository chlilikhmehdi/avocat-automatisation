const { pool } = require('../db/dbConfig');
const emailService = require('../services/emailService');

// POST /api/emails/send
exports.sendEmail = async (req, res) => {
  const { to, subject, html, caseId, type } = req.body;
  const sentBy = req.user.id;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: 'Données manquantes (to, subject, html)' });
  }

  try {
    const result = await emailService.sendEmail({ to, subject, html, caseId, type, sentBy });
    
    if (result.success) {
      res.status(200).json({ success: true, message: 'Email envoyé avec succès.' });
    } else {
      res.status(500).json({ success: false, message: 'Échec de l\'envoi de l\'email.', error: result.error });
    }
  } catch (err) {
    console.error('[email/send]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/emails/history/:caseId
exports.getCaseHistory = async (req, res) => {
  const { caseId } = req.params;
  try {
    const result = await pool.query(
      `SELECT e.*, u.nom as sent_by_name 
       FROM email_history e
       LEFT JOIN users u ON e.sent_by = u.id
       WHERE e.case_id = $1 
       ORDER BY e.sent_at DESC`,
      [caseId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[email/history]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
