const cron = require('node-cron');
const { Op } = require('sequelize');
const { addDays, subDays, startOfDay, endOfDay } = require('date-fns');
const { PatientStage, Patient, StageTemplate, Hospital } = require('../models/index');
const { sendWhatsApp } = require('./whatsapp.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendRemindersForDaysAhead(daysAhead, type) {
  const targetDate = addDays(startOfDay(new Date()), daysAhead);

  const stages = await PatientStage.findAll({
    where: {
      status:         { [Op.in]: ['pending', 'notified'] },
      scheduled_date: {
        [Op.between]: [startOfDay(targetDate), endOfDay(targetDate)]
      }
    },
    include: [{ model: StageTemplate, as: 'template' }]
  });

  for (const stage of stages) {
    const patient = await Patient.findByPk(stage.patient_id);
    if (!patient) continue;

    await sendWhatsApp(
      patient.whatsapp_number,
      type,
      {
        patient_name:   patient.name,
        stage_name:     stage.template.stage_name,
        scheduled_date: stage.scheduled_date
      },
      patient.id,
      stage.id,
      patient.hospital_id
    );

    await stage.update({ status: 'notified' });
  }

  console.log(`[CRON] ${type}: processed ${stages.length} stages`);
  return stages.length;
}

async function flagMissed() {
  const yesterday = subDays(startOfDay(new Date()), 1);

  const missed = await PatientStage.findAll({
    where: {
      status:         { [Op.in]: ['pending', 'notified'] },
      scheduled_date: {
        [Op.between]: [startOfDay(yesterday), endOfDay(yesterday)]
      }
    },
    include: [{ model: StageTemplate, as: 'template' }]
  });

  for (const stage of missed) {
    const patient = await Patient.findByPk(stage.patient_id, { include: [Hospital] });
    if (!patient) continue;

    await stage.update({ status: 'missed' });

    await sendWhatsApp(
      patient.whatsapp_number,
      'missed',
      {
        patient_name:   patient.name,
        stage_name:     stage.template.stage_name,
        scheduled_date: stage.scheduled_date,
        hospital_phone: patient.Hospital?.phone || 'your hospital'
      },
      patient.id,
      stage.id,
      patient.hospital_id
    );
  }

  console.log(`[CRON] flagMissed: ${missed.length} stages marked`);
  return missed.length;
}

// ── Exports for manual trigger ────────────────────────────────────────────────
const runDailyJob = async () => {
  console.log('[CRON] Running daily notification job...');
  const r7  = await sendRemindersForDaysAhead(7, 'reminder_7d');
  const r1  = await sendRemindersForDaysAhead(1, 'reminder_1d');
  const r0  = await sendRemindersForDaysAhead(0, 'reminder_today');
  const mis = await flagMissed();
  return { reminder_7d: r7, reminder_1d: r1, reminder_today: r0, missed: mis };
};

// ── Schedule: every day at 8:00 AM ───────────────────────────────────────────
cron.schedule('0 8 * * *', runDailyJob);

console.log('✅ Cron jobs registered (runs daily at 08:00 AM)');

module.exports = { runDailyJob };
