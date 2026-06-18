/**
 * memoryService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Système de mémoire de dossier — 100% LOCAL (aucune API externe)
 *
 *   - Résumé algorithmique (statistiques + extraction de phrases clés)
 *   - Extraction d'entités par regex (dates, montants, noms)
 *   - Historique des conversations RAG
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { pool } = require('../db/dbConfig');

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIALISATION DES TABLES
// ─────────────────────────────────────────────────────────────────────────────
async function initMemoryTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dossier_memory (
      id                SERIAL PRIMARY KEY,
      dossier_id        INTEGER UNIQUE NOT NULL,
      resume_global     TEXT,
      entites           JSONB DEFAULT '{}',
      documents_comptes INTEGER DEFAULT 0,
      updated_at        TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rag_conversations (
      id          SERIAL PRIMARY KEY,
      dossier_id  INTEGER NOT NULL,
      user_id     INTEGER,
      question    TEXT NOT NULL,
      reponse     TEXT,
      citations   JSONB DEFAULT '[]',
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('[Memory] Tables initialisées.');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXTRACTION D'ENTITÉS PAR REGEX (100% local)
// ─────────────────────────────────────────────────────────────────────────────

/** Extrait les dates du texte (formats courants marocains/français) */
function extractDates(text) {
  const patterns = [
    /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g,                    // 01/01/2024, 01-01-2024
    /\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/gi,
    /\d{1,2}\s+(?:jan|fév|mar|avr|mai|jun|jul|aoû|sep|oct|nov|déc)\.?\s+\d{4}/gi,
  ];

  const dates = new Set();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) matches.forEach(m => dates.add(m.trim()));
  });
  return Array.from(dates).slice(0, 15);
}

/** Extrait les montants financiers */
function extractMontants(text) {
  const patterns = [
    /[\d\s.,]+\s*(?:MAD|DH|dirhams?|dhs?)/gi,
    /[\d\s.,]+\s*(?:EUR|€|euros?)/gi,
    /[\d\s.,]+\s*(?:USD|\$|dollars?)/gi,
    /(?:montant|somme|prix|coût|total|facture)\s*(?:de|:)?\s*[\d\s.,]+/gi,
  ];

  const montants = new Set();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) matches.forEach(m => montants.add(m.trim()));
  });
  return Array.from(montants).slice(0, 10);
}

/** Extrait les noms de personnes et organisations (heuristiques) */
function extractParties(text) {
  const patterns = [
    /(?:M\.|Mme|Mr|Mrs|Maître|Me|Dr)\s+[A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){0,3}/g,
    /(?:Société|Sté|SARL|SA|SAS|EURL)\s+[A-ZÀ-Ü][\w\s&]+/g,
    /(?:demandeur|défendeur|plaignant|accusé|partie\s+\w+)\s*[:]\s*([^\n,;]+)/gi,
    /(?:entre|contre|versus|vs\.?)\s+([A-ZÀ-Ü][\w\s]+?)(?:\s+et\s+)/gi,
  ];

  const parties = new Set();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) matches.forEach(m => parties.add(m.trim()));
  });
  return Array.from(parties).slice(0, 10);
}

/** Détecte le type d'affaire */
function detectTypeAffaire(text) {
  const lower = text.toLowerCase();
  const types = [
    { keywords: ['pénal', 'infraction', 'crime', 'délit', 'peine', 'prison'], type: 'Pénal' },
    { keywords: ['civil', 'contrat', 'obligation', 'responsabilité civile'], type: 'Civil' },
    { keywords: ['commercial', 'société', 'faillite', 'commerce'], type: 'Commercial' },
    { keywords: ['travail', 'licenciement', 'employeur', 'salarié', 'cnss'], type: 'Droit du travail' },
    { keywords: ['famille', 'divorce', 'pension', 'garde', 'mariage'], type: 'Droit de la famille' },
    { keywords: ['immobilier', 'bail', 'loyer', 'propriété', 'foncier'], type: 'Immobilier' },
    { keywords: ['administratif', 'état', 'administration', 'permis'], type: 'Administratif' },
    { keywords: ['fiscal', 'impôt', 'taxe', 'tva'], type: 'Fiscal' },
  ];

  let bestType = 'Non classifié';
  let bestScore = 0;

  types.forEach(({ keywords, type }) => {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestType  = type;
    }
  });

  return bestType;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GÉNÉRER LE RÉSUMÉ D'UN DOSSIER (100% local — algorithmique)
