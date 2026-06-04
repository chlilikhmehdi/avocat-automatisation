const { pool } = require('../db/dbConfig');

const getUrgentCases = async (req, res) => {
  try {
    // Calcul de la priorité basé sur legal_deadline ou la prochaine audience (hearing_date)
    // On va simuler ou calculer la priorité en SQL ou en JS
    // Pour simplifier et assurer la compatibilité, on récupère les dossiers non clôturés
    // et on les trie/étiquette.
    
    // Jointure pour obtenir la date de la prochaine audience si elle existe
    const query = `
      SELECT 
        c.id, c.title, c.case_number, c.status,
        (SELECT MIN(hearing_date) FROM hearings WHERE case_id = c.id AND hearing_date >= CURRENT_DATE) as next_hearing_date,
        (SELECT MIN(deadline_date) FROM legal_deadlines WHERE case_id = c.id AND deadline_date >= CURRENT_DATE) as next_deadline_date
      FROM cases c
      WHERE c.status != 'Clôturé'
    `;
    
    const result = await pool.query(query);
    const dossiers = result.rows;
    
    const dossiersAvecPriorite = dossiers.map(dossier => {
      let priority = 'Vert'; // Normal
      
      const today = new Date();
      let nearestDate = null;
      
      const hearingDate = dossier.next_hearing_date ? new Date(dossier.next_hearing_date) : null;
      const deadlineDate = dossier.next_deadline_date ? new Date(dossier.next_deadline_date) : null;
      
      // Trouver la date la plus proche
      if (hearingDate && deadlineDate) {
        nearestDate = hearingDate < deadlineDate ? hearingDate : deadlineDate;
      } else if (hearingDate) {
        nearestDate = hearingDate;
      } else if (deadlineDate) {
        nearestDate = deadlineDate;
      }
      
      if (nearestDate) {
        const diffTime = Math.abs(nearestDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          priority = 'Rouge'; // Urgent (< 7 jours)
        } else if (diffDays <= 30) {
          priority = 'Orange'; // Moyen (< 30 jours)
        }
      }
      
      return {
        ...dossier,
        priority,
        nearest_deadline: nearestDate
      };
    });
    
    // Trier par priorité (Rouge en premier, puis Orange, puis Vert)
    const order = { 'Rouge': 1, 'Orange': 2, 'Vert': 3 };
    dossiersAvecPriorite.sort((a, b) => order[a.priority] - order[b.priority]);
    
    res.json({ success: true, data: dossiersAvecPriorite });
    
  } catch (error) {
    console.error('Error fetching urgent cases:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors du calcul des priorités.' });
  }
};

module.exports = {
  getUrgentCases
};
