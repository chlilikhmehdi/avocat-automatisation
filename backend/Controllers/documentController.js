/**
 * controllers/documentController.js
 *
 * Endpoints couverts :
 *   GET    /api/documents              → liste paginée + filtres
 *   GET    /api/documents/stats        → stats agrégées
 *   PATCH  /api/documents/:id/rename   → renommer (display_name seulement)
 *   PATCH  /api/documents/:id/category → changer la catégorie
 *   DELETE /api/documents/:id          → supprimer fichier + ligne DB
 *   POST   /api/documents/:id/summarize→ résumé IA (pdf-parse / tesseract / OpenAI)
 *
 * Dépendances :
 *   npm install pdf-parse tesseract.js openai
 *
 * Variables d'environnement :
 *   OPENAI_API_KEY=sk-...
 */

const path     = require('path');
const fs       = require('fs');
const { pool } = require('../db/dbConfig');   // ← adapte si ton fichier a un autre nom

// ── Lazy-load libs IA (pas d'erreur au démarrage si non installées) ───────────
let pdfParse, Tesseract, openaiClient;

try {
  pdfParse = require('pdf-parse');
} catch {
  pdfParse = null;
}

try {
  Tesseract = require('tesseract.js');
} catch {
  Tesseract = null;
}
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
try {
  const { OpenAI } = require('openai');
  if (OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  } else {
    openaiClient = null;
  }
} catch {
  openaiClient = null;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'contrat',
  'piece_justificative',
  'jugement',
  'pv',
  'cin',
  'courrier',
  'autre',
];

const OPENAI_MODEL   = 'gpt-4o-mini';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en ms
const MAX_TEXT_CHARS = 6000;                 // limite envoyée à OpenAI

// ── Helper réponse ─────────────────────────────────────────────────────────────
const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

// ── Helper : vérifier ownership ────────────────────────────────────────────────
async function getOwnedDoc(docId, lawyerId) {
  const { rows } = await pool.query(
    `SELECT cf.*, ca.lawyer_id, ca.title AS case_title
     FROM case_files cf
     JOIN cases ca ON ca.id = cf.case_id
     WHERE cf.id = $1`,
    [docId]
  );
  const doc = rows[0];
  if (!doc)                       return { doc: null, err: 404 };
  if (doc.lawyer_id !== lawyerId) return { doc: null, err: 403 };
  return { doc, err: null };
}

// ── Helper : extraire le texte d'un fichier ────────────────────────────────────
async function extractText(filePath, mimetype) {
  const mime = (mimetype || '').toLowerCase();

  // PDF
  if (mime.includes('pdf')) {
    if (!pdfParse) {
      throw new Error('DEPENDENCY_MISSING:pdf-parse');
    }
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }

  // Image → OCR
  if (mime.includes('image')) {
    if (!Tesseract) {
      throw new Error('DEPENDENCY_MISSING:tesseract.js');
    }
    const { data } = await Tesseract.recognize(filePath, 'fra+ara+eng', {
      logger: () => {}, // silence les logs de progression
    });
    return data.text || '';
  }

  // Fichier texte brut (.txt, .md, .csv…)
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error('UNSUPPORTED_TYPE');
  }
}

