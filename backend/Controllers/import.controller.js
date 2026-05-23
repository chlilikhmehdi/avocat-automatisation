// controllers/import.controller.js
const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { pool } = require('../db/dbConfig');

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

// ─── Colonnes attendues dans l'Excel (insensible à la casse + trim) ───────────
const COLUMN_MAP = {
  nom:        ['nom', 'nom débiteur', 'debiteur', 'name', 'nom_debiteur'],
  montant:    ['montant', 'amount', 'solde', 'dette', 'montant_du'],
  telephone:  ['telephone', 'téléphone', 'tel', 'phone', 'mobile'],
  adresse:    ['adresse', 'address', 'adresse_debiteur'],
  reference:  ['reference', 'réf', 'ref', 'reference_dossier', 'numero_dossier', 'dossier'],
  date:       ['date', 'date_lmd', 'date_echeance', 'date_document'],
  cin:        ['cin', 'cni', 'identite', 'id_national'],
  email:      ['email', 'mail', 'e-mail'],
};

function resolveColumns(headers) {
  const map = {};
  headers.forEach((h, idx) => {
    const clean = String(h).toLowerCase().trim().replace(/\s+/g, '_');
    for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
      if (aliases.some(a => clean.includes(a) || a.includes(clean))) {
        if (!map[field]) map[field] = idx;
      }
    }
  });
  return map;
}

function parseRow(row, colMap, headers) {
  const get = (field) => {
    if (colMap[field] === undefined) return null;
    const val = row[headers[colMap[field]]];
    return val !== undefined && val !== null && val !== '' ? String(val).trim() : null;
  };

  return {
    nom:       get('nom'),
    montant:   parseFloat(get('montant')) || 0,
    telephone: get('telephone'),
    adresse:   get('adresse'),
    reference: get('reference'),
    date:      get('date') || new Date().toISOString().split('T')[0],
    cin:       get('cin'),
    email:     get('email'),
  };
}

// =============================================================================
// POST /api/import/lmd
// =============================================================================
exports.importLMD = async (req, res) => {
  if (!req.file) return ok(res, 400, {}, 'Fichier Excel requis');

  const lawyerId = req.user.id;
  const orgId    = req.user.organization_id;

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return ok(res, 422, {}, 'Le fichier Excel est vide');
    }

    const headers = Object.keys(rows[0]);
    const colMap  = resolveColumns(headers);

    const generated = [];
    const errors    = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = parseRow(rows[i], colMap, headers);

      // Validation minimale
      if (!raw.nom) {
        errors.push({ ligne: i + 2, raison: 'Nom débiteur manquant', data: rows[i] });
        continue;
      }
      if (!raw.montant || raw.montant <= 0) {
        errors.push({ ligne: i + 2, raison: 'Montant invalide ou nul', data: rows[i] });
        continue;
      }

      // Générer la LMD
      const lmd = {
        numero_lmd:    `LMD-${Date.now()}-${i + 1}`,
        lawyer_id:     lawyerId,
        organization_id: orgId,
        nom_debiteur:  raw.nom,
        montant:       raw.montant,
        telephone:     raw.telephone,
        adresse:       raw.adresse,
        reference:     raw.reference,
        date_lmd:      raw.date,
        cin:           raw.cin,
        email:         raw.email,
        statut:        'generated',
        source:        'import_excel',
      };

      // Insérer en base si la table existe
      try {
        const { rows: inserted } = await pool.query(
          `INSERT INTO lmd
             (numero_lmd, lawyer_id, organization_id, nom_debiteur, montant,
              telephone, adresse, reference_dossier, date_lmd, cin, email, statut, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (numero_lmd) DO NOTHING
           RETURNING *`,
          [lmd.numero_lmd, lmd.lawyer_id, lmd.organization_id, lmd.nom_debiteur,
           lmd.montant, lmd.telephone, lmd.adresse, lmd.reference, lmd.date_lmd,
           lmd.cin, lmd.email, lmd.statut, lmd.source]
        );
        generated.push(inserted[0] || lmd);
      } catch {
        // Si la table LMD n'existe pas encore, on retourne l'objet sans insertion
        generated.push(lmd);
      }
    }

    // Supprimer le fichier temporaire
    try { fs.unlinkSync(req.file.path); } catch {}

    return ok(res, 200, {
      data: {
        total_lignes:  rows.length,
        total_generes: generated.length,
        total_erreurs: errors.length,
        lmd:           generated,
        erreurs:       errors,
      },
    }, `${generated.length} LMD générées sur ${rows.length} lignes`);

  } catch (err) {
    console.error('[import/lmd]', err.message);
    try { fs.unlinkSync(req.file.path); } catch {}
    return ok(res, 500, {}, `Erreur lecture Excel : ${err.message}`);
  }
};

