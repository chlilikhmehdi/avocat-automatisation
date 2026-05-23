// routes/hearing.routes.js
const express = require('express');
const router  = express.Router();
 
const { authenticate } = require('../middleware/Auth');
const { requireRole }  = require('../middleware/requireRole');
const ctrl             = require('../controllers/hearing.controller');
 
const guard = [authenticate, requireRole('LAWYER', 'ADMIN')];
 
// ── Routes STATIQUES en premier (avant /:id pour éviter les collisions) ───────
router.get   ('/reminders',             ...guard, ctrl.getReminders);
router.get   ('/calendar',              ...guard, ctrl.getCalendarEvents);
 
// ── Délais légaux (AVANT /:id — sinon "deadlines" est lu comme un id) ─────────
router.get   ('/deadlines',             ...guard, ctrl.listDeadlines);
router.post  ('/deadlines',             ...guard, ctrl.createDeadline);
router.patch ('/deadlines/:id/status',  ...guard, ctrl.updateDeadlineStatus);
 
// ── Audiences CRUD ────────────────────────────────────────────────────────────
router.get   ('/',     ...guard, ctrl.listHearings);
router.post  ('/',     ...guard, ctrl.createHearing);
router.get   ('/:id',  ...guard, ctrl.getHearing);
router.put   ('/:id',  ...guard, ctrl.updateHearing);
router.delete('/:id',  ...guard, ctrl.deleteHearing);
 
module.exports = router;
 