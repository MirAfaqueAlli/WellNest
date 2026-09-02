/**
 * reset-for-setup.js
 * ─────────────────────────────────────────────────────────────────
 * Clears hospitals and users so the setup wizard reappears.
 * Stage templates and all other data stay intact.
 *
 * Usage:  node scripts/reset-for-setup.js
 *
 * ⚠️  DEV / TESTING ONLY — do NOT run on production with real data.
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { User, Hospital, sequelize } = require('../models/index');

(async () => {
  try {
    await sequelize.authenticate();
    const users     = await User.destroy({ where: {}, truncate: false });
    const hospitals = await Hospital.destroy({ where: {}, truncate: false });
    console.log(`✅ Reset complete — deleted ${users} user(s) and ${hospitals} hospital(s)`);
    console.log(`   Refresh the app — setup wizard will appear`);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
