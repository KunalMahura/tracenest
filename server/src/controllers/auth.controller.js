'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env  = require('../config/env');

/**
 * POST /api/auth/register
 * Creates a new user account and returns a JWT.
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email before attempting insert
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, error: 'Email is already registered' });
    }

    // Set passwordHash to the plain password — the pre-save hook hashes it
    const user = await User.create({ name, email, passwordHash: password });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticates credentials and returns a JWT.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // Deliberately vague message — don't reveal whether email exists
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };
