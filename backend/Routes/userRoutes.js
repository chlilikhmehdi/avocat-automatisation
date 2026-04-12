const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

// GET /api/users — liste paginée (ADMIN + LAWYER)
router.get('/', authenticate, authorize('ADMIN', 'LAWYER'), userController.listUsers);

// GET /api/users/me — profil personnel (tous les rôles connectés)
router.get('/me', authenticate, userController.getMe);

// GET /api/users/:id — détail (ADMIN + LAWYER)
router.get('/:id', authenticate, authorize('ADMIN', 'LAWYER'), userController.getUser);

// POST /api/users — créer (ADMIN uniquement)
router.post('/', authenticate, authorize('ADMIN'), userController.createUser);

// PUT /api/users/:id — modifier (ADMIN uniquement)
router.put('/:id', authenticate, authorize('ADMIN'), userController.updateUser);

// DELETE /api/users/:id — soft-delete (ADMIN uniquement)
router.delete('/:id', authenticate, authorize('ADMIN'), userController.deleteUser);

module.exports = router;