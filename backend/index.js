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

app.use('/api/cases', caseRoutes);      // list + create
app.use('/api/case', singleRouter);     // detail, update, delete, history, upload

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

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ MiZan API running on http://localhost:${PORT}`);
});

module.exports = app;