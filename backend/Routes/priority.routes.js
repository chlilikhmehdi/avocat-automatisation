const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/Auth');
const c = require('../Controllers/priority.controller');

router.use(authenticate);

router.get('/urgent-cases', c.getUrgentCases);

module.exports = router;
