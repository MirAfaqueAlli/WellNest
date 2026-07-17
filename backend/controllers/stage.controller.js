const { Op } = require('sequelize');
const { addDays } = require('date-fns');
const { Patient, PatientStage, StageTemplate, Notification } = require('../models/index');
const { generateStages, recalculateOnEddChange, calcStageDate } = require('../services/stage.service');
const { sendWhatsApp } = require('../services/whatsapp.service');

// ── GET /api/patients/:id/stages ──────────────────────────────────────────────
exports.getStages = async (req, res) => {
  try {
    const stages = await PatientStage.findAll({
      where:   { patient_id: req.params.id },
      include: [{ model: StageTemplate, as: 'template' }],
      order:   [['template', 'order_index', 'ASC']]
    });
    res.json(stages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
};

// ── GET /api/patients/:id/stages/current ─────────────────────────────────────
exports.getCurrentStage = async (req, res) => {
  try {
    const stage = await PatientStage.findOne({
      where:   { patient_id: req.params.id, status: { [Op.in]: ['pending', 'notified'] } },
      include: [{ model: StageTemplate, as: 'template' }],
      order:   [['template', 'order_index', 'ASC']]
    });
    res.json(stage || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current stage' });
  }
};

// ── GET /api/patients/:id/stages/upcoming ────────────────────────────────────
exports.getUpcomingStages = async (req, res) => {
  try {
    const stages = await PatientStage.findAll({
      where:   { patient_id: req.params.id, status: { [Op.in]: ['pending', 'notified'] } },
      include: [{ model: StageTemplate, as: 'template' }],
      order:   [['template', 'order_index', 'ASC']],
      limit:   3
    });
    res.json(stages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch upcoming stages' });
  }
};

// ── PUT /api/patients/:id/stages/:stageId/visit ───────────────────────────────
exports.markVisited = async (req, res) => {
  try {
    const { actual_visit_date, stage_data, notes, next_stage_notes } = req.body;
    const stage = await PatientStage.findOne({
      where: { id: req.params.stageId, patient_id: req.params.id }
    });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const template = await StageTemplate.findByPk(stage.stage_template_id);
    if (!template) return res.status(400).json({ error: 'Stage template not found' });

    // Auto-skip all previous pending/notified stages of the same type
    const previousIncompleteStages = await PatientStage.findAll({
      where: {
        patient_id: req.params.id,
        status: { [Op.in]: ['pending', 'notified'] }
      },
      include: [{
        model: StageTemplate,
        as: 'template',
        where: {
          type: template.type,
          order_index: { [Op.lt]: template.order_index }
        }
      }]
    });

    for (const prevStage of previousIncompleteStages) {
      await prevStage.update({
        status: 'skipped',
        skip_reason: 'staff_decision',
        recorded_by: req.user.id
      });
    }

    await stage.update({
      status:            'visited',
      actual_visit_date: actual_visit_date || new Date(),
      stage_data:        stage_data || null,
      notes:             notes || null,
      recorded_by:       req.user.id
    });

    const patient = await Patient.findByPk(req.params.id);
    const nextStage = await PatientStage.findOne({
      where:   { patient_id: req.params.id, status: { [Op.in]: ['pending', 'notified'] } },
      include: [{ model: StageTemplate, as: 'template' }],
      order:   [['template', 'order_index', 'ASC']]
    });

    if (nextStage && next_stage_notes) {
      await nextStage.update({ notes: next_stage_notes });
    }

    await sendWhatsApp(patient.whatsapp_number, 'stage_complete', {
      patient_name: patient.name,
      stage_name:   template.stage_name,
      next_stage:   nextStage?.template?.stage_name || 'Journey complete!',
      next_date:    nextStage?.scheduled_date       || ''
    }, patient.id, stage.id, patient.hospital_id);

    res.json({ message: 'Stage marked as visited', next_stage: nextStage });
  } catch (err) {
    console.error('Mark visited error:', err);
    res.status(500).json({ error: 'Failed to mark visited' });
  }
};

// ── PUT /api/patients/:id/stages/:stageId/skip ───────────────────────────────
exports.markSkipped = async (req, res) => {
  try {
    const { reason } = req.body;
    const stage = await PatientStage.findOne({
      where: { id: req.params.stageId, patient_id: req.params.id }
    });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });
    await stage.update({
      status:      'skipped',
      skip_reason: reason || 'staff_decision',
      recorded_by: req.user.id
    });
    res.json({ message: 'Stage skipped' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to skip stage' });
  }
};

// ── PUT /api/patients/:id/stages/:stageId/date ───────────────────────────────
exports.overrideDate = async (req, res) => {
  try {
    const { new_date, override_reason } = req.body;
    if (!new_date) return res.status(400).json({ error: 'new_date required' });
    const stage = await PatientStage.findOne({
      where: { id: req.params.stageId, patient_id: req.params.id }
    });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });
    await stage.update({
      scheduled_date:  new_date,
      date_overridden: true,
      override_reason,
      recorded_by:     req.user.id
    });
    res.json({ message: 'Stage date overridden', scheduled_date: new_date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to override date' });
  }
};

// ── DELETE /api/patients/:id/stages/:stageId/date-override ───────────────────
exports.resetOverride = async (req, res) => {
  try {
    const stage = await PatientStage.findOne({
      where:   { id: req.params.stageId, patient_id: req.params.id },
      include: [{ model: StageTemplate, as: 'template' }]
    });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const patient     = await Patient.findByPk(req.params.id);
    const formulaDate = calcStageDate(patient, stage.template);

    await stage.update({ scheduled_date: formulaDate, date_overridden: false, override_reason: null });
    res.json({ message: 'Override reset to formula date', scheduled_date: formulaDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset override' });
  }
};

// ── PUT /api/patients/:id/edd ─────────────────────────────────────────────────
exports.updateEdd = async (req, res) => {
  try {
    const { edd, edd_source, lmp_date, ultrasound_scan_date } = req.body;
    if (!edd) return res.status(400).json({ error: 'edd required' });

    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    await patient.update({
      edd,
      edd_source,
      lmp_date:             lmp_date             || patient.lmp_date,
      ultrasound_scan_date: ultrasound_scan_date || patient.ultrasound_scan_date,
      edd_last_updated:     new Date()
    });

    await recalculateOnEddChange(patient);

    await sendWhatsApp(patient.whatsapp_number, 'edd_updated', {
      patient_name: patient.name,
      new_edd:      edd,
      source:       edd_source || 'updated'
    }, patient.id, null, patient.hospital_id);

    res.json({ message: 'EDD updated and stages recalculated' });
  } catch (err) {
    console.error('Update EDD error:', err);
    res.status(500).json({ error: 'Failed to update EDD' });
  }
};

// ── POST /api/patients/:id/delivery ──────────────────────────────────────────
exports.recordDelivery = async (req, res) => {
  try {
    const { delivery_date, child_dob, child_name, child_gender } = req.body;
    if (!child_dob) return res.status(400).json({ error: 'child_dob required' });

    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    await patient.update({ delivery_date, child_dob, child_name, child_gender });

    // Mark DELIVERY stage as visited
    const deliveryTemplate = await StageTemplate.findOne({ where: { stage_code: 'DELIVERY' } });
    if (deliveryTemplate) {
      await PatientStage.update(
        { status: 'visited', actual_visit_date: delivery_date || new Date(), recorded_by: req.user.id },
        { where: { patient_id: patient.id, stage_template_id: deliveryTemplate.id } }
      );
    }

    // Generate immunization stages
    await generateStages(patient, 'immunization');

    // Find first immunization stage for notification
    const firstImmStage = await PatientStage.findOne({
      where:   { patient_id: patient.id, status: 'pending' },
      include: [{ model: StageTemplate, as: 'template', where: { type: 'immunization' } }],
      order:   [['scheduled_date', 'ASC']]
    });

    await sendWhatsApp(patient.whatsapp_number, 'delivery_recorded', {
      patient_name:   patient.name,
      child_name:     child_name || 'your baby',
      first_imm:      firstImmStage?.template?.stage_name || 'At Birth',
      first_imm_date: firstImmStage?.scheduled_date       || child_dob
    }, patient.id, null, patient.hospital_id);

    res.json({ message: 'Delivery recorded and immunization stages generated' });
  } catch (err) {
    console.error('Record delivery error:', err);
    res.status(500).json({ error: 'Failed to record delivery' });
  }
};
