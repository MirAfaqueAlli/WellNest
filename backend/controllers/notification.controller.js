const { Op } = require('sequelize');
const { Notification, Patient } = require('../models/index');
const { runDailyJob } = require('../services/cron.service');
const { sendWhatsApp, testConnection } = require('../services/whatsapp.service');

// ── GET /api/notifications ────────────────────────────────────────────────────
exports.listNotifications = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const lim = parseInt(limit) || 10;
    const offset = (parseInt(page) - 1) * lim;

    const where = {};
    if (status) where.status = status;
    if (type)   where.type   = type;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [{
        model: Patient,
        attributes: ['name', 'whatsapp_number', 'hospital_id'],
        where: { hospital_id: req.user.hospital_id },
        required: true
      }],
      order: [['createdAt', 'DESC']],
      limit: lim,
      offset
    });

    res.json({
      total:         count,
      page:          parseInt(page),
      limit:         lim,
      pages:         Math.ceil(count / lim) || 1,
      notifications: rows
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// ── POST /api/notifications/cron/trigger (for manual testing) ─────────────────
exports.triggerCron = async (req, res) => {
  try {
    const result = await runDailyJob();
    res.json({ message: 'Cron job triggered successfully', result });
  } catch (err) {
    res.status(500).json({ error: 'Cron trigger failed', details: err.message });
  }
};

// ── POST /api/notifications/send-manual ──────────────────────────────────────
exports.sendManual = async (req, res) => {
  try {
    const { patient_id, message } = req.body;
    if (!patient_id || !message)
      return res.status(400).json({ error: 'patient_id and message required' });

    const patient = await Patient.findByPk(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.hospital_id !== req.user.hospital_id)
      return res.status(403).json({ error: 'Access denied' });

    await sendWhatsApp(patient.whatsapp_number, 'manual', {
      patient_name:   patient.name,
      custom_message: message
    }, patient.id);

    res.json({ message: 'Manual notification sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

// ── POST /api/notifications/test-whatsapp ────────────────────────────────────
exports.testWhatsApp = async (req, res) => {
  try {
    const { test_number } = req.body;
    if (!test_number)
      return res.status(400).json({ error: 'test_number required (e.g. +919876543210)' });

    const { ok, error } = await testConnection(test_number);
    if (ok) {
      res.json({
        success: true,
        message: '✅ Message sent successfully. Check your WhatsApp! (Gateway may take 20–30s to deliver)'
      });
    } else {
      res.status(502).json({
        success: false,
        message: `❌ ${error || 'Message not sent. Check API URL and credentials.'}`,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'WhatsApp test failed', details: err.message });
  }
};
