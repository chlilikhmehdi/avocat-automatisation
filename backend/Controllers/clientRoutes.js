// routes/clientRoutes.js
// Toutes les routes nécessitent : authentification JWT + rôle CLIENT

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/clientController');

// ── Middleware d'authentification ──────────────────────────────────────────────
// Adaptez selon votre implémentation JWT existante
const { authenticateToken } = require('../middleware/auth');

// ── Middleware de contrôle de rôle ─────────────────────────────────────────────
// Bloque tout accès si le rôle n'est pas CLIENT
function requireClientRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Non authentifié.' });
  }
  if (req.user.role !== 'CLIENT') {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé. Espace réservé aux clients.',
    });
  }
  next();
}

// Appliquer les deux middlewares sur toutes les routes de ce router
router.use(authenticateToken, requireClientRole);

// ── Routes ─────────────────────────────────────────────────────────────────────

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Dossiers
router.get('/cases',     ctrl.getCases);
router.get('/cases/:id', ctrl.getCaseDetail);

// Documents partagés
router.get('/documents',             ctrl.getDocuments);
router.get('/documents/:id/download', ctrl.downloadDocument);

// Factures
router.get('/invoices', ctrl.getInvoices);

// Messages
router.get('/messages',  ctrl.getMessages);
router.post('/messages', ctrl.sendMessage);

module.exports = router;