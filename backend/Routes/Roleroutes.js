const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const ROLES_META = {
  ADMIN:     { label_fr: 'Administrateur', label_ar: 'مدير',   color: 'red'   },
  LAWYER:    { label_fr: 'Avocat',         label_ar: 'محامي',  color: 'blue'  },
  ASSISTANT: { label_fr: 'Assistant',      label_ar: 'مساعد',  color: 'green' },
  CLIENT:    { label_fr: 'Client',         label_ar: 'موكل',   color: 'gray'  },
};

// GET /api/roles — accessible à tous les connectés
router.get('/', authenticate, (req, res) => {
  res.json({ success: true, data: ROLES_META });
});

module.exports = router;