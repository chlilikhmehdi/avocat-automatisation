// Polyfills globaux pour pdf-parse dans Node.js
if (typeof global.DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof global.ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof global.Path2D === 'undefined') { global.Path2D = class Path2D {}; }

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { pool } = require('./db/dbConfig');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const caseRoutes = require('./routes/caseRoutes');
const { singleRouter } = require('./routes/caseRoutes');
const aiRoutes = require('./routes/ai.routes');
const billingRoutes = require('./routes/billing.routes');
const importexportfichier = require('./Routes/import.routes')
const LmdRoute = require('./Routes/LmdRoute') ; 
const notificationRoutes = require('./routes/notification.routes');
const notificationService = require('./services/notificationService');
const lmdRoute = require("./Routes/LmdRoute")
const app = express();
const PORT = process.env.PORT || 4000;

// ── Middlewares ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Static files (uploads) ──────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/cases', caseRoutes);      // list + create
app.use('/api/case', singleRouter);     // detail, update, delete, history, upload
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/documents', require('./routes/documentAIRoutes'));
app.use('/api/documents', require('./routes/document.routes'));
// Vérifier que cette ligne existe dans index.js
app.use('/api/clients', require('./routes/client.routes'));
app.use('/api/hearings', require('./routes/hearing.routes'));
// index.js — ajouter cette ligne
app.use('/api/cases-list', require('./routes/casesList.routes'));
 
// Après tes autres app.use('/api/...') existants :
app.use('/api', billingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/import', importexportfichier);
app.use('/api/automation', require('./routes/automationRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api', lmdRoute);
const clientRoutes = require('./Routes/clientRoutes');
app.use('/api/client', clientRoutes);
 
const ocrRoutes = require('./Routes/ocr.routes');
app.use('/api/ocr', ocrRoutes);

const templateRoutes = require('./Routes/template.routes');
app.use('/api/templates', templateRoutes);

const clientPortalRoutes = require('./Routes/clientPortal.routes');
app.use('/api/client', clientPortalRoutes);

const emailRoutes = require('./Routes/email.routes');
app.use('/api/emails', emailRoutes);

const priorityRoutes = require('./Routes/priority.routes');
app.use('/api/priority', priorityRoutes);

const statisticsRoutes = require('./Routes/statistics.routes');
app.use('/api/statistics', statisticsRoutes);

// ── RAG (Retrieval Augmented Generation) ────────────────────
const ragRoutes    = require('./Routes/ragRoutes');
const ragCtrl      = require('./Controllers/ragController');
const { authenticate } = require('./middleware/Auth');
app.use('/api/rag', ragRoutes);
app.use('/api/dossiers/:id/summary', authenticate, ragCtrl.getDossierSummary);

// ── Health check ────────────────────────────────────────────
app.get('/health', async (_, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'connected',
      ts: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      db: 'disconnected'
    });
  }
});

app.listen(PORT, async () => {
  console.log(`✅  MiZan API    → http://localhost:${PORT}`);

  // Initialisation du système de notifications
  await notificationService.initTable();

  // Initialisation des tables RAG + Memory
  const ragService    = require('./services/ragService');
  const memoryService = require('./services/memoryService');
  await ragService.initTables().catch(e => console.error('[RAG] Init error:', e.message));
  await memoryService.initMemoryTables().catch(e => console.error('[Memory] Init error:', e.message));
  
  // Premier contrôle des échéances
  notificationService.checkAutomaticNotifications();
  
  // Lancer le vérificateur de notifications automatiquement toutes les heures
  setInterval(() => {
    notificationService.checkAutomaticNotifications();
  }, 60 * 60 * 1000); // 1 heure
});

module.exports = app;