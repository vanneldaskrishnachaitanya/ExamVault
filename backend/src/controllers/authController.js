'use strict';

/**
 * authController.js
 * ─────────────────
 * POST /auth/login
 *   The authMiddleware (protect) does the heavy work:
 *     - verifies Firebase ID token
 *     - enforces @vnrvjiet.in domain
 *     - upserts user in MongoDB
 *     - attaches req.user
 *   This controller simply returns the sanitised user profile.
 *
 * GET /auth/me
 *   Lightweight "who am I" endpoint.
 */

const logger = require('../utils/logger');

// POST /auth/login
const login = (req, res) => {
  logger.info(`Login: ${req.user.email} [${req.user.role}]`);
  return res.status(200).json({
    success: true,
    message: `Welcome, ${req.user.name}!`,
    data:    { user: req.user.toPublicJSON() },
  });
};

// GET /auth/me
const getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    data:    { user: req.user.toPublicJSON() },
  });
};

module.exports = { login, getMe };
