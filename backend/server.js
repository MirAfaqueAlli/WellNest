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
    // Ensure ENUM includes all roles even on existing databases without manual ALTER
    await sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('superadmin','admin','staff','doctor_pregnancy','doctor_immunization') DEFAULT 'staff';"
    ).catch(err => console.log('ℹ️ Role ENUM sync check:', err.message));
    // Ensure skip_reason is TEXT to allow custom medical reasons
    await sequelize.query(
      "SET FOREIGN_KEY_CHECKS = 0; ALTER TABLE patient_stages MODIFY COLUMN skip_reason TEXT; SET FOREIGN_KEY_CHECKS = 1;"
    ).catch(err => console.log('ℹ️ skip_reason TEXT check:', err.message));
    // Ensure notifications.type ENUM includes all notification types (stage_skipped, stage_rescheduled added later)
    await sequelize.query(
      "ALTER TABLE notifications MODIFY COLUMN type ENUM('reminder_7d','reminder_1d','reminder_today','missed','manual','stage_complete','edd_updated','delivery_recorded','stage_skipped','stage_rescheduled') NOT NULL;"
    ).catch(err => console.log('ℹ️ notifications type ENUM check:', err.message));
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
