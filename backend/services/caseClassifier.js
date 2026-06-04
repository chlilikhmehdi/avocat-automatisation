/**
 * services/caseClassifier.js
 *
 * Moteur de classification automatique des dossiers — 100% NLP local.
 * Aucune IA externe, aucune dépendance npm supplémentaire.
 *
 * Pipeline :
 *   1. collectCaseData()      → récupère toutes les données SQL du dossier
 *   2. scoreCredit()          → score "dossier crédit" par règles + mots-clés
 *   3. scoreImpaye()          → score "impayé" par analyse paiements + factures
 *   4. scoreSoldeDebiteur()   → score "solde débiteur" par calcul financier
 *   5. classifyCase()         → choisit le type avec le score le plus élevé
 *   6. generateSuggestions()  → liste de suggestions juridiques contextuelles
 *   7. assessUrgency()        → niveau d'urgence basé sur données réelles
 *   8. classify()             → orchestrateur principal
 */

const { pool } = require('../db/dbConfig');

// ═══════════════════════════════════════════════════════════════════════════
// DICTIONNAIRES NLP — mots-clés par type de dossier
// ═══════════════════════════════════════════════════════════════════════════

const KEYWORDS = {
  credit: {
    fr: ['crédit','prêt','emprunt','financement','mensualité','taux','intérêt',
         'remboursement','capital','amortissement','hypothèque','nantissement',
         'organisme de crédit','établissement bancaire','contrat de crédit',
         'crédit immobilier','crédit à la consommation','accord de prêt'],
    ar: ['قرض','تمويل','بنك','تسديد','فائدة','رأس المال','رهن'],
    weight: 10,
  },
  impaye: {
    fr: ['impayé','non payé','défaut de paiement','retard de paiement',
         'facture impayée','somme due','reste à payer','arriéré',
         'recouvrement','mise en demeure','relance','chèque sans provision',
         'incident de paiement','contentieux','créance impayée','dette'],
    ar: ['عدم الدفع','متأخرات','ديون','استرداد','إنذار','دين'],
    weight: 10,
  },
  solde_debiteur: {
    fr: ['solde débiteur','découvert','débit','position débitrice',
         'solde négatif','compte débiteur','dépassement','autorisation de découvert',
         'agios','frais bancaires','commission','solde du compte'],
    ar: ['رصيد مدين','سحب على المكشوف','حساب مدين','عجز'],
    weight: 10,
  },
};

// Verbes d'action juridique par type
const ACTION_KEYWORDS = {
  credit:          ['rembourser','honorer','restructurer','rééchelonner','saisir'],
  impaye:          ['recouvrer','poursuivre','saisir','assigner','réclamer','mettre en demeure'],
  solde_debiteur:  ['régulariser','approvisionner','couvrir','compenser'],
};

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 1 — Collecter toutes les données SQL du dossier
// ═══════════════════════════════════════════════════════════════════════════

async function collectCaseData(caseId) {
  // Requête principale : dossier + ses relations
  const [caseRow, historyRows, invoiceRows, paymentRows, hearingRows, deadlineRows] =
    await Promise.all([

      // 1. Données du dossier
      pool.query(`
        SELECT c.*, u.nom AS lawyer_name, o.name AS org_name
        FROM cases c
        LEFT JOIN users u ON u.id = c.lawyer_id
        LEFT JOIN organizations o ON o.id = c.organization_id
        WHERE c.id = $1
      `, [caseId]),

      // 2. Historique des actions
      pool.query(`
        SELECT action, created_at FROM case_history
        WHERE case_id = $1 ORDER BY created_at DESC LIMIT 30
      `, [caseId]),

      // 3. Factures liées
      pool.query(`
        SELECT * FROM invoices WHERE case_id = $1 ORDER BY due_date DESC
      `, [caseId]).catch(() => ({ rows: [] })),  // tolère si case_id absent dans invoices

      // 4. Paiements
      pool.query(`
        SELECT p.* FROM payments p
        JOIN invoices i ON i.id = p.invoice_id
        WHERE i.case_id = $1
      `, [caseId]).catch(() => ({ rows: [] })),

      // 5. Audiences
      pool.query(`
        SELECT * FROM hearings WHERE case_id = $1 ORDER BY hearing_date ASC
      `, [caseId]).catch(() => ({ rows: [] })),

      // 6. Délais légaux
      pool.query(`
        SELECT * FROM legal_deadlines WHERE case_id = $1 ORDER BY deadline_date ASC
      `, [caseId]).catch(() => ({ rows: [] })),
    ]);

  const caseData = caseRow.rows[0];
  if (!caseData) throw new Error('DOSSIER_INTROUVABLE');

  return {
    case:      caseData,
    history:   historyRows.rows,
    invoices:  invoiceRows.rows,
    payments:  paymentRows.rows,
    hearings:  hearingRows.rows,
    deadlines: deadlineRows.rows,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 2-4 — Fonctions de scoring par type
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcule un score NLP basé sur la présence de mots-clés dans un texte
 */
function nlpScore(text, keywords, weight) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score   = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += weight;
  }
  return score;
}

