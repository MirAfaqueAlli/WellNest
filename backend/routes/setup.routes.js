const express    = require('express');
const router     = express.Router();
const { getStatus, runSetup } = require('../controllers/setup.controller');

router.get( '/status', getStatus);   // GET  /api/setup/status
router.post('/',       runSetup);    // POST /api/setup

module.exports = router;
