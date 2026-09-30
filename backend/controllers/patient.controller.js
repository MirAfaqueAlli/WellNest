const { addDays } = require('date-fns');
const { Op, literal, fn, col } = require('sequelize');
const sequelize = require('../config/db');
const { Patient, PatientStage, StageTemplate, Hospital } = require('../models/index');
const { generateStages, recalculateOnEddChange } = require('../services/stage.service');

// ── POST /api/patients ────────────────────────────────────────────────────────
exports.registerPatient = async (req, res) => {
  try {
    const {
      whatsapp_number, name, age, address, patient_type,
      lmp_date, edd, edd_source, ultrasound_scan_date,
      child_dob, child_name, child_gender, notes
    } = req.body;

    if (!whatsapp_number || !name || !patient_type)
      return res.status(400).json({ error: 'whatsapp_number, name and patient_type are required' });

    // ── Compute EDD for pregnant patients ──
    let finalEdd       = edd    || null;
    let finalEddSource = edd_source || 'direct_entry';

    if (patient_type === 'pregnant') {
      if (!finalEdd && lmp_date) {
        finalEdd       = addDays(new Date(lmp_date), 280);
        finalEddSource = 'lmp_calculated';
      }
      if (!finalEdd)
        return res.status(400).json({ error: 'EDD or LMP date required for pregnant patients' });
    }

    if (patient_type === 'immunization' && !child_dob)
      return res.status(400).json({ error: 'child_dob required for immunization patients' });

    const patient = await Patient.create({
      hospital_id:          req.user.hospital_id,
      whatsapp_number,
      name,
      age:                  age || null,
      address:              address || null,
      patient_type,
      lmp_date:             lmp_date             || null,
      edd:                  finalEdd,
      edd_source:           finalEddSource,
      edd_last_updated:     patient_type === 'pregnant' ? new Date() : null,
      ultrasound_scan_date: ultrasound_scan_date || null,
      child_dob:            child_dob            || null,
      child_name:           child_name           || null,
      child_gender:         child_gender         || null,
      notes:                notes                || null,
      registered_by:        req.user.id
    });

    // ── Generate care stages ──
    if (patient_type === 'pregnant') {
      await generateStages(patient, 'pregnancy');
    } else {
      await generateStages(patient, 'immunization');
    }

    res.status(201).json({ message: 'Patient registered successfully', patient_id: patient.id });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return res.status(409).json({ error: 'WhatsApp number already registered' });
    console.error('Register patient error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── GET /api/patients ─────────────────────────────────────────────────────────
exports.listPatients = async (req, res) => {
  try {
    const {
      search,
      status,
      type,
      sort    = 'next_stage',   // next_stage | name | registered | status
      page    = 1,
      limit   = 10,
    } = req.query;

    const hospitalId = req.user.hospital_id;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const lim        = parseInt(limit);

    // ── Build WHERE clause ──────────────────────────────────────────────────
    const where = { hospital_id: hospitalId };
    if (status) where.status       = status;
    if (type)   where.patient_type = type;
    if (search) {
      where[Op.or] = [
        { name:            { [Op.like]: `%${search}%` } },
        { whatsapp_number: { [Op.like]: `%${search}%` } },
      ];
    }

    // ── ORDER BY ────────────────────────────────────────────────────────────
    const ORDER_MAP = {
      next_stage: [literal('next_stage_date IS NULL ASC'), literal('next_stage_date ASC')],
      name:       [[literal('`Patient`.`name`'), 'ASC']],
      registered: [[literal('`Patient`.`createdAt`'), 'DESC']],
      status:     [[literal('`Patient`.`status`'), 'ASC']],
    };
    const order = ORDER_MAP[sort] || ORDER_MAP.next_stage;

    // ── Subquery attributes ─────────────────────────────────────────────────
    const nextStageDateSub  = literal(`(
      SELECT MIN(ps.scheduled_date)
      FROM patient_stages ps
      WHERE ps.patient_id = \`Patient\`.\`id\`
        AND ps.status IN ('pending','notified')
        AND ps.scheduled_date >= CURDATE()
    )`);

    const nextStageNameSub  = literal(`(
      SELECT st.stage_name
      FROM patient_stages ps
      JOIN stage_templates st ON ps.stage_template_id = st.id
      WHERE ps.patient_id = \`Patient\`.\`id\`
        AND ps.status IN ('pending','notified')
        AND ps.scheduled_date >= CURDATE()
      ORDER BY ps.scheduled_date ASC
      LIMIT 1
    )`);

    const currentStageSub   = literal(`(
      SELECT st.stage_name
      FROM patient_stages ps
      JOIN stage_templates st ON ps.stage_template_id = st.id
      WHERE ps.patient_id = \`Patient\`.\`id\`
        AND ps.status = 'visited'
      ORDER BY ps.actual_visit_date DESC, ps.scheduled_date DESC
      LIMIT 1
    )`);

    // ── Query ────────────────────────────────────────────────────────────────
    const { count, rows } = await Patient.findAndCountAll({
      where,
      attributes: {
        include: [
          [nextStageDateSub, 'next_stage_date'],
          [nextStageNameSub, 'next_stage_name'],
          [currentStageSub,  'current_stage_name'],
        ],
      },
      order,
      limit:    lim,
      offset,
      subQuery: false,
      raw:      true,
      nest:     false,
    });

    res.json({
      total:    count,
      page:     parseInt(page),
      limit:    lim,
      pages:    Math.ceil(count / lim),
      patients: rows,
    });
  } catch (err) {
    console.error('List patients error:', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};


// ── GET /api/patients/lookup?whatsapp=+91... ──────────────────────────────────
exports.lookupByWhatsapp = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where:   { whatsapp_number: req.query.whatsapp },
      include: [{
        model:   PatientStage,
        as:      'stages',
        include: [{ model: StageTemplate, as: 'template' }]
      }]
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed' });
  }
};

// ── GET /api/patients/:id ─────────────────────────────────────────────────────
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        {
          model:   PatientStage,
          as:      'stages',
          include: [{ model: StageTemplate, as: 'template' }]
        },
        { model: Hospital }
      ]
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.hospital_id !== req.user.hospital_id)
      return res.status(403).json({ error: 'Access denied' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

// ── GET /api/patients/dashboard-stats ────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;
    const today      = new Date();
    const in7Days    = addDays(today, 7);

    const [active, upcoming, missed] = await Promise.all([
      Patient.count({ where: { hospital_id: hospitalId, status: 'active' } }),
      PatientStage.count({
        where: {
          status:         { [Op.in]: ['pending', 'notified'] },
          scheduled_date: { [Op.between]: [today, in7Days] }
        },
        include: [{
          model:    Patient,
          required: true,
          where:    { hospital_id: hospitalId }
        }]
      }),
      PatientStage.count({
        where: { status: 'missed' },
        include: [{
          model:    Patient,
          required: true,
          where:    { hospital_id: hospitalId }
        }]
      })
    ]);

    // Patients due today
    const dueToday = await PatientStage.findAll({
      where: {
        status:         { [Op.in]: ['pending', 'notified'] },
        scheduled_date: today.toISOString().split('T')[0]
      },
      include: [
        { model: StageTemplate, as: 'template' },
        {
          model:    Patient,
          required: true,
          where:    { hospital_id: hospitalId }
        }
      ],
      limit: 10
    });

    res.json({ active, upcoming, missed, dueToday });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ── PUT /api/patients/:id ─────────────────────────────────────────────────────
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.hospital_id !== req.user.hospital_id)
      return res.status(403).json({ error: 'Access denied' });

    const {
      name,
      whatsapp_number,
      age,
      address,
      status,
      notes,
      // pregnancy fields
      lmp_date,
      edd,
      edd_source,
      ultrasound_scan_date,
      // child / delivery fields
      child_dob,
      child_name,
      child_gender,
      delivery_date
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Patient name cannot be empty' });
    }
    if (whatsapp_number !== undefined && !whatsapp_number.trim()) {
      return res.status(400).json({ error: 'WhatsApp number cannot be empty' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number.trim();
    if (age !== undefined) updates.age = age === '' || age === null ? null : parseInt(age, 10);
    if (address !== undefined) updates.address = address || null;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes || null;

    let eddChanged = false;
    let dobChanged = false;

    if (patient.patient_type === 'pregnant') {
      if (lmp_date !== undefined) updates.lmp_date = lmp_date || null;
      if (ultrasound_scan_date !== undefined) updates.ultrasound_scan_date = ultrasound_scan_date || null;
      if (edd_source !== undefined) updates.edd_source = edd_source;
      if (edd !== undefined && edd && edd !== patient.edd) {
        updates.edd = edd;
        updates.edd_last_updated = new Date();
        eddChanged = true;
      }
    }

    if (patient.patient_type === 'immunization' || patient.delivery_date || child_dob !== undefined) {
      if (child_name !== undefined) updates.child_name = child_name || null;
      if (child_gender !== undefined) updates.child_gender = child_gender || null;
      if (delivery_date !== undefined) updates.delivery_date = delivery_date || null;
      if (child_dob !== undefined && child_dob && child_dob !== patient.child_dob) {
        updates.child_dob = child_dob;
        dobChanged = true;
      }
    }

    await patient.update(updates);

    if (eddChanged || dobChanged) {
      await recalculateOnEddChange(patient);
    }

    res.json({ message: 'Patient updated successfully', patient });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'WhatsApp number already registered to another patient' });
    }
    console.error('Update patient error:', err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
};
