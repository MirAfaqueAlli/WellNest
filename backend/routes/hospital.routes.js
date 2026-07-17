const router = require('express').Router();
const c = require('../controllers/hospital.controller');
const { protect, requireRole } = require('../middlewares/auth.middleware');

router.use(protect);

router.get( '/staff', c.getStaff);                                          // must be before /:id
router.get( '/',     requireRole('superadmin'), c.listHospitals);
router.post('/',     requireRole('superadmin'), c.createHospital);
router.get( '/:id',  c.getHospital);
router.put( '/:id',  requireRole('superadmin', 'admin'), c.updateHospital);
router.post('/:id/test-whatsapp', requireRole('superadmin', 'admin'), c.testWhatsapp);

module.exports = router;
