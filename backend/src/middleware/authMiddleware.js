'use strict';

const { admin } = require('../config/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'vnrvjiet.in';

const protect = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Send: Authorization: Bearer <Firebase ID Token>'
      });
    }

    const idToken = authHeader.slice(7).trim();

    let decoded;

    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      logger.warn(`Token verification failed: ${err.message}`);

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please sign in again.'
      });
    }

    const { uid, email, name, picture } = decoded;

    // ── Admin override logic ─────────────────────────

    // Read admin emails from environment variable (comma-separated)
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const FACULTY_EMAILS = (process.env.FACULTY_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const emailLower = email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLower);
    const localPart = emailLower.split('@')[0] || '';
    const isFacultyByPattern = emailLower.endsWith(`@${ALLOWED_DOMAIN}`) && /^[^0-9]/.test(localPart);
    const isFaculty = FACULTY_EMAILS.includes(emailLower) || isFacultyByPattern;

    // Block non-college users except admins

    if (!isAdmin && !emailLower.endsWith(`@${ALLOWED_DOMAIN}`)) {
      logger.warn(`Domain rejection → email: ${email}`);

      return res.status(403).json({
        success: false,
        message: `Access denied. Only @${ALLOWED_DOMAIN} accounts are permitted on this platform.`
      });
    }

    // ── Upsert user ─────────────────────────
    const existingUser = await User.findOne({ firebaseUid: uid }).lean();
    const resolvedRole = isAdmin
      ? 'admin'
      : isFaculty
        ? 'faculty'
        : (existingUser?.role || 'student');

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: {
          email: emailLower,
          name: name || emailLower.split('@')[0],
          avatarUrl: picture || null,
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
          role: resolvedRole,
        },
        $setOnInsert: { firebaseUid: uid }
      },
      { upsert: true, new: true, runValidators: true }
    );

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    req.user = user;

    next();

  } catch (err) {

    logger.error(`authMiddleware error: ${err.message}`, err);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to a server error.'
    });

  }
};

module.exports = { protect };
