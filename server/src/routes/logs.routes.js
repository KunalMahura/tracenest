'use strict';

const express   = require('express');
const router    = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { searchLogs, getSingleLog, deleteLogs } = require('../controllers/logs.controller');

// All logs routes require JWT authentication
router.use(authMiddleware);

// GET  /api/logs         — search + paginate
router.get('/',    searchLogs);

// GET  /api/logs/:id     — single log full detail
router.get('/:id', getSingleLog);

// DELETE /api/logs       — purge all logs for a project (query: ?projectId=)
router.delete('/', deleteLogs);

module.exports = router;
