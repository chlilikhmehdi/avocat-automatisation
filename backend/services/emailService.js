const nodemailer = require('nodemailer');
const { pool } = require('../db/dbConfig');

// Configuration SMTP (par défaut: configuration générique ou Mailtrap pour dev)
// En production, utiliser process.env.SMTP_HOST, process.env.SMTP_PORT, etc.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER || "1a2b3c4d5e6f7g", // Remplacez par vos identifiants réels si besoin
    pass: process.env.SMTP_PASS || "1a2b3c4d5e6f7g"
  }
});

/**
 * Envoie un email et l'enregistre dans l'historique
 */
const sendEmail = async ({ to, subject, html, caseId = null, type = 'custom', sentBy = null }) => {
  let status = 'SENT';
  let errorMsg = null;

  try {
    // Si pas d'adresse, on ignore
    if (!to) throw new Error("Aucune adresse email destinataire");

    await transporter.sendMail({
      from: '"Cabinet d\'Avocats MiZan" <no-reply@mizan-cabinet.ma>',
      to,
      subject,
      html
    });
    console.log(`[emailService] Email "${subject}" envoyé avec succès à ${to}`);
  } catch (error) {
    console.error(`[emailService] Échec d'envoi à ${to} :`, error.message);
    status = 'FAILED';
    errorMsg = error.message;
  }

  // Historisation dans la DB
  try {
    await pool.query(
      `INSERT INTO email_history (to_email, subject, body, case_id, type, status, sent_by, error_msg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [to, subject, html, caseId, type, status, sentBy, errorMsg]
    );
  } catch (dbErr) {
    console.error('[emailService] Erreur lors de la sauvegarde dans email_history :', dbErr);
  }

  return { success: status === 'SENT', error: errorMsg };
};

/**
 * Modèles d'emails prédéfinis
 */
const templates = {
  // Relance de facture impayée
  invoiceReminder: (clientName, invoiceNum, amount, dueDate) => {
    return `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #b91c1c;">Relance : Facture impayée</h2>
        <p>Bonjour ${clientName},</p>
        <p>Sauf erreur ou omission de notre part, la facture <strong>${invoiceNum}</strong> d'un montant de <strong>${amount}</strong> reste impayée à ce jour.</p>
        <p>La date d'échéance était fixée au <strong>${new Date(dueDate).toLocaleDateString('fr-FR')}</strong>.</p>
        <p>Nous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais.</p>
        <p>Cordialement,<br/><strong>Le Cabinet MiZan</strong></p>
      </div>
    `;
  },
  
  // Convocation à une audience
  hearingNotice: (clientName, hearingTitle, caseTitle, date, time, location) => {
    return `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #1e40af;">Convocation à une audience</h2>
        <p>Bonjour ${clientName},</p>
        <p>Nous vous informons qu'une audience (${hearingTitle}) a été fixée pour votre dossier <strong>${caseTitle}</strong>.</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #1e40af; margin: 15px 0;">
          <strong>Date :</strong> ${new Date(date).toLocaleDateString('fr-FR')}<br/>
          <strong>Heure :</strong> ${time || 'Non spécifiée'}<br/>
          <strong>Lieu :</strong> ${location || 'Tribunal'}
        </div>
        <p>Nous vous invitons à nous contacter pour préparer cette audience.</p>
        <p>Cordialement,<br/><strong>Votre Avocat</strong></p>
      </div>
    `;
  },

  // Partage de document
  documentShare: (clientName, documentName, caseTitle) => {
    return `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #0f172a;">Nouveau document disponible</h2>
        <p>Bonjour ${clientName},</p>
        <p>Un nouveau document (<strong>${documentName}</strong>) a été ajouté à votre dossier <strong>${caseTitle}</strong>.</p>
        <p>Vous pouvez vous connecter à votre Espace Client sécurisé pour le consulter et le télécharger.</p>
        <p>Cordialement,<br/><strong>Le Cabinet MiZan</strong></p>
      </div>
    `;
  }
};

module.exports = {
  sendEmail,
  templates
};