/**
 * Score "Crédit"
 * Basé sur : titre + historique + type existant + présence de factures crédit
 */
function scoreCredit(data) {
  let score   = 0;
  const reasons = [];
  const kws   = [...KEYWORDS.credit.fr, ...KEYWORDS.credit.ar];

  // NLP sur le titre du dossier
  const titleScore = nlpScore(data.case.title, kws, 10);
  if (titleScore > 0) { score += titleScore; reasons.push(`Titre : mots-clés crédit (${titleScore}pts)`); }

  // NLP sur l'historique des actions
  const histText = data.history.map(h => h.action).join(' ');
  const histScore = nlpScore(histText, kws, 3);
  if (histScore > 0) { score += histScore; reasons.push(`Historique : mentions crédit (${histScore}pts)`); }

  // Type existant dans la table (si déjà classifié manuellement)
  if (data.case.type?.toLowerCase().includes('crédit') ||
      data.case.type?.toLowerCase().includes('credit')) {
    score += 30; reasons.push('Type dossier = crédit');
  }

  // Présence de factures avec montants d'amortissement
  if (data.invoices.length > 0) {
    score += 5; reasons.push(`${data.invoices.length} facture(s) liée(s)`);
  }

  return { score, reasons };
}

/**
 * Score "Impayé"
 * Basé sur : factures impayées + ratio paiement + mots-clés + historique retards
 */
function scoreImpaye(data) {
  let score   = 0;
  const reasons = [];
  const kws   = [...KEYWORDS.impaye.fr, ...KEYWORDS.impaye.ar];

  // NLP titre + historique
  const titleScore = nlpScore(data.case.title, kws, 10);
  if (titleScore > 0) { score += titleScore; reasons.push(`Titre : mots-clés impayé (${titleScore}pts)`); }

  const histText  = data.history.map(h => h.action).join(' ');
  const histScore = nlpScore(histText, kws, 4);
  if (histScore > 0) { score += histScore; reasons.push(`Historique : mentions impayé (${histScore}pts)`); }

  // Analyse financière des factures
  const unpaidInvoices = data.invoices.filter(inv =>
    inv.invoice_status === 'impayée' ||
    inv.invoice_status === 'en_attente' ||
    (inv.amount_due && inv.amount_paid < inv.amount_due)
  );

  if (unpaidInvoices.length > 0) {
    const pts = unpaidInvoices.length * 15;
    score += pts;
    reasons.push(`${unpaidInvoices.length} facture(s) impayée(s) (+${pts}pts)`);
  }

  // Factures en retard (due_date dépassée)
  const today   = new Date();
  const overdueInvoices = data.invoices.filter(inv =>
    inv.due_date && new Date(inv.due_date) < today &&
    inv.invoice_status !== 'soldée'
  );
  if (overdueInvoices.length > 0) {
    const pts = overdueInvoices.length * 20;
    score += pts;
    const oldest = overdueInvoices.sort((a,b) => new Date(a.due_date) - new Date(b.due_date))[0];
    const days   = Math.floor((today - new Date(oldest.due_date)) / 86400000);
    reasons.push(`${overdueInvoices.length} facture(s) en retard (${days} jours max) (+${pts}pts)`);
  }

  // Peu ou pas de paiements
  if (data.invoices.length > 0 && data.payments.length === 0) {
    score += 15; reasons.push('Aucun paiement enregistré (+15pts)');
  }

  return { score, reasons };
}

