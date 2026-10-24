'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const {
  createProject,
  listProjects,
  getProject,
  deleteProject,
  regenerateApiKey,
} = require('../controllers/project.controller');

const authMiddleware = require('../middleware/auth.middleware');
const validate       = require('../middleware/validate.middleware');

const router = Router();

// All project routes require a valid JWT
router.use(authMiddleware);

// POST /api/projects
router.post(
  '/',
  [
    body('name')
      .notEmpty().withMessage('Project name is required')
      .trim()
      .isLength({ max: 100 }).withMessage('Project name too long'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description too long'),
  ],
  validate,
  createProject
);

// GET /api/projects
router.get('/', listProjects);

// GET /api/projects/:id
router.get('/:id', getProject);

// DELETE /api/projects/:id
router.delete('/:id', deleteProject);

// POST /api/projects/:id/regenerate-key
router.post('/:id/regenerate-key', regenerateApiKey);

module.exports = router;
