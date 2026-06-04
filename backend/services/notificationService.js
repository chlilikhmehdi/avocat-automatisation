const { pool } = require('../db/dbConfig');

// Stockage en mémoire des connexions client SSE actives
const sseClients = [];

/**
 * Initialise la table notifications dans PostgreSQL.
 */
async function initTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL, -- 'hearing', 'document', 'deadline', 'invoice'
      entity_type VARCHAR(50),    -- 'hearings', 'case_files', 'legal_deadlines', 'invoices'
      entity_id INTEGER,          -- ID de l'entité liée
      link VARCHAR(255),          -- Lien de redirection
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  try {
    await pool.query(query);
    console.log('[notifications] Table initialisée ou déjà existante dans PostgreSQL.');
  } catch (err) {
    console.error('[notifications] Erreur lors de l\'initialisation de la table :', err);
  }
}

/**
 * Enregistre une notification dans la BD et la diffuse en temps réel via SSE si l'utilisateur est connecté.
 */
async function createNotification(userId, title, message, type, entityType = null, entityId = null, link = null) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title, message, type, entityType, entityId, link]
    );

    const inserted = rows[0];

    // Diffuser en temps réel via SSE aux connexions ouvertes de cet utilisateur
    const activeClients = sseClients.filter(client => client.userId === parseInt(userId));
    activeClients.forEach(client => {
      try {
        client.res.write(`data: ${JSON.stringify(inserted)}\n\n`);
      } catch (err) {
        console.error(`[notifications/sse] Échec d'envoi client ID ${client.userId} :`, err);
      }
    });

    return inserted;
  } catch (err) {
    console.error('[notifications/create] Erreur de création :', err);
    throw err;
  }
}

/**
 * Routine automatique pour vérifier les échéances et générer des alertes.
 */
async function checkAutomaticNotifications() {
  console.log('[notifications] Lancement de la vérification automatique des échéances...');
  
  try {
    // 1. Rappel d'audiences proches (prévues dans les 2 prochains jours)
    const { rows: hearings } = await pool.query(
      `SELECT h.id, h.lawyer_id, h.title, h.hearing_date, h.hearing_time, h.location, c.id AS case_id, c.title AS case_title, cl.email AS client_email, cl.nom AS client_name
       FROM hearings h
       LEFT JOIN cases c ON c.id = h.case_id
       LEFT JOIN users cl ON cl.id = c.client_id
       WHERE h.status = 'scheduled'
         AND h.hearing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 2`
    );

    for (const h of hearings) {
      // Éviter les doublons
      const check = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 AND entity_type = 'hearings' AND entity_id = $2`,
        [h.lawyer_id, h.id]
      );

      if (check.rows.length === 0) {
        const timeStr = h.hearing_time ? ` à ${h.hearing_time}` : '';
        const caseStr = h.case_title ? ` pour le dossier "${h.case_title}"` : '';
        const dateFormatted = new Date(h.hearing_date).toLocaleDateString('fr-FR');
        
        await createNotification(
          h.lawyer_id,
          "Rappel d'audience proche",
          `L'audience "${h.title}"${caseStr} est prévue le ${dateFormatted}${timeStr}.`,
          'hearing',
          'hearings',
          h.id,
          '/hearings'
        );

        // Envoyer email au client
        if (h.client_email) {
          const emailService = require('./emailService');
          await emailService.sendEmail({
            to: h.client_email,
            subject: `Rappel : Audience pour le dossier ${h.case_title}`,
            html: emailService.templates.hearingNotice(h.client_name, h.title, h.case_title, h.hearing_date, h.hearing_time, h.location),
            caseId: h.case_id,
            type: 'hearing_notice'
          });
        }
      }
    }

    // 2. Alertes délais légaux proches (échéance dans les 3 prochains jours)
    const { rows: deadlines } = await pool.query(
      `SELECT ld.id, ld.lawyer_id, ld.title, ld.deadline_date, c.title AS case_title
       FROM legal_deadlines ld
       LEFT JOIN cases c ON c.id = ld.case_id
       WHERE ld.status = 'pending'
         AND ld.deadline_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3`
    );

    for (const d of deadlines) {
      // Éviter les doublons
      const check = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 AND entity_type = 'legal_deadlines' AND entity_id = $2`,
        [d.lawyer_id, d.id]
      );

      if (check.rows.length === 0) {
        const caseStr = d.case_title ? ` du dossier "${d.case_title}"` : '';
        const dateFormatted = new Date(d.deadline_date).toLocaleDateString('fr-FR');

        await createNotification(
          d.lawyer_id,
          "Échéance de délai légal proche",
          `Le délai légal "${d.title}"${caseStr} arrive à échéance le ${dateFormatted}.`,
          'deadline',
          'legal_deadlines',
          d.id,
          '/legal-deadlines'
        );
      }
    }

    // 3. Rappels de factures impayées échues
    const { rows: invoices } = await pool.query(
      `SELECT i.id, i.case_id, i.lawyer_id, i.invoice_number, i.amount, i.due_date, c.nom AS client_name, c.email AS client_email
       FROM invoices i
       LEFT JOIN users c ON c.id = i.client_id
       WHERE i.status != 'paid'
         AND i.due_date < CURRENT_DATE`
    );

    for (const inv of invoices) {
      // Éviter les doublons
      const check = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 AND entity_type = 'invoices' AND entity_id = $2`,
        [inv.lawyer_id, inv.id]
      );

      if (check.rows.length === 0) {
        const clientStr = inv.client_name ? ` pour le client ${inv.client_name}` : '';
        const dateFormatted = new Date(inv.due_date).toLocaleDateString('fr-FR');

        await createNotification(
          inv.lawyer_id,
          "Facture impayée échue",
          `La facture ${inv.invoice_number} de ${Number(inv.amount).toLocaleString('fr-FR')} MAD${clientStr} est en retard de paiement (échéance le ${dateFormatted}).`,
          'invoice',
          'invoices',
          inv.id,
          '/invoices'
        );

        // Envoyer email au client
        if (inv.client_email) {
          const emailService = require('./emailService');
          await emailService.sendEmail({
            to: inv.client_email,
            subject: `Relance : Facture impayée ${inv.invoice_number}`,
            html: emailService.templates.invoiceReminder(inv.client_name, inv.invoice_number, `${Number(inv.amount).toLocaleString('fr-FR')} MAD`, inv.due_date),
            caseId: inv.case_id,
            type: 'invoice_reminder'
          });
        }
      }
    }

    console.log('[notifications] Vérification automatique terminée avec succès.');
  } catch (err) {
    console.error('[notifications] Erreur de vérification automatique :', err);
  }
}

module.exports = {
  initTable,
  createNotification,
  checkAutomaticNotifications,
  sseClients
};