/**
 * Score "Solde débiteur"
 * Basé sur : calcul du solde (total factures - total paiements) + mots-clés
 */
function scoreSoldeDebiteur(data) {
  let score   = 0;
  const reasons = [];
  const kws   = [...KEYWORDS.solde_debiteur.fr, ...KEYWORDS.solde_debiteur.ar];

  // NLP
  const titleScore = nlpScore(data.case.title, kws, 10);
  if (titleScore > 0) { score += titleScore; reasons.push(`Titre : mots-clés solde débiteur (${titleScore}pts)`); }

  const histText  = data.history.map(h => h.action).join(' ');
  const histScore = nlpScore(histText, kws, 4);
  if (histScore > 0) { score += histScore; reasons.push(`Historique : solde débiteur (${histScore}pts)`); }

  // Calcul du solde réel
  const totalDue  = data.invoices.reduce((s, i) => s + parseFloat(i.amount_due  || 0), 0);
  const totalPaid = data.payments.reduce((s, p) => s + parseFloat(p.amount      || 0), 0);
  const solde     = totalDue - totalPaid;

  if (solde > 0) {
    let pts = 0;
    if (solde > 100000) pts = 40;
    else if (solde > 50000) pts = 30;
    else if (solde > 10000) pts = 20;
    else pts = 10;
    score += pts;
    reasons.push(`Solde débiteur calculé : ${solde.toLocaleString('fr-MA')} MAD (+${pts}pts)`);
  }

  // Paiements partiels (signe d'un solde débiteur)
  const partialInvoices = data.invoices.filter(inv =>
    inv.invoice_status === 'partiellement_payée' ||
    (parseFloat(inv.amount_paid || 0) > 0 && parseFloat(inv.amount_paid || 0) < parseFloat(inv.amount_due || 0))
  );
  if (partialInvoices.length > 0) {
    const pts = partialInvoices.length * 10;
    score += pts;
    reasons.push(`${partialInvoices.length} paiement(s) partiel(s) (+${pts}pts)`);
  }

  return { score, reasons, computed_balance: totalDue - totalPaid };
}

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 5 — Classification finale
// ═══════════════════════════════════════════════════════════════════════════

