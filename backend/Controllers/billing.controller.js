// controllers/billing.controller.js
const {pool} = require('../db/dbConfig');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ─── Helpers ────────────────────────────────────────────────

async function generateInvoiceNumber() {
  const now = new Date();
  const prefix = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`,
    [`${prefix}%`]
  );
  const seq = String(Number(rows[0].count) + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
}

async function recalcInvoiceStatus(invoiceId) {
  const { rows: inv } = await pool.query(
    `SELECT amount FROM invoices WHERE id = $1`, [invoiceId]
  );
  if (!inv.length) return;

  const { rows: pay } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = $1`,
    [invoiceId]
  );

  const totalPaid = parseFloat(pay[0].total_paid);
  const invoiceAmount = parseFloat(inv[0].amount);
  const newStatus = totalPaid >= invoiceAmount ? 'paid' : 'sent';

  await pool.query(
    `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newStatus, invoiceId]
  );
}

// ─── Invoices ────────────────────────────────────────────────

exports.getInvoices = async (req, res) => {
  try {
    const { status, client_id, case_id, date_from, date_to } = req.query;

    let query = `
      SELECT
        i.*,
        c.nom        AS client_name,
        c.email      AS client_email,
        c.telephone  AS client_phone,
        cs.title     AS case_title,
        cs.type      AS case_type,
        cs.status    AS case_status,
        u.nom        AS lawyer_name,
        COALESCE(p.total_paid, 0) AS total_paid
      FROM invoices i
      LEFT JOIN users c  ON c.id  = i.client_id
      LEFT JOIN cases cs ON cs.id = i.case_id
      LEFT JOIN users u  ON u.id  = i.lawyer_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS total_paid
        FROM payments
        GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status)    { query += ` AND i.status = $${idx++}`;      params.push(status); }
    if (client_id) { query += ` AND i.client_id = $${idx++}`;   params.push(client_id); }
    if (case_id)   { query += ` AND i.case_id = $${idx++}`;     params.push(case_id); }
    if (date_from) { query += ` AND i.issue_date >= $${idx++}`; params.push(date_from); }
    if (date_to)   { query += ` AND i.issue_date <= $${idx++}`; params.push(date_to); }

    query += ` ORDER BY i.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getInvoices:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { case_id, client_id, amount, description, due_date, issue_date } = req.body;
    const lawyer_id = req.user.id;

    if (!client_id || !amount) {
      return res.status(400).json({ success: false, message: 'client_id et amount sont requis' });
    }

    const invoice_number = await generateInvoiceNumber();

    const { rows } = await pool.query(
      `INSERT INTO invoices
         (case_id, client_id, lawyer_id, invoice_number, amount, description, due_date, issue_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [case_id || null, client_id, lawyer_id, invoice_number, amount, description, due_date, issue_date || new Date()]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createInvoice:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: invRows } = await pool.query(
      `SELECT
        i.*,
        c.nom       AS client_name,
        c.email     AS client_email,
        c.telephone AS client_phone,
        cs.title    AS case_title,
        cs.type     AS case_type,
        cs.status   AS case_status,
        u.nom       AS lawyer_name
      FROM invoices i
      LEFT JOIN users c  ON c.id  = i.client_id
      LEFT JOIN cases cs ON cs.id = i.case_id
      LEFT JOIN users u  ON u.id  = i.lawyer_id
      WHERE i.id = $1`,
      [id]
    );

    if (!invRows.length) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    const { rows: payments } = await pool.query(
      `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC`,
      [id]
    );

    res.json({ success: true, data: { ...invRows[0], payments } });
  } catch (err) {
    console.error('getInvoiceById:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { case_id, client_id, amount, description, due_date, issue_date, status } = req.body;

    const { rows } = await pool.query(
      `UPDATE invoices SET
         case_id     = COALESCE($1, case_id),
         client_id   = COALESCE($2, client_id),
         amount      = COALESCE($3, amount),
         description = COALESCE($4, description),
         due_date    = COALESCE($5, due_date),
         issue_date  = COALESCE($6, issue_date),
         status      = COALESCE($7, status),
         updated_at  = NOW()
       WHERE id = $8
       RETURNING *`,
      [case_id, client_id, amount, description, due_date, issue_date, status, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateInvoice:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Payments ────────────────────────────────────────────────

exports.getPayments = async (req, res) => {
  try {
    const { invoice_id, date_from, date_to } = req.query;

    let query = `
      SELECT
        p.*,
        i.invoice_number,
        c.nom AS client_name
      FROM payments p
      JOIN invoices i  ON i.id = p.invoice_id
      LEFT JOIN users c ON c.id = i.client_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (invoice_id) { query += ` AND p.invoice_id = $${idx++}`;    params.push(invoice_id); }
    if (date_from)  { query += ` AND p.payment_date >= $${idx++}`; params.push(date_from); }
    if (date_to)    { query += ` AND p.payment_date <= $${idx++}`; params.push(date_to); }

    query += ` ORDER BY p.payment_date DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getPayments:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, payment_date, reference } = req.body;

    if (!invoice_id || !amount) {
      return res.status(400).json({ success: false, message: 'invoice_id et amount sont requis' });
    }

    const { rows } = await pool.query(
      `INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [invoice_id, amount, payment_method || 'bank', payment_date || new Date(), reference]
    );

    await recalcInvoiceStatus(invoice_id);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createPayment:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Billing Notes ───────────────────────────────────────────

exports.getBillingNotes = async (req, res) => {
  try {
    const { case_id } = req.query;

    let query = `
      SELECT
        bn.*,
        cs.title AS case_title,
        u.nom    AS lawyer_name
      FROM billing_notes bn
      LEFT JOIN cases cs ON cs.id = bn.case_id
      LEFT JOIN users u  ON u.id  = bn.lawyer_id
      WHERE 1=1
    `;
    const params = [];
    if (case_id) {
      query += ` AND bn.case_id = $1`;
      params.push(case_id);
    }
    query += ` ORDER BY bn.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getBillingNotes:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.createBillingNote = async (req, res) => {
  try {
    const { case_id, description, hours_worked, hourly_rate } = req.body;
    const lawyer_id = req.user.id;

    if (!description || hours_worked == null || hourly_rate == null) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const { rows } = await pool.query(
      `INSERT INTO billing_notes (case_id, lawyer_id, description, hours_worked, hourly_rate)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [case_id || null, lawyer_id, description, hours_worked, hourly_rate]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createBillingNote:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Exports ─────────────────────────────────────────────────

exports.exportExcel = async (req, res) => {
  try {
    const { status, client_id, date_from, date_to } = req.query;

    let query = `
      SELECT
        i.invoice_number,
        i.issue_date,
        i.due_date,
        i.amount,
        i.status,
        i.description,
        c.nom        AS client,
        cs.title     AS dossier,
        u.nom        AS avocat,
        COALESCE(p.total_paid, 0) AS total_paye
      FROM invoices i
      LEFT JOIN users c  ON c.id  = i.client_id
      LEFT JOIN cases cs ON cs.id = i.case_id
      LEFT JOIN users u  ON u.id  = i.lawyer_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status)    { query += ` AND i.status = $${idx++}`;      params.push(status); }
    if (client_id) { query += ` AND i.client_id = $${idx++}`;   params.push(client_id); }
    if (date_from) { query += ` AND i.issue_date >= $${idx++}`; params.push(date_from); }
    if (date_to)   { query += ` AND i.issue_date <= $${idx++}`; params.push(date_to); }
    query += ` ORDER BY i.issue_date DESC`;

    const { rows } = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Factures');

    sheet.columns = [
      { header: 'N° Facture',    key: 'invoice_number', width: 18 },
      { header: 'Client',        key: 'client',         width: 25 },
      { header: 'Dossier',       key: 'dossier',        width: 30 },
      { header: 'Avocat',        key: 'avocat',         width: 25 },
      { header: 'Montant',       key: 'amount',         width: 14 },
      { header: 'Total Payé',    key: 'total_paye',     width: 14 },
      { header: 'Statut',        key: 'status',         width: 12 },
      { header: 'Date émission', key: 'issue_date',     width: 16 },
      { header: 'Échéance',      key: 'due_date',       width: 16 },
      { header: 'Description',   key: 'description',    width: 40 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1a365d' }
    };

    rows.forEach(r => sheet.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=factures.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportExcel:', err);
    res.status(500).json({ success: false, message: 'Erreur export Excel' });
  }
};

exports.exportPDF = async (req, res) => {
  try {
    const { status, client_id, date_from, date_to } = req.query;

    let query = `
      SELECT
        i.invoice_number,
        i.issue_date,
        i.due_date,
        i.amount,
        i.status,
        c.nom AS client,
        COALESCE(p.total_paid, 0) AS total_paye
      FROM invoices i
      LEFT JOIN users c ON c.id = i.client_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id
      ) p ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status)    { query += ` AND i.status = $${idx++}`;      params.push(status); }
    if (client_id) { query += ` AND i.client_id = $${idx++}`;   params.push(client_id); }
    if (date_from) { query += ` AND i.issue_date >= $${idx++}`; params.push(date_from); }
    if (date_to)   { query += ` AND i.issue_date <= $${idx++}`; params.push(date_to); }
    query += ` ORDER BY i.issue_date DESC`;

    const { rows } = await pool.query(query, params);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=factures.pdf');
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1a365d').text('Liste des Factures', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(1);

    const colWidths = [100, 120, 80, 70, 80, 60];
    const headers   = ['N° Facture', 'Client', 'Montant', 'Payé', 'Échéance', 'Statut'];
    let x = 40, y = doc.y;

    doc.rect(x, y, 515, 20).fill('#1a365d');
    doc.fillColor('#fff').fontSize(9);
    headers.forEach((h, i) => {
      const cx = colWidths.slice(0, i).reduce((a, b) => a + b, x);
      doc.text(h, cx + 4, y + 5, { width: colWidths[i] - 8 });
    });

    y += 20;
    rows.forEach((row, ri) => {
      if (y > 750) { doc.addPage(); y = 40; }
      doc.rect(x, y, 515, 18).fill(ri % 2 === 0 ? '#f7fafc' : '#fff');
      doc.fillColor('#2d3748').fontSize(8);
      const vals = [
        row.invoice_number,
        row.client,
        `${Number(row.amount).toLocaleString('fr-FR')} MAD`,
        `${Number(row.total_paye).toLocaleString('fr-FR')} MAD`,
        row.due_date ? new Date(row.due_date).toLocaleDateString('fr-FR') : '-',
        row.status,
      ];
      vals.forEach((v, i) => {
        const cx = colWidths.slice(0, i).reduce((a, b) => a + b, x);
        doc.text(String(v || '-'), cx + 4, y + 4, { width: colWidths[i] - 8 });
      });
      y += 18;
    });

    doc.end();
  } catch (err) {
    console.error('exportPDF:', err);
    res.status(500).json({ success: false, message: 'Erreur export PDF' });
  }
};