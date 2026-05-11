// controllers/document.controller.js
const fs           = require('fs');
const path         = require('path');
const Tesseract    = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const axios        = require('axios');

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// ─────────────────────────────────────────────────────────────────────────────
// Détection de langue : arabe si >20% des caractères (hors espaces) sont arabes
// Partagée avec ai.controller → même algorithme, même seuil
// ─────────────────────────────────────────────────────────────────────────────
function detectLanguage(text) {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const total       = text.replace(/\s/g, '').length;
  return total > 0 && arabicChars / total > 0.2 ? 'ar' : 'fr';
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages d'erreur bilingues
// ─────────────────────────────────────────────────────────────────────────────
function errorMessages(lang) {
  if (lang === 'ar') {
    return {
      OLLAMA_DOWN:            'Ollama غير متاح. شغّل: ollama serve',
      OLLAMA_TIMEOUT:         'انتهت المهلة. جرّب نموذجاً أخف: ollama pull llama3.2:1b',
      OLLAMA_MODEL_NOT_FOUND: `النموذج "${OLLAMA_MODEL}" غير موجود. شغّل: ollama pull ${OLLAMA_MODEL}`,
      EMPTY_TEXT:             'النص المستخرج غير كافٍ. تحقق من جودة الملف.',
      NO_FILE:                'لم يُستلم أي ملف.',
    };
  }
  return {
    OLLAMA_DOWN:            'Ollama indisponible. Lancez : ollama serve',
    OLLAMA_TIMEOUT:         'Timeout dépassé. Essayez : ollama pull llama3.2:1b',
    OLLAMA_MODEL_NOT_FOUND: `Modèle "${OLLAMA_MODEL}" introuvable. Lancez : ollama pull ${OLLAMA_MODEL}`,
    EMPTY_TEXT:             'Texte extrait insuffisant. Vérifiez la qualité du fichier.',
    NO_FILE:                'Aucun fichier reçu.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt d'extraction JSON selon la langue détectée
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt(text, lang) {
  const truncated = text.slice(0, 4000);

  // Structure JSON identique dans les deux cas → parsing unifié
  const jsonStructure = `{
  "langue": "${lang}",
  "type_document": "...",
  "resume": "...",
  "parties": {
    "demandeur": "...",
    "defendeur": "..."
  },
  "dates": ["..."],
  "montants": ["..."],
  "faits_principaux": ["...", "..."],
  "delais_legaux": ["..."],
  "juridiction": "...",
  "mots_cles": ["..."]
}`;

  if (lang === 'ar') {
    return `أنت محلل قانوني متخصص. حلّل هذه الوثيقة القانونية وأرجع فقط كائن JSON صالح (بدون أي نص إضافي، بدون markdown، بدون backticks).
جميع القيم يجب أن تكون باللغة العربية.

الهيكل المطلوب:
${jsonStructure}

الوثيقة:
${truncated}

JSON:`;
  }

  return `Tu es un analyste juridique expert. Analyse ce document juridique et retourne UNIQUEMENT un objet JSON valide (sans texte autour, sans markdown, sans backticks).
Toutes les valeurs doivent être en français.

Structure attendue :
${jsonStructure}

Document :
${truncated}

JSON :`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback structuré quand le LLM ne retourne pas du JSON valide
// ─────────────────────────────────────────────────────────────────────────────
function fallbackExtracted(lang, rawOutput) {
  return {
    langue:           lang,
    type_document:    lang === 'ar' ? 'غير محدد' : 'Non déterminé',
    resume:           rawOutput,   // on expose quand même la sortie brute
    parties:          { demandeur: '—', defendeur: '—' },
    dates:            [],
    montants:         [],
    faits_principaux: [],
    delais_legaux:    [],
    juridiction:      '—',
    mots_cles:        [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser JSON robuste (retire les backticks markdown si le modèle en ajoute)
// ─────────────────────────────────────────────────────────────────────────────
function parseJson(raw) {
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────────────────────────────
// Appel Ollama
// ─────────────────────────────────────────────────────────────────────────────
async function callOllama(prompt) {
  try {
    const { data } = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: OLLAMA_MODEL, prompt, stream: false },
      { timeout: 300000 }
    );
    return data.response?.trim() || '';
  } catch (err) {
    if (err.code === 'ECONNREFUSED')                                   throw new Error('OLLAMA_DOWN');
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) throw new Error('OLLAMA_TIMEOUT');
    if (err.response?.status === 404)                                  throw new Error('OLLAMA_MODEL_NOT_FOUND');
    throw new Error(`OLLAMA_ERROR: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction texte PDF → images → Tesseract
// ─────────────────────────────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  const isPdf = mimetype === 'application/pdf'
    || path.extname(filePath).toLowerCase() === '.pdf';

  if (isPdf) {
    const outputDir = path.dirname(filePath);
    const baseName  = path.basename(filePath, path.extname(filePath));

    const converter = fromPath(filePath, {
      density: 150, saveFilename: baseName, savePath: outputDir,
      format: 'png', width: 1240, height: 1754,
    });

    const pages = await converter.bulk(-1, { responseType: 'image' });
    let fullText = '';

    for (const page of pages.slice(0, 4)) {
      const imgPath = page.path;
      if (!imgPath || !fs.existsSync(imgPath)) continue;
      const { data } = await Tesseract.recognize(imgPath, 'fra+ara+eng', { logger: () => {} });
      fullText += (data.text || '') + '\n';
      try { fs.unlinkSync(imgPath); } catch {}
    }
    return fullText.trim();
  }

  const { data } = await Tesseract.recognize(filePath, 'fra+ara+eng', { logger: () => {} });
  return data.text?.trim() || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller : POST /api/documents/extract
// ─────────────────────────────────────────────────────────────────────────────
exports.extractDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: errorMessages('fr').NO_FILE });
  }

  const filePath = req.file.path;
  const mimetype = req.file.mimetype;

  try {
    // 1. OCR
    const rawText = await extractText(filePath, mimetype);

    // 2. Détection langue (AVANT le prompt et AVANT les messages d'erreur utilisateur)
    const lang = detectLanguage(rawText);
    const ERR  = errorMessages(lang);

    if (rawText.length < 20) {
      return res.status(422).json({ success: false, message: ERR.EMPTY_TEXT });
    }

    // 3. Prompt + appel IA dans la langue détectée
    const prompt   = buildPrompt(rawText, lang);
    const aiOutput = await callOllama(prompt);

    // 4. Parse JSON — fallback si le modèle ne respecte pas le format
    let extracted;
    try {
      extracted = parseJson(aiOutput);
      // Forcer le champ langue au cas où le LLM l'aurait modifié
      extracted.langue = lang;
    } catch {
      extracted = fallbackExtracted(lang, aiOutput);
    }

    return res.json({
      success: true,
      data: {
        langue:    lang,
        texte_ocr: rawText,
        extracted,
        model:     OLLAMA_MODEL,
        chars:     rawText.length,
      },
    });

  } catch (err) {
    console.error('[document/extract]', err.message);

    // Pour les erreurs système (Ollama down, timeout…) la langue est inconnue
    // → on utilise 'fr' par défaut car l'erreur est technique, pas liée au doc
    const lang = 'fr';
    const ERR  = errorMessages(lang);
    const knownErrors = ['OLLAMA_DOWN', 'OLLAMA_TIMEOUT', 'OLLAMA_MODEL_NOT_FOUND'];
    const msg    = ERR[err.message] || err.message || 'Erreur serveur.';
    const status = knownErrors.includes(err.message) ? 503 : 500;

    return res.status(status).json({ success: false, message: msg });

  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
};