// ─────────────────────────────────────────────────────────────────────────────
async function generateDossierSummary(dossierId) {
  // Récupérer tous les chunks du dossier
  const chunksResult = await pool.query(
    `SELECT contenu, nom_document, page_numero
     FROM rag_chunks
     WHERE dossier_id = $1
     ORDER BY created_at ASC`,
    [dossierId]
  );

  if (chunksResult.rows.length === 0) {
    return {
      resume_global: 'Aucun document ingéré pour ce dossier.',
      entites: {},
      documents_comptes: 0,
    };
  }

  // Concaténer tout le texte
  const allText = chunksResult.rows.map(r => r.contenu).join('\n');
  const uniqueDocs = [...new Set(chunksResult.rows.map(r => r.nom_document))];

  // Extraction d'entités
  const dates    = extractDates(allText);
  const montants = extractMontants(allText);
  const parties  = extractParties(allText);
  const typeAffaire = detectTypeAffaire(allText);

  const entites = {
    parties_impliquees: parties,
    dates_cles: dates,
    montants: montants,
    type_affaire: typeAffaire,
    documents: uniqueDocs,
  };

  // Résumé automatique : premières phrases significatives de chaque document
  const summaryParts = [];
  summaryParts.push(`Ce dossier contient ${uniqueDocs.length} document(s) : ${uniqueDocs.join(', ')}.`);
  summaryParts.push(`Type d'affaire détecté : ${typeAffaire}.`);

  if (parties.length > 0) {
    summaryParts.push(`Parties identifiées : ${parties.slice(0, 5).join(', ')}.`);
  }
  if (montants.length > 0) {
    summaryParts.push(`Montants mentionnés : ${montants.slice(0, 3).join(', ')}.`);
  }
  if (dates.length > 0) {
    summaryParts.push(`Dates importantes : ${dates.slice(0, 5).join(', ')}.`);
  }

  // Ajouter les 2 premières phrases de chaque document
  uniqueDocs.forEach(docName => {
    const docChunks = chunksResult.rows.filter(r => r.nom_document === docName);
    if (docChunks.length > 0) {
      const firstChunk = docChunks[0].contenu;
      const sentences  = firstChunk.split(/[.!?]+/).filter(s => s.trim().length > 30);
      if (sentences.length > 0) {
        summaryParts.push(`\n📄 ${docName} : ${sentences[0].trim()}.`);
      }
    }
  });

  const resume_global = summaryParts.join('\n');

  return { resume_global, entites, documents_comptes: uniqueDocs.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. METTRE À JOUR LA MÉMOIRE (appelé après chaque ingestion)
// ─────────────────────────────────────────────────────────────────────────────
async function updateDossierMemory(dossierId) {
  try {
    const { resume_global, entites, documents_comptes } = await generateDossierSummary(dossierId);

    await pool.query(
      `INSERT INTO dossier_memory (dossier_id, resume_global, entites, documents_comptes, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (dossier_id)
       DO UPDATE SET
         resume_global     = EXCLUDED.resume_global,
         entites           = EXCLUDED.entites,
         documents_comptes = EXCLUDED.documents_comptes,
         updated_at        = NOW()`,
      [dossierId, resume_global, JSON.stringify(entites), documents_comptes]
    );

    console.log(`[Memory] ✅ Résumé dossier #${dossierId} mis à jour (${documents_comptes} docs).`);
    return { resume_global, entites, documents_comptes };
  } catch (err) {
    console.error('[Memory] Erreur mise à jour résumé:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RÉCUPÉRER LE RÉSUMÉ
// ─────────────────────────────────────────────────────────────────────────────
async function getDossierSummary(dossierId) {
  const result = await pool.query(
    `SELECT * FROM dossier_memory WHERE dossier_id = $1`,
    [dossierId]
  );

  if (result.rows.length === 0) {
    const hasChunks = await pool.query(
      `SELECT COUNT(*) AS cnt FROM rag_chunks WHERE dossier_id = $1`,
      [dossierId]
    );

    if (parseInt(hasChunks.rows[0].cnt) === 0) return null;
    return await updateDossierMemory(dossierId);
  }

  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HISTORIQUE DES CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────
async function saveConversation({ dossierId, userId, question, reponse, citations }) {
  const result = await pool.query(
    `INSERT INTO rag_conversations (dossier_id, user_id, question, reponse, citations)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [dossierId, userId || null, question, reponse, JSON.stringify(citations || [])]
  );
  return result.rows[0].id;
}

async function getConversationHistory(dossierId, limit = 20) {
  const result = await pool.query(
    `SELECT id, question, reponse, citations, created_at
     FROM rag_conversations
     WHERE dossier_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [dossierId, limit]
  );
  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  initMemoryTables,
  updateDossierMemory,
  getDossierSummary,
  saveConversation,
  getConversationHistory,
};
