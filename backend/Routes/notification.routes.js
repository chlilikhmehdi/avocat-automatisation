const express = require('express');
const router = express.Router();
const ctrl = require('../Controllers/notification.controller');
const { authenticate } = require('../middleware/Auth');

// Toutes les routes de notifications nécessitent une authentification
router.use(authenticate);

// GET /api/notifications - récupérer les notifications
router.get('/', ctrl.listNotifications);

// PUT /api/notifications/mark-all-read - marquer toutes comme lues
router.put('/mark-all-read', ctrl.markAllAsRead);

// PUT /api/notifications/:id/read - marquer une notification spécifique comme lue
router.put('/:id/read', ctrl.markAsRead);

// GET /api/notifications/stream - flux SSE temps réel
router.get('/stream', ctrl.streamNotifications);

module.exports = router;
