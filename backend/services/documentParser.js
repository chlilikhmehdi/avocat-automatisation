const fs      = require('fs');
const path    = require('path');
const mammoth = require('mammoth');

let pdfParse, Tesseract;
try { pdfParse = require('pdf-parse'); } catch {}
try { Tesseract = require('tesseract.js'); } catch {}

const SUPPORTED = {
  'application/pdf':                                             'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword':                                          'docx',
  'image/jpeg': 'image', 'image/png': 'image', 'image/tiff': 'image',
  'text/plain': 'text',  'text/markdown': 'text',
};

async function extractText(filePath, mimetype) {
  const type = SUPPORTED[mimetype?.toLowerCase()];
  if (!type) throw Object.assign(new Error('UNSUPPORTED_TYPE'), { code: 415 });

  if (type === 'pdf') {
    if (!pdfParse) throw new Error('npm install pdf-parse');
    const { text } = await pdfParse(fs.readFileSync(filePath));
    return cleanText(text);
  }

  if (type === 'docx') {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return cleanText(value);
  }

  if (type === 'image') {
    if (!Tesseract) throw new Error('npm install tesseract.js');
    const { data } = await Tesseract.recognize(filePath, 'fra+ara+eng', { logger: () => {} });
    return cleanText(data.text);
  }

  return cleanText(fs.readFileSync(filePath, 'utf-8'));
}

function cleanText(raw = '') {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}

const DOC_TYPES = {
  contrat:    /contrat|convention|accord|clause|signataire/i,
  jugement:   /jugement|arrêt|tribunal|cour|audience|requête/i,
  facture:    /facture|montant|tva|prix|paiement|total/i,
  cin:        /carte nationale|cin|identité nationale/i,
  courrier:   /objet\s*:|madame|monsieur|cordialement|veuillez/i,
  pv:         /procès.verbal|pv\s+n°|séance|présents/i,
};

function classifyDocument(text) {
  for (const [type, regex] of Object.entries(DOC_TYPES)) {
    if (regex.test(text.slice(0, 2000))) return type;
  }
  return 'autre';
}

module.exports = { extractText, classifyDocument };