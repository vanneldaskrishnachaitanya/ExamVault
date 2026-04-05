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
const User = require('../models/User');

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

const updatePreferences = async (req, res, next) => {
  try {
    const dashboard = req.body?.dashboard || {};
    const allowedWidgets = ['timetable', 'exam', 'uploads', 'announcements'];

    const defaultContext = {
      regulation: String(dashboard.defaultContext?.regulation || 'R22').toUpperCase(),
      branch: String(dashboard.defaultContext?.branch || 'CSE').toUpperCase(),
      year: String(dashboard.defaultContext?.year || '1'),
    };

    const incomingOrder = Array.isArray(dashboard.widgetOrder) ? dashboard.widgetOrder : [];
    const widgetOrder = incomingOrder
      .filter(id => allowedWidgets.includes(id))
      .concat(allowedWidgets.filter(id => !incomingOrder.includes(id)));

    const hiddenWidgets = Array.isArray(dashboard.hiddenWidgets)
      ? dashboard.hiddenWidgets.filter(id => allowedWidgets.includes(id))
      : [];

    const digestMode = ['off', 'daily', 'weekly'].includes(dashboard.digestMode)
      ? dashboard.digestMode
      : 'daily';

    const reminderSnoozes = dashboard.reminderSnoozes && typeof dashboard.reminderSnoozes === 'object'
      ? dashboard.reminderSnoozes
      : {};

    const lastSeenAt = dashboard.lastSeenAt ? new Date(dashboard.lastSeenAt) : new Date();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'preferences.dashboard.defaultContext': defaultContext,
          'preferences.dashboard.widgetOrder': widgetOrder,
          'preferences.dashboard.hiddenWidgets': hiddenWidgets,
          'preferences.dashboard.digestMode': digestMode,
          'preferences.dashboard.reminderSnoozes': reminderSnoozes,
          'preferences.dashboard.lastSeenAt': Number.isNaN(lastSeenAt.getTime()) ? new Date() : lastSeenAt,
          lastSeenAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: { user: user.toPublicJSON() },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { login, getMe, updatePreferences };
