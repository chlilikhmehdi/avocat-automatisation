// Polyfills pour pdf-parse dans l'environnement Node.js
if (typeof global.DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof global.ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof global.Path2D === 'undefined') { global.Path2D = class Path2D {}; }

const fs           = require('fs');
const path         = require('path');
const Tesseract    = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const mammoth      = require('mammoth');
const pdfParse     = require('pdf-parse');

const { analyzeDocument } = require('../services/localAnalyzer');

// ─────────────────────────────────────────────────────────────────────────────
// Messages d'erreur bilingues
// ─────────────────────────────────────────────────────────────────────────────
function errorMessages(lang) {
  if (lang === 'ar') {
    return {
      EMPTY_TEXT:             'النص المستخرج غير كافٍ. تحقق من جودة الملف.',
      NO_FILE:                'لم يُستلم أي ملف.',
      PARSE_ERROR:            'حدث خطأ أثناء تحليل المستند.',
    };
  }
  return {
    EMPTY_TEXT:             'Texte extrait insuffisant. Vérifiez la qualité du fichier.',
    NO_FILE:                'Aucun fichier reçu.',
    PARSE_ERROR:            'Une erreur est survenue lors de l\'analyse du document.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction de texte hybride (Digital PDF → pdf-parse / Scanned PDF & Image → OCR Tesseract)
// ─────────────────────────────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  const isPdf = mimetype === 'application/pdf' || ext === '.pdf';
  const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx';

  // 1. Gestion des fichiers Word (DOCX)
  if (isDocx) {
    try {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value.trim();
    } catch (err) {
      console.error('[docx-parse-error]', err);
    }
  }

  // 2. Gestion des fichiers PDF
  if (isPdf) {
    try {
      // Tenter d'abord une extraction rapide du texte numérique intégré
      const fileBuffer = fs.readFileSync(filePath);
      const parsedPdf = await pdfParse(fileBuffer);
      const extractedText = parsedPdf.text?.trim() || '';

      // Si le PDF est un PDF de texte numérique et qu'il contient suffisamment de caractères,
      // on évite l'OCR qui prend plusieurs secondes.
      if (extractedText.replace(/\s/g, '').length > 150) {
        console.log('⚡ Extraction rapide via pdf-parse réussie.');
        return cleanText(extractedText);
      }
    } catch (err) {
      console.warn('⚠️ pdf-parse a échoué, repli vers OCR en cours...', err.message);
    }

    // Si pdf-parse a donné un texte vide ou a échoué (c'est probablement un PDF scanné / image)
    // On fait un rendu en images de chaque page puis on applique l'OCR Tesseract
    console.log('📷 PDF scanné détecté. Lancement du convertisseur pdf2pic + OCR Tesseract.');
    const outputDir = path.dirname(filePath);
    const baseName  = path.basename(filePath, ext);

    const converter = fromPath(filePath, {
      density: 150,
      saveFilename: baseName,
      savePath: outputDir,
      format: 'png',
      width: 1240,
      height: 1754,
    });

    const pages = await converter.bulk(-1, { responseType: 'image' });
    let fullText = '';

    // Limiter l'OCR aux 4 premières pages pour préserver la mémoire et la vitesse en environnement de démo
    for (const page of pages.slice(0, 4)) {
      const imgPath = page.path;
      if (!imgPath || !fs.existsSync(imgPath)) continue;
      
      const { data } = await Tesseract.recognize(imgPath, 'fra+ara+eng', { logger: () => {} });
      fullText += (data.text || '') + '\n';
      
      // Supprimer l'image temporaire générée
      try { fs.unlinkSync(imgPath); } catch {}
    }
    
    return cleanText(fullText);
  }

  // 3. Gestion directe des images (PNG, JPG, TIFF...)
  console.log('🖼️ Fichier Image détecté. Lancement d\'OCR Tesseract.');
  const { data } = await Tesseract.recognize(filePath, 'fra+ara+eng', { logger: () => {} });
  return cleanText(data.text || '');
}

/**
 * Nettoyage rudimentaire du texte pour enlever les bruits de l'OCR
 */
function cleanText(raw = '') {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrôleur principal : POST /api/documents/extract
// ─────────────────────────────────────────────────────────────────────────────
exports.extractDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: errorMessages('fr').NO_FILE });
  }

  const filePath = req.file.path;
  const mimetype = req.file.mimetype;

  try {
    console.log(`📂 Fichier reçu pour analyse locale : ${req.file.originalname} (${mimetype})`);

    // 1. Extraction du texte brut (hybride)
    const rawText = await extractText(filePath, mimetype);

    // 2. Détection de langue préliminaire pour les messages
    const lang = rawText.match(/[\u0600-\u06FF]/g)?.length / rawText.replace(/\s/g, '').length > 0.2 ? 'ar' : 'fr';
    const ERR = errorMessages(lang);

    if (rawText.replace(/\s/g, '').length < 20) {
      return res.status(422).json({ success: false, message: ERR.EMPTY_TEXT });
    }

    // 3. Analyse déterministe locale du document (Type, Résumé, Entités, Urgence, Timeline...)
    const extractedData = analyzeDocument(rawText);

    console.log(`✅ Analyse complétée avec succès. Langue: ${extractedData.langue}, Type: ${extractedData.type_document}, Urgence: ${extractedData.niveau_urgence}`);

    // 4. Réponse JSON structurée compatible avec le frontend
    return res.json({
      success: true,
      data: {
        langue:    extractedData.langue,
        texte_ocr: rawText,
        extracted: extractedData,
        model:     'Moteur Analytique Local (Déterministe)',
        chars:     rawText.length,
      },
    });

  } catch (err) {
    console.error('[document/extract-error]', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || errorMessages('fr').PARSE_ERROR 
    });

  } finally {
    // Toujours supprimer le fichier uploadé temporairement
    try { fs.unlinkSync(filePath); } catch {}
  }
};