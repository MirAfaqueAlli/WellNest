const { Hospital, User, Patient } = require('../models/index');
const { testConnection }           = require('../services/whatsapp.service');

// ── GET /api/hospitals ────────────────────────────────────────────────────────
exports.listHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({ order: [['name', 'ASC']] });
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
};

// ── GET /api/hospitals/:id ────────────────────────────────────────────────────
exports.getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hospital' });
  }
};

// ── POST /api/hospitals ───────────────────────────────────────────────────────
exports.createHospital = async (req, res) => {
  try {
    const { name, address, phone, whatsapp_sender_id, whatsapp_api_url, whatsapp_api_key, whatsapp_api_provider } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const hospital = await Hospital.create({ name, address, phone, whatsapp_sender_id, whatsapp_api_url, whatsapp_api_key, whatsapp_api_provider });
    res.status(201).json(hospital);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create hospital' });
  }
};

// ── PUT /api/hospitals/:id ────────────────────────────────────────────────────
exports.updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    const { name, address, phone, whatsapp_sender_id, whatsapp_api_url, whatsapp_api_key, whatsapp_api_provider } = req.body;
    await hospital.update({ name, address, phone, whatsapp_sender_id, whatsapp_api_url, whatsapp_api_key, whatsapp_api_provider });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update hospital' });
  }
};

// ── POST /api/hospitals/:id/test-whatsapp ─────────────────────────────────────
exports.testWhatsapp = async (req, res) => {
  try {
    const { test_number } = req.body;
    if (!test_number) return res.status(400).json({ error: 'test_number is required' });

    const result = await testConnection(test_number, req.params.id);
    if (result.ok) {
      res.json({ message: 'Test message sent successfully!' });
    } else {
      res.status(400).json({ error: result.error || 'Test message failed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Test failed: ' + err.message });
  }
};

// ── GET /api/hospitals/staff ──────────────────────────────────────────────────
exports.getStaff = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { hospital_id: req.user.hospital_id },
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['name', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};
