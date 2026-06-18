/**
 * ragService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service RAG 100% LOCAL — Aucune API externe requise
 *
 *   • Embeddings locaux    → @xenova/transformers (all-MiniLM-L6-v2)
 *   • Hybrid Search        → Vector (pgvector cosine) + Keyword (ILIKE)
 *   • Reranking            → Score combiné RRF + densité mots-clés
 *   • Génération réponse   → Extraction intelligente (pas de LLM)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs       = require('fs');
const path     = require('path');
const pdfParse = require('pdf-parse');
const { pool } = require('../db/dbConfig');

// ── Configuration ─────────────────────────────────────────────────────────────
const CHUNK_SIZE      = 800;
const CHUNK_OVERLAP   = 150;
const TOP_K_VECTOR    = 8;
const TOP_K_KEYWORD   = 5;
const FINAL_TOP_K     = 5;
const EMBED_DIM       = 384;   // all-MiniLM-L6-v2 produit des vecteurs de 384 dimensions
const EMBED_MODEL     = 'Xenova/all-MiniLM-L6-v2';

// ── Singleton pipeline d'embeddings ──────────────────────────────────────────
let _embedPipeline = null;

async function getEmbeddingPipeline() {
  if (_embedPipeline) return _embedPipeline;

  console.log(`[RAG] ⏳ Chargement du modèle d'embeddings local "${EMBED_MODEL}"...`);
  console.log('[RAG]    (Premier chargement : ~30s, les suivants seront instantanés)');

  // @xenova/transformers est un module ESM → import dynamique
  const { pipeline } = await import('@xenova/transformers');
  _embedPipeline = await pipeline('feature-extraction', EMBED_MODEL);

  console.log('[RAG] ✅ Modèle d\'embeddings chargé avec succès (local, 0 API).');
  return _embedPipeline;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIALISATION DES TABLES (pgvector 384 dimensions)
// ─────────────────────────────────────────────────────────────────────────────
async function initTables() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rag_documents (
      id           SERIAL PRIMARY KEY,
      dossier_id   INTEGER NOT NULL,
      nom_document VARCHAR(255) NOT NULL,
      statut       VARCHAR(20) DEFAULT 'pending',
      uploaded_at  TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id           SERIAL PRIMARY KEY,
      document_id  INTEGER REFERENCES rag_documents(id) ON DELETE CASCADE,
      dossier_id   INTEGER NOT NULL,
      nom_document VARCHAR(255),
      page_numero  INTEGER DEFAULT 1,
      contenu      TEXT NOT NULL,
      embedding    vector(${EMBED_DIM}),
      created_at   TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_rag_chunks_dossier ON rag_chunks(dossier_id);
  `);

  // L'index IVFFLAT nécessite des données, on le crée silencieusement
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
    ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);
  `).catch(() => {
    console.log('[RAG] Index vectoriel sera créé automatiquement après les premiers inserts.');
  });

  console.log('[RAG] Tables initialisées (vector dimension = ' + EMBED_DIM + ').');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/** Découpe un texte en chunks avec chevauchement */
function splitIntoChunks(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end).trim());
    start += size - overlap;
  }
  return chunks.filter(c => c.length >= 10);
}

