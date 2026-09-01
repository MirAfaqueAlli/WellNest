const bcrypt   = require('bcryptjs');
const { Hospital, User } = require('../models/index');

// ── GET /api/setup/status ─────────────────────────────────────────────────────
exports.getStatus = async (req, res) => {
  try {
    const count = await Hospital.count();
    res.json({ setupRequired: count === 0 });
  } catch (err) {
    console.error('Setup status error:', err);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
};

// ── POST /api/setup ───────────────────────────────────────────────────────────
// One-time only. Blocked permanently once a hospital exists.
exports.runSetup = async (req, res) => {
  try {
    const count = await Hospital.count();
    if (count > 0) {
      return res.status(409).json({
        error: 'Setup already complete. This endpoint is permanently disabled.'
      });
    }

    const {
      hospital_name, hospital_address, hospital_phone,
      admin_name, admin_email, admin_password,
    } = req.body;

    if (!hospital_name)  return res.status(400).json({ error: 'Hospital name is required' });
    if (!admin_name)     return res.status(400).json({ error: 'Admin name is required' });
    if (!admin_email)    return res.status(400).json({ error: 'Admin email is required' });
    if (!admin_password) return res.status(400).json({ error: 'Admin password is required' });
    if (admin_password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hospital = await Hospital.create({
      name:    hospital_name,
      address: hospital_address || null,
      phone:   hospital_phone   || null,
    });

    const passwordHash = await bcrypt.hash(admin_password, 12);
    await User.create({
      hospital_id:   hospital.id,
      name:          admin_name,
      email:         admin_email.toLowerCase().trim(),
      password_hash: passwordHash,
      role:          'superadmin',
    });

    console.log(`✅ Setup complete — Hospital: "${hospital_name}" | Admin: ${admin_email}`);
    res.status(201).json({ message: 'Setup complete! You can now log in with your credentials.' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Setup failed. Please try again.' });
  }
};
