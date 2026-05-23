// routes/billing.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/billing.controller');

// Middleware d'auth — adapte le chemin selon ton projet
const { authenticate, authorize } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ── Exports (avant /:id pour éviter le conflit de route) ───────
router.get('/invoices/export/excel', authorize('LAWYER', 'ADMIN'), ctrl.exportExcel);
router.get('/invoices/export/pdf',   authorize('LAWYER', 'ADMIN'), ctrl.exportPDF);

// ── Invoices ────────────────────────────────────────────────────
router.get('/invoices',     authorize('LAWYER', 'ADMIN'), ctrl.getInvoices);
router.post('/invoices',    authorize('LAWYER', 'ADMIN'), ctrl.createInvoice);
router.get('/invoices/:id', authorize('LAWYER', 'ADMIN'), ctrl.getInvoiceById);
router.put('/invoices/:id', authorize('LAWYER', 'ADMIN'), ctrl.updateInvoice);

// ── Payments ────────────────────────────────────────────────────
router.get('/payments',  authorize('LAWYER', 'ADMIN'), ctrl.getPayments);
router.post('/payments', authorize('LAWYER', 'ADMIN'), ctrl.createPayment);

// ── Billing Notes ────────────────────────────────────────────────
router.get('/billing-notes',  authorize('LAWYER', 'ADMIN'), ctrl.getBillingNotes);
router.post('/billing-notes', authorize('LAWYER', 'ADMIN'), ctrl.createBillingNote);

module.exports = router;