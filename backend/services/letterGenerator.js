/**
 * services/letterGenerator.js
 *
 * Génère des lettres juridiques personnalisées selon le type de dossier.
 * Technique : templates textuels + interpolation des données SQL.
 * Aucune IA externe — logique métier pure.
 *
 * Types de lettres :
 *   - mise_en_demeure_credit        → crédit non remboursé
 *   - mise_en_demeure_impaye        → facture impayée
 *   - mise_en_demeure_solde         → solde débiteur bancaire
 *   - relance_amiable               → première relance douce
 *   - convocation_conciliation      → tentative de conciliation
 *   - assignation_injonction_payer  → procédure judiciaire
 */

// ── Helpers de formatage ───────────────────────────────────────────────────────

const formatDate = (d) => {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleDateString('fr-MA', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };
  
  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return 'montant à préciser';
    return `${parseFloat(amount).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;
  };
  
  const upperCase = (str = '') => str.toUpperCase();
  
  // ── Données cabinet (remplacées par les vraies données de req.user) ────────────
  function getCabinetInfo(lawyer) {
    return {
      nom:         lawyer?.nom             || 'Maître [NOM AVOCAT]',
      barreau:     lawyer?.barreau         || 'Casablanca',
      cabinet:     lawyer?.organization    || 'Cabinet Juridique',
      adresse:     lawyer?.adresse         || '[ADRESSE DU CABINET]',
      telephone:   lawyer?.telephone       || '[TÉLÉPHONE]',
      email:       lawyer?.email           || '[EMAIL]',
      ice:         lawyer?.ice             || '[ICE]',
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES DES LETTRES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const TEMPLATES = {
  
    // ── 1. Mise en demeure — Crédit ──────────────────────────────────────────
    mise_en_demeure_credit: (vars) => `
  ${upperCase(vars.cabinet.cabinet)}
  ${vars.cabinet.adresse}
  Tél : ${vars.cabinet.telephone}
  Email : ${vars.cabinet.email}
  
  Casablanca, le ${formatDate()}
  
  LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
  
  À l'attention de :
  ${upperCase(vars.client_name)}
  [Adresse du débiteur]
  
  Objet : MISE EN DEMEURE — Remboursement de crédit — Réf. Dossier N° ${vars.case_id}
  
  Madame, Monsieur,
  
  Nous avons l'honneur de nous présenter en qualité d'avocat de ${vars.creditor || '[NOM DU CRÉANCIER]'}, ci-après désigné « notre client ».
  
  Nous avons été mandatés pour vous signifier la présente mise en demeure concernant le crédit contracté en votre nom pour un montant de ${formatMoney(vars.total_due)}.
  
  À ce jour, malgré les relances effectuées, votre compte présente un arriéré de remboursement d'un montant total de ${formatMoney(vars.balance)}, comprenant :
    - Capital restant dû : ${formatMoney(vars.capital_due || vars.balance)}
    - Intérêts de retard : à calculer selon le taux contractuel
  
  En conséquence, nous vous mettons en demeure de procéder au règlement intégral de la somme due de ${formatMoney(vars.balance)} dans un délai de QUINZE (15) JOURS à compter de la réception de la présente.
  
  À défaut de règlement dans ce délai, nous nous réservons le droit d'engager toute procédure judiciaire utile, notamment une procédure d'injonction de payer devant le Tribunal de Commerce compétent, aux frais et risques exclusifs de votre part.
  
  La présente lettre constitue la mise en demeure préalable obligatoire conformément aux articles 230 et suivants du Dahir formant Code des Obligations et Contrats (D.O.C.).
  
  Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.
  
  ${vars.cabinet.nom}
  Avocat inscrit au Barreau de ${vars.cabinet.barreau}
  `.trim(),
  
    // ── 2. Mise en demeure — Impayé ──────────────────────────────────────────
    mise_en_demeure_impaye: (vars) => `
  ${upperCase(vars.cabinet.cabinet)}
  ${vars.cabinet.adresse}
  Tél : ${vars.cabinet.telephone} | Email : ${vars.cabinet.email}
  
  Casablanca, le ${formatDate()}
  
  LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
  
  À l'attention de :
  ${upperCase(vars.client_name)}
  [Adresse du débiteur]
  
  Objet : MISE EN DEMEURE DE PAYER — Créances impayées — Dossier N° ${vars.case_id}
  
  Madame, Monsieur,
  
  Par la présente, et en notre qualité d'avocat mandaté par ${vars.creditor || 'notre client'}, nous vous mettons formellement en demeure de régler la totalité des créances impayées à votre charge.
  
  ÉTAT DES IMPAYÉS :
  ${vars.invoices_detail || `  - Montant total dû : ${formatMoney(vars.total_due)}\n  - Montant réglé    : ${formatMoney(vars.total_paid)}\n  - SOLDE IMPAYÉ     : ${formatMoney(vars.balance)}`}
  
  Malgré nos précédentes relances restées sans suite, vous n'avez pas honoré vos obligations de paiement, portant ainsi atteinte aux droits légitimes de notre mandant.
  
  Vous disposez d'un délai de DIX (10) JOURS à compter de la présente pour :
    1. Régler intégralement la somme de ${formatMoney(vars.balance)}, OU
    2. Nous contacter afin de convenir d'un plan d'apurement amiable.
  
  Passé ce délai sans règlement ni contact de votre part, nous engagerons sans autre avis une procédure judiciaire tendant notamment à :
    - Une injonction de payer (articles 155 et suivants du Code de Procédure Civile),
    - Une saisie-arrêt sur vos avoirs bancaires et/ou mobiliers,
    - Le recouvrement des frais et honoraires à votre charge.
  
  Veuillez agréer, Madame, Monsieur, nos salutations distinguées.
  
  ${vars.cabinet.nom}
  Avocat inscrit au Barreau de ${vars.cabinet.barreau}
  `.trim(),
  
    // ── 3. Mise en demeure — Solde Débiteur ──────────────────────────────────
    mise_en_demeure_solde: (vars) => `
  ${upperCase(vars.cabinet.cabinet)}
  ${vars.cabinet.adresse}
  Tél : ${vars.cabinet.telephone} | Email : ${vars.cabinet.email}
  
  Casablanca, le ${formatDate()}
  
  LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
  
  À l'attention de :
  ${upperCase(vars.client_name)}
  [Adresse du débiteur]
  
  Objet : MISE EN DEMEURE — Régularisation du solde débiteur — Dossier N° ${vars.case_id}
  
  Madame, Monsieur,
  
  Nous vous informons que nous avons été mandatés par ${vars.creditor || 'notre client'} pour procéder au recouvrement du solde débiteur de votre compte, arrêté à ce jour à la somme de ${formatMoney(vars.balance)}.
  
  SITUATION DU COMPTE AU ${formatDate()} :
    - Total des créances    : ${formatMoney(vars.total_due)}
    - Total des règlements  : ${formatMoney(vars.total_paid)}
    - SOLDE DÉBITEUR NET    : ${formatMoney(vars.balance)}
  
  Ce solde débiteur résulte ${vars.origin || 'du non-respect de vos engagements contractuels'}.
  
  Nous vous mettons en demeure de régulariser ce solde dans un délai de SEPT (7) JOURS à compter de la réception des présentes, par virement sur le compte bancaire dont les coordonnées vous seront communiquées sur simple demande.
  
  À défaut, nous procéderons à l'engagement de toutes poursuites judiciaires nécessaires, y compris une demande de saisie conservatoire, sans qu'il soit besoin d'autre mise en demeure préalable.
  
  Nous restons disponibles pour toute discussion amiable dans le délai imparti.
  
  Dans l'attente, veuillez agréer, Madame, Monsieur, nos salutations distinguées.
  
  ${vars.cabinet.nom}
  Avocat inscrit au Barreau de ${vars.cabinet.barreau}
  `.trim(),
  
    // ── 4. Relance amiable (première relance) ─────────────────────────────────
    relance_amiable: (vars) => `
  ${upperCase(vars.cabinet.cabinet)}
  ${vars.cabinet.adresse}
  Tél : ${vars.cabinet.telephone} | Email : ${vars.cabinet.email}
  
  Casablanca, le ${formatDate()}
  
  À l'attention de :
  ${upperCase(vars.client_name)}
  
  Objet : Rappel de règlement — Dossier N° ${vars.case_id}
  
  Madame, Monsieur,
  
  Nous nous permettons de vous rappeler qu'une somme de ${formatMoney(vars.balance)} demeure à ce jour impayée au bénéfice de notre client.
  
  Nous espérons qu'il s'agit d'un simple oubli et vous serions reconnaissants de bien vouloir régulariser cette situation dans les meilleurs délais, et au plus tard dans les DIX (10) prochains jours.
  
  Si vous rencontrez des difficultés passagères, nous vous invitons à nous contacter afin d'envisager ensemble une solution amiable adaptée à votre situation.
  
  Sans nouvelle de votre part dans le délai indiqué, nous serons dans l'obligation de procéder à des démarches plus formelles.
  
  En espérant une résolution rapide et amiable de ce dossier, nous vous adressons nos cordiales salutations.
  
  ${vars.cabinet.nom}
  Avocat inscrit au Barreau de ${vars.cabinet.barreau}
  `.trim(),
  
    // ── 5. Convocation à une réunion de conciliation ─────────────────────────
    convocation_conciliation: (vars) => `
  ${upperCase(vars.cabinet.cabinet)}
  ${vars.cabinet.adresse}
  Tél : ${vars.cabinet.telephone} | Email : ${vars.cabinet.email}
  
  Casablanca, le ${formatDate()}
  
  À l'attention de :
  ${upperCase(vars.client_name)}
  
  Objet : CONVOCATION — Réunion de conciliation — Dossier N° ${vars.case_id}
  
  Madame, Monsieur,
  
  Dans le cadre du litige relatif à la somme de ${formatMoney(vars.balance)} opposant notre client à votre personne, nous vous convoquons à une réunion de conciliation qui se tiendra :
  
    Date    : [DATE À PRÉCISER]
    Heure   : [HEURE À PRÉCISER]
    Lieu    : ${vars.cabinet.adresse}
  
  Nous vous rappelons que la conciliation préalable est une étape importante permettant d'éviter des procédures judiciaires longues et coûteuses pour les deux parties.
  
  Lors de cette réunion, vous pourrez être assisté de votre conseil juridique.
  
  Nous vous prions de bien vouloir confirmer votre présence par retour d'email ou par téléphone avant le [DATE LIMITE].
  
  À défaut de réponse, nous nous réserverons le droit d'engager une procédure contentieuse devant la juridiction compétente.
  
  Veuillez agréer, Madame, Monsieur, nos salutations distinguées.
  
  ${vars.cabinet.nom}
  Avocat inscrit au Barreau de ${vars.cabinet.barreau}
  `.trim(),
  
    // ── 6. Assignation — Injonction de payer ──────────────────────────────────
    assignation_injonction_payer: (vars) => `
  ${upperCase(vars.cabinet.cabinet)}
  ${vars.cabinet.adresse}
  Tél : ${vars.cabinet.telephone} | Email : ${vars.cabinet.email}
  
  Casablanca, le ${formatDate()}
  
  ASSIGNATION DEVANT LE TRIBUNAL DE COMMERCE DE [VILLE]
  (Requête en injonction de payer — Articles 155 et suivants du CPC)
  
  Le soussigné ${vars.cabinet.nom}, Avocat au Barreau de ${vars.cabinet.barreau},
  agissant au nom et pour le compte de [NOM DU CRÉANCIER],
  
  CONTRE :
  
  ${upperCase(vars.client_name)}, [Qualité : personne physique / morale]
  [Adresse complète]
  
  EXPOSE :
  
  1. Notre client a fourni à vos soins des prestations / biens / fonds pour un montant global de ${formatMoney(vars.total_due)}.
  
  2. Malgré les relances amiables et la mise en demeure en date du [DATE MED], vous n'avez pas réglé la somme due, de sorte que votre dette s'élève aujourd'hui à :
     - Principal dû        : ${formatMoney(vars.balance)}
     - Intérêts de retard  : à calculer au taux légal
     - Frais et honoraires : à votre charge
  
  3. Notre client justifie de sa créance par les pièces annexées (factures, contrats, relevés de compte, correspondances).
  
  EN CONSÉQUENCE,
  
  Il vous est demandé d'ordonner, par voie d'injonction de payer, à ${upperCase(vars.client_name)} de payer à notre client la somme de ${formatMoney(vars.balance)}, assortie des intérêts légaux et des dépens de la présente procédure.
  
  Pièces jointes :
    1. Copie des factures impayées
    2. Copie de la mise en demeure et de son accusé de réception
    3. Copie du contrat liant les parties
    4. Tout autre document probant
  
  ${vars.cabinet.nom}
  Avocat inscrit au Barreau de ${vars.cabinet.barreau}
  `.trim(),
  
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FONCTION PRINCIPALE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * generateLetter(letterType, classificationResult, lawyer)
   *
   * @param {string} letterType        clé du template
   * @param {object} classificationResult  résultat de caseClassifier.classify()
   * @param {object} lawyer            req.user (données de l'avocat connecté)
   * @returns {{ content: string, letter_type: string, generated_at: string }}
   */
  function generateLetter(letterType, classificationResult, lawyer = {}) {
    const template = TEMPLATES[letterType];
    if (!template) {
      throw new Error(`Type de lettre inconnu : ${letterType}. Types disponibles : ${Object.keys(TEMPLATES).join(', ')}`);
    }
  
    const fs  = classificationResult.financial_summary;
    const cab = getCabinetInfo(lawyer);
  
    // Variables passées au template
    const vars = {
      case_id:      classificationResult.case_id,
      client_name:  classificationResult.client_name,
      creditor:     lawyer?.nom || 'Notre Client',
      cabinet:      cab,
      total_due:    fs?.total_due   || 0,
      total_paid:   fs?.total_paid  || 0,
      balance:      fs?.balance     || 0,
  
      // Détail des factures en texte
      invoices_detail: null,  // généré ci-dessous si des données sont disponibles
    };
  
    return {
      content:       template(vars),
      letter_type:   letterType,
      generated_at:  new Date().toISOString(),
      case_id:       classificationResult.case_id,
    };
  }
  
  /**
   * getAvailableLetters(classificationType)
   * Retourne les types de lettres recommandés selon la classification
   */
  function getAvailableLetters(classificationType) {
    const BASE = [
      { type: 'relance_amiable', label: 'Relance amiable', priority: 'NORMALE', icon: '✉️' },
      { type: 'convocation_conciliation', label: 'Convocation conciliation', priority: 'NORMALE', icon: '🤝' },
    ];
  
    const BY_TYPE = {
      credit: [
        { type: 'mise_en_demeure_credit', label: 'Mise en demeure (crédit)', priority: 'HAUTE', icon: '⚠️' },
        { type: 'assignation_injonction_payer', label: 'Injonction de payer', priority: 'HAUTE', icon: '⚖️' },
      ],
      impaye: [
        { type: 'mise_en_demeure_impaye', label: 'Mise en demeure (impayé)', priority: 'CRITIQUE', icon: '🔴' },
        { type: 'assignation_injonction_payer', label: 'Injonction de payer', priority: 'HAUTE', icon: '⚖️' },
      ],
      solde_debiteur: [
        { type: 'mise_en_demeure_solde', label: 'Mise en demeure (solde débiteur)', priority: 'HAUTE', icon: '⚠️' },
        { type: 'assignation_injonction_payer', label: 'Injonction de payer', priority: 'HAUTE', icon: '⚖️' },
      ],
    };
  
    const specific = BY_TYPE[classificationType] || [];
    return [...specific, ...BASE];
  }
  
  module.exports = { generateLetter, getAvailableLetters, TEMPLATES };