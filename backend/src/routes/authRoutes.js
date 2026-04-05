'use strict';

const express    = require('express');
const router     = express.Router();
const { login, getMe, updatePreferences } = require('../controllers/authController');
const { protect }      = require('../middleware/authMiddleware');

/**
 * POST /auth/login
 * Client sends a Firebase ID token in Authorization: Bearer <token>.
 * authMiddleware verifies the token and enforces @vnrvjiet.in.
 * The controller simply returns the user profile.
 */
router.post('/login', protect, login);

/**
 * GET /auth/me
 * Returns the profile of the currently authenticated user.
 */
router.get('/me', protect, getMe);
router.patch('/me/preferences', protect, updatePreferences);

module.exports = router;
