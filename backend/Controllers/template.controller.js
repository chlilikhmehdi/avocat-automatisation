const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { pool } = require('../db/dbConfig');

exports.uploadTemplate = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
  }

  const { name, description, type, tags } = req.body;
  const filePath = req.file.filename; // Just the filename, stored in uploads/
  const userId = req.user ? req.user.id : null;

  try {
    const query = `
      INSERT INTO document_templates (name, description, file_path, type, tags, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      name || req.file.originalname,
      description || '',
      filePath,
      type || 'general',
      tags ? tags : '[]',
      userId
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[template/upload-error]', err);
    res.status(500).json({ success: false, message: "Erreur lors de l'enregistrement du modèle." });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const query = `SELECT * FROM document_templates ORDER BY created_at DESC`;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[template/get-all-error]', err);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des modèles." });
  }
};

exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const fetchQuery = `SELECT file_path FROM document_templates WHERE id = $1`;
    const fetchResult = await pool.query(fetchQuery, [id]);

    if (fetchResult.rows.length > 0) {
      const fileName = fetchResult.rows[0].file_path;
      const fullPath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    const deleteQuery = `DELETE FROM document_templates WHERE id = $1`;
    await pool.query(deleteQuery, [id]);

    res.json({ success: true, message: "Modèle supprimé avec succès." });
  } catch (err) {
    console.error('[template/delete-error]', err);
    res.status(500).json({ success: false, message: "Erreur lors de la suppression du modèle." });
  }
};

exports.generateDocument = async (req, res) => {
  const { templateId, caseId, customData } = req.body;

  try {
    // 1. Fetch template
    const templateQuery = `SELECT file_path, name FROM document_templates WHERE id = $1`;
    const templateResult = await pool.query(templateQuery, [templateId]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Modèle introuvable.' });
    }
    
    const templateFileName = templateResult.rows[0].file_path;
    const templateName = templateResult.rows[0].name;
    const fullTemplatePath = path.join(__dirname, '..', 'uploads', templateFileName);

    if (!fs.existsSync(fullTemplatePath)) {
      return res.status(404).json({ success: false, message: 'Fichier modèle manquant sur le serveur.' });
    }

    // 2. Fetch case data
    let caseData = {};
    if (caseId) {
      const caseQuery = `
        SELECT c.*, cl.nom as client_nom, cl.email as client_email, cl.telephone as client_telephone
        FROM cases c
        LEFT JOIN users cl ON c.client_id = cl.id
        WHERE c.id = $1
      `;
      const caseResult = await pool.query(caseQuery, [caseId]);
      if (caseResult.rows.length > 0) {
        caseData = caseResult.rows[0];
      }
    }

    // 3. Prepare data for the template
    const data = {
      ...caseData,
      ...(customData || {}),
      date_jour: new Date().toLocaleDateString('fr-FR')
    };

    // 4. Generate DOCX
    const content = fs.readFileSync(fullTemplatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 5. Send file back
    const outputFileName = `Generated_${templateName}_${Date.now()}.docx`.replace(/\s+/g, '_');
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${outputFileName}"`,
      'Content-Length': buf.length,
    });
    
    res.send(buf);

  } catch (err) {
    console.error('[template/generate-error]', err);
    res.status(500).json({ success: false, message: "Erreur lors de la génération du document.", details: err.message });
  }
};
