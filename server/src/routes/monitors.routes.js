'use strict';

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const ctrl           = require('../controllers/monitors.controller');

router.use(authMiddleware);

// GET    /api/monitors?projectId   — list monitors for a project
router.get('/',            ctrl.listMonitors);

// POST   /api/monitors             — create a monitor
router.post('/',           ctrl.createMonitor);

// PATCH  /api/monitors/:id         — update name / interval / enabled
router.patch('/:id',       ctrl.updateMonitor);

// POST   /api/monitors/:id/check   — run a check immediately
router.post('/:id/check',  ctrl.checkMonitorNow);

// DELETE /api/monitors/:id         — delete a monitor
router.delete('/:id',      ctrl.deleteMonitor);

module.exports = router;
