'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');

const { register, login, getMe } = require('../controllers/auth.controller');
const validate       = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .notEmpty().withMessage('Name is required')
      .trim()
      .isLength({ max: 100 }).withMessage('Name too long'),
    body('email')
      .isEmail().withMessage('A valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// GET /api/auth/me  (protected)
router.get('/me', authMiddleware, getMe);

module.exports = router;