// =============================================================================
// POST /api/import/creances
// =============================================================================
exports.importCreances = async (req, res) => {
  if (!req.file) return ok(res, 400, {}, 'Fichier Excel requis');

  try {
    const workbook  = XLSX.readFile(req.file.path);
    const sheet     = workbook.Sheets[workbook.SheetNames[0]];
    const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return ok(res, 422, {}, 'Fichier vide');

    const headers = Object.keys(rows[0]);
    const colMap  = resolveColumns(headers);

    const creances = [];
    const errors   = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = parseRow(rows[i], colMap, headers);
      if (!raw.nom || !raw.montant) {
        errors.push({ ligne: i + 2, raison: 'Nom ou montant manquant' });
        continue;
      }
      creances.push({
        reference:    raw.reference || `CRE-${Date.now()}-${i}`,
        nom_debiteur: raw.nom,
        montant:      raw.montant,
        telephone:    raw.telephone,
        adresse:      raw.adresse,
        date:         raw.date,
      });
    }

    try { fs.unlinkSync(req.file.path); } catch {}

    return ok(res, 200, {
      data: { total: rows.length, creances, erreurs: errors },
    });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return ok(res, 500, {}, err.message);
  }
};

// =============================================================================
// GET /api/export/lmd?format=excel|pdf&date_from=&date_to=
// =============================================================================
exports.exportLMD = async (req, res) => {
  const lawyerId = req.user.id;
  const { format = 'excel', date_from, date_to } = req.query;

  try {
    let query  = 'SELECT * FROM lmd WHERE lawyer_id = $1';
    let params = [lawyerId];
    let idx    = 2;

    if (date_from) { query += ` AND date_lmd >= $${idx++}`; params.push(date_from); }
    if (date_to)   { query += ` AND date_lmd <= $${idx++}`; params.push(date_to); }
    query += ' ORDER BY date_lmd DESC';

    let data = [];
    try {
      const { rows } = await pool.query(query, params);
      data = rows;
    } catch {
      // Table LMD peut ne pas encore exister
      data = [];
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['N° LMD', 'Nom Débiteur', 'Montant (MAD)', 'Téléphone', 'Adresse', 'Référence Dossier', 'CIN', 'Email', 'Date LMD', 'Statut'],
        ...data.map(r => [
          r.numero_lmd, r.nom_debiteur, r.montant, r.telephone,
          r.adresse, r.reference_dossier, r.cin, r.email,
          r.date_lmd ? String(r.date_lmd).split('T')[0] : '', r.statut,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      // Largeurs colonnes
      ws['!cols'] = [14,22,14,13,24,18,12,22,12,12].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, 'LMD');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', `attachment; filename="export_lmd_${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    }

    if (format === 'pdf') {
      const html = buildPDFHtml('Liste des LMD', data, [
        { key: 'numero_lmd',         label: 'N° LMD'    },
        { key: 'nom_debiteur',       label: 'Débiteur'  },
        { key: 'montant',            label: 'Montant'   },
        { key: 'telephone',          label: 'Tél'       },
        { key: 'reference_dossier',  label: 'Réf'       },
        { key: 'date_lmd',           label: 'Date'      },
        { key: 'statut',             label: 'Statut'    },
      ]);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="export_lmd_${Date.now()}.html"`);
      return res.send(html);
    }

    return ok(res, 400, {}, 'Format invalide. Utilisez excel ou pdf');
  } catch (err) {
    console.error('[export/lmd]', err.message);
    return ok(res, 500, {}, 'Erreur export');
  }
};

// =============================================================================
// GET /api/export/creances?format=excel|pdf
// =============================================================================
exports.exportCreances = async (req, res) => {
  const lawyerId = req.user.id;
  const { format = 'excel', status, date_from, date_to } = req.query;

  try {
    // Export depuis invoices (créances = factures impayées)
    let query = `
      SELECT
        i.invoice_number, i.amount, i.amount_paid,
        i.amount - i.amount_paid AS solde,
        i.status, i.issue_date, i.due_date,
        u.nom AS client_nom, u.telephone AS client_tel,
        c.title AS dossier
      FROM invoices i
      LEFT JOIN users u ON u.id = i.client_id
      LEFT JOIN cases c ON c.id = i.case_id
      WHERE i.lawyer_id = $1`;
    let params = [lawyerId];
    let idx    = 2;

    if (status)    { query += ` AND i.status = $${idx++}`;           params.push(status); }
    if (date_from) { query += ` AND i.issue_date >= $${idx++}`;      params.push(date_from); }
    if (date_to)   { query += ` AND i.issue_date <= $${idx++}`;      params.push(date_to); }
    query += ' ORDER BY i.issue_date DESC';

    let data = [];
    try {
      const { rows } = await pool.query(query, params);
      data = rows;
    } catch { data = []; }

    if (format === 'excel') {
      const wb    = XLSX.utils.book_new();
      const wsData = [
        ['N° Facture', 'Client', 'Téléphone', 'Dossier', 'Montant', 'Payé', 'Solde', 'Statut', 'Date Émission', 'Échéance'],
        ...data.map(r => [
          r.invoice_number, r.client_nom, r.client_tel, r.dossier,
          r.amount, r.amount_paid, r.solde, r.status,
          r.issue_date ? String(r.issue_date).split('T')[0] : '',
          r.due_date   ? String(r.due_date).split('T')[0]   : '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [14,20,13,20,12,12,12,10,14,14].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, 'Créances');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', `attachment; filename="export_creances_${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    }

    if (format === 'pdf') {
      const html = buildPDFHtml('État des Créances', data, [
        { key: 'invoice_number', label: 'N° Facture' },
        { key: 'client_nom',     label: 'Client'     },
        { key: 'dossier',        label: 'Dossier'    },
        { key: 'amount',         label: 'Montant'    },
        { key: 'solde',          label: 'Solde'      },
        { key: 'status',         label: 'Statut'     },
        { key: 'due_date',       label: 'Échéance'   },
      ]);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="export_creances_${Date.now()}.html"`);
      return res.send(html);
    }

    return ok(res, 400, {}, 'Format invalide');
  } catch (err) {
    console.error('[export/creances]', err.message);
    return ok(res, 500, {}, 'Erreur export');
  }
};

// ─── Générateur HTML imprimable (remplace PDF) ────────────────────────────────
function buildPDFHtml(title, rows, columns) {
  const date = new Date().toLocaleDateString('fr-MA');
  const thead = columns.map(c => `<th>${c.label}</th>`).join('');
  const tbody = rows.map(row =>
    `<tr>${columns.map(c => `<td>${row[c.key] ?? '—'}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; color: #0f172a; }
    h1   { font-size: 18px; margin-bottom: 4px; color: #1e40af; }
    .sub { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e40af; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: right; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>⚖️ MiZan — ${title}</h1>
  <div class="sub">Exporté le ${date} · ${rows.length} enregistrement(s)</div>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody || '<tr><td colspan="${columns.length}">Aucune donnée</td></tr>'}</tbody>
  </table>
  <div class="footer">MiZan — Gestion de cabinet juridique</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}