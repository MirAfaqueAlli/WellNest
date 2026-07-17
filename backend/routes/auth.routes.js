const router = require('express').Router();
const { login, getMe, registerStaff, listStaff } = require('../controllers/auth.controller');
const { protect, requireRole } = require('../middlewares/auth.middleware');

router.post('/login',          login);
router.get( '/me',             protect, getMe);
router.post('/register-staff', protect, requireRole('admin', 'superadmin'), registerStaff);
router.get( '/staff',          protect, requireRole('admin', 'superadmin'), listStaff);

module.exports = router;