// =============================================================================
// LISTE DES DOCUMENTS
// =============================================================================
exports.listDocuments = async (req, res) => {
  const { case_id, search, category, page = 1, limit = 20 } = req.query;
  const lawyerId = req.user.id;
  const orgId    = req.user.organization_id;
  const offset   = (parseInt(page) - 1) * parseInt(limit);

  let conditions = [
    'ca.lawyer_id = $1',
    'ca.organization_id = $2',
    'ca.deleted_at IS NULL',
  ];
  let params = [lawyerId, orgId];
  let idx    = 3;

  if (case_id) {
    conditions.push(`cf.case_id = $${idx++}`);
    params.push(parseInt(case_id));
  }
  if (search) {
    conditions.push(`COALESCE(cf.display_name, cf.original_name) ILIKE $${idx++}`);
    params.push(`%${search}%`);
  }
  if (category && CATEGORIES.includes(category)) {
    conditions.push(`cf.category = $${idx++}`);
    params.push(category);
  }

  const where = conditions.join(' AND ');

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)
       FROM case_files cf
       JOIN cases ca ON ca.id = cf.case_id
       WHERE ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT
         cf.*,
         COALESCE(cf.display_name, cf.original_name) AS name,
         ca.title AS case_title,
         u.nom    AS uploader_name
       FROM case_files cf
       JOIN cases ca ON ca.id = cf.case_id
       LEFT JOIN users u ON u.id = cf.uploaded_by
       WHERE ${where}
       ORDER BY cf.uploaded_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    return ok(res, 200, {
      data: rows,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[documents/list]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// STATS
// =============================================================================
exports.getStats = async (req, res) => {
  const { id: lawyerId, organization_id: orgId } = req.user;

  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int                    AS total,
         COALESCE(SUM(cf.size), 0)::bigint AS total_size,
         COUNT(*) FILTER (WHERE cf.mimetype ILIKE '%pdf%')::int                                  AS pdf_count,
         COUNT(*) FILTER (WHERE cf.mimetype ILIKE '%word%' OR cf.mimetype ILIKE '%document%')::int AS word_count,
         COUNT(*) FILTER (WHERE cf.mimetype ILIKE '%image%')::int                                AS image_count,
         COUNT(*) FILTER (WHERE cf.ai_summary IS NOT NULL)::int                                  AS summarized_count
       FROM case_files cf
       JOIN cases ca ON ca.id = cf.case_id
       WHERE ca.lawyer_id = $1
         AND ca.organization_id = $2
         AND ca.deleted_at IS NULL`,
      [lawyerId, orgId]
    );

    return ok(res, 200, { data: rows[0] });
  } catch (err) {
    console.error('[documents/stats]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// SUPPRIMER
// =============================================================================
exports.deleteDocument = async (req, res) => {
  const { doc, err } = await getOwnedDoc(req.params.id, req.user.id);
  if (err === 404) return ok(res, 404, {}, 'Document introuvable');
  if (err === 403) return ok(res, 403, {}, 'Accès refusé');

  try {
    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '..', 'uploads', doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM case_files WHERE id = $1', [req.params.id]);
    return ok(res, 200, {}, 'Document supprimé');
  } catch (err) {
    console.error('[documents/delete]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// RENOMMER (display_name uniquement — fichier physique intact)
// =============================================================================
exports.renameDocument = async (req, res) => {
  const { display_name } = req.body;

  if (!display_name?.trim()) {
    return ok(res, 400, {}, 'Nom invalide');
  }

  const { doc, err } = await getOwnedDoc(req.params.id, req.user.id);
  if (err === 404) return ok(res, 404, {}, 'Document introuvable');
  if (err === 403) return ok(res, 403, {}, 'Accès refusé');

  try {
    const { rows } = await pool.query(
      'UPDATE case_files SET display_name = $1 WHERE id = $2 RETURNING *',
      [display_name.trim(), req.params.id]
    );
    return ok(res, 200, { data: rows[0] }, 'Document renommé');
  } catch (err) {
    console.error('[documents/rename]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// CATÉGORIE
// =============================================================================
exports.setCategoryDoc = async (req, res) => {
  const { category } = req.body;

  if (!category || !CATEGORIES.includes(category)) {
    return ok(res, 400, {}, `Catégorie invalide. Valeurs autorisées : ${CATEGORIES.join(', ')}`);
  }

  const { doc, err } = await getOwnedDoc(req.params.id, req.user.id);
  if (err === 404) return ok(res, 404, {}, 'Document introuvable');
  if (err === 403) return ok(res, 403, {}, 'Accès refusé');

  try {
    const { rows } = await pool.query(
      'UPDATE case_files SET category = $1 WHERE id = $2 RETURNING *',
      [category, req.params.id]
    );
    return ok(res, 200, { data: rows[0] }, 'Catégorie mise à jour');
  } catch (err) {
    console.error('[documents/category]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// RÉSUMÉ IA  ←  LA NOUVELLE FONCTIONNALITÉ
// =============================================================================
exports.summarizeDoc = async (req, res) => {
  const { doc, err: ownerErr } = await getOwnedDoc(req.params.id, req.user.id);
  if (ownerErr === 404) return ok(res, 404, {}, 'Document introuvable');
  if (ownerErr === 403) return ok(res, 403, {}, 'Accès refusé');

  // ── Cache : si résumé < 24h → retourner directement ──────────────────────
  if (doc.ai_summary && doc.ai_summary_at) {
    const age = Date.now() - new Date(doc.ai_summary_at).getTime();
    if (age < CACHE_DURATION) {
      return ok(res, 200, {
        data: { summary: doc.ai_summary, cached: true, model: doc.ai_model },
      });
    }
  }

  // ── Vérifier que le fichier physique existe ───────────────────────────────
  const filePath = path.join(__dirname, '..', 'uploads', doc.filename);
  if (!fs.existsSync(filePath)) {
    return ok(res, 404, {}, 'Fichier physique introuvable sur le serveur');
  }

  // ── Vérifier OpenAI configuré ─────────────────────────────────────────────
  if (!OPENAI_API_KEY) {
    return ok(res, 503, {}, 'OpenAI non configuré: clé API manquante');
  }

  try {
    // ── Extraction du texte ─────────────────────────────────────────────────
    let rawText = '';
    try {
      rawText = await extractText(filePath, doc.mimetype);
    } catch (extractErr) {
      const msg = extractErr.message || '';
      if (msg.startsWith('DEPENDENCY_MISSING:')) {
        const lib = msg.split(':')[1];
        return ok(res, 503, {}, `Librairie manquante : npm install ${lib}`);
      }
      if (msg === 'UNSUPPORTED_TYPE') {
        return ok(res, 415, {}, 'Type de fichier non supporté (PDF, image, .txt uniquement)');
      }
      throw extractErr;
    }

    const text = rawText.trim();
    if (text.length < 30) {
      return ok(res, 422, {}, 'Le document ne contient pas assez de texte pour être résumé');
    }

    // ── Appel OpenAI ────────────────────────────────────────────────────────
    const systemPrompt = `Tu es un assistant juridique marocain expert.
Tu résumes des documents juridiques en français de manière claire, structurée et professionnelle.
Ton résumé identifie toujours :
- Les parties impliquées
- L'objet principal du document
- Les points clés et obligations
- Les dates importantes
- Les éventuels risques ou points d'attention

Limite le résumé à 250 mots maximum. Utilise des paragraphes courts.`;

    const userPrompt = `Voici le contenu du document à résumer :

---
${text.slice(0, MAX_TEXT_CHARS)}
---

Génère un résumé professionnel.`;

    const completion = await openaiClient.chat.completions.create({
      model:       OPENAI_MODEL,
      temperature: 0.3,
      max_tokens:  700,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    });

    const summary    = completion.choices[0].message.content.trim();
    const tokensUsed = completion.usage?.total_tokens ?? null;

    // ── Sauvegarde en DB ────────────────────────────────────────────────────
    await pool.query(
      `UPDATE case_files
       SET ai_summary = $1, ai_summary_at = NOW(), ai_model = $2, ai_tokens_used = $3
       WHERE id = $4`,
      [summary, OPENAI_MODEL, tokensUsed, req.params.id]
    );

    return ok(res, 200, {
      data: {
        summary,
        cached:      false,
        model:       OPENAI_MODEL,
        tokens_used: tokensUsed,
      },
    }, 'Résumé généré avec succès');

  } catch (err) {
    console.error('[documents/summarize]', err);

    // Erreurs OpenAI spécifiques
    if (err?.status === 401) return ok(res, 503, {}, 'Clé OpenAI invalide ou expirée');
    if (err?.status === 429) return ok(res, 429, {}, 'Quota OpenAI dépassé — réessayez plus tard');
    if (err?.status === 500) return ok(res, 502, {}, 'Erreur interne OpenAI — réessayez');

    return ok(res, 500, {}, 'Erreur lors de la génération du résumé');
  }
};