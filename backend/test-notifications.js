/**
 * Script de test autonome pour valider le vérificateur automatique de notifications.
 * Exécution : node test-notifications.js
 */

const { pool } = require('./db/dbConfig');
const notificationService = require('./services/notificationService');

async function runTest() {
  console.log("=============================================================");
  console.log(" TEST DU SYSTEME DE NOTIFICATIONS AUTOMATIQUES");
  console.log("=============================================================");

  try {
    // 1. Initialiser la table si nécessaire
    console.log("\n1. Initialisation de la table notifications...");
    await notificationService.initTable();

    // 2. Insérer des données de test si nécessaire
    // Vérifier si des avocats existent
    const lawyers = await pool.query("SELECT id, nom FROM users WHERE role = 'LAWYER' LIMIT 1");
    if (lawyers.rows.length === 0) {
      console.log("❌ Aucun utilisateur LAWYER trouvé dans la base de données pour associer des notifications.");
      return;
    }
    const lawyerId = lawyers.rows[0].id;
    console.log(`👤 Avocat sélectionné pour les tests : ${lawyers.rows[0].nom} (ID: ${lawyerId})`);

    // Insérer un dossier de test si aucun dossier n'existe
    let caseId = null;
    const cases = await pool.query("SELECT id FROM cases WHERE deleted_at IS NULL LIMIT 1");
    if (cases.rows.length > 0) {
      caseId = cases.rows[0].id;
    }

    // Insérer une audience de test dans les 2 prochains jours
    console.log("\n2. Insertion d'une audience de test (prévue demain)...");
    const hearingDate = new Date();
    hearingDate.setDate(hearingDate.getDate() + 1);
    const dateStr = hearingDate.toISOString().split('T')[0];

    const hearingRes = await pool.query(
      `INSERT INTO hearings (case_id, lawyer_id, title, description, hearing_date, hearing_time, location, status)
       VALUES ($1, $2, 'Audience de Test Rapprochement', 'Audience insérée par le script de test', $3, '10:00:00', 'Tribunal de Test', 'scheduled')
       RETURNING id`,
      [caseId, lawyerId, dateStr]
    );
    const testHearingId = hearingRes.rows[0].id;
    console.log(`✅ Audience de test insérée avec succès (ID: ${testHearingId}, Date: ${dateStr})`);

    // 3. Lancer le vérificateur automatique
    console.log("\n3. Lancement de checkAutomaticNotifications()...");
    await notificationService.checkAutomaticNotifications();

    // 4. Vérifier les notifications créées
    console.log("\n4. Lecture des notifications créées pour cet avocat...");
    const notifs = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 AND entity_type = 'hearings' AND entity_id = $2",
      [lawyerId, testHearingId]
    );

    if (notifs.rows.length > 0) {
      console.log("🎉 SUCCESS: La notification automatique d'audience a été créée !");
      console.log(JSON.stringify(notifs.rows[0], null, 2));
    } else {
      console.log("❌ FAILURE: Aucune notification automatique créée.");
    }

    // Nettoyer l'audience de test et sa notification
    console.log("\n5. Nettoyage des données de test...");
    await pool.query("DELETE FROM notifications WHERE entity_type = 'hearings' AND entity_id = $1", [testHearingId]);
    await pool.query("DELETE FROM hearings WHERE id = $1", [testHearingId]);
    console.log("🗑️ Données nettoyées.");

  } catch (err) {
    console.error("❌ Erreur pendant le test :", err);
  } finally {
    // Fermer le pool de connexion pour quitter proprement le script
    await pool.end();
  }
}

runTest();
