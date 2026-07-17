const router = require('express').Router();
const c = require('../controllers/notification.controller');
const { protect, requireRole } = require('../middlewares/auth.middleware');

router.use(protect);

router.get( '/',                c.listNotifications);
router.post('/cron/trigger',    requireRole('admin', 'superadmin'), c.triggerCron);
router.post('/send-manual',     c.sendManual);
router.post('/test-whatsapp',   c.testWhatsApp);

module.exports = router;
