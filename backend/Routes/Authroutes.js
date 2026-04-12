const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout (invalide côté client — endpoint symbolique)
router.post('/logout', authenticate, authController.logout);

module.exports = router;