if (typeof global.DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof global.ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof global.Path2D === 'undefined') { global.Path2D = class Path2D {}; }

const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const { pool } = require('../db/dbConfig');
const { analyzeDocument } = require('../services/localAnalyzer');

// ─────────────────────────────────────────────────────────────────────────────
// Extraction de texte hybride
// ─────────────────────────────────────────────────────────────────────────────
function cleanText(raw = '') {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}

async function extractText(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  const isPdf = mimetype === 'application/pdf' || ext === '.pdf';
  const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx';

  if (isDocx) {
    try {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value.trim();
    } catch (err) {
      console.error('[docx-parse-error]', err);
    }
  }

  if (isPdf) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const parsedPdf = await pdfParse(fileBuffer);
      const extractedText = parsedPdf.text?.trim() || '';

      if (extractedText.replace(/\s/g, '').length > 150) {
        console.log('⚡ Extraction rapide via pdf-parse réussie.');
        return cleanText(extractedText);
      }
    } catch (err) {
      console.warn('⚠️ pdf-parse a échoué, repli vers OCR en cours...', err.message);
    }

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

    for (const page of pages.slice(0, 4)) {
      const imgPath = page.path;
      if (!imgPath || !fs.existsSync(imgPath)) continue;
      
      const { data } = await Tesseract.recognize(imgPath, 'fra+ara+eng', { logger: () => {} });
      fullText += (data.text || '') + '\n';
      
      try { fs.unlinkSync(imgPath); } catch {}
    }
    
    return cleanText(fullText);
  }

  console.log("🖼️ Fichier Image détecté. Lancement d'OCR Tesseract.");
  const { data } = await Tesseract.recognize(filePath, 'fra+ara+eng', { logger: () => {} });
  return cleanText(data.text || '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadAndAnalyze = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
  }

  const filePath = req.file.path;
  const mimetype = req.file.mimetype;
  const caseId = req.body.case_id || null;

  try {
    const rawText = await extractText(filePath, mimetype);

    if (rawText.replace(/\s/g, '').length < 20) {
      return res.status(422).json({ success: false, message: 'Texte extrait insuffisant.' });
    }

    const extractedData = analyzeDocument(rawText);

    const query = `
      INSERT INTO document_ocr (
        case_id, original_name, mimetype, file_size, ocr_text, langue, type_document,
        resume, parties, dates_extraites, montants_extraits, mots_cles, niveau_urgence,
        juridiction, timeline, faits_principaux, delais_legaux, chars_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `;

    const values = [
      caseId, req.file.originalname, mimetype, req.file.size, rawText,
      extractedData.langue, extractedData.type_document, extractedData.resume,
      JSON.stringify(extractedData.parties || {}),
      JSON.stringify(extractedData.dates || []),
      JSON.stringify(extractedData.montants || []),
      JSON.stringify(extractedData.mots_cles || []),
      extractedData.niveau_urgence,
      extractedData.juridiction,
      JSON.stringify(extractedData.timeline || []),
      JSON.stringify(extractedData.faits_principaux || []),
      JSON.stringify(extractedData.delais_legaux || []),
      rawText.length
    ];

    const result = await pool.query(query, values);
    const newId = result.rows[0].id;

    res.json({
      success: true,
      data: {
        id: newId,
        langue: extractedData.langue,
        texte_ocr: rawText,
        extracted: extractedData,
        model: 'Moteur Analytique Local (Déterministe)',
        chars: rawText.length,
      }
    });

  } catch (err) {
    console.error('[ocr/extract-error]', err);
    res.status(500).json({ success: false, message: "Erreur lors de l'analyse OCR." });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
};

exports.getHistory = async (req, res) => {
  try {
    const caseId = req.query.case_id;
    let query = `
      SELECT o.*, c.title as case_title
      FROM document_ocr o
      LEFT JOIN cases c ON o.case_id = c.id
    `;
    const params = [];

    if (caseId) {
      query += ` WHERE o.case_id = $1`;
      params.push(caseId);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[ocr/getHistory]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT o.*, c.title as case_title
      FROM document_ocr o
      LEFT JOIN cases c ON o.case_id = c.id
      WHERE o.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[ocr/getOne]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM document_ocr WHERE id = $1', [id]);
    res.json({ success: true, message: 'Document supprimé.' });
  } catch (err) {
    console.error('[ocr/deleteOne]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.getCasesForSelect = async (req, res) => {
  try {
    const query = `
      SELECT id, title, type, client_name 
      FROM cases 
      WHERE deleted_at IS NULL 
      ORDER BY title
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[ocr/getCasesForSelect]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
