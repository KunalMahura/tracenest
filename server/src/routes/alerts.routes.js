'use strict';

const express   = require('express');
const router    = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const ctrl = require('../controllers/alerts.controller');

router.use(authMiddleware);

// ── Alert Rules ────────────────────────────────────────────────────
// POST   /api/alerts/rules          — create a new alert rule
router.post('/rules',         ctrl.createRule);

// GET    /api/alerts/rules?projectId — list rules for a project
router.get('/rules',          ctrl.listRules);

// PATCH  /api/alerts/rules/:id      — update rule fields
router.patch('/rules/:id',    ctrl.updateRule);

// DELETE /api/alerts/rules/:id      — delete a rule
router.delete('/rules/:id',   ctrl.deleteRule);

// ── Triggered Alerts ───────────────────────────────────────────────
// GET    /api/alerts?projectId       — list triggered alerts
router.get('/',               ctrl.listAlerts);

// PATCH  /api/alerts/:id/resolve    — mark alert as resolved
router.patch('/:id/resolve',  ctrl.resolveAlert);

module.exports = router;