/** Générer un embedding LOCAL via @xenova/transformers */
async function getEmbedding(text) {
  const pipe   = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/** Extraire le texte d'un PDF */
async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data   = await pdfParse(buffer);
  return { fullText: data.text, numPages: data.numpages };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INGESTION
// ─────────────────────────────────────────────────────────────────────────────
async function ingestDocument({ filePath, dossierId, nomDocument }) {
  const docResult = await pool.query(
    `INSERT INTO rag_documents (dossier_id, nom_document, statut)
     VALUES ($1, $2, 'processing') RETURNING id`,
    [dossierId, nomDocument]
  );
  const documentId = docResult.rows[0].id;

  try {
    // Extraire le texte
    const ext = path.extname(filePath).toLowerCase();
    let fullText = '';
    let numPages = 1;

    if (ext === '.pdf') {
      const extracted = await extractPdfText(filePath);
      fullText = extracted.fullText;
      numPages = extracted.numPages;
    } else if (ext === '.txt') {
      fullText = fs.readFileSync(filePath, 'utf8');
    } else {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      fullText = result.value;
    }

    // Chunking
    const chunks = splitIntoChunks(fullText);
    console.log(`[RAG] Document "${nomDocument}" → ${chunks.length} chunks`);

    // Embedding + insertion
    const charsPerPage = fullText.length / numPages;

    for (let i = 0; i < chunks.length; i++) {
      const chunk     = chunks[i];
      const position  = fullText.indexOf(chunk);
      const pageNum   = charsPerPage > 0 ? Math.ceil((position + 1) / charsPerPage) : 1;

      console.log(`[RAG]   Embedding chunk ${i + 1}/${chunks.length}...`);
      const embedding = await getEmbedding(chunk);
      const vectorStr = `[${embedding.join(',')}]`;

      await pool.query(
        `INSERT INTO rag_chunks (document_id, dossier_id, nom_document, page_numero, contenu, embedding)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [documentId, dossierId, nomDocument, pageNum, chunk, vectorStr]
      );
    }

    await pool.query(
      `UPDATE rag_documents SET statut = 'completed' WHERE id = $1`,
      [documentId]
    );

    return { success: true, documentId, chunksCount: chunks.length };

  } catch (err) {
    await pool.query(
      `UPDATE rag_documents SET statut = 'error' WHERE id = $1`,
      [documentId]
    );
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HYBRID SEARCH (Vector + Keyword, fusionnés par RRF)
// ─────────────────────────────────────────────────────────────────────────────
async function hybridSearch(question, dossierId) {
  const queryEmbedding = await getEmbedding(question);
  const vectorStr      = `[${queryEmbedding.join(',')}]`;

  // 4A. Recherche vectorielle (cosine similarity)
  const vectorResult = await pool.query(
    `SELECT id, nom_document, page_numero, contenu,
            1 - (embedding <=> $1::vector) AS score_vecteur
     FROM rag_chunks
     WHERE dossier_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorStr, dossierId, TOP_K_VECTOR]
  );

  // 4B. Recherche par mots-clés (ILIKE)
  const keywords = question
    .split(/\s+/)
    .filter(w => w.length > 3)
    .map(w => w.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, ''));

  let keywordRows = [];
  if (keywords.length > 0) {
    const conditions = keywords.map((_, i) => `contenu ILIKE $${i + 3}`).join(' OR ');
    const params     = [dossierId, TOP_K_KEYWORD, ...keywords.map(k => `%${k}%`)];

    const keywordResult = await pool.query(
      `SELECT id, nom_document, page_numero, contenu, 0.5 AS score_vecteur
       FROM rag_chunks
       WHERE dossier_id = $1 AND (${conditions})
       LIMIT $2`,
      params
    );
    keywordRows = keywordResult.rows;
  }

  // 4C. Fusion RRF (Reciprocal Rank Fusion)
  const K_RRF  = 60;
  const merged = new Map();

  vectorResult.rows.forEach((row, rank) => {
    merged.set(row.id, {
      ...row,
      score_vecteur: parseFloat(row.score_vecteur),
      rrf_score: 1 / (K_RRF + rank + 1),
      source_types: ['vector'],
    });
  });

  keywordRows.forEach((row, rank) => {
    const existing = merged.get(row.id);
    const rrfBoost = 1 / (K_RRF + rank + 1);
    if (existing) {
      existing.rrf_score += rrfBoost;
      existing.source_types.push('keyword');
    } else {
      merged.set(row.id, {
        ...row, score_vecteur: 0,
        rrf_score: rrfBoost,
        source_types: ['keyword'],
      });
    }
  });

  return Array.from(merged.values()).sort((a, b) => b.rrf_score - a.rrf_score);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RERANKING
// ─────────────────────────────────────────────────────────────────────────────
function rerankChunks(chunks, question) {
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const scored = chunks.map(chunk => {
    const contentLower  = chunk.contenu.toLowerCase();
    const keywordHits   = questionWords.reduce((acc, word) => {
      const matches = contentLower.match(new RegExp(word, 'gi'));
      return acc + (matches ? matches.length : 0);
    }, 0);
    const keywordDensity = keywordHits / (chunk.contenu.split(' ').length || 1);
    const finalScore     = (chunk.rrf_score * 0.7) + (keywordDensity * 0.3);
    return { ...chunk, keyword_density: keywordDensity, final_score: finalScore };
  });

  return scored.sort((a, b) => b.final_score - a.final_score).slice(0, FINAL_TOP_K);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GÉNÉRATION DE RÉPONSE — 100% LOCAL (extractive, sans LLM)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait les phrases les plus pertinentes des chunks récupérés.
 * C'est du "Extractive QA" : on sélectionne et formate les meilleurs passages
 * au lieu de générer du texte avec un LLM.
 */
function generateExtractiveAnswer(topChunks, question) {
  if (topChunks.length === 0) {
    return "Aucun document pertinent trouvé dans ce dossier.";
  }

  const questionWords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Pour chaque chunk, scorer chaque phrase
  const allSentences = [];

  topChunks.forEach((chunk, chunkIdx) => {
    // Découper en phrases
    const sentences = chunk.contenu
      .split(/[.!?;\n]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 5);

    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      const hits  = questionWords.filter(w => lower.includes(w)).length;
      const score = hits / (questionWords.length || 1);

      allSentences.push({
        text:         sentence,
        score,
        source_index: chunkIdx + 1,
        nom_document: chunk.nom_document,
        page_numero:  chunk.page_numero,
      });
    });
  });

  // Trier par pertinence et garder les meilleures
  allSentences.sort((a, b) => b.score - a.score);
  const bestSentences = allSentences.slice(0, 8);

  if (bestSentences.length === 0) {
    // Fallback : retourner les premiers passages
    const fallback = topChunks
      .slice(0, 3)
      .map((c, i) => `[Source ${i + 1} — ${c.nom_document}, p.${c.page_numero}]\n${c.contenu.slice(0, 300)}`)
      .join('\n\n');
    return `Voici les passages les plus pertinents trouvés dans le dossier :\n\n${fallback}`;
  }

  // Construire la réponse
  const parts = [];
  parts.push(`D'après les documents du dossier, voici les informations pertinentes :\n`);

  // Regrouper par source
  const bySource = {};
  bestSentences.forEach(s => {
    const key = `${s.nom_document}|${s.page_numero}`;
    if (!bySource[key]) bySource[key] = { ...s, sentences: [] };
    bySource[key].sentences.push(s.text);
  });

  Object.values(bySource).forEach(source => {
    parts.push(`📄 ${source.nom_document} (page ${source.page_numero}) :`);
    source.sentences.forEach(s => {
      parts.push(`  • ${s}.`);
    });
    parts.push('');
  });

  parts.push(`\n📌 ${topChunks.length} source(s) analysée(s) au total.`);

  return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. POINT D'ENTRÉE RAG
// ─────────────────────────────────────────────────────────────────────────────
async function queryRag({ dossierId, question }) {
  // Hybrid Search
  const allChunks = await hybridSearch(question, dossierId);
  if (allChunks.length === 0) {
    return {
      answer: "Aucun document trouvé dans ce dossier. Veuillez d'abord ingérer des documents.",
      citations: [],
    };
  }

  // Reranking
  const topChunks = rerankChunks(allChunks, question);

  // Génération extractive (100% local)
  const answer = generateExtractiveAnswer(topChunks, question);

  // Citations structurées
  const citations = topChunks.map((chunk, i) => ({
    source_index:     i + 1,
    nom_document:     chunk.nom_document,
    page_numero:      chunk.page_numero,
    extrait:          chunk.contenu.slice(0, 300) + (chunk.contenu.length > 300 ? '...' : ''),
    score_pertinence: parseFloat(chunk.final_score?.toFixed(4) || 0),
    type_recherche:   chunk.source_types,
  }));

  return { answer, citations };
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  initTables,
  getEmbedding,
  ingestDocument,
  hybridSearch,
  rerankChunks,
  queryRag,
};
