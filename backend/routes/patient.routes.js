const router = require('express').Router();
const c = require('../controllers/patient.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get( '/dashboard-stats', c.getDashboardStats);
router.get( '/lookup',          c.lookupByWhatsapp);
router.post('/',                c.registerPatient);
router.get( '/',                c.listPatients);
router.get( '/:id',            c.getPatient);

module.exports = router;
