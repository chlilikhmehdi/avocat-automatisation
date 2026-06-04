const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/Auth');
const c = require('../Controllers/clientPortal.controller');

router.use(authenticate);

router.get('/dashboard',                      c.getDashboard);
router.get('/cases',                          c.getClientCases);
router.get('/documents',                      c.getClientDocuments);
router.get('/documents/:fileId/download',     c.downloadDocument);      // ← nouveau
router.get('/invoices',                       c.getClientInvoices);
router.get('/cases/:id',                      c.getCaseDetail);
router.get('/cases/:id/hearings',             c.getCaseHearings);
router.get('/cases/:id/documents',            c.getCaseDocuments);
router.get('/cases/:id/invoices',             c.getCaseInvoices);
router.get('/messages',                       c.getMessages);
router.post('/messages',                      c.sendMessage);
router.get('/notifications',                  c.getNotifications);
router.get('/lawyer-messages',                c.getLawyerMessages);
router.post('/lawyer-reply',                  c.lawyerReply);
router.post('/share-file',                    c.shareFileWithClient);

module.exports = router;