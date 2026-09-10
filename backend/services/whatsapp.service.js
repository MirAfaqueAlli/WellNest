const axios      = require('axios');
const { Notification, Hospital } = require('../models/index');

// ── Phone Number Formatter ────────────────────────────────────────────────────
function formatPhone(number) {
  return number.replace(/[^0-9]/g, '');
}

// ── Message Templates ─────────────────────────────────────────────────────────
const templates = {
  reminder_7d: (d) =>
    `Hello ${d.patient_name} 👋\nThis is a reminder from your hospital.\nYour next visit for *${d.stage_name}* is scheduled on *${d.scheduled_date}*.\nPlease be on time. We look forward to seeing you! 🏥`,

  reminder_1d: (d) =>
    `Hello ${d.patient_name} 👋\nReminder: Your appointment for *${d.stage_name}* is *TOMORROW* on *${d.scheduled_date}*.\nPlease arrive on time. See you tomorrow! 💙`,

  reminder_today: (d) =>
    `Hello ${d.patient_name} 🌅\nGood morning! Your appointment for *${d.stage_name}* is *TODAY* — ${d.scheduled_date}.\nPlease visit the hospital today. We are expecting you! 🏥`,

  stage_complete: (d) =>
    `Hello ${d.patient_name} ✅\nWe've recorded your visit for *${d.stage_name}*.\nYour next appointment: *${d.next_stage}* on *${d.next_date}*.\nThank you for visiting! 🏥`,

  missed: (d) =>
    `Hello ${d.patient_name} ⚠️\nWe noticed you missed your appointment for *${d.stage_name}* on ${d.scheduled_date}.\nPlease call us at ${d.hospital_phone} to reschedule.\nYour health is important to us! 💙`,

  edd_updated: (d) =>
    `Hello ${d.patient_name} 📅\nYour Expected Due Date has been updated.\nNew EDD: *${d.new_edd}* (based on ${d.source}).\nYour upcoming appointment dates have been adjusted accordingly.\nContact us if you have questions! 🏥`,

  delivery_recorded: (d) =>
    `Hello ${d.patient_name} 🎉\nCongratulations on the birth of *${d.child_name}*!\nYour child's first immunization — *${d.first_imm}* — is scheduled on *${d.first_imm_date}*.\nWe'll remind you closer to the date! 💙`,

  manual: (d) =>
    d.custom_message || `Hello ${d.patient_name}, this is a message from your hospital.`,
};

// ── Resolve API credentials for a hospital ────────────────────────────────────
// Returns { apiUrl, apiKey } from DB first, falls back to .env
async function resolveCredentials(hospitalId) {
  if (hospitalId) {
    try {
      const hospital = await Hospital.findByPk(hospitalId, {
        attributes: ['whatsapp_api_url', 'whatsapp_api_key'],
      });
      if (hospital?.whatsapp_api_url && hospital?.whatsapp_api_key) {
        return {
          apiUrl: hospital.whatsapp_api_url,
          apiKey: hospital.whatsapp_api_key,
        };
      }
    } catch (_) { /* fall through to env */ }
  }
  return {
    apiUrl: process.env.WHATSAPP_API_URL,
    apiKey: process.env.WHATSAPP_API_KEY,
  };
}

// ── Core Send Function ────────────────────────────────────────────────────────
/**
 * Send a WhatsApp message via GET request with query params (Rextrox v2 format):
 *   GET {apiUrl}?apikey={apiKey}&recipient={phone}&text={message}
 */
async function sendWhatsApp(to, templateKey, data, patientId = null, stageId = null, hospitalId = null) {
  const body           = templates[templateKey]?.(data) ?? data.custom_message ?? '';
  const formattedPhone = formatPhone(to);

  let status            = 'failed';
  let providerMessageId = null;
  let errorMessage      = null;

  const { apiUrl, apiKey } = await resolveCredentials(hospitalId);

  try {
    if (!apiUrl || !apiKey) {
      throw new Error('WhatsApp API credentials not configured. Please set them in Hospital Settings.');
    }

    const response = await axios.get(apiUrl, {
      params: {
        apikey:    apiKey,
        recipient: formattedPhone,
        text:      body,
      },
      timeout:        45000,
      validateStatus: () => true,
    });

    console.log(`[WhatsApp] ${response.status} → ${formattedPhone} | type: ${templateKey} | res: ${JSON.stringify(response.data)}`);

    if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
      status            = 'sent';
      providerMessageId = response.data?.waMessageId
        || response.data?.id
        || response.data?.message_id
        || response.data?.msgId
        || null;
      console.log(`[WhatsApp] ✅ Sent to ${formattedPhone} | type: ${templateKey} | msgId: ${providerMessageId}`);

    } else if (response.status >= 500) {
      status = 'sent';
      console.warn(`[WhatsApp] ⚠️ Gateway 5xx (message delivered) | type: ${templateKey} | to: ${formattedPhone}`);

    } else {
      errorMessage = response.data?.message || `Gateway error (${response.status})`;
      console.error(`[WhatsApp] ❌ Failed (${response.status}): ${errorMessage} | type: ${templateKey}`);
    }

  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      console.warn(`[WhatsApp] ⚠️ Timeout — message likely sent | type: ${templateKey}`);
      status = 'sent';
    } else {
      const errMsg = err.code === 'ENOTFOUND'
        ? `DNS Error: Cannot reach '${apiUrl}'`
        : err.code === 'ECONNREFUSED'
        ? `Connection refused at '${apiUrl}'`
        : err.message;
      console.error(`[WhatsApp] ❌ Network error | type: ${templateKey} | ${errMsg}`);
      err._friendlyMessage = errMsg;
      throw err;
    }
  }

  // Always log to DB
  if (patientId) {
    try {
      await Notification.create({
        patient_id:          patientId,
        patient_stage_id:    stageId   || null,
        type:                templateKey,
        whatsapp_number:     to,
        message_body:        body,
        status,
        provider_message_id: providerMessageId,
        sent_at:             new Date(),
      });
    } catch (dbErr) {
      console.error('[WhatsApp] ❌ Failed to log notification:', dbErr.message);
    }
  }

  return { success: status === 'sent', error: errorMessage, providerMessageId };
}

// ── Test Connection ───────────────────────────────────────────────────────────
async function testConnection(testNumber, hospitalId = null) {
  console.log('[WhatsApp] Running connection test...');
  try {
    const result = await sendWhatsApp(
      testNumber,
      'manual',
      { custom_message: '✅ WellNest WhatsApp API test message. Integration is working!' },
      null, null, hospitalId
    );
    if (result.success) {
      return { ok: true, error: null, providerMessageId: result.providerMessageId };
    } else {
      return { ok: false, error: result.error || 'Gateway returned failure' };
    }
  } catch (err) {
    return { ok: false, error: err._friendlyMessage || err.message };
  }
}

module.exports = { sendWhatsApp, testConnection };
