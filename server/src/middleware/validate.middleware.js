'use strict';

const { validationResult } = require('express-validator');

/**
 * Validation result handler.
 *
 * Usage: place this after express-validator chains in route definitions.
 *
 * Example:
 *   router.post('/register',
 *     [body('email').isEmail(), body('password').isLength({ min: 8 })],
 *     validate,          // ← this middleware
 *     registerController
 *   )
 *
 * Returns 422 with a structured errors array if any validation fails.
 * Passes to next() if all validations pass.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field:   e.path,
        message: e.msg,
        value:   e.value,
      })),
    });
  }

  next();
}

module.exports = validate;
