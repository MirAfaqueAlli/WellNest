require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { sequelize } = require('./models/index');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth.routes');
const hospitalRoutes     = require('./routes/hospital.routes');
const patientRoutes      = require('./routes/patient.routes');
const stageRoutes        = require('./routes/stage.routes');
const notificationRoutes = require('./routes/notification.routes');
const setupRoutes        = require('./routes/setup.routes');

// ── Cron (registers automatically on require) ─────────────────────────────────
require('./services/cron.service');

// ── Seeders ───────────────────────────────────────────────────────────────────
const { seed: seedStageTemplates } = require('./seeders/stageTemplates.seed');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Mount Routes ──────────────────────────────────────────────────────────────
app.use('/api/setup',         setupRoutes);        // first-run onboarding (no auth)
app.use('/api/auth',          authRoutes);
app.use('/api/hospitals',     hospitalRoutes);
app.use('/api/patients',      patientRoutes);
app.use('/api/patients',      stageRoutes);       // nested: /api/patients/:id/stages/...
app.use('/api/notifications', notificationRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL connected');
    return sequelize.sync({ force: false });
  })
  .then(async () => {
    console.log('✅ Database tables synced');
    await seedStageTemplates();    // auto-seed stage templates on every startup (safe — uses upsert)
    app.listen(PORT, () => {
      console.log(`🚀 WellNest API running on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Make sure MySQL is running and DB_PASS is correct in .env');
    process.exit(1);
  });
