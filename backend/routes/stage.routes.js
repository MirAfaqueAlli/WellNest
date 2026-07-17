const router = require('express').Router({ mergeParams: true });
const c = require('../controllers/stage.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get(    '/:id/stages',                            c.getStages);
router.get(    '/:id/stages/current',                    c.getCurrentStage);
router.get(    '/:id/stages/upcoming',                   c.getUpcomingStages);
router.put(    '/:id/stages/:stageId/visit',             c.markVisited);
router.put(    '/:id/stages/:stageId/skip',              c.markSkipped);
router.put(    '/:id/stages/:stageId/date',              c.overrideDate);
router.delete( '/:id/stages/:stageId/date-override',     c.resetOverride);
router.put(    '/:id/edd',                               c.updateEdd);
router.post(   '/:id/delivery',                          c.recordDelivery);

module.exports = router;