function classifyCase(creditResult, impayeResult, soldeResult) {
  const scores = [
    { type: 'credit',          label: 'Crédit',          ...creditResult },
    { type: 'impaye',          label: 'Impayé',           ...impayeResult },
    { type: 'solde_debiteur',  label: 'Solde Débiteur',   ...soldeResult  },
  ];

  scores.sort((a, b) => b.score - a.score);

  const winner    = scores[0];
  const total     = scores.reduce((s, x) => s + x.score, 0);
  const confidence = total > 0 ? Math.min(100, Math.round((winner.score / total) * 100)) : 0;

  return {
    type:        winner.score > 0 ? winner.type : 'autre',
    label:       winner.score > 0 ? winner.label : 'Non classifié',
    score:       winner.score,
    confidence,
    all_scores:  scores.map(s => ({ type: s.type, label: s.label, score: s.score })),
    reasons:     winner.reasons || [],
    computed_balance: soldeResult.computed_balance || 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 6 — Suggestions juridiques contextuelles
// ═══════════════════════════════════════════════════════════════════════════

function generateSuggestions(classification, data) {
  const suggestions = [];
  const type        = classification.type;
  const today       = new Date();

  // ── Suggestions par type ──────────────────────────────────────────────────

  if (type === 'credit') {
    suggestions.push({
      priority: 'HAUTE',
      action:   'Envoyer une mise en demeure de remboursement',
      detail:   'Mettre en demeure le débiteur de rembourser les mensualités impayées dans un délai de 15 jours.',
    });
    suggestions.push({
      priority: 'NORMALE',
      action:   'Vérifier la validité du contrat de crédit',
      detail:   'S\'assurer que le contrat respecte la réglementation Bank Al-Maghrib et les conditions TAEG.',
    });
    suggestions.push({
      priority: 'NORMALE',
      action:   'Examiner les garanties (hypothèque / nantissement)',
      detail:   'Vérifier si des garanties réelles ont été constituées et évaluer leur réalisation.',
    });
  }

  if (type === 'impaye') {
    suggestions.push({
      priority: 'CRITIQUE',
      action:   'Émettre une mise en demeure formelle immédiate',
      detail:   'Mettre en demeure le débiteur par courrier recommandé AR dans les 48h.',
    });
    suggestions.push({
      priority: 'HAUTE',
      action:   'Engager une procédure de recouvrement judiciaire',
      detail:   'Saisir le tribunal compétent pour une injonction de payer (art. 155 CPC marocain).',
    });
    suggestions.push({
      priority: 'NORMALE',
      action:   'Négocier un échéancier de paiement',
      detail:   'Proposer un plan d\'apurement amiable avant d\'engager une procédure contentieuse.',
    });

    // Factures très en retard → urgence saisie
    const overdueInvoices = data.invoices.filter(inv => {
      if (!inv.due_date) return false;
      const days = (today - new Date(inv.due_date)) / 86400000;
      return days > 90;
    });
    if (overdueInvoices.length > 0) {
      suggestions.push({
        priority: 'CRITIQUE',
        action:   'Procédure de saisie-arrêt recommandée',
        detail:   `${overdueInvoices.length} facture(s) ont plus de 90 jours de retard. Envisager une saisie-arrêt sur les comptes bancaires du débiteur.`,
      });
    }
  }

  if (type === 'solde_debiteur') {
    const balance = classification.computed_balance;
    suggestions.push({
      priority: balance > 50000 ? 'CRITIQUE' : 'HAUTE',
      action:   `Recouvrer le solde débiteur de ${balance.toLocaleString('fr-MA')} MAD`,
      detail:   'Initier une procédure de recouvrement du solde comptable débiteur.',
    });
    suggestions.push({
      priority: 'HAUTE',
      action:   'Demander un arrêté de compte officiel',
      detail:   'Obtenir un arrêté de compte certifié de l\'établissement bancaire pour établir le montant exact.',
    });
    suggestions.push({
      priority: 'NORMALE',
      action:   'Vérifier la prescription de la créance',
      detail:   'S\'assurer que la créance n\'est pas prescrite (délai général de 5 ans en droit commercial marocain).',
    });
  }

  // ── Suggestions communes selon les données ────────────────────────────────

  // Pas d'audience planifiée
  const futureHearings = data.hearings.filter(h =>
    h.hearing_date && new Date(h.hearing_date) > today
  );
  if (futureHearings.length === 0 && data.case.status !== 'clôturé') {
    suggestions.push({
      priority: 'NORMALE',
      action:   'Planifier une audience ou une réunion de conciliation',
      detail:   'Aucune audience n\'est planifiée. Envisager une médiation ou une assignation.',
    });
  }

  // Dossier sans activité récente
  if (data.history.length > 0) {
    const lastAction = new Date(data.history[0].created_at);
    const daysSince  = (today - lastAction) / 86400000;
    if (daysSince > 30) {
      suggestions.push({
        priority: 'NORMALE',
        action:   `Relancer le dossier (inactif depuis ${Math.floor(daysSince)} jours)`,
        detail:   'Ce dossier n\'a enregistré aucune action depuis plus d\'un mois.',
      });
    }
  }

  // Délais légaux proches
  const urgentDeadlines = data.deadlines.filter(d => {
    if (!d.deadline_date) return false;
    const days = (new Date(d.deadline_date) - today) / 86400000;
    return days >= 0 && days < 15;
  });
  if (urgentDeadlines.length > 0) {
    suggestions.push({
      priority: 'CRITIQUE',
      action:   `Respecter ${urgentDeadlines.length} délai(s) légal(aux) dans les 15 prochains jours`,
      detail:   urgentDeadlines.map(d => d.description || d.deadline_date).join(', '),
    });
  }

  // Trier par priorité
  const order = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
}

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 7 — Niveau d'urgence global du dossier
// ═══════════════════════════════════════════════════════════════════════════

function assessUrgency(data, classification, suggestions) {
  const today    = new Date();
  let urgency    = 'BASSE';
  const reasons  = [];

  // Délais imminents (< 7 jours)
  const criticalDeadlines = data.deadlines.filter(d => {
    const days = d.deadline_date
      ? (new Date(d.deadline_date) - today) / 86400000 : Infinity;
    return days >= 0 && days < 7;
  });
  if (criticalDeadlines.length) {
    urgency = 'CRITIQUE';
    reasons.push(`${criticalDeadlines.length} délai(s) dans moins de 7 jours`);
  }

  // Factures très en retard
  const overdueMax = data.invoices.reduce((max, inv) => {
    if (!inv.due_date || inv.invoice_status === 'soldée') return max;
    const days = (today - new Date(inv.due_date)) / 86400000;
    return Math.max(max, days);
  }, 0);

  if (overdueMax > 90 && urgency !== 'CRITIQUE') {
    urgency = 'CRITIQUE';
    reasons.push(`Facture en retard de ${Math.floor(overdueMax)} jours`);
  } else if (overdueMax > 30 && urgency === 'BASSE') {
    urgency = 'HAUTE';
    reasons.push(`Facture en retard de ${Math.floor(overdueMax)} jours`);
  }

  // Suggestions CRITIQUE → élève le niveau
  const critSuggestions = suggestions.filter(s => s.priority === 'CRITIQUE');
  if (critSuggestions.length > 0 && urgency === 'BASSE') {
    urgency = 'HAUTE';
    reasons.push(`${critSuggestions.length} action(s) critique(s) recommandée(s)`);
  }

  // Solde débiteur élevé
  if (classification.computed_balance > 100000 && urgency === 'BASSE') {
    urgency = 'HAUTE';
    reasons.push(`Solde débiteur élevé : ${classification.computed_balance.toLocaleString('fr-MA')} MAD`);
  }

  if (reasons.length === 0) {
    urgency = 'NORMALE';
    reasons.push('Aucune urgence immédiate détectée');
  }

  const COLORS = { CRITIQUE:'#dc2626', HAUTE:'#ea580c', NORMALE:'#ca8a04', BASSE:'#16a34a' };
  return { level: urgency, color: COLORS[urgency], reasons };
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * classify(caseId)
 * @param {number} caseId
 * @returns {object} résultat complet de la classification
 */
async function classify(caseId) {
  // 1. Collecte des données SQL
  const data = await collectCaseData(caseId);

  // 2. Scoring par type
  const creditResult = scoreCredit(data);
  const impayeResult = scoreImpaye(data);
  const soldeResult  = scoreSoldeDebiteur(data);

  // 3. Classification
  const classification = classifyCase(creditResult, impayeResult, soldeResult);

  // 4. Suggestions
  const suggestions = generateSuggestions(classification, data);

  // 5. Urgence
  const urgency = assessUrgency(data, classification, suggestions);

  // 6. Résumé financier
  const totalDue   = data.invoices.reduce((s, i) => s + parseFloat(i.amount_due || 0), 0);
  const totalPaid  = data.payments.reduce((s, p) => s + parseFloat(p.amount    || 0), 0);

  return {
    case_id:        caseId,
    case_title:     data.case.title,
    client_name:    data.case.client_name,
    classified_at:  new Date().toISOString(),

    classification,
    urgency,
    suggestions,

    financial_summary: {
      total_invoices: data.invoices.length,
      total_payments: data.payments.length,
      total_due:      totalDue,
      total_paid:     totalPaid,
      balance:        totalDue - totalPaid,
    },

    data_counts: {
      history_entries: data.history.length,
      hearings:        data.hearings.length,
      deadlines:       data.deadlines.length,
    },
  };
}

module.exports = { classify, collectCaseData, generateSuggestions };