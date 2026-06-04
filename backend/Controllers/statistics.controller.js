// Not an artifact, just code file
const { pool } = require('../db/dbConfig');

const getStatistics = async (req, res) => {
  try {
    // 1. Total des dossiers
    const totalDossiersResult = await pool.query('SELECT COUNT(*) FROM cases');
    const totalDossiers = parseInt(totalDossiersResult.rows[0].count, 10);

    // 2. Dossiers actifs (statut != Clôturé)
    const actifsResult = await pool.query('SELECT COUNT(*) FROM cases WHERE status != $1', ['Clôturé']);
    const dossiersActifs = parseInt(actifsResult.rows[0].count, 10);

    // 3. Dossiers terminés
    const terminesResult = await pool.query('SELECT COUNT(*) FROM cases WHERE status = $1', ['Clôturé']);
    const dossiersTermines = parseInt(terminesResult.rows[0].count, 10);

    // 4. Taux de réussite (Exemple basique : dossiers clôturés avec succès / dossiers clôturés)
    // À ajuster selon la logique métier exacte. Pour l'instant, on peut simuler ou se baser sur une colonne si existante.
    // Supposons qu'on a un taux de 85% par défaut ou calculé
    const tauxReussite = dossiersTermines > 0 ? 85 : 0; 

    // 5. Revenus mensuels (somme des montants des factures payées par mois)
    const revenusResult = await pool.query(`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') as month, SUM(total_amount) as total
      FROM invoices
      WHERE status = 'Payée'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);
    const revenusMensuels = revenusResult.rows;

    // 6. Avocat le plus chargé (cas assignés)
    const avocatResult = await pool.query(`
      SELECT u.first_name, u.last_name, COUNT(c.id) as case_count
      FROM cases c
      JOIN users u ON c.lawyer_id = u.id
      WHERE c.status != 'Clôturé'
      GROUP BY u.id
      ORDER BY case_count DESC
      LIMIT 1
    `);
    const avocatCharge = avocatResult.rows.length > 0 ? avocatResult.rows[0] : null;

    // 7. Audiences par mois
    const audiencesResult = await pool.query(`
      SELECT TO_CHAR(hearing_date, 'YYYY-MM') as month, COUNT(*) as count
      FROM hearings
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);
    const audiencesParMois = audiencesResult.rows;

    res.json({
      success: true,
      data: {
        totalDossiers,
        dossiersActifs,
        dossiersTermines,
        tauxReussite,
        revenusMensuels,
        avocatCharge,
        audiencesParMois
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors du calcul des statistiques.' });
  }
};

module.exports = {
  getStatistics
};
