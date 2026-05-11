// controllers/ai.controller.js
const fs           = require('fs');
const path         = require('path');
const Tesseract    = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const axios        = require('axios');

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// ── Détection de langue ───────────────────────────────────────────────────────
// Arabe si >20% des caractères (hors espaces) sont arabes
function detectLanguage(text) {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const total       = text.replace(/\s/g, '').length;
  return total > 0 && arabicChars / total > 0.2 ? 'ar' : 'fr';
}

// ── Prompt bilingue ───────────────────────────────────────────────────────────
function buildSummaryPrompt(text, lang) {
  const truncated = text.slice(0, 3000);

  if (lang === 'ar') {
    return `أنت محلل قانوني متخصص. لخّص هذه الوثيقة القانونية باللغة العربية في 5 نقاط رئيسية كحد أقصى. كن موجزاً ودقيقاً.

الوثيقة:
${truncated}

الملخص:`;
  }

  return `Tu es un analyste juridique expert. Résume ce document juridique en français en 5 points clés maximum. Sois concis et précis.

Document :
${truncated}

Résumé :`;
}

// ── Ollama ────────────────────────────────────────────────────────────────────
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

// ── Extraction texte ──────────────────────────────────────────────────────────
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

    for (const page of pages.slice(0, 3)) {
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

// ── Messages d'erreur bilingues ───────────────────────────────────────────────
function errorMessages(lang) {
  if (lang === 'ar') {
    return {
      OLLAMA_DOWN:            'Ollama غير متاح. شغّل: ollama serve',
      OLLAMA_TIMEOUT:         `انتهت المهلة. جرّب نموذجاً أخف: ollama pull llama3.2:1b`,
      OLLAMA_MODEL_NOT_FOUND: `النموذج "${OLLAMA_MODEL}" غير موجود. شغّل: ollama pull ${OLLAMA_MODEL}`,
      EMPTY_TEXT:             'النص المستخرج غير كافٍ. تحقق من جودة الملف.',
      NO_FILE:                'لم يُستلم أي ملف.',
    };
  }
  return {
    OLLAMA_DOWN:            'Ollama indisponible. Lancez : ollama serve',
    OLLAMA_TIMEOUT:         `Timeout dépassé. Essayez un modèle plus léger : ollama pull llama3.2:1b`,
    OLLAMA_MODEL_NOT_FOUND: `Modèle "${OLLAMA_MODEL}" introuvable. Lancez : ollama pull ${OLLAMA_MODEL}`,
    EMPTY_TEXT:             'Texte extrait insuffisant. Vérifiez la qualité du fichier.',
    NO_FILE:                'Aucun fichier reçu.',
  };
}

// ── Controller : POST /api/ai/analyze ─────────────────────────────────────────
exports.analyzeDocument = async (req, res) => {
  if (!req.file) {
    // Langue inconnue à ce stade → français par défaut
    return res.status(400).json({ success: false, message: errorMessages('fr').NO_FILE });
  }

  const filePath = req.file.path;
  const mimetype = req.file.mimetype;

  try {
    // 1. OCR
    const extractedText = await extractText(filePath, mimetype);

    // 2. Détection langue (AVANT tout le reste)
    const lang = detectLanguage(extractedText);
    const ERR  = errorMessages(lang);

    if (extractedText.length < 20) {
      return res.status(422).json({ success: false, message: ERR.EMPTY_TEXT });
    }

    // 3. Résumé dans la langue détectée
    const prompt  = buildSummaryPrompt(extractedText, lang);
    const summary = await callOllama(prompt);

    return res.json({
      success: true,
      data: {
        text:    extractedText,
        summary: summary || (lang === 'ar' ? 'لم يُولَّد أي ملخص.' : 'Aucun résumé généré.'),
        chars:   extractedText.length,
        model:   OLLAMA_MODEL,
        lang,                   // exposé au frontend pour adapter l'UI si besoin
      },
    });

  } catch (err) {
    console.error('[ai/analyze]', err.message);

    // Langue de secours pour les erreurs système (avant OCR)
    const lang = 'fr';
    const ERR  = errorMessages(lang);
    const msg  = ERR[err.message] || err.message || 'Erreur serveur.';
    const status = ['OLLAMA_DOWN', 'OLLAMA_TIMEOUT', 'OLLAMA_MODEL_NOT_FOUND'].includes(err.message)
      ? 503 : 500;

    return res.status(status).json({ success: false, message: msg });

  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
};