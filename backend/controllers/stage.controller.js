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
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is mandatory for skipping a stage' });
    }
    const stage = await PatientStage.findOne({
      where:   { id: req.params.stageId, patient_id: req.params.id },
      include: [{ model: StageTemplate, as: 'template' }]
    });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const scheduledDate = stage.scheduled_date || '';

    await stage.update({
      status:      'skipped',
      skip_reason: reason.trim(),
      recorded_by: req.user.id
    });

    // Notify patient
    try {
      const patient = await Patient.findByPk(req.params.id);
      if (patient?.whatsapp_number) {
        await sendWhatsApp(patient.whatsapp_number, 'stage_skipped', {
          patient_name:   patient.name,
          stage_name:     stage.template?.stage_name || 'appointment',
          scheduled_date: scheduledDate,
          reason:         reason.trim(),
        }, patient.id, stage.id, patient.hospital_id);
      }
    } catch (notifErr) {
      console.warn('[WhatsApp] Skip notification failed (non-fatal):', notifErr.message);
    }

    res.json({ message: 'Stage skipped successfully', skip_reason: reason.trim() });
  } catch (err) {
    console.error('Mark skipped error:', err);
    res.status(500).json({ error: 'Failed to skip stage' });
  }
};

// ── PUT /api/patients/:id/stages/:stageId/date ───────────────────────────────
exports.overrideDate = async (req, res) => {
  try {
    const { new_date, override_reason, cascade = false } = req.body;
    if (!new_date) return res.status(400).json({ error: 'new_date required' });
    if (!override_reason || !override_reason.trim()) {
      return res.status(400).json({ error: 'Reason is mandatory for rescheduling' });
    }

    const stage = await PatientStage.findOne({
      where:   { id: req.params.stageId, patient_id: req.params.id },
      include: [{ model: StageTemplate, as: 'template' }]
    });
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    // Calculate diff in calendar days without timezone offset issues
    const [oldY, oldM, oldD] = (stage.scheduled_date || '').split('-').map(Number);
    const [newY, newM, newD] = new_date.split('-').map(Number);
    const oldUtc = Date.UTC(oldY, oldM - 1, oldD);
    const newUtc = Date.UTC(newY, newM - 1, newD);
    const diffDays = Math.round((newUtc - oldUtc) / (1000 * 60 * 60 * 24));

    await stage.update({
      scheduled_date:  new_date,
      date_overridden: true,
      override_reason: override_reason.trim(),
      recorded_by:     req.user.id
    });

    let cascadedCount = 0;
    if (cascade && diffDays !== 0) {
      const subsequentStages = await PatientStage.findAll({
        where: {
          patient_id: req.params.id,
          status:     { [Op.in]: ['pending', 'notified'] }
        },
        include: [{
          model: StageTemplate,
          as:    'template',
          where: {
            type:        stage.template.type,
            order_index: { [Op.gt]: stage.template.order_index }
          }
        }],
        order: [['template', 'order_index', 'ASC']]
      });

      for (const sub of subsequentStages) {
        if (sub.scheduled_date) {
          const [sY, sM, sD] = sub.scheduled_date.split('-').map(Number);
          const nextDate = new Date(Date.UTC(sY, sM - 1, sD + diffDays));
          const formattedNext = nextDate.toISOString().split('T')[0];
          await sub.update({
            scheduled_date:  formattedNext,
            date_overridden: true,
            override_reason: `Cascaded (${diffDays > 0 ? '+' : ''}${diffDays}d) from ${stage.template.stage_name}: ${override_reason.trim()}`,
            recorded_by:     req.user.id
          });
          cascadedCount++;
        }
      }
    }

    // Notify patient about rescheduled appointment
    try {
      const patient = await Patient.findByPk(req.params.id);
      if (patient?.whatsapp_number) {
        await sendWhatsApp(patient.whatsapp_number, 'stage_rescheduled', {
          patient_name: patient.name,
          stage_name:   stage.template?.stage_name || 'appointment',
          new_date,
          reason:       override_reason.trim(),
        }, patient.id, stage.id, patient.hospital_id);
      }
    } catch (notifErr) {
      console.warn('[WhatsApp] Reschedule notification failed (non-fatal):', notifErr.message);
    }

    res.json({
      message: cascade
        ? `Stage and ${cascadedCount} subsequent stage(s) rescheduled successfully`
        : 'Stage rescheduled successfully',
      scheduled_date: new_date,
      cascaded: cascadedCount
    });
  } catch (err) {
    console.error('Override date error:', err);
    res.status(500).json({ error: 'Failed to reschedule stage' });
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
