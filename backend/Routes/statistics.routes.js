const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/Auth');
const c = require('../Controllers/statistics.controller');

router.use(authenticate);

router.get('/dashboard', c.getStatistics);

module.exports = router;
